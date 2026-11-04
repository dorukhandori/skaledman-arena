import { AYAR } from "../kurallar/ayar.ts";
import { TABLO_BOYU } from "../kurallar/sinTablo.ts";
import type { TopacProfili } from "../veri/profil.ts";
import type { Dunya } from "./durum.ts";
import { macKur } from "./mac.ts";
import { rastgele } from "./rastgele.ts";
import { topacKur } from "./topac.ts";

export { adim } from "./adim.ts";

export interface DunyaSecenekleri {
  /** Uç deseni fazları (tablo birimi). Verilmezse tohumdan: rastgele(tohum, i) · 256. Simetri testi için. */
  fazlar?: readonly [number, number];
}

/** Yeni dünya: topaçlar doğum noktalarında, tam stamina, tık 0. */
export function dunyaKur(profiller: readonly [TopacProfili, TopacProfili], tohum: number, sec: DunyaSecenekleri = {}): Dunya {
  const faz = (i: number) => sec.fazlar?.[i] ?? rastgele(tohum, i) * TABLO_BOYU;
  const [a, b] = AYAR.dogum;
  return {
    tick: 0,
    tohum,
    profiller: [profiller[0], profiller[1]],
    topaclar: [topacKur(profiller[0], a.x, a.z, faz(0)), topacKur(profiller[1], b.x, b.z, faz(1))],
    temasKilidi: 0,
    mac: macKur(),
    olaylar: [],
  };
}
