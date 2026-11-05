// ART-1: topaç sprite metasının saf kısmı (Pixi'siz; test edilir). İki bicim (docs/art/topac-uretim-istegi.md § 5):
//  A) bulut hattı: veri/topac-gorsel.json `parcalar.<id>` + parça sayfası public/topac/<tur>/<id>[-<boya>].png
//     (satırlar yön başına keskin / bulanık / disk, satır başına en çok 8 kare)
//  B) Mac hattı: public/topac/<tur>/<id>.json (surum 2) + şeritler <id>-<kademe>-<yon>[-<boya>].png
import gorselHam from "../../../veri/topac-gorsel.json";
import type { Kademe } from "./cizimTurleri.ts";

export type KatmanTuru = "govde" | "disk" | "uc" | "cekirdek";
export type Yon = "s" | "l";
export type KareKademesi = "keskin" | "bulanik" | "disk";

/** İki bicimden ortak çözümlenmiş parça tanımı (dosya yolları public/ köküne göre, başında "/"). */
export interface KatmanTanimi {
  bicim: "A" | "B";
  parcaId: string;
  tur: KatmanTuru;
  kare: [number, number];
  capa: [number, number];
  /** 1 doku pikseli = `birim` topaç yerel birimi */
  birim: number;
  yukselti: number;
  simetri: number;
  periyotKare: number;
  diskKare: number;
  yonler: Yon[];
  ustZ: number;
  /** kademe + yön → { dosya, satır y (px), kare sayısı } */
  serit(kademe: KareKademesi, yon: Yon, boya: string | null): { dosya: string; y: number; adet: number };
}

interface MetaA {
  kamera: { yukselti: number; birim: number; kare: [number, number]; capa: [number, number]; govdeTabanZ: number };
  periyotKare: number;
  diskKare: number;
  /** Mac hattının biçim B json'u yazdığı parçalar (yükleyici yalnız bunlar için /topac/<tur>/<id>.json ister) */
  bicimB?: string[];
  parcalar: Record<string, { tur: KatmanTuru; simetri: number; yonler: Yon[]; sayfa: string; boyalar: string[] | null; satir: Record<string, { keskin: number; bulanik: number; disk: number }>; ustZ: number }>;
}

export const TOPAC_GORSEL = gorselHam as unknown as MetaA;
/** Gövde tabanı (birim): Disk üst yüzü bundan yüksekse Gövde + Çekirdek yukarı kayar. */
export const GOVDE_TABAN_Z = TOPAC_GORSEL.kamera.govdeTabanZ;

export function tanimA(id: string): KatmanTanimi | null {
  const p = TOPAC_GORSEL.parcalar[id];
  if (!p) return null;
  const K = TOPAC_GORSEL.kamera;
  return {
    bicim: "A", parcaId: id, tur: p.tur, kare: K.kare, capa: K.capa, birim: K.birim, yukselti: K.yukselti, simetri: p.simetri,
    periyotKare: TOPAC_GORSEL.periyotKare, diskKare: TOPAC_GORSEL.diskKare, yonler: p.yonler, ustZ: p.ustZ,
    serit(kademe, yon, boya) {
      const s = p.satir[yon] ?? p.satir.s!;
      return { dosya: `/topac/${p.sayfa.replace("{boya}", boya ?? "kor")}`, y: s[kademe] * K.kare[1], adet: kademe === "disk" ? TOPAC_GORSEL.diskKare : TOPAC_GORSEL.periyotKare };
    },
  };
}

/** Biçim B json'unu doğrula ve çözümle; geçersizse null (yükleyici A'ya düşer). */
export function tanimB(j: unknown): KatmanTanimi | null {
  if (!j || typeof j !== "object") return null;
  const m = j as Record<string, unknown>;
  const sayi = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  const cift = (v: unknown): v is [number, number] => Array.isArray(v) && v.length === 2 && v.every(sayi);
  if (m.surum !== 2 || typeof m.parcaId !== "string" || !["govde", "disk", "uc", "cekirdek"].includes(m.tur as string)) return null;
  if (!cift(m.kare) || !cift(m.capa) || !sayi(m.simetri) || !Array.isArray(m.yonler) || !sayi(m.ustZ)) return null;
  const yonler = (m.yonler as unknown[]).filter((y): y is Yon => y === "s" || y === "l");
  if (!yonler.includes("s")) return null;
  const id = m.parcaId;
  const tur = m.tur as KatmanTuru;
  const pk = sayi(m.periyotKare) ? (m.periyotKare as number) : 8;
  const dk = sayi(m.diskKare) ? (m.diskKare as number) : 3;
  return {
    bicim: "B", parcaId: id, tur, kare: m.kare, capa: m.capa, birim: sayi(m.birim) ? (m.birim as number) : TOPAC_GORSEL.kamera.birim,
    yukselti: sayi(m.yukselti) ? (m.yukselti as number) : 38, simetri: m.simetri as number, periyotKare: pk, diskKare: dk, yonler, ustZ: m.ustZ as number,
    serit(kademe, yon, boya) {
      const y = yonler.includes(yon) ? yon : "s";
      const b = tur === "govde" && boya ? `-${boya}` : "";
      return { dosya: `/topac/${tur}/${id}-${kademe}-${y}${b}.png`, y: 0, adet: kademe === "disk" ? dk : pk };
    },
  };
}

/** Görsel kademe → kare dizisi (§ 3.4): yüksek = bulanık disk, orta = bulanık kanat, düşük = keskin. */
export function kademeDizisi(k: Kademe): KareKademesi {
  return k === "yuksek" ? "disk" : k === "orta" ? "bulanik" : "keskin";
}

/**
 * Dönüş açısından kare indeksi. `aci` (radyan) sağ dönüşte artar, solda azalır. Kiral parçada sol satır aynalı ve
 * saat yönü tersine render edildiği için ilerleme −aci; simetrik parçada sağ satır ters oynar (aci azalır).
 */
export function kareIndeksi(aci: number, simetri: number, adet: number, solSatir: boolean): number {
  const periyot = (Math.PI * 2) / simetri;
  const u = solSatir ? -aci : aci;
  const f = (((u / periyot) % 1) + 1) % 1;
  return Math.min(adet - 1, Math.floor(f * adet));
}

/** Disk yüksekliğinin Gövde/Çekirdek katmanına dikey kayması (doku pikseli, yukarı pozitif). */
export function govdeKaymasi(diskUstZ: number, t: Pick<KatmanTanimi, "yukselti" | "birim">): number {
  return Math.round(((diskUstZ - GOVDE_TABAN_Z) * Math.cos((t.yukselti * Math.PI) / 180)) / t.birim);
}
