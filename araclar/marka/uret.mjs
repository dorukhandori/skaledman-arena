// Devran kurumsal kimlik varlıklarını üretir: node araclar/marka/uret.mjs
// Çıktı: docs/art/kimlik/varlik/ (SVG + tam sayı ölçekli PNG). Kaynak tek: bu klasördeki ızgaralar.
// Kılavuz: docs/art/kimlik/kurumsal-kimlik.md
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { topacAmblem, yaziMarkasi, baslikYazisi, R } from "./isaretler.mjs";
import {
  tuval, koy, yapistir, dikdortgen, tekRenk, bosluk, zemin, disCizgi, golge, bayer, svgYaz, pngYaz, ikisiniYaz,
} from "./piksel.mjs";

export const SLOGAN = "En uzun dönen kazanır";
const KOK = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CIKTI = join(KOK, "docs", "art", "kimlik", "varlik");
const GLIF = JSON.parse(await readFile(join(dirname(fileURLToPath(import.meta.url)), "glifler.json"), "utf8"));

/** Glif satırlarını tuvale basar (tek renk, isteğe bağlı 1 px gölge). */
function metin(t, ad, x0, y0, renk, golgeRenk = null) {
  const g = GLIF[ad].rows;
  g.forEach((satir, y) =>
    [...satir].forEach((k, x) => {
      if (k !== "#") return;
      if (golgeRenk) koy(t, x0 + x + 1, y0 + y + 1, golgeRenk);
    }),
  );
  g.forEach((satir, y) => [...satir].forEach((k, x) => k === "#" && koy(t, x0 + x, y0 + y, renk)));
}
const metinGen = (ad) => GLIF[ad].rows[0].length;

// --- temel işaretler --------------------------------------------------------
const amblem = topacAmblem(32);
const amblem16 = topacAmblem(16);
const yazi = yaziMarkasi();

/** Yatay kilit: amblem + yazı markası; yazının büyük harf ortası Gövde hizasında. */
function yatay(a = amblem, y = yazi, ara = 4) {
  const yuk = Math.max(a.yuk, y.yuk);
  const t = tuval(a.gen + ara + y.gen, yuk);
  yapistir(t, a, 0, 0);
  yapistir(t, y, a.gen + ara, Math.round((a.yuk - y.yuk) / 2) - 2);
  return t;
}

/** Dikey kilit: amblem üstte, yazı altta. */
function dikey(a = amblem, y = yazi, ara = 2) {
  const gen = Math.max(a.gen, y.gen);
  const t = tuval(gen, a.yuk + ara + y.yuk);
  yapistir(t, a, Math.floor((gen - a.gen) / 2), 0);
  yapistir(t, y, Math.floor((gen - y.gen) / 2), a.yuk + ara);
  return t;
}

/** Bronz plaka (referans 01 sol üst, menü dili § 3.B): 1 px harç, 2 px bronz çerçeve, lacivert iç, köşede perçin. */
function plaka(icerik, ic = 3) {
  const gen = icerik.gen + 2 * (3 + ic);
  const yuk = icerik.yuk + 2 * (3 + ic);
  const t = tuval(gen, yuk);
  dikdortgen(t, 0, 0, gen, yuk, R.harc);
  dikdortgen(t, 1, 1, gen - 2, yuk - 2, R.bronz);
  dikdortgen(t, 1, 1, gen - 2, 1, R.bronzIsik);
  dikdortgen(t, 1, 1, 1, yuk - 2, R.bronzIsik);
  dikdortgen(t, 1, yuk - 2, gen - 2, 1, R.bronz1);
  dikdortgen(t, gen - 2, 1, 1, yuk - 2, R.bronz1);
  dikdortgen(t, 3, 3, gen - 6, yuk - 6, R.bronz0);
  dikdortgen(t, 4, 4, gen - 8, yuk - 8, R.panel);
  // köşe kesiği (yarıçap yok, 1 px kesik)
  for (const [x, y] of [[0, 0], [gen - 1, 0], [0, yuk - 1], [gen - 1, yuk - 1]]) t.p[y][x] = null;
  // perçinler
  for (const [x, y] of [[1, 1], [gen - 3, 1], [1, yuk - 3], [gen - 3, yuk - 3]]) {
    koy(t, x, y, R.bronzIsik); koy(t, x + 1, y, R.bronzIsik);
    koy(t, x, y + 1, R.bronz2); koy(t, x + 1, y + 1, R.bronz1);
  }
  yapistir(t, icerik, 3 + ic, 3 + ic);
  return t;
}

// --- uygulama ikonu ---------------------------------------------------------
/** Taş zemin: düz tas-1 üstünde Bayer dither ile çok hafif blok ritmi (gradyan yok). */
function tasZemin(gen, yuk) {
  const t = tuval(gen, yuk);
  for (let y = 0; y < yuk; y++)
    for (let x = 0; x < gen; x++) {
      const merkez = Math.hypot((x - gen / 2) / gen, (y - yuk / 2) / yuk);
      koy(t, x, y, bayer(x, y) < 0.55 - merkez ? R.tas2 : R.tas1);
    }
  return t;
}

function ikonKaro(boyut, a = amblem) {
  const t = tuval(boyut, boyut);
  dikdortgen(t, 0, 0, boyut, boyut, R.tas1);
  yapistir(t, a, Math.floor((boyut - a.gen) / 2), Math.floor((boyut - a.yuk) / 2));
  return t;
}

// --- sosyal kart (1200×630 = 400×210 × 3) ----------------------------------
function sosyalKart() {
  const G = 400, H = 210;
  const t = tuval(G, H);
  dikdortgen(t, 0, 0, G, H, "#0f1020");
  // büyük Kuşak yayı: zemin elipsi, kartın arkasında asimetrik kesik
  const cx = 200, cy = 110, rx = 210, ry = 76;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < G; x++) {
      const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      const d = (Math.sqrt(e) - 1) * ry; // yaklaşık px uzaklığı
      const th = Math.atan2((y - cy) / ry, (x - cx) / rx);
      const parlak = th > 0.15 && th < 2.6; // ön yay
      if (!parlak) continue; // arka yay çizilmez: yazının içinden geçmesin
      if (Math.abs(d) < 0.6) koy(t, x, y, R.halkaCekirdek);
      else if (Math.abs(d) < 1.6) koy(t, x, y, R.halka);
      else if (Math.abs(d) < 2.6) koy(t, x, y, R.hale);
      else if (Math.abs(d) < 4 && parlak && bayer(x, y) < 0.5) koy(t, x, y, R.haleDither);
    }
  const logo = dikey();
  const L2 = buyut(logo, 2);
  const lx = Math.floor((G - L2.gen) / 2);
  yapistir(t, L2, lx, 14);
  const slogan = baslikYazisi(SLOGAN);
  yapistir(t, slogan, Math.floor((G - slogan.gen) / 2), 14 + L2.yuk + 6);
  const ax = Math.floor((G - metinGen("alt")) / 2);
  metin(t, "alt", ax, 14 + L2.yuk + 30, R.soluk ?? "#a49c8c");
  const dx = Math.floor((G - metinGen("adres")) / 2);
  metin(t, "adres", dx, H - 16, R.bronz);
  return t;
}

/** Tam sayı büyütme (tuval düzeyinde; kart içinde 2× logo için). */
function buyut(t, o) {
  const s = tuval(t.gen * o, t.yuk * o);
  for (let y = 0; y < s.yuk; y++) for (let x = 0; x < s.gen; x++) s.p[y][x] = t.p[Math.floor(y / o)][Math.floor(x / o)];
  return s;
}

// --- Kick panel görseli (320×160 = 160×80 × 2) ------------------------------
function kickPanel() {
  const G = 160, H = 80;
  const t = tasZemin(G, H);
  const logo = yatay();
  const ic = plaka(logo, 4);
  yapistir(t, ic, Math.floor((G - ic.gen) / 2), 8);
  const dx = Math.floor((G - metinGen("adres")) / 2);
  metin(t, "adres", dx, H - 18, R.ink, R.golge);
  return t;
}

// --- yaz ---------------------------------------------------------------------
R.soluk = "#a49c8c";
await mkdir(CIKTI, { recursive: true });
const yaz = (t, ad, baslik, olcekler) => ikisiniYaz(t, join(CIKTI, ad), baslik, olcekler);

await yaz(amblem, "amblem", "Devran amblemi", [1, 4, 8, 16]);
await yaz(amblem16, "amblem-16", "Devran amblemi, küçük", [1, 4]);
await yaz(yazi, "yazi-markasi", "DEVRAN yazı markası", [1, 4, 8]);
await yaz(yatay(), "logo-yatay", "Devran logosu, yatay", [1, 4, 8]);
await yaz(dikey(), "logo-dikey", "Devran logosu, dikey", [1, 4, 8]);
await yaz(plaka(yatay(amblem16, yazi, 3), 2), "logo-plaka", "Devran logosu, bronz plaka", [1, 3, 4]);
await yaz(plaka(yaziMarkasi(), 2), "logo-plaka-yazi", "Devran yazı plakası", [1, 3, 4]);
await yaz(baslikYazisi(SLOGAN), "slogan", "Devran sloganı", [1, 4]);
await yaz(yatay(amblem16, yazi, 3), "logo-kucuk", "Devran logosu, küçük (oyun içi plaka)", [1, 4]);

// oyunun kullandığı kopyalar (public/): ikonlar, favicon, sosyal kart, plaka logosu
const PUB = join(KOK, "public");
await mkdir(join(PUB, "marka"), { recursive: true });
await pngYaz(ikonKaro(32), join(PUB, "ikon", "ikon-512.png"), 16);
await pngYaz(ikonKaro(48), join(PUB, "ikon", "ikon-192.png"), 4);
await pngYaz(ikonKaro(36), join(PUB, "ikon", "ikon-180.png"), 5);
await pngYaz(ikonKaro(64), join(PUB, "ikon", "ikon-maskable-512.png"), 8);
await pngYaz(ikonKaro(32), join(PUB, "ikon", "favicon-32.png"), 1);
await writeFile(join(PUB, "ikon", "favicon.svg"), svgYaz(ikonKaro(32), "Devran"));
await pngYaz(sosyalKart(), join(PUB, "marka", "sosyal-kart.png"), 3);
await writeFile(join(PUB, "marka", "logo-kucuk.svg"), svgYaz(yatay(amblem16, yazi, 3), "Devran"));

// tek renk: krem (koyu zemin) ve harç (açık zemin)
await yaz(tekRenk(yatay(), R.ink), "logo-yatay-krem", "Devran logosu, tek renk krem", [1, 4]);
await yaz(tekRenk(yatay(), R.harc), "logo-yatay-koyu", "Devran logosu, tek renk koyu", [1, 4]);
await yaz(tekRenk(amblem, R.ink), "amblem-krem", "Devran amblemi, tek renk krem", [1, 8]);
await yaz(tekRenk(amblem, R.harc), "amblem-koyu", "Devran amblemi, tek renk koyu", [1, 8]);

// uygulama ikonları (öneri; public/ikon'a sahip onayıyla taşınır)
const ikonlar = join(CIKTI, "ikon");
await mkdir(ikonlar, { recursive: true });
await pngYaz(ikonKaro(32), join(ikonlar, "ikon-512.png"), 16);
await pngYaz(ikonKaro(48), join(ikonlar, "ikon-192.png"), 4);
await pngYaz(ikonKaro(36), join(ikonlar, "ikon-180.png"), 5);
await pngYaz(ikonKaro(64), join(ikonlar, "ikon-maskable-512.png"), 8);
await pngYaz(ikonKaro(32), join(ikonlar, "favicon-32.png"), 1);
await pngYaz(ikonKaro(16, amblem16), join(ikonlar, "favicon-16.png"), 1);
await writeFile(join(ikonlar, "favicon.svg"), svgYaz(ikonKaro(32), "Devran"));

// uygulamalar
await pngYaz(sosyalKart(), join(CIKTI, "sosyal-kart-1200x630.png"), 3);
await pngYaz(kickPanel(), join(CIKTI, "kick-panel-320x160.png"), 2);
await pngYaz(plaka(yatay(amblem16, yazi, 3), 2), join(CIKTI, "yayin-rozeti-4x.png"), 4);

console.log("Devran kimlik varlıkları yazıldı:", CIKTI);
