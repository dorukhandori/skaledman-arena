// RGBA ham resim yardımcıları (sharp ile okuma/yazma). Yalnız Node araçları kullanır.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export interface Resim {
  g: number;
  y: number;
  /** RGBA, satır satır */
  veri: Uint8Array;
}

export function bosResim(g: number, y: number): Resim {
  return { g, y, veri: new Uint8Array(g * y * 4) };
}

export function kopyala(r: Resim): Resim {
  return { g: r.g, y: r.y, veri: r.veri.slice() };
}

export async function resimOku(yol: string): Promise<Resim> {
  const { data, info } = await sharp(yol).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { g: info.width, y: info.height, veri: new Uint8Array(data.buffer, data.byteOffset, data.byteLength) };
}

export async function resimOkuBellekten(tampon: Buffer): Promise<Resim> {
  const { data, info } = await sharp(tampon).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { g: info.width, y: info.height, veri: new Uint8Array(data.buffer, data.byteOffset, data.byteLength) };
}

export async function resimYaz(yol: string, r: Resim): Promise<void> {
  await mkdir(dirname(yol), { recursive: true });
  await sharp(Buffer.from(r.veri.buffer, r.veri.byteOffset, r.veri.byteLength), { raw: { width: r.g, height: r.y, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(yol);
}

export function indeks(r: Resim, x: number, y: number): number {
  return (y * r.g + x) * 4;
}

export function icinde(r: Resim, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < r.g && y < r.y;
}

/** Piksel değerleri [r,g,b,a]; sınır dışı → null */
export function piksel(r: Resim, x: number, y: number): [number, number, number, number] | null {
  if (!icinde(r, x, y)) return null;
  const i = indeks(r, x, y);
  return [r.veri[i]!, r.veri[i + 1]!, r.veri[i + 2]!, r.veri[i + 3]!];
}

export function pikselYaz(r: Resim, x: number, y: number, c: readonly [number, number, number, number]): void {
  if (!icinde(r, x, y)) return;
  const i = indeks(r, x, y);
  r.veri[i] = c[0]; r.veri[i + 1] = c[1]; r.veri[i + 2] = c[2]; r.veri[i + 3] = c[3];
}

export function opak(r: Resim, x: number, y: number): boolean {
  return icinde(r, x, y) && r.veri[indeks(r, x, y) + 3]! >= 128;
}

/** Sayfadan kare kopyalar (sınır dışı = şeffaf). */
export function kareAl(sayfa: Resim, x0: number, y0: number, g: number, h: number): Resim {
  const k = bosResim(g, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < g; x++) {
      if (!icinde(sayfa, x0 + x, y0 + y)) continue;
      const si = indeks(sayfa, x0 + x, y0 + y), di = indeks(k, x, y);
      for (let c = 0; c < 4; c++) k.veri[di + c] = sayfa.veri[si + c]!;
    }
  }
  return k;
}

/** Kareyi sayfaya geri yazar. */
export function kareYaz(sayfa: Resim, x0: number, y0: number, kare: Resim): void {
  for (let y = 0; y < kare.y; y++) {
    for (let x = 0; x < kare.g; x++) {
      if (!icinde(sayfa, x0 + x, y0 + y)) continue;
      const si = indeks(kare, x, y), di = indeks(sayfa, x0 + x, y0 + y);
      for (let c = 0; c < 4; c++) sayfa.veri[di + c] = kare.veri[si + c]!;
    }
  }
}
