// D7 "bitti" uçtan uca (headless Chromium, DPR 2, `npm run dev` açıkken: `npm run d7:akis`). OTOMATİK OYNANIŞ:
// çevrimiçi maçlarda iki topacı da paylaşılan bot sürer (A `?oto=dolas`, B `?oto=kenar`; girdi gerçek istemci
// yolundan). Sonuç oyundan gelir (kazanan sabit değil). Hızlı maç İKİ HESAPLA eşleşir (iki ayrı
// tarayıcı süreci). Tıklamalar, klavye (Space/Enter atlama, ok tuşları), formlar Playwright'tan.
// Hazırlık (geliştirme uçları, raporda yazılı): hesaplar API ile; İlk Devir `/api/egitim-bitti` (eğitim UI'ı D5'te
// doğrulandı); A'nın Çekirdeğine maç öncesi 545 XP (`xp-ver`, 695 XP → maç XP'si Lv.3 eşiğini GERÇEK maçta geçer →
// "Parlayan" sunucuda doğal tamamlanır → Parlak Disk Market'te açılır); Parlak Disk (2000) için eksik Altın
// `altin-ver` ile; C'nin Yapay ömrü 0'a (SQLite) → Atölye kırmızı kart → Yenile.
// Akış: B Başarımlar boş durum → A/B İlk Devir (+100) → A Market (genel, raflar, kilitli/gizli/açık, günün parçası,
// Altın eksik, satın alma onayı) → A Başarımlar → hızlı maç (A arıyor, B gelir: "Rakip bulundu") → sonuç (A ZAFER +
// Altın sayma + stil + başarım: İlk Galibiyet ✓, Parlayan ✓ "Market'te açıldı: Parlak Disk"; B YENİLGİ) → Markete git →
// Parlak Disk (eksik → Altın → satın al → "Satın alındı") → Atölye'de tak + kaydet → Tekrar: ikinci hızlı maç Parlak
// Disk'le (HUD + takım kodu) → C: kuyruk 60 sn "bulunamadı" → Tekrar dene → 20 sn öneri → 30 sn bot teklifi → bot maçı
// (yarı Altın, yalnız Yol) → Yapay yenileme (Atölye kırmızı kart → Market onayı) → SQLite sorguları.
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "./pw.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */
type S = any;
const TABAN = process.env.D7_ADRES ?? "http://localhost:5173/";
const KLASOR = "docs/production/raporlar/ekran";
mkdirSync(KLASOR, { recursive: true });
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));
const kayit: Record<string, unknown> = { not: "Otomatik oynanış (A: paylaşılan bot ?oto=dolas; B: ?oto=kenar; C: ?oto=dolas vs sunucu botu). İnsan play pass değil." };
const cekilen: string[] = [];
const ek = Date.now().toString(36).slice(-4);
const AD = { A: `Ayla ${ek}`, B: `Berk ${ek}`, C: `Cem ${ek}` };
const SIFRE = "topac-sifre-1";
const T0 = Date.now();
const log = (...a: unknown[]) => console.log(`[${Math.round((Date.now() - T0) / 1000)}s]`, ...a);

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
async function goruntu(s: S, ad: string): Promise<void> {
  const yol = `${KLASOR}/D7-${ad}.png`;
  try { await s.screenshot({ path: yol, timeout: 60000 }); }
  catch (e) { log("  ekran ALINAMADI:", yol, String(e).slice(0, 100)); kayit[`alinamadi-${ad}`] = String(e).slice(0, 160); return; }
  cekilen.push(yol);
  log("  ekran:", yol);
}
const git = async (s: S, yol: string, ms = 900) => { await s.goto(`${TABAN}${yol}`); await bekle(ms); };
const api = (s: S, yontem: string, yol: string, govde: unknown = {}) => ev<{ durum: number; veri: any }>(s, `(async () => {
  const r = await fetch(${JSON.stringify(yol)}, { method: ${JSON.stringify(yontem)}, headers: { "content-type": "application/json" }, body: ${yontem === "GET" ? "undefined" : `JSON.stringify(${JSON.stringify(govde)})`} });
  return { durum: r.status, veri: await r.json() };
})()`);
async function hesapAc(s: S, ad: string, set: string, arma: string): Promise<void> {
  await git(s, "?ekran=ayarlar");
  const r: number[] = [];
  r.push((await api(s, "POST", "/api/kayit", { ad, sifre: SIFRE, sifreTekrar: SIFRE })).durum);
  r.push((await api(s, "POST", "/api/profil", { arma, renk: "#2fb8e8" })).durum);
  r.push((await api(s, "POST", "/api/ilk-cekirdek", { set })).durum);
  kayit[`hesap-${set}`] = r;
}
const temizle = (h: string[]) => h.filter((x) => !/Failed to load resource: the server responded with a status of (40[0-9])/.test(x));

/** Lobi: hızlı maç ara (mod düğmesi + Rakip ara). */
async function hizliAra(s: S, oto: string | null): Promise<void> {
  await git(s, `?ekran=lobi${oto ? `&oto=${oto}` : ""}`, 1200);
  await bekleKosul(s, `!!window.__lobi`, 20000);
  await s.click("[data-mod=hizli]");
  await s.click("[data-eylem=hizli]");
}
async function secimdeHazir(s: S): Promise<void> {
  await bekleKosul(s, `!!document.querySelector("[data-eylem=hazir]")`, 60000);
  await s.click("[data-eylem=hazir]");
}
const sonucAdi = async (s: S): Promise<string> => ((await ev<string>(s, `document.querySelector(".ms .kutu h2").textContent`)).includes("ZAFER") ? "zafer" : "yenilgi");
async function sonucBekle(s: S, ms = 400000): Promise<void> {
  await bekleKosul(s, `!!(window.__lobi && window.__lobi.macEkrani && window.__lobi.macEkrani.sonucAcik)`, ms);
  await bekleKosul(s, `!!document.querySelector("[data-altin][data-toplam]")`, 20000);
}
const sonucOku = (s: S) => ev<any>(s, `(() => {
  const k = document.querySelector(".ms .kutu");
  return {
    baslik: k.querySelector("h2").textContent, alt: k.querySelector(".alt").textContent, skor: k.querySelector(".skr").textContent,
    bitisler: [...k.querySelectorAll("tr[data-bitis]")].map((x) => x.textContent),
    altin: { toplam: Number(k.querySelector("[data-altin]").dataset.toplam), sayac: k.querySelector("[data-altin] .say").textContent, kalemler: [...k.querySelectorAll("[data-altin] li")].map((x) => x.textContent) },
    cekirdek: [...k.querySelectorAll("[data-odul] .ck")].map((x) => x.textContent),
    basarim: [...k.querySelectorAll("[data-basarim-id]")].map((x) => ({ id: x.dataset.basarimId, ilerleme: x.dataset.ilerleme, tamam: x.dataset.tamam === "1", metin: x.textContent })),
    basarimNot: k.querySelector("[data-basarim] .yt")?.textContent ?? null,
    marketeGit: [...k.querySelectorAll("[data-markete-git]")].map((x) => x.dataset.marketeGit),
    dugmeler: [...k.querySelectorAll(".dg button")].map((x) => x.textContent),
  };
})()`);

const A = await istemci("A");
const B = await istemci("B");
let C: Istemci | null = null;
try {
  const a = A.sayfa, b = B.sayfa;
  // ---- 1. hesaplar ----
  await hesapAc(a, AD.A, "goktasi", "kor");
  await hesapAc(b, AD.B, "maden", "kaya");
  // B: başarımlar boş durumu (henüz hiçbir ilerleme yok)
  await git(b, "?ekran=basarimlar", 1500);
  kayit["bosDurum"] = await ev(b, `document.querySelector(".bs .bos")?.textContent ?? null`);
  await goruntu(b, "basarimlar-bos");
  // İlk Devir (+100 Altın)
  kayit["ilkDevirA"] = (await api(a, "POST", "/api/egitim-bitti")).veri;
  kayit["ilkDevirB"] = (await api(b, "POST", "/api/egitim-bitti")).veri;
  // A Çekirdeği 150 → 695 XP (gerçek maç XP'si Lv.3 eşiğini geçirecek; Parlayan maç sonunda sunucuda)
  const atA = (await api(a, "GET", "/api/atolye")).veri;
  kayit["xpHazirlik"] = (await api(a, "POST", "/api/gelistirme/xp-ver", { cekirdekId: atA.cekirdekler[0].id, xp: 545 })).veri;

  // ---- 2. Market (A, bakiye 100) ----
  await git(a, "?ekran=market", 1800);
  await bekleKosul(a, `!!window.__market`, 20000);
  const mv = await ev<any>(a, `window.__market.veri`);
  kayit["marketIlk"] = {
    bakiye: mv.bakiye, gununParcasi: mv.gununParcasi,
    raflar: mv.raflar.map((r: any) => ({ raf: r.ad, tezgah: r.tezgah, urunler: r.urunler.map((u: any) => `${u.ad}:${u.durum}:${u.etiket}`) })),
  };
  await goruntu(a, "market-genel");
  // odakta ad + fiyat + kilit metni (klavye): Çekirdek rafında ok tuşlarıyla kilitli karta
  await a.focus("[data-urun=simsek-goktasi]");
  await bekle(300);
  kayit["odakMetni"] = await ev(a, `[document.activeElement.getAttribute("aria-label"), document.querySelector(".mk .ipucu").textContent]`);
  await goruntu(a, "market-kilitli-odak");
  await a.focus("[data-urun^=gizli]");
  await bekle(300);
  kayit["gizliOdak"] = await ev(a, `document.activeElement.getAttribute("aria-label")`);
  await a.keyboard.press("ArrowRight");
  await bekle(200);
  kayit["okTusu"] = await ev(a, `document.activeElement.dataset.urun`);
  await a.evaluate(`document.querySelector(".rf").scrollTo(0, 400)`);
  await bekle(300);
  await goruntu(a, "market-raflar-alt");
  await a.evaluate(`document.querySelector(".rf").scrollTo(0, 0)`);
  // Altın eksik (Top Uç 500 > 100)
  await a.click("[data-urun=top-uc]");
  await bekle(500);
  kayit["eksik"] = await ev(a, `document.querySelector(".mk .modal [data-eksik]")?.textContent ?? null`);
  await goruntu(a, "market-altin-eksik");
  await a.keyboard.press("Escape");
  await bekle(300);
  // satın alma onayı (Başlangıç rafı 100 Altın: seçilmeyen setin parçası) → İptal (bakiye korunur)
  const baslangic = mv.raflar[3].urunler.find((u: any) => u.durum === "acik" && u.satisFiyati <= 100).id;
  await a.click(`[data-urun=${baslangic}]`);
  await bekle(500);
  kayit["onay"] = await ev(a, `({ baslik: document.querySelector(".mk .modal h3").textContent, dugmeler: [...document.querySelectorAll(".mk .modal button")].map((x) => x.textContent), cubuk: [...document.querySelectorAll("[data-cubuk-farki] .f")].map((x) => x.textContent) })`);
  await goruntu(a, "market-satin-onay");
  await a.click(".mk .modal button:not(.bir)");
  await bekle(300);
  // günün parçası bandı
  await a.click(".mk .gunun");
  await bekle(500);
  await goruntu(a, "market-gunun-parcasi");
  await a.keyboard.press("Escape");
  // Başarımlar (A): sekmeler, ilerleme, tamamlanan (İlk Devir), gizli
  await git(a, "?ekran=basarimlar", 1500);
  await goruntu(a, "basarimlar-yol");
  await a.click("[data-sekme=gizli]");
  await bekle(400);
  kayit["gizliSekme"] = await ev(a, `[...document.querySelectorAll(".bs .kart")].map((x) => x.querySelector("h4").textContent + ":" + x.dataset.durum)`);
  await goruntu(a, "basarimlar-gizli");

  // ---- 3. hızlı maç: A arar, B gelir ----
  log("hızlı maç 1");
  await git(a, "?ekran=lobi", 1200);
  kayit["dereceliGizli"] = await ev(a, `!document.querySelector("[data-mod=dereceli]")`);
  await goruntu(a, "lobi-hizli");
  await hizliAra(a, "dolas");
  await bekle(6000);
  kayit["arama"] = await ev(a, `document.querySelector("[data-arama]").textContent`);
  await goruntu(a, "hizli-araniyor");
  await hizliAra(b, "kenar");
  await bekleKosul(a, `!!document.querySelector("[data-duyuru]") && document.querySelector("[data-duyuru]").textContent.startsWith("Rakip bulundu")`, 30000);
  kayit["bulundu"] = await ev(a, `document.querySelector("[data-duyuru]").textContent`);
  await goruntu(a, "hizli-bulundu");
  await secimdeHazir(a);
  await secimdeHazir(b);
  await bekleKosul(a, `window.__lobi.asama === "mac"`, 60000);
  await bekle(12000);
  await goruntu(a, "mac1-hud");
  await sonucBekle(a);
  await sonucBekle(b);
  await bekle(1200);
  const adA = await sonucAdi(a), adB = await sonucAdi(b);
  await goruntu(a, `sonuc-${adA}-sayma`);
  await bekle(5500);
  kayit["sonucA1"] = await sonucOku(a);
  await goruntu(a, `sonuc-${adA}`);
  await b.keyboard.press("Space");
  await bekle(800);
  kayit["sonucB1"] = await sonucOku(b);
  await goruntu(b, `sonuc-${adB}${adA === adB ? "-B" : ""}`);

  // ---- 4. Markete git → Parlak Disk ----
  if (!(kayit["sonucA1"] as any).marketeGit.includes("parlak-disk")) throw new Error("Parlayan / Parlak Disk açılmadı");
  await a.click("[data-markete-git=parlak-disk]");
  await bekleKosul(a, `!!window.__market && !!document.querySelector(".mk .modal")`, 20000);
  await bekle(800);
  kayit["parlakEksik"] = await ev(a, `({ eksik: document.querySelector(".mk .modal [data-eksik]")?.textContent ?? null, bakiye: window.__market.veri.bakiye })`);
  await goruntu(a, "market-acildi-eksik");
  await a.keyboard.press("Escape");
  await bekle(300);
  kayit["acildiKarti"] = await ev(a, `document.querySelector("[data-urun=parlak-disk]").getAttribute("aria-label")`);
  await a.evaluate(`document.querySelector(".rf").scrollTo(0, 400)`);
  await goruntu(a, "market-acildi");
  const bakiye = (kayit["parlakEksik"] as any).bakiye as number;
  kayit["altinVer"] = (await api(a, "POST", "/api/gelistirme/altin-ver", { miktar: Math.max(0, 2000 - bakiye) + 50 })).veri;
  await git(a, "?ekran=market&parca=parlak-disk", 1500);
  await goruntu(a, "market-parlak-onay");
  await a.click(".mk .modal button.bir");
  await bekleKosul(a, `!!document.querySelector("[data-satin-alindi]")`, 20000);
  kayit["satinAlma"] = await ev(a, `({ son: window.__market.sonIslem, bakiye: window.__market.veri.bakiye, kart: document.querySelector("[data-urun=parlak-disk]").dataset.durum })`);
  await goruntu(a, "market-satin-alindi");
  // Atölye'de tak
  await a.click(".mk .modal button.bir");
  await bekleKosul(a, `!!window.__atolye && !!document.querySelector("[data-parca=parlak-disk]")`, 20000);
  await bekle(800);
  const once = await ev<any>(a, `Object.fromEntries([...document.querySelectorAll("[data-cubuk]")].map((r) => [r.dataset.cubuk, Number(r.querySelector(".say").textContent)]))`);
  await a.click("[data-parca=parlak-disk]");
  await bekle(600);
  const sonra = await ev<any>(a, `Object.fromEntries([...document.querySelectorAll("[data-cubuk]")].map((r) => [r.dataset.cubuk, Number(r.querySelector(".say").textContent) + " (" + r.querySelector(".fark").textContent.trim() + ")"]))`);
  kayit["atolyeCubuk"] = { once, sonra };
  await goruntu(a, "atolye-yeni-parca");
  await a.click("[data-eylem=kaydet]");
  await bekle(1200);
  kayit["kaydet"] = await ev(a, `document.querySelector(".toast, [role=status]")?.textContent ?? null`);

  // ---- 5. ikinci hızlı maç: Parlak Disk'le ----
  log("hızlı maç 2 (Parlak Disk)");
  await git(a, "?ekran=lobi", 1200);
  kayit["dereceliAcik"] = await ev(a, `!!document.querySelector("[data-mod=dereceli]")`);
  if (kayit["dereceliAcik"]) { await a.click("[data-mod=dereceli]"); await bekle(300); kayit["dereceliMetin"] = await ev(a, `document.querySelector(".icerik .hata").textContent`); }
  await goruntu(a, "lobi-dereceli-acik");
  await hizliAra(a, "dolas");
  await bekle(2500);
  await hizliAra(b, "kenar");
  await secimdeHazir(a);
  await secimdeHazir(b);
  await bekleKosul(a, `window.__lobi.asama === "mac"`, 60000);
  kayit["mac2TakimKodu"] = await ev(a, `window.__lobi.agMaci.oyuncu(window.__lobi.agMaci.yerel).takimId`);
  await bekle(14000);
  await goruntu(a, "mac2-hud-parlak-disk");
  await sonucBekle(a);
  await a.keyboard.press("Enter");
  await bekle(800);
  kayit["sonucA2"] = await sonucOku(a);
  await goruntu(a, "sonuc-mac2");

  // ---- 6. C: kuyruk 60 sn → bulunamadı → Tekrar dene → 20 sn öneri → 30 sn bot teklifi → bot maçı ----
  log("C: boş kuyruk");
  C = await istemci("C");
  const c = C.sayfa;
  await hesapAc(c, AD.C, "yapay", "kasirga");
  kayit["ilkDevirC"] = (await api(c, "POST", "/api/egitim-bitti")).veri;
  await hizliAra(c, "dolas");
  await bekleKosul(c, `!!document.querySelector("[data-bulunamadi]")`, 90000);
  kayit["bulunamadi"] = await ev(c, `document.querySelector("[data-bulunamadi]").textContent`);
  await goruntu(c, "hizli-bulunamadi");
  await c.click("[data-bulunamadi] [data-eylem=hizli]");
  await bekleKosul(c, `document.querySelector("[data-oneri]")?.dataset.asama === "antrenmanOner"`, 40000);
  await goruntu(c, "hizli-antrenman-oneri");
  await bekleKosul(c, `document.querySelector("[data-oneri]")?.dataset.asama === "botTeklif"`, 20000);
  kayit["botTeklif"] = await ev(c, `document.querySelector("[data-oneri]").textContent`);
  await goruntu(c, "hizli-bot-teklif");
  await c.click("[data-eylem=bot]");
  await bekleKosul(c, `!!document.querySelector("[data-eylem=hazir]")`, 20000);
  kayit["botRakip"] = await ev(c, `document.querySelector("[data-rakip]").textContent`);
  await secimdeHazir(c);
  await sonucBekle(c);
  await c.keyboard.press("Space");
  await bekle(800);
  kayit["sonucBot"] = await sonucOku(c);
  await goruntu(c, "sonuc-bot");

  // ---- 7. Yapay yenileme: ömür 0 (SQLite) → Atölye kırmızı kart → Market onayı ----
  const require = createRequire(import.meta.url);
  const Database = require("better-sqlite3");
  const db = new Database(".veri/devran.sqlite");
  db.pragma("busy_timeout = 3000");
  const cId = (db.prepare("SELECT id FROM oyuncu WHERE ad = ?").get(AD.C) as { id: number }).id;
  db.prepare("UPDATE cekirdek SET omur = 0 WHERE oyuncu_id = ? AND omur IS NOT NULL").run(cId);
  await git(c, "?ekran=atolye", 1800);
  await bekleKosul(c, `!!document.querySelector("[data-yenile]")`, 20000);
  kayit["kirmiziKart"] = await ev(c, `[document.querySelector("[data-omur-bitti]")?.textContent, document.querySelector("[data-yenile]").textContent]`);
  await goruntu(c, "atolye-yapay-kirmizi");
  await c.click("[data-yenile]");
  await bekleKosul(c, `!!window.__market && !!document.querySelector(".mk .modal")`, 20000);
  await bekle(600);
  await goruntu(c, "yapay-yenileme-onay");
  await c.click(".mk .modal button.bir");
  await bekleKosul(c, `!!document.querySelector("[data-yenilendi]")`, 20000);
  kayit["yenileme"] = await ev(c, `({ son: window.__market.sonIslem, satir: document.querySelector("[data-yenileme]")?.textContent ?? null })`);
  await goruntu(c, "yapay-yenilendi");
  await c.keyboard.press("Escape");
  await c.evaluate(`document.querySelector(".rf").scrollTo(0, 2000)`);
  await bekle(300);
  await goruntu(c, "market-dokumhane");

  // ---- 8. SQLite ----
  const id = (ad: string) => (db.prepare("SELECT id FROM oyuncu WHERE ad = ?").get(ad) as { id: number }).id;
  const ia = id(AD.A), ib = id(AD.B);
  kayit["sql"] = {
    user_version: db.pragma("user_version", { simple: true }),
    altin_defteri_A: db.prepare("SELECT id, miktar, neden, ref, zaman FROM altin_defteri WHERE oyuncu_id = ? ORDER BY id").all(ia),
    bakiye: { A: db.prepare("SELECT SUM(miktar) t FROM altin_defteri WHERE oyuncu_id = ?").get(ia), B: db.prepare("SELECT SUM(miktar) t FROM altin_defteri WHERE oyuncu_id = ?").get(ib), C: db.prepare("SELECT SUM(miktar) t FROM altin_defteri WHERE oyuncu_id = ?").get(cId) },
    altin_defteri_C: db.prepare("SELECT miktar, neden, ref FROM altin_defteri WHERE oyuncu_id = ? ORDER BY id").all(cId),
    basarim_A: db.prepare("SELECT basarim_id, ilerleme, tamam, tamam_tarihi FROM basarim WHERE oyuncu_id = ? ORDER BY basarim_id").all(ia),
    basarim_C: db.prepare("SELECT basarim_id, ilerleme, tamam FROM basarim WHERE oyuncu_id = ? ORDER BY basarim_id").all(cId),
    basarim_kume_A: db.prepare("SELECT basarim_id, anahtar FROM basarim_kume WHERE oyuncu_id = ?").all(ia),
    parca_A: db.prepare("SELECT id, tanim_id, edinme FROM parca WHERE oyuncu_id = ? ORDER BY id").all(ia),
    cekirdek_A: db.prepare("SELECT id, tanim_id, seviye, tecrube, mac_sayisi, galibiyet FROM cekirdek WHERE oyuncu_id = ?").all(ia),
    cekirdek_C: db.prepare("SELECT id, tanim_id, omur, mac_sayisi FROM cekirdek WHERE oyuncu_id = ?").all(cId),
    mac: db.prepare("SELECT id, mod, a, b, kazanan, puan, sure, bitis_nedeni, gun, bot, bitis_turleri, yetenek_a, yetenek_b, altin_a, altin_b, katalog_ozeti, takim_a FROM mac WHERE a IN (?, ?) ORDER BY baslangic").all(ia, cId),
  };
  db.close();
} catch (e) {
  log("HATA", e);
  kayit["hata"] = String((e as Error).stack ?? e);
  for (const [n, i] of [["A", A], ["B", B], ["C", C]] as const) if (i) await goruntu(i.sayfa, `hata-${n}`);
} finally {
  kayit["konsol"] = { A: temizle(A.hatalar), B: temizle(B.hatalar), C: C ? temizle(C.hatalar) : [], hamA: A.hatalar.length, hamB: B.hatalar.length };
  kayit["ekranlar"] = cekilen;
  kayit["sureSn"] = Math.round((Date.now() - T0) / 1000);
  writeFileSync(`${KLASOR}/D7-akis.json`, JSON.stringify(kayit, null, 2));
  log("bitti", kayit["hata"] ? "HATA" : "tamam", `${cekilen.length} ekran`);
  await A.tarayici.close();
  await B.tarayici.close();
  await C?.tarayici.close();
}
