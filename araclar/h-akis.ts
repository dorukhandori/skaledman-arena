// Harita uçtan uca (docs/design/harita/08 § 9 "h:akis"; H6–H8). `KIMLIK_MODU=sifre npm run dev` açıkken: `npm run h:akis`.
// Headless Chromium, masaüstü 1280×720 (DPR 2) + telefon 844×390 (isMobile, hasTouch, DPR 2). OTOMATİK OYNANIŞ: harita
// maçında oyuncunun topacını paylaşılan bot sürer (`?oto=dolas`; girdi gerçek istemci yolundan). Hazırlık: hesap API ile,
// İlk Devir `/api/egitim-bitti`. Akış: Oyna'da HARİTA modu → Harita (b1-01 seçili) → yürü (KEŞFET) → DÖVÜŞ → Lobi
// (düğüm botu, zorluk) → maç → Sonuç harita eki (yıldız, ödül, açılan düğüm) → HARİTA → b1-02 MADEN; H7: kazı → Ocak
// (erit → parça üret → vitrin) → Atölye biçim yığını → Profil KARAKTER; telefon: Harita/Maden/Ocak ölçüm (44 px, kayma).
// Konsol hatası sayılır (0 olmalı). Ekranlar `docs/production/raporlar/ekran/HARITA-H<n>-*.png`.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "./pw.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */
type S = any;
const TABAN = process.env.H_ADRES ?? "http://localhost:5173/";
const KLASOR = "docs/production/raporlar/ekran";
const DILIM = process.env.H_DILIM ?? "H6";
const ADIMLAR = new Set((process.env.H_ADIMLAR ?? "harita,mac,maden,ocak,profil,telefon").split(","));
mkdirSync(KLASOR, { recursive: true });
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ek = Date.now().toString(36).slice(-5);
const AD = `Harita ${ek}`;
const SIFRE = "topac-sifre-1";
const T0 = Date.now();
const log = (...a: unknown[]) => console.log(`[${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const kayit: Record<string, unknown> = { not: "Otomatik oynanış (oyuncu topacı paylaşılan bot ?oto=dolas). İnsan play pass değil.", hesap: AD };
const hatalar: string[] = [];
const cekilen: string[] = [];
const GURULTU = /GL Driver Message|GPU stall|WebGL|favicon/;

async function baglam(t: S, mobil: boolean): Promise<S> {
  const c = await t.newContext(mobil ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const s = await c.newPage();
  s.on("console", (m: S) => { if (m.type() === "error" && !GURULTU.test(m.text())) hatalar.push(`${mobil ? "telefon" : "masaüstü"}: ${m.text()}`); });
  s.on("pageerror", (e: Error) => hatalar.push(`${mobil ? "telefon" : "masaüstü"} pageerror: ${e.message}`));
  return s;
}
const ev = <R>(s: S, kod: string): Promise<R> => s.evaluate(kod);
const bekleKosul = (s: S, kod: string, ms: number) => s.waitForFunction(kod, null, { timeout: ms });
async function goruntu(s: S, ad: string): Promise<void> {
  const yol = `${KLASOR}/HARITA-${DILIM}-${ad}.png`;
  try { await s.screenshot({ path: yol, timeout: 60000 }); cekilen.push(yol); log("  ekran:", yol); }
  catch (e) { log("  ekran ALINAMADI:", yol, String(e).slice(0, 100)); }
}
const git = async (s: S, yol: string, ms = 1200) => { await s.goto(`${TABAN}${yol}`); await bekle(ms); };
const api = (s: S, yontem: string, yol: string, govde: unknown = {}) => ev<{ durum: number; veri: any }>(s, `(async () => {
  const r = await fetch(${JSON.stringify(yol)}, { method: ${JSON.stringify(yontem)}, headers: { "content-type": "application/json" }, body: ${yontem === "GET" ? "undefined" : `JSON.stringify(${JSON.stringify(govde)})`} });
  return { durum: r.status, veri: await r.json() };
})()`);
const tikla = (s: S, sec: string) => ev(s, `(() => { const e = document.querySelector(${JSON.stringify(sec)}); if (!e) throw new Error("yok: ${sec}"); e.dispatchEvent(new MouseEvent("click", { bubbles: true })); return 1; })()`);

/** Telefon ölçümü: yatay kayma, < 44 CSS px dokunma hedefi (görünür düğmeler + harita düğümleri). */
const olc = (s: S) => ev<any>(s, `(() => {
  const W = innerWidth;
  const kayma = document.documentElement.scrollWidth > W + 1;
  const kucuk = [];
  for (const e0 of document.querySelectorAll("button, a, [data-dugum], [data-karakter]")) {
    const e = e0;
    const r = (e0.querySelector("[data-isabet]") || e0).getBoundingClientRect();
    const st = getComputedStyle(e);
    if (r.width === 0 || st.display === "none" || st.visibility === "hidden") continue;
    if (Math.min(r.width, r.height) < 44) kucuk.push((e.dataset.dugum || e.dataset.eylem || e.textContent || e.tagName).trim().slice(0, 24) + " " + Math.round(r.width) + "×" + Math.round(r.height));
  }
  return { kayma, kucuk, genislik: document.documentElement.scrollWidth, W };
})()`);

async function ana(): Promise<void> {
  const t = await chromium.launch();
  const s = await baglam(t, false);
  await git(s, "?ekran=ayarlar");
  const r = [(await api(s, "POST", "/api/kayit", { ad: AD, sifre: SIFRE, sifreTekrar: SIFRE })).durum, (await api(s, "POST", "/api/profil", { arma: "kaya", renk: "#2fb8e8" })).durum,
    (await api(s, "POST", "/api/ilk-cekirdek", { set: "maden" })).durum, (await api(s, "POST", "/api/egitim-bitti", {})).durum];
  kayit["hazirlik"] = r;
  log("hesap:", AD, r);

  if (ADIMLAR.has("harita")) {
    await git(s, "?ekran=lobi");
    await bekleKosul(s, `!!document.querySelector("[data-mod=harita]")`, 15000);
    await goruntu(s, "oyna-harita-modu");
    await tikla(s, "[data-mod=harita]");
    await bekleKosul(s, `!!document.querySelector("[data-dugum='b1-01']")`, 15000);
    await bekle(400);
    kayit["haritaIlk"] = await ev(s, `({ secili: window.__harita?.secili, konum: window.__harita?.durum.konum, ana: document.querySelector("[data-eylem=ana]")?.textContent })`);
    await goruntu(s, "harita-ilk");
    // 0,5 sn testi verisi: başlık plakası + ana düğme + seçili düğüm görünür mü
    kayit["hiyerarsi"] = await ev(s, `(() => { const g = (q) => { const e = document.querySelector(q); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }; return { plaka: g("[data-bolge]"), ana: g("[data-eylem=ana]"), secili: g("[data-dugum='b1-01']"), karakter: g("[data-karakter]") }; })()`);
    await tikla(s, "[data-dugum='b1-01']");
    await bekleKosul(s, `document.querySelector("[data-eylem=ana]")?.dataset.tur === "dovus"`, 10000);
    await goruntu(s, "harita-dusman-dovus");
    // klavye: Escape → lobi'ye döner mi (yalnız ölçüm; geri gelinir)
  }

  if (ADIMLAR.has("mac")) {
    await git(s, "?ekran=lobi&dugum=b1-01&oto=dolas", 600);
    await bekleKosul(s, `!!document.querySelector("[data-eylem=hazir]")`, 20000);
    kayit["lobiZorluk"] = await ev(s, `document.querySelector("[data-zorluk]")?.textContent ?? null`);
    await goruntu(s, "lobi-dugum-botu");
    await tikla(s, "[data-eylem=hazir]");
    log("harita maçı başladı (oto=dolas)…");
    await bekleKosul(s, `!!document.querySelector("[data-harita-odul] .yildizlar")`, 200000);
    for (let i = 0; i < 8; i++) { await ev(s, `window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space" }))`); await bekle(400); } // satırları atla
    await bekle(1500);
    kayit["sonuc"] = await ev(s, `(() => { const h = document.querySelector("[data-harita-odul]"); return { yildiz: h.dataset.yildiz, asama: h.dataset.asama, metin: h.innerText.replace(/\\s+/g, " ").slice(0, 200) }; })()`);
    log("sonuç:", kayit["sonuc"]);
    await goruntu(s, "sonuc-harita-eki");
    await tikla(s, "[data-eylem=harita]");
    await bekleKosul(s, `!!document.querySelector("[data-dugum='b1-02']")`, 15000);
    await bekle(500);
    kayit["donus"] = await ev(s, `({ b102: document.querySelector("[data-dugum='b1-02']").dataset.durum, b101: document.querySelector("[data-dugum='b1-01']").dataset.durum })`);
    await goruntu(s, "harita-donus");
  }

  if (ADIMLAR.has("maden")) {
    // b1-02 MADEN: haritada yürü → KAZ → Maden ekranı → damar bitene kadar kaz
    await git(s, "?ekran=harita", 1200);
    await bekleKosul(s, `!!document.querySelector("[data-dugum='b1-02']")`, 15000);
    await tikla(s, "[data-dugum='b1-02']");
    await bekleKosul(s, `document.querySelector("[data-eylem=ana]")?.dataset.tur === "kaz"`, 10000);
    await goruntu(s, "harita-maden-kaz");
    await tikla(s, "[data-eylem=ana]");
    await bekleKosul(s, `!!document.querySelector("[data-eylem=kaz]")`, 15000);
    await bekle(800);
    await goruntu(s, "maden-ilk");
    const ucuslar: string[] = [];
    for (let i = 0; i < 8; i++) {
      const bitti = await ev<boolean>(s, `!!document.querySelector("[data-eylem=harita]")`);
      if (bitti) break;
      await tikla(s, "[data-eylem=kaz]");
      await bekle(350);
      ucuslar.push(await ev<string>(s, `[...document.querySelectorAll("[data-ucus]")].map((x) => x.dataset.ucus).join(" | ")`));
      if (i === 1) await goruntu(s, "maden-vurus");
      await bekle(600);
    }
    kayit["kazi"] = { ucuslar, kalan: await ev(s, `document.querySelector("[data-kalan]")?.dataset.kalan`), dinc: await ev(s, `document.querySelector("[data-dinc]")?.dataset.dinc`) };
    log("kazı:", kayit["kazi"]);
    await goruntu(s, "maden-bitti");
  }

  if (ADIMLAR.has("ocak")) {
    // hazırlık (yalnız geliştirme ucu): parça üretimi için yeterli Demir cevheri (kazı zarına bağlı kalmasın)
    await api(s, "POST", "/api/gelistirme/cevher", { kademe: 1, cevher: 16, kulce: 0 });
    await git(s, "?ekran=atolye", 1500);
    await bekleKosul(s, `!!document.querySelector("[data-eylem=ocak]")`, 15000);
    await goruntu(s, "atolye-ocak-dugmesi");
    await tikla(s, "[data-eylem=ocak]");
    await bekleKosul(s, `!!document.querySelector("[data-kademe='1']")`, 15000);
    await bekle(300);
    await goruntu(s, "ocak-ilk");
    await tikla(s, "[data-eylem=ana]"); // ERİT (en çok parti)
    await bekleKosul(s, `!!document.querySelector("[data-sonuc]")`, 15000);
    kayit["erit"] = await ev(s, `document.querySelector("[data-sonuc]").textContent`);
    await goruntu(s, "ocak-erit");
    const kulce = await ev<number>(s, `window.__ocak.durum.kulce[0]`);
    if (kulce < 3) { await api(s, "POST", "/api/gelistirme/cevher", { kademe: 1, cevher: 0, kulce: 3 - kulce }); await git(s, "?ekran=ocak", 1200); }
    await bekleKosul(s, `!!document.querySelector("[data-parca='duz-uc']")`, 15000);
    await tikla(s, "[data-parca='duz-uc']");
    await bekle(200);
    await tikla(s, "[data-eylem=ana]"); // ÜRET
    await bekleKosul(s, `!!document.querySelector("[data-eylem=atolye]")`, 15000);
    kayit["ilkParca"] = { metin: await ev(s, `document.querySelector("[data-sonuc]").textContent`), sureSn: Math.round((Date.now() - T0) / 1000) };
    log("ilk parça:", kayit["ilkParca"]);
    await goruntu(s, "ocak-parca-uretildi");
    await tikla(s, "[data-eylem=atolye]");
    await bekleKosul(s, `!!document.querySelector("[data-eylem=oyna]")`, 15000);
    await bekle(800);
    // Uç sekmesi: üretilmiş biçim rozeti
    await ev(s, `(() => { const b = [...document.querySelectorAll("button")].find((x) => /^Uç/i.test(x.textContent.trim())); b?.click(); return 1; })()`);
    await bekle(500);
    kayit["atolyeBicim"] = await ev(s, `[...document.querySelectorAll("[data-malzeme]")].map((x) => x.textContent)`);
    await goruntu(s, "atolye-bicim");
    await git(s, "?ekran=market", 1500);
    kayit["market"] = await ev(s, `({ ucretsiz: document.body.innerText.includes("ÜCRETSİZ") })`);
    await goruntu(s, "market-ucretsiz");
  }

  if (ADIMLAR.has("profil")) {
    await git(s, "?ekran=profil", 1500);
    await bekleKosul(s, `!!document.querySelector("[data-karakter='2']")`, 15000);
    await tikla(s, "[data-karakter='2']");
    await bekleKosul(s, `!!document.querySelector("[data-vitrin='0']")`, 10000).catch(() => 0);
    await ev(s, `(() => { const v = document.querySelector("[data-vitrin='0']"); if (v && v.options.length > 1) { v.selectedIndex = 1; v.dispatchEvent(new Event("change")); } return 1; })()`);
    await goruntu(s, "profil-karakter-vitrin");
    await tikla(s, "[data-eylem=profil-kaydet]");
    await bekle(1500);
    kayit["profil"] = (await api(s, "GET", "/api/ben")).veri.karakter;
    kayit["vitrin"] = (await api(s, "GET", "/api/ocak")).veri.vitrin;
  }

  if (ADIMLAR.has("telefon")) {
    const m = await baglam(t, true);
    await git(m, "?ekran=ayarlar");
    await api(m, "POST", "/api/giris", { ad: AD, sifre: SIFRE });
    await git(m, "?ekran=harita", 1500);
    await bekleKosul(m, `!!document.querySelector("[data-dugum='b1-01']")`, 15000);
    kayit["telefonHarita"] = await olc(m);
    await goruntu(m, "telefon-harita");
    if (ADIMLAR.has("ocak")) {
      await git(m, "?ekran=ocak", 1500);
      await bekleKosul(m, `!!document.querySelector("[data-kademe='1']")`, 15000);
      kayit["telefonOcak"] = await olc(m);
      await goruntu(m, "telefon-ocak");
    }
    if (ADIMLAR.has("maden")) {
      // telefon kazısı: b1-05 açık değilse damar bitti ekranı ölçülür (yine Maden ekranı)
      await git(m, "?ekran=maden&dugum=b1-02", 1500);
      await bekleKosul(m, `!!document.querySelector("[data-eylem=kaz], [data-eylem=harita]")`, 15000);
      kayit["telefonMaden"] = await olc(m);
      await goruntu(m, "telefon-maden");
    }
  }

  kayit["konsolHatalari"] = hatalar;
  kayit["ekranlar"] = cekilen;
  writeFileSync(`docs/production/raporlar/HARITA-${DILIM}-akis.json`, JSON.stringify(kayit, null, 1));
  log("konsol hatası:", hatalar.length, hatalar.slice(0, 5));
  await t.close();
  if (hatalar.length) process.exitCode = 1;
}

ana().catch((e) => { console.error(e); process.exit(1); });
