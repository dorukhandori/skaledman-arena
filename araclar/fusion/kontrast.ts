// Kontrast güvencesi: soluk (açık tonlu) ya da koyu-düz paletli kartlarda gölgelendirme okunur kalsın diye
// birleştirilmiş sayfaların parlaklık yayılımını (p5–p95) sanatçının kart resminin yayılımına yaklaştırır:
// hedef = kart aralığının %80'i, [70, 130] arasında (kart verilmezse 80).
//
// Neden sonradan, sayfalar üzerinde? Palet eşleme (palet.ts) gövde ve baş için ayrı çalışır; PMD gövdesinin
// 3-4 kademeli gölgesi sanatçının dar paletindeki tek-iki renge çökünce açık kartlarda en koyu dolgu 152'ye
// (kartta 72) oturuyor, koyu kartlarda tüm dolgu 68–102 bandına sıkışıyor. Sonucu doğrudan ölçüp tek bir eğriyle
// düzeltmek gövdeyi ve başı aynı oranda ayarlar ve "kartın en az %80'i kadar kontrast" garantisi verir.
//
// Eğri tek yönlü ve monotondur (parlaklık sırası korunur): l' = çapa + (l - çapa) × katsayı.
// Çapa, açık kartlarda p95 (koyular aşağı çekilir, beyazlar bozulmaz), koyu kartlarda p5 (açıklar yukarı çıkar),
// ortada medyandır. Çizgi (koyu) ve beyaz (göz/parıltı) pikselleri dokunulmaz. Katsayı üst sınırı kartın
// özgün görünümünü korur; çizgiye yakınlık sınırı koyu dolgunun dış çizgiyle karışmasını engeller.
import type { Resim } from "./resim.ts";
import { beyazMi, cizgiMi, parlaklik, type Rgb } from "./palet.ts";

/** Kart resmi verilmezse p5–p95 parlaklık farkının ulaşması istenen alt sınır (0–255 ölçeği). */
export const HEDEF_ARALIK = 80;
/** Hedef = kart aralığı × bu oran, [HEDEF_EN_AZ, HEDEF_EN_COK] içinde. */
export const KART_ORANI = 0.8;
export const HEDEF_EN_AZ = 70;
export const HEDEF_EN_COK = 130;
/** Eğrinin en çok ne kadar açabileceği: kartın kendi gölge oranları 2,5 katını geçmesin. */
export const EN_COK_KATSAYI = 2.5;
/** En koyu dolgu, çizgi parlaklığının en az bu kadar üstünde kalır. */
export const CIZGIYE_EN_AZ_FARK = 38;
const EN_PARLAK_DOLGU = 242;
const ACIK_MEDYAN = 140;
const KOYU_MEDYAN = 100;
const EN_AZ_KATSAYI = 1.05;

export interface KontrastPlani { capa: number; katsayi: number; hedef: number; once: Yuzdelikler }

export interface Yuzdelikler { p5: number; p50: number; p95: number }

/** Dolgu piksellerinin (çizgi ve beyaz hariç) parlaklık yüzdelikleri; dolgu yoksa null. */
export function dolguYuzdelikleri(sayfalar: readonly Resim[]): Yuzdelikler | null {
  const hist = new Float64Array(256);
  let toplam = 0;
  for (const r of sayfalar) {
    for (let i = 0; i < r.g * r.y * 4; i += 4) {
      if (r.veri[i + 3]! < 128) continue;
      const c: Rgb = [r.veri[i]!, r.veri[i + 1]!, r.veri[i + 2]!];
      if (cizgiMi(c) || beyazMi(c)) continue;
      hist[Math.round(parlaklik(c))]!++;
      toplam++;
    }
  }
  if (toplam === 0) return null;
  const yuzde = (q: number): number => {
    let kum = 0;
    for (let l = 0; l < 256; l++) { kum += hist[l]!; if (kum >= q * toplam) return l; }
    return 255;
  };
  return { p5: yuzde(0.05), p50: yuzde(0.5), p95: yuzde(0.95) };
}

export function hedefAralik(kart: Yuzdelikler | null): number {
  return kart ? Math.max(HEDEF_EN_AZ, Math.min(HEDEF_EN_COK, Math.round((kart.p95 - kart.p5) * KART_ORANI))) : HEDEF_ARALIK;
}

/**
 * Sayfaların parlaklık dağılımına bakıp gerekli eğriyi çıkarır; yayılım yeterliyse null (dokunma).
 * `kart`: sanatçının kart resminin yüzdelikleri (dolguYuzdelikleri([kartResmi])).
 */
export function kontrastPlanla(sayfalar: readonly Resim[], cizgi: Rgb, kart: Yuzdelikler | null = null): KontrastPlani | null {
  const y = dolguYuzdelikleri(sayfalar);
  if (!y) return null;
  const hedef = hedefAralik(kart);
  const aralik = y.p95 - y.p5;
  if (aralik >= hedef) return null;
  const capa = y.p50 >= ACIK_MEDYAN ? y.p95 : y.p50 <= KOYU_MEDYAN ? y.p5 : y.p50;
  let k = Math.min(EN_COK_KATSAYI, hedef / Math.max(aralik, 1));
  // alt sınır: p5 çapadan aşağıdaysa çizgiye yaklaşmasın; üst sınır: p95 çapadan yukarıdaysa beyaza taşmasın
  if (capa > y.p5) k = Math.min(k, (capa - (parlaklik(cizgi) + CIZGIYE_EN_AZ_FARK)) / (capa - y.p5));
  if (y.p95 > capa) k = Math.min(k, (EN_PARLAK_DOLGU - capa) / (y.p95 - capa));
  return k < EN_AZ_KATSAYI ? null : { capa, katsayi: k, hedef, once: y };
}

/** Eğriyi bir sayfaya yerinde uygular (çizgi/beyaz dokunulmaz; renk sapması: üç kanala aynı parlaklık farkı). */
export function kontrastUygula(r: Resim, plan: KontrastPlani): void {
  const onbellek = new Map<number, number>();
  for (let i = 0; i < r.g * r.y * 4; i += 4) {
    if (r.veri[i + 3]! < 128) continue;
    const a = (r.veri[i]! << 16) | (r.veri[i + 1]! << 8) | r.veri[i + 2]!;
    let b = onbellek.get(a);
    if (b === undefined) {
      const c: Rgb = [(a >> 16) & 255, (a >> 8) & 255, a & 255];
      if (cizgiMi(c) || beyazMi(c)) b = a;
      else {
        const d = plan.capa + (parlaklik(c) - plan.capa) * plan.katsayi - parlaklik(c);
        const k = (v: number): number => Math.max(0, Math.min(255, Math.round(v + d)));
        b = (k(c[0]) << 16) | (k(c[1]) << 8) | k(c[2]);
      }
      onbellek.set(a, b);
    }
    r.veri[i] = (b >> 16) & 255; r.veri[i + 1] = (b >> 8) & 255; r.veri[i + 2] = b & 255;
  }
}
