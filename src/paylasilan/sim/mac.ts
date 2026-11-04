import { AYAR } from "../kurallar/ayar.ts";
import { TOPAC_DURUM, type BitisTuru, type Dunya, type MacDurumu, type TurSonucu } from "./durum.ts";

// Maç / tur kararı (flint § 1 ortak ilke): bir adımda olan bitişler toplanır, adım SONUNDA tek geçişte karar.
// Aynı topaçta öncelik Parçalanma = Ring Out > Durma (iki puanlık bitiş aynı adımda: Parçalanma yazılır, #2).
// Farklı topaçlarda aynı adım: berabere, puan yok, ikisi de elenir (#1, #2, #17).
// D1 kapsamı: tek tur kararı. Fazlı akış (geri sayım, tur arası, değişim, ani ölüm) D2'de buraya eklenir.

export function macKur(): MacDurumu {
  return { faz: "tur", puan: [0, 0], sonuc: null };
}

/** Bu adımda bir topacın aday bitişleri. */
export interface AdimBitisleri {
  ringOut: boolean;
  parcalanma: boolean;
  durma: boolean;
}

export const bosBitis = (): AdimBitisleri => ({ ringOut: false, parcalanma: false, durma: false });

/** Tek topaçta öncelik. */
export function bitisSec(b: AdimBitisleri): BitisTuru | null {
  if (b.parcalanma) return "parcalanma";
  if (b.ringOut) return "ringOut";
  if (b.durma) return "durma";
  return null;
}

/** Bitiş türünün topaç durum kodu. */
export function bitisDurumu(b: BitisTuru): (typeof TOPAC_DURUM)[keyof typeof TOPAC_DURUM] {
  return b === "parcalanma" ? TOPAC_DURUM.parcalandi : b === "ringOut" ? TOPAC_DURUM.ringOut : TOPAC_DURUM.durma;
}

/**
 * Adım sonu tur kararı. `bitisler[i]`: topaç i'nin bu adımdaki adayları. Karar verilmişse (faz turBitti) yok sayılır.
 * Döner: karar ya da null.
 */
export function turKarari(d: Dunya, bitisler: readonly [AdimBitisleri, AdimBitisleri]): TurSonucu | null {
  if (d.mac.faz !== "tur") return null;
  const b0 = bitisSec(bitisler[0]);
  const b1 = bitisSec(bitisler[1]);
  if (!b0 && !b1) return null;
  let sonuc: TurSonucu;
  if (b0 && b1) {
    sonuc = { tur: "berabere", kazanan: -1, kaybeden: -1, puan: 0, tick: d.tick };
  } else {
    const kaybeden = b0 ? 0 : 1;
    const tur = (b0 ?? b1) as BitisTuru;
    const puan = AYAR.puan[tur];
    sonuc = { tur, kazanan: 1 - kaybeden, kaybeden, puan, tick: d.tick };
    if (kaybeden === 0) d.mac.puan[1] += puan;
    else d.mac.puan[0] += puan;
  }
  d.mac.faz = "turBitti";
  d.mac.sonuc = sonuc;
  return sonuc;
}
