import type { Depo } from "../db/depo.ts";

// A7 (docs/design/harita/02 § 7): kazı telemetrisinden şüpheli hesap raporu. Otomatik ceza YOK; insan bakar.
// Ölçüt: bir günde en az `enAzVurus` vuruş, isabet oranı ≥ %98 ve vuruş aralığı (sunucu ölçümü) standart sapması < 20 ms.

export const A7 = { isabetOrani: 0.98, aralikSapmaMs: 20, enAzVurus: 20 } as const;

export interface SupheliSatir { oyuncuId: number; ad: string | null; gun: number; vurus: number; isabetOrani: number; aralikOrtMs: number; aralikSapmaMs: number }

export function madenSupheliRaporu(d: Depo, sonra: number): SupheliSatir[] {
  const gruplar = new Map<string, { oyuncu: number; gun: number; isabet: number; araliklar: number[] }>();
  for (const r of d.madenTelemetri(sonra)) {
    const k = `${r.oyuncu_id}:${r.gun}`;
    const g = gruplar.get(k) ?? { oyuncu: r.oyuncu_id, gun: r.gun, isabet: 0, araliklar: [] };
    g.isabet += r.isabet;
    g.araliklar.push(r.sunucu_ms);
    gruplar.set(k, g);
  }
  const cikti: SupheliSatir[] = [];
  for (const g of gruplar.values()) {
    const n = g.araliklar.length;
    if (n < A7.enAzVurus) continue;
    const ort = g.araliklar.reduce((a, b) => a + b, 0) / n;
    const sapma = Math.sqrt(g.araliklar.reduce((a, b) => a + (b - ort) * (b - ort), 0) / n);
    const oran = g.isabet / n;
    if (oran >= A7.isabetOrani && sapma < A7.aralikSapmaMs) {
      cikti.push({ oyuncuId: g.oyuncu, ad: d.oyuncu(g.oyuncu)?.ad ?? null, gun: g.gun, vurus: n, isabetOrani: oran, aralikOrtMs: Math.round(ort), aralikSapmaMs: Math.round(sapma * 10) / 10 });
    }
  }
  return cikti.sort((a, b) => a.gun - b.gun || a.oyuncuId - b.oyuncuId);
}
