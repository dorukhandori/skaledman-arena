import { ILERLEME, type MacSonuTuru, macXp, seviyeAraligi, seviyeBul, yapayOmurSonrasi } from "../../paylasilan/kurallar/ilerleme.ts";
import type { MacSonucu } from "../../paylasilan/sim/durum.ts";
import { RUHLAR, YETENEKLER, cekirdekBul } from "../../paylasilan/veri/katalog.ts";
import type { Depo, TakimYuvasi, XpYazimi } from "../db/depo.ts";

// Maç sonu (D5): `mac` satırı + Çekirdek XP (tuning § 14) + Yapay ömrü (§ 17), tek işlemde ve maç kimliğiyle
// idempotent. Yalnız sunucu hesaplar; istemci yalnız sonucu (OdulSatiri) gösterir. Ödünç topaç XP almaz.

export interface OdulSatiri {
  cekirdekId: number;
  tanimId: string;
  ad: string;
  seviyeOnce: number;
  seviye: number;
  xpOnce: number;
  xp: number;
  kazanc: number;
  /** yeni seviyenin çubuk aralığı */
  alt: number;
  ust: number;
  /** seviye atladıysa açılan yetenek adı (Lv.2 Yetenek, Lv.3 Özel Yetenek) */
  yeniYetenek: string | null;
  omur: number | null;
}

export interface MacSonuGirdisi {
  macId: string;
  mod: string;
  oyuncular: readonly [number | null, number | null];
  takimKodlari: readonly [string, string];
  /** takımın sahip olunan yuvaları (maç başında okundu); null = ödünç */
  yuvalar: readonly [readonly (TakimYuvasi | null)[], readonly (TakimYuvasi | null)[]];
  sonuc: MacSonucu;
  sureSn: number;
  krizGordu: readonly [boolean, boolean];
  kalanStaminaOrani: readonly [number, number];
  katalogOzeti: string;
  baslangic: number;
  /** D6 defter: yuva (takım sırası) başına bu maçtaki en uzun kesintisiz dönüş (sn) */
  enUzunDonusSn?: readonly [readonly number[], readonly number[]];
  /** D6 defter: oyuncu başına maçtaki Kararma artışı (Karanlık Kara yetenekleri; sim `d.kararma`) */
  kararma?: readonly [number, number];
}

export function sonucTuru(s: MacSonucu, i: number): MacSonuTuru {
  if (s.neden === "iptal" || s.kazanan < 0) return "iptal";
  if (s.kazanan === i) return "galibiyet";
  return s.neden === "teslim" || s.neden === "hukmen" ? "terk" : "maglubiyet";
}

function yeniYetenekAdi(tanimId: string, seviye: number): string | null {
  const ruh = RUHLAR.find((r) => r.id === cekirdekBul(tanimId).ruh);
  if (!ruh) return null;
  if (seviye === 2) return YETENEKLER.find((y) => y.id === ruh.yetenek)?.ad ?? null;
  if (seviye === 3) return ruh.ozelYetenek ?? null;
  return null;
}

/** XP satırlarını hesapla (saf). */
export function oduller(g: MacSonuGirdisi, i: number): { satirlar: OdulSatiri[]; yazim: XpYazimi[] } {
  const tur = sonucTuru(g.sonuc, i);
  const satirlar: OdulSatiri[] = [];
  const yazim: XpYazimi[] = [];
  const sayildi = tur !== "iptal";
  const yuvalar = g.yuvalar[i] ?? [];
  for (let k = 0; k < yuvalar.length; k++) {
    const y = yuvalar[k];
    if (!y || y.devreDisi) continue;
    const t = cekirdekBul(y.cekirdek);
    const x = macXp({ sonuc: tur, krizGordu: g.krizGordu[i]!, kalanStaminaOrani: g.kalanStaminaOrani[i]!, yapay: t.koken === "yapay", oda: g.mod === "oda" });
    const xp = y.tecrube + x.toplam;
    const seviye = Math.max(y.seviye, seviyeBul(xp));
    const omur = y.omur === null ? null : yapayOmurSonrasi(y.omur, tur);
    const a = seviyeAraligi(seviye);
    satirlar.push({
      cekirdekId: y.cekirdekId, tanimId: y.cekirdek, ad: t.ad, seviyeOnce: y.seviye, seviye, xpOnce: y.tecrube, xp, kazanc: x.toplam,
      alt: a.alt, ust: a.ust, yeniYetenek: seviye > y.seviye ? yeniYetenekAdi(y.cekirdek, seviye) : null, omur,
    });
    yazim.push({
      cekirdekId: y.cekirdekId, kazanc: x.toplam, tecrube: xp, seviye, omur,
      mac: sayildi ? 1 : 0, galibiyet: tur === "galibiyet" ? 1 : 0, krizGalibiyet: tur === "galibiyet" && g.krizGordu[i] ? 1 : 0,
      donusSn: sayildi ? (g.enUzunDonusSn?.[i]?.[k] ?? 0) : 0,
      // VARSAYIM: sim Kararma'yı oyuncu başına sayar; takımdaki Karanlık Çekirdeklere yazılır
      kararma: sayildi && t.koken === "karanlik" ? (g.kararma?.[i] ?? 0) : 0,
    });
  }
  return { satirlar, yazim };
}

/** Maçı yaz; dönen: oyuncu başına ödül satırları (zaten yazılmışsa boş). */
export function macSonuYaz(depo: Depo, g: MacSonuGirdisi): [OdulSatiri[], OdulSatiri[]] {
  const a = g.oyuncular[0] !== null ? oduller(g, 0) : { satirlar: [], yazim: [] };
  const b = g.oyuncular[1] !== null ? oduller(g, 1) : { satirlar: [], yazim: [] };
  const s = g.sonuc;
  const yazildi = depo.macYaz({
    id: g.macId, mod: g.mod, a: g.oyuncular[0], b: g.oyuncular[1],
    kazanan: s.kazanan >= 0 ? g.oyuncular[s.kazanan] ?? null : null,
    puan: `${s.puan[0]}-${s.puan[1]}`, sure: Math.round(g.sureSn), bitis_nedeni: s.neden, katalog_ozeti: g.katalogOzeti,
    baslangic: g.baslangic, takim_a: g.takimKodlari[0], takim_b: g.takimKodlari[1],
  }, [...a.yazim, ...b.yazim]);
  return yazildi ? [a.satirlar, b.satirlar] : [[], []];
}

export { ILERLEME };
