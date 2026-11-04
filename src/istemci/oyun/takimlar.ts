import { CEKIRDEKLER, DISKLER, GOVDELER, UCLAR } from "../../paylasilan/veri/katalog.ts";
import { type TopacProfili, topacProfiliKur } from "../../paylasilan/veri/profil.ts";
import type { TakimProfilleri } from "../../paylasilan/sim/Dunya.ts";

// Kayıtlı takımlar (yer tutucu; D5-D6'da profil + SQLite envanter). 3 takım × 3 topaç, her takımda 3 farklı Çekirdek
// (tuning § 10). Topaç Lab'deki parça seçimi bir takım yuvasına yazılabilir (yalnız bu tarayıcı, localStorage).

export interface TopacSecimi { cekirdek: string; govde: string; disk: string; uc: string }
export interface KayitliTakim { ad: string; uyeler: [TopacSecimi, TopacSecimi, TopacSecimi] }

const GOKTASI: TopacSecimi = { cekirdek: "kor-goktasi", govde: "ok-govde", disk: "hafif-disk", uc: "duz-uc" };
const MADEN: TopacSecimi = { cekirdek: "kaya-maden", govde: "kalkan-govde", disk: "agir-disk", uc: "igne-uc" };
const YAPAY: TopacSecimi = { cekirdek: "kasirga-yapay", govde: "savrulan-govde", disk: "denge-disk", uc: "dengeli-uc" };
const GIRDAP: TopacSecimi = { cekirdek: "girdap-maden", govde: "halka-govde", disk: "parlak-disk", uc: "top-uc" };
const SIMSEK: TopacSecimi = { cekirdek: "simsek-goktasi", govde: "ok-govde", disk: "alcak-disk", uc: "kusak-ucu" };
const DON: TopacSecimi = { cekirdek: "sabir-tasi", govde: "ayaz-govde", disk: "denge-disk", uc: "duz-uc" };

export const VARSAYILAN_TAKIMLAR: readonly KayitliTakim[] = [
  { ad: "Takım 1 · Kor", uyeler: [GOKTASI, MADEN, GIRDAP] },
  { ad: "Takım 2 · Kaya", uyeler: [MADEN, YAPAY, SIMSEK] },
  { ad: "Takım 3 · Kasırga", uyeler: [YAPAY, GIRDAP, DON] },
];

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
  const p = (s: TopacSecimi): TopacProfili => topacProfiliKur(s.cekirdek, s.govde, s.disk, s.uc);
  return [p(t.uyeler[0]), p(t.uyeler[1]), p(t.uyeler[2])];
}
