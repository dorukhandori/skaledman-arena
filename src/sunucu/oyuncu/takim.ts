import { type Envanter, oduncKotasi } from "../../paylasilan/kurallar/atolye.ts";
import { type TakimUyeKodu, takimKoduYaz } from "../../paylasilan/veri/takimlar.ts";
import type { Depo, TakimYuvasi } from "../db/depo.ts";
import { takimEksigi, takimUyeleri } from "./kurallar.ts";

// Kayıtlı takımın sunucu görünümü (D6): ödünç kotası (kullanılabilir Çekirdek sayısından), oynanabilirlik ve maç kodu.
// `/api/ben`, `/api/atolye` ve MacOdasi aynı yoldan okur (tek kural).

export interface SunucuTakimi {
  takimNo: number;
  ad: string;
  /** sahip olunan yuvalar (null = boş); XP ve defter bunlara yazılır */
  yuvalar: (TakimYuvasi | null)[];
  /** maçta oynayacak üyeler (ödünç dahil); kotayı aşan boş yuva null */
  uyeler: (TakimUyeKodu | null)[];
  bos: number;
  oynanabilir: boolean;
  /** oynanabilirse sunucunun ürettiği takım kodu (istemci yalnız okur) */
  kod: string | null;
}

export function envanterOku(d: Depo, oyuncuId: number): Envanter {
  return {
    cekirdekler: d.cekirdekler(oyuncuId).map((c) => ({ id: c.id, tanimId: c.tanim_id, devreDisi: c.omur !== null && c.omur <= 0 })),
    parcalar: d.parcalar(oyuncuId).map((p) => ({ id: p.id, tanimId: p.tanim_id })),
  };
}

export function sunucuTakimlari(d: Depo, oyuncuId: number, env: Envanter = envanterOku(d, oyuncuId)): SunucuTakimi[] {
  const kota = oduncKotasi(env);
  return d.takimlar(oyuncuId).map((t) => {
    const u = takimUyeleri(t.yuvalar, kota);
    const tam = u.bos === 0 && takimEksigi(u.uyeler.map((x) => x?.cekirdek ?? null)) === 0;
    return { takimNo: t.takimNo, ad: t.ad, yuvalar: t.yuvalar, uyeler: u.uyeler, bos: u.bos, oynanabilir: tam, kod: tam ? takimKoduYaz(u.uyeler as TakimUyeKodu[]) : null };
  });
}
