import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from "pixi.js";
import type { ElementAdi } from "../../paylasilan/kurallar/ayar.ts";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import type { Dunya, Olay } from "../../paylasilan/sim/durum.ts";
import { RUHLAR, YETENEKLER, cekirdekBul } from "../../paylasilan/veri/katalog.ts";
import type { TopacProfili } from "../../paylasilan/veri/profil.ts";
import { TAKIM_YUVA, ULTI_YUVA, yuvaBedeli, yuvaYetenegi } from "../../paylasilan/sim/yetenek.ts";
import { ELEMENT_RENK, TAKIM_RENK } from "./renkler.ts";
import { SAHNE, type Sahne } from "./Sahne.ts";

// Kutsal canavar belirmesi (docs/design/beyblade/06-kutsal-canavarlar.md). Yalnız istemci sunumu: sunucunun zaten
// yolladığı `yetenekBasladi` olayından tetiklenir, sim/hash/protokol değişmez.
//   kademe 3 Ulti         → elementin Ata'sı (Tripo 3B → Blender kare animasyonu) uyanır ("Tam rezonans").
//   kademe 2 Özel Yetenek → çekirdeğin ruhu (portre); RUH_PORTRE_OZEL_YETENEK ile kapalı.
//   kademe 4 Takım Ultisi → takımın üç ruhu (bayrak kapalıyken kod silüeti).
//
// Ata = HOLOGRAM (sahip, 2026-11-05: "topacın tam ortasından üzerine hologram tarzı ortaya çıksın"):
//  - Taban çağıran topacın üst yüzünün ortası (çekirdek); Ata oradan yukarı açılır ve topacı her kare izler.
//  - Topacın ÜSTÜNDE çizilir (efektKatmani) ama yarı saydam ve taramalı: topaç altından okunur.
//  - Doku önceden pişirilmiş hologram sayfası (araclar/sanat/hologram.py): element tonu, tarama çizgisi, parlak kenar.
//    Pixel önbelleğinde (cacheAsTexture) maske/filtre bozulduğu için çalışma anında filtre yok.
//  - Tamsayı ölçek: hibritte 1 önbellek pikseli = 2 mantıksal piksel; sprite ekranda tam ×2 ve konumu önbellek ızgarasına
//    oturur. Yer dar ise (topaç uzak kenarda) yarım boy sayfa (-holo-k, hücre 96) yine ×2 çizilir.
//  - Belirme (sahip: "V şeklinde topacın ortasından hologram ışığı yansısın, canavar onun içinde şekillensin"):
//    tepe noktası çekirdekte olan V ışığı yukarı açılır (yarı saydam iç, parlak kenar, içinde yukarı akan tarama);
//    canavar SERIT yatay şeritte alttan yukarı şekillenir (yeni şerit kısa kayar, şekillenme cephesi parlak çizgi);
//    tutarken hafif titreme ve iki kısa kayma; kükremede zeminde tek halka; çıkışta şeritler yukarıdan söner, V kapanır.

export const RUH_PORTRE_OZEL_YETENEK = false;

/** Bayrak + yalnız `?debug&ruhportre=1` geçersiz kılması (SANAT entegrasyon doğrulaması; oyuncu sürümünde etkisiz). */
export function ruhPortreAcik(): boolean {
  if (RUH_PORTRE_OZEL_YETENEK) return true;
  try { const q = new URLSearchParams(location.search); return q.has("debug") && q.get("ruhportre") === "1"; } catch { return false; }
}

/** public/ruh/ata/<element>-holo.png: 192 px hücre, 6×4, 24 kare (araclar/sanat/sayfala.py + hologram.py). -k: hücre 96. */
const ATA_SAYFA = { hucre: 192, ayakY: 184, sutun: 6, fps: 16, kukremeIlk: 10, kukremeSon: 15, donguIlk: 16, donguSon: 23 } as const;
const ATA_EKRAN_OLCEK = 2;
/** Hologram tabanı: hibritte topacın üst yüzü zemin noktasının bu kadar dünya pikseli üstünde (YetenekGorsel.aura ile aynı). */
const HOLO_TABAN_HIBRIT = 40;
/** Büyük sayfanın ekranda kapladığı yükseklik (dolu içerik ~%80) ve üst HUD payı: sığmazsa yarım boy sayfa. */
const HOLO_BUYUK_BOY = 0.8 * 192 * ATA_EKRAN_OLCEK;
const HUD_UST = 70;
/** V ışığı açılır (s), sonra canavar şeritler hâlinde alttan yukarı şekillenir (s). */
const V_ACILIS_SN = 0.18;
const SEKIL_BAS_SN = 0.1;
const SEKIL_SN = 0.42;
/** Şekillenme şeridi sayısı (hücre 192 → 16 px, 96 → 8 px; tam bölünür). */
const SERIT = 12;
/** V'nin üst genişliği canavar kutusuna oranla; yüksekliği. */
const V_GEN = 1.05;
const V_BOY = 1.08;
const HOLO_ALFA = 0.88;
const HOLO_PARILTI = 0.22;
const ATA_CIKIS_SN = 0.35;
/** Takım Ultisi (bayrak kapalı): takımın üç Ata'sı; yan ışıklar çekirdeğin bu kadar ekran pikseli yanında, gecikmeli. */
const TAKIM_DX = 120;
const TAKIM_ARALIK = 0.2;
const HALKA_SN = 0.5;
const BAGLI_BOY = 190;
const BAGLI_YUKSELIS_SN = 0.28;
const BAGLI_CIKIS_SN = 0.3;
const BAGLI_ALFA = 0.9;
const r = AYAR.topacYaricap;

type Flas = "normal" | "azaltilmis" | "kapali";
type YedekCizici = (el: ElementAdi) => Graphics;

interface Belirme {
  tur: "bagli" | "ata";
  el: ElementAdi;
  t: number;
  /** Tutma süresi (s); sonra çıkış. */
  sure: number;
  kap: Container;
  govde: Container;
  bant: Container;
  kareler: Texture[] | null;
  /** toplamalı parıltı kopyası (hologram) */
  parilti: Sprite | null;
  /** şekillenme şeritleri (alttan yukarı; maske yok) */
  seritler: Sprite[];
  /** ışık sütunu, tarama çizgisi ve kükreme halkası (Ata) */
  isik: Graphics | null;
  /** çağıran oyuncu (Ata topacı izler) */
  i: number;
  /** Takım Ultisi yan Ata'sı: tabandan yatay kayma (dünya) ve ana (kükreyen) Ata mı */
  dx: number;
  ana: boolean;
  /** hücre (192 / 96) */
  hucre: number;
  kukredi: boolean;
}

const sx = (x: number) => SAHNE.merkezX + x;
const sy = (z: number) => SAHNE.merkezY + z;

export function ruhKimligi(p: TopacProfili): string | null {
  try { return cekirdekBul(p.parcalar.cekirdek).ruh; } catch { return null; }
}

const portreYolu = (ruhId: string) => `/ruh/portre/${ruhId}.png`;
const ataYolu = (el: ElementAdi, kucuk: boolean) => `/ruh/ata/${el}-holo${kucuk ? "-k" : ""}.png`;

export class RuhGorsel {
  /** YetenekGorsel'in zemin kabına (hibritte zemin düzlemi), dekal ve telegraftan önce eklenir. */
  readonly kap = new Container();
  private vinyet = new Graphics();
  private bantKap = new Container();
  private belirmeler: Belirme[] = [];
  private dokular = new Map<string, Texture>();
  private istenen = new Set<string>();
  private ataKareCache = new Map<string, Texture[]>();
  /** Ata hologramları: topaçların üstünde (efekt katmanı, dünya koordinatı) */
  private holoKap = new Container();
  private readonly portre = ruhPortreAcik();
  private vinyetKalan = 0;
  private vinyetSure = 0;
  flas: Flas = "normal";
  /** Topacın ÇİZİLDİĞİ zemin noktası (dünya; ara değerleme + geri tepme dahil). Mac.ts bağlar; yoksa sim konumu. */
  topacKonumu: ((i: number) => { x: number; y: number } | null) | null = null;
  readonly sayac = { bagli: 0, ata: 0, takim: 0, yedek: 0, kukreme: 0 };

  constructor(private sahne: Sahne, private yerel: number, private yedek: YedekCizici) {
    sahne.efektKatmani.addChild(this.holoKap);
    sahne.ekranKatmani.addChild(this.vinyet, this.bantKap);
  }

  // ---- izdüşüm: düz sim çizim koordinatı (zemin düzlemi içi) ↔ mantıksal ekran ----
  /** Düzlem içinde bir kabı ekranda 1:1 (dik, basık değil) gösteren ölçek. */
  private get olcekX(): number { return 1 / this.sahne.yakinlik; }
  private get olcekY(): number { return 1 / (this.sahne.yakinlik * this.sahne.k); }

  private ekrandanDuze(ex: number, ey: number): { x: number; y: number } {
    const B = this.sahne.yakinlik;
    const wx = SAHNE.merkezX + (ex - SAHNE.merkezX) / B;
    const wy = SAHNE.merkezY + (ey - SAHNE.merkezY) / B;
    return { x: wx, y: SAHNE.merkezY + (wy - this.sahne.my) / this.sahne.k };
  }

  private duzdenEkrana(fx: number, fy: number): { x: number; y: number } {
    return this.sahne.dunyadanEkrana(fx, this.sahne.my + (fy - SAHNE.merkezY) * this.sahne.k);
  }

  /**
   * Tembel yükleme (ilk yükleme bütçesi, SANAT-ENTEGRASYON.md § boyut): maç başında Ata sayfası İNDİRİLMEZ. Bir topacın
   * Ulti'si açık ve Enerjisi Ulti bedelinin yarısına geldiğinde yalnız O topacın elementinin hologramı (tam + yarım boy)
   * istenir; Takım Ultisi için Takım Enerjisi yarıya gelince üç üyenin sayfaları. Yetişmezse yedek silüet çizilir.
   * Bayrak açıksa sahadaki topaçların ruh portreleri baştan istenir. Her kare çağrılır; iş yalnız Set yoklaması.
   */
  onYukle(d: Dunya): void {
    for (let i = 0; i < d.topaclar.length; i++) {
      const p = d.profiller[i];
      const t = d.topaclar[i];
      if (!p || !t) continue;
      if (this.portre) { const id = ruhKimligi(p); if (id) this.yukle(portreYolu(id)); }
      const seviye = d.seviye?.[i] ?? 3;
      if (seviye >= AYAR.yetenek.seviyeYuva[ULTI_YUVA]! && yuvaYetenegi(d, i, ULTI_YUVA) >= 0 && t.enerji * 2 >= yuvaBedeli(t, p, ULTI_YUVA)) this.ataIste(p.element);
      const tk = d.takimlar?.[i];
      if (tk && !this.portre && seviye >= AYAR.yetenek.seviyeYuva[TAKIM_YUVA]! && d.takimEnerji[i]! * 2 >= AYAR.enerji.takimDilim) for (const u of tk.uyeler) this.ataIste(u.profil.element);
    }
  }

  private ataIste(el: ElementAdi): void {
    this.yukle(ataYolu(el, false));
    this.yukle(ataYolu(el, true));
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
    this.vinyetKalan = 0;
  }

  olay(o: Olay, d: Dunya): void {
    if (o.tur !== "yetenekBasladi") return;
    const p = d.profiller[o.i];
    const t = d.topaclar[o.i];
    if (!p || !t) return;
    const tutma = o.telegraf / AYAR.adimHz;
    if (o.kademe === 3) {
      // Ad bandı HUD'da tek satır (MacHud: "ULTİ · <ad> · <unvan>", alt-orta): anda tek mesaj (sadelik)
      this.ataBaslat(o.i, p.element, t.x, t.z, tutma + 0.9, { dx: 0, gecikme: 0, ana: true, kucuk: false });
      this.sayac.ata++;
    } else if (o.kademe === 4 && d.takimlar && !this.portre) {
      // Takım Ultisi (Ulti katmanı: Ata): takımın üç Ata'sı çağıranın çekirdeğinden; ortadaki tam boy, yanlar yarım boy
      // ortada sahadaki (çağıran) topacın Ata'sı, yanlarda diğer iki üye
      const tum = d.takimlar[o.i]!.uyeler;
      const aktif = tum.find((u) => u.profil.parcalar.cekirdek === p.parcalar.cekirdek);
      const digerleri = tum.filter((u) => u !== aktif);
      const uyeler = aktif ? [digerleri[0], aktif, digerleri[1]] : [...tum];
      const B = this.sahne.yakinlik;
      for (const k of [1, 0, 2]) {
        const u = uyeler[k];
        if (!u) continue;
        this.ataBaslat(o.i, u.profil.element, t.x, t.z, tutma + 0.9, { dx: ((k - 1) * TAKIM_DX) / B, gecikme: k === 1 ? 0 : TAKIM_ARALIK, ana: k === 1, kucuk: k !== 1 });
      }
      this.sayac.takim++;
    } else if (o.kademe === 2) {
      if (!this.portre) return;
      const id = ruhKimligi(p);
      const ruh = RUHLAR.find((x) => x.id === id);
      this.bagliBaslat(o.i, p.element, id, `${ruh?.ad ?? "Ruh"} · ${YETENEKLER[o.no]?.ad ?? ""}`, sx(t.x), sy(t.z), tutma + 0.5, 0);
      this.sayac.bagli++;
    } else if (o.kademe === 4 && d.takimlar) {
      d.takimlar[o.i]!.uyeler.forEach((u, k) => {
        const id = ruhKimligi(u.profil);
        const ruh = RUHLAR.find((x) => x.id === id);
        const bant = k === 1 ? (ruh ? `Takım Ultisi · ${ruh.ad}` : "Takım Ultisi") : "";
        this.bagliBaslat(o.i, u.profil.element, id, bant, sx(t.x) + (k - 1) * 120, sy(t.z) - (k === 1 ? 20 : 0), tutma + 0.6, k * 0.2);
      });
      this.sayac.takim++;
    }
  }

  // ---- kurulum ----
  private bandKur(metin: string, alt: string, el: ElementAdi, i: number, buyuk: boolean): Container {
    const c = ELEMENT_RENK[el];
    const kap = new Container();
    const takim = i === this.yerel ? TAKIM_RENK.oyuncu : TAKIM_RENK.rakip;
    const ust = new Text({ text: metin, style: { fontFamily: "Jersey 10, m5x7, system-ui, sans-serif", fontSize: buyuk ? 26 : 18, fontWeight: "400", letterSpacing: buyuk ? 3 : 1, fill: c.vurgu, stroke: { color: 0x05050a, width: buyuk ? 5 : 3 } } });
    ust.anchor.set(0.5, 0);
    kap.addChild(ust);
    let gen = ust.width;
    if (alt) {
      const a = new Text({ text: alt, style: { fontFamily: "m5x7, system-ui, sans-serif", fontSize: 16, fontWeight: "400", fill: c.acik, stroke: { color: 0x05050a, width: 3 } } });
      a.anchor.set(0.5, 0);
      a.y = ust.height - 3;
      kap.addChild(a);
      gen = Math.max(gen, a.width);
    }
    kap.addChildAt(new Graphics().rect(-gen / 2 - 10, -4, gen + 20, 3).fill({ color: takim, alpha: 0.95 }), 0);
    kap.alpha = 0;
    this.bantKap.addChild(kap);
    return kap;
  }

  private ataKareleri(el: ElementAdi, kucuk: boolean): Texture[] | null {
    const anahtar = `${el}${kucuk ? "-k" : ""}`;
    const hazir = this.ataKareCache.get(anahtar);
    if (hazir) return hazir;
    const sayfa = this.dokular.get(ataYolu(el, kucuk));
    if (!sayfa) return null;
    const h = kucuk ? ATA_SAYFA.hucre / 2 : ATA_SAYFA.hucre;
    const kareler: Texture[] = [];
    for (let k = 0; k <= ATA_SAYFA.donguSon; k++) {
      kareler.push(new Texture({ source: sayfa.source, frame: new Rectangle((k % ATA_SAYFA.sutun) * h, Math.floor(k / ATA_SAYFA.sutun) * h, h, h) }));
    }
    this.ataKareCache.set(anahtar, kareler);
    return kareler;
  }

  private seritCache = new Map<Texture, Texture[]>();
  /** Bir karenin k. yatay şeridi (önbellekli; kare dokusu başına SERIT alt doku). */
  private seritDokusu(kare: Texture, k: number): Texture {
    let liste = this.seritCache.get(kare);
    if (!liste) {
      const f = kare.frame;
      const sh = f.height / SERIT;
      liste = Array.from({ length: SERIT }, (_, j) => new Texture({ source: kare.source, frame: new Rectangle(f.x, f.y + j * sh, f.width, sh) }));
      this.seritCache.set(kare, liste);
    }
    return liste[k]!;
  }

  /** Topacın hologram tabanı (dünya koordinatı: efekt katmanı): çizilen topacın üst yüzü, yoksa sim konumu. */
  private taban(i: number, x: number, z: number): { x: number; y: number } {
    const k = this.topacKonumu?.(i);
    const zx = k ? k.x : this.sahne.ekranX(x);
    const zy = k ? k.y : this.sahne.ekranY(z);
    return { x: zx, y: zy - (this.sahne.hibrit ? HOLO_TABAN_HIBRIT : 0) };
  }

  /** Dünya noktasını pixel önbelleği ızgarasına (1 önbellek pikseli = 2 / B dünya birimi) oturt. */
  private izgara(wx: number, wy: number): { x: number; y: number } {
    const adim = 2 / this.sahne.yakinlik;
    return { x: SAHNE.merkezX + Math.round((wx - SAHNE.merkezX) / adim) * adim, y: SAHNE.merkezY + Math.round((wy - SAHNE.merkezY) / adim) * adim };
  }

  private ataBaslat(i: number, el: ElementAdi, x: number, z: number, sure: number, o: { dx: number; gecikme: number; ana: boolean; kucuk: boolean }): void {
    const kap = new Container();
    const govde = new Container();
    const isik = new Graphics();
    isik.blendMode = "add";
    // yer: tabanın ekran y'si büyük hologram için yeterli değilse yarım boy
    const tb = this.taban(i, x, z);
    const ekranTabanY = this.sahne.dunyadanEkrana(tb.x, tb.y).y;
    const kucuk = o.kucuk || ekranTabanY - HOLO_BUYUK_BOY < HUD_UST;
    const kareler = this.ataKareleri(el, kucuk) ?? this.ataKareleri(el, !kucuk);
    const hucre = kareler ? kareler[0]!.frame.width : ATA_SAYFA.hucre;
    let parilti: Sprite | null = null;
    const seritler: Sprite[] = [];
    if (kareler) {
      const olcek = ATA_EKRAN_OLCEK / this.sahne.yakinlik;
      const ayak = (ATA_SAYFA.ayakY / ATA_SAYFA.hucre) * hucre;
      const sh = hucre / SERIT;
      for (let k = 0; k < SERIT; k++) {
        const sp = new Sprite(this.seritDokusu(kareler[0]!, k));
        sp.scale.set(olcek);
        sp.position.set((-hucre / 2) * olcek, (k * sh - ayak) * olcek);
        sp.visible = false;
        seritler.push(sp);
        govde.addChild(sp);
      }
      parilti = new Sprite(kareler[0]);
      parilti.anchor.set(0.5, ayak / hucre);
      parilti.scale.set(olcek);
      parilti.blendMode = "add";
      parilti.alpha = 0;
      govde.addChild(parilti);
    } else {
      const g = this.yedek(el);
      g.scale.set(0.9 / this.sahne.yakinlik);
      g.y = -90 / this.sahne.yakinlik;
      govde.addChild(g);
      this.sayac.yedek++;
    }
    kap.addChild(isik, govde);
    const p = this.izgara(tb.x + o.dx, tb.y);
    kap.position.set(p.x, p.y);
    kap.alpha = 0;
    this.holoKap.addChild(kap);
    const bant = new Container();
    this.bantKap.addChild(bant);
    this.belirmeler.push({ tur: "ata", el, t: -o.gecikme, sure: sure - o.gecikme, kap, govde, bant, kareler, parilti, seritler, isik, i, dx: o.dx, ana: o.ana, hucre, kukredi: !o.ana });
    if (o.ana) this.vinyetSure = this.vinyetKalan = sure + ATA_CIKIS_SN;
  }

  private bagliBaslat(i: number, el: ElementAdi, ruhId: string | null, bantMetni: string, x: number, y: number, sure: number, gecikme: number): void {
    const kap = new Container();
    const govde = new Container();
    const doku = ruhId ? this.dokular.get(portreYolu(ruhId)) : undefined;
    if (doku) {
      const s = new Sprite(doku);
      s.anchor.set(0.5, 1);
      s.scale.set(BAGLI_BOY / Math.max(doku.width, doku.height));
      govde.addChild(s);
    } else {
      const g = this.yedek(el);
      g.y = -110;
      govde.addChild(g);
      this.sayac.yedek++;
    }
    kap.addChild(govde);
    kap.position.set(x, y + r * 0.6);
    kap.scale.set(this.olcekX, this.olcekY);
    kap.alpha = 0;
    this.kap.addChild(kap);
    const bant = this.bandKur(bantMetni, "", el, i, false);
    const be = this.duzdenEkrana(x, y + r);
    bant.position.set(be.x, be.y + 10);
    this.belirmeler.push({ tur: "bagli", el, t: -gecikme, sure, kap, govde, bant, kareler: null, parilti: null, seritler: [], isik: null, i, dx: 0, ana: false, hucre: 0, kukredi: true });
  }

  // ---- her kare ----
  ilerle(dt: number, d?: Dunya): void {
    for (const b of this.belirmeler) {
      b.t += dt;
      if (b.t < 0) continue;
      if (b.tur === "ata") this.ataIlerle(b, d); else this.bagliIlerle(b);
    }
    const bitti = this.belirmeler.filter((b) => b.t >= b.sure + (b.tur === "ata" ? ATA_CIKIS_SN : BAGLI_CIKIS_SN));
    for (const b of bitti) { b.kap.destroy({ children: true }); b.bant.destroy({ children: true }); }
    this.belirmeler = this.belirmeler.filter((b) => !bitti.includes(b));
    this.vinyetCiz(dt);
  }

  private cikisOrani(b: Belirme, cikis: number): number {
    return b.t <= b.sure ? 1 : Math.max(0, 1 - (b.t - b.sure) / cikis);
  }

  private ataIlerle(b: Belirme, d?: Dunya): void {
    const S = ATA_SAYFA;
    // topacı izle (ızgaraya oturarak)
    const t = d?.topaclar[b.i];
    if (t) { const tb = this.taban(b.i, t.x, t.z); const p = this.izgara(tb.x + b.dx, tb.y); b.kap.position.set(p.x, p.y); }
    const kareNo = Math.floor(b.t * S.fps);
    const kare = kareNo <= S.kukremeSon ? kareNo : S.donguIlk + ((kareNo - S.kukremeSon - 1) % (S.donguSon - S.donguIlk + 1));
    const B = this.sahne.yakinlik;
    const cikis = this.cikisOrani(b, ATA_CIKIS_SN);
    // V ışığı: önce açılır, çıkışta kapanır
    const v = Math.min(1, b.t / V_ACILIS_SN) * cikis;
    // şekillenme: 0..1, şeritler alttan yukarı; çıkışta yukarıdan aşağı söner
    const sekil = Math.max(0, Math.min(1, (b.t - SEKIL_BAS_SN) / SEKIL_SN)) * cikis;
    const titreme = 0.94 + 0.06 * Math.sin(b.t * 41) * Math.sin(b.t * 13);
    const kayma = (b.t > 0.7 && b.t < 0.75) || (b.t > 1.35 && b.t < 1.39);
    if (b.kareler) {
      const tx = b.kareler[Math.min(kare, S.donguSon)]!;
      const acik = Math.round(sekil * SERIT);
      b.seritler.forEach((sp, k) => {
        const sira = SERIT - 1 - k; // 0 = en alt şerit
        sp.visible = sira < acik;
        sp.texture = this.seritDokusu(tx, k);
        // yeni beliren şerit kısa süre yana kayar (şekillenme titreşimi)
        const taze = sira === acik - 1 && sekil < 1;
        sp.x = (-b.hucre / 2) * (ATA_EKRAN_OLCEK / B) + (taze ? (k % 2 ? 4 : -4) / B : kayma && k % 3 === 0 ? 3 / B : 0);
      });
      if (b.parilti) { b.parilti.texture = tx; b.parilti.alpha = sekil >= 1 ? HOLO_PARILTI * titreme : 0; }
    } else {
      b.govde.scale.set(1, Math.max(0.04, sekil));
    }
    b.kap.alpha = HOLO_ALFA * titreme * (kayma ? 0.75 : 1) * Math.min(1, b.t / 0.08);
    b.bant.alpha = Math.min(1, b.t / 0.2) * cikis;
    // V ışığı (yerel dünya birimi; tepe noktası 0,0 = topacın çekirdeği)
    const g = b.isik!;
    g.clear();
    const c = ELEMENT_RENK[b.el];
    const kutu = (b.hucre * ATA_EKRAN_OLCEK) / B;
    const H = kutu * 0.8 * V_BOY * v;
    const W = kutu * 0.8 * V_GEN * v;
    if (v > 0) {
      const yogun = this.flas === "kapali" ? 0.5 : 1;
      g.poly([0, 0, -W / 2, -H, W / 2, -H]).fill({ color: c.orta, alpha: 0.13 * titreme * yogun });
      g.poly([0, 0, -W / 3, -H, W / 3, -H]).fill({ color: c.acik, alpha: 0.12 * titreme * yogun });
      // kenarlar
      g.moveTo(0, 0).lineTo(-W / 2, -H).moveTo(0, 0).lineTo(W / 2, -H).stroke({ width: 2 / B, color: c.vurgu, alpha: 0.75 * titreme });
      // V içinde yukarı akan tarama çizgileri (genişlik yüksekliğe orantılı)
      for (let j = 0; j < 7; j++) {
        const y = -((b.t * 0.9 + j / 7) % 1) * H;
        const yg = (W / 2) * (-y / Math.max(1, H));
        g.rect(-yg, y, 2 * yg, 1.5 / B).fill({ color: c.vurgu, alpha: 0.28 * titreme * yogun });
      }
      // şekillenme cephesi: parlak yatay çizgi
      if (sekil > 0 && sekil < 1) {
        const yc = -kutu * (ATA_SAYFA.ayakY / ATA_SAYFA.hucre) * sekil * 0.92;
        const yg = (W / 2) * Math.min(1, -yc / Math.max(1, H));
        g.rect(-yg, yc - 1 / B, 2 * yg, 2 / B).fill({ color: 0xffffff, alpha: 0.9 });
      }
      // tepe noktası: çekirdekte parlak göz
      g.ellipse(0, 0, 14 / B, 6 / B).fill({ color: c.vurgu, alpha: 0.7 * titreme });
    }
    if (!b.kukredi && kareNo >= S.kukremeIlk) {
      b.kukredi = true;
      this.sayac.kukreme++;
      if (this.flas === "normal") this.sahne.sars(0.3);
    }
    const k = (b.t - S.kukremeIlk / S.fps) / HALKA_SN;
    if (k >= 0 && k <= 1 && this.flas !== "kapali" && b.ana) {
      const R = (30 + 150 * k) / B;
      g.ellipse(0, HOLO_TABAN_HIBRIT * (this.sahne.hibrit ? 1 : 0), R, R * this.sahne.k * 0.6).stroke({ width: 3 / B, color: c.acik, alpha: 0.8 * (1 - k) });
    }
  }

  private bagliIlerle(b: Belirme): void {
    const giris = Math.min(1, b.t / BAGLI_YUKSELIS_SN);
    const e = 1 - (1 - giris) ** 3;
    const cikis = this.cikisOrani(b, BAGLI_CIKIS_SN);
    b.kap.alpha = BAGLI_ALFA * giris * cikis;
    b.govde.y = 40 * (1 - e);
    b.bant.alpha = Math.min(1, b.t / 0.15) * cikis;
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
