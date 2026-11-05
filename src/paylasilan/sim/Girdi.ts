import { AYAR } from "../kurallar/ayar.ts";

const YUVA_SAYISI = AYAR.yuvaSayisi;

/**
 * Bir adımlık oyuncu girdisi (K-7, 01 § 1.2: alanlar aynı, anlamlar yeni). Ağda yalnız bu gider; sunucu `girdiTemizle`
 * ile kırpar. Fare (`nisan*`) yalnız yetenek yönüdür, sürüşü etkilemez.
 */
export interface Girdi {
  /** −1..1; uzunluk 1'e kırpılır */
  yonX: number;
  yonZ: number;
  /** nişan noktası (dünya) */
  nisanX: number;
  nisanZ: number;
  /** 0..3: Yetenek / Özel Yetenek / Ulti / Parça Tekniği */
  secilenYuva: number;
  /** bu adımda yetenek bırakıldı (D3) */
  atesle: boolean;
  /** Shift: dash */
  dash: boolean;
  /** Space: Sekme */
  zipla: boolean;
  /** Z basılı: Sıkı Dönüş */
  dinlen: boolean;
  /** Tab: geri çek / takım değişimi hedefi (D2); −1 = yok */
  degistir: number;
  /** yeni topacın nişan noktasına düşmesi (D2) */
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
  const u = Math.sqrt(yonX * yonX + yonZ * yonZ);
  if (u > 1) { yonX /= u; yonZ /= u; }
  const sinir = AYAR.arenaYaricap + AYAR.nisanTasma; // merkez orijinli çanak
  return {
    yonX,
    yonZ,
    nisanX: sayi(g.nisanX, -sinir, sinir),
    nisanZ: sayi(g.nisanZ, -sinir, sinir),
    secilenYuva: Math.floor(sayi(g.secilenYuva, 0, YUVA_SAYISI - 1)),
    atesle: g.atesle === true,
    dash: g.dash === true,
    zipla: g.zipla === true,
    dinlen: g.dinlen === true,
    degistir: Number.isInteger(g.degistir) && g.degistir >= 0 && g.degistir < AYAR.takimBoyutu ? g.degistir : -1,
    dusus: g.dusus === true,
  };
}

// ---- ağ biçimi yardımcıları (PROTOKOL_SURUMU 2) ----------------------------------
// Ağ şeması (src/ag/GirdiSemasi.ts) düğmeleri tek bayt maskeyle taşır. Burada yalnız saf dönüşümler var:
// paylaşılan kod Colyseus'a bağımlı olmaz (eslint kapısı).

/** Düğme bitleri. Sıra sabit: protokol sürümünü yükseltmeden değiştirme. */
export const TUS = { atesle: 1, dash: 2, zipla: 4, dinlen: 8, dusus: 16 } as const;
export const TUS_MASKESI = 31;
/** Tek seferlik düğmeler: bir girdide görünür, sonraki girdide kendiliğinden düşer. */
export const TEK_SEFERLIK_TUSLAR = TUS.atesle | TUS.dash | TUS.zipla;
/** Basılı tutulan düğmeler: boşta (girdi gelmeyen) adımda son değeri korunur. */
export const SUREKLI_TUSLAR = TUS.dinlen | TUS.dusus;
/** Eksenler int8 olarak −127..127 taşınır (klavye dijital; gamepad için analog hazır). */
export const EKSEN_OLCEGI = 127;

export function tusMaskesi(g: Girdi): number {
  return (g.atesle ? TUS.atesle : 0) | (g.dash ? TUS.dash : 0) | (g.zipla ? TUS.zipla : 0)
    | (g.dinlen ? TUS.dinlen : 0) | (g.dusus ? TUS.dusus : 0);
}

/** Ağdaki düz alanlardan sim girdisi. Kırpma yine `adim` içindeki `girdiTemizle`'de yapılır. */
export function agAlanlarindanGirdi(a: { yonX: number; yonZ: number; nisanX: number; nisanZ: number; yuva: number; tuslar: number; degistir: number }): Girdi {
  const t = a.tuslar & TUS_MASKESI;
  return {
    yonX: a.yonX / EKSEN_OLCEGI,
    yonZ: a.yonZ / EKSEN_OLCEGI,
    nisanX: a.nisanX,
    nisanZ: a.nisanZ,
    secilenYuva: a.yuva,
    atesle: (t & TUS.atesle) !== 0,
    dash: (t & TUS.dash) !== 0,
    zipla: (t & TUS.zipla) !== 0,
    dinlen: (t & TUS.dinlen) !== 0,
    degistir: a.degistir,
    dusus: (t & TUS.dusus) !== 0,
  };
}

/**
 * Sunucu bir adımda iki girdiyi birden tüketmek zorunda kaldığında (birikmiş tampon) ikisini tek adıma indirir:
 * eksen, nişan, yuva ve basılı düğmeler yeni girdiden; tek seferlik düğmeler VEYA'lanır, geçiş isteği kaybolmaz.
 * Böylece birleştirme hiçbir tek seferlik eylemi düşürmez ya da ikilemez.
 */
export function girdileriBirlestir(eski: Girdi, yeni: Girdi): Girdi {
  return {
    ...yeni,
    atesle: eski.atesle || yeni.atesle,
    dash: eski.dash || yeni.dash,
    zipla: eski.zipla || yeni.zipla,
    degistir: yeni.degistir >= 0 ? yeni.degistir : eski.degistir,
  };
}
