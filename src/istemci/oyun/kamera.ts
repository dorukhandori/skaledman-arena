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
  yakinlik: 1.4,
  /** çanak merkezinin dünya kayması (px): üstte uzak duvar + tribün için yer */
  kaymaY: 6,
  /** Sekme yüksekliği (dünya px, ekranda yukarı) */
  sekmeYukseklik: 16,
  /** pixel görünüm: dünya bu çözünürlükte (0,5 → 480×270) önbelleğe çizilir, `nearest` büyütülür */
  pikselCozunurluk: 0.5,
} as const;
