import { AYAR } from "../kurallar/ayar.ts";
import { YUVA_SAYISI } from "../kurallar/hamleler.ts";

/** Bir adımlık oyuncu girdisi (K-7). Ağda yalnız bu gider; sunucu `girdiTemizle` ile kırpar. */
export interface Girdi {
  /** −1..1; uzunluk 1'e kırpılır */
  yonX: number;
  yonZ: number;
  /** nişan noktası (dünya) */
  nisanX: number;
  nisanZ: number;
  /** 0..3 */
  secilenYuva: number;
  /** bu adımda atış bırakıldı */
  atesle: boolean;
  dash: boolean;
  /** Space: bu adımda zıpla */
  zipla: boolean;
  /** Z basılı: dinlen */
  dinlen: boolean;
  /** Q/E/Tab+1-3: geçilecek takım üyesi; −1 = yok */
  degistir: number;
  /** true: yeni üye nişan noktasına düşer (Tab basılı); false: olduğu yere */
  dusus: boolean;
}

export function bosGirdi(): Girdi {
  return { yonX: 0, yonZ: 0, nisanX: 0, nisanZ: 0, secilenYuva: 0, atesle: false, dash: false, zipla: false, dinlen: false, degistir: -1, dusus: false };
}

function sayi(v: number, enAz: number, enFazla: number): number {
  if (!Number.isFinite(v)) return 0;
  return v < enAz ? enAz : v > enFazla ? enFazla : v;
}

/** Güvenilmeyen girdiyi sınırlar: eksenler, yön uzunluğu, nişan, yuva. */
export function girdiTemizle(g: Girdi): Girdi {
  let yonX = sayi(g.yonX, -1, 1);
  let yonZ = sayi(g.yonZ, -1, 1);
  const u = Math.hypot(yonX, yonZ);
  if (u > 1) { yonX /= u; yonZ /= u; }
  const tas = AYAR.nisanTasma;
  return {
    yonX,
    yonZ,
    nisanX: sayi(g.nisanX, -AYAR.saha.yariGenislik - tas, AYAR.saha.yariGenislik + tas),
    nisanZ: sayi(g.nisanZ, -tas, AYAR.saha.derinlik + tas),
    secilenYuva: Math.floor(sayi(g.secilenYuva, 0, YUVA_SAYISI - 1)),
    atesle: g.atesle === true,
    dash: g.dash === true,
    zipla: g.zipla === true,
    dinlen: g.dinlen === true,
    degistir: Number.isInteger(g.degistir) && g.degistir >= 0 && g.degistir < AYAR.takim.boyut ? g.degistir : -1,
    dusus: g.dusus === true,
  };
}
