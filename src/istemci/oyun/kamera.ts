/** GU-00 kamera kipi: "hibrit" sunum eğik (K-1), "duz" eski tam üstten sunum (Ayarlar › Düz görünüm). */
export type KameraKipi = "hibrit" | "duz";

/**
 * Hibrit kamera sabitleri (tasarım dili § 9.1 K-1, maket m1/m2). Fizik düz kalır; yalnız çizim:
 *   dünyaX = merkezX + x ;  dünyaY = merkezY + kaymaY + z · zOrani − yükseklik
 *   ekran  = (480, 270) + yakinlik · (dünya − (480, 270))   (sabit kamera yakınlığı: çanak referans 07 gibi ekranı doldurur)
 * Yakınlık tek düze ölçektir (x ve z aynı), yalnız z ayrıca zOrani ile basılır. Değerler sabit (tahmin; sahip kararı).
 */
export const KAMERA = {
  /** GU-C 0,62 → 0,56; GU-D → 0,52. Referans 07'nin ışıyan halkası 1170 × 625 px (basıklık ≈ 0,52–0,53): daha basık elips
   *  aynı dikey bantta (süre plakası ile ekranın alt kenarı arası) daha geniş çanak demek. */
  zOrani: 0.52,
  /** İkinci tur ×1,44, GU-C ×1,6, GU-D ×1,83 (sahip: "çanak büyüsün"). Shift/Space alt ortadan yetenek yuvalarının üstüne
   *  taşındı (MacHud), alt orta boş (referans 07 gibi): oynanabilir elips (R = 240) y 69–526, x 41–919 ve hiçbir HUD
   *  plakasının altına girmez; ışıyan halka (0,85 R) ekranın %78'i (önce %68). test/kamera.test.ts sınar. */
  yakinlik: 1.83,
  /** çanak merkezinin dünya kayması (px): üstte uzak duvar + tribün için yer; GU-D: alt orta boşaldı, çanak aşağı (ekranY 297) */
  kaymaY: 15,
  /** Topaç çizim ölçeği (sim yarıçapı 30 sabit; yalnız çizim iri: referans 07). Çanakla orantılı kalır (GU-D: 1,08 sabit,
   *  topaç ekranda çanakla birlikte ×1,14 büyür); sprite pikseli = sanat pikseli kuralı için sprite seti
   *  SANAT.birim = 1 / (topacCizimOlcek · yakinlik · pikselCozunurluk) ile yeniden üretilir (npm run topac:uret). */
  topacCizimOlcek: 1.08,
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
