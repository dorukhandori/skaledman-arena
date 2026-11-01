// veri/spritecollab-tracker.json (10 MB, git dışı) → veri/spritecollab-kapsama.json (küçük, repoda).
// Infinite Fusion kimliği (gecmis.json head.id/body.id) ULUSAL DEX DEĞİLDİR (ör. 538 = Camerupt, ulusal 538 = Throh);
// SpriteCollab ulusal dex ile anahtarlıdır. Bu yüzden eşleme ADLA yapılır ve sonuç IF kimliğiyle yazılır.
// Çalıştır: npm run veri:kapsama
import { readFileSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const kok = join(dirname(fileURLToPath(import.meta.url)), "..");
const calistir = promisify(execFile);
const ESZAMANLI = 4;

interface TrackerKaydi {
  name: string;
  sprite_complete: number;
  sprite_credit: { primary: string; secondary: string[]; total: number };
  sprite_files: Record<string, boolean>;
}

export interface KapsamaKaydi {
  ad: string;
  /** SpriteCollab klasör anahtarı (ulusal dex, 4 hane) */
  klasor: string;
  /** SpriteCollab sprite_complete (0 = yok, 1 = kısmi, 2 = tam) */
  tamlik: number;
  animasyonlar: string[];
  /** Discord kimliği ("<@!...>") ya da kurum adı; ad çözümü SpriteCollab'ın kendi API'sindedir */
  kredi: string[];
}

/** Skaledman/Infinite Fusion adındaki yazım hataları → SpriteCollab adı */
const ADLAR: Record<string, string> = {
  ratata: "Rattata", dito: "Ditto", furet: "Furret", wobuffet: "Wobbuffet", keceon: "Kecleon", turwig: "Turtwig",
  regigas: "Regigigas", trubish: "Trubbish", sligoo: "Sliggoo", palosand: "Palossand", komoo: "Kommo-o",
  quiladin: "Quilladin", peliper: "Pelipper", victreebell: "Victreebel", nidoran: "Nidoran_F",
};

/** "Mr. Mime" → "mrmime", "Farfetch'd" → "farfetchd" */
export function adAnahtari(ad: string): string {
  const a = ad.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");
  const dogru = ADLAR[a];
  return dogru ? dogru.toLowerCase().replace(/[^a-z0-9]/g, "") : a;
}

/**
 * tracker.json'daki sprite_files bu iş için GÜVENİLMEZ (ör. Zubat, Muk için boş, oysa depoda var).
 * Gerçeği GitHub'dan alırız: klasörde `<Ad>-Anim.png` VE `<Ad>-Offsets.png` olan animasyonlar.
 * `gh` kimlik doğrulaması gerekir (5000 istek/saat; 300 kadar istek yeter).
 */
async function animasyonlariListele(klasor: string): Promise<string[]> {
  const { stdout } = await calistir("gh", ["api", `repos/PMDCollab/SpriteCollab/contents/sprite/${klasor}`, "--jq", ".[].name"], { maxBuffer: 1 << 20 });
  const dosyalar = new Set(stdout.split("\n").filter(Boolean));
  const adlar: string[] = [];
  for (const d of dosyalar) {
    const e = /^(.+)-Anim\.png$/.exec(d);
    if (e && dosyalar.has(`${e[1]}-Offsets.png`)) adlar.push(e[1]!);
  }
  return adlar.sort();
}

async function sinirli<T, R>(girdi: T[], is: (x: T) => Promise<R>): Promise<R[]> {
  const sonuc: R[] = new Array(girdi.length);
  let sira = 0;
  await Promise.all(Array.from({ length: ESZAMANLI }, async () => {
    for (;;) {
      const i = sira++;
      if (i >= girdi.length) return;
      sonuc[i] = await is(girdi[i]!);
    }
  }));
  return sonuc;
}

async function main() {
  const gecmis = JSON.parse(readFileSync(join(kok, "veri/gecmis.json"), "utf8")) as {
    head: { id: number; name: string };
    body: { id: number; name: string };
  }[];
  const tracker = JSON.parse(readFileSync(join(kok, "veri/spritecollab-tracker.json"), "utf8")) as Record<string, TrackerKaydi>;

  const adHaritasi = new Map<string, string>();
  for (const [klasor, k] of Object.entries(tracker)) {
    const a = adAnahtari(k.name);
    if (!adHaritasi.has(a)) adHaritasi.set(a, klasor); // ilk (en küçük dex) kazanır
  }

  const parcalar = new Map<number, string>();
  for (const g of gecmis) { parcalar.set(g.head.id, g.head.name); parcalar.set(g.body.id, g.body.name); }

  const cikti: Record<string, KapsamaKaydi> = {};
  const eslesmeyen: string[] = [];
  const isler: { id: number; ad: string; klasor: string; k: TrackerKaydi }[] = [];
  for (const [id, ad] of [...parcalar].sort((a, b) => a[0] - b[0])) {
    const klasor = adHaritasi.get(adAnahtari(ad));
    const k = klasor ? tracker[klasor] : undefined;
    if (!klasor || !k) { eslesmeyen.push(`${id}:${ad}`); continue; }
    isler.push({ id, ad, klasor, k });
  }
  const listeler = await sinirli(isler, (is) => animasyonlariListele(is.klasor));
  isler.forEach(({ id, ad, klasor, k }, i) => {
    cikti[String(id)] = {
      ad,
      klasor,
      tamlik: k.sprite_complete,
      animasyonlar: listeler[i]!,
      kredi: [k.sprite_credit.primary, ...k.sprite_credit.secondary].filter((s) => s !== ""),
    };
  });
  writeFileSync(join(kok, "veri/spritecollab-kapsama.json"), JSON.stringify(cikti).replace(/},"/g, "},\n\"") + "\n");
  console.log(`${Object.keys(cikti).length} parça yazıldı; adla eşleşmeyen ${eslesmeyen.length}: ${eslesmeyen.join(", ")}`);
}

main().catch((h) => { console.error(h instanceof Error ? h.message : h); process.exit(1); });
