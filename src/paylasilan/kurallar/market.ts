import { BASARIMLAR, PARCALAR } from "../veri/katalog.ts";
import { MARKET_FIYAT } from "../veri/harita.ts";
import type { Basarim, Parca } from "../veri/semalar.ts";
import { indirimliFiyat } from "./ekonomi.ts";

// Market kataloğu ve kilit durumu (03 US-3.1..3.3, tuning § 16, nile B-9, B-34): dört raf (Çekirdekler / Gövdeler /
// Diskler / Uçlar) + tezgâh alt başlığı (lore flavor), kilit üç hâl (Açık / Kilitli-görünür / Gizli), günün parçası
// adayları. SAF; sunucu satın almayı buna göre doğrular, istemci aynı kuralla gösterir. ERİTME YOK (nile § 0).

export type RafTuru = "cekirdek" | "govde" | "disk" | "uc";
export interface Raf { tur: RafTuru; ad: string; tezgah: string; tezgahNotu: string }

/** Raf → tezgâh (US-3.2; UI'da yalnız alt başlık). Yapay yenileme Dökümhane'dedir. */
export const RAFLAR: readonly Raf[] = [
  { tur: "cekirdek", ad: "Çekirdekler", tezgah: "Kraterci", tezgahNotu: "Devran Birliği · göktaşı ve maden çekirdekleri" },
  { tur: "govde", ad: "Gövdeler", tezgah: "Ocak", tezgahNotu: "Köklüler · ağır ve keskin gövdeler" },
  { tur: "disk", ad: "Diskler", tezgah: "Meydan Tezgâhı", tezgahNotu: "Meydan Ligi · gösteri diskleri" },
  { tur: "uc", ad: "Uçlar", tezgah: "Dökümhane", tezgahNotu: "Dökümhane · deneysel uçlar ve Yapay yenileme" },
];

export const KATMAN_FIYATI: Record<string, number> = { baslangic: 100, standart: 500, nadir: 2000, hizip: 4000, karanlik: 6000 };

/**
 * SAPMA (tuning § 16 / § 22, sahip 2026-11-06, harita 12 § 5): Market fiyatı `veri/market-fiyat.json`'dan. Kilitsiz
 * parçalar ücretsiz; kilitli katmanlar çarpanlı (craft asıl yol, Market pahalı kısayol). `parcalar.json` `fiyat` alanı
 * Yapay yenileme tabanı olarak kalır (KATALOG_OZETI değişmez).
 */
export function marketFiyati(p: Parca): number {
  if (MARKET_FIYAT.kilitsizUcretsiz && marketKilidi(p).kilit === "acik") return 0;
  return MARKET_FIYAT.katman[p.katman] ?? p.fiyat;
}
export const KATMAN_AD: Record<string, string> = { baslangic: "Başlangıç", standart: "Standart", nadir: "Nadir", hizip: "Hizip", karanlik: "Karanlık" };

/**
 * nile B-9 / K-10: tek Karanlık Çekirdek (Kül Çekirdeği) Market'te KİLİTLİ-GÖRÜNÜR; veri kilidi "Mor Çatlak" sürüm dışı
 * (ilkSurum false, Kararma ancak Karanlık Çekirdekle dolar: döngü). İlk sürüm kilidi açık şartlı "Elli Galibiyet"
 * (B-9 "50 galibiyet türü"). Veri dosyası değişmez; geçersiz kılma tek yerde, burada. (SAPMA, D7 raporu.)
 */
export const KILIT_GECERSIZ: Readonly<Record<string, { kilit: string; gorunum: "acik" | "kilitli-gorunur" | "gizli" }>> = {
  "kul-cekirdegi": { kilit: "elli-galibiyet", gorunum: "kilitli-gorunur" },
};

export interface MarketKilidi { kilit: string; gorunum: "acik" | "kilitli-gorunur" | "gizli" }
export function marketKilidi(p: Parca): MarketKilidi {
  return KILIT_GECERSIZ[p.id] ?? { kilit: p.kilit, gorunum: p.gorunum };
}

export function basarimBul(id: string): Basarim | undefined {
  return BASARIMLAR.find((b) => b.id === id);
}

/** Rafın ürünleri (dosya sırası). 27 parçanın her biri tam bir rafta. */
export function rafUrunleri(tur: RafTuru): Parca[] {
  return PARCALAR.parcalar.filter((p) => p.tur === tur);
}

export type MarketDurumKodu = "sahip" | "acik" | "kilitli" | "gizli";
export interface MarketDurumu {
  durum: MarketDurumKodu;
  /** görünen ad ("???" gizlide) */
  ad: string;
  /** kilit başarımı (kilitli/gizli) */
  basarim: { id: string; ad: string; ilerleme: number; sayi: number } | null;
  /** kart etiketi: "150 Altın" · "Kilitli: Kor Ustası 3/10" · "???" · "Sende" */
  etiket: string;
  /** odak / ekran okuyucu metni: ad + fiyat + kilit koşulu (ux § 6.4) */
  okunan: string;
  /** kilit bu oyuncu için açıldı mı (başarım tamamlandı; "Market'te açıldı") */
  basarimlaAcildi: boolean;
}

export interface OyuncuMarketBilgisi {
  sahipAdet: number;
  /** tamamlanan başarımlar */
  tamamlanan: ReadonlySet<string>;
  ilerleme: Readonly<Record<string, number>>;
}

/** Parçanın bu oyuncu için Market durumu. Kilitli parça yalnız başarım açıldıktan sonra satın alınır (§ 16). */
export function marketDurumu(p: Parca, o: OyuncuMarketBilgisi, fiyat = marketFiyati(p)): MarketDurumu {
  const k = marketKilidi(p);
  const b = k.kilit !== "acik" ? basarimBul(k.kilit) : undefined;
  const acildi = k.kilit === "acik" || o.tamamlanan.has(k.kilit);
  const bb = b ? { id: b.id, ad: b.ad, ilerleme: Math.min(b.sart.sayi, o.ilerleme[b.id] ?? 0), sayi: b.sart.sayi } : null;
  if (o.sahipAdet > 0) return { durum: "sahip", ad: p.ad, basarim: bb, etiket: "Sende", okunan: `${p.ad}. Sende.`, basarimlaAcildi: !!b && acildi };
  if (!acildi && k.gorunum === "gizli") {
    return { durum: "gizli", ad: "???", basarim: null, etiket: "???", okunan: "Gizli parça. Gizli bir başarımla açılır.", basarimlaAcildi: false };
  }
  if (!acildi) {
    const m = bb ? `Kilitli: ${bb.ad} ${bb.ilerleme}/${bb.sayi}` : "Kilitli";
    return { durum: "kilitli", ad: p.ad, basarim: bb, etiket: m, okunan: `${p.ad}. ${fiyat} Altın. ${m}.`, basarimlaAcildi: false };
  }
  return { durum: "acik", ad: p.ad, basarim: bb, etiket: `${fiyat} Altın`, okunan: `${p.ad}. ${fiyat} Altın.${b ? ` ${b.ad} ile açıldı.` : ""}`, basarimlaAcildi: !!b };
}

/**
 * Günün parçası adayları (§ 16): SAPMA sonrası kilitsiz parçalar ücretsiz olduğundan adaylar fiyatı olan (kilitli,
 * başarımla açılan) parçalar; dosya sırası. Gizli parça aday değil (ipucu vermez).
 */
export function gununParcasiAdaylari(): string[] {
  return PARCALAR.parcalar.filter((p) => marketFiyati(p) > 0 && marketKilidi(p).gorunum !== "gizli").map((p) => p.id);
}

/** Satış fiyatı: günün parçasıysa %30 indirimli. */
export function satisFiyati(p: Parca, gununParcasi: string | null): number {
  const f = marketFiyati(p);
  return p.id === gununParcasi ? indirimliFiyat(f) : f;
}

export type SatinAlmaReddi = "yok" | "marketKapali" | "sahip" | "kilitli" | "yetersiz";
/** Satın alma kuralı (saf): sunucu işlem içinde bakiyeyle yeniden çağırır. */
export function satinAlmaDenetle(p: Parca | undefined, o: OyuncuMarketBilgisi & { bakiye: number; marketAcik: boolean }, fiyat: number): SatinAlmaReddi | null {
  if (!p) return "yok";
  if (!o.marketAcik) return "marketKapali";
  const d = marketDurumu(p, o, fiyat);
  if (d.durum === "sahip") return "sahip";
  if (d.durum === "kilitli" || d.durum === "gizli") return "kilitli";
  if (o.bakiye < fiyat) return "yetersiz";
  return null;
}
