import type { HaritaOdulBilgisi } from "../../ag/protokol.ts";
import {
  ASAMA_AD, BASLANGIC_DUGUMU, DURUM, ILK_BOLGELER, ROZET, ROZET_AD, ROZET_ODUL, YILDIZ_AD, acilacaklar, asamaHesapla, bolgeIlerlemesi,
  bolgeKilidi, dugumBolgesi, dugumBul, enKisaYol, girisDugumu, macOdulu, onKosullar, rozetHesapla, yildizSayisi, yildizlar,
  type Durumlar, type Kalem, type YildizOzeti,
} from "../../paylasilan/kurallar/harita.ts";
import { damarKapasitesi } from "../../paylasilan/kurallar/maden.ts";
import { gunNo } from "../../paylasilan/kurallar/ekonomi.ts";
import { USTALIK, kademeBul, type Bolge, type DovusDugumu, type Dugum } from "../../paylasilan/veri/harita.ts";
import { takimKoduYaz } from "../../paylasilan/veri/takimlar.ts";
import type { Depo } from "../db/depo.ts";
import { tamamlananlar } from "./basarimYaz.ts";

// Harita sunucu kuralları (docs/design/harita/01, 08 § 5, 13): ilk açılış (b1-01), yürüme (`git`, konum), sandık,
// harita maçı girişi ve maç sonu (yıldız, aşama, ödül, kilit açma, rozet). Saf kurallar paylasilan/kurallar/harita.ts;
// burası yalnız okur/yazar ve çağıranın SQLite işlemi içinde çalışır. Misafir haritayı görmez (oturum gerekir).

export const ILK_DEVIR = "ilk-devir";
export const HARITA_MAC_TAVANI = USTALIK.gunluk.haritaMaciSayilan;
/** Harita maçı en az bu kadar sürmeli (ekonomi § 15 minimum süre, 01 § 5). */
export const HARITA_MIN_SN = 20;

/** Başarım olayları (H5 `basarimIsle` girdisi): bu işlemde değişen harita durumu. */
export interface HaritaOlaylari { dugumTamam: number; bolgeTamam: string[]; rozet: { bolge: string; rozet: number }[] }
export const bosOlaylar = (): HaritaOlaylari => ({ dugumTamam: 0, bolgeTamam: [], rozet: [] });

export function durumlar(d: Depo, id: number): Record<string, number> {
  const r: Record<string, number> = {};
  for (const s of d.dugumDurumlari(id)) r[s.dugum_id] = s.durum;
  return r;
}

export function haritaAcikMi(d: Depo, id: number): boolean {
  return tamamlananlar(d, id).has(ILK_DEVIR);
}

/** Ocak görünür mü (03 § 1): "İlk Kazı" başarımı ya da elde cevher/külçe (başarım H5'ten önce de çalışsın). */
export function ocakAcikMi(d: Depo, id: number): boolean {
  if (tamamlananlar(d, id).has("ilk-kazi")) return true;
  const c = d.cevherler(id);
  const u = d.ustaliklar(id);
  return u.madencilik > 0 || u.isleme > 0 || c.cevher.some((x) => x > 0) || c.kulce.some((x) => x > 0);
}

/** İlk Devir'i olan oyuncu için b1-01 AÇIK satırını yaz (08 § 10). Dönen: harita açık mı. */
export function haritaHazirla(d: Depo, id: number): boolean {
  if (!haritaAcikMi(d, id)) return false;
  if (!d.dugumSatiri(id, BASLANGIC_DUGUMU)) d.dugumYaz(id, BASLANGIC_DUGUMU, { durum: DURUM.acik });
  return true;
}

export interface AsamaYazimi { onceki: number; durum: number; acilan: string[]; bolgeAcildi: string | null; rozet: number; rozetAltini: number }

/**
 * Düğümün yeni durumunu yaz + komşuları aç + bölge rozeti. `olaylar` başarım için biriktirilir. Çağıranın işleminde.
 */
export function asamaYaz(d: Depo, id: number, dugum: Dugum, yeni: number, simdi: number, olaylar: HaritaOlaylari, ek: { yildiz?: number; basariliVurusEk?: number } = {}): AsamaYazimi {
  const onceki = d.dugumSatiri(id, dugum.id)?.durum ?? DURUM.kilitli;
  const ilkTamam = yeni >= DURUM.temizle && onceki < DURUM.temizle ? simdi : null;
  d.dugumYaz(id, dugum.id, { durum: yeni, yildiz: ek.yildiz ?? 0, ilkTamam, basariliVurusEk: ek.basariliVurusEk ?? 0 });
  const durum = Math.max(onceki, yeni);
  const acilan: string[] = [];
  let bolgeAcildi: string | null = null;
  if (durum > onceki) {
    const dm = durumlar(d, id);
    for (const a of acilacaklar(dugum, durum, dm)) {
      d.dugumYaz(id, a, { durum: DURUM.acik });
      acilan.push(a);
      const b = dugumBolgesi(a);
      if (b && a === girisDugumu(b) && b.id !== dugumBolgesi(dugum.id)?.id) bolgeAcildi = b.id;
    }
    // "TAMAM" (01 § 6) = TEMİZLE; maden/sandık için KEŞFET (13 § 3.1)
    const tamamEsik = dugum.tur === "maden" || dugum.tur === "sandik" ? DURUM.kesfet : DURUM.temizle;
    if (durum >= tamamEsik && onceki < tamamEsik) olaylar.dugumTamam++;
    if (dugum.tur === "patron" && durum >= DURUM.temizle && onceki < DURUM.temizle) olaylar.bolgeTamam.push(dugumBolgesi(dugum.id)!.id);
  }
  const r = rozetIsle(d, id, dugumBolgesi(dugum.id)!, simdi, olaylar);
  return { onceki, durum, acilan, bolgeAcildi, rozet: r.rozet, rozetAltini: r.altin };
}

/** Bölge rozeti (13 § 3.3): yeni kazanılan her basamağın ödülü bir kez (`rozet:<oyuncu>:<bölge>:<n>`). */
export function rozetIsle(d: Depo, id: number, b: Bolge, simdi: number, olaylar: HaritaOlaylari): { rozet: number; altin: number } {
  const rozet = rozetHesapla(b, durumlar(d, id));
  const once = d.bolgeRozetYaz(id, b.id, rozet, simdi);
  let altin = 0;
  for (let n = once + 1; n <= rozet; n++) {
    const o = ROZET_ODUL[n]!;
    if (d.altinYaz(id, o.altin, "rozet", `rozet:${id}:${b.id}:${n}`, simdi)) altin += o.altin;
    if (n === ROZET.gumus) d.gorunumVer(id, `cerceve-${b.id}`, false, simdi);
    olaylar.rozet.push({ bolge: b.id, rozet: n });
  }
  return { rozet: Math.max(rozet, once), altin };
}

function cevherVer(d: Depo, id: number, kalemler: readonly Kalem[], kulce = false): void {
  for (const k of kalemler) d.cevherEkle(id, k.kademe, kulce ? 0 : k.adet, kulce ? k.adet : 0);
}

// ---- yürüme (13 § 1, § 4.2) ----
export type GitSonucu =
  | { ok: true; konum: string; yol: string[]; asama: number; yeniAsama: boolean; acilan: string[]; olaylar: HaritaOlaylari }
  | { ok: false; hata: "kapali" | "yok" | "kilitli" | "yolYok" };

/** Karakteri açık bir düğüme yürüt: yalnız açık/geçilmiş yollardan; ilk varışta KEŞFET (maden/sandık komşuları açar). */
export function haritaGit(d: Depo, id: number, dugumId: string, simdi: number): GitSonucu {
  return d.islem((): GitSonucu => {
    if (!haritaHazirla(d, id)) return { ok: false, hata: "kapali" };
    const dugum = dugumBul(dugumId);
    const b = dugumBolgesi(dugumId);
    if (!dugum || !b?.ilkSurum) return { ok: false, hata: "yok" };
    const dm = durumlar(d, id);
    if ((dm[dugumId] ?? 0) < DURUM.acik) return { ok: false, hata: "kilitli" };
    const konum = d.oyuncu(id)?.harita_konum ?? null;
    // bölge değişince karakter bölgenin girişinden başlar (varsaydım: bölge başına son konum tutulmaz)
    const from = konum && dugumBolgesi(konum)?.id === b.id && (dm[konum] ?? 0) >= DURUM.acik ? konum : girisDugumu(b);
    const yol = enKisaYol(b, dm, from, dugumId);
    if (!yol) return { ok: false, hata: "yolYok" };
    d.haritaKonumYaz(id, dugumId);
    const olaylar = bosOlaylar();
    const yeni = asamaHesapla(dugum, dm[dugumId]!, { tur: "varis" });
    const y = asamaYaz(d, id, dugum, yeni, simdi, olaylar);
    return { ok: true, konum: dugumId, yol, asama: y.durum, yeniAsama: y.durum > y.onceki, acilan: y.acilan, olaylar };
  });
}

// ---- sandık (01 § 3, 08 § 4) ----
export type SandikSonucu =
  | { ok: true; altin: number; cevher: Kalem; bakiye: number; acilan: string[]; olaylar: HaritaOlaylari }
  | { ok: false; hata: "kapali" | "yok" | "tur" | "kilitli" | "acilmis" | "uzak" };

export function sandikAc(d: Depo, id: number, dugumId: string, simdi: number): SandikSonucu {
  return d.islem((): SandikSonucu => {
    if (!haritaHazirla(d, id)) return { ok: false, hata: "kapali" };
    const dugum = dugumBul(dugumId);
    if (!dugum || !dugumBolgesi(dugumId)?.ilkSurum) return { ok: false, hata: "yok" };
    if (dugum.tur !== "sandik") return { ok: false, hata: "tur" };
    const durum = d.dugumSatiri(id, dugumId)?.durum ?? 0;
    if (durum < DURUM.acik) return { ok: false, hata: "kilitli" };
    if (d.oyuncu(id)?.harita_konum !== dugumId) return { ok: false, hata: "uzak" };
    if (durum >= DURUM.temizle) return { ok: false, hata: "acilmis" };
    // tek seferlik (`sandik:<oyuncu>:<düğüm>`): olasılık yok, içerik sabit (11 § 10 #14)
    if (!d.altinYaz(id, dugum.odul.altin, "sandik", `sandik:${id}:${dugumId}`, simdi)) return { ok: false, hata: "acilmis" };
    d.cevherEkle(id, dugum.odul.cevher.kademe, dugum.odul.cevher.adet);
    const olaylar = bosOlaylar();
    const y = asamaYaz(d, id, dugum, asamaHesapla(dugum, Math.max(durum, DURUM.kesfet), { tur: "sandik" }), simdi, olaylar);
    return { ok: true, altin: dugum.odul.altin, cevher: { ...dugum.odul.cevher }, bakiye: d.bakiye(id), acilan: y.acilan, olaylar };
  });
}

// ---- harita maçı (08 § 5) ----
export type DovusGirisi = { ok: true; dugum: DovusDugumu } | { ok: false; hata: "kapali" | "yok" | "tur" | "kilitli" | "uzak" };

/** Oda katılımı (`mod:"harita"`): düğüm açık DÜŞMAN/PATRON ve karakter orada. */
export function dovusGirisi(d: Depo, id: number, dugumId: string): DovusGirisi {
  if (!haritaHazirla(d, id)) return { ok: false, hata: "kapali" };
  const dugum = dugumBul(dugumId);
  if (!dugum || !dugumBolgesi(dugumId)?.ilkSurum) return { ok: false, hata: "yok" };
  if (dugum.tur !== "dusman" && dugum.tur !== "patron") return { ok: false, hata: "tur" };
  if ((d.dugumSatiri(id, dugumId)?.durum ?? 0) < DURUM.acik) return { ok: false, hata: "kilitli" };
  if (d.oyuncu(id)?.harita_konum !== dugumId) return { ok: false, hata: "uzak" };
  return { ok: true, dugum };
}

/** Düğümün bot takım kodu (harita.json `takim`, üye seviyesi `botSeviye`; ödünç değil). */
export function haritaBotTakimi(dugum: DovusDugumu): string {
  return takimKoduYaz(dugum.takim.map(([cekirdek, govde, disk, uc]) => ({ cekirdek, govde, disk, uc, seviye: dugum.botSeviye, odunc: false, yon: "sag" as const })));
}

export interface HaritaMacGirdisi {
  macId: string;
  dugumId: string;
  /** maç geçerli değilse neden (teslim, hükmen, iptal, kisaMac): yıldız/ödül/aşama yok, sayaç işlemez */
  gecersiz: string | null;
  ozet: YildizOzeti;
}

/** Günün sayılan harita maçı sayısı (bu maçtan önce). */
export function sayilanHaritaMaci(d: Depo, id: number, simdi: number): number {
  return d.gunlukHaritaMaci(id, gunNo(simdi));
}

/** Harita maçı sonu (çağıranın işleminde; `mac` satırı yazıldıktan sonra). */
export function haritaMacSonu(d: Depo, id: number, g: HaritaMacGirdisi, simdi: number): { bilgi: HaritaOdulBilgisi; olaylar: HaritaOlaylari; sayilan: boolean; zorluk: number } {
  const dugum = dugumBul(g.dugumId) as DovusDugumu;
  const bolge = dugumBolgesi(g.dugumId)!;
  const olaylar = bosOlaylar();
  const sayilanMacOnce = sayilanHaritaMaci(d, id, simdi);
  const satir = d.dugumSatiri(id, g.dugumId);
  const durumOnce = satir?.durum ?? DURUM.kilitli;
  const maskeOnce = satir?.yildiz ?? 0;
  const bos: HaritaOdulBilgisi = {
    dugum: g.dugumId, maske: 0, yildiz: maskeOnce, yeniYildiz: 0, sartlar: [...dugum.yildiz], asamaOnce: durumOnce, asama: durumOnce,
    altin: 0, cevher: [], kulce: [], gorunum: [], acilan: [], bolgeAcildi: null, sayilan: false, sayilanMac: sayilanMacOnce,
    tavan: HARITA_MAC_TAVANI, gecersiz: g.gecersiz, rozet: d.bolgeRozetleri(id)[bolge.id] ?? 0, rozetAltini: 0,
  };
  d.macHaritaYaz(g.macId, g.dugumId, null);
  if (g.gecersiz) return { bilgi: bos, olaylar, sayilan: false, zorluk: dugum.zorluk };
  const sayilan = sayilanMacOnce < HARITA_MAC_TAVANI;
  const maske = yildizlar(g.ozet, dugum.yildiz);
  d.macHaritaYaz(g.macId, g.dugumId, maske);
  const o = macOdulu({ bolge, dugum, durumOnce: Math.max(durumOnce, DURUM.kesfet), maskeOnce, maske, kazandi: g.ozet.kazandi, sayilan });
  // yıldız Altını bit başına bir kez (`yildiz:<oyuncu>:<düğüm>:<bit>`), kalanı maç başına (`harita:<maç>:<oyuncu>`)
  let altin = 0;
  const yeniBitler = o.yeniMaske & ~maskeOnce;
  const yildizAltini = yildizSayisi(yeniBitler) * dugum.odul.altinYildiz;
  for (let bit = 0; bit < 3; bit++) {
    if (yeniBitler & (1 << bit) && d.altinYaz(id, dugum.odul.altinYildiz, "yildiz", `yildiz:${id}:${g.dugumId}:${bit}`, simdi)) altin += dugum.odul.altinYildiz;
  }
  const kalan = o.altin - yildizAltini;
  if (kalan > 0 && d.altinYaz(id, kalan, "harita", `harita:${g.macId}:${id}`, simdi)) altin += kalan;
  cevherVer(d, id, o.cevher);
  cevherVer(d, id, o.kulce, true);
  for (const gr of o.gorunum) d.gorunumVer(id, gr, false, simdi);
  const y = asamaYaz(d, id, dugum, o.durum, simdi, olaylar, { yildiz: o.yeniMaske });
  return {
    bilgi: {
      ...bos, maske, yildiz: o.yeniMaske, yeniYildiz: yildizSayisi(yeniBitler), asama: y.durum, altin, cevher: o.cevher, kulce: o.kulce,
      gorunum: o.gorunum, acilan: y.acilan, bolgeAcildi: y.bolgeAcildi, sayilan, sayilanMac: sayilanMacOnce + 1, rozet: y.rozet, rozetAltini: y.rozetAltini,
    },
    olaylar, sayilan, zorluk: dugum.zorluk,
  };
}

// ---- görünüm (GET /api/harita; 08 § 4 + 13 § 4.2) ----
export function haritaGorunumu(d: Depo, id: number, simdi: number) {
  const acik = haritaHazirla(d, id);
  const satirlar = new Map(d.dugumDurumlari(id).map((s) => [s.dugum_id, s]));
  const dm: Durumlar = Object.fromEntries([...satirlar].map(([k, v]) => [k, v.durum]));
  const gun = gunNo(simdi);
  const gunluk = d.madenGunlukler(id, gun);
  const rozetler = d.bolgeRozetleri(id);
  const o = d.oyuncu(id);
  const yildizToplam = { alinan: 0, toplam: 0 };
  const bolgeler = ILK_BOLGELER.map((b) => {
    const k = bolgeKilidi(b, dm);
    const ilerleme = bolgeIlerlemesi(b, dm);
    let alinan = 0;
    let toplam = 0;
    const dugumler = b.dugumler.map((x) => {
      const s = satirlar.get(x.id);
      const durum = s?.durum ?? DURUM.kilitli;
      const ortak = { id: x.id, tur: x.tur, konum: x.konum, durum, asama: ASAMA_AD[durum]!, onKosul: durum === DURUM.kilitli ? onKosullar(b, x.id) : [] };
      if (x.tur === "dusman" || x.tur === "patron") {
        const maske = s?.yildiz ?? 0;
        alinan += yildizSayisi(maske);
        toplam += 3;
        return {
          ...ortak, ad: x.tur === "patron" ? x.ad : null, zorluk: x.zorluk, yildiz: maske,
          sartlar: x.yildiz.map((y, i) => ({ id: y, ad: YILDIZ_AD[y], alindi: (maske & (1 << i)) !== 0 })),
          odul: { altinYildiz: x.odul.altinYildiz, cevherYildiz: x.odul.cevherYildiz, ...(x.tur === "patron" ? { altinIlk: x.odul.altinIlk, kulceIlk: x.odul.kulceIlk } : {}) },
        };
      }
      if (x.tur === "maden") {
        const usta = durum >= DURUM.ustalas;
        const kap = damarKapasitesi(x, usta);
        const k = kademeBul(x.kademe);
        return {
          ...ortak, ad: x.ad ?? null, kademe: x.kademe, kademeAd: k.ad, esik: k.esik, kapasite: kap.kapasite, kalanVurus: Math.max(0, kap.kapasite - (gunluk[x.id] ?? 0)),
          basariliVurus: s?.basarili_vurus ?? 0, ustaDamar: usta, nadir: { kademe: x.nadir.kademe, esik: kademeBul(Math.min(x.nadir.kademe, 8)).esik },
        };
      }
      return { ...ortak, odul: x.odul, acildi: durum >= DURUM.temizle };
    });
    yildizToplam.alinan += alinan;
    yildizToplam.toplam += toplam;
    return { id: b.id, no: b.no, ad: b.ad, element: b.element, acik: k.acik, kilitNedeni: k.kilitNedeni, yildiz: { alinan, toplam }, ilerleme, rozet: rozetler[b.id] ?? 0, rozetAd: ROZET_AD[rozetler[b.id] ?? 0], dugumler };
  });
  return {
    acik, gun, konum: o?.harita_konum ?? null, baslangic: BASLANGIC_DUGUMU, karakter: o?.karakter ?? 0, yildiz: yildizToplam, bolgeler,
    sayac: { haritaMac: { sayilan: Math.min(HARITA_MAC_TAVANI, sayilanHaritaMaci(d, id, simdi)), tavan: HARITA_MAC_TAVANI }, vurus: { bugun: gunluk["*"] ?? 0, tam: USTALIK.gunluk.vurusTam, tavan: USTALIK.gunluk.vurusYarim } },
  };
}
