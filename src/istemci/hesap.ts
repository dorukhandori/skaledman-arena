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
  };
export type Girisli = Extract<Ben, { girisli: true }>;

export class BakimHatasi extends Error {}

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
