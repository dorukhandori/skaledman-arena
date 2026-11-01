import type { Arena, DikdortgenEngel, Engel } from "./Arena.ts";

// Daire / dikdörtgen / doğru parçası geometrisi. Saf fonksiyonlar, paylaşılan kod.

const KUCUK = 1e-9;

/** Daireyi dikdörtgenin dışına iter. İtme gerekmiyorsa null. */
export function daireDikdortgenCoz(x: number, z: number, r: number, e: DikdortgenEngel): { x: number; z: number } | null {
  const yakinX = Math.max(e.x - e.yariGenislik, Math.min(x, e.x + e.yariGenislik));
  const yakinZ = Math.max(e.z - e.yariDerinlik, Math.min(z, e.z + e.yariDerinlik));
  const dx = x - yakinX;
  const dz = z - yakinZ;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return null;
  if (d2 > KUCUK) {
    const d = Math.sqrt(d2);
    const k = (r - d) / d;
    return { x: x + dx * k, z: z + dz * k };
  }
  // merkez dikdörtgenin içinde: en yakın kenara çık
  const solaMesafe = x - (e.x - e.yariGenislik);
  const sagaMesafe = e.x + e.yariGenislik - x;
  const uste = z - (e.z - e.yariDerinlik);
  const alta = e.z + e.yariDerinlik - z;
  const en = Math.min(solaMesafe, sagaMesafe, uste, alta);
  if (en === solaMesafe) return { x: e.x - e.yariGenislik - r, z };
  if (en === sagaMesafe) return { x: e.x + e.yariGenislik + r, z };
  if (en === uste) return { x, z: e.z - e.yariDerinlik - r };
  return { x, z: e.z + e.yariDerinlik + r };
}

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

/** Gövdeyi saha sınırlarına ve engellere göre çözer (iki geçiş: köşelerde kararlı). */
export function konumCoz(arena: Arena, x: number, z: number, r: number): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (let gecis = 0; gecis < 2; gecis++) {
    for (const e of arena.engeller) {
      const c = e.tur === "dikdortgen" ? daireDikdortgenCoz(px, pz, r, e) : daireDaireCoz(px, pz, r, e.x, e.z, e.yaricap);
      if (c) { px = c.x; pz = c.z; }
    }
    px = Math.max(-arena.yariGenislik + r, Math.min(arena.yariGenislik - r, px));
    pz = Math.max(r, Math.min(arena.derinlik - r, pz));
  }
  return { x: px, z: pz };
}

/** Nokta ile doğru parçası arasındaki en kısa mesafe; t ∈ [0,1] parça üzerindeki konum. */
export function noktaParcaMesafesi(px: number, pz: number, ax: number, az: number, bx: number, bz: number): { mesafe: number; t: number } {
  const vx = bx - ax;
  const vz = bz - az;
  const u2 = vx * vx + vz * vz;
  let t = u2 < KUCUK ? 0 : ((px - ax) * vx + (pz - az) * vz) / u2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return { mesafe: Math.hypot(px - (ax + vx * t), pz - (az + vz * t)), t };
}

/** Parça (a→b) daireye ilk girdiği t; başlangıç içerideyse 0; değmiyorsa null. */
export function parcaDaire(ax: number, az: number, bx: number, bz: number, cx: number, cz: number, r: number): number | null {
  const dx = bx - ax;
  const dz = bz - az;
  const fx = ax - cx;
  const fz = az - cz;
  const c = fx * fx + fz * fz - r * r;
  if (c <= 0) return 0;
  const a = dx * dx + dz * dz;
  if (a < KUCUK) return null;
  const b = 2 * (fx * dx + fz * dz);
  const disk = b * b - 4 * a * c;
  if (disk < 0) return null;
  const t = (-b - Math.sqrt(disk)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}

/** Parça (a→b) dikdörtgene (şişirilmiş) ilk girdiği t (slab yöntemi). */
export function parcaDikdortgen(ax: number, az: number, bx: number, bz: number, e: DikdortgenEngel, sisirme = 0): number | null {
  const min = [e.x - e.yariGenislik - sisirme, e.z - e.yariDerinlik - sisirme];
  const max = [e.x + e.yariGenislik + sisirme, e.z + e.yariDerinlik + sisirme];
  const o = [ax, az];
  const d = [bx - ax, bz - az];
  let girdi = 0;
  let cikti = 1;
  for (let i = 0; i < 2; i++) {
    const oi = o[i] as number;
    const di = d[i] as number;
    const lo = min[i] as number;
    const hi = max[i] as number;
    if (Math.abs(di) < KUCUK) {
      if (oi < lo || oi > hi) return null;
      continue;
    }
    let t1 = (lo - oi) / di;
    let t2 = (hi - oi) / di;
    if (t1 > t2) { const k = t1; t1 = t2; t2 = k; }
    girdi = Math.max(girdi, t1);
    cikti = Math.min(cikti, t2);
    if (girdi > cikti) return null;
  }
  return girdi;
}

/** Parçanın engellerle ilk kesişimi (yarıçap kadar şişirilmiş); yoksa null. */
export function parcaEngel(arena: Arena, ax: number, az: number, bx: number, bz: number, sisirme = 0): number | null {
  let en: number | null = null;
  for (const e of arena.engeller) {
    const t = parcaEngelTek(e, ax, az, bx, bz, sisirme);
    if (t !== null && (en === null || t < en)) en = t;
  }
  return en;
}

function parcaEngelTek(e: Engel, ax: number, az: number, bx: number, bz: number, sisirme: number): number | null {
  return e.tur === "dikdortgen" ? parcaDikdortgen(ax, az, bx, bz, e, sisirme) : parcaDaire(ax, az, bx, bz, e.x, e.z, e.yaricap + sisirme);
}

/** (hx,hz) hedefi, (ox,oz) kaynaklı (dx,dz) yönlü yay içinde mi: cosYariAci = cos(yay/2). */
export function yayIcinde(ox: number, oz: number, dx: number, dz: number, hx: number, hz: number, cosYariAci: number): boolean {
  const vx = hx - ox;
  const vz = hz - oz;
  const u = Math.hypot(vx, vz);
  if (u < KUCUK) return true;
  return (vx * dx + vz * dz) / u >= cosYariAci;
}
