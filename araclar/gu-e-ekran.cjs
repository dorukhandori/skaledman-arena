// GU-E görsel doğrulaması (docs/production/raporlar/GU-E.md): seyirci HUD köşe kartları, çarpışma kıvılcımı (hafif / orta /
// ağır / kritik), sürekli temas (sürtünme) akışı, kare şeritleri ve referans 07/08 kıyası. 1280×720 CSS × DPR 2.
// Önce dev sunucu: KIMLIK_MODU=sifre npx vite --port 5491
// Çalıştır: NODE_PATH=/opt/node-tools/node_modules ADRES=http://localhost:5491/ node araclar/gu-e-ekran.cjs [seyirci carpisma temas serit kiyas]
// Bütün zorlamalar yalnız ?debug sayfasında, istemcideki çevrimdışı sim kopyasında (GU-B yöntemi); oyun kuralı değişmez.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const TABAN = process.env.ADRES || "http://localhost:5491/";
const KLASOR = process.env.KLASOR || "docs/production/raporlar/ekran";
const ON = process.env.ON || "GU-E";
const SECIM = process.argv.slice(2);
const ister = (a) => !SECIM.length || SECIM.includes(a);
fs.mkdirSync(KLASOR, { recursive: true });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const hatalar = [];
const kayit = { cekilen: [], cozunurluk: "1280×720 CSS, DPR 2 (2560×1440)" };
const yol = (ad) => `${KLASOR}/${ON}-${ad}.png`;

let tar;
async function sayfa(ad) {
  const b = await tar.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const s = await b.newPage();
  s.on("console", (x) => { if (x.type() === "error" && !/status of 40[0-9]/.test(x.text())) hatalar.push(`${ad}: ${x.text()}`); });
  s.on("pageerror", (e) => hatalar.push(`${ad}: pageerror: ${e.message}`));
  return s;
}
async function foto(s, ad, kirp) {
  const p = yol(ad);
  if (kirp) await s.screenshot({ path: p, clip: kirp }); else await s.screenshot({ path: p });
  kayit.cekilen.push(p);
  console.log("ekran:", p);
  return p;
}
const m = (s, kod) => s.evaluate((k) => (new Function("mac", `return (${k})(mac)`))(window.__mac), kod);
const faz = (s) => m(s, "(mac) => mac.durum.mac.faz");
const turaKadar = async (s) => { for (let k = 0; k < 600; k++) { if ((await faz(s)) === "tur") return; await bekle(25); } };
const durdu = (s) => m(s, "(mac) => mac.durdu");
const durmayiBekle = async (s, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await durdu(s)) return true; await bekle(30); } return false; };

/** Maç sayfası: Kor (turuncu) ↔ Girdap (mavi), referans 07 gibi (GU-C/GU-D çekim yöntemi). */
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
const atlasBekle = (s) => s.waitForFunction(() => {
  const g = window.__mac?.gorseller ?? [];
  return g.length > 0 && g.every((x) => x.spriteKatmani !== false);
}, null, { timeout: 15000 }).then(() => true).catch(() => false);

/** İki topacı ortada karşı karşıya koy, izleri sil, sonra `hiz` ile çarpıştır ve olaydan `kare` kare sonra dur. */
async function carpistir(s, hiz, kare, dz = 0) {
  // Ticker durdurulur, kareler sabit 1/60 s ile tek tek işlenir (Mac.kareAt): SwiftShader'ın yavaş karesinde bir render
  // karesine çok sim adımı sığıp görsel konum geride kalmasın; çekim tekrarlanabilir olsun.
  await m(s, "(mac) => { mac.b.app.ticker.stop(); const [o, r] = mac.durum.topaclar; for (let i = 0; i < 40; i++) { o.x = -90; o.z = 8; o.vx = 0; o.vz = 0; r.x = 90; r.z = -8; r.vx = 0; r.vz = 0; mac.kareAt(1 / 60); } mac.izler.forEach((z) => z.sifirla()); return 1; }");
  // başlangıç noktasında 20 kare beklet (görsel konum yetişsin; ışınlanma sonrası görsel yumuşak yaklaşma yapıntısı olmasın)
  await m(s, `(mac) => { const [o, r] = mac.durum.topaclar; for (let i = 0; i < 20; i++) { o.x = -40 - ${hiz} * 0.02; o.z = 8; o.vx = 0; o.vz = 0; r.x = 40 + ${hiz} * 0.02; r.z = -8; r.vx = 0; r.vz = 0; mac.kareAt(1 / 60); } mac.izler.forEach((z) => z.sifirla()); for (const [i, t] of [o, r].entries()) { t.tik = 0; t.enerji = 0; t.stamina = mac.durum.profiller[i].maxStamina; } o.vx = ${hiz}; o.vz = ${dz}; r.vx = -${hiz}; r.vz = ${-dz}; mac.olaydaDur(['carpisma'], ${kare}, -1); return 1; }`);
  const ok = await m(s, "(mac) => { for (let i = 0; i < 240; i++) { mac.kareAt(1 / 60); if (mac.durmaOlayi && !mac.durTalebi) return true; } return false; }");
  const o = await m(s, "(mac) => { const o = mac.durmaOlayi; return o ? { vn: Math.round(o.vn), hasar: o.taraflar.map((t) => Math.round(t.hasar * 10) / 10), dTik: o.taraflar.map((t) => Math.round(t.dTik * 100) / 100) } : null; }");
  return { ok, olay: o };
}

/** Kare kare ilerle (ticker durmuşken; Mac.kareAt yalnız ?debug), her kareden önce `once` çalışır. */
async function seritCek(s, ad, adet, once, kirp, adim = 1) {
  const yollar = [];
  for (let k = 0; k < adet; k++) {
    if (k > 0) for (let q = 0; q < adim; q++) { if (once) await m(s, once); await m(s, "(mac) => { mac.kareAt(1 / 60); return 1; }"); }
    const p = `${KLASOR}/.gecici-${ad}-${k}.png`;
    await s.screenshot({ path: p, clip: kirp });
    yollar.push(p);
  }
  const W = kirp.width * 2, H = kirp.height * 2, ara = 8;
  await sharp({ create: { width: W * adet + ara * (adet - 1), height: H, channels: 3, background: "#101018" } })
    .composite(yollar.map((p, k) => ({ input: p, left: k * (W + ara), top: 0 })))
    .png().toFile(yol(ad));
  for (const p of yollar) fs.unlinkSync(p);
  kayit.cekilen.push(yol(ad));
  console.log("şerit:", yol(ad));
}

(async () => {
  tar = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  if (ister("seyirci")) {
    // Seyirci HUD'u gerçek oda ister; doğrulama için aynı SeyirciHud bileşeni maç sahnesinin üstüne aynı çerçeveyle konur
    const s = await macSayfasi("ekran=mac&debug&tohum=7&takim=0&rakip=2&bot=kukla");
    await turaKadar(s);
    await atlasBekle(s);
    await bekle(800);
    kayit.seyirci = await s.evaluate(async () => {
      const { SeyirciHud } = await import("/src/istemci/oyun/SeyirciHud.ts");
      const mac = window.__mac;
      const ust = document.querySelector(".mh")?.parentElement ?? document.body;
      document.querySelectorAll(".mh").forEach((e) => { e.style.display = "none"; });
      const h = new SeyirciHud(ust, ["Oyuncu Bir", "Rakip İki"], [null, null]);
      const c = mac.sahne.cerceve();
      h.hizala(c.x, c.y, c.olcek);
      h.guncelle(mac.durum, 0);
      window.__sh = h;
      // ölçüm: kart yığınlarının mantıksal kutuları ve oynanabilir elipsle kesişim (960×540)
      const kok = h.kok.getBoundingClientRect();
      const o = c.olcek;
      const kutu = (e) => { const r = e.getBoundingClientRect(); return [r.left - kok.left, r.top - kok.top, r.right - kok.left, r.bottom - kok.top].map((v) => Math.round((v / o) * 10) / 10); };
      const yigin = [...h.kok.querySelectorAll(".kartlar")].map(kutu);
      const panel = [...h.kok.querySelectorAll(".pn")].map(kutu);
      const icinde = (lx, ly) => { const B = 1.83, k = 0.52, my = 285; const wx = 480 + (lx - 480) / B, wy = 270 + (ly - 270) / B; return Math.hypot(wx - 480, (wy - my) / k) < 240; };
      const kesisim = (b) => { let n = 0; for (let i = 0; i <= 40; i++) for (let j = 0; j <= 40; j++) if (icinde(b[0] + ((b[2] - b[0]) * i) / 40, b[1] + ((b[3] - b[1]) * j) / 40)) n++; return n; };
      return { yigin, yiginKesisim: yigin.map(kesisim), panel, panelKesisim: panel.map(kesisim) };
    });
    await foto(s, "01-seyirci-kartlar");
    await s.close();
  }
  if (ister("carpisma") || ister("serit") || ister("kiyas")) {
    const s = await macSayfasi("ekran=mac&debug&tohum=7&takim=0&rakip=2&bot=kukla");
    await turaKadar(s);
    kayit.atlas = await atlasBekle(s);
    await bekle(1500);
    const KIRP = { x: 400, y: 170, width: 480, height: 270 };
    kayit.carpisma = {};
    for (const [ad, hiz, kare] of [["02-hafif", 70, 1], ["03-orta", 120, 1], ["04-agir", 190, 1], ["05-kritik", 300, 1]]) {
      const r = await carpistir(s, hiz, kare);
      kayit.carpisma[ad] = r;
      await foto(s, `${ad}-tam`);
      await foto(s, ad, KIRP);
    }
    if (ister("serit") || !SECIM.length) {
      // 6 ardışık kare (her biri 2 render karesi = 33 ms arayla): olay anı ve sonrası; sekme, yalpa, kıvılcım sönmesi
      for (const [ad, hiz] of [["06-serit-hafif", 70], ["07-serit-agir", 190], ["08-serit-kritik", 300]]) {
        await carpistir(s, hiz, 0);
        await seritCek(s, ad, 6, null, KIRP, 2);
      }
    }
    if (ister("kiyas") || !SECIM.length) {
      // referans 07 ile aynı an: ağır/kritik çarpışma, olaydan 1 kare sonra
      await carpistir(s, 330, 1);
      await foto(s, "kiyas-07-ham");
    }
    await m(s, "(mac) => mac.devam()");
    await s.close();
  }
  if (ister("temas")) {
    // SÜREKLİ TEMAS: topaçlar yan yana (merkez arası 2r − 1) tutulur, teğet yönde zıt hızla birbirine sürtünür; normal hız 0 →
    // sim çarpışma olayı üretmez (yalnız konumsal ayırma), istemci temas akışını konum mesafesinden türetir.
    const s = await macSayfasi("ekran=mac&debug&tohum=7&takim=0&rakip=2&bot=kukla");
    await turaKadar(s);
    await atlasBekle(s);
    await bekle(1200);
    const KIRP = { x: 400, y: 170, width: 480, height: 270 };
    const tut = (v) => `(mac) => { const [o, r] = mac.durum.topaclar; o.x = -29.5; o.z = 0; r.x = 29.5; r.z = 0; o.vx = 0; r.vx = 0; o.vz = ${v}; r.vz = ${-v}; return 1; }`;
    await m(s, "(mac) => { mac.izler.forEach((z) => z.sifirla()); return 1; }");
    await m(s, "(mac) => { mac.b.app.ticker.stop(); return 1; }");
    kayit.temas = {};
    for (const [ad, v, onKare] of [["09-temas-yavas", 30, 8], ["10-temas-hizli", 140, 40]]) {
      await m(s, "(mac) => { const [o, r] = mac.durum.topaclar; o.x = -90; r.x = 90; for (let i = 0; i < 30; i++) mac.kareAt(1 / 60); return 1; }");
      for (let k = 0; k < onKare; k++) { await m(s, tut(v)); await m(s, "(mac) => { mac.kareAt(1 / 60); return 1; }"); }
      kayit.temas[ad] = await m(s, "(mac) => ({ temas: mac.efektler.temasDurumu, olay: mac.durum.olaylar.filter((o) => o.tur === 'carpisma').length })");
      await foto(s, `${ad}-tam`);
      await foto(s, ad, KIRP);
      await seritCek(s, `${ad}-serit`, 6, tut(v), KIRP, 2);
    }
    // temas biter: ayır, akış söner
    await m(s, "(mac) => { const [o, r] = mac.durum.topaclar; o.x = -60; r.x = 60; o.vz = 0; r.vz = 0; return 1; }");
    await seritCek(s, "11-temas-biter-serit", 6, null, KIRP, 3);
    kayit.temas.biter = await m(s, "(mac) => mac.efektler.temasDurumu");
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
    if (await durmayiBekle(s, 8000)) await foto(s, "kiyas-08-ham"); else kayit.ulti = "olmadı";
    await s.close();
  }
  await tar.close();
  if (ister("kiyas")) {
    for (const [ref, bizim, ad] of [["07-arena-mac.jpg", "kiyas-07-ham", "kiyas-07"], ["08-arena-ulti.jpg", "kiyas-08-ham", "kiyas-08"]]) {
      const b = yol(bizim);
      if (!fs.existsSync(b)) continue;
      const W = 1280, H = 720, ara = 16;
      const r = await sharp(path.join("docs/design/beyblade/gorunum", ref)).resize(W, H, { fit: "fill" }).png().toBuffer();
      const u = await sharp(b).resize(W, H, { kernel: "nearest" }).png().toBuffer();
      await sharp({ create: { width: W * 2 + ara, height: H, channels: 3, background: "#101018" } })
        .composite([{ input: r, left: 0, top: 0 }, { input: u, left: W + ara, top: 0 }])
        .png().toFile(yol(ad));
      // yakın plan: çarpışma bölgesi (referansta 520-900 × 260-540 / 1376×768 ölçeği; bizde aynı oranlı bölge)
      const kr = { left: Math.round(520 / 1376 * W), top: Math.round(250 / 768 * H), width: Math.round(380 / 1376 * W), height: Math.round(290 / 768 * H) };
      if (ref.startsWith("07")) {
        const rz = await sharp(r).extract(kr).resize(kr.width * 2, kr.height * 2, { kernel: "nearest" }).png().toBuffer();
        const uz = await sharp(u).extract(kr).resize(kr.width * 2, kr.height * 2, { kernel: "nearest" }).png().toBuffer();
        await sharp({ create: { width: kr.width * 4 + ara, height: kr.height * 2, channels: 3, background: "#101018" } })
          .composite([{ input: rz, left: 0, top: 0 }, { input: uz, left: kr.width * 2 + ara, top: 0 }])
          .png().toFile(yol("kiyas-07-yakin"));
        kayit.cekilen.push(yol("kiyas-07-yakin"));
      }
      fs.unlinkSync(b);
      kayit.cekilen.push(yol(ad));
      console.log("kıyas:", yol(ad));
    }
  }
  kayit.hatalar = hatalar;
  fs.writeFileSync(`${KLASOR}/${ON}-ozet${process.env.SONEK ? `-${process.env.SONEK}` : ""}.json`, JSON.stringify(kayit, null, 1) + "\n");
  console.log(JSON.stringify(kayit, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
