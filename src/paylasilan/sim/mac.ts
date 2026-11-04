import { AYAR, ELEMENT_CARKI } from "../kurallar/ayar.ts";
import type { TopacProfili } from "../veri/profil.ts";
import {
  TOPAC_DURUM, type BitisTuru, type Dunya, type MacBitisNedeni, type MacDurumu, type Takim, type TakimUyesi, type TurSonucu,
} from "./durum.ts";
import type { Girdi } from "./Girdi.ts";
import { rastgele } from "./rastgele.ts";
import { aktifMi, staminaOrani, topacKur } from "./topac.ts";
import { sahipEtkileriniSil } from "./yetenek.ts";
import { TABLO_BOYU } from "../kurallar/sinTablo.ts";

// Maç / tur kararı (flint § 1 ortak ilke): bir adımda olan bitişler toplanır, adım SONUNDA tek geçişte karar.
// Aynı topaçta öncelik Parçalanma = Ring Out > Durma (iki puanlık bitiş aynı adımda: Parçalanma yazılır, #2).
// Farklı topaçlarda aynı adım: berabere, puan yok, ikisi de elenir (#1, #2, #17).
//
// İki kip:
//  - `tekTur` (Topaç Lab, D1 altın senaryoları): tek tur kararı, `tur` → `turBitti`.
//  - `mac` (axiom § 4 karar 5 + tuning § 10): geriSayim → tur → turArasi → tur … → bitti; 3'lü takım,
//    elenme, tükenme, 90 s saat (puan aralarında durmaz), ani ölüm, 120 s mutlak sınır, geri çek, teslim.
// Tüm süreler tamsayı adım (`kalanTick`).

const sn = (s: number): number => Math.round(s * AYAR.adimHz);
const M = AYAR.mac;
export const MAC_ADIM = {
  geriSayim: sn(M.hazirSure + M.geriSayim),
  hazir: sn(M.hazirSure),
  kutlama: sn(M.kutlama),
  secim: sn(M.secimSure),
  koruma: sn(M.girisKorumasi),
  macSuresi: sn(M.macSuresi),
  aniOlum: sn(M.aniOlumSure),
  aniOlumDaralma: sn(M.aniOlumDaralma),
  mutlak: sn(M.mutlakSinir),
  geriCek: sn(M.geriCekSure),
  geriCekBekleme: sn(M.geriCekBekleme),
} as const;

/** Yazı-tura için sabit RNG sırası (tohumla birlikte tek sayı). */
const YAZI_TURA_SIRA = 0x7a7;
/** Yeni giren topacın desen fazı sırası tabanı. */
const FAZ_SIRA = 100;

export function macKur(mod: MacDurumu["mod"] = "tekTur"): MacDurumu {
  return {
    mod,
    faz: mod === "mac" ? "geriSayim" : "tur",
    kalanTick: mod === "mac" ? MAC_ADIM.geriSayim : 0,
    kutlamaKalan: 0,
    saat: 0,
    aniOlum: 0,
    aniOlumTick: 0,
    turNo: mod === "mac" ? 0 : 1,
    puan: [0, 0],
    sonuc: null,
    macSonucu: null,
  };
}

export function takimKur(profiller: readonly [TopacProfili, TopacProfili, TopacProfili]): Takim {
  const ids = profiller.map((p) => p.parcalar.cekirdek);
  if (ids[0] === ids[1] || ids[0] === ids[2] || ids[1] === ids[2]) throw new Error(`Takımda 3 farklı Çekirdek olmalı: ${ids.join(", ")}`);
  const uye = (p: TopacProfili): TakimUyesi => ({ profil: p, stamina: p.maxStamina, tik: 0, enerji: 0, elendi: 0, bekleme1: 0, bekleme2: 0, yapayIndirim: p.koken === "yapay" ? 1 : 0 });
  return { uyeler: [uye(profiller[0]), uye(profiller[1]), uye(profiller[2])], aktif: 0, geriCekHedef: -1, geriCekBekleme: 0, secim: -1, elenen: 0 };
}

/** Bu adımda bir topacın aday bitişleri. */
export interface AdimBitisleri {
  ringOut: boolean;
  parcalanma: boolean;
  durma: boolean;
}

export const bosBitis = (): AdimBitisleri => ({ ringOut: false, parcalanma: false, durma: false });

/** Tek topaçta öncelik. */
export function bitisSec(b: AdimBitisleri): BitisTuru | null {
  if (b.parcalanma) return "parcalanma";
  if (b.ringOut) return "ringOut";
  if (b.durma) return "durma";
  return null;
}

/** Bitiş türünün topaç durum kodu. */
export function bitisDurumu(b: BitisTuru): (typeof TOPAC_DURUM)[keyof typeof TOPAC_DURUM] {
  return b === "parcalanma" ? TOPAC_DURUM.parcalandi : b === "ringOut" ? TOPAC_DURUM.ringOut : TOPAC_DURUM.durma;
}

/** Bitişleri topaçlara uygular ve olaylarını yazar (iki kip ortak). */
export function bitisleriUygula(d: Dunya, bitisler: readonly [AdimBitisleri, AdimBitisleri]): void {
  for (let i = 0; i < 2; i++) {
    const tur = bitisSec(bitisler[i]!);
    if (!tur) continue;
    const t = d.topaclar[i]!;
    t.durum = bitisDurumu(tur);
    if (tur === "durma") { t.stamina = 0; t.sonumKalan = AYAR.durmaSonumu; }
    if (tur === "parcalanma" && t.stamina < 0) t.stamina = 0;
    if (tur === "ringOut") d.olaylar.push({ tur: "ringOut", tick: d.tick, i, x: t.x, z: t.z, vx: t.vx, vz: t.vz });
    else if (tur === "parcalanma") d.olaylar.push({ tur: "parcalandi", tick: d.tick, i, x: t.x, z: t.z, vx: t.vx, vz: t.vz });
    else d.olaylar.push({ tur: "durma", tick: d.tick, i, x: t.x, z: t.z });
  }
}

/** Sonuç nesnesi + puan yazımı. Karar yoksa null. */
function sonucCikar(d: Dunya, bitisler: readonly [AdimBitisleri, AdimBitisleri]): TurSonucu | null {
  const b0 = bitisSec(bitisler[0]);
  const b1 = bitisSec(bitisler[1]);
  if (!b0 && !b1) return null;
  if (b0 && b1) return { tur: "berabere", kazanan: -1, kaybeden: -1, puan: 0, tick: d.tick };
  const kaybeden = b0 ? 0 : 1;
  const tur = (b0 ?? b1) as BitisTuru;
  const puan = AYAR.puan[tur];
  d.mac.puan[1 - kaybeden]! += puan;
  return { tur, kazanan: 1 - kaybeden, kaybeden, puan, tick: d.tick };
}

/**
 * Adım sonu tur kararı (tekTur kipi). `bitisler[i]`: topaç i'nin bu adımdaki adayları. Karar verilmişse yok sayılır.
 */
export function turKarari(d: Dunya, bitisler: readonly [AdimBitisleri, AdimBitisleri]): TurSonucu | null {
  if (d.mac.faz !== "tur") return null;
  const sonuc = sonucCikar(d, bitisler);
  if (!sonuc) return null;
  d.mac.faz = "turBitti";
  d.mac.sonuc = sonuc;
  return sonuc;
}

// ---------------------------------------------------------------------------------------------
// mac kipi

/** Çanak yarıçapına göre ölçeklenmiş doğum noktası. */
export function dogumNoktasi(d: Dunya, i: number): { x: number; z: number } {
  const o = AYAR.dogum[i]!;
  const k = d.arenaYaricap / AYAR.arenaYaricap;
  return { x: o.x * k, z: o.z * k };
}

const KOK_YARIM = Math.sqrt(0.5);
/** İniş adayları: doğum noktasının merkez etrafında 0, ±45, ±90, ±135, 180 derece döndürülmüşü (cos, sin). */
const INIS_DONUSLERI: readonly [number, number][] = [
  [1, 0], [KOK_YARIM, KOK_YARIM], [KOK_YARIM, -KOK_YARIM], [0, 1], [0, -1], [-KOK_YARIM, KOK_YARIM], [-KOK_YARIM, -KOK_YARIM], [-1, 0],
];

/**
 * Geri çekte yeni topacın iniş noktası (flint #13): kendi doğum noktası; rakip `inisMesafesi`'nden yakınsa
 * sabit sırayla döndürülmüş adaylardan ilk uygunu (deterministik kaydırma). Hiçbiri uymazsa rakipten en uzak aday.
 */
export function inisNoktasi(d: Dunya, i: number): { x: number; z: number } {
  const s = dogumNoktasi(d, i);
  const rakip = d.topaclar[1 - i]!;
  const min2 = M.inisMesafesi * M.inisMesafesi;
  let enIyi = s;
  let enIyiD2 = -1;
  for (const [c, n] of INIS_DONUSLERI) {
    const x = s.x * c - s.z * n;
    const z = s.x * n + s.z * c;
    const dx = x - rakip.x;
    const dz = z - rakip.z;
    const d2 = dx * dx + dz * dz;
    if (!aktifMi(rakip) || d2 >= min2) return { x, z };
    if (d2 > enIyiD2) { enIyiD2 = d2; enIyi = { x, z }; }
  }
  return enIyi;
}

/** Çarkta komşu mu (±1). */
export function komsuElementMi(a: string, b: string): boolean {
  const i = ELEMENT_CARKI.indexOf(a as (typeof ELEMENT_CARKI)[number]);
  const j = ELEMENT_CARKI.indexOf(b as (typeof ELEMENT_CARKI)[number]);
  if (i < 0 || j < 0) return false;
  return (i + 1) % 6 === j || (j + 1) % 6 === i;
}

/** Sahadaki üyenin durumunu takım kaydına yazar (elenmemişse). */
function aktifiSakla(d: Dunya, i: number): void {
  const tk = d.takimlar![i]!;
  const u = tk.uyeler[tk.aktif]!;
  if (u.elendi) return;
  const t = d.topaclar[i]!;
  u.stamina = t.stamina;
  u.tik = t.tik;
  u.enerji = t.enerji;
  u.bekleme1 = t.bekleme1;
  u.bekleme2 = t.bekleme2;
  u.yapayIndirim = t.yapayIndirim;
}

/** Takımın `uye` üyesini sahaya koyar: giriş koruması, komşu devralma Enerjisi, desen fazı tohumdan. */
export function uyeSahayaKoy(d: Dunya, i: number, uye: number, x: number, z: number): void {
  const tk = d.takimlar![i]!;
  const onceki = d.profiller[i]!;
  if (uye !== tk.aktif) aktifiSakla(d, i);
  const u = tk.uyeler[uye]!;
  const faz = rastgele(d.tohum, FAZ_SIRA + d.mac.turNo * 4 + i) * TABLO_BOYU;
  const t = d.topaclar[i]!;
  Object.assign(t, topacKur(u.profil, x, z, faz));
  t.stamina = u.stamina;
  t.tik = u.tik;
  t.bekleme1 = u.bekleme1;
  t.bekleme2 = u.bekleme2;
  t.yapayIndirim = u.yapayIndirim;
  // sahadan çıkan topacın alanı ve engelleri söner (VARSAYIM)
  if (uye !== tk.aktif) sahipEtkileriniSil(d, i);
  const devir = uye !== tk.aktif && komsuElementMi(onceki.element, u.profil.element) ? M.enerjiKomsuDevir : 0;
  t.enerji = Math.min(M.enerjiTavan, u.enerji + devir);
  t.koruma = MAC_ADIM.koruma;
  tk.aktif = uye;
  d.profiller[i] = u.profil;
  d.olaylar.push({ tur: "degisim", tick: d.tick, i, uye, x, z, enerjiDevri: devir });
}

/** Elenmemiş, sahada olmayan ilk üye (takım sırasıyla, aktiften sonra). −1 = yok. */
export function siradakiUye(tk: Takim): number {
  for (let k = 1; k <= 2; k++) {
    const j = (tk.aktif + k) % 3;
    if (!tk.uyeler[j]!.elendi) return j;
  }
  return tk.uyeler[tk.aktif]!.elendi ? -1 : tk.aktif;
}

/** Seçilebilir mi: elenmemiş üye. */
function secilebilir(tk: Takim, j: number): boolean {
  return j >= 0 && j < 3 && !tk.uyeler[j]!.elendi;
}

/** Geri çek hedefi geçerli mi (girdi doğrulaması; HUD da kullanır). */
export function geriCekHedefiGecerli(d: Dunya, i: number, hedef: number): boolean {
  const tk = d.takimlar?.[i];
  if (!tk || hedef < 0 || hedef > 2 || hedef === tk.aktif || tk.uyeler[hedef]!.elendi) return false;
  return true;
}

/** Geri çek şu an açık mı: tur içi, stamina < %25, bekleme yok, çekilme sürmüyor, geçerli bir yedek var. */
export function geriCekAcik(d: Dunya, i: number): boolean {
  const tk = d.takimlar?.[i];
  if (!tk || d.mac.faz !== "tur") return false;
  const t = d.topaclar[i]!;
  if (!aktifMi(t) || t.geriCekKalan > 0 || tk.geriCekBekleme > 0) return false;
  if (staminaOrani(t, d.profiller[i]!) >= M.geriCekEsik) return false;
  return siradakiUye(tk) !== tk.aktif && siradakiUye(tk) >= 0;
}

function macBitir(d: Dunya, kazanan: number, neden: MacBitisNedeni): void {
  d.mac.faz = "bitti";
  d.mac.kalanTick = 0;
  const sonuc = { kazanan, neden, puan: [d.mac.puan[0], d.mac.puan[1]] as [number, number], tick: d.tick };
  d.mac.macSonucu = sonuc;
  d.olaylar.push({ tur: "macBitti", tick: d.tick, sonuc });
}

/** Takımın toplam stamina oranı: elenmemiş üyelerin staminası / tüm üyelerin max toplamı (VARSAYIM, § 10 "toplam"). */
export function takimStaminaOrani(d: Dunya, i: number): number {
  const tk = d.takimlar![i]!;
  let pay = 0;
  let payda = 0;
  for (let j = 0; j < 3; j++) {
    const u = tk.uyeler[j]!;
    payda += u.profil.maxStamina;
    if (u.elendi) continue;
    const s = j === tk.aktif ? d.topaclar[i]!.stamina : u.stamina;
    if (s > 0) pay += s;
  }
  return pay / payda;
}

/** Süre kararı (ani ölüm 30 s ya da 120 s): toplam stamina oranı → puan → tohumlu yazı-tura (flint #7, #8). */
function sureKarari(d: Dunya): void {
  const o0 = takimStaminaOrani(d, 0);
  const o1 = takimStaminaOrani(d, 1);
  if (o0 !== o1) { macBitir(d, o0 > o1 ? 0 : 1, "sureStamina"); return; }
  const [p0, p1] = d.mac.puan;
  if (p0 !== p1) { macBitir(d, p0 > p1 ? 0 : 1, "surePuanEsitlik"); return; }
  macBitir(d, rastgele(d.tohum, YAZI_TURA_SIRA) < 0.5 ? 0 : 1, "yaziTura");
}

function aniOlumBaslat(d: Dunya): void {
  if (d.mac.aniOlum) return;
  d.mac.aniOlum = 1;
  d.mac.aniOlumTick = 0;
  d.olaylar.push({ tur: "aniOlum", tick: d.tick });
}

/** Ani ölüm erime çarpanı (1 + 0,05·t), t saniye. Ani ölüm yoksa 1. */
export function aniOlumErimeCarpani(d: Dunya): number {
  return d.mac.aniOlum ? 1 + M.aniOlumErimeEgim * (d.mac.aniOlumTick / AYAR.adimHz) : 1;
}

/**
 * Maç saati (tur ve turArasi adımlarının başında). 90 s: puan farklıysa çok olan kazanır; eşitse ani ölüm.
 * Ani ölümde R doğrusal daralır; 30 s'de (ya da 120 s mutlak sınırda) süre kararı. Maç bittiyse true.
 */
export function saatIlerlet(d: Dunya): boolean {
  const m = d.mac;
  m.saat++;
  const onceden = m.aniOlum === 1;
  if (m.saat === MAC_ADIM.macSuresi && !m.aniOlum) {
    if (m.puan[0] !== m.puan[1]) { macBitir(d, m.puan[0] > m.puan[1] ? 0 : 1, "surePuan"); return true; }
    aniOlumBaslat(d);
  }
  if (onceden) {
    m.aniOlumTick++;
    const k = m.aniOlumTick < MAC_ADIM.aniOlumDaralma ? m.aniOlumTick / MAC_ADIM.aniOlumDaralma : 1;
    d.arenaYaricap = AYAR.arenaYaricap * (1 - (1 - M.aniOlumTabanR) * k);
    if (m.aniOlumTick >= MAC_ADIM.aniOlum) { sureKarari(d); return true; }
  }
  if (m.saat >= MAC_ADIM.mutlak) { sureKarari(d); return true; }
  return false;
}

/** Elenmemiş aday sayısı. */
function kalanUyeSayisi(tk: Takim): number {
  return (tk.uyeler[0].elendi ? 0 : 1) + (tk.uyeler[1].elendi ? 0 : 1) + (tk.uyeler[2].elendi ? 0 : 1);
}

function turArasiBaslat(d: Dunya): void {
  const m = d.mac;
  m.faz = "turArasi";
  m.kutlamaKalan = MAC_ADIM.kutlama;
  m.kalanTick = MAC_ADIM.kutlama + MAC_ADIM.secim;
  for (let i = 0; i < 2; i++) {
    const tk = d.takimlar![i]!;
    const aktifElendi = tk.uyeler[tk.aktif]!.elendi === 1;
    if (!aktifElendi) {
      // sahadaki topaç bitmiş ama üye elenmemiş (yalnız ani ölüm dönüşü): aynı üye yeniden girer
      if (aktifMi(d.topaclar[i]!)) tk.secim = -1;
      else { tk.secim = tk.aktif; d.olaylar.push({ tur: "secim", tick: d.tick, i, uye: tk.aktif, otomatik: true }); }
      continue;
    }
    if (kalanUyeSayisi(tk) === 1) {
      tk.secim = siradakiUye(tk);
      d.olaylar.push({ tur: "secim", tick: d.tick, i, uye: tk.secim, otomatik: true });
    } else tk.secim = -2;
  }
}

/** Tur içi karar (mac kipi): elenme, puan, kazanan iyileşmesi, tükenme, ani ölüm; sonra turArasi ya da bitti. */
export function macTurKarari(d: Dunya, bitisler: readonly [AdimBitisleri, AdimBitisleri]): TurSonucu | null {
  if (d.mac.faz !== "tur") return null;
  const sonuc = sonucCikar(d, bitisler);
  if (!sonuc) return null;
  const m = d.mac;
  m.sonuc = sonuc;
  const T = d.takimlar!;
  for (let i = 0; i < 2; i++) {
    const t = d.topaclar[i]!;
    t.geriCekKalan = 0;
    T[i]!.geriCekHedef = -1;
    if (sonuc.tur === "berabere" || sonuc.kaybeden === i) {
      const tk = T[i]!;
      const u = tk.uyeler[tk.aktif]!;
      u.elendi = 1;
      u.stamina = 0;
      u.tik = t.tik;
      u.enerji = t.enerji;
      tk.elenen++;
    }
  }
  if (sonuc.kazanan >= 0) {
    // kazanan: + %20 maxStamina (tavan max), tık sıfırlanır; yerinden devam eder (axiom karar 5, tuning § 6)
    const t = d.topaclar[sonuc.kazanan]!;
    const p = d.profiller[sonuc.kazanan]!;
    t.stamina = Math.min(p.maxStamina, t.stamina + M.kazananIyilesme * p.maxStamina);
    t.tik = 0;
  }
  d.olaylar.push({ tur: "turBitti", tick: d.tick, sonuc });

  if (m.aniOlum && sonuc.kazanan >= 0) { macBitir(d, sonuc.kazanan, "aniOlum"); return sonuc; }
  if (sonuc.kazanan >= 0 && m.puan[sonuc.kazanan]! >= M.kazanmaPuani) { macBitir(d, sonuc.kazanan, "puan"); return sonuc; }
  const bitti0 = T[0].elenen >= 3;
  const bitti1 = T[1].elenen >= 3;
  if (bitti0 && bitti1) {
    if (m.aniOlum) { sureKarari(d); return sonuc; }
    // VARSAYIM (flint #4 "iki takım aynı turda tükenirse ani ölüm"): son elenen iki topaç tam stamina ve tık 0 ile
    // ani ölüm turu için döner; ani ölümde bir daha berabere olursa süre kararı.
    aniOlumBaslat(d);
    for (let i = 0; i < 2; i++) {
      const tk = T[i]!;
      const u = tk.uyeler[tk.aktif]!;
      u.elendi = 0; u.stamina = u.profil.maxStamina; u.tik = 0;
      tk.elenen = 2;
    }
  } else if (bitti0) { macBitir(d, 1, "tukenme"); return sonuc; }
  else if (bitti1) { macBitir(d, 0, "tukenme"); return sonuc; }
  turArasiBaslat(d);
  return sonuc;
}

/** Tur arası: seçim girdileri, kutlama ve seçim süresi; dolunca yeni tur (iki topaç da doğum noktasına). */
export function turArasiAdimi(d: Dunya, girdiler: readonly [Girdi, Girdi]): void {
  const m = d.mac;
  if (m.kutlamaKalan > 0) m.kutlamaKalan--;
  if (m.kalanTick > 0) m.kalanTick--;
  const T = d.takimlar!;
  let bekleyen = false;
  for (let i = 0; i < 2; i++) {
    const tk = T[i]!;
    if (tk.secim !== -2) continue;
    const g = girdiler[i]!.degistir;
    if (secilebilir(tk, g)) {
      tk.secim = g;
      d.olaylar.push({ tur: "secim", tick: d.tick, i, uye: g, otomatik: false });
    } else bekleyen = true;
  }
  if (m.kutlamaKalan > 0) return;
  if (bekleyen && m.kalanTick > 0) return;
  for (let i = 0; i < 2; i++) {
    const tk = T[i]!;
    if (tk.secim !== -2) continue;
    tk.secim = siradakiUye(tk);
    d.olaylar.push({ tur: "secim", tick: d.tick, i, uye: tk.secim, otomatik: true });
  }
  yeniTurBaslat(d);
}

/** Yeni tur: iki topaç doğum noktasında, hız 0; seçim yapan taraf yeni üyesini koyar (giriş koruması). */
export function yeniTurBaslat(d: Dunya): void {
  const m = d.mac;
  m.turNo++;
  m.faz = "tur";
  m.kalanTick = 0;
  d.temasKilidi = 0;
  const T = d.takimlar!;
  for (let i = 0; i < 2; i++) {
    const tk = T[i]!;
    const s = dogumNoktasi(d, i);
    if (tk.secim >= 0) uyeSahayaKoy(d, i, tk.secim, s.x, s.z);
    else {
      const t = d.topaclar[i]!;
      t.x = s.x; t.z = s.z; t.vx = 0; t.vz = 0;
      t.dashKalan = 0; t.sekmeKalan = 0; t.sikiDonus = 0;
    }
    tk.secim = -1;
  }
  d.olaylar.push({ tur: "turBasladi", tick: d.tick, turNo: m.turNo });
}

/** Geri çek isteklerini işler (tur içi, adımın başında). */
export function geriCekIstekleri(d: Dunya, girdiler: readonly [Girdi, Girdi]): void {
  for (let i = 0; i < 2; i++) {
    const h = girdiler[i]!.degistir;
    if (h < 0 || !geriCekAcik(d, i) || !geriCekHedefiGecerli(d, i, h)) continue;
    d.topaclar[i]!.geriCekKalan = MAC_ADIM.geriCek;
    d.takimlar![i]!.geriCekHedef = h;
    d.olaylar.push({ tur: "geriCek", tick: d.tick, i, hedef: h });
  }
}

/** Adım sonu: geri çek sayacı; dolunca swap (iniş noktası kaydırmalı). Bekleme sayacı. */
export function geriCekIlerlet(d: Dunya): void {
  for (let i = 0; i < 2; i++) {
    const tk = d.takimlar![i]!;
    if (tk.geriCekBekleme > 0) tk.geriCekBekleme--;
    const t = d.topaclar[i]!;
    if (t.geriCekKalan <= 0 || !aktifMi(t)) continue;
    t.geriCekKalan--;
    if (t.geriCekKalan > 0) continue;
    const hedef = tk.geriCekHedef;
    tk.geriCekHedef = -1;
    tk.geriCekBekleme = MAC_ADIM.geriCekBekleme;
    const n = inisNoktasi(d, i);
    uyeSahayaKoy(d, i, hedef, n.x, n.z);
  }
}

/** Geri sayım adımı: topaçlar doğumda bekler; bitince ilk tur. */
export function geriSayimAdimi(d: Dunya): void {
  d.mac.kalanTick--;
  if (d.mac.kalanTick > 0) return;
  d.mac.turNo = 1;
  d.mac.faz = "tur";
  d.olaylar.push({ tur: "turBasladi", tick: d.tick, turNo: 1 });
}

/**
 * Teslim (sim dışı olay; UI 2 s basılı tutma): anında 0-3 yenilgi. Sunucuda da aynı çağrı (D4).
 * Maç bitmişse etkisiz.
 */
export function teslimEt(d: Dunya, i: number): void {
  if (d.mac.mod !== "mac" || d.mac.faz === "bitti") return;
  d.mac.puan[i] = 0;
  d.mac.puan[1 - i] = M.kazanmaPuani;
  macBitir(d, 1 - i, "teslim");
}

/**
 * Hükmen (D4, flint #10 / #18): kopan (ya da 30 s girdisiz) oyuncu 0-3 yenik. Sim dışı karar, yalnız sunucu çağırır;
 * kayıtta (`MacKaydi`) eylem olarak tutulur, yeniden oynatma aynı adımda aynı çağrıyı yapar.
 */
export function hukmenBitir(d: Dunya, kaybeden: number): void {
  if (d.mac.mod !== "mac" || d.mac.faz === "bitti") return;
  d.mac.puan[kaybeden] = 0;
  d.mac.puan[1 - kaybeden] = M.kazanmaPuani;
  macBitir(d, 1 - kaybeden, "hukmen");
}

/** İptal (flint #11): iki taraf da kopup 20 s'de dönmedi. Sonuç yok (kazanan −1), puan olduğu gibi. */
export function macIptal(d: Dunya): void {
  if (d.mac.mod !== "mac" || d.mac.faz === "bitti") return;
  macBitir(d, -1, "iptal");
}
