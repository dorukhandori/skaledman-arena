import { AYAR } from "../kurallar/ayar.ts";
import type { Dovuscu, Dunya } from "./durum.ts";

// Stat kademeleri (en çok ±6, 8 s): ana seri çarpanının karekökü, her değişim 8 s sonra sıfırlanır.
// Math.sqrt IEEE 754'te doğru yuvarlanır; motorlar arası aynı sonucu verir.

export const KADEME_STATLARI = ["atk", "def", "spa", "spd", "hiz"] as const;
export type KademeStati = (typeof KADEME_STATLARI)[number];

export function kademeIndeksi(stat: KademeStati): number {
  return KADEME_STATLARI.indexOf(stat);
}

/** Kademe → çarpan. +2 → ×1,41; +6 → ×2; −6 → ×0,5. */
export function kademeCarpani(k: number): number {
  const ana = k >= 0 ? (2 + k) / 2 : 2 / (2 - k);
  return AYAR.kademe.karekok ? Math.sqrt(ana) : ana;
}

export function statCarpani(dv: Dovuscu, stat: KademeStati): number {
  return kademeCarpani(dv.kademe[kademeIndeksi(stat)] ?? 0);
}

export function bosKademe(): number[] {
  return new Array<number>(KADEME_STATLARI.length).fill(0);
}

/** Kademeyi değiştirir (±tavan), süreyi yeniler. Gerçek değişim döner (tavandaysa 0). */
export function kademeDegistir(d: Dunya, i: number, stat: KademeStati, miktar: number): number {
  const dv = d.dovusculer[i]!;
  const k = kademeIndeksi(stat);
  const tavan = AYAR.kademe.tavan;
  const eski = dv.kademe[k]!;
  const yeni = Math.max(-tavan, Math.min(tavan, eski + miktar));
  dv.kademe[k] = yeni;
  dv.kademeKalan[k] = yeni === 0 ? 0 : AYAR.kademe.sure;
  if (yeni !== eski) d.olaylar.push({ tur: "kademe", kime: i, stat: k, degisim: yeni - eski, yeni });
  return yeni - eski;
}

export function kademeleriIsle(d: Dunya, dv: Dovuscu, dt: number): void {
  for (let k = 0; k < dv.kademe.length; k++) {
    if (dv.kademeKalan[k]! <= 0) continue;
    dv.kademeKalan[k] = dv.kademeKalan[k]! - dt;
    if (dv.kademeKalan[k]! <= 0) {
      const eski = dv.kademe[k]!;
      dv.kademe[k] = 0;
      dv.kademeKalan[k] = 0;
      d.olaylar.push({ tur: "kademe", kime: dv.indeks, stat: k, degisim: -eski, yeni: 0 });
    }
  }
}
