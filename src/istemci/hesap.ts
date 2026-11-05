import type { TakimDegerlendirmesi, TaslakTopac } from "../paylasilan/kurallar/atolye.ts";
import type { CubukOzeti } from "../paylasilan/veri/cubuklar.ts";
import type { TakimUyeKodu } from "../paylasilan/veri/takimlar.ts";

// İstemci hesap cephesi (D5): REST uçları (oturum HTTP-only çerezde; JS çereze erişmez), `/api/ben` görünümü,
// ux § 7 hata metinleri. İstemci hiçbir sayaç/Altın/XP yazmaz; yalnız ister ve gösterir.

export interface CekirdekGorunumu {
  id: number; tanimId: string; ad: string; element: string; koken: string; seviye: number; tecrube: number;
  alt: number; ust: number; omur: number | null; yon: string;
}
export interface TakimGorunumu { id: string; ad: string; uyeler: TakimUyeKodu[]; eksik: number; bos: number }
export type Ben =
  | { girisli: false; protokol: number; katalog: string }
  | {
    girisli: true; protokol: number; katalog: string;
    oyuncu: { id: number; ad: string; arma: string | null; renk: string | null; destekKanali: string | null; profilTamam: boolean };
    cekirdekler: CekirdekGorunumu[]; takimlar: TakimGorunumu[]; basarimlar: string[]; marketAcik: boolean;
    /** D6: Atölye'de seçilen aktif takım numarası */
    aktifTakim?: string;
    /** D7: Altın bakiyesi */
    altin?: number;
    /** TEMIZLIK #5: son maç özeti (sunucu `SonMacSema`); hiç maç yoksa null */
    sonMac?: SonMacGorunumu | null;
  };
export interface SonMacGorunumu { neden: string; kazandi: boolean; bitis: string | null; ringOutKayip: boolean; zaman: number; macSayisi: number }
export type Girisli = Extract<Ben, { girisli: true }>;

export class BakimHatasi extends Error {}

// ---- D6: Atölye görünümü (`GET /api/atolye`) ----
export interface DefterGorunumu { mac: number; galibiyet: number; krizGalibiyet: number; enUzunDonusSn: number; kararma: number }
export interface AtolyeCekirdegi {
  id: number; tanimId: string; ad: string; element: string; koken: string; ruh: string; seviye: number; tecrube: number;
  alt: number; ust: number; omur: number | null; yon: "sag" | "sol"; ciftYon: boolean; devreDisi: boolean; defter: DefterGorunumu;
}
export interface AtolyeParcasi { id: number; tanimId: string; tur: "govde" | "disk" | "uc" | "cekirdek" }
export interface AtolyeTakimi {
  takimNo: number; ad: string; yuvalar: TaslakTopac[]; degerlendirme: TakimDegerlendirmesi; oynanabilir: boolean;
  uyeler: (TakimUyeKodu | null)[]; cubuklar: (CubukOzeti | null)[];
}
export interface AtolyeGorunumu {
  oyuncu: { id: number; ad: string; arma: string | null; renk: string | null; destekKanali: string | null; adKalanGun: number };
  aktifTakim: number;
  cekirdekler: AtolyeCekirdegi[];
  parcalar: AtolyeParcasi[];
  takimlar: AtolyeTakimi[];
  basarimIlerleme: Record<string, number>;
  takimTavani: number;
  gelistirme: boolean;
  /** D7 */
  tamamlanan: string[];
  altin: number;
  yenileme: { cekirdekId: number; omur: number | null; fiyat: number }[];
}

// ---- D7: Market, Başarımlar ----
export interface MarketUrunu {
  id: string; durum: "sahip" | "acik" | "kilitli" | "gizli"; ad: string; tur: "cekirdek" | "govde" | "disk" | "uc";
  element?: string | null; koken?: string | null; tipEgilimi?: string; katman?: string; katmanAd?: string; fiyat?: number; satisFiyati?: number;
  gununParcasi?: boolean; etiket: string; okunan: string; basarim?: { id: string; ad: string; ilerleme: number; sayi: number } | null;
  basarimlaAcildi?: boolean; sahip?: number; aciklama?: string;
}
export interface MarketRafi { tur: "cekirdek" | "govde" | "disk" | "uc"; ad: string; tezgah: string; tezgahNotu: string; urunler: MarketUrunu[] }
export interface YenilemeSatiri { cekirdekId: number; tanimId: string; ad: string; omur: number; tavan: number; fiyat: number; tamFiyat: number; asinmisIndirimi: boolean; yenilenebilir: boolean }
export interface MarketGorunumu {
  acik: boolean; bakiye: number; gun: number;
  gununParcasi: { id: string; ad: string; tur: string; element: string | null; fiyat: number; satisFiyati: number } | null;
  raflar: MarketRafi[]; yenileme: YenilemeSatiri[];
  referans: { cekirdek: string; govde: string; disk: string; uc: string; yon: "sag" | "sol" } | null;
}
export interface BasarimGorunumu {
  id: string; kategori: string; gizli: boolean; gorunur: boolean; ilkSurum: boolean; ad: string; aciklama: string; sayi: number; ilerleme: number;
  tamam: boolean; tamamTarihi: number | null; odulAltin: number; zorluk: "kolay" | "orta" | "zor" | "efsane";
  acilanParcalar: { id: string; ad: string }[]; acilanGorunum: string[]; acilanOzellik: string[];
}

export async function atolyeGetir(): Promise<AtolyeGorunumu> {
  return apiGet<AtolyeGorunumu>("/api/atolye");
}

/** PUT / PATCH / POST gövdeli istek (apiPost'un yöntemli hâli). */
export async function apiIstek<T = { ok: boolean }>(yontem: "POST" | "PUT" | "PATCH" | "DELETE", yol: string, govde: unknown = {}): Promise<{ durum: number; veri: T & { hata?: string } }> {
  let r: Response;
  try {
    r = await fetch(yol, { method: yontem, credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(govde) });
  } catch {
    throw new BakimHatasi("bakim");
  }
  if (r.status >= 500) throw new BakimHatasi("bakim");
  const veri = (await r.json().catch(() => ({}))) as T & { hata?: string };
  return { durum: r.status, veri };
}

/** ux § 7 mikro-kopya (sunucu hata kodu → metin). */
export const HESAP_HATA: Record<string, string> = {
  uzunluk: "Ad 3-16 karakter olmalı.",
  karakter: "Adda yalnız harf, rakam, boşluk, nokta, tire ve alt çizgi olabilir.",
  uygunsuz: "Bu ad uygun değil.",
  alinmis: "Bu ad alınmış.",
  sifreKisa: "Şifre en az 8 karakter olmalı.",
  sifreUzun: "Şifre çok uzun.",
  eslesmiyor: "Şifreler eşleşmiyor.",
  yanlis: "Ad ya da şifre yanlış.",
  cok: "Çok fazla deneme. Bir dakika sonra tekrar dene.",
  koken: "Bu sayfa güvenli kökenden açılmadı. Sayfayı yenile.",
  oturum: "Oturumun kapanmış. Tekrar giriş yap.",
  bicim: "Bir şeyler eksik. Alanları kontrol et.",
  var: "İlk Çekirdeğin zaten seçilmiş.",
  bakim: "Devran kısa bir bakımda. Birkaç dakika sonra tekrar dene.",
  sure: "Adı 30 günde bir değiştirebilirsin.",
  ayni: "Bu zaten senin adın.",
  "ad-uzunluk": "Takım adı 1-20 karakter olmalı.",
  "ad-karakter": "Takım adında yalnız harf, rakam, boşluk, nokta ve tire olabilir.",
  "ad-uygunsuz": "Bu takım adı uygun değil.",
  dolu: "Takım yuvaların dolu. Üçlü başarımı 4. yuvayı açar.",
  yetersiz: "Altının yetmiyor.",
  kilitli: "Bu parça henüz kilitli. Başarımı tamamla.",
  sahip: "Bu parça zaten sende.",
  marketKapali: "Market kilitli. Antrenman eğitimini bitir.",
  tam: "Bu Çekirdeğin ömrü zaten tam.",
  yapayDegil: "Yalnız Yapay Çekirdek yenilenir.",
  yonSabit: "Bu Çekirdeğin yönü sabit.",
};

export async function apiPost<T = { ok: boolean }>(yol: string, govde: unknown = {}): Promise<{ durum: number; veri: T & { hata?: string } }> {
  let r: Response;
  try {
    r = await fetch(yol, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(govde) });
  } catch {
    throw new BakimHatasi("bakim");
  }
  if (r.status >= 500) throw new BakimHatasi("bakim");
  const veri = (await r.json().catch(() => ({}))) as T & { hata?: string };
  return { durum: r.status, veri };
}

export async function apiGet<T>(yol: string): Promise<T> {
  let r: Response;
  try {
    r = await fetch(yol, { credentials: "same-origin", cache: "no-store" });
  } catch {
    throw new BakimHatasi("bakim");
  }
  if (!r.ok) throw new BakimHatasi("bakim");
  return (await r.json()) as T;
}

export function benGetir(): Promise<Ben> {
  return apiGet<Ben>("/api/ben");
}

/** Misafir Antrenman'ı bu tarayıcıda bitirdi mi (girişten sonra "İlk Devir" bildirilir). */
export const MISAFIR_EGITIM = "devran.misafirEgitim.v1";
export const SON_TAKIM = "devran.sonTakim.v2";
/** D6: Atölye "yeni yetenek açıldı" rozeti için görülen Çekirdek seviyeleri */
export const GORULEN_SEVIYE = "devran.gorulenSeviye.v1";

export function sakla(k: string, v: string | null): void {
  try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* kapalı */ }
}
export function oku(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}

/** Girişli oyuncunun gideceği ilk ekran (ux § 3.1): profil → ilk çekirdek → atölye. */
export function sonrakiEkran(b: Girisli): "profil" | "ilk-cekirdek" | "atolye" {
  if (!b.oyuncu.profilTamam) return "profil";
  if (!b.cekirdekler.length) return "ilk-cekirdek";
  return "atolye";
}

export function git(ekran: string, ek = ""): void {
  location.href = `${location.pathname}?ekran=${ekran}${ek}`;
}
