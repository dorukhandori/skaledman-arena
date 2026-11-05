// MOBIL-1 menü denetimi: telefon yatay emülasyonu (isMobile + hasTouch, DPR 2) ile menü ekranlarını gezer; her ekranda
// ekran görüntüsü + otomatik ölçüm: sayfa kayması, ekran dışına taşan metin, kesilen metin, birbirine binen düğmeler,
// dokunma hedefi < 44 CSS px (gerçek isabet: elementFromPoint ile 44×44 kutunun köşeleri), en küçük yazı, dikey örtü.
// Önce ayrı veri dizinli sunucu: KIMLIK_MODU=sifre OTURUM_SIRRI=<yerel> VERI_DIZINI=<tmp> npx vite --port 5291 --strictPort
// Çalıştır: KLASOR=<çıktı> CIHAZ=iphone14|iphone15max|pixel7|kucuk [ADRES=http://localhost:5291/] node araclar/mobil-denetim.cjs
// (playwright ortamda kurulu: NODE_PATH=<global node_modules>)
const { chromium } = require("playwright");
const fs = require("fs");
const TABAN = process.env.ADRES || "http://localhost:5291/";
const KLASOR = process.env.KLASOR;
const CIHAZLAR = {
  iphone14: { ad: "iPhone 14/15", w: 844, h: 390, ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" },
  iphone15max: { ad: "iPhone 15 Pro Max", w: 932, h: 430, ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" },
  pixel7: { ad: "Pixel 7", w: 915, h: 412, ua: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36" },
  kucuk: { ad: "küçük 667×375", w: 667, h: 375, ua: "Mozilla/5.0 (Linux; Android 12; SM-A125F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36" },
};
const C = CIHAZLAR[process.env.CIHAZ || "iphone14"];
fs.mkdirSync(KLASOR, { recursive: true });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const ek = Date.now().toString(36).slice(-4);
const rapor = { cihaz: C, ekranlar: {} };
const hatalar = [];

const denetle = () => {
  const W = innerWidth, H = innerHeight;
  const gorunur = (e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && +s.opacity > 0.05 && r.width > 0 && r.height > 0; };
  const ad = (e) => (e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/).slice(0, 3).join(".") : "") + (e.dataset.eylem ? `[eylem=${e.dataset.eylem}]` : "")).slice(0, 70);
  const metin = (e) => (e.innerText || e.value || e.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 40);
  const tum = [...document.querySelectorAll("body *")].filter(gorunur);
  const disari = [], kirpik = [];
  for (const e of tum) {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    if (["CANVAS", "SVG", "svg", "IMG"].includes(e.tagName)) continue;
    // ekran dışına taşan metin (kaydırılabilir bir atanın içinde değilse)
    let kayan = false;
    for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const ps = getComputedStyle(p); if (/(auto|scroll)/.test(ps.overflowY + ps.overflowX) && (p.scrollHeight > p.clientHeight + 1 || p.scrollWidth > p.clientWidth + 1)) { kayan = true; break; } }
    if (!kayan && (r.right > W + 2 || r.bottom > H + 2 || r.left < -2 || r.top < -2) && metin(e) && e.children.length === 0) disari.push(`${ad(e)} "${metin(e)}" [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`);
    // ekran okuyucu metni (1 px kırpık kutu, görsel değil) sayılmaz
    if (e.clientWidth > 1 && (s.overflow.includes("hidden") || s.textOverflow === "ellipsis" || s.overflowX === "hidden") && e.scrollWidth > e.clientWidth + 2 && metin(e) && e.children.length === 0) kirpik.push(`${ad(e)} "${metin(e)}" ${e.scrollWidth}>${e.clientWidth}`);
  }
  const etkilesimli = tum.filter((e) => e.matches("button, a[href], [role=button], [role=tab], [role=radio], [data-eylem], input:not([type=hidden]), select, [tabindex='0']") && !e.closest("[aria-hidden=true]") && getComputedStyle(e).pointerEvents !== "none");
  // gerçek isabet kutusu: merkez çevresinde 44×44 karenin köşe ve kenar ortaları aynı öğeye (ya da çocuğuna) düşüyor mu
  const kucuk = [];
  let olculen = 0, kismen = 0;
  for (const e of etkilesimli) {
    const r = e.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx > W || cy > H) continue;
    const ust = (x, y) => { if (x < 0 || y < 0 || x > W - 1 || y > H - 1) return false; const t = document.elementFromPoint(x, y); return !!t && (t === e || e.contains(t)); };
    if (!ust(cx, cy)) continue; // örtülü öğe (açılır menü altı, kaydırılmış dışarı) ölçülmez
    // iç kaydırmada yarım görünen öğe: görünür kısmı küçük ama kaydırınca tam görünür → ayrıca sayılır, hedef ölçülmez
    if (!ust(cx, r.top + 1) || !ust(cx, r.bottom - 1)) { if (r.top < 0 || r.bottom > H || !ust(cx, Math.max(0, r.top + 1)) || !ust(cx, Math.min(H - 1, r.bottom - 1))) { kismen++; continue; } }
    olculen++;
    // gerçek isabet kutusu: merkezden 1 px adımla dışa (görünmez isabet payı ::after dahil), en çok ±30
    // dört yöne ayrı ayrı (ekran kenarındaki öğenin isabet payı tek yöne uzar)
    // ekran kenarına dayanan isabet payı kenarda sonsuz sayılır (Fitts: kenar hedefi kaçmaz)
    const uzan = (dx, dy) => { let n = 0; while (n < 40) { const x = cx + dx * (n + 1), y = cy + dy * (n + 1); if (x < 0 || y < 0 || x > W - 1 || y > H - 1) return 40; if (!ust(x, y)) break; n++; } return n; };
    const ig = uzan(1, 0) + uzan(-1, 0) + 1, iy = uzan(0, 1) + uzan(0, -1) + 1;
    if (ig < 43 || iy < 43) kucuk.push(`${ad(e)} "${metin(e)}" görsel ${Math.round(r.width)}×${Math.round(r.height)} isabet ${ig}×${iy}`);
  }
  const binen = [];
  for (let i = 0; i < etkilesimli.length; i++) for (let j = i + 1; j < etkilesimli.length; j++) {
    const a = etkilesimli[i], b = etkilesimli[j];
    if (a.contains(b) || b.contains(a)) continue;
    const r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect();
    const x = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left), y = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top);
    if (x > 4 && y > 4) binen.push(`${ad(a)} "${metin(a)}" ⟷ ${ad(b)} "${metin(b)}"`);
  }
  const yazilar = tum.filter((e) => e.children.length === 0 && (e.innerText || "").trim());
  // m5x7: büyük harf ≈ font-size × 7/16; Jersey 10 ≈ × 0,5; sistem yazısı ≈ × 0,7
  const buyukHarf = (e) => { const s = getComputedStyle(e); const f = parseFloat(s.fontSize); const ail = s.fontFamily.toLowerCase(); return ail.startsWith("\"m5x7") || ail.startsWith("m5x7") ? f * 7 / 16 : ail.includes("jersey") ? f * 0.5 : f * 0.7; };
  const kucukYazi = yazilar.filter((e) => buyukHarf(e) < 7.5).map((e) => `${ad(e)} "${metin(e)}" ${getComputedStyle(e).fontSize} ${getComputedStyle(e).fontFamily.split(",")[0]}`);
  const dikey = document.querySelector(".dikey-ortu");
  return {
    url: location.search, olcek: getComputedStyle(document.documentElement).getPropertyValue("--o").trim(), yaziOlcek: getComputedStyle(document.documentElement).getPropertyValue("--yo").trim(),
    sayfaKaydirma: document.documentElement.scrollWidth > W + 1 || document.documentElement.scrollHeight > H + 1 ? [document.documentElement.scrollWidth, document.documentElement.scrollHeight, W, H] : 0,
    disari: disari.slice(0, 10), kirpik: kirpik.slice(0, 10), binen: binen.slice(0, 10),
    olculenHedef: olculen, kismenGorunur: kismen, kucukHedef: kucuk.slice(0, 20), kucukHedefSayisi: kucuk.length,
    kucukYazi: kucukYazi.slice(0, 10), kucukYaziSayisi: kucukYazi.length,
    dikeyOrtu: dikey ? getComputedStyle(dikey).display : "yok",
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
  try { rapor.ekranlar[ad] = await s.evaluate(denetle); } catch (e) { rapor.ekranlar[ad] = { hata: String(e).slice(0, 200) }; }
  const r = rapor.ekranlar[ad];
  console.log("ekran", ad, r.hata ?? `kayma=${JSON.stringify(r.sayfaKaydirma)} dışarı=${r.disari.length} kırpık=${r.kirpik.length} binen=${r.binen.length} hedef<44=${r.kucukHedefSayisi}/${r.olculenHedef} küçükYazı=${r.kucukYaziSayisi}`);
}
async function git(s, ekran, ad, ms) { await s.goto(`${TABAN}?ekran=${ekran}`); await cek(s, ad || ekran, ms); }

(async () => {
  const tar = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const b = await tar.newContext({ viewport: { width: C.w, height: C.h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: C.ua });
  const s = await b.newPage();
  s.on("console", (x) => { if (x.type() === "error") hatalar.push(`[${x.type()}] ${s.url().split("?")[1] || ""}: ${x.text().slice(0, 200)}`); });
  s.on("pageerror", (e) => hatalar.push(`pageerror ${s.url().split("?")[1] || ""}: ${e.message}`));
  const SECIM = process.argv.slice(2);
  const ister = (a) => !SECIM.length || SECIM.includes(a);
  if (ister("misafir")) {
    await s.goto(TABAN); await cek(s, "01-karsilama");
    await git(s, "kayit", "02-kayit");
    await git(s, "giris", "03-giris");
  }
  await s.goto(`${TABAN}?ekran=gizlilik`);
  rapor.kayit = (await api(s, "POST", "/api/kayit", { ad: `Mobil ${ek}`, sifre: "mobil-denetim-1", sifreTekrar: "mobil-denetim-1" })).durum;
  rapor.profil = (await api(s, "POST", "/api/profil", { arma: "kasirga", renk: "#2fb8e8" })).durum;
  if (ister("ilk")) await git(s, "ilk-cekirdek", "04-ilk-cekirdek", 2500);
  rapor.ilk = (await api(s, "POST", "/api/ilk-cekirdek", { set: "goktasi" })).durum;
  rapor.egitim = (await api(s, "POST", "/api/egitim-bitti", {})).durum;
  await api(s, "POST", "/api/gelistirme/altin-ver", { miktar: 1500 });
  if (ister("ana")) {
    await git(s, "atolye", "10-atolye", 4500);
    await git(s, "market", "11-market", 3500);
    await git(s, "basarimlar", "12-basarimlar", 2500);
    await git(s, "lobi", "13-lobi", 3000);
    await git(s, "profil", "14-profil", 2000);
    await git(s, "ayarlar", "15-ayarlar", 2000);
    await git(s, "gunluk", "16-gunluk", 2500);
  }
  if (ister("dokunma")) {
    // gerçek dokunuş olayları (CDP Input.dispatchTouchEvent): Atölye 3B döndürme, liste kaydırma, oda kodu klavyesi
    const cdp = await b.newCDPSession(s);
    const dok = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map((p) => ({ x: p[0], y: p[1], id: 1, radiusX: 6, radiusY: 6, force: 1 })) });
    const surukle = async (x0, y0, x1, y1, n = 10) => { await dok("touchStart", [[x0, y0]]); for (let i = 1; i <= n; i++) { await dok("touchMove", [[x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]]); await bekle(16); } await dok("touchEnd", []); };
    rapor.dokunma = {};
    await s.goto(`${TABAN}?ekran=atolye`); await bekle(4500);
    if (await s.$(".p-dugme")) { await s.tap(".p-dugme").catch(() => {}); await bekle(300); }
    const t = await s.evaluate(() => { const c = document.querySelector(".g3-tuval"); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.75, yaw: window.__atolye?.sahne?.gd?.aci?.yaw ?? null }; });
    if (t) {
      await surukle(t.x - 60, t.y, t.x + 60, t.y);
      await bekle(300);
      const yaw = await s.evaluate(() => window.__atolye?.sahne?.gd?.aci?.yaw ?? null);
      rapor.dokunma.atolye3bDondurme = { once: t.yaw, sonra: yaw, degisti: t.yaw !== yaw };
      await s.screenshot({ path: `${KLASOR}/18-atolye-dondurulmus.png` });
    }
    // parça kartına dokun: tak (ya da Market'e git) — tıklama dokunuştan doğuyor mu
    const kartSay = await s.evaluate(() => document.querySelectorAll(".at .pc").length);
    rapor.dokunma.parcaKarti = kartSay;
    const kaydir = async (ekran, secici) => {
      await s.goto(`${TABAN}?ekran=${ekran}`); await bekle(3000);
      const k = await s.evaluate((sec) => {
        const adaylar = [...document.querySelectorAll(sec)].filter((e) => { const st = getComputedStyle(e); return /(auto|scroll)/.test(st.overflowY) && e.scrollHeight > e.clientHeight + 4; });
        const e = adaylar[0]; if (!e) return null; e.dataset.kaydirTest = "1"; const r = e.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height * 0.7, y1: r.top + r.height * 0.2, once: e.scrollTop, sinif: e.className.slice(0, 40), fark: e.scrollHeight - e.clientHeight };
      }, secici);
      if (!k) return { kaydirilacakYok: true };
      await surukle(k.x, k.y, k.x, k.y1, 12);
      await bekle(400);
      const sonra = await s.evaluate(() => document.querySelector("[data-kaydir-test]").scrollTop);
      const sayfa = await s.evaluate(() => [document.scrollingElement.scrollTop, window.scrollY]);
      return { kap: k.sinif, once: k.once, sonra, kaydi: sonra > k.once, sayfaKaymadi: sayfa[0] === 0 && sayfa[1] === 0 };
    };
    rapor.dokunma.basarimKaydirma = await kaydir("basarimlar", ".bs *, .rf *");
    rapor.dokunma.marketKaydirma = await kaydir("market", ".rf *, .mk *");
    rapor.dokunma.ayarKaydirma = await kaydir("ayarlar", ".ekr *");
    // oda kodu: karo alanına dokun → gizli giriş odaklanır (mobil klavye açılır)
    await s.goto(`${TABAN}?ekran=lobi`); await bekle(2500);
    await s.tap("[data-mod=oda]").catch(() => {});
    await bekle(800);
    await s.tap(".lb-karo-alan").catch(() => {});
    await bekle(300);
    rapor.dokunma.odaKoduOdak = await s.evaluate(() => ({ odakta: document.activeElement?.tagName, inputmode: document.activeElement?.inputMode, autocapitalize: document.activeElement?.getAttribute?.("autocapitalize") }));
    await s.keyboard.type("abcd");
    rapor.dokunma.odaKoduKarolar = await s.evaluate(() => [...document.querySelectorAll(".k-karo")].map((k) => k.textContent).join(""));
    console.log("dokunma", JSON.stringify(rapor.dokunma));
  }
  if (ister("oda")) {
    await s.goto(`${TABAN}?ekran=lobi`); await bekle(2500);
    await s.tap("[data-mod=oda]").catch(() => {});
    await cek(s, "17-lobi-oda", 1200);
    // kodla katıl alanı: mobil klavye öznitelikleri
    rapor.kodAlani = await s.evaluate(() => [...document.querySelectorAll("input")].map((i) => ({ ad: i.name || i.className, inputmode: i.inputMode, autocapitalize: i.autocapitalize, autocomplete: i.autocomplete, enterkeyhint: i.enterKeyHint, spellcheck: i.spellcheck, font: getComputedStyle(i).fontSize })));
  }
  if (ister("dikey")) {
    await s.setViewportSize({ width: C.h, height: C.w });
    await s.goto(`${TABAN}?ekran=atolye`); await cek(s, "90-dikey-ortu", 2500);
    await s.setViewportSize({ width: C.w, height: C.h });
  }
  rapor.konsol = hatalar;
  fs.writeFileSync(`${KLASOR}/rapor.json`, JSON.stringify(rapor, null, 1));
  console.log("konsol hatası:", hatalar.length);
  await tar.close();
})().catch((e) => { console.error(e); rapor.olumcul = String(e); rapor.konsol = hatalar; fs.writeFileSync(`${KLASOR}/rapor.json`, JSON.stringify(rapor, null, 1)); process.exit(1); });
