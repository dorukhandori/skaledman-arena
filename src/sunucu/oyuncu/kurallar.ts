import yasakHam from "../../../veri/yasak-sozcukler.json";
import { ILERLEME } from "../../paylasilan/kurallar/ilerleme.ts";
import { BASLANGIC_SETLERI } from "../../paylasilan/veri/katalog.ts";
import type { TakimUyeKodu } from "../../paylasilan/veri/takimlar.ts";

// Oyuncu kuralları (saf, DB'siz; birim testli): ad biçimi + küfür filtresi (nile B-23), şifre kuralı, takım kuralı
// (tuning § 10: 3 farklı Çekirdek), ödünç topaç doldurma (nile B-10).

const YASAK = yasakHam as { icerir: string[]; kelime: string[]; onek: string[] };

export const AD_EN_AZ = 3;
export const AD_EN_COK = 16;
export const SIFRE_EN_AZ = 8;
export const SIFRE_EN_COK = 128;
const AD_DESENI = /^[\p{L}\p{N}][\p{L}\p{N} _.-]*$/u;

/** Görünen ad: kırpılır, iç boşluklar teke iner. */
export function adTemizle(ad: string): string {
  return ad.normalize("NFC").trim().replace(/\s+/g, " ");
}

/**
 * Tekillik anahtarı: Türkçe küçük harf, sonra ı → i (noktalı/noktasız I ayrımı da yok sayılır: "AYŞE VYVI" =
 * "Ayşe vyvi", "IŞIK" = "ışık" = "işik"). Taklit adlara karşı da daha sıkı.
 */
export function adAnahtari(ad: string): string {
  return adTemizle(ad).toLocaleLowerCase("tr-TR").replace(/ı/g, "i");
}

const SADE: Record<string, string> = {
  ı: "i", ş: "s", ğ: "g", ü: "u", ö: "o", ç: "c", â: "a", î: "i", û: "u",
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i",
};

/** Filtre için sadeleştirme: Türkçe küçük harf, benzer karakterler, sözcüklere bölünmüş. */
export function sadeSozcukler(ad: string): string[] {
  const k = ad.toLocaleLowerCase("tr-TR").normalize("NFC");
  let s = "";
  for (const ch of k) s += SADE[ch] ?? ch;
  return s.split(/[^a-z]+/).filter(Boolean);
}

export function adUygunsuzMu(ad: string): boolean {
  const sozcukler = sadeSozcukler(ad);
  const bitisik = sozcukler.join("");
  if (YASAK.icerir.some((y) => bitisik.includes(y))) return true;
  if (sozcukler.some((w) => YASAK.kelime.includes(w))) return true;
  if (sozcukler.some((w) => YASAK.onek.some((o) => w.startsWith(o)))) return true;
  return false;
}

export type AdHatasi = "uzunluk" | "karakter" | "uygunsuz";

/** ux § 7: "3-16 karakter" / "Bu ad uygun değil." */
export function adDogrula(ham: string): { ad: string; hata: null } | { ad: string; hata: AdHatasi } {
  const ad = adTemizle(ham);
  const uzunluk = [...ad].length;
  if (uzunluk < AD_EN_AZ || uzunluk > AD_EN_COK) return { ad, hata: "uzunluk" };
  if (!AD_DESENI.test(ad)) return { ad, hata: "karakter" };
  if (adUygunsuzMu(ad)) return { ad, hata: "uygunsuz" };
  return { ad, hata: null };
}

export function sifreDogrula(sifre: string): "kisa" | "uzun" | null {
  if (sifre.length < SIFRE_EN_AZ) return "kisa";
  if (sifre.length > SIFRE_EN_COK) return "uzun";
  return null;
}

/** Takım kuralı: 3 yuva, üçü dolu, 3 farklı Çekirdek. Dönen: eksik (boş ya da tekrar eden) yuva sayısı. */
export function takimEksigi(cekirdekler: readonly (string | null)[]): number {
  let eksik = 0;
  const gorulen = new Set<string>();
  for (let k = 0; k < 3; k++) {
    const c = cekirdekler[k] ?? null;
    if (!c || gorulen.has(c)) { eksik++; continue; }
    gorulen.add(c);
  }
  return eksik;
}

/** Sahip olunan yuva (Atölye'de dolu yuva). */
export interface SahipUye { cekirdek: string; govde: string; disk: string; uc: string; seviye: number; yon: "sag" | "sol"; devreDisi?: boolean }

/**
 * Ödünç topaç (nile B-10): sahip olunan Çekirdekler üçe ulaşana kadar boş yuvalar Lv.1 ödünç topaçla dolar.
 * Sunucu belirler: takımda olmayan başlangıç setleri, katalog sırasıyla. Devre dışı (ömrü biten Yapay) Çekirdek
 * yuvası her zaman ödünçle dolar (B-27) ve kotayı tüketmez. `kota`: boş yuvaya verilebilecek ödünç sayısı
 * (`oduncKotasi`: 3 − kullanılabilir Çekirdek); kotayı aşan boş yuva `null` (oynanamaz, ux § 7 "N yuva boş").
 */
export function takimUyeleri(yuvalar: readonly (SahipUye | null)[], kota = 3): { uyeler: (TakimUyeKodu | null)[]; bos: number } {
  const ham = [0, 1, 2].map((k) => yuvalar[k] ?? null);
  const dolu = ham.map((y) => (y && !y.devreDisi ? y : null));
  const kullanilan = new Set(dolu.filter((y): y is SahipUye => !!y).map((y) => y.cekirdek));
  const adaylar = BASLANGIC_SETLERI.filter((s) => !kullanilan.has(s.cekirdek));
  let a = 0;
  let kalanKota = kota;
  let bos = 0;
  const uyeler = dolu.map((y, k): TakimUyeKodu | null => {
    if (y && dolu.findIndex((z) => z?.cekirdek === y.cekirdek) === k) {
      return { cekirdek: y.cekirdek, govde: y.govde, disk: y.disk, uc: y.uc, seviye: y.seviye, odunc: false, yon: y.yon };
    }
    const devreDisi = !!ham[k]?.devreDisi;
    if (!devreDisi) {
      if (kalanKota <= 0) { bos++; return null; }
      kalanKota--;
    }
    const s = adaylar[a++];
    if (!s) throw new Error("ödünç topaç için başlangıç seti kalmadı");
    return { cekirdek: s.cekirdek, govde: s.govde, disk: s.disk, uc: s.uc, seviye: ILERLEME.oduncSeviye, odunc: true, yon: "sag" };
  });
  return { uyeler, bos };
}

/** D5 uyumluluğu: tüm boş yuvalar ödünçle (kota 3). */
export function oduncDoldur(yuvalar: readonly (SahipUye | null)[]): TakimUyeKodu[] {
  return takimUyeleri(yuvalar, 3).uyeler as TakimUyeKodu[];
}

// ---- D6: ad değişimi, takım adı ----

export const AD_DEGISIM_GUN = 30;

/**
 * Ad değişiminin açılmasına kalan gün (0 = şimdi değiştirebilir; ux § 7 "Adı 30 günde bir değiştirebilirsin.").
 * VARSAYIM: kayıttaki ad bir kez serbestçe değişir (ad_degisim = 0); sonra her değişimden 30 gün sonra.
 */
export function adDegisimKalanGun(o: { ad_degisti: number; ad_degisim: number }, simdi: number): number {
  if (o.ad_degisim === 0) return 0;
  const kalanMs = o.ad_degisti + AD_DEGISIM_GUN * 86400_000 - simdi;
  return kalanMs > 0 ? Math.ceil(kalanMs / 86400_000) : 0;
}

export const TAKIM_AD_EN_COK = 20;
const TAKIM_AD_DESENI = /^[\p{L}\p{N}][\p{L}\p{N} _.·'-]*$/u;

export function takimAdDogrula(ham: string): { ad: string; hata: AdHatasi | null } {
  const ad = adTemizle(ham);
  const n = [...ad].length;
  if (n < 1 || n > TAKIM_AD_EN_COK) return { ad, hata: "uzunluk" };
  if (!TAKIM_AD_DESENI.test(ad)) return { ad, hata: "karakter" };
  if (adUygunsuzMu(ad)) return { ad, hata: "uygunsuz" };
  return { ad, hata: null };
}
