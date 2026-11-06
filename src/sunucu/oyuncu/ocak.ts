import { randomInt } from "node:crypto";
import {
  degerPuani, dovmeTecrubesi, eritmeOrani, eritmeToplu, kozmetikTarifler, malzemeliAd, parcaEritmeGeri, parcaMaliyeti, parcaTecrubesi,
  tarifBul, tarifDurumu, uretilebilirKademe, ustaIsiOlasiligi, yenidenDovBedeli,
} from "../../paylasilan/kurallar/ocak.ts";
import { marketDurumu } from "../../paylasilan/kurallar/market.ts";
import { bantEtiketi, basariSansi, seviye, tecrubeEkle, ustalikGorunumu } from "../../paylasilan/kurallar/ustalik.ts";
import { MADENLER, SURUM_KADEME_TAVANI, kademeBul } from "../../paylasilan/veri/harita.ts";
import { PARCALAR, parcaBul } from "../../paylasilan/veri/katalog.ts";
import type { Parca } from "../../paylasilan/veri/semalar.ts";
import type { Depo } from "../db/depo.ts";
import { basarimOlayiIsle, ilerlemeler, tamamlananlar } from "./basarimYaz.ts";
import { ocakAcikMi } from "./harita.ts";

// Ocak (docs/design/harita/03, 12, 08 § 4): ERİT (cevher → külçe), DÖV (kozmetik arma/çerçeve, tek seferlik; Usta
// işi + YENİDEN DÖV), PARÇA (kilidi açık katalog parçası, seçilen kademenin külçesinden; malzeme biçimi yalnız görünüm),
// PARÇA ERİT (%50 aynı kademe), VİTRİN. Her yazım TEK işlem ve `ref` ile idempotent (`isleme_defteri.ref` UNIQUE).
// G-0: malzeme `katki`, sim, hash ve takım koduna girmez; kilitli parça craft ile de üretilemez (G-6).

export type Zar = () => number;
export const cryptoZar: Zar = () => randomInt(0, 1_000_000) / 1_000_000;

/** Başarım olayları (H5). */
export interface OcakOlaylari {
  eritme: number;
  ustaIsi: { tur: string }[];
  parcaUret: number;
  ustalikSeviye: { isleme?: number };
}
export const bosOcakOlaylari = (): OcakOlaylari => ({ eritme: 0, ustaIsi: [], parcaUret: 0, ustalikSeviye: {} });

function islemeYaz(d: Depo, id: number, ekX100: number, o: OcakOlaylari): { once: number; sonra: number } {
  const u = d.ustaliklar(id).isleme;
  const s = tecrubeEkle(u, ekX100);
  d.ustalikYaz(id, "isleme", s);
  if (seviye(s) > seviye(u)) o.ustalikSeviye.isleme = seviye(s);
  return { once: u, sonra: s };
}

/** Önceki işlemin sonucu (aynı `ref`): idempotent tekrar. */
function oncekiSonuc(d: Depo, id: number, ref: string): unknown | null {
  const r = d.islemeRef(ref);
  if (!r) return null;
  // tekrar: olaylar boş (başarım iki kez sayılmaz)
  return { ...(JSON.parse(r.cikti) as object), olaylar: bosOcakOlaylari(), tekrar: true };
}

// ---- ERİT ----
export type EritSonucu =
  | { ok: true; sonuc: { kulce: number; curuf: number; harcanan: number; parti: number; basarili: number }; cevher: number[]; kulce: number[]; ustalik: ReturnType<typeof ustalikGorunumu>; olaylar: OcakOlaylari; tekrar?: boolean }
  | { ok: false; hata: "kapali" | "ustalik" | "yetersiz" | "kademe"; gerekli?: number };

export function eritYap(d: Depo, id: number, g: { kademe: number; parti: number; ref: string }, simdi: number, zar: Zar = cryptoZar): EritSonucu {
  return d.islem((): EritSonucu => {
    const once = oncekiSonuc(d, id, g.ref);
    if (once) return once as EritSonucu;
    if (!ocakAcikMi(d, id)) return { ok: false, hata: "kapali" };
    if (g.kademe > SURUM_KADEME_TAVANI) return { ok: false, hata: "kademe" };
    const esik = kademeBul(g.kademe).esik;
    const U = seviye(d.ustaliklar(id).isleme);
    if (U < esik) return { ok: false, hata: "ustalik", gerekli: esik };
    const c = d.cevherler(id);
    const oran = eritmeOrani(U, esik);
    if (c.cevher[g.kademe - 1]! < oran) return { ok: false, hata: "yetersiz", gerekli: oran };
    const zarlar = Array.from({ length: g.parti }, () => zar());
    const t = eritmeToplu(U, g.kademe, c.cevher[g.kademe - 1]!, g.parti, zarlar);
    const o = bosOcakOlaylari();
    o.eritme = t.partiler.filter((p) => p.basari).length;
    d.cevherEkle(id, g.kademe, -t.harcanan, t.kulce);
    const u = islemeYaz(d, id, t.tecrubeX100, o);
    const sonuc = { kulce: t.kulce, curuf: t.curuf, harcanan: t.harcanan, parti: t.partiler.length, basarili: o.eritme };
    const son = d.cevherler(id);
    const cikti: EritSonucu = { ok: true, sonuc, cevher: son.cevher, kulce: son.kulce, ustalik: ustalikGorunumu(u.sonra), olaylar: o };
    d.islemeYaz(id, { tur: "erit", tarif_id: null, girdi: { [g.kademe]: t.harcanan }, cikti: { ...cikti, uretilenKulce: t.kulce }, usta: false, ref: g.ref, zaman: simdi });
    return cikti;
  });
}

// ---- DÖV (kozmetik) ----
export type DovSonucu =
  | { ok: true; cikti: string; usta: boolean; ustaSansi: number; bakiye: number; kulce: number[]; ustalik: ReturnType<typeof ustalikGorunumu>; olaylar: OcakOlaylari; tekrar?: boolean }
  | { ok: false; hata: "kapali" | "yok" | "bayrak" | "sahip" | "sahipDegil" | "ustalik" | "eksik" | "altin"; gerekli?: number };

export function dovYap(d: Depo, id: number, g: { tarif: string; ref: string; yeniden?: boolean }, simdi: number, zar: Zar = cryptoZar): DovSonucu {
  return d.islem((): DovSonucu => {
    const once = oncekiSonuc(d, id, g.ref);
    if (once) return once as DovSonucu;
    if (!ocakAcikMi(d, id)) return { ok: false, hata: "kapali" };
    const t = tarifBul(g.tarif);
    if (!t || (!t.ilkSurum && !t.bayrak)) return { ok: false, hata: "yok" };
    if (t.bayrak) return { ok: false, hata: "bayrak" };
    const gorunum = t.cikti.gorunum!;
    const sahip = d.gorunumler(id).find((x) => x.gorunum_id === gorunum);
    if (sahip && !g.yeniden) return { ok: false, hata: "sahip" };
    if (!sahip && g.yeniden) return { ok: false, hata: "sahipDegil" };
    const U = seviye(d.ustaliklar(id).isleme);
    if (U < t.esik) return { ok: false, hata: "ustalik", gerekli: t.esik };
    const bedel = g.yeniden ? yenidenDovBedeli(t) : { girdi: t.girdi.map((x) => ({ kademe: x.kademe, kulce: x.kulce })), altin: t.altin };
    const c = d.cevherler(id);
    if (bedel.girdi.some((x) => c.kulce[x.kademe - 1]! < x.kulce)) return { ok: false, hata: "eksik" };
    const bakiye = d.bakiye(id);
    if (bakiye < bedel.altin) return { ok: false, hata: "altin", gerekli: bedel.altin - bakiye };
    const ustaSansi = ustaIsiOlasiligi(U, t.esik);
    const usta = zar() < ustaSansi;
    for (const x of bedel.girdi) d.cevherEkle(id, x.kademe, 0, -x.kulce);
    if (bedel.altin > 0) d.altinYaz(id, -bedel.altin, "ocak", `ocak:${g.ref}`, simdi);
    d.gorunumVer(id, gorunum, usta, simdi);
    const o = bosOcakOlaylari();
    if (usta) o.ustaIsi.push({ tur: t.tur });
    const u = g.yeniden ? { sonra: d.ustaliklar(id).isleme } : islemeYaz(d, id, dovmeTecrubesi(t, U), o);
    const cikti: DovSonucu = { ok: true, cikti: gorunum, usta, ustaSansi, bakiye: d.bakiye(id), kulce: d.cevherler(id).kulce, ustalik: ustalikGorunumu(u.sonra), olaylar: o };
    d.islemeYaz(id, { tur: g.yeniden ? "yeniden" : "dov", tarif_id: t.id, girdi: bedel, cikti, usta, ref: g.ref, zaman: simdi });
    return cikti;
  });
}

// ---- PARÇA (12 § 2) ----
/** Parça Market kilidi açık mı (G-6: başarım parçayı var eder; craft da aynı kilidi okur). */
export function parcaKilidiAcik(d: Depo, id: number, p: Parca): boolean {
  const m = marketDurumu(p, { sahipAdet: 0, tamamlanan: tamamlananlar(d, id), ilerleme: ilerlemeler(d, id) });
  return m.durum === "acik";
}

export interface UretilenParca { anahtar: string; id: number; tur: string; tanim: string; ad: string; malzeme: number; seri: number; yapimciAd: string; usta: boolean; uretim: number; deger: number }

export type ParcaSonucu =
  | { ok: true; parca: UretilenParca; bakiye: number; kulce: number[]; ustalik: ReturnType<typeof ustalikGorunumu>; olaylar: OcakOlaylari; tekrar?: boolean }
  | { ok: false; hata: "kapali" | "yok" | "kilitli" | "kademe" | "ustalik" | "eksik" | "altin"; gerekli?: number };

export function parcaUret(d: Depo, id: number, g: { tanim: string; kademe: number; ref: string }, simdi: number, zar: Zar = cryptoZar): ParcaSonucu {
  return d.islem((): ParcaSonucu => {
    const once = oncekiSonuc(d, id, g.ref);
    if (once) return once as ParcaSonucu;
    if (!ocakAcikMi(d, id)) return { ok: false, hata: "kapali" };
    const p = PARCALAR.parcalar.find((x) => x.id === g.tanim);
    if (!p) return { ok: false, hata: "yok" };
    if (!parcaKilidiAcik(d, id, p)) return { ok: false, hata: "kilitli" };
    const m = parcaMaliyeti(p, g.kademe);
    if (!m || g.kademe > SURUM_KADEME_TAVANI) return { ok: false, hata: "kademe", ...(m ? {} : { gerekli: parcaMaliyeti(p, 8)?.minKademe ?? 1 }) };
    const U = seviye(d.ustaliklar(id).isleme);
    if (U < m.esik) return { ok: false, hata: "ustalik", gerekli: m.esik };
    if (d.cevherler(id).kulce[g.kademe - 1]! < m.kulce) return { ok: false, hata: "eksik", gerekli: m.kulce };
    const bakiye = d.bakiye(id);
    if (bakiye < m.iscilik) return { ok: false, hata: "altin", gerekli: m.iscilik - bakiye };
    const usta = zar() < ustaIsiOlasiligi(U, m.esik);
    d.cevherEkle(id, g.kademe, 0, -m.kulce);
    if (m.iscilik > 0) d.altinYaz(id, -m.iscilik, "ocak", `ocak:${g.ref}`, simdi);
    const seri = d.sonrakiSeri(p.id, g.kademe);
    const yapimciAd = d.oyuncu(id)!.ad;
    const v = d.uretilmisParcaVer(id, p.id, { malzeme: g.kademe, yapimciAd, seri, usta, simdi });
    const o = bosOcakOlaylari();
    o.parcaUret = 1;
    if (usta) o.ustaIsi.push({ tur: "parca" });
    const u = islemeYaz(d, id, parcaTecrubesi(m, U), o);
    basarimOlayiIsle(d, id, { durum: { parcaCesidi: d.parcaCesidi(id) } }, simdi);
    const parca: UretilenParca = {
      anahtar: `${v.tur === "cekirdek" ? "c" : "p"}${v.id}`, id: v.id, tur: v.tur, tanim: p.id, ad: malzemeliAd(p.ad, g.kademe), malzeme: g.kademe, seri, yapimciAd, usta,
      uretim: simdi, deger: degerPuani(m.kulce, g.kademe, usta),
    };
    const cikti: ParcaSonucu = { ok: true, parca, bakiye: d.bakiye(id), kulce: d.cevherler(id).kulce, ustalik: ustalikGorunumu(u.sonra), olaylar: o };
    d.islemeYaz(id, { tur: "parca", tarif_id: p.id, girdi: { [g.kademe]: m.kulce, altin: m.iscilik }, cikti, usta, ref: g.ref, zaman: simdi });
    return cikti;
  });
}

/** Oyuncunun üretilmiş parçaları (parça + Çekirdek), değer puanıyla. */
export function uretilenler(d: Depo, id: number): UretilenParca[] {
  const r: UretilenParca[] = [];
  const ekle = (tur: "p" | "c", s: { id: number; tanim_id: string; malzeme?: number | null; seri?: number | null; yapimci_ad?: string | null; usta?: number; uretim?: number | null }) => {
    if (s.malzeme === null || s.malzeme === undefined) return;
    const p = parcaBul(s.tanim_id);
    const m = parcaMaliyeti(p, s.malzeme);
    r.push({
      anahtar: `${tur}${s.id}`, id: s.id, tur: p.tur, tanim: p.id, ad: malzemeliAd(p.ad, s.malzeme), malzeme: s.malzeme, seri: s.seri ?? 0,
      yapimciAd: s.yapimci_ad ?? "", usta: s.usta === 1, uretim: s.uretim ?? 0, deger: m ? degerPuani(m.kulce, s.malzeme, s.usta === 1) : 0,
    });
  };
  for (const c of d.cekirdekler(id) as unknown as Parameters<typeof ekle>[1][]) ekle("c", c);
  for (const p of d.parcalar(id)) ekle("p", p);
  return r;
}

export type ParcaEritSonucu = { ok: true; kulce: { kademe: number; adet: number }; kulceler: number[]; tekrar?: boolean } | { ok: false; hata: "yok" | "marketBicimi" | "takimda" };

/** Üretilmiş parçayı erit: külçenin %50'si aynı kademede (Market biçimi eritilemez; takımdaki eritilemez). */
export function parcaErit(d: Depo, id: number, g: { parcaId: number; tur?: "parca" | "cekirdek"; ref: string }, simdi: number): ParcaEritSonucu {
  return d.islem((): ParcaEritSonucu => {
    const once = oncekiSonuc(d, id, g.ref);
    if (once) return once as ParcaEritSonucu;
    const tur = g.tur ?? "parca";
    const s = tur === "cekirdek"
      ? (d.cekirdek(id, g.parcaId) as unknown as { tanim_id: string; malzeme?: number | null } | null)
      : d.parcalar(id).find((x) => x.id === g.parcaId) ?? null;
    if (!s) return { ok: false, hata: "yok" };
    if (s.malzeme === null || s.malzeme === undefined) return { ok: false, hata: "marketBicimi" };
    if (d.takimdaMi(id, tur, g.parcaId)) return { ok: false, hata: "takimda" };
    const m = parcaMaliyeti(parcaBul(s.tanim_id), s.malzeme)!;
    const geri = parcaEritmeGeri(m.kulce);
    d.ornekSil(id, tur, g.parcaId);
    const anahtar = `${tur === "cekirdek" ? "c" : "p"}${g.parcaId}`;
    const vitrin = vitrinOku(d, id).filter((x) => x !== anahtar);
    d.vitrinYaz(id, vitrin);
    if (geri > 0) d.cevherEkle(id, s.malzeme, 0, geri);
    const cikti: ParcaEritSonucu = { ok: true, kulce: { kademe: s.malzeme, adet: geri }, kulceler: d.cevherler(id).kulce };
    d.islemeYaz(id, { tur: "parcaErit", tarif_id: s.tanim_id, girdi: { [anahtar]: 1 }, cikti, usta: false, ref: g.ref, zaman: simdi });
    return cikti;
  });
}

export function vitrinOku(d: Depo, id: number): string[] {
  try { return (JSON.parse(d.oyuncu(id)?.vitrin ?? "[]") as string[]).slice(0, 3); } catch { return []; }
}

/** Vitrin: yalnız oyuncunun ÜRETTİĞİ (malzemeli) örnekler, en çok 3, tekrarsız. */
export function vitrinYaz(d: Depo, id: number, parcalar: readonly string[]): { ok: true; vitrin: string[] } | { ok: false; hata: "sahipDegil" } {
  const sahip = new Set(uretilenler(d, id).map((x) => x.anahtar));
  const temiz = [...new Set(parcalar)];
  if (temiz.some((x) => !sahip.has(x))) return { ok: false, hata: "sahipDegil" };
  d.vitrinYaz(id, temiz);
  return { ok: true, vitrin: temiz };
}

/** Koleksiyon değeri (12 § 3): üretilmiş parçaların değer puanı toplamı. */
export function koleksiyonDegeri(d: Depo, id: number): number {
  return uretilenler(d, id).reduce((t, p) => t + p.deger, 0);
}

// ---- GET /api/ocak ----
export function ocakGorunumu(d: Depo, id: number) {
  const c = d.cevherler(id);
  const u = d.ustaliklar(id);
  const U = seviye(u.isleme);
  const bakiye = d.bakiye(id);
  const gorunumler = d.gorunumler(id);
  const sahipG = new Set(gorunumler.map((x) => x.gorunum_id));
  const kademeler = MADENLER.filter((k) => k.ilkSurum).map((k) => ({
    kademe: k.kademe, id: k.id, ad: k.ad, renk: k.renk, esik: k.esik, cevher: c.cevher[k.kademe - 1]!, kulce: c.kulce[k.kademe - 1]!,
    oran: eritmeOrani(U, k.esik), basari: basariSansi(U, k.esik), bant: bantEtiketi(U - k.esik), eritilebilir: U >= k.esik,
  }));
  const tarifler = kozmetikTarifler().map((t) => {
    const durum = tarifDurumu(t, { U, kulce: c.kulce, bakiye, sahip: sahipG.has(t.cikti.gorunum!) });
    if (durum === "gizli") return { id: `gizli-${t.id.length}-${t.kademe}`, durum, tur: t.tur, kademe: t.kademe, ad: "???" };
    return {
      id: t.id, durum, tur: t.tur, kademe: t.kademe, ad: `${kademeBul(t.kademe).ad.replace(/ CEVHERİ$/, "")} ${t.tur === "arma" ? "ARMASI" : "ÇERÇEVE"}`,
      girdi: t.girdi, altin: t.altin, esik: t.esik, cikti: t.cikti.gorunum!, ustaIsiSansi: ustaIsiOlasiligi(U, t.esik),
      usta: gorunumler.find((x) => x.gorunum_id === t.cikti.gorunum)?.usta === 1, yeniden: yenidenDovBedeli(t),
    };
  });
  const parcalar = PARCALAR.parcalar.map((p) => {
    const acik = parcaKilidiAcik(d, id, p);
    const enAz = uretilebilirKademe(p, U);
    const kademeBilgi = [1, 2, 3, 4].filter((k) => k <= SURUM_KADEME_TAVANI).map((k) => {
      const m = parcaMaliyeti(p, k);
      if (!m) return { kademe: k, uygun: false as const };
      return { kademe: k, uygun: true as const, kulce: m.kulce, iscilik: m.iscilik, esik: m.esik, ustalik: U >= m.esik, hazir: U >= m.esik && c.kulce[k - 1]! >= m.kulce && bakiye >= m.iscilik };
    });
    return { id: p.id, ad: p.ad, tur: p.tur, katman: p.katman, element: p.element ?? null, acik, enAzKademe: enAz, kademeler: kademeBilgi };
  });
  return {
    acik: ocakAcikMi(d, id), bakiye, cevher: c.cevher, kulce: c.kulce, kademeler,
    ustalik: { madencilik: ustalikGorunumu(u.madencilik), isleme: ustalikGorunumu(u.isleme) },
    tarifler, parcalar, gorunumler: gorunumler.map((x) => ({ id: x.gorunum_id, usta: x.usta === 1 })),
    uretilenler: uretilenler(d, id), vitrin: vitrinOku(d, id), koleksiyonDegeri: koleksiyonDegeri(d, id),
  };
}
