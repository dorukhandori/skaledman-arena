import { TIPLER, type Tip } from "../kart.ts";
import { AYAR } from "./ayar.ts";

// 18 tip, Gen 6+ standart etkinlik tablosu (saldıran → savunan). Paylaşılan kod.

const GUCLU: Record<Tip, readonly Tip[]> = {
  NORMAL: [],
  FIRE: ["GRASS", "ICE", "BUG", "STEEL"],
  WATER: ["FIRE", "GROUND", "ROCK"],
  ELECTRIC: ["WATER", "FLYING"],
  GRASS: ["WATER", "GROUND", "ROCK"],
  ICE: ["GRASS", "GROUND", "FLYING", "DRAGON"],
  FIGHTING: ["NORMAL", "ICE", "ROCK", "DARK", "STEEL"],
  POISON: ["GRASS", "FAIRY"],
  GROUND: ["FIRE", "ELECTRIC", "POISON", "ROCK", "STEEL"],
  FLYING: ["GRASS", "FIGHTING", "BUG"],
  PSYCHIC: ["FIGHTING", "POISON"],
  BUG: ["GRASS", "PSYCHIC", "DARK"],
  ROCK: ["FIRE", "ICE", "FLYING", "BUG"],
  GHOST: ["PSYCHIC", "GHOST"],
  DRAGON: ["DRAGON"],
  DARK: ["PSYCHIC", "GHOST"],
  STEEL: ["ICE", "ROCK", "FAIRY"],
  FAIRY: ["FIGHTING", "DRAGON", "DARK"],
};

const ZAYIF: Record<Tip, readonly Tip[]> = {
  NORMAL: ["ROCK", "STEEL"],
  FIRE: ["FIRE", "WATER", "ROCK", "DRAGON"],
  WATER: ["WATER", "GRASS", "DRAGON"],
  ELECTRIC: ["ELECTRIC", "GRASS", "DRAGON"],
  GRASS: ["FIRE", "GRASS", "POISON", "FLYING", "BUG", "DRAGON", "STEEL"],
  ICE: ["FIRE", "WATER", "ICE", "STEEL"],
  FIGHTING: ["POISON", "FLYING", "PSYCHIC", "BUG", "FAIRY"],
  POISON: ["POISON", "GROUND", "ROCK", "GHOST"],
  GROUND: ["GRASS", "BUG"],
  FLYING: ["ELECTRIC", "ROCK", "STEEL"],
  PSYCHIC: ["PSYCHIC", "STEEL"],
  BUG: ["FIRE", "FIGHTING", "POISON", "FLYING", "GHOST", "STEEL", "FAIRY"],
  ROCK: ["FIGHTING", "GROUND", "STEEL"],
  GHOST: ["DARK"],
  DRAGON: ["STEEL"],
  DARK: ["FIGHTING", "DARK", "FAIRY"],
  STEEL: ["FIRE", "WATER", "ELECTRIC", "STEEL"],
  FAIRY: ["FIRE", "POISON", "STEEL"],
};

const BAGISIK: Record<Tip, readonly Tip[]> = {
  NORMAL: ["GHOST"],
  FIRE: [], WATER: [], ELECTRIC: ["GROUND"], GRASS: [], ICE: [],
  FIGHTING: ["GHOST"],
  POISON: ["STEEL"],
  GROUND: ["FLYING"],
  FLYING: [],
  PSYCHIC: ["DARK"],
  BUG: [], ROCK: [],
  GHOST: ["NORMAL"],
  DRAGON: ["FAIRY"],
  DARK: [], STEEL: [], FAIRY: [],
};

function tabloKur(): Record<Tip, Record<Tip, number>> {
  const t = {} as Record<Tip, Record<Tip, number>>;
  for (const s of TIPLER) {
    const satir = {} as Record<Tip, number>;
    for (const v of TIPLER) {
      satir[v] = GUCLU[s].includes(v) ? 2 : ZAYIF[s].includes(v) ? 0.5 : BAGISIK[s].includes(v) ? 0 : 1;
    }
    t[s] = satir;
  }
  return t;
}

/** 18×18 tablo: ETKINLIK_TABLOSU[saldıran][savunan] ∈ {0, 0.5, 1, 2}. */
export const ETKINLIK_TABLOSU = tabloKur();

export const STAB = AYAR.stab;

/** Ham etkinlik: savunanın tiplerinin çarpımı (0, 0.25, 0.5, 1, 2, 4). */
export function etkinlik(saldiriTipi: Tip, savunanTipler: readonly Tip[]): 0 | 0.25 | 0.5 | 1 | 2 | 4 {
  let c = 1;
  for (const t of savunanTipler) c *= ETKINLIK_TABLOSU[saldiriTipi][t];
  return c as 0 | 0.25 | 0.5 | 1 | 2 | 4;
}

/** Tip çarpanı budaması (oyun-konsepti § 11): > 1 → 1.5, 0 < x < 1 → 2/3, 0 → 0. */
export function budanmisEtkinlik(ham: number): number {
  if (ham > 1) return AYAR.superEtkili;
  if (ham > 0 && ham < 1) return AYAR.azEtkili;
  return ham;
}

/**
 * Saldırı sınıfı (fiziksel/özel) Skaledman'da yok; basit tip kuralı (oyun-konsepti § 12 adayı,
 * karar game-designer'da). Fiziksel: Dövüş, Normal, Kaya, Toprak, Böcek, Çelik, Zehir, Uçan, Hayalet, Karanlık.
 */
const FIZIKSEL: ReadonlySet<Tip> = new Set<Tip>([
  "FIGHTING", "NORMAL", "ROCK", "GROUND", "BUG", "STEEL", "POISON", "FLYING", "GHOST", "DARK",
]);
export function fizikselMi(tip: Tip): boolean {
  return FIZIKSEL.has(tip);
}
