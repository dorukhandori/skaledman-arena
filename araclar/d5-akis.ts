// D5 "bitti" uçtan uca (headless Chromium, DPR 2). OTOMATİK OYNANIŞ: Antrenman eğitimi bu betiğin Playwright
// klavye/fare girdileriyle sürülür (durumu okuyup WASD 8 yön + Shift + 1 + Space basar; çarpışma ve Ring Out
// senaryoları); çevrimiçi maçta iki topacı paylaşılan bot sürer (?oto=kenar / dolas, girdi gerçek istemci yolundan).
// Akış: Karşılama → (misafir) Antrenman 6 adım → kapanış → Kayıt ol (önce hatalı) → Profil → İlk Çekirdek → Atölye
// (ödünç ile OYNA açık) → Lobi → ikinci tarayıcı (ikinci hesap) oda koduyla → takım seçimi → tam maç → sonuç XP →
// B ayrılır (rövanş reddi) → A çıkış → hatalı giriş → giriş → doğrudan Atölye. + dar ekran, bakım, sürüm bandı.
// Önce: npm run dev (temiz .veri önerilir). Çalıştır: npm run d5:akis
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "./pw.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */
type S = any;
const TABAN = process.env.D5_ADRES ?? "http://localhost:5173/";
const KLASOR = "docs/production/raporlar/ekran";
mkdirSync(KLASOR, { recursive: true });
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));
const kayit: Record<string, unknown> = { not: "Otomatik oynanış (betik klavye/fare; çevrimiçi maçta paylaşılan bot). İnsan play pass değil." };
const cekilen: string[] = [];
const ek = Date.now().toString(36).slice(-4);
const AD_A = `Ayşe ${ek}`;
const AD_B = `Bora ${ek}`;
const SIFRE = "topac-sifre-1";

interface Istemci { ad: string; tarayici: S; sayfa: S; hatalar: string[] }
async function istemci(ad: string, en = 1280, boy = 720): Promise<Istemci> {
  const tarayici = await chromium.launch();
  const baglam = await (tarayici as S).newContext({ viewport: { width: en, height: boy }, deviceScaleFactor: 2 });
  const sayfa = await baglam.newPage();
  const hatalar: string[] = [];
  sayfa.on("console", (m: S) => { if (m.type() === "error") hatalar.push(`${ad}: ${m.text()}`); });
  sayfa.on("pageerror", (e: Error) => hatalar.push(`${ad} pageerror: ${e.message}`));
  return { ad, tarayici, sayfa, hatalar };
}
const ev = <R>(s: S, kod: string): Promise<R> => s.evaluate(kod);
const bekleKosul = (s: S, kod: string, ms: number) => s.waitForFunction(kod, null, { timeout: ms });
const tikla = (s: S, sec: string) => s.click(sec);
async function goruntu(s: S, ad: string): Promise<void> {
  const yol = `${KLASOR}/D5-${ad}.png`;
  try { await s.screenshot({ path: yol, timeout: 60000 }); }
  catch (e) { console.log("  ekran ALINAMADI:", yol, String(e).slice(0, 100)); kayit[`alinamadi-${ad}`] = String(e).slice(0, 160); return; }
  cekilen.push(yol);
  console.log("  ekran:", yol);
}
const git = async (s: S, yol: string) => { await s.goto(`${TABAN}${yol}`); await bekle(600); };

// ---- Antrenman eğitimi otomatik sürüş (klavye/fare) ----
const basili = new Set<string>();
async function tuslar(s: S, istenen: string[]): Promise<void> {
  for (const k of [...basili]) if (!istenen.includes(k)) { await s.keyboard.up(k); basili.delete(k); }
  for (const k of istenen) if (!basili.has(k)) { await s.keyboard.down(k); basili.add(k); }
}
function yon(dx: number, dz: number): string[] {
  const u = Math.hypot(dx, dz) || 1;
  const x = dx / u, z = dz / u;
  const t: string[] = [];
  if (x > 0.38) t.push("KeyD"); if (x < -0.38) t.push("KeyA");
  if (z > 0.38) t.push("KeyS"); if (z < -0.38) t.push("KeyW");
  return t;
}
async function ekranNoktasi(s: S, x: number, z: number): Promise<{ x: number; y: number }> {
  // GU-B: hibrit izdüşüm dahil (__mac.ekranNoktasi); kanca yoksa eski düz eşleme
  return ev(s, `(() => { if (window.__mac && window.__mac.ekranNoktasi) return window.__mac.ekranNoktasi(${x}, ${z}); const r = document.querySelector(".mh").getBoundingClientRect(); return { x: r.left + (480 + ${x}) * r.width / 960, y: r.top + (270 + ${z}) * r.height / 540 }; })()`);
}
interface EgDurum { a: number[]; b: number[]; v: number[]; adim: number; faz: string; ry: boolean; bitti: boolean; kapanis: boolean }
const egOku = (s: S) => ev<EgDurum>(s, `(() => { const d = window.__mac.durum; const t = d.topaclar; const e = window.__egitim;
  return { a: [t[0].x, t[0].z], b: [t[1].x, t[1].z], v: [t[0].vx, t[0].vz], adim: e.adim, faz: d.mac.faz, ry: e.durum.rakipYetenegi, bitti: e.bitti, kapanis: !!document.querySelector(".eg .kapanis.acik") }; })()`);

async function egitimiOyna(s: S): Promise<void> {
  const bas = Date.now();
  const adimSuresi: number[] = [];
  let sonAdim = -1, sonAdimT = Date.now(), sonEylem = 0, cekildi = new Set<number>(), yonIsaret = 1;
  while (Date.now() - bas < 600_000) {
    const d = await egOku(s);
    if (d.bitti) break;
    if (d.adim !== sonAdim) { if (sonAdim >= 0) adimSuresi.push(Date.now() - sonAdimT); sonAdim = d.adim; sonAdimT = Date.now(); }
    const [ax, az] = d.a as [number, number];
    const [bx, bz] = d.b as [number, number];
    const dx = bx - ax, dz = bz - az, mes = Math.hypot(dx, dz);
    const [vx, vz] = d.v as [number, number];
    // hedefe sür: istenen hız (hedefe doğru) − mevcut hız (yörüngeye girmesin; momentum yüksek)
    const sur = (hx: number, hz: number, hiz = 160) => { const u = Math.hypot(hx, hz) || 1; return yon((hx / u) * hiz - vx, (hz / u) * hiz - vz); };
    const simdi = Date.now();
    if (d.faz !== "tur") { await tuslar(s, []); await bekle(80); continue; }
    // ekran görüntüsü: her adımın ortasında bir kez
    if (!cekildi.has(d.adim) && simdi - sonAdimT > (d.adim === 4 ? 0 : 2500) && (d.adim !== 4 || d.ry)) {
      cekildi.add(d.adim);
      await goruntu(s, `egitim-${d.adim + 1}`);
    }
    if (d.adim === 0) {
      if (Math.abs(ax) > 80) yonIsaret = ax > 0 ? -1 : 1;
      await tuslar(s, yonIsaret > 0 ? ["KeyD"] : ["KeyA"]);
    } else if (d.adim === 1) {
      await tuslar(s, sur(dx, dz));
    } else if (d.adim === 2) {
      await tuslar(s, sur(dx, dz));
      if (mes < 170 && simdi - sonEylem > 900) { await s.keyboard.press("ShiftLeft"); sonEylem = simdi; }
    } else if (d.adim === 3) {
      if (mes > 140) await tuslar(s, sur(dx, dz, 120)); else await tuslar(s, sur(-vx, -vz, 0));
      if (mes < 200 && simdi - sonEylem > 1500) {
        const p = await ekranNoktasi(s, bx, bz);
        await s.mouse.move(p.x, p.y);
        await s.keyboard.down("Digit1"); await bekle(60); await s.keyboard.up("Digit1");
        sonEylem = simdi;
      }
    } else if (d.adim === 4) {
      await tuslar(s, []);
      if (d.ry && simdi - sonEylem > 700) { await bekle(150); await s.keyboard.press("Space"); sonEylem = simdi; }
    } else if (d.adim === 5) {
      const bu = Math.hypot(bx, bz) || 1;
      const px = bx - (bx / bu) * 95, pz = bz - (bz / bu) * 95;
      if (Math.hypot(px - ax, pz - az) > 30 && mes > 50) await tuslar(s, sur(px - ax, pz - az, 120));
      else {
        await tuslar(s, sur(bx / bu, bz / bu, 220));
        if (simdi - sonEylem > 900) { await s.keyboard.press("ShiftLeft"); sonEylem = simdi; }
      }
    }
    await bekle(60);
  }
  await tuslar(s, []);
  adimSuresi.push(Date.now() - sonAdimT);
  kayit["egitim"] = { gecisler: await ev(s, "window.__egitim.durum.gecisler"), adimGercekMs: adimSuresi, toplamGercekSn: Math.round((Date.now() - bas) / 1000) };
}

// Bilinçli hata senaryolarının tarayıcı ağ günlüğü (uygulama hatası değil): 400 (uygunsuz ad), 401 (yanlış şifre),
// 409, ERR_CONNECTION_REFUSED (bakım benzetimi: /api/ben reddedildi). Ham liste ayrıca yazılır.
const temizle = (hatalar: string[]) => hatalar.filter((h) => !/Failed to load resource: (the server responded with a status of 40[019]|net::ERR_CONNECTION_REFUSED)/.test(h));

const A = await istemci("A");
let B: Istemci | null = null;
try {
  const a = A.sayfa;
  // 1. Karşılama
  await git(a, "");
  await bekleKosul(a, `!!document.querySelector("[data-eylem=antrenman]")`, 20000);
  await goruntu(a, "karsilama");
  // 2. Misafir Antrenman
  await tikla(a, "[data-eylem=antrenman]");
  await bekleKosul(a, `!!(window.__egitim && window.__mac)`, 30000);
  await egitimiOyna(a);
  if (process.env.D5_YALNIZ_EGITIM) throw new Error("yalnız eğitim (deneme)");
  await bekleKosul(a, `!!document.querySelector(".eg .kapanis.acik")`, 10000);
  await bekle(400);
  await goruntu(a, "egitim-kapanis");
  await bekleKosul(a, `!!document.querySelector(".eg .kapanis [data-eylem=kayit]")`, 10000);
  kayit["egitimSonuc"] = await ev(a, "window.__egitim.sonuc");
  await goruntu(a, "egitim-misafir-sonu");
  await tikla(a, ".eg .kapanis [data-eylem=kayit]");
  // 3. Kayıt: önce şifreler eşleşmiyor, sonra uygunsuz ad, sonra doğru
  await bekleKosul(a, `!!document.querySelector("[data-eylem=kayit-ol]")`, 20000);
  await a.fill("#a-ad", AD_A);
  await a.fill("#a-sifre", SIFRE);
  await a.fill("#a-sifreTekrar", "baska-sifre-2");
  await tikla(a, "[data-eylem=kayit-ol]");
  await bekle(500);
  kayit["kayitHata1"] = await ev(a, `document.querySelector("#a-sifreTekrar ~ .hata").textContent`);
  await goruntu(a, "kayit-hata-sifre");
  await a.fill("#a-ad", "0r0spu");
  await a.fill("#a-sifreTekrar", SIFRE);
  await tikla(a, "[data-eylem=kayit-ol]");
  await bekle(800);
  kayit["kayitHata2"] = await ev(a, `document.querySelector("#a-ad ~ .hata").textContent`);
  await goruntu(a, "kayit-hata-ad");
  await a.fill("#a-ad", AD_A);
  await tikla(a, "[data-eylem=kayit-ol]");
  // 4. Profil
  await bekleKosul(a, `!!document.querySelector("[data-eylem=basla]")`, 20000);
  await tikla(a, "[data-deger=kaya]");
  await tikla(a, "[data-deger='#2fb8e8']");
  await tikla(a, "[data-eylem=destek-kanali]");
  await a.fill("#a-kanal", "ayse_yayin");
  await goruntu(a, "profil");
  await tikla(a, "[data-eylem=basla]");
  // 5. İlk Çekirdek
  await bekleKosul(a, `!!document.querySelector("[data-eylem=sec-maden]")`, 20000);
  await bekle(2500);
  await goruntu(a, "ilk-cekirdek");
  await tikla(a, "[data-ck=maden]");
  await tikla(a, "[data-eylem=sec]");
  // 6. Atölye (misafir eğitimi → İlk Devir)
  await bekleKosul(a, `!!document.querySelector("[data-eylem=oyna]")`, 20000);
  kayit["atolye"] = await ev(a, `({ oynaSoluk: document.querySelector("[data-eylem=oyna]").getAttribute("aria-disabled") === "true", odunc: [...document.querySelectorAll(".at .yv")].map((y) => y.dataset.odunc), toast: (document.querySelector(".at .toast") || {}).textContent || "" })`);
  await goruntu(a, "atolye");

  // 7. B: ikinci hesap (yeni tarayıcı) → kayıt → profil → ilk çekirdek (Yapay) → eğitim (Atla) → Atölye
  B = await istemci("B");
  const b = B.sayfa;
  await git(b, "?ekran=kayit");
  await bekleKosul(b, `!!document.querySelector("[data-eylem=kayit-ol]")`, 20000);
  await b.fill("#a-ad", AD_B); await b.fill("#a-sifre", SIFRE); await b.fill("#a-sifreTekrar", SIFRE);
  await tikla(b, "[data-eylem=kayit-ol]");
  await bekleKosul(b, `!!document.querySelector("[data-eylem=basla]")`, 20000);
  await tikla(b, "[data-eylem=basla]");
  await bekleKosul(b, `!!document.querySelector("[data-eylem=sec-yapay]")`, 20000);
  await tikla(b, "[data-ck=yapay]");
  await tikla(b, "[data-eylem=sec]");
  await bekleKosul(b, `!!(window.__egitim)`, 30000);
  kayit["bEgitimeGitti"] = true;
  await tikla(b, "[data-eylem=atla]");
  await bekleKosul(b, `!!document.querySelector("[data-eylem=oyna]")`, 20000);

  // 8. A: OYNA → Lobi → Oda aç (otomatik oynanış için ?oto)
  await tikla(a, "[data-eylem=oyna]");
  // D7+ (GU-08): Oyna varsayılanı Hızlı maç; oda için sol sütunda "Oda kodu" modu seçilir
  await bekleKosul(a, `!!document.querySelector("[data-mod=oda]")`, 20000);
  await git(a, "?ekran=lobi&oto=kenar");
  await bekleKosul(a, `!!document.querySelector("[data-mod=oda]")`, 20000);
  await tikla(a, "[data-mod=oda]");
  await bekleKosul(a, `!!document.querySelector("[data-eylem=oda-ac]")`, 20000);
  await goruntu(a, "lobi");
  await tikla(a, "[data-eylem=oda-ac]");
  await bekleKosul(a, `!!document.querySelector("[data-kod]")`, 20000);
  const kod = await ev<string>(a, `document.querySelector("[data-kod]").dataset.kod`);
  kayit["odaKodu"] = kod;
  await b.goto(`${TABAN}?ekran=lobi&oto=dolas#oda=${kod}`);
  await bekleKosul(b, `!!document.querySelector("[data-eylem=katil]")`, 20000);
  await tikla(b, "[data-eylem=katil]");
  for (const s of [a, b]) await bekleKosul(s, `!!document.querySelector("[data-eylem=hazir]")`, 20000);
  await bekle(1200);
  kayit["takimSecimi"] = await ev(a, `({ takimlar: [...document.querySelectorAll("[data-takim]")].map((d) => d.textContent), rakip: document.querySelector("[data-rakip]").textContent, sayac: document.querySelector("[data-secim-sayac]").textContent })`);
  await goruntu(a, "takim-secimi");
  for (const s of [a, b]) await tikla(s, "[data-eylem=hazir]");
  // 9. Tam maç (otomatik)
  await bekleKosul(a, `!!(window.__lobi && window.__lobi.asama === "mac")`, 30000);
  await bekle(20000);
  await goruntu(a, "mac-ortasi");
  for (const s of [a, b]) await bekleKosul(s, `!!(window.__lobi.macEkrani && window.__lobi.macEkrani.sonucAcik)`, 240000);
  for (const s of [a, b]) await bekleKosul(s, `!!document.querySelector("[data-odul] .ck, [data-odul]:not(:has(.yt))")`, 20000);
  await a.keyboard.press("Space"); await b.keyboard.press("Space");
  await bekle(800);
  kayit["sonucA"] = await ev(a, `({ baslik: document.querySelector(".ms h2").textContent, skor: document.querySelector(".ms .skr").textContent, odul: document.querySelector("[data-odul]").innerText })`);
  kayit["sonucB"] = await ev(b, `({ baslik: document.querySelector(".ms h2").textContent, skor: document.querySelector(".ms .skr").textContent, odul: document.querySelector("[data-odul]").innerText })`);
  await goruntu(a, "sonuc-xp");
  await goruntu(b, "sonuc-xp-B");
  // 10. Rövanş reddi: B Atölye'ye döner
  await tikla(b, ".ms [data-eylem=atolye]");
  await bekleKosul(a, `!!document.querySelector("[data-rovans-red]")`, 20000);
  kayit["rovansRed"] = await ev(a, `document.querySelector("[data-rovans]").textContent + " | " + document.querySelector("[data-rovans-red]").textContent`);
  await goruntu(a, "rovans-red");
  // 11. A: Atölye → Çıkış → hatalı giriş → giriş → doğrudan Atölye
  await tikla(a, ".ms [data-eylem=atolye]");
  await bekleKosul(a, `!!document.querySelector("[data-eylem=oyna]") && !!document.querySelector("[data-eylem=cikis]")`, 20000);
  kayit["atolyeMacSonrasi"] = await ev(a, `[...document.querySelectorAll(".at .yv .k")].map((x) => x.textContent).join(" / ")`);
  await tikla(a, "[data-eylem=cikis]");
  await bekleKosul(a, `!!document.querySelector("[data-eylem=giris]")`, 20000);
  await tikla(a, "[data-eylem=giris]");
  await bekleKosul(a, `!!document.querySelector("[data-eylem=giris-yap]")`, 20000);
  await a.fill("#a-ad", AD_A.toUpperCase());
  await a.fill("#a-sifre", "yanlis-sifre-9");
  await tikla(a, "[data-eylem=giris-yap]");
  await bekleKosul(a, `document.querySelector(".ekr .hata[role=alert]:not(:empty)") !== null`, 10000);
  kayit["girisHata"] = await ev(a, `[...document.querySelectorAll(".ekr .hata")].map((h) => h.textContent).filter(Boolean).join(" ")`);
  await goruntu(a, "giris-hata");
  await a.fill("#a-sifre", SIFRE);
  await goruntu(a, "giris");
  await tikla(a, "[data-eylem=giris-yap]");
  await bekleKosul(a, `location.search.includes("ekran=atolye") && !!document.querySelector("[data-eylem=oyna]")`, 20000);
  kayit["tekrarGiris"] = await ev(a, "location.search");
  await goruntu(a, "tekrar-giris-atolye");
  // 12. Hata ekranları: sürüm bandı (sunucu farklı protokol bildirir), bakım (sunucuya ulaşılamıyor)
  await a.route("**/api/ben", (r: S) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ girisli: false, protokol: 3, katalog: "eski" }) }));
  await git(a, "");
  await bekleKosul(a, `!!document.querySelector(".ust-bant")`, 10000);
  await goruntu(a, "hata-surum");
  await a.unroute("**/api/ben");
  await a.route("**/api/ben", (r: S) => r.abort("connectionrefused"));
  await git(a, "?ekran=atolye");
  await bekleKosul(a, `!!document.querySelector(".tam-katman")`, 10000);
  await goruntu(a, "hata-bakim");
  await a.unroute("**/api/ben");
  const D = await istemci("Dar", 1024, 600);
  await git(D.sayfa, "");
  await bekleKosul(D.sayfa, `!!document.querySelector("[data-dar]")`, 10000);
  await goruntu(D.sayfa, "hata-dar-ekran");
  await D.tarayici.close();
  kayit["konsolHatalari"] = [...temizle(A.hatalar), ...temizle(B.hatalar), ...temizle(D.hatalar)];
  kayit["konsolHamHatalar"] = [...A.hatalar, ...B.hatalar, ...D.hatalar];
} catch (e) {
  kayit["hata"] = String(e);
  console.error(e);
  try { await goruntu(A.sayfa, "HATA-A"); } catch { /* */ }
  if (B) try { await goruntu(B.sayfa, "HATA-B"); } catch { /* */ }
} finally {
  kayit["cekilen"] = cekilen;
  kayit["hesaplar"] = [AD_A, AD_B];
  writeFileSync(`${KLASOR}/D5-akis.json`, JSON.stringify(kayit, null, 2));
  console.log(JSON.stringify(kayit, null, 2));
  await A.tarayici.close();
  await B?.tarayici.close();
}
