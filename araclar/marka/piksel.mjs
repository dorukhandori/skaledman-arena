// Devran marka varlıkları: piksel tuvali, SVG ve PNG çıktısı.
// Her şey mantıksal piksel ızgarasında çizilir; dışa aktarımda yalnız tam sayı ölçek kullanılır (İ-4).
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

/** Boş tuval (null = saydam). */
export function tuval(gen, yuk) {
  return { gen, yuk, p: Array.from({ length: yuk }, () => Array(gen).fill(null)) };
}

export function koy(t, x, y, renk) {
  if (x < 0 || y < 0 || x >= t.gen || y >= t.yuk || renk == null) return;
  t.p[y][x] = renk;
}

export function al(t, x, y) {
  if (x < 0 || y < 0 || x >= t.gen || y >= t.yuk) return null;
  return t.p[y][x];
}

export function dikdortgen(t, x, y, g, h, renk) {
  for (let j = 0; j < h; j++) for (let i = 0; i < g; i++) koy(t, x + i, y + j, renk);
}

/** Izgara metnini tuvale basar. harita: karakter → renk; '.' ve ' ' saydam. */
export function bas(t, satirlar, x0, y0, harita) {
  satirlar.forEach((satir, y) => {
    [...satir].forEach((k, x) => {
      const renk = harita[k];
      if (renk) koy(t, x0 + x, y0 + y, renk);
    });
  });
}

/** Bir tuvali başka bir tuvalin üstüne kopyalar. */
export function yapistir(hedef, kaynak, x0, y0) {
  for (let y = 0; y < kaynak.yuk; y++)
    for (let x = 0; x < kaynak.gen; x++) koy(hedef, x0 + x, y0 + y, kaynak.p[y][x]);
}

/** Dolu piksellerin çevresine (4 komşu) 1 px dış çizgi ekler. kose=true ise 8 komşu. */
export function disCizgi(t, renk, kose = false) {
  const yeni = tuval(t.gen + 2, t.yuk + 2);
  yapistir(yeni, t, 1, 1);
  const komsu = kose
    ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
    : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const sonuc = tuval(yeni.gen, yeni.yuk);
  yapistir(sonuc, yeni, 0, 0);
  for (let y = 0; y < yeni.yuk; y++)
    for (let x = 0; x < yeni.gen; x++) {
      if (yeni.p[y][x]) continue;
      if (komsu.some(([dx, dy]) => al(yeni, x + dx, y + dy))) sonuc.p[y][x] = renk;
    }
  return sonuc;
}

/** Sağ-alta düz gölge (bulanıklık yok, § 5.1 kural 2). */
export function golge(t, renk, dx = 1, dy = 1) {
  const s = tuval(t.gen + dx, t.yuk + dy);
  for (let y = 0; y < t.yuk; y++)
    for (let x = 0; x < t.gen; x++) if (t.p[y][x]) koy(s, x + dx, y + dy, renk);
  yapistir(s, t, 0, 0);
  return s;
}

/** Tüm dolu pikselleri tek renge boyar (tek renk sürümler için). */
export function tekRenk(t, renk) {
  const s = tuval(t.gen, t.yuk);
  for (let y = 0; y < t.yuk; y++) for (let x = 0; x < t.gen; x++) if (t.p[y][x]) s.p[y][x] = renk;
  return s;
}

/** Kenarlara saydam boşluk ekler. */
export function bosluk(t, sol, ust = sol, sag = sol, alt = ust) {
  const s = tuval(t.gen + sol + sag, t.yuk + ust + alt);
  yapistir(s, t, sol, ust);
  return s;
}

export function zemin(t, renk) {
  const s = tuval(t.gen, t.yuk);
  dikdortgen(s, 0, 0, t.gen, t.yuk, renk);
  yapistir(s, t, 0, 0);
  return s;
}

/** Bayer 4×4 eşiği (gradyan yerine dither, § 5.1 kural 2). */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
export function bayer(x, y) {
  return (BAYER[y & 3][x & 3] + 0.5) / 16;
}

/** SVG: aynı renkli yatay koşular tek rect olur; shape-rendering crispEdges. */
export function svgYaz(t, baslik) {
  const parcalar = [];
  for (let y = 0; y < t.yuk; y++) {
    let x = 0;
    while (x < t.gen) {
      const r = t.p[y][x];
      if (!r) { x++; continue; }
      let son = x;
      while (son + 1 < t.gen && t.p[y][son + 1] === r) son++;
      parcalar.push(`<rect x="${x}" y="${y}" width="${son - x + 1}" height="1" fill="${r}"/>`);
      x = son + 1;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t.gen} ${t.yuk}" width="${t.gen}" height="${t.yuk}" shape-rendering="crispEdges">` +
    `<title>${baslik}</title>${parcalar.join("")}</svg>\n`;
}

function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** PNG: tam sayı ölçek, en yakın komşu. */
export async function pngYaz(t, yol, olcek = 1) {
  const g = t.gen * olcek;
  const h = t.yuk * olcek;
  const buf = Buffer.alloc(g * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < g; x++) {
      const r = t.p[Math.floor(y / olcek)][Math.floor(x / olcek)];
      if (!r) continue;
      const [R, G, B] = hexRgb(r);
      const i = (y * g + x) * 4;
      buf[i] = R; buf[i + 1] = G; buf[i + 2] = B; buf[i + 3] = 255;
    }
  await sharp(buf, { raw: { width: g, height: h, channels: 4 } }).png({ compressionLevel: 9 }).toFile(yol);
}

export async function ikisiniYaz(t, tabanYol, baslik, olcekler = [1]) {
  await writeFile(`${tabanYol}.svg`, svgYaz(t, baslik));
  for (const o of olcekler) await pngYaz(t, `${tabanYol}${o === 1 ? "" : `@${o}x`}.png`, o);
}
