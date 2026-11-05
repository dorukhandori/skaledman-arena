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

/** Hızlı maç → 30 sn sonra "Bot ile oyna" → takım seçimi → maç (sunucu botu). `oto`: yerel topacı paylaşılan bot sürer. */
async function botMaci(s, oto) {
  await s.goto(`${TABAN}?ekran=lobi${oto ? `&oto=${oto}` : ""}`);
  await s.waitForFunction(() => !!window.__lobi, null, { timeout: 20000 });
  await s.click("[data-mod=hizli]").catch(() => {});
  await s.click("[data-eylem=hizli]");
  await s.waitForFunction(() => document.querySelector("[data-oneri]")?.dataset.asama === "botTeklif", null, { timeout: 70000 });
  await s.click("[data-eylem=bot]");
  try {
    await s.waitForFunction(() => !!document.querySelector("[data-eylem=hazir]") || !!(window.__lobi && window.__lobi.macEkrani), null, { timeout: 90000 });
    await s.click("[data-eylem=hazir]", { timeout: 3000 }).catch(() => {});
    await s.waitForFunction(() => !!(window.__lobi && window.__lobi.macEkrani), null, { timeout: 60000 });
  } catch (e) {
    await s.screenshot({ path: `${KLASOR}/hata-botmaci.png` });
    log("botMaci hata:", await s.evaluate(() => ({ asama: window.__lobi?.asama, metin: document.body.innerText.slice(0, 400) })));
    throw e;
  }
}
const sonucAcik = (s) => s.evaluate(() => !!(window.__lobi && window.__lobi.macEkrani && window.__lobi.macEkrani.sonucAcik));

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
  const atolye = async (sorgu = "") => {
    await s.goto(`${TABAN}?ekran=atolye${sorgu}`);
    await s.waitForFunction(() => !!window.__atolye && !!window.__atolye.sahne.cizerTuru, null, { timeout: 30000 });
    await bekle(1500);
    const t = s.locator(".pergel .p-dugme", { hasText: "Tamam" });
    if (await t.count()) { await t.first().click().catch(() => {}); await bekle(300); }
  };
  if (ister("atolye")) {
    await atolye();
    kayit.cizer = await s.evaluate(() => window.__atolye.sahne.cizerTuru);
    await foto(s, "atolye-patlatilmis");
    await s.click("[data-eylem=birlestir]");
    await bekle(1500);
    await foto(s, "atolye-birlesik");
    await s.click("[data-sekme=uc]");
    await bekle(800);
    await foto(s, "atolye-izgara-az");
  }
  if (ister("marketteac")) {
    await atolye();
    await s.click("[data-takim-yuva='1']");
    await bekle(1200);
    await s.click(".g3-etiket[data-yuva=govde]");
    await bekle(1500);
    kayit.marketteAcDugme = await s.locator("[data-eylem=markette-ac]").count();
    await foto(s, "atolye-markette-ac");
    await s.click("[data-eylem=markette-ac]");
    await s.waitForFunction(() => !!window.__market, null, { timeout: 20000 });
    await bekle(1200);
    kayit.marketVurgu = await s.evaluate(() => { const h = document.querySelector(".hucre[data-vurgu]"); return h ? { urun: h.dataset.urun, odak: document.activeElement === h, url: location.search } : null; });
    await foto(s, "market-vurgu");
  }
  if (ister("yedek")) {
    await atolye();
    const g = await s.evaluate(() => { const r = document.querySelector(".g3-tuval").getBoundingClientRect(); return [r.width, r.height]; });
    await foto(s, "atolye-webgl-boyut");
    await atolye("&webgl=0");
    const y = await s.evaluate(() => { const r = document.querySelector(".g3-tuval").getBoundingClientRect(); return [r.width, r.height, window.__atolye.sahne.cizerTuru]; });
    kayit.boyutWebgl = g; kayit.boyutYedek = y;
    await foto(s, "atolye-yedek");
  }
  if (ister("ringout")) {
    // yeni hesap; Atölye'ye bir kez girilir (Pergel "ilk ziyaret" görülür), sonra girdisiz (pasif) topaçla sunucu botuna
    // karşı gerçek maç: bot topacı itip ring out ile kazanır. Sonra /api/ben sonMac ve Atölye'de Pergel ring-out ipucu.
    const r = await sayfa("R");
    await hesap(r, `Halka ${ek}`, "goktasi");
    await r.goto(`${TABAN}?ekran=atolye`);
    await bekle(2500);
    let deneme = 0, ben = null;
    while (deneme++ < 3) {
      await botMaci(r, null);
      log("ringout: maç başladı", deneme);
      const t0 = Date.now();
      while (!(await sonucAcik(r)) && Date.now() - t0 < 400000) await bekle(1000);
      ben = (await api(r, "GET", "/api/ben")).veri.sonMac;
      log("ringout: sonMac", JSON.stringify(ben));
      if (ben?.ringOutKayip) break;
    }
    kayit.ringoutSonMac = ben;
    await r.goto(`${TABAN}?ekran=atolye`);
    await r.waitForFunction(() => !!window.__atolye, null, { timeout: 30000 });
    const ok = await r.waitForFunction(() => /kenara yakın/i.test(document.querySelector(".pergel")?.textContent ?? ""), null, { timeout: 15000 }).then(() => true).catch(() => false);
    kayit.ringoutIpucu = ok ? await r.evaluate(() => document.querySelector(".pergel").textContent) : null;
    await foto(r, "pergel-ringout");
    await r.context().close();
  }
  if (ister("ulti")) {
    // yeni hesap, Yapay set (Kasırga Döküm). Lv.3 (Ulti yuvası; geliştirme ucu xp-ver ile, sim'e yazım yok), gerçek bot
    // maçı, yerel topacı paylaşılan bot sürer (?oto=dolas) ve Enerji 3 dilim olunca Ulti'yi kendisi kullanır.
    const u = await sayfa("U");
    await hesap(u, `Yel ${ek}`, "yapay");
    const at = (await api(u, "GET", "/api/atolye")).veri;
    const c = at.cekirdekler[0];
    kayit.ultiXp = (await api(u, "POST", "/api/gelistirme/xp-ver", { cekirdekId: c.id, xp: 700 })).veri;
    // 1) Antrenman: hesabın kayıtlı takımı ve seviyesiyle (Lv.3 Kasırga Döküm). Eğitimin 4. adımında (Yetenek) Enerji oyun
    //    kuralıyla dolu tutulur; oyuncu fareyi rakibe tutup 3'e basar → gerçek Ata Savruğu (sim'e yazım yok).
    await u.goto(`${TABAN}?ekran=antrenman`);
    await u.waitForFunction(() => !!window.__egitim, null, { timeout: 30000 });
    await u.mouse.click(640, 300);
    await u.waitForFunction(() => window.__egitim.adim >= 3, null, { timeout: 120000 }).catch(() => {});
    kayit.antrenmanAdim = await u.evaluate(() => window.__egitim.adim);
    const m = (kod) => u.evaluate((k) => (new Function("mac", `return (${k})(mac)`))(window.__egitim.mac), kod);
    kayit.antrenmanProfil = await m("(mac) => ({ el: mac.dunya.profiller[mac.yerel].element, cekirdek: mac.dunya.profiller[mac.yerel].parcalar.cekirdek, yuva: mac.dunya.profiller[mac.yerel].yetenekler, seviye: mac.dunya.seviye, enerji: mac.dunya.topaclar[mac.yerel].enerji })");
    log("ulti antrenman:", JSON.stringify(kayit.antrenmanProfil));
    for (let k = 0; k < 6 && !kayit.ultiAn; k++) {
      const p = await m("(mac) => { const t = mac.dunya.topaclar[1 - mac.yerel]; return mac.ekranNoktasi(t.x, t.z); }");
      await u.mouse.move(p.x, p.y);
      await u.keyboard.down("3"); await bekle(120); await u.keyboard.up("3");
      const t0 = Date.now();
      while (Date.now() - t0 < 2500) {
        const d = await m("(mac) => ({ ata: mac.yetenekGorsel.ruh.sayac.ata, ulti: mac.efektler.sayac.ulti, en: mac.dunya.topaclar[mac.yerel].enerji })");
        if (d.ata > 0) { await bekle(500); await foto(u, "kasirga-ulti"); kayit.ultiAn = { yol: "antrenman", ...d }; break; }
        await bekle(50);
      }
    }
    let deneme = 0;
    while (deneme++ < 2 && !kayit.ultiAn) {
      await botMaci(u, "dolas");
      log("ulti: maç başladı", deneme);
      const t0 = Date.now();
      let enCok = 0;
      while (Date.now() - t0 < 400000) {
        const d = await u.evaluate(() => { const m = window.__lobi?.macEkrani; if (!m) return null; return { ulti: m.efektler.sayac.ulti, telegraf: m.efektler.sayac.telegraf, en: m.dunya.topaclar[m.yerel].enerji, el: m.dunya.profiller[m.yerel].element, yuva: m.dunya.profiller[m.yerel].yetenekler, son: m.sonucAcik, ruh: m.yetenekGorsel?.ruh?.sayac ? { ...m.yetenekGorsel.ruh.sayac } : null }; }).catch(() => null);
        if (!d) break;
        enCok = Math.max(enCok, d.en);
        if (d.ruh && d.ruh.ata > 0 && !kayit.ultiAn) {
          await bekle(450);
          await foto(u, "kasirga-ulti");
          kayit.ultiAn = d;
        }
        if (d.son) break;
        await bekle(60);
      }
      kayit[`ultiMac${deneme}`] = { enCokEnerji: enCok };
      log("ulti: maç bitti", deneme, enCok, !!kayit.ultiAn);
      if (!kayit.ultiAn) { while (!(await sonucAcik(u))) await bekle(500); }
    }
    await u.context().close();
  }
  fs.writeFileSync(`${KLASOR}/TEMIZLIK-ozet.json`, JSON.stringify({ ...kayit, hatalar }, null, 1));
  log("hatalar:", hatalar.length, hatalar.slice(0, 10));
  await tar.close();
})().catch((e) => { console.error(e); process.exit(1); });
