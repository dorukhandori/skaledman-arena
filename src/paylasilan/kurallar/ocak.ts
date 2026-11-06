import type { Parca } from "../veri/semalar.ts";
import { SURUM_KADEME_TAVANI, TARIFLER, USTALIK, kademeBul, type Tarif } from "../veri/harita.ts";
import { bant, basariSansi } from "./ustalik.ts";

// Ocak (docs/design/harita/03, 12): eritme (cevher → külçe), kozmetik dövme (arma/çerçeve), parça üretimi (malzeme
// biçimi; güç eşit), Usta işi, parça eritme, değer puanı. SAF; zar çağırandan (sunucu crypto). Malzeme sim'e girmez.

const E = TARIFLER.eritme;
const PU = TARIFLER.parcaUretim;

export type Katman = keyof typeof PU.katmanKulce;

/** Eritme oranı: 4:1; İşleme − eşik ≥ 20 ise 3:1. */
export function eritmeOrani(U: number, esik: number): number {
  return U - esik >= E.ustaFarki ? E.oranUsta : E.oranTaban;
}

export interface EritmePartisi { basari: boolean; kulce: number; harcanan: number; curuf: number; tecrubeX100: number }
/** Tek parti (03 § 3): başarıda `oran` cevher → 1 külçe; başarısızlıkta 1 cevher cüruf (kalan geri), yarım tecrübe. */
export function eritmePartisi(U: number, kademe: number, zar: number): EritmePartisi {
  const esik = kademeBul(kademe).esik;
  const oran = eritmeOrani(U, esik);
  const basari = zar < basariSansi(U, esik);
  const taban = USTALIK.isleme.xpEritme * oran * bant(U - esik);
  if (basari) return { basari, kulce: 1, harcanan: oran, curuf: 0, tecrubeX100: Math.round(taban * 100) };
  return { basari, kulce: 0, harcanan: E.basarisizKayip, curuf: E.basarisizKayip, tecrubeX100: Math.round(taban * 50) };
}

/** Toplu eritme: en çok `parti`, eldeki cevher yettikçe (zarlar sırayla). */
export function eritmeToplu(U: number, kademe: number, cevher: number, parti: number, zarlar: readonly number[]): { partiler: EritmePartisi[]; kulce: number; harcanan: number; curuf: number; tecrubeX100: number } {
  const oran = eritmeOrani(U, kademeBul(kademe).esik);
  const partiler: EritmePartisi[] = [];
  let kalan = cevher;
  for (let i = 0; i < parti && kalan >= oran; i++) {
    const p = eritmePartisi(U, kademe, zarlar[i] ?? 0.999999);
    partiler.push(p);
    kalan -= p.harcanan;
  }
  return {
    partiler,
    kulce: partiler.reduce((t, p) => t + p.kulce, 0),
    harcanan: cevher - kalan,
    curuf: partiler.reduce((t, p) => t + p.curuf, 0),
    tecrubeX100: partiler.reduce((t, p) => t + p.tecrubeX100, 0),
  };
}

/** Usta işi olasılığı (03 § 5): sınırla((U − eşik − 10)/100, 0, 0,25). */
export function ustaIsiOlasiligi(U: number, esik: number): number {
  const u = TARIFLER.ustaIsi;
  return Math.min(u.tavan, Math.max(0, (U - esik - u.farkTaban) / u.bolen));
}

// ---- kozmetik tarifler ----
export type TarifDurumu = "acik" | "ustalik" | "eksik" | "altin" | "sahip" | "gizli" | "bayrak";

export function tarifBul(id: string): Tarif | undefined {
  return TARIFLER.tarifler.find((t) => t.id === id);
}

/** İlk sürümün kozmetik tarifleri (arma/çerçeve; bayraklı dövme parçalar hariç). */
export function kozmetikTarifler(): Tarif[] {
  return TARIFLER.tarifler.filter((t) => t.ilkSurum && !t.bayrak && (t.tur === "arma" || t.tur === "cerceve"));
}

export interface TarifBaglami { U: number; kulce: readonly number[]; bakiye: number; sahip: boolean; dovmeParcalari?: boolean }
/** Tarif durumu (03 § 4.4): eşik U+10'dan yüksekse gizli; sonra sahip / ustalık / eksik külçe / Altın / açık. */
export function tarifDurumu(t: Tarif, b: TarifBaglami): TarifDurumu {
  if (t.bayrak && !b.dovmeParcalari) return "bayrak";
  if (b.sahip) return "sahip";
  if (t.esik > b.U + 10) return "gizli";
  if (b.U < t.esik) return "ustalik";
  if (t.girdi.some((g) => (b.kulce[g.kademe - 1] ?? 0) < g.kulce)) return "eksik";
  if (b.bakiye < t.altin) return "altin";
  return "acik";
}

/** Dövme tecrübesi (×100): tarif türü tabanı × bant(U − eşik). */
export function dovmeTecrubesi(t: Tarif, U: number): number {
  const taban = USTALIK.isleme.xpDovme[t.tur] ?? 0;
  return Math.round(taban * bant(U - t.esik) * 100);
}

/** Yeniden dövme bedeli (Usta işi zarı için; yarı külçe en az 1, yarı Altın). */
export function yenidenDovBedeli(t: Tarif): { girdi: { kademe: number; kulce: number }[]; altin: number } {
  const y = TARIFLER.yenidenDov;
  return { girdi: t.girdi.map((g) => ({ kademe: g.kademe, kulce: Math.max(1, Math.floor(g.kulce * y.kulceOran)) })), altin: Math.floor(t.altin * y.altinOran) };
}

// ---- parça üretimi (12 § 2) ----
export interface ParcaMaliyeti { katman: Katman; minKademe: number; kulce: number; iscilik: number; esik: number; tecrubeTaban: number }

/** Parça tanımının K kademesinde üretim maliyeti; kademe katmanın en düşüğünün altındaysa null. */
export function parcaMaliyeti(p: Pick<Parca, "tur" | "katman">, kademe: number): ParcaMaliyeti | null {
  const katman = p.katman as Katman;
  const minKademe = PU.katmanMinKademe[katman];
  if (kademe < minKademe || kademe > 8) return null;
  const kulce = Math.ceil(PU.katmanKulce[katman] * PU.turCarpan[p.tur]);
  return {
    katman, minKademe, kulce, iscilik: PU.katmanIscilik[katman],
    esik: Math.min(100, kademeBul(kademe).esik + PU.katmanEsikEk[katman]), tecrubeTaban: PU.xpParca[katman],
  };
}

/** Parça üretim tecrübesi (×100). */
export function parcaTecrubesi(m: ParcaMaliyeti, U: number): number {
  return Math.round(m.tecrubeTaban * bant(U - m.esik) * 100);
}

/** Üretilebilir en düşük kademe (Ustalık ve sürüm tavanı içinde) ya da null. */
export function uretilebilirKademe(p: Pick<Parca, "tur" | "katman">, U: number): number | null {
  for (let k = 1; k <= SURUM_KADEME_TAVANI; k++) {
    const m = parcaMaliyeti(p, k);
    if (m && U >= m.esik) return k;
  }
  return null;
}

/** Değer puanı (12 § 3): külçe × kademe değeri; Usta işi ×1,5. Altın değildir. */
export function degerPuani(kulce: number, kademe: number, usta: boolean): number {
  return Math.round(kulce * (PU.kademeDeger[kademe - 1] ?? 0) * (usta ? 1.5 : 1));
}

/** Üretilmiş parçanın eritmede geri verdiği külçe (aynı kademe, %50 aşağı yuvarla). */
export function parcaEritmeGeri(kulce: number): number {
  return Math.floor(kulce * PU.eritmeGeriOran);
}

/** Malzeme ön adı ("KOR DÜŞÜRÜCÜ GÖVDE"); Market biçimi (null) ön adsız. */
export function malzemeliAd(ad: string, malzeme: number | null): string {
  const tr = (s: string) => s.replace(/i/g, "İ").replace(/ı/g, "I").toUpperCase();
  if (malzeme === null) return tr(ad);
  const m = kademeBul(malzeme).ad.replace(/ CEVHERİ$/, "");
  return `${m} ${tr(ad)}`;
}
