import type { Saldiri, Tip } from "../kart.ts";
import { fizikselMi } from "./tipler.ts";

// Hamle kuralları veri odaklıdır (oyun-konsepti § 3): aile tablosu + el yapımı birkaç kural +
// (tip, güç bandı) → aile geri dönüşü. İstemci ve sunucu aynı tabloyu okur.
// Birimler: mesafe = saha birimi, süre = saniye, açı = derece.

export const AILELER = ["poke", "mermi", "koni", "isin", "alan", "embestida"] as const;
export type Aile = (typeof AILELER)[number];
export type Aviso = "anlik" | "kisa" | "uzun";

export interface AileKurali {
  aile: Aile;
  aviso: Aviso;
  cooldown: number;
  menzil: number;
  /** mermi: mermi yarıçapı; alan: patlama yarıçapı; koni: kol uzunluğu `menzil` ile aynı kalır */
  yaricap?: number;
  /** mermi hızı; embestida atılış hızı (birim/s) */
  hiz?: number;
  /** ışın kalınlığı */
  kalinlik?: number;
  /** alan: hamle başladıktan kaç saniye sonra vurur */
  gecikme?: number;
  /** embestida: atılış mesafesi */
  mesafe?: number;
  /** poke / koni: yay açısı */
  yay?: number;
  /** vuruştan sonra hareketsiz kalma (saniye) */
  toparlanma: number;
}

/** Çözülmüş hamle: yuva için dövüşçü profiline girer. */
export interface HamleKurali extends AileKurali {
  ad: string;
  tip: Tip;
  guc: number;
  fiziksel: boolean;
}

export const AILE_VARSAYILAN: Record<Aile, AileKurali> = {
  poke: { aile: "poke", aviso: "anlik", cooldown: 0.6, menzil: 58, yay: 100, toparlanma: 0.12 },
  mermi: { aile: "mermi", aviso: "anlik", cooldown: 2.5, menzil: 300, yaricap: 10, hiz: 760, toparlanma: 0.15 },
  koni: { aile: "koni", aviso: "kisa", cooldown: 3, menzil: 120, yay: 120, toparlanma: 0.25 },
  isin: { aile: "isin", aviso: "uzun", cooldown: 4, menzil: 250, kalinlik: 16, toparlanma: 0.25 },
  alan: { aile: "alan", aviso: "kisa", cooldown: 4, menzil: 230, yaricap: 64, gecikme: 0.4, toparlanma: 0.2 },
  embestida: { aile: "embestida", aviso: "kisa", cooldown: 4, menzil: 180, mesafe: 180, hiz: 640, toparlanma: 0.2 },
};

/** Güç bandı sınırları. Skaledman'da 61-64 ve 121-129 güçleri de var: bantlar boşluksuz. */
export const GUC_BANDI = { pokeEnFazla: 60, mermiEnFazla: 99, buyukEnFazla: 129 } as const;
/** ≥ 130: aile aynı, cooldown çarpanı ve telegraf uzun. */
export const AGIR_BANT = { cooldownCarpani: 1.5, aviso: "uzun" as Aviso };

/** 100-129 bandında tipe göre aile; listede olmayan tipler mermi. */
const BUYUK_HAMLE_AILESI: Partial<Record<Tip, Aile>> = {
  GROUND: "alan", ROCK: "alan",
  FIRE: "koni", ICE: "koni", GRASS: "koni",
  ELECTRIC: "isin", PSYCHIC: "isin", STEEL: "isin",
  FIGHTING: "embestida", NORMAL: "embestida", DRAGON: "embestida", BUG: "embestida",
};
const BUYUK_HAMLE_VARSAYILANI: Aile = "mermi";

/**
 * El yapımı kurallar. Anahtar yalnız (tip, güç): ad bağımsız, Skaledman'da Türkçe adlar var.
 * Değerler aile varsayılanının üstüne yazılır (ağır banttaki çarpan bundan sonra uygulanır).
 */
export const OZEL_KURALLAR: Record<string, Partial<AileKurali>> = {
  "GROUND:100": { aile: "alan", yaricap: 110, cooldown: 5 }, // Deprem
  "WATER:110": { aile: "isin", kalinlik: 28, menzil: 280, cooldown: 4.5 }, // Hidro Pompa
  "FIRE:150": { aile: "koni", menzil: 150, yay: 140 }, // Püskürme
  "GHOST:90": { aile: "mermi", hiz: 560, yaricap: 12 }, // Hayalet Güç
};

/** (tip, güç) → aile kuralı. Önce el yapımı, yoksa bant geri dönüşü. */
export function aileKurali(tip: Tip, guc: number): AileKurali {
  const ozel = OZEL_KURALLAR[`${tip}:${guc}`];
  let aile: Aile;
  if (ozel?.aile) aile = ozel.aile;
  else if (guc <= GUC_BANDI.pokeEnFazla) aile = "poke";
  else if (guc <= GUC_BANDI.mermiEnFazla) aile = "mermi";
  else aile = BUYUK_HAMLE_AILESI[tip] ?? BUYUK_HAMLE_VARSAYILANI;

  const kural: AileKurali = { ...AILE_VARSAYILAN[aile], ...ozel, aile };
  if (guc > GUC_BANDI.buyukEnFazla) {
    kural.cooldown = Math.round(kural.cooldown * AGIR_BANT.cooldownCarpani * 100) / 100;
    kural.aviso = AGIR_BANT.aviso;
  }
  return kural;
}

export function hamleKur(ad: string, tip: Tip, guc: number): HamleKurali {
  return { ...aileKurali(tip, guc), ad, tip, guc, fiziksel: fizikselMi(tip) };
}

/** Yuva 3 (K-7): tipe göre temel poke, güç 40, kartın 1. tipi. */
export const TEMEL_POKE = { ad: "Temel Vuruş", guc: 40 } as const;
export function temelPoke(tip: Tip): HamleKurali {
  return { ...AILE_VARSAYILAN.poke, ad: TEMEL_POKE.ad, tip, guc: TEMEL_POKE.guc, fiziksel: fizikselMi(tip) };
}

export const YUVA_SAYISI = 4;

/** Yuva 1 = attacks[0], yuva 2 = attacks[1], yuva 3 = temel poke, yuva 4 boş. */
export function yuvalariKur(saldirilar: readonly Saldiri[], tipler: readonly Tip[]): (HamleKurali | null)[] {
  const yuvalar: (HamleKurali | null)[] = new Array(YUVA_SAYISI).fill(null);
  const ilk = saldirilar[0];
  const ikinci = saldirilar[1];
  if (ilk) yuvalar[0] = hamleKur(ilk.name, ilk.type, ilk.power);
  if (ikinci) yuvalar[1] = hamleKur(ikinci.name, ikinci.type, ikinci.power);
  const birinciTip = tipler[0];
  if (birinciTip) yuvalar[2] = temelPoke(birinciTip);
  return yuvalar;
}
