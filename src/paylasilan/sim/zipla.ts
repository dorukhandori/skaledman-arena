import { AYAR } from "../kurallar/ayar.ts";
import type { HamleKurali } from "../kurallar/hamleler.ts";
import type { Girdi } from "./Girdi.ts";
import type { Dovuscu, Dunya } from "./durum.ts";

// Zıplama, enerji ve Z dinlenme. Yer hamleleri (Yer tipi alan) havadakine değmez (analiz `curvas`, `H()`).

export function havada(dv: Dovuscu): boolean {
  return dv.ziplaKalan > 0;
}

/** Deprem gibi yere vuran hamle: havadaki hedefe değmez. */
export function yerHamlesi(kural: HamleKurali): boolean {
  return kural.aile === "alan" && kural.tip === "GROUND";
}

/** Yerde, bekleme bitmiş, enerji yeterli, sersem/dash/hamle/geçiş yokken zıplar. */
export function ziplaBaslat(d: Dunya, i: number): boolean {
  const dv = d.dovusculer[i]!;
  const z = AYAR.zipla;
  if (havada(dv) || dv.ziplaBekleme > 0 || dv.enerji < z.maliyet - 1e-9) return false;
  if (dv.hitStun > 0 || dv.takilma > 0 || dv.dashKalan > 0 || dv.hamle || dv.gecis) return false;
  dv.enerji = Math.max(0, dv.enerji - z.maliyet);
  dv.ziplaKalan = z.sure;
  dv.dinleniyor = false;
  d.olaylar.push({ tur: "zipla", kim: i });
  return true;
}

/** Dinlenme yalnız yerde ve boştayken; hareket, saldırı, dash, zıplama ya da geçiş girdisi bozar. */
export function dinlenmeGuncelle(dv: Dovuscu, g: Girdi): void {
  const istek = g.dinlen && !g.atesle && !g.dash && !g.zipla && g.degistir < 0 && Math.hypot(g.yonX, g.yonZ) < 0.01;
  dv.dinleniyor = istek && !havada(dv) && !dv.hamle && dv.dashKalan <= 0 && dv.hitStun <= 0 && !dv.gecis && !dv.olu;
}

/** Her adım: enerji dolumu, havadaki süre ve yükseklik, iniş. */
export function ziplaIsle(d: Dunya, dv: Dovuscu, dt: number): void {
  const z = AYAR.zipla;
  const dolum = z.enerjiDolum * (dv.dinleniyor ? AYAR.dinlen.enerjiHizi : 1);
  dv.enerji = Math.min(1, dv.enerji + dolum * dt);
  if (dv.ziplaBekleme > 0) dv.ziplaBekleme = Math.max(0, dv.ziplaBekleme - dt);
  if (!havada(dv)) { dv.yukseklik = 0; return; }
  dv.ziplaKalan = Math.max(0, dv.ziplaKalan - dt);
  const p = 1 - dv.ziplaKalan / z.sure;
  dv.yukseklik = 4 * z.yukseklik * p * (1 - p);
  if (dv.ziplaKalan <= 1e-9) {
    dv.ziplaKalan = 0;
    dv.yukseklik = 0;
    dv.ziplaBekleme = z.bekleme;
    d.olaylar.push({ tur: "indi", kim: dv.indeks });
  }
}
