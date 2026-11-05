// Topaç Lab uçtan uca doğrulama (D1 "bitti" ölçütü): dev server'daki ?ekran=topac-lab sayfasını headless Chromium'da
// açar, klavyeyle sürer, çarpışma + üç bitişi tetikler, ekran görüntülerini docs/production/raporlar/ekran/D1-*.png
// olarak kaydeder (deviceScaleFactor 2) ve konsol hatalarını sayar. Önce: npm run dev. Çalıştır: npm run lab:ekran
import { mkdirSync, writeFileSync } from "node:fs";

import { chromium } from "./pw.ts";
import type { Page } from "./pw.ts";

const ADRES = process.env.LAB_ADRES ?? "http://localhost:5173/?ekran=topac-lab&debug&tohum=7&bot=saldirgan";
const KLASOR = "docs/production/raporlar/ekran";
mkdirSync(KLASOR, { recursive: true });

interface LabSayac { yok: number; hafif: number; agir: number; kritik: number; duvar: number; ringOut: number; parcalanma: number; durma: number; dash: number; zitElement: number; ekranFlas: number; ekranFlasReddi: number }
const sayac = (s: Page) => s.evaluate(() => ({ ...(window as unknown as { __lab: { sayac: LabSayac } }).__lab.sayac }));
const durum = (s: Page) => s.evaluate(() => {
  const l = (window as unknown as { __lab: { durum: { tick: number; topaclar: { x: number; z: number; stamina: number; tik: number; durum: number }[]; mac: unknown }; canliParcacik: number; kademeler: (string | null)[]; kareHizi: number } }).__lab;
  return { tick: l.durum.tick, topaclar: l.durum.topaclar.map((t) => ({ x: +t.x.toFixed(1), z: +t.z.toFixed(1), stamina: +t.stamina.toFixed(1), tik: +t.tik.toFixed(2), durum: t.durum })), mac: l.durum.mac, parcacik: l.canliParcacik, kademeler: l.kademeler, fps: +l.kareHizi.toFixed(1) };
});
const olaydaDur = (tur: string, kare: number) => s.evaluate((a) => (window as unknown as { __lab: { olaydaDur(t: string, k: number): void } }).__lab.olaydaDur(a.tur, a.kare), { tur, kare });
const durduMu = () => s.evaluate(() => (window as unknown as { __lab: { durdu: boolean } }).__lab.durdu);
const devam = () => s.evaluate(() => (window as unknown as { __lab: { devam(): void } }).__lab.devam());
const carpismaSayisi = (c: LabSayac) => c.hafif + c.agir + c.kritik;
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function kosulBekle(s: Page, f: () => Promise<boolean>, ms: number, adim = 16): Promise<boolean> {
  const son = Date.now() + ms;
  while (Date.now() < son) { if (await f()) return true; await bekle(adim); }
  return false;
}

const tarayici = await chromium.launch();
const baglam = await tarayici.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
const s = await baglam.newPage();
const hatalar: string[] = [];
const uyarilar: string[] = [];
s.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text()); else if (m.type() === "warning") uyarilar.push(m.text()); });
s.on("pageerror", (e) => hatalar.push(`pageerror: ${e.message}`));
s.on("requestfailed", (r) => hatalar.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));

const kayit: Record<string, unknown> = { adres: ADRES, tarayici: tarayici.version() };
const goruntu = async (ad: string) => { const yol = `${KLASOR}/D1-${ad}.png`; await s.screenshot({ path: yol }); console.log("  ekran:", yol); return yol; };

await s.goto(ADRES);
await s.waitForFunction(() => !!(window as unknown as { __lab?: unknown }).__lab, null, { timeout: 15000 });
await bekle(600);
kayit.baslangic = await durum(s);
await goruntu("01-baslangic");

// 1) WASD ile sür, bota çarp: tuşları bota göre seç (insan gibi dümen), çarpınca hemen ekran görüntüsü
const basili = new Set<string>();
async function botaSur(): Promise<void> {
  const d = await durum(s);
  const [o, r] = d.topaclar as unknown as [{ x: number; z: number }, { x: number; z: number }];
  const dx = r.x - o.x;
  const dz = r.z - o.z;
  const istenen = new Set<string>();
  if (Math.abs(dx) > 12) istenen.add(dx > 0 ? "KeyD" : "KeyA");
  if (Math.abs(dz) > 12) istenen.add(dz > 0 ? "KeyS" : "KeyW");
  for (const k of [...basili]) if (!istenen.has(k)) { await s.keyboard.up(k); basili.delete(k); }
  for (const k of istenen) if (!basili.has(k)) { await s.keyboard.down(k); basili.add(k); }
}
async function birak(): Promise<void> { for (const k of basili) await s.keyboard.up(k); basili.clear(); }
await s.mouse.move(400, 300);
const c0 = carpismaSayisi(await sayac(s));
let carpti = await kosulBekle(s, async () => { await botaSur(); return carpismaSayisi(await sayac(s)) > c0; }, 8000, 0);
await goruntu("02-carpisma-wasd");
await birak();
kayit.wasdCarpisma = { carpti, sayac: await sayac(s), durum: await durum(s) };
console.log("WASD çarpışma:", carpti);

// 2) Dash ile kritik çarpışma: yeniden başlat, sağa sür + Shift
await s.keyboard.press("KeyR");
await bekle(300);
const c1 = await sayac(s);
await olaydaDur("carpisma", 1);
let dashAtildi = false;
carpti = await kosulBekle(s, async () => {
  await botaSur();
  const d = await durum(s);
  const [o, r] = d.topaclar as unknown as [{ x: number; z: number }, { x: number; z: number }];
  if (!dashAtildi && Math.hypot(r.x - o.x, r.z - o.z) < 150) { await s.keyboard.press("ShiftLeft"); dashAtildi = true; }
  const c = await sayac(s);
  return carpismaSayisi(c) > carpismaSayisi(c1) && (await durduMu());
}, 8000, 0);
await birak();
await goruntu("03-dash-carpisma-ani");
await devam();
kayit.dashCarpisma = { carpti, sayac: await sayac(s) };
console.log("Dash ağır/kritik çarpışma:", carpti);

// 3) Serbest sürüş: WASD dolaşma + Space sekme + Z sıkı dönüş (bot saldırgan), 6 sn
await s.keyboard.press("KeyR");
for (const [tus, ms] of [["KeyW", 500], ["KeyD", 700], ["KeyS", 600], ["KeyA", 900], ["KeyD", 800]] as const) {
  await s.keyboard.down(tus); await bekle(ms); await s.keyboard.up(tus);
}
await s.keyboard.press("Space");
await bekle(120);
await goruntu("04-sekme");
await s.keyboard.down("KeyZ"); await bekle(800); await s.keyboard.up("KeyZ");
kayit.serbest = { sayac: await sayac(s), durum: await durum(s) };

// 4) Stamina kaydırıcısı: kademeler (bot pasif, oyuncu durur)
await s.selectOption("select:not([data-taraf])", "pasif").catch(() => undefined);
await s.evaluate(() => { const sel = [...document.querySelectorAll("select")].find((x) => [...x.options].some((o) => o.value === "pasif")); if (sel) { sel.value = "pasif"; sel.dispatchEvent(new Event("change")); } });
await s.keyboard.press("KeyR");
await bekle(300);
const kaydir = async (v: number) => s.evaluate((v) => { const k = document.querySelector<HTMLInputElement>(".lab input[type=range]")!; k.value = String(v); k.dispatchEvent(new Event("input")); }, v);
await kaydir(42); await bekle(500);
const orta = await durum(s);
await goruntu("05-kademe-orta-42");
await kaydir(15); await bekle(700);
const dusuk = await durum(s);
await goruntu("06-kademe-dusuk-yalpa-15");
kayit.kademe = { orta: orta.kademeler, dusuk: dusuk.kademeler };
console.log("kademeler %42:", orta.kademeler, "%15:", dusuk.kademeler);

// 5) Bitişler (zorla düğmeleri)
const dugme = (ad: string) => s.getByRole("button", { name: ad }).click();
const bitis = async (ad: string, alan: keyof LabSayac, dosya: string, kare: number, olayTuru: string) => {
  await s.keyboard.press("KeyR");
  await bekle(300);
  const once = (await sayac(s))[alan];
  await olaydaDur(olayTuru, kare);
  await dugme(ad);
  const oldu = await kosulBekle(s, async () => (await sayac(s))[alan] > once && (await durduMu()), 4000, 8);
  await goruntu(dosya);
  await devam();
  const d = await durum(s);
  console.log(`${ad}:`, oldu, JSON.stringify(d.mac));
  return { oldu, mac: d.mac };
};
kayit.ringOut = await bitis("Ring Out'a zorla", "ringOut", "07-ring-out", 2, "ringOut");
kayit.parcalanma = await bitis("Parçalanma'ya zorla", "parcalanma", "08-parcalanma", 2, "parcalandi");
kayit.durma = await bitis("Durma'ya zorla", "durma", "09-durma", 5, "durma");

// 6) Bota karşı 30 sn deneme (saldırgan bot, oyuncu sürer)
await s.evaluate(() => { const sel = [...document.querySelectorAll("select")].find((x) => [...x.options].some((o) => o.value === "pasif")); if (sel) { sel.value = "saldirgan"; sel.dispatchEvent(new Event("change")); } });
await s.keyboard.press("KeyR");
const t0 = Date.now();
const desen = ["KeyD", "KeyW", "KeyA", "KeyS"] as const;
let k = 0;
let enAzFps = 999;
while (Date.now() - t0 < 30000) {
  const tus = desen[k % 4]!;
  await s.keyboard.down(tus);
  if (k % 3 === 0) await s.keyboard.press("ShiftLeft");
  await bekle(450);
  await s.keyboard.up(tus);
  k++;
  const f = (await durum(s)).fps;
  if (f > 0) enAzFps = Math.min(enAzFps, f);
}
await goruntu("10-bot-30sn");
kayit.bot30sn = { sayac: await sayac(s), durum: await durum(s), enAzFps };
console.log("30 sn sonra sayaçlar:", JSON.stringify(await sayac(s)), "en düşük fps:", enAzFps);

kayit.konsolHatalari = hatalar;
kayit.konsolUyarilari = uyarilar;
writeFileSync(`${KLASOR}/D1-ozet.json`, JSON.stringify(kayit, null, 2) + "\n");
console.log(`konsol hatası: ${hatalar.length}`, hatalar.slice(0, 10));
console.log(`konsol uyarısı: ${uyarilar.length}`, uyarilar.slice(0, 5));
await tarayici.close();
process.exit(hatalar.length === 0 ? 0 : 1);
