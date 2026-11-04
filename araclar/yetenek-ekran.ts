// D3 uçtan uca doğrulama: dev server'daki ?ekran=mac sayfası headless Chromium'da (DPR 2). Önce: npm run dev.
// Çalıştır: npm run yetenek:ekran   → docs/production/raporlar/ekran/D3-*.png + D3-ozet.json
//
// OTOMATİK OYNANIŞ, iki bölüm:
//  A) Elle (klavye + fare, Playwright): Takım 1 (Kor) bota (Takım 2) karşı; Yetenek (1, basılı tut = H9 nişan, bırak),
//     Özel Yetenek (sağ tık), Ulti (3) kullanılır. ZORLAMA: Enerji debug kancasıyla doldurulur (enerjiDoldur) ve rakip
//     telegrafı / rakip Ulti için rakip bota yuva zorlanır (rakipYetenek); ikisi de yalnız ?debug.
//  B) Tam maç: yerel topacı paylaşılan 'kenar' botu sürer (?oto=kenar, botlar yetenekleri kendi kararıyla kullanır),
//     sonuç ekranına kadar; zorlama yok.
// Ses: headless'ta ses çıkmaz; Ses.cal çağrı sayaçları ve public/ses/*.wav yanıtları (200) doğrulanır.
import { mkdirSync, writeFileSync } from "node:fs";

import { chromium } from "./pw.ts";
import type { Page } from "./pw.ts";

const TABAN = process.env.MAC_ADRES ?? "http://localhost:5173/";
const KLASOR = "docs/production/raporlar/ekran";
mkdirSync(KLASOR, { recursive: true });
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* eslint-disable @typescript-eslint/no-explicit-any */
type W = { __mac: any };
const m = <R>(s: Page, f: (mac: any) => R): Promise<R> => s.evaluate((kod) => (new Function("mac", `return (${kod})(mac)`))((window as unknown as W).__mac), f.toString()) as Promise<R>;

const tarayici = await chromium.launch();
const baglam = await tarayici.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
const s = await baglam.newPage();
const hatalar: string[] = [];
const sesYanit: Record<string, number> = {};
s.on("console", (x) => { if (x.type() === "error") hatalar.push(x.text()); });
s.on("pageerror", (e) => hatalar.push(`pageerror: ${e.message}`));
s.on("requestfailed", (r) => hatalar.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
s.on("response", (r) => { const u = r.url(); if (/\/ses\/[^/]+\.wav$/.test(u)) sesYanit[u.split("/").pop()!] = r.status(); });

const kayit: Record<string, unknown> = { tarayici: tarayici.version(), not: "Otomatik oynanış (Playwright). A: elle girdi + ZORLAMA (Enerji debug kancası, rakip bota yuva zorlama). B: oto=kenar tam maç, zorlama yok." };
const cekilen: string[] = [];
const goruntu = async (ad: string) => { const yol = `${KLASOR}/D3-${ad}.png`; await s.screenshot({ path: yol }); cekilen.push(yol); console.log("  ekran:", yol); };
const durum = () => m(s, (mac) => { const d = mac.durum; return { faz: d.mac.faz as string, tick: d.tick as number, e0: d.topaclar[0].enerji as number, e1: d.topaclar[1].enerji as number, y0: d.topaclar[0].yetenekFaz as number, y1: d.topaclar[1].yetenekFaz as number, durdu: mac.durdu as boolean, sonuc: mac.sonucAcik as boolean, ulti: [...d.ultiKullanildi] }; });
/** Sim noktası → sayfa (CSS) koordinatı. */
const ekranda = (x: number, z: number) => s.evaluate((a) => {
  const r = document.querySelector("canvas")!.getBoundingClientRect();
  const ol = Math.min(r.width / 960, r.height / 540);
  return { x: r.left + (r.width - 960 * ol) / 2 + (480 + a.x) * ol, y: r.top + (r.height - 540 * ol) / 2 + (270 + a.z) * ol };
}, { x, z });
const rakipEkranda = async () => { const p = await m(s, (mac) => ({ x: mac.durum.topaclar[1].x, z: mac.durum.topaclar[1].z })); return ekranda(p.x, p.z); };
const olaydaDur = (turler: string[], kare: number, i = -1) => s.evaluate((a) => (window as unknown as W).__mac.olaydaDur(a.turler, a.kare, a.i), { turler, kare, i });
const devam = () => m(s, (mac) => mac.devam());
const durmayiBekle = async (ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if ((await durum()).durdu) return true; await bekle(20); } return false; };
const turaKadar = async () => { for (let k = 0; k < 400; k++) { const d = await durum(); if (d.faz === "tur") return; await bekle(25); } };

// ================================================================ A) elle
const ADRES = `${TABAN}?ekran=mac&debug&tohum=21&takim=0&rakip=1&bot=kukla`;
kayit.adresA = ADRES;
await s.goto(ADRES);
await s.waitForFunction(() => !!(window as unknown as { __mac?: unknown }).__mac, null, { timeout: 15000 });
await s.mouse.move(640, 300);
await s.mouse.down(); await s.mouse.up(); // ilk kullanıcı tıklaması: ses bağlamı açılır (tuval dışı değil; geri sayımda yetenek reddedilir)
await turaKadar();
await bekle(400);
await goruntu("01-mac-basladi");

// --- Yetenek (1): basılı tut = H9 nişan çizgisi, bırak = at
await m(s, (mac) => mac.enerjiDoldur(0, 300));
let r = await rakipEkranda();
await s.mouse.move(r.x, r.y);
await s.keyboard.down("Digit1");
await bekle(250);
r = await rakipEkranda();
await s.mouse.move(r.x, r.y);
await bekle(120);
await goruntu("02-nisan-cizgisi-H9");
const basili = await m(s, (mac) => mac.girdiDurumu);
await olaydaDur(["yetenekBasladi"], 9, 0); // olaydan sonra kare başına tek adım: telegrafın yarısı
await s.keyboard.up("Digit1");
await durmayiBekle();
await goruntu("03-kendi-telegraf");
await devam();
await bekle(900);

// --- iptal: basılıyken Esc (menü açılmaz), alt şeritte bırakma
await s.keyboard.down("Digit2");
await bekle(150);
await s.keyboard.press("Escape");
await s.keyboard.up("Digit2");
const escIptal = await m(s, (mac) => ({ ...mac.girdiDurumu, menu: mac.menuAcik }));
const alt = await ekranda(0, 240); // mantıksal y = 510 > 492
await s.mouse.move(alt.x, alt.y);
await s.mouse.down({ button: "right" });
await bekle(120);
await s.mouse.up({ button: "right" });
const altIptal = await m(s, (mac) => mac.girdiDurumu);
kayit.iptal = { basiliIken: basili, escSonrasi: escIptal, altSeritSonrasi: altIptal };

// --- Özel Yetenek (sağ tık): alan (Közyağmuru) → zemin dekalı
await m(s, (mac) => mac.enerjiDoldur(0, 300));
await bekle(200);
r = await rakipEkranda();
await s.mouse.move(r.x, r.y);
await olaydaDur(["yetenekEtki"], 24, 0);
await s.mouse.down({ button: "right" });
await bekle(160);
await s.mouse.up({ button: "right" });
await durmayiBekle();
await goruntu("04-alan-dekali");
await devam();
await bekle(2600);

// --- rakip telegrafı (H13): ZORLAMA rakip bota yuva 2 (Özel)
await m(s, (mac) => mac.enerjiDoldur(1, 300));
await olaydaDur(["yetenekBasladi"], 14, 1);
await m(s, (mac) => mac.rakipYetenek(1));
await durmayiBekle();
await goruntu("05-rakip-telegraf-H13");
await devam();
await bekle(2500);

// --- Enerji doldu parıltısı
await m(s, (mac) => mac.enerjiDoldur(0, 99.6));
await olaydaDur(["enerjiDoldu"], 1, 0);
await durmayiBekle();
await goruntu("06-enerji-doldu");
await devam();
await bekle(300);

// --- Ulti (3): telegraf (ruh silüeti + kenar parlaması + olay bandı), sonra vuruş
await m(s, (mac) => mac.enerjiDoldur(0, 300));
await turaKadar();
await bekle(200);
r = await rakipEkranda();
await s.mouse.move(r.x, r.y);
await olaydaDur(["yetenekBasladi"], 2, 0);
await s.keyboard.down("Digit3");
await bekle(80);
await s.keyboard.up("Digit3");
const ultiDurdu = await durmayiBekle();
await goruntu("07-ulti-ani-kenar-parlamasi");
// silüet 0,3 s'de tam belirir (gerçek saat): ticker durukken bekle, sonra birkaç kare
await m(s, (mac) => mac.devam());
await bekle(350);
await goruntu("07b-ulti-ruh-siluet");
await olaydaDur(["yetenekEtki"], 2, 0);
await durmayiBekle();
await goruntu("08-ulti-vurusu");
await devam();
await bekle(1500);
await goruntu("09-ulti-alan");
const ultiDurum = await durum();

// --- rakip Ulti: "Rakip: Ulti hazırlıyor" (ZORLAMA rakip bota yuva 3; ulti bitmiş olmalı)
// benim Ultim bitmeli (rakip Ulti'si sürerken Ulti reddedilir; flint #14)
for (let k = 0; k < 600; k++) { const x = await m(s, (mac) => mac.durum.topaclar[0].yetenekFaz === 0 && mac.durum.alanlar[0] === null && mac.durum.mac.faz === "tur"); if (x) break; await bekle(25); }
await turaKadar();
await m(s, (mac) => mac.enerjiDoldur(1, 300));
await olaydaDur(["yetenekBasladi"], 3, 1);
await m(s, (mac) => mac.rakipYetenek(2));
const rakipUlti = await durmayiBekle(10000);
await goruntu("10-rakip-ulti-bandi");
await m(s, (mac) => mac.devam());
await bekle(300);
await goruntu("10b-rakip-ulti-telegraf");
await devam();
await bekle(500);

// --- Ayarlar (Esc › Ayarlar)
await s.keyboard.press("Escape");
await bekle(200);
await s.evaluate(() => { [...document.querySelectorAll<HTMLButtonElement>(".ms .menu button")].find((x) => x.textContent === "Ayarlar")?.click(); });
await bekle(250);
// sarsıntıyı bir kez değiştir (Normal → %50), localStorage'a yazılır
await s.evaluate(() => { document.querySelector<HTMLButtonElement>('.ms .menu button[data-ayar="sarsinti"]')?.click(); });
await bekle(150);
await goruntu("11-ayarlar");
const ayarSonra = await m(s, (mac) => mac.ayar);
const saklanan = await s.evaluate(() => localStorage.getItem("devran.ayarlar.v1"));
await s.evaluate(() => { document.querySelector<HTMLButtonElement>('.ms .menu button[data-ayar="sarsinti"]')?.click(); document.querySelector<HTMLButtonElement>('.ms .menu button[data-ayar="sarsinti"]')?.click(); });
await s.keyboard.press("Escape");
await bekle(150);
// M: ses kapat / aç
await s.keyboard.press("KeyM");
const sesKapali = await m(s, (mac) => mac.ses.acik);
await s.keyboard.press("KeyM");
kayit.ayarlar = { sonra: ayarSonra, saklanan, mTusu: { kapaliyken: sesKapali } };
kayit.bolumA = { ulti: ultiDurum.ulti, ultiTelegrafDurdu: ultiDurdu, rakipUltiDurdu: rakipUlti, kullanim: await m(s, (mac) => mac.yetenekKullanimi), gorsel: await m(s, (mac) => mac.gorselSayac), sayac: await m(s, (mac) => mac.sayac) };

// ================================================================ B) tam maç (oto=kenar, zorlama yok)
const ADRES_B = `${TABAN}?ekran=mac&debug&hiz=2&oto=kenar&tohum=8&takim=0&rakip=2`;
kayit.adresB = ADRES_B;
await s.goto(ADRES_B);
await s.waitForFunction(() => !!(window as unknown as { __mac?: unknown }).__mac, null, { timeout: 15000 });
await s.mouse.move(640, 300);
await s.mouse.down(); await s.mouse.up();
const t0 = Date.now();
let ortaCekildi = false;
let o = await durum();
while (Date.now() - t0 < 6 * 60_000) {
  await bekle(60);
  o = await durum();
  if (o.faz === "turArasi") { await s.keyboard.press("Digit2"); await s.keyboard.press("Digit3"); await s.keyboard.press("Digit1"); }
  if (!ortaCekildi && (o.y0 > 0 || o.y1 > 0)) { ortaCekildi = true; await goruntu("12-oto-mac-yetenek"); }
  if (o.sonuc) break;
}
await bekle(400);
await s.keyboard.press("Space");
await bekle(300);
await goruntu("13-sonuc");
const B = await m(s, (mac) => ({ sonuc: mac.macSonuclari, kullanim: mac.yetenekKullanimi, sayi: mac.durum.yetenekSayisi, kararma: mac.durum.kararma, saat: mac.durum.mac.saat / 60, gorulen: mac.gorulenBitisler, ses: mac.ses }));
kayit.bolumB = B;
kayit.sesYanitlari = sesYanit;
kayit.ses = B.ses;
kayit.hatalar = hatalar;
kayit.ekranlar = cekilen;
writeFileSync(`${KLASOR}/D3-ozet.json`, JSON.stringify(kayit, null, 1));
console.log(JSON.stringify({ A: kayit.bolumA, iptal: kayit.iptal, ayar: kayit.ayarlar, B: { ...B, ses: undefined }, sesYanit, sesSayac: B.ses.sayac, sesCalinan: B.ses.calinan, yuklenen: B.ses.yuklenen.length }, null, 1));
console.log(`ses dosyası yanıtı: ${Object.keys(sesYanit).length} (hepsi 200: ${Object.values(sesYanit).every((x) => x === 200)}) · konsol hatası: ${hatalar.length}`);
if (hatalar.length) console.log(hatalar);
await tarayici.close();
process.exit(hatalar.length === 0 ? 0 : 1);
