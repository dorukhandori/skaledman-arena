import parcalar3bHam from "../../../kaynak/topac/parcalar-3b.json";

// Atölye 3B (ATOLYE3D): topaç parçalarının parametrik geometrisi, saf TypeScript (three.js'siz; birim test edilir).
// Kaynak tanım: kaynak/topac/parcalar-3b.json (ART-1). Algoritma araclar/sanat/blender/topac_render.py ile aynıdır:
//   - kutupsal gövde (Gövde, Disk, Çekirdek): üst yüz r = t * R(th) yükseklik alanı (profil + halka + sırt + faset + kubbe
//     + kenar pahı), dış duvar [ölçek, z] halkaları, alt kapak;
//   - torna (Uç): eksenel profil [[r, z, sınıf], ...], nervür (r modülasyonu).
// Blender betiği sprite için 360×56 örnek kullanır; çalışma zamanında 120×28 yeter (320×360 piksellik hedefte fark okunmaz).
// Çıktı: indekssiz üçgenler (yüz başına sınıf düz kalsın), pürüzsüz köşe normalleri (indeksli ağdan alan ağırlıklı).
// Eksen: tanım z yukarı; çıktı three.js düzeninde y yukarı: (x, y, z) → (x, z, −y) (dönme, sarım yönü korunur).

export type Sinif = "boya" | "boya2" | "metal" | "koyu" | "altin" | "kubbe" | "cerceve" | "lastik" | "beyaz";
/** Sınıf kodu (blender SINIF ile aynı): 1 boya … 9 beyaz */
export const SINIF_KOD: Record<Sinif, number> = { boya: 1, boya2: 2, metal: 3, koyu: 4, altin: 5, kubbe: 6, cerceve: 7, lastik: 8, beyaz: 9 };
export const SINIF_SAYISI = 10;

export type ParcaTuru = "govde" | "disk" | "uc" | "cekirdek";

export interface Lob { n: number; genlik: number; bicim: "supurme" | "tarak" | "sivri" | "kare" | "centik"; faz?: number; p?: number; a?: number; b?: number; q?: number; w?: number; kenar?: number; merkez?: number }
interface Halka { r0: number; r1: number; yukseklik: number; sinif?: Sinif; pah?: number }
interface Sirt { n: number; r0?: number; r1?: number; genislik: number; yukseklik: number; kivrim?: number; faz?: number; profil?: string; ucIncelme?: number; sinif?: Sinif; genisleme?: number }
interface Faset { n: number; tepe: number; egim: number; r1: number; faz?: number; sinif?: Sinif }
interface Kubbe { r: number; taban: number; yukseklik: number; sinif?: Sinif }
interface Bolge { kenardan?: number; enAzR?: number; r0?: number; r1?: number; sinif: Sinif }

export interface Parca3B {
  tur: ParcaTuru;
  simetri: number;
  kiral?: boolean;
  R0?: number;
  loblar?: Lob[];
  profil?: [number, number][];
  halkalar?: Halka[];
  sirtlar?: Sirt[];
  fasetler?: Faset[];
  kubbeler?: Kubbe[];
  bolgeler?: Bolge[];
  kenarPah?: [number, number];
  sinif?: Sinif;
  yanSinif?: Sinif;
  altSinif?: Sinif;
  zAlt?: number;
  duvar?: [number, number | null][];
  torna?: [number, number, Sinif][];
  nervur?: { n: number; genlik: number; bicim?: Lob["bicim"]; w?: number };
  puruzAci?: number;
}

export const PARCALAR_3B: Readonly<Record<string, Parca3B>> = (parcalar3bHam as unknown as { parcalar: Record<string, Parca3B> }).parcalar;

// ------------------------------------------------------------------ biçim işlevleri (radyan)

export function lobDegeri(lob: Lob, th: number): number {
  const n = lob.n;
  const faz = ((((th * n) / (2 * Math.PI) + (lob.faz ?? 0)) % 1) + 1) % 1;
  const A = lob.genlik;
  switch (lob.bicim) {
    case "supurme": {
      const p = lob.p ?? 0.62;
      if (faz < p) return A * (faz / p) ** (lob.a ?? 0.75);
      return A * (1 - (faz - p) / (1 - p)) ** (lob.b ?? 3);
    }
    case "tarak": return A * (0.5 + 0.5 * Math.cos(2 * Math.PI * (faz - 0.5))) ** (lob.q ?? 1);
    case "sivri": {
      const w = lob.w ?? 0.25;
      const d = Math.abs(faz - (lob.merkez ?? 0.5));
      return A * Math.max(0, 1 - d / w) ** (lob.q ?? 1);
    }
    case "kare": {
      const w = lob.w ?? 0.3, kenar = lob.kenar ?? 0.06, d = Math.abs(faz - 0.5);
      if (d < w / 2) return A;
      if (d < w / 2 + kenar) return A * (1 - (d - w / 2) / kenar);
      return 0;
    }
    case "centik": {
      const w = lob.w ?? 0.12, d = Math.abs(faz - 0.5);
      return -A * Math.max(0, 1 - d / w);
    }
  }
}

export function taslakR(s: Parca3B, th: number): number {
  let R = s.R0 ?? 0;
  for (const l of s.loblar ?? []) R += lobDegeri(l, th);
  return R;
}

function parcali(nok: [number, number][], x: number): number {
  if (x <= nok[0]![0]) return nok[0]![1];
  for (let i = 0; i < nok.length - 1; i++) {
    const [x0, y0] = nok[i]!, [x1, y1] = nok[i + 1]!;
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / Math.max(1e-9, x1 - x0);
  }
  return nok[nok.length - 1]![1];
}

function aciFarki(a: number, b: number): number {
  const d = (((a - b) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return d > Math.PI ? d - 2 * Math.PI : d;
}

const rad = (d: number) => (d * Math.PI) / 180;

/** Üst yüz yüksekliği ve sınıfı (r mutlak, th radyan, R o açıdaki taslak yarıçapı). */
export function ustYuzey(s: Parca3B, r: number, th: number, R: number): [number, Sinif] {
  let z = parcali(s.profil ?? [[0, 0]], r);
  let sinif: Sinif = s.sinif ?? "boya";
  for (const h of s.halkalar ?? []) {
    if (h.r0 <= r && r <= h.r1) {
      const pah = h.pah ?? 0.8;
      const k = pah > 0 ? Math.min(1, (r - h.r0) / pah, (h.r1 - r) / pah) : 1;
      z += h.yukseklik * Math.max(0, k);
      if (h.sinif) sinif = h.sinif;
    }
  }
  for (const sr of s.sirtlar ?? []) {
    const r0 = sr.r0 ?? 0, r1 = sr.r1 ?? 99;
    if (r0 <= r && r <= r1) {
      const merkez0 = rad(sr.faz ?? 0) + rad(sr.kivrim ?? 0) * (r - r0);
      const en = rad(sr.genislik) * (1 + (sr.genisleme ?? 0) * (r - r0));
      let enk = 1e9;
      for (let i = 0; i < sr.n; i++) enk = Math.min(enk, Math.abs(aciFarki(th, merkez0 + (i * 2 * Math.PI) / sr.n)));
      if (enk < en) {
        const u = enk / en;
        const prof = sr.profil ?? "duz";
        let k = prof === "duz" ? (u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3) : Math.cos((u * Math.PI) / 2);
        const uc = sr.ucIncelme ?? 0;
        if (uc > 0 && r1 - r < uc) k *= (r1 - r) / uc;
        z += sr.yukseklik * k;
        if (sr.sinif && k > 0.5) sinif = sr.sinif;
      }
    }
  }
  for (const f of s.fasetler ?? []) {
    if (r <= f.r1) {
      let enb = -Infinity;
      for (let i = 0; i < f.n; i++) enb = Math.max(enb, Math.cos(aciFarki(th, rad(f.faz ?? 0) + (i * 2 * Math.PI) / f.n)));
      z = Math.max(z, f.tepe - f.egim * r * enb);
      if (f.sinif) sinif = f.sinif;
    }
  }
  for (const k of s.kubbeler ?? []) {
    if (r <= k.r) {
      z = Math.max(z, k.taban + k.yukseklik * Math.sqrt(Math.max(0, 1 - (r / k.r) ** 2)));
      if (k.sinif) sinif = k.sinif;
    }
  }
  if (s.kenarPah) {
    const [w, d] = s.kenarPah;
    const kalan = R - r;
    if (kalan < w) z -= d * (1 - kalan / w);
  }
  for (const b of s.bolgeler ?? []) {
    if (R - r <= (b.kenardan ?? -1) && R >= (b.enAzR ?? 0)) sinif = b.sinif;
    if (b.r0 !== undefined && b.r1 !== undefined && b.r0 <= r && r <= b.r1) sinif = b.sinif;
  }
  return [z, sinif];
}

// ------------------------------------------------------------------ ağ kurucular (indeksli ara biçim)

interface Ag { V: number[]; F: number[][]; C: Sinif[] }

export interface Cozunurluk { nTh: number; nT: number }
export const COZUNURLUK: Record<ParcaTuru, Cozunurluk> = {
  govde: { nTh: 120, nT: 28 },
  disk: { nTh: 120, nT: 14 },
  cekirdek: { nTh: 60, nT: 14 },
  uc: { nTh: 48, nT: 0 },
};

function kutupsal(s: Parca3B, c: Cozunurluk): Ag {
  const { nTh, nT } = c;
  const V: number[] = [], F: number[][] = [], C: Sinif[] = [];
  const ekle = (x: number, y: number, z: number) => { V.push(x, y, z); return V.length / 3 - 1; };
  const ths = Array.from({ length: nTh }, (_, j) => (2 * Math.PI * j) / nTh);
  const Rs = ths.map((th) => taslakR(s, th));
  const ts = Array.from({ length: nT }, (_, i) => (i + 1) / nT);
  ekle(0, 0, ustYuzey(s, 0, 0, Rs[0]!)[0]);
  const halka: number[][] = [];
  for (const t of ts) {
    halka.push(ths.map((th, j) => { const r = t * Rs[j]!; return ekle(r * Math.cos(th), r * Math.sin(th), ustYuzey(s, r, th, Rs[j]!)[0]); }));
  }
  for (let j = 0; j < nTh; j++) {
    const j2 = (j + 1) % nTh;
    F.push([0, halka[0]![j]!, halka[0]![j2]!]);
    C.push(ustYuzey(s, ts[0]! * Rs[j]! * 0.5, ths[j]! + Math.PI / nTh, Rs[j]!)[1]);
  }
  for (let i = 0; i < nT - 1; i++) {
    const a = halka[i]!, b = halka[i + 1]!;
    for (let j = 0; j < nTh; j++) {
      const j2 = (j + 1) % nTh;
      F.push([a[j]!, b[j]!, b[j2]!, a[j2]!]);
      const tm = (ts[i]! + ts[i + 1]!) / 2, thm = ths[j]! + Math.PI / nTh, Rm = (Rs[j]! + Rs[j2]!) / 2;
      C.push(ustYuzey(s, tm * Rm, thm, Rm)[1]);
    }
  }
  const zAlt = s.zAlt ?? 0;
  const duvar = s.duvar ?? [[1, null], [1, zAlt + 1.5], [0.82, zAlt]];
  const ustKenar = halka[halka.length - 1]!;
  let onceki: number[] | null = null;
  for (const [olcek, zz] of duvar) {
    const idx = ths.map((_, j) => {
      const k = ustKenar[j]! * 3;
      const x = V[k]!, y = V[k + 1]!, z = V[k + 2]!;
      return zz === null ? ekle(x, y, z) : ekle(x * olcek, y * olcek, zz);
    });
    if (onceki) {
      for (let j = 0; j < nTh; j++) {
        const j2 = (j + 1) % nTh;
        F.push([onceki[j]!, idx[j]!, idx[j2]!, onceki[j2]!]);
        C.push(s.yanSinif ?? ustYuzey(s, Rs[j]! - 0.05, ths[j]!, Rs[j]!)[1]);
      }
    }
    onceki = idx;
  }
  const m = ekle(0, 0, zAlt);
  for (let j = 0; j < nTh; j++) {
    const j2 = (j + 1) % nTh;
    F.push([m, onceki![j2]!, onceki![j]!]);
    C.push(s.altSinif ?? "koyu");
  }
  return { V, F, C };
}

function torna(s: Parca3B, nTh: number): Ag {
  const V: number[] = [], F: number[][] = [], C: Sinif[] = [];
  const ekle = (x: number, y: number, z: number) => { V.push(x, y, z); return V.length / 3 - 1; };
  const prof = s.torna!;
  const nv = s.nervur;
  const ths = Array.from({ length: nTh }, (_, j) => (2 * Math.PI * j) / nTh);
  const rmod = (th: number) => (nv ? 1 + lobDegeri({ n: nv.n, genlik: nv.genlik, bicim: nv.bicim ?? "kare", w: nv.w ?? 0.4 }, th) : 1);
  ekle(0, 0, prof[0]![1]);
  const halkalar = prof.map(([r, z]) => ths.map((th) => { const rr = r > 0.5 ? r * rmod(th) : r; return ekle(rr * Math.cos(th), rr * Math.sin(th), z); }));
  for (let j = 0; j < nTh; j++) {
    const j2 = (j + 1) % nTh;
    F.push([0, halkalar[0]![j2]!, halkalar[0]![j]!]);
    C.push(prof[0]![2]);
  }
  for (let i = 0; i < prof.length - 1; i++) {
    const a = halkalar[i]!, b = halkalar[i + 1]!;
    for (let j = 0; j < nTh; j++) {
      const j2 = (j + 1) % nTh;
      F.push([a[j]!, a[j2]!, b[j2]!, b[j]!]);
      C.push(prof[i + 1]![2]);
    }
  }
  const m = ekle(0, 0, prof[prof.length - 1]![1]);
  const son = halkalar[halkalar.length - 1]!;
  for (let j = 0; j < nTh; j++) {
    const j2 = (j + 1) % nTh;
    F.push([m, son[j]!, son[j2]!]);
    C.push(prof[prof.length - 1]![2]);
  }
  return { V, F, C };
}

// ------------------------------------------------------------------ çıktı

export interface ParcaGeometrisi {
  /** indekssiz üçgen köşeleri, y yukarı */
  konum: Float32Array;
  normal: Float32Array;
  /** köşe başına sınıf kodu (üçgen içinde sabit) */
  sinif: Float32Array;
  kose: number;
  /** yatay yarıçap (en büyük), alt ve üst y */
  yaricap: number;
  yAlt: number;
  yUst: number;
}

/**
 * Parça geometrisi. `ayna`: sol dönüş için x aynası (kiral parça; sarım ters çevrilir, ışık aynalanmaz).
 * Normaller: alan ağırlıklı köşe ortalaması; keskin kenarlar duvar/üst yüz ayrı köşelerden gelir.
 */
export function parcaGeometrisi(s: Parca3B, ayna = false, c: Cozunurluk = COZUNURLUK[s.tur]): ParcaGeometrisi {
  const ag = s.torna ? torna(s, c.nTh) : kutupsal(s, c);
  const nV = ag.V.length / 3;
  const P = new Float64Array(nV * 3);
  for (let i = 0; i < nV; i++) {
    // (x, y, z) → (±x, z, −y)
    P[i * 3] = ayna ? -ag.V[i * 3]! : ag.V[i * 3]!;
    P[i * 3 + 1] = ag.V[i * 3 + 2]!;
    P[i * 3 + 2] = -ag.V[i * 3 + 1]!;
  }
  // üçgenle (dörtgen → 2), aynada sarım ters
  const tri: [number, number, number, Sinif][] = [];
  ag.F.forEach((f, k) => {
    const yuz = ayna ? [...f].reverse() : f;
    for (let i = 1; i < yuz.length - 1; i++) tri.push([yuz[0]!, yuz[i]!, yuz[i + 1]!, ag.C[k]!]);
  });
  const N = new Float64Array(nV * 3);
  for (const [a, b, d] of tri) {
    const ax = P[a * 3]!, ay = P[a * 3 + 1]!, az = P[a * 3 + 2]!;
    const ux = P[b * 3]! - ax, uy = P[b * 3 + 1]! - ay, uz = P[b * 3 + 2]! - az;
    const vx = P[d * 3]! - ax, vy = P[d * 3 + 1]! - ay, vz = P[d * 3 + 2]! - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const i of [a, b, d]) { N[i * 3] = N[i * 3]! + nx; N[i * 3 + 1] = N[i * 3 + 1]! + ny; N[i * 3 + 2] = N[i * 3 + 2]! + nz; }
  }
  const kose = tri.length * 3;
  const konum = new Float32Array(kose * 3), normal = new Float32Array(kose * 3), sinif = new Float32Array(kose);
  let yaricap = 0, yAlt = Infinity, yUst = -Infinity;
  let o = 0;
  for (const [a, b, d, sn] of tri) {
    for (const i of [a, b, d]) {
      const x = P[i * 3]!, y = P[i * 3 + 1]!, z = P[i * 3 + 2]!;
      konum[o * 3] = x; konum[o * 3 + 1] = y; konum[o * 3 + 2] = z;
      let nx = N[i * 3]!, ny = N[i * 3 + 1]!, nz = N[i * 3 + 2]!;
      const u = Math.hypot(nx, ny, nz);
      if (u > 1e-12) { nx /= u; ny /= u; nz /= u; } else { nx = 0; ny = 1; nz = 0; }
      normal[o * 3] = nx; normal[o * 3 + 1] = ny; normal[o * 3 + 2] = nz;
      sinif[o] = SINIF_KOD[sn];
      yaricap = Math.max(yaricap, Math.hypot(x, z));
      yAlt = Math.min(yAlt, y); yUst = Math.max(yUst, y);
      o++;
    }
  }
  return { konum, normal, sinif, kose, yaricap, yAlt, yUst };
}

/** Parça kimliğinden geometri (bilinmeyen kimlik: null). */
export function parcaGeometrisiId(id: string, ayna = false): ParcaGeometrisi | null {
  const s = PARCALAR_3B[id];
  return s ? parcaGeometrisi(s, ayna && !!s.kiral) : null;
}

/** Kanat / çıkıntı sayısı (parça kartı): Gövde ve Disk ana lobun n'i, Uç nervür, Çekirdek simetri. */
export function cikintiSayisi(id: string): number | null {
  const s = PARCALAR_3B[id];
  if (!s) return null;
  if (s.tur === "uc") return s.nervur?.n ?? s.simetri;
  return s.loblar?.[0]?.n ?? s.simetri;
}
