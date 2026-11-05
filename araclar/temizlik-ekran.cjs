// TEMIZLIK doğrulaması (docs/production/raporlar/TEMIZLIK.md): Market/Başarım/Lobi 3B ikonları, Atölye cilaları,
// "Market'te aç", Pergel ring-out (gerçek maç sonucu /api/ben), Kasırga Ulti (yeni hesap, Kasırga Döküm, gerçek maç).
// Önce dev sunucu: KIMLIK_MODU=sifre OTURUM_SIRRI=... VERI_DIZINI=<tmp> npx vite --port 5197
// Çalıştır: NODE_PATH=/opt/node-tools/node_modules node araclar/temizlik-ekran.cjs [adim ...]
//   adımlar: market basarim lobi atolye marketteac yedek ringout ulti (varsayılan hepsi)
const { chromium } = require("playwright");
const fs = require("fs");
const TABAN = process.env.ADRES || "http://localhost:5197/";
const KLASOR = process.env.KLASOR || "docs/production/raporlar/ekran";
const SECIM = process.argv.slice(2);
const ister = (a) => !SECIM.length || SECIM.includes(a);
fs.mkdirSync(KLASOR, { recursive: true });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const ek = Date.now().toString(36).slice(-5);
const SIFRE = "topac-sifre-1";
const hatalar = [];
const kayit = { cekilen: [] };
const T0 = Date.now();
const log = (...a) => console.log(`[${Math.round((Date.now() - T0) / 1000)}s]`, ...a);

let tar;
async function sayfa(ad) {
  const b = await tar.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const s = await b.newPage();
  s.on("console", (x) => { if (x.type() === "error" && !/status of 40[0-9]/.test(x.text())) hatalar.push(`${ad}: ${x.text()}`); });
  s.on("pageerror", (e) => hatalar.push(`${ad}: pageerror: ${e.message}`));
  return s;
}
const api = (s, yontem, yol, govde = {}) => s.evaluate(async ([y, u, g]) => {
  const r = await fetch(u, { method: y, headers: { "content-type": "application/json" }, body: y === "GET" ? undefined : JSON.stringify(g) });
  return { durum: r.status, veri: await r.json().catch(() => ({})) };
}, [yontem, yol, govde]);
async function hesap(s, ad, set) {
  await s.goto(`${TABAN}?ekran=gizlilik`);
  const r = [];
  r.push((await api(s, "POST", "/api/kayit", { ad, sifre: SIFRE, sifreTekrar: SIFRE })).durum);
  r.push((await api(s, "POST", "/api/profil", { arma: "kasirga", renk: "#2fb8e8" })).durum);
  r.push((await api(s, "POST", "/api/ilk-cekirdek", { set })).durum);
  r.push((await api(s, "POST", "/api/egitim-bitti", {})).durum);
  kayit[`hesap-${ad}`] = r;
  return r;
}
async function foto(s, ad) {
  const yol = `${KLASOR}/TEMIZLIK-${ad}.png`;
  await s.screenshot({ path: yol });
  kayit.cekilen.push(yol);
  log("ekran:", yol);
}
const ikonlarHazir = (s, ms = 20000) => s.waitForFunction(() => {
  const b = document.querySelectorAll("[data-ikon3b]").length;
  return b === 0 && document.querySelectorAll("[data-ikon3b-hazir]").length > 0;
}, null, { timeout: ms }).then(() => true).catch(() => false);

(async () => {
  tar = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const s = await sayfa("A");
  await hesap(s, `Temiz ${ek}`, "goktasi");
  await api(s, "POST", "/api/gelistirme/altin-ver", { miktar: 1200 });

  if (ister("market")) {
    await s.goto(`${TABAN}?ekran=market`);
    await s.waitForFunction(() => !!window.__market, null, { timeout: 20000 });
    kayit.marketIkon = await ikonlarHazir(s);
    kayit.marketIkonSayi = await s.evaluate(() => document.querySelectorAll("[data-ikon3b-hazir]").length);
    await bekle(300);
    await foto(s, "market-ikonlar");
  }
  if (ister("basarim")) {
    await s.goto(`${TABAN}?ekran=basarimlar`);
    await bekle(1500);
    kayit.basarimIkon = await ikonlarHazir(s, 8000);
    await foto(s, "basarim-ikonlar");
  }
  if (ister("lobi")) {
    await s.goto(`${TABAN}?ekran=lobi`);
    await bekle(1500);
    kayit.lobiIkon = await ikonlarHazir(s, 10000);
    await foto(s, "lobi-takim-ikon");
  }
  fs.writeFileSync(`${KLASOR}/TEMIZLIK-ozet.json`, JSON.stringify({ ...kayit, hatalar }, null, 1));
  log("hatalar:", hatalar.length, hatalar.slice(0, 10));
  await tar.close();
})().catch((e) => { console.error(e); process.exit(1); });
