// MOBIL-1 çevrimiçi iki istemci: A masaüstü (localhost, otomatik oynanış ?oto=kenar), B telefon emülasyonu (iPhone 14 yatay,
// isMobile + hasTouch, DPR 2) YEREL AĞ kökeninden (http://devran-pc.local:<port>, Chromium host-resolver ile 127.0.0.1'e;
// dev sunucusunun yerel ağ Origin kuralını gerçek tarayıcıyla sınar). B gerçek dokunuşla oynar (CDP touch: joystick
// daireleri, Dash, Sekme, Yetenek 1 dokun). Ölçülen: iki istemcide wire hash karşılaştırması / sapma, maç sonu sunucu kaydının
// tarayıcıda yeniden oynatma hash'i (kayitDogrula), arka plana alınıp dönme bandı, konsol hataları.
// Önce: DEV_EK_HOSTLAR=devran-pc.local npm run dev:ag -- --port <port>  (ya da aynı ortamla vite --host)
// Çalıştır: KLASOR=<çıktı> PORT=5291 NODE_PATH=<global node_modules> node araclar/mobil-cevrimici.cjs
const { chromium } = require("playwright");
const fs = require("fs");
const PORT = Number(process.env.PORT || 5173);
const K = process.env.KLASOR;
fs.mkdirSync(K, { recursive: true });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
// --no-proxy-server: ortamda HTTP(S)_PROXY tanımlıysa "devran-pc.local" vekile gider (yerel ağ adı orada çözülmez)
const ARGS = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--host-resolver-rules=MAP devran-pc.local 127.0.0.1", "--no-proxy-server"];
const sonuc = {};
(async () => {
  const ac = async (ad, mobil, taban) => {
    const env = { ...process.env };
    for (const k of Object.keys(env)) if (/proxy/i.test(k)) delete env[k];
    const t = await chromium.launch({ args: ARGS, env });
    const c = await t.newContext(mobil ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const s = await c.newPage();
    const hatalar = [];
    s.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text().slice(0, 200)); });
    s.on("pageerror", (e) => hatalar.push("pageerror " + e.message));
    return { ad, t, c, s, hatalar, taban };
  };
  const A = await ac("A", false, `http://localhost:${PORT}/`);
  const B = await ac("B", true, `http://devran-pc.local:${PORT}/`);
  const hesap = async (x) => {
    await x.s.goto(`${x.taban}?ekran=gizlilik`);
    const ad = `${x.ad}mob${Math.random().toString(36).slice(2, 7)}`;
    return x.s.evaluate(async (ad) => {
      const p = (y, g) => fetch(y, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(g) }).then((r) => r.status);
      return [await p("/api/kayit", { ad, sifre: "test-sifre-1", sifreTekrar: "test-sifre-1" }), await p("/api/profil", { arma: "kor", renk: "#f4cf47" }), await p("/api/ilk-cekirdek", { set: "maden" })];
    }, ad);
  };
  sonuc.hesapA = await hesap(A);
  sonuc.hesapB = await hesap(B); // yerel ağ kökeninden POST: Origin denetimi geçmeli (200/201)
  await A.s.goto(`${A.taban}?ekran=lobi&oto=kenar&debug`);
  await A.s.waitForSelector("[data-mod=oda]");
  await A.s.click("[data-mod=oda]");
  await A.s.click("[data-eylem=oda-ac]");
  await A.s.waitForSelector("[data-kod]", { timeout: 20000 });
  const kod = await A.s.$eval("[data-kod]", (e) => e.dataset.kod);
  sonuc.kod = kod;
  await B.s.goto(`${B.taban}?ekran=lobi&debug#oda=${kod}`);
  await B.s.waitForSelector("[data-mod=oda], [data-eylem=katil]", { timeout: 20000 });
  if (!(await B.s.$("[data-eylem=katil]"))) await B.s.tap("[data-mod=oda]");
  await B.s.waitForSelector("[data-eylem=katil]");
  await B.s.tap("[data-eylem=katil]");
  await bekle(1500);
  await B.s.screenshot({ path: `${K}/MOBIL-cevrimici-katil.png` });
  for (const x of [B, A]) {
    try { await x.s.waitForSelector("[data-eylem=hazir]", { timeout: 20000 }); } catch (e) {
      await x.s.screenshot({ path: `${K}/hata-${x.ad}.png` });
      sonuc[`hata${x.ad}`] = { metin: await x.s.evaluate(() => document.body.innerText.slice(0, 400)), konsol: x.hatalar };
      throw e;
    }
  }
  await A.s.click("[data-eylem=hazir]");
  await B.s.screenshot({ path: `${K}/MOBIL-cevrimici-takim.png` });
  await B.s.tap("[data-eylem=hazir]");
  await B.s.waitForFunction(() => !!(window.__lobi && window.__lobi.macEkrani), null, { timeout: 60000 });
  await B.s.waitForFunction(() => window.__lobi.agMaci?.sunucu?.mac?.faz === "tur", null, { timeout: 60000 });
  const cdp = await B.c.newCDPSession(B.s);
  let aktif = false;
  const dok = async (type, pts) => {
    if (type === "touchEnd") { if (!aktif) return; aktif = false; }
    else { if (type === "touchMove" && !aktif) type = "touchStart"; aktif = true; }
    await cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map((p) => ({ x: p[0], y: p[1], id: p[2], radiusX: 8, radiusY: 8, force: 1 })) });
  };
  const yer = await B.s.evaluate(() => { const r = document.querySelector(".dk").getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const dugme = await B.s.evaluate(() => window.__lobi.macEkrani.dokunmatik?.yer ?? null);
  sonuc.dokunmatikKatman = !!dugme;
  const J = [yer.x + 150, yer.y + yer.h * 0.62];
  let adim = 0;
  const t0 = Date.now();
  let gizlendi = false;
  // maç sonuna kadar: joystick ile daire çiz, arada Dash / Sekme / Yetenek 1 (gerçek dokunuş)
  while (Date.now() - t0 < 200000) {
    const o = await B.s.evaluate(() => { const l = window.__lobi; const d = l.agMaci?.sunucu; return { faz: d?.mac?.faz ?? "", bitti: !!(l.macEkrani?.sonucAcik), olcum: l.agMaci ? { k: l.agMaci.olcum.hashKarsilastirma, s: l.agMaci.olcum.hashSapma } : null }; });
    if (o.bitti || o.faz === "bitti") break;
    if (o.faz === "tur") {
      const a = adim * 0.6;
      const p = [J[0] + Math.cos(a) * 45, J[1] + Math.sin(a) * 45, 1];
      await dok(adim % 20 === 0 ? "touchStart" : "touchMove", [p]);
      if (adim % 13 === 5 && dugme) { await dok("touchStart", [p, [yer.x + dugme.dash.x, yer.y + dugme.dash.y, 2]]); await bekle(40); await dok("touchMove", [p]); }
      if (adim % 17 === 9 && dugme) { await dok("touchStart", [p, [yer.x + dugme.sekme.x, yer.y + dugme.sekme.y, 3]]); await bekle(40); await dok("touchMove", [p]); }
      if (adim % 29 === 14 && dugme) { await dok("touchStart", [p, [yer.x + dugme.y1.x, yer.y + dugme.y1.y, 4]]); await bekle(120); await dok("touchMove", [p]); }
      if (adim % 20 === 19) await dok("touchEnd", []);
      if (adim === 60) await B.s.screenshot({ path: `${K}/MOBIL-cevrimici-mac.png` });
      // arka plana alma (bir kez): visibilitychange gizli → 3 sn → görünür; dönüş bandı ölçülür
      if (adim >= 30 && !gizlendi) {
        gizlendi = true;
        await dok("touchEnd", []);
        await B.s.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }); document.dispatchEvent(new Event("visibilitychange")); });
        await bekle(3000);
        await B.s.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" }); document.dispatchEvent(new Event("visibilitychange")); });
        await bekle(300);
        sonuc.donusBandi = await B.s.evaluate(() => (document.querySelector(".agk .bant.acik") || {}).innerText || "");
        await B.s.screenshot({ path: `${K}/MOBIL-cevrimici-donus.png` });
      }
    } else if (adim % 20 !== 0) { await dok("touchEnd", []); adim = Math.ceil(adim / 20) * 20; }
    adim++;
    await bekle(90);
  }
  await dok("touchEnd", []);
  await bekle(2500);
  const ozet = (x) => x.s.evaluate(() => { const l = window.__lobi; const ag = l.agMaci; const d = ag?.sunucu; return { yerel: ag?.yerel, tick: d?.tick, faz: d?.mac?.faz, puan: d ? [...d.mac.puan] : [], sonuc: d?.mac?.macSonucu ? { kazanan: d.mac.macSonucu.kazanan, neden: d.mac.macSonucu.neden } : null, hashKarsilastirma: ag?.olcum.hashKarsilastirma, hashSapma: ag?.olcum.hashSapma, uzlasma: ag?.olcum.uzlasma, dokunmatik: l.macEkrani?.dokunmatik?.sayac ?? null }; });
  sonuc.A = await ozet(A);
  sonuc.B = await ozet(B);
  const kayit = (x) => x.s.evaluate(() => Promise.race([window.__lobi.agMaci.kayitDogrula(), new Promise((r) => setTimeout(() => r(null), 8000))]));
  sonuc.kayitA = await kayit(A).catch((e) => String(e));
  sonuc.kayitB = await kayit(B).catch((e) => String(e));
  await B.s.screenshot({ path: `${K}/MOBIL-cevrimici-sonuc.png` });
  sonuc.hatalarA = A.hatalar;
  sonuc.hatalarB = B.hatalar;
  sonuc.sureSn = Math.round((Date.now() - t0) / 1000);
  fs.writeFileSync(`${K}/MOBIL-cevrimici.json`, JSON.stringify(sonuc, null, 1));
  console.log(JSON.stringify({ hesapB: sonuc.hesapB, A: sonuc.A, B: sonuc.B, kayitA: sonuc.kayitA, kayitB: sonuc.kayitB, donus: sonuc.donusBandi, hataA: A.hatalar.length, hataB: B.hatalar.length, sure: sonuc.sureSn }, null, 1));
  await A.t.close();
  await B.t.close();
})().catch((e) => { console.error(e); fs.writeFileSync(`${K}/MOBIL-cevrimici.json`, JSON.stringify({ ...sonuc, olumcul: String(e) }, null, 1)); process.exit(1); });
