// GU-F ölçümü (docs/production/raporlar/GU-F.md): yeni fizikte (FIZIK-1: çanak çekimi + ≥ 90 br/s ayrılma) gerçek maç
// kayıtlarında kıvılcım davranışı. Her maç ticker durdurulup Mac.kareAt(1/60) ile kare kare ilerletilir (tekrarlanabilir);
// her karede sim mesafesi, temas akışı, kıvılcım/flaş/parçacık sayısı ve kare süresi; her çarpışmada şiddet ve o anki
// canlı kıvılcım (birikme) kaydedilir. Ayrıca ticker açıkken gerçek kare süresi (SwiftShader) ölçülür.
// Önce dev sunucu: KIMLIK_MODU=sifre npx vite --port 5591 --strictPort
// Çalıştır: NODE_PATH=/opt/node-tools/node_modules ADRES=http://localhost:5591/ ON=once node araclar/gu-f-olc.cjs [sn]
// Çıktı: docs/production/raporlar/ekran/GU-F-olcum-<ON>.json. Zorlama yok; girdisiz maçta rakip "pasif" (sıfır girdi).
const { chromium } = require("playwright");
const fs = require("fs");

const TABAN = process.env.ADRES || "http://localhost:5591/";
const ON = process.env.ON || "olcum";
const SN = Number(process.argv[2] || 60);
const SADECE = process.argv.slice(3);
const KLASOR = "docs/production/raporlar/ekran";
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

const MACLAR = [
  { ad: "botbot-dolas-kenar", sorgu: "ekran=mac&debug&oto=dolas&bot=kenar&tohum=9&takim=1&rakip=2" },
  { ad: "botbot-kenar-dolas", sorgu: "ekran=mac&debug&oto=kenar&bot=dolas&tohum=3&takim=0&rakip=2" },
  { ad: "girdisiz", sorgu: "ekran=mac&debug&bot=kukla&tohum=7&takim=2&rakip=1", pasif: true },
];

/** Sayfa içinde: `sn` saniye kare kare oynat, ham kayıt döndür. */
function kaydet(a) {
  const mac = window.__mac;
  const E = mac.efektler;
  if (a.pasif) mac.botSecimi = "pasif";
  mac.b.app.ticker.stop();
  const olaylar = [];
  const sesler = [];
  const asilOlay = E.olay.bind(E);
  E.olay = (o, d) => {
    const once = E.kivilcimlar.adet;
    asilOlay(o, d);
    if (o.tur === "carpisma") olaylar.push({ t: mac.zaman, vn: Math.round(o.vn), gp: Math.round(E.sonSiddet * 100) / 100, kvOnce: once, kvSonra: E.kivilcimlar.adet });
  };
  const asilSes = E.sesKanca;
  E.sesKanca = (ad, h, p) => { sesler.push({ t: mac.zaman, ad, temas: /temasGuncelle/.test(new Error().stack || "") }); asilSes(ad, h, p); };
  const kare = [];
  // tur başlayana kadar ilerle
  for (let i = 0; i < 2000 && mac.durum.mac.faz !== "tur"; i++) mac.kareAt(1 / 60);
  const n = Math.round(a.sn * 60);
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    mac.kareAt(1 / 60);
    const ms = performance.now() - t0;
    const d = mac.durum;
    const [p, q] = d.topaclar;
    const td = E.temasDurumu;
    // tepki yaklaşması: iki gövdenin (yalpa kabı: yörünge + eğim·gövde üstü) birbirine doğru ekran px toplamı; hitstop dışı
    let yak = 0;
    const g = mac.gorseller;
    if (g[0]?.yalpaKap && g[1]?.yalpaKap) {
      const ux = Math.sign(g[1].kok.position.x - g[0].kok.position.x) || 1;
      const kay = (x) => (x.yalpaKap.position.x + Math.sin(x.yalpaKap.rotation) * 34) * x.kok.scale.x;
      yak = kay(g[0]) * ux - kay(g[1]) * ux;
    }
    const hs = E.hitstopVar(0) || E.hitstopVar(1) ? 1 : 0;
    kare.push([Math.round(Math.hypot(p.x - q.x, p.z - q.z) * 10) / 10, td.aktif ? 1 : 0, td.guc, E.kivilcimlar.adet, E.kivilcimlar.flasAdet, E.parcaciklar.canli, Math.round(ms * 10) / 10, d.mac.faz === "tur" ? 1 : 0, Math.round(yak * 10) / 10, hs]);
  }
  return { olaylar, sesler, kare, akisKivilcim: E.temasDurumu.kivilcim };
}

function ozetle(k) {
  const dt = 1 / 60;
  const tur = k.kare.filter((r) => r[7]).length * dt;
  const segs = (f) => { const s = []; let bas = -1; k.kare.forEach((r, i) => { if (f(r)) { if (bas < 0) bas = i; } else if (bas >= 0) { s.push([bas, i]); bas = -1; } }); if (bas >= 0) s.push([bas, k.kare.length]); return s; };
  const sure = (s) => s.map(([a, b]) => (b - a) * dt);
  const yuzde = (v, p) => { if (!v.length) return 0; const x = [...v].sort((a, b) => a - b); return Math.round(x[Math.min(x.length - 1, Math.floor(p * x.length))] * 1000) / 1000; };
  const temas = segs((r) => r[0] <= 62);
  const akis = segs((r) => r[1] === 1);
  const isima = segs((r) => r[2] > 0.05);
  // akış yanıp sönme: iki akış parçası arasında < 0,3 s boşluk
  let yanip = 0; for (let i = 1; i < akis.length; i++) if ((akis[i][0] - akis[i - 1][1]) * dt < 0.3) yanip++;
  const aralik = []; for (let i = 1; i < k.olaylar.length; i++) aralik.push(k.olaylar[i].t - k.olaylar[i - 1].t);
  const kad = (vn) => (vn < 80 ? "yok" : vn < 260 ? "hafif" : vn < 420 ? "agir" : "kritik");
  const kademe = {}; for (const o of k.olaylar) kademe[kad(o.vn)] = (kademe[kad(o.vn)] || 0) + 1;
  const ms = k.kare.map((r) => r[6]);
  const sesTemas = k.sesler.filter((s) => s.temas).length;
  return {
    turSn: Math.round(tur * 10) / 10,
    carpisma: k.olaylar.length, carpismaDk: Math.round((k.olaylar.length / tur) * 600) / 10, kademe,
    aralikSn: { min: yuzde(aralik, 0), p10: yuzde(aralik, 0.1), medyan: yuzde(aralik, 0.5) },
    art_arda_lt_0_3sn: aralik.filter((x) => x < 0.3).length,
    vnMedyan: yuzde(k.olaylar.map((o) => o.vn), 0.5), gpMedyan: yuzde(k.olaylar.map((o) => o.gp), 0.5),
    birikme: { kvOnceMedyan: yuzde(k.olaylar.map((o) => o.kvOnce), 0.5), kvOnceMaks: Math.max(0, ...k.olaylar.map((o) => o.kvOnce)), oncekiCanliyken: k.olaylar.filter((o) => o.kvOnce > 0).length },
    simTemas: { adet: temas.length, sureMedyan: yuzde(sure(temas), 0.5), sureP90: yuzde(sure(temas), 0.9), sureMaks: yuzde(sure(temas), 1), toplamSn: Math.round(sure(temas).reduce((a, b) => a + b, 0) * 100) / 100 },
    akis: { adet: akis.length, sureMedyan: yuzde(sure(akis), 0.5), sureMaks: yuzde(sure(akis), 1), yanipSonme: yanip, isimaAdet: isima.length, isimaSureMedyan: yuzde(sure(isima), 0.5), akisKivilcim: k.akisKivilcim },
    sesler: { toplam: k.sesler.length, temas: sesTemas, temasDk: Math.round((sesTemas / tur) * 600) / 10 },
    kivilcim: { maks: Math.max(...k.kare.map((r) => r[3])), p99: yuzde(k.kare.map((r) => r[3]), 0.99), ort: Math.round(k.kare.reduce((a, r) => a + r[3], 0) / k.kare.length * 10) / 10, flasMaks: Math.max(...k.kare.map((r) => r[4])), parcacikMaks: Math.max(...k.kare.map((r) => r[5])) },
    // görsel binme: sim mesafesi < 75 br iken (temas + ilk ayrılma) hitstop DIŞI karelerde gövdelerin ötekine doğru kayması
    tepki: (() => { const r = k.kare.filter((x) => x[0] < 75 && !x[9]).map((x) => x[8]); return { kare: r.length, yaklasmaMaksPx: r.length ? Math.max(...r) : 0, yaklasmaP90Px: yuzde(r, 0.9), binenKare: k.kare.filter((x) => !x[9] && x[0] - x[8] < 60).length }; })(),
    kareMs: { medyan: yuzde(ms, 0.5), p95: yuzde(ms, 0.95), p99: yuzde(ms, 0.99), maks: yuzde(ms, 1) },
  };
}

(async () => {
  const tar = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const hatalar = [];
  const sonuc = { on: ON, sn: SN, tarayici: tar.version(), maclar: {} };
  for (const M of MACLAR.filter((x) => !SADECE.length || SADECE.includes(x.ad))) {
    // kayıt geçişi küçük pencerede (SwiftShader GPU kuyruğu kayıt döngüsünü saniyelerce bekletmesin); gerçek zamanlı
    // kare süresi ayrı geçişte 1280×720'de (PERF=1)
    const W = process.env.PERF ? [1280, 720] : [640, 360];
    const b = await tar.newContext({ viewport: { width: W[0], height: W[1] }, deviceScaleFactor: 1 });
    const s = await b.newPage();
    s.on("console", (x) => { if (x.type() === "error" && !/status of 40[0-9]/.test(x.text())) hatalar.push(`${M.ad}: ${x.text()}`); });
    s.on("pageerror", (e) => hatalar.push(`${M.ad}: pageerror: ${e.message}`));
    await s.goto(`${TABAN}?${M.sorgu}`);
    await s.waitForFunction(() => !!window.__mac, null, { timeout: 30000 });
    await bekle(1500);
    const k = await s.evaluate(kaydet, { sn: SN, pasif: !!M.pasif });
    const o = ozetle(k);
    // gerçek zamanlı kare süresi: ticker açık 8 s (rAF aralıkları)
    o.gercekZaman = await s.evaluate(async () => {
      const mac = window.__mac; mac.b.app.ticker.start();
      const a = []; let son = performance.now();
      await new Promise((r) => { const f = () => { const t = performance.now(); a.push(t - son); son = t; if (a.length < 150) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); });
      a.sort((x, y) => x - y);
      return { kare: a.length, medyanMs: Math.round(a[a.length >> 1] * 10) / 10, p95Ms: Math.round(a[Math.floor(a.length * 0.95)] * 10) / 10, fps: Math.round(1000 / a[a.length >> 1]) };
    });
    o.olaylar = k.olaylar.slice(0, 40).map((x) => ({ ...x, t: Math.round(x.t * 100) / 100 }));
    sonuc.maclar[M.ad] = o;
    console.log(M.ad, JSON.stringify(o, null, 0).slice(0, 1500));
    await b.close();
    fs.writeFileSync(`${KLASOR}/GU-F-olcum-${ON}.json`, JSON.stringify(sonuc, null, 1) + "\n");
  }
  sonuc.hatalar = hatalar;
  await tar.close();
  fs.writeFileSync(`${KLASOR}/GU-F-olcum-${ON}.json`, JSON.stringify(sonuc, null, 1) + "\n");
  console.log("hata:", hatalar.length, hatalar.slice(0, 3));
})().catch((e) => { console.error(e); process.exit(1); });
