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
}

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
  };
}

export type TakimProfilleri = readonly [TopacProfili, TopacProfili, TopacProfili];

/**
 * Tam maç dünyası (D2): iki 3'lü takım (3 farklı Çekirdek zorunlu), her takımın 1. üyesi sahada, faz `geriSayim`
 * (Hazır 2 s + 3-2-1). `aktif` verilirse ilk çıkan üye o olur.
 */
export function macDunyasiKur(takimlar: readonly [TakimProfilleri, TakimProfilleri], tohum: number, sec: DunyaSecenekleri & { aktif?: readonly [number, number] } = {}): Dunya {
  const T = [takimKur(takimlar[0]), takimKur(takimlar[1])] as const;
  const ilk = sec.aktif ?? [0, 0];
  T[0].aktif = ilk[0]!;
  T[1].aktif = ilk[1]!;
  const p0 = T[0].uyeler[T[0].aktif]!.profil;
  const p1 = T[1].uyeler[T[1].aktif]!.profil;
  const d = dunyaKur([p0, p1], tohum, sec);
  d.mac = macKur("mac");
  d.takimlar = [T[0], T[1]];
  return d;
}
