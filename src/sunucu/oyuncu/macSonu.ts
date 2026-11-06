import { ILERLEME, type MacSonuTuru, macXp, seviyeAraligi, seviyeBul, yapayOmurSonrasi } from "../../paylasilan/kurallar/ilerleme.ts";
import { type AltinModu, type MacAltini, gunNo, macAltini } from "../../paylasilan/kurallar/ekonomi.ts";
import type { MacOzeti, OzetModu } from "../../paylasilan/kurallar/basarim.ts";
import type { MacSonucu } from "../../paylasilan/sim/durum.ts";
import { RUHLAR, YETENEKLER, cekirdekBul } from "../../paylasilan/veri/katalog.ts";
import type { Depo, TakimYuvasi, XpYazimi } from "../db/depo.ts";
import { type BasarimBildirimi, basarimOlayiIsle, bildirim } from "./basarimYaz.ts";
import type { OzetHam } from "./ozetSayaci.ts";
import type { HaritaOdulBilgisi } from "../../ag/protokol.ts";
import { HARITA_MAC_TAVANI, HARITA_MIN_SN, haritaMacSonu, sayilanHaritaMaci, type HaritaOlaylari } from "./harita.ts";

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
  // ---- D7 ----
  /** hızlı maç kuyruğunda bot dolgusu (nile B-19): oyuncu 1 sunucu botu (oyuncular[1] null) */
  bot?: boolean;
  /** sim'den türeyen maç özeti (MacOzetSayaci) */
  ozet?: readonly [OzetHam, OzetHam];
  /** sahaya çıkan takım yuvaları (sahip olunan Çekirdekler başarımda "kazanan Çekirdek" sayılır) */
  sahayaCikan?: readonly [readonly number[], readonly number[]];
  /** telemetri (B-40): tur sonuçları ve yetenek kullanımı (kademe 1-3) */
  turlar?: readonly { tur: string; kazanan: number; sn: number }[];
  yetenekSayisi?: readonly [readonly number[], readonly number[]];
  /** Harita (H2): `mod:"harita"` maçının düğümü (oyuncu 0 kayıtlı oyuncu, oyuncu 1 düğüm botu) */
  harita?: { dugum: string };
  /** iç: harita maçı XP vermez (günün 10 sayılan maçı doldu ya da maç geçersiz) */
  xpYok?: readonly [boolean, boolean];
}

/** Oyuncu başına maç sonu (sonuç ekranı): Çekirdek kartı + Altın + başarım ilerlemesi. */
export interface OyuncuOdulu {
  cekirdekler: OdulSatiri[];
  altin: MacAltini & { bakiye: number };
  basarimlar: BasarimBildirimi[];
  /** tamamlanan başarımların ödediği Altın (maç Altınından ayrı defter satırı) */
  basarimAltini: number;
  /** sayılmadıysa neden (başarım sayacı işlemez): teslim · hukmen · iptal · ciftTavani */
  sayilmadi: string | null;
  mod: OzetModu;
  /** harita maçı eki */
  harita?: HaritaOdulBilgisi;
  /** harita başarım olayları (H5) */
  haritaOlaylari?: HaritaOlaylari;
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
    const x0 = macXp({ sonuc: tur, krizGordu: g.krizGordu[i]!, kalanStaminaOrani: g.kalanStaminaOrani[i]!, yapay: t.koken === "yapay", oda: g.mod === "oda" });
    const x = g.xpYok?.[i] ? { ...x0, toplam: 0 } : x0;
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

/** Maçı yaz (D5/D6 imzası): oyuncu başına Çekirdek kartı satırları (zaten yazılmışsa boş). */
export function macSonuYaz(depo: Depo, g: MacSonuGirdisi, simdi = Date.now()): [OdulSatiri[], OdulSatiri[]] {
  const r = macSonuKaydet(depo, g, simdi);
  return [r[0]?.cekirdekler ?? [], r[1]?.cekirdekler ?? []];
}

const ozetModu = (g: MacSonuGirdisi): OzetModu => (g.mod === "harita" ? "harita" : g.bot ? "bot" : g.mod === "oda" ? "oda" : "hizli");

/** Harita maçı geçersiz mi (yıldız/ödül/sayaç yok): teslim, hükmen, iptal, 20 sn altı. */
export function haritaGecersiz(g: MacSonuGirdisi): string | null {
  const n = g.sonuc.neden;
  if (n === "iptal" || n === "teslim" || n === "hukmen") return n;
  return g.sureSn < HARITA_MIN_SN ? "kisaMac" : null;
}

/**
 * D7 maç sonu, TEK SQLite işlemi (flint § 5, axiom § 2 #20-#21): `mac` satırı (+ telemetri) + Çekirdek XP/ömür/defter +
 * Altın defteri (`ref = mac:<mac_id>:<oyuncu>`) + başarım sayaçları (+ tamamlananın Altını `basarim:<id>:<oyuncu>`).
 * Aynı `mac_id` ikinci kez hiçbir şey yazmaz (iki bitiş sinyali tek ödeme). `simdi`: sunucu duvar saati (gün 04:00).
 */
export function macSonuKaydet(depo: Depo, g0: MacSonuGirdisi, simdi = Date.now()): [OyuncuOdulu | null, OyuncuOdulu | null] {
  let g = g0;
  const gun = gunNo(simdi);
  const s = g.sonuc;
  return depo.islem((): [OyuncuOdulu | null, OyuncuOdulu | null] => {
    if (depo.mac(g.macId)) return [null, null];
    const [ia, ib] = g.oyuncular;
    // günlük sayaçlar bu maçtan ÖNCE okunur (bu maç dahil numara = önceki + 1)
    const once = [0, 1].map((i) => {
      const id = g.oyuncular[i];
      if (id === null || id === undefined) return null;
      const rakip = g.oyuncular[1 - i] ?? null;
      return {
        gunlukMacNo: depo.gunlukMacSayisi(id, gun) + 1,
        gununIlkGalibiyeti: depo.gunlukGalibiyet(id, gun) === 0,
        ciftGunlukMacNo: rakip !== null && !g.bot ? depo.ciftGunluk(id, rakip, gun) + 1 : 1,
      };
    });
    // harita: XP yalnız günün ilk 10 geçerli harita maçında (01 § 5, G-5)
    if (g.mod === "harita" && g.harita && ia !== null) {
      const xpYok = haritaGecersiz(g) !== null || sayilanHaritaMaci(depo, ia, simdi) >= HARITA_MAC_TAVANI;
      g = { ...g, xpYok: [xpYok, true] };
    }
    const a = ia !== null ? oduller(g, 0) : { satirlar: [], yazim: [] };
    const b = ib !== null ? oduller(g, 1) : { satirlar: [], yazim: [] };
    const yazildi = depo.macYaz({
      id: g.macId, mod: g.mod, a: ia, b: ib,
      kazanan: s.kazanan >= 0 ? g.oyuncular[s.kazanan] ?? null : null,
      puan: `${s.puan[0]}-${s.puan[1]}`, sure: Math.round(g.sureSn), bitis_nedeni: s.neden, katalog_ozeti: g.katalogOzeti,
      baslangic: g.baslangic, takim_a: g.takimKodlari[0], takim_b: g.takimKodlari[1],
      gun, bitis: simdi, bot: g.bot ? 1 : 0,
      bitis_turleri: g.turlar ? JSON.stringify(g.turlar) : null,
      yetenek_a: g.yetenekSayisi ? JSON.stringify(g.yetenekSayisi[0]) : null,
      yetenek_b: g.yetenekSayisi ? JSON.stringify(g.yetenekSayisi[1]) : null,
    }, [...a.yazim, ...b.yazim]);
    if (!yazildi) return [null, null];
    const sonuc: [OyuncuOdulu | null, OyuncuOdulu | null] = [null, null];
    const altinlar: [number | null, number | null] = [null, null];
    for (let i = 0; i < 2; i++) {
      const id = g.oyuncular[i];
      const o = once[i];
      if (id === null || id === undefined || !o) continue;
      const tur = sonucTuru(s, i);
      const rakipTerk = tur === "galibiyet" && (s.neden === "teslim" || s.neden === "hukmen");
      const mod = ozetModu(g);
      const ham = g.ozet?.[i];
      const xp = i === 0 ? a : b;
      const altinModu: AltinModu = mod === "bot" ? "bot" : g.mod === "oda" ? "oda" : "hizli";
      const bitisler = ham?.bitisler ?? [];
      // harita maçı: maç Altını yerine düğüm ödülü (01 § 4–5); yıldız, aşama, kilit, rozet aynı işlemde
      const hr = g.mod === "harita" && g.harita && i === 0
        ? haritaMacSonu(depo, id, {
          macId: g.macId, dugumId: g.harita.dugum, gecersiz: haritaGecersiz(g),
          ozet: { kazandi: tur === "galibiyet", sureSn: g.sureSn, kalanStaminaOrani: g.kalanStaminaOrani[i]!, bitisler },
        }, simdi)
        : null;
      const altin: MacAltini = hr ? { kalemler: [], carpanlar: [], toplam: hr.bilgi.altin + hr.bilgi.rozetAltini, sifirNedeni: null } : macAltini({
        mod: altinModu, misafir: false, sonuc: tur, rakipTerk, sureSn: g.sureSn,
        gunlukMacNo: o.gunlukMacNo, gununIlkGalibiyeti: o.gununIlkGalibiyeti, ciftGunlukMacNo: o.ciftGunlukMacNo,
        stil: {
          yetenekleBitis: bitisler.filter((x) => x.alanNo !== null || (x.yetenekGecenSn !== null && x.yetenekGecenSn <= 3)).length,
          farkliBitisTuru: new Set(bitisler.map((x) => x.tur)).size,
          takimUltisi: ham?.takimUltisi ?? false,
        },
      });
      if (!hr && altin.toplam > 0) depo.altinYaz(id, altin.toplam, "mac", `mac:${g.macId}:${id}`, simdi);
      altinlar[i] = altin.toplam;
      // başarım: sayılmayan maç (teslim/hükmen/iptal, aynı çift günde 3'ten sonra) maç sayacı işletmez
      const sayilmadi = s.neden === "iptal" ? "iptal" : s.neden === "teslim" ? "teslim" : s.neden === "hukmen" ? "hukmen"
        : o.ciftGunlukMacNo > 3 ? "ciftTavani" : hr && !hr.sayilan ? (hr.bilgi.gecersiz ?? "haritaTavani") : null;
      const yuvalar = g.yuvalar[i] ?? [];
      const cikan = new Set(g.sahayaCikan?.[i] ?? [0, 1, 2]);
      const cekirdekler = yuvalar.flatMap((y, k) => (y && !y.devreDisi && cikan.has(k) ? [{ tanimId: y.cekirdek, element: cekirdekBul(y.cekirdek).element, koken: cekirdekBul(y.cekirdek).koken }] : []));
      const ozet: MacOzeti | undefined = ham ? {
        ...ham, mod, sayildi: sayilmadi === null, cekirdekler,
        rakipId: g.bot ? null : g.oyuncular[1 - i] ?? null, evSahibi: g.mod === "oda" && i === 0, destekKanaliCanli: false,
        ...(hr ? { dugumZorluk: hr.zorluk, haritaSayilan: hr.sayilan } : {}),
      } : undefined;
      const seviyeler = depo.cekirdekler(id).map((c) => c.seviye);
      const omurBitti = xp.yazim.filter((x) => x.omur === 0 && (yuvalar.find((y) => y?.cekirdekId === x.cekirdekId)?.omur ?? 0) > 0).length;
      const ba = basarimOlayiIsle(depo, id, {
        ...(ozet ? { mac: ozet } : {}),
        durum: { enYuksekSeviye: Math.max(0, ...seviyeler), yapayOmurBitti: omurBitti, parcaCesidi: depo.parcaCesidi(id) },
      }, simdi);
      sonuc[i] = {
        cekirdekler: xp.satirlar,
        altin: { ...altin, bakiye: depo.bakiye(id) },
        basarimlar: ba.degisimler.map(bildirim).filter((x): x is BasarimBildirimi => x !== null),
        basarimAltini: ba.odul,
        sayilmadi,
        mod,
        ...(hr ? { harita: hr.bilgi, haritaOlaylari: hr.olaylar } : {}),
      };
    }
    depo.macAltinYaz(g.macId, altinlar[0], altinlar[1]);
    return sonuc;
  });
}

export { ILERLEME };
