// Maç ilk yükleme ölçümü (TEMIZLIK #2): `?ekran=mac` açılışından tur başı + 4 s'ye kadar inen bayt (Playwright
// page.on('response'), request.sizes().responseBodySize = kablodaki gövde). Varlık (public/) ve kod ayrı sayılır; aynı URL bir kez.
// Çalıştır: önce sunucu (npx vite --port 5197 ya da üretim paketi), sonra
//   NODE_PATH=/opt/node-tools/node_modules node araclar/yukleme-olc.cjs [çıktı.json]
// Ortam: MAC_ADRES (varsayılan http://localhost:5197/), SORGU (varsayılan Kor+Kaya bota karşı).
const { chromium } = require("playwright");
const fs = require("fs");
const zlib = require("zlib");
const TABAN = process.env.MAC_ADRES || "http://localhost:5197/";
const SORGU = process.env.SORGU || "ekran=mac&debug&tohum=21&takim=0&rakip=1&bot=kukla";
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const tar = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const b = await tar.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const s = await b.newPage();
  const hatalar = [];
  const inen = new Map();
  const gz = new Map();
  const bekleyen = [];
  s.on("console", (x) => { if (x.type() === "error") hatalar.push(x.text()); });
  s.on("pageerror", (e) => hatalar.push(`pageerror: ${e.message}`));
  s.on("response", (r) => {
    const u = r.url().replace(/^https?:\/\/[^/]+/, "");
    if (inen.has(u) || r.status() >= 300 || u.startsWith("/api/") || u.startsWith("/matchmake")) return;
    inen.set(u, 0);
    bekleyen.push(r.finished().then(() => r.request().sizes()).then((z) => inen.set(u, z.responseBodySize)).catch(() => {}));
    // sunucu sıkıştırmıyorsa metin dosyalarının gzip karşılığı (tahmin; görüntü/ses zaten sıkışık)
    if (/\.(js|css|json|html|ttf|wav)(\?|$)|^\/(\?|$)/.test(u)) bekleyen.push(r.body().then((g) => gz.set(u, zlib.gzipSync(g).length)).catch(() => {}));
  });
  await s.goto(`${TABAN}?${SORGU}`);
  await s.waitForFunction(() => !!window.__mac, null, { timeout: 30000 });
  for (let k = 0; k < 600; k++) { if (await s.evaluate(() => window.__mac.durum.mac.faz) === "tur") break; await bekle(25); }
  await bekle(4000);
  await Promise.all(bekleyen);
  const kume = {};
  let varlik = 0, toplam = 0;
  for (const [u, n] of inen) {
    const yol = u.split("?")[0];
    const m = yol.match(/^\/(efekt|ses|yazi|topac|ruh|bilgic|arena|menu)\//);
    const k = m ? m[1] : /\.(js|ts|mjs|css)$|^\/(src|node_modules|@)/.test(yol) ? "kod" : "diger";
    kume[k] = (kume[k] || 0) + n;
    toplam += n;
    if (m) varlik += n;
  }
  let gzToplam = 0;
  for (const [u, n] of inen) gzToplam += Math.min(n, gz.get(u) ?? n);
  const sonuc = { sorgu: SORGU, toplamKB: +(toplam / 1024).toFixed(1), gzipTahminKB: +(gzToplam / 1024).toFixed(1), varlikKB: +(varlik / 1024).toFixed(1), kumeKB: Object.fromEntries(Object.entries(kume).map(([k, v]) => [k, +(v / 1024).toFixed(1)])),
    dosyalar: [...inen].filter(([u]) => /^\/(efekt|ses|yazi|topac|ruh|bilgic|arena|menu)\//.test(u)).map(([u, n]) => `${u.split("?")[0]} ${n}`).sort(), hatalar };
  console.log(JSON.stringify(sonuc, null, 1));
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(sonuc, null, 1));
  await tar.close();
})().catch((e) => { console.error(e); process.exit(1); });
