// Adlandırılmış geçersiz kılma yamaları ve süpürmeler. Her yama docs/design/tuning.md'deki bir öneriye karşılık gelir.
import type { Yama } from "./cekirdek.ts";
import { AILE_VARSAYILAN } from "../../src/paylasilan/kurallar/hamleler.ts";
import type { DovuscuProfili } from "../../src/paylasilan/dovuscu.ts";

/**
 * Cooldown = güç / D (saniye); poke ailesindeki ve temel vuruşta cooldown = güç / dPoke.
 * Amaç: "potansiyel güç/sn" aileler arası eşit (tasarım ilkesi: güçlü hamle daha sık değil, daha seyrek).
 */
export function gucCd(D: number, dPoke: number, alt = 0.3): (p: DovuscuProfili) => void {
  return (p) => {
    for (const h of p.yuvalar) {
      if (!h) continue;
      const d = h.aile === "poke" ? dPoke : D;
      h.cooldown = Math.max(alt, Math.round((h.guc / d) * 100) / 100);
    }
  };
}

export const YAMALAR: Record<string, Yama> = {
  mevcut: { ad: "mevcut (hasar 0,2)" },
  eski: { ad: "mevcut kurallar, eski arena", eskiArena: true },
  hasar1: { ad: "hasar 1,0", hasarCarpani: 1 },
  hasar015: { ad: "hasar 0,15", hasarCarpani: 0.15 },
  hasar03: { ad: "hasar 0,3", hasarCarpani: 0.3 },
  hasar05: { ad: "hasar 0,5", hasarCarpani: 0.5 },
  hitKeserKapali: { ad: "hitKeser=false", hitKeser: false },
  durumKapali: { ad: "durum şansı kapalı (Ateş/Elektrik)", durumCarpani: 0 },
  durum2x: { ad: "durum şansı x2", durumCarpani: 2 },
  sk07: { ad: "stat sıkıştırma 0,7", statSikistirma: 0.7 },
  sk05: { ad: "stat sıkıştırma 0,5", statSikistirma: 0.5 },
  sk035: { ad: "stat sıkıştırma 0,35", statSikistirma: 0.35 },
  poke12: { ad: "poke cd 1,2", aile: { poke: { cooldown: 1.2 } } },
  gc30: { ad: "cd=güç/30 (poke 40/0,6 aynı)", profil: gucCd(30, 67) },
  gc35: { ad: "cd=güç/35 (poke 40/0,6 aynı)", profil: gucCd(35, 67) },
  gc30p40: { ad: "cd=güç/30, poke güç/40 (temel 1,0 s)", profil: gucCd(30, 40) },
  gc30p30: { ad: "cd=güç/30, poke güç/30 (temel 1,33 s)", profil: gucCd(30, 30) },
  izoleGuc90: { ad: "sk0, etkinlik kapalı, tüm güçler 90 (aile/cd sabit)", statSikistirma: 0, ayar: { superEtkili: 1, azEtkili: 1 }, profil: (p) => { for (const h of p.yuvalar.slice(0, 2)) if (h) h.guc = 90; } },
  izoleAile: { ad: "sk0, etkinlik kapalı, tüm güçler 90, tüm aileler mermi", statSikistirma: 0, ayar: { superEtkili: 1, azEtkili: 1 }, profil: (p) => { for (const h of p.yuvalar.slice(0, 2)) if (h) { h.guc = 90; Object.assign(h, AILE_VARSAYILAN.mermi); } } },
  poke20: { ad: "poke cd 2,0", aile: { poke: { cooldown: 2.0 } } },
};

export const SUPURMELER: Record<string, Yama[]> = {
  hasar: [0.15, 0.2, 0.3, 0.5].map((c) => ({ ad: `hasar ${c}`, hasarCarpani: c })),
  bosluklar: [YAMALAR.mevcut!, YAMALAR.hitKeserKapali!, YAMALAR.durumKapali!, YAMALAR.durum2x!],
};

/** Ad (YAMALAR anahtarı) ya da satır içi JSON: --yama='{"ad":"x","aile":{"isin":{"aviso":"kisa"}}}' */
export function yamaCoz(girdi: string | undefined): Yama {
  if (!girdi) return YAMALAR.mevcut!;
  if (girdi.startsWith("{")) return JSON.parse(girdi) as Yama;
  const y = YAMALAR[girdi];
  if (!y) throw new Error(`bilinmeyen yama: ${girdi}; var olanlar: ${Object.keys(YAMALAR).join(", ")}`);
  return y;
}
