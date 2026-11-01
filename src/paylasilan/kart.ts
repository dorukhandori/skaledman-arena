import { z } from "zod";

// Skaledman verisi (docs/research/skaledman-sayfa-analizi.md § 4.1). Paylaşılan kod: DOM/Node yok.

export const TIPLER = [
  "NORMAL", "FIRE", "WATER", "ELECTRIC", "GRASS", "ICE", "FIGHTING", "POISON", "GROUND",
  "FLYING", "PSYCHIC", "BUG", "ROCK", "GHOST", "DRAGON", "DARK", "STEEL", "FAIRY",
] as const;
export type Tip = (typeof TIPLER)[number];
export const TipSema = z.enum(TIPLER);

export const StatlarSema = z.object({
  hp: z.number(), atk: z.number(), def: z.number(), spa: z.number(), spd: z.number(), spe: z.number(),
});
export type Statlar = z.infer<typeof StatlarSema>;

export const SaldiriSema = z.object({ name: z.string(), type: TipSema, power: z.number() });
export type Saldiri = z.infer<typeof SaldiriSema>;

/** /api/kartlar kaydı (fusionId → kart). `v: 2` şema sürümü. */
export const KartSema = z.object({
  v: z.number(),
  stats: StatlarSema,
  category: z.string(),
  height: z.number(), // dm
  weight: z.number(), // hg
  ability: z.string(),
  attacks: z.array(SaldiriSema).min(1).max(2),
});
export type Kart = z.infer<typeof KartSema>;

const ParcaSema = z.object({ id: z.number().int(), name: z.string(), sprite: z.string().url() });

/** /api/history kaydı: bir kart açılışı. */
export const AcilisSema = z.object({
  id: z.string(),            // ULID
  fusionId: z.string(),      // "bas.govde"
  name: z.string(),
  head: ParcaSema,
  body: ParcaSema,
  sprite: z.string().url(),  // esas görsel (a/b alternatifleri olabilir)
  artists: z.array(z.string()),
  types: z.array(TipSema).min(1).max(2),
  category: z.string(),
  shiny: z.boolean(),
  hue: z.number(),
  user: z.string(),
  userId: z.number().int(),
  test: z.boolean(),
  at: z.string(),
});
export type Acilis = z.infer<typeof AcilisSema>;

export const KartlarSema = z.record(z.string(), KartSema);
export const GecmisSema = z.array(AcilisSema);

export function fusionParcalari(fusionId: string): { basDex: number; govdeDex: number } {
  const [b, g] = fusionId.split(".");
  return { basDex: Number(b), govdeDex: Number(g) };
}

/** Açılış + kart gövdesi birlikte: arenaya girecek birim. Kart gövdesi henüz dolmamış açılışlar elenir. */
export interface FusionKaydi { acilis: Acilis; kart: Kart }

export function fusionKayitlari(gecmis: unknown, kartlar: unknown): FusionKaydi[] {
  const g = GecmisSema.parse(gecmis);
  const k = KartlarSema.parse(kartlar);
  const sonuc: FusionKaydi[] = [];
  for (const acilis of g) {
    const kart = k[acilis.fusionId];
    if (kart) sonuc.push({ acilis, kart });
  }
  return sonuc;
}
