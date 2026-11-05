import { AYAR } from "../kurallar/ayar.ts";
import { TABLO_BOYU } from "../kurallar/sinTablo.ts";
import type { TopacProfili } from "../veri/profil.ts";
import type { Dunya } from "./durum.ts";
import { macKur, takimKur } from "./mac.ts";
import { rastgele } from "./rastgele.ts";
import { topacKur } from "./topac.ts";

export { adim } from "./adim.ts";

export interface DunyaSecenekleri {
  /** Uç deseni fazları (tablo birimi). Verilmezse tohumdan: rastgele(tohum, i) · 256. Simetri testi için. */
  fazlar?: readonly [number, number];
  /** Çekirdek seviyesi (oyuncu başına). VARSAYIM (D3, ilerleme D5'te): varsayılan Lv.3, üç yuva açık. */
  seviye?: readonly [number, number];
}

/** VARSAYIM: D5 ilerlemesi gelene kadar çevrimdışı maçta Çekirdekler Lv.3 (tavan) sayılır. */
export const VARSAYILAN_SEVIYE = 3;

/** Tek tur dünyası (Topaç Lab, D1): topaçlar doğum noktalarında, tam stamina, tık 0, faz `tur`. */
export function dunyaKur(profiller: readonly [TopacProfili, TopacProfili], tohum: number, sec: DunyaSecenekleri = {}): Dunya {
  const faz = (i: number) => sec.fazlar?.[i] ?? rastgele(tohum, i) * TABLO_BOYU;
  const [a, b] = AYAR.dogum;
  return {
    tick: 0,
    tohum,
    profiller: [profiller[0], profiller[1]],
    topaclar: [topacKur(profiller[0], a.x, a.z, faz(0)), topacKur(profiller[1], b.x, b.z, faz(1))],
    temasKilidi: 0,
    mac: macKur("tekTur"),
    arenaYaricap: AYAR.arenaYaricap,
    takimlar: null,
    olaylar: [],
    alanlar: [null, null],
    engeller: [],
    ultiKullanildi: [0, 0],
    ultiKilit: 0,
    yakinGecisBekleme: 0,
    kararma: [0, 0],
    seviye: [sec.seviye?.[0] ?? VARSAYILAN_SEVIYE, sec.seviye?.[1] ?? VARSAYILAN_SEVIYE],
    sonYetenek: [-1, -1],
    yetenekSayisi: [[0, 0, 0], [0, 0, 0]],
    takimEnerji: [0, 0],
    takimUltiKullanildi: [0, 0],
  };
}

export type TakimProfilleri = readonly [TopacProfili, TopacProfili, TopacProfili];
/** D5: kayıtlı takımda üye başına Çekirdek seviyesi (ödünç Lv.1). */
export type UyeSeviyeleri = readonly [number, number, number];

/**
 * Tam maç dünyası (D2): iki 3'lü takım (3 farklı Çekirdek zorunlu), her takımın 1. üyesi sahada, faz `geriSayim`
 * (Hazır 2 s + 3-2-1). `aktif` verilirse ilk çıkan üye o olur.
 */
export function macDunyasiKur(
  takimlar: readonly [TakimProfilleri, TakimProfilleri],
  tohum: number,
  sec: DunyaSecenekleri & { aktif?: readonly [number, number]; uyeSeviyeleri?: readonly [UyeSeviyeleri | null, UyeSeviyeleri | null] } = {},
): Dunya {
  const T = [takimKur(takimlar[0], sec.uyeSeviyeleri?.[0] ?? undefined), takimKur(takimlar[1], sec.uyeSeviyeleri?.[1] ?? undefined)] as const;
  const ilk = sec.aktif ?? [0, 0];
  T[0].aktif = ilk[0]!;
  T[1].aktif = ilk[1]!;
  const p0 = T[0].uyeler[T[0].aktif]!.profil;
  const p1 = T[1].uyeler[T[1].aktif]!.profil;
  // D5: üye seviyesi verilmişse sahadaki ilk üyenin seviyesi oyuncu seviyesidir
  const sv0 = T[0].uyeler[T[0].aktif]!.seviye;
  const sv1 = T[1].uyeler[T[1].aktif]!.seviye;
  const seviye: [number, number] = [sv0 ?? sec.seviye?.[0] ?? VARSAYILAN_SEVIYE, sv1 ?? sec.seviye?.[1] ?? VARSAYILAN_SEVIYE];
  const d = dunyaKur([p0, p1], tohum, { ...sec, seviye });
  d.mac = macKur("mac");
  d.takimlar = [T[0], T[1]];
  return d;
}
