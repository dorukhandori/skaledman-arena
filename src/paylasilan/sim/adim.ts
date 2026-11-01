import { yonBul } from "../atlas.ts";
import { AYAR } from "../kurallar/ayar.ts";
import { konumCoz } from "./carpisma.ts";
import type { Girdi } from "./Girdi.ts";
import type { Dunya } from "./durum.ts";
import { hamleIptal, hamleKurali } from "./hamle.ts";
import { statCarpani } from "./kademe.ts";

// applyInput: hareket + dash. Sunucu ve istemci tahmini aynı fonksiyonu çalıştırır.

const DASH_HIZI = AYAR.dash.mesafe / AYAR.dash.sure;

export function dashBaslat(d: Dunya, i: number, g: Girdi): void {
  const dv = d.dovusculer[i]!;
  let dx = g.yonX;
  let dz = g.yonZ;
  const u = Math.hypot(dx, dz);
  if (u < 0.01) { dx = dv.yonX; dz = dv.yonZ; } else { dx /= u; dz /= u; }
  hamleIptal(d, i);
  dv.dashKalan = AYAR.dash.sure;
  dv.dashX = dx;
  dv.dashZ = dz;
  dv.dashBekleme = AYAR.dash.bekleme;
  dv.dokunulmaz = AYAR.dash.dokunulmaz;
  d.olaylar.push({ tur: "dash", kim: i });
}

/** Bir dövüşçünün bir adımlık hareketi: dash, embestida atılışı, yürüme ve knockback üst üste biner. */
export function hareketAdimla(d: Dunya, i: number, g: Girdi, dt: number): void {
  const dv = d.dovusculer[i]!;
  if (dv.olu || dv.sahaDisi) { dv.hizX = 0; dv.hizZ = 0; return; }
  const h = dv.hamle;
  let dx = 0;
  let dz = 0;

  if (dv.dashKalan > 0) {
    const s = Math.min(dt, dv.dashKalan);
    dx = dv.dashX * DASH_HIZI * s;
    dz = dv.dashZ * DASH_HIZI * s;
    dv.dashKalan -= s;
    if (dv.dashKalan < 1e-9) dv.dashKalan = 0;
  } else if (h?.evre === "atilis") {
    const kural = hamleKurali(d, i);
    const mesafe = Math.min((kural?.hiz ?? 0) * dt, h.kalan);
    dx = h.yonX * mesafe;
    dz = h.yonZ * mesafe;
  } else if (!h && !dv.gecis && !dv.dinleniyor && dv.hitStun <= 0 && dv.takilma <= 0) {
    const hiz = d.profiller[i]!.hiz * (dv.felc > 0 ? AYAR.felc.hizCarpani : 1) * statCarpani(dv, "hiz");
    dx = g.yonX * hiz * dt;
    dz = g.yonZ * hiz * dt;
    const u = Math.hypot(g.yonX, g.yonZ);
    if (u > 0.01) {
      dv.yonX = g.yonX / u;
      dv.yonZ = g.yonZ / u;
      dv.yon = yonBul(dv.yonX, dv.yonZ, dv.yon);
    }
  }

  if (dv.itKalan > 0) {
    const s = Math.min(dt, dv.itKalan);
    dx += dv.itX * s;
    dz += dv.itZ * s;
    dv.itKalan -= s;
    if (dv.itKalan < 1e-9) { dv.itKalan = 0; dv.itX = 0; dv.itZ = 0; }
  }

  const c = konumCoz(d.arena, dv.x + dx, dv.z + dz, d.arena.govdeYaricap);
  dv.hizX = (c.x - dv.x) / dt;
  dv.hizZ = (c.z - dv.z) / dt;
  dv.x = c.x;
  dv.z = c.z;
}

/** Gövdeler birbirinin içine girmesin: eşit paylaşımlı itme. */
export function dovuscuAyir(d: Dunya): void {
  const [a, b] = d.dovusculer;
  if (!a || !b || a.olu || b.olu || a.sahaDisi || b.sahaDisi) return;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const min = 2 * d.arena.govdeYaricap;
  const u2 = dx * dx + dz * dz;
  if (u2 >= min * min) return;
  const u = Math.sqrt(u2);
  const nx = u < 1e-6 ? 1 : dx / u;
  const nz = u < 1e-6 ? 0 : dz / u;
  const it = (min - u) / 2;
  const ca = konumCoz(d.arena, a.x - nx * it, a.z - nz * it, d.arena.govdeYaricap);
  const cb = konumCoz(d.arena, b.x + nx * it, b.z + nz * it, d.arena.govdeYaricap);
  a.x = ca.x; a.z = ca.z; b.x = cb.x; b.z = cb.z;
}
