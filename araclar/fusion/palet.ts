// Palet çıkarımı ve eşleme: sanatçının fusion resminden baskın renkler → PMD gövde/baş renklerine histogram eşleme.
import type { Resim } from "./resim.ts";

export type Rgb = readonly [number, number, number];
export interface AgirlikliRenk { renk: Rgb; sayi: number }

const CIZGI_ESIGI = 55;      // bu parlaklığın altı dış çizgi sayılır
const BEYAZ_ESIGI = 228;     // göz/parıltı: parlak ve doygunsuz → olduğu gibi kalır

export const anahtar = (c: Rgb): number => (c[0] << 16) | (c[1] << 8) | c[2];
export const renktenAnahtar = (k: number): Rgb => [(k >> 16) & 255, (k >> 8) & 255, k & 255];
export const hex = (c: Rgb): string => `#${[c[0], c[1], c[2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
export const parlaklik = (c: Rgb): number => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const mesafe2 = (a: Rgb, b: Rgb): number => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

export const cizgiMi = (c: Rgb): boolean => parlaklik(c) < CIZGI_ESIGI;
export const beyazMi = (c: Rgb): boolean => parlaklik(c) > BEYAZ_ESIGI && Math.max(...c) - Math.min(...c) < 40;

/** Opak (alfa >= 128) piksellerin renk → adet tablosu. */
export function renkSayimi(r: Resim): Map<number, number> {
  const harita = new Map<number, number>();
  for (let i = 0; i < r.g * r.y * 4; i += 4) {
    if (r.veri[i + 3]! < 128) continue;
    const k = (r.veri[i]! << 16) | (r.veri[i + 1]! << 8) | r.veri[i + 2]!;
    harita.set(k, (harita.get(k) ?? 0) + 1);
  }
  return harita;
}

/**
 * En çok k baskın renk. Yakın renkler (eşik içinde) birleşir; eşik, küme sayısı k'ya inene dek büyür.
 * Küme rengi = ağırlıklı ortalama.
 */
export function baskinRenkler(sayim: Map<number, number>, k: number): AgirlikliRenk[] {
  const girdi = [...sayim].map(([a, n]) => ({ renk: renktenAnahtar(a), sayi: n })).sort((a, b) => b.sayi - a.sayi);
  for (let esik = 24; esik < 400; esik += 8) {
    const kumeler: { merkez: Rgb; toplam: [number, number, number]; sayi: number }[] = [];
    for (const g of girdi) {
      let en: (typeof kumeler)[number] | undefined;
      let enMesafe = Infinity;
      for (const km of kumeler) {
        const m = mesafe2(km.merkez, g.renk);
        if (m < enMesafe) { enMesafe = m; en = km; }
      }
      if (en && enMesafe <= esik * esik) {
        for (let i = 0; i < 3; i++) en.toplam[i]! += g.renk[i]! * g.sayi;
        en.sayi += g.sayi;
      } else {
        kumeler.push({ merkez: g.renk, toplam: [g.renk[0] * g.sayi, g.renk[1] * g.sayi, g.renk[2] * g.sayi], sayi: g.sayi });
      }
    }
    if (kumeler.length <= k) {
      return kumeler.map((km) => ({ renk: [Math.round(km.toplam[0] / km.sayi), Math.round(km.toplam[1] / km.sayi), Math.round(km.toplam[2] / km.sayi)] as const, sayi: km.sayi }));
    }
  }
  return girdi.slice(0, k);
}

export interface PaletHaritasi {
  /** kaynak renk anahtarı → hedef renk anahtarı (gözlenen renkler) */
  harita: Map<number, number>;
  cizgi: Rgb;
}

/** [ton 0..360, doygunluk 0..1, açıklık 0..1] */
function hsl(c: Rgb): [number, number, number] {
  const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const l = (mx + mn) / 2;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

const NOTR_DOYGUNLUK = 0.18;
const AILE_TON_ARALIGI = 35;
/** Gövdenin ikinci ve sonraki ton ailelerinin ayrı bir fusion tonu alması için gereken en az piksel payı */
const IKINCIL_AILE_PAYI = 0.22;
/** Aile içi gölgelendirme farkının korunma oranı */
const GOLGE_KORUMA = 0.7;

interface Aile { uyeler: { a: number; renk: Rgb; n: number }[]; toplam: number; ortAciklik: number }

/** Renkleri ton ailelerine böler: doygunsuzlar tek "nötr" aile; kalanlar ton boşluğuna göre. Büyükten küçüğe. */
function aileler(renkler: { a: number; renk: Rgb; n: number }[]): Aile[] {
  const notr = renkler.filter((r) => hsl(r.renk)[1] < NOTR_DOYGUNLUK);
  const renkli = renkler.filter((r) => hsl(r.renk)[1] >= NOTR_DOYGUNLUK).sort((x, y) => hsl(x.renk)[0] - hsl(y.renk)[0]);
  const gruplar: (typeof renkler)[] = [];
  for (const r of renkli) {
    const son = gruplar.at(-1);
    if (son && hsl(r.renk)[0] - hsl(son.at(-1)!.renk)[0] <= AILE_TON_ARALIGI) son.push(r);
    else gruplar.push([r]);
  }
  // ton dairesi: ilk ve son grup birleşebilir
  if (gruplar.length > 1 && hsl(gruplar[0]![0]!.renk)[0] + 360 - hsl(gruplar.at(-1)!.at(-1)!.renk)[0] <= AILE_TON_ARALIGI) {
    gruplar[0]!.push(...gruplar.pop()!);
  }
  if (notr.length) gruplar.push(notr);
  return gruplar
    .map((u) => {
      const toplam = u.reduce((t, r) => t + r.n, 0);
      return { uyeler: u.sort((x, y) => parlaklik(x.renk) - parlaklik(y.renk)), toplam, ortAciklik: u.reduce((t, r) => t + parlaklik(r.renk) * r.n, 0) / toplam };
    })
    .sort((x, y) => y.toplam - x.toplam);
}

const kirp = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));

/**
 * Aile eşleme: gövde renkleri ton ailelerine, fusion renkleri de ailelere ayrılır; aileler piksel payına göre
 * eşlenir (en büyük ↔ en büyük). Aile içinde parlaklık sırasına göre histogram eşleme, ardından gövdenin kendi
 * gölgelendirmesi (aile ortalamasına göre parlaklık farkı) yarı şiddetle korunur → benekli değil, kümelenmiş renk.
 * Çizgi (koyu) → fusion çizgi rengi, beyaz (göz) → aynen.
 */
export function paletEsle(kaynak: Map<number, number>, hedef: AgirlikliRenk[], cizgi: Rgb): PaletHaritasi {
  const harita = new Map<number, number>();
  const orta = [...kaynak]
    .map(([a, n]) => ({ a, renk: renktenAnahtar(a), n }))
    .filter((k) => {
      if (cizgiMi(k.renk)) { harita.set(k.a, anahtar(cizgi)); return false; }
      if (beyazMi(k.renk)) { harita.set(k.a, k.a); return false; }
      return true;
    });
  const hedefler = hedef.filter((h) => !cizgiMi(h.renk)).map((h) => ({ a: anahtar(h.renk), renk: h.renk, n: h.sayi }));
  if (hedefler.length === 0 || orta.length === 0) return { harita, cizgi };
  const hedefAileler = aileler(hedefler);
  const kaynakAileler = aileler(orta);
  const kaynakToplam = kaynakAileler.reduce((t, a) => t + a.toplam, 0);
  kaynakAileler.forEach((ka, i) => {
    // küçük aileler ikinci bir fusion tonuna gitmez (iç içe geçen pikseller benek yaratır): en büyük ailenin tonunu alır
    const buyukMu = i === 0 || ka.toplam / kaynakToplam >= IKINCIL_AILE_PAYI;
    const ha = !buyukMu
      ? hedefAileler[0]!
      : i < hedefAileler.length
        ? hedefAileler[i]!
        : hedefAileler.reduce((en, h) => (Math.abs(h.ortAciklik - ka.ortAciklik) < Math.abs(en.ortAciklik - ka.ortAciklik) ? h : en));
    const hToplam = ha.uyeler.reduce((t, h) => t + h.n, 0);
    const sinirlar: number[] = [];
    let kum = 0;
    for (const h of ha.uyeler) { kum += h.n / hToplam; sinirlar.push(kum); }
    // aile içi histogram eşleme + gölgelendirme farkı
    let oncesi = 0;
    const secilen = ka.uyeler.map((k) => {
      const pay = (oncesi + k.n / 2) / ka.toplam;
      oncesi += k.n;
      let hi = sinirlar.findIndex((sn) => pay <= sn);
      if (hi < 0) hi = ha.uyeler.length - 1;
      return { k, h: ha.uyeler[hi]! };
    });
    for (const { k, h } of secilen) {
      const ayni = secilen.filter((x) => x.h === h);
      const ortL = ayni.reduce((t, x) => t + parlaklik(x.k.renk) * x.k.n, 0) / ayni.reduce((t, x) => t + x.k.n, 0);
      const fark = (parlaklik(k.renk) - ortL) * GOLGE_KORUMA;
      harita.set(k.a, anahtar([kirp(h.renk[0] + fark), kirp(h.renk[1] + fark), kirp(h.renk[2] + fark)]));
    }
  });
  return { harita, cizgi };
}

/** Haritada olmayan bir rengi sınıfına göre çevirir; sonuçları önbellekler. */
export function renkCevir(p: PaletHaritasi, kaynakAnahtari: number, onbellek: Map<number, number>): number {
  const var_ = p.harita.get(kaynakAnahtari) ?? onbellek.get(kaynakAnahtari);
  if (var_ !== undefined) return var_;
  const c = renktenAnahtar(kaynakAnahtari);
  let sonuc: number;
  if (cizgiMi(c)) sonuc = anahtar(p.cizgi);
  else if (beyazMi(c)) sonuc = kaynakAnahtari;
  else {
    let en = kaynakAnahtari, enM = Infinity;
    for (const [k] of p.harita) {
      const kc = renktenAnahtar(k);
      if (cizgiMi(kc) || beyazMi(kc)) continue;
      const m = mesafe2(kc, c);
      if (m < enM) { enM = m; en = k; }
    }
    sonuc = p.harita.get(en) ?? kaynakAnahtari;
  }
  onbellek.set(kaynakAnahtari, sonuc);
  return sonuc;
}

/** Resmin opak piksellerini haritayla yeniden renklendirir (yeni resim döner). */
export function yenidenRenklendir(r: Resim, p: PaletHaritasi, onbellek: Map<number, number>): Resim {
  const cikti = { g: r.g, y: r.y, veri: r.veri.slice() };
  for (let i = 0; i < r.g * r.y * 4; i += 4) {
    if (r.veri[i + 3]! < 128) { if (r.veri[i + 3]! > 0) cikti.veri[i + 3] = 0; continue; }
    const k = renkCevir(p, (r.veri[i]! << 16) | (r.veri[i + 1]! << 8) | r.veri[i + 2]!, onbellek);
    cikti.veri[i] = (k >> 16) & 255; cikti.veri[i + 1] = (k >> 8) & 255; cikti.veri[i + 2] = k & 255; cikti.veri[i + 3] = 255;
  }
  return cikti;
}
