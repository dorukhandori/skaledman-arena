import { Assets, Rectangle, Texture } from "pixi.js";
import type { AnimasyonAdi, AtlasAnimasyon, FusionAtlas, FusionListeKaydi } from "../../paylasilan/atlas.ts";

/** Bir animasyonun dilimlenmiş dokuları: [yön][kare]. Tek yönlü sayfada yalnız [0]. */
export interface YuklenenAnim {
  tanim: AtlasAnimasyon;
  kareler: Texture[][];
  golgeler?: Texture[][];
}

export interface YuklenenAtlas {
  atlas: FusionAtlas;
  /** Shiny sayfaları yüklendi mi (istek shiny idi ve atlasta shiny varyant var) */
  shiny: boolean;
  animlar: Map<AnimasyonAdi, YuklenenAnim>;
}

const onbellek = new Map<string, Promise<YuklenenAtlas | null>>();

const taban = (fusionId: string) => `/fusion/${encodeURIComponent(fusionId)}`;

/** Vite SPA yedeği bilinmeyen yollara 200 + index.html döner; yalnız geçerli JSON'u kabul et. */
async function jsonGetir<T>(url: string): Promise<T | null> {
  const yanit = await fetch(url);
  if (!yanit.ok) return null;
  try {
    return (await yanit.json()) as T;
  } catch {
    return null;
  }
}

async function dokuYukle(url: string): Promise<Texture> {
  const doku = await Assets.load<Texture>(url);
  doku.source.scaleMode = "nearest"; // piksel sanatı: bulanıklaştırma yok
  return doku;
}

function dilimle(sayfa: Texture, t: AtlasAnimasyon): Texture[][] {
  const kareSayisi = Math.floor(sayfa.width / t.kareGenislik);
  const satirlar: Texture[][] = [];
  for (let y = 0; y < t.yonSayisi; y++) {
    const satir: Texture[] = [];
    for (let k = 0; k < kareSayisi; k++) {
      satir.push(new Texture({ source: sayfa.source, frame: new Rectangle(k * t.kareGenislik, y * t.kareYukseklik, t.kareGenislik, t.kareYukseklik) }));
    }
    satirlar.push(satir);
  }
  return satirlar;
}

async function yukle(fusionId: string, shinyIstendi: boolean): Promise<YuklenenAtlas | null> {
  const atlas = await jsonGetir<FusionAtlas>(`${taban(fusionId)}/atlas.json`);
  if (!atlas || atlas.surum !== 1) return null;
  const shiny = shinyIstendi && !!atlas.shiny; // shiny varyantı olmayan atlas normal sayfalarla döner
  const animlar = new Map<AnimasyonAdi, YuklenenAnim>();
  const dilimler = new Map<string, { kareler: Texture[][]; golgeler?: Texture[][] }>(); // dosya → dilimler (Idle/Walk aynı sayfayı paylaşabilir)
  await Promise.all(
    (Object.entries(atlas.animasyonlar) as [AnimasyonAdi, AtlasAnimasyon][]).map(async ([rol, t]) => {
      let d = dilimler.get(t.ad);
      if (!d) {
        const [sayfa, golge] = await Promise.all([
          dokuYukle(`${taban(fusionId)}/${t.ad}-Anim${shiny ? "-shiny" : ""}.png`),
          t.golge ? dokuYukle(`${taban(fusionId)}/${t.ad}-Shadow.png`) : Promise.resolve(null),
        ]);
        d = { kareler: dilimle(sayfa, t), golgeler: golge ? dilimle(golge, t) : undefined };
        dilimler.set(t.ad, d);
      }
      animlar.set(rol, { tanim: t, kareler: d.kareler, golgeler: d.golgeler });
    }),
  );
  return { atlas, shiny, animlar };
}

/**
 * Atlas yoksa null; varsa dokularıyla birlikte (fusion + varyant başına bir kez yüklenir, paylaşılır).
 * `shiny`: dövüşçü profili shiny ise true; atlasta shiny sayfaları varsa onlar, yoksa normal sayfalar gelir.
 */
export function atlasYukle(fusionId: string, shiny = false): Promise<YuklenenAtlas | null> {
  const anahtar = shiny ? `${fusionId}#shiny` : fusionId;
  let p = onbellek.get(anahtar);
  if (!p) {
    p = yukle(fusionId, shiny);
    onbellek.set(anahtar, p);
    p.then((s) => { if (!s) onbellek.delete(anahtar); }, () => onbellek.delete(anahtar));
  }
  return p;
}

/** public/fusion/liste.json (araclar/fusion-birlestir.ts yazar); yoksa boş liste. */
export async function atlasListesi(): Promise<FusionListeKaydi[]> {
  return (await jsonGetir<FusionListeKaydi[]>("/fusion/liste.json")) ?? [];
}
