import type { FusionKaydi, Tip } from "./kart.ts";
import { AYAR } from "./kurallar/ayar.ts";
import { type HamleKurali, yuvalariKur } from "./kurallar/hamleler.ts";
import { hareketHizi, hp, stat } from "./kurallar/statlar.ts";

/** Arenaya giren birim. Saf veri: simülasyon ve HUD aynı profili okur. */
export interface DovuscuProfili {
  id: string;
  fusionId: string;
  ad: string;
  sahip: string;
  shiny: boolean;
  tipler: Tip[];
  seviye: number;
  maxHp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  /** birim/s */
  hiz: number;
  /** 4 yuva; boş yuva null */
  yuvalar: (HamleKurali | null)[];
  /** Kart ağırlığı (hg). F0'da kullanılmıyor; knockback ölçeği için tutulur. */
  agirlik: number;
}

export function profilKur(kayit: FusionKaydi): DovuscuProfili {
  const { acilis, kart } = kayit;
  const s = kart.stats;
  const L = AYAR.seviye;
  return {
    id: acilis.id,
    fusionId: acilis.fusionId,
    ad: acilis.name,
    sahip: acilis.user,
    shiny: acilis.shiny,
    tipler: [...acilis.types],
    seviye: L,
    maxHp: hp(s.hp, L),
    atk: stat(s.atk, L),
    def: stat(s.def, L),
    spa: stat(s.spa, L),
    spd: stat(s.spd, L),
    hiz: hareketHizi(s.spe),
    yuvalar: yuvalariKur(kart.attacks, acilis.types),
    agirlik: kart.weight,
  };
}
