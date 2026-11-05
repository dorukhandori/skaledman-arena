// SANAT entegrasyon doğrulaması (docs/production/raporlar/SANAT-ENTEGRASYON.md): Ata Ulti (6 element), Takım Ultisi, Özel Yetenek
// (portre bayrağı kapalı/açık), Düz görünüm, ilk yükleme, Atölye Pergel. Önce dev sunucu (npx vite --port 5196, KIMLIK_MODU=sifre ...).
// Çalıştır: NODE_PATH=/opt/node-tools/node_modules node araclar/sanat-ekran.cjs docs/production/raporlar/ekran [yukleme kor ... takim duz ozel pergel]
const { chromium } = require("playwright");
const fs = require("fs");
const TABAN = process.env.MAC_ADRES || "http://localhost:5196/";
const KLASOR = process.argv[2] || ".";
const SECIM = process.argv.slice(3);
const KARE = Number(process.env.KARE || 16);
const PUBLIC = process.env.PUBLIC_DIZIN || "public";
fs.mkdirSync(KLASOR, { recursive: true });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const CEK = { kor: "kor-goktasi", kaya: "kaya-maden", kasirga: "kasirga-yapay", simsek: "simsek-goktasi", girdap: "girdap-maden", don: "sabir-tasi" };
const SET = {
  "kor-goktasi": { govde: "ok-govde", disk: "hafif-disk", uc: "duz-uc" },
  "kaya-maden": { govde: "kalkan-govde", disk: "agir-disk", uc: "igne-uc" },
  "kasirga-yapay": { govde: "savrulan-govde", disk: "denge-disk", uc: "dengeli-uc" },
  "simsek-goktasi": { govde: "ok-govde", disk: "alcak-disk", uc: "kusak-ucu" },
  "girdap-maden": { govde: "halka-govde", disk: "parlak-disk", uc: "top-uc" },
  "sabir-tasi": { govde: "ayaz-govde", disk: "denge-disk", uc: "duz-uc" },
};
const uye = (c) => ({ cekirdek: c, ...SET[c] });
const hatalar = [];
const kayit = { tarayici: null, cekilen: [], ataYuklenen: {}, kare: {} };
const yuzde = (a, q) => { const x = [...a].sort((p, r) => p - r); return +(x[Math.min(x.length - 1, Math.floor(x.length * q))] ?? 0).toFixed(2); };

async function sayfa(tar, sorgu, takim0, ayar) {
  const b = await tar.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const s = await b.newPage();
  const istek = [];
  s.on("console", (x) => { if (x.type() === "error") hatalar.push(`${sorgu}: ${x.text()}`); });
  s.on("pageerror", (e) => hatalar.push(`${sorgu}: pageerror: ${e.message}`));
  s.on("requestfailed", (r) => hatalar.push(`${sorgu}: requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  s.on("response", (r) => { const u = r.url().replace(/^https?:\/\/[^/]+/, "").split("?")[0]; if (/^\/(ruh|bilgic|topac|ses|efekt|yazi)\//.test(u)) { let n = 0; try { n = fs.statSync(PUBLIC + u).size; } catch { /* yok */ } istek.push(u + " " + n); } });
  await s.goto(`${TABAN}?ekran=gizlilik`);
  await s.evaluate(([t, a]) => {
    if (t) { const ham = [t, t, t]; localStorage.setItem("devran.takimlar.v1", JSON.stringify(ham.map((x, i) => ({ ad: "T" + i, uyeler: x })))); }
    if (a) localStorage.setItem("devran.ayarlar.v1", JSON.stringify(a));
  }, [takim0, ayar]);
  await s.goto(`${TABAN}?${sorgu}`);
  s.istek = istek;
  return s;
}
const m = (s, f) => s.evaluate((kod) => (new Function("mac", `return (${kod})(mac)`))(window.__mac), f);
const faz = (s) => m(s, "(mac) => mac.durum.mac.faz");
const turaKadar = async (s) => { for (let k = 0; k < 600; k++) { if ((await faz(s)) === "tur") return; await bekle(25); } };
const durdu = (s) => m(s, "(mac) => mac.durdu");
const durmayiBekle = async (s, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await durdu(s)) return true; await bekle(30); } return false; };
const foto = async (s, ad) => { const yol = `${KLASOR}/SANAT-${ad}.png`; await s.screenshot({ path: yol }); kayit.cekilen.push(yol); console.log("  ekran:", yol); };
const macBekle = (s) => s.waitForFunction(() => !!window.__mac, null, { timeout: 20000 });

/** Yerel topaç (i=0) bu yuvayı kullanır; olaydan `kare` render karesi sonra durur. */
async function yetenekAni(s, tus, kare, hazirla) {
  await s.mouse.move(640, 300); await s.mouse.down(); await s.mouse.up();
  await turaKadar(s);
  await bekle(600);
  await m(s, hazirla);
  await bekle(1500); // tembel yükleme: Enerji yarıyı geçince Ata sayfası istenir
  const p = await m(s, "(mac) => ({ x: mac.durum.topaclar[1].x, z: mac.durum.topaclar[1].z })");
  const e = await m(s, `(mac) => mac.ekranNoktasi(${p.x}, ${p.z})`);
  await s.mouse.move(e.x, e.y);
  await m(s, `(mac) => mac.olaydaDur(["yetenekBasladi"], ${kare}, 0)`);
  for (let k = 0; k < 6 && !(await durdu(s)); k++) { await s.keyboard.down(tus); await bekle(80); await s.keyboard.up(tus); if (await durmayiBekle(s, 6000)) break; }
  return durdu(s);
}

(async () => {
  const tar = await chromium.launch();
  kayit.tarayici = tar.version();
  const ister = (a) => SECIM.length === 0 || SECIM.includes(a);
  const ELEMENTLER = ["kor", "simsek", "kasirga", "girdap", "kaya", "don"];
  for (const el of ELEMENTLER) {
    if (!ister(el)) continue;
    const digerleri = Object.values(CEK).filter((c) => c !== CEK[el]).slice(0, 2);
    const s = await sayfa(tar, `ekran=mac&debug&tohum=21&takim=0&rakip=1&bot=kukla`, [uye(CEK[el]), ...digerleri.map(uye)]);
    await macBekle(s);
    await m(s, "(mac) => { window.__olc = mac.olcumBaslat(); return 1; }");
    // ZORLAMA (yalnız Kasırga): başlangıç parçalarında Kasırga Çekirdeği (kasirga-yapay) Ulti yuvası boş; Ata Savruğu (18) yuvaya yazılır
    const zorla = el === "kasirga" ? "mac.durum.profiller[0].yetenekler[2] = 18; " : "";
    const ok = await yetenekAni(s, "Digit3", KARE, `(mac) => { ${zorla}mac.enerjiDoldur(0, 300); return 1; }`);
    if (ok) await foto(s, `ulti-${el}`); else kayit[`ulti-${el}`] = "olmadı";
    kayit.ataYuklenen[el] = [...s.istek];
    kayit[`sayac-${el}`] = await m(s, "(mac) => ({ ...mac.yetenekGorsel.ruh.sayac })");
    await m(s, "(mac) => mac.devam()");
    await bekle(3000);
    const o = await s.evaluate(() => window.__olc.isMs.slice(3));
    kayit.kare[el] = { n: o.length, p50: yuzde(o, 0.5), p95: yuzde(o, 0.95), enCok: yuzde(o, 1) };
    await s.context().close();
  }
  if (ister("yukleme")) {
    // ilk yükleme: maç başı + 4 s turda (Enerji yok) hangi ruh/topaç varlıkları iniyor; sonra yerel Enerji dolunca
    const s = await sayfa(tar, `ekran=mac&debug&tohum=21&takim=0&rakip=1&bot=kukla`, null);
    await macBekle(s);
    await turaKadar(s);
    await bekle(4000);
    kayit.yuklemeBas = [...s.istek];
    await m(s, "(mac) => { mac.enerjiDoldur(0, 300); return 1; }");
    await bekle(2500);
    kayit.yuklemeEnerji = s.istek.slice(kayit.yuklemeBas.length);
    await s.context().close();
  }
  if (ister("takim")) {
    const s = await sayfa(tar, `ekran=mac&debug&tohum=21&takim=0&rakip=1&bot=kukla`, null);
    await macBekle(s);
    const ok = await yetenekAni(s, "Digit4", KARE, "(mac) => { mac.durum.takimEnerji[0] = 100; return 1; }");
    if (ok) await foto(s, "takim-ultisi"); else kayit["takim"] = "olmadı";
    kayit["sayac-takim"] = await m(s, "(mac) => ({ ...mac.yetenekGorsel.ruh.sayac })");
    await s.context().close();
  }
  if (ister("duz")) {
    const s = await sayfa(tar, `ekran=mac&debug&tohum=21&takim=0&rakip=1&bot=kukla&gorunum=duz`, null);
    await macBekle(s);
    const ok = await yetenekAni(s, "Digit3", KARE, "(mac) => { mac.enerjiDoldur(0, 300); return 1; }");
    if (ok) await foto(s, "ulti-duz-gorunum"); else kayit["duz"] = "olmadı";
    await s.context().close();
  }
  for (const [ad, sorgu] of [["ozel-portre-kapali", ""], ["ozel-portre-acik", "&ruhportre=1"]]) {
    if (!ister("ozel")) continue;
    const s = await sayfa(tar, `ekran=mac&debug&tohum=21&takim=0&rakip=1&bot=kukla${sorgu}`, null);
    await macBekle(s);
    const ok = await yetenekAni(s, "Digit2", 12, "(mac) => { mac.enerjiDoldur(0, 300); return 1; }");
    if (ok) await foto(s, ad); else kayit[ad] = "olmadı";
    kayit[`sayac-${ad}`] = await m(s, "(mac) => ({ ...mac.yetenekGorsel.ruh.sayac })");
    kayit[`istek-${ad}`] = [...s.istek];
    await s.context().close();
  }
  if (ister("pergel")) {
    // Atölye: yeni hesap (kayıt + profil + ilk Çekirdek) → ilk ziyaret ipucu; sonra kapat, H ile sor; Ayarlar'da İpuçları
    const b = await tar.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
    const s = await b.newPage();
    s.on("console", (x) => { if (x.type() === "error") hatalar.push(`atolye: ${x.text()}`); });
    s.on("pageerror", (e) => hatalar.push(`atolye: pageerror: ${e.message}`));
    await s.goto(`${TABAN}?ekran=ayarlar`);
    const api = (yontem, yol, govde) => s.evaluate(async ([y, u, g]) => { const r = await fetch(u, { method: y, headers: { "content-type": "application/json" }, body: y === "GET" ? undefined : JSON.stringify(g) }); return r.status; }, [yontem, yol, govde || {}]);
    const ad = "pergel" + Date.now().toString(36).slice(-5);
    kayit.pergelHesap = [await api("POST", "/api/kayit", { ad, sifre: "topac-sifre-1", sifreTekrar: "topac-sifre-1" }), await api("POST", "/api/profil", { arma: "kaya", renk: "#2fb8e8" }), await api("POST", "/api/ilk-cekirdek", { set: "goktasi" })];
    await s.goto(`${TABAN}?ekran=atolye`);
    await s.waitForFunction(() => !!window.__atolye, null, { timeout: 20000 });
    await bekle(2600);
    await foto(s, "pergel-atolye-ilk");
    const durumAl = () => s.evaluate(() => { const p = document.querySelector(".pergel"); if (!p) return null; const r = p.getBoundingClientRect(); const o = document.querySelector("[data-eylem=oyna]")?.getBoundingClientRect(); const bal = p.querySelector(".p-balon")?.getBoundingClientRect(); return { sinif: p.className, metin: p.querySelector(".p-metin")?.textContent, kutu: [r.x, r.y, r.width, r.height].map(Math.round), oyna: o ? [o.x, o.y, o.width, o.height].map(Math.round) : null, balon: bal ? [bal.x, bal.y, bal.width, bal.height].map(Math.round) : null, ortusme: !!(o && bal && !(bal.right < o.left || bal.left > o.right || bal.bottom < o.top || bal.top > o.bottom)), font: getComputedStyle(p.querySelector(".p-metin")).fontFamily, odak: document.activeElement?.className }; });
    kayit.pergelIlk = await durumAl();
    await s.keyboard.press("Escape"); await bekle(400);
    kayit.pergelKapali = await durumAl();
    await s.keyboard.press("h"); await bekle(600);
    kayit.pergelSor = await durumAl();
    await foto(s, "pergel-atolye-sor");
    await s.goto(`${TABAN}?ekran=ayarlar`); await bekle(1200);
    await foto(s, "pergel-ayarlar");
    kayit.ayarIpucu = await s.evaluate(() => [...document.querySelectorAll("label, legend, h3, dt, .ad, span")].map((x) => x.textContent.trim()).filter((t) => /İpuçları|Pergel/.test(t)).slice(0, 4));
    // kapalı: Pergel hiç görünmez
    await s.evaluate(() => { const a = JSON.parse(localStorage.getItem("devran.ayarlar.v1") || "{}"); a.pergel = "kapali"; localStorage.setItem("devran.ayarlar.v1", JSON.stringify(a)); });
    await s.goto(`${TABAN}?ekran=atolye`); await s.waitForFunction(() => !!window.__atolye, null, { timeout: 20000 }); await bekle(2200);
    kayit.pergelAyarKapali = await durumAl();
    await b.close();
  }
  kayit.hatalar = hatalar;
  fs.writeFileSync(`${KLASOR}/SANAT-ozet.json`, JSON.stringify(kayit, null, 1));
  console.log(JSON.stringify(kayit, null, 1));
  await tar.close();
})().catch((e) => { console.error(e); process.exit(1); });
