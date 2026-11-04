// Maç uçtan uca doğrulama (D2 "bitti" ölçütü): dev server'daki ?ekran=mac sayfasını headless Chromium'da açar.
// OTOMATİK OYNANIŞ: yerel topacı paylaşılan bot sürer (?oto=kenar); tur arası seçimini (H14) bu betik klavyeyle
// (1/2/3) yapar, Esc menüsü ve Teslim'i klavyeyle sınar. Geri sayım, puanlar, H14, süre akışı, üç bitiş türü,
// ani ölüm ve sonuç ekranı docs/production/raporlar/ekran/D2-*.png (deviceScaleFactor 2) olarak kaydedilir.
// Önce: npm run dev. Çalıştır: npm run mac:ekran
import { mkdirSync, writeFileSync } from "node:fs";

import { chromium } from "./pw.ts";
import type { Page } from "./pw.ts";

const TABAN = process.env.MAC_ADRES ?? "http://localhost:5173/";
const KLASOR = "docs/production/raporlar/ekran";
mkdirSync(KLASOR, { recursive: true });
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Ozet {
  faz: string; saat: number; tick: number; puan: number[]; kalanTick: number; aniOlum: number; aniOlumTick: number;
  secim: number; aktif: number; siradaki: number; sonuc: { kazanan: number; neden: string; puan: number[] } | null;
  sonucAcik: boolean; menuAcik: boolean; durdu: boolean; gorulen: Record<string, number>; durmaOlayi: { tur: string } | null;
  stamina0: number; geriCekKalan: number; tabRozeti: boolean; macSayisi: number;
}

type MacPencere = { __mac: {
  durum: { tick: number; mac: { faz: string; saat: number; puan: number[]; kalanTick: number; aniOlum: number; aniOlumTick: number; macSonucu: Ozet["sonuc"] }; takimlar: { aktif: number; secim: number; uyeler: { elendi: number }[] }[]; topaclar: { stamina: number; geriCekKalan: number }[]; profiller: { maxStamina: number }[] };
  sonucAcik: boolean; menuAcik: boolean; durdu: boolean; gorulenBitisler: Record<string, number>; durmaOlayi: { tur: string } | null; macSonuclari: unknown[];
  olaydaDur(t: string[], k: number): void; devam(): void;
} };

const ozet = (s: Page): Promise<Ozet> => s.evaluate(() => {
  const m = (window as unknown as MacPencere).__mac;
  const d = m.durum;
  const tk = d.takimlar[0]!;
  let siradaki = -1;
  for (let k = 1; k <= 2; k++) { const j = (tk.aktif + k) % 3; if (!tk.uyeler[j]!.elendi) { siradaki = j; break; } }
  return {
    faz: d.mac.faz, saat: d.mac.saat, tick: d.tick, puan: [...d.mac.puan], kalanTick: d.mac.kalanTick, aniOlum: d.mac.aniOlum, aniOlumTick: d.mac.aniOlumTick,
    secim: tk.secim, aktif: tk.aktif, siradaki, sonuc: d.mac.macSonucu, sonucAcik: m.sonucAcik, menuAcik: m.menuAcik, durdu: m.durdu,
    gorulen: { ...m.gorulenBitisler }, durmaOlayi: m.durmaOlayi ? { tur: m.durmaOlayi.tur } : null,
    stamina0: d.topaclar[0]!.stamina / d.profiller[0]!.maxStamina, geriCekKalan: d.topaclar[0]!.geriCekKalan,
    tabRozeti: !!document.querySelector(".mh .tk.tabhazir"), macSayisi: m.macSonuclari.length,
  };
});
const olaydaDur = (s: Page, turler: string[], kare: number) => s.evaluate((a) => (window as unknown as MacPencere).__mac.olaydaDur(a.turler, a.kare), { turler, kare });
const devam = (s: Page) => s.evaluate(() => (window as unknown as MacPencere).__mac.devam());

const tarayici = await chromium.launch();
const baglam = await tarayici.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
const s = await baglam.newPage();
const hatalar: string[] = [];
const uyarilar: string[] = [];
s.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text()); else if (m.type() === "warning") uyarilar.push(m.text()); });
s.on("pageerror", (e) => hatalar.push(`pageerror: ${e.message}`));
s.on("requestfailed", (r) => hatalar.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));

const kayit: Record<string, unknown> = { tarayici: tarayici.version(), not: "Otomatik oynanış: yerel topaç paylaşılan 'kenar' botuyla sürülür; H14, Esc, Teslim, Tab klavyeyle." };
const cekilen: string[] = [];
const goruntu = async (ad: string) => { const yol = `${KLASOR}/D2-${ad}.png`; await s.screenshot({ path: yol }); cekilen.push(yol); console.log("  ekran:", yol); return yol; };

// ---------------------------------------------------------------- maç 1-2: doğal akış (tohum 44 → Tekrar → 45)
const ADRES = `${TABAN}?ekran=mac&debug&hiz=2&oto=kenar&tohum=44&takim=0&rakip=1`;
kayit.adres = ADRES;
await s.goto(ADRES);
await s.waitForFunction(() => !!(window as unknown as { __mac?: unknown }).__mac, null, { timeout: 15000 });
await bekle(150);
await goruntu("01-hazir");
let o = await ozet(s);
while (o.faz === "geriSayim" && 300 - o.kalanTick < 125) { await bekle(20); o = await ozet(s); }
await goruntu("02-geri-sayim-3");
while (o.faz === "geriSayim") { await bekle(20); o = await ozet(s); }
await bekle(60);
await goruntu("03-basla");

const bitisAd: Record<string, string> = { ringOut: "ring-out", parcalanma: "parcalanma", durma: "durma", berabere: "berabere" };
const cekilenBitis = new Set<string>();
const maclar: unknown[] = [];
let h14 = 0;
let sureCekimi = 0;
let aniCekildi = false;
let geriCekCekildi = false;
let tekrarSayisi = 0;
const zaman0 = Date.now();
await olaydaDur(s, ["ringOut", "parcalandi", "durma", "geriCek"], 3);

while (Date.now() - zaman0 < 9 * 60_000) {
  await bekle(25);
  o = await ozet(s);
  if (o.durdu) {
    const t = o.durmaOlayi?.tur ?? "";
    const ad = t === "parcalandi" ? "parcalanma" : t;
    if (ad === "geriCek" && !geriCekCekildi) { geriCekCekildi = true; await goruntu("10-geri-cek"); }
    else if (bitisAd[ad] && !cekilenBitis.has(ad)) { cekilenBitis.add(ad); await goruntu(`0${4 + cekilenBitis.size}-bitis-${bitisAd[ad]}`); }
    const kalan = ["ringOut", "parcalandi", "durma"].filter((x) => !cekilenBitis.has(x === "parcalandi" ? "parcalanma" : x));
    if (!geriCekCekildi) kalan.push("geriCek");
    await devam(s);
    // puan bandı (H5) olaydan ~0,4 s sonra
    if (bitisAd[ad] && cekilenBitis.size === 1) { await bekle(400); await goruntu("08-puan-bandi"); }
    if (kalan.length) await olaydaDur(s, kalan, 3);
    continue;
  }
  if (o.faz === "tur" && sureCekimi < 2 && o.saat > (sureCekimi === 0 ? 600 : 1500) && !o.aniOlum) { sureCekimi++; await goruntu(`04-sure-akisi-${sureCekimi}`); }
  if (o.faz === "turArasi" && o.secim === -2) {
    // H14: kaybeden olarak seç (sıradaki ile aynı üye: otomatik akışla aynı sonuç, ama klavyeden)
    if (h14 === 0) await goruntu("09-h14-secim");
    h14++;
    await s.keyboard.press(`Digit${o.siradaki + 1}`);
    await bekle(80);
    continue;
  }
  if (o.aniOlum && !aniCekildi && o.aniOlumTick > 420 && o.faz === "tur") { aniCekildi = true; await goruntu("11-ani-olum"); }
  if (o.sonucAcik) {
    await bekle(300);
    await s.keyboard.press("Space"); // animasyonu atla
    await bekle(200);
    maclar.push({ sonuc: o.sonuc, saatSn: o.saat / 60, gorulen: o.gorulen });
    await goruntu(`12-sonuc-${maclar.length}`);
    const ucBitis = ["ringOut", "parcalanma", "durma"].every((x) => (o.gorulen[x] ?? 0) > 0);
    if (ucBitis && aniCekildi) break;
    if (tekrarSayisi >= 6) break;
    tekrarSayisi++;
    await s.keyboard.press("Enter"); // Tekrar (odak Tekrar'da)
    await bekle(300);
    const kalan = ["ringOut", "parcalandi", "durma"].filter((x) => !cekilenBitis.has(x === "parcalandi" ? "parcalanma" : x));
    if (!geriCekCekildi) kalan.push("geriCek");
    if (kalan.length) await olaydaDur(s, kalan, 3);
  }
}
kayit.maclar = maclar;
kayit.gorulenBitisler = o.gorulen;
kayit.h14Secim = h14;
kayit.aniOlumGoruldu = aniCekildi;

// ---------------------------------------------------------------- Esc menüsü + Teslim (iki adım, 2 sn basılı tutma)
await s.keyboard.press("Enter"); // Tekrar
await bekle(400);
o = await ozet(s);
while (o.faz === "geriSayim") { await bekle(30); o = await ozet(s); }
await bekle(1200);
await s.keyboard.press("Escape");
await bekle(250);
o = await ozet(s);
kayit.escMenuAcik = o.menuAcik;
await goruntu("13-esc-menu");
await s.evaluate(() => { const b = [...document.querySelectorAll<HTMLButtonElement>(".ms .menu button")].find((x) => x.textContent === "Teslim ol"); b?.click(); });
await bekle(250);
await goruntu("14-teslim-onay");
await s.evaluate(() => { [...document.querySelectorAll<HTMLButtonElement>(".ms .menu button")].find((x) => x.textContent?.startsWith("Evet"))?.focus(); });
await s.keyboard.down("Enter");
await bekle(900);
await goruntu("15-teslim-basili");
await bekle(1500);
await s.keyboard.up("Enter");
for (let k = 0; k < 40; k++) { await bekle(100); o = await ozet(s); if (o.sonucAcik) break; }
await s.keyboard.press("Space");
await bekle(200);
kayit.teslim = o.sonuc;
await goruntu("16-sonuc-teslim");

// ---------------------------------------------------------------- Tab (geri çek) klavyeden: ZORLAMA ile stamina %20
const s2Adres = `${TABAN}?ekran=mac&debug&hiz=1&tohum=9&takim=0&rakip=2&bot=kukla`;
await s.goto(s2Adres);
await s.waitForFunction(() => !!(window as unknown as { __mac?: unknown }).__mac, null, { timeout: 15000 });
o = await ozet(s);
while (o.faz === "geriSayim") { await bekle(30); o = await ozet(s); }
await s.keyboard.down("KeyD");
await bekle(400);
await s.keyboard.up("KeyD");
await s.keyboard.press("Tab"); // stamina yüksek: ipucu bandı
await bekle(250);
const tabIpucu = await s.evaluate(() => document.querySelector(".mh .bant")?.textContent ?? "");
await s.evaluate(() => { const d = (window as unknown as MacPencere).__mac.durum; d.topaclar[0]!.stamina = d.profiller[0]!.maxStamina * 0.2; });
await bekle(300);
o = await ozet(s);
const tabRozeti = o.tabRozeti;
await goruntu("17-tab-hazir");
await s.keyboard.press("Tab");
await bekle(500);
const cekilirken = await ozet(s);
await goruntu("18-geri-cekiliyor");
for (let k = 0; k < 100; k++) { await bekle(100); if ((await ozet(s)).aktif !== o.aktif) break; }
await bekle(300);
const sonra = await ozet(s);
await goruntu("19-geri-cek-sonrasi");
const kaydirma = await s.evaluate(() => document.scrollingElement?.scrollTop ?? 0);
kayit.tab = { ipucu: tabIpucu, rozet: tabRozeti, cekilirken: cekilirken.geriCekKalan, aktifOnce: o.aktif, aktifSonra: sonra.aktif, sayfaKaydirma: kaydirma, zorlama: "stamina %20'ye debug kancasıyla yazıldı (yalnız bu adım)" };

kayit.hatalar = hatalar;
kayit.uyarilar = [...new Set(uyarilar)].slice(0, 10);
kayit.ekranlar = cekilen;
writeFileSync(`${KLASOR}/D2-ozet.json`, JSON.stringify(kayit, null, 1));
console.log(JSON.stringify({ gorulen: kayit.gorulenBitisler, maclar, h14, ani: aniCekildi, teslim: kayit.teslim, tab: kayit.tab, hatalar: hatalar.length }, null, 1));
console.log(`konsol hatası: ${hatalar.length}`);
await tarayici.close();
process.exit(hatalar.length === 0 ? 0 : 1);
