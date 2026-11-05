import { AYAR, ELEMENT_CARKI, KOKEN_PASIF, type ElementAdi } from "../kurallar/ayar.ts";
import type { TopacProfili } from "../veri/profil.ts";
import type { CarpismaTarafi, Dunya, Topac } from "./durum.ts";
import { kok2 } from "./fizik.ts";
import { aktifMi, staminaOrani } from "./topac.ts";
import { carpismaCarpanlari, temasSonrasi } from "./yetenek.ts";

// Topaç-topaç çarpışması (tuning § 5, 05 § 2.3-2.4). Daire-daire elastik olmayan darbe:
//   vn = (v1 − v2)·n, m_i = kutle_i·kCakilma_i(·Kaya), μ = m1m2/(m1+m2), Ş = μ·vn, J = (1+e)·Ş.
// SIRA BAĞIMSIZ: her iki tarafın sonucu ön-çarpışma değerlerinden hesaplanır, sonra birlikte yazılır.

const KUCUK = 1e-9;

/** İki dairenin örtüşmesini çözer: (x,z) dairesini (cx,cz)'nin dışına iter. Geçerli; eski API. */
export function daireDaireCoz(x: number, z: number, r: number, cx: number, cz: number, cr: number): { x: number; z: number } | null {
  const dx = x - cx;
  const dz = z - cz;
  const min = r + cr;
  const d2 = dx * dx + dz * dz;
  if (d2 >= min * min) return null;
  if (d2 < KUCUK) return { x: cx + min, z: cz };
  const d = Math.sqrt(d2);
  const k = min / d;
  return { x: cx + dx * k, z: cz + dz * k };
}

/** Nokta ile doğru parçası arasındaki en kısa mesafe (yetenekler için, D3). */
export function noktaParcaMesafesi(px: number, pz: number, ax: number, az: number, bx: number, bz: number): { mesafe: number; t: number } {
  const vx = bx - ax;
  const vz = bz - az;
  const u2 = vx * vx + vz * vz;
  let t = u2 < KUCUK ? 0 : ((px - ax) * vx + (pz - az) * vz) / u2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return { mesafe: kok2(px - (ax + vx * t), pz - (az + vz * t)), t };
}

/** Karşıt element: çarkta +3. */
export function zitElementMi(a: ElementAdi, b: ElementAdi): boolean {
  const i = ELEMENT_CARKI.indexOf(a);
  const j = ELEMENT_CARKI.indexOf(b);
  return (i + 3) % 6 === j;
}

/**
 * Yön çarpanı f (§ 5): vuranın hızı ile karşıya bakan normal arasındaki açı.
 * ön: v·n > 0 ve (v·n)² ≥ cos²(αön)·|v|²; yan: v·n > 0; arka / hızsız: fArka. Dash penceresinde × kDash.
 */
export function yonCarpani(t: Topac, p: TopacProfili, nx: number, nz: number): number {
  const v2 = t.vx * t.vx + t.vz * t.vz;
  let f: number = AYAR.fArka;
  if (v2 >= AYAR.hizsizEsik * AYAR.hizsizEsik) {
    const dot = t.vx * nx + t.vz * nz;
    if (dot > 0) f = dot * dot >= p.sim.onCos2 * v2 ? p.sim.onCarpani : AYAR.fYan;
  }
  return t.dashKalan > 0 ? f * AYAR.kDash : f;
}

/** kb_i = (1 + kKb·(1 − oran)²) · element alınan çarpanı (· 1,5 geri çek sırasında: savunmasız). */
export function kbCarpani(t: Topac, p: TopacProfili): number {
  const q = 1 - staminaOrani(t, p);
  const kb = (1 + AYAR.kKb * q * q) * p.sim.kbAlinanCarpani;
  return t.geriCekKalan > 0 ? kb * AYAR.mac.geriCekKb : kb;
}

/**
 * H_i = Ş·kH·( sqrt(s_j·f_j / sv_i) + kGeriOran·geriGimmick_i·s_i·f_i ), tavan %30 max.
 * Savunma 0 olamaz (veri: en az 16); yine de bölme güvenli olsun diye 1'e kırpılır.
 */
export function hasarHesapla(S: number, pi: TopacProfili, fi: number, pj: TopacProfili, fj: number): number {
  const ref = AYAR.statReferans;
  const sj = pj.parametreler.saldiri / ref;
  const si = pi.parametreler.saldiri / ref;
  const svi = Math.max(1, pi.parametreler.savunma) / ref;
  const h = S * AYAR.kH * (Math.sqrt((sj * fj) / svi) + AYAR.kGeriOran * pi.sim.geriGimmick * si * fi);
  const tavan = AYAR.tekVurusTavani * pi.maxStamina;
  return h < tavan ? h : tavan;
}

/** dTik_i = min(tikTavan, kTik·Ş·s_j·f_j·tikCarpani_j·40/kutle_i). */
export function tikHesapla(S: number, pi: TopacProfili, pj: TopacProfili, fj: number): number {
  const sj = pj.parametreler.saldiri / AYAR.statReferans;
  const t = AYAR.kTik * S * sj * fj * pj.sim.tikCarpani * (AYAR.tikKutleBoleni / pi.parametreler.kutle);
  return t < AYAR.tikTavan ? t : AYAR.tikTavan;
}

/** Bir adımın topaç-topaç çözümü. Olay `d.olaylar`'a yazılır. */
export function topacCarpismasi(d: Dunya): void {
  const [t1, t2] = d.topaclar;
  const [p1, p2] = d.profiller;
  if (d.temasKilidi > 0) d.temasKilidi--;
  if (!aktifMi(t1) || !aktifMi(t2)) return;
  if (t1.sekmeKalan > 0 || t2.sekmeKalan > 0) return; // havada: çarpışma geçirmez
  if (t1.koruma > 0 || t2.koruma > 0) return; // giriş koruması: çarpışmaz, hasar almaz (tuning § 10)
  const dx = t2.x - t1.x;
  const dz = t2.z - t1.z;
  const min = AYAR.topacYaricap * 2;
  const d2 = dx * dx + dz * dz;
  if (d2 >= min * min) return;
  let dist = Math.sqrt(d2);
  let nx = 1;
  let nz = 0;
  if (dist > KUCUK) { nx = dx / dist; nz = dz / dist; } else dist = 0;

  const m1 = p1.sim.etkinKutle;
  const m2 = p2.sim.etkinKutle;
  // konumsal ayırma (kütle ağırlıklı); darbe olsun olmasın
  const ortusme = min - dist;
  const w1 = m2 / (m1 + m2);
  const w2 = m1 / (m1 + m2);
  const ax1 = t1.x - nx * ortusme * w1;
  const az1 = t1.z - nz * ortusme * w1;
  const ax2 = t2.x + nx * ortusme * w2;
  const az2 = t2.z + nz * ortusme * w2;

  const vn = (t1.vx - t2.vx) * nx + (t1.vz - t2.vz) * nz;
  if (vn <= 0 || d.temasKilidi > 0) {
    t1.x = ax1; t1.z = az1; t2.x = ax2; t2.z = az2;
    return;
  }

  // --- ön-çarpışma değerleriyle her şeyi hesapla ---
  const mu = (m1 * m2) / (m1 + m2);
  const S = mu * vn;
  const e = (p1.sim.esneklik + p2.sim.esneklik) / 2;
  const J = (1 + e) * S;
  // D3: yetenek çarpanları (atılış penceresinde f × hasarKatsayisi, zırhta alınan itme/hasar); 1 ise uygulanmaz
  const c1 = carpismaCarpanlari(d, 0);
  const c2 = carpismaCarpanlari(d, 1);
  let f1 = yonCarpani(t1, p1, nx, nz);
  let f2 = yonCarpani(t2, p2, -nx, -nz);
  if (c1.f !== 1) f1 *= c1.f;
  if (c2.f !== 1) f2 *= c2.f;
  let kb1 = kbCarpani(t1, p1) * p2.sim.vurusItmeCarpani;
  let kb2 = kbCarpani(t2, p2) * p1.sim.vurusItmeCarpani;
  if (c1.kb !== 1) kb1 *= c1.kb;
  if (c2.kb !== 1) kb2 *= c2.kb;
  let yeniV1x = t1.vx - (J / m1) * nx * kb1;
  let yeniV1z = t1.vz - (J / m1) * nz * kb1;
  let yeniV2x = t2.vx + (J / m2) * nx * kb2;
  let yeniV2z = t2.vz + (J / m2) * nz * kb2;
  // FIZIK-1 sekme: ayrılma hızı en az ayrilmaHizi (eksik kütle oranıyla iki tarafa; momentum korunur)
  const ayrilma = (yeniV2x - yeniV1x) * nx + (yeniV2z - yeniV1z) * nz;
  if (AYAR.ayrilmaHizi > 0 && ayrilma < AYAR.ayrilmaHizi) {
    const eksik = AYAR.ayrilmaHizi - ayrilma;
    yeniV1x -= nx * eksik * w1; yeniV1z -= nz * eksik * w1;
    yeniV2x += nx * eksik * w2; yeniV2z += nz * eksik * w2;
  }
  let H1 = hasarHesapla(S, p1, f1, p2, f2);
  let H2 = hasarHesapla(S, p2, f2, p1, f1);
  if (c1.hasar !== 1) H1 *= c1.hasar;
  if (c2.hasar !== 1) H2 *= c2.hasar;
  const dTik1 = tikHesapla(S, p1, p2, f2);
  const dTik2 = tikHesapla(S, p2, p1, f1);

  // Karanlık Emiş: verilen hasarın %20'si (zıt yönde %40), rakipten çalınır
  const zitYon = p1.donus !== p2.donus;
  const K = KOKEN_PASIF.karanlik;
  const emis = (p: TopacProfili, verilen: number) =>
    !p.sim.emis ? 0 : Math.min(zitYon ? K.emisZitEnFazla : K.emisEnFazla, verilen * (zitYon ? K.emisZitOran : K.emisOran));
  const emis1 = emis(p1, H2);
  const emis2 = emis(p2, H1);
  let s1 = t1.stamina - H1 - emis2 + emis1;
  let s2 = t2.stamina - H2 - emis1 + emis2;
  if (s1 > p1.maxStamina) s1 = p1.maxStamina;
  if (s2 > p2.maxStamina) s2 = p2.maxStamina;

  // Zıt yön eşitleme: yüksek oranlıdan düşüğe kEsit · oranFarkı · maxStamina (en çok 20); aynı yönde yok
  let esitleme = 0;
  if (zitYon && s1 > 0 && s2 > 0) {
    const o1 = s1 / p1.maxStamina;
    const o2 = s2 / p2.maxStamina;
    if (o1 > o2) esitleme = Math.min(AYAR.kEsitEnFazla, AYAR.kEsit * (o1 - o2) * p1.maxStamina);
    else if (o2 > o1) esitleme = -Math.min(AYAR.kEsitEnFazla, AYAR.kEsit * (o2 - o1) * p2.maxStamina);
    s1 -= esitleme;
    s2 += esitleme;
    if (s1 > p1.maxStamina) s1 = p1.maxStamina;
    if (s2 > p2.maxStamina) s2 = p2.maxStamina;
  }

  // --- birlikte yaz ---
  t1.x = ax1; t1.z = az1; t2.x = ax2; t2.z = az2;
  t1.vx = yeniV1x; t1.vz = yeniV1z; t2.vx = yeniV2x; t2.vz = yeniV2z;
  t1.stamina = s1; t2.stamina = s2;
  t1.tik += dTik1; t2.tik += dTik2;
  d.temasKilidi = AYAR.temasKilidi;

  const taraf = (t: Topac, p: TopacProfili, f: number, h: number, dt: number): CarpismaTarafi => ({
    f, element: p.element, dash: t.dashKalan > 0, hasar: h, dTik: dt, tikSonrasi: t.tik, staminaSonrasi: t.stamina,
  });
  const olay = {
    tur: "carpisma" as const, tick: d.tick, s: S, vn,
    x: ax1 + nx * AYAR.topacYaricap, z: az1 + nz * AYAR.topacYaricap, nx, nz,
    taraflar: [taraf(t1, p1, f1, H1, dTik1), taraf(t2, p2, f2, H2, dTik2)] as [CarpismaTarafi, CarpismaTarafi],
    zitElement: zitElementMi(p1.element, p2.element), zitYon, esitleme,
  };
  d.olaylar.push(olay);
  if (t1.yetenekFaz === 2 || t2.yetenekFaz === 2) temasSonrasi(d, olay);
}
