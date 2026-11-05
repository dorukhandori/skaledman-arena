import { ILERLEME } from "./ilerleme.ts";

// Ekonomi (tuning.md § 15-17, flint § 5, nile B-19, tide G-17): maç Altını, günlük sayaç, stil bonusu, azalan getiri,
// oda/bot çarpanı, minimum süre, aynı çift sınırı, başarım ödül rozeti, Yapay yenileme fiyatı, günün parçası.
// SAF: saat çağıran tarafından ms olarak verilir (sunucu duvar saati, sim dışı); burada Date yok.

export const EKONOMI = {
  galibiyetAltin: 100,
  maglubiyetAltin: 60,
  terkAltin: 0,
  /** günün ilk galibiyeti (gün 04:00'te sıfırlanır) */
  ilkGalibiyetGunluk: 150,
  /** stil bonusu (maç başına tavan 40) */
  stil: { yetenekleBitis: 10, farkliBitisTuru: 5, farkliBitisTavan: 15, takimUltisi: 25, macTavani: 40 },
  /** azalan getiri: günlük 1-15. maç ×1,0; 16-30. ×0,5; 31+. ×0,2 */
  azalanGetiri: [{ enCokMac: 15, carpan: 1 }, { enCokMac: 30, carpan: 0.5 }, { enCokMac: Infinity, carpan: 0.2 }] as readonly { enCokMac: number; carpan: number }[],
  odaCarpani: 0.25,
  /** nile B-19: boş kuyrukta bot maçı Altın yarı */
  botCarpani: 0.5,
  /** tide G-17 / O-4 (varsaydım): rakip teslim/hükmen → kalan oyuncu galibiyet + yarım Altın, başarım yok */
  rakipTerkCarpani: 0.5,
  minimumSureSn: 20,
  /** flint § 5: aynı iki hesap arasında günde 3 maçtan sonra Altın/başarım sayılmaz */
  ciftGunlukTavan: 3,
  /** gün sıfırlama: Türkiye saati (UTC+3, yaz saati yok) 04:00 */
  gunSaatDilimiSaat: 3,
  gunSifirlamaSaat: 4,
  /** § 16 */
  gununParcasiIndirim: 0.3,
  /** § 17 */
  yenilemeOrani: 0.4,
  asinmisIndirim: 0.5,
} as const;

/** Gün numarası (04:00 Türkiye saatinde değişir). `ms`: sunucu duvar saati (Unix ms). */
export function gunNo(ms: number): number {
  const E = EKONOMI;
  return Math.floor((ms + (E.gunSaatDilimiSaat - E.gunSifirlamaSaat) * 3_600_000) / 86_400_000);
}

/** Günün `n`. sayılan maçının (1'den) çarpanı. */
export function azalanGetiriCarpani(n: number): number {
  for (const d of EKONOMI.azalanGetiri) if (n <= d.enCokMac) return d.carpan;
  return EKONOMI.azalanGetiri[EKONOMI.azalanGetiri.length - 1]!.carpan;
}

export interface StilGirdisi {
  /** bu oyuncunun yetenekle (Yetenek / Özel / Ulti / alan) yaptığı bitiş sayısı */
  yetenekleBitis: number;
  /** bu oyuncunun bu maçta yaptığı farklı bitiş türü sayısı (Durma / Ring Out / Parçalanma) */
  farkliBitisTuru: number;
  takimUltisi: boolean;
}

export type AltinNedeni = "galibiyet" | "maglubiyet" | "terk" | "ilkGalibiyet" | "stilYetenek" | "stilBitis" | "stilTakimUltisi";
export interface AltinKalemi { neden: AltinNedeni; miktar: number }

/** Stil bonusu kalemleri (US-3.4): +10 yetenekle bitiş (maçta bir kez), +5 her farklı bitiş türü (≤ 15), +25 Takım Ultisi; toplam ≤ 40. */
export function stilBonusu(s: StilGirdisi): AltinKalemi[] {
  const S = EKONOMI.stil;
  const ham: AltinKalemi[] = [];
  if (s.yetenekleBitis > 0) ham.push({ neden: "stilYetenek", miktar: S.yetenekleBitis });
  if (s.farkliBitisTuru > 0) ham.push({ neden: "stilBitis", miktar: Math.min(S.farkliBitisTavan, s.farkliBitisTuru * S.farkliBitisTuru) });
  if (s.takimUltisi) ham.push({ neden: "stilTakimUltisi", miktar: S.takimUltisi });
  // tavan 40: sıra yetenek → bitiş → Takım Ultisi; aşan kalem kırpılır
  let kalan: number = S.macTavani;
  const sonuc: AltinKalemi[] = [];
  for (const k of ham) {
    const m = Math.min(k.miktar, kalan);
    if (m > 0) sonuc.push({ neden: k.neden, miktar: m });
    kalan -= m;
  }
  return sonuc;
}

export type AltinModu = "hizli" | "dereceli" | "oda" | "bot" | "antrenman";
export type AltinSonucu = "galibiyet" | "maglubiyet" | "terk" | "iptal" | "berabere";

export interface MacAltinGirdisi {
  mod: AltinModu;
  /** hesapsız (misafir) oyuncu */
  misafir: boolean;
  sonuc: AltinSonucu;
  /** galibiyet rakibin teslimi/hükmeni ile geldi (G-17: yarım Altın) */
  rakipTerk: boolean;
  sureSn: number;
  /** bugün bu maç dahil kaçıncı sayılan maç (1'den) */
  gunlukMacNo: number;
  /** bugün bu maçtan önce galibiyet yok */
  gununIlkGalibiyeti: boolean;
  /** bugün aynı iki hesap arasında bu maç dahil kaçıncı maç (bot / misafirde 1) */
  ciftGunlukMacNo: number;
  stil: StilGirdisi;
}

export type AltinSifirNedeni = "misafir" | "antrenman" | "iptal" | "kisaMac" | "ciftTavani" | "terk";
export interface MacAltini {
  /** ham kalemler (çarpan öncesi) */
  kalemler: AltinKalemi[];
  /** uygulanan çarpanlar (gösterim) */
  carpanlar: { ad: "azalanGetiri" | "oda" | "bot" | "rakipTerk"; deger: number }[];
  toplam: number;
  sifirNedeni: AltinSifirNedeni | null;
}

/** Maç Altını (tuning § 15). Toplam tam sayı, en az 0; yuvarlama en sonda (Math.round). */
export function macAltini(g: MacAltinGirdisi): MacAltini {
  const E = EKONOMI;
  const sifir = (n: AltinSifirNedeni): MacAltini => ({ kalemler: [], carpanlar: [], toplam: 0, sifirNedeni: n });
  if (g.misafir) return sifir("misafir");
  if (g.mod === "antrenman") return sifir("antrenman");
  if (g.sonuc === "iptal") return sifir("iptal");
  if (g.sonuc === "terk") return sifir("terk");
  if (g.sureSn < E.minimumSureSn) return sifir("kisaMac");
  if (g.ciftGunlukMacNo > E.ciftGunlukTavan) return sifir("ciftTavani");
  const kalemler: AltinKalemi[] = [];
  if (g.sonuc === "galibiyet") kalemler.push({ neden: "galibiyet", miktar: E.galibiyetAltin });
  else kalemler.push({ neden: "maglubiyet", miktar: E.maglubiyetAltin }); // berabere = mağlubiyet geliri (varsaydım)
  if (g.sonuc === "galibiyet" && g.gununIlkGalibiyeti) kalemler.push({ neden: "ilkGalibiyet", miktar: E.ilkGalibiyetGunluk });
  // teslim/hükmen ile gelen galibiyette stil yok (sayaç işlemez)
  if (!g.rakipTerk) kalemler.push(...stilBonusu(g.stil));
  const carpanlar: MacAltini["carpanlar"] = [];
  const ag = azalanGetiriCarpani(g.gunlukMacNo);
  if (ag !== 1) carpanlar.push({ ad: "azalanGetiri", deger: ag });
  if (g.mod === "oda") carpanlar.push({ ad: "oda", deger: E.odaCarpani });
  if (g.mod === "bot") carpanlar.push({ ad: "bot", deger: E.botCarpani });
  if (g.rakipTerk && g.sonuc === "galibiyet") carpanlar.push({ ad: "rakipTerk", deger: E.rakipTerkCarpani });
  let carpan = 1;
  for (const c of carpanlar) carpan *= c.deger;
  const ham = kalemler.reduce((a, k) => a + k.miktar, 0);
  return { kalemler, carpanlar, toplam: Math.max(0, Math.round(ham * carpan)), sifirNedeni: null };
}

// ---- başarım ödül rozeti (tuning § 15: Kolay 100 · Orta 300 · Zor 800 · Efsane 1500) ----
export type Zorluk = "kolay" | "orta" | "zor" | "efsane";
export const ZORLUK_AD: Record<Zorluk, string> = { kolay: "Kolay", orta: "Orta", zor: "Zor", efsane: "Efsane" };
/** Veri `odulAltin` taşır (100/200/300/500/800/1500); rozet en yakın üst katmandan (varsaydım: 200 Orta, 500 Zor). */
export function zorluk(odulAltin: number): Zorluk {
  if (odulAltin <= 100) return "kolay";
  if (odulAltin <= 300) return "orta";
  if (odulAltin <= 800) return "zor";
  return "efsane";
}

// ---- Yapay yenileme (§ 17) ----
/** Dökümhane yenilemesi: fiyatın %40'ı; `asinmis` başarımı (yenileme-indirimi-50) ile %50 indirim. */
export function yenilemeFiyati(cekirdekFiyati: number, asinmisIndirimi: boolean): number {
  const E = EKONOMI;
  const f = cekirdekFiyati * E.yenilemeOrani * (asinmisIndirimi ? 1 - E.asinmisIndirim : 1);
  return Math.max(1, Math.round(f));
}
/** Yenilenebilir mi: Yapay Çekirdek ve ömrü tam değil. */
export function yenilenebilir(omur: number | null): boolean {
  return omur !== null && omur < ILERLEME.yapayOmur;
}

// ---- günün parçası (§ 16, US-3.3) ----
/** FNV-1a 32 (metin → u32); deterministik, platform bağımsız. */
export function fnv32(metin: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < metin.length; i++) {
    h ^= metin.charCodeAt(i) & 0xffff;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Günün parçası: aday listesinden (dosya sırası) gün + sunucu tohumuyla bir tane; gün içinde sabit. */
export function gununParcasi(gun: number, tohum: string, adaylar: readonly string[]): string | null {
  if (!adaylar.length) return null;
  return adaylar[fnv32(`${tohum}:${gun}`) % adaylar.length]!;
}

/** Günün parçası indirimli fiyatı (%30, en yakın tam sayıya). */
export function indirimliFiyat(fiyat: number): number {
  return Math.round(fiyat * (1 - EKONOMI.gununParcasiIndirim));
}
