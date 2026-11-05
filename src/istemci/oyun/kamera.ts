/** GU-00 kamera kipi: "hibrit" sunum eğik (K-1), "duz" eski tam üstten sunum (Ayarlar › Düz görünüm). */
export type KameraKipi = "hibrit" | "duz";

/**
 * Hibrit kamera sabitleri (tasarım dili § 9.1 K-1, maket m1/m2). Fizik düz kalır; yalnız çizim:
 *   dünyaX = merkezX + x ;  dünyaY = merkezY + kaymaY + z · zOrani − yükseklik
 *   ekran  = (480, 270) + yakinlik · (dünya − (480, 270))   (sabit kamera yakınlığı: çanak referans 07 gibi ekranı doldurur)
 * Yakınlık tek düze ölçektir (x ve z aynı), yalnız z ayrıca zOrani ile basılır. Değerler sabit (tahmin; sahip kararı).
 */
export const KAMERA = {
  zOrani: 0.62,
  /** İkinci tur (sahip: referanstaki gibi): ×1,6 denendi; oynanabilir elips (R=240) HUD şeritlerine (süre plakası y ≤ 66,
   *  Shift/Space y ≥ 494) girmesin diye en büyük uygun değer ×1,44 (test/kamera.test.ts sınar). */
  yakinlik: 1.44,
  /** çanak merkezinin dünya kayması (px): üstte uzak duvar + tribün için yer */
  kaymaY: 6,
  /** Topaç çizim ölçeği (sim yarıçapı 30 sabit; yalnız çizim iri: referans 07) */
  topacCizimOlcek: 1.2,
  /** Sekme yüksekliği (dünya px, ekranda yukarı) */
  sekmeYukseklik: 16,
  /** pixel görünüm: dünya bu çözünürlükte (0,5 → 480×270) önbelleğe çizilir, `nearest` büyütülür */
  pikselCozunurluk: 0.5,
} as const;

/** İzdüşüm parametreleri (Sahne kipine göre): k = z basıklığı, B = yakınlık, my = çanak merkezinin dünya y'si. */
export interface Izdusum { k: number; B: number; my: number }
const MX = 480;
const MY = 270;

/** Sim (x, z) → mantıksal ekran (sarsıntı/zoom darbesi hariç). Saf işlev: test edilir (test/kamera.test.ts). */
export function simdenEkrana(p: Izdusum, x: number, z: number): { x: number; y: number } {
  const wx = MX + x;
  const wy = p.my + z * p.k;
  return { x: MX + (wx - MX) * p.B, y: MY + (wy - MY) * p.B };
}

/** Mantıksal ekran → sim (zemin düzlemi; fare nişanı: z = ekran / zOranı). simdenEkrana'nın tersi. */
export function ekrandanSime(p: Izdusum, lx: number, ly: number): { x: number; z: number } {
  const wx = MX + (lx - MX) / p.B;
  const wy = MY + (ly - MY) / p.B;
  return { x: wx - MX, z: (wy - p.my) / p.k };
}
