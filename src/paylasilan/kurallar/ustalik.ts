import { USTALIK } from "../veri/harita.ts";

// Ustalık (docs/design/harita/04): Madencilik ve İşleme, 0–100 tam sayı seviye; iç tecrübe yüzde birlik tam sayı
// (`tecrubeX100`, float birikimi olmasın). SAF; sunucu yazar, istemci gösterir. G-0: maç hiçbir yerde Ustalık okumaz.

export type UstalikTuru = "madencilik" | "isleme";
export const USTALIK_TURLERI: readonly UstalikTuru[] = ["madencilik", "isleme"];

const KUM = USTALIK.kumulatif;
const TAVAN = USTALIK.seviyeTavan;

/** Tecrübe (×100) → seviye 0–100. */
export function seviye(tecrubeX100: number): number {
  const t = Math.max(0, Math.floor(tecrubeX100)) / 100;
  let s = 0;
  while (s < TAVAN && KUM[s + 1]! <= t) s++;
  return s;
}

/** Seviye içi ilerleme 0–1 (100'de 1). */
export function ilerleme(tecrubeX100: number): number {
  const s = seviye(tecrubeX100);
  if (s >= TAVAN) return 1;
  const alt = KUM[s]! * 100;
  const ust = KUM[s + 1]! * 100;
  return Math.min(1, Math.max(0, (tecrubeX100 - alt) / (ust - alt)));
}

/** 100'deki tecrübe tavanı (×100): birikmez. */
export const TECRUBE_TAVANI_X100 = KUM[TAVAN]! * 100;

export type BantEtiketi = "ogretir" | "azOgretir" | "ogretmez" | "kilitli";
export const BANT_METNI: Record<BantEtiketi, string> = { ogretir: "ÖĞRETİR", azOgretir: "AZ ÖĞRETİR", ogretmez: "ÖĞRETMEZ", kilitli: "KİLİTLİ" };

/** Öğrenme bandı çarpanı (fark = U − E). Negatifse 0 (yapılamaz). */
export function bant(fark: number): number {
  if (fark < 0) return 0;
  for (const b of USTALIK.ogrenmeBandi) if (fark <= b.farkMax) return b.carpan;
  return USTALIK.ogrenmeBandi[USTALIK.ogrenmeBandi.length - 1]!.carpan;
}

export function bantEtiketi(fark: number): BantEtiketi {
  if (fark < 0) return "kilitli";
  const c = bant(fark);
  return c >= 1 ? "ogretir" : c >= 0.5 ? "azOgretir" : "ogretmez";
}

/** Başarı şansı (kazı ve eritme; 02 § 4): sınırla(taban + eğim·(U − E), taban, tavan). U < E → 0. */
export function basariSansi(U: number, E: number): number {
  if (U < E) return 0;
  const b = USTALIK.basari;
  return Math.min(b.tavan, Math.max(b.taban, b.taban + b.egim * (U - E)));
}

/** Tecrübe ekle (tavanda durur). */
export function tecrubeEkle(tecrubeX100: number, ekX100: number): number {
  return Math.min(TECRUBE_TAVANI_X100, Math.max(0, Math.round(tecrubeX100 + ekX100)));
}

export interface UstalikGorunumu { seviye: number; ilerleme: number; tecrube: number; sonraki: number | null }
export function ustalikGorunumu(tecrubeX100: number): UstalikGorunumu {
  const s = seviye(tecrubeX100);
  return { seviye: s, ilerleme: ilerleme(tecrubeX100), tecrube: Math.floor(tecrubeX100 / 100), sonraki: s >= TAVAN ? null : KUM[s + 1]! };
}
