import parcalarHam from "../../../veri/parcalar.json";
import ruhlarHam from "../../../veri/ruhlar.json";
import yeteneklerHam from "../../../veri/yetenekler.json";
import basarimlarHam from "../../../veri/basarimlar.json";
import {
  BasarimlarDosyaSema, ParcalarDosyaSema, RuhlarDosyaSema, YeteneklerDosyaSema,
  type Cekirdek, type Disk, type Govde, type Parca, type Uc,
} from "./semalar.ts";

// Statik katalog: veri/*.json zod ile bir kez doğrulanır. İstemci ve sunucu aynı dosyayı paketler.
// Sıra dosyadaki sıradır (deterministik); arama Map ile değil dizi taramasıyla da aynı sonucu verir.

export const PARCALAR = ParcalarDosyaSema.parse(parcalarHam);
export const RUHLAR = RuhlarDosyaSema.parse(ruhlarHam).ruhlar;
export const YETENEKLER = YeteneklerDosyaSema.parse(yeteneklerHam).yetenekler;
export const BASARIMLAR = BasarimlarDosyaSema.parse(basarimlarHam).basarimlar;

export const GOVDELER: readonly Govde[] = PARCALAR.parcalar.filter((p): p is Govde => p.tur === "govde");
export const DISKLER: readonly Disk[] = PARCALAR.parcalar.filter((p): p is Disk => p.tur === "disk");
export const UCLAR: readonly Uc[] = PARCALAR.parcalar.filter((p): p is Uc => p.tur === "uc");
export const CEKIRDEKLER: readonly Cekirdek[] = PARCALAR.parcalar.filter((p): p is Cekirdek => p.tur === "cekirdek");
export const BASLANGIC_SETLERI = PARCALAR.baslangicSetleri;

export function parcaBul(id: string): Parca {
  const p = PARCALAR.parcalar.find((x) => x.id === id);
  if (!p) throw new Error(`Bilinmeyen parça: ${id}`);
  return p;
}

function turluBul<T extends Parca>(id: string, tur: T["tur"]): T {
  const p = parcaBul(id);
  if (p.tur !== tur) throw new Error(`${id} bir ${tur} değil (${p.tur})`);
  return p as T;
}

export const govdeBul = (id: string): Govde => turluBul<Govde>(id, "govde");
export const diskBul = (id: string): Disk => turluBul<Disk>(id, "disk");
export const ucBul = (id: string): Uc => turluBul<Uc>(id, "uc");
export const cekirdekBul = (id: string): Cekirdek => turluBul<Cekirdek>(id, "cekirdek");
