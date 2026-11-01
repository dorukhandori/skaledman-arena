// Boyun köprüsü: uzun boyunlu gövdelerde yerleştirilen baş gövdeden kopuk (ya da yalnızca 1 px'lik bir tel ile
// bağlı) kalırsa araya kısa, daralan bir şerit çeker. Belirleyici (rastgelelik yok): aynı girdi aynı pikselleri verir.
//
// "Kopuk" tanımı: başın gövdenin KALIN piksellerine (≥ KALIN_KOMSU opak komşusu olan; 1 px'lik teller, anten ve
// boyun kalıntıları kalın sayılmaz) en az TEMAS_PAYI kadar 4-komşu temasının olmaması. Yalnızca "hiç değmiyor"
// diye bakmak yetmedi: Dragono'da (149.375) baş gövdeye 1 px'lik boyun kalıntısı ile değip havada duruyordu.
import type { Resim } from "./resim.ts";
import { indeks, opak } from "./resim.ts";

type Rgb = readonly [number, number, number];

/** Baş ile gövde arasındaki en büyük kapatılacak boşluk = baş yarıçapı × bu oran (+2 px). Fazlası köprülenmez. */
export const EN_BUYUK_BOSLUK_ORANI = 2.2;
/** Gövdenin bu oranından küçük yüzen parçalar (el, kuyruk ucu) "gövde" sayılmaz. */
const GOVDE_PARCA_ORANI = 0.3;
const SERIT_EN_AZ = 2;
const SERIT_EN_COK = 5;
const RENK_YARICAPI = 3;
/** Bir gövde pikseli bu kadar (8-komşu) opak komşusu varsa "kalın" sayılır. */
const KALIN_KOMSU = 4;
/** Başın kalın gövdeyle bağlı sayılması için gereken 4-komşu temas çifti. */
const TEMAS_PAYI = 2;

export type BoyunDurumu = "bagli" | "koprulendi" | "atlandi" | "bassiz";

const KOMSU8: readonly (readonly [number, number])[] = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
const KOMSU4: readonly (readonly [number, number])[] = [[0, -1], [-1, 0], [1, 0], [0, 1]];

/** Baş dışı opak piksellerin 8-bağlı bileşenleri: her pikselin bileşen numarası (-1 = yok) ve bileşen boyutları. */
function bilesenler(kare: Resim, bas: Uint8Array): { no: Int32Array; boyut: number[] } {
  const no = new Int32Array(kare.g * kare.y).fill(-1);
  const boyut: number[] = [];
  for (let b = 0; b < kare.g * kare.y; b++) {
    if (no[b] !== -1 || bas[b] || !opak(kare, b % kare.g, Math.floor(b / kare.g))) continue;
    const id = boyut.length;
    let n = 0;
    const yigin = [b];
    no[b] = id;
    while (yigin.length) {
      const p = yigin.pop()!;
      n++;
      const px = p % kare.g, py = Math.floor(p / kare.g);
      for (const [dx, dy] of KOMSU8) {
        const x = px + dx, y = py + dy;
        if (x < 0 || y < 0 || x >= kare.g || y >= kare.y) continue;
        const q = y * kare.g + x;
        if (no[q] !== -1 || bas[q] || !opak(kare, x, y)) continue;
        no[q] = id;
        yigin.push(q);
      }
    }
    boyut.push(n);
  }
  return { no, boyut };
}

/** (x,y) çevresinde yarıçap içindeki, çizgi renginden farklı en sık opak renk; yoksa null. */
function yakinRenk(kare: Resim, ortak: (p: number) => boolean, x: number, y: number, r: number, cizgi: Rgb): Rgb | null {
  const say = new Map<number, number>();
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const px = x + dx, py = y + dy;
      if (dx * dx + dy * dy > r * r || px < 0 || py < 0 || px >= kare.g || py >= kare.y) continue;
      if (!ortak(py * kare.g + px) || !opak(kare, px, py)) continue;
      const i = indeks(kare, px, py);
      const k = (kare.veri[i]! << 16) | (kare.veri[i + 1]! << 8) | kare.veri[i + 2]!;
      if (k === ((cizgi[0] << 16) | (cizgi[1] << 8) | cizgi[2])) continue;
      say.set(k, (say.get(k) ?? 0) + 1);
    }
  }
  let en = -1, enN = 0;
  for (const [k, n] of say) if (n > enN || (n === enN && k < en)) { en = k; enN = n; }
  return en < 0 ? null : [(en >> 16) & 255, (en >> 8) & 255, en & 255];
}

function boya(kare: Resim, p: number, c: Rgb): void {
  const i = p * 4;
  kare.veri[i] = c[0]; kare.veri[i + 1] = c[1]; kare.veri[i + 2] = c[2]; kare.veri[i + 3] = 255;
}

/**
 * `kare` içinde baş piksellerinin (`bas` maskesi, g×y) gövdeye değip değmediğine bakar; değmiyorsa köprü çizer.
 * `kesik`: başın yerleşmesi için silinen ve geri konmayan piksellerin maskesi; gövdenin boyun ucu bunlara komşu
 * piksellerdir (boş kalırsa gövdenin tamamı aday olur).
 * Köprü: gövde boyun ucundaki en yakın nokta → başın en yakın pikseli, şerit genişliği boyun ucunun genişliğinden
 * (2–5 px) başa doğru 1 px daralır; dolgu rengi boyun ucu çevresindeki gövde rengi, kenarları `cizgi` ile çevrilir.
 */
export function boyunKoprusu(kare: Resim, bas: Uint8Array, kesik: Uint8Array, cizgi: Rgb, rHedef: number): BoyunDurumu {
  const g = kare.g;
  const basPikselleri: number[] = [];
  for (let p = 0; p < bas.length; p++) if (bas[p] && opak(kare, p % g, Math.floor(p / g))) basPikselleri.push(p);
  if (basPikselleri.length === 0) return "bassiz";

  const { no, boyut } = bilesenler(kare, bas);
  if (boyut.length === 0) return "bagli"; // gövde yok: köprülenecek bir şey de yok
  const enBuyuk = Math.max(...boyut);
  const govdeMi = (b: number): boolean => b >= 0 && boyut[b]! >= enBuyuk * GOVDE_PARCA_ORANI;
  const govdePikseli = (p: number): boolean => govdeMi(no[p]!);

  const opakKomsu = (p: number): number => {
    let n = 0;
    for (const [dx, dy] of KOMSU8) {
      const x = (p % g) + dx, y = Math.floor(p / g) + dy;
      if (x >= 0 && y >= 0 && x < g && y < kare.y && opak(kare, x, y)) n++;
    }
    return n;
  };
  const kalin = new Uint8Array(no.length);
  for (let p = 0; p < no.length; p++) if (govdePikseli(p) && opakKomsu(p) >= KALIN_KOMSU) kalin[p] = 1;

  let temas = 0;
  for (const p of basPikselleri) {
    for (const [dx, dy] of KOMSU4) {
      const x = (p % g) + dx, y = Math.floor(p / g) + dy;
      if (x >= 0 && y >= 0 && x < g && y < kare.y && kalin[y * g + x]) temas++;
    }
  }
  if (temas >= TEMAS_PAYI) return "bagli";

  // aday: kalın gövde pikselleri; boyun ucu (kesik bölgeye komşu olanlar) varsa yalnız onlar
  const adaylar: number[] = [];
  const boyunUcu: number[] = [];
  for (let p = 0; p < no.length; p++) {
    if (!kalin[p]) continue;
    adaylar.push(p);
    const px = p % g, py = Math.floor(p / g);
    if (KOMSU8.some(([dx, dy]) => {
      const x = px + dx, y = py + dy;
      return x >= 0 && y >= 0 && x < g && y < kare.y && kesik[y * g + x];
    })) boyunUcu.push(p);
  }
  const hedefler = boyunUcu.length ? boyunUcu : adaylar;

  let enM = Infinity, c = -1, h = -1;
  for (const a of hedefler) {
    const ax = a % g, ay = Math.floor(a / g);
    for (const b of basPikselleri) {
      const m = (ax - (b % g)) ** 2 + (ay - Math.floor(b / g)) ** 2;
      if (m < enM) { enM = m; c = a; h = b; }
    }
  }
  const bosluk = Math.sqrt(enM);
  if (c < 0 || bosluk > rHedef * EN_BUYUK_BOSLUK_ORANI + 2) return "atlandi";

  const cx = c % g, cy = Math.floor(c / g), hx = h % g, hy = Math.floor(h / g);
  // boyun ucunun genişliği: c ile aynı kümedeki boyun ucu pikselleri (8-bağlı, c'den ≤ SERIT_EN_COK uzaklıkta)
  const boyunKumesi = new Set(boyunUcu);
  const genislik0 = Math.max(SERIT_EN_AZ, Math.min(SERIT_EN_COK, boyunKumesi.has(c)
    ? boyunUcu.filter((p) => Math.abs((p % g) - cx) <= SERIT_EN_COK && Math.abs(Math.floor(p / g) - cy) <= SERIT_EN_COK).length / 2
    : 3));
  const genislik1 = Math.max(SERIT_EN_AZ, genislik0 - 1);
  const dolgu = yakinRenk(kare, govdePikseli, cx, cy, RENK_YARICAPI, cizgi)
    ?? yakinRenk(kare, (p) => bas[p] === 1, hx, hy, RENK_YARICAPI, cizgi) ?? cizgi;

  // şerit: c'den h'ye doğrusal; baskın eksene dik doğrultuda genişlik kadar piksel
  const adim = Math.max(Math.abs(hx - cx), Math.abs(hy - cy), 1);
  const dikeyMi = Math.abs(hy - cy) >= Math.abs(hx - cx); // baskın eksen y → şerit yatay genişler
  const serit = new Set<number>();
  for (let i = 0; i <= adim; i++) {
    const t = i / adim;
    const x = Math.round(cx + (hx - cx) * t), y = Math.round(cy + (hy - cy) * t);
    const w = Math.round(genislik0 + (genislik1 - genislik0) * t);
    const bas0 = -Math.floor((w - 1) / 2);
    for (let k = 0; k < w; k++) {
      const px = dikeyMi ? x + bas0 + k : x, py = dikeyMi ? y : y + bas0 + k;
      if (px < 0 || py < 0 || px >= g || py >= kare.y) continue;
      const p = py * g + px;
      if (!opak(kare, px, py) || (!bas[p] && !kalin[p])) serit.add(p); // boş ya da ince tel: üstüne boyanır
    }
  }
  if (serit.size === 0) return "atlandi";
  const cizgiPikselleri = new Set<number>();
  for (const p of serit) {
    for (const [dx, dy] of KOMSU4) {
      const x = (p % g) + dx, y = Math.floor(p / g) + dy;
      if (x < 0 || y < 0 || x >= g || y >= kare.y) continue;
      const q = y * g + x;
      if (!serit.has(q) && !opak(kare, x, y)) cizgiPikselleri.add(q);
    }
  }
  for (const p of cizgiPikselleri) boya(kare, p, cizgi);
  for (const p of serit) boya(kare, p, dolgu);
  return "koprulendi";
}
