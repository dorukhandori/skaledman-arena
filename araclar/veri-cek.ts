// Skaledman anlık görüntü çekicisi (saatlik). Oyun kodu Skaledman'ı ASLA canlı çağırmaz; sunucu bu çekimin
// çıktısını (ileride SQLite) okur. Siteye saygı: uç başına en çok saatte 1 istek, açık User-Agent, kısa zaman
// aşımı, boyut sınırı, sahibi dur derse dur (bkz. docs/tech/veri-cekimi.md).
//
// Çalıştır:  npm run veri:cek                       → .cache/veri-cek/ içine kartlar.json + gecmis.json
//            npm run veri:cek -- --detay 251.443    → ek olarak detay-251.443.json
//            npm run veri:cek -- --cikti veri       → test fixture'larının üstüne yazar (AÇIK istek gerekir)
//            npm run veri:cek -- --zorla            → saatlik sınırı ve "küçülme" korumasını atlar
import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { z } from "zod";
import { GecmisSema, KartlarSema } from "../src/paylasilan/kart.ts";

export const TABAN_URL = "https://skaledman.com";
export const KULLANICI_AJANI = "SkaledmanArena/0.0.1 (+fan project; contact via repo)";
export const SAAT_MS = 60 * 60 * 1000;
export const ZAMAN_ASIMI_MS = 15_000;
export const EN_BUYUK_GOVDE = 5 * 1024 * 1024;

const kok = join(dirname(fileURLToPath(import.meta.url)), "..");
export const VARSAYILAN_CIKTI = join(kok, ".cache", "veri-cek");
export const DURUM_DOSYASI = join(kok, ".cache", "veri-cek-durum.json");

// /api/detay: yalnızca arenanın okuyacağı çekirdek alanlar doğrulanır; gövde olduğu gibi (ham) yazılır.
const DetaySema = z.object({
  id: z.string(),
  name: z.string(),
  types: z.array(z.string()).min(1).max(2),
  abilities: z.array(z.object({ key: z.string(), name: z.string() })),
  hidden: z.array(z.object({ key: z.string(), name: z.string() })),
  moves: z.array(z.object({ key: z.string(), name: z.string(), type: z.string() })),
});

const FUSION_KIMLIGI = /^\d{1,4}\.\d{1,4}[a-z]?$/;

export interface Uc {
  /** Durum dosyasındaki anahtar (saatlik sınır bu anahtara göre) */
  anahtar: string;
  yol: string;
  dosya: string;
  dogrula: (veri: unknown) => string | null; // hata metni ya da null
  /** Küçülme koruması için kayıt sayısı (varsa) */
  say?: (veri: unknown) => number;
}

const bos = (n: number): string | null => (n > 0 ? null : "boş yanıt");

export function ucKartlar(): Uc {
  return {
    anahtar: "kartlar", yol: "/api/kartlar", dosya: "kartlar.json",
    dogrula: (v) => { const s = KartlarSema.safeParse(v); return s.success ? bos(Object.keys(s.data).length) : sema(s.error); },
    say: (v) => Object.keys(v as object).length,
  };
}

export function ucGecmis(): Uc {
  return {
    anahtar: "gecmis", yol: "/api/history", dosya: "gecmis.json",
    dogrula: (v) => { const s = GecmisSema.safeParse(v); return s.success ? bos(s.data.length) : sema(s.error); },
    say: (v) => (v as unknown[]).length,
  };
}

export function ucDetay(id: string): Uc {
  if (!FUSION_KIMLIGI.test(id)) throw new Error(`geçersiz fusion kimliği: ${JSON.stringify(id.slice(0, 20))}`);
  return {
    anahtar: `detay:${id}`, yol: `/api/detay?id=${encodeURIComponent(id)}`, dosya: `detay-${id}.json`,
    dogrula: (v) => {
      const s = DetaySema.safeParse(v);
      if (!s.success) return sema(s.error);
      return s.data.id === id ? null : "yanıt kimliği istenenle uyuşmuyor";
    },
  };
}

function sema(hata: z.ZodError): string {
  const i = hata.issues[0];
  return `şema uyuşmuyor: ${i ? `${i.path.join(".")}: ${i.message}` : "bilinmiyor"}`.slice(0, 200);
}

export type SonucDurumu = "yazildi" | "atlandi" | "hata";
export interface Sonuc { anahtar: string; durum: SonucDurumu; ileti: string }

export interface Bagimliliklar {
  fetch: typeof fetch;
  simdi: () => number;
  durumDosyasi: string;
}

export interface Secenekler {
  ciktiDizini: string;
  zorla: boolean;
  uclar: Uc[];
}

type DurumKaydi = Record<string, number>;

function durumOku(yol: string): DurumKaydi {
  try {
    const ham: unknown = JSON.parse(readFileSync(yol, "utf8"));
    const s = z.record(z.string(), z.number()).safeParse(ham);
    return s.success ? s.data : {};
  } catch {
    return {};
  }
}

/** tmp + rename: okuyan ya yarım dosya görmez ya eski dosyayı görür. */
export function atomikYaz(yol: string, metin: string): void {
  mkdirSync(dirname(yol), { recursive: true });
  const gecici = `${yol}.${process.pid}.tmp`;
  try {
    writeFileSync(gecici, metin, { mode: 0o644 });
    renameSync(gecici, yol);
  } finally {
    if (existsSync(gecici)) rmSync(gecici, { force: true });
  }
}

async function govdeOku(yanit: Response): Promise<string> {
  const uzunluk = Number(yanit.headers.get("content-length") ?? 0);
  if (uzunluk > EN_BUYUK_GOVDE) throw new Error("gövde çok büyük");
  const metin = await yanit.text();
  if (Buffer.byteLength(metin) > EN_BUYUK_GOVDE) throw new Error("gövde çok büyük");
  return metin;
}

function mevcutSayi(uc: Uc, yol: string): number | null {
  if (!uc.say || !existsSync(yol)) return null;
  try { return uc.say(JSON.parse(readFileSync(yol, "utf8"))); } catch { return null; }
}

async function birUcuCek(uc: Uc, s: Secenekler, b: Bagimliliklar, durum: DurumKaydi): Promise<Sonuc> {
  const simdi = b.simdi();
  const son = durum[uc.anahtar];
  if (!s.zorla && son !== undefined && simdi - son < SAAT_MS) {
    const kalan = Math.ceil((SAAT_MS - (simdi - son)) / 60_000);
    return { anahtar: uc.anahtar, durum: "atlandi", ileti: `saatlik sınır: ${kalan} dk sonra yeniden denenebilir (--zorla ile atlanır)` };
  }
  // Denemeyi İSTEKTEN ÖNCE kaydet: hata alsak da aynı uca saat dolmadan tekrar yüklenmeyiz.
  durum[uc.anahtar] = simdi;
  atomikYaz(b.durumDosyasi, JSON.stringify(durum));

  try {
    const yanit = await b.fetch(`${TABAN_URL}${uc.yol}`, {
      method: "GET",
      redirect: "error",
      headers: { "user-agent": KULLANICI_AJANI, accept: "application/json" },
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
    });
    if (!yanit.ok) return { anahtar: uc.anahtar, durum: "hata", ileti: `HTTP ${yanit.status}` };
    if (!(yanit.headers.get("content-type") ?? "").includes("json")) {
      return { anahtar: uc.anahtar, durum: "hata", ileti: "yanıt JSON değil" };
    }
    const metin = await govdeOku(yanit);
    let veri: unknown;
    try { veri = JSON.parse(metin); } catch { return { anahtar: uc.anahtar, durum: "hata", ileti: "geçersiz JSON" }; }
    const hata = uc.dogrula(veri);
    if (hata) return { anahtar: uc.anahtar, durum: "hata", ileti: hata };

    const hedef = join(s.ciktiDizini, uc.dosya);
    const onceki = mevcutSayi(uc, hedef);
    const yeni = uc.say?.(veri);
    if (!s.zorla && onceki !== null && yeni !== undefined && yeni < onceki) {
      return { anahtar: uc.anahtar, durum: "hata", ileti: `kayıt sayısı düştü (${onceki} → ${yeni}); yazılmadı (--zorla ile geçilir)` };
    }
    atomikYaz(hedef, metin); // ham gövde: yukarı akışla bayt bayt aynı
    return { anahtar: uc.anahtar, durum: "yazildi", ileti: `${uc.dosya} (${Buffer.byteLength(metin)} B${yeni !== undefined ? `, ${yeni} kayıt` : ""})` };
  } catch (e) {
    const ad = e instanceof Error ? e.name : "Hata";
    return { anahtar: uc.anahtar, durum: "hata", ileti: ad === "TimeoutError" ? "zaman aşımı" : `istek başarısız (${ad})` };
  }
}

/** Uçlar sırayla çekilir (paralel değil): siteye aynı anda tek bağlantı. */
export async function cek(s: Secenekler, b: Bagimliliklar): Promise<Sonuc[]> {
  const durum = durumOku(b.durumDosyasi);
  const sonuclar: Sonuc[] = [];
  for (const uc of s.uclar) sonuclar.push(await birUcuCek(uc, s, b, durum));
  return sonuclar;
}

export function argumanlariOku(argv: string[]): Secenekler {
  let cikti = VARSAYILAN_CIKTI;
  let zorla = false;
  const detaylar: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--zorla") zorla = true;
    else if (a === "--cikti") cikti = resolve(argv[++i] ?? "");
    else if (a === "--detay") detaylar.push(...(argv[++i] ?? "").split(",").filter(Boolean));
    else throw new Error(`bilinmeyen argüman: ${JSON.stringify(String(a).slice(0, 30))}`);
  }
  return { ciktiDizini: cikti, zorla, uclar: [ucKartlar(), ucGecmis(), ...detaylar.map(ucDetay)] };
}

async function main(): Promise<void> {
  const s = argumanlariOku(process.argv.slice(2));
  const sonuclar = await cek(s, { fetch, simdi: () => Date.now(), durumDosyasi: DURUM_DOSYASI });
  console.log(`çıktı dizini: ${s.ciktiDizini}`);
  for (const r of sonuclar) console.log(`${r.durum.padEnd(8)} ${r.anahtar}: ${r.ileti}`);
  if (sonuclar.some((r) => r.durum === "hata")) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : "beklenmeyen hata");
    process.exitCode = 1;
  });
}
