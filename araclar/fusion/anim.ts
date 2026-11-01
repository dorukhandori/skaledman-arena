// Bir Pokémon'un SpriteCollab animasyon sayfalarını yükleme (AnimData + Anim/Offsets/Shadow).
import { animCozumle, type AnimTanimi, type AnimVerisi } from "./animdata.ts";
import { DosyaYok, spriteDosyasi } from "./indir.ts";
import { isaretleriOku, type KareIsaretleri } from "./offsets.ts";
import { resimOku, type Resim } from "./resim.ts";

export interface HazirAnim {
  /** İstenen rol (Idle, Walk, ...) */
  rol: string;
  /** Sayfa dosyasının adı kökü */
  dosya: string;
  tanim: AnimTanimi;
  anim: Resim;
  offsets: KareIsaretleri[][];
  golge?: Resim;
  yonSayisi: 1 | 8;
  kareSayisi: number;
}

/** `dosyalar`: SpriteCollab klasöründe gerçekten bulunan animasyon adları (kapsama). */
export async function animYukle(klasor: string, veri: AnimVerisi, rol: string, dosyalar: readonly string[]): Promise<HazirAnim | null> {
  const tanim = animCozumle(veri, rol);
  if (!tanim || !dosyalar.includes(tanim.ad)) return null;
  const anim = await resimOku(await spriteDosyasi(klasor, `${tanim.ad}-Anim.png`));
  const offsets = await resimOku(await spriteDosyasi(klasor, `${tanim.ad}-Offsets.png`));
  let golge: Resim | undefined;
  try { golge = await resimOku(await spriteDosyasi(klasor, `${tanim.ad}-Shadow.png`)); } catch (h) { if (!(h instanceof DosyaYok)) throw h; }
  const satir = anim.y / tanim.kareYukseklik;
  if (anim.g % tanim.kareGenislik !== 0 || (satir !== 1 && satir !== 8)) {
    throw new Error(`${klasor}/${tanim.ad}: beklenmeyen sayfa ${anim.g}x${anim.y}, kare ${tanim.kareGenislik}x${tanim.kareYukseklik}`);
  }
  const kareSayisi = anim.g / tanim.kareGenislik;
  return {
    rol, dosya: tanim.ad, tanim, anim,
    offsets: isaretleriOku(offsets, tanim.kareGenislik, tanim.kareYukseklik),
    golge, yonSayisi: satir === 1 ? 1 : 8, kareSayisi,
  };
}
