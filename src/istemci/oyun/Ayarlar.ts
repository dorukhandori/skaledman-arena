import type { HisAyarlari } from "./Efektler.ts";

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
}

export const AYAR_SECENEKLERI: { [K in keyof OyunAyarlari]: { ad: string; secenekler: { deger: OyunAyarlari[K]; ad: string }[] } } = {
  sarsinti: { ad: "Ekran sarsıntısı", secenekler: [{ deger: "normal", ad: "Normal" }, { deger: "yari", ad: "%50" }, { deger: "kapali", ad: "Kapalı" }] },
  flas: { ad: "Flaş ve parlama", secenekler: [{ deger: "normal", ad: "Normal" }, { deger: "azaltilmis", ad: "Azaltılmış" }, { deger: "kapali", ad: "Kapalı" }] },
  hitstop: { ad: "Vuruş duraklaması", secenekler: [{ deger: "tam", ad: "Tam" }, { deger: "yari", ad: "Yarı" }, { deger: "kapali", ad: "Kapalı" }] },
  yavasZoom: { ad: "Yavaş çekim ve zoom", secenekler: [{ deger: "acik", ad: "Açık" }, { deger: "kapali", ad: "Kapalı" }] },
  parcacik: { ad: "Parçacık yoğunluğu", secenekler: [{ deger: "tam", ad: "Tam" }, { deger: "az", ad: "Az" }] },
  nisan: { ad: "Nişan", secenekler: [{ deger: "fare", ad: "Fare" }, { deger: "hareket", ad: "Hareket yönü" }] },
  ses: { ad: "Ses (M)", secenekler: [{ deger: "acik", ad: "Açık" }, { deger: "kapali", ad: "Kapalı" }] },
};

const ANAHTAR = "devran.ayarlar.v1";

export const VARSAYILAN_AYARLAR: OyunAyarlari = { sarsinti: "normal", flas: "normal", hitstop: "tam", yavasZoom: "acik", parcacik: "tam", nisan: "fare", ses: "acik" };
/** prefers-reduced-motion: "Azaltılmış" ön ayarı. */
export const AZALTILMIS_AYARLAR: OyunAyarlari = { sarsinti: "yari", flas: "azaltilmis", hitstop: "yari", yavasZoom: "kapali", parcacik: "az", nisan: "fare", ses: "acik" };

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
export function sekmeIpucuMacBitti(): void {
  try { localStorage.setItem(IPUCU_ANAHTAR, String(Number(localStorage.getItem(IPUCU_ANAHTAR) ?? 0) + 1)); } catch { /* yok */ }
}
