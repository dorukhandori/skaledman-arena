// Harita / Maden / Ocak 2B varlıkları: KODLA çizilmiş pixel art (docs/design/harita/10 § 3; sahip kararı 2026-11-06:
// bulut oturumunda kodla üretilebilenler). Dış kaynak, model, indirme yok: her piksel bu dosyadaki matrislerden; çıktı
// kendi üretimimiz (CC0, veri/manifest-gorsel.json `harita`). Palet takası (10 § 2): bir gri kalıp → 8 kademe rengi.
// Çalıştır: npm run harita:asset → public/harita/** (+ docs/production/raporlar/ekran/HARITA-ASSET-kontakt.png)
// Sanat hattı (Mac, Gemini/Tripo) gelirse aynı yollara daha iyi çizim konur; kod yolları değişmez.
// 2026-11-06: sanat turu geldi (harita_gemini.py, harita_piksel.py, harita_karakter.py). Bu betik üzerine yazar; yalnız
// `--yer-tutucu` ile çalışır (docs/production/raporlar/HARITA-SANAT.md).
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const KOK = "public/harita";
type RGBA = [number, number, number, number];
const hex = (h: string, a = 255): RGBA => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), a];
const SEFFAF: RGBA = [0, 0, 0, 0];
const KONTUR = hex("#0b1418");

/** Kademe renk dili (10 § 2): koyu, ana, vurgu. */
const KADEME = [
  { id: "demir", ana: "#8C8A88", koyu: "#4A4846", vurgu: "#C8C6C2" },
  { id: "kaya", ana: "#B0743A", koyu: "#45392A", vurgu: "#E6C08A" },
  { id: "don", ana: "#9FE3F5", koyu: "#3B7D8F", vurgu: "#FFFFFF" },
  { id: "kor", ana: "#E8452C", koyu: "#7A1D12", vurgu: "#FFD2A8" },
  { id: "kasirga", ana: "#5BD1A5", koyu: "#1F6B52", vurgu: "#E2FFF2" },
  { id: "simsek", ana: "#F7D83A", koyu: "#8A6A08", vurgu: "#FFFBE0" },
  { id: "girdap", ana: "#2A5BD7", koyu: "#14286B", vurgu: "#CFDCFF" },
  { id: "devir", ana: "#F4E9FF", koyu: "#6B5A8A", vurgu: "#FFFFFF" },
];
const BOLGE_RENK: Record<string, { ana: string; koyu: string; vurgu: string }> = {
  "ocak-yamaci": { ana: "#B0743A", koyu: "#45392A", vurgu: "#E6C08A" },
  "ayaz-gecidi": { ana: "#9FE3F5", koyu: "#3B7D8F", vurgu: "#FFFFFF" },
  "kor-kraterleri": { ana: "#E8452C", koyu: "#7A1D12", vurgu: "#FFD2A8" },
  "yel-sirti": { ana: "#5BD1A5", koyu: "#1F6B52", vurgu: "#E2FFF2" },
  "cakim-yaylasi": { ana: "#F7D83A", koyu: "#8A6A08", vurgu: "#FFFBE0" },
  "dip-magaralari": { ana: "#2A5BD7", koyu: "#14286B", vurgu: "#CFDCFF" },
};
const PROFIL_RENK = ["#f4cf47", "#e3350d", "#2fb8e8", "#7fe3a0", "#c58bff", "#f2a33a"];

class Tuval {
  readonly v: Uint8Array;
  constructor(readonly w: number, readonly h: number) { this.v = new Uint8Array(w * h * 4); }
  p(x: number, y: number, c: RGBA): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || c[3] === 0) return;
    this.v.set(c, (y * this.w + x) * 4);
  }
  dikd(x: number, y: number, w: number, h: number, c: RGBA): void { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.p(x + i, y + j, c); }
  /** Matris çiz: her karakter paletten renk; '.' saydam. */
  matris(x: number, y: number, satirlar: readonly string[], pal: Record<string, RGBA>): void {
    satirlar.forEach((s, j) => [...s].forEach((ch, i) => { if (ch !== "." && ch !== " ") this.p(x + i, y + j, pal[ch] ?? SEFFAF); }));
  }
  /** Kontur: saydam piksellerden dolu komşusu olanları KONTUR yap (dış çizgi). */
  kontur(c: RGBA = KONTUR): void {
    const dolu = (x: number, y: number) => x >= 0 && y >= 0 && x < this.w && y < this.h && this.v[(y * this.w + x) * 4 + 3]! > 0;
    const isaret: [number, number][] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (!dolu(x, y) && (dolu(x - 1, y) || dolu(x + 1, y) || dolu(x, y - 1) || dolu(x, y + 1))) isaret.push([x, y]);
    for (const [x, y] of isaret) this.p(x, y, c);
  }
  async yaz(yol: string): Promise<number> {
    mkdirSync(yol.slice(0, yol.lastIndexOf("/")), { recursive: true });
    await sharp(Buffer.from(this.v), { raw: { width: this.w, height: this.h, channels: 4 } }).png({ palette: true, compressionLevel: 9 }).toFile(yol);
    return statSync(yol).size;
  }
}

const cikti: { ad: string; dosya: string; olay: string; bayt: number }[] = [];
const kontakt: { ad: string; t: Tuval }[] = [];
async function kaydet(t: Tuval, ad: string, olay: string): Promise<void> {
  const dosya = `${KOK}/${ad}.png`;
  const bayt = await t.yaz(dosya);
  cikti.push({ ad, dosya: dosya.replace("public/", ""), olay, bayt });
  kontakt.push({ ad, t });
}

// ---------------- A1 düğüm türü ikonları (11×11; kontur kodla) ----------------
const DUGUM: Record<string, { satirlar: string[]; pal: Record<string, RGBA>; olay: string }> = {
  dusman: { olay: "Harita düğümü: DÜŞMAN (iki topaç çarpışıyor)", pal: { a: hex("#c0473a"), b: hex("#f08a6c"), c: hex("#6e2018"), w: hex("#ffe9c9") }, satirlar: [
    "...........",
    ".aa.....bb.",
    "abba...bccb",
    "abbaa.bbccb",
    ".aaaawbbbb.",
    "...awwww...",
    ".bbbbwaaaa.",
    "bccbb.aabba",
    "bccb...abba",
    ".bb.....aa.",
    "...........",
  ] },
  patron: { olay: "Harita düğümü: PATRON (taçlı topaç)", pal: { g: hex("#fcd35a"), h: hex("#b07a1a"), a: hex("#8a3a8a"), b: hex("#c86ac8"), c: hex("#4a1a4a") }, satirlar: [
    "..g..g..g..",
    "..gg.g.gg..",
    "..ggggggg..",
    "..hhhhhhh..",
    "...........",
    "..aaabaaa..",
    ".aabbbbbaa.",
    "aaaabbbaaaa",
    ".ccaaaaacc.",
    "...ccacc...",
    ".....c.....",
  ] },
  maden: { olay: "Harita düğümü: MADEN (kazma)", pal: { m: hex("#c8c6c2"), n: hex("#7a7876"), s: hex("#8a5a34"), t: hex("#5a3a20") }, satirlar: [
    "...........",
    "..mmmmmm...",
    ".mnnnnnnm..",
    "mn...s..nm.",
    "m....s...m.",
    "....s......",
    "....s......",
    "...s.......",
    "...t.......",
    "..t........",
    "...........",
  ] },
  sandik: { olay: "Harita düğümü: SANDIK (kapalı)", pal: { a: hex("#8a5a34"), b: hex("#b07a4a"), c: hex("#5a3a20"), g: hex("#fcd35a") }, satirlar: [
    "...........",
    "..bbbbbbb..",
    ".baaaaaaab.",
    ".baaaaaaab.",
    ".ccccgcccc.",
    ".baaagaaab.",
    ".baaaaaaab.",
    ".baaaaaaab.",
    ".ccccccccc.",
    "...........",
    "...........",
  ] },
  "sandik-bos": { olay: "Harita düğümü: SANDIK (açık, boş)", pal: { a: hex("#8a5a34"), b: hex("#b07a4a"), c: hex("#5a3a20"), d: hex("#1b1206") }, satirlar: [
    ".bbbbbbb...",
    ".baaaaaab..",
    "..baaaaaab.",
    "...........",
    ".ccccccccc.",
    ".bdddddddb.",
    ".baaaaaaab.",
    ".baaaaaaab.",
    ".ccccccccc.",
    "...........",
    "...........",
  ] },
  kilit: { olay: "Düğüm durum katmanı: kilit", pal: { a: hex("#8c8a88"), b: hex("#c8c6c2"), k: hex("#2c3d43") }, satirlar: [
    "...........",
    "...bbbbb...",
    "..b.....b..",
    "..b.....b..",
    ".aaaaaaaaa.",
    ".aaaakaaaa.",
    ".aaaakaaaa.",
    ".aaaaaaaaa.",
    ".aaaaaaaaa.",
    "...........",
    "...........",
  ] },
};

// ---------------- A3/A4 cevher ve külçe kalıbı (16×16; 1 koyu, 2 ana, 3 vurgu) ----------------
const CEVHER = [
  "................",
  "................",
  "......2222......",
  "....22233222....",
  "...2223332222...",
  "..222233222221..",
  "..2222222222211.",
  ".22232222222211.",
  ".22333222222111.",
  ".2223222222211..",
  "..222222222111..",
  "..12222222111...",
  "...111222111....",
  ".....11111......",
  "................",
  "................",
];
const KULCE = [
  "................",
  "................",
  "................",
  "................",
  ".....33333333...",
  "....3222222223..",
  "...322222222221.",
  "..3222222222211.",
  "..1111111111211.",
  "..1222222222111.",
  "..1222222222211.",
  "..1111111111111.",
  "................",
  "................",
  "................",
  "................",
];
const kademePal = (k: (typeof KADEME)[number]): Record<string, RGBA> => ({ "1": hex(k.koyu), "2": hex(k.ana), "3": hex(k.vurgu) });

// ---------------- A5 Ustalık rozetleri (11×11) ----------------
const USTALIK: Record<string, { satirlar: string[]; olay: string }> = {
  madencilik: { olay: "Ustalık rozeti: Madencilik (kazma)", satirlar: DUGUM["maden"]!.satirlar },
  isleme: { olay: "Ustalık rozeti: İşleme (çekiç)", satirlar: [
    "...........",
    ".mmmmmm....",
    ".mnnnnm....",
    ".mmmmmm....",
    "....s......",
    "....s......",
    "....s......",
    "....s......",
    "....t......",
    "....t......",
    "...........",
  ] },
};

// ---------------- A6 arma (24×24 kalkan) / A7 çerçeve (24×24, 9-dilim: kenar 6) ----------------
function kalkan(t: Tuval, r: { ana: string; koyu: string; vurgu: string }): void {
  for (let y = 2; y < 22; y++) {
    const dar = y < 14 ? 0 : Math.round(((y - 14) * (y - 14)) / 9);
    for (let x = 3 + dar; x < 21 - dar; x++) t.p(x, y, x < 5 + dar || y < 4 ? hex(r.vurgu) : x > 18 - dar ? hex(r.koyu) : hex(r.ana));
  }
}
function motifCevher(t: Tuval, r: { ana: string; koyu: string; vurgu: string }): void {
  t.matris(7, 7, ["..kkkk..", ".kvvvak.", "kvvaaaak", "kvaaaaak", "kaaaaakk", ".kaaakk.", "..kkk..."], { k: KONTUR, v: hex(r.vurgu), a: hex(r.koyu) });
}
function motifKazma(t: Tuval): void {
  t.matris(7, 5, ["..kkkkk..", ".kmmmmmk.", "kmk.s.kmk", "kk..s..kk", "k...s...k", "....s....", "....s....", "....t....", "....t...."], { k: KONTUR, m: hex("#c8c6c2"), s: hex("#5a3a20"), t: hex("#3a2410") });
}
function motifHarf(t: Tuval, harf: string, r: { koyu: string }): void {
  // 5×7 rakam/harf: bölge armaları için element baş harfi (yer tutucu motif)
  const F: Record<string, string[]> = {
    K: ["k...k", "k..k.", "k.k..", "kk...", "k.k..", "k..k.", "k...k"],
    D: ["kkkk.", "k...k", "k...k", "k...k", "k...k", "k...k", "kkkk."],
    Y: ["k...k", "k...k", ".k.k.", "..k..", "..k..", "..k..", "..k.."],
    C: [".kkk.", "k...k", "k....", "k....", "k....", "k...k", ".kkk."],
  };
  t.matris(10, 8, F[harf] ?? F["K"]!, { k: hex(r.koyu) });
}
function cerceve(t: Tuval, r: { ana: string; koyu: string; vurgu: string }, desen: "duz" | "yildiz" | "krater" | "perci"): void {
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    const d = Math.min(x, y, 23 - x, 23 - y);
    if (d > 5) continue;
    let c = d === 0 || d === 5 ? KONTUR : d === 1 ? hex(r.vurgu) : d === 4 ? hex(r.koyu) : hex(r.ana);
    if (desen === "perci" && (d === 2 || d === 3) && (x + y) % 6 === 0) c = hex(r.vurgu);
    if (desen === "krater" && (d === 2 || d === 3) && (x * 7 + y * 3) % 11 === 0) c = hex(r.koyu);
    t.p(x, y, c);
  }
  if (desen === "yildiz") for (const [cx, cy] of [[2, 2], [21, 2], [2, 21], [21, 21]] as const) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) t.p(cx + dx, cy + dy, hex("#fcd35a"));
}

// ---------------- A8 Usta işi parıltısı (8 kare × 16×16) ----------------
function parilti(t: Tuval, kare: number): void {
  const ox = kare * 16;
  const r = [1, 2, 3, 4, 3, 2, 1, 0][kare]!;
  const c = hex("#fcd35a"), w = hex("#fff6d0");
  for (let i = -r; i <= r; i++) { t.p(ox + 8 + i, 8, Math.abs(i) < 2 ? w : c); t.p(ox + 8, 8 + i, Math.abs(i) < 2 ? w : c); }
  if (r >= 2) for (const [dx, dy] of [[1, 1], [-1, -1], [1, -1], [-1, 1]] as const) t.p(ox + 8 + dx * (r - 1), 8 + dy * (r - 1), c);
}

// ---------------- K1 karakter sayfası (16×24 hücre; 9×3; 4 gövde × 6 profil rengi) ----------------
/** Kareler: BEKLE 0–3, YÜRÜ 4–9, KAZ 10–15, DÖVÜŞE GİR 16–20, KUTLA 21–26 (13 § 2.2). */
export const KARAKTER_KARE = { bekle: [0, 4], yuru: [4, 6], kaz: [10, 6], dovus: [16, 5], kutla: [21, 6] } as const;
function karakterKare(t: Tuval, ox: number, oy: number, govde: number, renk: string, kare: number): void {
  const giysi = hex(renk);
  const giysiK: RGBA = [Math.round(giysi[0] * 0.6), Math.round(giysi[1] * 0.6), Math.round(giysi[2] * 0.6), 255];
  const ten = hex("#e9c9a0"), sac = hex("#3a2a1a"), pant = hex("#2a2f3a"), bot = hex("#151821");
  let bob = 0, kolX = 0, kolY = 0, bacak = 0, ust = 0;
  if (kare < 4) bob = kare === 2 ? 1 : 0;
  else if (kare < 10) { const k = kare - 4; bacak = [1, 2, 1, -1, -2, -1][k]!; bob = k % 3 === 1 ? 1 : 0; }
  else if (kare < 16) { const k = kare - 10; kolY = [-4, -6, -3, 1, 2, 0][k]!; ust = k === 3 ? 1 : 0; }
  else if (kare < 21) { const k = kare - 16; kolX = [0, -2, -3, 2, 4][k]!; kolY = [0, -2, -3, -1, 0][k]!; }
  else { const k = kare - 21; bob = [0, -2, -4, -2, 0, 0][k]!; kolY = [-2, -6, -7, -6, -2, 0][k]!; }
  const gw = govde === 1 ? 8 : govde === 3 ? 7 : 6;
  const gx = ox + 8 - Math.ceil(gw / 2);
  const by = oy + 4 + bob + ust;
  // baş (gövde 2: geniş baş + saç)
  const bw = govde === 2 ? 6 : 5;
  t.dikd(ox + 8 - Math.ceil(bw / 2), by, bw, 5, ten);
  t.dikd(ox + 8 - Math.ceil(bw / 2), by, bw, 2, sac);
  t.p(ox + 9, by + 3, KONTUR);
  // gövde
  const gh = govde === 3 ? 9 : 8;
  t.dikd(gx, by + 5, gw, gh, giysi);
  t.dikd(gx, by + 5 + gh - 2, gw, 2, giysiK);
  if (govde === 0) t.dikd(gx + 1, by + 6, gw - 2, 1, giysiK); // kemer çizgisi
  // bacaklar
  const ly = by + 5 + gh;
  const lh = Math.max(3, oy + 23 - ly);
  t.dikd(ox + 6 + Math.min(0, bacak), ly, 2, lh, pant);
  t.dikd(ox + 9 + Math.max(0, bacak), ly, 2, lh, pant);
  t.dikd(ox + 6 + Math.min(0, bacak), oy + 22, 2, 2, bot);
  t.dikd(ox + 9 + Math.max(0, bacak), oy + 22, 2, 2, bot);
  // kol + taşıdığı topaç (BEKLE'de elinde döner: 2 renk sırayla)
  const kx = gx + gw + kolX, ky = by + 7 + kolY;
  t.dikd(kx, ky, 2, 4, giysiK);
  if (kare >= 10 && kare < 16) {
    // kazma
    t.dikd(kx - 1, ky - 3, 1, 6, hex("#5a3a20"));
    t.dikd(kx - 3, ky - 4, 5, 1, hex("#c8c6c2"));
  } else {
    const d = kare % 2 === 0;
    t.dikd(kx + 1, ky + 3, 4, 2, d ? hex("#c8c6c2") : hex("#8c8a88"));
    t.p(kx + 3, ky + 5, KONTUR);
  }
}

async function ana(): Promise<void> {
  if (!process.argv.includes("--yer-tutucu")) {
    console.error("public/harita/** artık sanat hattından geliyor; yer tutucuya dönmek için: npm run harita:asset -- --yer-tutucu");
    process.exit(2);
  }
  // A1 + kilit
  for (const [ad, d] of Object.entries(DUGUM)) {
    const t = new Tuval(13, 13);
    t.matris(1, 1, d.satirlar, d.pal);
    t.kontur();
    await kaydet(t, `dugum/${ad}`, d.olay);
  }
  // A3/A4 + palet takası
  for (const [i, k] of KADEME.entries()) {
    for (const [tur, kalip] of [["cevher", CEVHER], ["kulce", KULCE]] as const) {
      const t = new Tuval(16, 16);
      t.matris(0, 0, kalip, kademePal(k));
      t.kontur();
      await kaydet(t, `maden/${tur}-${k.id}`, `${tur === "cevher" ? "Cevher" : "Külçe"} K${i + 1} ${k.id} (gri kalıp + palet takası)`);
    }
  }
  // A5
  for (const [ad, d] of Object.entries(USTALIK)) {
    const t = new Tuval(13, 13);
    t.matris(1, 1, d.satirlar, { m: hex("#c8c6c2"), n: hex("#7a7876"), s: hex("#8a5a34"), t: hex("#5a3a20") });
    t.kontur();
    await kaydet(t, `ustalik/${ad}`, d.olay);
  }
  // A6 arma: 8 kademe cevher arması + kazma + bölge armaları
  for (const k of KADEME) { const t = new Tuval(24, 24); kalkan(t, k); motifCevher(t, k); t.kontur(); await kaydet(t, `arma/arma-cevher-${k.id}`, `Arma: ${k.id} cevheri (Ocak tarifi)`); }
  { const t = new Tuval(24, 24); kalkan(t, KADEME[0]!); motifKazma(t); t.kontur(); await kaydet(t, "arma/arma-kazma", "Arma: kazma (Ocak Yamacı başarımı)"); }
  const HARF: Record<string, string> = { "ocak-yamaci": "K", "ayaz-gecidi": "D", "kor-kraterleri": "K", "yel-sirti": "Y", "cakim-yaylasi": "C", "dip-magaralari": "D" };
  for (const [b, r] of Object.entries(BOLGE_RENK)) { const t = new Tuval(24, 24); kalkan(t, r); motifHarf(t, HARF[b]!, r); t.kontur(); await kaydet(t, `arma/arma-${b}`, `Arma: ${b} (patron USTALAŞ)`); }
  { const t = new Tuval(24, 24); kalkan(t, BOLGE_RENK["dip-magaralari"]!); motifCevher(t, KADEME[6]!); t.kontur(); await kaydet(t, "arma/arma-dip", "Arma: Dip (sezon 2 başarımı)"); }
  // A7 çerçeve: 8 kademe + bölge + özel
  for (const k of KADEME) { const t = new Tuval(24, 24); cerceve(t, k, "perci"); await kaydet(t, `cerceve/cerceve-${k.id}`, `Çerçeve: ${k.id} (9-dilim, kenar 6)`); }
  for (const [b, r] of Object.entries(BOLGE_RENK)) { const t = new Tuval(24, 24); cerceve(t, r, "duz"); await kaydet(t, `cerceve/cerceve-${b}`, `Çerçeve: ${b} (GÜMÜŞ rozet)`); }
  for (const [ad, r, d] of [["krater", BOLGE_RENK["kor-kraterleri"]!, "krater"], ["yildiz", { ana: "#c9a33b", koyu: "#6b5418", vurgu: "#fcd35a" }, "yildiz"], ["koleksiyon", { ana: "#6b5a8a", koyu: "#2e2440", vurgu: "#f4e9ff" }, "perci"], ["usta-madenci", KADEME[0]!, "yildiz"], ["usta-ocakci", KADEME[3]!, "yildiz"]] as const) {
    const t = new Tuval(24, 24); cerceve(t, r, d); await kaydet(t, `cerceve/cerceve-${ad}`, `Çerçeve: ${ad}`);
  }
  // A8
  { const t = new Tuval(128, 16); for (let k = 0; k < 8; k++) parilti(t, k); await kaydet(t, "efekt/usta-isi", "Usta işi parıltısı (8 kare × 16×16)"); }
  // K1 karakter: 4 gövde × 6 renk, sayfa 9×3 hücre (16×24)
  for (let g = 0; g < 4; g++) for (const [ri, renk] of PROFIL_RENK.entries()) {
    const t = new Tuval(16 * 9, 24 * 3);
    for (let kare = 0; kare < 27; kare++) karakterKare(t, (kare % 9) * 16, Math.floor(kare / 9) * 24, g, renk, kare);
    t.kontur();
    await kaydet(t, `karakter/govde-${g}-renk-${ri}`, `Karakter sayfası: gövde ${g}, profil rengi ${ri} (27 kare: BEKLE 4, YÜRÜ 6, KAZ 6, DÖVÜŞE GİR 5, KUTLA 6)`);
  }

  // kontakt levha (gözle kontrol; ×4 nearest)
  const genis = 640;
  const satirH = 80;
  const parcalar: sharp.OverlayOptions[] = [];
  let x = 4, y = 4;
  for (const { t } of kontakt.filter((k) => !k.ad.startsWith("karakter/") || k.ad.endsWith("renk-2"))) {
    const o = t.w > 64 ? 2 : 4;
    const buf = await sharp(Buffer.from(t.v), { raw: { width: t.w, height: t.h, channels: 4 } }).resize(t.w * o, t.h * o, { kernel: "nearest" }).png().toBuffer();
    if (x + t.w * o > genis) { x = 4; y += satirH; }
    parcalar.push({ input: buf, left: x, top: y });
    x += t.w * o + 6;
  }
  const yuk = y + satirH + 4;
  mkdirSync("docs/production/raporlar/ekran", { recursive: true });
  await sharp({ create: { width: genis, height: yuk, channels: 4, background: "#16202a" } }).composite(parcalar).png().toFile("docs/production/raporlar/ekran/HARITA-ASSET-kontakt.png");

  // manifest (veri/manifest-gorsel.json `harita` bloğu; diğer bloklar korunur)
  const m = JSON.parse(readFileSync("veri/manifest-gorsel.json", "utf8")) as Record<string, unknown>;
  const toplam = cikti.reduce((a, c) => a + c.bayt, 0);
  m["harita"] = {
    aciklama: "Harita/Maden/Ocak 2B varlıkları: araclar/sanat/harita-asset-uret.ts ile KODLA çizildi (pixel matrisleri + palet takası). Dış kaynak yok. Sanat hattı (Mac) gelince aynı yollar değişebilir.",
    kaynak: "kod (araclar/sanat/harita-asset-uret.ts)", lisans: "CC0-1.0", tarih: "2026-11-06", toplamBayt: toplam,
    karakterKareleri: KARAKTER_KARE,
    dosyalar: cikti.map((c) => ({ ...c, lisans: "CC0-1.0" })),
  };
  writeFileSync("veri/manifest-gorsel.json", JSON.stringify(m, null, 1) + "\n");
  console.log(`${cikti.length} dosya · ${(toplam / 1024).toFixed(1)} KB · kontakt: docs/production/raporlar/ekran/HARITA-ASSET-kontakt.png`);
}

void ana();
