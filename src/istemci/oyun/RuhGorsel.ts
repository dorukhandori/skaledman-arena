import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from "pixi.js";
import type { ElementAdi } from "../../paylasilan/kurallar/ayar.ts";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import type { Dunya, Olay } from "../../paylasilan/sim/durum.ts";
import { RUHLAR, YETENEKLER, cekirdekBul } from "../../paylasilan/veri/katalog.ts";
import type { TopacProfili } from "../../paylasilan/veri/profil.ts";
import { ELEMENT_RENK, TAKIM_RENK } from "./renkler.ts";
import { SAHNE, type Sahne } from "./Sahne.ts";

// Kutsal canavar belirmesi (docs/design/beyblade/06-kutsal-canavarlar.md). Yalnız istemci sunumu: sunucunun zaten
// yolladığı `yetenekBasladi` olayından tetiklenir, sim/hash/protokol değişmez.
//   kademe 2 Özel Yetenek → çekirdeğin ruhu (Gemini portresi) topacın arkasından yükselir ("Bağlı belirme").
//   kademe 3 Ulti        → elementin Ata'sı (Tripo 3B → Blender kare animasyonu) uyanır ("Tam rezonans").
//   kademe 4 Takım Ultisi → takımın üç ruhu yay hâlinde.
// Canavar YetenekGorsel'in zemin kabında (hibritte basık zemin düzlemi), dekal/telegraf/nişandan ÖNCE eklenir: telegraf ve
// topaçlar hep öndedir. Konumlar düz sim koordinatında (sx, sy); her belirme düzlemin basıklığını (1/k) ve kamera
// yakınlığını (1/B) ters ölçekle telafi eder, böylece canavar dik durur ve ekranda sabit boyda görünür. Bantlar ekran
// katmanında (dunyadanEkrana). Hibritte dünya 480×270 pixel önbelleğine çizildiği için canavar da pikselleşir.
// Doku yüklenmemişse `yedek` (eski vektör silüet) çizilir; oyun beklemez.

/**
 * Sahip kararı (2026-11-05, kapsam = pixel planı § 4): ilk sürümde canavar yalnız Ulti'de (element başına 1 Ata).
 * 21 ruh portresi varlık olarak hazır; Özel Yetenek'te (ve Takım Ultisi'nde portre olarak) belirmesi bu bayrakla açılır.
 * Kapalıyken Takım Ultisi eski kod silüetini (ruhSiluet.ts) kullanır.
 */
export const RUH_PORTRE_OZEL_YETENEK = false;

/** Bayrak + yalnız `?debug&ruhportre=1` geçersiz kılması (SANAT entegrasyon doğrulaması; oyuncu sürümünde etkisiz). */
export function ruhPortreAcik(): boolean {
  if (RUH_PORTRE_OZEL_YETENEK) return true;
  try { const q = new URLSearchParams(location.search); return q.has("debug") && q.get("ruhportre") === "1"; } catch { return false; }
}

const ATA_SAYFA = { hucre: 176, sutun: 6, fps: 16, yukselisSon: 9, kukremeIlk: 10, kukremeSon: 15, donguIlk: 16, donguSon: 23 } as const;
const ATA_OLCEK = 2.4;
/** Ata'nın ayak çizgisi bu aralıkta tutulur: gövdesi HUD'un altına taşmaz, alt kenardan çıkmaz. */
const ATA_AYAK_MIN = 330;
const ATA_AYAK_MAX = 515;
/** Ata çağıranın bu kadar ekran pikseli gerisinde (yukarısında) durur: topaç canavarın önünde okunur (referans 08). */
const ATA_GERI = 40;
/** Ata'nın tepesi en az bu ekran y'sinde kalır; ölçek gerekirse küçülür. Hücrenin üst ~%20'si boş. */
const ATA_TEPE_MIN = 40;
const ATA_DOLU_ORAN = 0.74;
const ATA_CIKIS_SN = 0.35;
const BAGLI_BOY = 190;
const BAGLI_YUKSELIS_SN = 0.28;
const BAGLI_CIKIS_SN = 0.3;
const BAGLI_ALFA = 0.85;
/** Ata yarı saydam "hayalet" (referans 08): gövde %55, üstüne element renginde toplamalı ışık. */
const ATA_ALFA = 0.55;
const ATA_ISIK_ALFA = 0.42;
/** Takım Ultisi: üç Ata yay hâlinde (ortadaki önde ve büyük), aralarında belirme gecikmesi (s). */
const TAKIM_ATA_OLCEK = [0.62, 0.78, 0.62] as const;
const TAKIM_ATA_DX = 210;
const TAKIM_ATA_ARALIK = 0.2;
const r = AYAR.topacYaricap;

type Flas = "normal" | "azaltilmis" | "kapali";
type YedekCizici = (el: ElementAdi) => Graphics;

interface Belirme {
  tur: "bagli" | "ata";
  el: ElementAdi;
  t: number;
  /** Tutma süresi (s); sonra çıkış. */
  sure: number;
  gecikme: number;
  kap: Container;
  govde: Container;
  aura: Sprite | null;
  bant: Container;
  yukseklik: number;
  ataKareleri: Texture[] | null;
  ataSprite: Sprite | null;
  ataAura: Sprite | null;
  kukredi: boolean;
  x: number;
  y: number;
  parcacik: number;
}

const sx = (x: number) => SAHNE.merkezX + x;
const sy = (z: number) => SAHNE.merkezY + z;

export function ruhKimligi(p: TopacProfili): string | null {
  try { return cekirdekBul(p.parcalar.cekirdek).ruh; } catch { return null; }
}

const portreYolu = (ruhId: string) => `/ruh/portre/${ruhId}.png`;
const ataYolu = (el: ElementAdi) => `/ruh/ata/${el}.png`;

export class RuhGorsel {
  readonly kap = new Container();
  private ust = new Graphics();
  private vinyet = new Graphics();
  private bantKap = new Container();
  private belirmeler: Belirme[] = [];
  private dokular = new Map<string, Texture>();
  private istenen = new Set<string>();
  private ataKareCache = new Map<ElementAdi, Texture[]>();
  private imza = "";
  private readonly portre = ruhPortreAcik();
  private vinyetKalan = 0;
  private vinyetSure = 0;
  flas: Flas = "normal";
  readonly sayac = { bagli: 0, ata: 0, takim: 0, yedek: 0, kukreme: 0 };

  constructor(private sahne: Sahne, private yerel: number, private yedek: YedekCizici) {
    sahne.ustDuzlem.addChild(this.ust);
    sahne.ekranKatmani.addChild(this.vinyet, this.bantKap);
  }

  /** Ekran pikseli → zemin düzlemi yerel ölçeği (x, y). */
  private get olcekX(): number { return 1 / this.sahne.yakinlik; }
  private get olcekY(): number { return 1 / (this.sahne.yakinlik * this.sahne.k); }

  /** Mantıksal ekran noktası → düz sim çizim koordinatı (zemin düzlemi içi). */
  private ekrandanDuze(ex: number, ey: number): { x: number; y: number } {
    const B = this.sahne.yakinlik;
    const wx = SAHNE.merkezX + (ex - SAHNE.merkezX) / B;
    const wy = SAHNE.merkezY + (ey - SAHNE.merkezY) / B;
    return { x: wx, y: SAHNE.merkezY + (wy - this.sahne.my) / this.sahne.k };
  }

  /** Düz sim çizim koordinatı → mantıksal ekran. */
  private duzdenEkrana(fx: number, fy: number): { x: number; y: number } {
    return this.sahne.dunyadanEkrana(fx, this.sahne.my + (fy - SAHNE.merkezY) * this.sahne.k);
  }

  /** Maçtaki ruh ve Ata dokularını önceden yükler (imza değişince). */
  onYukle(d: Dunya): void {
    const ruhlar = new Set<string>();
    const elementler = new Set<ElementAdi>();
    const ekle = (p: TopacProfili) => { const id = ruhKimligi(p); if (id) ruhlar.add(id); elementler.add(p.element); };
    for (const p of d.profiller) ekle(p);
    if (d.takimlar) for (const tk of d.takimlar) for (const u of tk.uyeler) ekle(u.profil);
    const imza = [...ruhlar].sort().join(",") + "|" + [...elementler].sort().join(",");
    if (imza === this.imza) return;
    this.imza = imza;
    if (this.portre) for (const id of ruhlar) this.yukle(portreYolu(id));
    for (const el of elementler) this.yukle(ataYolu(el));
  }

  private yukle(yol: string): void {
    if (this.istenen.has(yol)) return;
    this.istenen.add(yol);
    Assets.load<Texture>(yol).then((t) => {
      t.source.scaleMode = "nearest";
      this.dokular.set(yol, t);
    }).catch(() => { /* yok: yedek silüet kullanılır */ });
  }

  temizle(): void {
    for (const b of this.belirmeler) { b.kap.destroy({ children: true }); b.bant.destroy({ children: true }); }
    this.belirmeler = [];
    this.vinyet.clear();
    this.ust.clear();
    this.vinyetKalan = 0;
  }

  olay(o: Olay, d: Dunya): void {
    if (o.tur !== "yetenekBasladi") return;
    const p = d.profiller[o.i];
    const t = d.topaclar[o.i];
    if (!p || !t) return;
    const tutma = o.telegraf / AYAR.adimHz;
    const yetenekAd = YETENEKLER[o.no]?.ad ?? "";
    if (o.kademe === 2) {
      if (!this.portre) return;
      const id = ruhKimligi(p);
      const ruh = RUHLAR.find((x) => x.id === id);
      this.bagliBaslat(o.i, p.element, id, `${ruh?.ad ?? "Ruh"} · ${yetenekAd}`, sx(t.x), sy(t.z), tutma + 0.5, 0);
      this.sayac.bagli++;
    } else if (o.kademe === 3) {
      // Ad bandı yok: HUD zaten "ULTİ · <ad>" bandını gösterir (sadelik: anda tek mesaj; referans 08'de yazı yok)
      this.ataBaslat(p.element, sx(t.x), sy(t.z), tutma + 0.9, { olcek: 1, dx: 0, gecikme: 0, ana: true });
      this.sayac.ata++;
    } else if (o.kademe === 4 && d.takimlar && !this.portre) {
      // Takım Ultisi (sahip kapsamı: Ulti katmanında Ata): takımın üç Ata'sı yay hâlinde; ortadaki çağıranın arkasında
      const uyeler = d.takimlar[o.i]!.uyeler;
      const sira = [1, 0, 2];
      for (const k of sira) {
        const u = uyeler[k];
        if (!u) continue;
        this.ataBaslat(u.profil.element, sx(t.x), sy(t.z), tutma + 0.9, { olcek: TAKIM_ATA_OLCEK[k]!, dx: (k - 1) * TAKIM_ATA_DX, gecikme: Math.abs(k - 1) * TAKIM_ATA_ARALIK, ana: k === 1 });
      }
      this.sayac.takim++;
    } else if (o.kademe === 4 && d.takimlar) {
      const uyeler = d.takimlar[o.i]!.uyeler;
      uyeler.forEach((u, k) => {
        const id = ruhKimligi(u.profil);
        const ruh = RUHLAR.find((x) => x.id === id);
        const aci = (k - 1) * 0.9;
        this.bagliBaslat(o.i, u.profil.element, id, k === 1 ? (ruh ? `Takım Ultisi · ${ruh.ad}` : "Takım Ultisi") : "", sx(t.x) + Math.sin(aci) * 120, sy(t.z) - Math.abs(aci) * 20, tutma + 0.6, k * 0.2);
      });
      this.sayac.takim++;
    }
  }

  // ---- kurulum ----
  /** Canavarın ayağında element renginde zemin ışığı (toplamalı); topaçların altında kalır. */
  private zeminIsigi(el: ElementAdi, R: number): Graphics {
    const c = ELEMENT_RENK[el];
    const g = new Graphics();
    for (let k = 4; k >= 1; k--) g.ellipse(0, -6, (R * k) / 4, (R * k) / 4 * 0.32).fill({ color: k > 2 ? c.orta : c.acik, alpha: 0.13 });
    g.blendMode = "add";
    return g;
  }

  private bandKur(metin: string, alt: string, el: ElementAdi, i: number, buyuk: boolean): Container {
    const c = ELEMENT_RENK[el];
    const kap = new Container();
    const takim = i === this.yerel ? TAKIM_RENK.oyuncu : TAKIM_RENK.rakip;
    const ust = new Text({ text: metin, style: { fontFamily: "Jersey 10, m5x7, system-ui, sans-serif", fontSize: buyuk ? 30 : 18, fontWeight: "400", letterSpacing: buyuk ? 3 : 1, fill: c.vurgu, stroke: { color: 0x05050a, width: buyuk ? 5 : 3 } } });
    ust.anchor.set(0.5, 0);
    kap.addChild(ust);
    let gen = ust.width;
    if (alt) {
      const a = new Text({ text: alt, style: { fontFamily: "m5x7, system-ui, sans-serif", fontSize: 16, fontWeight: "400", fill: c.acik, stroke: { color: 0x05050a, width: 3 } } });
      a.anchor.set(0.5, 0);
      a.y = ust.height - 2;
      kap.addChild(a);
      gen = Math.max(gen, a.width);
    }
    const cizgi = new Graphics().rect(-gen / 2 - 10, -4, gen + 20, 3).fill({ color: takim, alpha: 0.95 });
    kap.addChildAt(cizgi, 0);
    kap.alpha = 0;
    this.bantKap.addChild(kap);
    return kap;
  }

  private bagliBaslat(i: number, el: ElementAdi, ruhId: string | null, bantMetni: string, x: number, y: number, sure: number, gecikme: number): void {
    const kap = new Container();
    const govde = new Container();
    const doku = ruhId ? this.dokular.get(portreYolu(ruhId)) : undefined;
    let aura: Sprite | null = null;
    let yukseklik = BAGLI_BOY;
    if (doku) {
      const olcek = BAGLI_BOY / Math.max(doku.width, doku.height);
      aura = new Sprite(doku);
      aura.anchor.set(0.5, 1);
      aura.scale.set(olcek * 1.08);
      aura.tint = ELEMENT_RENK[el].acik;
      aura.blendMode = "add";
      const s = new Sprite(doku);
      s.anchor.set(0.5, 1);
      s.scale.set(olcek);
      govde.addChild(aura, s);
      yukseklik = doku.height * olcek;
    } else {
      const g = this.yedek(el);
      g.y = -110;
      govde.addChild(g);
      this.sayac.yedek++;
    }
    // maske/filtre yok: hibritte dünya pixel önbelleğine (cacheAsTexture) çizilir, maske ve bulanıklık orada bozuluyor
    kap.addChild(this.zeminIsigi(el, 90), govde);
    kap.position.set(x, y + r * 0.6);
    kap.scale.set(this.olcekX, this.olcekY);
    kap.alpha = 0;
    this.kap.addChild(kap);
    const bant = this.bandKur(bantMetni, "", el, i, false);
    const be = this.duzdenEkrana(x, y + r);
    bant.position.set(be.x, be.y + 10);
    this.belirmeler.push({ tur: "bagli", el, t: -gecikme, sure, gecikme, kap, govde, aura, bant, yukseklik, ataKareleri: null, ataSprite: null, ataAura: null, kukredi: true, x, y, parcacik: 0 });
  }

  private ataKareleri(el: ElementAdi): Texture[] | null {
    const hazir = this.ataKareCache.get(el);
    if (hazir) return hazir;
    const sayfa = this.dokular.get(ataYolu(el));
    if (!sayfa) return null;
    const h = ATA_SAYFA.hucre;
    const kareler: Texture[] = [];
    for (let k = 0; k <= ATA_SAYFA.donguSon; k++) {
      kareler.push(new Texture({ source: sayfa.source, frame: new Rectangle((k % ATA_SAYFA.sutun) * h, Math.floor(k / ATA_SAYFA.sutun) * h, h, h) }));
    }
    this.ataKareCache.set(el, kareler);
    return kareler;
  }

  private ataBaslat(el: ElementAdi, x: number, y: number, sure: number, o: { olcek: number; dx: number; gecikme: number; ana: boolean }): void {
    const kap = new Container();
    const govde = new Container();
    const kareler = this.ataKareleri(el);
    let ataSprite: Sprite | null = null;
    let ataAura: Sprite | null = null;
    let yukseklik = ATA_SAYFA.hucre * ATA_OLCEK;
    if (kareler) {
      ataSprite = new Sprite(kareler[0]);
      ataSprite.anchor.set(0.5, 0.92);
      ataSprite.scale.set(ATA_OLCEK);
      // hayalet ışık: aynı kare, element renginde, toplamalı (gövdeyi element tonuna boyar; maske/filtre yok)
      ataAura = new Sprite(kareler[0]);
      ataAura.anchor.set(0.5, 0.92);
      ataAura.scale.set(ATA_OLCEK * 1.04);
      ataAura.tint = ELEMENT_RENK[el].acik;
      ataAura.blendMode = "add";
      govde.addChild(ataSprite, ataAura);
    } else {
      const g = this.yedek(el);
      g.scale.set(1.8);
      g.y = -200;
      govde.addChild(g);
      yukseklik = 380;
      this.sayac.yedek++;
    }
    kap.addChild(this.zeminIsigi(el, 150), govde);
    // Ata çağıranın arkasında (ekranda yukarısında) yükselir; sahneden taşmasın diye yatayda sıkıştırılır
    const e = this.duzdenEkrana(x, y + r);
    const ax = Math.max(170, Math.min(SAHNE.genislik - 170, e.x + o.dx));
    const ay = Math.max(ATA_AYAK_MIN, Math.min(ATA_AYAK_MAX, e.y - ATA_GERI + (o.dx ? 18 : 0)));
    const f = this.ekrandanDuze(ax, ay);
    kap.position.set(f.x, f.y);
    // tepe HUD'a taşmasın: ekran ölçeği sığana kadar küçülür (ATA_OLCEK tavan)
    const sigar = Math.min(o.olcek, (ay - ATA_TEPE_MIN) / (ATA_SAYFA.hucre * ATA_OLCEK * ATA_DOLU_ORAN));
    kap.scale.set(this.olcekX * sigar, this.olcekY * sigar);
    kap.alpha = 0;
    this.kap.addChild(kap);
    const bant = new Container();
    this.bantKap.addChild(bant);
    this.belirmeler.push({ tur: "ata", el, t: -o.gecikme, sure: sure - o.gecikme, gecikme: o.gecikme, kap, govde, aura: null, bant, yukseklik: yukseklik * sigar, ataKareleri: kareler, ataSprite, ataAura, kukredi: !o.ana, x: f.x, y, parcacik: 0 });
    if (!o.ana) return;
    // tam rezonans anı: kamera %4 yakınlaşır, vinyet (flaş ayarına göre)
    if (this.flas !== "kapali") this.sahne.zoomDarbesi(0.04, 0.9);
    this.vinyetSure = this.vinyetKalan = sure + ATA_CIKIS_SN;
  }

  // ---- her kare ----
  ilerle(dt: number): void {
    this.ust.clear();
    for (const b of this.belirmeler) {
      b.t += dt;
      if (b.t < 0) continue;
      if (b.tur === "bagli") this.bagliIlerle(b); else this.ataIlerle(b);
    }
    const bitti = this.belirmeler.filter((b) => b.t >= b.sure + (b.tur === "ata" ? ATA_CIKIS_SN : BAGLI_CIKIS_SN));
    for (const b of bitti) { b.kap.destroy({ children: true }); b.bant.destroy({ children: true }); }
    this.belirmeler = this.belirmeler.filter((b) => !bitti.includes(b));
    this.vinyetCiz(dt);
  }

  /** Takım Ultisi yan Ata'ları kükreme halkası/sarsıntı üretmez (yalnız ortadaki; anda tek vurgu). */
  private anaMi(b: Belirme): boolean { return b.gecikme === 0; }

  private cikisOrani(b: Belirme, cikis: number): number {
    return b.t <= b.sure ? 1 : Math.max(0, 1 - (b.t - b.sure) / cikis);
  }

  private bagliIlerle(b: Belirme): void {
    const giris = Math.min(1, b.t / BAGLI_YUKSELIS_SN);
    const e = 1 - (1 - giris) ** 3;
    const cikis = this.cikisOrani(b, BAGLI_CIKIS_SN);
    b.kap.alpha = BAGLI_ALFA * Math.min(1, giris * 2) * cikis;
    b.govde.y = 60 * (1 - e) - 6 * Math.sin(b.t * 3);
    b.govde.scale.set(0.8 + 0.2 * e);
    if (b.aura) b.aura.alpha = 0.22 + 0.1 * Math.sin(b.t * 9);
    b.bant.alpha = Math.min(1, b.t / 0.15) * cikis;
    this.parcacikCiz(b, b.x, b.kap.y, 70, b.yukseklik, giris * cikis, 12);
  }

  private ataIlerle(b: Belirme): void {
    const S = ATA_SAYFA;
    const kareNo = Math.floor(b.t * S.fps);
    const kare = kareNo <= S.kukremeSon ? kareNo : S.donguIlk + ((kareNo - S.kukremeSon - 1) % (S.donguSon - S.donguIlk + 1));
    if (b.ataKareleri && b.ataSprite && b.ataAura) {
      const tx = b.ataKareleri[Math.min(kare, S.donguSon)]!;
      b.ataSprite.texture = tx;
      b.ataAura.texture = tx;
      b.ataAura.alpha = ATA_ISIK_ALFA + 0.08 * Math.sin(b.t * 7);
    }
    const giris = Math.min(1, b.t / ((S.yukselisSon + 1) / S.fps));
    const e = 1 - (1 - giris) ** 2;
    const cikis = this.cikisOrani(b, ATA_CIKIS_SN);
    b.kap.alpha = ATA_ALFA * Math.min(1, giris * 1.6) * cikis;
    if (!b.ataKareleri) b.govde.y = 40 * (1 - e);
    // kükreme: şok halkası + sarsıntı (yalnız Flaş: Normal)
    if (!b.kukredi && kareNo >= S.kukremeIlk && this.anaMi(b)) {
      b.kukredi = true;
      this.sayac.kukreme++;
      if (this.flas === "normal") this.sahne.sars(0.45);
    }
    const k = (b.t - S.kukremeIlk / S.fps) / 0.45;
    if (k >= 0 && k <= 1 && this.flas !== "kapali" && this.anaMi(b)) {
      const c = ELEMENT_RENK[b.el];
      const R = (40 + 260 * k) * this.olcekX;
      this.ust.circle(b.x, b.kap.y, R).stroke({ width: 10 * (1 - k) + 2, color: c.acik, alpha: 0.7 * (1 - k) });
      this.ust.circle(b.x, b.kap.y, R * 0.8).stroke({ width: 3, color: c.vurgu, alpha: 0.5 * (1 - k) });
    }
    this.parcacikCiz(b, b.x, b.kap.y, 170 * (b.yukseklik / (ATA_SAYFA.hucre * ATA_OLCEK)), b.yukseklik * 0.9, giris * cikis, 22);
  }

  private parcacikCiz(b: Belirme, x: number, y: number, yayilim: number, boy: number, alfa: number, n: number): void {
    if (alfa <= 0) return;
    const c = ELEMENT_RENK[b.el];
    for (let k = 0; k < n; k++) {
      const faz = (b.t * 0.7 + k / n) % 1;
      const px = x + Math.sin(k * 2.39 + b.x) * yayilim * this.olcekX * (0.4 + 0.6 * ((k * 37) % 10) / 10);
      this.ust.rect(Math.round(px), Math.round(y - faz * boy * this.olcekY), 3, 3).fill({ color: k % 3 ? c.acik : c.vurgu, alpha: 0.85 * alfa * (1 - faz) });
    }
  }

  private vinyetCiz(dt: number): void {
    const g = this.vinyet;
    g.clear();
    if (this.vinyetKalan <= 0 || this.flas === "kapali") return;
    this.vinyetKalan = Math.max(0, this.vinyetKalan - dt);
    const t = this.vinyetSure - this.vinyetKalan;
    const tepe = this.flas === "normal" ? 0.42 : 0.2;
    const a = tepe * Math.min(1, t / 0.25) * Math.min(1, this.vinyetKalan / 0.35);
    const W = SAHNE.genislik;
    const H = SAHNE.yukseklik;
    for (let k = 0; k < 10; k++) {
      const p = k * 9;
      g.rect(p, p, W - 2 * p, H - 2 * p).stroke({ width: 9, color: 0x02040a, alpha: a * (1 - k / 10) });
    }
  }
}
