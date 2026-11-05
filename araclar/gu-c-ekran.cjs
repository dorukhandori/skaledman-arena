// GU-C görsel uyum doğrulaması (docs/production/raporlar/GU-C.md): maç (normal, çarpışma, Ulti), Topaç Lab ve lobi takım
// kartı; 1280×720 CSS × DPR 2. Yan yana kıyas: referans 07/08 | uygulama (aynı 1280×720 çerçeve).
// Önce dev sunucu: KIMLIK_MODU=sifre npx vite --port 5291
// Çalıştır: NODE_PATH=/opt/node-tools/node_modules ADRES=http://localhost:5291/ SONEK=sonra node araclar/gu-c-ekran.cjs [mac ulti lab lobi kiyas]
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const TABAN = process.env.ADRES || "http://localhost:5291/";
const KLASOR = process.env.KLASOR || "docs/production/raporlar/ekran";
const SONEK = process.env.SONEK ? `-${process.env.SONEK}` : "";
const SECIM = process.argv.slice(2);
const ister = (a) => !SECIM.length || SECIM.includes(a);
fs.mkdirSync(KLASOR, { recursive: true });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const hatalar = [];
const kayit = { cekilen: [], cozunurluk: "1280×720 CSS, DPR 2 (2560×1440)" };
const yol = (ad) => `${KLASOR}/GU-C-${ad}${SONEK}.png`;

let tar;
async function sayfa(ad) {
  const b = await tar.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const s = await b.newPage();
  s.on("console", (x) => { if (x.type() === "error" && !/status of 40[0-9]/.test(x.text())) hatalar.push(`${ad}: ${x.text()}`); });
  s.on("pageerror", (e) => hatalar.push(`${ad}: pageerror: ${e.message}`));
  return s;
}
async function foto(s, ad) {
  await s.screenshot({ path: yol(ad) });
  kayit.cekilen.push(yol(ad));
  console.log("ekran:", yol(ad));
}
const m = (s, kod) => s.evaluate((k) => (new Function("mac", `return (${k})(mac)`))(window.__mac), kod);
const faz = (s) => m(s, "(mac) => mac.durum.mac.faz");
const turaKadar = async (s) => { for (let k = 0; k < 600; k++) { if ((await faz(s)) === "tur") return; await bekle(25); } };
const durdu = (s) => m(s, "(mac) => mac.durdu");
const durmayiBekle = async (s, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await durdu(s)) return true; await bekle(30); } return false; };
/**
 * Maç sayfası. Referans 07/08 gibi Kor (turuncu) ↔ Girdap (mavi): Takım 3'ün ilk topacı Girdap yapılır (yalnız bu
 * tarayıcı bağlamı, localStorage `devran.takimlar.v1`; oyun kuralı: 3 farklı Çekirdek). Geliştirici üst gezinti çubuğu
 * (yalnız ?ekran=mac geliştirici sayfasında var; lobi → maç akışında yok) kıyas için gizlenir: oyuncunun gördüğü çerçeve.
 */
async function macSayfasi(sorgu) {
  const s = await sayfa(sorgu);
  await s.goto(`${TABAN}?ekran=gizlilik`);
  await s.evaluate(() => {
    const GIRDAP = { cekirdek: "girdap-maden", govde: "halka-govde", disk: "parlak-disk", uc: "top-uc" };
    const YAPAY = { cekirdek: "kasirga-yapay", govde: "savrulan-govde", disk: "denge-disk", uc: "dengeli-uc" };
    const DON = { cekirdek: "sabir-tasi", govde: "ayaz-govde", disk: "denge-disk", uc: "duz-uc" };
    localStorage.setItem("devran.takimlar.v1", JSON.stringify([null, null, { ad: "Takım 3", uyeler: [GIRDAP, YAPAY, DON] }]));
  });
  await s.goto(`${TABAN}?${sorgu}`);
  await s.waitForFunction(() => !!window.__mac, null, { timeout: 30000 });
  await s.addStyleTag({ content: "body > header { display: none !important; }" });
  await s.evaluate(() => window.dispatchEvent(new Event("resize")));
  return s;
}
/** Topaç atlasları (tembel) yüklenene kadar bekle: sprite kipine geçen topaç sayısı. */
const atlasBekle = (s) => s.waitForFunction(() => {
  const g = window.__mac?.gorseller ?? [];
  return g.length > 0 && g.every((x) => x.spriteKatmani !== false);
}, null, { timeout: 15000 }).then(() => true).catch(() => false);

(async () => {
  tar = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  if (ister("mac")) {
    const s = await macSayfasi("ekran=mac&debug&oto=kenar&tohum=7&takim=0&rakip=2");
    await turaKadar(s);
    kayit.atlas = await atlasBekle(s);
    await bekle(2000);
    await foto(s, "01-normal");
    // ZORLAMA (yalnız ?debug, istemcideki çevrimdışı sim kopyası; GU-B yöntemi): ilk turda Kor ↔ Girdap ağır çarpışma,
    // referans 07 gibi çanağın ortasında; olaydan 1 kare sonra dur
    await m(s, "(mac) => { const [o, r] = mac.durum.topaclar; o.x = -90; o.z = 8; o.vx = 0; o.vz = 0; r.x = 90; r.z = -8; r.vx = 0; r.vz = 0; return 1; }");
    await bekle(400);
    await m(s, "(mac) => { mac.izler.forEach((z) => z.sifirla()); return 1; }"); // ışınlanma izi (zorlama yapıntısı) silinsin
    await m(s, "(mac) => { const [o, r] = mac.durum.topaclar; o.x = -90; o.z = 8; o.vx = 380; o.vz = 0; r.x = 90; r.z = -8; r.vx = -380; r.vz = 0; mac.olaydaDur(['carpisma'], 1, -1); return 1; }");
    await durmayiBekle(s, 8000);
    kayit.carpismaVn = await m(s, "(mac) => mac.durmaOlayi?.vn ?? 0");
    await foto(s, "02-carpisma");
    await m(s, "(mac) => mac.devam()");
    // sarmal iz: çarpışmadan 10 kare sonra
    for (let k = 0; k < 30; k++) {
      await m(s, "(mac) => mac.olaydaDur(['carpisma'], 10, -1)");
      await durmayiBekle(s);
      const vn = await m(s, "(mac) => mac.durmaOlayi?.vn ?? 0");
      if (vn >= 260) break;
      await m(s, "(mac) => mac.devam()");
    }
    await foto(s, "03-sarmal-iz");
    await m(s, "(mac) => mac.devam()");
    await s.close();
  }
  if (ister("ulti")) {
    const s = await macSayfasi("ekran=mac&debug&tohum=21&takim=0&rakip=2&bot=kukla");
    await s.mouse.move(640, 300); await s.mouse.down(); await s.mouse.up();
    await turaKadar(s);
    await atlasBekle(s);
    await bekle(500);
    await m(s, "(mac) => { mac.enerjiDoldur(0, 300); return 1; }");
    const p = await m(s, "(mac) => ({ x: mac.durum.topaclar[1].x, z: mac.durum.topaclar[1].z })");
    const e = await m(s, `(mac) => mac.ekranNoktasi(${p.x}, ${p.z})`);
    await s.mouse.move(e.x, e.y);
    await m(s, "(mac) => mac.olaydaDur(['yetenekBasladi'], 8, 0)");
    await s.keyboard.down("Digit3"); await bekle(80); await s.keyboard.up("Digit3");
    if (await durmayiBekle(s, 8000)) await foto(s, "04-ulti"); else kayit.ulti = "olmadı";
    await s.close();
  }
  if (ister("lab")) {
    const s = await sayfa("lab");
    await s.goto(`${TABAN}?ekran=topac-lab&debug`);
    await bekle(5000);
    await foto(s, "05-topac-lab");
    await s.close();
  }
  if (ister("lobi")) {
    const s = await sayfa("lobi");
    await s.goto(`${TABAN}?ekran=gizlilik`);
    const ad = `GUC ${Date.now().toString(36).slice(-5)}`;
    const api = (y, u, g = {}) => s.evaluate(async ([y, u, g]) => (await fetch(u, { method: y, headers: { "content-type": "application/json" }, body: JSON.stringify(g) })).status, [y, u, g]);
    kayit.hesap = [await api("POST", "/api/kayit", { ad, sifre: "topac-sifre-1", sifreTekrar: "topac-sifre-1" }), await api("POST", "/api/profil", { arma: "kor", renk: "#2fb8e8" }), await api("POST", "/api/ilk-cekirdek", { set: "goktasi" }), await api("POST", "/api/egitim-bitti", {})];
    await s.goto(`${TABAN}?ekran=lobi`);
    await bekle(1500);
    kayit.lobiIkon = await s.waitForFunction(() => document.querySelectorAll("[data-ikon3b]").length === 0 && document.querySelectorAll("[data-ikon3b-hazir]").length > 0, null, { timeout: 15000 }).then(() => true).catch(() => false);
    await bekle(800);
    // her takım üyesi: görünen topacın en alt opak pikseli (uç ucu) ile kaidenin üst kenarı (CSS px); yordamsal ve 3B ikon
    kayit.lobiHizalama = await s.evaluate(async () => {
      const altPiksel = async (el) => {
        const r = el.getBoundingClientRect();
        const c = document.createElement("canvas");
        const w = el instanceof HTMLCanvasElement ? el.width : el.naturalWidth, h = el instanceof HTMLCanvasElement ? el.height : el.naturalHeight;
        c.width = w; c.height = h;
        const g = c.getContext("2d");
        g.drawImage(el, 0, 0, w, h);
        const v = g.getImageData(0, 0, w, h).data;
        for (let y = h - 1; y >= 0; y--) for (let x = 0; x < w; x++) if (v[(y * w + x) * 4 + 3] > 127) return { alt: r.top + ((y + 1) / h) * r.height, kutuYuk: r.height, kutuAlt: r.bottom };
        return null;
      };
      const sonuc = [];
      for (const uye of document.querySelectorAll(".lb-uye")) {
        const ikon = uye.querySelector("img, canvas");
        const kaide = uye.querySelector(".k-kaide");
        if (!ikon || !kaide) continue;
        const a = await altPiksel(ikon);
        const k = kaide.getBoundingClientRect().top;
        sonuc.push({ tur: ikon.tagName === "IMG" ? "3b" : "yordamsal", ucAlt: a && Math.round(a.alt * 10) / 10, kaideUst: Math.round(k * 10) / 10, fark: a && Math.round((a.alt - k) * 10) / 10, kutuYuk: a && Math.round(a.kutuYuk * 10) / 10 });
      }
      return sonuc;
    });
    await foto(s, "06-lobi-takim");
    await s.close();
  }
  await tar.close();
  if (ister("kiyas")) {
    for (const [ref, bizim, ad] of [["07-arena-mac.jpg", "02-carpisma", "kiyas-07"], ["08-arena-ulti.jpg", "04-ulti", "kiyas-08"]]) {
      const b = yol(bizim);
      if (!fs.existsSync(b)) continue;
      const W = 1280, H = 720, ara = 16;
      const r = await sharp(path.join("docs/design/beyblade/gorunum", ref)).resize(W, H, { fit: "fill" }).png().toBuffer();
      const u = await sharp(b).resize(W, H, { kernel: "nearest" }).png().toBuffer();
      await sharp({ create: { width: W * 2 + ara, height: H, channels: 3, background: "#101018" } })
        .composite([{ input: r, left: 0, top: 0 }, { input: u, left: W + ara, top: 0 }])
        .png().toFile(yol(ad));
      kayit.cekilen.push(yol(ad));
      console.log("kıyas:", yol(ad));
    }
  }
  kayit.hatalar = hatalar;
  fs.writeFileSync(`${KLASOR}/GU-C-ozet${SONEK}.json`, JSON.stringify(kayit, null, 1) + "\n");
  console.log(JSON.stringify(kayit, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
