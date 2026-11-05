import { ELEMENT_CARKI } from "../../paylasilan/kurallar/ayar.ts";
import type { Ipucu } from "./ipuclari.ts";

// Pergel ipucu seçimi: saf işlevler (DOM yok, saat dışarıdan). Kurallar docs/ux/bilgic-pergel.md § 2-4.

export const ILK_BELIRME_MS = 1500;
export const GEZINTI_BEKLEME_MS = 1200;
export const OTOMATIK_ARA_MS = 45_000;
/** Bu kadar kısa sürede kapatılan balon "okunmadı" sayılır. */
export const OKUNDU_ESIK_MS = 2000;
export const OKUNMADAN_SUSMA = 3;

export type PergelModu = "acik" | "sorunca" | "kapali";

/** Atölye durumundan çıkarılan anlık görüntü; ipucu seçimi yalnız buna bakar. */
export interface AtolyeDurumu {
  /** Atölye'ye bu girişle kaçıncı ziyaret (1 = ilk) */
  ziyaret: number;
  takimEksik: number;
  oduncVar: boolean;
  /** Sahip olunan Çekirdeklerin seviyeleri */
  seviyeler: readonly number[];
  /** Kayıtlı takımın elementleri */
  takimElementleri: readonly string[];
  /** İlk Devir başarımı bu ziyarette yeni geldi (?mesaj=ilkdevir) */
  marketYeni: boolean;
  /** Son maç ring out ile kaybedildi; sunucu bu veriyi vermiyorsa undefined (tetik hiç çalışmaz) */
  sonMacRingOutKayip?: boolean;
}

function cark(e: string): number { return ELEMENT_CARKI.indexOf(e as (typeof ELEMENT_CARKI)[number]); }

/** Çarkta ardışık (yay) üç element. */
export function ucKomsuMu(elementler: readonly string[]): boolean {
  if (elementler.length !== 3) return false;
  const i = elementler.map(cark);
  if (i.some((x) => x < 0)) return false;
  const n = ELEMENT_CARKI.length;
  return i.some((b) => i.includes((b + 1) % n) && i.includes((b + 2) % n));
}

/** Takımda çarkta +3 karşıt çift var mı. */
export function zitCiftVarMi(elementler: readonly string[]): boolean {
  const n = ELEMENT_CARKI.length;
  const i = elementler.map(cark).filter((x) => x >= 0);
  return i.some((a) => i.includes((a + 3) % n));
}

export function kosulSagli(kosul: Ipucu["kosul"], d: AtolyeDurumu): boolean {
  switch (kosul) {
    case "ilk-ziyaret": return d.ziyaret <= 1;
    case "takim-eksik": return d.takimEksik > 0;
    case "odunc": return d.oduncVar;
    case "ulti-kilit": return d.seviyeler.some((s) => s < 3);
    case "ulti-acik": return d.seviyeler.some((s) => s >= 3);
    case "ring-out": return d.sonMacRingOutKayip === true;
    case "element-cark": return ucKomsuMu(d.takimElementleri);
    case "zitlik": return zitCiftVarMi(d.takimElementleri);
    case "market-acildi": return d.marketYeni;
    case "stamina": return d.ziyaret <= 3;
    case "ruh-ozel":
    case "lab": return true;
  }
}

const oncelikSirasi = (a: Ipucu, b: Ipucu): number => a.oncelik - b.oncelik;

/** Ekran açılınca kendiliğinden söylenecek ipucu. "stamina" yalnız başka aday yoksa (spec § 4). */
export function otomatikSec(liste: readonly Ipucu[], d: AtolyeDurumu, goruldu: ReadonlySet<string>): Ipucu | null {
  const aday = liste.filter((x) => x.otomatik && !goruldu.has(x.id) && kosulSagli(x.kosul, d)).sort(oncelikSirasi);
  return aday.find((x) => x.kosul !== "stamina") ?? aday[0] ?? null;
}

/** Oyuncu bir öğede durunca: o öğeye bağlı görülmemiş ipucu. */
export function gezintiSec(liste: readonly Ipucu[], hedef: NonNullable<Ipucu["hedef"]>, d: AtolyeDurumu, goruldu: ReadonlySet<string>): Ipucu | null {
  return liste.filter((x) => x.hedef === hedef && !goruldu.has(x.id) && kosulSagli(x.kosul, d)).sort(oncelikSirasi)[0] ?? null;
}

/** "Pergel'e sor": görülmemiş uygun sıradaki; hepsi görüldüyse rastgele eski. `rastgele` 0..1 döner. */
export function sorSec(liste: readonly Ipucu[], d: AtolyeDurumu, goruldu: ReadonlySet<string>, rastgele: () => number, hariç?: string): Ipucu | null {
  const uygun = liste.filter((x) => kosulSagli(x.kosul, d) && x.id !== hariç).sort(oncelikSirasi);
  const yeni = uygun.find((x) => !goruldu.has(x.id));
  if (yeni) return yeni;
  const havuz = uygun.length ? uygun : liste.filter((x) => x.id !== hariç);
  if (!havuz.length) return null;
  return havuz[Math.min(havuz.length - 1, Math.floor(rastgele() * havuz.length))] ?? null;
}

export interface OtomatikBaglam {
  mod: PergelModu;
  susturuldu: boolean;
  simdi: number;
  sonOtomatik: number | null;
  buZiyaretOtomatik: number;
}

/** Kendiliğinden konuşma izni: mod açık, sessizlik yok, ziyarette ilk, son kendiliğinden ipucundan ≥ 45 s. */
export function otomatikIzin(c: OtomatikBaglam): boolean {
  if (c.mod !== "acik" || c.susturuldu || c.buZiyaretOtomatik >= 1) return false;
  return c.sonOtomatik === null || c.simdi - c.sonOtomatik >= OTOMATIK_ARA_MS;
}

/** Balon kapatıldı: okunmadan kapatma sayacı güncellenir (okunduysa sıfırlanır) ve susma gerekir mi. */
export function kapatmaSonucu(oncekiOkunmadan: number, acikKalmaMs: number): { okunmadan: number; sus: boolean } {
  const okunmadan = acikKalmaMs < OKUNDU_ESIK_MS ? oncekiOkunmadan + 1 : 0;
  return { okunmadan, sus: okunmadan >= OKUNMADAN_SUSMA };
}
