// Devran amblemi ve yazı markası (mantıksal piksel). Palet: src/istemci/stil/jetonlar.css (Kuşak Taşı).
import { tuval, koy, bas, disCizgi, golge, bayer, yapistir } from "./piksel.mjs";

export const R = {
  golge: "#05050a",
  harc: "#0c0b10",
  tas1: "#18161d",
  tas2: "#1e1b24",
  tas3: "#25222b",
  cerceve1: "#4a4550",
  cerceve2: "#5a5460",
  cerceveIsik: "#8f877c",
  panel: "#1b2131",
  bronz0: "#2a1a0e",
  bronz1: "#6b4a2a",
  bronz2: "#8f6538",
  bronz: "#c08e52",
  bronzIsik: "#e8c27a",
  halkaCekirdek: "#fff0d8",
  halka: "#fbbe88",
  hale: "#dca97c",
  haleDither: "#8a5a34",
  halkaSonuk: "#3d3638",
  ana: "#a8572a",
  gold: "#fcd35a",
  ink: "#fbf2c3",
  turuncu: "#e8762f",
};

// ---------------------------------------------------------------------------
// Amblem: "Topaç". Eğik (3/4) bakış, oyunun Hibrit kamerası gibi (İ-5). Topaç Ucu üstünde,
// zemindeki Kuşak halkasının ortasında döner. Halka arkada başlar, önde en parlak.
// ---------------------------------------------------------------------------
function elipsIci(x, y, cx, cy, rx, ry) {
  const a = (x - cx) / rx;
  const b = (y - cy) / ry;
  return a * a + b * b;
}

/** Eğik silindir: üst yüz elipsi + aşağı inen yan duvar. yuz(x,y,dx,dy,r) ve duvarRenk(x,y,dx,alt) renk döndürür. */
function silindir(t, cx, cy, rx, ry, h, yuz, duvarRenk) {
  for (let y = 0; y < t.yuk; y++)
    for (let x = 0; x < t.gen; x++) {
      if (elipsIci(x, y, cx, cy, rx, ry) <= 1) continue;
      for (let s = 1; s <= h; s++)
        if (elipsIci(x, y, cx, cy + s, rx, ry) <= 1) {
          const alt = elipsIci(x, y + 1, cx, cy + h, rx, ry) > 1;
          koy(t, x, y, duvarRenk(x, y, x - cx, alt));
          break;
        }
    }
  for (let y = 0; y < t.yuk; y++)
    for (let x = 0; x < t.gen; x++) {
      const e = elipsIci(x, y, cx, cy, rx, ry);
      if (e <= 1) koy(t, x, y, yuz(x, y, (x - cx) / rx, (y - cy) / ry, Math.sqrt(e)));
    }
}

/** Zemin elipsi üstünde Kuşak halkası pikselleri: [x, y, renk, önde mi]. */
function kusakHalkasi(N, cx, hy, hrx, hry, kalin = 2.4) {
  const px = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const dis = elipsIci(x, y, cx, hy, hrx, hry);
      const ic = elipsIci(x, y, cx, hy, hrx - kalin, hry - kalin * 0.62);
      if (dis > 1 || ic < 1) continue;
      const th = Math.atan2((y - hy) / hry, (x - cx) / hrx); // 0 sağ, π/2 ön (ekranda alt)
      // dönüş saat yönünde; baş önde-solda, kuyruk sağdan arkaya doğru söner
      let arka = th - Math.PI * 0.62;
      arka = ((arka % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      arka = 2 * Math.PI - arka;
      const der = (arka * 180) / Math.PI;
      const orta = elipsIci(x, y, cx, hy, hrx - kalin / 2, hry - (kalin * 0.62) / 2);
      const cizgi = Math.abs(orta - 1) < 0.13;
      let renk;
      if (der < 120) renk = cizgi ? R.halkaCekirdek : R.halka;
      else if (der < 200) renk = cizgi ? R.halka : R.hale;
      else if (der < 250) renk = bayer(x, y) < 0.62 ? R.hale : R.haleDither;
      else if (der < 300) renk = bayer(x, y) < 1 - (der - 250) / 50 ? R.haleDither : R.halkaSonuk;
      else renk = R.halkaSonuk;
      px.push([x, y, renk, y > hy]);
    }
  return px;
}

/** N: 32 (ana) ya da 16 (favicon, plaka). Ölçüler 32 ızgarasında yazılı, k ile ölçeklenir. */
// 16 px: ölçeklenmiş yordamsal çizim leke gibi okunduğu için elle çizildi (favicon, plaka).
const AMBLEM16 = [
  "................",
  "......oooo......",
  ".....ogcggo.....",
  "...ooLLggLLoo...",
  "..oLBBBLBBBBbo..",
  "..obBdBBBdBbdo..",
  "..odbbbbbbbddo..",
  ".oommmmmmmmmnoo.",
  "oMmmmnnnnnnnnkko",
  ".ooKKKKKKKKKKoo.",
  ".ss...okKo...hh.",
  "s.....okKo.....h",
  "s......oo......H",
  "x..............h",
  ".xe..........hh.",
  "...eeehhhhHHhh..",
];
const AMBLEM16_HARITA = {
  o: R.bronz0, c: R.halkaCekirdek, g: R.gold, L: R.bronzIsik, B: R.bronz, b: R.bronz2, d: R.bronz1,
  M: "#a99e92", m: R.cerceveIsik, n: "#6e6a66", k: R.cerceve2, K: R.cerceve1,
  H: R.halkaCekirdek, h: R.halka, e: R.hale, x: R.haleDither, s: R.halkaSonuk,
};

export function topacAmblem(N = 32) {
  if (N === 16) {
    const t16 = tuval(16, 16);
    bas(t16, AMBLEM16, 0, 0, AMBLEM16_HARITA);
    return t16;
  }
  const k = N / 32;
  const t = tuval(N, N);
  const cx = (N - 1) / 2;
  const halka = kusakHalkasi(N, cx, 25.6 * k, 15.45 * k, 5.9 * k, N === 32 ? 3.1 : 2.0);
  for (const [x, y, r, on] of halka) if (!on) koy(t, x, y, r);

  const tp = tuval(N, N);
  // Uç: konik, zemine (halka merkezi) kadar
  for (let y = Math.round(18 * k); y <= Math.round(26 * k); y++) {
    const yari = Math.max(0.5 * k, (3.4 - (y / k - 18) * 0.4) * k);
    for (let x = 0; x < N; x++) {
      const dx = x - cx;
      if (Math.abs(dx) > yari) continue;
      koy(tp, x, y, y >= 25 * k ? R.cerceveIsik : dx < -yari + 1 ? R.cerceve2 : dx > 0.5 ? R.cerceve1 : R.cerceve2);
    }
  }
  // Disk: geniş metal halka
  silindir(tp, cx, 15.2 * k, 13.0 * k, 4.3 * k, Math.max(1, Math.round(2 * k)),
    (x, y, dx, dy, r) => (r > 0.9 ? (dy < 0.2 ? "#a99e92" : R.cerceveIsik) : dy < 0 ? R.cerceveIsik : "#6e6a66"),
    (x, y, dx, alt) => (alt ? R.cerceve1 : N === 32 && (Math.round(dx) + 40) % 5 === 0 && Math.abs(dx) < 11 ? R.cerceveIsik : dx < 0 ? "#6e6a66" : R.cerceve2));
  // Gövde: bronz, üç kanat
  silindir(tp, cx, 10.4 * k, 9.2 * k, 3.8 * k, Math.round(4 * k),
    (x, y, dx, dy, r) => {
      if (r > 0.84) return dy < 0.2 ? R.bronzIsik : R.bronz;
      if (N < 32) return dy < 0 ? R.bronz : R.bronz2;
      const th = Math.atan2(dy, dx);
      const faz = ((((th / (2 * Math.PI)) * 3 - r * 0.7) % 1) + 1) % 1;
      if (faz < 0.17) return R.bronzIsik;
      if (faz < 0.55) return dy < 0 ? R.bronz : R.bronz2;
      return R.bronz1;
    },
    (x, y, dx, alt) => (alt ? R.bronz0 : N === 32 && (Math.round(dx) + 40) % 4 === 1 && Math.abs(dx) < 7 ? R.bronz : dx < -2 * k ? R.bronz2 : R.bronz1));
  // Çekirdek: Gövdenin göbeğinde ışıyan kubbe
  if (N === 32) {
    silindir(tp, cx, 8.4, 3.6, 1.8, 2,
      (x, y, dx, dy, r) => (r < 0.55 && dx < 0.3 ? R.halkaCekirdek : R.gold),
      (x, y, dx, alt) => (alt ? R.bronz2 : R.gold));
    for (const [x, y, r] of [[14, 6, R.gold], [15, 6, R.halkaCekirdek], [16, 6, R.gold], [17, 6, R.gold], [15, 5, R.gold], [16, 5, R.gold]]) koy(tp, x, y, r);
  } else {
    for (const [x, y, r] of [[6, 3, R.gold], [7, 3, R.halkaCekirdek], [8, 3, R.gold], [9, 3, R.gold], [7, 2, R.gold], [8, 2, R.gold], [6, 4, R.bronz2], [7, 4, R.gold], [8, 4, R.gold], [9, 4, R.bronz2]]) koy(tp, x, y, r);
  }

  const cizgili = disCizgi(tp, R.bronz0, false);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const r = cizgili.p[y + 1][x + 1];
      if (r) koy(t, x, y, r);
    }
  for (const [x, y, r, on] of halka) if (on && !tp.p[y][x]) koy(t, x, y, r);
  return t;
}

// ---------------------------------------------------------------------------
// Yazı markası: DEVRAN, 11 satır, 2 px gövde. V'nin ucu taban çizgisinin altına iner (topacın Ucu).
// ---------------------------------------------------------------------------
const HARF = {
  D: [
    "######..",
    "#######.",
    "##...###",
    "##....##",
    "##....##",
    "##....##",
    "##....##",
    "##....##",
    "##...###",
    "#######.",
    "######..",
  ],
  E: [
    "#######",
    "#######",
    "##.....",
    "##.....",
    "######.",
    "######.",
    "##.....",
    "##.....",
    "##.....",
    "#######",
    "#######",
  ],
  V: [
    "##......##",
    "##......##",
    "##......##",
    "##......##",
    ".##....##.",
    ".##....##.",
    ".##....##.",
    "..##..##..",
    "..##..##..",
    "...####...",
    "...####...",
    "....**....",
    "....**....",
  ],
  R: [
    "######.",
    "#######",
    "##...##",
    "##...##",
    "##...##",
    "#######",
    "######.",
    "##..##.",
    "##...##",
    "##...##",
    "##...##",
  ],
  A: [
    "..###..",
    ".#####.",
    "##...##",
    "##...##",
    "##...##",
    "#######",
    "#######",
    "##...##",
    "##...##",
    "##...##",
    "##...##",
  ],
  O: [
    ".#####.",
    "#######",
    "##...##",
    "##...##",
    "##...##",
    "##...##",
    "##...##",
    "##...##",
    "##...##",
    "#######",
    ".#####.",
  ],
  // Ö: noktalar büyük harf yüksekliğinin üstünde (ust = 2 satır)
  Ö: { ust: 2, rows: [
    ".##.##.",
    ".......",
    ".#####.",
    "#######",
    "##...##",
    "##...##",
    "##...##",
    "##...##",
    "##...##",
    "##...##",
    "##...##",
    "#######",
    ".#####.",
  ] },
  U: [
    "##...##",
    "##...##",
    "##...##",
    "##...##",
    "##...##",
    "##...##",
    "##...##",
    "##...##",
    "##...##",
    "#######",
    ".#####.",
  ],
  Z: [
    "#######",
    "#######",
    ".....##",
    "....###",
    "...###.",
    "..###..",
    ".###...",
    "###....",
    "##.....",
    "#######",
    "#######",
  ],
  K: [
    "##...##",
    "##..###",
    "##.###.",
    "#####..",
    "####...",
    "###....",
    "####...",
    "#####..",
    "##.###.",
    "##..###",
    "##...##",
  ],
  I: ["##", "##", "##", "##", "##", "##", "##", "##", "##", "##", "##"],
  " ": [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."],
  N: [
    "##....##",
    "###...##",
    "###...##",
    "####..##",
    "##.#..##",
    "##.##.##",
    "##..#.##",
    "##..####",
    "##...###",
    "##...###",
    "##....##",
  ],
};

/** Satıra göre dolgu rengi: üstte krem ışık, altın gövde, altta bronz (1 px bantlar, gradyan yok). */
function satirRengi(y) {
  if (y === 0) return R.halkaCekirdek;
  if (y <= 4) return R.gold;
  if (y <= 7) return R.bronzIsik;
  return R.bronz;
}

/** Yalın harf şekli (satıra göre bantlı dolgu), aralık px. renk verilirse tek renk dolgu. */
export function yaziSekli(aralik = 2, kelime = "DEVRAN", renk = null) {
  const harfler = [...kelime].map((h) => {
    const g = HARF[h];
    if (!g) throw new Error(`Devran harf setinde yok: ${h}`);
    return Array.isArray(g) ? { ust: 0, rows: g } : g;
  });
  const ust = Math.max(...harfler.map((h) => h.ust));
  const gen = harfler.reduce((s, h) => s + h.rows[0].length, 0) + aralik * (harfler.length - 1);
  const yuk = ust + Math.max(...harfler.map((h) => h.rows.length - h.ust));
  const t = tuval(gen, yuk);
  let x = 0;
  for (const h of harfler) {
    h.rows.forEach((satir, y) => {
      const cap = y - h.ust; // büyük harf satırı (0 = üst)
      [...satir].forEach((k, i) => {
        if (k === "#") koy(t, x + i, ust + cap, renk ?? satirRengi(Math.max(0, cap)));
        if (k === "*") koy(t, x + i, ust + cap, R.halka);
      });
    });
    x += h.rows[0].length + aralik;
  }
  return t;
}

/** Marka başlık yazısı (slogan, başlık): tek renk dolgu + düz gölge. */
export function baslikYazisi(metin, renk = R.ink, golgeRenk = R.golge) {
  let t = yaziSekli(2, metin.toLocaleUpperCase("tr"), renk);
  if (golgeRenk) t = golge(t, golgeRenk, 1, 1);
  return t;
}

/** Tam yazı markası: dolgu + bronz-0 dış çizgi + düz gölge. */
export function yaziMarkasi(secenek = {}) {
  const { cizgi = R.bronz0, golgeRenk = R.golge } = secenek;
  let t = yaziSekli();
  t = disCizgi(t, cizgi, true);
  if (golgeRenk) t = golge(t, golgeRenk, 1, 1);
  return t;
}

export { HARF, bas, yapistir };
