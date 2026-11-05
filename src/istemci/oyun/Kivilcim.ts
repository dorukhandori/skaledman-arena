import { Graphics } from "pixi.js";
import type { SusRastgele } from "./SusRastgele.ts";
import { KIVILCIM_OLCEK, birikmeCarpani, patlamaAdedi } from "./his.ts";
import { efektTavani } from "../mobil/cihaz.ts";

// GU-E çarpışma kıvılcımı (referans 07/08): temas noktasında pixel-art kıvılcım demeti. Yordamsal (atlas gerekmez);
// hibrit sahne dünyayı 480×270 önbelleğe `nearest` çizdiği için 2 px kalınlık = 1 sanat pikseli, koordinatlar 2 px
// ızgarasına oturtulur. Üç parça:
//   1) çekirdek flaş: parlak beyaz-sarı-turuncu sivri yıldız lekesi, temas normali boyunca basık (iki topacın arasındaki
//      dik yarıkta uzun ve dar, referans 07), çok kısa ömür;
//   2) kıvılcım çizgileri: zemin düzleminde elips dağılımda (hız z'de basık) sıçrayan kısa çizgiler + noktalar; yükseklikleri
//      yerçekimiyle düşer, zemine değince bir kez seker; renk yaşla beyaz → sarı → turuncu → koyu kor;
//   3) temas ışıması: sürekli sürtünmede temas noktasında titreyen sıcak leke.
// Şiddet (0..~1,2) adet, hız, çizgi uzunluğu, kalınlık, flaş boyu ve parlaklığı ölçekler. Sim'e hiçbir şey yazmaz.

/** Kıvılcım renk rampası (sıcaktan soğuğa); referans 07'nin sarı-beyaz çekirdeği ve turuncu uçları. */
export const KIVILCIM_RENK = { beyaz: 0xffffff, krem: 0xfff6c8, sari: 0xffd84a, altin: 0xffb02e, turuncu: 0xff7a1e, kor: 0xb8401a } as const;
/** Eşzamanlı kıvılcım tavanı (parçacık bütçesi 400'ün yanında; çizgiler ayrı Graphics). GU-F: 260 → 150 (referans 07'de
 *  tek çarpışmada ~15-20 çizgi; art arda çarpışmalar bulutlaşmasın). */
export const KIVILCIM_TAVANI = efektTavani(150); // MOBIL-1: mobil cihaz sınıfında 83

interface Kv { x: number; y: number; h: number; vx: number; vy: number; vh: number; t: number; omur: number; uz: number; kalin: number; nokta: boolean; sekti: boolean }
interface Flas { x: number; y: number; t: number; sure: number; r: number; ex: number; ey: number; f: number; uclar: number[]; aci: number; parlak: number }

const izgara = (v: number): number => Math.round(v / 2) * 2;

export class KivilcimDemeti {
  readonly g = new Graphics();
  private kv: Kv[] = [];
  private flaslar: Flas[] = [];
  private isima = { x: 0, y: 0, guc: 0 };
  private saat = 0;
  /** GU-F art arda patlama yükü (puan toplamı, τ ile söner) */
  private yuk = 0;

  /** `k` zemin basıklığı (ekran y / zemin z), `hava` = yükseklik ve yerçekimi var mı (hibrit) */
  constructor(private rng: SusRastgele, private k: number, private hava: boolean) {}

  get adet(): number { return this.kv.length; }
  get flasAdet(): number { return this.flaslar.length; }
  get birikmeYuku(): number { return this.yuk; }

  /**
   * Bir darbe demeti. (x, y) temas noktasının ZEMİN izdüşümü (ekran), `h0` yüksekliği (ekran px, yukarı), (nx, nz) SİM
   * temas normali, `g` şiddet 0..~1,2, `carpan` erişilebilirlik parçacık ayarı (1 / 0,4).
   */
  patlat(x: number, y: number, h0: number, nx: number, nz: number, g: number, carpan = 1, flas = true): void {
    const s = Math.max(0, g);
    const O = KIVILCIM_OLCEK;
    // GU-F: art arda gelen patlama kısılır; canlı tavanı aşan kısım hiç doğmaz (eski kıvılcımları silip yerine geçmesin)
    const kis = birikmeCarpani(this.yuk);
    this.yuk += Math.min(1.2, s);
    const n = Math.max(1, Math.min(Math.round(patlamaAdedi(s, carpan) * kis), KIVILCIM_TAVANI - this.kv.length));
    const tx = -nz, tz = nx; // teğet (zemin düzlemi)
    const vTepe = 110 + 360 * Math.min(1.2, s);
    for (let i = 0; i < n; i++) {
      // %60 teğet koni (sürtünen yüzeyler kıvılcımı yana savurur), kalanı her yöne; zemin elipsi: vz ekranda k ile basılır
      let dx: number, dz: number;
      if (this.rng.sayi() < 0.6) {
        const yon = this.rng.sayi() < 0.5 ? 1 : -1;
        const a = Math.atan2(tz * yon, tx * yon) + this.rng.isaretli() * 0.75;
        dx = Math.cos(a); dz = Math.sin(a);
      } else {
        const a = this.rng.aralik(0, Math.PI * 2);
        dx = Math.cos(a); dz = Math.sin(a);
      }
      const v = vTepe * this.rng.aralik(0.35, 1);
      // çekirdeğin kenarından başlasın (referans 07: çizgiler flaştan kopuk, dışa saçılmış)
      const o = (6 + 18 * Math.min(1, s)) * this.rng.aralik(0.2, 1);
      this.ekle({
        x: x + dx * o, y: y + dz * o * this.k, h: h0 + (this.hava ? this.rng.isaretli() * o * 0.6 : 0), vx: dx * v, vy: dz * v * this.k, vh: this.hava ? this.rng.aralik(-30, 70 + 240 * Math.min(1, s)) : 0,
        t: 0, omur: this.rng.aralik(O.omurAlt[0] + O.omurAlt[1] * Math.min(1, s), O.omurUst[0] + O.omurUst[1] * Math.min(1, s)), uz: 0.04 + 0.045 * Math.min(1, s),
        kalin: s > 0.55 && this.rng.sayi() < 0.25 ? 4 : 2, nokta: this.rng.sayi() < 0.15, sekti: false,
      });
    }
    if (flas) this.flas(x, y - h0, nx, nz, s * (1 - O.flasBirikme * (1 - kis)));
  }

  /** Çekirdek flaş: sivri yıldız lekesi (normal boyunca %45'e basık). */
  flas(x: number, y: number, nx: number, nz: number, g: number): void {
    const s = Math.min(1.2, Math.max(0, g));
    const e = { x: nx, y: nz * this.k };
    const u = Math.hypot(e.x, e.y) || 1;
    const uc = 7 + Math.round(6 * Math.min(1, s));
    const uclar: number[] = [];
    for (let i = 0; i < uc * 2; i++) uclar.push(i % 2 ? this.rng.aralik(0.3, 0.45) : this.rng.aralik(0.55, 1));
    if (this.flaslar.length > 6) this.flaslar.shift();
    this.flaslar.push({ x, y, t: 0, sure: 0.07 + 0.11 * Math.min(1, s), r: 8 + 26 * s, ex: e.x / u, ey: e.y / u, f: 0.45, uclar, aci: this.rng.aralik(0, Math.PI), parlak: 0.75 + 0.25 * Math.min(1, s) });
  }

  /**
   * Sürekli temas akışı: `guc` 0..~1,3 (temas süresi + bağıl hız). Bu kare için `adet` kıvılcım (çağıran saniyelik orandan
   * hesaplar), teğet yönde; `yon` bağıl teğet hızın işareti (0 = iki yöne).
   */
  akit(x: number, y: number, h0: number, nx: number, nz: number, guc: number, adet: number, yon: number, carpan = 1): void {
    const tx = -nz, tz = nx;
    const n = Math.round(adet * carpan);
    for (let i = 0; i < n; i++) {
      const sy = yon !== 0 && this.rng.sayi() < 0.75 ? yon : this.rng.sayi() < 0.5 ? 1 : -1;
      const a = Math.atan2(tz * sy, tx * sy) + this.rng.isaretli() * 0.95;
      const v = (120 + 300 * Math.min(1.2, guc)) * this.rng.aralik(0.4, 1);
      this.ekle({
        x: x + this.rng.isaretli() * 2, y, h: h0 + this.rng.isaretli() * 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v * this.k,
        vh: this.hava ? this.rng.aralik(40, 110 + 230 * Math.min(1, guc)) : 0, t: 0, omur: this.rng.aralik(0.14, 0.22 + 0.16 * Math.min(1, guc)),
        uz: 0.045 + 0.04 * Math.min(1, guc), kalin: 2, nokta: this.rng.sayi() < 0.2, sekti: false,
      });
    }
  }

  /** Bu karenin temas ışıması (0 = yok). (x, y) ekran (hava noktası). */
  isimaAyarla(x: number, y: number, guc: number): void { this.isima = { x, y, guc }; }

  private ekle(k: Kv): void {
    if (this.kv.length >= KIVILCIM_TAVANI) this.kv.shift();
    this.kv.push(k);
  }

  temizle(): void {
    this.yuk = 0;
    this.kv = [];
    this.flaslar = [];
    this.isima.guc = 0;
    this.g.clear();
  }

  /** `dt` efekt saati (hitstopta yavaşlatılmış). */
  guncelle(dt: number): void {
    this.saat += dt;
    this.yuk *= Math.exp(-dt / KIVILCIM_OLCEK.yukTauSn);
    const g = this.g.clear();
    // 3) temas ışıması (altta): titreyen sıcak elips + beyaz göbek
    const is = this.isima;
    if (is.guc > 0.02) {
      const tit = 0.75 + 0.25 * Math.sin(this.saat * 53) * Math.sin(this.saat * 31);
      const r = (5 + 9 * Math.min(1.2, is.guc)) * tit;
      const a = Math.min(0.85, 0.2 + 0.5 * is.guc);
      g.ellipse(izgara(is.x), izgara(is.y), izgara(r * 1.4) + 2, izgara(r * 0.9) + 2).fill({ color: KIVILCIM_RENK.altin, alpha: a * 0.45 });
      g.ellipse(izgara(is.x), izgara(is.y), izgara(r * 0.8) + 2, izgara(r * 0.55) + 2).fill({ color: KIVILCIM_RENK.sari, alpha: a * 0.8 });
      g.rect(izgara(is.x) - 2, izgara(is.y) - 2, 4, 4).fill({ color: KIVILCIM_RENK.beyaz, alpha: Math.min(1, a + 0.2) });
    }
    // 2) kıvılcım çizgileri
    const yer = 900;
    for (const k of this.kv) {
      k.t += dt;
      const s = Math.max(0, 1 - 2.2 * dt);
      k.vx *= s; k.vy *= s;
      k.x += k.vx * dt; k.y += k.vy * dt;
      if (this.hava) {
        k.vh -= yer * dt;
        k.h += k.vh * dt;
        if (k.h <= 0) {
          k.h = 0;
          if (!k.sekti) { k.vh = Math.abs(k.vh) * 0.3; k.sekti = true; k.vx *= 0.6; k.vy *= 0.6; } else k.vh = 0;
        }
      }
      const a = k.t / k.omur;
      if (a >= 1) continue;
      const renk = a < 0.25 ? KIVILCIM_RENK.krem : a < 0.6 ? KIVILCIM_RENK.sari : a < 0.85 ? KIVILCIM_RENK.altin : KIVILCIM_RENK.turuncu;
      const hx = izgara(k.x), hy = izgara(k.y - k.h);
      if (k.nokta) {
        const b = 2;
        g.rect(hx - b / 2, hy - b / 2, b, b).fill({ color: renk, alpha: a < 0.8 ? 1 : (1 - a) * 5 });
        continue;
      }
      // kuyruk: hız vektörü geriye (uzunluk şiddetle); baş: kısa parlak parça
      const uz = k.uz * (1 - 0.5 * a);
      const kx = izgara(k.x - k.vx * uz), ky = izgara(k.y - k.vy * uz - (k.h - k.vh * uz * (this.hava ? 1 : 0)));
      if (kx === hx && ky === hy) { g.rect(hx - 1, hy - 1, 2, 2).fill(renk); continue; }
      const al = a < 0.8 ? 1 : (1 - a) * 5;
      g.moveTo(kx, ky).lineTo(hx, hy).stroke({ width: k.kalin, color: a < 0.5 ? KIVILCIM_RENK.sari : a < 0.8 ? KIVILCIM_RENK.altin : KIVILCIM_RENK.turuncu, alpha: al, cap: "butt" });
      const bx = izgara(hx + (kx - hx) * 0.35), by = izgara(hy + (ky - hy) * 0.35);
      g.moveTo(bx, by).lineTo(hx, hy).stroke({ width: k.kalin, color: renk === KIVILCIM_RENK.turuncu ? KIVILCIM_RENK.altin : a < 0.2 ? KIVILCIM_RENK.beyaz : renk, alpha: al, cap: "butt" });
    }
    this.kv = this.kv.filter((k) => k.t < k.omur);
    // 1) çekirdek flaş (en üstte)
    for (const f of this.flaslar) {
      f.t += dt;
      const t = Math.min(1, f.t / f.sure);
      const boy = t < 0.25 ? 0.6 + 1.6 * t : 1 - 0.55 * (t - 0.25) / 0.75;
      const al = (t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4) * f.parlak;
      const n = f.uclar.length;
      const kat = (olcek: number) => {
        const p: number[] = [];
        for (let i = 0; i < n; i++) {
          const aci = f.aci + (i / n) * Math.PI * 2;
          const c0 = Math.cos(aci), s0 = Math.sin(aci);
          const bo = (c0 * f.ex + s0 * f.ey) * f.f;
          const dk = -c0 * f.ey + s0 * f.ex;
          const uz = f.r * boy * olcek * f.uclar[i]!;
          p.push(izgara(f.x + (bo * f.ex - dk * f.ey) * uz), izgara(f.y + (bo * f.ey + dk * f.ex) * uz));
        }
        return p;
      };
      g.poly(kat(1)).fill({ color: KIVILCIM_RENK.altin, alpha: al * 0.9 });
      g.poly(kat(0.72)).fill({ color: KIVILCIM_RENK.sari, alpha: al });
      g.poly(kat(0.42)).fill({ color: KIVILCIM_RENK.krem, alpha: al });
      g.rect(izgara(f.x) - 2, izgara(f.y) - 2, 4, 4).fill({ color: KIVILCIM_RENK.beyaz, alpha: al });
    }
    this.flaslar = this.flaslar.filter((f) => f.t < f.sure);
  }
}
