import { MADENLER } from "../../paylasilan/veri/harita.ts";

// Harita / Maden / Ocak 2B varlık yolları (public/harita/**, `npm run harita:asset`; veri/manifest-gorsel.json `harita`).
// Kodla çizilmiş pixel art; sanat hattı (Mac) daha iyisini aynı yollara koyabilir. Görüntüler `image-rendering: pixelated`.

const taban = (): string => (import.meta.env?.BASE_URL ?? "/") + "harita/";
export const DUGUM_IKON = (tur: string, bos = false): string => `${taban()}dugum/${tur === "sandik" && bos ? "sandik-bos" : tur}.png`;
export const KILIT_IKON = (): string => `${taban()}dugum/kilit.png`;
const kid = (k: number) => MADENLER.find((x) => x.kademe === k)?.id ?? "demir";
export const CEVHER_IKON = (k: number): string => `${taban()}maden/cevher-${kid(k)}.png`;
export const KULCE_IKON = (k: number): string => `${taban()}maden/kulce-${kid(k)}.png`;
export const USTALIK_IKON = (tur: "madencilik" | "isleme"): string => `${taban()}ustalik/${tur}.png`;
export const GORUNUM_IKON = (id: string): string => `${taban()}${id.startsWith("cerceve-") ? "cerceve" : "arma"}/${id}.png`;
export const USTA_PARILTI = (): string => `${taban()}efekt/usta-isi.png`;
/** Bölge zemini (480×200, harita SVG'sinde y 18'den) ve Maden ekranının ocak ağzı (480×270). */
export const BOLGE_ZEMIN = (bolgeId: string): string => `${taban()}zemin/${bolgeId}.png`;
export const OCAK_AGZI = (): string => `${taban()}zemin/ocak-agzi.png`;

/** Karakter sayfası: 9×3 hücre (16×24). Profil rengi sırası `RENKLER` (rotalar.ts) ile aynı. */
export const PROFIL_RENKLERI = ["#f4cf47", "#e3350d", "#2fb8e8", "#7fe3a0", "#c58bff", "#f2a33a"];
export const KARAKTER_KARE = { bekle: [0, 4], yuru: [4, 6], kaz: [10, 6], dovus: [16, 5], kutla: [21, 6] } as const;
export type KarakterAnim = keyof typeof KARAKTER_KARE;
export function karakterSayfasi(govde: number, renk: string | null | undefined): string {
  const r = Math.max(0, PROFIL_RENKLERI.indexOf((renk ?? "").toLowerCase()));
  return `${taban()}karakter/govde-${Math.max(0, Math.min(3, govde))}-renk-${r}.png`;
}
/** Kare (0–26) → sayfadaki konum. */
export function kareKonumu(kare: number): [number, number] {
  return [(kare % 9) * 16, Math.floor(kare / 9) * 24];
}
/** Animasyonun t (ms) anındaki karesi (fps varsayılan 8; tek seferlikse sonda kalır). */
export function animKaresi(anim: KarakterAnim, tMs: number, fps = 8, dongu = true): number {
  const [bas, n] = KARAKTER_KARE[anim];
  const i = Math.floor((tMs / 1000) * fps);
  return bas + (dongu ? i % n : Math.min(n - 1, i));
}
