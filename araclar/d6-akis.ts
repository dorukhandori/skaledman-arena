// D6 "bitti" uçtan uca (headless Chromium, DPR 2). OTOMATİK OYNANIŞ: "Dene" Antrenman'ını bu betik Playwright
// klavyesiyle sürer (durumu okur: duruştan D/A basılı hızlanır, bırakır, kaymayı bekler; yön değiştirir); çevrimiçi
// maçta iki topacı paylaşılan bot sürer (?oto=kenar / dolas, girdi gerçek istemci yolundan). Tıklamalar, sürükle-bırak,
// klavye sıralama ve form doldurma Playwright'tan.
// Akış: A (Maden) ve B (Yapay) hesap (API) → A çıkış/giriş (form) → Atölye genel → envanter sekmeleri/filtre/kilitli/
// gizli/boş sekme → Uç değiştir (İğne → Düz; çubuk önce/sonra) → element uyumsuzluğu → Dene (Düz) → Atölye (taslak
// korunur) → Dene (İğne) → ölçüm farkı → ikinci Çekirdek, parça çakışması uyarısı, sürükle-bırak + klavye sıra, kaydet,
// yeniden adlandır, yeni takım → B: Yapay yön → Çekirdek Günlüğü Lv.2 → XP ucu (695) → A metin ölçeği %150 → oda kodu
// maç (kayıtlı takımlar) → sonuç: Lv.3 + Özel Yetenek → rövanş: Özel Yetenek yuvası açık (HUD %150) → Günlük Lv.3 →
// ad değiştirme + 30 gün hatası.
// Önce: npm run dev. Çalıştır: npm run d6:akis
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "./pw.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */
type S = any;
const TABAN = process.env.D6_ADRES ?? "http://localhost:5173/";
const KLASOR = "docs/production/raporlar/ekran";
mkdirSync(KLASOR, { recursive: true });
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));
const kayit: Record<string, unknown> = { not: "Otomatik oynanış (betik klavye; çevrimiçi maçta paylaşılan bot). İnsan play pass değil." };
const cekilen: string[] = [];
const ek = Date.now().toString(36).slice(-4);
const AD_A = `Ayla ${ek}`;
const AD_B = `Berk ${ek}`;
const SIFRE = "topac-sifre-1";

interface Istemci { ad: string; tarayici: S; sayfa: S; hatalar: string[] }
async function istemci(ad: string): Promise<Istemci> {
  const tarayici = await chromium.launch();
  const baglam = await (tarayici as S).newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const sayfa = await baglam.newPage();
  const hatalar: string[] = [];
  sayfa.on("console", (m: S) => { if (m.type() === "error") hatalar.push(`${ad}: ${m.text()}`); });
  sayfa.on("pageerror", (e: Error) => hatalar.push(`${ad} pageerror: ${e.message}`));
  return { ad, tarayici, sayfa, hatalar };
}
const ev = <R>(s: S, kod: string): Promise<R> => s.evaluate(kod);
const bekleKosul = (s: S, kod: string, ms: number) => s.waitForFunction(kod, null, { timeout: ms });
const tikla = (s: S, sec: string) => s.click(sec);
/** GU-A2 ikinci kat: hedef görünmüyorsa açan düğmeye bas (filtre · ayrıntı · takım menüsü · daha fazla). */
const KAT: [RegExp, string][] = [[/data-filtre/, "[data-eylem=filtre]"], [/\.dene select|data-yon=/, "[data-eylem=ayrinti]"], [/data-takim-adi|ad-kaydet|yeni-takim|data-kayitli-takim|data-eylem=aktif/, "[data-eylem=takim-menu]"], [/data-eylem=gunluk/, "[data-eylem=daha-fazla]"]];
async function ikinciKat(s: S, sec: string): Promise<void> {
  const k = KAT.find(([r]) => r.test(sec));
  if (!k) return;
  const gorunur = await s.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sec)}); return !!e && !!(e.offsetWidth || e.offsetHeight); })()`);
  if (!gorunur && (await s.$(k[1]))) await s.click(k[1]);
}
const tiklaK = async (s: S, sec: string) => { await ikinciKat(s, sec); await s.click(sec); };
const secK = async (s: S, sec: string, v: string) => { await ikinciKat(s, sec); await s.selectOption(sec, v); };
const doldurK = async (s: S, sec: string, v: string) => { await ikinciKat(s, sec); await s.fill(sec, v); };
async function goruntu(s: S, ad: string): Promise<void> {
  const yol = `${KLASOR}/D6-${ad}.png`;
  try { await s.screenshot({ path: yol, timeout: 60000 }); }
  catch (e) { console.log("  ekran ALINAMADI:", yol, String(e).slice(0, 100)); kayit[`alinamadi-${ad}`] = String(e).slice(0, 160); return; }
  cekilen.push(yol);
  console.log("  ekran:", yol);
}
const git = async (s: S, yol: string) => { await s.goto(`${TABAN}${yol}`); await bekle(600); };
const api = (s: S, yontem: string, yol: string, govde: unknown = {}) => ev<{ durum: number; veri: any }>(s, `(async () => {
  const r = await fetch(${JSON.stringify(yol)}, { method: ${JSON.stringify(yontem)}, headers: { "content-type": "application/json" }, body: ${yontem === "GET" ? "undefined" : `JSON.stringify(${JSON.stringify(govde)})`} });
  return { durum: r.status, veri: await r.json() };
})()`);
const atolyeHazir = (s: S) => bekleKosul(s, `!!window.__atolye && !!document.querySelector("[data-eylem=oyna]")`, 20000);
const cubuklar = (s: S) => ev<Record<string, number>>(s, `Object.fromEntries([...document.querySelectorAll("[data-cubuk]")].map((r) => [r.dataset.cubuk, Number(r.querySelector(".say").textContent)]))`);
const farklar = (s: S) => ev<Record<string, string>>(s, `Object.fromEntries([...document.querySelectorAll("[data-cubuk]")].map((r) => [r.dataset.cubuk, r.querySelector(".fark").textContent.trim()]))`);
async function hesapAc(s: S, ad: string, set: string, parcalar: string[]): Promise<void> {
  await git(s, "?ekran=ayarlar");
  const r: number[] = [];
  r.push((await api(s, "POST", "/api/kayit", { ad, sifre: SIFRE, sifreTekrar: SIFRE })).durum);
  r.push((await api(s, "POST", "/api/profil", { arma: set === "maden" ? "kaya" : "kasirga", renk: set === "maden" ? "#2fb8e8" : "#7fe3a0" })).durum);
  r.push((await api(s, "POST", "/api/ilk-cekirdek", { set })).durum);
  for (const p of parcalar) r.push((await api(s, "POST", "/api/gelistirme/parca-ver", { tanim: p })).durum);
  kayit[`hesap-${set}`] = r;
}

// ---- Dene: otomatik sürüş (klavye) ----
async function deneOyna(s: S, etiket: string, cek = false): Promise<unknown> {
  await bekleKosul(s, `!!(window.__dene && window.__mac)`, 30000);
  const bas = Date.now();
  // döngü: yön tuşu basılı (ivme örneği alınana kadar) → bırak (kayma örneği alınana kadar) → merkeze göre yön seç
  let tus = "KeyD";
  let basili = false;
  let cekildi = false;
  let hedefIvme = 1, hedefKayma = 0;
  while (Date.now() - bas < 420_000) {
    const d = await ev<{ bitti: boolean; faz: string; x: number; sn: number; io: number; ko: number }>(s, `(() => { const m = window.__mac; const t = m.durum.topaclar[m.yerelIndeks]; const o = window.__dene.olcum;
      return { bitti: window.__dene.bitti, faz: m.durum.mac.faz, x: t.x, sn: o.turSn, io: o.ivmeOrnek, ko: o.kaymaOrnek }; })()`);
    if (d.bitti) break;
    if (d.faz !== "tur") { if (basili) { await s.keyboard.up(tus); basili = false; } await bekle(100); continue; }
    if (cek && !cekildi && d.sn > 9) { cekildi = true; await goruntu(s, `dene-${etiket}`); }
    if (!basili && d.ko >= hedefKayma) {
      tus = d.x > 0 ? "KeyA" : "KeyD";
      await s.keyboard.down(tus);
      basili = true;
      hedefIvme = d.io + 1;
    } else if (basili && d.io >= hedefIvme) {
      await bekle(120);
      await s.keyboard.up(tus);
      basili = false;
      hedefKayma = d.ko + 1;
    }
    await bekle(30);
  }
  await s.keyboard.up(tus);
  await bekleKosul(s, `!!document.querySelector(".dn .son.acik")`, 30000);
  const olcum = await ev(s, "window.__dene.olcum");
  kayit[`dene-${etiket}`] = { olcum, gercekSn: Math.round((Date.now() - bas) / 1000) };
  return olcum;
}

// ---- çevrimiçi maç (oda kodu, oto) ----
async function macOyna(a: S, b: S, etiket: string): Promise<void> {
  await bekleKosul(a, `!!(window.__lobi && window.__lobi.asama === "mac")`, 60000);
  await bekle(15000);
  await goruntu(a, `${etiket}-mac-A`);
  for (const s of [a, b]) await bekleKosul(s, `!!(window.__lobi.macEkrani && window.__lobi.macEkrani.sonucAcik)`, 300000);
  for (const s of [a, b]) await bekleKosul(s, `!!document.querySelector("[data-odul] .ck, [data-odul]:not(:has(.yt))")`, 20000);
  await a.keyboard.press("Space"); await b.keyboard.press("Space");
  await bekle(900);
}

const temizle = (h: string[]) => h.filter((x) => !/Failed to load resource: the server responded with a status of (40[0149])/.test(x));

const A = await istemci("A");
let B: Istemci | null = null;
try {
  const a = A.sayfa;
  // 1. hesaplar (A: Maden + geliştirme ucuyla parçalar; B: Yapay)
  await hesapAc(a, AD_A, "maden", ["duz-uc", "top-uc", "ok-govde", "hafif-disk", "kor-goktasi"]);
  B = await istemci("B");
  const b = B.sayfa;
  await hesapAc(b, AD_B, "yapay", []);
  // A çıkış → giriş formu → Atölye
  await api(a, "POST", "/api/cikis");
  await git(a, "?ekran=giris");
  await bekleKosul(a, `!!document.querySelector("[data-eylem=giris-yap]")`, 20000);
  await a.fill("#a-ad", AD_A);
  await a.fill("#a-sifre", SIFRE);
  await tikla(a, "[data-eylem=giris-yap]");
  await bekleKosul(a, `location.search.includes("ekran=atolye")`, 20000);
  await atolyeHazir(a);
  await bekle(800);
  // gizli parça (Kor Kalbi) satır görünümü için Çekirdek sekmesi sonra
  await goruntu(a, "atolye-genel");
  kayit["atolyeIlk"] = await ev(a, `({ oyna: document.querySelector("[data-eylem=oyna]").getAttribute("aria-disabled"), neden: document.querySelector("#oyna-neden").textContent, yuvalar: [...document.querySelectorAll("[data-takim-yuva]")].map((x) => x.className) })`);

  // 2. envanter: sekmeler + filtre
  await tikla(a, "[data-sekme=cekirdek]");
  await bekle(300);
  kayit["cekirdekSekmesi"] = await ev(a, `[...document.querySelectorAll(".liste [data-parca]")].map((x) => x.dataset.parca + ":" + x.dataset.durum + ":" + x.querySelector(".et").textContent)`);
  await goruntu(a, "kilitli-gizli");
  await tikla(a, "[data-sekme=govde]");
  await secK(a, "[data-filtre=sahiplik]", "kilitli");
  await bekle(300);
  kayit["govdeKilitli"] = await ev(a, `[...document.querySelectorAll(".liste [data-parca]")].map((x) => x.getAttribute("aria-label"))`);
  await goruntu(a, "envanter-filtre");
  await tikla(a, "[data-sekme=disk]");
  await secK(a, "[data-filtre=sahiplik]", "hepsi");
  await secK(a, "[data-filtre=element]", "kor");
  await bekle(300);
  kayit["bosSekme"] = await ev(a, `(document.querySelector("[data-bos-sekme]") || {}).textContent || ""`);
  await goruntu(a, "bos-sekme");
  await secK(a, "[data-filtre=element]", "");
  // klavye: sekmeler ok tuşlarıyla
  await a.focus("[data-sekme=disk]");
  await a.keyboard.press("ArrowRight");
  kayit["klavyeSekme"] = await ev(a, `document.activeElement.dataset.sekme`);

  // 3. Uç değiştir: İğne → Düz (çubuklar anında, fark)
  const once = await cubuklar(a);
  await goruntu(a, "cubuk-once");
  await tikla(a, ".liste [data-parca=duz-uc]");
  await bekle(300);
  const sonra = await cubuklar(a);
  kayit["ucDegisimi"] = { once, sonra, fark: await farklar(a), etiket: await ev(a, `[...document.querySelectorAll("[data-etiket]")].map((x) => x.textContent)`) };
  await goruntu(a, "cubuk-sonra");

  // 4. element uyumsuzluğu: Kaya Çekirdek + Ok Gövde (Kor) → "Enerji dolumu yavaşlar."
  await tikla(a, "[data-sekme=govde]");
  await tikla(a, ".liste [data-parca=ok-govde]");
  await bekle(300);
  kayit["uyumUyari"] = await ev(a, `(document.querySelector("[data-uyum=uyumsuz]") || {}).textContent || ""`);
  await goruntu(a, "uyum-uyari");
  await tikla(a, ".liste [data-parca=kalkan-govde]");
  await bekle(200);
  kayit["uyumGeri"] = await ev(a, `(document.querySelector("[data-uyum]") || {}).dataset?.uyum || ""`);

  // 5. Dene (Düz Uç) → Atölye (taslak korunur) → Dene (İğne Uç)
  await secK(a, ".dene select", "pasif");
  await tikla(a, "[data-eylem=dene]");
  const duz = await deneOyna(a, "duz", true);
  await goruntu(a, "dene-sonuc");
  await tikla(a, ".dn .son [data-eylem=atolye]");
  await atolyeHazir(a);
  kayit["deneSonrasiTaslak"] = await ev(a, `({ ...window.__atolye.taslakDurumu, uc: document.querySelector("[data-yuva=uc] span").textContent })`);
  await tikla(a, "[data-sekme=uc]");
  await tikla(a, ".liste [data-parca=igne-uc]");
  await bekle(200);
  await secK(a, ".dene select", "pasif");
  await tikla(a, "[data-eylem=dene]");
  const igne = await deneOyna(a, "igne");
  await tikla(a, ".dn .son [data-eylem=atolye]");
  await atolyeHazir(a);
  kayit["deneFark"] = { duz, igne };

  // 6. takım: ikinci Çekirdek (Kor Göktaşı) 2. yuvaya, parça çakışması, sıra (sürükle-bırak + klavye), kaydet
  await tikla(a, "[data-takim-yuva='1']");
  await tikla(a, "[data-sekme=cekirdek]");
  await tikla(a, ".liste [data-parca=kor-goktasi]");
  await tikla(a, "[data-sekme=govde]");
  await tikla(a, ".liste [data-parca=ok-govde]");
  await tikla(a, "[data-sekme=disk]");
  await tikla(a, ".liste [data-parca=hafif-disk]");
  await tikla(a, "[data-sekme=uc]");
  await tikla(a, ".liste [data-parca=igne-uc]"); // 1. topaçtaki İğne → çakışma: oradan çıkar
  await bekle(300);
  kayit["cakisma"] = await ev(a, `({ uyari: (document.querySelector("[data-cakisma]") || {}).textContent || "", neden: document.querySelector("#oyna-neden").textContent, oyna: document.querySelector("[data-eylem=oyna]").getAttribute("aria-disabled") })`);
  await goruntu(a, "cakisma-uyari");
  await tikla(a, ".liste [data-parca=duz-uc]"); // 2. topaca Düz
  await tikla(a, "[data-takim-yuva='0']");
  await tikla(a, ".liste [data-parca=igne-uc]"); // 1. topaca İğne geri (2.'de Düz kalır)
  await bekle(200);
  kayit["takimTaslak"] = await ev(a, "window.__atolye.taslakDurumu");
  // sürükle-bırak: 1 ↔ 3, sonra klavye Alt+↑ ile geri
  await a.dragAndDrop("[data-takim-yuva='0']", "[data-takim-yuva='2']");
  await bekle(200);
  kayit["surukleSonrasi"] = await ev(a, `[...document.querySelectorAll("[data-takim-yuva] b")].map((x) => x.textContent)`);
  await a.focus("[data-takim-yuva='2']");
  await a.keyboard.press("Alt+ArrowUp");
  await a.keyboard.press("Alt+ArrowUp");
  await bekle(200);
  kayit["klavyeSirasi"] = await ev(a, `[...document.querySelectorAll("[data-takim-yuva] b")].map((x) => x.textContent)`);
  // ad + kaydet
  await doldurK(a, "[data-takim-adi]", "Kaya ve Kor");
  await tikla(a, "[data-eylem=kaydet]");
  await bekleKosul(a, `document.querySelector("[data-durum-satiri]").textContent.includes("kaydedildi")`, 10000);
  await goruntu(a, "takim-paneli");
  kayit["kaydet"] = await ev(a, `({ durum: document.querySelector("[data-durum-satiri]").textContent, cark: document.querySelector("[data-cark]").dataset.cark, oyna: document.querySelector("[data-eylem=oyna]").getAttribute("aria-disabled") })`);
  // yeni takım + yeniden adlandır
  await tiklaK(a, "[data-eylem=yeni-takim]");
  await bekleKosul(a, `document.querySelectorAll("[data-kayitli-takim]").length === 2`, 10000);
  await doldurK(a, "[data-takim-adi]", "Deneme Takımı");
  await tiklaK(a, "[data-eylem=ad-kaydet]");
  await bekleKosul(a, `document.querySelector("[data-durum-satiri]").textContent.includes("Deneme Takımı")`, 10000);
  kayit["ikinciTakim"] = await ev(a, `({ kayitli: [...document.querySelectorAll("[data-kayitli-takim]")].map((x) => x.textContent), neden: document.querySelector("#oyna-neden").textContent })`);
  await goruntu(a, "kayitli-takimlar");
  await tiklaK(a, "[data-kayitli-takim='0']");
  await tiklaK(a, "[data-eylem=aktif]").catch(() => {});
  await bekle(300);

  // 7. B: Yapay yön seçimi (sol)
  await git(b, "?ekran=atolye");
  await atolyeHazir(b);
  await tiklaK(b, "[data-yon=sol]");
  await bekleKosul(b, `document.querySelector("[data-yon=sol]").getAttribute("aria-checked") === "true" || document.querySelector("[data-durum-satiri]").textContent.includes("sola")`, 10000);
  await git(b, "?ekran=atolye");
  await atolyeHazir(b);
  kayit["yapayYon"] = await ev(b, `({ sol: document.querySelector("[data-yon=sol]").getAttribute("aria-checked"), etiket: document.querySelector("[data-etiket=yon]").textContent })`);
  await goruntu(b, "yapay-yon");

  // 8. Çekirdek Günlüğü (Lv.2)
  await tiklaK(a, "[data-eylem=gunluk]");
  await bekleKosul(a, `!!document.querySelector("[data-gunluk-ad]")`, 20000);
  kayit["gunlukLv2"] = await ev(a, `({ sev: document.querySelector("[data-seviye]").textContent, sonraki: document.querySelector("[data-sonraki]").textContent, yet: [...document.querySelectorAll("[data-yetenek-yuva]")].map((x) => x.dataset.yetenekYuva + ":" + x.dataset.acik) })`);
  await goruntu(a, "gunluk-lv2");

  // 9. XP ucu: Kaya Maden 695 XP (bir maç sonra Lv.3), A metin ölçeği %150 (menü + maç HUD'u)
  const v = await api(a, "GET", "/api/atolye");
  const maden = v.veri.cekirdekler.find((c: any) => c.tanimId === "kaya-maden");
  kayit["xpVer"] = (await api(a, "POST", "/api/gelistirme/xp-ver", { cekirdekId: maden.id, xp: 695 - maden.tecrube })).veri;
  await git(a, "?ekran=ayarlar");
  await tikla(a, "[data-o='1.5']");
  // B: yüksek kontrast HUD
  await git(b, "?ekran=ayarlar");
  await b.evaluate(`[...document.querySelectorAll(".ekr button")].find((x) => x.previousElementSibling && x.previousElementSibling.textContent === "Yüksek kontrast HUD").click()`);
  kayit["bKontrast"] = await ev(b, `JSON.parse(localStorage.getItem("devran.ayarlar.v1")).kontrast`);

  // 10. oda kodu maçı (kayıtlı takımlarla)
  await git(a, "?ekran=lobi&oto=kenar");
  // GU-08: Oyna varsayılanı Hızlı maç; oda için "Oda kodu" modu seçilir
  await bekleKosul(a, `!!document.querySelector("[data-mod=oda]")`, 20000);
  await tikla(a, "[data-mod=oda]");
  await bekleKosul(a, `!!document.querySelector("[data-eylem=oda-ac]")`, 20000);
  await tikla(a, "[data-eylem=oda-ac]");
  await bekleKosul(a, `!!document.querySelector("[data-kod]")`, 20000);
  const kod = await ev<string>(a, `document.querySelector("[data-kod]").dataset.kod`);
  kayit["odaKodu"] = kod;
  await b.goto(`${TABAN}?ekran=lobi&oto=dolas#oda=${kod}`);
  await bekleKosul(b, `!!document.querySelector("[data-eylem=katil]")`, 20000);
  await tikla(b, "[data-eylem=katil]");
  for (const s of [a, b]) await bekleKosul(s, `!!document.querySelector("[data-eylem=hazir]")`, 20000);
  await bekle(1000);
  kayit["takimSecimi"] = await ev(a, `({ takimlar: [...document.querySelectorAll("[data-takim]")].map((d) => d.textContent), secili: (document.querySelector("[data-takim][aria-pressed=true]") || {}).textContent, rakip: document.querySelector("[data-rakip]").textContent })`);
  for (const s of [a, b]) await tikla(s, "[data-eylem=hazir]");
  await bekleKosul(a, `!!(window.__lobi && window.__lobi.asama === "mac")`, 60000);
  await bekleKosul(a, `!!document.querySelector(".mh .yv")`, 30000);
  await bekle(2500);
  kayit["mac1Kilit"] = await ev(a, `(() => { const m = window.__lobi.macEkrani; return { seviye: m.durum.seviye[m.yerelIndeks], yuvaSiniflari: [...document.querySelectorAll(".mh .yv")].slice(0, 3).map((x) => x.className) }; })()`);
  await macOyna(a, b, "m1");
  kayit["sonuc1"] = await ev(a, `({ baslik: document.querySelector(".ms h2").textContent, odul: document.querySelector("[data-odul]").innerText })`);
  await goruntu(a, "sonuc-lv3");
  // 11. rövanş: Lv.3 → Özel Yetenek yuvası açık (sunucu takımları SQLite'tan tazeler)
  for (const s of [a, b]) await tikla(s, ".ms [data-rovans]");
  for (const s of [a, b]) await bekleKosul(s, `!!document.querySelector("[data-eylem=hazir]") && getComputedStyle(document.querySelector("[data-eylem=hazir]")).display !== "none"`, 30000);
  await bekle(800);
  for (const s of [a, b]) await tikla(s, "[data-eylem=hazir]");
  await bekleKosul(a, `!!(window.__lobi.macEkrani && !window.__lobi.macEkrani.sonucAcik && window.__lobi.macEkrani.durum.mac.faz === "tur")`, 60000);
  await bekle(4000);
  kayit["mac2Kilit"] = await ev(a, `(() => { const m = window.__lobi.macEkrani; const d = m.durum; const y = m.yerelIndeks;
    const yv = [...document.querySelectorAll(".mh .yv")].slice(0, 3).map((x) => x.className);
    return { seviye: d.seviye[y], yuvaSiniflari: yv, hudOlcek: document.querySelector(".mh").dataset.olcek, hudSinif: document.querySelector(".mh").className }; })()`);
  await goruntu(a, "hud-150");
  await goruntu(b, "hud-kontrast");
  for (const s of [a, b]) await bekleKosul(s, `!!(window.__lobi.macEkrani && window.__lobi.macEkrani.sonucAcik)`, 300000);
  await bekle(1500);
  kayit["mac2Yetenek"] = await ev(a, `(() => { const m = window.__lobi.macEkrani; return m.durum.yetenekSayisi[m.yerelIndeks]; })()`);
  kayit["sonuc2"] = await ev(a, `({ baslik: document.querySelector(".ms h2").textContent, metin: document.querySelector(".ms").innerText.slice(0, 600) })`);
  await goruntu(a, "sonuc-2");
  // 12. Atölye: "Yeni yetenek açıldı" rozeti (metin ölçeği %100'e geri), sonra Çekirdek Günlüğü (Lv.3, defter)
  await ev(a, `localStorage.setItem("devran.metinOlcegi.v1", "1")`);
  await git(a, "?ekran=atolye");
  await atolyeHazir(a);
  await bekle(500);
  kayit["yeniYetenekRozeti"] = await ev(a, `[...document.querySelectorAll("[data-yeni-yetenek]")].map((x) => x.closest("[data-takim-yuva]").textContent)`);
  await goruntu(a, "atolye-yeni-yetenek");
  await git(a, `?ekran=gunluk&c=${maden.id}`);
  await bekleKosul(a, `!!document.querySelector("[data-gunluk-ad]")`, 20000);
  kayit["gunlukLv3"] = await ev(a, `({ sev: document.querySelector("[data-seviye]").textContent, xp: document.querySelector("[data-xp]").textContent, defter: [...document.querySelectorAll("[data-defter]")].map((x) => x.dataset.defter + "=" + x.querySelector("b").textContent), yet: [...document.querySelectorAll("[data-yetenek-yuva]")].map((x) => x.dataset.yetenekYuva + ":" + x.dataset.acik) })`);
  await goruntu(a, "gunluk-lv3");
  // 14. ad değiştirme + 30 gün
  await git(a, "?ekran=profil");
  await bekleKosul(a, `!!document.querySelector("[data-eylem=ad-degistir]")`, 20000);
  await a.fill("#a-ad", `${AD_A} Yeni`.slice(0, 16));
  await tikla(a, "[data-eylem=ad-degistir]");
  await bekleKosul(a, `document.querySelector("[data-ad-hata]").textContent.length > 0`, 10000);
  kayit["adDegisim1"] = await ev(a, `document.querySelector("[data-ad-hata]").textContent`);
  await a.fill("#a-ad", `Ayla İki ${ek}`.slice(0, 16));
  await tikla(a, "[data-eylem=ad-degistir]");
  await bekleKosul(a, `!!document.querySelector("[data-ad-hata][data-hata-kodu]")`, 10000);
  kayit["adDegisim2"] = await ev(a, `document.querySelector("[data-ad-hata]").textContent`);
  await goruntu(a, "ad-hata");
  kayit["konsolHatalari"] = [...temizle(A.hatalar), ...temizle(B.hatalar)];
  kayit["konsolHamHatalar"] = [...A.hatalar, ...B.hatalar];
} catch (e) {
  kayit["hata"] = String(e);
  console.error(e);
  try { await goruntu(A.sayfa, "HATA-A"); } catch { /* */ }
  if (B) try { await goruntu(B.sayfa, "HATA-B"); } catch { /* */ }
  kayit["konsolHamHatalar"] = [...A.hatalar, ...(B?.hatalar ?? [])];
} finally {
  kayit["cekilen"] = cekilen;
  kayit["hesaplar"] = [AD_A, AD_B];
  writeFileSync(`${KLASOR}/D6-akis.json`, JSON.stringify(kayit, null, 2));
  console.log(JSON.stringify(kayit, null, 2));
  await A.tarayici.close();
  await B?.tarayici.close();
}
