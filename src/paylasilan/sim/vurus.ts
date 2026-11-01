import { hasar } from "../kurallar/statlar.ts";
import { etkinlik } from "../kurallar/tipler.ts";
import { AYAR } from "../kurallar/ayar.ts";
import { durumDene } from "./durumlar.ts";
import { statCarpani } from "./kademe.ts";
import { gecisiBoz } from "./takim.ts";
import type { Dunya } from "./durum.ts";

/**
 * Bir hamlenin bir hedefe girmesi: etkinlik, hasar formülü, knockback, hitStun, kesinti, durum ihtimali.
 * (yonX, yonZ) = itme yönü (birim). Dokunulmazsa false döner ve hamle hedefi "geçer" (mermi devam eder).
 */
export function vur(d: Dunya, saldiran: number, hedef: number, yuva: number, yonX: number, yonZ: number): boolean {
  const hd = d.dovusculer[hedef]!;
  if (hd.olu || hd.sahaDisi) return false;
  if (hd.dokunulmaz > 0) {
    d.olaylar.push({ tur: "kacildi", kime: hedef, x: hd.x, z: hd.z });
    return false;
  }
  const sp = d.profiller[saldiran]!;
  const hp = d.profiller[hedef]!;
  const kural = sp.yuvalar[yuva]!;
  const a = d.dovusculer[saldiran]!;
  const etk = etkinlik(kural.tip, hp.tipler);
  const saldiriStati = kural.fiziksel ? sp.atk * statCarpani(a, "atk") : sp.spa * statCarpani(a, "spa");
  const savunmaStati = kural.fiziksel ? hp.def * statCarpani(hd, "def") : hp.spd * statCarpani(hd, "spd");
  const h = hasar(sp.seviye, kural.guc, saldiriStati, savunmaStati, sp.tipler.includes(kural.tip), etk, a.yanik > 0 && kural.fiziksel, d.hasarCarpani);
  hd.hp = Math.max(0, hd.hp - h);

  if (h > 0) {
    hd.itX = (yonX * AYAR.knockback) / AYAR.hitStun;
    hd.itZ = (yonZ * AYAR.knockback) / AYAR.hitStun;
    hd.itKalan = AYAR.hitStun;
    hd.hitStun = AYAR.hitStun;
    hd.dinleniyor = false;
    gecisiBoz(d, hedef);
    if (AYAR.hitKeser && hd.hamle && hd.hamle.evre !== "toparlan") {
      hd.hamle = null;
      d.olaylar.push({ tur: "hamleIptal", kim: hedef });
    }
  }
  const durum = h > 0 ? durumDene(d, hedef, kural.tip) : undefined;
  d.olaylar.push({
    tur: "vurdu", kime: hedef, kimden: saldiran, hasar: h, etkinlik: etk, tip: kural.tip, yuva,
    x: hd.x, z: hd.z, ...(durum ? { durum } : {}),
  });
  return true;
}
