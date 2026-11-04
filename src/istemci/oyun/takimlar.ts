import { CEKIRDEKLER, DISKLER, GOVDELER, UCLAR } from "../../paylasilan/veri/katalog.ts";
import type { TakimProfilleri } from "../../paylasilan/sim/Dunya.ts";
import { BASLANGIC_TAKIMLARI, type TopacSecimi, secimlerdenProfiller } from "../../paylasilan/veri/takimlar.ts";

// Kayıtlı takımlar (yer tutucu; D5-D6'da profil + SQLite envanter). 3 takım × 3 topaç, her takımda 3 farklı Çekirdek
// (tuning § 10). Topaç Lab'deki parça seçimi bir takım yuvasına yazılabilir (yalnız bu tarayıcı, localStorage).

export type { TopacSecimi } from "../../paylasilan/veri/takimlar.ts";
export interface KayitliTakim { ad: string; uyeler: [TopacSecimi, TopacSecimi, TopacSecimi] }

export const VARSAYILAN_TAKIMLAR: readonly KayitliTakim[] = BASLANGIC_TAKIMLARI.map((t) => ({ ad: t.ad, uyeler: [...t.uyeler] as KayitliTakim["uyeler"] }));

const ANAHTAR = "devran.takimlar.v1";

function gecerli(t: TopacSecimi): boolean {
  return CEKIRDEKLER.some((x) => x.id === t.cekirdek) && GOVDELER.some((x) => x.id === t.govde) && DISKLER.some((x) => x.id === t.disk) && UCLAR.some((x) => x.id === t.uc);
}

/** Kayıtlı takımlar: localStorage'dan (geçerliyse), yoksa varsayılan. */
export function takimlariOku(): KayitliTakim[] {
  const v = VARSAYILAN_TAKIMLAR.map((t) => ({ ad: t.ad, uyeler: [...t.uyeler] as KayitliTakim["uyeler"] }));
  try {
    const ham = localStorage.getItem(ANAHTAR);
    if (!ham) return v;
    const k = JSON.parse(ham) as KayitliTakim[];
    for (let i = 0; i < 3; i++) {
      const t = k[i];
      if (!t || t.uyeler.length !== 3 || !t.uyeler.every(gecerli)) continue;
      const c = t.uyeler.map((u) => u.cekirdek);
      if (new Set(c).size !== 3) continue;
      v[i] = { ad: v[i]!.ad, uyeler: t.uyeler };
    }
  } catch { /* depolama kapalı: varsayılan */ }
  return v;
}

/** Bir takımın bir yuvasına topaç yazar. 3 farklı Çekirdek kuralı bozulursa reddeder (mesaj döner). */
export function takimaYaz(takim: number, yuva: number, secim: TopacSecimi): string | null {
  const t = takimlariOku();
  const hedef = t[takim];
  if (!hedef) return "Takım yok.";
  const yeni = [...hedef.uyeler] as KayitliTakim["uyeler"];
  yeni[yuva] = secim;
  if (new Set(yeni.map((u) => u.cekirdek)).size !== 3) return "Takımda 3 farklı Çekirdek olmalı.";
  t[takim] = { ad: hedef.ad, uyeler: yeni };
  try { localStorage.setItem(ANAHTAR, JSON.stringify(t)); } catch { return "Bu tarayıcıda kaydedilemedi."; }
  return null;
}

export function takimProfilleri(t: KayitliTakim): TakimProfilleri {
  return secimlerdenProfiller(t.uyeler);
}
