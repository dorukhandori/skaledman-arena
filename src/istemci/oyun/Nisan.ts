import { Graphics } from "pixi.js";
import type { HamleKurali } from "../../paylasilan/kurallar/hamleler.ts";
import type { Dovuscu } from "../../paylasilan/sim/durum.ts";
import { TIP_RENK } from "./renkler.ts";
import type { Sahne } from "./Sahne.ts";

const NISAN = { halkaYaricap: 10, kesikUzunluk: 9, kesikBosluk: 6, okBasi: 10, kalinlik: 2, alfa: 0.9 } as const;

/** Sağ tuş basılıyken zeminde hedef halkası ve kesikli ok. Yalnız sunum. */
export class NisanGostergesi {
  private g = new Graphics();

  constructor(private sahne: Sahne) {
    sahne.zeminKatmani.addChild(this.g);
  }

  gizle(): void {
    this.g.clear();
  }

  /** @param nisan  fare dünya noktası */
  goster(dv: Dovuscu, kural: HamleKurali | null, nisan: { x: number; z: number }): void {
    const g = this.g;
    g.clear();
    const renk = kural ? TIP_RENK[kural.tip] : 0xffffff;
    const menzil = kural?.menzil ?? 100;
    let dx = nisan.x - dv.x;
    let dz = nisan.z - dv.z;
    const u = Math.hypot(dx, dz) || 1;
    dx /= u; dz /= u;
    // alan hamlesi menzil içine kenetlenir; diğerlerinde ok menzil kadar gider
    const uc = kural?.aile === "alan" ? Math.min(u, menzil) : menzil;
    const ex = dv.x + dx * uc;
    const ez = dv.z + dz * uc;
    const bas = this.sahne.dunyadanEkrana(dv.x, dv.z);
    const son = this.sahne.dunyadanEkrana(ex, ez);

    // kesikli çizgi
    const vx = son.x - bas.x;
    const vy = son.y - bas.y;
    const uzun = Math.hypot(vx, vy);
    const ux = vx / (uzun || 1);
    const uy = vy / (uzun || 1);
    for (let t = 0; t < uzun; t += NISAN.kesikUzunluk + NISAN.kesikBosluk) {
      const t2 = Math.min(uzun, t + NISAN.kesikUzunluk);
      g.moveTo(bas.x + ux * t, bas.y + uy * t).lineTo(bas.x + ux * t2, bas.y + uy * t2);
    }
    g.stroke({ width: NISAN.kalinlik, color: renk, alpha: NISAN.alfa });
    // ok başı
    const nx = -uy;
    const ny = ux;
    g.moveTo(son.x, son.y).lineTo(son.x - ux * NISAN.okBasi + nx * 5, son.y - uy * NISAN.okBasi + ny * 5)
      .lineTo(son.x - ux * NISAN.okBasi - nx * 5, son.y - uy * NISAN.okBasi - ny * 5).closePath().fill({ color: renk, alpha: NISAN.alfa });

    // hedef halkası
    const r = kural?.aile === "alan" ? (kural.yaricap ?? NISAN.halkaYaricap) : NISAN.halkaYaricap;
    g.ellipse(son.x, son.y, r, r * this.sahne.zOrani).stroke({ width: NISAN.kalinlik + 1, color: renk, alpha: NISAN.alfa });
    g.ellipse(son.x, son.y, r, r * this.sahne.zOrani).fill({ color: renk, alpha: 0.15 });
  }
}
