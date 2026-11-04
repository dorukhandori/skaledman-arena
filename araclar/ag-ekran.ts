// D4 ekran görüntüleri (DPR 2, çizim açık): iki AYRI headless Chromium istemcisi, ikisi de N3 profili
// (150 ms + 20 ms jitter + %2 kayıp) altındaki ağ simülatörü vekilinden bağlanır. OTOMATİK OYNANIŞ (?oto=kenar / dolas).
// Akış: lobi → oda kodu → bağlantıyla katılım (rakip bulundu, takım seçimi) → maç ortası (yan yana) + H10 rozeti →
// B teslim (Esc › Teslim ol › 2 sn basılı) → Rövanş (iki taraf) → 2. maç → B 10 sn koparılır ("Rakip bağlanıyor")
// → B 25 sn koparılır (hükmen sonuç). Çıktı: docs/production/raporlar/ekran/D4-*.png
// Önce: npm run dev. Çalıştır: npm run ag:ekran
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { AgSimulatoru, simetrik } from "./ag-simulatoru.ts";
import { adres, bekle, bekleKosul, ev, istemciAc, ozetAl, tikla } from "./ag-ortak.ts";

const KLASOR = "docs/production/raporlar/ekran";
mkdirSync(KLASOR, { recursive: true });
const N3 = simetrik("N3", 150, 20, 2);
const vA = new AgSimulatoru(2631, "http://localhost:5173/", N3);
const vB = new AgSimulatoru(2632, "http://localhost:5173/", N3);
await vA.baslat(); await vB.baslat();
const a = await istemciAc("A", 2);
const b = await istemciAc("B", 2);
const cekilen: string[] = [];
const kayit: Record<string, unknown> = { not: "Otomatik oynanış: A paylaşılan 'kenar', B 'dolas' botuyla sürülür (klavye benzeri 8 yön). İki ayrı Chromium süreci, N3 vekili." };
const goruntu = async (s: typeof a, ad: string) => {
  const yol = `${KLASOR}/D4-${ad}.png`;
  try { await (s.sayfa as unknown as { screenshot(o: { path: string; timeout: number }): Promise<unknown> }).screenshot({ path: yol, timeout: 90000 }); }
  catch (e) { console.log("  ekran ALINAMADI:", yol, String(e).slice(0, 120)); kayit[`alinamadi-${ad}`] = String(e).slice(0, 200); return yol; }
  cekilen.push(yol); console.log("  ekran:", yol); return yol;
};
const yanYana = async (ad: string) => {
  const ya = await goruntu(a, `${ad}-A`); const yb = await goruntu(b, `${ad}-B`);
  const [ia, ib] = [sharp(ya), sharp(yb)];
  const [ma, mb] = [await ia.metadata(), await ib.metadata()];
  const yol = `${KLASOR}/D4-${ad}.png`;
  await sharp({ create: { width: ma.width! + mb.width! + 16, height: Math.max(ma.height!, mb.height!), channels: 3, background: "#050d10" } })
    .composite([{ input: ya, left: 0, top: 0 }, { input: yb, left: ma.width! + 16, top: 0 }]).png().toFile(yol);
  cekilen.push(yol); console.log("  ekran:", yol);
};
const macta = (s: typeof a, faz = "tur") => bekleKosul(s.sayfa, `(() => { const ag = window.__lobi && window.__lobi.agMaci; return !!(ag && ag.sunucu && window.__lobi.asama === "mac" && ag.sunucu.mac.faz === "${faz}"); })()`, 60000);
const sonucAcik = (s: typeof a, ms: number) => bekleKosul(s.sayfa, `!!(window.__lobi.macEkrani && window.__lobi.macEkrani.sonucAcik)`, ms);

try {
  await a.sayfa.goto(adres(2631, "oto=kenar&debug&takim=0"));
  await bekleKosul(a.sayfa, `!!document.querySelector("[data-eylem=oda-ac]")`, 30000);
  await bekle(500);
  await goruntu(a, "lobi");
  await tikla(a.sayfa, "[data-eylem=oda-ac]");
  await bekleKosul(a.sayfa, `!!document.querySelector("[data-kod]")`, 30000);
  const kod = await ev<string>(a.sayfa, `document.querySelector("[data-kod]").dataset.kod`);
  kayit["kod"] = kod;
  await goruntu(a, "oda-kodu");
  await b.sayfa.goto(`${adres(2632, "oto=dolas&debug&takim=1")}#oda=${kod}`);
  await bekleKosul(b.sayfa, `!!document.querySelector("[data-eylem=katil]")`, 30000);
  kayit["bAlanDolu"] = await ev<string>(b.sayfa, `document.querySelector(".lobi input:not(.ad)").value`);
  await goruntu(b, "katil-baglanti");
  await tikla(b.sayfa, "[data-eylem=katil]");
  for (const s of [a, b]) await bekleKosul(s.sayfa, `!!document.querySelector("[data-eylem=hazir]")`, 30000);
  await bekle(600);
  kayit["rakipBulundu"] = [await ev<string>(a.sayfa, `document.querySelector("[data-duyuru]").textContent`), await ev<string>(b.sayfa, `document.querySelector("[data-duyuru]").textContent`)];
  await yanYana("rakip-bulundu");
  for (const s of [a, b]) await tikla(s.sayfa, "[data-eylem=hazir]");
  await macta(a); await macta(b);
  await bekle(9000);
  kayit["h10"] = await ev<string>(a.sayfa, `(document.querySelector(".agk .h10.acik") || {}).textContent || ""`);
  await yanYana("mac-ortasi");
  await goruntu(a, "h10-rozeti");
  // B teslim: Esc › Teslim ol › Evet (2 sn basılı)
  await b.sayfa.keyboard.press("Escape");
  await bekle(400);
  await ev(b.sayfa, `[...document.querySelectorAll(".ms .menu button")].find((x) => x.textContent === "Teslim ol").click()`);
  await bekle(300);
  await ev(b.sayfa, `document.querySelector(".ms .menu button.tut").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))`);
  await bekle(2600);
  await ev(b.sayfa, `document.querySelector(".ms .menu button.tut") && document.querySelector(".ms .menu button.tut").dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))`);
  await sonucAcik(a, 30000); await sonucAcik(b, 30000);
  await bekle(3000);
  kayit["teslimSonucu"] = (await ozetAl(a.sayfa)).sonuc;
  await yanYana("teslim-sonucu");
  for (const s of [a, b]) await tikla(s.sayfa, "[data-rovans]");
  await bekle(800);
  await goruntu(a, "rovans-bekleniyor");
  for (const s of [a, b]) await bekleKosul(s.sayfa, `!!document.querySelector(".lobi.ust [data-eylem=hazir]") && getComputedStyle(document.querySelector(".lobi")).display !== "none"`, 30000);
  await bekle(500);
  await goruntu(a, "rovans");
  for (const s of [a, b]) await tikla(s.sayfa, ".lobi.ust [data-eylem=hazir]");
  await macta(a); await macta(b);
  await bekle(4000);
  // B 10 sn koparılır
  vB.kes(10000);
  await bekleKosul(a.sayfa, `(document.querySelector(".agk .bant.acik") || {}).textContent?.startsWith("Rakip bağlanıyor")`, 15000);
  await bekle(800);
  kayit["rakipBaglaniyor"] = (await ozetAl(a.sayfa)).bant;
  kayit["bBagKoptu"] = (await ozetAl(b.sayfa)).bant;
  await goruntu(a, "rakip-baglaniyor");
  await goruntu(b, "baglanti-koptu");
  await bekleKosul(a.sayfa, `window.__lobi.agMaci.durum.kopan < 0`, 30000);
  kayit["donusSn"] = "10 sn kesme sonrası döndü";
  await bekle(4000);
  // B 25 sn koparılır: 20 sn'de hükmen
  vB.kes(25000);
  await sonucAcik(a, 45000);
  await bekle(3500);
  kayit["hukmen"] = (await ozetAl(a.sayfa)).sonuc;
  kayit["hukmenAlt"] = await ev<string>(a.sayfa, `document.querySelector(".ms .kutu .alt").textContent`);
  await goruntu(a, "hukmen");
  await bekle(6000);
  kayit["bSon"] = (await ozetAl(b.sayfa)).bant;
  await goruntu(b, "hukmen-B");
} finally {
  kayit["cekilen"] = cekilen;
  kayit["konsolHata"] = [...a.hatalar.map((x) => `A ${x}`), ...b.hatalar.map((x) => `B ${x}`)];
  kayit["konsolUyari"] = [...a.uyarilar, ...b.uyarilar].slice(0, 20);
  writeFileSync(`${KLASOR}/D4-ekran.json`, JSON.stringify(kayit, null, 1));
  console.log(JSON.stringify(kayit, null, 1));
  await a.tarayici.close(); await b.tarayici.close(); await vA.kapat(); await vB.kapat();
}
process.exit(0);
