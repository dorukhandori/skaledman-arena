import { AYAR } from "../kurallar/ayar.ts";
import type { TopacProfili } from "../veri/profil.ts";
import type { Girdi } from "./Girdi.ts";
import { TOPAC_DURUM, type Olay, type Topac } from "./durum.ts";
import { kok2 } from "./fizik.ts";

// Topaç durumu: kurulum, oranlar, eylemler (dash, sekme, sıkı dönüş). tuning § 4, flint #20.

const sn = (s: number) => Math.round(s * AYAR.adimHz);
export const DASH_PENCERESI_ADIM = sn(AYAR.dashPenceresi);
export const SEKME_ADIM = sn(AYAR.sekmeSure);
export const SEKME_BEKLEME_ADIM = sn(AYAR.sekmeBekleme);

export function topacKur(p: TopacProfili, x: number, z: number, desenFaz: number): Topac {
  return {
    x, z, vx: 0, vz: 0,
    stamina: p.maxStamina,
    tik: 0,
    durum: TOPAC_DURUM.aktif,
    dashKalan: 0, dashBekleme: 0,
    sekmeKalan: 0, sekmeBekleme: 0,
    sikiDonus: 0,
    sonumKalan: 0,
    desenFaz,
    koruma: 0,
    geriCekKalan: 0,
    enerji: 0,
    sahadaTick: 0,
    bekleme1: 0,
    bekleme2: 0,
    yapayIndirim: p.koken === "yapay" ? 1 : 0,
    yetenekNo: -1,
    yetenekYuva: -1,
    etkinNo: -1,
    etkiOlcek: 1,
    yetenekFaz: 0,
    yetenekKalan: 0,
    yetenekDx: 0,
    yetenekDz: 0,
    yetenekHx: 0,
    yetenekHz: 0,
    telegrafToplam: 0,
    kilitKalan: 0,
    sersemKalan: 0,
    vurdu: 0,
    kavisIsaret: 1,
    zincirKalan: 0,
    zincirBekleme: 0,
    emisBekleme: 0,
  };
}

export const aktifMi = (t: Topac): boolean => t.durum === TOPAC_DURUM.aktif;
export const staminaOrani = (t: Topac, p: TopacProfili): number => (t.stamina > 0 ? t.stamina / p.maxStamina : 0);
export const yorgunlukCarpani = (t: Topac, p: TopacProfili): number => AYAR.yorgunluk.taban + AYAR.yorgunluk.egim * staminaOrani(t, p);

/** Eylem bedeli ödenebilir mi: eylem stamina'yı sıfıra indiremez (bedel > stamina − pay ise ret). */
export const bedelOdenir = (t: Topac, bedel: number): boolean => bedel <= t.stamina - AYAR.eylemStaminaPayi;

/** Sayaçları bir adım ilerletir. */
export function sayaclariIlerlet(t: Topac): void {
  if (t.dashKalan > 0) t.dashKalan--;
  if (t.dashBekleme > 0) t.dashBekleme--;
  if (t.sekmeKalan > 0) t.sekmeKalan--;
  if (t.sekmeBekleme > 0) t.sekmeBekleme--;
  if (t.koruma > 0) t.koruma--;
}

/**
 * Dash / Sekme / Sıkı Dönüş. Dash yönü: girdi yönü; yoksa hız yönü; o da yoksa rakibe doğru (varsaydım).
 * `rakip` yalnız bu son yedek için okunur.
 */
export function eylemleriUygula(t: Topac, p: TopacProfili, g: Girdi, rakip: Topac, i: number, tick: number, olaylar: Olay[]): void {
  t.sikiDonus = g.dinlen ? 1 : 0;
  if (g.dash && t.dashBekleme === 0 && bedelOdenir(t, p.sim.dashMaliyet)) {
    let dx = g.yonX;
    let dz = g.yonZ;
    let u = kok2(dx, dz);
    if (u < 1e-9) { dx = t.vx; dz = t.vz; u = kok2(dx, dz); }
    if (u < 1e-9) { dx = rakip.x - t.x; dz = rakip.z - t.z; u = kok2(dx, dz); }
    if (u >= 1e-9) {
      dx /= u; dz /= u;
      t.vx += dx * p.sim.dashEki;
      t.vz += dz * p.sim.dashEki;
      t.stamina -= p.sim.dashMaliyet;
      t.dashKalan = DASH_PENCERESI_ADIM;
      t.dashBekleme = p.sim.dashBekleme;
      olaylar.push({ tur: "dash", tick, i, dx, dz });
    }
  }
  if (g.zipla && t.sekmeBekleme === 0 && t.sekmeKalan === 0 && bedelOdenir(t, AYAR.sekmeStamina)) {
    t.stamina -= AYAR.sekmeStamina;
    t.sekmeKalan = SEKME_ADIM;
    t.sekmeBekleme = SEKME_BEKLEME_ADIM;
    olaylar.push({ tur: "sekme", tick, i });
  }
}
