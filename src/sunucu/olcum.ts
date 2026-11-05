import type { MacYonetimi } from "./mac/MacYonetimi.ts";

// Bütçe ölçümü (axiom § 3): oda adımı süresi. Son maçların özeti `/api/olcum` (yalnız geliştirme) ve sunucu günlüğü.

export interface OdaOlcumu { oda: string; adim: number; p50: number; p95: number; p99: number; enFazla: number;
  /** D8: oda adımı (sim + yama + seyirci yansıtma), ms; ölçüm anındaki seyirci sayısı */
  odaP50: number; odaP95: number; odaP99: number; seyirci: number; sayac: MacYonetimi["sayac"]; tick: number; sonHash: string }

const g = globalThis as unknown as { __devranOlcum?: OdaOlcumu[] };
g.__devranOlcum ??= [];
const son = g.__devranOlcum;

function yuzdelik(a: number[], p: number): number {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))]!;
}

export function olcumKaydet(oda: string, y: MacYonetimi, odaAdim: readonly number[] = [], seyirci = 0): void {
  const a = y.adimSureleri;
  const b = [...odaAdim];
  const o: OdaOlcumu = {
    oda, adim: a.length, p50: yuzdelik(a, 0.5), p95: yuzdelik(a, 0.95), p99: yuzdelik(a, 0.99),
    enFazla: a.reduce((m, x) => Math.max(m, x), 0), odaP50: yuzdelik(b, 0.5), odaP95: yuzdelik(b, 0.95), odaP99: yuzdelik(b, 0.99), seyirci, sayac: { ...y.sayac }, tick: y.dunya.tick, sonHash: y.kayit.sonHash,
  };
  const i = son.findIndex((x) => x.oda === oda && x.tick <= o.tick);
  if (i >= 0) son.splice(i, 1);
  son.push(o);
  if (son.length > 50) son.shift();
  console.log(`[olcum ${oda}] adım ${o.adim} p50 ${o.p50.toFixed(3)} ms p95 ${o.p95.toFixed(3)} ms p99 ${o.p99.toFixed(3)} ms en çok ${o.enFazla.toFixed(3)} ms · oda p95 ${o.odaP95.toFixed(3)} ms (seyirci ${o.seyirci}) · birleştirme ${o.sayac.birlestirme} borç ${o.sayac.borc} taşıma ${o.sayac.tasima} nötr ${o.sayac.notr} dondurma ${o.sayac.dondurma} hükmen ${o.sayac.hukmen}`);
}

export function olcumler(): OdaOlcumu[] {
  return [...son];
}
