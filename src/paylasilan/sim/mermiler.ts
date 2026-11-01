import type { HamleKurali } from "../kurallar/hamleler.ts";
import { parcaDaire, parcaEngel } from "./carpisma.ts";
import type { Alan, Dunya } from "./durum.ts";
import { vur } from "./vurus.ts";
import { havada, yerHamlesi } from "./zipla.ts";

// Mermiler ve gecikmeli alanlar. Deterministik: yalnız d ve dt'ye bağlı.

export function mermiOlustur(d: Dunya, sahip: number, yuva: number, kural: HamleKurali, yonX: number, yonZ: number): void {
  const dv = d.dovusculer[sahip]!;
  const hiz = kural.hiz ?? 0;
  d.mermiler.push({
    id: d.sonrakiId++, sahip, yuva, tip: kural.tip,
    x: dv.x + yonX * d.arena.govdeYaricap, z: dv.z + yonZ * d.arena.govdeYaricap,
    vx: yonX * hiz, vz: yonZ * hiz, yaricap: kural.yaricap ?? 0, kalanMenzil: kural.menzil,
  });
}

export function mermileriIlerlet(d: Dunya, dt: number): void {
  const kalanlar: typeof d.mermiler = [];
  const govde = d.arena.govdeYaricap;
  for (const m of d.mermiler) {
    const hiz = Math.hypot(m.vx, m.vz);
    const adim = Math.min(hiz * dt, m.kalanMenzil);
    const ux = m.vx / hiz;
    const uz = m.vz / hiz;
    const bx = m.x + ux * adim;
    const bz = m.z + uz * adim;

    // en erken çarpışma: engel mi, gövde mi
    let tEn = parcaEngel(d.arena, m.x, m.z, bx, bz, m.yaricap);
    let hedef = -1;
    for (const dv of d.dovusculer) {
      if (dv.indeks === m.sahip || dv.olu || dv.sahaDisi || dv.dokunulmaz > 0) continue;
      const t = parcaDaire(m.x, m.z, bx, bz, dv.x, dv.z, govde + m.yaricap);
      if (t !== null && (tEn === null || t < tEn)) { tEn = t; hedef = dv.indeks; }
    }
    const disarida = Math.abs(bx) > d.arena.yariGenislik || bz < 0 || bz > d.arena.derinlik;

    if (tEn !== null) {
      const x = m.x + ux * adim * tEn;
      const z = m.z + uz * adim * tEn;
      const vurdu = hedef >= 0 && vur(d, m.sahip, hedef, m.yuva, ux, uz);
      d.olaylar.push({ tur: "mermiBitti", id: m.id, x, z, tip: m.tip, vurdu });
      continue;
    }
    m.x = bx;
    m.z = bz;
    m.kalanMenzil -= adim;
    if (m.kalanMenzil <= 1e-6 || disarida) {
      d.olaylar.push({ tur: "mermiBitti", id: m.id, x: bx, z: bz, tip: m.tip, vurdu: false });
      continue;
    }
    kalanlar.push(m);
  }
  d.mermiler = kalanlar;
}

export function alanlariIlerlet(d: Dunya, dt: number): void {
  const kalanlar: Alan[] = [];
  for (const a of d.alanlar) {
    a.kalan -= dt;
    if (a.kalan > 0) { kalanlar.push(a); continue; }
    d.olaylar.push({ tur: "alanPatladi", id: a.id, kim: a.sahip, tip: a.tip, x: a.x, z: a.z, yaricap: a.yaricap });
    const kural = d.profiller[a.sahip]?.yuvalar[a.yuva];
    const yerde = !!kural && yerHamlesi(kural);
    for (const dv of d.dovusculer) {
      if (dv.indeks === a.sahip || dv.olu || dv.sahaDisi || (yerde && havada(dv))) continue;
      const mesafe = Math.hypot(dv.x - a.x, dv.z - a.z);
      if (mesafe - d.arena.govdeYaricap > a.yaricap) continue;
      const u = mesafe < 1e-6 ? 1 : mesafe;
      const yonX = mesafe < 1e-6 ? 0 : (dv.x - a.x) / u;
      const yonZ = mesafe < 1e-6 ? 1 : (dv.z - a.z) / u;
      vur(d, a.sahip, dv.indeks, a.yuva, yonX, yonZ);
    }
  }
  d.alanlar = kalanlar;
}
