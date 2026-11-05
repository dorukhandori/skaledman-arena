// GU-01 menü dokuları (yön B · Kuşak Taşı; docs/art/menu-tasarim-arastirma.md § 5, § 6.3): tohumlu yordamsal pixel dokular
// ve küçük ikon sprite'ları → src/istemci/stil/doku/*.png. Gradyan / bulanık gölge / parlama yok; ton geçişi Bayer 4×4
// dither. Lisans: kendi üretimimiz (CC0). Çalıştır: `npx tsx araclar/menu-dokulari.ts` (çıktı deterministik).
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const CIKTI = "src/istemci/stil/doku";

// ---- küçük PNG kodlayıcı (RGBA, filtre 0) ----
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(b: Uint8Array): number { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function parca(tur: string, veri: Uint8Array): Buffer {
  const u = Buffer.alloc(4); u.writeUInt32BE(veri.length);
  const t = Buffer.concat([Buffer.from(tur, "ascii"), Buffer.from(veri)]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(t));
  return Buffer.concat([u, t, c]);
}
class Tuval {
  p: Uint8Array;
  constructor(public w: number, public h: number) { this.p = new Uint8Array(w * h * 4); }
  nokta(x: number, y: number, renk: number | null, a = 255): void {
    if (renk === null || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.p[i] = (renk >> 16) & 255; this.p[i + 1] = (renk >> 8) & 255; this.p[i + 2] = renk & 255; this.p[i + 3] = a;
  }
  dikdortgen(x: number, y: number, w: number, h: number, renk: number): void { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.nokta(i, j, renk); }
  png(): Buffer {
    const satir = this.w * 4 + 1;
    const ham = new Uint8Array(satir * this.h);
    for (let y = 0; y < this.h; y++) { ham[y * satir] = 0; ham.set(this.p.subarray(y * this.w * 4, (y + 1) * this.w * 4), y * satir + 1); }
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(this.w, 0); ihdr.writeUInt32BE(this.h, 4); ihdr[8] = 8; ihdr[9] = 6;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), parca("IHDR", ihdr), parca("IDAT", deflateSync(ham, { level: 9 })), parca("IEND", new Uint8Array())]);
  }
}

// ---- tohumlu gürültü + dither ----
function mulberry(t: number): () => number { return () => { t |= 0; t = (t + 0x6d2b79f5) | 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const bayer = (x: number, y: number) => (BAYER[y & 3]![x & 3]! + 0.5) / 16;
/** döşenebilir değer gürültüsü (periyot w×h, hücre c) */
function gurultu(w: number, h: number, c: number, tohum: number): (x: number, y: number) => number {
  const r = mulberry(tohum); const gw = Math.ceil(w / c), gh = Math.ceil(h / c);
  const g = Array.from({ length: gw * gh }, () => r());
  const v = (i: number, j: number) => g[((j + gh) % gh) * gw + ((i + gw) % gw)]!;
  return (x, y) => {
    const fx = x / c, fy = y / c, i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    return (v(i, j) * (1 - sx) + v(i + 1, j) * sx) * (1 - sy) + (v(i, j + 1) * (1 - sx) + v(i + 1, j + 1) * sx) * sy;
  };
}
/** rampadan dither'lı ton seç (t 0..1) */
function ton(ramp: number[], t: number, x: number, y: number): number {
  const s = Math.max(0, Math.min(0.9999, t)) * (ramp.length - 1);
  const i = Math.floor(s), f = s - i;
  return ramp[Math.min(ramp.length - 1, i + (f > bayer(x, y) ? 1 : 0))]!;
}

// ---- palet (§ 5.2) ----
const TAS = [0x121016, 0x18161d, 0x1e1b24, 0x25222b];
const HARC = 0x0c0b10;
const CERCEVE = [0x3a3640, 0x4a4550, 0x5a5460, 0x6e6a66];
const CERCEVE_ISIK = 0x8f877c;
const PANEL = [0x171c29, 0x1b2131, 0x1f2638];
const BRONZ = [0x2a1a0e, 0x6b4a2a, 0x8f6538, 0xc08e52, 0xe8c27a];
const GOLGE = 0x05050a;

const dosyalar: Record<string, Tuval> = {};

// 1) duvar: 128×64 döşeme, büyük blok ritmi, harç, tohumlu çatlak
{
  const W = 128, H = 64, t = new Tuval(W, H), n = gurultu(W, H, 8, 11), n2 = gurultu(W, H, 3, 12), r = mulberry(13);
  const sira = [[0, 40, 72, 104], [20, 56, 92], [0, 32, 76, 100], [12, 48, 84, 116]];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = Math.floor(y / 16), yy = y % 16;
    const kesik = sira[s]!.some((k) => k === x);
    if (yy === 15 || kesik) { t.nokta(x, y, HARC); continue; }
    const v = 0.35 + 0.4 * n(x, y) + 0.25 * n2(x, y) - (yy === 14 ? 0.25 : 0) + (yy === 0 ? 0.15 : 0);
    t.nokta(x, y, ton(TAS, v, x, y));
  }
  for (let k = 0; k < 7; k++) { // çatlak: kısa kırık çizgiler
    let x = Math.floor(r() * W), y = Math.floor(r() * H); const uz = 4 + Math.floor(r() * 7);
    for (let i = 0; i < uz; i++) { t.nokta(x, y, HARC); x = (x + (r() < 0.5 ? 1 : 0) + W) % W; y = (y + 1) % H; }
  }
  dosyalar["duvar"] = t;
}

// 2) taş çerçeve 9-slice: 26×26, kenar 5 (dış 1 harç, üst-sol 1 ışık, alt-sağ 1 gölge, köşe kesik 1, 2-3 tohumlu çentik); orta = panel dither
for (const tohum of [1, 2, 3]) {
  const S = 26, B = 5, t = new Tuval(S, S), n = gurultu(S, S, 3, 20 + tohum), r = mulberry(30 + tohum);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const ic = x >= B && y >= B && x < S - B && y < S - B;
    if (ic) { t.nokta(x, y, ton(PANEL, 0.45 + 0.3 * (n(x * 3, y * 3) - 0.5), x, y)); continue; }
    const dis = x === 0 || y === 0 || x === S - 1 || y === S - 1;
    const icHat = x === B - 1 && y >= B - 1 && y <= S - B || y === B - 1 && x >= B - 1 && x <= S - B || x === S - B && y >= B - 1 && y <= S - B || y === S - B && x >= B - 1 && x <= S - B;
    if (dis) { t.nokta(x, y, HARC); continue; }
    if (icHat) { t.nokta(x, y, GOLGE); continue; }
    let v = 0.3 + 0.55 * n(x, y);
    if (x === 1 || y === 1) v = 1.2; // ışık kenarı
    if (x === S - 2 || y === S - 2) v = 0.05;
    t.nokta(x, y, v > 1 ? CERCEVE_ISIK : ton(CERCEVE, v, x, y));
  }
  for (const [x, y] of [[0, 0], [S - 1, 0], [0, S - 1], [S - 1, S - 1]] as const) t.nokta(x, y, null);
  for (const [x, y] of [[0, 0], [S - 1, 0], [0, S - 1], [S - 1, S - 1]] as const) { const i = (y * S + x) * 4; t.p[i + 3] = 0; }
  const centik = 2 + Math.floor(r() * 2);
  for (let k = 0; k < centik; k++) { // kenar ortasında (tekrar eden bölgede) 1-2 px çentik
    const yan = Math.floor(r() * 4), p = B + 1 + Math.floor(r() * (S - 2 * B - 2)), u = 1 + Math.floor(r() * 2);
    for (let i = 0; i < u; i++) {
      const [x, y] = yan === 0 ? [p + i, 1] : yan === 1 ? [p + i, S - 2] : yan === 2 ? [1, p + i] : [S - 2, p + i];
      t.nokta(x, y, HARC); const [x2, y2] = yan === 0 ? [p + i, 2] : yan === 1 ? [p + i, S - 3] : yan === 2 ? [2, p + i] : [S - 3, p + i];
      t.nokta(x2, y2, CERCEVE[0]!);
    }
  }
  dosyalar[`tas-cerceve-${tohum}`] = t;
}

// 3) lento (üst bant) dokusu: 122×26 (derz her 61 px) yatay döşeme, açık taş blokları, alt 2 px gölge
{
  const W = 122, H = 26, t = new Tuval(W, H), n = gurultu(W, H, 6, 41), n2 = gurultu(W, H, 2, 42);
  const RAMP = [0x4a4550, 0x5a5460, 0x6e6a66, 0x7d776f];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (y >= H - 2) { t.nokta(x, y, y === H - 1 ? GOLGE : HARC); continue; }
    if (y === 0) { t.nokta(x, y, 0x7f7a74); continue; }
    if (x % 61 === 0 && y > 0) { t.nokta(x, y, CERCEVE[0]!); continue; }
    t.nokta(x, y, ton(RAMP, 0.2 + 0.55 * n(x, y) + 0.25 * n2(x, y), x, y));
  }
  dosyalar["lento"] = t;
}

// 4) bronz plaka 9-slice: 24×20, kenar 6; köşelerde 2×2 perçin; orta bronz dither
{
  const W = 24, H = 20, t = new Tuval(W, H), n = gurultu(W, H, 3, 51);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) { t.nokta(x, y, BRONZ[0]!); continue; }
    if (y === 1) { t.nokta(x, y, BRONZ[4]!); continue; }
    if (y === H - 2) { t.nokta(x, y, BRONZ[1]!); continue; }
    if (x === 1) { t.nokta(x, y, BRONZ[3]!); continue; }
    if (x === W - 2) { t.nokta(x, y, BRONZ[1]!); continue; }
    t.nokta(x, y, ton([BRONZ[1]!, BRONZ[2]!, BRONZ[3]!], 0.35 + 0.45 * n(x, y), x, y));
  }
  for (const [x, y] of [[3, 3], [W - 5, 3], [3, H - 5], [W - 5, H - 5]] as const) { t.nokta(x, y, BRONZ[4]!); t.nokta(x + 1, y, BRONZ[3]!); t.nokta(x, y + 1, BRONZ[3]!); t.nokta(x + 1, y + 1, BRONZ[0]!); }
  for (const [x, y] of [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]] as const) { const i = (y * W + x) * 4; t.p[i + 3] = 0; }
  dosyalar["plaka"] = t;
}

// 5) dolgu dokuları (32×32, 3 tonlu dither): panel, ana düğme, kahve (seçili), normal düğme, kapalı (koyu taş), kırmızı geri
const dolgu = (ad: string, ramp: number[], tohum: number, taban = 0.5, genlik = 0.35) => {
  const S = 32, t = new Tuval(S, S), n = gurultu(S, S, 4, tohum);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) t.nokta(x, y, ton(ramp, taban + genlik * (n(x, y) - 0.5), x, y));
  dosyalar[ad] = t;
};
dolgu("doku-panel", PANEL, 61);
dolgu("doku-ana", [0x8f4722, 0xa8572a, 0xb86232], 62);
dolgu("doku-secili", [0x5a3018, 0x6b3c1f, 0x7c4a2a], 63);
dolgu("doku-normal", [0x1f2638, 0x262d40, 0x2c3347], 64);
dolgu("doku-kapali", [0x18161d, 0x1e1b24, 0x25222b], 65);
dolgu("doku-geri", [0x822f2b, 0x9a3d38, 0xa84843], 66);
dolgu("doku-bronz", [BRONZ[1]!, BRONZ[2]!, BRONZ[3]!], 67);

// 6) ahşap (Market rafı, referans 04): 64×16 yatay kalas, damar
{
  const W = 64, H = 16, t = new Tuval(W, H), n = gurultu(W, H, 8, 71), n2 = gurultu(W, H, 2, 72);
  const AH = [0x3a2312, 0x4f3019, 0x6b4226, 0x8a5a34, 0xa8784a];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (y === 0) { t.nokta(x, y, AH[4]!); continue; }
    if (y === H - 1) { t.nokta(x, y, AH[0]!); continue; }
    const damar = Math.sin((x / W) * Math.PI * 2 * 2 + y * 0.9 + n(x, y) * 3) * 0.15;
    t.nokta(x, y, ton(AH.slice(1, 4), 0.5 + damar + 0.3 * (n2(x, y) - 0.5), x, y));
  }
  dosyalar["ahsap"] = t;
}

// 7) blueprint ızgarası (Atölye, referans 03): 32×32, ince ızgara 8 px, ana çizgi 32 px
{
  const S = 32, t = new Tuval(S, S), n = gurultu(S, S, 8, 81);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let c = ton([0x0d1a30, 0x0f1e36, 0x11213b], 0.5 + 0.3 * (n(x, y) - 0.5), x, y);
    if (x % 8 === 0 || y % 8 === 0) c = 0x16294a;
    if (x === 0 || y === 0) c = 0x1d3760;
    t.nokta(x, y, c);
  }
  dosyalar["blueprint"] = t;
}

// 8) gece (Sonuç, referans 09): 128×128, seyrek pixel yıldız
{
  const S = 128, t = new Tuval(S, S), r = mulberry(91);
  t.dikdortgen(0, 0, S, S, 0x07070d);
  for (let k = 0; k < 40; k++) {
    const x = Math.floor(r() * S), y = Math.floor(r() * S), z = r();
    const c = z < 0.5 ? 0x3a3640 : z < 0.8 ? 0x8f877c : z < 0.93 ? 0xe8762f : 0xfcd35a;
    t.nokta(x, y, c);
    if (z > 0.96) { t.nokta(x + 1, y, c); t.nokta(x, y + 1, c); t.nokta(x + 1, y + 1, c); }
  }
  dosyalar["gece"] = t;
}

// 9) tapınak duvarı (İlk Çekirdek, referans 02): 96×48 iri blok, daha koyu
{
  const W = 96, H = 48, t = new Tuval(W, H), n = gurultu(W, H, 6, 101), n2 = gurultu(W, H, 2, 102);
  const R = [0x0c0b10, 0x121016, 0x18161d, 0x1e1b24];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = Math.floor(y / 24), yy = y % 24, kx = (x + (s ? 24 : 0)) % 48;
    if (yy === 23 || kx === 0) { t.nokta(x, y, 0x08070b); continue; }
    t.nokta(x, y, ton(R, 0.3 + 0.45 * n(x, y) + 0.2 * n2(x, y) - (yy > 20 ? 0.2 : 0), x, y));
  }
  dosyalar["tapinak"] = t;
}

// 10) ikonlar (pixel sprite, 4 tonlu rampa): element 6 × 11×11, kilit 11×11, sikke 8×8, ◄ 7×9, kalkan 13×15
// harf haritası: . boş, o dış çizgi (koyu), m orta, a açık, v vurgu
function sprite(sat: string[], ramp: Record<string, number>): Tuval {
  const t = new Tuval(sat[0]!.length, sat.length);
  sat.forEach((s, y) => [...s].forEach((ch, x) => { if (ramp[ch] !== undefined) t.nokta(x, y, ramp[ch]!); }));
  return t;
}
const rampa = (koyu: number, orta: number, acik: number, vurgu: number) => ({ o: koyu, m: orta, a: acik, v: vurgu, k: 0x0a0910 });
const ELEMENT_IKON: Record<string, [string[], Record<string, number>]> = {
  kor: [[
    "....o......",
    "...omo.....",
    "...omao..o.",
    "..omaao.omo",
    "..omavaomao",
    ".omavvaamao",
    ".omavvvamo.",
    "omaavvvamo.",
    "omaavvaamo.",
    ".omaaaamo..",
    "..ooooo....",
  ], rampa(0x7a1d12, 0xe8452c, 0xff8a5c, 0xffd2a8)],
  kasirga: [[
    "ooooooooooo",
    "ommmaaavvmo",
    ".ooooooooo.",
    ".ommaaavmo.",
    "..ooooooo..",
    "..omaavmo..",
    "...ooooo...",
    "...omavo...",
    "....ooo....",
    "....omo....",
    ".....o.....",
  ], rampa(0x1f6b52, 0x5bd1a5, 0x9cebc9, 0xe2fff2)],
  simsek: [[
    ".....oooo..",
    "....omvo...",
    "...omvao...",
    "..omvao....",
    ".omvaaoooo.",
    ".oooamvvmo.",
    "....omvao..",
    "...omvao...",
    "..omao.....",
    "..omo......",
    "..oo.......",
  ], rampa(0x8a6a08, 0xf7d83a, 0xfbe97f, 0xfffbe0)],
  girdap: [[
    "...ooooo...",
    "..ommmmmo..",
    ".omaaaaamo.",
    "omao...oamo",
    "omo.ooo.omo",
    "omo.ovo.omo",
    "omo..oo.omo",
    "omao...oamo",
    ".omaaaaamo.",
    "..ommmmo...",
    "...oooo....",
  ], rampa(0x14286b, 0x2a5bd7, 0x6f93ee, 0xcfdcff)],
  kaya: [[
    "...........",
    "....ooo....",
    "...omaao...",
    "..ommavao..",
    "..omoamao..",
    ".ommmmamao.",
    ".omomaamoo.",
    "ommmmmaammo",
    "omoommmmmmo",
    "ommmmmmmomo",
    ".ooooooooo.",
  ], rampa(0x45392a, 0x8a7458, 0xb8a283, 0xe6dbc6)],
  don: [[
    ".....o.....",
    "....oao....",
    "...oavmo...",
    "..oavvamo..",
    ".oavvaamo..",
    "oavvaaammo.",
    ".oaaaammo..",
    "..oaammo...",
    "...oamo....",
    "....oo.....",
    "...........",
  ], rampa(0x3b7d8f, 0x9fe3f5, 0xcff3fb, 0xffffff)],
};
{
  const adlar = Object.keys(ELEMENT_IKON);
  const t = new Tuval(11 * adlar.length, 11);
  adlar.forEach((ad, i) => { const [sat, r] = ELEMENT_IKON[ad]!; const s = sprite(sat, r); for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) { const j = (y * 11 + x) * 4; if (s.p[j + 3]) { const k = (y * t.w + x + i * 11) * 4; t.p.set(s.p.subarray(j, j + 4), k); } } });
  dosyalar["element"] = t;
}
dosyalar["kilit"] = sprite([
  "...ooooo...",
  "..ommmmmo..",
  "..oo...oo..",
  "..om...mo..",
  ".ooooooooo.",
  ".ovaaaaamo.",
  ".oaaaoaamo.",
  ".oaaakaamo.",
  ".ommmkmmmo.",
  ".ommmmmmmo.",
  ".ooooooooo.",
], { o: 0x3a2a10, m: 0xa87a14, a: 0xe0b64e, v: 0xfff0b0, k: 0x5a3f10 });
dosyalar["sikke"] = sprite([
  "..oooo..",
  ".ovaaao.",
  "ovaammmo",
  "oaamkmmo",
  "oamkmmmo",
  "oammmmko",
  ".ommmko.",
  "..oooo..",
], { o: 0x4a3208, m: 0xc9952a, a: 0xf7c948, v: 0xfff0b0, k: 0x8a5d0a });
dosyalar["geri"] = sprite([
  "....v",
  "...va",
  "..vaa",
  ".vaaa",
  "vaaaa",
  ".maaa",
  "..maa",
  "...ma",
  "....m",
], { v: 0xfffbe8, a: 0xfbf2c3, m: 0xd8c9a0 });
dosyalar["kalkan"] = sprite([
  "ooooooooooooo",
  "ovaaaaaaaaamo",
  "oammmmmmmmmko",
  "oam.......mko",
  "oam..ooo..mko",
  "oam.ovaao.mko",
  "oam.oammo.mko",
  "oam..ooo..mko",
  "oam.......mko",
  "oammmmmmmmmko",
  ".oammmmmmmko.",
  "..oammmmmko..",
  "...oammmko...",
  "....oamko....",
  ".....ooo.....",
], { o: 0x2a1a0e, m: 0x8f6538, a: 0xc08e52, v: 0xe8c27a, k: 0x6b4a2a });

mkdirSync(CIKTI, { recursive: true });
let toplam = 0;
for (const [ad, t] of Object.entries(dosyalar)) { const b = t.png(); toplam += b.length; writeFileSync(`${CIKTI}/${ad}.png`, b); }
console.log(`${Object.keys(dosyalar).length} doku → ${CIKTI} (${toplam} B)`);
