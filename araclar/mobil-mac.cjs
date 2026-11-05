// MOBIL-1 maç dokunmatik doğrulaması: telefon yatay emülasyonu (isMobile + hasTouch, DPR 2) + GERÇEK dokunuş olayları
// (CDP Input.dispatchTouchEvent, çoklu parmak). Joystick → sürüş, ölü bölge, çoklu dokunuş (joystick + Dash), Sekme,
// Yetenek dokun (oto-nişan) / sürükle-at / geri dön-iptal, nişan ezme ve oto-nişana dönüş, ses bağlamı kilidi; HUD ve
// düğme çakışma / ekran dışı / ≥ 44 px ölçümü; güvenli alan (CDP Emulation.setSafeAreaInsetsOverride, varsa); dikey örtü.
// Geliştirici maç ekranı (?ekran=mac&bot=kukla) kullanılır; üst geliştirici bandı gizlenir (oyuncu ekranlarında yok).
// Önce: npm run dev (ya da ayrı veri dizinli vite). Çalıştır:
//   KLASOR=<çıktı> CIHAZ=iphone14|iphone15max|pixel7|kucuk [ADRES=...] NODE_PATH=<global node_modules> node araclar/mobil-mac.cjs
const { chromium } = require("playwright");
const fs = require("fs");
const T = process.env.ADRES || "http://localhost:5291/";
const K = process.env.KLASOR;
const CIHAZLAR = {
  iphone14: { ad: "iPhone 14/15", w: 844, h: 390, guvenli: { top: 0, left: 47, right: 47, bottom: 21 } },
  iphone15max: { ad: "iPhone 15 Pro Max", w: 932, h: 430, guvenli: { top: 0, left: 59, right: 59, bottom: 21 } },
  pixel7: { ad: "Pixel 7", w: 915, h: 412, guvenli: { top: 0, left: 0, right: 0, bottom: 0 } },
  kucuk: { ad: "küçük 667×375", w: 667, h: 375, guvenli: { top: 0, left: 0, right: 0, bottom: 0 } },
};
const AD = process.env.CIHAZ || "iphone14";
const C = CIHAZLAR[AD];
const ONEK = process.env.ONEK || `MOBIL-${AD}`;
fs.mkdirSync(K, { recursive: true });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const sonuc = { cihaz: C };
(async () => {
  const tar = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=user-gesture-required"] });
  const c = await tar.newContext({ viewport: { width: C.w, height: C.h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const s = await c.newPage();
  const hatalar = [];
  s.on("console", (x) => { if (x.type() === "error") hatalar.push(x.text().slice(0, 300)); });
  s.on("pageerror", (e) => hatalar.push("pageerror " + e.message));
  const cdp = await c.newCDPSession(s);
  try { await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: C.guvenli }); sonuc.guvenliAlanEmulasyonu = C.guvenli; } catch (e) { sonuc.guvenliAlanEmulasyonu = `desteklenmiyor: ${String(e.message).slice(0, 80)}`; }
  await s.goto(`${T}?ekran=mac&debug&bot=kukla`);
  await s.waitForFunction(() => !!window.__mac, null, { timeout: 30000 });
  await s.evaluate(() => { document.body.classList.add("kabuk"); window.dispatchEvent(new Event("resize")); });
  const turda = () => s.waitForFunction(() => window.__mac.durum.mac.faz === "tur", null, { timeout: 40000 });
  await turda();
  await bekle(400);
  const dok = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map((p) => ({ x: p[0], y: p[1], id: p[2], radiusX: 8, radiusY: 8, force: 1 })) });
  const birak = () => dok("touchEnd", []);
  const durum = () => s.evaluate(() => { const m = window.__mac; const t = m.durum.topaclar[m.yerelIndeks]; const r = m.durum.topaclar[1 - m.yerelIndeks]; const d = m.dokunmatik; return { x: Math.round(t.x), z: Math.round(t.z), rakip: [Math.round(r.x), Math.round(r.z)], dashKalan: t.dashKalan, sekmeKalan: t.sekmeKalan, faz: m.durum.mac.faz, sayac: d.sayac, yon: d.yon, nisan: [Math.round(d.nisan.x), Math.round(d.nisan.z)], ezme: d.eziliyor, yetenekKullanimi: m.yetenekKullanimi, iptal: m.girdiDurumu.iptal, basili: m.girdiDurumu.basili, ses: { bagli: m.ses.bagli, baglam: m.ses.baglam } }; });
  // ---- yerleşim ölçümü ----
  const olc = () => s.evaluate(() => {
    const W = innerWidth, H = innerHeight;
    const gor = (e) => { const st = getComputedStyle(e); const r = e.getBoundingClientRect(); return st.display !== "none" && st.visibility !== "hidden" && +st.opacity > 0.05 && r.width > 0 && r.height > 0; };
    const kutu = (e, ad) => { const r = e.getBoundingClientRect(); return { ad, x0: Math.round(r.left), y0: Math.round(r.top), x1: Math.round(r.right), y1: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; };
    const hud = [];
    const mh = document.querySelector(".mh");
    for (const [sec, ad] of [[".pn.sol", "panel-sol"], [".pn.sag", "panel-sag"], [".skor", "skor"], [".sure", "sure"]]) { const e = mh.querySelector(sec); if (e && gor(e)) hud.push(kutu(e, ad)); }
    mh.querySelectorAll(":scope > .tk").forEach((e, i) => { if (gor(e)) hud.push(kutu(e, `takim-${i + 1}`)); });
    const dugme = [];
    const yv = mh.querySelectorAll(":scope > .yv");
    ["yetenek-1", "yetenek-2", "ulti", "takim-ultisi", "dash", "sekme"].forEach((ad, i) => { const e = yv[i]; if (e && gor(e)) dugme.push(kutu(e, ad)); });
    document.querySelectorAll(".dk button").forEach((e) => { if (gor(e)) dugme.push(kutu(e, e.getAttribute("aria-label") || e.textContent.trim())); });
    // yuva / rozet düğmeleri dokunmatikte daire (border-radius 50%): daire-daire ve daire-kutu kesişimi
    const daire = (k) => ["yetenek-1", "yetenek-2", "ulti", "takim-ultisi", "dash", "sekme"].includes(k.ad);
    const kesKutu = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 1 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 1;
    const kes = (a, b) => {
      if (!kesKutu(a, b)) return false;
      const m = (k) => ({ x: (k.x0 + k.x1) / 2, y: (k.y0 + k.y1) / 2, r: k.w / 2 });
      if (daire(a) && daire(b)) { const p = m(a), q = m(b); return Math.hypot(p.x - q.x, p.y - q.y) < p.r + q.r - 1; }
      if (daire(a) || daire(b)) { const p = m(daire(a) ? a : b), k = daire(a) ? b : a; const dx = Math.max(k.x0 - p.x, 0, p.x - k.x1), dy = Math.max(k.y0 - p.y, 0, p.y - k.y1); return Math.hypot(dx, dy) < p.r - 1; }
      return true;
    };
    const cakisma = [];
    for (const d of dugme) for (const h of hud) if (kes(d, h)) cakisma.push(`${d.ad} ⟷ ${h.ad}`);
    for (let i = 0; i < dugme.length; i++) for (let j = i + 1; j < dugme.length; j++) if (kes(dugme[i], dugme[j])) cakisma.push(`${dugme[i].ad} ⟷ ${dugme[j].ad}`);
    const disari = [...hud, ...dugme].filter((k) => k.x0 < 0 || k.y0 < 0 || k.x1 > W || k.y1 > H).map((k) => k.ad);
    const kucuk = dugme.filter((k) => k.w < 44 || k.h < 44).map((k) => `${k.ad} ${k.w}×${k.h}`);
    const dkk = document.querySelector(".dk").getBoundingClientRect();
    return { gorunum: [W, H], katman: [Math.round(dkk.left), Math.round(dkk.top), Math.round(dkk.width), Math.round(dkk.height)], hud, dugme, cakisma, disari, kucuk };
  });
  sonuc.yerlesim = await olc();
  await s.screenshot({ path: `${K}/${ONEK}-mac.png` });
  const kutu = await s.evaluate(() => { const r = document.querySelector(".dk").getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const yer = await s.evaluate(() => window.__mac.dokunmatik.yer);
  const V = (d) => [kutu.x + d.x, kutu.y + d.y];
  const J = [kutu.x + Math.min(160, kutu.w * 0.2), kutu.y + kutu.h * 0.62];
  sonuc.bas = await durum();
  // 1) çoklu dokunuş: joystick yukarı basılıyken Dash (topaç merkeze yakın başlar, halkadan çıkmaz)
  await dok("touchStart", [[J[0], J[1], 1]]);
  await dok("touchMove", [[J[0], J[1] - 60, 1]]); await bekle(60);
  await dok("touchStart", [[J[0], J[1] - 60, 1], [...V(yer.dash), 2]]);
  await bekle(60);
  sonuc.cokluDokunusDash = await durum();
  await birak(); await bekle(1500);
  // 2) joystick sağa (ölü bölge dışı) → yön (1, 0); ölü bölge; yukarı
  await turda();
  await dok("touchStart", [[J[0], J[1], 1]]);
  for (let i = 1; i <= 6; i++) { await dok("touchMove", [[J[0] + i * 10, J[1], 1]]); await bekle(25); }
  await bekle(150);
  sonuc.joystickSag = await durum();
  await s.screenshot({ path: `${K}/${ONEK}-mac-joystick.png` });
  await dok("touchMove", [[J[0] + 6, J[1], 1]]); await bekle(80);
  sonuc.oluBolge = (await durum()).yon;
  await dok("touchMove", [[J[0], J[1] - 60, 1]]); await bekle(80);
  sonuc.joystickYukari = (await durum()).yon;
  await birak(); await bekle(900);
  // 3) Sekme
  await turda();
  await dok("touchStart", [[...V(yer.sekme), 3]]); await bekle(50);
  sonuc.sekme = await durum();
  await birak(); await bekle(900);
  // 4) Yetenek 1 dokun = oto-nişan
  await turda();
  await s.evaluate(() => window.__mac.enerjiDoldur());
  await bekle(100);
  await dok("touchStart", [[...V(yer.y1), 4]]); await bekle(200);
  sonuc.yetenek1Basili = await durum();
  await s.screenshot({ path: `${K}/${ONEK}-mac-yetenek.png` });
  await birak(); await bekle(300);
  sonuc.yetenek1Atildi = await durum();
  await bekle(1500);
  // 5) nişan ezme (joystick + sağ boş alan, iki parmak) ve 900 ms sonra oto-nişana dönüş
  await turda();
  const N = [kutu.x + kutu.w * 0.68, kutu.y + kutu.h * 0.3];
  await dok("touchStart", [[J[0], J[1], 1]]);
  await dok("touchStart", [[J[0], J[1], 1], [N[0], N[1], 5]]);
  for (let i = 1; i <= 5; i++) { await dok("touchMove", [[J[0], J[1], 1], [N[0] - i * 12, N[1] - i * 2, 5]]); await bekle(25); }
  sonuc.nisanEzme = await durum();
  await birak(); await bekle(1200);
  sonuc.nisanEzmeSonrasi = await durum();
  // 6) Yetenek 2: sürükle-çık-geri dön = iptal
  await turda();
  await s.evaluate(() => window.__mac.enerjiDoldur());
  await bekle(100);
  const y2 = V(yer.y2);
  await dok("touchStart", [[y2[0], y2[1], 6]]);
  await dok("touchMove", [[y2[0] - 70, y2[1] - 30, 6]]); await bekle(80);
  await dok("touchMove", [[y2[0] + 2, y2[1] + 1, 6]]); await bekle(80);
  await s.screenshot({ path: `${K}/${ONEK}-mac-iptal.png` });
  await birak(); await bekle(300);
  sonuc.yetenek2Iptal = await durum();
  // 7) Yetenek 2: sürükle-bırak = ezilen yöne at
  await s.evaluate(() => window.__mac.enerjiDoldur());
  await bekle(1500);
  await turda();
  await dok("touchStart", [[y2[0], y2[1], 7]]);
  await dok("touchMove", [[y2[0] - 80, y2[1] + 10, 7]]); await bekle(80);
  await birak(); await bekle(300);
  sonuc.yetenek2SurukleAt = await durum();
  // 8) Menü düğmesi (Esc karşılığı) → menü açılır, joystick susar; Devam ile kapanır
  const mn = await s.evaluate(() => { const r = document.querySelector(".dk button.mn").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await dok("touchStart", [[mn[0], mn[1], 8]]); await birak(); await bekle(300);
  sonuc.menu = await s.evaluate(() => ({ acik: window.__mac.menuAcik, dugmeler: [...document.querySelectorAll(".ms .menu button")].map((b) => { const r = b.getBoundingClientRect(); return `${b.textContent.trim()} ${Math.round(r.width)}×${Math.round(r.height)}`; }) }));
  await s.screenshot({ path: `${K}/${ONEK}-mac-menu.png` });
  await s.evaluate(() => document.querySelector(".ms .menu button.bir").click());
  await bekle(200);
  // 9) dikey: örtü görünür
  await s.setViewportSize({ width: C.h, height: C.w }); await bekle(500);
  sonuc.dikey = await s.evaluate(() => { const o = document.querySelector(".dikey-ortu"); return o ? { gorunur: getComputedStyle(o).display !== "none", metin: o.innerText.replace(/\s+/g, " ") } : null; });
  await s.screenshot({ path: `${K}/${ONEK}-dikey.png` });
  await s.setViewportSize({ width: C.w, height: C.h }); await bekle(500);
  sonuc.yatayaDonus = await s.evaluate(() => getComputedStyle(document.querySelector(".dikey-ortu")).display);
  sonuc.konsolHatalari = hatalar;
  // özet: beklenenler
  const d = sonuc;
  sonuc.kontrol = {
    joystickSurus: d.joystickSag.yon.x > 0.99 && Math.abs(d.joystickSag.yon.z) < 0.01,
    oluBolge: d.oluBolge.x === 0 && d.oluBolge.z === 0,
    joystickYukari: d.joystickYukari.z < -0.99,
    cokluDokunus: d.cokluDokunusDash.dashKalan > 0 && d.cokluDokunusDash.yon.z < -0.99 && d.cokluDokunusDash.sayac.cokluDokunus >= 1,
    sekme: d.sekme.sekmeKalan > 0,
    yetenekOtoNisan: d.yetenek1Basili.basili === 0 && d.yetenek1Basili.nisan[0] === d.yetenek1Basili.rakip[0] && d.yetenek1Atildi.sayac.yetenek === 1,
    nisanEzme: d.nisanEzme.ezme === true && d.nisanEzmeSonrasi.ezme === false,
    iptal: d.yetenek2Iptal.iptal === 1 && d.yetenek2Iptal.sayac.iptal === 1,
    surukleAt: d.yetenek2SurukleAt.sayac.yetenek === 2,
    sesKilidi: d.yetenek2SurukleAt.ses.bagli === true,
    menu: d.menu.acik === true,
    dikeyOrtu: d.dikey?.gorunur === true && d.yatayaDonus === "none",
    cakismaYok: d.yerlesim.cakisma.length === 0,
    ekranDisiYok: d.yerlesim.disari.length === 0,
    hedef44: d.yerlesim.kucuk.length === 0,
    konsolTemiz: hatalar.length === 0,
  };
  fs.writeFileSync(`${K}/${ONEK}-mac.json`, JSON.stringify(sonuc, null, 1));
  console.log(AD, JSON.stringify(sonuc.kontrol), "çakışma:", JSON.stringify(sonuc.yerlesim.cakisma), "dışarı:", JSON.stringify(sonuc.yerlesim.disari), "küçük:", JSON.stringify(sonuc.yerlesim.kucuk), "ses:", JSON.stringify(sonuc.yetenek2SurukleAt.ses), "güvenli:", JSON.stringify(sonuc.guvenliAlanEmulasyonu));
  await tar.close();
})().catch((e) => { console.error(e); process.exit(1); });
