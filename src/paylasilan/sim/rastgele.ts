// Tohumlu PRNG (mulberry32). Kural: sonuç yalnız (tohum, sıra) ikilisine bağlıdır, saklanan durum yok;
// istemci ve sunucu `tohum ⊕ seq` ile aynı sayıyı üretir. Paylaşılan kod: Math.random yasak.

const ALTIN = 0x9e3779b9;

/** [0, 1) aralığında sayı. */
export function rastgele(tohum: number, sira: number): number {
  let t = ((tohum ^ Math.imul(sira + 1, ALTIN)) + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** [0, n) tam sayı. */
export function rastgeleTamsayi(tohum: number, sira: number, n: number): number {
  return Math.floor(rastgele(tohum, sira) * n);
}
