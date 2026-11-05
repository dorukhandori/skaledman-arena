import { randomInt } from "node:crypto";
import { ODA_KODU_HARFLERI, type OdaKoduDurumu, odaKoduUret } from "../ag/protokol.ts";
import { yayinKoduMu } from "./izleKayit.ts";

// Oda kodu defteri (süreç içi; tek VPS süreci): açık odalar ve süresi dolan/kapanan kodlar (1 saat hatırlanır),
// lobi hata metinleri için (ux § 7: geçersiz / dolu / süresi doldu). Kod = Colyseus roomId.

interface Kayit { dolu: () => boolean }
// globalThis'te: geliştirmede Vite sunucu modüllerini yeniden yüklerken HTTP ucu ile oda aynı defteri görsün
const g = globalThis as unknown as { __devranOdaDefteri?: { acik: Map<string, Kayit>; kapanan: Map<string, number> } };
g.__devranOdaDefteri ??= { acik: new Map(), kapanan: new Map() };
const { acik, kapanan } = g.__devranOdaDefteri;
const HATIRLAMA_MS = 60 * 60 * 1000;

export function yeniKod(): string {
  for (let n = 0; n < 1000; n++) {
    const k = odaKoduUret(() => randomInt(ODA_KODU_HARFLERI.length) / ODA_KODU_HARFLERI.length);
    if (!acik.has(k) && !kapanan.has(k) && !yayinKoduMu(k)) return k;
  }
  throw new Error("oda kodu üretilemedi");
}

export function kodAc(kod: string, dolu: () => boolean): void {
  acik.set(kod, { dolu });
}

export function kodKapat(kod: string): void {
  acik.delete(kod);
  kapanan.set(kod, Date.now());
  const simdi = Date.now();
  for (const [k, t] of kapanan) if (simdi - t > HATIRLAMA_MS) kapanan.delete(k);
}

export function kodDurumu(kod: string): OdaKoduDurumu {
  const a = acik.get(kod);
  if (a) return a.dolu() ? "dolu" : "acik";
  if (kapanan.has(kod)) return "suresiDoldu";
  return "yok";
}

export function acikOdaSayisi(): number {
  return acik.size;
}
