import { Particle, ParticleContainer, Texture } from "pixi.js";

// Parçacık sistemi (05 § 5, pixel planı § 5.3): tek ParticleContainer, sabit havuz, canlı TAVAN 400.
// Tavan dolunca en yaşlı parçacık yeniden kullanılır. Parçacık verisi sim dışıdır; rastgelelik çağırandan (tohumlu).

export const PARCACIK_TAVANI = 400;

interface Kayit { p: Particle; vx: number; vy: number; omur: number; kalan: number; boy: number; surt: number; canli: boolean }

export class Parcaciklar {
  readonly kap: ParticleContainer;
  private havuz: Kayit[] = [];
  private sira = 0;

  constructor() {
    this.kap = new ParticleContainer({ texture: Texture.WHITE, dynamicProperties: { position: true, color: true, vertex: true, rotation: false } });
    for (let i = 0; i < PARCACIK_TAVANI; i++) {
      const p = new Particle({ texture: Texture.WHITE, x: -100, y: -100, scaleX: 2, scaleY: 2, anchorX: 0.5, anchorY: 0.5 });
      p.alpha = 0;
      this.kap.addParticle(p);
      this.havuz.push({ p, vx: 0, vy: 0, omur: 1, kalan: 0, boy: 2, surt: 0, canli: false });
    }
  }

  /** Canlı parçacık sayısı. */
  get canli(): number {
    let n = 0;
    for (const k of this.havuz) if (k.canli) n++;
    return n;
  }

  /** Bir parçacık: konum, hız (px/s), ömür (s), renk, boy (px, kare), sürtünme (1/s). */
  ekle(x: number, y: number, vx: number, vy: number, omur: number, renk: number, boy = 2, surt = 3): void {
    // önce boş yuva; yoksa en yaşlı (halka sırası)
    let k: Kayit | undefined;
    for (let i = 0; i < PARCACIK_TAVANI; i++) {
      const j = (this.sira + i) % PARCACIK_TAVANI;
      if (!this.havuz[j]!.canli) { k = this.havuz[j]; this.sira = (j + 1) % PARCACIK_TAVANI; break; }
    }
    if (!k) { k = this.havuz[this.sira]!; this.sira = (this.sira + 1) % PARCACIK_TAVANI; }
    k.canli = true;
    k.vx = vx; k.vy = vy; k.omur = omur; k.kalan = omur; k.boy = boy; k.surt = surt;
    k.p.x = x; k.p.y = y;
    k.p.tint = renk;
    k.p.alpha = 1;
    k.p.scaleX = boy; k.p.scaleY = boy;
  }

  guncelle(dt: number): void {
    for (const k of this.havuz) {
      if (!k.canli) continue;
      k.kalan -= dt;
      if (k.kalan <= 0) { k.canli = false; k.p.alpha = 0; k.p.x = -100; continue; }
      const s = Math.max(0, 1 - k.surt * dt);
      k.vx *= s; k.vy *= s;
      k.p.x += k.vx * dt;
      k.p.y += k.vy * dt;
      const t = k.kalan / k.omur;
      k.p.alpha = t;
      const b = Math.max(1, Math.round(k.boy * (0.5 + 0.5 * t)));
      k.p.scaleX = b; k.p.scaleY = b;
    }
  }

  temizle(): void {
    for (const k of this.havuz) { k.canli = false; k.p.alpha = 0; k.p.x = -100; }
  }
}
