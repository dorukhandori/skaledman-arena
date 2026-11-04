// Netcode test matrisi (flint § 3, D4 kapısı N3): iki GERÇEK istemci (iki ayrı headless Chromium süreci), her biri
// kendi ağ simülatörü vekili üzerinden (araclar/ag-simulatoru.ts) dev sunucusuna bağlanır, oda koduyla eşleşir ve
// TAM MAÇI sonuna kadar oynar. OTOMATİK OYNANIŞ: A topacını paylaşılan "kenar" botu, B'yi "dolas" botu sürer
// (?oto=), girdiler gerçek istemci yolundan (tahmin + defineInput) gider. Ölçüm koşusunda çizim kapalıdır
// (?cizim=yok: headless yazılım GL 2-4 kare/sn verip ana iş parçacığını kilitliyor; mantık ve ağ aynı).
// Ölçülen: wire hash (her 60 adım, iki istemci), tarayıcıda yeniden oynatma hash'i (sunucu kaydı), uzlaşma sınıfları,
// görünür sıçrama, çarpışma olayı varış/işlenme gecikmesi, hayalet çarpma, bant (vekil bayt sayacı), sunucu adım p95.
// Önce: npm run dev. Çalıştır: npm run ag:matris [-- N0 N3 ...] [--kopma] [--ucuncu] [--bekleme]
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { AgSimulatoru, type AgProfili, simetrik } from "./ag-simulatoru.ts";
import { TABAN, bekle, bekleKosul, ev, hesapHazirla, istatistik, istemciAc, kayitDogrula, odayiKur, ozetAl, tikla, type Istemci } from "./ag-ortak.ts";

const CIKTI = "docs/production/raporlar/D4-ag-matris.json";
const arg = process.argv.slice(2);
const secili = arg.filter((a) => /^N\d$/.test(a));
/** --deney=40: istemcide 8 < fark ≤ 40 br yumuşak (atlama eşiği deneyi); sonuçlar "<profil>-d40" anahtarında */
const deney = Number((arg.find((a) => a.startsWith("--deney=")) ?? "").slice(8)) || 0;
const ekDeney = deney ? `&sicramaDeney=${deney}` : "";

const PROFILLER: Record<string, { a: AgProfili; b: AgProfili; not: string }> = {
  N0: { a: simetrik("N0", 0, 0, 0), b: simetrik("N0", 0, 0, 0), not: "temel" },
  N1: { a: simetrik("N1", 40, 5, 0), b: simetrik("N1", 40, 5, 0), not: "iyi" },
  N2: { a: simetrik("N2", 75, 20, 1), b: simetrik("N2", 75, 20, 1), not: "orta" },
  N3: { a: simetrik("N3", 150, 20, 2), b: simetrik("N3", 150, 20, 2), not: "kötü (zorunlu kapı)" },
  N4: { a: simetrik("N4", 250, 60, 5), b: simetrik("N4", 250, 60, 5), not: "aşırı" },
  N5: { a: simetrik("N5-A", 20, 30, 2), b: simetrik("N5-B", 200, 30, 2), not: "asimetrik: A 20 ms, B 200 ms" },
  N6: { a: { ...simetrik("N6", 30, 0, 0), patlama: { bas: 45000, sure: 2900 } }, b: { ...simetrik("N6", 30, 0, 0), patlama: { bas: 45000, sure: 2900 } }, not: "patlama: 30 ms + maç ortasında 2,9 sn %100 kayıp (iki yön)" },
};

interface Satir { profil: string; [k: string]: unknown }
const sonuclar: Record<string, unknown> = existsSync(CIKTI) ? JSON.parse(readFileSync(CIKTI, "utf8")) : {};
const kaydet = () => { mkdirSync("docs/production/raporlar", { recursive: true }); writeFileSync(CIKTI, JSON.stringify(sonuclar, null, 1)); };

async function sunucuOlcumu(kod: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(`${TABAN}api/olcum`);
    const l = (await r.json()) as { oda: string }[];
    return (l.filter((x) => x.oda === kod).pop() as Record<string, unknown> | undefined) ?? null;
  } catch { return null; }
}

function istemciSatiri(o: Record<string, any>, k: Awaited<ReturnType<typeof kayitDogrula>> | null): Record<string, unknown> {
  const u = o.uzlasma;
  const c = o.carpismalar || 0;
  return {
    wireHash: `${o.hashKarsilastirma - o.hashSapma}/${o.hashKarsilastirma}`, wireSapma: o.hashSapma,
    yenidenOynatma: k ? `${k.karsilastirma - k.sapma}/${k.karsilastirma} son ${k.sonEsit ? "eşit" : "FARKLI"}` : "yok", yenidenOynatmaSapma: k ? k.sapma + (k.sonEsit ? 0 : 1) : -1,
    uzlasma: u, buyukPer10: c ? (u.buyuk / c) * 10 : 0, sicramaPer10: c ? (u.sicrama / c) * 10 : 0, gorunurSicrama: o.gorunurSicrama,
    gorunurPer10: c ? (o.gorunurSicrama / c) * 10 : 0, carpismalar: c, varis: istatistik(o.varisMs), isleme: istatistik(o.tepkiMs),
    rtt: o.rttOrnek ? istatistik(o.rttOrnek) : null, hayalet: o.hayalet, ayirma: o.ayirma, yenidenOynatmaEnFazla: o.yenidenOynatmaEnFazla, yamalar: o.yamalar, kopma: o.kopma,
  };
}

async function macBitti(s: Istemci, ms: number): Promise<void> {
  await bekleKosul(s.sayfa, `(() => { const ag = window.__lobi && window.__lobi.agMaci; return !!(ag && ag.sunucu && ag.sunucu.mac.macSonucu); })()`, ms);
}

async function profilKos(ad: string): Promise<void> {
  const p = PROFILLER[ad]!;
  const vA = new AgSimulatoru(2611, TABAN, p.a);
  const vB = new AgSimulatoru(2612, TABAN, p.b);
  await vA.baslat(); await vB.baslat();
  const a = await istemciAc("A");
  const b = await istemciAc("B");
  const t0 = Date.now();
  try {
    const kod = await odayiKur(a, b, 2611, 2612, `oto=kenar&debug&cizim=yok&takim=0${ekDeney}`, `oto=dolas&debug&cizim=yok&takim=1${ekDeney}`);
    console.log(`[${ad}] oda ${kod}, maç başlıyor (${p.not})`);
    await bekleKosul(a.sayfa, `window.__lobi.asama === "mac"`, 30000);
    const macBas = Date.now();
    await macBitti(a, 200000); await macBitti(b, 20000);
    const macSure = (Date.now() - macBas) / 1000;
    await bekle(800);
    const [oa, ob] = [await ozetAl(a.sayfa), await ozetAl(b.sayfa)];
    const [ka, kb] = [await kayitDogrula(a.sayfa), await kayitDogrula(b.sayfa)];
    if (process.env.AG_IZ) writeFileSync(`/tmp/claude-0/-home-user-skaledman-arena/cff910d0-ad02-517f-b6da-6f5e134b1c9e/scratchpad/iz-${ad}.json`, JSON.stringify(await ev(a.sayfa, "window.__lobi.agMaci.buyukIz")));
    const so = await sunucuOlcumu(kod);
    const bantA = vA.bant().filter((x) => x.yol.includes(kod));
    const bantB = vB.bant().filter((x) => x.yol.includes(kod));
    const satir: Satir = {
      profil: ad, not: p.not + (deney ? ` · DENEY atlama eşiği ${deney} br` : ""), kod, macSureSn: macSure, sonuc: oa.sonuc, tick: oa.tick,
      A: istemciSatiri(oa.olcum as Record<string, any>, ka), B: istemciSatiri(ob.olcum as Record<string, any>, kb),
      sunucu: so, bantA, bantB, konsolHata: [...a.hatalar, ...b.hatalar], adimA: oa.adim, adimB: ob.adim,
    };
    sonuclar[deney ? `${ad}-d${deney}` : ad] = satir;
    kaydet();
    const A = satir.A as Record<string, any>;
    const B = satir.B as Record<string, any>;
    console.log(`[${ad}] bitti ${macSure.toFixed(0)} sn ${oa.sonuc?.neden} ${oa.sonuc?.puan.join("-")} · wire A ${A.wireHash} B ${B.wireHash} · oynatma A ${A.yenidenOynatma} B ${B.yenidenOynatma} · çarpışma ${A.carpismalar} · sıçrama/10 A ${A.sicramaPer10.toFixed(2)} B ${B.sicramaPer10.toFixed(2)} · varış p95 A ${A.varis.p95} B ${B.varis.p95} ms · sunucu p95 ${(so as any)?.p95?.toFixed?.(3)} ms · hata ${(satir.konsolHata as string[]).length}`);
  } finally {
    await a.tarayici.close(); await b.tarayici.close();
    await vA.kapat(); await vB.kapat();
    console.log(`[${ad}] toplam ${((Date.now() - t0) / 1000).toFixed(0)} sn`);
  }
}

/** Yeniden bağlanma (flint #10): aynı maçta B'nin bağlantısı 2 / 10 / 25 sn kesilir (N1 profili). */
async function kopmaKos(): Promise<void> {
  const prof = simetrik("N1", 40, 5, 0);
  const vA = new AgSimulatoru(2621, TABAN, prof);
  const vB = new AgSimulatoru(2622, TABAN, prof);
  await vA.baslat(); await vB.baslat();
  const a = await istemciAc("A");
  const b = await istemciAc("B");
  const satirlar: Record<string, unknown>[] = [];
  try {
    const kod = await odayiKur(a, b, 2621, 2622, "oto=kenar&debug&cizim=yok&takim=0", "oto=dolas&debug&cizim=yok&takim=1");
    await bekleKosul(a.sayfa, `window.__lobi.agMaci && window.__lobi.agMaci.sunucu && window.__lobi.agMaci.sunucu.mac.faz === "tur"`, 40000);
    await bekle(4000);
    for (const sn of [2, 10, 25]) {
      const once = await ozetAl(b.sayfa);
      if (once.sonuc) break;
      const oa0 = await ozetAl(a.sayfa);
      const t = Date.now();
      vB.kes(sn * 1000);
      // A'nın gördüğü: donma bandı (3 sn sonra) ve kalan sayaç
      let donmaGoruldu = false; let bantA = ""; let enCokDonmaKalan = 0; let bantB = "";
      while (Date.now() - t < sn * 1000 + 8000) {
        const x = await ozetAl(a.sayfa);
        const y = await ozetAl(b.sayfa);
        if (x.donma) { donmaGoruldu = true; enCokDonmaKalan = Math.max(enCokDonmaKalan, (x as any).olcum ? 0 : 0); }
        if (x.bant && !bantA) bantA = x.bant;
        if (x.bant.startsWith("Rakip bağlanıyor")) bantA = x.bant;
        if (y.bant && !bantB) bantB = y.bant;
        if (x.sonuc) break;
        if (Date.now() - t > sn * 1000 + 1500 && !x.donma && x.kopan < 0) break;
        await bekle(250);
      }
      const geriDonusMs = Date.now() - t;
      await bekle(2500); // en az bir hash (60 adım) daha
      const sa = await ozetAl(a.sayfa);
      const sb = await ozetAl(b.sayfa);
      const ob = sb.olcum as Record<string, any>;
      const o0 = once.olcum as Record<string, any>;
      satirlar.push({
        kesmeSn: sn, geriDonusVeyaSonucMs: geriDonusMs, donmaGoruldu, bantA, bantB,
        bYenidenBaglandi: ob.yenidenBaglanma - o0.yenidenBaglanma, bKopma: ob.kopma - o0.kopma,
        donustenSonraHash: `${(ob.hashKarsilastirma - o0.hashKarsilastirma) - (ob.hashSapma - o0.hashSapma)}/${ob.hashKarsilastirma - o0.hashKarsilastirma}`,
        aHash: `${(sa.olcum as any).hashKarsilastirma - (sa.olcum as any).hashSapma}/${(sa.olcum as any).hashKarsilastirma}`,
        aTickOnce: oa0.tick, aTickSonra: sa.tick, sonuc: sa.sonuc, odaFazB: sb.odaFaz, bBant: sb.bant,
      });
      console.log(`[kopma ${sn} sn]`, JSON.stringify(satirlar[satirlar.length - 1]));
      if (sa.sonuc) break;
      await bekle(3000);
    }
    const ka = await kayitDogrula(a.sayfa); // oda kapandıysa null
    sonuclar["kopma"] = { kod, satirlar, yenidenOynatmaA: ka, konsolHata: [...a.hatalar, ...b.hatalar] };
    kaydet();
  } finally {
    await a.tarayici.close(); await b.tarayici.close(); await vA.kapat(); await vB.kapat();
  }
}

/** Üçüncü bağlantı reddi (flint #19) + sekme gizli / AFK uyarısı (ux § 1.4). */
async function ucuncuKos(): Promise<void> {
  const a = await istemciAc("A");
  const b = await istemciAc("B");
  const c = await istemciAc("C");
  try {
    const kod = await odayiKur(a, b, null, null, "oto=kenar&debug&cizim=yok&takim=0", "oto=dolas&debug&cizim=yok&takim=1");
    await bekleKosul(a.sayfa, `window.__lobi.asama === "mac"`, 30000);
    const api = await (await fetch(`${TABAN}api/oda/${kod}`)).json();
    await hesapHazirla(c, null);
    await c.sayfa.goto(`${TABAN}?ekran=lobi&debug#oda=${kod}`);
    await bekleKosul(c.sayfa, `!!document.querySelector("[data-eylem=katil]")`, 20000);
    await tikla(c.sayfa, "[data-eylem=katil]");
    await bekleKosul(c.sayfa, `(document.querySelector(".lobi .hata") || {}).textContent`, 10000);
    const hata = await ev<string>(c.sayfa, `document.querySelector(".lobi .hata").textContent`);
    const gecersizAlan = await (async () => {
      await c.sayfa.goto(`${TABAN}?ekran=lobi&debug&yeni=1#oda=ZZZZ-ZZZZ`); // farklı URL: yalnız # değişirse sayfa yenilenmez
      await bekleKosul(c.sayfa, `!!document.querySelector("[data-eylem=katil]")`, 20000);
      await tikla(c.sayfa, "[data-eylem=katil]");
      await bekleKosul(c.sayfa, `(document.querySelector(".lobi .hata") || {}).textContent`, 10000);
      return ev<string>(c.sayfa, `document.querySelector(".lobi .hata").textContent`);
    })();
    // sekme gizli: B girdisi durur → sunucu 10 sn'de AFK uyarısı; görünür olunca "Oyuna dönüldü."
    await bekleKosul(b.sayfa, `window.__lobi.agMaci.sunucu && window.__lobi.agMaci.sunucu.mac.faz === "tur"`, 30000);
    await ev(b.sayfa, `(() => { Object.defineProperty(document, "hidden", { value: true, configurable: true }); Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); return 1; })()`);
    await bekle(300);
    const gizliBant = (await ozetAl(b.sayfa)).bant;
    await bekle(11500);
    const afk = await ev<unknown[]>(b.sayfa, `window.__lobi.agMaci.bilgiler.filter((x) => x.tur === "afkUyari")`);
    await ev(b.sayfa, `(() => { Object.defineProperty(document, "hidden", { value: false, configurable: true }); Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); return 1; })()`);
    await bekle(300);
    const donusBant = (await ozetAl(b.sayfa)).bant;
    await bekle(3000);
    const sonra = await ozetAl(b.sayfa);
    sonuclar["ucuncu"] = { kod, apiDurum: api, ucuncuHata: hata, gecersizKodHata: gecersizAlan, gizliBant, afkUyari: afk, donusBant, donustenSonraSonuc: sonra.sonuc, hashB: (sonra.olcum as any).hashKarsilastirma + "/" + (sonra.olcum as any).hashSapma, konsolHata: [...a.hatalar, ...b.hatalar, ...c.hatalar] };
    kaydet();
    console.log("[üçüncü]", JSON.stringify(sonuclar["ucuncu"]));
  } finally {
    await a.tarayici.close(); await b.tarayici.close(); await c.tarayici.close();
  }
}

/** Rakip 60 sn gelmezse oda kapanır; kod "süresi doldu" olur (flint #19, ux § 7). */
async function beklemeKos(): Promise<void> {
  const a = await istemciAc("A");
  try {
    await hesapHazirla(a, null);
    await a.sayfa.goto(`${TABAN}?ekran=lobi&debug`);
    await bekleKosul(a.sayfa, `!!document.querySelector("[data-eylem=oda-ac]")`, 20000);
    await tikla(a.sayfa, "[data-eylem=oda-ac]");
    await bekleKosul(a.sayfa, `!!document.querySelector("[data-kod]")`, 20000);
    const kod = await ev<string>(a.sayfa, `document.querySelector("[data-kod]").dataset.kod`);
    const t = Date.now();
    await bekleKosul(a.sayfa, `window.__lobi.asama === "giris"`, 75000);
    const sure = (Date.now() - t) / 1000;
    const hata = await ev<string>(a.sayfa, `document.querySelector(".lobi .hata").textContent`);
    const api = await (await fetch(`${TABAN}api/oda/${kod}`)).json();
    sonuclar["bekleme"] = { kod, kapanmaSn: sure, lobiMetni: hata, apiDurum: api, konsolHata: a.hatalar };
    kaydet();
    console.log("[bekleme]", JSON.stringify(sonuclar["bekleme"]));
  } finally { await a.tarayici.close(); }
}

const hepsi = !secili.length && !arg.includes("--kopma") && !arg.includes("--ucuncu") && !arg.includes("--bekleme");
for (const ad of hepsi ? Object.keys(PROFILLER) : secili) await profilKos(ad);
if (hepsi || arg.includes("--kopma")) await kopmaKos();
if (hepsi || arg.includes("--ucuncu")) await ucuncuKos();
if (hepsi || arg.includes("--bekleme")) await beklemeKos();
console.log(`yazıldı: ${CIKTI}`);
process.exit(0);
