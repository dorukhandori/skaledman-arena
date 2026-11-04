import { type TopacProfili, topacProfiliKur } from "./profil.ts";

// Başlangıç takımları (yer tutucu; D5-D6'da profil + SQLite envanter). 3 takım × 3 topaç, her takımda 3 farklı
// Çekirdek (tuning § 10). Çevrimiçi maçta (D4) sunucu takımı `takimId`'den kurar: parça listesi istemciden ALINMAZ
// (axiom § 2 #6). İstemci aynı tabloyu, rakibin `takimId`'sinden profilleri kurmak için kullanır.

export interface TopacSecimi { cekirdek: string; govde: string; disk: string; uc: string }
export interface BaslangicTakimi { id: string; ad: string; uyeler: readonly [TopacSecimi, TopacSecimi, TopacSecimi] }

const GOKTASI: TopacSecimi = { cekirdek: "kor-goktasi", govde: "ok-govde", disk: "hafif-disk", uc: "duz-uc" };
const MADEN: TopacSecimi = { cekirdek: "kaya-maden", govde: "kalkan-govde", disk: "agir-disk", uc: "igne-uc" };
const YAPAY: TopacSecimi = { cekirdek: "kasirga-yapay", govde: "savrulan-govde", disk: "denge-disk", uc: "dengeli-uc" };
const GIRDAP: TopacSecimi = { cekirdek: "girdap-maden", govde: "halka-govde", disk: "parlak-disk", uc: "top-uc" };
const SIMSEK: TopacSecimi = { cekirdek: "simsek-goktasi", govde: "ok-govde", disk: "alcak-disk", uc: "kusak-ucu" };
const DON: TopacSecimi = { cekirdek: "sabir-tasi", govde: "ayaz-govde", disk: "denge-disk", uc: "duz-uc" };

export const BASLANGIC_TAKIMLARI: readonly BaslangicTakimi[] = [
  { id: "takim-1", ad: "Takım 1 · Kor", uyeler: [GOKTASI, MADEN, GIRDAP] },
  { id: "takim-2", ad: "Takım 2 · Kaya", uyeler: [MADEN, YAPAY, SIMSEK] },
  { id: "takim-3", ad: "Takım 3 · Kasırga", uyeler: [YAPAY, GIRDAP, DON] },
];

export function takimBul(id: string): BaslangicTakimi | null {
  for (const t of BASLANGIC_TAKIMLARI) if (t.id === id) return t;
  return null;
}

export function secimlerdenProfiller(u: readonly [TopacSecimi, TopacSecimi, TopacSecimi]): [TopacProfili, TopacProfili, TopacProfili] {
  const p = (s: TopacSecimi): TopacProfili => topacProfiliKur(s.cekirdek, s.govde, s.disk, s.uc);
  return [p(u[0]), p(u[1]), p(u[2])];
}

/** `takimId` → üç profil; bilinmeyen kimlik ilk takıma düşer (sunucu zaten zod ile doğrular). */
export function takimProfilleriKimlikten(id: string): [TopacProfili, TopacProfili, TopacProfili] {
  return secimlerdenProfiller((takimBul(id) ?? BASLANGIC_TAKIMLARI[0]!).uyeler);
}
