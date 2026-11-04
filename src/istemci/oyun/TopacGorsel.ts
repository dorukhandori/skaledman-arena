import { Container, Graphics } from "pixi.js";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import { diskBul } from "../../paylasilan/veri/katalog.ts";
import type { TopacProfili } from "../../paylasilan/veri/profil.ts";
import { ELEMENT_RENK, KOKEN_RENK, TAKIM_RENK, renkKaristir } from "./renkler.ts";
import { SusRastgele } from "./SusRastgele.ts";

// Topaç görseli v0: Pixi Graphics yer tutucu, katmanlı (pixel planı § 2.2): gölge, takım çemberi, Uç, Disk,
// Gövde (kanatlı siluet), Çekirdek, dönmeyen parlama. Dönüş `rotation` ile (pixel planı § 3.2 (a), v0).
// Hız kademeleri (§ 3.4) Stamina oranından: > %60 bulanık disk, %25-60 bulanık kanat, < %25 keskin kanat + yalpa.
// Kozmetik dönüş hızı sim'den bağımsızdır; yalpa salt görseldir (05 § 2.6, %40'ta başlar).

export type Kademe = "yuksek" | "orta" | "dusuk";
export type TakimIsareti = "oyuncu" | "rakip" | "yok";
export type GorselBitis = "ringOut" | "parcalanma" | "durma";

export const GORSEL = {
  govdeYaricap: 32,
  govdeIc: 19,
  diskYaricap: 25,
  ucYaricap: 6,
  cekirdekYaricap: 8,
  takimCemberi: 38,
  kademeSiniri: { yuksek: 0.6, dusuk: 0.25 },
  histerezis: 0.03,
  /** tur/s */
  donus: { yuksek: 8, ortaUst: 3, ortaAlt: 1.5, dusukUst: 1.5, dusukAlt: 0.4, parlama: 6 },
  yalpa: { tavanPx: 8, us: 0.6, hz: 1.75, basik: 0.06 },
  sekmeYukseklik: 8,
  ringOutSure: 0.5,
  durmaSure: 0.4,
  parcaSure: 1.4,
} as const;

/** Kademe, histerezisli (§ 3.4: sınırlarda %3). */
export function kademeBul(oran: number, onceki: Kademe | null): Kademe {
  const K = GORSEL.kademeSiniri;
  const h = GORSEL.histerezis;
  if (onceki === "yuksek") return oran > K.yuksek - h ? "yuksek" : oran > K.dusuk ? "orta" : "dusuk";
  if (onceki === "dusuk") return oran < K.dusuk + h ? "dusuk" : oran > K.yuksek ? "yuksek" : "orta";
  if (onceki === "orta") return oran > K.yuksek + h ? "yuksek" : oran < K.dusuk - h ? "dusuk" : "orta";
  return oran > K.yuksek ? "yuksek" : oran > K.dusuk ? "orta" : "dusuk";
}

/** Kanatlı gövde silueti: süpürülmüş dişler, sol dönüşte aynalı. */
function kanatSiluet(n: number, rIc: number, rDis: number, sol: boolean): number[] {
  const nokta: number[] = [];
  const orneklem = 24 * n;
  for (let i = 0; i < orneklem; i++) {
    const th = (i / orneklem) * Math.PI * 2;
    let faz = (th * n) / (Math.PI * 2);
    faz -= Math.floor(faz);
    if (sol) faz = 1 - faz;
    const r = faz < 0.62 ? rIc + (rDis - rIc) * Math.pow(faz / 0.62, 0.75) : rIc + (rDis - rIc) * Math.pow(1 - (faz - 0.62) / 0.38, 3);
    nokta.push(Math.cos(th) * r, Math.sin(th) * r);
  }
  return nokta;
}

interface Parca { g: Graphics; vx: number; vy: number; w: number; yuk: number; vyuk: number; sekti: boolean }

export class TopacGorsel {
  readonly kok = new Container();
  readonly golge = new Graphics();
  private takimCemberi = new Graphics();
  private govdeKap = new Container();
  private sqKap = new Container();
  private icKap = new Container();
  private yalpaKap = new Container();
  private donen = new Container();
  private cekirdekKap = new Container();
  private uc = new Graphics();
  private disk = new Graphics();
  private kanat = new Graphics();
  private bulanikDisk = new Graphics();
  private hayaletler: Graphics[] = [new Graphics(), new Graphics(), new Graphics()];
  private parlamaHalka = new Graphics();
  private parlama = new Graphics();
  private cekirdek = new Graphics();
  private flasKatmani = new Graphics();
  /** H12 çatlak çizgileri (tik/eşik ≥ 0,75; ≥ 0,9 ağır): Disk üzerinde, dönerek */
  private catlak = new Graphics();
  private catlakSeviye = -1;
  private parcalar: Parca[] = [];
  private kademe: Kademe | null = null;
  private aci = 0;
  private cekirdekAci = 0;
  private parlamaAci = 0;
  private yalpaFaz = 0;
  private squashD = { sx: 1, sy: 1, sure: 0, kalan: 0 };
  private flasKare = 0;
  private bitisDurum: { tur: GorselBitis; t: number; vx: number; vy: number } | null = null;
  private rng = new SusRastgele(0x70ac);
  private sonOran = 1;

  constructor(private profil: TopacProfili, private takim: TakimIsareti, private golgeUst: Container, private parcaUst: Container) {
    this.golgeUst.addChild(this.golge);
    this.govdeKap.addChild(this.sqKap);
    this.sqKap.addChild(this.icKap);
    this.icKap.addChild(this.yalpaKap);
    this.donen.addChild(this.uc, this.disk, this.bulanikDisk, ...this.hayaletler, this.kanat, this.catlak);
    this.cekirdekKap.addChild(this.cekirdek);
    this.yalpaKap.addChild(this.donen, this.parlamaHalka, this.cekirdekKap, this.parlama, this.flasKatmani);
    this.kok.addChild(this.takimCemberi, this.govdeKap);
    this.ciz();
  }

  get gorunurParcaSayisi(): number { return this.parcalar.length; }

  profilAyarla(p: TopacProfili, takim: TakimIsareti = this.takim): void {
    this.profil = p;
    this.takim = takim;
    this.ciz();
  }

  private ciz(): void {
    const p = this.profil;
    const el = ELEMENT_RENK[p.element];
    const ko = KOKEN_RENK[p.koken];
    const sol = p.donus === "sol";
    const G = GORSEL;
    // gölge: Disk yüksekliğine göre kayma (pixel planı § 2.2 katman 0)
    const yuk = diskBul(p.parcalar.disk).yukseklik;
    const kayma = 2 + ((yuk - 50) / 15) * 3;
    this.golge.clear().circle(-kayma, kayma, G.diskYaricap * 1.25).fill({ color: 0x000000, alpha: 0.32 });
    // takım çemberi: oyuncu düz + ▲, rakip kesikli + ◆ (ux § 2.2, § 6.1)
    const tc = this.takimCemberi.clear();
    if (this.takim !== "yok") {
      const renk = this.takim === "oyuncu" ? TAKIM_RENK.oyuncu : TAKIM_RENK.rakip;
      if (this.takim === "oyuncu") {
        tc.circle(0, 0, G.takimCemberi).stroke({ width: 2, color: renk, alpha: 0.95 });
        tc.poly([0, -G.takimCemberi - 4, -5, -G.takimCemberi - 12, 5, -G.takimCemberi - 12]).fill(renk);
      } else {
        const parca = 20;
        for (let i = 0; i < parca; i++) {
          const a0 = (i / parca) * Math.PI * 2;
          tc.moveTo(Math.cos(a0) * G.takimCemberi, Math.sin(a0) * G.takimCemberi).arc(0, 0, G.takimCemberi, a0, a0 + Math.PI / parca);
        }
        tc.stroke({ width: 2, color: renk, alpha: 0.95 });
        const y = -G.takimCemberi - 9;
        tc.poly([0, y - 5, 5, y, 0, y + 5, -5, y]).fill(renk);
      }
    }
    // Uç
    this.uc.clear().circle(0, 0, G.ucYaricap).fill(0x2b2f33).stroke({ width: 1, color: 0x111111 });
    // Disk: kilit çıkıntıları (burst katkısı kadar)
    const disk = diskBul(p.parcalar.disk);
    const cikinti = Math.max(3, disk.katki.burstEsik);
    const dg = this.disk.clear();
    dg.circle(0, 0, G.diskYaricap).fill(0x8d989e).stroke({ width: 1, color: 0x3a4246 });
    for (let i = 0; i < cikinti; i++) {
      const a = (i / cikinti) * Math.PI * 2;
      dg.circle(Math.cos(a) * (G.diskYaricap - 3), Math.sin(a) * (G.diskYaricap - 3), 2).fill(0x5b666b);
    }
    // Gövde: kanatlı siluet (keskin) + hayaletler (bulanık kanat) + bulanık disk
    const siluet = kanatSiluet(p.kanat, G.govdeIc, G.govdeYaricap, sol);
    this.kanat.clear().poly(siluet).fill(el.orta).stroke({ width: 1, color: el.koyu });
    this.kanat.circle(0, 0, G.govdeIc - 3).fill(el.koyu);
    this.kanat.circle(0, 0, G.govdeIc - 6).fill(renkKaristir(el.orta, 0x000000, 0.25));
    // kanat uçlarında vurgu
    for (let i = 0; i < p.kanat; i++) {
      const a = (i / p.kanat) * Math.PI * 2 + (sol ? -1 : 1) * (Math.PI * 2 * 0.55) / p.kanat;
      this.kanat.circle(Math.cos(a) * (G.govdeYaricap - 4), Math.sin(a) * (G.govdeYaricap - 4), 1.6).fill(el.vurgu);
    }
    this.hayaletler.forEach((h, k) => {
      const yon = sol ? 1 : -1;
      h.clear().poly(siluet).fill({ color: el.acik, alpha: [0.32, 0.2, 0.11][k] as number });
      h.rotation = yon * (k + 1) * 0.2;
    });
    const bd = this.bulanikDisk.clear();
    bd.circle(0, 0, G.govdeYaricap - 1).fill({ color: el.orta, alpha: 0.55 });
    bd.circle(0, 0, G.govdeYaricap - 5).fill({ color: el.acik, alpha: 0.35 });
    bd.circle(0, 0, G.govdeIc).fill({ color: el.koyu, alpha: 0.9 });
    bd.circle(0, 0, G.govdeYaricap - 1).stroke({ width: 2, color: el.koyu, alpha: 0.8 });
    // dönen parlama halkası (yüksek kademe)
    const ph = this.parlamaHalka.clear();
    ph.arc(0, 0, G.govdeYaricap - 3, 0, 0.9).stroke({ width: 3, color: 0xffffff, alpha: 0.55 });
    ph.arc(0, 0, G.govdeYaricap - 3, Math.PI, Math.PI + 0.6).stroke({ width: 2, color: el.vurgu, alpha: 0.5 });
    // Çekirdek: köken ışığı + Lv. çemberi (Lv.2: tek ince çember, başlangıç setleri)
    this.cekirdek.clear().circle(0, 0, G.cekirdekYaricap).fill(ko.isik).stroke({ width: 1.5, color: ko.ikinci });
    this.cekirdek.circle(0, 0, G.cekirdekYaricap + 3).stroke({ width: 1, color: ko.isik, alpha: 0.7 });
    this.cekirdek.poly([0, -4, 3, 0, 0, 4, -3, 0]).fill({ color: 0xffffff, alpha: 0.7 });
    // dönmeyen parlama (ışık sol üstte)
    this.parlama.clear().ellipse(-10, -12, 9, 5).fill({ color: 0xffffff, alpha: 0.22 });
    this.parlama.rotation = -0.5;
    this.flasKatmani.clear().circle(0, 0, G.govdeYaricap + 1).fill(0xffffff);
    this.flasKatmani.alpha = 0;
    this.kademe = null;
  }

  private kademeUygula(k: Kademe): void {
    if (k === this.kademe) return;
    this.kademe = k;
    this.bulanikDisk.visible = k === "yuksek";
    this.parlamaHalka.visible = k === "yuksek";
    this.kanat.visible = k !== "yuksek";
    this.kanat.alpha = 1;
    for (const h of this.hayaletler) h.visible = k === "orta";
    this.disk.visible = true;
  }

  /** Squash/stretch normal ekseninde (05 § 3.3): sx normal boyunca, sy dik. */
  squash(nx: number, ny: number, sx: number, sy: number, sure: number): void {
    const a = Math.atan2(ny, nx);
    this.govdeKap.rotation = a;
    this.icKap.rotation = -a;
    this.squashD = { sx, sy, sure, kalan: sure };
  }

  /** H12: tık oranına göre çatlak çizgileri (ux § 2: tik ≥ 0,75 görünür, ≥ 0,9 ağır). Sayı yok. */
  catlakAyarla(oran: number): void {
    const s = oran >= 0.9 ? 2 : oran >= 0.75 ? 1 : 0;
    if (s === this.catlakSeviye) return;
    this.catlakSeviye = s;
    const g = this.catlak.clear();
    if (s === 0) return;
    const r = GORSEL.govdeYaricap - 2;
    const cizgi = (pts: number[]) => {
      g.poly(pts, false).stroke({ width: 3, color: 0x111111, alpha: 0.85 });
      g.poly(pts, false).stroke({ width: 1.2, color: 0xffffff, alpha: 0.95 });
    };
    cizgi([2, -4, 8, -12, 6, -20, 12, -r]);
    cizgi([-3, 5, -12, 8, -18, 16, -r + 6, 22]);
    if (s === 2) {
      cizgi([4, 6, 14, 10, 18, 4, r, 8]);
      cizgi([-5, -3, -14, -8, -16, -18, -10, -r + 2]);
      cizgi([0, 8, 2, 18, -4, r - 2]);
    }
  }

  /** Beyaz tint flaşı, kare sayısı (05 § 3.2: 2-3 kare). */
  flas(kare: number): void { this.flasKare = Math.max(this.flasKare, kare); }

  /** Bitiş animasyonu: Ring Out dışa fırlama + küçülme, Parçalanma katman fırlaması, Durma yalpa → yatma. */
  bitis(tur: GorselBitis, vx: number, vy: number): void {
    this.bitisDurum = { tur, t: 0, vx, vy };
    if (tur === "parcalanma") this.parcala(vx, vy);
  }

  get bitti(): boolean { return this.bitisDurum !== null; }

  sifirla(): void {
    this.bitisDurum = null;
    this.catlakAyarla(0);
    for (const p of this.parcalar) p.g.destroy();
    this.parcalar = [];
    this.kok.alpha = 1;
    this.kok.scale.set(1);
    this.kok.visible = true;
    this.golge.visible = true;
    this.golge.alpha = 1;
    this.golge.scale.set(1);
    this.yalpaKap.scale.set(1);
    this.yalpaKap.rotation = 0;
    this.cekirdek.tint = 0xffffff;
    this.donen.tint = 0xffffff;
    this.donen.visible = true;
    this.parlama.visible = true;
    this.takimCemberi.visible = true;
    this.squashD.kalan = 0;
    this.sqKap.scale.set(1);
  }

  private parcala(vx: number, vy: number): void {
    const p = this.profil;
    const el = ELEMENT_RENK[p.element];
    const ust = this.parcaUst;
    const x = this.kok.x;
    const y = this.kok.y;
    const ekle = (g: Graphics, hiz: number, aci: number) => {
      g.position.set(x, y);
      ust.addChild(g);
      this.parcalar.push({ g, vx: vx * 0.3 + Math.cos(aci) * hiz, vy: vy * 0.3 + Math.sin(aci) * hiz, w: this.rng.aralik(-14, 14), yuk: 0, vyuk: this.rng.aralik(120, 220), sekti: false });
    };
    // Gövde kanat kanat (n kanat dilimi, çokgen)
    const n = Math.max(2, p.kanat);
    const siluet = kanatSiluet(n, GORSEL.govdeIc, GORSEL.govdeYaricap, p.donus === "sol");
    const dilim = siluet.length / 2 / n;
    for (let k = 0; k < n; k++) {
      const pts: number[] = [0, 0];
      for (let i = 0; i <= dilim; i++) {
        const j = ((k * dilim + i) % (siluet.length / 2)) * 2;
        pts.push(siluet[j] as number, siluet[j + 1] as number);
      }
      const g = new Graphics().poly(pts).fill(el.orta).stroke({ width: 1, color: el.koyu });
      ekle(g, this.rng.aralik(140, 260), ((k + 0.5) / n) * Math.PI * 2 + this.aci);
    }
    // Disk bütün halka, Uç küçük parça, birkaç kırık
    ekle(new Graphics().circle(0, 0, GORSEL.diskYaricap).stroke({ width: 5, color: 0x8d989e }), this.rng.aralik(40, 90), this.rng.aralik(0, Math.PI * 2));
    ekle(new Graphics().circle(0, 0, GORSEL.ucYaricap).fill(0x2b2f33), this.rng.aralik(160, 240), this.rng.aralik(0, Math.PI * 2));
    for (let i = 0; i < 4; i++) {
      const s = this.rng.aralik(3, 6);
      ekle(new Graphics().poly([0, -s, s, s, -s, s * 0.6]).fill(el.acik), this.rng.aralik(180, 320), this.rng.aralik(0, Math.PI * 2));
    }
    // Çekirdek yerde kalır, parlar (lore 6.3: Çekirdek yok olmaz)
    this.donen.visible = false;
    this.parlama.visible = false;
    this.takimCemberi.visible = false;
  }

  /**
   * Her kare. `x, y` mantıksal ekran (hitstop/yetişme Lab'de uygulanmış), `oran` stamina/max, `sekme` havada mı.
   * `yavas`: efekt saati çarpanı (Parçalanma yavaş çekimi).
   */
  guncelle(dt: number, x: number, y: number, oran: number, sekme: boolean, yavas = 1): void {
    const G = GORSEL;
    const p = this.profil;
    const yon = p.donus === "sol" ? -1 : 1;
    this.sonOran = oran;
    const k = kademeBul(oran, this.kademe);
    this.kademeUygula(k);
    // dönüş hızı (tur/s) kademeden
    let tur: number = G.donus.yuksek;
    if (k === "orta") tur = G.donus.ortaAlt + ((oran - G.kademeSiniri.dusuk) / (G.kademeSiniri.yuksek - G.kademeSiniri.dusuk)) * (G.donus.ortaUst - G.donus.ortaAlt);
    if (k === "dusuk") tur = G.donus.dusukAlt + (oran / G.kademeSiniri.dusuk) * (G.donus.dusukUst - G.donus.dusukAlt);
    const bd = this.bitisDurum;
    if (bd?.tur === "durma") tur *= Math.max(0, 1 - bd.t / G.durmaSure);
    this.aci += yon * tur * Math.PI * 2 * dt;
    this.cekirdekAci += yon * tur * 0.35 * Math.PI * 2 * dt;
    this.parlamaAci += yon * G.donus.parlama * Math.PI * 2 * dt;
    this.donen.rotation = this.aci;
    this.cekirdekKap.rotation = this.cekirdekAci;
    this.parlamaHalka.rotation = this.parlamaAci;
    // yalpa: stamina < %40 (salt görsel)
    const w = Math.max(0, Math.min(1, (AYAR.yalpaBaslangic - oran) / AYAR.yalpaBaslangic));
    const yr = w > 0 ? G.yalpa.tavanPx * Math.pow(w, G.yalpa.us) : 0;
    this.yalpaFaz += G.yalpa.hz * Math.PI * 2 * dt * yon;
    const ox = Math.cos(this.yalpaFaz) * yr;
    const oy = Math.sin(this.yalpaFaz) * yr;
    this.yalpaKap.position.set(ox, oy - (sekme ? G.sekmeYukseklik : 0));
    this.yalpaKap.scale.set(1 - G.yalpa.basik * w, 1);
    // gölge: yalpada ters yöne, sekmede ayrılır ve küçülür
    this.golge.position.set(x - ox * 0.5, y - oy * 0.5);
    this.golge.scale.set(sekme ? 0.7 : 1);
    // squash geri yaylanma
    if (this.squashD.kalan > 0) {
      this.squashD.kalan = Math.max(0, this.squashD.kalan - dt * yavas);
      const t = this.squashD.kalan / this.squashD.sure; // 1 → 0
      const e = t * t;
      this.sqKap.scale.set(1 + (this.squashD.sx - 1) * e, 1 + (this.squashD.sy - 1) * e);
    } else this.sqKap.scale.set(1);
    // flaş
    this.flasKatmani.alpha = this.flasKare > 0 ? 0.7 : 0;
    if (this.flasKare > 0) this.flasKare--;
    this.kok.position.set(x, y);
    this.bitisGuncelle(dt * yavas);
  }

  private bitisGuncelle(dt: number): void {
    const bd = this.bitisDurum;
    if (!bd) return;
    bd.t += dt;
    const G = GORSEL;
    if (bd.tur === "ringOut") {
      const t = Math.min(1, bd.t / G.ringOutSure);
      const u = Math.hypot(bd.vx, bd.vy) || 1;
      const ileri = 90 * (1 - (1 - t) * (1 - t));
      this.kok.position.set(this.kok.x + (bd.vx / u) * ileri, this.kok.y + (bd.vy / u) * ileri);
      this.kok.scale.set(1 - 0.5 * t);
      this.kok.alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      this.takimCemberi.visible = false;
      // gölge zeminde kalır ve şeffaflaşır
      this.golge.alpha = Math.max(0, 1 - t * 1.4);
    } else if (bd.tur === "durma") {
      const t = Math.min(1, bd.t / G.durmaSure);
      // yalpa → 20° eğilme → yan yatma: elips basıklığı + koyulaşma
      this.yalpaKap.scale.set(1 - 0.06, 1 - 0.45 * t);
      this.yalpaKap.rotation = 0.35 * t;
      const koyu = renkKaristir(0xffffff, 0x7a7a7a, t);
      this.donen.tint = koyu;
      this.cekirdek.tint = renkKaristir(0xffffff, 0x555555, t);
      this.golge.scale.set(1 + 0.2 * t, 1 - 0.2 * t);
    } else {
      // parçalanma: parçalar uçar, bir kez sekip kayar
      for (const p of this.parcalar) {
        p.g.x += p.vx * dt;
        p.g.y += p.vy * dt;
        p.g.rotation += p.w * dt;
        p.vyuk -= 600 * dt;
        p.yuk += p.vyuk * dt;
        if (p.yuk <= 0) {
          p.yuk = 0;
          if (!p.sekti) { p.vyuk = Math.abs(p.vyuk) * 0.35; p.sekti = true; }
          else p.vyuk = 0;
          p.vx *= 1 - 2.5 * dt;
          p.vy *= 1 - 2.5 * dt;
        }
        p.g.scale.set(1 + p.yuk / 120);
        p.g.alpha = Math.max(0, 1 - Math.max(0, bd.t - G.parcaSure * 0.6) / (G.parcaSure * 0.4));
      }
      const parla = 0.6 + 0.4 * Math.abs(Math.sin(bd.t * 10));
      this.cekirdek.alpha = parla;
    }
  }

  /** Görsel kademe (test ve Lab için). */
  get kademeAdi(): Kademe | null { return this.kademe; }
  get oran(): number { return this.sonOran; }

  yokEt(): void {
    for (const p of this.parcalar) p.g.destroy();
    this.golge.destroy();
    this.kok.destroy({ children: true });
  }
}
