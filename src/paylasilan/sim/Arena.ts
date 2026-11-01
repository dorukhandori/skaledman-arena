import { AYAR } from "../kurallar/ayar.ts";
import type { Yon } from "../atlas.ts";

/** `gorsel`: yalnız sahne çizimi okur (kafatasi, omurga…); sim yok sayar. */
export interface DikdortgenEngel { tur: "dikdortgen"; x: number; z: number; yariGenislik: number; yariDerinlik: number; gorsel?: string }
export interface DaireEngel { tur: "daire"; x: number; z: number; yaricap: number; gorsel?: string }
export type Engel = DikdortgenEngel | DaireEngel;

export interface Dogum { x: number; z: number; yon: Yon }

/** Saha tanımı: x ∈ [−yariGenislik, yariGenislik], z ∈ [0, derinlik]. */
export interface Arena {
  id: string;
  ad: string;
  yariGenislik: number;
  derinlik: number;
  govdeYaricap: number;
  engeller: readonly Engel[];
  dogum: readonly Dogum[];
}

/** İlk arena İskeletler Diyarı (sahip, 2026-11-01; docs/design/arenalar/iskeletler-diyari.md). Değerler ayar.ts'te. */
export function varsayilanArena(): Arena {
  return {
    id: AYAR.saha.id,
    ad: AYAR.saha.ad,
    yariGenislik: AYAR.saha.yariGenislik,
    derinlik: AYAR.saha.derinlik,
    govdeYaricap: AYAR.saha.govdeYaricap,
    engeller: AYAR.saha.engeller.map((e) => ({ ...e })),
    dogum: AYAR.saha.dogum.map((d) => ({ x: d.x, z: d.z, yon: d.yon as Yon })),
  };
}
