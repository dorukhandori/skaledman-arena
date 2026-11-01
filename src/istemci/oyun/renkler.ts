import type { Tip } from "../../paylasilan/kart.ts";

/** Showdown tip paleti (sunum; sim bilmez). */
export const TIP_RENK: Record<Tip, number> = {
  FIRE: 0xf08030, WATER: 0x6890f0, GRASS: 0x78c850, ELECTRIC: 0xf8d030, ICE: 0x98d8d8,
  FIGHTING: 0xc03028, POISON: 0xa040a0, GROUND: 0xe0c068, FLYING: 0xa890f0, PSYCHIC: 0xf85888,
  BUG: 0xa8b820, ROCK: 0xb8a038, GHOST: 0x705898, DRAGON: 0x7038f8, DARK: 0x705848,
  STEEL: 0xb8b8d0, FAIRY: 0xee99ac, NORMAL: 0xa8a878,
};

export function renkCss(renk: number): string {
  return `#${renk.toString(16).padStart(6, "0")}`;
}

/** index.html değişkenleriyle uyumlu sahne renkleri. */
export const SAHNE_RENK = {
  gok: 0x101b26,
  gokUfuk: 0x1d2c3a,
  disZemin: 0x2e2820,
  zemin: 0x5a4a35,
  zeminAcik: 0x65543b,
  cizgi: 0x8a7650,
  engelUst: 0x7a8a93,
  engelOn: 0x45545c,
  engelKenar: 0x24313a,
  tehlike: 0xe3350d,
  altin: 0xf4cf47,
} as const;
