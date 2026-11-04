import { AYAR, KOKEN_PASIF } from "../kurallar/ayar.ts";
import { RADYAN_BASINA_BIRIM, cosT, sinT } from "../kurallar/sinTablo.ts";
import type { TopacProfili } from "../veri/profil.ts";
import type { Girdi } from "./Girdi.ts";
import type { Olay, Topac } from "./durum.ts";

// Hareket (tuning § 3, 05 § 2.2): sürüş ivmesi + Uç deseni (girdi üstüne biner) + kenar eğimi + sürtünme,
// tavan, entegrasyon; stamina erimesi (§ 6); duvar / Ring Out (§ 2). Yalnız + - * / ve Math.sqrt.

const R = AYAR.arenaYaricap;
const r = AYAR.topacYaricap;
const EGIM_D = AYAR.egimBaslangic * R;
const EGIM_GENISLIK = R - EGIM_D;
const KUSAK_IC = AYAR.kusakIc * R;
const KUSAK_DIS = AYAR.kusakDis * R;
const MERKEZ = AYAR.merkezKucukAlan * R;
const dt = AYAR.dt;

/** Hypot yerine: tek doğru yuvarlanmış sqrt (IEEE), her motorda aynı. */
export function kok2(x: number, z: number): number {
  return Math.sqrt(x * x + z * z);
}

export function kusakta(t: Topac): boolean {
  const d = kok2(t.x, t.z);
  return d >= KUSAK_IC && d <= KUSAK_DIS;
}

/** Sürüş + desen ivmesi; tavanı (vSurus · yorgunluk · kuşak) aşan bileşen uygulanmaz, dış hız bozulmaz. */
function kendiIvmesi(t: Topac, p: TopacProfili, g: Girdi, tick: number, yorgunluk: number): void {
  if (t.sikiDonus) return; // Sıkı Dönüş: hareket 0 (sürüş ve desen yok)
  const s = p.sim;
  let ax = s.ivme * yorgunluk * g.yonX;
  let az = s.ivme * yorgunluk * g.yonZ;
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
  const tavan = s.vSurus * yorgunluk * (kusakta(t) ? s.kusakHizCarpani : 1);
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
export function hareketAdimla(t: Topac, p: TopacProfili, g: Girdi, tick: number, yorgunluk: number): void {
  kendiIvmesi(t, p, g, tick, yorgunluk);
  // kenar eğimi: d > 0,7R'den merkeze, kEgim · ((d − 0,7R)/(0,3R))²
  const d = kok2(t.x, t.z);
  if (d > EGIM_D) {
    const q = (d - EGIM_D) / EGIM_GENISLIK;
    const a = AYAR.kEgim * q * q;
    t.vx -= (t.x / d) * a * dt;
    t.vz -= (t.z / d) * a * dt;
  }
  // doğrusal sürtünme + Coulomb
  const sur = 1 - p.sim.surtunme * dt;
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

/** Stamina erimesi/s = erime · (sıkı dönüş ? Uç çarpanı : 1) · (Kök ? 0,8 : 1) + kHiz · |v|²/vRef². */
export function erimeUygula(t: Topac, p: TopacProfili): void {
  let e = p.sim.erime;
  if (t.sikiDonus) e *= p.sim.sikiDonusCarpani;
  const v2 = t.vx * t.vx + t.vz * t.vz;
  if (p.sim.kok && t.x * t.x + t.z * t.z < MERKEZ * MERKEZ && v2 < KOK_HIZ2) e *= KOK_ERIME;
  t.stamina -= (e + (AYAR.kHiz * v2) / (AYAR.vRef * AYAR.vRef)) * dt;
}

/**
 * Duvar: merkez d ≥ R − r iken dışa hız vd. vd ≥ vRO ve d > egimBaslangic → Ring Out (true döner);
 * altında sekme (eDuvar), stamina bedeli kDuvar·vd, vd > 120 ise +duvarTik.
 */
export function duvarCoz(t: Topac, p: TopacProfili, i: number, tick: number, olaylar: Olay[] | null): boolean {
  const sinir = R - r;
  const d = kok2(t.x, t.z);
  if (d < sinir) return false;
  const nx = t.x / d;
  const nz = t.z / d;
  const vd = t.vx * nx + t.vz * nz;
  if (olaylar && vd >= p.sim.ringOutHizi && d > EGIM_D) return true;
  if (vd > 0 && vd < AYAR.duvarOlayHizi) {
    // yavaş temas: normal bileşeni sil, duvar boyunca kay (bedelsiz)
    t.vx -= vd * nx;
    t.vz -= vd * nz;
  } else if (vd > 0) {
    t.vx -= (1 + AYAR.eDuvar) * vd * nx;
    t.vz -= (1 + AYAR.eDuvar) * vd * nz;
    if (olaylar) {
      t.stamina -= AYAR.kDuvar * vd;
      if (vd > AYAR.duvarTikHizi) t.tik += AYAR.duvarTik;
      olaylar.push({ tur: "duvar", tick, i, vd, x: nx * R, z: nz * R, nx, nz });
    }
  }
  t.x = nx * sinir;
  t.z = nz * sinir;
  return false;
}
