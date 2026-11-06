import { SURUM_KADEME_TAVANI, USTALIK, kademeBul, type MadenDugumu } from "../veri/harita.ts";
import { fnv32 } from "./ekonomi.ts";
import { bant, basariSansi } from "./ustalik.ts";

// Kazı (docs/design/harita/02, 08 § 6, 13 § 3.2): günlük çarpan (DİNÇ 1–40, 41–60 yarım, 61+ verimsiz), isabet
// doğrulama (±tolerans, faz, pencere), vuruş sonucu, nadir yuva sırası, USTA DAMAR. SAF: zar ve saat çağırandan gelir
// (sunucu `crypto.randomInt`, sunucu duvar saati). Sim'e girmez (G-0).

const G = USTALIK.gunluk;
const I = USTALIK.isabet;

/** Maden USTALAŞ eşiği (13 § 3.1): bu damardan ömür boyu başarılı vuruş. */
export const USTA_DAMAR_VURUS = 30;
/** USTA DAMAR ödülü: kapasite +1, nadir olasılığı +5 puan. */
export const USTA_DAMAR = { kapasiteEk: 1, nadirEk: 0.05 } as const;

export interface GunlukCarpan { verim: number; tecrube: number; dinc: boolean; verimsiz: boolean }
/** Günün `toplamOnce` vuruşundan sonraki vuruşun çarpanı (toplamOnce = bugüne kadar atılan vuruş sayısı). */
export function gunlukCarpan(toplamOnce: number): GunlukCarpan {
  if (toplamOnce < G.vurusTam) return { verim: 1, tecrube: 1, dinc: true, verimsiz: false };
  if (toplamOnce < G.vurusYarim) return { verim: 0.5, tecrube: 0.5, dinc: false, verimsiz: false };
  return { verim: G.tavanSonrasiCevher, tecrube: G.tavanSonrasiTecrube, dinc: false, verimsiz: true };
}

/** Damarın bugünkü kapasitesi ve nadir olasılığı (USTALAŞ → USTA DAMAR). */
export function damarKapasitesi(d: MadenDugumu, ustaDamar: boolean): { kapasite: number; nadirOlasilik: number } {
  return {
    kapasite: d.kapasite + (ustaDamar ? USTA_DAMAR.kapasiteEk : 0),
    nadirOlasilik: Math.min(1, d.nadir.olasilik + (ustaDamar ? USTA_DAMAR.nadirEk : 0)),
  };
}

/** Halka isabet penceresi (ms, periyot içinde): turun ortasında `pencereOran` genişliğinde yay. */
export function isabetPenceresi(): [number, number] {
  const P = I.periyotMs;
  const yari = (P * I.pencereOran) / 2;
  return [Math.round(P / 2 - yari), Math.round(P / 2 + yari)];
}

/** Halkanın faz konumu (0..periyot) t ms anında. */
export function halkaFazi(tMs: number, fazMs: number): number {
  const P = I.periyotMs;
  return (((tMs + fazMs) % P) + P) % P;
}

/**
 * İsabet doğrulama (A3): istemcinin bildirdiği `isabetMs` (vuruş penceresi başından geçen süre) sunucunun ölçtüğü
 * `gecenMs` ile ±tolerans içinde olmalı ve o andaki halka fazı isabet yayında olmalı. Gecikme yalnız +1 bonusu etkiler.
 */
export function isabetGecerli(isabetMs: number | null, gecenMs: number, fazMs: number, toleransMs: number = I.toleransMs): boolean {
  if (isabetMs === null) return false;
  if (Math.abs(isabetMs - gecenMs) > toleransMs) return false;
  const [bas, bit] = isabetPenceresi();
  const f = halkaFazi(isabetMs, fazMs);
  return f >= bas && f <= bit;
}

/**
 * Nadir yuva sırası (02 § 5): sunucu sırrı + oyuncu + gün + düğümden; gün içinde sabit (seans açıp kapamak yeniden
 * zar attırmaz). Tutmazsa null.
 */
export function nadirSira(sir: string, oyuncuId: number, gun: number, dugumId: string, olasilik: number, kapasite: number): number | null {
  const h = fnv32(`${sir}:${oyuncuId}:${gun}:${dugumId}`);
  if ((h % 10000) / 10000 >= olasilik) return null;
  return fnv32(`${h}:sira`) % kapasite;
}

/** Bu vuruşun cevher kademesi: nadir sırada ve Ustalık yetiyorsa nadir kademe; sürüm tavanıyla kırpılır. */
export function vurusKademesi(d: MadenDugumu, sira: number, nadir: number | null, U: number): { kademe: number; nadir: boolean } {
  const nk = Math.min(d.nadir.kademe, SURUM_KADEME_TAVANI);
  if (nadir !== null && sira === nadir && nk > d.kademe && U >= kademeBul(nk).esik) return { kademe: nk, nadir: true };
  return { kademe: Math.min(d.kademe, SURUM_KADEME_TAVANI), nadir: false };
}

export interface VurusGirdisi {
  /** Madencilik seviyesi */
  U: number;
  kademe: number;
  /** [0,1) zar (sunucu crypto) */
  zar: number;
  isabet: boolean;
  /** bugün bu vuruştan önce atılan vuruş (tüm damarlar) */
  toplamOnce: number;
  /** bu vuruştan önceki ardışık ıska (şanssızlık koruması) */
  ardisikIska: number;
}
export interface VurusSonucu { basari: boolean; verim: number; tecrubeX100: number; carpan: GunlukCarpan; sans: number; korundu: boolean }

/** Vuruş sonucu (02 § 4, § 6; 08 § 6). */
export function vurusSonucu(g: VurusGirdisi): VurusSonucu {
  const E = kademeBul(g.kademe).esik;
  const sans = basariSansi(g.U, E);
  const korundu = g.ardisikIska >= USTALIK.sanssizlikKorumasi.ardisikIska;
  const basari = sans > 0 && (korundu || g.zar < sans);
  const c = gunlukCarpan(g.toplamOnce);
  const ham = kademeBul(g.kademe).verim + (g.isabet ? I.verimEk : 0);
  const verim = !basari || c.verimsiz ? 0 : Math.max(1, Math.floor(ham * c.verim));
  const xp = (basari ? USTALIK.madencilik.xpBasari : USTALIK.madencilik.xpBasarisiz) * bant(g.U - E) * c.tecrube;
  return { basari, verim, tecrubeX100: Math.round(xp * 100), carpan: c, sans, korundu };
}

/** Dinç sayaç metni (11 § 10 #11: her zaman görünür, "ceza/yasak" sözcüğü yok). */
export function dincMetni(bugun: number): string {
  if (bugun < G.vurusTam) return `${G.ad} ${bugun}/${G.vurusTam}`;
  if (bugun < G.vurusYarim) return `YARIM VERİM ${bugun}/${G.vurusYarim}`;
  return "DİNÇ VURUŞLAR BİTTİ · 04:00'TE YENİLENİR";
}
