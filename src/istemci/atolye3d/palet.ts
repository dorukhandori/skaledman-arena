import type { ElementAdi, KokenAdi } from "../../paylasilan/kurallar/ayar.ts";
import { ELEMENT_RENK, KOKEN_RENK, renkKaristir } from "../oyun/renkler.ts";
import { SINIF_SAYISI, type Sinif } from "./geometri.ts";

// Atölye 3B toon paleti (saf). Sprite hattıyla aynı rampa (araclar/sanat/topac-uret.ts `rampa`): 5 ton
// [çizgi, koyu, orta, açık, vurgu]; toon gölgelemede 4 kademe (koyu..vurgu), çizgi tonu dış çizgide.
// Gövde boyası takılı Çekirdeğin Element'i (pixel planı § 2.3), Çekirdek çerçevesi Köken ışığı; Disk ve Uç metal.

export type Rampa = [number, number, number, number, number];

const METAL: Rampa = [0x1c2326, 0x4a555b, 0x7c888e, 0xb3bec3, 0xeef4f5];
const KOYU: Rampa = [0x101316, 0x23282d, 0x3a4248, 0x5c666d, 0x96a1a7];
const ALTIN: Rampa = [0x452c0a, 0x8a5a14, 0xc8902a, 0xf2c447, 0xfff0b8];
const LASTIK: Rampa = [0x0e1012, 0x1d2125, 0x2d3237, 0x434a50, 0x5f686e];
const BEYAZ: Rampa = [0x3a4448, 0x9aa6ab, 0xd5dcdf, 0xf4f7f8, 0xffffff];
/** Çekirdek takılı değilken (boş / ödünçsüz) Gövde boyası: soğuk gri (Element yok) */
const NOTR: Rampa = [0x16181f, 0x353a48, 0x59607a, 0x8a90a6, 0xc8ccd8];

export interface Boya { element: ElementAdi | null; koken: KokenAdi | null }

function elementRampa(e: ElementAdi | null): Rampa {
  if (!e) return NOTR;
  const r = ELEMENT_RENK[e];
  return [renkKaristir(r.koyu, 0x000000, 0.45), r.koyu, r.orta, r.acik, r.vurgu];
}

function kokenRampa(k: KokenAdi | null): Rampa {
  const r = KOKEN_RENK[k ?? "goktasi"];
  return [renkKaristir(r.ikinci, 0x000000, 0.62), renkKaristir(r.ikinci, 0x000000, 0.3), r.ikinci, r.isik, renkKaristir(r.isik, 0xffffff, 0.6)];
}

export function rampa(s: Sinif, b: Boya): Rampa {
  switch (s) {
    case "boya": return elementRampa(b.element);
    case "boya2": { const r = elementRampa(b.element); return [r[0], r[0], r[1], r[2], r[3]]; }
    case "kubbe": { const r = elementRampa(b.element); return [r[0], r[1], r[3], r[4], 0xffffff]; }
    case "cerceve": return kokenRampa(b.koken);
    case "metal": return METAL;
    case "koyu": return KOYU;
    case "altin": return ALTIN;
    case "lastik": return LASTIK;
    case "beyaz": return BEYAZ;
  }
}

const SINIF_SIRA: Sinif[] = ["boya", "boya", "boya2", "metal", "koyu", "altin", "kubbe", "cerceve", "lastik", "beyaz"];

/** Shader için düz dizi: [sınıf kodu 0..9] × [5 ton] × rgb (0..1). Kod 0 boya ile aynı. */
export function paletDizisi(b: Boya): Float32Array {
  const out = new Float32Array(SINIF_SAYISI * 5 * 3);
  for (let c = 0; c < SINIF_SAYISI; c++) {
    const r = rampa(SINIF_SIRA[c]!, b);
    for (let t = 0; t < 5; t++) {
      const v = r[t]!;
      const o = (c * 5 + t) * 3;
      out[o] = ((v >> 16) & 255) / 255; out[o + 1] = ((v >> 8) & 255) / 255; out[o + 2] = (v & 255) / 255;
    }
  }
  return out;
}

/** Kontur ve dış çizgi rengi (blueprint lacivertinde okunur, saf siyah değil). */
export const CIZGI_RENK = 0x07080d;
