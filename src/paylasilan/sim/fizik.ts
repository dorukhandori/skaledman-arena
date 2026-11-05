import { AYAR, KOKEN_PASIF } from "../kurallar/ayar.ts";
import { RADYAN_BASINA_BIRIM, cosT, sinT } from "../kurallar/sinTablo.ts";
import type { TopacProfili } from "../veri/profil.ts";
import type { Girdi } from "./Girdi.ts";
import type { Olay, Topac } from "./durum.ts";

/** Yetenek/alan hareket çarpanları (sim/yetenek.ts üretir). Hepsi nötrse D2 ifadeleri aynen çalışır. */
export interface HareketCarpanlari { ivme: number; tavan: number; surtunme: number; ax: number; az: number }

// Hareket (tuning § 3, 05 § 2.2): sürüş ivmesi + Uç deseni (girdi üstüne biner) + kenar eğimi + sürtünme,
// tavan, entegrasyon; stamina erimesi (§ 6); duvar / Ring Out (§ 2). Yalnız + - * / ve Math.sqrt.

// Çanak yarıçapı R parametredir (ani ölümde daralır, tuning § 10); eğim ve kuşak R ile ölçeklenir.
// Varsayılan R = AYAR.arenaYaricap: aynı ifadeler aynı float'ı verir (D1 davranışı bit bit korunur).
const R0 = AYAR.arenaYaricap;
const r = AYAR.topacYaricap;
const MERKEZ = AYAR.merkezKucukAlan * R0;
const dt = AYAR.dt;

/** Hypot yerine: tek doğru yuvarlanmış sqrt (IEEE), her motorda aynı. */
export function kok2(x: number, z: number): number {
  return Math.sqrt(x * x + z * z);
}

export function kusakta(t: Topac, R: number = R0): boolean {
  const d = kok2(t.x, t.z);
  return d >= AYAR.kusakIc * R && d <= AYAR.kusakDis * R;
}

/** Sürüş + desen ivmesi; tavanı (vSurus · yorgunluk · kuşak) aşan bileşen uygulanmaz, dış hız bozulmaz. */
function kendiIvmesi(t: Topac, p: TopacProfili, g: Girdi, tick: number, yorgunluk: number, R: number, m: HareketCarpanlari | null): void {
  if (t.sikiDonus) return; // Sıkı Dönüş: hareket 0 (sürüş ve desen yok)
  const s = p.sim;
  let ax = s.ivme * yorgunluk * g.yonX;
  let az = s.ivme * yorgunluk * g.yonZ;
  if (m && m.ivme !== 1) { ax *= m.ivme; az *= m.ivme; }
  if (s.desenAd > 0) {
    // φ = ωd · t + faz (tablo biriminde)
    const phi = s.desenOmega * tick * dt * RADYAN_BASINA_BIRIM + t.desenFaz;
    ax += s.desenAd * cosT(phi);
    az += s.desenAd * sinT(phi);
  }
  if (s.desenKMerkez > 0) {
    ax -= s.desenKMerkez * t.x;
    az -= s.desenKMerkez * t.z;
  }
  let tavan = s.vSurus * yorgunluk * (kusakta(t, R) ? s.kusakHizCarpani : 1);
  if (m && m.tavan !== 1) tavan *= m.tavan;
  const v0 = kok2(t.vx, t.vz);
  let nvx = t.vx + ax * dt;
  let nvz = t.vz + az * dt;
  const v1 = kok2(nvx, nvz);
  if (v1 > tavan && v1 > v0) {
    if (v0 <= tavan) {
      const k = tavan / v1;
      nvx *= k; nvz *= k;
    } else {
      // tavanın üstünde: ivmenin yalnız hıza dik bileşeni (hız büyüklüğü korunur)
      const ux = t.vx / v0;
      const uz = t.vz / v0;
      const par = ax * ux + az * uz;
      nvx = t.vx + (ax - par * ux) * dt;
      nvz = t.vz + (az - par * uz) * dt;
      const v2 = kok2(nvx, nvz);
      if (v2 > v0) { const k = v0 / v2; nvx *= k; nvz *= k; }
    }
  }
  t.vx = nvx;
  t.vz = nvz;
}

/** Bir topacın hareket adımı (çarpışma ve duvar hariç). */
export function hareketAdimla(t: Topac, p: TopacProfili, g: Girdi, tick: number, yorgunluk: number, R: number = R0, m: HareketCarpanlari | null = null): void {
  kendiIvmesi(t, p, g, tick, yorgunluk, R, m);
  // alan çekimi / yan kayma (dış ivme; tavana bağlı değil)
  if (m && (m.ax !== 0 || m.az !== 0)) { t.vx += m.ax * dt; t.vz += m.az * dt; }
  // Merkeze eğim, büyüklük a (br/s²): kenar eğimi d > 0,7R'den kEgim · ((d − 0,7R)/(0,3R))²; FIZIK-1 çanak eğimi
  // tüm yarıçapta (d ≥ canakYumusak sabit canakEgimi, içeride doğrusal, merkezde 0). İkisi toplanmaz, büyüğü alınır:
  // kenarda kenar eğimi baskın (Ring Out çizgisi aynı kalır). Tahmin (tahmin.ts) aynı fonksiyonu koşar.
  const d = kok2(t.x, t.z);
  const egimD = AYAR.egimBaslangic * R;
  let a = 0;
  if (d > egimD) {
    const q = (d - egimD) / (R - egimD);
    a = AYAR.kEgim * q * q;
  }
  if (AYAR.canakEgimi > 0) {
    const c = d >= AYAR.canakYumusak ? AYAR.canakEgimi : (AYAR.canakEgimi * d) / AYAR.canakYumusak;
    if (c > a) a = c;
  }
  if (a > 0) {
    t.vx -= (t.x / d) * a * dt;
    t.vz -= (t.z / d) * a * dt;
  }
  // doğrusal sürtünme + Coulomb
  const sur = 1 - (m && m.surtunme !== 1 ? p.sim.surtunme * m.surtunme : p.sim.surtunme) * dt;
  t.vx *= sur > 0 ? sur : 0;
  t.vz *= sur > 0 ? sur : 0;
  const v = kok2(t.vx, t.vz);
  const dusus = AYAR.sabitSurtunme * dt;
  if (v <= dusus) { t.vx = 0; t.vz = 0; } else { const k = (v - dusus) / v; t.vx *= k; t.vz *= k; }
  sinirla(t);
  t.x += t.vx * dt;
  t.z += t.vz * dt;
}

/** |v| ≤ vMutlak. */
export function sinirla(t: Topac): void {
  const v = kok2(t.vx, t.vz);
  if (v > AYAR.vMutlak) { const k = AYAR.vMutlak / v; t.vx *= k; t.vz *= k; }
}

const KOK_HIZ2 = KOKEN_PASIF.maden.kokHizEsigi * KOKEN_PASIF.maden.kokHizEsigi;
const KOK_ERIME = KOKEN_PASIF.maden.kokErimeCarpani;

/**
 * Stamina erimesi/s = erime · (sıkı dönüş ? Uç çarpanı : 1) · (Kök ? 0,8 : 1) · aniOlum + kHiz · |v|²/vRef².
 * `aniOlum`: ani ölüm erime çarpanı (1 + 0,05·t); 1 iken çarpma yapılmaz.
 */
export function erimeUygula(t: Topac, p: TopacProfili, aniOlum = 1, alanCarpani = 1): void {
  let e = p.sim.erime;
  if (aniOlum !== 1) e *= aniOlum;
  if (alanCarpani !== 1) e *= alanCarpani;
  if (t.sikiDonus) e *= p.sim.sikiDonusCarpani;
  const v2 = t.vx * t.vx + t.vz * t.vz;
  if (p.sim.kok && t.x * t.x + t.z * t.z < MERKEZ * MERKEZ && v2 < KOK_HIZ2) e *= KOK_ERIME;
  t.stamina -= (e + (AYAR.kHiz * v2) / (AYAR.vRef * AYAR.vRef)) * dt;
}

/**
 * Duvar: merkez d ≥ R − r iken dışa hız vd. vd ≥ vRO ve d > egimBaslangic → Ring Out (true döner);
 * altında sekme (eDuvar), stamina bedeli kDuvar·vd, vd > 120 ise +duvarTik.
 */
export function duvarCoz(t: Topac, p: TopacProfili, i: number, tick: number, olaylar: Olay[] | null, R: number = R0): boolean {
  const sinir = R - r;
  const d = kok2(t.x, t.z);
  if (d < sinir) return false;
  const nx = t.x / d;
  const nz = t.z / d;
  const vd = t.vx * nx + t.vz * nz;
  if (olaylar && vd >= p.sim.ringOutHizi && d > AYAR.egimBaslangic * R) return true;
  if (vd > 0 && vd < AYAR.duvarOlayHizi) {
    // yavaş temas: normal bileşeni sil, duvar boyunca kay (bedelsiz)
    t.vx -= vd * nx;
    t.vz -= vd * nz;
  } else if (vd > 0) {
    t.vx -= (1 + AYAR.eDuvar) * vd * nx;
    t.vz -= (1 + AYAR.eDuvar) * vd * nz;
    if (olaylar) {
      // giriş koruması: hasar almaz (tuning § 10)
      if (t.koruma <= 0) {
        t.stamina -= AYAR.kDuvar * vd;
        if (vd > AYAR.duvarTikHizi) t.tik += AYAR.duvarTik;
      }
      olaylar.push({ tur: "duvar", tick, i, vd, x: nx * R, z: nz * R, nx, nz });
    }
  }
  t.x = nx * sinir;
  t.z = nz * sinir;
  return false;
}
