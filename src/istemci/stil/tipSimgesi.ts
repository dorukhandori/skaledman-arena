import type { Tip } from "../../paylasilan/kart.ts";
import { TIP_RENK, renkCss } from "../oyun/renkler.ts";

// Tip rozetleri ve simgeleri (docs/research/skaledman-sayfa-analizi.md § 2.3). Rozet yazısı beyaz; açık tiplerin
// zemini Skaledman'ın `TYPE_BADGE` değerleriyle koyulaştırılır. Glifler kendi çizimimiz (24×24, beyaz; DELIK
// rozet zeminiyle boyanan boşluktur), daire zemin + ince iç halka Skaledman simgesinin dili.

const KOYU_ZEMIN: Partial<Record<Tip, string>> = {
  ELECTRIC: "#b08e00", ICE: "#3a9894", GROUND: "#a2823a", STEEL: "#6f7092", NORMAL: "#7a7956",
  BUG: "#788612", ROCK: "#887826", FLYING: "#7a63c9", FAIRY: "#b8628c", GRASS: "#4f9a2a",
};

export const TIP_TR: Record<Tip, string> = {
  NORMAL: "Normal", FIRE: "Ateş", WATER: "Su", ELECTRIC: "Elektrik", GRASS: "Çimen", ICE: "Buz",
  FIGHTING: "Dövüş", POISON: "Zehir", GROUND: "Toprak", FLYING: "Uçan", PSYCHIC: "Psişik", BUG: "Böcek",
  ROCK: "Kaya", GHOST: "Hayalet", DRAGON: "Ejderha", DARK: "Karanlık", STEEL: "Çelik", FAIRY: "Peri",
};

const CIZGI = 'fill="none" stroke="DELIK" stroke-width="1.5" stroke-linecap="round"';

const GLIF: Record<Tip, string> = {
  NORMAL: '<circle cx="12" cy="12" r="6.6"/><circle cx="12" cy="12" r="3" fill="DELIK"/>',
  FIRE: '<path d="M12 2.5c1.5 4.5 6 6 6 11.5a6 6 0 0 1-12 0c0-2.6 1.4-4.4 2.8-5.4.2 1.8.9 2.9 1.9 3.4C10.3 9 10.6 5.6 12 2.5z"/>',
  WATER: `<path d="M12 3C9 8 6.5 10.6 6.5 14.5a5.5 5.5 0 0 0 11 0C17.5 10.6 15 8 12 3z"/><path d="M9.4 14.2a2.8 2.8 0 0 0 2.2 2.9" ${CIZGI}/>`,
  GRASS: `<path d="M4.5 19.5C4.5 10.5 9.5 4.5 19.5 4.5c0 9.5-5.5 15-15 15z"/><path d="M7.5 16.5 15 9" ${CIZGI}/>`,
  ELECTRIC: '<path d="M13.6 2.4 5.8 13.2h5.2l-1.6 8.4 8.8-11.4h-5.4z"/>',
  ICE: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="12" r="2.4"/>',
  FIGHTING: `<rect x="5.5" y="5" width="13" height="14.5" rx="3.6"/><path d="M9.8 5.8v4.4M13.8 5.8v4.4M6.4 11h7.4" ${CIZGI}/>`,
  POISON: '<circle cx="10" cy="12.5" r="6"/><circle cx="17.6" cy="6.6" r="2.6"/><circle cx="17.8" cy="17.4" r="1.9"/><circle cx="8.6" cy="11" r="1.6" fill="DELIK"/>',
  GROUND: '<rect x="3.5" y="15.5" width="17" height="3.6" rx="1"/><rect x="6" y="10.4" width="12" height="3.6" rx="1"/><rect x="8.6" y="5.3" width="6.8" height="3.6" rx="1"/>',
  FLYING: `<path d="M3.5 17.5c7.5 0 12.5-4 15.5-11.5 1.4 6.4-2 12.4-9 13.4-2.4.3-4.6-.3-6.5-1.9z"/><path d="M9 17l3-3.2M12.6 17.8l2.6-3.4" ${CIZGI}/>`,
  PSYCHIC: '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="5.6" fill="DELIK"/><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="1.2" fill="DELIK"/>',
  BUG: `<ellipse cx="12" cy="14.2" rx="5.6" ry="6.4"/><path d="M12 9v11" ${CIZGI}/><path d="M9.6 8.4 7.4 4.2M14.4 8.4l2.2-4.2" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
  ROCK: `<path d="M8.2 4.2h7.2l5 6.4-2.4 9H6.8l-3.4-7.4z"/><path d="M8.4 10.2l3.6 2 3.4-3.2" ${CIZGI}/>`,
  GHOST: '<path d="M6 20.5V11a6 6 0 0 1 12 0v9.5l-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6z"/><ellipse cx="9.8" cy="11.2" rx="1.4" ry="1.8" fill="DELIK"/><ellipse cx="14.2" cy="11.2" rx="1.4" ry="1.8" fill="DELIK"/>',
  DRAGON: '<path d="M5 3.2c7.6 1.4 13 7 13.4 15.2-2.4-3.2-5.4-4.8-9-5 2-2.6 1.4-6.4-4.4-10.2z"/><path d="M4.4 15.8c2.6-.4 5.2.6 6.8 2.8-2.8 1.6-5.6 1.4-6.8-2.8z"/>',
  DARK: '<path d="M15 2.8a9.2 9.2 0 1 0 6.2 14.6A7.6 7.6 0 0 1 15 2.8z"/>',
  STEEL: '<path d="M3.6 16.4 7.8 8h8.4l4.2 8.4z"/><path d="M9.4 10.6h5.2" fill="none" stroke="DELIK" stroke-width="1.5"/>',
  FAIRY: '<path d="M10.4 3l1.9 5.6 5.6 1.9-5.6 1.9-1.9 5.6-1.9-5.6-5.6-1.9 5.6-1.9z"/><path d="M17.6 14l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/>',
};

/** Beyaz yazı/glif için rozet zemini (açık tiplerde koyulaştırılmış). */
export function tipRozetRengi(t: Tip): string {
  return KOYU_ZEMIN[t] ?? renkCss(TIP_RENK[t]);
}

/** Daire zeminli tip simgesi (SVG metni). Boyut CSS'ten (`.tsimge`). */
export function tipSimgesi(t: Tip): string {
  const c = tipRozetRengi(t);
  return `<svg class="tsimge" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="${c}"/>`
    + `<circle cx="12" cy="12" r="10.8" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.1"/>`
    + `<g fill="#fff" transform="translate(3.8 3.8) scale(.683)">${GLIF[t].replaceAll("DELIK", c)}</g></svg>`;
}

/** Simge + Türkçe ad, tip rengi zeminli hap (`.tcip`). */
export function tipCipi(t: Tip): string {
  return `<span class="tcip" style="--c:${tipRozetRengi(t)}">${tipSimgesi(t)}${TIP_TR[t]}</span>`;
}
