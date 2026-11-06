// MOBIL-2 menü denetimi: telefon yatay emülasyonunda (isMobile + hasTouch, DPR 2) BÜTÜN menü ekranlarını gezer; her ekranda
// ekran görüntüsü + otomatik, hata veren (çıkış kodu 1) denetim:
//   sayfaKaydirma  sayfa görünümden büyük (kaydırma çubuğu / kayma)
//   kesik          öğe (metin ya da etkileşimli) görünüm dışında ya da kaydırılamayan bir atanın kırpmasında yarım
//   ortulu         etkileşimli öğe ya da metin başka bir öğenin altında (ör. ipucu balonu düğmeyi örtüyor)
//   kirpik         metin kendi kutusuna sığmıyor (overflow:hidden / ellipsis)
//   binen          iki etkileşimli öğe birbirine biniyor
//   kucukHedef     gerçek isabet kutusu < 44×44 CSS px (elementFromPoint ile)
// Yalnız bilgi (hata sayılmaz): kucukYazi (büyük harf yüksekliği < 7,5 px).
//
// Kullanım (ayrı veri dizinli sunucu: KIMLIK_MODU=sifre OTURUM_SIRRI=<yerel> VERI_DIZINI=<tmp> npx vite --port 5291 --strictPort):
//   KLASOR=<çıktı> [CIHAZ=iphone14,kucuk,pixel7|hepsi] [EKRAN=atolye,market] [ADRES=http://localhost:5291/] node araclar/mobil-menu-denetim.cjs
// Playwright depoya girmez (NODE_PATH ile verilir); tarayıcı: CHROME_YOL (yoksa Playwright'ın kendi Chromium'u).
const { chromium } = require("playwright");
const fs = require("fs");
const TABAN = process.env.ADRES || "http://localhost:5291/";
const KLASOR = process.env.KLASOR;
if (!KLASOR) { console.error("KLASOR gerekli"); process.exit(2); }
const UA_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const UA_AND = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const CIHAZLAR = {
  iphone14: { ad: "iPhone 14/15 yatay", w: 844, h: 390, ua: UA_IOS },
  kucuk: { ad: "iPhone SE yatay", w: 667, h: 375, ua: UA_IOS },
  pixel7: { ad: "Pixel 7 yatay", w: 915, h: 412, ua: UA_AND },
  iphone15max: { ad: "iPhone 15 Pro Max yatay", w: 932, h: 430, ua: UA_IOS },
};
const CIHAZ_LISTE = (process.env.CIHAZ || "hepsi") === "hepsi" ? ["iphone14", "kucuk", "pixel7"] : process.env.CIHAZ.split(",");
const EKRAN_SECIM = process.env.EKRAN ? process.env.EKRAN.split(",") : null;
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const ek = Date.now().toString(36).slice(-4);

/** Sayfa içinde çalışır (Playwright evaluate). */
const denetle = () => {
  const W = innerWidth, H = innerHeight;
  const gorunur = (e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && +s.opacity > 0.05 && r.width > 1 && r.height > 1; };
  const ad = (e) => (e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/).slice(0, 3).join(".") : "") + (e.dataset.eylem ? `[eylem=${e.dataset.eylem}]` : "")).slice(0, 70);
  const metin = (e) => (e.innerText || e.value || e.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 40);
  // açık açılır menü / modal varsa yalnız onun içi denetlenir (altındaki ekranın örtülmesi beklenen davranış)
  const ustKatman = document.querySelector(".takim-menu:not([hidden]), .k-menu-liste:not([hidden]), .tam-katman, .modal");
  const tum = [...document.querySelectorAll("body *")].filter((e) => (!ustKatman || ustKatman.contains(e)) && gorunur(e) && !e.matches("button[title^='select to enable accessibility']") && !e.closest("[aria-hidden=true]") && !["CANVAS", "svg", "SVG", "IMG", "STYLE", "SCRIPT"].includes(e.tagName));
  const etkilesimli = tum.filter((e) => e.matches("button, a[href], [role=button], [role=tab], [role=radio], [role=option], [data-eylem], input:not([type=hidden]), select, [tabindex='0']") && getComputedStyle(e).pointerEvents !== "none" && !e.disabled);
  const yaprak = tum.filter((e) => e.children.length === 0 && (e.innerText || e.value || "").trim());
  const etkilesimliMi = (e) => e.matches("button, a[href], [role=button], [role=tab], [role=radio], [role=option], [data-eylem], input:not([type=hidden]), select, [tabindex='0']");
  const klipli = (s) => /(hidden|clip)/.test(s.overflowX) || /(hidden|clip)/.test(s.overflowY);
  const kaydirilir = (a) => { const s = getComputedStyle(a); return (/(auto|scroll)/.test(s.overflowY) && a.scrollHeight > a.clientHeight + 2) || (/(auto|scroll)/.test(s.overflowX) && a.scrollWidth > a.clientWidth + 2); };

  // öğenin 3×3 örnek noktası: dışarıda / kesik / kaydırılır (sayılmaz) / örtülü / görünür
  const goruntule = (e) => {
    const r = e.getBoundingClientRect();
    const konum = getComputedStyle(e).position;
    // kırpma ve kaydırma zinciri (sabit konumlu öğe yalnız görünümle kırpılır)
    const zincir = [];
    if (konum !== "fixed") for (let a = e.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (klipli(s) || /(auto|scroll)/.test(s.overflowX + s.overflowY)) zincir.push({ a, r: a.getBoundingClientRect(), kayar: kaydirilir(a), klip: klipli(s) });
      if (s.position === "fixed") break; // sabit konumlu ata: üstündeki kırpmalar bu alt ağaca işlemez
    }
    const sonuc = { gor: 0, dis: 0, kesik: 0, kayar: 0, ortulu: 0, toplam: 0 };
    for (const fx of [0.1, 0.5, 0.9]) for (const fy of [0.15, 0.5, 0.85]) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      sonuc.toplam++;
      if (x < 0 || y < 0 || x > W - 0.5 || y > H - 0.5) { if (zincir.some((z) => z.kayar)) sonuc.kayar++; else sonuc.dis++; continue; }
      const disinda = zincir.filter((z) => x < z.r.left - 0.5 || x > z.r.right + 0.5 || y < z.r.top - 0.5 || y > z.r.bottom + 0.5);
      if (disinda.length) { if (disinda.some((z) => z.kayar)) sonuc.kayar++; else sonuc.kesik++; continue; }
      const t = document.elementFromPoint(x, y);
      if (!t || e.contains(t) || t.contains(e)) { sonuc.gor++; continue; }
      // örten öğenin KENDİ kutusunun dışı = görünmez isabet payı (::after): metni örtmesi sorun değil, düğmeyi örtmesi yanlış dokunma
      if (t.closest(".pergel")) { sonuc.pergel = true; sonuc.gor++; continue; } // Pergel balonu geçici, TAMAM ile kapanır; ayrıca raporlanır
      const tr = t.getBoundingClientRect();
      const ortuPay = x < tr.left || x > tr.right || y < tr.top || y > tr.bottom;
      if (ortuPay && !etkilesimliMi(e)) { sonuc.gor++; continue; }
      sonuc.ortulu++;
      sonuc.ortuAdi = (ortuPay ? "isabet payı " : "") + ad(t);
    }
    return sonuc;
  };

  const kesik = [], ortulu = [];
  const kontrol = (e, tur) => {
    const g = goruntule(e);
    const gecerli = g.toplam - g.kayar;
    if (gecerli <= 0) return;
    // kısmen görünen kaydırılabilir öğe sayılmaz; dışarıda/kesik oranı > %12 → hata
    if ((g.dis + g.kesik) / gecerli > 0.12) kesik.push(`${tur} ${ad(e)} "${metin(e) || e.outerHTML.slice(0, 90)}" görünür ${g.gor}/${gecerli}`);
    else if (g.ortulu / gecerli > 0.12) ortulu.push(`${tur} ${ad(e)} "${metin(e)}" ← ${g.ortuAdi}`);
  };
  const pergelAcik = !!document.querySelector(".pergel.acik");
  const iki = new Set();
  for (const e of etkilesimli) { iki.add(e); kontrol(e, "düğme"); }
  for (const e of yaprak) if (!iki.has(e) && ![...iki].some((x) => x.contains(e))) kontrol(e, "metin");

  const kirpik = [];
  for (const e of tum) {
    const s = getComputedStyle(e);
    if (e.clientWidth > 1 && (s.overflow.includes("hidden") || s.textOverflow === "ellipsis") && e.scrollWidth > e.clientWidth + 2 && metin(e) && e.children.length === 0) kirpik.push(`${ad(e)} "${metin(e)}" ${e.scrollWidth}>${e.clientWidth}`);
  }

  // gerçek isabet kutusu ≥ 44×44 (merkezden 1 px adımla dört yöne; kenara dayanan pay sonsuz)
  const kucuk = [];
  let olculen = 0;
  for (const e of etkilesimli) {
    const r = e.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx > W || cy > H) continue;
    const ust = (x, y) => { if (x < 0 || y < 0 || x > W - 1 || y > H - 1) return false; const t = document.elementFromPoint(x, y); return !!t && (t === e || e.contains(t)); };
    if (!ust(cx, cy)) continue;
    if (!ust(cx, Math.max(0, r.top + 1)) || !ust(cx, Math.min(H - 1, r.bottom - 1))) continue; // iç kaydırmada yarım: kaydırınca tam
    olculen++;
    const uzan = (dx, dy) => { let n = 0; while (n < 40) { const x = cx + dx * (n + 1), y = cy + dy * (n + 1); if (x < 0 || y < 0 || x > W - 1 || y > H - 1) return 40; if (!ust(x, y)) break; n++; } return n; };
    const ig = uzan(1, 0) + uzan(-1, 0) + 1, iy = uzan(0, 1) + uzan(0, -1) + 1;
    if (ig < 43 || iy < 43) kucuk.push(`${ad(e)} "${metin(e)}" görsel ${Math.round(r.width)}×${Math.round(r.height)} isabet ${ig}×${iy}`);
  }
  const binen = [];
  const goruluyor = etkilesimli.filter((e) => { const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && (t === e || e.contains(t)); });
  for (let i = 0; i < goruluyor.length; i++) for (let j = i + 1; j < goruluyor.length; j++) {
    const a = goruluyor[i], b = goruluyor[j];
    if (a.contains(b) || b.contains(a)) continue;
    const r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect();
    const x = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left), y = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top);
    // kırpılmış (kaydırmayla gizli) kısımlar sayılmaz: kesişimin ortasındaki nokta gerçekten bu iki öğeden birine ait mi
    const mx = (Math.max(r1.left, r2.left) + Math.min(r1.right, r2.right)) / 2, my = (Math.max(r1.top, r2.top) + Math.min(r1.bottom, r2.bottom)) / 2;
    const th = mx >= 0 && my >= 0 && mx < W && my < H ? document.elementFromPoint(mx, my) : null;
    if (x > 4 && y > 4 && th && (a.contains(th) || b.contains(th))) binen.push(`${ad(a)} "${metin(a)}" ⟷ ${ad(b)} "${metin(b)}"`);
  }
  const buyukHarf = (e) => { const s = getComputedStyle(e); const f = parseFloat(s.fontSize); const ail = s.fontFamily.toLowerCase(); return ail.startsWith("\"m5x7") || ail.startsWith("m5x7") ? f * 7 / 16 : ail.includes("jersey") ? f * 0.5 : f * 0.7; };
  const kucukYazi = yaprak.filter((e) => buyukHarf(e) < 7.5).map((e) => `${ad(e)} "${metin(e)}" ${getComputedStyle(e).fontSize}`);
  const de = document.documentElement;
  return {
    olcek: getComputedStyle(de).getPropertyValue("--o").trim(), yaziOlcek: getComputedStyle(de).getPropertyValue("--yo").trim(),
    sayfaKaydirma: de.scrollWidth > W + 1 || de.scrollHeight > H + 1 ? [de.scrollWidth, de.scrollHeight, W, H] : 0,
    kesik: kesik.slice(0, 12), ortulu: ortulu.slice(0, 12), kirpik: kirpik.slice(0, 10), binen: binen.slice(0, 10),
    pergelAcik,
    olculenHedef: olculen, kucukHedef: kucuk.slice(0, 20), kucukHedefSayisi: kucuk.length,
    kucukYazi: kucukYazi.slice(0, 8), kucukYaziSayisi: kucukYazi.length,
  };
};

const IHLAL_ANAHTARLARI = ["kesik", "ortulu", "kirpik", "binen", "kucukHedef"];
const ihlalSayisi = (r) => (r.hata ? 1 : 0) + (r.sayfaKaydirma ? 1 : 0) + IHLAL_ANAHTARLARI.reduce((t, k) => t + (r[k]?.length || 0), 0);

async function api(s, yontem, yol, govde = {}) {
  return s.evaluate(async ([y, u, g]) => {
    const r = await fetch(u, { method: y, headers: { "content-type": "application/json" }, body: y === "GET" ? undefined : JSON.stringify(g) });
    return { durum: r.status, veri: await r.json().catch(() => ({})) };
  }, [yontem, yol, govde]);
}

// ekran tanımları: [ad, işlev(s, cek)] — sıra önemli (misafir → hesap → ilk çekirdek → ana ekranlar)
const git = (ekran, ms = 2500, sorgu = "") => async (s, cek, ad) => { await s.goto(`${TABAN}?ekran=${ekran}${sorgu}`); await cek(ad, ms); };
const EKRANLAR = [
  ["misafir", [
    ["01-karsilama", async (s, cek, ad) => { await s.goto(TABAN); await cek(ad, 1800); }],
    ["02-kayit", git("kayit", 1800)],
    ["03-giris", git("giris", 1800)],
    ["04-gizlilik", git("gizlilik", 1800)],
    ["05-krediler", git("krediler", 1800)],
  ]],
  ["hesap", [
    ["06-profil-yeni", git("profil", 2000)],
  ]],
  ["ilk", [["07-ilk-cekirdek", git("ilk-cekirdek", 2500)]]],
  ["ana", [
    ["10-atolye-pergel", git("atolye", 4800)],
    ["11-atolye", async (s, cek, ad) => { await s.tap(".pergel .p-dugme").catch(() => {}); await cek(ad, 600); }],
    ["12-atolye-takim-menu", async (s, cek, ad) => { await s.tap("[data-eylem=takim-menu]").catch(() => {}); await cek(ad, 600); }],
    ["13-atolye-daha-fazla", async (s, cek, ad) => { await s.goto(`${TABAN}?ekran=atolye`); await bekle(3500); await s.tap("[data-eylem=daha-fazla]").catch(() => {}); await cek(ad, 600); }],
    ["14-atolye-filtre", async (s, cek, ad) => { await s.goto(`${TABAN}?ekran=atolye`); await bekle(3500); await s.tap("[data-eylem=filtre]").catch(() => {}); await cek(ad, 600); }],
    ["15-market", git("market", 3500)],
    ["15b-market-secili", async (s, cek, ad) => { await s.goto(`${TABAN}?ekran=market`); await bekle(3000); await s.tap(".hucre[data-durum=market]").catch(() => {}); await cek(ad, 700); }],
    ["15c-market-alt", async (s, cek, ad) => { await s.evaluate(() => { for (const e of document.querySelectorAll(".mk *")) if (e.scrollHeight > e.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)) e.scrollTop = 9999; }); await cek(ad, 500); }],
    ["16-basarimlar", git("basarimlar", 2500)],
    ["17-lobi", git("lobi", 3000)],
    ["18-lobi-oda", async (s, cek, ad) => { await s.goto(`${TABAN}?ekran=lobi`); await bekle(2500); await s.tap("[data-mod=oda]").catch(() => {}); await cek(ad, 1200); }],
    ["19-profil", git("profil", 2000)],
    ["19b-profil-yeni-alan", async (s, cek, ad) => { await s.goto(`${TABAN}?ekran=profil`); await bekle(1800); await s.tap("[data-eylem=kanal]").catch(() => {}); await cek(ad, 500); }],
    ["20-ayarlar", git("ayarlar", 2000)],
    ["21-gunluk", git("gunluk", 2500)],
  ]],
  // çevrimdışı bot maçı 8× hızla: Esc menüsü ve Sonuç ekranı (hızlı; EKRAN=macsonuc)
  ["macsonuc", [
    ["40-mac-menu", async (s, cek, ad) => {
      await s.goto(`${TABAN}?ekran=mac&oto=dolas&hiz=8&tohum=3`); await bekle(4000);
      await s.keyboard.press("Escape"); await cek(ad, 700); await s.keyboard.press("Escape");
    }],
    ["41-sonuc", async (s, cek, ad) => {
      await s.waitForSelector(".ms .ort.acik", { timeout: 180000 }).catch(() => {});
      await cek(ad, 4500);
    }],
  ]],
  // lobi akışları (yerel sunucuda bot): oda açık, arama, bot teklifi, takım seçimi, VS (uzun sürer: EKRAN=lobiakis)
  ["lobiakis", [
    ["30-oda-acik", async (s, cek, ad) => {
      await s.goto(`${TABAN}?ekran=lobi`); await bekle(2500);
      await s.tap("[data-mod=oda]").catch(() => {}); await bekle(500);
      await s.tap("[data-eylem=oda-ac]").catch(() => {});
      await s.waitForSelector("[data-kod]", { timeout: 15000 }).catch(() => {});
      await cek(ad, 1500);
    }],
    ["31-arama", async (s, cek, ad) => {
      await s.goto(`${TABAN}?ekran=lobi&oto=dolas`); await s.waitForFunction(() => !!window.__lobi, null, { timeout: 20000 });
      await s.tap("[data-mod=hizli]").catch(() => {}); await s.tap("[data-eylem=hizli]");
      await cek(ad, 3000);
    }],
    ["32-bot-teklif", async (s, cek, ad) => {
      await s.waitForFunction(() => document.querySelector("[data-oneri]")?.dataset.asama === "botTeklif", null, { timeout: 80000 });
      await cek(ad, 800);
    }],
    ["33-takim-secimi", async (s, cek, ad) => {
      await s.tap("[data-eylem=bot]");
      await s.waitForSelector("[data-eylem=hazir]", { timeout: 30000 }).catch(() => {});
      await s.waitForFunction(() => !document.querySelector(".lb-vs"), null, { timeout: 10000 }).catch(() => {});
      await cek(ad, 900);
    }],
    ["34-mac-esc-menu", async (s, cek, ad) => {
      await s.tap("[data-eylem=hazir]").catch(() => {});
      await s.waitForFunction(() => !!(window.__lobi && window.__lobi.macEkrani), null, { timeout: 60000 });
      await bekle(5000);
      await s.keyboard.press("Escape");
      await cek(ad, 800);
      await s.keyboard.press("Escape");
    }],
    ["35-sonuc", async (s, cek, ad) => {
      const t0 = Date.now();
      while (!(await s.evaluate(() => !!(window.__lobi?.macEkrani?.sonucAcik))) && Date.now() - t0 < 300000) await bekle(1000);
      await cek(ad, 1500);
      await cek("36-sonuc-sonra", 4000);
    }],
  ]],
];

(async () => {
  fs.mkdirSync(KLASOR, { recursive: true });
  const tar = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const toplam = {};
  let ihlalToplam = 0;
  for (const kod of CIHAZ_LISTE) {
    const C = CIHAZLAR[kod];
    if (!C) { console.error("bilinmeyen cihaz", kod); process.exit(2); }
    const klasor = `${KLASOR}/${kod}`;
    fs.mkdirSync(klasor, { recursive: true });
    const b = await tar.newContext({ viewport: { width: C.w, height: C.h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: C.ua });
    const s = await b.newPage();
    const konsol = [];
    s.on("console", (x) => { if (x.type() === "error") konsol.push(`${s.url().split("?")[1] || ""}: ${x.text().slice(0, 160)}`); });
    s.on("pageerror", (e) => konsol.push(`pageerror ${s.url().split("?")[1] || ""}: ${e.message}`));
    const rapor = { cihaz: C, ekranlar: {}, konsol };
    const cek = async (ad, ms = 1800) => {
      await bekle(ms);
      await s.screenshot({ path: `${klasor}/${ad}.png` });
      try { rapor.ekranlar[ad] = await s.evaluate(denetle); } catch (e) { rapor.ekranlar[ad] = { hata: String(e).slice(0, 200) }; }
      const r = rapor.ekranlar[ad];
      const n = ihlalSayisi(r);
      ihlalToplam += n;
      console.log(`${kod.padEnd(8)} ${ad.padEnd(24)} ${r.hata ?? `kayma=${r.sayfaKaydirma ? "VAR" : 0} kesik=${r.kesik.length} örtülü=${r.ortulu.length} kırpık=${r.kirpik.length} binen=${r.binen.length} hedef<44=${r.kucukHedefSayisi}/${r.olculenHedef} küçükYazı=${r.kucukYaziSayisi}`}${n ? "  ✗" : "  ✓"}`);
    };
    await s.goto(`${TABAN}?ekran=gizlilik`); await s.waitForLoadState("networkidle");
    for (const [grup, ekranlar] of EKRANLAR) {
      if (grup === "hesap") {
        rapor.kayit = (await api(s, "POST", "/api/kayit", { ad: `Mobil ${kod.slice(0, 3)}${ek}`, sifre: "mobil-denetim-2", sifreTekrar: "mobil-denetim-2" })).durum;
        rapor.profil = (await api(s, "POST", "/api/profil", { arma: "kasirga", renk: "#2fb8e8" })).durum;
      }
      if (grup === "ana") {
        rapor.ilk = (await api(s, "POST", "/api/ilk-cekirdek", { set: "goktasi" })).durum;
        rapor.egitim = (await api(s, "POST", "/api/egitim-bitti", {})).durum;
        await api(s, "POST", "/api/gelistirme/altin-ver", { miktar: 1500 });
      }
      for (const [ad, f] of ekranlar) {
        if (EKRAN_SECIM && !EKRAN_SECIM.some((x) => ad.includes(x) || grup === x)) continue;
        try { await f(s, cek, ad); } catch (e) { rapor.ekranlar[ad] = { hata: String(e).slice(0, 200) }; ihlalToplam++; console.log(`${kod} ${ad} HATA ${String(e).slice(0, 120)}`); }
      }
    }
    toplam[kod] = rapor;
    fs.writeFileSync(`${klasor}/rapor.json`, JSON.stringify(rapor, null, 1));
    await b.close();
  }
  await tar.close();
  console.log(ihlalToplam ? `\nİHLAL: ${ihlalToplam}` : "\nTEMİZ: ihlal yok");
  process.exit(ihlalToplam ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
