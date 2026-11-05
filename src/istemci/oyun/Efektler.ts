import { Graphics } from "pixi.js";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import type { Dunya, Olay } from "../../paylasilan/sim/durum.ts";
import { type AtlasAdi, efektAtlasYukle, efektSprite } from "./EfektAtlas.ts";
import { aktifMi, staminaOrani } from "../../paylasilan/sim/topac.ts";
import { HIS, type Siddet, TEMAS, type TemasOturumu, akisAcik, siddetBul, siddetPuani, temasAdimi } from "./his.ts";
import { KivilcimDemeti } from "./Kivilcim.ts";
import { Parcaciklar } from "./Parcaciklar.ts";
import { ELEMENT_RENK, renkKaristir } from "./renkler.ts";
import { SAHNE, type Sahne } from "./Sahne.ts";
import { SusRastgele } from "./SusRastgele.ts";
import type { TopacCizimi } from "./cizimTurleri.ts";

/** Tembel atlas eşikleri (Enerji 0-300; Ulti 3 dilim = 300, Özel 200). */
export const ATLAS_ESIK = { ortakEnerji: 60, elementEnerji: 150, elementStamina: 0.5 } as const;

// Sim olayı → his (05 § 3): sim `adim` sonunda `olaylar`'a koyar, burada okunur. Hiçbiri sim'e geri yazmaz.
// Görsel hitstop: çarpışan topaçların RENDER konumu bekler, sim akmaya devam eder; bitince kritik sönümlü yetişme.

interface Sok { g: Graphics; t: number; sure: number; x: number; y: number; r0: number; r1: number; renk: number; renk2: number | null; kalinlik: number }
/** `ex, ey`: temas normalinin ekran yönü; `f`: ışınların normal boyunca basıklığı (1 = yuvarlak; GU-D: yıldız iki topacın arasında dar) */
interface Yildiz { x: number; y: number; t: number; sure: number; r: number; n: number; aci: number; renk: number; ex: number; ey: number; f: number }
interface HizCizgisi { x: number; y: number; dx: number; dy: number; t: number; sure: number; renk: number; uz: number }
interface Kivrim { x: number; y: number; a0: number; yon: number; t: number; sure: number }
/** `yetis`: hitstop bitti, görsel sim'e kritik sönümlü yetişiyor (yalnız o sırada; GU-E öncesi her karede gecikiyordu) */
interface KonumDurumu { hold: { x: number; y: number } | null; kalanMs: number; nx: number; ny: number; x: number; y: number; ilk: boolean; yetis: boolean; ox: number; oy: number }

export interface HisAyarlari {
  sarsinti: number; // 1 / 0,5 / 0
  flas: "normal" | "azaltilmis" | "kapali";
  hitstop: number; // 1 / 0,5 / 0
  parcacik: number; // 1 / 0,4
  /** Yavaş çekim ve zoom (ux § 6.2): false ise Parçalanma 0,3× ve zoom darbeleri yok. */
  yavasZoom?: boolean;
}

/** Ses kancası (05 § 3.3): olay anahtarı → ses adı; ses yoksa sessiz. */
export type SesKancasi = (ad: "carpisma-hafif" | "carpisma-agir" | "carpisma-kritik" | "duvar" | "dash" | "sekme" | "ring-out" | "parcalanma" | "durma" | "telegraf" | "ulti" | "enerji-doldu" | "mac-sonu", hacim?: number, perde?: number) => void;

/** GU-E sürekli temas durumu (doğrulama / ekran görüntüsü). */
export interface TemasDurumu { aktif: boolean; sure: number; guc: number; kivilcim: number }

export class Efektler {
  readonly parcaciklar = new Parcaciklar();
  private soklar: Sok[] = [];
  private ekranFlas = new Graphics();
  private flasKalanMs = 0;
  private flasAlfa = 0;
  private flasZamanlari: number[] = [];
  private saat = 0;
  private sonHitstop = -1e9;
  private yavasKalanMs = 0;
  private konumlar: KonumDurumu[] = [];
  private rng = new SusRastgele(0xe7f);
  /** GU-04: ışınsal yıldız patlaması + takım/element renkli hız çizgileri (referans 07), yalnız hibrit */
  private yildizlar: Yildiz[] = [];
  private cizgiler: HizCizgisi[] = [];
  private hizG = new Graphics();
  /** referans 07: çarpışma sonrası topacın çevresinde parlak krem sarmal iz (zeminde) */
  private kivrimlar: Kivrim[] = [];
  /** GU-C: sarmal zeminde (iz katmanı, topaçların ALTINDA); efekt katmanında topacın üstünden geçiyordu */
  private kivrimG = new Graphics();
  /** GU-E: pixel kıvılcım demeti (çarpışma + sürekli temas) */
  readonly kivilcimlar: KivilcimDemeti;
  private temas = Efektler.bosTemas();
  /** GU-F temas oturumu (histerezis + boşluk toleransı) */
  private oturum: TemasOturumu = { oturum: false, temasSn: 0, kopukSn: TEMAS.toleransSn };
  private static bosTemas() { return { guc: 0, birikim: 0, sesSn: 0, sayac: 0, ses: 0, nx: 1, nz: 0, yon: 0 }; }
  /** GU-F doğrulama: sürtünme sesi sayısı */
  get temasSesSayisi(): number { return this.temas.ses; }
  /** pişmiş atlas kullanım sayacı (doğrulama) */
  readonly atlasSayac: Record<string, number> = {};
  private atlasDenetimSn = 0;
  readonly sayac = { yok: 0, hafif: 0, agir: 0, kritik: 0, duvar: 0, ringOut: 0, parcalanma: 0, durma: 0, dash: 0, sekme: 0, zitElement: 0, ekranFlas: 0, ekranFlasReddi: 0, telegraf: 0, ulti: 0, enerjiDoldu: 0, yetenekVurus: 0, zincir: 0, kontra: 0, engel: 0 };
  ayar: HisAyarlari = { sarsinti: 1, flas: "normal", hitstop: 1, parcacik: 1, yavasZoom: true };
  sesKanca: SesKancasi = () => {};

  constructor(private sahne: Sahne, private gorseller: () => readonly TopacCizimi[]) {
    this.kivilcimlar = new KivilcimDemeti(new SusRastgele(0x5a4c), sahne.k, sahne.hibrit);
    sahne.efektKatmani.addChild(this.hizG, this.parcaciklar.kap, this.kivilcimlar.g);
    sahne.izKatmani.addChild(this.kivrimG);
    this.ekranFlas.rect(0, 0, SAHNE.genislik, SAHNE.yukseklik).fill(0xffffff);
    this.ekranFlas.alpha = 0;
    sahne.ekranKatmani.addChild(this.ekranFlas);
    for (let i = 0; i < 2; i++) this.konumlar.push(Efektler.bosKonum());
  }

  private static bosKonum(): KonumDurumu {
    return { hold: null, kalanMs: 0, nx: 0, ny: 0, x: 0, y: 0, ilk: true, yetis: false, ox: 0, oy: 0 };
  }

  /** Efekt saati çarpanı (Parçalanma yavaş çekimi). */
  get yavas(): number { return this.yavasKalanMs > 0 ? HIS.yavasCekim.carpan : 1; }

  hitstopVar(i: number): boolean { return (this.konumlar[i]?.kalanMs ?? 0) > 0; }

  temizle(): void {
    this.parcaciklar.temizle();
    this.kivilcimlar.temizle();
    this.temas = Efektler.bosTemas();
    this.oturum = { oturum: false, temasSn: 0, kopukSn: TEMAS.toleransSn };
    this.yildizlar = [];
    this.cizgiler = [];
    this.kivrimlar = [];
    this.hizG.clear();
    this.kivrimG.clear();
    for (const s of this.soklar) s.g.destroy();
    this.soklar = [];
    this.flasKalanMs = 0;
    this.ekranFlas.alpha = 0;
    this.yavasKalanMs = 0;
    this.konumlar = [Efektler.bosKonum(), Efektler.bosKonum()];
  }

  /**
   * Görsel konum: hitstop sırasında son konumda bekler (±1 px dik titreme); sonra bekleme farkı τ = 60 ms kritik
   * sönümlü söner. Fark vMutlak·hitstop'u aşarsa atlar (axiom #32). Hitstop dışında görsel = sim (ara değerli).
   */
  konum(i: number, hedefX: number, hedefY: number, dt: number): { x: number; y: number } {
    const k = this.konumlar[i]!;
    if (k.ilk) { k.ilk = false; k.x = hedefX; k.y = hedefY; }
    if (k.kalanMs > 0 && k.hold) {
      k.kalanMs -= dt * 1000;
      const tit = (this.rng.sayi() < 0.5 ? -1 : 1) * HIS.hitstopTitremePx;
      return { x: k.hold.x - k.ny * tit, y: k.hold.y + k.nx * tit };
    }
    // GU-E: yetişme yalnız hitstop sonrası ve hareketten bağımsız: bekleme konumu ile sim arasındaki FARK kritik sönümlü
    // söner (konum = sim + fark). Önceden her karede görsel, hareket eden sim'in peşinden τ = 60 ms ile geliyordu: hızlı
    // topaç v·2τ geride çizildiği için çarpışma anında iki topaç ekranda birbirine DEĞMİYORDU (300 br/s'de ~66 px boşluk).
    if (k.hold) { k.hold = null; k.yetis = true; k.ox = k.x - hedefX; k.oy = k.y - hedefY; }
    const atla = (AYAR.vMutlak * HIS.hitstopMs.bitisTavan) / 1000;
    if (k.yetis && (!Number.isFinite(k.ox + k.oy) || Math.hypot(k.ox, k.oy) > atla || dt <= 0)) k.yetis = false;
    if (k.yetis) {
      // kritik sönümlü sönümün kare hızından bağımsız, koşulsuz kararlı biçimi: (1 + t/τ)·e^(−t/τ) çarpanı
      const t = dt / (HIS.yetismeTauMs / 1000);
      const c = (1 + t) * Math.exp(-t);
      k.ox *= c; k.oy *= c;
      if (Math.hypot(k.ox, k.oy) < 0.25) k.yetis = false;
    }
    k.x = hedefX + (k.yetis ? k.ox : 0);
    k.y = hedefY + (k.yetis ? k.oy : 0);
    return { x: k.x, y: k.y };
  }

  private hitstop(i: number, ms: number, nx: number, ny: number, bitis: boolean, kritik: boolean): number {
    let m = ms * this.ayar.hitstop;
    if (m <= 0) return 0;
    const tavan = bitis ? HIS.hitstopMs.bitisTavan : HIS.hitstopMs.tavan;
    m = Math.min(m, tavan);
    if (!bitis && !kritik && this.saat - this.sonHitstop < HIS.hitstopPencereMs / 1000) m *= HIS.hitstopPencereCarpani;
    const k = this.konumlar[i]!;
    k.hold = { x: k.x, y: k.y };
    k.kalanMs = Math.max(k.kalanMs, m);
    k.nx = nx; k.ny = ny;
    this.sonHitstop = this.saat;
    return m;
  }

  private zoom(tepe: number, sure: number): void {
    if (this.ayar.yavasZoom === false) return;
    this.sahne.zoomDarbesi(tepe, sure);
  }

  private ekranFlasi(alfa: number, ms: number, renk = 0xffffff): void {
    if (this.ayar.flas === "kapali") return;
    this.ekranFlas.tint = renk;
    const a = Math.min(HIS.ekranFlasAlfaTavani, this.ayar.flas === "azaltilmis" ? Math.min(alfa, 0.1) : alfa);
    this.flasZamanlari = this.flasZamanlari.filter((t) => this.saat - t < 1);
    if (this.flasZamanlari.length >= HIS.ekranFlasSaniyedeEnCok) { this.sayac.ekranFlasReddi++; return; }
    this.flasZamanlari.push(this.saat);
    this.flasAlfa = a;
    this.flasKalanMs = Math.max(HIS.ekranFlasEnAzMs, ms);
    this.sayac.ekranFlas++;
  }

  private sok(x: number, y: number, r0: number, r1: number, ms: number, renk: number, renk2: number | null = null, kalinlik = 3): void {
    if (this.soklar.length >= 12) this.soklar.shift()!.g.destroy();
    const g = new Graphics();
    this.sahne.efektKatmani.addChild(g);
    this.soklar.push({ g, t: 0, sure: ms / 1000, x, y, r0, r1, renk, renk2, kalinlik });
  }

  private kivilcim(x: number, y: number, nx: number, ny: number, n: number, renkler: readonly number[], hiz: [number, number], koni = 0.9): void {
    const adet = Math.round(n * this.ayar.parcacik);
    const e = this.sahne.ekranYon(nx, ny);
    for (let k = 0; k < adet; k++) {
      const yon = k % 2 === 0 ? 1 : -1;
      const a = Math.atan2(e.y * yon, e.x * yon) + this.rng.isaretli() * koni;
      const v = this.rng.aralik(hiz[0], hiz[1]);
      const renk = renkler[k % renkler.length] as number;
      this.parcaciklar.ekle(x, y, Math.cos(a) * v, Math.sin(a) * v, this.rng.aralik(0.22, 0.45), renk, this.rng.sayi() < 0.35 ? 3 : 2, 4);
    }
  }

  private toz(x: number, y: number, n: number, renk: number, yaricap = 0): void {
    const adet = Math.round(n * this.ayar.parcacik);
    for (let k = 0; k < adet; k++) {
      const a = this.rng.aralik(0, Math.PI * 2);
      const v = this.rng.aralik(20, 70);
      const k = this.sahne.k;
      this.parcaciklar.ekle(x + Math.cos(a) * yaricap, y + Math.sin(a) * yaricap * k, Math.cos(a) * v, Math.sin(a) * v * k - (k < 1 ? 12 : 0), this.rng.aralik(0.4, 0.8), renk, 3, 2);
    }
  }

  /** Topaç gövde yüksekliğinde (hava) efekt noktası: hibritte temas noktası zeminden yukarı. */
  private hava(y: number): number { return this.sahne.hibrit ? y - 30 : y; }

  /**
   * Atlasları ihtiyaç anında yükle (TEMIZLIK #2; efekt-kaynaklari § 8.7). GU-E: açılışta hiçbiri; çarpışma kıvılcımı
   * yordamsal (Kivilcim.ts), `efekt-cekirdek` (yalnız Parçalanma'nın kritik patlaması) bir topacın staminası yarıya inince. `efekt` (toz bulutu, Enerji doldu) ilk çarpışmada ya da Enerji gelince; element atlası
   * (Ulti, parçalanma) o topacın Enerjisi yarıya yaklaşınca, staminası yarıya inince ya da yetenek başlayınca; Şimşek'in
   * çarpışma kıvılcımı her çarpışmada çalındığından hemen. Yüklenmeden çalınan an yordamsal yedekle çizilir.
   */
  private atlasHazirla(d: Dunya, o: Olay | null): void {
    if (!this.sahne.hibrit) return;
    if (d.topaclar.some((t, i) => t.stamina <= d.profiller[i]!.maxStamina * ATLAS_ESIK.elementStamina)) void efektAtlasYukle("efekt-cekirdek");
    if (o?.tur === "carpisma" || d.topaclar.some((t) => t.enerji >= ATLAS_ESIK.ortakEnerji)) void efektAtlasYukle("efekt");
    for (let i = 0; i < d.profiller.length; i++) {
      const p = d.profiller[i]!;
      const t = d.topaclar[i]!;
      if (p.element === "simsek" || t.enerji >= ATLAS_ESIK.elementEnerji || t.stamina <= p.maxStamina * ATLAS_ESIK.elementStamina
        || (o?.tur === "yetenekBasladi" && o.i === i)) void efektAtlasYukle(`efekt-${p.element}` as AtlasAdi);
    }
  }

  /** Pişmiş sheet'i (hava düzlemi) oynat; atlas yoksa false (yordamsal yedek kalır). Atlas pikseli = sanat pikseli. */
  private sheet(ad: AtlasAdi, anim: string, x: number, y: number, ayna = false, carpan = 1): boolean {
    if (!this.sahne.hibrit) return false;
    const s = efektSprite(ad, anim);
    if (!s) return false;
    const o = (2 / this.sahne.yakinlik) * carpan;
    // patlama merkezini temas noktasına oturt (pişirme pivotu aktörün ayağı; önizlemeden ölçüldü)
    const MERKEZ: Record<string, [number, number]> = { kritik: [0.39, 0.6], kivilcim: [0.33, 0.62] };
    const m = MERKEZ[anim];
    if (m) s.anchor.set(m[0], m[1]);
    s.position.set(Math.round(x), Math.round(y));
    s.scale.set(ayna ? -o : o, o);
    this.sahne.efektKatmani.addChild(s);
    this.atlasSayac[anim] = (this.atlasSayac[anim] ?? 0) + 1;
    return true;
  }

  /** Son çarpışmanın şiddet puanı (doğrulama). */
  sonSiddet = 0;

  /**
   * Çarpışma sonrası topaç tepkisi (yalnız görsel, GU-E): squash + sekme/yalpalama puanla ölçeklenir. Vurulan (daha çok
   * hasar alan) taraf daha güçlü tepki verir; hitstop süresince darbeye yaslı donar.
   */
  private tepki(o: Extract<Olay, { tur: "carpisma" }>, _d: Dunya, gp: number, dash: boolean, sd: Siddet, hitstopMs: number): void {
    const g = this.gorseller();
    const g1 = Math.min(1, gp);
    const [sx, sy] = dash && sd !== "hafif" ? HIS.squash.dash : [1 - (0.08 + 0.24 * g1), 1 + (0.08 + 0.24 * g1)];
    const sure = (70 + 100 * g1) / 1000;
    g[0]?.squash(o.nx, o.nz, sx, sy, sure);
    g[1]?.squash(o.nx, o.nz, sx, sy, sure);
    const h0 = o.taraflar[0].hasar, h1 = o.taraflar[1].hasar;
    const pay = (h: number) => (h0 + h1 > 0 ? h / (h0 + h1) : 0.5);
    g[0]?.darbe?.(o.nx, o.nz, gp * (0.7 + 0.6 * pay(h0)), hitstopMs / 1000);
    g[1]?.darbe?.(-o.nx, -o.nz, gp * (0.7 + 0.6 * pay(h1)), hitstopMs / 1000);
  }

  /** Işınsal yıldız patlaması (referans 07 temas noktası). */
  private yildiz(x: number, y: number, r: number, n: number, sure: number, renk = 0xfff3b0, ex = 1, ey = 0, f = 1): void {
    if (!this.sahne.hibrit) return;
    if (this.yildizlar.length > 8) this.yildizlar.shift();
    this.yildizlar.push({ x, y, t: 0, sure, r, n, aci: this.rng.aralik(0, Math.PI), renk, ex, ey, f });
  }

  /** Topacın arkasında kısa hız çizgileri, kendi renginde (referans 07 kırmızı/mavi çizgiler). */
  private hizCizgileri(x: number, y: number, dx: number, dy: number, renk: number, adet: number, uz: number): void {
    if (!this.sahne.hibrit) return;
    const u = Math.hypot(dx, dy) || 1;
    for (let k = 0; k < adet; k++) {
      const yan = (k - (adet - 1) / 2) * 7 + this.rng.isaretli() * 2;
      const px = x - (dy / u) * yan + (dx / u) * this.rng.aralik(18, 30);
      const py = y + (dx / u) * yan * 0.62 + (dy / u) * this.rng.aralik(18, 30);
      if (this.cizgiler.length > 40) this.cizgiler.shift();
      this.cizgiler.push({ x: px, y: py, dx: dx / u, dy: dy / u, t: 0, sure: 0.22 + this.rng.aralik(0, 0.08), renk, uz: uz * this.rng.aralik(0.7, 1.2) });
    }
  }

  olay(o: Olay, d: Dunya): void {
    const S = this.sahne;
    const g = this.gorseller();
    this.atlasHazirla(d, o);
    switch (o.tur) {
      case "carpisma": {
        const dash = o.taraflar[0].dash || o.taraflar[1].dash;
        const sd: Siddet = siddetBul(o.vn, dash);
        this.sayac[sd]++;
        if (o.zitElement) this.sayac.zitElement++;
        const x = S.ekranX(o.x);
        const y = S.ekranY(o.z);
        const hy = this.hava(y);
        const h0 = y - hy;
        const r0 = ELEMENT_RENK[o.taraflar[0].element];
        const r1 = ELEMENT_RENK[o.taraflar[1].element];
        // GU-E: sürekli şiddet puanı (vn + hasar + tik + kritik/dash); kademe içinde de ölçekler
        const hasarOran = Math.max(...o.taraflar.map((t, i) => t.hasar / (AYAR.tekVurusTavani * d.profiller[i]!.maxStamina)));
        const tikOran = Math.max(o.taraflar[0].dTik, o.taraflar[1].dTik) / AYAR.tikTavan;
        const gp = siddetPuani(o.vn, hasarOran, tikOran, sd === "kritik", dash);
        this.sonSiddet = gp;
        if (sd === "yok") {
          // hafif sürtme: birkaç kıvılcım, çok kısık tık. GU-F: FIZIK-1'de girdisiz çanak buluşmaları hep bu kademede
          // (vn 30-75, ~33/dk); vn ≥ hafif/2 ise küçük, kısa bir çekirdek flaş (≈10 px, 80 ms) ki temas okunsun
          this.kivilcimlar.patlat(x, y, h0, o.nx, o.nz, 0.06 + gp * 0.5, this.ayar.parcacik, o.vn >= HIS.esik.hafif * 0.5);
          this.toz(x, y, 2, 0x9aa8ad);
          if (o.vn > HIS.esik.hafif * 0.4) this.sesKanca("carpisma-hafif", 0.18, 1.3 + this.rng.aralik(0, 0.15));
          return;
        }
        // ses: şiddetle yükselen hacim, ağırlaştıkça pesleşen perde (CC0 sentez + Kenney katmanı aynı)
        const g1 = Math.min(1, gp);
        this.sesKanca(sd === "kritik" ? "carpisma-kritik" : sd === "agir" ? "carpisma-agir" : "carpisma-hafif", 0.45 + 0.55 * g1, 1.12 - 0.22 * g1 + this.rng.isaretli() * 0.04);
        // hitstop: 25 → 100 ms puanla (05 § 3.2 hafif 33 / ağır 66 / kritik 100 ile örtüşür; tavanlar hitstop() içinde)
        let ms = 25 + 75 * g1;
        if (o.zitElement) ms += HIS.hitstopMs.zitEk;
        if (dash) ms = Math.max(HIS.hitstopMs.dashTaban, ms) + HIS.hitstopMs.dashEk;
        const ms0 = this.hitstop(0, ms, o.nx, o.nz, false, sd === "kritik");
        this.hitstop(1, ms, o.nx, o.nz, false, sd === "kritik");
        // sarsıntı (ilk 2 kare normal boyunca): 1 → 7 px puanla
        let px = 1 + 6 * g1;
        if (dash) px = Math.max(HIS.sarsintiPx.dash, px);
        if (o.zitElement) px *= HIS.zitSarsintiCarpani;
        S.sars(Math.sqrt(px / SAHNE.sarsintiTavan) * Math.sqrt(this.ayar.sarsinti), o.nx, o.nz);
        // flaş: topaç tint, kritikte tam ekran
        g[0]?.flas(HIS.tintKare[sd]);
        g[1]?.flas(HIS.tintKare[sd]);
        if (sd === "kritik") this.ekranFlasi(HIS.ekranFlas.kritik[0], HIS.ekranFlas.kritik[1]);
        this.tepki(o, d, gp, dash, sd, ms0);
        // GU-E kıvılcım demeti (referans 07): çekirdek flaş + zemin elipsinde sıçrayan çizgiler; adet/hız/uzunluk/parlaklık puanla
        this.kivilcimlar.patlat(x, y, h0, o.nx, o.nz, gp * (o.zitElement ? 1.1 : 1), this.ayar.parcacik);
        // element renkli birkaç kırıntı (iki topacın kimliği; kıvılcımın kendisi sarı-beyaz)
        const n = Math.round(HIS.parcacik[sd] * 0.2 * (o.zitElement ? HIS.zitParcacikCarpani : 1));
        this.kivilcim(x, hy, o.nx, o.nz, n, [r0.acik, r1.acik, r0.vurgu, r1.vurgu], [90, 200 + 200 * g1]);
        const e = S.ekranYon(o.nx, o.nz);
        // kritik: GU-D dar yıldız (ışınlar normal boyunca %40'a basık) korunur
        if (sd === "kritik") this.yildiz(x, hy, 34, 10, 0.2, undefined, e.x, e.y, 0.4);
        const ta = d.topaclar[0]!;
        const tb = d.topaclar[1]!;
        if (sd !== "hafif" || dash) {
          const adet = sd === "kritik" ? 4 : 3;
          this.hizCizgileri(S.ekranX(ta.x), this.hava(S.ekranY(ta.z)), S.ekranX(ta.x) - x, S.ekranY(ta.z) - y, o.zitElement ? r0.orta : r0.acik, adet, 26);
          this.hizCizgileri(S.ekranX(tb.x), this.hava(S.ekranY(tb.z)), S.ekranX(tb.x) - x, S.ekranY(tb.z) - y, o.zitElement ? r1.orta : r1.acik, adet, 26);
        }
        if (S.hibrit && (sd !== "hafif" || dash)) {
          // krem sarmal: geri tepilen (daha hızlı) topacın çevresinde, dönüş yönünde
          const j = Math.hypot(tb.vx, tb.vz) >= Math.hypot(ta.vx, ta.vz) ? 1 : 0;
          const tj = d.topaclar[j]!;
          if (this.kivrimlar.length > 3) this.kivrimlar.shift();
          this.kivrimlar.push({ x: S.ekranX(tj.x), y: S.ekranY(tj.z), a0: Math.atan2(y - S.ekranY(tj.z), x - S.ekranX(tj.x)), yon: d.profiller[j]!.donus === "sol" ? -1 : 1, t: 0, sure: sd === "kritik" ? 0.6 : 0.45 });
        }
        // GU-E: pişmiş kritik sheet'i (yumuşak sarı halka; referansta yok) çarpışmadan çıktı, yalnız Parçalanma'da kalır
        if (sd !== "hafif" && (o.taraflar[0].element === "simsek" || o.taraflar[1].element === "simsek")) this.sheet("efekt-simsek", "simsek-carpma", x, hy, e.x < 0, 0.6);
        if (gp >= 0.45) {
          // halka şok dalgası (zeminde elips), boyu ve süresi puanla
          const sure2 = HIS.sok.agirMs + (HIS.sok.kritikMs - HIS.sok.agirMs) * Math.min(1, (gp - 0.45) / 0.55);
          this.sok(x, y, 6, 26 + 34 * g1, sure2, renkKaristir(r0.orta, r1.orta, 0.5), o.zitElement ? r1.orta : null, gp > 0.8 ? 4 : 3);
        }
        if (sd !== "hafif") {
          const z = sd === "kritik" ? HIS.zoom.kritik : HIS.zoom.agir;
          this.zoom(z[0], z[1]);
        }
        if (o.zitElement && gp < 0.45) this.sok(x, y, 4, 30, 200, r0.orta, r1.orta, 4);
        if (dash) { this.sok(x, y, 10, 70, 240, 0xffffff, null, 2); this.zoom(HIS.zoom.dash[0], HIS.zoom.dash[1]); }
        break;
      }
      case "duvar": {
        this.sayac.duvar++;
        const x = S.ekranX(o.x);
        const y = S.ekranY(o.z);
        const ms = o.vd > HIS.esik.agir ? 33 : o.vd > HIS.esik.hafif ? 16 : 0;
        if (o.vd > HIS.esik.hafif * 0.75) this.sesKanca("duvar", Math.min(1, o.vd / HIS.esik.agir));
        if (ms > 0) this.hitstop(o.i, ms, o.nx, o.nz, false, false);
        S.sars(Math.sqrt(HIS.sarsintiPx.duvar / SAHNE.sarsintiTavan) * Math.sqrt(this.ayar.sarsinti) * Math.min(1, o.vd / HIS.esik.agir + 0.4), o.nx, o.nz, true);
        g[o.i]?.squash(o.nx, o.nz, HIS.squash.duvar[0], HIS.squash.duvar[1], HIS.squashMs.duvar / 1000);
        // duvar boyunca çizgi parçacıklar (teğet)
        const adet = Math.round(HIS.parcacik.duvar * Math.min(1.25, o.vd / 200) * this.ayar.parcacik);
        for (let k = 0; k < adet; k++) {
          const yon = k % 2 === 0 ? 1 : -1;
          const v = this.rng.aralik(60, 180);
          this.parcaciklar.ekle(x, y, -o.nz * v * yon - o.nx * 30, (o.nx * v * yon - o.nz * 30) * S.k, this.rng.aralik(0.2, 0.4), 0xcfe0e5, 2, 4);
        }
        this.sok(x, y, 4, 18, 120, 0xcfe0e5, null, 2);
        break;
      }
      case "dash": {
        this.sayac.dash++;
        this.sesKanca("dash");
        const t = d.topaclar[o.i]!;
        const x = S.ekranX(t.x);
        const y = S.ekranY(t.z);
        const renk = ELEMENT_RENK[d.profiller[o.i]!.element].acik;
        for (let k = 0; k < HIS.parcacik.dash; k++) {
          const v = this.rng.aralik(80, 160);
          const a = Math.atan2(-o.dz * S.k, -o.dx) + this.rng.isaretli() * 0.5;
          this.parcaciklar.ekle(x, y, Math.cos(a) * v, Math.sin(a) * v, 0.25, renk, 2, 5);
        }
        break;
      }
      case "sekme": {
        this.sayac.sekme++;
        this.sesKanca("sekme");
        const t = d.topaclar[o.i]!;
        this.toz(S.ekranX(t.x), S.ekranY(t.z), 6, 0x9aa8ad, 24);
        break;
      }
      case "ringOut": {
        this.sayac.ringOut++;
        this.sesKanca("ring-out");
        const x = S.ekranX(o.x);
        const y = S.ekranY(o.z);
        const u = Math.hypot(o.vx, o.vz) || 1;
        this.hitstop(o.i, 133, o.vx / u, o.vz / u, true, true);
        S.sars(Math.sqrt(HIS.sarsintiPx.ringOut / SAHNE.sarsintiTavan) * Math.sqrt(this.ayar.sarsinti), o.vx / u, o.vz / u);
        this.ekranFlasi(HIS.ekranFlas.ringOut[0], HIS.ekranFlas.ringOut[1]);
        this.toz(x + (o.vx / u) * 20, y + (o.vz / u) * 20 * S.k, HIS.parcacik.ringOut, 0xb9c6ca, 8);
        this.sok(x, y, 10, 70, HIS.sok.ringOutMs, ELEMENT_RENK[d.profiller[o.i]!.element].orta);
        this.zoom(HIS.zoom.ringOut[0], HIS.zoom.ringOut[1]);
        this.sheet("efekt", "toz-bulut", x + (o.vx / u) * 22, y + (o.vz / u) * 22 * S.k);
        this.yildiz(x, this.hava(y), 30, 10, 0.18, ELEMENT_RENK[d.profiller[o.i]!.element].vurgu);
        g[o.i]?.bitis("ringOut", o.vx, o.vz);
        break;
      }
      case "parcalandi": {
        this.sayac.parcalanma++;
        this.sesKanca("parcalanma");
        const x = S.ekranX(o.x);
        const y = S.ekranY(o.z);
        const el = ELEMENT_RENK[d.profiller[o.i]!.element];
        this.hitstop(o.i, HIS.hitstopMs.bitisTavan, 1, 0, true, true);
        S.sars(Math.sqrt(HIS.sarsintiPx.parcalanma / SAHNE.sarsintiTavan) * Math.sqrt(this.ayar.sarsinti));
        this.ekranFlasi(HIS.ekranFlas.parcalanma[0], HIS.ekranFlas.parcalanma[1]);
        this.kivilcim(x, y, 1, 0, HIS.parcacik.parcalanma, [el.orta, el.acik, 0xffffff, el.vurgu], [120, 420], Math.PI);
        this.toz(x, y, 12, 0xb9c6ca, 14);
        this.sok(x, y, 8, 90, HIS.sok.parcalanmaMs, el.orta, 0xffffff, 4);
        this.zoom(HIS.zoom.parcalanma[0], HIS.zoom.parcalanma[1]);
        this.yildiz(x, this.hava(y), 44, 12, 0.24);
        this.sheet("efekt", "toz-bulut", x, y + 4, false, 1);
        { const pe = d.profiller[o.i]!.element;
          if (pe === "don") this.sheet("efekt-don", "don-kirilma", x, y);
          else if (pe === "kor") this.sheet("efekt-kor", "kor-bulut", x, this.hava(y));
          else this.sheet("efekt-cekirdek", "kritik", x, this.hava(y)); }
        if (this.ayar.yavasZoom !== false) this.yavasKalanMs = HIS.yavasCekim.ms;
        g[o.i]?.bitis("parcalanma", o.vx, o.vz);
        break;
      }
      case "durma": {
        this.sayac.durma++;
        this.sesKanca("durma");
        const x = S.ekranX(o.x);
        const y = S.ekranY(o.z);
        this.toz(x, y, HIS.parcacik.durma, 0xb9c6ca, 26);
        this.sok(x, y, 26, 40, 500, 0x9aa8ad, null, 2);
        this.sheet("efekt", "toz-bulut", x + 10, y + 2, false, 0.5);
        this.zoom(HIS.zoom.durma[0], HIS.zoom.durma[1]);
        g[o.i]?.bitis("durma", 0, 0);
        break;
      }
      // ---- D3: yetenek reçeteleri (05 § 3.2 Ulti telegrafı / Ulti vuruşu / Enerji doldu) ----
      case "yetenekBasladi": {
        this.sayac.telegraf++;
        this.sesKanca("telegraf", o.kademe >= 3 ? 1 : 0.7);
        if (o.kademe >= 3) {
          // Ulti telegrafı: topaç hafifçe çöker, yavaş zoom %2 (sürekli 0,5 px sarsıntı YetenekGorsel'de)
          g[o.i]?.squash(o.dx, o.dz, 0.95, 1.05, 0.9);
          this.zoom(0.02, 0.9);
        }
        break;
      }
      case "yetenekEtki": {
        if (o.kademe < 3) break;
        // Ulti vuruşu: hitstop 100-133, sarsıntı 8 / 250 ms, element renkli ekran flaşı (≤ %25), zoom %5, geniş parçacık
        this.sayac.ulti++;
        this.sesKanca("ulti");
        const el = ELEMENT_RENK[d.profiller[o.i]!.element];
        const j = 1 - o.i;
        const t = d.topaclar[j]!;
        const kx = t.x - d.topaclar[o.i]!.x;
        const kz = t.z - d.topaclar[o.i]!.z;
        const u = Math.hypot(kx, kz) || 1;
        this.hitstop(j, 116, kx / u, kz / u, false, true);
        S.sars(Math.sqrt(HIS.sarsintiPx.ringOut / SAHNE.sarsintiTavan) * Math.sqrt(this.ayar.sarsinti));
        this.ekranFlasi(0.25, 90, el.orta);
        const cx = S.ekranX(o.x);
        const cy = S.ekranY(o.z);
        this.kivilcim(cx, cy, 1, 0, 36, [el.orta, el.acik, el.vurgu, 0xffffff], [120, 420], Math.PI);
        this.sok(S.ekranX(d.topaclar[o.i]!.x), S.ekranY(d.topaclar[o.i]!.z), 20, 200, 420, el.orta, el.acik, 4);
        { // Ulti element sheet'i (hava öğeleri; zemin halkaları kodla elips)
          const pe = d.profiller[o.i]!.element;
          const ULTI: Record<string, [AtlasAdi, string]> = { kor: ["efekt-kor", "kor-bulut"], don: ["efekt-don", "don-parca"], kaya: ["efekt-kaya", "ulti-kaya"], kasirga: ["efekt-kasirga", "ulti-kasirga"], girdap: ["efekt-girdap", "ulti-girdap"], simsek: ["efekt-simsek", "simsek-carpma"] };
          const [ad, an] = ULTI[pe]!;
          this.sheet(ad, an, cx, pe === "kaya" || pe === "kasirga" ? cy + 8 : this.hava(cy));
          this.yildiz(cx, this.hava(cy), 40, 12, 0.22, el.vurgu);
        }
        this.zoom(0.05, 0.3);
        break;
      }
      case "yetenekVurus": {
        if (o.hasar <= 0 && o.nx === 0 && o.nz === 0) break;
        this.sayac.yetenekVurus++;
        const el = ELEMENT_RENK[d.profiller[o.i]!.element];
        const x = S.ekranX(o.x);
        const y = S.ekranY(o.z);
        this.kivilcim(x, y, o.nx, o.nz, 12, [el.orta, el.acik, 0xffffff], [120, 320]);
        if (o.hasar > 0) { this.sesKanca("carpisma-agir", 0.8); g[o.hedef]?.flas(2); }
        if (o.nx !== 0 || o.nz !== 0) g[o.hedef]?.squash(o.nx, o.nz, 0.8, 1.2, 0.12);
        break;
      }
      case "zincir": {
        this.sayac.zincir++;
        this.sesKanca("carpisma-hafif");
        const x = S.ekranX(o.x2);
        const y = S.ekranY(o.z2);
        this.kivilcim(x, y, 1, 0, 10, [ELEMENT_RENK.simsek.orta, ELEMENT_RENK.simsek.vurgu, 0xffffff], [80, 260], Math.PI);
        g[o.hedef]?.flas(2);
        break;
      }
      case "kontra": {
        this.sayac.kontra++;
        this.sesKanca("carpisma-kritik");
        const x = S.ekranX(o.x);
        const y = S.ekranY(o.z);
        this.hitstop(o.hedef, 100, 1, 0, false, true);
        this.sok(x, y, 6, 64, 260, ELEMENT_RENK[d.profiller[o.i]!.element].orta, 0xffffff, 4);
        S.sars(Math.sqrt(HIS.sarsintiPx.kritik / SAHNE.sarsintiTavan) * Math.sqrt(this.ayar.sarsinti));
        break;
      }
      case "engelCarpma": {
        this.sayac.engel++;
        this.sesKanca("duvar");
        const x = S.ekranX(o.x);
        const y = S.ekranY(o.z);
        this.toz(x, y, o.kirildi ? 14 : 6, ELEMENT_RENK.kaya.acik, 6);
        this.sok(x, y, 4, o.kirildi ? 40 : 20, 160, ELEMENT_RENK.kaya.acik, null, 2);
        break;
      }
      case "enerjiDoldu": {
        // Enerji doldu: topaç çevresinde element çemberi bir kez + 8 yukarı parçacık (HUD parıltısı MacHud'da)
        this.sayac.enerjiDoldu++;
        this.sesKanca("enerji-doldu", 0.8);
        const t = d.topaclar[o.i]!;
        const x = S.ekranX(t.x);
        const y = S.ekranY(t.z);
        const el = ELEMENT_RENK[d.profiller[o.i]!.element];
        this.sok(x, y, 30, 44, 300, el.acik, null, 2);
        this.sheet("efekt", "enerji-doldu", x, this.hava(y) + 6);
        const adet = Math.round(8 * this.ayar.parcacik);
        for (let k = 0; k < adet; k++) this.parcaciklar.ekle(x + this.rng.isaretli() * 18, y + this.rng.isaretli() * 8, this.rng.isaretli() * 12, -this.rng.aralik(50, 110), this.rng.aralik(0.4, 0.7), el.vurgu, 2, 1);
        break;
      }
      case "macBitti":
        this.sesKanca("mac-sonu");
        break;
      case "turBitti":
        break;
      default:
        break;
    }
  }

  /** GU-E: sürekli temas durumu (doğrulama). */
  get temasDurumu(): TemasDurumu {
    return { aktif: akisAcik(this.oturum), sure: Math.round(this.oturum.temasSn * 100) / 100, guc: Math.round(this.temas.guc * 100) / 100, kivilcim: this.temas.sayac };
  }

  /**
   * GU-E sürekli temas (sürtünme), GU-F oturum biçimi: temas oturumu (his.ts `temasAdimi`, histerezis + 0,25 s boşluk
   * toleransı) toplam temas süresi `akisEsikSn`'yi geçince temas noktasında kıvılcım akışı + ışıma + yaslanma + sürtünme
   * tıkı. Kısa temas (FIZIK-1 çarp-ayrıl: medyan 2 kare) yalnız sim olayının tek patlamasını verir. Güç = dönüş (stamina
   * oranı; aynı dönüş yönünde daha çok) + bağıl teğet hız + itme, eşik sonrası temas süresiyle rampalanır. Akış kıvılcımı
   * yalnız temas karelerinde doğar; oturum içi kısa ayrılmada ışıma yavaş söner (yanıp sönmez). Hitstop karelerinde
   * akış doğmaz (darbenin anı patlamanındır). Sim'e yazmaz.
   */
  private temasGuncelle(dt: number, d: Dunya, donuk: boolean): void {
    const T = this.temas;
    const O = this.oturum;
    const [a, b] = d.topaclar;
    const [pa, pb] = d.profiller;
    let hedef = 0;
    let temas = false;
    if (a && b && pa && pb && aktifMi(a) && aktifMi(b) && a.sekmeKalan === 0 && b.sekmeKalan === 0 && a.koruma === 0 && b.koruma === 0) {
      const dx = b.x - a.x, dz = b.z - a.z;
      const mesafe = Math.hypot(dx, dz);
      temas = temasAdimi(O, mesafe, AYAR.topacYaricap * 2, dt);
      if (temas) {
        if (mesafe > 1e-6) { T.nx = dx / mesafe; T.nz = dz / mesafe; }
        const rvx = a.vx - b.vx, rvz = a.vz - b.vz;
        const vt = rvx * -T.nz + rvz * T.nx;
        const vn = rvx * T.nx + rvz * T.nz;
        T.yon = Math.abs(vt) > 20 ? Math.sign(vt) : 0;
        if (akisAcik(O)) {
          const donus = (staminaOrani(a, pa) + staminaOrani(b, pb)) / 2 * (pa.donus === pb.donus ? 1 : 0.6);
          const R = TEMAS.rampa;
          const rampa = R.taban + R.tavan * (1 - Math.exp(-(O.temasSn - TEMAS.akisEsikSn) / R.tauSn));
          hedef = Math.min(1.3, (0.22 * donus + Math.abs(vt) / 350 + Math.max(0, vn) / 400) * rampa);
        }
      }
    } else { O.oturum = false; O.temasSn = 0; O.kopukSn = TEMAS.toleransSn; }
    const acik = akisAcik(O);
    // temas karesinde hedefe hızlı çık; oturum içi boşlukta yavaş, oturum bitince hızlı sön
    const hiz = temas && hedef > T.guc ? 12 : acik ? 3 : 10;
    T.guc += ((temas ? hedef : 0) - T.guc) * Math.min(1, dt * hiz);
    { const g = this.gorseller(); const y = acik ? T.guc : 0; g[0]?.yaslan?.(T.nx, T.nz, y); g[1]?.yaslan?.(-T.nx, -T.nz, y); }
    if (T.guc < 0.01) { T.guc = 0; T.birikim = 0; this.kivilcimlar.isimaAyarla(0, 0, 0); return; }
    // temas noktası: iki topacın GÖRSEL konumlarının ortası, gövde yüksekliğinde
    const ka = this.konumlar[0]!, kb = this.konumlar[1]!;
    const x = (ka.x + kb.x) / 2, y = (ka.y + kb.y) / 2;
    const hy = this.hava(y);
    this.kivilcimlar.isimaAyarla(x, hy, temas ? T.guc : T.guc * 0.6);
    if (!temas || !acik || donuk) return;
    T.birikim += dt * (TEMAS.oran.taban + TEMAS.oran.egim * T.guc);
    const adet = Math.floor(T.birikim);
    if (adet > 0) {
      T.birikim -= adet;
      T.sayac += adet;
      this.kivilcimlar.akit(x, y, y - hy, T.nx, T.nz, T.guc, adet, T.yon, this.ayar.parcacik);
    }
    // ara sıra küçük çekirdek titremesi (sürtünme parlaması)
    if (this.rng.sayi() < dt * (4 + 10 * T.guc)) this.kivilcimlar.flas(x, hy, T.nx, T.nz, 0.12 + 0.25 * Math.min(1, T.guc));
    T.sesSn -= dt;
    if (T.guc > TEMAS.ses.esik && T.sesSn <= 0) {
      T.sesSn = TEMAS.ses.taban - TEMAS.ses.egim * Math.min(1, T.guc) + this.rng.aralik(0, 0.04);
      T.ses++;
      this.sesKanca("carpisma-hafif", 0.1 + 0.22 * Math.min(1, T.guc), 1.35 + this.rng.aralik(0, 0.3));
    }
  }

  /** Her kare; `dt` gerçek saniye. `d` verilirse tembel atlas eşikleri ~4 Hz denetlenir (olaysız Enerji/stamina değişimi). */
  guncelle(dt: number, d?: Dunya): void {
    this.saat += dt;
    if (d && (this.atlasDenetimSn -= dt) <= 0) { this.atlasDenetimSn = 0.25; this.atlasHazirla(d, null); }
    const ydt = dt * this.yavas;
    if (this.yavasKalanMs > 0) this.yavasKalanMs = Math.max(0, this.yavasKalanMs - dt * 1000);
    // hitstop sırasında parçacıklar yaşlanmaz (05 § 3.3: "yaşları dondurulur")
    const donuk = this.hitstopVar(0) || this.hitstopVar(1);
    this.parcaciklar.guncelle(donuk ? ydt * 0.15 : ydt);
    if (d) this.temasGuncelle(ydt, d, donuk);
    this.kivilcimlar.guncelle(donuk ? ydt * 0.15 : ydt);
    const h = this.hizG.clear();
    for (const y of this.yildizlar) {
      y.t += ydt;
      const t = Math.min(1, y.t / y.sure);
      const r = y.r * (0.55 + 0.45 * t);
      const a = 1 - t * t;
      for (let k = 0; k < y.n; k++) {
        const aci = y.aci + (k / y.n) * Math.PI * 2;
        const uz = r * (k % 2 ? 0.55 : 1);
        const c0 = Math.cos(aci), s0 = Math.sin(aci);
        // normal boyunca bileşen f ile basılır: ışınlar topaçların üstüne değil, aralarındaki dik yarığa uzanır
        const bo = (c0 * y.ex + s0 * y.ey) * y.f;
        const dk = -c0 * y.ey + s0 * y.ex;
        const c = bo * y.ex - dk * y.ey, si = bo * y.ey + dk * y.ex;
        h.poly([y.x + c * uz, y.y + si * uz, y.x - s0 * 2.2, y.y + c0 * 2.2, y.x + s0 * 2.2, y.y - c0 * 2.2]).fill({ color: k % 2 ? 0xffc23d : y.renk, alpha: a });
      }
      h.circle(y.x, y.y, 6 * (1 - t) + 2).fill({ color: 0xffffff, alpha: a });
    }
    this.yildizlar = this.yildizlar.filter((y) => y.t < y.sure);
    for (const c of this.cizgiler) {
      c.t += ydt;
      const t = Math.min(1, c.t / c.sure);
      const bas = 6 + 26 * t;
      h.moveTo(c.x + c.dx * bas, c.y + c.dy * bas).lineTo(c.x + c.dx * (bas + c.uz * (1 - t)), c.y + c.dy * (bas + c.uz * (1 - t))).stroke({ width: 3, color: c.renk, alpha: 1 - t });
    }
    this.cizgiler = this.cizgiler.filter((c) => c.t < c.sure);
    const kg = this.kivrimG.clear();
    for (const kv of this.kivrimlar) {
      kv.t += ydt;
      const t = Math.min(1, kv.t / kv.sure);
      const bas = Math.min(1, t / 0.35); // baş önce koşar, sonra kuyruk söner
      const sol = 1 - t;
      const n = 22;
      for (let q = 0; q < n; q++) {
        const u0 = q / n, u1 = (q + 1) / n;
        if (u1 > bas) break;
        const nokta = (u: number) => { const a = kv.a0 + kv.yon * u * Math.PI * 1.7; const r = 30 + 30 * u; return [kv.x + Math.cos(a) * r * 1.2, kv.y + Math.sin(a) * r * 1.2 * this.sahne.k] as const; };
        const [x0, y0] = nokta(u0);
        const [x1, y1] = nokta(u1);
        const al = sol * (0.35 + 0.65 * (u1 / Math.max(0.01, bas)));
        kg.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: 5, color: 0xf6d9a8, alpha: al * 0.8 });
        kg.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: 2, color: 0xfff6e2, alpha: al });
      }
    }
    this.kivrimlar = this.kivrimlar.filter((k) => k.t < k.sure);
    for (const s of this.soklar) {
      s.t += ydt;
      const t = Math.min(1, s.t / s.sure);
      const r = s.r0 + (s.r1 - s.r0) * (1 - (1 - t) * (1 - t));
      const a = 1 - t;
      const k = this.sahne.k;
      s.g.clear().ellipse(s.x, s.y, r, r * k).stroke({ width: s.kalinlik, color: s.renk, alpha: a });
      if (s.renk2 !== null) s.g.ellipse(s.x, s.y, r * 0.72, r * 0.72 * k).stroke({ width: s.kalinlik, color: s.renk2, alpha: a });
    }
    for (let i = this.soklar.length - 1; i >= 0; i--) {
      const s = this.soklar[i]!;
      if (s.t >= s.sure) { s.g.destroy(); this.soklar.splice(i, 1); }
    }
    if (this.flasKalanMs > 0) {
      this.flasKalanMs -= dt * 1000;
      this.ekranFlas.alpha = this.flasKalanMs > 0 ? this.flasAlfa : 0;
    } else this.ekranFlas.alpha = 0;
  }
}
