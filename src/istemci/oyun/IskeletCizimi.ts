import type { Graphics } from "pixi.js";
import type { Engel } from "../../paylasilan/sim/Arena.ts";

// İskeletler Diyarı'nın kodla çizilen görsel dili (docs/design/arenalar/iskeletler-diyari.md § 7).
// Kural: zemin koyu ve düşük doygun kalır ki tip renkli telegraflar okunsun; parlak kemik yalnız engellerde.
// Çizim ayak izinden taşmaz: görsel ile çarpışma uyumlu kalır.

export const ISKELET_RENK = {
  gok: 0x0e0f16,
  ufukSis: 0x26212c,
  disZemin: 0x1a1a1f,
  zemin: 0x2e2b2a,
  zeminAcik: 0x33302e,
  cizgi: 0x4a443d,
  sinir: 0x6b6254,
  catlak: 0x1e1c1b,
  yama: 0x262322,
  kemikAcik: 0xd9d2bd,
  kemikKoyu: 0xa59d86,
  kemikKenar: 0x2a2520,
  cukur: 0x14110f,
  siluet: 0x181720,
  ay: 0xcfc8b0,
} as const;

/** Görsel adına göre engel yüksekliği (ekran pikseli); dövüşçü başını kapatmasın diye ≤ 44. */
export const ISKELET_YUKSEKLIK: Record<string, number> = { kafatasi: 44, omurga: 34, uyluk: 18, yerKafatasi: 26, mezarTasi: 30 };

/** Sabit tohumlu LCG: her yüklemede aynı doku (Math.random yok). */
function lcg(tohum: number): () => number {
  let s = tohum >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

export interface IzdusumAraci {
  ekranX(x: number): number;
  zEkranY(z: number): number;
  readonly zOrani: number;
}

/** Gök: dolunay ve ufukta kaburga kemerleri, mezar taşı siluetleri. */
export function gokCiz(g: Graphics, genislik: number, ufukY: number): void {
  const R = ISKELET_RENK;
  g.circle(genislik / 2, ufukY * 0.42, 34).fill({ color: R.ay, alpha: 0.5 });
  for (let i = 0; i < 9; i++) {
    const x = 40 + i * 110;
    const h = 28 + ((i * 37) % 22);
    g.moveTo(x - 30, ufukY).quadraticCurveTo(x, ufukY - h * 2, x + 30, ufukY).stroke({ width: 5, color: R.siluet });
  }
  for (const x of [130, 300, 660, 830]) g.roundRect(x, ufukY - 26, 16, 26, 7).fill(R.siluet);
}

/** Saha içi doku: çatlaklar, koyu yamalar, kenar bandında kemik kırıntıları. */
export function zeminDokusu(g: Graphics, a: { yariGenislik: number; derinlik: number }, p: IzdusumAraci): void {
  const R = ISKELET_RENK;
  const r = lcg(7331);
  for (let i = 0; i < 9; i++) {
    const x = (r() * 2 - 1) * (a.yariGenislik - 40);
    const z = 20 + r() * (a.derinlik - 40);
    g.ellipse(p.ekranX(x), p.zEkranY(z), 30 + r() * 40, (12 + r() * 14) * p.zOrani).fill({ color: R.yama, alpha: 0.5 });
  }
  for (let i = 0; i < 50; i++) {
    const x = (r() * 2 - 1) * a.yariGenislik;
    const z = r() * a.derinlik;
    const dx = (r() * 2 - 1) * 18;
    const dz = (r() * 2 - 1) * 10;
    g.moveTo(p.ekranX(x), p.zEkranY(z)).lineTo(p.ekranX(x + dx), p.zEkranY(z + dz)).stroke({ width: 1, color: R.catlak, alpha: 0.6 });
  }
  for (let i = 0; i < 24; i++) {
    const kenar = r() < 0.5;
    const x = kenar ? (r() < 0.5 ? -1 : 1) * (300 + r() * (a.yariGenislik - 310)) : (r() * 2 - 1) * a.yariGenislik;
    const z = kenar ? r() * a.derinlik : 455 + r() * (a.derinlik - 460);
    g.roundRect(p.ekranX(x), p.zEkranY(z), 6, 2, 1).fill({ color: R.kemikKoyu, alpha: 0.25 });
  }
}

/** Ayak izi (ekran): sol, sağ, arka y, ön y. */
function izKutusu(e: Engel, p: IzdusumAraci): { sol: number; sag: number; arka: number; on: number } {
  const yg = e.tur === "dikdortgen" ? e.yariGenislik : e.yaricap;
  const yd = e.tur === "dikdortgen" ? e.yariDerinlik : e.yaricap;
  return { sol: p.ekranX(e.x - yg), sag: p.ekranX(e.x + yg), arka: p.zEkranY(e.z - yd), on: p.zEkranY(e.z + yd) };
}

function kafatasi(g: Graphics, cx: number, taban: number, w: number, H: number): void {
  const R = ISKELET_RENK;
  const k = { width: 2, color: R.kemikKenar };
  g.roundRect(cx - w * 0.32, taban - H * 0.32, w * 0.64, H * 0.32, 3).fill(R.kemikKoyu).stroke(k); // çene
  g.ellipse(cx, taban - H * 0.6, w / 2, H * 0.4).fill(R.kemikAcik).stroke(k);
  g.ellipse(cx - w * 0.2, taban - H * 0.58, w * 0.12, H * 0.12).fill(R.cukur);
  g.ellipse(cx + w * 0.2, taban - H * 0.58, w * 0.12, H * 0.12).fill(R.cukur);
  g.poly([cx, taban - H * 0.44, cx - w * 0.06, taban - H * 0.34, cx + w * 0.06, taban - H * 0.34]).fill(R.cukur);
  for (const d of [-0.14, 0, 0.14]) g.moveTo(cx + w * d, taban - H * 0.28).lineTo(cx + w * d, taban - H * 0.08).stroke({ width: 1, color: R.cukur });
}

/** Görsel adı bilinen engeli çizer; bilinmiyorsa false (Sahne varsayılan kutuyu çizer). */
export function iskeletEngeliCiz(g: Graphics, e: Engel, p: IzdusumAraci): boolean {
  if (!e.gorsel || !(e.gorsel in ISKELET_YUKSEKLIK)) return false;
  const R = ISKELET_RENK;
  const H = ISKELET_YUKSEKLIK[e.gorsel]!;
  const kenar = { width: 2, color: R.kemikKenar };
  const b = izKutusu(e, p);
  const cx = (b.sol + b.sag) / 2;
  const w = b.sag - b.sol;
  g.ellipse(cx, b.on, w / 2, Math.max(3, (b.on - b.arka) / 2)).fill({ color: 0x000000, alpha: 0.3 });
  switch (e.gorsel) {
    case "kafatasi":
      kafatasi(g, cx, b.on, w, H);
      break;
    case "yerKafatasi":
      kafatasi(g, cx, b.on, w, H);
      break;
    case "omurga": {
      const adim = 12;
      for (let y = b.arka; y <= b.on; y += adim) {
        g.moveTo(b.sol + 2, y - H * 0.4).quadraticCurveTo(cx, y - H * 0.95, b.sag - 2, y - H * 0.4).stroke({ width: 2, color: R.kemikKoyu });
        g.roundRect(cx - 5, y - H * 0.75, 10, 8, 4).fill(R.kemikAcik).stroke({ width: 1, color: R.kemikKenar });
      }
      break;
    }
    case "uyluk":
      g.roundRect(b.sol + 8, b.on - H * 0.75, w - 16, H * 0.5, 4).fill(R.kemikAcik).stroke(kenar);
      for (const x of [b.sol + 10, b.sag - 10]) {
        g.circle(x, b.on - H * 0.7, 9).fill(R.kemikAcik).stroke(kenar);
        g.circle(x, b.on - H * 0.3, 9).fill(R.kemikKoyu).stroke(kenar);
      }
      break;
    case "mezarTasi":
      g.rect(b.sol, b.on - H + w / 2, w, H - w / 2).fill(0x6b6763).stroke(kenar);
      g.circle(cx, b.on - H + w / 2, w / 2).fill(0x6b6763).stroke(kenar);
      g.rect(b.sol + 2, b.on - H + w / 2, w - 4, 3).fill(0x6b6763);
      g.moveTo(cx, b.on - H * 0.75).lineTo(cx, b.on - H * 0.3).stroke({ width: 2, color: 0x3c3935 });
      g.moveTo(cx - 5, b.on - H * 0.6).lineTo(cx + 5, b.on - H * 0.6).stroke({ width: 2, color: 0x3c3935 });
      break;
  }
  return true;
}
