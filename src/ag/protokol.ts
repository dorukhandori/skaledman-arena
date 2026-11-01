import { z } from "zod";
import { AYAR } from "../paylasilan/kurallar/ayar.ts";
import type { Olay } from "../paylasilan/sim/durum.ts";

// Ağ katmanı: istemci ve sunucunun ORTAK sözleşmesi (docs/tech/netcode.md). Simülasyon değil: src/paylasilan
// Colyseus'a bağımlı olamaz (eslint kapısı), şemalar ve mesajlar bu klasörde durur. DOM ve Node API'si yok.

/** Her mesaj ve katılma seçeneği bu sürümü taşır; uyuşmazsa sunucu reddeder, istemci yok sayar. */
export const PROTOKOL_SURUMU = 1;

export const ODA_ADI = "arena";
/** Sabit adım (K-6) ve yama yayını (ADR-002). */
export const SIM_HZ = Math.round(1 / AYAR.dt);
export const YAMA_HZ = 20;
/** Kopan oyuncunun koltuğu bu kadar tutulur; durum korunur (dövüşçü boşta bekler). */
export const YENIDEN_BAGLANMA_SN = 10;
/** Gecikme telafisi en çok bu kadar geri sarar. */
export const GERI_SARMA_MS = 250;
/** Uzak dövüşçü ve mermiler bu kadar geriden ara değerlenir; telafi aynı sayıyı kullanır (SDK bağlar). */
export const ARA_DEGER_GECIKMESI_MS = 100;
/** Sunucu girdi tamponu bundan uzunsa bir adımda iki girdi birleştirerek tüketir (gecikme birikmesin). */
export const BIRIKME_ESIGI = 4;
/** Paket boşluğunda son hareket en çok bu kadar adım sürdürülür, sonra dövüşçü durur. */
export const BOSTA_TASIMA_ADIMI = 6;

/** Oda kodu: 6 harf, I ve O yok (1/0 ile karışmasın). */
export const ODA_KODU_HARFLERI = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const ODA_KODU_UZUNLUGU = 6;

export function odaKoduMu(s: string): boolean {
  return new RegExp(`^[${ODA_KODU_HARFLERI}]{${ODA_KODU_UZUNLUGU}}$`).test(s);
}

/** `rastgele` [0,1) üretir; sunucu Math.random verir (paylaşılan sim dışında). */
export function odaKoduUret(rastgele: () => number): string {
  let kod = "";
  for (let i = 0; i < ODA_KODU_UZUNLUGU; i++) kod += ODA_KODU_HARFLERI[Math.floor(rastgele() * ODA_KODU_HARFLERI.length)]!;
  return kod;
}

export const MESAJ = {
  /** sunucu → istemci: bir adımın sim olayları */
  olaylar: "olaylar",
  /** istemci → sunucu: maç bitti, yeniden oynamak istiyorum */
  rovans: "rovans",
} as const;

/** fusionId: "kafa.gövde" (Skaledman biçimi, ör. 251.443). */
const FUSION_ID = /^\d{1,4}\.\d{1,4}$/;

export const KatilmaSema = z.object({
  v: z.literal(PROTOKOL_SURUMU),
  takim: z.array(z.string().regex(FUSION_ID)).min(1).max(AYAR.takim.boyut),
  /** yalnız odayı kuran için: gecikme telafisi açık mı (deneme/A-B). Varsayılan açık. */
  telafi: z.boolean().optional(),
});
export type KatilmaSecenekleri = z.infer<typeof KatilmaSema>;

/** Gecikme telafisinin bir vuruştaki etkisi (tanı): canlı ile geri sarılmış hedef konumu arasındaki fark. */
export interface TelafiKaydi { kimden: number; kime: number; fark: number }

export interface OlayPaketi {
  v: number;
  /** sunucu adımı (Dunya.tick) */
  t: number;
  o: Olay[];
  g?: TelafiKaydi[];
}

export interface RovansMesaji { v: number }

/** Maç sonu nedeni: sim "ko"/"sure" verir; "terk" yalnız sunucuda (rakip 10 s içinde dönmedi). */
export type BitisNedeni = "ko" | "sure" | "terk";
