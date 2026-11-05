import { AnimatedSprite, Assets, type Spritesheet, type Texture } from "pixi.js";

// Pişirilmiş efekt atlasları (efekt-kaynaklari § 8.7; pixelfx MIT + Aim CC0; veri/manifest-gorsel.json): public/efekt/<ad>.json
// Pixi Spritesheet; `nearest` (pixel ızgarası), istek başına tek yükleme, önbellek. Yoksa/yüklenemezse null döner ve
// Efektler yordamsal yedeği çizer. Kare süresi meta.devran.<anim>.kareMs (12 fps). Hibrit sahnede atlas pikseli = sanat
// pikseli (dünya ölçeği 2 / yakınlık); tam sayı olmayan dikey ölçek YOK: zemin efektleri kodla elips çizilir.
// TEMIZLIK #2: atlaslar araclar/sanat/efekt-paketle.ts ile (256 renk palet, yalnız çalınan animasyonlar); hangisinin ne
// zaman yükleneceği Efektler.atlasHazirla'da (açılışta yalnız efekt-cekirdek).

export type AtlasAdi = "efekt-cekirdek" | "efekt" | "efekt-kor" | "efekt-don" | "efekt-kaya" | "efekt-kasirga" | "efekt-girdap" | "efekt-simsek";

interface DevranMeta { [anim: string]: { kareMs: number; anchor: [number, number] } }
export interface YuklenenEfektAtlas { sayfa: Spritesheet; meta: DevranMeta }

const onbellek = new Map<AtlasAdi, Promise<YuklenenEfektAtlas | null>>();
const hazir = new Map<AtlasAdi, YuklenenEfektAtlas>();
/** test/ölçüm: yükleme hataları */
export const efektAtlasHatalari: string[] = [];

async function yukle(ad: AtlasAdi): Promise<YuklenenEfektAtlas | null> {
  const taban = import.meta.env.BASE_URL ?? "/";
  try {
    const sayfa = await Assets.load<Spritesheet>(`${taban}efekt/${ad}.json`);
    if (!sayfa?.animations) return null;
    for (const t of Object.values(sayfa.textures)) (t as Texture).source.scaleMode = "nearest";
    const meta = ((sayfa.data.meta as unknown as { devran?: DevranMeta }).devran ?? {}) as DevranMeta;
    const y = { sayfa, meta };
    hazir.set(ad, y);
    return y;
  } catch (e) {
    efektAtlasHatalari.push(`${ad}: ${String(e)}`);
    return null;
  }
}

/** Atlası arka planda yükler (bir kez). */
export function efektAtlasYukle(ad: AtlasAdi): Promise<YuklenenEfektAtlas | null> {
  let p = onbellek.get(ad);
  if (!p) { p = yukle(ad); onbellek.set(ad, p); }
  return p;
}

/** Yüklendiyse animasyon sprite'ı (tek sefer oynar, bitince kendini yok eder); değilse null (yordamsal yedek). */
export function efektSprite(ad: AtlasAdi, anim: string): AnimatedSprite | null {
  const a = hazir.get(ad);
  const kareler = a?.sayfa.animations[anim];
  if (!a || !kareler?.length) return null;
  const s = new AnimatedSprite(kareler);
  const m = a.meta[anim];
  s.anchor.set(m?.anchor[0] ?? 0.5, m?.anchor[1] ?? 0.5);
  // AnimatedSprite hızı: kare / ticker adımı (60 Hz); 12 fps → 0,2
  s.animationSpeed = 1000 / (m?.kareMs ?? 83) / 60;
  s.loop = false;
  s.onComplete = () => s.destroy();
  s.play();
  return s;
}

export function efektAtlasHazir(ad: AtlasAdi): boolean { return hazir.has(ad); }
