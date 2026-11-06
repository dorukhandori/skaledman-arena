import { type BasarimDegisimi, type BasarimGirdisi, basarimIsle } from "../../paylasilan/kurallar/basarim.ts";
import { basarimBul } from "../../paylasilan/kurallar/market.ts";
import { parcaBul } from "../../paylasilan/veri/katalog.ts";
import type { Depo } from "../db/depo.ts";

// Başarım yazımı (sunucu, D7): saf `basarimIsle` → `basarim` + `basarim_kume` satırları; tamamlanan başarımın Altın
// ödülü defterde `ref = basarim:<başarım>:<oyuncu>` (UNIQUE: ödül bir kez). Çağıran aynı SQLite işleminde çağırır
// (maç sonu `macSonuYaz`, satın alma, yenileme, eğitim). Market/Atölye kilidi tamamlanan başarımdan türetilir.

export interface BasarimBildirimi {
  id: string;
  /** gizli ve tamamlanmamışsa "???" (gizli başarım ilerlemesi gösterilmez) */
  ad: string;
  gizli: boolean;
  onceki: number;
  ilerleme: number;
  sayi: number;
  tamamlandi: boolean;
  odulAltin: number;
  /** tamamlandıysa Market'te açılan parçalar */
  acilanParcalar: { id: string; ad: string }[];
  acilanOzellik: string[];
  /** harita (05 § 4): açılan görünümler (arma/çerçeve; "AÇILDI" kartı) */
  acilanGorunum: string[];
}

export function bildirim(d: BasarimDegisimi): BasarimBildirimi | null {
  const b = basarimBul(d.id);
  if (!b) return null;
  if (b.gizli && !d.tamamlandi) return null; // gizli: ipucu yok, ilerleme bildirilmez
  return {
    id: b.id, ad: b.ad, gizli: b.gizli, onceki: d.onceki, ilerleme: d.ilerleme, sayi: d.sayi, tamamlandi: d.tamamlandi,
    odulAltin: d.tamamlandi ? b.odulAltin : 0,
    acilanParcalar: d.tamamlandi ? b.acilanParcalar.map((id) => ({ id, ad: parcaBul(id).ad })) : [],
    acilanOzellik: d.tamamlandi ? [...b.acilanOzellik] : [],
    acilanGorunum: d.tamamlandi ? [...b.acilanGorunum] : [],
  };
}

/** Değerlendir + yaz + ödüllendir (çağıranın işlemi içinde). Dönen: değişimler ve ödenen başarım Altını. */
export function basarimOlayiIsle(depo: Depo, oyuncuId: number, g: BasarimGirdisi, simdi: number): { degisimler: BasarimDegisimi[]; odul: number } {
  return depo.islem(() => {
    const degisimler = basarimIsle(g, depo.basarimKayitlari(oyuncuId));
    let odul = 0;
    for (const x of degisimler) {
      const yeni = depo.basarimYaz(oyuncuId, x.id, x.ilerleme, x.tamamlandi, simdi, x.yeniKume);
      if (yeni) {
        const b = basarimBul(x.id)!;
        if (b.odulAltin > 0 && depo.altinYaz(oyuncuId, b.odulAltin, "basarim", `basarim:${b.id}:${oyuncuId}`, simdi)) odul += b.odulAltin;
        for (const gr of b.acilanGorunum) depo.gorunumVer(oyuncuId, gr, false, simdi);
      }
    }
    return { degisimler, odul };
  });
}

/** Tamamlanan başarımlar (Market/Atölye kilit durumu). */
export function tamamlananlar(depo: Depo, oyuncuId: number): Set<string> {
  return new Set(depo.basarimSatirlari(oyuncuId).filter((b) => b.tamam === 1).map((b) => b.basarim_id));
}

export function ilerlemeler(depo: Depo, oyuncuId: number): Record<string, number> {
  const r: Record<string, number> = {};
  for (const b of depo.basarimSatirlari(oyuncuId)) r[b.basarim_id] = b.ilerleme;
  return r;
}

/** Başarımla açılan özellikler (takım yuvası 4/5, yenileme indirimi, Market). */
export function acikOzellikler(tamam: ReadonlySet<string>): Set<string> {
  const s = new Set<string>();
  for (const id of tamam) for (const o of basarimBul(id)?.acilanOzellik ?? []) s.add(o);
  return s;
}

/** Atölye takım tavanı: 3; "takim-yuvasi-4" (Üçlü) ile 4; "takim-yuvasi-5" ile 5 (veride henüz yok). */
export function takimTavani(tamam: ReadonlySet<string>): number {
  const o = acikOzellikler(tamam);
  return 3 + (o.has("takim-yuvasi-4") ? 1 : 0) + (o.has("takim-yuvasi-5") ? 1 : 0);
}
