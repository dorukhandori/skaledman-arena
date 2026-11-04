import type { Graphics } from "pixi.js";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import type { Dunya } from "../../paylasilan/sim/durum.ts";
import { kok2 } from "../../paylasilan/sim/fizik.ts";
import { aktifMi } from "../../paylasilan/sim/topac.ts";
import { SAHNE_RENK } from "./renkler.ts";

// H11 kenar uyarısı (ux § 2): kendi topacın d > 0,7R → kenarda 60° soluk amber yay; d > 0,85R ve dışa hız > %70 vRO
// → kırmızı kalın yay 2 Hz nabız + topaç üstünde "!". Rakip kenarda: ince kesikli yay ("fırsat").
// Dolu kalın = tehlike, kesikli ince = fırsat. R = sim'in o anki çanak yarıçapı (ani ölümde daralır).

export function kenarUyarisiCiz(g: Graphics, d: Dunya, yerel: number, cx: number, cy: number, zamanSn: number): void {
  g.clear();
  const R = d.arenaYaricap;
  for (const i of [yerel, 1 - yerel]) {
    const t = d.topaclar[i]!;
    if (!aktifMi(t)) continue;
    const m = kok2(t.x, t.z);
    if (m <= AYAR.egimBaslangic * R) continue;
    const a = Math.atan2(t.z, t.x);
    const disa = (t.vx * t.x + t.vz * t.z) / (m || 1);
    const tehlike = m > AYAR.kusakDis * R && disa > 0.7 * d.profiller[i]!.sim.ringOutHizi;
    const yay = Math.PI / 6;
    const yr = R + 6;
    if (i !== yerel) {
      for (let k = 0; k < 4; k++) {
        const a0 = a - yay + (k * 2 * yay) / 4;
        g.moveTo(cx + Math.cos(a0) * yr, cy + Math.sin(a0) * yr).arc(cx, cy, yr, a0, a0 + yay / 4);
      }
      g.stroke({ width: 2, color: SAHNE_RENK.amber, alpha: 0.75 });
      // hedef halkası
      g.circle(cx + t.x, cy + t.z, 40).stroke({ width: 1, color: SAHNE_RENK.amber, alpha: 0.5 });
      continue;
    }
    if (tehlike) {
      const nabiz = 0.6 + 0.4 * Math.abs(Math.sin(zamanSn * Math.PI * 2));
      g.moveTo(cx + Math.cos(a - yay) * yr, cy + Math.sin(a - yay) * yr).arc(cx, cy, yr, a - yay, a + yay).stroke({ width: 6, color: SAHNE_RENK.tehlike, alpha: nabiz });
      const ux = cx + t.x;
      const uy = cy + t.z - 52;
      g.poly([ux, uy - 9, ux + 8, uy + 6, ux - 8, uy + 6]).fill({ color: SAHNE_RENK.tehlike, alpha: nabiz });
      g.rect(ux - 1, uy - 4, 2, 5).fill(0xffffff).rect(ux - 1, uy + 2, 2, 2).fill(0xffffff);
    } else {
      g.moveTo(cx + Math.cos(a - yay) * yr, cy + Math.sin(a - yay) * yr).arc(cx, cy, yr, a - yay, a + yay).stroke({ width: 3, color: SAHNE_RENK.amber, alpha: 0.5 });
    }
  }
}
