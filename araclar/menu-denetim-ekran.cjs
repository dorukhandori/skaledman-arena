// MENU-DENETIM (docs/production/raporlar/MENU-DENETIM.md): menü ekranlarını 1280x720 gezer, görüntü + otomatik UI denetimi.
// Önce ayrı veri dizinli sunucu: KIMLIK_MODU=sifre OTURUM_SIRRI=<yerel> VERI_DIZINI=<tmp> npx vite --port 5197 --strictPort
// Çalıştır: KLASOR=<çıktı> [KROM=<chrome yolu>] NODE_PATH=<playwright node_modules> node araclar/menu-denetim-ekran.cjs [misafir ilk ana lobi menuler]
const { chromium } = require("playwright");
const fs = require("fs");
const TABAN = process.env.ADRES || "http://localhost:5197/";
const KLASOR = process.env.KLASOR;
const G = +(process.env.GEN || 1280), Y = +(process.env.YUK || 720);
fs.mkdirSync(KLASOR, { recursive: true });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const ek = Date.now().toString(36).slice(-4);
const SIFRE = "menu-denetim-1";
const rapor = {};
const hatalar = [];

const denetle = () => {
  const W = innerWidth, H = innerHeight;
  const gorunur = (e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && +s.opacity > 0.05 && r.width > 0 && r.height > 0; };
  const ad = (e) => (e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/).slice(0, 3).join(".") : "") + (e.dataset.eylem ? `[eylem=${e.dataset.eylem}]` : "")).slice(0, 70);
  const metin = (e) => (e.innerText || e.value || "").replace(/\s+/g, " ").trim().slice(0, 50);
  const tum = [...document.querySelectorAll("body *")].filter(gorunur);
  const tasma = [], disari = [], bozukMetin = [], kirpik = [];
  for (const e of tum) {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    if (["CANVAS", "SVG", "svg", "IMG", "HTML", "BODY"].includes(e.tagName)) continue;
    // ekran dışına taşan etkileşimli/metinli öğe
    if ((r.right > W + 2 || r.bottom > H + 2 || r.left < -2 || r.top < -2) && metin(e) && e.children.length === 0) disari.push(`${ad(e)} "${metin(e)}" [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`);
    // gizli taşma (metin kesiliyor)
    if ((s.overflow.includes("hidden") || s.textOverflow === "ellipsis" || s.overflowX === "hidden") && (e.scrollWidth > e.clientWidth + 2) && metin(e)) kirpik.push(`${ad(e)} "${metin(e)}" ${e.scrollWidth}>${e.clientWidth}`);
    // görünür taşma: yaprak öğe metni kutusundan geniş
    if (e.children.length === 0 && metin(e) && s.overflow === "visible" && e.scrollWidth > e.clientWidth + 4 && e.clientWidth > 0) tasma.push(`${ad(e)} "${metin(e)}" ${e.scrollWidth}>${e.clientWidth}`);
    if (e.children.length === 0 && /undefined|NaN|\[object|null\b|TODO|lorem/i.test(e.textContent || "")) bozukMetin.push(`${ad(e)} "${metin(e)}"`);
  }
  // birbirine binen düğmeler
  const dugmeler = tum.filter((e) => e.matches("button, a, [role=button], [data-eylem], input, select"));
  const binen = [];
  for (let i = 0; i < dugmeler.length; i++) for (let j = i + 1; j < dugmeler.length; j++) {
    const a = dugmeler[i], b = dugmeler[j];
    if (a.contains(b) || b.contains(a)) continue;
    const r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect();
    const x = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left), y = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top);
    if (x > 4 && y > 4) binen.push(`${ad(a)} "${metin(a)}" ⟷ ${ad(b)} "${metin(b)}"`);
  }
  const kucukDugme = dugmeler.filter((e) => { const r = e.getBoundingClientRect(); return (r.height < 24 || r.width < 24) && !e.matches("input[type=checkbox],input[type=radio]"); }).map((e) => `${ad(e)} "${metin(e)}" ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
  const fontlar = new Set(tum.filter((e) => e.children.length === 0 && metin(e)).map((e) => getComputedStyle(e).fontFamily.split(",")[0].trim()));
  const boyutlar = {};
  for (const e of tum.filter((e) => e.children.length === 0 && metin(e))) { const f = getComputedStyle(e).fontSize; boyutlar[f] = (boyutlar[f] || 0) + 1; }
  const enKucukYazi = tum.filter((e) => e.children.length === 0 && metin(e) && parseFloat(getComputedStyle(e).fontSize) < 12).map((e) => `${ad(e)} "${metin(e)}" ${getComputedStyle(e).fontSize}`);
  const ingilizce = tum.filter((e) => e.children.length === 0 && /\b(Loading|Error|Back|Cancel|Submit|Settings|Play|Ready|Close)\b/.test(e.textContent || "")).map((e) => `${ad(e)} "${metin(e)}"`);
  return {
    url: location.search, sayfaKaydirma: [document.documentElement.scrollWidth, document.documentElement.scrollHeight, W, H],
    disari: disari.slice(0, 12), kirpik: kirpik.slice(0, 12), tasma: tasma.slice(0, 12), binen: binen.slice(0, 12),
    kucukDugme: kucukDugme.slice(0, 15), bozukMetin: bozukMetin.slice(0, 10), enKucukYazi: enKucukYazi.slice(0, 15), ingilizce,
    fontlar: [...fontlar], fontBoyutlari: boyutlar,
    dugmeler: dugmeler.map((e) => metin(e)).filter(Boolean).slice(0, 40),
  };
};

async function api(s, yontem, yol, govde = {}) {
  return s.evaluate(async ([y, u, g]) => {
    const r = await fetch(u, { method: y, headers: { "content-type": "application/json" }, body: y === "GET" ? undefined : JSON.stringify(g) });
    return { durum: r.status, veri: await r.json().catch(() => ({})) };
  }, [yontem, yol, govde]);
}
async function cek(s, ad, ms = 1800) {
  await bekle(ms);
  await s.screenshot({ path: `${KLASOR}/${ad}.png` });
  try { rapor[ad] = await s.evaluate(denetle); } catch (e) { rapor[ad] = { hata: String(e).slice(0, 200) }; }
  console.log("ekran", ad);
}
async function git(s, ekran, ad, ms) { await s.goto(`${TABAN}?ekran=${ekran}`); await cek(s, ad || ekran, ms); }

(async () => {
  const tar = await chromium.launch({ executablePath: process.env.KROM, args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const b = await tar.newContext({ viewport: { width: G, height: Y }, deviceScaleFactor: 1 });
  const s = await b.newPage();
  s.on("console", (x) => { if (x.type() === "error" || x.type() === "warning") hatalar.push(`[${x.type()}] ${s.url().split("?")[1] || ""}: ${x.text().slice(0, 200)}`); });
  s.on("pageerror", (e) => hatalar.push(`pageerror ${s.url().split("?")[1] || ""}: ${e.message}`));
  const SECIM = process.argv.slice(2);
  const ister = (a) => !SECIM.length || SECIM.includes(a);

  if (ister("misafir")) {
    await s.goto(TABAN); await cek(s, "01-karsilama");
    await git(s, "kayit", "02-kayit");
    await git(s, "giris", "03-giris");
    await git(s, "ayarlar", "04-ayarlar-misafir");
    await git(s, "krediler", "05-krediler");
    await git(s, "gizlilik", "06-gizlilik");
  }
  // hesap
  await s.goto(`${TABAN}?ekran=gizlilik`);
  rapor.kayit = (await api(s, "POST", "/api/kayit", { ad: `Denetci ${ek}`, sifre: SIFRE, sifreTekrar: SIFRE })).durum;
  if (ister("ilk")) {
    await s.goto(TABAN); await cek(s, "10-girisli-ilk-acilis");
    await git(s, "profil", "11-profil-yeni");
  }
  rapor.profil = (await api(s, "POST", "/api/profil", { arma: "kasirga", renk: "#2fb8e8" })).durum;
  if (ister("ilk")) await git(s, "ilk-cekirdek", "12-ilk-cekirdek");
  rapor.ilk = (await api(s, "POST", "/api/ilk-cekirdek", { set: "goktasi" })).durum;
  if (ister("ilk")) { await s.goto(TABAN); await cek(s, "13-egitim-oncesi-acilis", 3000); }
  rapor.egitim = (await api(s, "POST", "/api/egitim-bitti", {})).durum;
  await api(s, "POST", "/api/gelistirme/altin-ver", { miktar: 1500 });

  if (ister("ana")) {
    await s.goto(TABAN); await cek(s, "20-ana-acilis", 3500);
    await git(s, "atolye", "21-atolye", 4000);
    await git(s, "market", "22-market", 3500);
    await git(s, "basarimlar", "23-basarimlar", 2500);
    await git(s, "gunluk", "24-gunluk", 2500);
    await git(s, "profil", "25-profil", 2000);
    await git(s, "ayarlar", "26-ayarlar", 2000);
    await git(s, "lobi", "27-lobi", 3000);
    await git(s, "dene", "28-dene", 3000);
    await git(s, "ruhlar", "29-ruhlar", 2500);
  }
  if (ister("lobi")) {
    await s.goto(`${TABAN}?ekran=lobi`); await bekle(2500);
    const modlar = await s.$$eval("[data-mod]", (x) => x.map((e) => e.dataset.mod));
    rapor.lobiModlar = modlar;
    for (const m of modlar) { await s.click(`[data-mod=${m}]`).catch(() => {}); await cek(s, `30-lobi-mod-${m}`, 1200); }
    await s.click("[data-mod=hizli]").catch(() => {});
    if (await s.$("[data-eylem=hizli]")) { await s.click("[data-eylem=hizli]"); await cek(s, "31-lobi-araniyor", 3000); await cek(s, "32-lobi-araniyor-22sn", 19000); await s.click("[data-eylem=iptal]").catch(() => {}); await cek(s, "33-lobi-iptal", 1500); }
    await s.click("[data-mod=oda]").catch(() => {});
    if (await s.$("[data-eylem=oda-ac]")) { await s.click("[data-eylem=oda-ac]"); await cek(s, "34-lobi-oda-acik", 2500); }
  }
  if (ister("menuler")) {
    // üst gezinti açılır menüleri
    await s.goto(`${TABAN}?ekran=atolye`); await bekle(3500);
    const menuDugmeleri = await s.$$eval(".k-menu > button, .k-menu > [data-eylem]", (x) => x.length);
    rapor.menuDugmeSayisi = menuDugmeleri;
    const kaplar = await s.$$(".k-menu");
    for (let i = 0; i < kaplar.length; i++) {
      const d = await kaplar[i].$("button");
      if (d) { await d.click().catch(() => {}); await cek(s, `40-ust-menu-${i}`, 700); await s.keyboard.press("Escape"); }
    }
  }
  rapor.konsol = hatalar;
  fs.writeFileSync(`${KLASOR}/rapor.json`, JSON.stringify(rapor, null, 1));
  await tar.close();
})().catch((e) => { console.error(e); rapor.olumcul = String(e); rapor.konsol = hatalar; fs.writeFileSync(`${KLASOR}/rapor.json`, JSON.stringify(rapor, null, 1)); process.exit(1); });
