import { oku, sakla } from "../hesap.ts";

// Pergel'in hatırladıkları (docs/ux/bilgic-pergel.md § 2.9). Görülen ipuçları + ziyaret sayısı oyuncu kimliğiyle
// anahtarlı localStorage'da; "oturum" şeyleri (son kendiliğinden ipucu, susma) sessionStorage'da. Depolama
// erişilemezse bellekte tutulur, hata gösterilmez.

interface Kayit { goruldu: string[]; ziyaret: number }

const bellek = new Map<string, string>();
function oturumOku(k: string): string | null {
  try { return sessionStorage.getItem(k) ?? bellek.get(k) ?? null; } catch { return bellek.get(k) ?? null; }
}
function oturumYaz(k: string, v: string): void {
  bellek.set(k, v);
  try { sessionStorage.setItem(k, v); } catch { /* kapalı */ }
}

const anahtar = (oyuncuId: number) => `devran.pergel.v1.${oyuncuId}`;

export function kayitOku(oyuncuId: number): Kayit {
  try {
    const k = JSON.parse(oku(anahtar(oyuncuId)) ?? "null") as Partial<Kayit> | null;
    return {
      goruldu: Array.isArray(k?.goruldu) ? k.goruldu.filter((x): x is string => typeof x === "string") : [],
      ziyaret: typeof k?.ziyaret === "number" && k.ziyaret >= 0 ? Math.floor(k.ziyaret) : 0,
    };
  } catch { return { goruldu: [], ziyaret: 0 }; }
}
export function kayitYaz(oyuncuId: number, k: Kayit): void {
  sakla(anahtar(oyuncuId), JSON.stringify(k));
}

export interface Oturum { sonOtomatik: number | null; okunmadan: number; susturuldu: boolean }
export function oturumOkuPergel(): Oturum {
  const s = oturumOku("devran.pergel.oturum");
  try {
    const o = JSON.parse(s ?? "null") as Partial<Oturum> | null;
    return { sonOtomatik: typeof o?.sonOtomatik === "number" ? o.sonOtomatik : null, okunmadan: Number(o?.okunmadan) || 0, susturuldu: o?.susturuldu === true };
  } catch { return { sonOtomatik: null, okunmadan: 0, susturuldu: false }; }
}
export function oturumYazPergel(o: Oturum): void { oturumYaz("devran.pergel.oturum", JSON.stringify(o)); }
