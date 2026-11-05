import type { HisAyarlari } from "./Efektler.ts";
import { dokunmatikMi } from "../mobil/cihaz.ts";

// Ayarlar (ux § 6.2 erişilebilirlik + § 1.3 nişan + ses). Yalnız bu tarayıcı (localStorage); oturum açılınca
// sunucu profili (D5). İlk açılışta `prefers-reduced-motion` açıksa efektler "Azaltılmış" ön ayarıyla başlar.

export interface OyunAyarlari {
  sarsinti: "normal" | "yari" | "kapali";
  flas: "normal" | "azaltilmis" | "kapali";
  hitstop: "tam" | "yari" | "kapali";
  yavasZoom: "acik" | "kapali";
  parcacik: "tam" | "az";
  nisan: "fare" | "hareket";
  ses: "acik" | "kapali";
  /** D6: yüksek kontrast HUD (ux § 6.3) */
  kontrast: "kapali" | "acik";
  /** GU-00: "acik" = eski tam üstten sunum (erişilebilirlik); varsayılan Hibrit eğik sunum. Sonraki maçta uygulanır. */
  duzGorunum: "kapali" | "acik";
  /** Ayarlar › İpuçları: Atölye'deki rehber Pergel (docs/ux/bilgic-pergel.md § 2.6; SANAT: tek anahtar Açık/Kapalı) */
  pergel: "acik" | "kapali";
}

export const AYAR_SECENEKLERI: { [K in keyof OyunAyarlari]: { ad: string; secenekler: { deger: OyunAyarlari[K]; ad: string }[] } } = {
  sarsinti: { ad: "Ekran sarsıntısı", secenekler: [{ deger: "normal", ad: "Normal" }, { deger: "yari", ad: "%50" }, { deger: "kapali", ad: "Kapalı" }] },
  flas: { ad: "Flaş ve parlama", secenekler: [{ deger: "normal", ad: "Normal" }, { deger: "azaltilmis", ad: "Azaltılmış" }, { deger: "kapali", ad: "Kapalı" }] },
  hitstop: { ad: "Vuruş duraklaması", secenekler: [{ deger: "tam", ad: "Tam" }, { deger: "yari", ad: "Yarı" }, { deger: "kapali", ad: "Kapalı" }] },
  yavasZoom: { ad: "Yavaş çekim ve zoom", secenekler: [{ deger: "acik", ad: "Açık" }, { deger: "kapali", ad: "Kapalı" }] },
  parcacik: { ad: "Parçacık yoğunluğu", secenekler: [{ deger: "tam", ad: "Tam" }, { deger: "az", ad: "Az" }] },
  // MOBIL-1: dokunmatikte "fare" değeri oto-nişan (en yakın rakip + sürükleyerek ezme) demek; değer aynı, ad farklı
  nisan: { ad: "Nişan", secenekler: [{ deger: "fare", ad: dokunmatikMi() ? "Oto" : "Fare" }, { deger: "hareket", ad: "Hareket yönü" }] },
  ses: { ad: "Ses (M)", secenekler: [{ deger: "acik", ad: "Açık" }, { deger: "kapali", ad: "Kapalı" }] },
  kontrast: { ad: "Yüksek kontrast HUD", secenekler: [{ deger: "kapali", ad: "Kapalı" }, { deger: "acik", ad: "Açık" }] },
  duzGorunum: { ad: "Düz görünüm (sonraki maç)", secenekler: [{ deger: "kapali", ad: "Kapalı" }, { deger: "acik", ad: "Açık" }] },
  pergel: { ad: "İpuçları", secenekler: [{ deger: "acik", ad: "Açık" }, { deger: "kapali", ad: "Kapalı" }] },
};

const ANAHTAR = "devran.ayarlar.v1";

export const VARSAYILAN_AYARLAR: OyunAyarlari = { sarsinti: "normal", flas: "normal", hitstop: "tam", yavasZoom: "acik", parcacik: "tam", nisan: "fare", ses: "acik", kontrast: "kapali", duzGorunum: "kapali", pergel: "acik" };
/** prefers-reduced-motion: "Azaltılmış" ön ayarı. */
export const AZALTILMIS_AYARLAR: OyunAyarlari = { sarsinti: "yari", flas: "azaltilmis", hitstop: "yari", yavasZoom: "kapali", parcacik: "az", nisan: "fare", ses: "acik", kontrast: "kapali", duzGorunum: "kapali", pergel: "acik" };

function azaltilmisIstek(): boolean {
  try { return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true; } catch { return false; }
}

export function ayarlariOku(): OyunAyarlari {
  const taban = azaltilmisIstek() ? AZALTILMIS_AYARLAR : VARSAYILAN_AYARLAR;
  try {
    const ham = localStorage.getItem(ANAHTAR);
    if (!ham) return { ...taban };
    const k = JSON.parse(ham) as Partial<OyunAyarlari>;
    const a = { ...taban };
    for (const anahtar of Object.keys(AYAR_SECENEKLERI) as (keyof OyunAyarlari)[]) {
      const v = k[anahtar];
      if (AYAR_SECENEKLERI[anahtar].secenekler.some((s) => s.deger === v)) (a as Record<string, string>)[anahtar] = v as string;
    }
    return a;
  } catch { return { ...taban }; }
}

export function ayarlariYaz(a: OyunAyarlari): void {
  try { localStorage.setItem(ANAHTAR, JSON.stringify(a)); } catch { /* depolama kapalı */ }
}

/** GU-00 kamera kipi: URL `?gorunum=duz|hibrit` (geliştirici/ekran görüntüsü) ayarı ezer. */
export function kameraKipi(a: OyunAyarlari): "hibrit" | "duz" {
  try {
    const q = new URLSearchParams(location.search).get("gorunum");
    if (q === "duz" || q === "hibrit") return q;
  } catch { /* yok */ }
  return a.duzGorunum === "acik" ? "duz" : "hibrit";
}

/** Efektler'in sayısal ayarları. */
export function hisAyari(a: OyunAyarlari): HisAyarlari {
  return {
    sarsinti: a.sarsinti === "normal" ? 1 : a.sarsinti === "yari" ? 0.5 : 0,
    flas: a.flas,
    hitstop: a.hitstop === "tam" ? 1 : a.hitstop === "yari" ? 0.5 : 0,
    parcacik: a.parcacik === "tam" ? 1 : 0.4,
    yavasZoom: a.yavasZoom === "acik",
  };
}

/** "Sekme: Space" ipucu: ilk 3 maç (yer tutucu sayaç). */
const IPUCU_ANAHTAR = "devran.sekmeIpucu.v1";
export function sekmeIpucuGoster(): boolean {
  try { return Number(localStorage.getItem(IPUCU_ANAHTAR) ?? 0) < 3; } catch { return true; }
}
/** Bu tarayıcıda biten maç sayısı (aynı sayaç; Pergel'in azalan sıklığı). */
export function bitenMacSayisi(): number {
  try { return Number(localStorage.getItem(IPUCU_ANAHTAR) ?? 0) || 0; } catch { return 0; }
}
export function sekmeIpucuMacBitti(): void {
  try { localStorage.setItem(IPUCU_ANAHTAR, String(Number(localStorage.getItem(IPUCU_ANAHTAR) ?? 0) + 1)); } catch { /* yok */ }
}
