import { AYAR } from "../../paylasilan/kurallar/ayar.ts";

// Game feel reçetesi (05 § 3.2) + erişilebilirlik sınırları (ux § 6.2 / tide-ux G-27). Yalnız istemci [süs].
// Süreler ms, sarsıntı = tepe px (mantıksal), trauma = sqrt(px / Sahne.sarsintiTavan).
// Sınırlar: hitstop ≤ 100 ms (bitiş ≤ 166); son 300 ms'de hitstop varsa yenisi %50 (kritik ve bitiş hariç);
// tam ekran flaş ≤ %25 alfa, ≥ 50 ms, saniyede ≤ 3.

export type Siddet = "yok" | "hafif" | "agir" | "kritik";

export const HIS = {
  esik: AYAR.temasEsik,
  hitstopMs: { hafif: 33, agir: 66, kritik: 100, zitEk: 16, dashTaban: 66, dashEk: 33, tavan: 100, bitisTavan: 166 },
  hitstopPencereMs: 300,
  hitstopPencereCarpani: 0.5,
  sarsintiPx: { hafif: 1.5, agir: 4, kritik: 7, dash: 5, duvar: 2, ringOut: 8, parcalanma: 10 },
  zitSarsintiCarpani: 1.2,
  /** topaç tint flaşı, kare */
  tintKare: { hafif: 2, agir: 3, kritik: 3 },
  /** squash [normal boyunca, dik] */
  squash: { hafif: [0.9, 1.1], agir: [0.8, 1.2], kritik: [0.7, 1.3], dash: [0.75, 1.25], duvar: [0.85, 1.15] },
  squashMs: { hafif: 80, agir: 120, kritik: 160, duvar: 100 },
  parcacik: { hafif: 8, agir: 18, kritik: 24, duvar: 8, ringOut: 20, parcalanma: 40, durma: 6, dash: 6 },
  zitParcacikCarpani: 1.25,
  /** şok çemberi: ms, sayı */
  sok: { agirMs: 220, kritikMs: 260, ringOutMs: 320, parcalanmaMs: 360 },
  zoom: { agir: [0.03, 0.15], kritik: [0.05, 0.2], ringOut: [0.06, 0.4], parcalanma: [0.08, 0.5], durma: [0.04, 0.6], dash: [0.04, 0.15] },
  /** tam ekran flaş: [alfa, ms]; ≤ %25 (Parçalanma 05'te %40'tı, tide üst sınıra çekti) */
  ekranFlas: { kritik: [0.08, 50], ringOut: [0.25, 80], parcalanma: [0.25, 80] },
  ekranFlasEnAzMs: 50,
  ekranFlasSaniyedeEnCok: 3,
  ekranFlasAlfaTavani: 0.25,
  /** Parçalanma kesinleşince yavaş çekim (efekt saati) */
  yavasCekim: { carpan: 0.3, ms: 500 },
  /** hitstop sonrası görsel yetişme: kritik sönümlü, τ */
  yetismeTauMs: 60,
  /** yetişme farkı vMutlak · hitstop'u aşarsa atla (axiom #32) */
  hitstopTitremePx: 1,
} as const;

export function siddetBul(vn: number, dash: boolean): Siddet {
  if (vn < HIS.esik.hafif) return "yok";
  if (vn >= HIS.esik.kritik) return "kritik";
  if (vn >= HIS.esik.agir) return dash ? "kritik" : "agir";
  return "hafif";
}

/**
 * GU-E sürekli şiddet puanı (0..1,2): kıvılcım adedi/hızı/uzunluğu, flaş boyu, hitstop, sarsıntı, squash, yalpa ve ses
 * perdesi bununla ölçeklenir. Girdiler olaydan: `vn` normal hız, `hasarOran` en büyük hasar / tek vuruş tavanı,
 * `tikOran` en büyük dTik / tikTavan (0..1). Kademe (siddetBul) aynı kalır; puan kademenin İÇİNDE de değişir.
 */
export function siddetPuani(vn: number, hasarOran: number, tikOran: number, kritik: boolean, dash: boolean): number {
  const e = HIS.esik;
  const k = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
  let g = 0.7 * k((vn - e.hafif * 0.6) / (e.kritik - e.hafif * 0.6)) + 0.2 * k(hasarOran) + 0.1 * k(tikOran);
  if (kritik) g = Math.max(g, 0.85) + 0.15;
  if (dash) g += 0.1;
  return g < 0 ? 0 : g > 1.2 ? 1.2 : g;
}

/** Sürekli temas (sürtünme) akışı: hepsi istemci görseli; sim'in temas durumu okunur, yazılmaz. */
export const TEMAS = {
  /** merkezler arası ≤ 2r + bu (sim ayırması sonrası temas = tam 2r) */
  payPx: 2,
  /** temas bitince bu kadar s tolerans (tek karelik ayrılmalar akışı kesmesin) */
  toleransSn: 0.08,
  /** temas süresi rampası: guc çarpanı = taban + tavan·(1 − e^(−süre/τ)) */
  rampa: { taban: 0.35, tavan: 0.95, tauSn: 0.7 },
  /** saniyede kıvılcım: taban + egim·guc */
  oran: { taban: 8, egim: 130 },
  /** sürtünme sesi aralığı (s): taban − egim·guc */
  ses: { taban: 0.17, egim: 0.08, esik: 0.15 },
} as const;
