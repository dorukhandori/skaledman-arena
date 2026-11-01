// Offsets / Shadow sayfası okuyucuları. Her karede tek piksellik işaretler:
// siyah (0,0,0) = merkez, yeşil (0,255,0) = baş, kırmızı (255,0,0) = sol el, mavi (0,0,255) = sağ el.
import type { Resim } from "./resim.ts";
import { bosResim, indeks } from "./resim.ts";

export interface Nokta { x: number; y: number }
export interface KareIsaretleri { merkez?: Nokta; bas?: Nokta; solEl?: Nokta; sagEl?: Nokta }

type IsaretAdi = keyof KareIsaretleri;

function isaretAdi(r: number, g: number, b: number): IsaretAdi | null {
  if (r === 0 && g === 0 && b === 0) return "merkez";
  if (r === 0 && g === 255 && b === 0) return "bas";
  if (r === 255 && g === 0 && b === 0) return "solEl";
  if (r === 0 && g === 0 && b === 255) return "sagEl";
  return null;
}

/** [satır][sütun] → o karedeki işaretler (kare içi koordinat). Aynı renkten birden çok piksel varsa ortalaması. */
export function isaretleriOku(offsets: Resim, kareG: number, kareY: number): KareIsaretleri[][] {
  const sutun = Math.floor(offsets.g / kareG);
  const satir = Math.floor(offsets.y / kareY);
  const sonuc: KareIsaretleri[][] = [];
  for (let s = 0; s < satir; s++) {
    const sira: KareIsaretleri[] = [];
    for (let c = 0; c < sutun; c++) {
      const top: Partial<Record<IsaretAdi, { x: number; y: number; n: number }>> = {};
      for (let y = 0; y < kareY; y++) {
        for (let x = 0; x < kareG; x++) {
          const i = indeks(offsets, c * kareG + x, s * kareY + y);
          if (offsets.veri[i + 3]! < 255) continue;
          const ad = isaretAdi(offsets.veri[i]!, offsets.veri[i + 1]!, offsets.veri[i + 2]!);
          if (!ad) continue;
          const t = (top[ad] ??= { x: 0, y: 0, n: 0 });
          t.x += x; t.y += y; t.n++;
        }
      }
      const kare: KareIsaretleri = {};
      for (const ad of ["merkez", "bas", "solEl", "sagEl"] as const) {
        const t = top[ad];
        if (t) kare[ad] = { x: Math.round(t.x / t.n), y: Math.round(t.y / t.n) };
      }
      sira.push(kare);
    }
    sonuc.push(sira);
  }
  return sonuc;
}

/** Gölge sayfasındaki beyaz (255,255,255) tek piksel = yerdeki ayak/gölge merkezi. İlk karede aranır. */
export function ayakNoktasiBul(golge: Resim, kareG: number, kareY: number): Nokta | undefined {
  for (let y = 0; y < Math.min(kareY, golge.y); y++) {
    for (let x = 0; x < Math.min(kareG, golge.g); x++) {
      const i = indeks(golge, x, y);
      if (golge.veri[i + 3]! > 0 && golge.veri[i] === 255 && golge.veri[i + 1] === 255 && golge.veri[i + 2] === 255) return { x, y };
    }
  }
  return undefined;
}

/**
 * Gölge sayfasını oyun için tek renge çevirir: yeşil halka (küçük) < kırmızı (orta) < mavi (büyük);
 * seçilen boy ve içindekiler yarı saydam siyah olur, kalanı şeffaf.
 */
export function golgeBoya(golge: Resim, boy: 0 | 1 | 2, alfa = 96): Resim {
  const cikti = bosResim(golge.g, golge.y);
  for (let p = 0; p < golge.g * golge.y; p++) {
    const i = p * 4;
    if (golge.veri[i + 3]! === 0) continue;
    const r = golge.veri[i]!, g = golge.veri[i + 1]!, b = golge.veri[i + 2]!;
    const seviye = b === 255 && r === 0 && g === 0 ? 2 : r === 255 && g === 0 && b === 0 ? 1 : 0; // yeşil/beyaz = 0
    if (seviye <= boy) { cikti.veri[i + 3] = alfa; }
  }
  return cikti;
}
