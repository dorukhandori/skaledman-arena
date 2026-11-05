import { z } from "zod";
import type { Depo } from "../db/depo.ts";

// TEMIZLIK #5: `/api/ben` son maç özeti (Pergel `ring-out` ipucu, azalan ipucu sıklığı). Kaynak `mac` tablosu;
// tur sonuçları `bitis_turleri` telemetri sütunundan (MacOdasi → ozetSayaci.turlar, kazanan = taraf indeksi).

const TurlarSema = z.array(z.object({ tur: z.string(), kazanan: z.number(), sn: z.number() }));

export const SonMacSema = z.object({
  /** maç bitiş nedeni (`MacBitisNedeni`: puan, tukenme, aniOlum, teslim, hukmen, …) */
  neden: z.string(),
  kazandi: z.boolean(),
  /** son turun bitiş türü (ringOut, durma, parcalanma, berabere); tur kaydı yoksa null */
  bitis: z.string().nullable(),
  /** son tur oyuncunun aleyhine ring out ile bitti ve maç kaybedildi */
  ringOutKayip: z.boolean(),
  /** maç bitiş zamanı (ms; eski satırlarda başlangıç) */
  zaman: z.number(),
  /** oyuncunun biten (iptal olmayan) maç sayısı */
  macSayisi: z.number().int().nonnegative(),
});
export type SonMac = z.infer<typeof SonMacSema>;

export function sonMacOzeti(d: Depo, oyuncuId: number): SonMac | null {
  const m = d.sonMaclar(oyuncuId, 1)[0];
  if (!m) return null;
  const taraf = m.a === oyuncuId ? 0 : 1;
  let turlar: z.infer<typeof TurlarSema> = [];
  try { turlar = m.bitis_turleri ? TurlarSema.parse(JSON.parse(m.bitis_turleri)) : []; } catch { turlar = []; }
  const son = turlar[turlar.length - 1];
  const kazandi = m.kazanan === oyuncuId;
  return SonMacSema.parse({
    neden: m.bitis_nedeni,
    kazandi,
    bitis: son?.tur ?? null,
    ringOutKayip: !kazandi && m.bitis_nedeni !== "iptal" && son?.tur === "ringOut" && son.kazanan === 1 - taraf,
    zaman: m.bitis ?? m.baslangic,
    macSayisi: d.bitenMacSayisi(oyuncuId),
  });
}
