import { KATALOG_OZETI } from "../../ag/katalog.ts";
import type { ElementAdi, KokenAdi } from "../../paylasilan/kurallar/ayar.ts";
import { parcaBul } from "../../paylasilan/veri/katalog.ts";
import type { Boya } from "./palet.ts";
import type { TopacKurulumu } from "./tipler.ts";
import modelListesi from "../../../veri/topac-model.json";

// Ortak 3B ikon önbelleği (TEMIZLIK #4). Atölye 3B'nin tek kare parça / topaç ikonu (Goruntuleyici.ikon) Market,
// Başarımlar, Lobi takım kartları ve maç sonu "Market'te açıldı" kartında da kullanılır.
// - three.js'siz modül: çizer (Goruntuleyici, ayrı paket) ilk istekte dinamik yüklenir; ana paket büyümez.
// - Önce yordamsal ikon çizilir; `data-ikon3b` işaretli öğeler hazır olunca aynı boyda `<img>` ile değişir.
// - Önbellek: bellek (anahtar → data URL sözü) + localStorage (katalog ve model sürümüyle; sonraki sayfada three yüklenmez).
// - WebGL yoksa / `?webgl=0` / çizim başarısızsa null: yordamsal ikon yerinde kalır.

interface IkonCizer {
  /** çizmeden önce parçaların GLB'lerini yükler (Goruntuleyici.hazirla); yoksa parametrik çizilir */
  hazirla?(idler: readonly string[]): Promise<void>;
  ikon(parcaId: string, boya: Boya, boyut: number): HTMLCanvasElement | null;
  topacIkonu(k: TopacKurulumu, boyut: number): HTMLCanvasElement | null;
}

const DEPO_ANAHTAR = "devran.ikon3b.v1";
const DEPO_TAVAN = 240;
const bellek = new Map<string, Promise<string | null>>();
let bagli: IkonCizer | null = null;
let kendi: Promise<IkonCizer | null> | null = null;
let depo: { surum: string; ikonlar: Record<string, string> } | null = null;

/**
 * Model dosyasının (kaynak/topac/parcalar-3b.json) FNV-1a 32 özeti: localStorage önbelleğinin sürümü. Modül three.js ve
 * model JSON'unu içe almaz (Market paketine girmesin); test/ikon-onbellek.test.ts dosyayla eşleştiğini denetler.
 */
export const MODEL_OZETI = "6935820b";
/** Çizim kuralı (Goruntuleyici.tekKare: kamera, kontur) değişince artır. 2: ikonlar GLB'yi bekleyip çizer. */
export const IKON_SURUMU = 2;
/**
 * Mac hattı GLB'lerinin içerik özeti (veri/topac-model.json `ozet`, araclar/sanat/topac-mac.ts yazar; test dosyalarla eşler):
 * GLB eklenince ya da değişince eski parametrik ikonlar localStorage'dan dönmesin.
 */
export const GLB_OZETI: string = (modelListesi as { ozet?: string }).ozet ?? "-";

function modelSurumu(): string {
  return `${KATALOG_OZETI}:${MODEL_OZETI}:${GLB_OZETI}:${IKON_SURUMU}`;
}

function depoOku(): { surum: string; ikonlar: Record<string, string> } {
  if (depo) return depo;
  const surum = modelSurumu();
  depo = { surum, ikonlar: {} };
  try {
    const d = JSON.parse(localStorage.getItem(DEPO_ANAHTAR) ?? "null") as typeof depo | null;
    if (d && d.surum === surum && d.ikonlar) depo = d;
  } catch { /* yok */ }
  return depo;
}

function depoYaz(anahtar: string, url: string): void {
  const d = depoOku();
  d.ikonlar[anahtar] = url;
  const k = Object.keys(d.ikonlar);
  if (k.length > DEPO_TAVAN) for (const x of k.slice(0, k.length - DEPO_TAVAN)) delete d.ikonlar[x];
  try { localStorage.setItem(DEPO_ANAHTAR, JSON.stringify(d)); } catch { /* dolu / kapalı: yalnız bellek */ }
}

const webglIzinli = (): boolean => {
  try { return new URLSearchParams(location.search).get("webgl") !== "0"; } catch { return false; }
};

/** Atölye canlı çizeri bağlar (ikinci WebGL bağlamı açılmaz). Yedek çizer bağlanmaz. */
export function ikonCizeriBagla(c: (IkonCizer & { tur?: string }) | null): void {
  bagli = c && c.tur !== "yedek" ? c : null;
}

async function cizer(): Promise<IkonCizer | null> {
  if (bagli) return bagli;
  if (!webglIzinli()) return null;
  kendi ??= import("./Goruntuleyici.ts").then((m) => m.ikonCizeriKur() as IkonCizer).catch(() => null);
  return kendi;
}

function uret(anahtar: string, idler: readonly string[], ciz: (c: IkonCizer) => HTMLCanvasElement | null): Promise<string | null> {
  let p = bellek.get(anahtar);
  if (p) return p;
  const kayitli = depoOku().ikonlar[anahtar];
  if (kayitli) { p = Promise.resolve(kayitli); bellek.set(anahtar, p); return p; }
  p = cizer().then(async (c) => {
    if (!c) return null;
    try { await c.hazirla?.(idler); } catch { /* GLB yok: parametrik çizilir */ }
    try {
      const cv = ciz(c);
      if (!cv) return null;
      const url = cv.toDataURL("image/png");
      depoYaz(anahtar, url);
      return url;
    } catch { return null; }
  });
  bellek.set(anahtar, p);
  return p;
}

/** Parça boyası (Atölye kuralı): Çekirdek = kendi Element'i + Köken ışığı; Gövde = verilen Element (yoksa kendi); Disk/Uç metal. */
export function parcaBoyasi(parcaId: string, govdeElement?: string | null): Boya {
  let p: ReturnType<typeof parcaBul> | null = null;
  try { p = parcaBul(parcaId); } catch { p = null; }
  const el = (p && "element" in p ? p.element : null) as ElementAdi | null;
  if (p?.tur === "cekirdek") return { element: el, koken: ((p as { koken?: string }).koken ?? null) as KokenAdi | null };
  if (p?.tur === "govde") return { element: (govdeElement as ElementAdi | null | undefined) ?? el, koken: null };
  return { element: null, koken: null };
}

export function parcaIkonUrl(parcaId: string, boya: Boya, boyut: number): Promise<string | null> {
  return uret(`p:${parcaId}:${boya.element ?? "-"}:${boya.koken ?? "-"}:${boyut}`, [parcaId], (c) => c.ikon(parcaId, boya, boyut));
}

export function topacIkonUrl(k: TopacKurulumu, boyut: number): Promise<string | null> {
  if (!k.cekirdek && !k.govde) return Promise.resolve(null);
  return uret(`t:${k.cekirdek}:${k.govde}:${k.disk}:${k.uc}:${k.element ?? "-"}:${k.koken ?? "-"}:${k.sol ? 1 : 0}:${boyut}`, [k.cekirdek, k.govde, k.disk, k.uc].filter((x): x is string => !!x), (c) => c.topacIkonu(k, boyut));
}

/**
 * Öğeyi 3B ikonla değiştirilmek üzere işaretle. `boyut`: çizim pikseli (kare), `gor`: ekranda mantıksal px (varsayılan
 * boyut; tam katı olursa nearest net kalır). `ikonlariYukselt` çağrılınca değişir.
 */
export function parcaIkonIsaretle(e: HTMLElement, parcaId: string, boya: Boya, boyut: number, gor = boyut): void {
  e.dataset["ikon3b"] = `p|${parcaId}|${boya.element ?? ""}|${boya.koken ?? ""}|${boyut}|${gor}`;
}

export function topacIkonIsaretle(e: HTMLElement, k: TopacKurulumu, boyut: number, gor = boyut): void {
  e.dataset["ikon3b"] = `t|${k.cekirdek ?? ""}|${k.govde ?? ""}|${k.disk ?? ""}|${k.uc ?? ""}|${k.element ?? ""}|${k.koken ?? ""}|${k.sol ? 1 : 0}|${boyut}|${gor}`;
}

/** innerHTML şablonları için öznitelik dizgisi (parça). */
export function parcaIkonOzniteligi(parcaId: string, boya: Boya, boyut: number, gor = boyut): string {
  return ` data-ikon3b="p|${parcaId}|${boya.element ?? ""}|${boya.koken ?? ""}|${boyut}|${gor}"`;
}

/** Menü ikonlarının çizim boyu (px; yordamsal ikon 24×18 ile aynı genişlik). */
export const IKON3B_PX = 24;

/** `kok`a eklenen işaretli ikonları kendiliğinden yükseltir (ekran yeniden çizse de). Gözlemciyi döndürür. */
export function ikonGozle(kok: HTMLElement): MutationObserver | null {
  ikonlariYukselt(kok);
  if (typeof MutationObserver !== "function") return null;
  let bekliyor = false;
  const g = new MutationObserver(() => {
    if (bekliyor) return;
    bekliyor = true;
    queueMicrotask(() => { bekliyor = false; ikonlariYukselt(kok); });
  });
  g.observe(kok, { childList: true, subtree: true });
  return g;
}

const bos = (s: string | undefined) => (s ? s : null);

/** `kok` altındaki işaretli yordamsal ikonları 3B ikonla değiştirir (tembel, hata sessiz: yordamsal kalır). */
export function ikonlariYukselt(kok: ParentNode): void {
  for (const e of Array.from(kok.querySelectorAll<HTMLElement>("[data-ikon3b]"))) {
    const v = (e.dataset["ikon3b"] ?? "").split("|");
    delete e.dataset["ikon3b"];
    let p: Promise<string | null>;
    let boyut: number, gor: number;
    if (v[0] === "p") {
      boyut = Number(v[4]); gor = Number(v[5]) || boyut;
      p = parcaIkonUrl(v[1]!, { element: bos(v[2]) as ElementAdi | null, koken: bos(v[3]) as KokenAdi | null }, boyut);
    } else if (v[0] === "t") {
      boyut = Number(v[8]); gor = Number(v[9]) || boyut;
      p = topacIkonUrl({ cekirdek: bos(v[1]), govde: bos(v[2]), disk: bos(v[3]), uc: bos(v[4]), element: bos(v[5]) as ElementAdi | null, koken: bos(v[6]) as KokenAdi | null, sol: v[7] === "1" }, boyut);
    } else continue;
    void p.then((url) => {
      if (!url || !e.isConnected) return;
      const img = e instanceof HTMLImageElement ? e : document.createElement("img");
      img.src = url;
      img.alt = "";
      img.setAttribute("aria-hidden", "true");
      img.className = `${e.className} g3-ikon3b`.trim();
      img.dataset["ikon3bHazir"] = "1";
      if (img !== e) img.style.cssText = e.style.cssText;
      img.style.width = `calc(${gor} * var(--p))`;
      img.style.height = `calc(${gor} * var(--p))`;
      img.style.imageRendering = "pixelated";
      const taban = Number(e.dataset["ikon3bTaban"]);
      if (Number.isFinite(taban) && taban > 0 && e instanceof HTMLCanvasElement) tabanaHizala(img, url, gor, taban, e.height);
      if (img !== e) e.replaceWith(img);
    });
  }
}

/** En alttaki opak satır (uç ucu); bulunamazsa null. */
async function enAltSatir(url: string, boyut: number): Promise<number | null> {
  const im = new Image();
  im.src = url;
  await im.decode();
  const c = document.createElement("canvas");
  c.width = boyut; c.height = boyut;
  const g = c.getContext("2d");
  if (!g) return null;
  g.drawImage(im, 0, 0, boyut, boyut);
  const v = g.getImageData(0, 0, boyut, boyut).data;
  for (let y = boyut - 1; y >= 0; y--) for (let x = 0; x < boyut; x++) if (v[(y * boyut + x) * 4 + 3]! > 127) return y;
  return null;
}

/**
 * GU-C (lobi takım kartı): kare 3B ikonu yordamsal tuvalin yerleşimine oturt. Yordamsal tuval `yuk` px yüksek, uç ucu
 * `taban` satırında; ikonun en alt opak satırı aynı yere gelir, yerleşim yüksekliği `yuk` kalır (kaide kaymaz).
 */
function tabanaHizala(img: HTMLImageElement, url: string, gor: number, taban: number, yuk: number): void {
  void enAltSatir(url, gor).then((alt) => {
    if (alt === null) return;
    const ust = taban - alt;
    img.style.marginTop = `calc(${ust} * var(--p))`;
    img.style.marginBottom = `calc(${yuk - gor - ust} * var(--p))`;
    img.dataset["ikon3bHizali"] = String(ust);
  }).catch(() => undefined);
}
