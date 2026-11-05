// Gri tonlu Gövde şeridi → 6 Element boyası (docs/art/topac-uretim-istegi.md § 4).
//   npx tsx araclar/sanat/palet-takasi.ts <gri.png> <cikti-{boya}.png>
// Tam şu 5 gri boya bölgesidir: #202020 çizgi, #505050 koyu, #808080 orta, #B0B0B0 açık, #E0E0E0 vurgu.
// Her biri renkler.ts ELEMENT_RENK rampasının karşılığına eşlenir; diğer renkler (metal, altın, beyaz) aynen kalır.
import sharp from "sharp";
import { ELEMENT_RENK, renkKaristir } from "../../src/istemci/oyun/renkler.ts";
import type { ElementAdi } from "../../src/paylasilan/kurallar/ayar.ts";

export const GRI = [0x20, 0x50, 0x80, 0xb0, 0xe0] as const;
const ELEMENTLER: ElementAdi[] = ["kor", "kasirga", "simsek", "girdap", "kaya", "don"];

export function rampaAl(e: ElementAdi): number[] {
  const r = ELEMENT_RENK[e];
  return [renkKaristir(r.koyu, 0x000000, 0.45), r.koyu, r.orta, r.acik, r.vurgu];
}

/** RGBA tamponunda gri → rampa (yerinde değil, kopya). */
export function takasEt(rgba: Uint8Array, e: ElementAdi): Uint8Array {
  const out = rgba.slice();
  const ramp = rampaAl(e);
  for (let i = 0; i < out.length; i += 4) {
    if (!out[i + 3]) continue;
    const r = out[i]!, g = out[i + 1]!, b = out[i + 2]!;
    if (r !== g || g !== b) continue;
    const k = GRI.indexOf(r as (typeof GRI)[number]);
    if (k < 0) continue;
    const c = ramp[k]!;
    out[i] = (c >> 16) & 255; out[i + 1] = (c >> 8) & 255; out[i + 2] = c & 255;
  }
  return out;
}

async function main(): Promise<void> {
  const [giris, kalip] = process.argv.slice(2);
  if (!giris || !kalip || !kalip.includes("{boya}")) {
    console.error("kullanım: palet-takasi.ts <gri.png> <cikti-{boya}.png>");
    process.exit(2);
  }
  const { data, info } = await sharp(giris).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const e of ELEMENTLER) {
    const out = takasEt(new Uint8Array(data), e);
    await sharp(Buffer.from(out), { raw: { width: info.width, height: info.height, channels: 4 } }).png({ palette: true, colours: 256, dither: 0 }).toFile(kalip.replace("{boya}", e));
    console.log(kalip.replace("{boya}", e));
  }
}

if (process.argv[1]?.endsWith("palet-takasi.ts")) await main();
