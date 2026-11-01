// Shiny (parlak) varyant: Skaledman shiny kartı aynı PNG'ye CSS `filter: hue-rotate(<hue>deg) saturate(1.3)` ile
// gösterir (docs/research/skaledman-sayfa-analizi.md § 2.5). Burada aynı dönüşüm Filter Effects belirtimindeki
// feColorMatrix (type=hueRotate, ardından type=saturate) matrisleriyle piksel piksel uygulanır; böylece arena
// dövüşçüsü kart resmiyle aynı renk kaymasını taşır. CSS kısayol süzgeçleri sRGB uzayında çalışır.
import type { Resim } from "./resim.ts";

/** Skaledman'ın sabiti (spriteImg, s. 650) */
export const SHINY_DOYGUNLUK = 1.3;

export type Matris3 = readonly [number, number, number, number, number, number, number, number, number];

/** feColorMatrix hueRotate (derece) — belirtimdeki sabitlerle birebir. */
export function hueRotateMatrisi(derece: number): Matris3 {
  const a = (derece * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
  ];
}

/** feColorMatrix saturate (değer) — belirtimdeki sabitlerle birebir. */
export function saturateMatrisi(s: number): Matris3 {
  return [
    0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
  ];
}

function carp(a: Matris3, b: Matris3): Matris3 {
  const o: number[] = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o.push(a[i * 3]! * b[j]! + a[i * 3 + 1]! * b[3 + j]! + a[i * 3 + 2]! * b[6 + j]!);
  return o as unknown as Matris3;
}

/** `hue-rotate(hue) saturate(doygunluk)` zinciri: önce hue-rotate, sonra saturate → M = S × H. */
export function shinyMatrisi(hue: number, doygunluk: number = SHINY_DOYGUNLUK): Matris3 {
  return carp(saturateMatrisi(doygunluk), hueRotateMatrisi(hue));
}

export function renkKaydir(m: Matris3, r: number, g: number, b: number): [number, number, number] {
  const k = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));
  return [k(m[0] * r + m[1] * g + m[2] * b), k(m[3] * r + m[4] * g + m[5] * b), k(m[6] * r + m[7] * g + m[8] * b)];
}

/** Resmin opak piksellerine matrisi uygular (alfa değişmez); yeni resim döner. */
export function shinyUygula(r: Resim, hue: number, doygunluk: number = SHINY_DOYGUNLUK): Resim {
  const m = shinyMatrisi(hue, doygunluk);
  const cikti = { g: r.g, y: r.y, veri: r.veri.slice() };
  const onbellek = new Map<number, number>();
  for (let i = 0; i < r.g * r.y * 4; i += 4) {
    if (r.veri[i + 3]! === 0) continue;
    const a = (r.veri[i]! << 16) | (r.veri[i + 1]! << 8) | r.veri[i + 2]!;
    let b = onbellek.get(a);
    if (b === undefined) {
      const [x, y, z] = renkKaydir(m, (a >> 16) & 255, (a >> 8) & 255, a & 255);
      b = (x << 16) | (y << 8) | z;
      onbellek.set(a, b);
    }
    cikti.veri[i] = (b >> 16) & 255; cikti.veri[i + 1] = (b >> 8) & 255; cikti.veri[i + 2] = b & 255;
  }
  return cikti;
}
