import { Graphics } from "pixi.js";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import type { Dunya, Olay } from "../../paylasilan/sim/durum.ts";
import { HIS, type Siddet, siddetBul } from "./his.ts";
import { Parcaciklar } from "./Parcaciklar.ts";
import { ELEMENT_RENK, renkKaristir } from "./renkler.ts";
import { SAHNE, type Sahne } from "./Sahne.ts";
import { SusRastgele } from "./SusRastgele.ts";
import type { TopacCizimi } from "./cizimTurleri.ts";

// Sim olayı → his (05 § 3): sim `adim` sonunda `olaylar`'a koyar, burada okunur. Hiçbiri sim'e geri yazmaz.
// Görsel hitstop: çarpışan topaçların RENDER konumu bekler, sim akmaya devam eder; bitince kritik sönümlü yetişme.

interface Sok { g: Graphics; t: number; sure: number; x: number; y: number; r0: number; r1: number; renk: number; renk2: number | null; kalinlik: number }
interface KonumDurumu { hold: { x: number; y: number } | null; kalanMs: number; nx: number; ny: number; x: number; y: number; ilk: boolean }

export interface HisAyarlari {
  sarsinti: number; // 1 / 0,5 / 0
  flas: "normal" | "azaltilmis" | "kapali";
  hitstop: number; // 1 / 0,5 / 0
  parcacik: number; // 1 / 0,4
  /** Yavaş çekim ve zoom (ux § 6.2): false ise Parçalanma 0,3× ve zoom darbeleri yok. */
  yavasZoom?: boolean;
}

/** Ses kancası (05 § 3.3): olay anahtarı → ses adı; ses yoksa sessiz. */
export type SesKancasi = (ad: "carpisma-hafif" | "carpisma-agir" | "carpisma-kritik" | "duvar" | "dash" | "sekme" | "ring-out" | "parcalanma" | "durma" | "telegraf" | "ulti" | "enerji-doldu" | "mac-sonu", hacim?: number) => void;

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
  readonly sayac = { yok: 0, hafif: 0, agir: 0, kritik: 0, duvar: 0, ringOut: 0, parcalanma: 0, durma: 0, dash: 0, sekme: 0, zitElement: 0, ekranFlas: 0, ekranFlasReddi: 0, telegraf: 0, ulti: 0, enerjiDoldu: 0, yetenekVurus: 0, zincir: 0, kontra: 0, engel: 0 };
  ayar: HisAyarlari = { sarsinti: 1, flas: "normal", hitstop: 1, parcacik: 1, yavasZoom: true };
  sesKanca: SesKancasi = () => {};

  constructor(private sahne: Sahne, private gorseller: () => readonly TopacCizimi[]) {
    sahne.efektKatmani.addChild(this.parcaciklar.kap);
    this.ekranFlas.rect(0, 0, SAHNE.genislik, SAHNE.yukseklik).fill(0xffffff);
    this.ekranFlas.alpha = 0;
    sahne.ekranKatmani.addChild(this.ekranFlas);
    for (let i = 0; i < 2; i++) this.konumlar.push(Efektler.bosKonum());
  }

  private static bosKonum(): KonumDurumu {
    return { hold: null, kalanMs: 0, nx: 0, ny: 0, x: 0, y: 0, ilk: true };
  }

  /** Efekt saati çarpanı (Parçalanma yavaş çekimi). */
  get yavas(): number { return this.yavasKalanMs > 0 ? HIS.yavasCekim.carpan : 1; }

  hitstopVar(i: number): boolean { return (this.konumlar[i]?.kalanMs ?? 0) > 0; }

  temizle(): void {
    this.parcaciklar.temizle();
    for (const s of this.soklar) s.g.destroy();
    this.soklar = [];
    this.flasKalanMs = 0;
    this.ekranFlas.alpha = 0;
    this.yavasKalanMs = 0;
    this.konumlar = [Efektler.bosKonum(), Efektler.bosKonum()];
  }

  /**
   * Görsel konum: hitstop sırasında son konumda bekler (±1 px dik titreme); sonra sim konumuna τ = 60 ms
   * kritik sönümlü yaklaşma. Fark vMutlak·hitstop'u aşarsa atlar (axiom #32).
   */
  konum(i: number, hedefX: number, hedefY: number, dt: number): { x: number; y: number } {
    const k = this.konumlar[i]!;
    if (k.ilk) { k.ilk = false; k.x = hedefX; k.y = hedefY; }
    if (k.kalanMs > 0 && k.hold) {
      k.kalanMs -= dt * 1000;
      const tit = (this.rng.sayi() < 0.5 ? -1 : 1) * HIS.hitstopTitremePx;
      return { x: k.hold.x - k.ny * tit, y: k.hold.y + k.nx * tit };
    }
    k.hold = null;
    const dx = k.x - hedefX;
    const dy = k.y - hedefY;
    const atla = (AYAR.vMutlak * HIS.hitstopMs.bitisTavan) / 1000;
    if (!Number.isFinite(dx + dy) || Math.hypot(dx, dy) > atla || dt <= 0) { k.x = hedefX; k.y = hedefY; return { x: k.x, y: k.y }; }
    // kritik sönümlü yaklaşımın kare hızından bağımsız, koşulsuz kararlı biçimi: (1 + t/τ)·e^(−t/τ) çarpanı
    const t = dt / (HIS.yetismeTauMs / 1000);
    const c = (1 + t) * Math.exp(-t);
    k.x = hedefX + dx * c;
    k.y = hedefY + dy * c;
    if (Math.hypot(k.x - hedefX, k.y - hedefY) < 0.25) { k.x = hedefX; k.y = hedefY; }
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

  olay(o: Olay, d: Dunya): void {
    const S = this.sahne;
    const g = this.gorseller();
    switch (o.tur) {
      case "carpisma": {
        const dash = o.taraflar[0].dash || o.taraflar[1].dash;
        const sd: Siddet = siddetBul(o.vn, dash);
        this.sayac[sd]++;
        if (o.zitElement) this.sayac.zitElement++;
        const x = S.ekranX(o.x);
        const y = S.ekranY(o.z);
        const r0 = ELEMENT_RENK[o.taraflar[0].element];
        const r1 = ELEMENT_RENK[o.taraflar[1].element];
        if (sd === "yok") { this.toz(x, y, 2, 0x9aa8ad); return; }
        this.sesKanca(sd === "kritik" ? "carpisma-kritik" : sd === "agir" ? "carpisma-agir" : "carpisma-hafif");
        // hitstop
        let ms: number = HIS.hitstopMs[sd];
        if (o.zitElement) ms += HIS.hitstopMs.zitEk;
        if (dash) ms = Math.max(HIS.hitstopMs.dashTaban, ms) + HIS.hitstopMs.dashEk;
        this.hitstop(0, ms, o.nx, o.nz, false, sd === "kritik");
        this.hitstop(1, ms, o.nx, o.nz, false, sd === "kritik");
        // sarsıntı (ilk 2 kare normal boyunca)
        let px: number = dash ? Math.max(HIS.sarsintiPx.dash, HIS.sarsintiPx[sd]) : HIS.sarsintiPx[sd];
        if (o.zitElement) px *= HIS.zitSarsintiCarpani;
        S.sars(Math.sqrt(px / SAHNE.sarsintiTavan) * Math.sqrt(this.ayar.sarsinti), o.nx, o.nz);
        // flaş: topaç tint, kritikte tam ekran
        g[0]?.flas(HIS.tintKare[sd]);
        g[1]?.flas(HIS.tintKare[sd]);
        if (sd === "kritik") this.ekranFlasi(HIS.ekranFlas.kritik[0], HIS.ekranFlas.kritik[1]);
        // squash/stretch normal ekseninde
        const [sx, sy] = dash && sd !== "hafif" ? HIS.squash.dash : HIS.squash[sd];
        const sure = HIS.squashMs[sd] / 1000;
        g[0]?.squash(o.nx, o.nz, sx, sy, sure);
        g[1]?.squash(o.nx, o.nz, sx, sy, sure);
        // kıvılcım: element renkleri (yarı yarı), karşıtta iki renkli çift çember
        const n = Math.round(HIS.parcacik[sd] * (o.zitElement ? HIS.zitParcacikCarpani : 1));
        const hiz: [number, number] = sd === "kritik" ? [220, 520] : sd === "agir" ? [160, 400] : [110, 260];
        this.kivilcim(x, y, o.nx, o.nz, n, [r0.acik, r1.acik, 0xffffff, r0.vurgu, r1.vurgu], hiz);
        if (sd !== "hafif") {
          const sure2 = sd === "kritik" ? HIS.sok.kritikMs : HIS.sok.agirMs;
          this.sok(x, y, 6, sd === "kritik" ? 56 : 40, sure2, renkKaristir(r0.orta, r1.orta, 0.5), o.zitElement ? r1.orta : null, 3);
          if (sd === "kritik") this.sok(x, y, 2, 36, sure2 * 0.8, 0xffffff, null, 2);
          const z = sd === "kritik" ? HIS.zoom.kritik : HIS.zoom.agir;
          this.zoom(z[0], z[1]);
        }
        if (o.zitElement) this.sok(x, y, 4, 30, 200, r0.orta, r1.orta, 4);
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

  /** Her kare; `dt` gerçek saniye. */
  guncelle(dt: number): void {
    this.saat += dt;
    const ydt = dt * this.yavas;
    if (this.yavasKalanMs > 0) this.yavasKalanMs = Math.max(0, this.yavasKalanMs - dt * 1000);
    // hitstop sırasında parçacıklar yaşlanmaz (05 § 3.3: "yaşları dondurulur")
    const donuk = this.hitstopVar(0) || this.hitstopVar(1);
    this.parcaciklar.guncelle(donuk ? ydt * 0.15 : ydt);
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
