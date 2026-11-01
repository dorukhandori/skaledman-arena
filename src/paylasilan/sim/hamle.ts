import { yonBul } from "../atlas.ts";
import { AYAR } from "../kurallar/ayar.ts";
import type { HamleKurali } from "../kurallar/hamleler.ts";
import { parcaEngel, noktaParcaMesafesi, yayIcinde } from "./carpisma.ts";
import type { Girdi } from "./Girdi.ts";
import type { Dunya } from "./durum.ts";
import { mermiOlustur } from "./mermiler.ts";
import { vur } from "./vurus.ts";

// Hamle yaşam döngüsü: başlat (aviso) → çıkar (aileye göre vuruş çözümü) → toparlan.

const DERECE = Math.PI / 180;

export function hamleKurali(d: Dunya, i: number): HamleKurali | null {
  const h = d.dovusculer[i]!.hamle;
  return h ? d.profiller[i]!.yuvalar[h.yuva] ?? null : null;
}

function birimYon(dx: number, dz: number, yedekX: number, yedekZ: number): [number, number] {
  const u = Math.hypot(dx, dz);
  return u < 1e-6 ? [yedekX, yedekZ] : [dx / u, dz / u];
}

export function hamleIptal(d: Dunya, i: number): void {
  const dv = d.dovusculer[i]!;
  if (dv.hamle) {
    dv.hamle = null;
    d.olaylar.push({ tur: "hamleIptal", kim: i });
  }
}

/** Yuva hazırsa telegrafı başlatır. Cooldown bu anda işlemeye başlar. */
export function hamleBaslat(d: Dunya, i: number, g: Girdi): void {
  const dv = d.dovusculer[i]!;
  const kural = d.profiller[i]!.yuvalar[g.secilenYuva];
  if (!kural || dv.cooldown[g.secilenYuva]! > 0) return;

  const [yx, yz] = birimYon(g.nisanX - dv.x, g.nisanZ - dv.z, dv.yonX, dv.yonZ);
  const hedefMesafe = kural.aile === "alan" ? Math.min(Math.hypot(g.nisanX - dv.x, g.nisanZ - dv.z), kural.menzil) : kural.menzil;
  const arena = d.arena;
  const hedefX = Math.max(-arena.yariGenislik, Math.min(arena.yariGenislik, dv.x + yx * hedefMesafe));
  const hedefZ = Math.max(0, Math.min(arena.derinlik, dv.z + yz * hedefMesafe));
  const aviso = AYAR.telegraf[kural.aviso];

  dv.cooldown[g.secilenYuva] = kural.cooldown;
  dv.yonX = yx;
  dv.yonZ = yz;
  dv.yon = yonBul(yx, yz, dv.yon);
  dv.hamle = { yuva: g.secilenYuva, evre: "aviso", kalan: aviso, yonX: yx, yonZ: yz, hedefX, hedefZ, vurdu: false };

  if (kural.aile === "alan") {
    const gecikme = kural.gecikme ?? aviso;
    d.alanlar.push({ id: d.sonrakiId++, sahip: i, yuva: g.secilenYuva, tip: kural.tip, x: hedefX, z: hedefZ, yaricap: kural.yaricap ?? 0, kalan: gecikme, toplam: gecikme });
  }
  d.olaylar.push({
    tur: "hamleBasladi", kim: i, yuva: g.secilenYuva, aile: kural.aile, tip: kural.tip, aviso,
    x: dv.x, z: dv.z, yonX: yx, yonZ: yz, hedefX, hedefZ,
    menzil: kural.menzil, yaricap: kural.yaricap ?? 0, yay: kural.yay ?? 0, kalinlik: kural.kalinlik ?? 0, mesafe: kural.mesafe ?? 0,
  });
}

function dusmanlar(d: Dunya, i: number): number[] {
  const liste: number[] = [];
  for (const dv of d.dovusculer) if (dv.indeks !== i && !dv.olu && !dv.sahaDisi) liste.push(dv.indeks);
  return liste;
}

function mesafe(d: Dunya, i: number, j: number): number {
  const a = d.dovusculer[i]!;
  const b = d.dovusculer[j]!;
  return Math.hypot(b.x - a.x, b.z - a.z);
}

function cikar(d: Dunya, i: number, kural: HamleKurali): void {
  const dv = d.dovusculer[i]!;
  const h = dv.hamle!;
  const govde = d.arena.govdeYaricap;
  const { yonX, yonZ } = h;
  let uzunluk = kural.menzil;

  switch (kural.aile) {
    case "poke": {
      const cos = Math.cos(((kural.yay ?? 0) / 2) * DERECE);
      let enYakin = -1;
      for (const j of dusmanlar(d, i)) {
        const e = d.dovusculer[j]!;
        if (mesafe(d, i, j) - govde > kural.menzil || !yayIcinde(dv.x, dv.z, yonX, yonZ, e.x, e.z, cos)) continue;
        if (enYakin < 0 || mesafe(d, i, j) < mesafe(d, i, enYakin)) enYakin = j;
      }
      if (enYakin >= 0) vur(d, i, enYakin, h.yuva, yonX, yonZ);
      break;
    }
    case "koni": {
      const cos = Math.cos(((kural.yay ?? 0) / 2) * DERECE);
      for (const j of dusmanlar(d, i)) {
        const e = d.dovusculer[j]!;
        if (mesafe(d, i, j) - govde <= kural.menzil && yayIcinde(dv.x, dv.z, yonX, yonZ, e.x, e.z, cos)) vur(d, i, j, h.yuva, yonX, yonZ);
      }
      break;
    }
    case "isin": {
      const t = parcaEngel(d.arena, dv.x, dv.z, dv.x + yonX * kural.menzil, dv.z + yonZ * kural.menzil);
      uzunluk = t === null ? kural.menzil : kural.menzil * t;
      const bx = dv.x + yonX * uzunluk;
      const bz = dv.z + yonZ * uzunluk;
      for (const j of dusmanlar(d, i)) {
        const e = d.dovusculer[j]!;
        if (noktaParcaMesafesi(e.x, e.z, dv.x, dv.z, bx, bz).mesafe <= (kural.kalinlik ?? 0) / 2 + govde) vur(d, i, j, h.yuva, yonX, yonZ);
      }
      break;
    }
    case "mermi":
      mermiOlustur(d, i, h.yuva, kural, yonX, yonZ);
      break;
    case "embestida":
      h.evre = "atilis";
      h.kalan = kural.mesafe ?? 0;
      break;
    case "alan":
      break; // bölge hamle başlarken kuruldu; vuruş alanlar.ts'te
  }

  d.olaylar.push({
    tur: "hamleCikti", kim: i, yuva: h.yuva, aile: kural.aile, tip: kural.tip, x: dv.x, z: dv.z, yonX, yonZ,
    menzil: uzunluk, yay: kural.yay ?? 0, kalinlik: kural.kalinlik ?? 0, yaricap: kural.yaricap ?? 0,
  });
  if (kural.aile !== "embestida") {
    h.evre = "toparlan";
    h.kalan = kural.toparlanma;
  }
}

/** Her adım: aviso geri sayımı, atılış teması, toparlanma. Hareket `adim.ts`'te yapılmış olmalı. */
export function hamleIlerlet(d: Dunya, i: number, dt: number): void {
  const dv = d.dovusculer[i]!;
  const h = dv.hamle;
  if (!h || dv.olu) return;
  const kural = hamleKurali(d, i);
  if (!kural) { dv.hamle = null; return; }

  if (h.evre === "aviso") {
    h.kalan -= dt;
    if (h.kalan <= 0) cikar(d, i, kural);
  } else if (h.evre === "atilis") {
    atilisIlerlet(d, i, kural, dt);
  } else {
    h.kalan -= dt;
    if (h.kalan <= 0) dv.hamle = null;
  }
}

function atilisIlerlet(d: Dunya, i: number, kural: HamleKurali, dt: number): void {
  const dv = d.dovusculer[i]!;
  const h = dv.hamle!;
  const adim = Math.hypot(dv.hizX, dv.hizZ) * dt;
  const beklenen = Math.min((kural.hiz ?? 0) * dt, h.kalan);
  h.kalan -= adim;
  const engellendi = adim < beklenen * 0.5;
  for (const j of dusmanlar(d, i)) {
    if (!h.vurdu && mesafe(d, i, j) <= 2 * d.arena.govdeYaricap) {
      if (vur(d, i, j, h.yuva, h.yonX, h.yonZ)) h.vurdu = true;
    }
  }
  if (h.vurdu || engellendi || h.kalan <= 1e-6) {
    if (dv.hamle) { dv.hamle.evre = "toparlan"; dv.hamle.kalan = kural.toparlanma; }
  }
}
