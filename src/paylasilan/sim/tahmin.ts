import type { Dunya, Topac } from "./durum.ts";
import { duvarCoz, erimeUygula, hareketAdimla, sinirla } from "./fizik.ts";
import { aniOlumErimeCarpani } from "./mac.ts";
import { type Girdi, girdiTemizle } from "./Girdi.ts";
import { aktifMi, eylemleriUygula, sayaclariIlerlet, yorgunlukCarpani } from "./topac.ts";
import { NOTR_HAREKET, hareketEtkisi } from "./yetenek.ts";

// Tahmin modeli A (ADR-005): istemci YALNIZ kendi topacının sürüşünü, sürtünmesini, Uç desenini, dash/sekme
// hareketini ve duvar/kenar sekmesini tahmin eder. Topaç-topaç impulsu, hasar, tık, Enerji, yetenek etkileri,
// Ring Out / Durma / Parçalanma kararları YALNIZ sunucudan gelir. Bu dosya sim'in parçalarını yeniden kullanır,
// sim'in kendisini değiştirmez (aynı fonksiyonlar, aynı sıra: sayaç → eylem → hareket → erime → duvar). Erime
// tahmin edilir çünkü yorgunluk (stamina oranı) sürüş tavanını belirler; sunucu staminayı yine düzeltir.
// Duvar `olaylar = null` ile çözülür: bedel yok, olay yok, Ring Out kararı yok (sunucu söyler).

const COP: never[] = [];

/**
 * `t` (kendi topacımın tahmin kopyası) için bir adım. `d` son sunucu dünyası: profiller, çanak, alanlar ve rakip
 * buradan okunur, DEĞİŞTİRİLMEZ (hareketEtkisi için `d.topaclar[i]` adım süresince geçici olarak `t` yapılır).
 * Faz `tur` değilse ya da topaç sahada değilse tahmin yok (false): o zaman sunucu durumu gösterilir.
 */
export function kendiAdimi(d: Dunya, i: number, t: Topac, ham: Girdi, tick: number): boolean {
  if (d.mac.faz !== "tur" || !aktifMi(t)) return false;
  const g = girdiTemizle(ham);
  const p = d.profiller[i]!;
  const asil = d.topaclar[i]!;
  d.topaclar[i] = t;
  try {
    // yetenek sayaçlarından yalnız hareketi kısıtlayanlar (kilit, sersem); geri kalanı sunucunun
    if (t.kilitKalan > 0) t.kilitKalan--;
    if (t.sersemKalan > 0) t.sersemKalan--;
    sayaclariIlerlet(t);
    const m = hareketEtkisi(d, i);
    let gi = g;
    if (m.kilit) gi = { ...g, yonX: 0, yonZ: 0, dash: false, zipla: false };
    else if (m.dashYok) gi = { ...g, dash: false };
    COP.length = 0;
    eylemleriUygula(t, p, gi, d.topaclar[1 - i]!, i, tick, COP);
    hareketAdimla(t, p, gi, tick, yorgunlukCarpani(t, p), d.arenaYaricap, m === NOTR_HAREKET ? null : m);
    // kendi hızının stamina erimesi (yorgunluk → sürüş tavanı aynı kalsın); hasar/duvar bedeli sunucudan
    erimeUygula(t, p, aniOlumErimeCarpani(d), m.erime);
    sinirla(t);
    duvarCoz(t, p, i, tick, null, d.arenaYaricap);
  } finally {
    d.topaclar[i] = asil;
    COP.length = 0;
  }
  return true;
}

/** Topaç kopyası (tahmin tamponu için; tüm alanlar sayı). */
export function topacKopyala(t: Topac): Topac {
  return { ...t };
}
