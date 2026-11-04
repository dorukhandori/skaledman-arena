import { Assets, Rectangle, Texture } from "pixi.js";

// Topaç atlas yükleyici (eski AtlasYukleyici deseni korunur: nearest ölçek, istek başına tek yükleme, önbellek).
// İçerik YER TUTUCU: D1'de topaçlar Graphics ile çizilir (TopacGorsel). Pixel planı § 7.3-7.5 kareleri geldiğinde
// `public/topac/<parcaId>/atlas.json` + sayfa PNG'leri buradan yüklenir; atlas yoksa null döner ve Graphics kalır.

export interface TopacAtlasTanimi {
  surum: 1;
  parcaId: string;
  /** kare boyutu (mantıksal px) */
  kare: number;
  /** simetri periyodu başına kare (pixel planı § 3.3: F = 8) */
  periyotKare: number;
  sayfalar: { keskin: string; bulanik?: string; disk?: string };
}

export interface YuklenenTopacAtlas {
  tanim: TopacAtlasTanimi;
  keskin: Texture[];
  bulanik: Texture[];
}

const onbellek = new Map<string, Promise<YuklenenTopacAtlas | null>>();

/** Vite SPA yedeği bilinmeyen yollara 200 + index.html döner; yalnız geçerli JSON'u kabul et. */
async function jsonGetir<T>(url: string): Promise<T | null> {
  try {
    const yanit = await fetch(url);
    if (!yanit.ok || !(yanit.headers.get("content-type") ?? "").includes("json")) return null;
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

function dilimle(sayfa: Texture, kare: number): Texture[] {
  const n = Math.floor(sayfa.width / kare);
  const out: Texture[] = [];
  for (let i = 0; i < n; i++) out.push(new Texture({ source: sayfa.source, frame: new Rectangle(i * kare, 0, kare, kare) }));
  return out;
}

async function yukle(parcaId: string): Promise<YuklenenTopacAtlas | null> {
  const taban = `/topac/${encodeURIComponent(parcaId)}`;
  const tanim = await jsonGetir<TopacAtlasTanimi>(`${taban}/atlas.json`);
  if (!tanim || tanim.surum !== 1) return null;
  const keskin = dilimle(await dokuYukle(`${taban}/${tanim.sayfalar.keskin}`), tanim.kare);
  const bulanik = tanim.sayfalar.bulanik ? dilimle(await dokuYukle(`${taban}/${tanim.sayfalar.bulanik}`), tanim.kare) : [];
  return { tanim, keskin, bulanik };
}

/** Parça atlası; yoksa null (Graphics yer tutucu kullanılır). Parça başına bir kez yüklenir, paylaşılır. */
export function topacAtlasYukle(parcaId: string): Promise<YuklenenTopacAtlas | null> {
  let p = onbellek.get(parcaId);
  if (!p) {
    p = yukle(parcaId);
    onbellek.set(parcaId, p);
    p.then((s) => { if (!s) onbellek.delete(parcaId); }, () => onbellek.delete(parcaId));
  }
  return p;
}
