// H-12 (MENU-P1A) HUD yetenek etiketi yardımcısı (saf; DOM/Pixi yok, test edilir).

const SESLI = /[aeıioöuüâîû]/i;
/** Bu uzunluktan kısa sözcük etikete (54 px, m5x7 16 px) zaten sığar; tire yalnız uzun sözcükte (yoksa tarayıcı "Kaya So-ğuğu" gibi açgözlü böler). */
export const HECE_ESIGI = 10;
/**
 * H-12: yetenek adını HUD etiketi için hecele: her sözcükte hece sınırlarına yumuşak tire (U+00AD) koyar; tarayıcı yalnız
 * sözcük etikete sığmazsa böler; kısa sözcüklere dokunmaz, satır boşlukta kırılır ("Köz-yağmuru"). Türkçe kuralı: sesliden önceki tek ünsüz yeni heceyi başlatır.
 */
export function heceliAd(ad: string): string {
  return ad.split(" ").map((s) => {
    if (s.length < HECE_ESIGI) return s;
    let o = "";
    for (let i = 0; i < s.length; i++) {
      const c = s[i]!, sonraki = s[i + 1];
      if (i > 1 && i < s.length - 1 && !SESLI.test(c) && sonraki !== undefined && SESLI.test(sonraki) && o.length > 1) o += "\u00AD";
      o += c;
    }
    return o;
  }).join(" ");
}
