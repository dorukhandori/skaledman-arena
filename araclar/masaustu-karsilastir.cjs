// MOBIL-2 masaüstü regresyon denetimi: iki sunucuyu (ESKİ ve YENİ kod) 1280×720 masaüstü görünümünde aynı ekranlarla
// çekip piksel piksel karşılaştırır (sharp). Telefon düzeni yalnız html[data-telefon] altında olmalı: fark ≈ 0 beklenir.
// Kullanım: ESKI=http://localhost:5292/ YENI=http://localhost:5291/ KLASOR=<çıktı> node araclar/masaustu-karsilastir.cjs
// (playwright + sharp: NODE_PATH ile / depo node_modules'unda; tarayıcı: CHROME_YOL)
const { chromium } = require("playwright");
const sharp = require("sharp");
const fs = require("fs");
const ESKI = process.env.ESKI, YENI = process.env.YENI, KLASOR = process.env.KLASOR;
if (!ESKI || !YENI || !KLASOR) { console.error("ESKI, YENI, KLASOR gerekli"); process.exit(2); }
fs.mkdirSync(KLASOR, { recursive: true });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const EKRANLAR = [
  ["karsilama", ""], ["kayit", "?ekran=kayit"], ["giris", "?ekran=giris"], ["gizlilik", "?ekran=gizlilik"], ["krediler", "?ekran=krediler"],
  ["ilk-cekirdek", "?ekran=ilk-cekirdek"], ["atolye", "?ekran=atolye"], ["market", "?ekran=market"], ["basarimlar", "?ekran=basarimlar"],
  ["lobi", "?ekran=lobi"], ["profil", "?ekran=profil"], ["ayarlar", "?ekran=ayarlar"], ["gunluk", "?ekran=gunluk"],
];

async function cek(tar, taban, ad) {
  const b = await tar.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const s = await b.newPage();
  const api = (y, u, g = {}) => s.evaluate(async ([y, u, g]) => { const r = await fetch(u, { method: y, headers: { "content-type": "application/json" }, body: y === "GET" ? undefined : JSON.stringify(g) }); return r.status; }, [y, u, g]);
  const sonuc = {};
  const al = async (ekran, q) => { await s.goto(`${taban}${q}`); await bekle(ekran === "atolye" ? 6500 : 3200); const buf = await s.screenshot(); fs.writeFileSync(`${KLASOR}/${ad}-${ekran}.png`, buf); sonuc[ekran] = buf; };
  // misafir ekranları
  for (const [e, q] of EKRANLAR.slice(0, 5)) await al(e, q);
  await s.goto(`${taban}?ekran=gizlilik`); await s.waitForLoadState("networkidle");
  await api("POST", "/api/kayit", { ad: "Karsi" + ad.slice(0, 1) + Date.now().toString(36).slice(-4), sifre: "karsilastir-1", sifreTekrar: "karsilastir-1" });
  await api("POST", "/api/profil", { arma: "kasirga", renk: "#2fb8e8" });
  await al("ilk-cekirdek", "?ekran=ilk-cekirdek");
  await api("POST", "/api/ilk-cekirdek", { set: "goktasi" }); await api("POST", "/api/egitim-bitti", {}); await api("POST", "/api/gelistirme/altin-ver", { miktar: 1500 });
  for (const [e, q] of EKRANLAR.slice(6)) await al(e, q);
  await b.close();
  return sonuc;
}

(async () => {
  const tar = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const a = await cek(tar, ESKI, "eski"), n = await cek(tar, YENI, "yeni");
  await tar.close();
  let kotu = 0;
  for (const [e] of EKRANLAR) {
    const ra = await sharp(a[e]).raw().toBuffer({ resolveWithObject: true });
    const rb = await sharp(n[e]).raw().toBuffer({ resolveWithObject: true });
    if (ra.info.width !== rb.info.width || ra.info.height !== rb.info.height) { console.log(e.padEnd(14), "BOYUT FARKI"); kotu++; continue; }
    const ch = ra.info.channels;
    let fark = 0;
    for (let i = 0; i < ra.data.length; i += ch) { if (Math.abs(ra.data[i] - rb.data[i]) + Math.abs(ra.data[i + 1] - rb.data[i + 1]) + Math.abs(ra.data[i + 2] - rb.data[i + 2]) > 24) fark++; }
    const oran = fark / (ra.info.width * ra.info.height);
    // 3B/animasyon gürültüsü için %0,15 tolerans
    const tamam = oran <= 0.0015;
    if (!tamam) kotu++;
    console.log(e.padEnd(14), `${(oran * 100).toFixed(3)}% piksel farkı`, tamam ? "✓" : "✗");
  }
  console.log(kotu ? `\nFARK VAR: ${kotu} ekran` : "\nMASAÜSTÜ DEĞİŞMEDİ (tolerans %0,15)");
  process.exit(kotu ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
