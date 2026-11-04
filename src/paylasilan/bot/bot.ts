import { AYAR } from "../kurallar/ayar.ts";
import { DERECE_BASINA_BIRIM, cosT, sinT } from "../kurallar/sinTablo.ts";
import type { Dunya } from "../sim/durum.ts";
import { kok2 } from "../sim/fizik.ts";
import { type Girdi, bosGirdi } from "../sim/Girdi.ts";
import { rastgele } from "../sim/rastgele.ts";
import { aktifMi } from "../sim/topac.ts";

// Paylaşılan bot (axiom § 2 #12): yalnız `Girdi` üretir, durumu yalnız okur; tohumlu ve saf:
// aynı (dünya, tohum) → aynı girdi. Sunucu botu, Antrenman, Topaç Lab ve bot turnuvası aynı kodu koşar.
// D1: üç basit kip. D2'de kenara iten / yetenek kullanan kademeler eklenir (nile B-39).

export type BotKipi = "pasif" | "rota" | "saldirgan";

export const BOT_AYAR = {
  /** rota: merkez etrafında sabit yarıçaplı daire (birim), tur başına derece/s */
  rotaYaricap: 110,
  rotaHizi: 40,
  /** saldırgan: bu mesafede ve bu kosinüsle hizalıysa dash atar */
  dashMesafe: 150,
  dashCos: 0.9,
  /** saldırgan: kenara bu kadar yaklaşınca merkeze döner (oran · R) */
  kenarKorku: 0.78,
  /** adım başına dash denemesi olasılığı (insan gibi her fırsatta değil) */
  dashOlasilik: 0.08,
  /** hedefe yaklaşırken rastgele sapma (birim) */
  sapma: 40,
} as const;

export function botGirdisi(d: Dunya, i: number, kip: BotKipi, tohum: number): Girdi {
  const g = bosGirdi();
  const ben = d.topaclar[i]!;
  const rakip = d.topaclar[1 - i]!;
  if (!aktifMi(ben) || kip === "pasif") return g;
  let hx: number;
  let hz: number;
  if (kip === "rota" || !aktifMi(rakip)) {
    const aci = d.tick * AYAR.dt * BOT_AYAR.rotaHizi * DERECE_BASINA_BIRIM + (i === 0 ? 0 : 128);
    hx = BOT_AYAR.rotaYaricap * cosT(aci);
    hz = BOT_AYAR.rotaYaricap * sinT(aci);
  } else {
    const sira = d.tick * 4 + i;
    hx = rakip.x + (rastgele(tohum, sira) * 2 - 1) * BOT_AYAR.sapma;
    hz = rakip.z + (rastgele(tohum, sira + 1) * 2 - 1) * BOT_AYAR.sapma;
    const dm = kok2(ben.x, ben.z);
    if (dm > BOT_AYAR.kenarKorku * AYAR.arenaYaricap) { hx = 0; hz = 0; }
  }
  let dx = hx - ben.x;
  let dz = hz - ben.z;
  const u = kok2(dx, dz);
  if (u > 1e-6) { dx /= u; dz /= u; g.yonX = dx; g.yonZ = dz; }
  if (kip === "saldirgan" && aktifMi(rakip)) {
    const rx = rakip.x - ben.x;
    const rz = rakip.z - ben.z;
    const rm = kok2(rx, rz);
    const hiz = kok2(ben.vx, ben.vz);
    const hizali = hiz > 1 && (ben.vx * rx + ben.vz * rz) / (hiz * rm) > BOT_AYAR.dashCos;
    if (rm < BOT_AYAR.dashMesafe && hizali && rastgele(tohum, d.tick * 4 + i + 2) < BOT_AYAR.dashOlasilik) {
      g.dash = true;
      g.yonX = rx / rm;
      g.yonZ = rz / rm;
    }
  }
  g.nisanX = rakip.x;
  g.nisanZ = rakip.z;
  return g;
}
