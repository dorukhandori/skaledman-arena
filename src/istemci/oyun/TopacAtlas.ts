import { Assets, Rectangle, Texture } from "pixi.js";
import { TOPAC_GORSEL, kademeDizisi, tanimA, tanimB, type KareKademesi, type KatmanTanimi, type KatmanTuru, type Yon } from "./topacKare.ts";
import type { Kademe } from "./cizimTurleri.ts";

// Topaç katman atlası yükleyici (ART-1; pixel planı § 7.3: nearest ölçek, istek başına tek yükleme, önbellek).
// İki biçim (topacKare.ts): metada `bicimB` listesindeki parçalar için önce Mac hattının biçim B json'u (/topac/<tur>/<id>.json, surum 2) denenir, yoksa bulut
// hattının biçim A metası (veri/topac-gorsel.json, pakete gömülü). Hiçbiri yoksa ya da doku yüklenemezse null döner:
// çizim yordamsal yer tutucuda (TopacYandan Graphics) kalır.

export interface YuklenenKatman {
  tanim: KatmanTanimi;
  /** yön → kademe → kareler */
  kareler: Partial<Record<Yon, Record<KareKademesi, Texture[]>>>;
}

const onbellek = new Map<string, Promise<YuklenenKatman | null>>();
const sayfalar = new Map<string, Promise<Texture | null>>();

/** Vite SPA yedeği bilinmeyen yollara 200 + index.html döner; yalnız geçerli JSON'u kabul et. */
async function jsonGetir(url: string): Promise<unknown> {
  try {
    const yanit = await fetch(url);
    if (!yanit.ok || !(yanit.headers.get("content-type") ?? "").includes("json")) return null;
    return (await yanit.json()) as unknown;
  } catch {
    return null;
  }
}

function sayfaYukle(url: string): Promise<Texture | null> {
  let p = sayfalar.get(url);
  if (!p) {
    p = Assets.load<Texture>(url).then((d) => { d.source.scaleMode = "nearest"; return d; }, () => null);
    sayfalar.set(url, p);
  }
  return p;
}

async function yukle(tur: KatmanTuru, id: string, boya: string | null): Promise<YuklenenKatman | null> {
  // biçim B yalnız metada `bicimB` listesindeki parçalar için istenir (gereksiz 404 / konsol hatası olmasın)
  const b = (TOPAC_GORSEL.bicimB ?? []).includes(id) ? tanimB(await jsonGetir(`/topac/${tur}/${encodeURIComponent(id)}.json`)) : null;
  const t = b ?? tanimA(id);
  if (!t || t.tur !== tur) return null;
  const [w, h] = t.kare;
  const kareler: YuklenenKatman["kareler"] = {};
  for (const yon of t.yonler) {
    const k = {} as Record<KareKademesi, Texture[]>;
    for (const kd of ["keskin", "bulanik", "disk"] as const) {
      const s = t.serit(kd, yon, boya);
      const sayfa = await sayfaYukle(s.dosya);
      if (!sayfa) return null;
      const adet = Math.min(s.adet, Math.floor(sayfa.width / w));
      if (adet < 1 || s.y + h > sayfa.height) return null;
      k[kd] = Array.from({ length: adet }, (_, i) => new Texture({ source: sayfa.source, frame: new Rectangle(i * w, s.y, w, h) }));
    }
    kareler[yon] = k;
  }
  return { tanim: t, kareler };
}

/** Katman (parça + Gövde boyası); yoksa null. Parça/boya başına bir kez yüklenir, paylaşılır; hata önbellekte kalmaz. */
export function topacKatmanYukle(tur: KatmanTuru, id: string, boya: string | null = null): Promise<YuklenenKatman | null> {
  const anahtar = `${tur}/${id}/${tur === "govde" ? boya ?? "kor" : "-"}`;
  let p = onbellek.get(anahtar);
  if (!p) {
    p = yukle(tur, id, tur === "govde" ? boya ?? "kor" : null).catch(() => null);
    onbellek.set(anahtar, p);
    p.then((s) => { if (!s) onbellek.delete(anahtar); }, () => onbellek.delete(anahtar));
  }
  return p;
}

/** Kademe + dönüş yönü için kare dizisi; kiral parçada sol satır, yoksa sağ satır (ters oynar). */
export function kareDizisi(k: YuklenenKatman, kademe: Kademe | KareKademesi, sol: boolean): { dizi: Texture[]; solSatir: boolean } {
  const kd: KareKademesi = kademe === "keskin" || kademe === "bulanik" || kademe === "disk" ? kademe : kademeDizisi(kademe);
  const solSatir = sol && !!k.kareler.l;
  const y = (solSatir ? k.kareler.l : k.kareler.s)!;
  return { dizi: y[kd], solSatir };
}
