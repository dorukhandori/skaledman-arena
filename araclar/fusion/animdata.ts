// SpriteCollab AnimData.xml ayrıştırıcısı (bağımlılıksız; biçim sabit ve basit).

export interface AnimTanimi {
  ad: string;
  kareGenislik: number;
  kareYukseklik: number;
  /** 1/60 s tick */
  sureler: number[];
  hamleKaresi?: number;
  vurusKaresi?: number;
  donusKaresi?: number;
  /** Sayfa dosyaları başka bir animasyondan geliyorsa onun adı */
  kopyasi?: string;
}

export interface AnimVerisi {
  golgeBoyu: 0 | 1 | 2;
  animler: Map<string, AnimTanimi>;
}

function etiket(blok: string, ad: string): string | undefined {
  const e = new RegExp(`<${ad}>\\s*([^<]*?)\\s*</${ad}>`).exec(blok);
  return e ? e[1] : undefined;
}

function sayi(blok: string, ad: string): number | undefined {
  const s = etiket(blok, ad);
  if (s === undefined || s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** AnimData'da -1 "yok" demektir. */
function kareIndeksi(blok: string, ad: string): number | undefined {
  const n = sayi(blok, ad);
  return n !== undefined && n >= 0 ? n : undefined;
}

export function animDataOku(xml: string): AnimVerisi {
  const golge = sayi(xml, "ShadowSize") ?? 1;
  const animler = new Map<string, AnimTanimi>();
  for (const e of xml.matchAll(/<Anim>([\s\S]*?)<\/Anim>/g)) {
    const blok = e[1]!;
    const ad = etiket(blok, "Name");
    if (!ad) continue;
    const kopya = etiket(blok, "CopyOf");
    const sureler = [...blok.matchAll(/<Duration>\s*(\d+)\s*<\/Duration>/g)].map((m) => Number(m[1]));
    animler.set(ad, {
      ad,
      kareGenislik: sayi(blok, "FrameWidth") ?? 0,
      kareYukseklik: sayi(blok, "FrameHeight") ?? 0,
      sureler,
      hamleKaresi: kareIndeksi(blok, "RushFrame"),
      vurusKaresi: kareIndeksi(blok, "HitFrame"),
      donusKaresi: kareIndeksi(blok, "ReturnFrame"),
      kopyasi: kopya || undefined,
    });
  }
  return { golgeBoyu: (golge === 0 || golge === 2 ? golge : 1) as 0 | 1 | 2, animler };
}

/**
 * Animasyon adını sayfa dosyalarının geçtiği tanıma çevirir (CopyOf zincirini izler).
 * Dönen `ad` dosya adının kökü (`<ad>-Anim.png`), `rol` istenen animasyon adıdır.
 */
export function animCozumle(veri: AnimVerisi, rol: string): AnimTanimi | undefined {
  let t = veri.animler.get(rol);
  for (let adim = 0; t?.kopyasi && adim < 4; adim++) t = veri.animler.get(t.kopyasi);
  return t && t.kareGenislik > 0 ? t : undefined;
}
