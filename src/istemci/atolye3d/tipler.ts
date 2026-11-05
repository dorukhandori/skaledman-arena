import type { ElementAdi, KokenAdi } from "../../paylasilan/kurallar/ayar.ts";
import modelHam from "../../../veri/topac-model.json";
import type { GorunumDurumu, KatmanTuru } from "./durum.ts";
import type { Boya } from "./palet.ts";

// Atölye 3B ortak tipler (three.js'siz). Çizer iki türlü: "webgl" (Goruntuleyici.ts, tembel yüklenir) ya da "yedek"
// (Yedek2B.ts: topaç atlasının ilk karesinden 2B patlatılmış yığın; WebGL yoksa / bağlam kaybolursa).

export interface TopacKurulumu {
  cekirdek: string | null;
  govde: string | null;
  disk: string | null;
  uc: string | null;
  /** Gövde boyası = takılı Çekirdeğin Element'i (null: nötr gri) */
  element: ElementAdi | null;
  koken: KokenAdi | null;
  /** sol dönüş (kiral parçalar aynalanır, boşta ters döner) */
  sol: boolean;
}

/** Katmanın tuval pikseli cinsinden ekran konumu (etiket ve turuncu bağlantı çizgisi için). */
export interface KatmanKonumu { y: number; sol: number; sag: number; gorunur: boolean }

export type KatmanKonumlari = Record<KatmanTuru, KatmanKonumu>;

export interface Cizer {
  readonly tur: "webgl" | "yedek";
  /** tuval boyutu (sanat pikseli = mantıksal px) */
  boyut(w: number, h: number): void;
  /** kurulum değişti; `animasyon`: değişen katman uçup çıkar, yenisi iner */
  ayarla(k: TopacKurulumu, animasyon: boolean): void;
  durum(d: GorunumDurumu): void;
  /** üzerine gelinen katman (vurgu) */
  vurgu(t: KatmanTuru | null): void;
  hareketAz(az: boolean): void;
  konumlar(): KatmanKonumlari;
  /** tuval pikselinde tıklanan katman */
  sec(x: number, y: number): KatmanTuru | null;
  /** parça ikonu (tek kare, kontur dahil); hazır değilse null */
  ikon(parcaId: string, boya: Boya, boyut: number): HTMLCanvasElement | null;
  /** birleşik topaç ikonu (takım kartı) */
  topacIkonu(k: TopacKurulumu, boyut: number): HTMLCanvasElement | null;
  /** son karelerin CPU süresi (ms) */
  kareSureleri(): number[];
  yokEt(): void;
}

/**
 * GLB yükleme sözleşmesi (Mac hattı, docs/production/raporlar/ATOLYE3D.md § GLB): `public/topac/model/<parcaId>.glb`
 * ve kimlik `veri/topac-model.json` `glb` listesinde. Listede olmayan kimlik için istek atılmaz (404 / konsol hatası yok).
 */
export const GLB_LISTESI: ReadonlySet<string> = new Set((modelHam as { glb: string[] }).glb);
export const glbYolu = (id: string): string => `/topac/model/${encodeURIComponent(id)}.glb`;

export type ModelKaynagi = "glb" | "parametrik";

/** GLB varsa onu, yoksa ya da yükleme başarısızsa parametrik modeli seç (saf; yükleyici dışarıdan). */
export async function modelSec<T>(id: string, liste: ReadonlySet<string>, glbYukle: (url: string) => Promise<T>, parametrik: () => T): Promise<{ kaynak: ModelKaynagi; model: T }> {
  if (liste.has(id)) {
    try { return { kaynak: "glb", model: await glbYukle(glbYolu(id)) }; } catch { /* yedeğe düş */ }
  }
  return { kaynak: "parametrik", model: parametrik() };
}
