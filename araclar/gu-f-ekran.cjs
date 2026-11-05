// GU-F görsel doğrulaması (docs/production/raporlar/GU-F.md): yeni fizikte (FIZIK-1 ≥ 90 br/s ayrılma) hafif / orta / ağır
// çarpışma ve art arda 3 çarpışma için 6'şar karelik şeritler, referans 07 kıyası. GU-E yöntemi: ticker durur,
// Mac.kareAt(1/60) ile kare kare; zorlamalar yalnız ?debug sayfasındaki çevrimdışı sim kopyasında. 1280×720 CSS × DPR 2.
// Önce dev sunucu: KIMLIK_MODU=sifre npx vite --port 5591 --strictPort
// Çalıştır: NODE_PATH=/opt/node-tools/node_modules ADRES=http://localhost:5591/ node araclar/gu-f-ekran.cjs
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const TABAN = process.env.ADRES || "http://localhost:5591/";
const KLASOR = "docs/production/raporlar/ekran";
const ON = process.env.ON || "GU-F";
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const hatalar = [];
const kayit = { cekilen: [], cozunurluk: "1280×720 CSS, DPR 2 (2560×1440)", serit: {} };
const yol = (ad) => `${KLASOR}/${ON}-${ad}.png`;
const KIRP = { x: 400, y: 170, width: 480, height: 270 };

const m = (s, kod) => s.evaluate((k) => (new Function("mac", `return (${k})(mac)`))(window.__mac), kod);

async function macSayfasi(tar) {
  const b = await tar.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const s = await b.newPage();
  s.on("console", (x) => { if (x.type() === "error" && !/status of 40[0-9]/.test(x.text())) hatalar.push(x.text()); });
  s.on("pageerror", (e) => hatalar.push(`pageerror: ${e.message}`));
  await s.goto(`${TABAN}?ekran=gizlilik`);
  await s.evaluate(() => {
    const GIRDAP = { cekirdek: "girdap-maden", govde: "halka-govde", disk: "parlak-disk", uc: "top-uc" };
    const YAPAY = { cekirdek: "kasirga-yapay", govde: "savrulan-govde", disk: "denge-disk", uc: "dengeli-uc" };
    const DON = { cekirdek: "sabir-tasi", govde: "ayaz-govde", disk: "denge-disk", uc: "duz-uc" };
    localStorage.setItem("devran.takimlar.v1", JSON.stringify([null, null, { ad: "Takım 3", uyeler: [GIRDAP, YAPAY, DON] }]));
  });
  await s.goto(`${TABAN}?ekran=mac&debug&tohum=7&takim=0&rakip=2&bot=kukla`);
  await s.waitForFunction(() => !!window.__mac, null, { timeout: 30000 });
  await s.addStyleTag({ content: "body > header { display: none !important; }" });
  await s.evaluate(() => window.dispatchEvent(new Event("resize")));
  for (let k = 0; k < 600; k++) { if ((await m(s, "(mac) => mac.durum.mac.faz")) === "tur") break; await bekle(25); }
  await s.waitForFunction(() => (window.__mac?.gorseller ?? []).every((x) => x.spriteKatmani !== false), null, { timeout: 15000 }).catch(() => {});
  await bekle(1200);
  await m(s, "(mac) => { mac.botSecimi = 'pasif'; mac.b.app.ticker.stop(); return 1; }");
  return s;
}

/** Ortada karşı karşıya koy, izleri sil, `hiz` ile çarpıştır; olaydan `kare` kare sonra dur. */
async function carpistir(s, hiz, kare) {
  await m(s, "(mac) => { mac.efektler.temizle(); const [o, r] = mac.durum.topaclar; for (let i = 0; i < 40; i++) { o.x = -90; o.z = 8; o.vx = 0; o.vz = 0; r.x = 90; r.z = -8; r.vx = 0; r.vz = 0; mac.kareAt(1 / 60); } mac.izler.forEach((z) => z.sifirla()); return 1; }");
  await m(s, `(mac) => { const [o, r] = mac.durum.topaclar; for (let i = 0; i < 20; i++) { o.x = -40 - ${hiz} * 0.02; o.z = 8; o.vx = 0; o.vz = 0; r.x = 40 + ${hiz} * 0.02; r.z = -8; r.vx = 0; r.vz = 0; mac.kareAt(1 / 60); } mac.izler.forEach((z) => z.sifirla()); for (const [i, t] of [o, r].entries()) { t.tik = 0; t.enerji = 0; t.stamina = mac.durum.profiller[i].maxStamina; } o.vx = ${hiz}; r.vx = -${hiz}; o.vz = 0; r.vz = 0; mac.olaydaDur(['carpisma'], ${kare}, -1); return 1; }`);
  return m(s, "(mac) => { for (let i = 0; i < 240; i++) { mac.kareAt(1 / 60); if (mac.durmaOlayi && !mac.durTalebi) { const o = mac.durmaOlayi; return { vn: Math.round(o.vn), gp: mac.efektler.sonSiddet, kv: mac.efektler.kivilcimlar.adet }; } } return null; }");
}

async function seritYaz(ad, yollar) {
  const W = KIRP.width * 2, H = KIRP.height * 2, ara = 8;
  await sharp({ create: { width: W * yollar.length + ara * (yollar.length - 1), height: H, channels: 3, background: "#101018" } })
    .composite(yollar.map((p, k) => ({ input: p, left: k * (W + ara), top: 0 })))
    .png().toFile(yol(ad));
  for (const p of yollar) fs.unlinkSync(p);
  kayit.cekilen.push(yol(ad));
  console.log("şerit:", yol(ad));
}
const durum = (s) => m(s, "(mac) => { const [p, q] = mac.durum.topaclar; return { kv: mac.efektler.kivilcimlar.adet, flas: mac.efektler.kivilcimlar.flasAdet, mesafe: Math.round(Math.hypot(p.x - q.x, p.z - q.z)), akis: mac.efektler.temasDurumu.aktif }; }");

(async () => {
  const tar = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const s = await macSayfasi(tar);
  // hafif / orta / ağır: olay anı (0) ve sonrası, 33 ms arayla 6 kare
  for (const [ad, hiz] of [["01-serit-hafif", 70], ["02-serit-orta", 120], ["03-serit-agir", 190]]) {
    const olay = await carpistir(s, hiz, 0);
    const yollar = [], kareler = [];
    for (let k = 0; k < 6; k++) {
      if (k > 0) for (let q = 0; q < 2; q++) await m(s, "(mac) => { mac.kareAt(1 / 60); return 1; }");
      kareler.push(await durum(s));
      const p = `${KLASOR}/.gecici-${ad}-${k}.png`;
      await s.screenshot({ path: p, clip: KIRP });
      yollar.push(p);
    }
    kayit.serit[ad] = { olay, kareler };
    await seritYaz(ad, yollar);
    if (ad === "03-serit-agir") {
      await carpistir(s, 330, 1);
      const p = yol("kiyas-07-ham");
      await s.screenshot({ path: p });
    }
  }
  // art arda 3 çarpışma (~0,25 s arayla): her çarpışmanın 1. ve 6. karesi; birikme kısmasıyla kıvılcım bulutlaşmamalı
  {
    await carpistir(s, 150, 0);
    const yollar = [], kareler = [];
    for (let c = 0; c < 3; c++) {
      if (c > 0) {
        // yeniden fırlat: aradaki mesafeden 150 br/s ile birbirine
        await m(s, "(mac) => { const [o, r] = mac.durum.topaclar; const dx = r.x - o.x, dz = r.z - o.z, u = Math.hypot(dx, dz) || 1; o.vx = 150 * dx / u; o.vz = 150 * dz / u; r.vx = -o.vx; r.vz = -o.vz; mac.olaydaDur(['carpisma'], 0, -1); return 1; }");
        const ol = await m(s, "(mac) => { for (let i = 0; i < 120; i++) { mac.kareAt(1 / 60); if (mac.durmaOlayi && !mac.durTalebi) return { vn: Math.round(mac.durmaOlayi.vn), gp: mac.efektler.sonSiddet, yuk: mac.efektler.kivilcimlar.birikmeYuku }; } return null; }");
        kareler.push({ carpisma: c + 1, ...ol });
      }
      for (const [k, ileri] of [[1, 1], [6, 5]]) {
        for (let q = 0; q < ileri; q++) await m(s, "(mac) => { mac.kareAt(1 / 60); return 1; }");
        kareler.push({ carpisma: c + 1, kare: k, ...(await durum(s)) });
        const p = `${KLASOR}/.gecici-artarda-${c}-${k}.png`;
        await s.screenshot({ path: p, clip: KIRP });
        yollar.push(p);
      }
      // ~6 kare daha ayrılsın
      for (let q = 0; q < 6; q++) await m(s, "(mac) => { mac.kareAt(1 / 60); return 1; }");
    }
    kayit.serit["04-serit-artarda-3"] = { kareler };
    await seritYaz("04-serit-artarda-3", yollar);
  }
  await tar.close();
  // referans 07 kıyası
  const b = yol("kiyas-07-ham");
  if (fs.existsSync(b)) {
    const W = 1280, H = 720, ara = 16;
    const r = await sharp(path.join("docs/design/beyblade/gorunum", "07-arena-mac.jpg")).resize(W, H, { fit: "fill" }).png().toBuffer();
    const u = await sharp(b).resize(W, H, { kernel: "nearest" }).png().toBuffer();
    await sharp({ create: { width: W * 2 + ara, height: H, channels: 3, background: "#101018" } })
      .composite([{ input: r, left: 0, top: 0 }, { input: u, left: W + ara, top: 0 }]).png().toFile(yol("kiyas-07"));
    const kr = { left: Math.round(520 / 1376 * W), top: Math.round(250 / 768 * H), width: Math.round(380 / 1376 * W), height: Math.round(290 / 768 * H) };
    const rz = await sharp(r).extract(kr).resize(kr.width * 2, kr.height * 2, { kernel: "nearest" }).png().toBuffer();
    const uz = await sharp(u).extract(kr).resize(kr.width * 2, kr.height * 2, { kernel: "nearest" }).png().toBuffer();
    await sharp({ create: { width: kr.width * 4 + ara, height: kr.height * 2, channels: 3, background: "#101018" } })
      .composite([{ input: rz, left: 0, top: 0 }, { input: uz, left: kr.width * 2 + ara, top: 0 }]).png().toFile(yol("kiyas-07-yakin"));
    fs.unlinkSync(b);
    kayit.cekilen.push(yol("kiyas-07"), yol("kiyas-07-yakin"));
  }
  kayit.hatalar = hatalar;
  fs.writeFileSync(`${KLASOR}/${ON}-ozet.json`, JSON.stringify(kayit, null, 1) + "\n");
  console.log(JSON.stringify(kayit, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
