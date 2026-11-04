import { AYAR } from "../kurallar/ayar.ts";
import { topacCarpismasi } from "./carpisma.ts";
import { TOPAC_DURUM, type Dunya, type Topac } from "./durum.ts";
import { duvarCoz, erimeUygula, hareketAdimla, sinirla } from "./fizik.ts";
import { type Girdi, bosGirdi, girdiTemizle } from "./Girdi.ts";
import {
  type AdimBitisleri, aniOlumErimeCarpani, bitisleriUygula, bosBitis, geriCekIlerlet, geriCekIstekleri, geriSayimAdimi,
  macTurKarari, saatIlerlet, turArasiAdimi, turKarari,
} from "./mac.ts";
import { aktifMi, eylemleriUygula, sayaclariIlerlet, yorgunlukCarpani } from "./topac.ts";

// Bir sim adımı (1/60 s). Fizik sırası:
//   1) girdi temizle  2) her topaç: sayaç, eylem, hareket, erime (birbirinden bağımsız, sıra fark etmez)
//   3) topaç-topaç çarpışma (sıra bağımsız çözüm)  4) duvar / Ring Out  5) bitiş adayları → karar (adım sonu)
// Girdiler indeksle eşleşir: girdiler[i] → topaclar[i].
// Maç kipi fazları (mac.ts): geriSayim (fizik yok) → tur (fizik + karar + saat) → turArasi (fizik, karar yok,
// girdi yalnız seçim) → … → bitti (fizik, karar yok).

function sonumAdimla(t: Topac): void {
  // Durma sonrası: hız 40 adımda doğrusal söner; çarpışma ve hasar yok (salt süs, karar verilmiştir)
  if (t.sonumKalan <= 0) { t.vx = 0; t.vz = 0; return; }
  const k = (t.sonumKalan - 1) / t.sonumKalan;
  t.vx *= k;
  t.vz *= k;
  t.sonumKalan--;
  t.x += t.vx * AYAR.dt;
  t.z += t.vz * AYAR.dt;
}

/** Fizik adımı; `karar` false ise erime, bitiş ve duvar bedeli yok. Bitiş adaylarını döner. */
function fizikAdimi(d: Dunya, g: readonly [Girdi, Girdi], karar: boolean): readonly [AdimBitisleri, AdimBitisleri] {
  const R = d.arenaYaricap;
  const erimeCarpani = aniOlumErimeCarpani(d);
  for (let i = 0; i < 2; i++) {
    const t = d.topaclar[i]!;
    const p = d.profiller[i]!;
    if (t.durum === TOPAC_DURUM.durma) { sonumAdimla(t); duvarCoz(t, p, i, d.tick, null, R); continue; }
    if (!aktifMi(t)) continue;
    sayaclariIlerlet(t);
    const yorgunluk = yorgunlukCarpani(t, p);
    eylemleriUygula(t, p, g[i]!, d.topaclar[1 - i]!, i, d.tick, d.olaylar);
    hareketAdimla(t, p, g[i]!, d.tick, yorgunluk, R);
    if (karar) erimeUygula(t, p, erimeCarpani);
  }

  topacCarpismasi(d);

  const bitisler = [bosBitis(), bosBitis()] as const;
  for (let i = 0; i < 2; i++) {
    const t = d.topaclar[i]!;
    const p = d.profiller[i]!;
    if (!aktifMi(t)) continue;
    sinirla(t);
    const ro = duvarCoz(t, p, i, d.tick, karar ? d.olaylar : null, R);
    if (!karar) continue;
    const b = bitisler[i]!;
    b.ringOut = ro;
    b.parcalanma = t.tik >= p.parametreler.burstEsik;
    b.durma = t.stamina <= 0;
  }
  return bitisler;
}

const BOS: readonly [Girdi, Girdi] = [bosGirdi(), bosGirdi()];

export function adim(d: Dunya, girdiler: readonly [Girdi, Girdi]): void {
  d.olaylar = [];
  d.tick++;
  const g = [girdiTemizle(girdiler[0]), girdiTemizle(girdiler[1])] as const;

  if (d.mac.mod === "tekTur") {
    const karar = d.mac.faz === "tur";
    const bitisler = fizikAdimi(d, g, karar);
    if (!karar) return;
    // adım sonu: bitişleri uygula (iki topaç birden olabilir), sonra tek karar
    bitisleriUygula(d, bitisler);
    const sonuc = turKarari(d, bitisler);
    if (sonuc) d.olaylar.push({ tur: "turBitti", tick: d.tick, sonuc });
    return;
  }

  switch (d.mac.faz) {
    case "geriSayim":
      geriSayimAdimi(d);
      return;
    case "tur": {
      if (saatIlerlet(d)) return;
      geriCekIstekleri(d, g);
      const bitisler = fizikAdimi(d, g, true);
      bitisleriUygula(d, bitisler);
      macTurKarari(d, bitisler);
      if (d.mac.faz === "tur") geriCekIlerlet(d);
      return;
    }
    case "turArasi":
      if (saatIlerlet(d)) return;
      fizikAdimi(d, BOS, false);
      turArasiAdimi(d, g);
      return;
    default:
      // bitti (ve tekTur dışı turBitti): kalan topaç girdisiz akar, karar yok
      fizikAdimi(d, BOS, false);
  }
}
