import { Container, Graphics, Sprite, Texture } from "pixi.js";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import { diskBul } from "../../paylasilan/veri/katalog.ts";
import type { TopacProfili } from "../../paylasilan/veri/profil.ts";
import type { GorselBitis, Kademe, TakimIsareti, TopacCizimi } from "./cizimTurleri.ts";
import { ELEMENT_RENK, KOKEN_RENK, TAKIM_RENK, renkKaristir } from "./renkler.ts";
import { KAMERA } from "./kamera.ts";
import type { Sahne } from "./Sahne.ts";
import { SusRastgele } from "./SusRastgele.ts";
import { GORSEL, kademeBul, kanatSiluet } from "./TopacGorsel.ts";
import { kareDizisi, topacKatmanYukle, type YuklenenKatman } from "./TopacAtlas.ts";
import { govdeKaymasi, kareIndeksi } from "./topacKare.ts";

// GU-00 / GU-topaç: Hibrit kamerada yandan / üç çeyrek topaç (yer tutucu; nihai sprite sanat kolu, pixel planı § 3 (c)).
// Katmanlar alttan üste (pixel planı § 2.2, hibrit sırası): zemin gölgesi (elips, Disk yüksekliğine göre ayrılır) ·
// takım çemberi (zeminde elips; oyuncu düz + ▲, rakip kesikli + ◆) · Uç (koni) · Disk (ince silindir, kilit çıkıntıları) ·
// Gövde (silindir yan bandı + üst yüzde dönen kanat siluet, yatay düzlemde → y·zOranı) · Çekirdek (köken ışığı kubbe) ·
// dönmeyen parlama. 1 px koyu dış çizgi = element rampasının en koyusu. Hız kademeleri (§ 3.4): > %60 bulanık disk (eş merkezli
// halkalar + dönen ışık yayı), %25-60 bulanık kanat (iki hayalet), < %25 keskin kanat + yalpa (gövde eğilir, uç etrafında döner).
// ART-1: atlas (public/topac, veri/topac-gorsel.json; 3B → pixel) yüklenince Uç / Disk / Gövde / Çekirdek dört Sprite
// katmanı (aynı çapa = uç temas noktası, 1 doku pikseli = 1 sanat pikseli) kare dizisinden seçilir; çatlak ve flaş
// Graphics üstte kalır. Atlas yoksa ya da yüklenemezse aşağıdaki yordamsal çizim YEDEKtir. Sim'e hiçbir şey yazmaz.

const TAM = Math.PI * 2;
/** Topaç dikey ölçüleri (dünya px, zeminden yukarı). Üç çeyrek bakış: topacın kendi elips oranı KT (zeminin 0,62'sinden
 *  dik; uç ve disk gövdenin altından görünsün, referans 07). */
const H = {
  ucUst: 15,
  diskAlt: 15,
  diskUst: 24,
  govdeAlt: 24,
  govdeUst: 34,
  isaretY: 60,
} as const;
const KT = 0.5;

interface Parca { g: Graphics; x: number; y: number; vx: number; vy: number; w: number; yuk: number; vyuk: number; sekti: boolean }

/** Elips yayı (çokgen); a0 → a1, ry = rx · k. */
function elipsYol(g: Graphics, cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 24): void {
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
}

/** Silindir yan bandı (ön yarı): üst elips ön yarısı + alt elips ön yarısı (ters). */
function yanBant(rx: number, ry: number, yUst: number, yAlt: number): number[] {
  const p: number[] = [];
  const n = 20;
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI; p.push(Math.cos(a) * rx, yUst + Math.sin(a) * ry); }
  for (let i = n; i >= 0; i--) { const a = (i / n) * Math.PI; p.push(Math.cos(a) * rx, yAlt + Math.sin(a) * ry); }
  return p;
}

/** Döndürülmüş elips (gölge): merkez (cx, cy), yarıçaplar, açı. */
function golgePoligon(cx: number, cy: number, rx: number, ry: number, aci: number): number[] {
  const p: number[] = [];
  const c = Math.cos(aci), s = Math.sin(aci);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * TAM;
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    p.push(cx + x * c - y * s, cy + x * s + y * c);
  }
  return p;
}

let dither: Texture | null = null;
/** 2×2 dama dither dokusu (dünya pikseli 3: sanat ızgarasında ~2 px; düşen gölge kenarı). */
function ditherDokusu(): Texture {
  if (dither) return dither;
  const c = document.createElement("canvas");
  c.width = 6; c.height = 6;
  const x = c.getContext("2d")!;
  x.fillStyle = "#fff";
  x.fillRect(0, 0, 3, 3); x.fillRect(3, 3, 3, 3);
  dither = Texture.from(c);
  dither.source.scaleMode = "nearest";
  dither.source.addressMode = "repeat";
  return dither;
}

/** Yan bandın açı aralığı (0 = sağ uç, π = sol uç; ön yarı). Işık sol üstten: sol dilim açık, sağ dilim koyu. */
function yanBantAralik(rx: number, ry: number, yUst: number, yAlt: number, a0: number, a1: number): number[] {
  const p: number[] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; p.push(Math.cos(a) * rx, yUst + Math.sin(a) * ry); }
  for (let i = n; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / n; p.push(Math.cos(a) * rx, yAlt + Math.sin(a) * ry); }
  return p;
}

export class TopacYandan implements TopacCizimi {
  readonly kok = new Container();
  /** zemin: gölge + takım çemberi (gölge katmanında) */
  private zeminKap = new Container();
  private golge = new Graphics();
  private takimCemberi = new Graphics();
  private yalpaKap = new Container();
  private govdeKap = new Container();
  private sqKap = new Container();
  private icKap = new Container();
  private govde = new Graphics();
  private flasG = new Graphics();
  private isaret = new Graphics();
  private parcalar: Parca[] = [];
  /** ART-1 sprite katmanları (yüklenince); null = yordamsal çizim */
  private katman: { uc: YuklenenKatman; disk: YuklenenKatman; govde: YuklenenKatman; cekirdek: YuklenenKatman } | null = null;
  private spriteKap = new Container();
  private sp = { uc: new Sprite(), disk: new Sprite(), govde: new Sprite(), cekirdek: new Sprite() };
  private yukNo = 0;
  private diskSaat = 0;
  /** sprite kipinde üst yüz elipsi (çatlak/flaş hizası): merkez y ve basıklık */
  private spriteUst = { y: -H.govdeUst, k: KT };
  private kademe: Kademe | null = null;
  private aci = 0;
  private cekirdekAci = 0;
  private parlamaAci = 0;
  private yalpaFaz = 0;
  private squashD = { sx: 1, sy: 1, sure: 0, kalan: 0 };
  private flasKare = 0;
  private catlakSeviye = 0;
  private bitisDurum: { tur: GorselBitis; t: number; vx: number; vy: number; x0: number; y0: number; arkada: boolean } | null = null;
  private rng = new SusRastgele(0x70ad);
  private sonOran = 1;
  private yukseklik = 0;
  private yerX = 0;
  private yerY = 0;
  private k: number;

  constructor(private profil: TopacProfili, private takim: TakimIsareti, private sahne: Sahne) {
    this.k = KT;
    this.zeminKap.addChild(this.golge, this.takimCemberi);
    sahne.golgeKatmani.addChild(this.zeminKap);
    this.spriteKap.addChild(this.sp.uc, this.sp.disk, this.sp.govde, this.sp.cekirdek);
    this.spriteKap.visible = false;
    this.icKap.addChild(this.spriteKap, this.govde, this.flasG);
    this.sqKap.addChild(this.icKap);
    this.govdeKap.addChild(this.sqKap);
    this.yalpaKap.addChild(this.govdeKap);
    this.kok.addChild(this.yalpaKap, this.isaret);
    this.kok.scale.set(KAMERA.topacCizimOlcek);
    this.zeminKap.scale.set(KAMERA.topacCizimOlcek);
    this.zeminCiz();
    this.katmanYukle();
  }

  /** Sprite katmanı mı çiziliyor (test/Lab) */
  get spriteKatmani(): boolean { return this.katman !== null; }

  /** Dört katmanın atlasını iste; hepsi gelirse sprite kipine geç, biri yoksa yordamsal kalır. */
  private katmanYukle(): void {
    const no = ++this.yukNo;
    this.katman = null;
    this.spriteKap.visible = false;
    const pc = this.profil.parcalar;
    void Promise.all([
      topacKatmanYukle("uc", pc.uc), topacKatmanYukle("disk", pc.disk), topacKatmanYukle("govde", pc.govde, this.profil.element), topacKatmanYukle("cekirdek", pc.cekirdek),
    ]).then(([uc, disk, govde, cekirdek]) => {
      if (no !== this.yukNo || !uc || !disk || !govde || !cekirdek || this.kok.destroyed) return;
      this.katman = { uc, disk, govde, cekirdek };
      const kayma = govdeKaymasi(disk.tanim.ustZ, govde.tanim);
      const e = (govde.tanim.yukselti * Math.PI) / 180;
      this.spriteUst = { y: -(28 * Math.cos(e) + kayma * govde.tanim.birim), k: Math.sin(e) };
      for (const [ad, L] of Object.entries(this.katman) as [keyof typeof this.sp, YuklenenKatman][]) {
        const s = this.sp[ad];
        const t = L.tanim;
        s.anchor.set(t.capa[0] / t.kare[0], t.capa[1] / t.kare[1]);
        s.scale.set(t.birim);
        s.position.set(0, ad === "govde" || ad === "cekirdek" ? -kayma * t.birim : 0);
      }
      this.spriteKap.visible = this.bitisDurum?.tur !== "parcalanma";
    }, () => undefined);
  }

  /** Kademe + açıdan katman karelerini seç (§ 3.3: kare = floor(θ / (periyot/8)) mod 8; yüksek = 3 kare bulanık disk 12 fps). */
  private spriteCiz(kd: Kademe): void {
    const K = this.katman!;
    const sol = this.profil.donus === "sol";
    const sec = (ad: keyof typeof this.sp, kademe: Kademe, aci: number) => {
      const L = K[ad];
      const { dizi, solSatir } = kareDizisi(L, kademe, sol);
      const i = kademe === "yuksek" ? Math.floor(this.diskSaat * 12) % dizi.length : kareIndeksi(aci, L.tanim.simetri, dizi.length, solSatir);
      const doku = dizi[i];
      if (doku && this.sp[ad].texture !== doku) this.sp[ad].texture = doku;
    };
    sec("uc", kd, this.aci);
    sec("disk", kd, this.aci);
    sec("govde", kd, this.aci);
    sec("cekirdek", "dusuk", this.cekirdekAci);
  }

  get gorunurParcaSayisi(): number { return this.parcalar.length; }
  get bitti(): boolean { return this.bitisDurum !== null; }
  get kademeAdi(): Kademe | null { return this.kademe; }
  get oran(): number { return this.sonOran; }

  profilAyarla(p: TopacProfili, takim: TakimIsareti = this.takim): void {
    this.profil = p;
    this.takim = takim;
    this.kademe = null;
    this.zeminCiz();
    this.katmanYukle();
  }

  private zeminCiz(): void {
    const k = this.sahne.k;
    const disk = diskBul(this.profil.parcalar.disk);
    // gölge: elips, Disk yüksekliğine göre sağ-alta kayar (ışık sol üstten; pixel planı § 2.2 katman 0)
    const kayma = 3 + ((disk.yukseklik - 50) / 15) * 2;
    const g = this.golge.clear();
    // referans 07: sol-alta uzayan koyu düşen gölge (ışık sağ üstten), pixel dither kenar + koyu çekirdek
    // GU-C: daha uzun ve dolu: koyu çekirdek (düz renk) + yalnız kenarda dither saçağı; referans 07'de gölge topaçtan
    // yaklaşık bir çap kadar sol-alta uzanır ve zeminde net bir leke olarak okunur
    g.poly(golgePoligon(-kayma - 30, kayma * 0.5 + 13, 58, 21, -0.36)).fill({ texture: ditherDokusu(), textureSpace: "global", color: 0x000000, alpha: 0.42 });
    g.poly(golgePoligon(-kayma - 26, kayma * 0.5 + 11, 50, 16, -0.36)).fill({ color: 0x120c10, alpha: 0.42 });
    g.poly(golgePoligon(-kayma - 12, kayma * 0.4 + 5, 34, 13, -0.3)).fill({ color: 0x000000, alpha: 0.18 });
    g.ellipse(0, 0, 26, 26 * k * 0.85).fill({ color: 0x000000, alpha: 0.32 });
    // takım çemberi zeminde elips (ux § 6.1): oyuncu düz, rakip kesikli
    const tc = this.takimCemberi.clear();
    const R = GORSEL.takimCemberi;
    if (this.takim === "oyuncu") {
      tc.ellipse(0, 0, R, R * k).stroke({ width: 3, color: TAKIM_RENK.oyuncu, alpha: 0.95 });
    } else if (this.takim === "rakip") {
      const n = 18;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * TAM;
        elipsYol(tc, 0, 0, R, R * k, a0, a0 + TAM / n / 2, 4);
      }
      tc.stroke({ width: 3, color: TAKIM_RENK.rakip, alpha: 0.95 });
    }
    // ▲ / ◆ topacın üstünde (ekranda dik; renk tek kanal değil)
    const is = this.isaret.clear();
    const y = -H.isaretY;
    if (this.takim === "oyuncu") is.poly([0, y + 5, -6, y - 5, 6, y - 5]).fill(TAKIM_RENK.oyuncu).stroke({ width: 1.5, color: 0x0a1a24 });
    else if (this.takim === "rakip") is.poly([0, y - 6, 6, y, 0, y + 6, -6, y]).fill(TAKIM_RENK.rakip).stroke({ width: 1.5, color: 0x24081a });
  }

  squash(nx: number, ny: number, sx: number, sy: number, sure: number): void {
    const e = this.sahne.ekranYon(nx, ny);
    const a = Math.atan2(e.y, e.x);
    this.govdeKap.rotation = a;
    this.icKap.rotation = -a;
    this.squashD = { sx, sy, sure, kalan: sure };
  }

  catlakAyarla(oran: number): void { this.catlakSeviye = oran >= 0.9 ? 2 : oran >= 0.75 ? 1 : 0; }

  flas(kare: number): void { this.flasKare = Math.max(this.flasKare, kare); }

  bitis(tur: GorselBitis, vx: number, vy: number): void {
    const e = this.sahne.ekranYon(vx, vy);
    this.bitisDurum = { tur, t: 0, vx: e.x, vy: e.y, x0: this.yerX, y0: this.yerY, arkada: false };
    if (tur === "parcalanma") this.parcala(e.x, e.y);
  }

  sifirla(): void {
    this.bitisDurum = null;
    this.catlakSeviye = 0;
    for (const p of this.parcalar) p.g.destroy();
    this.parcalar = [];
    if (this.kok.parent !== this.sahne.nesneKatmani) this.sahne.nesneKatmani.addChild(this.kok);
    this.kok.alpha = 1;
    this.kok.scale.set(KAMERA.topacCizimOlcek);
    this.kok.visible = true;
    this.zeminKap.visible = true;
    this.zeminKap.alpha = 1;
    this.golge.scale.set(1);
    this.golge.alpha = 1;
    this.takimCemberi.visible = true;
    this.isaret.visible = true;
    this.yalpaKap.rotation = 0;
    this.yalpaKap.scale.set(1);
    this.govde.tint = 0xffffff;
    this.spriteKap.tint = 0xffffff;
    this.spriteKap.visible = this.katman !== null;
    this.squashD.kalan = 0;
    this.sqKap.scale.set(1);
    this.yukseklik = 0;
  }

  private parcala(vx: number, vy: number): void {
    const p = this.profil;
    const el = ELEMENT_RENK[p.element];
    const ust = this.sahne.efektKatmani;
    const ekle = (g: Graphics, hiz: number, aci: number, yuk: number) => {
      g.position.set(this.yerX, this.yerY - yuk);
      ust.addChild(g);
      this.parcalar.push({ g, x: this.yerX, y: this.yerY, vx: vx * 30 + Math.cos(aci) * hiz, vy: (vy * 30 + Math.sin(aci) * hiz) * this.sahne.k, w: this.rng.aralik(-14, 14), yuk, vyuk: this.rng.aralik(140, 240), sekti: false });
    };
    const n = Math.max(2, p.kanat);
    const siluet = kanatSiluet(n, GORSEL.govdeIc, GORSEL.govdeYaricap, p.donus === "sol");
    const dilim = siluet.length / 2 / n;
    for (let q = 0; q < n; q++) {
      const pts: number[] = [0, 0];
      for (let i = 0; i <= dilim; i++) {
        const j = ((q * dilim + i) % (siluet.length / 2)) * 2;
        pts.push(siluet[j] as number, (siluet[j + 1] as number) * this.k);
      }
      const g = new Graphics().poly(pts).fill(el.orta).stroke({ width: 1.5, color: el.koyu });
      g.poly([pts[2]!, pts[3]!, pts[4]!, pts[5]!, pts[4]!, pts[5]! + 5, pts[2]!, pts[3]! + 5]).fill(el.koyu);
      ekle(g, this.rng.aralik(140, 260), ((q + 0.5) / n) * TAM + this.aci, H.govdeUst);
    }
    ekle(new Graphics().ellipse(0, 0, GORSEL.diskYaricap, GORSEL.diskYaricap * this.k).stroke({ width: 4, color: 0x8d989e }), this.rng.aralik(40, 90), this.rng.aralik(0, TAM), H.diskUst);
    ekle(new Graphics().poly([-4, -8, 4, -8, 1, 0, -1, 0]).fill(0x2b2f33), this.rng.aralik(160, 240), this.rng.aralik(0, TAM), 6);
    for (let i = 0; i < 5; i++) {
      const s = this.rng.aralik(3, 6);
      ekle(new Graphics().poly([0, -s, s, s, -s, s * 0.6]).fill(el.acik).stroke({ width: 1, color: el.koyu }), this.rng.aralik(180, 320), this.rng.aralik(0, TAM), H.govdeUst);
    }
    this.takimCemberi.visible = false;
    this.isaret.visible = false;
  }

  guncelle(dt: number, x: number, y: number, oran: number, sekme: boolean, yavas = 1): void {
    const G = GORSEL;
    const p = this.profil;
    const yon = p.donus === "sol" ? -1 : 1;
    this.sonOran = oran;
    this.diskSaat += dt;
    const kd = kademeBul(oran, this.kademe);
    this.kademe = kd;
    let tur: number = G.donus.yuksek;
    if (kd === "orta") tur = G.donus.ortaAlt + ((oran - G.kademeSiniri.dusuk) / (G.kademeSiniri.yuksek - G.kademeSiniri.dusuk)) * (G.donus.ortaUst - G.donus.ortaAlt);
    if (kd === "dusuk") tur = G.donus.dusukAlt + (oran / G.kademeSiniri.dusuk) * (G.donus.dusukUst - G.donus.dusukAlt);
    const bd = this.bitisDurum;
    if (bd?.tur === "durma") tur *= Math.max(0, 1 - bd.t / G.durmaSure);
    this.aci += yon * tur * TAM * dt;
    this.cekirdekAci += yon * tur * 0.35 * TAM * dt;
    this.parlamaAci += yon * G.donus.parlama * TAM * dt;
    // yalpa (salt görsel, %40'ta başlar): gövde uç etrafında küçük yörünge + eğilme
    const w = Math.max(0, Math.min(1, (AYAR.yalpaBaslangic - oran) / AYAR.yalpaBaslangic));
    const yr = w > 0 ? G.yalpa.tavanPx * Math.pow(w, G.yalpa.us) : 0;
    this.yalpaFaz += G.yalpa.hz * TAM * dt * yon;
    const ox = Math.cos(this.yalpaFaz) * yr;
    const oy = Math.sin(this.yalpaFaz) * yr * this.sahne.k;
    // sekme: yumuşak yükselme, gölge yerde kalır ve küçülür
    const hedef = sekme ? KAMERA.sekmeYukseklik : 0;
    this.yukseklik += (hedef - this.yukseklik) * Math.min(1, dt * 18);
    this.yerX = x;
    this.yerY = y;
    this.zeminKap.position.set(x, y);
    this.golge.position.set(-ox * 0.5, -oy * 0.5);
    const ayr = this.yukseklik / KAMERA.sekmeYukseklik;
    this.golge.scale.set(1 - 0.3 * ayr);
    this.golge.alpha = 1 - 0.35 * ayr;
    this.kok.position.set(x, y);
    this.kok.zIndex = y;
    this.yalpaKap.position.set(ox, oy - this.yukseklik);
    this.yalpaKap.rotation = (ox / Math.max(1, G.yalpa.tavanPx)) * 0.22;
    // squash geri yaylanma (gövde merkezi etrafında: sqKap'ı gövde ortasına taşı)
    this.govdeKap.position.set(0, -H.govdeAlt);
    this.govde.position.set(0, H.govdeAlt);
    this.spriteKap.position.set(0, H.govdeAlt);
    this.flasG.position.set(0, H.govdeAlt);
    if (this.squashD.kalan > 0) {
      this.squashD.kalan = Math.max(0, this.squashD.kalan - dt * yavas);
      const t = this.squashD.kalan / this.squashD.sure;
      const e = t * t;
      this.sqKap.scale.set(1 + (this.squashD.sx - 1) * e, 1 + (this.squashD.sy - 1) * e);
    } else this.sqKap.scale.set(1);
    this.ciz(kd, w);
    this.flasG.visible = this.flasKare > 0;
    if (this.flasKare > 0) this.flasKare--;
    this.bitisGuncelle(dt * yavas);
  }

  // ---------------------------------------------------------------- çizim (yerel: (0,0) = zemin temas noktası)
  private ciz(kd: Kademe, yalpa: number): void {
    const g = this.govde.clear();
    const k = this.k;
    const p = this.profil;
    const el = ELEMENT_RENK[p.element];
    const ko = KOKEN_RENK[p.koken];
    const sol = p.donus === "sol";
    const RG = GORSEL.govdeYaricap - 1;
    if (this.katman) {
      this.spriteCiz(kd);
      this.ustCizim(g, this.spriteUst.y, RG, this.spriteUst.k);
      return;
    }
    const RD = GORSEL.diskYaricap - 3;
    const cizgi = { width: 1.5, color: el.koyu };
    const metal = 0x8d989e;
    const metalKoyu = 0x4b555a;
    const metalAcik = 0xc9d1d4;
    // Uç: koni (yalnız yalpada ve yatışta belirgin)
    g.poly([-2, 0, 2, 0, 9, -H.ucUst, -9, -H.ucUst]).fill(0x2b2f33).stroke({ width: 1.5, color: 0x111316 });
    g.rect(-4, -H.ucUst + 2, 2, H.ucUst - 5).fill({ color: 0x6b757a, alpha: 0.9 });
    // Disk: ince silindir + kilit çıkıntıları (burst katkısı kadar) yanda dönen çentik
    const disk = diskBul(p.parcalar.disk);
    g.poly(yanBant(RD, RD * k, -H.diskUst, -H.diskAlt)).fill(metalKoyu).stroke({ width: 1.5, color: 0x22282b });
    g.poly(yanBantAralik(RD - 0.5, (RD - 0.5) * k, -H.diskUst, -H.diskAlt, Math.PI * 0.62, Math.PI * 0.95)).fill(metal);
    g.ellipse(0, -H.diskUst, RD, RD * k).fill(metal).stroke({ width: 1.5, color: 0x22282b });
    const cik = Math.max(3, disk.katki.burstEsik);
    for (let i = 0; i < cik; i++) {
      const a = this.aci * 0.5 + (i / cik) * TAM;
      const s = Math.sin(a);
      if (s <= 0.05) continue;
      const cx = Math.cos(a) * RD;
      g.rect(cx - 1.5, -H.diskUst + s * RD * k - 1, 3, 4).fill(metalAcik);
    }
    // Gövde yan bandı (silindir ön yüzü), dönen sırt çizgileri (dönüş hissi)
    const ustY = -H.govdeUst;
    g.poly(yanBant(RG, RG * k, ustY, -H.govdeAlt)).fill(renkKaristir(el.koyu, el.orta, 0.35)).stroke(cizgi);
    // pixel bant gölgelemesi: sol dilimler açık (ışık), sağ dilim koyu; üstte ince parlak dudak
    g.poly(yanBantAralik(RG - 0.5, (RG - 0.5) * k, ustY, -H.govdeAlt, Math.PI * 0.6, Math.PI * 0.98)).fill(el.orta);
    g.poly(yanBantAralik(RG - 0.5, (RG - 0.5) * k, ustY + 1, -H.govdeAlt - 2, Math.PI * 0.8, Math.PI * 0.9)).fill(el.acik);
    g.poly(yanBantAralik(RG - 0.5, (RG - 0.5) * k, ustY, -H.govdeAlt, Math.PI * 0.02, Math.PI * 0.22)).fill(el.koyu);
    g.poly(yanBant(RG - 2, (RG - 2) * k, ustY + 1, ustY + 3)).fill({ color: el.acik, alpha: 0.55 });
    // disk ile gövde arası koyu gölge çizgisi (katman ayrımı okunur)
    elipsYol(g, 0, -H.govdeAlt, RG - 1, (RG - 1) * k, 0.08, Math.PI - 0.08, 16);
    g.stroke({ width: 2, color: renkKaristir(el.koyu, 0x000000, 0.45) });
    const sirt = kd === "yuksek" ? 0 : 10;
    for (let i = 0; i < sirt; i++) {
      const a = (sol ? -1 : 1) * this.aci + (i / sirt) * TAM;
      const s = Math.sin(a);
      if (s < 0.15) continue;
      const sx = Math.cos(a) * RG;
      g.rect(sx - 1, ustY + s * RG * k + 2, 2, 5).fill({ color: el.acik, alpha: 0.6 * s });
    }
    if (kd === "yuksek") g.poly(yanBant(RG, RG * k, ustY + 3, -H.govdeAlt - 1)).fill({ color: el.orta, alpha: 0.35 });
    // Üst yüz
    if (kd === "yuksek") {
      // bulanık disk: eş merkezli halkalar + dönen ışık yayı
      g.ellipse(0, ustY, RG, RG * k).fill(el.orta).stroke(cizgi);
      g.ellipse(0, ustY, RG - 5, (RG - 5) * k).fill(el.acik);
      g.ellipse(0, ustY, RG - 9, (RG - 9) * k).fill(renkKaristir(el.orta, el.acik, 0.4));
      elipsYol(g, 0, ustY, RG - 13, (RG - 13) * k, 0, TAM, 24);
      g.stroke({ width: 1.5, color: el.koyu, alpha: 0.55 });
      g.ellipse(0, ustY, GORSEL.govdeIc - 2, (GORSEL.govdeIc - 2) * k).fill(el.koyu);
      g.ellipse(0, ustY, GORSEL.govdeIc - 5, (GORSEL.govdeIc - 5) * k).fill(renkKaristir(el.orta, 0x000000, 0.25));
      elipsYol(g, 0, ustY, RG - 3, (RG - 3) * k, this.parlamaAci, this.parlamaAci + 1.0, 8);
      g.stroke({ width: 2.5, color: 0xffffff, alpha: 0.75 });
      elipsYol(g, 0, ustY, RG - 3, (RG - 3) * k, this.parlamaAci + Math.PI, this.parlamaAci + Math.PI + 0.7, 6);
      g.stroke({ width: 2, color: el.vurgu, alpha: 0.7 });
    } else {
      const siluet = kanatSiluet(p.kanat, GORSEL.govdeIc, RG, sol);
      const don = (aci: number) => {
        const c = Math.cos(aci), s = Math.sin(aci);
        const o: number[] = [];
        for (let i = 0; i < siluet.length; i += 2) {
          const x = siluet[i]!, y = siluet[i + 1]!;
          o.push(x * c - y * s, ustY + (x * s + y * c) * k);
        }
        return o;
      };
      g.ellipse(0, ustY, GORSEL.govdeIc + 1, (GORSEL.govdeIc + 1) * k).fill(el.koyu);
      if (kd === "orta") {
        const yn = sol ? 1 : -1;
        g.poly(don(this.aci + yn * 0.42)).fill({ color: el.acik, alpha: 0.22 });
        g.poly(don(this.aci + yn * 0.21)).fill({ color: el.acik, alpha: 0.35 });
      }
      g.poly(don(this.aci)).fill(el.orta).stroke(cizgi);
      // kanat uçlarında vurgu
      for (let i = 0; i < p.kanat; i++) {
        const a = this.aci + (i / p.kanat) * TAM + (sol ? -1 : 1) * (TAM * 0.55) / p.kanat;
        g.rect(Math.cos(a) * (RG - 5) - 1.5, ustY + Math.sin(a) * (RG - 5) * k - 1.5, 3, 3).fill(el.vurgu);
      }
      g.ellipse(0, ustY, GORSEL.govdeIc - 4, (GORSEL.govdeIc - 4) * k).fill(renkKaristir(el.orta, 0x000000, 0.3)).stroke({ width: 1, color: el.koyu });
    }
    this.catlakCiz(g, ustY, RG, k);
    // Çekirdek: köken ışığı kubbe + Lv. çemberi (yavaş döner)
    const cy = ustY - 2;
    g.ellipse(0, cy, GORSEL.cekirdekYaricap + 2, (GORSEL.cekirdekYaricap + 2) * k).fill(ko.ikinci).stroke({ width: 1.5, color: renkKaristir(ko.ikinci, 0x000000, 0.5) });
    g.ellipse(0, cy - 3, GORSEL.cekirdekYaricap - 1, (GORSEL.cekirdekYaricap - 1) * k + 1).fill(ko.isik);
    const ca = this.cekirdekAci;
    g.rect(Math.cos(ca) * 4 - 1, cy - 3 + Math.sin(ca) * 4 * k - 1, 2, 2).fill(0xffffff);
    elipsYol(g, 0, cy, GORSEL.cekirdekYaricap + 4, (GORSEL.cekirdekYaricap + 4) * k, ca, ca + Math.PI, 10);
    g.stroke({ width: 1, color: ko.isik, alpha: 0.6 });
    // dönmeyen parlama: sol üst (ışık yönü sabit)
    g.ellipse(-RG * 0.45, ustY - RG * k * 0.45, 7, 3).fill({ color: 0xffffff, alpha: 0.28 });
    g.rect(-RG * 0.55, ustY - RG * k * 0.5 - 1, 3, 2).fill({ color: 0xffffff, alpha: 0.6 });
    // düşük kademe yalpa: koyulaşan yan band (yorgunluk okunur)
    if (yalpa > 0.4) g.poly(yanBant(RG, RG * k, ustY, -H.govdeAlt)).fill({ color: 0x000000, alpha: 0.12 * yalpa });
    this.flasCiz(RG, ustY, k);
  }

  /** Sprite kipinde üst katmanlar: çatlak (üst yüzde) + flaş. */
  private ustCizim(g: Graphics, ustY: number, RG: number, k: number): void {
    this.catlakCiz(g, ustY, RG, k);
    this.flasCiz(RG, ustY, k);
  }

  private catlakCiz(g: Graphics, ustY: number, RG: number, k: number): void {
    // H12 çatlak çizgileri (üst yüzde)
    if (this.catlakSeviye > 0) {
      const ciz = (pts: number[]) => {
        const q = pts.map((v, i) => (i % 2 ? ustY + v * k : v));
        g.poly(q, false).stroke({ width: 3, color: 0x111111, alpha: 0.85 });
        g.poly(q, false).stroke({ width: 1.2, color: 0xffffff, alpha: 0.95 });
      };
      ciz([2, -4, 8, -12, 12, -RG + 2]);
      ciz([-3, 5, -12, 8, -RG + 6, 18]);
      if (this.catlakSeviye === 2) { ciz([4, 6, 14, 10, RG - 2, 6]); ciz([-5, -3, -14, -8, -10, -RG + 4]); }
    }
  }

  private flasCiz(RG: number, ustY: number, k: number): void {
    // flaş: beyaz siluet. GU-C: sprite kipinde hafif dolgu + parlak kenar (referans 07'de çarpışma anında topacın rengi
    // okunur; tam beyazlama Element rengini siliyordu)
    if (this.flasKare > 0) {
      const f = this.flasG.clear();
      if (this.katman) {
        // sprite kipi: yalnız parlak kenar (dolgu sprite'ı soluk/hayalet gösteriyordu)
        f.ellipse(0, ustY, RG * 0.86, RG * 0.86 * this.spriteUst.k).stroke({ width: 2, color: 0xfff6d0, alpha: 0.95 });
      } else {
        f.poly(yanBant(RG + 1, (RG + 1) * k, ustY, -H.ucUst)).fill({ color: 0xffffff, alpha: 0.55 });
        f.ellipse(0, ustY, RG + 1, (RG + 1) * k).fill({ color: 0xffffff, alpha: 0.55 });
      }
      f.position.set(0, H.govdeAlt);
    }
  }

  private bitisGuncelle(dt: number): void {
    const bd = this.bitisDurum;
    if (!bd) return;
    bd.t += dt;
    const G = GORSEL;
    if (bd.tur === "ringOut") {
      // dışa fırlar, dudağı aşar, düşer; uzak yarıda (ekranda yukarı) duvarın ARKASINA geçer
      const t = Math.min(1, bd.t / (G.ringOutSure * 1.6));
      const ileri = 95 * (1 - (1 - t) * (1 - t));
      const yuk = 26 * Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5) - Math.max(0, t - 0.45) * 160;
      const x = bd.x0 + bd.vx * ileri;
      const y = bd.y0 + bd.vy * ileri;
      this.kok.position.set(x, y);
      this.yalpaKap.position.y = -yuk;
      this.yalpaKap.rotation += dt * 6 * (bd.vx >= 0 ? 1 : -1);
      if (!bd.arkada && bd.vy < -0.2 && t > 0.42) { bd.arkada = true; this.sahne.arkaNesneKatmani.addChild(this.kok); }
      this.kok.alpha = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
      this.takimCemberi.visible = false;
      this.isaret.visible = false;
      this.zeminKap.alpha = Math.max(0, 1 - t * 2.2);
    } else if (bd.tur === "durma") {
      // yalpa → eğilme → yan yatma; koyulaşma
      const t = Math.min(1, bd.t / G.durmaSure);
      this.yalpaKap.rotation = 1.15 * t * t;
      this.yalpaKap.position.y = -this.yukseklik + 6 * t;
      this.govde.tint = renkKaristir(0xffffff, 0x7a7a7a, t);
      this.spriteKap.tint = this.govde.tint;
      this.golge.scale.set(1 + 0.25 * t, 1);
      this.isaret.alpha = 1 - t;
    } else {
      for (const p of this.parcalar) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.g.rotation += p.w * dt;
        p.vyuk -= 620 * dt;
        p.yuk += p.vyuk * dt;
        if (p.yuk <= 0) {
          p.yuk = 0;
          if (!p.sekti) { p.vyuk = Math.abs(p.vyuk) * 0.35; p.sekti = true; } else p.vyuk = 0;
          p.vx *= 1 - 2.5 * dt;
          p.vy *= 1 - 2.5 * dt;
        }
        p.g.position.set(p.x, p.y - p.yuk);
        p.g.alpha = Math.max(0, 1 - Math.max(0, bd.t - G.parcaSure * 0.6) / (G.parcaSure * 0.4));
      }
      // gövde gider, Çekirdek yerde parlar (lore 6.3: Çekirdek yok olmaz)
      const g = this.govde.clear();
      const ko = KOKEN_RENK[this.profil.koken];
      const parla = 0.6 + 0.4 * Math.abs(Math.sin(bd.t * 10));
      g.ellipse(0, -2, 16, 16 * this.k).fill({ color: ko.isik, alpha: 0.25 * parla });
      g.ellipse(0, -4, GORSEL.cekirdekYaricap + 1, (GORSEL.cekirdekYaricap + 1) * this.k + 1).fill({ color: ko.ikinci, alpha: parla }).stroke({ width: 1.5, color: 0x000000, alpha: 0.5 });
      g.ellipse(0, -6, GORSEL.cekirdekYaricap - 2, (GORSEL.cekirdekYaricap - 2) * this.k).fill({ color: ko.isik, alpha: parla });
      this.flasG.visible = false;
      this.spriteKap.visible = false;
      this.yalpaKap.rotation = 0;
      this.yalpaKap.position.set(0, 0);
      this.govdeKap.position.set(0, 0);
      this.govde.position.set(0, 0);
      this.golge.alpha = 0.5;
    }
  }

  yokEt(): void {
    this.yukNo++;
    for (const p of this.parcalar) p.g.destroy();
    this.zeminKap.destroy({ children: true });
    this.kok.destroy({ children: true });
  }
}
