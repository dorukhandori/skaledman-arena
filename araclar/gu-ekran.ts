// GU-B görsel uyum doğrulaması (GU-00 Hibrit kamera + GU-02/04/05): dev server'daki ?ekran=mac sahnelerini headless
// Chromium'da çeker → docs/production/raporlar/ekran/GU-B-*.png (1280×720 CSS × DPR 1,5 = 1920×1080; 960×540 mantıksal
// çerçevenin ×2'si). ZORLAMA (yalnız ?debug, istemcideki çevrimdışı sim kopyası): Ring Out / Parçalanma / düşük stamina /
// ani ölüm için durum alanları doğrudan yazılır; Enerji ve Takım Enerjisi debug kancalarıyla dolar; rakip bota yuva zorlanır.
// Kare süresi: __mac.olcumBaslat (mantık + Pixi render CPU işi; headless SwiftShader, gerçek GPU değil).
// Önce: npm run dev (ya da vite --port 5191). Çalıştır: MAC_ADRES=http://localhost:5191/ npx tsx araclar/gu-ekran.ts
import { mkdirSync, writeFileSync } from "node:fs";

import { chromium } from "./pw.ts";
import type { Page } from "./pw.ts";

const TABAN = process.env.MAC_ADRES ?? "http://localhost:5173/";
const KLASOR = "docs/production/raporlar/ekran";
mkdirSync(KLASOR, { recursive: true });
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* eslint-disable @typescript-eslint/no-explicit-any */
type W = { __mac: any };
const m = <R>(s: Page, f: string): Promise<R> => s.evaluate((kod) => (new Function("mac", `return (${kod})(mac)`))((window as unknown as W).__mac), f) as Promise<R>;

const tarayici = await chromium.launch();
const hatalar: string[] = [];
const kayit: Record<string, unknown> = { tarayici: tarayici.version(), cozunurluk: "1280×720 CSS, DPR 1,5 (1920×1080)" };
const cekilen: string[] = [];

async function sayfa(sorgu: string): Promise<Page> {
  const b = await tarayici.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
  const s = await b.newPage();
  s.on("console", (x) => { if (x.type() === "error") hatalar.push(`${sorgu}: ${x.text()}`); });
  s.on("pageerror", (e) => hatalar.push(`${sorgu}: pageerror: ${e.message}`));
  s.on("requestfailed", (r) => hatalar.push(`${sorgu}: requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  await s.goto(`${TABAN}?${sorgu}`);
  await s.waitForFunction(() => !!(window as unknown as { __mac?: unknown }).__mac, null, { timeout: 20000 });
  return s;
}
const foto = async (s: Page, ad: string) => { const yol = `${KLASOR}/GU-B-${ad}.png`; await s.screenshot({ path: yol }); cekilen.push(yol); console.log("  ekran:", yol); };
const faz = (s: Page) => m<string>(s, "(mac) => mac.durum.mac.faz");
const turaKadar = async (s: Page) => { for (let k = 0; k < 600; k++) { if ((await faz(s)) === "tur") return; await bekle(25); } };
const durdu = (s: Page) => m<boolean>(s, "(mac) => mac.durdu");
const durmayiBekle = async (s: Page, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await durdu(s)) return true; await bekle(30); } return false; };
const olaydaDur = (s: Page, turler: string[], kare: number, i = -1) => m(s, `(mac) => mac.olaydaDur(${JSON.stringify(turler)}, ${kare}, ${i})`);
const devam = (s: Page) => m(s, "(mac) => mac.devam()");
const kapat = (s: Page) => (s as unknown as { close(): Promise<void> }).close();
const yuzde = (a: number[], q: number) => { const x = [...a].sort((p, r) => p - r); return +(x[Math.min(x.length - 1, Math.floor(x.length * q))] ?? 0).toFixed(2); };

// ---------------------------------------------------------------- A) oto=kenar: normal, çarpışma, hız şeridi, ölçüm
{
  const s = await sayfa("ekran=mac&debug&oto=kenar&tohum=7&takim=0&rakip=2");
  const olcum = "(mac) => { window.__olc = mac.olcumBaslat(); return 1; }";
  await m(s, olcum);
  await turaKadar(s);
  await bekle(2500);
  await foto(s, "01-normal");
  // çarpışma anı: ağır/kritik (vn ≥ 260), olaydan 1 kare sonra
  for (let k = 0; k < 30; k++) {
    await olaydaDur(s, ["carpisma"], 1);
    await durmayiBekle(s);
    const vn = await m<number>(s, "(mac) => mac.durmaOlayi?.vn ?? 0");
    if (vn >= 260) break;
    await devam(s);
  }
  await foto(s, "02-carpisma");
  await devam(s);
  // hız şeridi: topaç kuşakta (0,60R–0,85R) ve hızlı
  for (let k = 0; k < 300; k++) {
    const ok = await m<boolean>(s, "(mac) => mac.durum.topaclar.some((t) => { const r = Math.hypot(t.x, t.z) / mac.durum.arenaYaricap; return r > 0.62 && r < 0.83 && Math.hypot(t.vx, t.vz) > 150; })");
    if (ok) break;
    await bekle(30);
  }
  await foto(s, "03-hiz-seridi");
  const o = await s.evaluate(() => (window as unknown as { __olc: { isMs: number[] } }).__olc.isMs.slice(3));
  kayit["kareIsiHibrit"] = { n: o.length, p50: yuzde(o, 0.5), p95: yuzde(o, 0.95), enCok: yuzde(o, 1) };
  await kapat(s);
}
// ---------------------------------------------------------------- B) Ring Out, Parçalanma, düşük stamina yalpa, ani ölüm
{
  const s = await sayfa("ekran=mac&debug&oto=dolas&tohum=11&takim=0&rakip=1&bot=kukla");
  await turaKadar(s);
  await bekle(600);
  // düşük stamina: yerel topaç %15 → keskin kanat + yalpa
  await m(s, "(mac) => { const t = mac.durum.topaclar[0]; t.stamina = mac.durum.profiller[0].maxStamina * 0.2; return 1; }");
  await bekle(250);
  await foto(s, "04-dusuk-stamina-yalpa");
  await m(s, "(mac) => { const t = mac.durum.topaclar[0]; t.stamina = mac.durum.profiller[0].maxStamina; return 1; }");
  for (let k = 0; k < 400 && (await faz(s)) !== "tur"; k++) { await s.keyboard.press("Digit2"); await bekle(40); }
  await bekle(400);
  // Ring Out: rakip üst (uzak) kenara, dışa hızlı (duvarın arkasına düşüş)
  await m(s, "(mac) => { const [o, r] = mac.durum.topaclar; const R = mac.durum.arenaYaricap; r.x = 60; r.z = -(R - 44); r.vx = 80; r.vz = -420; o.x = 30; o.z = -(R - 130); o.vx = 60; o.vz = -300; mac.olaydaDur(['ringOut'], 3); return 1; }");
  kayit["ringOutBekleme"] = await durmayiBekle(s, 10000);
  kayit["ringOutOlay"] = await m(s, "(mac) => ({ o: mac.durmaOlayi?.tur, i: mac.durmaOlayi?.i, faz: mac.durum.mac.faz, puan: mac.durum.mac.puan })");
  await foto(s, "05-ring-out");
  await devam(s);
  await bekle(300);
  for (let k = 0; k < 400 && (await faz(s)) !== "tur"; k++) { await s.keyboard.press("Digit2"); await bekle(40); }
  await bekle(1800);
  // Parçalanma: rakip tık eşiğin hemen altında, yerel dash ile çarpar
  await m(s, "(mac) => { const d = mac.durum; const [o, r] = d.topaclar; r.tik = d.profiller[1].parametreler.burstEsik - 0.05; r.x = 50; r.z = 10; r.vx = 0; r.vz = 0; o.x = -40; o.z = 10; o.vx = 560; o.vz = 0; o.dashKalan = 8; mac.olaydaDur(['parcalandi'], 6); return 1; }");
  if (await durmayiBekle(s, 8000)) await foto(s, "06-parcalanma"); else kayit["parcalanma"] = "olmadı";
  await devam(s);
  await bekle(300);
  for (let k = 0; k < 400 && (await faz(s)) !== "tur"; k++) { await s.keyboard.press("Digit3"); await bekle(40); }
  await kapat(s);
}
{
  const s = await sayfa("ekran=mac&debug&oto=kenar&tohum=5&takim=0&rakip=2");
  await turaKadar(s);
  await bekle(800);
  // ani ölüm: süreyi sona sar
  await m(s, "(mac) => { mac.durum.mac.saat = 90 * 60 - 20; return 1; }");
  for (let k = 0; k < 200; k++) { if (await m<number>(s, "(mac) => mac.durum.mac.aniOlum")) break; await bekle(30); }
  await bekle(1200);
  await foto(s, "07-ani-olum");
  await kapat(s);
}
// ---------------------------------------------------------------- C) telegraf (rakip Ulti), Ulti anı (yerel), Takım Ultisi
{
  const s = await sayfa("ekran=mac&debug&tohum=21&takim=0&rakip=1&bot=kukla");
  await s.mouse.move(640, 300); await s.mouse.down(); await s.mouse.up();
  await turaKadar(s);
  await bekle(500);
  // yerel Ulti: Enerji dolu, rakibe nişan, 3 bas-bırak
  await m(s, "(mac) => { mac.enerjiDoldur(0, 300); return 1; }");
  const p = await m<{ x: number; z: number }>(s, "(mac) => ({ x: mac.durum.topaclar[1].x, z: mac.durum.topaclar[1].z })");
  const e = await m<{ x: number; y: number }>(s, `(mac) => mac.ekranNoktasi(${p.x}, ${p.z})`);
  await s.mouse.move(e.x, e.y);
  await olaydaDur(s, ["yetenekBasladi"], 8, 0);
  await s.keyboard.down("Digit3"); await bekle(80); await s.keyboard.up("Digit3");
  if (await durmayiBekle(s, 8000)) await foto(s, "09-ulti-ani"); else kayit["ulti"] = "olmadı";
  await devam(s);
  await bekle(7000);
  await m(s, "(mac) => { mac.enerjiDoldur(1, 300); mac.rakipYetenek(2); mac.olaydaDur(['yetenekBasladi'], 10, 1); return 1; }");
  await durmayiBekle(s, 15000);
  await foto(s, "08-telegraf-rakip-ulti");
  await devam(s);
  await bekle(2500);
  // Takım Ultisi: Takım Enerjisi dolu, 4
  await m(s, "(mac) => { mac.durum.takimEnerji[0] = 100; return 1; }");
  await olaydaDur(s, ["yetenekBasladi"], 14, 0);
  await s.keyboard.down("Digit4"); await bekle(80); await s.keyboard.up("Digit4");
  if (await durmayiBekle(s, 8000)) await foto(s, "10-takim-ultisi"); else kayit["takimUltisi"] = await m(s, "(mac) => ({ te: mac.durum.takimEnerji, faz: mac.durum.mac.faz })");
  await devam(s);
  kayit["sayac"] = await m(s, "(mac) => ({ ...mac.gorselSayac })");
  await kapat(s);
}
// ---------------------------------------------------------------- D) Düz görünüm (erişilebilirlik) ve ölçüm kıyası, Topaç Lab
{
  const s = await sayfa("ekran=mac&debug&oto=kenar&tohum=7&takim=0&rakip=2&gorunum=duz");
  await m(s, "(mac) => { window.__olc = mac.olcumBaslat(); return 1; }");
  await turaKadar(s);
  await bekle(2500);
  await foto(s, "11-duz-gorunum");
  const o = await s.evaluate(() => (window as unknown as { __olc: { isMs: number[] } }).__olc.isMs.slice(3));
  kayit["kareIsiDuz"] = { n: o.length, p50: yuzde(o, 0.5), p95: yuzde(o, 0.95), enCok: yuzde(o, 1) };
  await kapat(s);
}
{
  const b = await tarayici.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
  const s = await b.newPage();
  s.on("pageerror", (e) => hatalar.push(`lab: pageerror: ${e.message}`));
  await s.goto(`${TABAN}?ekran=topac-lab&debug`);
  await bekle(4000);
  await foto(s, "12-topac-lab");
}
await tarayici.close();
kayit["hatalar"] = hatalar;
kayit["cekilen"] = cekilen;
writeFileSync(`${KLASOR}/GU-B-ozet.json`, JSON.stringify(kayit, null, 1) + "\n");
console.log(JSON.stringify(kayit, null, 1));
process.exit(hatalar.length ? 1 : 0);
