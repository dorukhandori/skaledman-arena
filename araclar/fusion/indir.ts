// SpriteCollab / fusion resmi indirme: dosya önbelleği + en çok 4 eşzamanlı istek, başarısızlıkta açık hata.
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const KOK = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const ONBELLEK = join(KOK, ".cache");
const TABAN = "https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite";
const ESZAMANLI = 4;
const DENEME = 3;

let calisan = 0;
const bekleyen: (() => void)[] = [];

async function sirada<T>(is: () => Promise<T>): Promise<T> {
  if (calisan >= ESZAMANLI) await new Promise<void>((coz) => bekleyen.push(coz));
  calisan++;
  try { return await is(); } finally { calisan--; bekleyen.shift()?.(); }
}

export class DosyaYok extends Error {}

async function getir(url: string): Promise<Buffer> {
  let sonHata: unknown;
  for (let d = 1; d <= DENEME; d++) {
    try {
      const yanit = await fetch(url);
      if (yanit.status === 404) throw new DosyaYok(`404: ${url}`);
      if (!yanit.ok) throw new Error(`HTTP ${yanit.status}: ${url}`);
      return Buffer.from(await yanit.arrayBuffer());
    } catch (h) {
      if (h instanceof DosyaYok) throw h;
      sonHata = h;
      await new Promise((c) => setTimeout(c, 400 * d));
    }
  }
  throw new Error(`indirilemedi (${DENEME} deneme): ${url}: ${sonHata instanceof Error ? sonHata.message : String(sonHata)}`);
}

/** URL'yi önbelleğe indirir (varsa dokunmaz); yerel yolu döndürür. 404 → DosyaYok. */
export async function onbellekliIndir(url: string, yerel: string): Promise<string> {
  if (existsSync(yerel)) return yerel;
  const veri = await sirada(() => getir(url));
  await mkdir(dirname(yerel), { recursive: true });
  await writeFile(yerel, veri);
  return yerel;
}

export function spriteDosyasi(klasor: string, dosya: string): Promise<string> {
  return onbellekliIndir(`${TABAN}/${klasor}/${dosya}`, join(ONBELLEK, "spritecollab", klasor, dosya));
}

export function fusionKarti(fusionId: string, url: string): Promise<string> {
  return onbellekliIndir(url, join(ONBELLEK, "fusion-kart", `${fusionId}.png`));
}

export async function metinOku(yol: string): Promise<string> {
  return readFile(yol, "utf8");
}
