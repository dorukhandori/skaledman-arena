// ART-1: topaç parça sprite hattı (3B → pixel). docs/art/topac-pixel-plani.md § 3, § 7.2-7.5; rapor docs/production/raporlar/ART-1.md.
//
//   npm run topac:uret                 # Blender render + pişirme + önizleme (tüm parçalar)
//   npm run topac:uret -- --parca ok-govde,hafif-disk   # yalnız bu parçalar (render + pişirme)
//   npm run topac:uret -- --render-yok # ham render önbelleğini (.cache/topac-ham) kullan, yalnız pişir
//   npm run topac:uret -- --motor blender  # veri render'ı Blender ile (varsayılan: başsız Chromium, GU-C)
//
// Adımlar:
//  1. Başsız Chromium (SwiftShader WebGL2, `topac-render-chromium.ts`; Atölye 3B ile aynı parametrik ağ) ya da
//     `--motor blender` ile Blender 4.x (`blender` PATH'te ya da BLENDER ortam değişkeni) `araclar/sanat/blender/topac_render.py` ile
//     `kaynak/topac/parcalar-3b.json` modellerini kurar, her parça için periyot başına 32 ince açıda ×4 çözünürlükte
//     ışıksız veri geçişi (normal + sınıf/derinlik) yazar.
//  2. Bu betik ×4'ü 1 sanat pikseline indirir (kapsama ≥ %50, sınıf çoğunluk oyu, normal ortalaması), sabit sol-üst
//     nokta ışıkla Lambert + parlama hesaplar, 4 tonlu rampaya Bayer 4×4 dither ile kuantize eder, derinlik
//     süreksizliğine iç çizgi ve 1 px koyu dış çizgi ekler. Hız kademeleri (§ 3.4): keskin 8 kare (her 4. ince açı),
//     bulanık 8 kare (ince açıların hareket penceresi ortalaması → palete geri kuantize, saydamlık dither'lı),
//     bulanık disk 3 kare (0,85 periyot ortalaması).
//  3. Gövde 6 Element boyasıyla (renkler.ts ELEMENT_RENK), Çekirdek kendi Element + Köken boyasıyla, Disk ve Uç metal
//     boyalı sayfalara paketlenir: public/topac/<tur>/<parcaId>[-<element>].png, meta veri/topac-gorsel.json.
//  4. İkonlar (Atölye/Market): aynı modellerin 48×48 ve 24×24 eğik tek kare render'ı → public/topac/ikon-48.png,
//     ikon-24.png (+ meta aynı json'da).
//  5. Önizleme: docs/art/topac-sprite-onizleme.png (kontakt levha, ×4 büyütme).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { ELEMENT_RENK, KOKEN_RENK, renkKaristir } from "../../src/istemci/oyun/renkler.ts";
import { KAMERA } from "../../src/istemci/oyun/kamera.ts";
import type { ElementAdi, KokenAdi } from "../../src/paylasilan/kurallar/ayar.ts";
import { chromiumRender, type RenderAyar } from "./topac-render-chromium.ts";

const KOK = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HAM = join(KOK, ".cache", "topac-ham");
const CIKTI = join(KOK, "public", "topac");
const META = join(KOK, "veri", "topac-gorsel.json");

/** Sanat kamerası. 1 sprite pikseli = 1 sanat pikseli maçta: topaç kökü ×1,2, dünya ×1,44, pixel önbelleği ×0,5. */
export const SANAT = {
  /** GU-C: 26° → 36°: üst yüz (eş merkezli sırtlar + amblem) referans 07 gibi okunur, yan bant hâlâ görünür */
  yukselti: 36,
  birim: 1 / (KAMERA.topacCizimOlcek * KAMERA.yakinlik * KAMERA.pikselCozunurluk),
  kareW: 64,
  kareH: 64,
  capaX: 32,
  capaY: 54,
  superOrnek: 4,
  inceKare: 32,
  periyotKare: 8,
  diskKare: 3,
  /** bulanık kanat penceresi: periyodun bu oranı ya da en çok 40° (§ 3.4 ±30° alt-örnekleme birikimi) */
  bulanikPencere: 0.34,
  bulanikEnCok: 40,
  diskPencere: 0.85,
  govdeTabanZ: 16,
  /** GU-C: sprite render'ında yatay ölçek (Çekirdek amblemi okunsun diye ×1,7, referans 07 orta rozeti ≈ çapın %45i; Atölye 3B modeli değişmez) */
  xyOlcek: { cekirdek: 1.7 } as Record<string, number>,
} as const;

const IKON = [
  { ad: "ikon48", kare: 48, yukselti: 42 },
  { ad: "ikon24", kare: 24, yukselti: 42 },
] as const;
/** ikon karesine sığdırma: birim/piksel (tür başına) ve dikey çapa kayması */
const IKON_BIRIM: Record<Tur, number> = { govde: 1.5, disk: 1.45, uc: 0.5, cekirdek: 0.42 };
const IKON_DY: Record<Tur, number> = { govde: 11, disk: 8, uc: 9, cekirdek: 18 };

type Tur = "govde" | "disk" | "uc" | "cekirdek";
type Sinif = "boya" | "boya2" | "metal" | "koyu" | "altin" | "kubbe" | "cerceve" | "lastik" | "beyaz" | "amblem";
const SINIF_AD: Sinif[] = ["boya", "boya", "boya2", "metal", "koyu", "altin", "kubbe", "cerceve", "lastik", "beyaz", "amblem"];
/** GU-C: Çekirdek amblemi (pişirmede üst yüze basılır; render sınıfı değil) */
const AMBLEM_KOD = 10;
const ELEMENTLER: ElementAdi[] = ["kor", "kasirga", "simsek", "girdap", "kaya", "don"];

interface Parca3B { tur: Tur; simetri: number; kiral?: boolean; profil?: number[][]; R0?: number; [k: string]: unknown }
interface KatalogParca { id: string; ad: string; tur: Tur; element: ElementAdi | null; koken?: KokenAdi; kanat?: number; yukseklik?: number }

// ------------------------------------------------------------------ palet

/** 5 tonlu rampa: [çizgi, koyu, orta, açık, vurgu] */
type Rampa = [number, number, number, number, number];

// GU-C: metal koyulaştı (Disk Gövde'nin altında gölgede kalır; açık gri "su birikintisi" gibi okunuyordu)
const METAL: Rampa = [0x121519, 0x2b3238, 0x4b555c, 0x78848b, 0xb9c4c9];
const KOYU: Rampa = [0x101316, 0x23282d, 0x3a4248, 0x5c666d, 0x96a1a7];
const ALTIN: Rampa = [0x452c0a, 0x8a5a14, 0xc8902a, 0xf2c447, 0xfff0b8];
const LASTIK: Rampa = [0x0e1012, 0x1d2125, 0x2d3237, 0x434a50, 0x5f686e];
const BEYAZ: Rampa = [0x3a4448, 0x9aa6ab, 0xd5dcdf, 0xf4f7f8, 0xffffff];

/** GU-C ton kaydırması (elle çizilmiş pixel art): gölge mora-koyuya, ışık sıcak sarıya kayar; orta ton belgedeki hex. */
const SICAK_ISIK = 0xffd36a, SOGUK_GOLGE = 0x2a0f3c;
function elementRampa(e: ElementAdi): Rampa {
  const r = ELEMENT_RENK[e];
  const koyu = renkKaristir(r.koyu, SOGUK_GOLGE, 0.18);
  return [renkKaristir(koyu, 0x0a0410, 0.55), koyu, r.orta, renkKaristir(r.acik, SICAK_ISIK, 0.3), renkKaristir(r.vurgu, 0xfff6d0, 0.35)];
}
function kokenRampa(k: KokenAdi): Rampa {
  const r = KOKEN_RENK[k];
  return [renkKaristir(r.ikinci, 0x000000, 0.62), renkKaristir(r.ikinci, 0x000000, 0.3), r.ikinci, r.isik, renkKaristir(r.isik, 0xffffff, 0.6)];
}

interface Boya { ad: string; element: ElementAdi | null; koken: KokenAdi | null }

function rampa(s: Sinif, b: Boya): Rampa {
  const e = b.element ?? "kor";
  switch (s) {
    case "boya": return elementRampa(e);
    case "boya2": { const r = elementRampa(e); return [r[0], r[0], r[1], r[2], r[3]]; }
    case "kubbe": { const r = elementRampa(e); return [r[0], r[1], r[3], r[4], 0xffffff]; }
    case "cerceve": return kokenRampa(b.koken ?? "goktasi");
    case "metal": return METAL;
    case "koyu": return KOYU;
    case "altin": return ALTIN;
    case "lastik": return LASTIK;
    case "beyaz": return BEYAZ;
    case "amblem": return elementRampa(b.element ?? "kor");
  }
}

// ------------------------------------------------------------------ ham render okuma ve ×4 indirgeme

interface Katman {
  w: number; h: number;
  a: Float32Array; // kapsama 0..1
  c: Uint8Array; // sınıf kodu (1..)
  n: Float32Array; // normal xyz
  d: Float32Array; // kamera derinliği (birim)
  px: Float32Array; // dünya konumu xyz
}

async function oku16(dosya: string): Promise<{ v: Uint16Array; w: number; h: number }> {
  const { data, info } = await sharp(dosya).toColorspace("rgb16").raw({ depth: "ushort" }).toBuffer({ resolveWithObject: true });
  return { v: new Uint16Array(data.buffer, data.byteOffset, data.length / 2), w: info.width, h: info.height };
}

interface Gorus { yukselti: number; birim: number; w: number; h: number; cx: number; cy: number }

function kameraVektor(g: Gorus): { C: number[]; d: number[]; u: number[] } {
  const e = (g.yukselti * Math.PI) / 180;
  const d = [0, Math.cos(e), -Math.sin(e)];
  const u = [0, Math.sin(e), Math.cos(e)];
  const dx = (g.cx - g.w / 2) * g.birim;
  const dy = (g.h / 2 - g.cy) * g.birim;
  return { C: [-dx, -dy * u[1]!, -dy * u[2]!], d, u };
}

async function katmanOku(onEk: string, g: Gorus, ss: number): Promise<Katman> {
  const N = await oku16(`${onEk}_n.png`);
  const V = await oku16(`${onEk}_v.png`);
  const W = N.w / ss, H = N.h / ss;
  const k: Katman = { w: W, h: H, a: new Float32Array(W * H), c: new Uint8Array(W * H), n: new Float32Array(W * H * 3), d: new Float32Array(W * H), px: new Float32Array(W * H * 3) };
  const kam = kameraVektor(g);
  const say = new Uint8Array(16);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let a = 0, nx = 0, ny = 0, nz = 0, dmin = 1e9;
      say.fill(0);
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const i = ((y * ss + sy) * N.w + (x * ss + sx)) * 4;
          const al = V.v[i + 3]! / 65535;
          if (al < 0.5) continue;
          a++;
          nx += N.v[i]! / 65535 * 2 - 1;
          ny += N.v[i + 1]! / 65535 * 2 - 1;
          nz += N.v[i + 2]! / 65535 * 2 - 1;
          const c = Math.round((V.v[i]! / 65535) * 16);
          say[c] = say[c]! + 1;
          const d = 120 + (V.v[i + 1]! / 65535) * 160;
          if (d < dmin) dmin = d;
        }
      }
      const j = y * W + x;
      k.a[j] = a / (ss * ss);
      if (a === 0) continue;
      let enc = 0, encS = -1;
      for (let c = 1; c < 16; c++) if (say[c]! > encS) { encS = say[c]!; enc = c; }
      k.c[j] = enc;
      const u = Math.hypot(nx, ny, nz) || 1;
      k.n[j * 3] = nx / u; k.n[j * 3 + 1] = ny / u; k.n[j * 3 + 2] = nz / u;
      k.d[j] = dmin;
      const sxw = (x + 0.5 - W / 2) * g.birim;
      const syw = (H / 2 - (y + 0.5)) * g.birim;
      const t = dmin - 200;
      k.px[j * 3] = kam.C[0]! + sxw + kam.d[0]! * t;
      k.px[j * 3 + 1] = kam.C[1]! + kam.u[1]! * syw + kam.d[1]! * t;
      k.px[j * 3 + 2] = kam.C[2]! + kam.u[2]! * syw + kam.d[2]! * t;
    }
  }
  return k;
}

// ------------------------------------------------------------------ gölgeleme (toon) ve çizgi

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x: number, y: number): number => BAYER[(y & 3) * 4 + (x & 3)]!;

/** Sabit nokta ışık: sol üst, öne doğru (referans 07: parlak sol üst, koyu sağ alt). */
// GU-C: eşikler düştü: üst yüz açık tonda (referans 07'de üst yüz parlak turuncu, yan bant koyu)
export const ISIK = { konum: [-75, -60, 120], ortam: 0.18, esik: [0.5, 0.71], parlamaUs: 26, parlamaEsik: 0.62, dither: 0.025 };
const PARLAK: Partial<Record<Sinif, number>> = { boya: 1, metal: 1.15, altin: 1.1, kubbe: 1.2, cerceve: 1, beyaz: 1 };

/**
 * GU-C: Element amblemi, ekran pikseliyle elle çizilmiş 15×9 (`#` koyu, `o` vurgu, `.` rozet zemini açık ton). Çekirdek üst
 * yüzündeki rozetin (dünya yarıçapı AMBLEM_R içi, yukarı bakan yüz) ağırlık merkezine basılır: dönmez (pixel planı § 2.2
 * "sabit parlama" gibi), bu yüzden bulanık karelerde de keskin kalır. Referans 07'deki alev / sarmal okuması. Özgün çizim
 * (CC0, bu depo); canon amblem yok.
 */
const AMBLEMLER: Record<ElementAdi, string[]> = {
  kor: [
    ".......#.......",
    "......##...#...",
    "..#...###..##..",
    "..##.#####.##..",
    "...#########...",
    "...####o####...",
    "....##ooo##....",
    ".....##o##.....",
    "......###......",
  ],
  girdap: [
    "....######.....",
    "..##......##...",
    ".#...####...#..",
    "#...#....#...#.",
    "#..#..##..#..#.",
    "#...#...##...#.",
    ".#...###....#..",
    "..##.......#...",
    "....#######....",
  ],
  kasirga: [
    ".#############.",
    "...............",
    "...#########...",
    "...............",
    ".....######....",
    "......####.....",
    ".......###.....",
    "........##.....",
    ".........#.....",
  ],
  simsek: [
    "........####...",
    ".......####....",
    "......####.....",
    ".....#######...",
    "....#######....",
    ".......###.....",
    "......###......",
    ".....##........",
    "....#..........",
  ],
  kaya: [
    "......###......",
    ".....#####.....",
    "....###o###....",
    "..#####oo####..",
    ".####o#######..",
    ".###oo###o####.",
    "###############",
    ".#############.",
    "...............",
  ],
  don: [
    ".......#.......",
    "...#...#...#...",
    "....#..#..#....",
    ".....#####.....",
    ".#############.",
    ".....#####.....",
    "....#..#..#....",
    "...#...#...#...",
    ".......#.......",
  ],
};
/** amblem yarıçapı (topaç birimi; Çekirdek üst yüzü ~9-11) ve üst yüz eşiği (normal z) */
const AMBLEM_R = 10.4, AMBLEM_NZ = 0.55;
/** sırt/oluk çizgisi: komşu normaller arası açı eşikleri (cos) */
const OLUK = { guclu: 0.6, hafif: 0.72 };

/** Piksel kodu: 0 saydam; aksi halde sinif * 8 + ton (ton 0 çizgi, 1 koyu .. 4 vurgu). */
function golgele(k: Katman, yukselti: number, icCizgi = true, amblem: string[] | null = null, enCokTon = 4, amblemR = AMBLEM_R): Uint8Array {
  const { w, h } = k;
  const out = new Uint8Array(w * h);
  const deger = new Float32Array(w * h);
  const e = (yukselti * Math.PI) / 180;
  const Vx = 0, Vy = -Math.cos(e), Vz = Math.sin(e);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const j = y * w + x;
      if (k.a[j]! < 0.5) continue;
      const c = k.c[j]!;
      const s = SINIF_AD[c] ?? "boya";
      const nx = k.n[j * 3]!, ny = k.n[j * 3 + 1]!, nz = k.n[j * 3 + 2]!;
      let lx = ISIK.konum[0]! - k.px[j * 3]!, ly = ISIK.konum[1]! - k.px[j * 3 + 1]!, lz = ISIK.konum[2]! - k.px[j * 3 + 2]!;
      const lu = Math.hypot(lx, ly, lz);
      lx /= lu; ly /= lu; lz /= lu;
      const dif = Math.max(0, nx * lx + ny * ly + nz * lz);
      let v = ISIK.ortam + (1 - ISIK.ortam) * dif;
      v += (bayer(x, y) - 0.5) * 2 * ISIK.dither;
      let ton = v < ISIK.esik[0]! ? 1 : v < ISIK.esik[1]! ? 2 : 3;
      const p = PARLAK[s];
      if (p) {
        let hx = lx + Vx, hy = ly + Vy, hz = lz + Vz;
        const hu = Math.hypot(hx, hy, hz);
        hx /= hu; hy /= hu; hz /= hu;
        const sp = Math.pow(Math.max(0, nx * hx + ny * hy + nz * hz), ISIK.parlamaUs) * p;
        if (sp + (bayer(x + 2, y + 1) - 0.5) * 0.12 > ISIK.parlamaEsik) ton = 4;
      }
      out[j] = c * 8 + Math.min(ton, enCokTon);
      deger[j] = v;
    }
  }
  // GU-C oluk çizgileri: üst yüzde normal kırığı (eş merkezli sırtlar, pahlar) koyu çizgi; komşudan karanlık olan piksele
  if (icCizgi) {
    const kopya = out.slice();
    for (let y = 1; y < h; y++) {
      for (let x = 1; x < w; x++) {
        const j = y * w + x;
        if (!kopya[j]) continue;
        for (const q of [j - w, j - 1]) {
          if (!kopya[q] || (kopya[q]! >> 3) !== (kopya[j]! >> 3)) continue;
          const d = k.n[j * 3]! * k.n[q * 3]! + k.n[j * 3 + 1]! * k.n[q * 3 + 1]! + k.n[j * 3 + 2]! * k.n[q * 3 + 2]!;
          if (d >= OLUK.hafif || Math.max(k.n[j * 3 + 2]!, k.n[q * 3 + 2]!) < 0.35) continue;
          const hedef = deger[j]! <= deger[q]! ? j : q;
          const c = kopya[hedef]! >> 3;
          out[hedef] = c * 8 + (d < OLUK.guclu ? 0 : Math.min(1, kopya[hedef]! & 7));
        }
      }
    }
  }
  if (amblem) {
    // rozet maskesi: Çekirdek üst yüzünde dünya yarıçapı AMBLEM_R içi; amblem bu maskenin ağırlık merkezine ortalanır
    const rozet: number[] = [];
    let sx = 0, sy = 0;
    for (let j = 0; j < w * h; j++) {
      if (!out[j] || k.n[j * 3 + 2]! < AMBLEM_NZ) continue;
      const wx = k.px[j * 3]!, wy = k.px[j * 3 + 1]!;
      if ((wx * wx + wy * wy) / (amblemR * amblemR) > 0.92) continue;
      rozet.push(j); sx += j % w; sy += Math.floor(j / w);
    }
    if (rozet.length) {
      const AW = amblem[0]!.length, AH = amblem.length;
      const ox = Math.round(sx / rozet.length) - (AW >> 1), oy = Math.round(sy / rozet.length) - (AH >> 1);
      for (const j of rozet) {
        const ch = amblem[Math.floor(j / w) - oy]?.[(j % w) - ox];
        out[j] = AMBLEM_KOD * 8 + (ch === "#" ? 1 : ch === "o" ? 4 : 3);
      }
    }
  }
  if (icCizgi) {
    // derinlik süreksizliği: öndeki komşu ≥ 2,2 birim daha yakınsa arkadaki piksel çizgi olur (öndekinin sınıfıyla)
    const kopya = out.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const j = y * w + x;
        if (!kopya[j]) continue;
        let en = 0, enD = k.d[j]! - 3.0;
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const q = yy * w + xx;
          if (kopya[q] && k.d[q]! < enD) { enD = k.d[q]!; en = kopya[q]!; }
        }
        if (en) out[j] = (en >> 3) * 8;
      }
    }
  }
  return out;
}

type RGBA = Uint8ClampedArray;

function renklendir(kod: Uint8Array, boya: Boya): RGBA {
  const out = new Uint8ClampedArray(kod.length * 4);
  for (let j = 0; j < kod.length; j++) {
    const k = kod[j]!;
    if (!k) continue;
    const r = rampa(SINIF_AD[k >> 3] ?? "boya", boya)[k & 7]!;
    out[j * 4] = (r >> 16) & 255; out[j * 4 + 1] = (r >> 8) & 255; out[j * 4 + 2] = r & 255; out[j * 4 + 3] = 255;
  }
  return out;
}

/** Ortalama (kapsama ağırlıklı) → palete geri kuantize; saydamlık Bayer ile (hayalet kanat). */
function bulaniklastir(kareler: RGBA[], palet: number[], w: number, h: number, opakEsik = 0.6, hayaletEsik = 0.22): RGBA {
  const out = new Uint8ClampedArray(w * h * 4);
  const pr = palet.map((c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255] as const);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const j = y * w + x;
      let r = 0, g = 0, b = 0, a = 0;
      for (const k of kareler) {
        const al = k[j * 4 + 3]! / 255;
        if (!al) continue;
        r += k[j * 4]! * al; g += k[j * 4 + 1]! * al; b += k[j * 4 + 2]! * al; a += al;
      }
      if (!a) continue;
      const kap = a / kareler.length;
      const bt = bayer(x, y);
      const opak = kap >= opakEsik || (kap >= hayaletEsik && bt < (kap - hayaletEsik) / (opakEsik - hayaletEsik));
      if (!opak) continue;
      r /= a; g /= a; b /= a;
      const sap = (bt - 0.5) * 22;
      let en = 0, enD = 1e12;
      for (let i = 0; i < pr.length; i++) {
        const p = pr[i]!;
        const dr = r + sap - p[0], dg = g + sap - p[1], db = b + sap - p[2];
        const dd = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
        if (dd < enD) { enD = dd; en = i; }
      }
      const p = pr[en]!;
      out[j * 4] = p[0]; out[j * 4 + 1] = p[1]; out[j * 4 + 2] = p[2]; out[j * 4 + 3] = 255;
    }
  }
  return out;
}

/** 1 px dış çizgi (4 komşulu): saydam pikselin opak komşusu varsa çizgi rengi. */
function disCizgi(img: RGBA, w: number, h: number, renk: number): RGBA {
  const out = img.slice();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const j = y * w + x;
      if (img[j * 4 + 3]) continue;
      let var_ = false;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        if (img[(yy * w + xx) * 4 + 3]) { var_ = true; break; }
      }
      if (var_) { out[j * 4] = (renk >> 16) & 255; out[j * 4 + 1] = (renk >> 8) & 255; out[j * 4 + 2] = renk & 255; out[j * 4 + 3] = 255; }
    }
  }
  return out;
}

// ------------------------------------------------------------------ parça pişirme

interface ParcaMeta {
  tur: Tur;
  simetri: number;
  periyotDerece: number;
  yonler: ("s" | "l")[];
  /** sayfa dosyası (public/ köküne göre); {boya} yer tutucusu Gövde için element adıyla değişir */
  sayfa: string;
  boyalar: ElementAdi[] | null;
  /** satır sırası: her yön için [keskin, bulanik, disk] */
  satir: Record<string, { keskin: number; bulanik: number; disk: number }>;
  /** çizim ölçüleri (topaç yerel birimi) */
  ustZ: number;
  disYaricap: number;
  bayt: number;
}

function anaSinif(t: Tur): Sinif {
  return t === "govde" ? "boya" : t === "disk" ? "metal" : t === "uc" ? "koyu" : "cerceve";
}

function paletBirlesik(siniflar: Set<number>, boya: Boya): number[] {
  const p = new Set<number>();
  for (const c of siniflar) for (const r of rampa(SINIF_AD[c] ?? "boya", boya)) p.add(r);
  return [...p];
}

async function pngYaz(dosya: string, rgba: RGBA, w: number, h: number): Promise<number> {
  mkdirSync(dirname(dosya), { recursive: true });
  const buf = await sharp(Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength), { raw: { width: w, height: h, channels: 4 } })
    .png({ palette: true, colours: 256, dither: 0, effort: 10, compressionLevel: 9 })
    .toBuffer();
  writeFileSync(dosya, buf);
  return buf.length;
}

function yapistir(hedef: RGBA, hw: number, kaynak: RGBA, kw: number, kh: number, ox: number, oy: number): void {
  for (let y = 0; y < kh; y++) {
    for (let x = 0; x < kw; x++) {
      const s = (y * kw + x) * 4;
      if (!kaynak[s + 3]) continue;
      const d = ((oy + y) * hw + (ox + x)) * 4;
      hedef[d] = kaynak[s]!; hedef[d + 1] = kaynak[s + 1]!; hedef[d + 2] = kaynak[s + 2]!; hedef[d + 3] = kaynak[s + 3]!;
    }
  }
}

function ustOlcu(spec: Parca3B): { ustZ: number; disYaricap: number } {
  const prof = (spec.profil as number[][] | undefined) ?? [[0, 0]];
  const tor = spec.torna as number[][] | undefined;
  if (tor) return { ustZ: tor[tor.length - 1]![1]!, disYaricap: Math.max(...tor.map((t) => t[0]!)) };
  const loblar = (spec.loblar as { genlik: number }[] | undefined) ?? [];
  return { ustZ: prof[prof.length - 1]![1]!, disYaricap: (spec.R0 ?? 0) + loblar.reduce((s, l) => s + Math.max(0, l.genlik), 0) };
}

async function parcaPisir(id: string, spec: Parca3B, kat: KatalogParca | undefined): Promise<{ meta: ParcaMeta; onizleme: Map<string, RGBA[][]> }> {
  const S = SANAT;
  const g: Gorus = { yukselti: S.yukselti, birim: S.birim, w: S.kareW, h: S.kareH, cx: S.capaX, cy: S.capaY };
  const yonler: ("s" | "l")[] = spec.kiral ? ["s", "l"] : ["s"];
  const M = S.inceKare, F = S.periyotKare;
  const periyot = 360 / spec.simetri;
  const boyalar: Boya[] = spec.tur === "govde"
    ? ELEMENTLER.map((e) => ({ ad: e, element: e, koken: null }))
    : spec.tur === "cekirdek"
      ? [{ ad: "", element: kat?.element ?? "kor", koken: kat?.koken ?? "goktasi" }]
      : [{ ad: "", element: null, koken: null }];
  const W = S.kareW, H = S.kareH;
  const satirSayisi = yonler.length * 3;
  const sayfalar = boyalar.map(() => new Uint8ClampedArray(F * W * satirSayisi * H * 4));
  const onizleme = new Map<string, RGBA[][]>();
  const satir: ParcaMeta["satir"] = {};
  const cizgiRenk = (b: Boya) => rampa(anaSinif(spec.tur), b)[0];
  for (let yi = 0; yi < yonler.length; yi++) {
    const yon = yonler[yi]!;
    satir[yon] = { keskin: yi * 3, bulanik: yi * 3 + 1, disk: yi * 3 + 2 };
    const ince: Uint8Array[] = [];
    const siniflar = new Set<number>();
    for (let k = 0; k < M; k++) {
      const kat_ = await katmanOku(join(HAM, spec.tur, id, yon, String(k).padStart(2, "0")), g, S.superOrnek);
      // Disk Gövde'nin altında gölgede: en açık ton 3 (vurgu yok) (referans 07'de Gövde altı koyu bant, gri "birikinti" değil)
      const kod = golgele(kat_, S.yukselti, true, spec.tur === "cekirdek" ? AMBLEMLER[kat?.element ?? "kor"] : null, spec.tur === "disk" ? 3 : 4);
      for (const v of kod) if (v) siniflar.add(v >> 3);
      ince.push(kod);
    }
    for (let bi = 0; bi < boyalar.length; bi++) {
      const b = boyalar[bi]!;
      const renkli = ince.map((k) => renklendir(k, b));
      const palet = paletBirlesik(siniflar, b);
      const sayfa = sayfalar[bi]!;
      const sw = F * W;
      const keskinler: RGBA[] = [], bulaniklar: RGBA[] = [], diskler: RGBA[] = [];
      const pencere = Math.max(2, Math.round(Math.min(periyot * S.bulanikPencere, S.bulanikEnCok) / (periyot / M)));
      for (let f = 0; f < F; f++) {
        const i0 = (f * M) / F;
        const kes = disCizgi(renkli[i0]!, W, H, cizgiRenk(b));
        // iz: kanat arkasında (dönüş yönünün tersine) ince açılar
        const pen: RGBA[] = [];
        for (let q = 0; q < pencere; q++) pen.push(renkli[(i0 - q + M * 4) % M]!);
        const bul = disCizgi(bulaniklastir(pen, palet, W, H), W, H, cizgiRenk(b));
        keskinler.push(kes); bulaniklar.push(bul);
        yapistir(sayfa, sw, kes, W, H, f * W, satir[yon].keskin * H);
        yapistir(sayfa, sw, bul, W, H, f * W, satir[yon].bulanik * H);
      }
      const dp = Math.round(M * S.diskPencere);
      for (let f = 0; f < S.diskKare; f++) {
        const pen: RGBA[] = [];
        const bas = Math.round((f * M) / S.diskKare);
        for (let q = 0; q < dp; q++) pen.push(renkli[(bas + q) % M]!);
        const dk = disCizgi(bulaniklastir(pen, palet, W, H, 0.5, 0.3), W, H, cizgiRenk(b));
        diskler.push(dk);
        yapistir(sayfa, sw, dk, W, H, f * W, satir[yon].disk * H);
      }
      onizleme.set(`${b.ad || "-"}:${yon}`, [keskinler, bulaniklar, diskler]);
    }
  }
  let bayt = 0;
  const ad = spec.tur === "govde" ? `${spec.tur}/${id}-{boya}.png` : `${spec.tur}/${id}.png`;
  for (let bi = 0; bi < boyalar.length; bi++) {
    bayt += await pngYaz(join(CIKTI, ad.replace("{boya}", boyalar[bi]!.ad)), sayfalar[bi]!, F * W, satirSayisi * H);
  }
  const o = ustOlcu(spec);
  return {
    meta: { tur: spec.tur, simetri: spec.simetri, periyotDerece: periyot, yonler, sayfa: ad, boyalar: spec.tur === "govde" ? ELEMENTLER : null, satir, ustZ: o.ustZ, disYaricap: o.disYaricap, bayt },
    onizleme,
  };
}

// ------------------------------------------------------------------ ikonlar

async function ikonPisir(idler: string[], specler: Record<string, Parca3B>, katalog: Map<string, KatalogParca>): Promise<Record<string, unknown>> {
  const sonuc: Record<string, unknown> = {};
  for (const ik of IKON) {
    const n = idler.length;
    const sutun = 8;
    const satirN = Math.ceil(n / sutun);
    const sw = sutun * ik.kare, sh = satirN * ik.kare;
    const sayfa = new Uint8ClampedArray(sw * sh * 4);
    const yer: Record<string, [number, number]> = {};
    for (let i = 0; i < n; i++) {
      const id = idler[i]!;
      const spec = specler[id]!;
      const kat = katalog.get(id);
      const g: Gorus = { yukselti: ik.yukselti, birim: IKON_BIRIM[spec.tur] * (24 / ik.kare) * 2, w: ik.kare, h: ik.kare, cx: ik.kare / 2, cy: ik.kare / 2 + IKON_DY[spec.tur] * (ik.kare / 48) };
      const yol = join(HAM, spec.tur, id, `${ik.ad}-s`, "00");
      if (!existsSync(`${yol}_n.png`)) continue;
      const k = await katmanOku(yol, g, SANAT.superOrnek);
      const kod = golgele(k, ik.yukselti, ik.kare >= 48, spec.tur === "cekirdek" && ik.kare >= 48 ? AMBLEMLER[kat?.element ?? "kor"] : null, 4, AMBLEM_R / SANAT.xyOlcek.cekirdek!);
      const b: Boya = { ad: "", element: kat?.element ?? "kor", koken: kat?.koken ?? "goktasi" };
      const img = disCizgi(renklendir(kod, b), ik.kare, ik.kare, rampa(anaSinif(spec.tur), b)[0]);
      const x = (i % sutun) * ik.kare, y = Math.floor(i / sutun) * ik.kare;
      yapistir(sayfa, sw, img, ik.kare, ik.kare, x, y);
      yer[id] = [x, y];
    }
    const bayt = await pngYaz(join(CIKTI, `${ik.ad === "ikon48" ? "ikon-48" : "ikon-24"}.png`), sayfa, sw, sh);
    sonuc[ik.ad] = { sayfa: `${ik.ad === "ikon48" ? "ikon-48" : "ikon-24"}.png`, kare: ik.kare, boyut: [sw, sh], bayt, yer };
  }
  return sonuc;
}

// ------------------------------------------------------------------ önizleme (kontakt levha)

async function onizlemeYaz(sonuc: Map<string, { meta: ParcaMeta; onizleme: Map<string, RGBA[][]> }>, set: { govde: string; disk: string; uc: string; cekirdek: string }): Promise<void> {
  const W = SANAT.kareW, H = SANAT.kareH;
  const P = sonuc;
  const al = (id: string, boya: string, yon: string) => P.get(id)?.onizleme.get(`${boya}:${yon}`) ?? P.get(id)?.onizleme.get(`${boya}:s`);
  const diskMeta = P.get(set.disk)?.meta;
  const kayma = Math.round(((diskMeta ? diskMeta.ustZ : SANAT.govdeTabanZ) - SANAT.govdeTabanZ) * Math.cos((SANAT.yukselti * Math.PI) / 180) / SANAT.birim);
  const birlestir = (boya: string, kademe: number, f: number, yon = "s"): RGBA => {
    const out = new Uint8ClampedArray(W * H * 4);
    const katmanlar: [string, string, number][] = [[set.uc, "-", 0], [set.disk, "-", 0], [set.govde, boya, -kayma], [set.cekirdek, "-", -kayma]];
    for (const [id, b, dy] of katmanlar) {
      const o = al(id, b, yon);
      if (!o) continue;
      const kad = o[kademe]!;
      const kare = kad[f % kad.length]!;
      const kaydir = new Uint8ClampedArray(W * H * 4);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const yy = y - dy;
        if (yy < 0 || yy >= H) continue;
        for (let c = 0; c < 4; c++) kaydir[(y * W + x) * 4 + c] = kare[(yy * W + x) * 4 + c]!;
      }
      yapistir(out, W, kaydir, W, H, 0, 0);
    }
    return out;
  };
  const sutun = 8;
  const satirlar: RGBA[][] = [];
  // 1-3: Kor, keskin / bulanık / disk; 4: sol dönüş keskin; 5: 6 element keskin kare 0 + 2 ayrık katman
  for (let kd = 0; kd < 3; kd++) satirlar.push(Array.from({ length: kd === 2 ? SANAT.diskKare : sutun }, (_, f) => birlestir("kor", kd, f)));
  satirlar.push(Array.from({ length: sutun }, (_, f) => birlestir("kor", 0, f, "l")));
  satirlar.push(ELEMENTLER.map((e) => birlestir(e, 0, 1)));
  const tile = W + 4;
  const tw = sutun * tile, th = satirlar.length * tile;
  const levha = new Uint8ClampedArray(tw * th * 4);
  for (let i = 0; i < tw * th; i++) { levha[i * 4] = 0x4a; levha[i * 4 + 1] = 0x46; levha[i * 4 + 2] = 0x42; levha[i * 4 + 3] = 255; }
  satirlar.forEach((s, ri) => s.forEach((img, ci) => yapistir(levha, tw, img, W, H, ci * tile + 2, ri * tile + 2)));
  const olcek = 4;
  const bizim = await sharp(Buffer.from(levha.buffer), { raw: { width: tw, height: th, channels: 4 } }).resize(tw * olcek, th * olcek, { kernel: "nearest" }).png().toBuffer();
  // referans 07: turuncu topaç kırpıntısı (aynı sanat pikseli ölçeğine yakın: 07 ≈ 1376 px / 480 sanat px)
  const ref = join(KOK, "docs/design/beyblade/gorunum/07-arena-mac.jpg");
  const refK = await sharp(ref).extract({ left: 548, top: 318, width: 160, height: 140 }).resize(Math.round(160 / 2.87 * olcek * 1.4), Math.round(140 / 2.87 * olcek * 1.4), { kernel: "nearest" }).png().toBuffer();
  const refM = await sharp(refK).metadata();
  const yan = 24;
  const genis = tw * olcek + yan + (refM.width ?? 0);
  await sharp({ create: { width: genis, height: Math.max(th * olcek, refM.height ?? 0), channels: 4, background: "#2a2826" } })
    .composite([{ input: bizim, left: 0, top: 0 }, { input: refK, left: tw * olcek + yan, top: 0 }])
    .png()
    .toFile(join(KOK, "docs/art/topac-sprite-onizleme.png"));
}

// ------------------------------------------------------------------ ana

async function main(): Promise<void> {
  const arg = process.argv.slice(2);
  const parcaArg = arg.includes("--parca") ? arg[arg.indexOf("--parca") + 1]!.split(",") : [];
  const renderYok = arg.includes("--render-yok");
  const ikonYok = arg.includes("--ikon-yok");
  const motor = arg.includes("--motor") ? arg[arg.indexOf("--motor") + 1]! : "chromium";
  const specDosya = join(KOK, "kaynak/topac/parcalar-3b.json");
  const specler = (JSON.parse(readFileSync(specDosya, "utf8")) as { parcalar: Record<string, Parca3B> }).parcalar;
  const katalog = new Map((JSON.parse(readFileSync(join(KOK, "veri/parcalar.json"), "utf8")) as { parcalar: KatalogParca[] }).parcalar.map((p) => [p.id, p]));
  const idler = Object.keys(specler).filter((id) => !parcaArg.length || parcaArg.includes(id));
  if (!renderYok) {
    mkdirSync(HAM, { recursive: true });
    const ayar = {
      parcaDosyasi: specDosya,
      cikti: HAM,
      parcalar: idler,
      inceKare: SANAT.inceKare,
      superOrnek: SANAT.superOrnek,
      xyOlcek: SANAT.xyOlcek,
      kamera: { yukselti: SANAT.yukselti, kareBirim: SANAT.birim, kareW: SANAT.kareW, kareH: SANAT.kareH, capaX: SANAT.capaX, capaY: SANAT.capaY },
      ikonlar: ikonYok ? [] : IKON.map((ik) => ({ ad: ik.ad, kare: ik.kare, yukselti: ik.yukselti, kareBirim: Object.fromEntries(Object.entries(IKON_BIRIM).map(([t, b]) => [t, b * (24 / ik.kare) * 2])), capaDy: Object.fromEntries(Object.entries(IKON_DY).map(([t, d]) => [t, d * (ik.kare / 48)])) })),
    };
    writeFileSync(join(HAM, "ayar.json"), JSON.stringify(ayar, null, 1));
    const t0 = Date.now();
    if (motor === "chromium") {
      await chromiumRender({ ...ayar, specler: specler as RenderAyar["specler"] });
    } else {
      const blender = process.env.BLENDER ?? "blender";
      const r = spawnSync(blender, ["-b", "--factory-startup", "-P", join(KOK, "araclar/sanat/blender/topac_render.py"), "--", join(HAM, "ayar.json")], { encoding: "utf8", maxBuffer: 1 << 28 });
      if (r.status !== 0 || /Traceback|Error:/.test(r.stdout + r.stderr)) {
        console.error((r.stdout + r.stderr).split("\n").filter((s) => /Traceback|Error|File "|^\s/.test(s)).slice(-30).join("\n"));
        throw new Error(`Blender başarısız (kod ${r.status}); BLENDER ortam değişkeniyle yol verilebilir.`);
      }
    }
    console.log(`render: ${idler.length} parça, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  const eski = existsSync(META) ? (JSON.parse(readFileSync(META, "utf8")) as { parcalar?: Record<string, ParcaMeta> }) : {};
  const parcalar: Record<string, ParcaMeta> = { ...(eski.parcalar ?? {}) };
  const sonuc = new Map<string, { meta: ParcaMeta; onizleme: Map<string, RGBA[][]> }>();
  for (const id of idler) {
    const t0 = Date.now();
    const s = await parcaPisir(id, specler[id]!, katalog.get(id));
    sonuc.set(id, s);
    parcalar[id] = s.meta;
    console.log(`pişti: ${id} (${s.meta.yonler.join("+")}, ${(s.meta.bayt / 1024).toFixed(1)} KB, ${Date.now() - t0} ms)`);
  }
  const tumIdler = Object.keys(specler);
  const ikon = ikonYok ? (eski as { ikon?: unknown }).ikon : await ikonPisir(tumIdler, specler, katalog);
  const sirali = Object.fromEntries(tumIdler.filter((id) => parcalar[id]).map((id) => [id, parcalar[id]!]));
  const meta = {
    surum: 1,
    aciklama: "ART-1 topaç sprite atlas metası (araclar/sanat/topac-uret.ts üretir; elle düzenleme). Sayfalar public/topac/ altında, satır başına 8 kare (bulanık disk 3), kare 64×64, çapa = uç temas noktası.",
    kamera: { yukselti: SANAT.yukselti, birim: SANAT.birim, kare: [SANAT.kareW, SANAT.kareH], capa: [SANAT.capaX, SANAT.capaY], govdeTabanZ: SANAT.govdeTabanZ },
    periyotKare: SANAT.periyotKare,
    diskKare: SANAT.diskKare,
    zSirasi: ["uc", "disk", "govde", "cekirdek"],
    bicimB: (eski as { bicimB?: string[] }).bicimB ?? [],
    parcalar: sirali,
    ikon,
  };
  writeFileSync(META, JSON.stringify(meta, null, 1) + "\n");
  const set = { govde: "ok-govde", disk: "hafif-disk", uc: "duz-uc", cekirdek: "kor-goktasi" };
  if (Object.values(set).every((id) => sonuc.has(id))) await onizlemeYaz(sonuc, set);
  if (sonuc.size === tumIdler.length) await setLevhasi(sonuc, tumIdler, katalog);
}

/** Tüm parça seti: her parçanın keskin kare 0'ı (Gövde kendi katalog Element'inde) + sol ayna; ×3. */
async function setLevhasi(sonuc: Map<string, { meta: ParcaMeta; onizleme: Map<string, RGBA[][]> }>, idler: string[], katalog: Map<string, KatalogParca>): Promise<void> {
  const W = SANAT.kareW, H = SANAT.kareH, tile = W + 2;
  const turlar: Tur[] = ["govde", "disk", "uc", "cekirdek"];
  const satirlar = turlar.map((t) => idler.filter((id) => sonuc.get(id)!.meta.tur === t));
  const sutun = Math.max(...satirlar.map((s) => s.length)) * 2;
  const tw = sutun * tile, th = satirlar.length * tile;
  const levha = new Uint8ClampedArray(tw * th * 4);
  for (let i = 0; i < tw * th; i++) { levha[i * 4] = 0x4a; levha[i * 4 + 1] = 0x46; levha[i * 4 + 2] = 0x42; levha[i * 4 + 3] = 255; }
  satirlar.forEach((s, ri) => s.forEach((id, ci) => {
    const o = sonuc.get(id)!;
    const boya = o.meta.tur === "govde" ? (katalog.get(id)?.element ?? "kor") : "-";
    for (const [k, yon] of [[0, "s"], [1, "l"]] as const) {
      const set = o.onizleme.get(`${boya}:${yon}`);
      if (!set) continue;
      yapistir(levha, tw, set[0]![1]!, W, H, (ci * 2 + k) * tile + 1, ri * tile + 1);
    }
  }));
  await sharp(Buffer.from(levha.buffer), { raw: { width: tw, height: th, channels: 4 } }).resize(tw * 3, th * 3, { kernel: "nearest" }).png().toFile(join(KOK, "docs/art/topac-parca-seti.png"));
}

await main();
