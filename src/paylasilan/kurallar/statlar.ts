import { AYAR } from "./ayar.ts";
import { budanmisEtkinlik } from "./tipler.ts";

// Ana seri stat formülü (IV 31, EV 0, nötr doğa) ve PokeRivals hasar formülü `lr` (§ 2.3, § 2.4).

function temelStat(taban: number, seviye: number): number {
  return Math.floor(((2 * taban + AYAR.iv + Math.floor(AYAR.ev / 4)) * seviye) / 100);
}

/** HP dışındaki statlar. */
export function stat(taban: number, seviye: number = AYAR.seviye): number {
  return temelStat(taban, seviye) + 5;
}

export function hp(taban: number, seviye: number = AYAR.seviye): number {
  return temelStat(taban, seviye) + seviye + 10;
}

/** Hareket hızı (birim/s) kart hız statından: 150·(0.7 + 0.6·spe/130). */
export function hareketHizi(spe: number): number {
  const h = AYAR.hiz;
  return h.taban * (h.katsayiTaban + (h.katsayiEgim * spe) / h.bolen);
}

/**
 * Hasar. `etkinlik` ham çarpandır (4, 2, 1, 0.5, 0.25, 0); budama burada yapılır.
 * `yanik` = saldıran yanıkta VE hamle fiziksel (çağıran birleştirir). Varyans ve kritik yok.
 * Bağışıklıkta (etkinlik 0) 0 döner; aksi hâlde en az 1.
 */
export function hasar(
  seviye: number, guc: number, saldiri: number, savunma: number,
  stab: boolean, etkinlik: number, yanik: boolean, carpan: number = AYAR.hasarCarpani,
): number {
  const e = budanmisEtkinlik(etkinlik);
  if (e === 0) return 0;
  const temel = Math.floor(Math.floor(((2 * seviye) / 5 + 2) * guc * saldiri / savunma) / 50) + 2;
  const toplam = temel * (stab ? AYAR.stab : 1) * e * (yanik ? AYAR.yanikFizikselCarpani : 1) * carpan;
  return Math.max(1, Math.round(toplam));
}
