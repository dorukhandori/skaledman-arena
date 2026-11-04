import { TIP_SKOR, type TopacProfili, topacProfiliKurParcalarla } from "./profil.ts";
import { CEKIRDEKLER, DISKLER, GOVDELER, UCLAR } from "./katalog.ts";
import type { Desen, Tip } from "./semalar.ts";

// Atölye çubukları (tide C-1 / G-32, tuning § 13): oyuncuya 8 parametrenin yerine ALTI çubuk + iki etiket.
//   Saldırı = saldiri · Savunma = savunma · Ağırlık = kutle · Stamina = havuz / net erime (sn, net dayanıklılık) ·
//   Hız = Uç ivmesi (element dahil) ve sürüş tavanı (vSurus) ortalaması · Sağlamlık = burstEsik.
//   Etiket: Uç deseni, Çekirdek dönüş yönü. Değerler katalogdaki tüm geçerli kombinasyonların en küçük/en büyük
//   değerine göre 0-100'e normalize edilir (doğrusal, monoton, sınırlı). Saf: istemci anında gösterir, sunucu aynı
//   fonksiyonla kayıt yanıtında hesaplar.

export type CubukAnahtari = "saldiri" | "savunma" | "agirlik" | "stamina" | "hiz" | "saglamlik";

export interface Cubuk {
  anahtar: CubukAnahtari;
  ad: string;
  /** 0-100 (tam sayı) */
  deger: number;
  /** ham değer (gösterim: "66", "74 sn") */
  ham: number;
  birim: string;
}

export interface CubukOzeti {
  cubuklar: Cubuk[];
  desen: Desen;
  desenAd: string;
  donus: "sag" | "sol";
  /** Çekirdek çift yönlü mü (Yapay: maç öncesi seçilir) */
  ciftYon: boolean;
  tip: Tip;
  tipAd: string;
  /** en yakın ikinci tip (Denge'de ilk iki skor) */
  yakinTip: Tip;
  yakinTipAd: string;
}

export const CUBUK_AD: Record<CubukAnahtari, string> = {
  saldiri: "Saldırı", savunma: "Savunma", agirlik: "Ağırlık", stamina: "Stamina", hiz: "Hız", saglamlik: "Sağlamlık",
};
export const CUBUK_SIRA: readonly CubukAnahtari[] = ["saldiri", "savunma", "agirlik", "stamina", "hiz", "saglamlik"];
export const DESEN_AD: Record<Desen, string> = { cicek: "Çiçek deseni", merkezci: "Merkeze çeker", cakili: "Yerinde köklenir", dengeli: "Dengeli", kusak: "Kuşakta hızlanır" };
export const TIP_AD: Record<Tip, string> = { saldirgan: "Saldırgan", kale: "Kale", dayanikli: "Dayanıklı", denge: "Denge" };
export const YON_AD = { sag: "Sağa döner", sol: "Sola döner" } as const;

/** Bir profilin ham çubuk değerleri (normalize edilmeden). */
export function hamCubuklar(p: TopacProfili): Record<CubukAnahtari, number> {
  const pr = p.parametreler;
  return {
    saldiri: pr.saldiri,
    savunma: pr.savunma,
    agirlik: pr.kutle,
    stamina: pr.staminaHavuzu / Math.max(0.5, p.sim.erime),
    hiz: p.sim.ivme,
    saglamlik: pr.burstEsik,
  };
}
const vSurus = (p: TopacProfili) => p.sim.vSurus;

interface Aralik { en: number; ust: number }
let araliklar: (Record<CubukAnahtari, Aralik> & { vSurus: Aralik }) | null = null;

/** Katalogdaki her (Çekirdek × Gövde × Disk × Uç) kombinasyonundan aralıklar (bir kez, deterministik). */
export function cubukAraliklari(): Record<CubukAnahtari, Aralik> & { vSurus: Aralik } {
  if (araliklar) return araliklar;
  const a = { saldiri: { en: Infinity, ust: -Infinity }, savunma: { en: Infinity, ust: -Infinity }, agirlik: { en: Infinity, ust: -Infinity },
    stamina: { en: Infinity, ust: -Infinity }, hiz: { en: Infinity, ust: -Infinity }, saglamlik: { en: Infinity, ust: -Infinity }, vSurus: { en: Infinity, ust: -Infinity } };
  const genislet = (k: keyof typeof a, v: number) => { if (v < a[k].en) a[k].en = v; if (v > a[k].ust) a[k].ust = v; };
  for (const c of CEKIRDEKLER) for (const g of GOVDELER) for (const d of DISKLER) for (const u of UCLAR) {
    const p = topacProfiliKurParcalarla(c, g, d, u);
    const h = hamCubuklar(p);
    for (const k of CUBUK_SIRA) genislet(k, h[k]);
    genislet("vSurus", vSurus(p));
  }
  araliklar = a;
  return a;
}

function oran(v: number, r: Aralik): number {
  if (!(r.ust > r.en)) return 0.5;
  const o = (v - r.en) / (r.ust - r.en);
  return o < 0 ? 0 : o > 1 ? 1 : o;
}

/** 0-100 normalize; katalog dışı (ör. testte elle değiştirilmiş) değerler de sınırlanır. */
export function normalize(k: CubukAnahtari, ham: number, p?: TopacProfili): number {
  const A = cubukAraliklari();
  const o = k === "hiz" && p ? (oran(ham, A.hiz) + oran(vSurus(p), A.vSurus)) / 2 : oran(ham, A[k]);
  const v = Math.round(o * 100);
  return Number.isFinite(v) ? v : 0;
}

/** § 13 tip skorları (tipBul'un aynısı) → en yakın ikinci tip. */
function tipSkorlari(p: TopacProfili): [Tip, number][] {
  const T = TIP_SKOR;
  const pr = p.parametreler;
  const s: [Tip, number][] = [
    ["saldirgan", pr.saldiri / T.saldiriRef],
    ["kale", (pr.savunma / T.savunmaRef + pr.kutle / T.kutleRef) / 2],
    ["dayanikli", (pr.staminaHavuzu / T.havuzRef) * Math.sqrt(T.erimeRef / pr.erime)],
  ];
  s.sort((x, y) => y[1] - x[1]);
  return s;
}

export function profilCubuklari(p: TopacProfili): CubukOzeti {
  const h = hamCubuklar(p);
  const birim: Record<CubukAnahtari, string> = { saldiri: "", savunma: "", agirlik: "", stamina: " sn", hiz: "", saglamlik: " tık" };
  const cubuklar = CUBUK_SIRA.map((k): Cubuk => ({ anahtar: k, ad: CUBUK_AD[k], deger: normalize(k, h[k], p), ham: Math.round(h[k]), birim: birim[k] }));
  const sk = tipSkorlari(p);
  const yakin = p.tip === "denge" ? sk[0]![0] : sk[1]![0];
  return {
    cubuklar,
    desen: p.parametreler.desen,
    desenAd: DESEN_AD[p.parametreler.desen],
    donus: p.donus,
    ciftYon: p.parametreler.yon === "cift",
    tip: p.tip,
    tipAd: TIP_AD[p.tip],
    yakinTip: yakin,
    yakinTipAd: TIP_AD[yakin],
  };
}

/** İki özet arasındaki fark (çubuk başına, normalize puan). */
export function cubukFarki(once: CubukOzeti, sonra: CubukOzeti): Record<CubukAnahtari, number> {
  const f = {} as Record<CubukAnahtari, number>;
  for (const k of CUBUK_SIRA) f[k] = (sonra.cubuklar.find((c) => c.anahtar === k)?.deger ?? 0) - (once.cubuklar.find((c) => c.anahtar === k)?.deger ?? 0);
  return f;
}
