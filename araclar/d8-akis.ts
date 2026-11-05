// D8 "bitti" uçtan uca (headless Chromium, DPR 2, `npm run dev` açıkken: `npm run d8:akis`). OTOMATİK OYNANIŞ:
// iki oyuncu hesabı (A yayıncı/ev sahibi, B izleyici-oyuncu) topaçlarını paylaşılan bot sürer (`?oto=`; bot Yetenek /
// Özel / Ulti / Takım Ultisi kullanır), girdi gerçek istemci yolundan. Seyirci bağlamı (C, misafir) `#izle=` ile izler;
// D şeffaf (`&seffaf=1`). Takım Ultisi için A'nın Takım Enerjisi GELİŞTİRME mesajıyla 99,9'a çekilir (bir sonraki doğal
// kazanç dilimi doldurur; yalnız NODE_ENV ≠ production), A'nın Çekirdeği `xp-ver` ile Lv.3 (Ulti-açık). 20 Node SDK
// seyircisi maç boyunca bağlı (oda adımı p95 ölçümü). Sonra hesap silme akışı, Gizlilik, Krediler, Ayarlar.
// Çıktı: docs/production/raporlar/ekran/D8-*.png ve D8-akis.json.
import { writeFileSync } from "node:fs";
import { Client } from "@colyseus/sdk";
import { chromium, type Page } from "./pw.ts";
import { TABAN, bekle, bekleKosul, ev, hesapHazirla, istemciAc, tikla, type Istemci } from "./ag-ortak.ts";

const EKRAN = "docs/production/raporlar/ekran";
const kayit: Record<string, unknown> = {};
const foto = async (s: Page, ad: string, seffaf = false) => {
  await (s as unknown as { screenshot(o: { path: string; omitBackground?: boolean }): Promise<unknown> }).screenshot({ path: `${EKRAN}/D8-${ad}.png`, omitBackground: seffaf });
  console.log(`  📷 D8-${ad}.png`);
};
const t0 = Date.now();
const log = (m: string) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0).padStart(4)} s] ${m}`);

async function seyirciAc(ad: string, yol: string): Promise<Istemci & { bayt: number[] }> {
  const tarayici = await chromium.launch();
  const baglam = await tarayici.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
  const sayfa = await baglam.newPage();
  const hatalar: string[] = [];
  const bayt: number[] = [];
  sayfa.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text()); });
  sayfa.on("pageerror", (e) => hatalar.push(`pageerror: ${e.message}`));
  (sayfa as unknown as { on(o: "websocket", f: (w: { on(o: "framereceived", f: (x: { payload: string | Buffer }) => void): void }) => void): void }).on("websocket", (w) => {
    w.on("framereceived", (f) => bayt.push(typeof f.payload === "string" ? Buffer.byteLength(f.payload) : f.payload.length, Date.now()));
  });
  await sayfa.goto(`${TABAN}${yol}`);
  return { ad, tarayici, sayfa, hatalar, uyarilar: [], bayt };
}

/** Bayt dizisi [n, t, n, t, ...] → pencere içindeki KB/s. */
function bant(b: number[], bas: number, son: number): number {
  let n = 0;
  for (let k = 0; k < b.length; k += 2) if (b[k + 1]! >= bas && b[k + 1]! <= son) n += b[k]!;
  return n / 1024 / ((son - bas) / 1000);
}

const A = await istemciAc("A", 2);
const B = await istemciAc("B", 2);
const herkes: Istemci[] = [A, B];
try {
  // ---- hazırlık: hesaplar (API; kayıt formu D5'te doğrulandı), İlk Devir, A'nın Çekirdeği Lv.3 ----
  await hesapHazirla(A, null);
  await hesapHazirla(B, null);
  for (const s of [A, B]) await ev(s.sayfa, `fetch("/api/egitim-bitti", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: "{}" }).then((r) => r.status)`);
  const benA = await ev<{ oyuncu: { ad: string }; cekirdekler: { id: number; seviye: number }[] }>(A.sayfa, `fetch("/api/ben", { credentials: "same-origin" }).then((r) => r.json())`);
  const xp = await ev(A.sayfa, `fetch("/api/gelistirme/xp-ver", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ cekirdekId: ${benA.cekirdekler[0]!.id}, xp: 600 }) }).then((r) => r.json())`);
  // A'nın takımı: üç sahip olunan Çekirdek, hepsi Lv.3 (geliştirme ucu; ödünç Lv.1 üyede Takım Ultisi kilitli kalır)
  const takimKur = await ev(A.sayfa, `(async () => {
    const p = (y, g, m = "POST") => fetch(y, { method: m, credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(g) }).then((r) => r.json());
    const ver = (t) => p("/api/gelistirme/parca-ver", { tanim: t }).then((j) => j.id);
    const setler = [["kor-goktasi", "ok-govde", "hafif-disk", "duz-uc"], ["kaya-maden", "kalkan-govde", "agir-disk", "igne-uc"], ["kasirga-yapay", "savrulan-govde", "denge-disk", "dengeli-uc"]];
    const yuvalar = [];
    for (const [k, set] of setler.entries()) {
      const c = k === 0 ? ${benA.cekirdekler[0]!.id} : await ver(set[0]);
      yuvalar.push({ cekirdek: c, govde: await ver(set[1]), disk: await ver(set[2]), uc: await ver(set[3]) });
      await p("/api/gelistirme/xp-ver", { cekirdekId: c, xp: 750 });
    }
    return p("/api/takim/0", { yuvalar }, "PUT");
  })()`);
  kayit["hazirlik"] = { aAd: benA.oyuncu.ad, xp, takimKur };
  log(`A ${benA.oyuncu.ad} Çekirdek → ${JSON.stringify(xp)}`);

  // ---- A oda açar, seyirci bağlantısını kopyalar ----
  await A.sayfa.goto(`${TABAN}?ekran=lobi&oto=kenar&debug&takim=0`);
  await bekleKosul(A.sayfa, `!!document.querySelector("[data-mod=oda]")`, 20000);
  await tikla(A.sayfa, "[data-mod=oda]");
  await bekleKosul(A.sayfa, `!!document.querySelector("[data-eylem=oda-ac]")`, 20000);
  await tikla(A.sayfa, "[data-eylem=oda-ac]");
  await bekleKosul(A.sayfa, `!!document.querySelector("[data-seyirci]")`, 20000);
  const kod = await ev<string>(A.sayfa, `document.querySelector("[data-kod]").dataset.kod`);
  const link = await ev<string>(A.sayfa, `document.querySelector("[data-seyirci]").dataset.seyirci`);
  kayit["oda"] = { kod, seyirciLinki: link };
  await foto(A.sayfa, "lobi-seyirci-baglantisi");
  log(`oda ${kod}, seyirci ${link}`);

  // ---- seyirci C (misafir, normal) ve D (şeffaf) ----
  const yol = link.slice(link.indexOf("#"));
  const C = await seyirciAc("C", `${yol}`);
  const D = await seyirciAc("D", `${yol}&seffaf=1`);
  herkes.push(C, D);
  await bekleKosul(C.sayfa, `(() => { const s = window.__seyirci; return s && s.ag.durum && s.ag.durum.kod; })()`, 20000);
  await bekle(600);
  kayit["seyirciBekleme"] = await ev(C.sayfa, `({ metin: document.querySelector(".sy .bekle").innerText, imlec: getComputedStyle(document.body).cursor, baslik: getComputedStyle(document.querySelector("body > header")).display, olcek: window.__seyirci.sahne ? 0 : 0 })`);
  await foto(C.sayfa, "seyirci-bekleme");

  // ---- B katılır, ikisi Hazır → maç ----
  const bantBas0 = Date.now();
  await B.sayfa.goto(`${TABAN}?ekran=lobi&oto=dolas&debug&takim=0#oda=${kod}`);
  await bekleKosul(B.sayfa, `!!document.querySelector("[data-eylem=katil]")`, 20000);
  await tikla(B.sayfa, "[data-eylem=katil]");
  for (const s of [A, B]) await bekleKosul(s.sayfa, `!!document.querySelector("[data-eylem=hazir]")`, 20000);
  for (const s of [A, B]) await tikla(s.sayfa, "[data-eylem=hazir]");
  await bekleKosul(A.sayfa, `window.__lobi.agMaci && window.__lobi.agMaci.sunucu && window.__lobi.agMaci.sunucu.mac.faz === "tur"`, 40000);
  log("maç başladı");

    // ---- Takım Ultisi: GELİŞTİRME ile Takım Enerjisi 99,9 (bir sonraki doğal kazanç doldurur) ----
  const yerelA = await ev<number>(A.sayfa, `window.__lobi.agMaci.yerel`);
  await ev(A.sayfa, `(() => { window.__mac = window.__lobi.macEkrani; return 1; })()`);
  // A'nın sahadaki topacı Lv.3 olana kadar bekle (ödünç Lv.1 üyede Takım Ultisi kilitli), sonra Takım Enerjisi 99,9
  await bekleKosul(A.sayfa, `window.__lobi.agMaci.sunucu.mac.faz === "tur"`, 20000);
  const durum = `(() => { const d = window.__lobi.agMaci.sunucu; const t = d.topaclar[${yerelA}]; const tk = d.takimlar[${yerelA}]; return { faz: d.mac.faz, yf: t.yetenekFaz, yuva: t.yetenekYuva, kalan: t.yetenekKalan, te: d.takimEnerji[${yerelA}], tu: d.takimUltiKullanildi[${yerelA}], sv: d.seviye[${yerelA}], aktif: tk.aktif, elendi: tk.uyeler.map((u) => u.elendi) }; })()`;
  // dolum olayında çizim durur (bant + yuva 4 hazır görünür), ekran görüntüsünden sonra sürer
  await ev(A.sayfa, `(() => { window.__mac.olaydaDur(["takimEnerjiDoldu"], 1, ${yerelA}); return 1; })()`);
  await ev(A.sayfa, `window.__lobi.agMaci.gonder("gTakimEnerji", { miktar: 99.9 })`);
  await bekleKosul(A.sayfa, `!!window.__mac.durmaOlayi && window.__mac.durdu`, 30000);
  kayit["takimHazir"] = await ev(A.sayfa, `({ bant: document.querySelector(".mh .bant").textContent, yuva4: document.querySelectorAll(".mh .yv")[3].dataset.durum, te: window.__lobi.agMaci.sunucu.takimEnerji })`);
  await foto(A.sayfa, "takim-ultisi-hazir");
  // telegraf: A'nın yetenekBasladi olayında 12 kare sonra çizim durur; kademe 4 değilse sürdür (bot uygun anda atar)
  for (let k = 0; k < 30; k++) {
    await ev(A.sayfa, `(() => { window.__mac.devam(); window.__mac.olaydaDur(["yetenekBasladi"], 12, ${yerelA}); return 1; })()`);
    try { await bekleKosul(A.sayfa, `!!window.__mac.durmaOlayi && window.__mac.durdu`, 30000); } catch { kayit["takimTelegrafBekleme"] = await ev(A.sayfa, durum); break; }
    const o = await ev<{ kademe: number }>(A.sayfa, `window.__mac.durmaOlayi`);
    if (o.kademe === 4) break;
  }
  kayit["takimTelegraf"] = await ev(A.sayfa, durum);
  await foto(A.sayfa, "takim-ultisi-telegraf");
  await ev(A.sayfa, `(() => { window.__mac.devam(); return 1; })()`);
  // an: 0,8 s sonra (üç ruh sırayla belirdi, telegraf sonu / alan)
  await bekle(800);
  kayit["takimAn"] = await ev(A.sayfa, `({ siluet: window.__mac.gorselSayac.siluet, takimUlti: window.__mac.gorselSayac.takimUlti, bant: document.querySelector(".mh .bant").textContent, kullanildi: window.__lobi.agMaci.sunucu.takimUltiKullanildi })`);
  await Promise.all([foto(A.sayfa, "takim-ultisi-an"), foto(C.sayfa, "seyirci-takim-ultisi")]);

  kayit["seyirciTakimUlti"] = await ev(C.sayfa, `({ bant: window.__seyirci.hud ? document.querySelector(".sh .bant").textContent : "", gorulen: window.__seyirci.gorulen })`);
  // ---- 20 Node SDK seyircisi (oda adımı p95; seyirci girdisi yok) ----
  const { PROTOKOL_SURUMU } = await import("../src/ag/protokol.ts");
  const kalabalik = [];
  for (let k = 0; k < 20; k++) kalabalik.push(await new Client(TABAN.replace(/\/$/, "")).joinOrCreate("izle", { v: PROTOKOL_SURUMU, kod: link.slice(link.indexOf("=") + 1, link.indexOf("=") + 9) }));
  log(`20 SDK seyircisi bağlı (oda ${kalabalik[0]!.roomId})`);

  await bekleKosul(C.sayfa, `(() => { const s = window.__seyirci; return s && s.ag.sunucu && document.querySelector(".sh"); })()`, 20000);
  kayit["ilkDurum"] = await ev(A.sayfa, `(() => { const d = window.__lobi.agMaci.sunucu; return { faz: d.mac.faz, seviye: [...d.seviye], yerel: window.__lobi.agMaci.yerel }; })()`);
  const bantBas = Date.now();
  await bekle(2500);
  kayit["seyirciMac"] = await ev(C.sayfa, `(() => {
    const k = document.querySelector(".sh");
    const p = [...k.querySelectorAll(".pn")].map((x) => ({ ad: x.querySelector(".ad").textContent, yuzde: x.querySelector(".bar b").textContent, enerji: x.querySelectorAll(".en span").length }));
    const kartlar = [...k.querySelectorAll(".kart")].map((x) => ({ ust: x.querySelector(".ust").textContent, alt: x.querySelector(".alt").textContent, aktif: x.classList.contains("aktif") }));
    const kod = window.__seyirci.ag.durum.kod;
    const yuvalar = document.querySelectorAll(".yv").length;
    const ad = getComputedStyle(k.querySelector(".pn .ad")).fontSize, skor = getComputedStyle(k.querySelector(".skor")).fontSize, sure = getComputedStyle(k.querySelector(".sure")).fontSize, bant = getComputedStyle(k.querySelector(".bant")).fontSize;
    const kt = k.querySelector(".kartlar.sol").getBoundingClientRect();
    return { paneller: p, kartlar, odaKoduGizli: kod === "", yetenekYuvasi: yuvalar, yazi: { ad, skor, sure, bant }, kartY: [kt.top, kt.bottom], olcek: window.__seyirci.sahne ? null : null, canvas: [document.querySelector("canvas").width, document.querySelector("canvas").height] };
  })()`);
  await foto(C.sayfa, "seyirci-normal");
  await foto(D.sayfa, "seyirci-seffaf", true);
  kayit["seffafArkaPlan"] = await ev(D.sayfa, `({ body: getComputedStyle(document.body).backgroundColor, sinif: document.body.className })`);

  const bantSon = Date.now();
  kayit["seyirciBantKBs"] = +bant(C.bayt, bantBas0, bantSon).toFixed(2);
  log(`Takım Ultisi: ${JSON.stringify(kayit["takimAn"])}; seyirci bant ${kayit["seyirciBantKBs"]} KB/s`);

  // ---- maç doğal biter ----
  await bekleKosul(A.sayfa, `(() => { const ag = window.__lobi.agMaci; return !!(ag && ag.sunucu && ag.sunucu.mac.macSonucu); })()`, 200000);
  await bekle(2500);
  kayit["macSonucu"] = await ev(A.sayfa, `window.__lobi.agMaci.sunucu.mac.macSonucu`);
  kayit["seyirciSon"] = await ev(C.sayfa, `({ bant: document.querySelector(".sh .bant") ? document.querySelector(".sh .bant").textContent : "", sonVar: window.__seyirci.ag.durum.sonVar, puan: [window.__seyirci.ag.durum.sonPuan0, window.__seyirci.ag.durum.sonPuan1] })`);
  await foto(C.sayfa, "seyirci-mac-sonu");
  log(`maç bitti ${JSON.stringify(kayit["macSonucu"])}`);
  await Promise.all(kalabalik.map((s) => s.leave(true)));
  const olcum = await (await fetch(`${TABAN}api/olcum`)).json() as { oda: string; p95: number; odaP95: number; odaP99: number; seyirci: number }[];
  kayit["sunucuOlcum"] = olcum.filter((x) => x.oda === kod).pop() ?? null;
  log(`sunucu ölçüm ${JSON.stringify(kayit["sunucuOlcum"])}`);

  // ---- oyuncular ayrılır → seyirci "Sıradaki maç bekleniyor" + son skor ----
  await B.sayfa.goto(`${TABAN}?ekran=gizlilik`);
  await bekle(800);
  await foto(B.sayfa, "gizlilik");
  kayit["gizlilik"] = await ev(B.sayfa, `[...document.querySelectorAll(".bilgi h3")].map((h) => h.textContent)`);
  await B.sayfa.goto(`${TABAN}krediler`);
  await bekle(800);
  await foto(B.sayfa, "krediler");
  kayit["krediler"] = await ev(B.sayfa, `({ basliklar: [...document.querySelectorAll(".bilgi h3")].map((h) => h.textContent), alt: document.querySelector(".bilgi .yt").textContent })`);
  await A.sayfa.goto(`${TABAN}?ekran=ayarlar`);
  await bekle(1500);
  // oyuncular ayrıldı: oda (yeniden bağlanma süresi dolunca) kapanır → seyirci bekleme kartı + son skor
  await bekleKosul(C.sayfa, `document.querySelector(".sy .bekle").classList.contains("acik") && !!document.querySelector(".sy .bekle .son span")`, 60000);
  await bekle(500);
  kayit["seyirciArasi"] = await ev(C.sayfa, `document.querySelector(".sy .bekle").innerText`);
  await foto(C.sayfa, "seyirci-bekleme-son-skor");
  await foto(A.sayfa, "ayarlar");
  // ---- hesap silme (iki adım + şifre) ----
  await tikla(A.sayfa, "[data-eylem=hesap-sil]");
  await bekle(300);
  await ev(A.sayfa, `(() => { const i = document.querySelector("[data-hesap-sil] input[type=password]"); i.value = "test-sifre-1"; return 1; })()`);
  await foto(A.sayfa, "hesap-silme-onay");
  await tikla(A.sayfa, "[data-eylem=hesap-sil-onay]");
  await bekleKosul(A.sayfa, `location.search.includes("silindi")`, 15000);
  await bekle(800);
  kayit["hesapSilindi"] = await ev(A.sayfa, `({ metin: document.body.innerText.includes("Hesabın silindi."), ben: null })`);
  kayit["silinenGiris"] = await ev(A.sayfa, `fetch("/api/giris", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ ad: ${JSON.stringify(benA.oyuncu.ad)}, sifre: "test-sifre-1" }) }).then((r) => r.status)`);
  kayit["rakipGecmisi"] = await ev(B.sayfa, `fetch("/api/maclar", { credentials: "same-origin" }).then((r) => r.json()).then((j) => j.maclar[0])`);
  await foto(A.sayfa, "hesap-silindi");
  log(`hesap silindi; giriş ${kayit["silinenGiris"]}; rakip geçmişi ${JSON.stringify(kayit["rakipGecmisi"])}`);
} finally {
  kayit["konsolHata"] = Object.fromEntries(herkes.map((s) => [s.ad, s.hatalar]));
  kayit["sureSn"] = (Date.now() - t0) / 1000;
  writeFileSync(`${EKRAN}/D8-akis.json`, JSON.stringify(kayit, null, 1));
  for (const s of herkes) await s.tarayici.close();
}
console.log(JSON.stringify(kayit["konsolHata"]));
process.exit(0);
