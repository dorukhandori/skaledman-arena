// TEMIZLIK #2: yayımlanan efekt atlasları (public/efekt/) kayıpsız kaynaktan (kaynak/efekt/pixelfx/atlas/, pack.py çıktısı)
// yeniden paketlenir: yalnız oyunun çaldığı animasyonlar (Efektler.ts `sheet(...)`), ilk çarpışma için küçük çekirdek atlas
// (efekt-cekirdek), 256 renk palet PNG (sharp, titreşimsiz; pixel ızgarası ve nearest ölçekleme korunur).
// Çalıştır: npx tsx araclar/sanat/efekt-paketle.ts   (yeni animasyon kullanılırsa GRUP'a ekle; test/efekt-atlas.test.ts denetler)
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DEPO = path.resolve(import.meta.dirname, "..", "..");
const KAYNAK = path.join(DEPO, "kaynak", "efekt", "pixelfx", "atlas");
const CIKTI = path.join(DEPO, "public", "efekt");

/** yayımlanan atlas → [kaynak atlas, animasyon][] */
export const GRUP: Record<string, [string, string][]> = {
  "efekt-cekirdek": [["efekt", "kivilcim"], ["efekt", "kritik"]],
  efekt: [["efekt", "toz-bulut"], ["efekt", "enerji-doldu"]],
  "efekt-kor": [["efekt-kor", "kor-bulut"]],
  "efekt-don": [["efekt-don", "don-kirilma"], ["efekt-don", "don-parca"]],
  "efekt-kaya": [["efekt-kaya", "ulti-kaya"]],
  "efekt-kasirga": [["efekt-kasirga", "ulti-kasirga"]],
  "efekt-girdap": [["efekt-girdap", "ulti-girdap"]],
  "efekt-simsek": [["efekt-simsek", "simsek-carpma"]],
};

interface Kare { frame: { x: number; y: number; w: number; h: number }; [k: string]: unknown }
interface AtlasJson { frames: Record<string, Kare>; animations: Record<string, string[]>; meta: Record<string, unknown> & { devran: Record<string, unknown>; lisans: string } }

const kaynaklar = new Map<string, { js: AtlasJson; ham: Buffer; w: number }>();
async function kaynak(ad: string) {
  let k = kaynaklar.get(ad);
  if (!k) {
    const js = JSON.parse(fs.readFileSync(path.join(KAYNAK, `${ad}.json`), "utf8")) as AtlasJson;
    const { data, info } = await sharp(path.join(KAYNAK, `${ad}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    k = { js, ham: data, w: info.width };
    kaynaklar.set(ad, k);
  }
  return k;
}

const ikiKuvvet = (n: number) => { let p = 1; while (p < n) p *= 2; return p; };

async function paketle(ad: string, ogeler: [string, string][]) {
  const kareler: { ad: string; kaynak: string; k: Kare }[] = [];
  const animasyonlar: Record<string, string[]> = {};
  const devran: Record<string, unknown> = {};
  let lisans = "";
  for (const [ka, anim] of ogeler) {
    const k = await kaynak(ka);
    const adlar = k.js.animations[anim];
    if (!adlar) throw new Error(`${ka}: ${anim} yok`);
    animasyonlar[anim] = adlar;
    devran[anim] = k.js.meta.devran[anim];
    lisans = k.js.meta.lisans;
    for (const n of adlar) kareler.push({ ad: n, kaynak: ka, k: k.js.frames[n]! });
  }
  // raf paketleme (pack.py ile aynı: yüksekliğe göre, 1 px boşluk)
  const sirali = [...kareler].sort((a, b) => b.k.frame.h - a.k.frame.h);
  const yerlestir = (W: number) => {
    let x = 0, y = 0, raf = 0;
    const konum = new Map<string, [number, number]>();
    for (const o of sirali) {
      const { w, h } = o.k.frame;
      if (x + w > W) { x = 0; y += raf + 1; raf = 0; }
      konum.set(o.ad, [x, y]); x += w + 1; raf = Math.max(raf, h);
    }
    return { konum, H: y + raf };
  };
  let W = 256;
  let p = yerlestir(W);
  while (p.H > W && W < 2048) { W *= 2; p = yerlestir(W); }
  const H = ikiKuvvet(p.H);
  const cikti = Buffer.alloc(W * H * 4);
  const frames: Record<string, Kare> = {};
  for (const o of kareler) {
    const k = kaynaklar.get(o.kaynak)!;
    const [x, y] = p.konum.get(o.ad)!;
    const f = o.k.frame;
    for (let r = 0; r < f.h; r++) k.ham.copy(cikti, ((y + r) * W + x) * 4, ((f.y + r) * k.w + f.x) * 4, ((f.y + r) * k.w + f.x + f.w) * 4);
    frames[o.ad] = { ...o.k, frame: { x, y, w: f.w, h: f.h } };
  }
  const png = await sharp(cikti, { raw: { width: W, height: H, channels: 4 } })
    .png({ palette: true, colours: 256, dither: 0, effort: 10, compressionLevel: 9 }).toBuffer();
  // kalite: görünür piksellerde ortalama kanal hatası
  const geri = await sharp(png).ensureAlpha().raw().toBuffer();
  let top = 0, n = 0, enCok = 0;
  for (let i = 0; i < cikti.length; i += 4) {
    if (cikti[i + 3] === 0) continue;
    for (let c = 0; c < 4; c++) { const d = Math.abs(cikti[i + c]! - geri[i + c]!); top += d; if (d > enCok) enCok = d; }
    n += 4;
  }
  fs.writeFileSync(path.join(CIKTI, `${ad}.png`), png);
  const js: AtlasJson = {
    frames, animations: animasyonlar,
    meta: { app: "Devran efekt paketleme (araclar/sanat/efekt-paketle.ts; kaynak kaynak/efekt/pixelfx/atlas/, 256 renk palet)", image: `${ad}.png`, format: "RGBA8888", size: { w: W, h: H }, scale: "1", devran, lisans },
  };
  fs.writeFileSync(path.join(CIKTI, `${ad}.json`), JSON.stringify(js));
  console.log(`${ad.padEnd(15)} ${W}x${H} ${String(kareler.length).padStart(3)} kare  ${(png.length / 1024).toFixed(1).padStart(6)} KB  ort. hata ${(top / n).toFixed(2)}  en çok ${enCok}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  for (const f of fs.readdirSync(CIKTI)) if (/^efekt.*\.(png|json)$/.test(f)) fs.rmSync(path.join(CIKTI, f));
  for (const [ad, ogeler] of Object.entries(GRUP)) await paketle(ad, ogeler);
}
