import type { Graphics } from "pixi.js";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import type { Dunya } from "../../paylasilan/sim/durum.ts";
import { kok2 } from "../../paylasilan/sim/fizik.ts";
import { aktifMi } from "../../paylasilan/sim/topac.ts";
import { SAHNE_RENK } from "./renkler.ts";

// H11 kenar uyarısı (ux § 2): kendi topacın d > 0,7R → kenarda 60° soluk amber yay; d > 0,85R ve dışa hız > %70 vRO
// → kırmızı kalın yay 2 Hz nabız + topaç üstünde "!". Rakip kenarda: ince kesikli yay ("fırsat").
// Dolu kalın = tehlike, kesikli ince = fırsat. R = sim'in o anki çanak yarıçapı (ani ölümde daralır).
// GU-00 Hibrit: yaylar çanak dudağında ELİPS (ry = rx · zOranı); "!" topacın üstünde ekranda dik (basılmaz).

/** Kenar uyarısının ihtiyaç duyduğu izdüşüm (Sahne bunu sağlar). */
export interface Izdusum { ekranX(x: number): number; ekranY(z: number): number; readonly k: number }

function elipsYay(g: Graphics, cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): Graphics {
  const n = Math.max(4, Math.ceil(Math.abs(a1 - a0) * 16));
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  return g;
}

export function kenarUyarisiCiz(g: Graphics, d: Dunya, yerel: number, s: Izdusum, zamanSn: number): void {
  g.clear();
  const R = d.arenaYaricap;
  const cx = s.ekranX(0);
  const cy = s.ekranY(0);
  const k = s.k;
  for (const i of [yerel, 1 - yerel]) {
    const t = d.topaclar[i]!;
    if (!t || !aktifMi(t)) continue;
    const m = kok2(t.x, t.z);
    if (m <= AYAR.egimBaslangic * R) continue;
    const a = Math.atan2(t.z, t.x);
    const disa = (t.vx * t.x + t.vz * t.z) / (m || 1);
    const tehlike = m > AYAR.kusakDis * R && disa > 0.7 * d.profiller[i]!.sim.ringOutHizi;
    const yay = Math.PI / 6;
    const yr = R + 6;
    const tx = s.ekranX(t.x);
    const ty = s.ekranY(t.z);
    if (i !== yerel) {
      for (let q = 0; q < 4; q++) {
        const a0 = a - yay + (q * 2 * yay) / 4;
        elipsYay(g, cx, cy, yr, yr * k, a0, a0 + yay / 4);
      }
      g.stroke({ width: 2, color: SAHNE_RENK.amber, alpha: 0.75 });
      // hedef halkası (zeminde elips)
      g.ellipse(tx, ty, 40, 40 * k).stroke({ width: 1.5, color: SAHNE_RENK.amber, alpha: 0.5 });
      continue;
    }
    if (tehlike) {
      const nabiz = 0.6 + 0.4 * Math.abs(Math.sin(zamanSn * Math.PI * 2));
      elipsYay(g, cx, cy, yr, yr * k, a - yay, a + yay).stroke({ width: 6, color: SAHNE_RENK.tehlike, alpha: nabiz });
      const ux = tx;
      const uy = ty - (k < 1 ? 62 : 52);
      g.poly([ux, uy - 9, ux + 8, uy + 6, ux - 8, uy + 6]).fill({ color: SAHNE_RENK.tehlike, alpha: nabiz }).stroke({ width: 1.5, color: 0x2a0702, alpha: nabiz });
      g.rect(ux - 1, uy - 4, 2, 5).fill(0xffffff).rect(ux - 1, uy + 2, 2, 2).fill(0xffffff);
    } else {
      elipsYay(g, cx, cy, yr, yr * k, a - yay, a + yay).stroke({ width: 3, color: SAHNE_RENK.amber, alpha: 0.5 });
    }
  }
}
