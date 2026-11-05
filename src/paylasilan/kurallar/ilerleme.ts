// Çekirdek ilerlemesi (tuning.md § 14, § 17): seviye eşikleri, maç sonu XP, Yapay ömrü. Saf; sunucu yazar,
// istemci yalnız gösterir (sonuç ekranı, Atölye). Sayılar tek yerde: bu dosya.

export const ILERLEME = {
  /** kümülatif XP eşikleri: Lv.1 0, Lv.2 150, Lv.3 700, Lv.4 2200 */
  esikler: [0, 150, 700, 2200] as readonly number[],
  /** ilk sürümde tavan Lv.3 (Lv.4 sezon 2) */
  tavan: 3,
  /** başlangıç Çekirdeği Lv.2 (150 XP) ile gelir */
  baslangicSeviye: 2,
  galibiyet: 40,
  maglubiyet: 25,
  terk: 0,
  /** krizden galibiyet: maç içinde stamina < %25 görüp kazanmak */
  kriz: 30,
  krizEsik: 0.25,
  /** temiz galibiyet: kalan toplam stamina oranı ≥ %50 */
  temiz: 20,
  temizEsik: 0.5,
  yapayCarpan: 1.5,
  odaCarpan: 0.5,
  /** Yapay ömrü: 30 maç (her maçta %3,4); 0'da Çekirdek devre dışı */
  yapayOmur: 30,
  /** ödünç topaç seviyesi (nile B-10) */
  oduncSeviye: 1,
} as const;

/** Kümülatif XP → seviye (tavanla). */
export function seviyeBul(xp: number): number {
  let s = 1;
  for (let k = 1; k < ILERLEME.esikler.length; k++) if (xp >= ILERLEME.esikler[k]!) s = k + 1;
  return Math.min(s, ILERLEME.tavan);
}

/** Seviye çubuğu: bu seviyenin alt/üst eşiği (tavanda üst = alt). */
export function seviyeAraligi(seviye: number): { alt: number; ust: number } {
  const alt = ILERLEME.esikler[seviye - 1] ?? 0;
  const ust = seviye >= ILERLEME.tavan ? alt : (ILERLEME.esikler[seviye] ?? alt);
  return { alt, ust };
}

export type MacSonuTuru = "galibiyet" | "maglubiyet" | "terk" | "iptal";

export interface XpGirdisi {
  sonuc: MacSonuTuru;
  /** maç içinde takımın sahadaki topacı stamina < %25 gördü mü */
  krizGordu: boolean;
  /** maç sonunda takımın toplam stamina oranı */
  kalanStaminaOrani: number;
  yapay: boolean;
  oda: boolean;
}

export interface XpDokumu { taban: number; kriz: number; temiz: number; carpan: number; toplam: number }

/** Bir Çekirdeğin bu maçtan aldığı XP (tuning § 14). Ödünç topaç XP almaz (çağıran hiç çağırmaz). */
export function macXp(g: XpGirdisi): XpDokumu {
  if (g.sonuc === "iptal") return { taban: 0, kriz: 0, temiz: 0, carpan: 1, toplam: 0 };
  const I = ILERLEME;
  const taban = g.sonuc === "galibiyet" ? I.galibiyet : g.sonuc === "maglubiyet" ? I.maglubiyet : I.terk;
  const kriz = g.sonuc === "galibiyet" && g.krizGordu ? I.kriz : 0;
  const temiz = g.sonuc === "galibiyet" && g.kalanStaminaOrani >= I.temizEsik ? I.temiz : 0;
  const carpan = (g.yapay ? I.yapayCarpan : 1) * (g.oda ? I.odaCarpan : 1);
  return { taban, kriz, temiz, carpan, toplam: Math.round((taban + kriz + temiz) * carpan) };
}

/** Yapay ömrü: her sayılan maçta −1 (iptal sayılmaz), en az 0. */
export function yapayOmurSonrasi(omur: number, sonuc: MacSonuTuru): number {
  return sonuc === "iptal" ? omur : Math.max(0, omur - 1);
}
