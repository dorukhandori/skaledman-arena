// Baş kesme ve yerleştirme. Baş = yeşil işaret çevresindeki yarıçap içinde, işarete bağlı opak piksel kümesi.
import type { Resim } from "./resim.ts";
import { bosResim, indeks, opak } from "./resim.ts";
import type { Nokta } from "./offsets.ts";
import { boyunKoprusu, type BoyunDurumu } from "./boyun.ts";

/** Baş yarıçapı = sprite sınır kutusunun uzun kenarı × bu oran (en az 4 px). */
export const BAS_YARICAP_ORANI = 0.3;
const EN_AZ_YARICAP = 4;

export interface BasKirpintisi {
  /** (2R+1)² kare; merkez piksel (R,R) = baş işareti */
  resim: Resim;
  R: number;
  /** Kesim yarıçapı (kaynak pikseli) */
  r: number;
  doluPiksel: number;
}

/** Kare içindeki opak piksellerin sınır kutusu; boşsa null */
export function sinirKutusu(sayfa: Resim, kx: number, ky: number, kg: number, kh: number): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < kh; y++) {
    for (let x = 0; x < kg; x++) {
      if (!opak(sayfa, kx + x, ky + y)) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

export function yaricapTahmin(sayfa: Resim, kx: number, ky: number, kg: number, kh: number): number {
  const k = sinirKutusu(sayfa, kx, ky, kg, kh);
  if (!k) return EN_AZ_YARICAP;
  const uzun = Math.max(k.x1 - k.x0 + 1, k.y1 - k.y0 + 1);
  return Math.max(EN_AZ_YARICAP, uzun * BAS_YARICAP_ORANI);
}

/**
 * `sayfa` içinde kare (kx,ky,kg,kh) için işaret çevresinde başı keser.
 * İşarete en yakın opak pikselden 8-komşulukla yayılır, yarıçap dışına çıkmaz.
 */
export function basKes(sayfa: Resim, kx: number, ky: number, kg: number, kh: number, isaret: Nokta, r: number): BasKirpintisi | null {
  const R = Math.ceil(r) + 1;
  // başlangıç: işarete en yakın opak piksel (yarıçap içinde)
  let bx = -1, by = -1, enM = Infinity;
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const x = isaret.x + dx, y = isaret.y + dy;
      if (x < 0 || y < 0 || x >= kg || y >= kh || !opak(sayfa, kx + x, ky + y)) continue;
      const m = dx * dx + dy * dy;
      if (m <= r * r && m < enM) { enM = m; bx = x; by = y; }
    }
  }
  if (bx < 0) return null;
  const boy = 2 * R + 1;
  const kirpinti = bosResim(boy, boy);
  const yigin: [number, number][] = [[bx, by]];
  const ziyaret = new Set<number>([by * kg + bx]);
  let dolu = 0;
  while (yigin.length) {
    const [x, y] = yigin.pop()!;
    const si = indeks(sayfa, kx + x, ky + y);
    const di = indeks(kirpinti, x - isaret.x + R, y - isaret.y + R);
    for (let c = 0; c < 4; c++) kirpinti.veri[di + c] = sayfa.veri[si + c]!;
    dolu++;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= kg || ny >= kh) continue;
        const ox = nx - isaret.x, oy = ny - isaret.y;
        if (ox * ox + oy * oy > r * r) continue;
        const kn = ny * kg + nx;
        if (ziyaret.has(kn) || !opak(sayfa, kx + nx, ky + ny)) continue;
        ziyaret.add(kn);
        yigin.push([nx, ny]);
      }
    }
  }
  return { resim: kirpinti, R, r, doluPiksel: dolu };
}

/**
 * Gövde karesine (kare, kareG×kareY yerel resim) başı oturtur.
 * 1) gövdenin kendi baş bölgesi (isaret çevresi, rHedef) silinir,
 * 2) kesilmiş baş rHedef/bas.r oranında (en yakın komşu) ölçeklenip işarete konur,
 * 3) silinip baş tarafından örtülmeyen, işaretin altında kalan gövde pikselleri (boyun/omuz) geri konur,
 * 4) `cizgi` verilmişse ve baş gövdeye değmiyorsa boyun köprüsü çizilir (boyun.ts); sonuç durumu döner.
 */
export function basYerlestir(kare: Resim, isaret: Nokta, bas: BasKirpintisi, rHedef: number, cizgi?: readonly [number, number, number]): BoyunDurumu | undefined {
  const s = rHedef / bas.r;
  const orijinal = kare.veri.slice();
  const silinen: [number, number][] = [];
  const Rh = Math.ceil(rHedef) + 1;
  for (let dy = -Rh; dy <= Rh; dy++) {
    for (let dx = -Rh; dx <= Rh; dx++) {
      if (dx * dx + dy * dy > rHedef * rHedef) continue;
      const x = isaret.x + dx, y = isaret.y + dy;
      if (!opak(kare, x, y)) continue;
      kare.veri[indeks(kare, x, y) + 3] = 0;
      silinen.push([x, y]);
    }
  }
  const basMaskesi = new Uint8Array(kare.g * kare.y);
  const Rd = Math.ceil(bas.R * s) + 1;
  for (let oy = -Rd; oy <= Rd; oy++) {
    for (let ox = -Rd; ox <= Rd; ox++) {
      const x = isaret.x + ox, y = isaret.y + oy;
      if (x < 0 || y < 0 || x >= kare.g || y >= kare.y) continue;
      const sx = bas.R + Math.floor((ox + 0.5) / s), sy = bas.R + Math.floor((oy + 0.5) / s);
      if (sx < 0 || sy < 0 || sx >= bas.resim.g || sy >= bas.resim.y) continue;
      const si = indeks(bas.resim, sx, sy);
      if (bas.resim.veri[si + 3]! < 128) continue;
      const di = indeks(kare, x, y);
      for (let c = 0; c < 4; c++) kare.veri[di + c] = bas.resim.veri[si + c]!;
      basMaskesi[y * kare.g + x] = 1;
    }
  }
  const kesik = new Uint8Array(kare.g * kare.y);
  for (const [x, y] of silinen) {
    const di = indeks(kare, x, y);
    if (y > isaret.y + rHedef * 0.25 && kare.veri[di + 3]! < 128) {
      for (let c = 0; c < 4; c++) kare.veri[di + c] = orijinal[di + c]!;
    } else if (kare.veri[di + 3]! < 128) kesik[y * kare.g + x] = 1;
  }
  return cizgi ? boyunKoprusu(kare, basMaskesi, kesik, cizgi, rHedef) : undefined;
}
