// FIZIK-1 gerçek çalışma zamanı doğrulaması: dev sunucudaki ?ekran=mac sayfasını headless Chromium'da açar.
// (1) GİRDİSİZ maç: yerel oyuncu hiç tuşa basmaz, rakip "kukla" (ilk 10 s hareketsiz, bot girdisi sıfır). Turun ilk 10 s'sindeki
//     topaç-topaç çarpışmaları sayılır, ilk ve ikinci çarpışma (sekip ayrılıp yeniden çarpma) karede dondurulup çekilir.
// (2) BOT-BOT maç: yerel topacı "dolas", rakibi "kenar" botu sürer; çarpışma anı ve 8 kare sonrası (sekme) çekilir.
// Görüntüler docs/production/raporlar/ekran/FIZIK-1-*.png (1280×720 CSS, DPR 2), özet FIZIK-1-ozet.json.
// Önce: npx vite --port 5191 --strictPort. Çalıştır: MAC_ADRES=http://localhost:5191/ npx tsx araclar/fizik-ekran.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "./pw.ts";
import type { Page } from "./pw.ts";

const TABAN = process.env.MAC_ADRES ?? "http://localhost:5173/";
const KLASOR = "docs/production/raporlar/ekran";
mkdirSync(KLASOR, { recursive: true });
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Durum { faz: string; saat: number; tick: number; durdu: boolean; olay: { tur: string; vn?: number; s?: number } | null; poz: number[] }
type MacPencere = { __mac: {
  durum: { tick: number; mac: { faz: string; saat: number }; topaclar: { x: number; z: number }[] };
  durdu: boolean; durmaOlayi: { tur: string; vn?: number; s?: number } | null;
  olaydaDur(t: string[], k: number): void; devam(): void;
} };
const oku = (s: Page): Promise<Durum> => s.evaluate(() => {
  const m = (window as unknown as MacPencere).__mac;
  const d = m.durum;
  const o = m.durmaOlayi;
  return { faz: d.mac.faz, saat: d.mac.saat, tick: d.tick, durdu: m.durdu, olay: o ? { tur: o.tur, vn: o.vn, s: o.s } : null, poz: d.topaclar.flatMap((t) => [t.x, t.z]) };
});
const olaydaDur = (s: Page, turler: string[], kare: number) => s.evaluate((a) => (window as unknown as MacPencere).__mac.olaydaDur(a.turler, a.kare), { turler, kare });
const devam = (s: Page) => s.evaluate(() => (window as unknown as MacPencere).__mac.devam());
async function turaKadar(s: Page): Promise<void> { for (let k = 0; k < 800; k++) { if ((await oku(s)).faz === "tur") return; await bekle(25); } throw new Error("tur başlamadı"); }
async function durmayiBekle(s: Page, ms: number): Promise<boolean> { const t0 = Date.now(); while (Date.now() - t0 < ms) { if ((await oku(s)).durdu) return true; await bekle(20); } return false; }
const mesafe = (p: number[]) => Math.sqrt((p[0]! - p[2]!) ** 2 + (p[1]! - p[3]!) ** 2);

const tarayici = await chromium.launch();
const hatalar: string[] = [];
const ozet: Record<string, unknown> = { tarayici: tarayici.version(), cekilen: [] as string[] };
async function sayfa(url: string): Promise<Page> {
  const b = await tarayici.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const s = await b.newPage();
  s.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text()); });
  s.on("pageerror", (e) => hatalar.push(`pageerror: ${e.message}`));
  await s.goto(url);
  await s.waitForFunction(() => !!(window as unknown as { __mac?: unknown }).__mac, null, { timeout: 30000 });
  return s;
}
const foto = async (s: Page, ad: string) => { const yol = `${KLASOR}/FIZIK-1-${ad}.png`; await s.screenshot({ path: yol }); (ozet.cekilen as string[]).push(yol); console.log("  ekran:", yol); };

/**
 * Turun ilk `sn` saniyesinde çarpışmaları sayar: her çarpışmada durur, okur, sürdürür. 1. çarpışma 0 kare sonra (çarpışma anı),
 * 2. çarpışma `sonrasiKare` render karesi sonra (sekme: aradaki mesafe > 2r) çekilir.
 */
async function carpismaSay(s: Page, ad: string, sn: number, sonrasiKare: number): Promise<Record<string, unknown>> {
  await turaKadar(s);
  const bas = await oku(s);
  await foto(s, `${ad}-1-baslangic`);
  const carpismalar: { saatSn: number; vn: number; mesafe: number; kare: number }[] = [];
  while (true) {
    const kare = carpismalar.length === 1 ? sonrasiKare : 0;
    await olaydaDur(s, ["carpisma"], kare);
    const t0 = Date.now();
    let durdu = false;
    while (Date.now() - t0 < 90000) {
      const o = await oku(s);
      if (o.durdu) { durdu = true; break; }
      if ((o.saat - bas.saat) / 60 > sn) break;
      await bekle(15);
    }
    if (!durdu) break;
    const o = await oku(s);
    carpismalar.push({ saatSn: +((o.saat - bas.saat) / 60).toFixed(2), vn: +(o.olay?.vn ?? 0).toFixed(1), mesafe: +mesafe(o.poz).toFixed(1), kare });
    if (carpismalar.length === 1) await foto(s, `${ad}-2-carpisma`);
    if (carpismalar.length === 2) await foto(s, `${ad}-3-sekme`);
    await devam(s);
    if ((o.saat - bas.saat) / 60 > sn) break;
  }
  return { turBasiSaatSn: +(bas.saat / 60).toFixed(2), carpismaSayisi: carpismalar.length, ilkCarpismaSn: carpismalar[0]?.saatSn ?? null, carpismalar, temasMesafesi: 60 };
}

// (1) girdisiz: yerel girdi yok, rakip kukla (ilk 10 s girdisi sıfır)
console.log("girdisiz maç");
const s1 = await sayfa(`${TABAN}?ekran=mac&debug&bot=kukla&tohum=7&takim=2&rakip=1`);
ozet.girdisiz = await carpismaSay(s1, "girdisiz", 10, 8);
console.log(" ", JSON.stringify(ozet.girdisiz));

// (2) bot-bot: dolas ↔ kenar, 30 s
console.log("bot-bot maç");
const s2 = await sayfa(`${TABAN}?ekran=mac&debug&oto=dolas&bot=kenar&tohum=9&takim=1&rakip=2`);
ozet.botBot = await carpismaSay(s2, "botbot", 30, 12);
console.log(" ", JSON.stringify(ozet.botBot));

ozet.hatalar = hatalar;
writeFileSync(`${KLASOR}/FIZIK-1-ozet.json`, JSON.stringify(ozet, null, 1));
console.log("hata:", hatalar.length, hatalar.slice(0, 5));
await tarayici.close();
