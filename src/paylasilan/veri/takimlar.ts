import { type TopacProfili, topacProfiliKur } from "./profil.ts";
import { cekirdekBul, diskBul, govdeBul, ucBul } from "./katalog.ts";

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

// ---- D5: kayıtlı takım kodu ----
// Sunucu oyuncunun kayıtlı takımını (SQLite) maç durumuna bu kodla yazar; istemci profilleri ve kayıt yeniden
// oynatma aynı koddan kurar. Biçim: üye başına `cekirdek:govde:disk:uc:seviye:odunc:yon`, üyeler `|` ile.
// Parça listesi istemciden ALINMAZ (axiom § 2 #6): kodu yalnız sunucu üretir; istemci yalnız okur.

export interface TakimUyeKodu extends TopacSecimi { seviye: number; odunc: boolean; yon: "sag" | "sol" }

const KOD_PARCA = /^[a-z0-9-]{1,40}$/;

export function takimKoduMu(s: string): boolean {
  return s.includes("|");
}

export function takimKoduYaz(uyeler: readonly TakimUyeKodu[]): string {
  return uyeler.map((u) => [u.cekirdek, u.govde, u.disk, u.uc, String(u.seviye), u.odunc ? "1" : "0", u.yon].join(":")).join("|");
}

/** Kod → üç üye; bozuk ya da katalogda olmayan parça → null. */
export function takimKoduCoz(kod: string): [TakimUyeKodu, TakimUyeKodu, TakimUyeKodu] | null {
  const parca = kod.split("|");
  if (parca.length !== 3) return null;
  const uyeler: TakimUyeKodu[] = [];
  for (const p of parca) {
    const a = p.split(":");
    if (a.length !== 7) return null;
    const [cekirdek, govde, disk, uc, sv, od, yon] = a as [string, string, string, string, string, string, string];
    if (![cekirdek, govde, disk, uc].every((x) => KOD_PARCA.test(x))) return null;
    const seviye = Number(sv);
    if (!(seviye >= 1 && seviye <= 4 && Math.floor(seviye) === seviye) || (od !== "0" && od !== "1") || (yon !== "sag" && yon !== "sol")) return null;
    try { cekirdekBul(cekirdek); govdeBul(govde); diskBul(disk); ucBul(uc); } catch { return null; }
    uyeler.push({ cekirdek, govde, disk, uc, seviye, odunc: od === "1", yon });
  }
  const c = uyeler.map((u) => u.cekirdek);
  if (c[0] === c[1] || c[0] === c[2] || c[1] === c[2]) return null;
  return uyeler as [TakimUyeKodu, TakimUyeKodu, TakimUyeKodu];
}

/** Takım kurulumu: başlangıç takımı kimliği ya da kayıtlı takım kodu → profiller (+ kodda üye seviyeleri). */
export function takimKurulumu(id: string): { profiller: [TopacProfili, TopacProfili, TopacProfili]; seviyeler: [number, number, number] | null } {
  if (takimKoduMu(id)) {
    const u = takimKoduCoz(id);
    if (u) {
      const p = (x: TakimUyeKodu): TopacProfili => topacProfiliKur(x.cekirdek, x.govde, x.disk, x.uc, { yon: x.yon });
      return { profiller: [p(u[0]), p(u[1]), p(u[2])], seviyeler: [u[0].seviye, u[1].seviye, u[2].seviye] };
    }
  }
  return { profiller: secimlerdenProfiller((takimBul(id) ?? BASLANGIC_TAKIMLARI[0]!).uyeler), seviyeler: null };
}

/** `takimId` (başlangıç takımı ya da kayıtlı takım kodu) → üç profil; bilinmeyen kimlik ilk takıma düşer. */
export function takimProfilleriKimlikten(id: string): [TopacProfili, TopacProfili, TopacProfili] {
  return takimKurulumu(id).profiller;
}
