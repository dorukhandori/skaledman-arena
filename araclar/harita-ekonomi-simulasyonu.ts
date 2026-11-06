/**
 * Harita / Maden / İşleme ekonomi simülasyonu (TASARIM PROTOTİPİ, üretim kodu değil).
 *
 * Kaynak sayılar: docs/design/harita/veri-taslak/{madenler,ustalik,tarifler,harita}.json
 * Çıktı: Markdown tablolar (stdout); docs/design/harita/06-ekonomi-ve-denge.md § 7'ye işlenir.
 * Çalıştırma: npx tsx araclar/harita-ekonomi-simulasyonu.ts [--gun 14] [--kosu 500] [--senaryo v1|tam]
 *
 * Model (06 § 7.1): oyuncu profilleri günde N harita maçı ve M kazı vuruşu dener; düğüm grafiği, kilit, yıldız,
 * damar kapasitesi, nadir damar, Ustalık eğrisi, öğrenme bandı, başarı formülü, günlük azalan getiri, eritme ve dövme
 * taslak veriden okunur. Maç sonucu sim koşmadan zarla (profil becerisi - zorluk) belirlenir. Tohumlu, tekrarlanabilir.
 * Paylaşılan sim'e ve sunucuya dokunmaz; yalnız okur ve yazdırır.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------- taslak veri türleri ----------
interface Kademe { kademe: number; id: string; ad: string; esik: number; verim: number; ilkSurum: boolean }
interface Ustalik {
  kumulatif: number[];
  ogrenmeBandi: { farkMax: number; carpan: number }[];
  basari: { taban: number; egim: number; tavan: number };
  madencilik: { xpBasari: number; xpBasarisiz: number };
  isleme: { xpEritme: number; xpDovme: Record<string, number> };
  gunluk: { vurusTam: number; vurusYarim: number; haritaMaciSayilan: number };
  isabet: { verimEk: number };
}
interface Tarif {
  id: string; tur: string; kademe: number; girdi: { kademe: number; kulce: number }[]; altin: number; esik: number;
  ilkSurum: boolean;
}
interface ParcaUretim { katmanMinKademe: Record<string, number>; katmanKulce: Record<string, number>; turCarpan: Record<string, number>; katmanIscilik: Record<string, number>; katmanEsikEk: Record<string, number>; xpParca: Record<string, number> }
interface Tarifler { parcaUretim: ParcaUretim; marketFiyat: { yeni: Record<string, number>; eski: Record<string, number> }; eritme: { oranTaban: number; oranUsta: number; ustaFarki: number; basarisizKayip: number }; ustaIsi: { farkTaban: number; bolen: number; tavan: number }; tarifler: Tarif[] }
interface Adet { kademe: number; adet: number }
interface Dugum {
  id: string; tur: "dusman" | "maden" | "sandik" | "patron"; komsu: string[]; sonrakiBolge?: string;
  zorluk?: number; yildiz?: string[]; kademe?: number; kapasite?: number; nadir?: { kademe: number; olasilik: number };
  odul?: { altinYildiz?: number; cevherYildiz?: Adet; altinIlk?: number; kulceIlk?: Adet; altin?: number; cevher?: Adet; tekrar?: { cevher: Adet } };
}
interface Bolge { id: string; no: number; ilkSurum: boolean; dugumler: Dugum[] }

const KOK = join(import.meta.dirname, "..", "docs", "design", "harita", "veri-taslak");
const oku = <T>(ad: string): T => JSON.parse(readFileSync(join(KOK, ad), "utf8")) as T;
const MADEN = oku<{ kademeler: Kademe[] }>("madenler.json").kademeler;
const UST = oku<Ustalik>("ustalik.json");
const TAR = oku<Tarifler>("tarifler.json");
const HARITA = oku<{ bolgeler: Bolge[] }>("harita.json").bolgeler;

// ---------- argümanlar ----------
const arg = (ad: string, vars: string): string => {
  const i = process.argv.indexOf(`--${ad}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : vars;
};
const GUN = Number(arg("gun", "14"));
const KOSU = Number(arg("kosu", "500"));
const SENARYO = arg("senaryo", "v1"); // v1: bölge 1-3, kademe 1-4 · tam: 6 bölge, 8 kademe
const CIKTI = arg("cikti", "");

// ---------- tohumlu rastgele (mulberry32) ----------
function rastgele(tohum: number): () => number {
  let a = tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- kurallar (08 § 4'te sunucu karşılıkları) ----------
const esik = (k: number): number => MADEN[k - 1]!.esik;
export function seviye(xp: number): number {
  let L = 0;
  while (L < 100 && xp >= UST.kumulatif[L + 1]!) L++;
  return L;
}
export function bant(fark: number): number {
  if (fark < 0) return 0;
  for (const b of UST.ogrenmeBandi) if (fark <= b.farkMax) return b.carpan;
  return 0;
}
export function basariSansi(U: number, E: number): number {
  const b = UST.basari;
  return Math.min(b.tavan, Math.max(b.taban, b.taban + b.egim * (U - E)));
}

// ---------- profiller ----------
interface Profil { ad: string; mac: number; vurus: number; isabet: number; beceri: number; digerAltin: number; yildizBeceri: number }
const PROFILLER: Profil[] = [
  { ad: "gündelik (≈10 dk/gün)", mac: 2, vurus: 15, isabet: 0.4, beceri: 0.55, digerAltin: 400, yildizBeceri: 0.35 },
  { ad: "aktif (≈25 dk/gün)", mac: 5, vurus: 40, isabet: 0.65, beceri: 0.65, digerAltin: 800, yildizBeceri: 0.5 },
  { ad: "tutkulu (≈45 dk/gün)", mac: 10, vurus: 60, isabet: 0.85, beceri: 0.72, digerAltin: 1300, yildizBeceri: 0.65 },
  { ad: "bot çiftliği (sınırsız deneme)", mac: 60, vurus: 1000, isabet: 1.0, beceri: 0.8, digerAltin: 0, yildizBeceri: 0.8 },
];

interface Hedef { katman: string; tur: string; baslangic: number }
interface Ayar { azalan: boolean; tavan: boolean; hedef?: Hedef }

interface Sonuc {
  madenEsikGunu: Map<number, number>; islemeEsikGunu: Map<number, number>; bolgeGunu: Map<number, number>;
  ilkTarifGunu: Map<string, number>; Umaden: number; Uisleme: number; cevherToplam: number; kulceToplam: number;
  haritaAltin: number; dovmeAltin: number; xpMadenToplam: number; vurusToplam: number; macToplam: number;
  craftGunu?: number; marketGunu?: number;
}

function kos(p: Profil, tohum: number, ayar: Ayar): Sonuc {
  const r = rastgele(tohum);
  const bolgeler = HARITA.filter((b) => SENARYO === "tam" || b.ilkSurum);
  const kademeTavan = SENARYO === "tam" ? 8 : 4;
  const tarifler = TAR.tarifler.filter((t) => t.tur !== "parca" && (SENARYO === "tam" || t.ilkSurum));
  const dugum = new Map<string, Dugum>();
  const bolgeNo = new Map<string, number>();
  for (const b of bolgeler) for (const d of b.dugumler) { dugum.set(d.id, d); bolgeNo.set(d.id, b.no); }
  const ilkDugum = (no: number): string => `b${no}-01`;
  const acik = new Set<string>([ilkDugum(1)]);
  const tamam = new Set<string>();
  const cevher = new Array<number>(9).fill(0);
  const kulce = new Array<number>(9).fill(0);
  const sahip = new Set<string>();
  let altinKum = 0;
  let iskaSerisi = 0;
  let xpM = 0, xpI = 0, altin = 0, haritaAltin = 0, dovmeAltin = 0, cevherToplam = 0, kulceToplam = 0, vurusToplam = 0, macToplam = 0;
  const s: Sonuc = {
    madenEsikGunu: new Map(), islemeEsikGunu: new Map(), bolgeGunu: new Map(), ilkTarifGunu: new Map(),
    Umaden: 0, Uisleme: 0, cevherToplam: 0, kulceToplam: 0, haritaAltin: 0, dovmeAltin: 0, xpMadenToplam: 0, vurusToplam: 0, macToplam: 0,
  };
  const ekle = (a: Adet | undefined, k = 1): void => {
    if (!a) return;
    const kd = Math.min(a.kademe, kademeTavan);
    cevher[kd]! += a.adet * k; cevherToplam += a.adet * k;
  };
  const tamamla = (id: string, gun: number): void => {
    if (tamam.has(id)) return;
    tamam.add(id);
    const d = dugum.get(id)!;
    for (const k of d.komsu) if (dugum.has(k)) acik.add(k);
    if (d.tur === "patron") {
      s.bolgeGunu.set(bolgeNo.get(id)!, gun);
      const sonraki = bolgeNo.get(id)! + 1;
      if (dugum.has(ilkDugum(sonraki))) acik.add(ilkDugum(sonraki));
    }
    if (d.tur === "sandik" && d.odul) { altin += d.odul.altin ?? 0; haritaAltin += d.odul.altin ?? 0; altinKum += d.odul.altin ?? 0; ekle(d.odul.cevher); }
  };
  // açılan maden ve sandıkları ziyaret et (maden: görülünce TAMAM; Ustalık ilerlemeyi kilitlemez)
  const ziyaret = (gun: number): void => {
    let degisti = true;
    while (degisti) {
      degisti = false;
      for (const id of acik) {
        const d = dugum.get(id)!;
        if (!tamam.has(id) && (d.tur === "maden" || d.tur === "sandik")) { tamamla(id, gun); degisti = true; }
      }
    }
  };

  for (let gun = 1; gun <= GUN; gun++) {
    if (ayar.hedef && gun === ayar.hedef.baslangic) { altinKum = 0; altin = 0; cevher.fill(0); kulce.fill(0); }
    altin += p.digerAltin; altinKum += p.digerAltin;
    // --- harita maçları ---
    let sayilan = 0;
    for (let m = 0; m < p.mac; m++) {
      ziyaret(gun);
      const hedefler = [...acik].map((id) => dugum.get(id)!).filter((d) => (d.tur === "dusman" || d.tur === "patron") && !tamam.has(d.id))
        .sort((a, b) => (a.zorluk ?? 0) - (b.zorluk ?? 0));
      const tekrar = hedefler.length === 0;
      let d = hedefler[0];
      if (!d) {
        const biten = [...tamam].map((id) => dugum.get(id)!).filter((x) => x.tur === "dusman" || x.tur === "patron")
          .sort((a, b) => (b.zorluk ?? 0) - (a.zorluk ?? 0) || (bolgeNo.get(b.id)! - bolgeNo.get(a.id)!));
        d = biten[0];
      }
      if (!d) break;
      if (tekrar && sayilan >= UST.gunluk.haritaMaciSayilan) break; // ödül sayılmayan tekrarı akıllı oyuncu oynamaz
      macToplam++;
      const zor = d.zorluk ?? 1;
      const kazan = r() < Math.min(0.95, Math.max(0.15, p.beceri + 0.25 - 0.1 * zor));
      if (tekrar) {
        sayilan++;
        const a = kazan ? 50 : 30;
        altin += a; haritaAltin += a; altinKum += a;
        if (kazan) ekle(d.odul?.tekrar?.cevher);
        continue;
      }
      if (!kazan) { sayilan++; altin += 30; haritaAltin += 30; altinKum += 30; continue; }
      let yildiz = 1;
      for (let y = 1; y < (d.yildiz?.length ?? 1); y++) if (r() < p.yildizBeceri) yildiz++;
      const o = d.odul ?? {};
      const a = (o.altinIlk ?? 0) + (o.altinYildiz ?? 0) * yildiz;
      altin += a; haritaAltin += a; altinKum += a;
      ekle(o.cevherYildiz, yildiz);
      if (o.kulceIlk) { kulce[Math.min(o.kulceIlk.kademe, kademeTavan)]! += o.kulceIlk.adet; kulceToplam += o.kulceIlk.adet; }
      tamamla(d.id, gun);
    }
    ziyaret(gun);

    // --- maden ---
    const kalan = new Map<string, number>();
    const nadirSlot = new Map<string, number>();
    for (const id of acik) {
      const d = dugum.get(id)!;
      if (d.tur !== "maden") continue;
      kalan.set(id, d.kapasite ?? 6);
      if (d.nadir && r() < d.nadir.olasilik) nadirSlot.set(id, Math.floor(r() * (d.kapasite ?? 6)));
    }
    const hak = ayar.tavan ? Math.min(p.vurus, UST.gunluk.vurusYarim) : p.vurus;
    for (let v = 1; v <= hak; v++) {
      const U = seviye(xpM);
      // en iyi damar: kazılabilir, öğrenme bandı en yüksek, eşitlikte yüksek kademe
      let en: Dugum | undefined, enPuan = -1;
      for (const [id, k] of kalan) {
        if (k <= 0) continue;
        const d = dugum.get(id)!;
        const kd = Math.min(d.kademe ?? 1, kademeTavan);
        if (U < esik(kd)) continue;
        const puan = bant(U - esik(kd)) * 10 + kd;
        if (puan > enPuan) { enPuan = puan; en = d; }
      }
      if (!en) break;
      const kap = en.kapasite ?? 6;
      const slot = kap - kalan.get(en.id)!;
      kalan.set(en.id, kalan.get(en.id)! - 1);
      let kd = Math.min(en.kademe ?? 1, kademeTavan);
      if (nadirSlot.get(en.id) === slot && en.nadir) {
        const nk = Math.min(en.nadir.kademe, kademeTavan);
        if (U >= esik(nk)) kd = nk;
      }
      const carpan = !ayar.azalan || v <= UST.gunluk.vurusTam ? 1 : 0.5;
      const E = esik(kd);
      const b = bant(U - E);
      vurusToplam++;
      if (iskaSerisi >= 3 || r() < basariSansi(U, E)) {
        iskaSerisi = 0;
        const isabet = r() < p.isabet ? UST.isabet.verimEk : 0;
        const ver = Math.max(1, Math.floor((MADEN[kd - 1]!.verim + isabet) * carpan));
        cevher[kd]! += ver; cevherToplam += ver;
        xpM += UST.madencilik.xpBasari * b * carpan;
      } else {
        iskaSerisi++;
        xpM += UST.madencilik.xpBasarisiz * b * carpan;
      }
    }

    // --- işleme: eritme (yüksekten aşağı) ---
    for (let k = kademeTavan; k >= 1; k--) {
      for (;;) {
        const U = seviye(xpI);
        const E = esik(k);
        if (U < E) break;
        const oran = U - E >= TAR.eritme.ustaFarki ? TAR.eritme.oranUsta : TAR.eritme.oranTaban;
        if (cevher[k]! < oran) break;
        const b = bant(U - E);
        if (r() < basariSansi(U, E)) {
          cevher[k]! -= oran; kulce[k]! += 1; kulceToplam++;
          xpI += UST.isleme.xpEritme * oran * b;
        } else {
          cevher[k]! -= TAR.eritme.basarisizKayip;
          xpI += (UST.isleme.xpEritme * oran * b) / 2;
        }
      }
    }
    // --- hedef parça (craft) ---
    if (ayar.hedef && gun >= ayar.hedef.baslangic && s.craftGunu === undefined) {
      const P = TAR.parcaUretim, h = ayar.hedef;
      const gerek = Math.ceil(P.katmanKulce[h.katman]! * P.turCarpan[h.tur]!);
      const U = seviye(xpI);
      for (let k = P.katmanMinKademe[h.katman]!; k <= kademeTavan; k++) {
        if (U >= esik(k) + P.katmanEsikEk[h.katman]! && kulce[k]! >= gerek && altin >= P.katmanIscilik[h.katman]!) {
          kulce[k]! -= gerek; altin -= P.katmanIscilik[h.katman]!; s.craftGunu = gun - h.baslangic + 1;
          xpI += P.xpParca[h.katman]! * bant(U - esik(k) - P.katmanEsikEk[h.katman]!);
          break;
        }
      }
    }
    if (ayar.hedef && gun >= ayar.hedef.baslangic && s.marketGunu === undefined && altinKum >= TAR.marketFiyat.yeni[ayar.hedef.katman]!) s.marketGunu = gun - ayar.hedef.baslangic + 1;
    // --- dövme: en ucuz, sahip olunmayan, karşılanabilir tarif ---
    for (;;) {
      if (ayar.hedef && gun >= ayar.hedef.baslangic && s.craftGunu === undefined) break;
      const U = seviye(xpI);
      const t = tarifler.filter((x) => !sahip.has(x.id) && U >= x.esik && x.altin <= altin && x.girdi.every((g) => kulce[g.kademe]! >= g.kulce))
        .sort((a, b) => a.altin - b.altin)[0];
      if (!t) break;
      for (const g of t.girdi) kulce[g.kademe]! -= g.kulce;
      altin -= t.altin; dovmeAltin += t.altin;
      sahip.add(t.id);
      if (!s.ilkTarifGunu.has(t.tur + "-" + t.kademe)) s.ilkTarifGunu.set(t.tur + "-" + t.kademe, gun);
      xpI += (UST.isleme.xpDovme[t.tur] ?? 0) * bant(U - t.esik);
    }

    const Um = seviye(xpM), Ui = seviye(xpI);
    for (const kd of MADEN) {
      if (Um >= kd.esik && !s.madenEsikGunu.has(kd.kademe)) s.madenEsikGunu.set(kd.kademe, gun);
      if (Ui >= kd.esik && !s.islemeEsikGunu.has(kd.kademe)) s.islemeEsikGunu.set(kd.kademe, gun);
    }
  }
  Object.assign(s, { Umaden: seviye(xpM), Uisleme: seviye(xpI), cevherToplam, kulceToplam, haritaAltin, dovmeAltin, xpMadenToplam: xpM, vurusToplam, macToplam });
  return s;
}

// ---------- özet ----------
const yuzde = (a: number[], q: number): number => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1) + 0.5))]!;
};
const gunMetni = (a: (number | undefined)[]): string => {
  const ulasan = a.filter((x): x is number => x !== undefined);
  if (ulasan.length < a.length / 2) return `— (%${Math.round((100 * ulasan.length) / a.length)})`;
  const tam = a.map((x) => x ?? 999);
  const f = (v: number): string => (v === 999 ? "—" : String(v));
  return `${f(yuzde(tam, 0.1))} / **${f(yuzde(tam, 0.5))}** / ${f(yuzde(tam, 0.9))}`;
};
const ort = (a: number[]): number => a.reduce((x, y) => x + y, 0) / a.length;

const satirlar: string[] = [];
const yaz = (x: string): void => { satirlar.push(x); };
yaz(`### Simülasyon: senaryo \`${SENARYO}\`, ${GUN} gün, profil başına ${KOSU} koşu (tohum 1..${KOSU})`);
yaz("");
const sonuclar = new Map<string, Sonuc[]>();
for (const p of PROFILLER) {
  const l: Sonuc[] = [];
  for (let i = 1; i <= KOSU; i++) l.push(kos(p, i * 7919 + p.ad.length, { azalan: true, tavan: true }));
  sonuclar.set(p.ad, l);
}
const kademeler = MADEN.filter((k) => SENARYO === "tam" || k.ilkSurum);
yaz("**Tablo A: Madencilik Ustalığı kademe eşiğine ulaşma günü** (p10 / **p50** / p90; `—` = ulaşamadı, parantezde ulaşan oranı)");
yaz("");
yaz(`| Profil | ${kademeler.map((k) => `K${k.kademe} (${k.esik})`).join(" | ")} |`);
yaz(`|---|${kademeler.map(() => "---").join("|")}|`);
for (const [ad, l] of sonuclar) yaz(`| ${ad} | ${kademeler.map((k) => gunMetni(l.map((s) => s.madenEsikGunu.get(k.kademe)))).join(" | ")} |`);
yaz("");
yaz("**Tablo B: İşleme Ustalığı kademe eşiğine ulaşma günü** (aynı biçim)");
yaz("");
yaz(`| Profil | ${kademeler.map((k) => `K${k.kademe} (${k.esik})`).join(" | ")} |`);
yaz(`|---|${kademeler.map(() => "---").join("|")}|`);
for (const [ad, l] of sonuclar) yaz(`| ${ad} | ${kademeler.map((k) => gunMetni(l.map((s) => s.islemeEsikGunu.get(k.kademe)))).join(" | ")} |`);
yaz("");
const bolgeSay = SENARYO === "tam" ? 6 : 3;
yaz("**Tablo C: bölge patronunu yenme günü** (p10 / **p50** / p90)");
yaz("");
yaz(`| Profil | ${Array.from({ length: bolgeSay }, (_, i) => `Bölge ${i + 1}`).join(" | ")} |`);
yaz(`|---|${Array.from({ length: bolgeSay }, () => "---").join("|")}|`);
for (const [ad, l] of sonuclar) yaz(`| ${ad} | ${Array.from({ length: bolgeSay }, (_, i) => gunMetni(l.map((s) => s.bolgeGunu.get(i + 1)))).join(" | ")} |`);
yaz("");
yaz(`**Tablo D: ${GUN}. gün sonu ortalamaları**`);
yaz("");
yaz("| Profil | Madencilik U (p50) | İşleme U (p50) | vuruş/gün | cevher/gün | külçe toplam | harita maçı/gün | harita Altın/gün | dövmeye harcanan Altın |");
yaz("|---|---|---|---|---|---|---|---|---|");
for (const [ad, l] of sonuclar) {
  yaz(`| ${ad} | ${yuzde(l.map((s) => s.Umaden), 0.5)} | ${yuzde(l.map((s) => s.Uisleme), 0.5)} | ${(ort(l.map((s) => s.vurusToplam)) / GUN).toFixed(1)} | ${(ort(l.map((s) => s.cevherToplam)) / GUN).toFixed(1)} | ${ort(l.map((s) => s.kulceToplam)).toFixed(0)} | ${(ort(l.map((s) => s.macToplam)) / GUN).toFixed(1)} | ${(ort(l.map((s) => s.haritaAltin)) / GUN).toFixed(0)} | ${ort(l.map((s) => s.dovmeAltin)).toFixed(0)} |`);
}
yaz("");
// bot / tutkulu oranı ve azalan getiri / tavan etkisi
const tut = sonuclar.get(PROFILLER[2]!.ad)!;
const bot = sonuclar.get(PROFILLER[3]!.ad)!;
const botTavansiz: Sonuc[] = [], botAzalansiz: Sonuc[] = [];
for (let i = 1; i <= KOSU; i++) {
  botTavansiz.push(kos(PROFILLER[3]!, i * 7919 + PROFILLER[3]!.ad.length, { azalan: true, tavan: false }));
  botAzalansiz.push(kos(PROFILLER[3]!, i * 7919 + PROFILLER[3]!.ad.length, { azalan: false, tavan: true }));
}
const oran = (a: Sonuc[], b: Sonuc[], f: (s: Sonuc) => number): string => (ort(a.map(f)) / ort(b.map(f))).toFixed(2);
yaz("**Tablo E: bot çiftliği sınırı** (bot ÷ tutkulu oyuncu, ortalama oranı; ≤ 1,25 hedef, H-H3)");
yaz("");
yaz("| Kural seti | cevher | Madencilik XP | külçe | harita Altın |");
yaz("|---|---|---|---|---|");
yaz(`| Taslak (azalan getiri + 60 vuruş tavanı + 10 sayılan harita maçı) | ${oran(bot, tut, (s) => s.cevherToplam)} | ${oran(bot, tut, (s) => s.xpMadenToplam)} | ${oran(bot, tut, (s) => s.kulceToplam)} | ${oran(bot, tut, (s) => s.haritaAltin)} |`);
yaz(`| Azalan getiri YOK (yalnız 60 tavan) | ${oran(botAzalansiz, tut, (s) => s.cevherToplam)} | ${oran(botAzalansiz, tut, (s) => s.xpMadenToplam)} | ${oran(botAzalansiz, tut, (s) => s.kulceToplam)} | ${oran(botAzalansiz, tut, (s) => s.haritaAltin)} |`);
yaz(`| Günlük tavan YOK (yalnız damar kapasitesi) | ${oran(botTavansiz, tut, (s) => s.cevherToplam)} | ${oran(botTavansiz, tut, (s) => s.xpMadenToplam)} | ${oran(botTavansiz, tut, (s) => s.kulceToplam)} | ${oran(botTavansiz, tut, (s) => s.haritaAltin)} |`);
yaz("");
yaz("**Tablo F: ilk dövme günü (p50) türe ve kademeye göre** (`—` = koşuların yarısından azında)");
yaz("");
const anahtarlar = [...new Set(tut.flatMap((s) => [...s.ilkTarifGunu.keys()]))].sort();
yaz(`| Profil | ${anahtarlar.join(" | ")} |`);
yaz(`|---|${anahtarlar.map(() => "---").join("|")}|`);
for (const [ad, l] of sonuclar) {
  yaz(`| ${ad} | ${anahtarlar.map((k) => {
    const g = l.map((s) => s.ilkTarifGunu.get(k));
    return g.filter((x) => x !== undefined).length < l.length / 2 ? "—" : String(yuzde(g.map((x) => x ?? 999), 0.5));
  }).join(" | ")} |`);
}
// ---------- Tablo G: craft ile Market (parça edinme günü) ----------
const HEDEF_TURLER: Omit<Hedef, "baslangic">[] = [
  { katman: "standart", tur: "cekirdek" }, { katman: "nadir", tur: "govde" }, { katman: "hizip", tur: "govde" }, { katman: "karanlik", tur: "uc" },
];
const BASLANGIC = Number(arg("hedefGun", SENARYO === "tam" ? "21" : "8"));
yaz("");
yaz(`**Tablo G: kilidi açılan bir parçayı edinme süresi (gün): craft ile / Market'ten** (p50; ${BASLANGIC}. günde kilit açılır ve birikim sıfırdan başlar; Market = o günden sonraki bütün Altın biriktirilirse; \`—\` = süre içinde yok)`);
yaz("");
yaz(`| Profil | ${HEDEF_TURLER.map((h) => `${h.katman} ${h.tur} (${TAR.marketFiyat.yeni[h.katman]} Altın)`).join(" | ")} |`);
yaz(`|---|${HEDEF_TURLER.map(() => "---").join("|")}|`);
for (const p of PROFILLER.slice(0, 3)) {
  const hucre = HEDEF_TURLER.map((h0) => {
    const h: Hedef = { ...h0, baslangic: BASLANGIC };
    const l: Sonuc[] = [];
    for (let i = 1; i <= Math.min(KOSU, 200); i++) l.push(kos(p, i * 104729 + h.katman.length, { azalan: true, tavan: true, hedef: h }));
    const c = l.map((x) => x.craftGunu ?? 999), m = l.map((x) => x.marketGunu ?? 999);
    const f = (v: number): string => (v >= 999 ? "—" : String(v));
    const cp = yuzde(c, 0.5), mp = yuzde(m, 0.5);
    const oranMetni = cp < 999 && mp < 999 ? ` (×${(mp / cp).toFixed(1)})` : mp >= 999 && cp < 999 ? ` (Market > ${GUN - BASLANGIC + 1} gün)` : "";
    return `${f(cp)} / ${f(mp)}${oranMetni}`;
  });
  yaz(`| ${p.ad} | ${hucre.join(" | ")} |`);
}
const metin = satirlar.join("\n");
console.log(metin);
if (CIKTI) writeFileSync(CIKTI, metin + "\n");
