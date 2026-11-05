import type { ElementAdi, KokenAdi } from "../../paylasilan/kurallar/ayar.ts";

// Sunum renkleri (sim bilmez). Kaynak: docs/art/topac-pixel-plani.md § 2.3 (tahmin; spike'ta gri ton ve CVD ile sınanır).

/** Element 4 tonlu rampa: koyu / orta / açık / vurgu. Orta ton pixel planındaki hex. */
export const ELEMENT_RENK: Record<ElementAdi, { koyu: number; orta: number; acik: number; vurgu: number; ad: string }> = {
  kor: { koyu: 0x7a1d12, orta: 0xe8452c, acik: 0xff8a5c, vurgu: 0xffd2a8, ad: "Kor" },
  kasirga: { koyu: 0x1f6b52, orta: 0x5bd1a5, acik: 0x9cebc9, vurgu: 0xe2fff2, ad: "Kasırga" },
  simsek: { koyu: 0x8a6a08, orta: 0xf7d83a, acik: 0xfbe97f, vurgu: 0xfffbe0, ad: "Şimşek" },
  girdap: { koyu: 0x14286b, orta: 0x2a5bd7, acik: 0x6f93ee, vurgu: 0xcfdcff, ad: "Girdap" },
  kaya: { koyu: 0x45392a, orta: 0x8a7458, acik: 0xb8a283, vurgu: 0xe6dbc6, ad: "Kaya" },
  don: { koyu: 0x3b7d8f, orta: 0x9fe3f5, acik: 0xcff3fb, vurgu: 0xffffff, ad: "Don" },
};

/** Köken ışığı (Çekirdek, iz iç çizgisi). */
export const KOKEN_RENK: Record<KokenAdi, { isik: number; ikinci: number; ad: string }> = {
  goktasi: { isik: 0xffe9a8, ikinci: 0xffc93c, ad: "Göktaşı" },
  maden: { isik: 0xc8842b, ikinci: 0x8a5718, ad: "Maden" },
  yapay: { isik: 0x7f95a8, ikinci: 0x4d5d6b, ad: "Yapay" },
  karanlik: { isik: 0x5b2a86, ikinci: 0x1a0f26, ad: "Karanlık" },
};

/** Takım (pixel planı § 2.3; ux § 6.1): oyuncu düz + ▲, rakip kesikli + ◆. */
export const TAKIM_RENK = { oyuncu: 0x2fb8e8, rakip: 0xe83a8c } as const;

export const SAHNE_RENK = {
  arkaPlan: 0x0b1418,
  tribun: 0x121f25,
  zemin: 0x3b4a4f,
  zeminAcik: 0x46585e,
  kusak: 0x52676d,
  kusakCizgi: 0x7fa0a8,
  egim: 0x2c393d,
  kenar: 0x1a2226,
  kenarDudak: 0x8fa4aa,
  merkez: 0x56696f,
  tehlike: 0xe3350d,
  amber: 0xf2a33a,
  beyaz: 0xffffff,
} as const;

export function renkCss(renk: number): string {
  return `#${renk.toString(16).padStart(6, "0")}`;
}

/** İki rengi t oranında karıştırır (0 = a, 1 = b). */
export function renkKaristir(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
