// MENU-DENETIM bot maçı: bot teklifi → VS → maç → Esc menüsü → Sonuç (yerel topacı ?oto=dolas sürer).
// Sunucu ve ortam menu-denetim-ekran.cjs ile aynı.
const { chromium } = require("playwright");
const fs = require("fs");
const TABAN = "http://localhost:5197/", K = process.env.KLASOR;
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const hatalar = [];
(async () => {
  const tar = await chromium.launch({ executablePath: process.env.KROM, args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const s = await (await tar.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })).newPage();
  s.on("pageerror", (e) => hatalar.push("pageerror " + e.message));
  s.on("console", (x) => { if (x.type() === "error") hatalar.push(x.text().slice(0, 200)); });
  const api = (y, u, g = {}) => s.evaluate(async ([y, u, g]) => { const r = await fetch(u, { method: y, headers: { "content-type": "application/json" }, body: y === "GET" ? undefined : JSON.stringify(g) }); return r.status; }, [y, u, g]);
  const foto = async (ad) => { await s.screenshot({ path: `${K}/${ad}.png` }); console.log("ekran", ad); };
  await s.goto(`${TABAN}?ekran=gizlilik`);
  const ek = Date.now().toString(36).slice(-4);
  console.log(await api("POST", "/api/kayit", { ad: `Macci ${ek}`, sifre: "menu-denetim-1", sifreTekrar: "menu-denetim-1" }), await api("POST", "/api/profil", { arma: "kor", renk: "#e8a02f" }), await api("POST", "/api/ilk-cekirdek", { set: "maden" }), await api("POST", "/api/egitim-bitti", {}));
  await s.goto(`${TABAN}?ekran=lobi&oto=dolas`);
  await s.waitForFunction(() => !!window.__lobi, null, { timeout: 20000 });
  await s.click("[data-mod=hizli]").catch(() => {});
  await s.click("[data-eylem=hizli]");
  await s.waitForFunction(() => document.querySelector("[data-oneri]")?.dataset.asama === "botTeklif", null, { timeout: 70000 });
  await foto("50-bot-teklif");
  await s.click("[data-eylem=bot]");
  for (let i = 0; i < 6; i++) { await bekle(700); await foto(`51-sonrasi-${i}`); if (await s.$("[data-eylem=hazir]")) break; }
  if (await s.$("[data-eylem=hazir]")) { await foto("52-takim-secimi"); await s.click("[data-eylem=hazir]").catch(() => {}); }
  for (let i = 0; i < 6; i++) { await bekle(600); await foto(`53-vs-${i}`); if (await s.evaluate(() => !!(window.__lobi && window.__lobi.macEkrani))) break; }
  await s.waitForFunction(() => !!(window.__lobi && window.__lobi.macEkrani), null, { timeout: 60000 });
  await bekle(6000); await foto("54-mac");
  await s.keyboard.press("Escape"); await bekle(800); await foto("55-esc-menu");
  await s.keyboard.press("Escape"); await bekle(400);
  const t0 = Date.now();
  while (!(await s.evaluate(() => !!(window.__lobi?.macEkrani?.sonucAcik))) && Date.now() - t0 < 300000) await bekle(1000);
  await bekle(1500); await foto("56-sonuc-1"); await bekle(4000); await foto("57-sonuc-2");
  fs.writeFileSync(`${K}/mac-hatalar.json`, JSON.stringify(hatalar, null, 1));
  await tar.close();
})().catch(async (e) => { console.error(String(e).slice(0, 400)); fs.writeFileSync(`${K}/mac-hatalar.json`, JSON.stringify([...hatalar, String(e)], null, 1)); process.exit(1); });
