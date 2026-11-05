import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Kimlik (axiom § 2 #22; sahip kararı 2026-11-04: Kick OAuth en sona, D5'te ad + şifre).
// - Şifre: scrypt (N=2^15, r=8, p=1, 64 bayt) + 16 bayt rastgele tuz; tek alanda `scrypt$N$r$p$tuz$hash` (base64url).
//   Düz şifre saklanmaz, günlüğe yazılmaz; karşılaştırma sabit zamanlı.
// - REST oturumu: HTTP-only, SameSite=Lax (üretimde Secure) imzalı çerez `devran_oturum=<oturumId>.<hmac>`;
//   oturum satırı SQLite'ta (çıkışta silinir, 30 gün).
// - Oda katılımı: `/api/bilet` → 60 s ömürlü, TEK KULLANIMLIK HMAC bileti; `MacOdasi.onAuth` doğrular.
// - Origin: REST yazımları ve WebSocket katılımı izinli kökenlerden.
// - Kaba kuvvet: (ip + ad) başına dakikada 10 deneme.

export type KimlikModu = "sifre" | "kick";

/** Varsayılan ve test edilen yol: ad + şifre. `kick` ileride (D8 sonrası, ayrı dilim). */
export function kimlikModu(): KimlikModu {
  return process.env.KIMLIK_MODU === "kick" ? "kick" : "sifre";
}

// ---- sır ----
const g = globalThis as unknown as { __devranSir?: Buffer };

/**
 * Oturum/bilet imza anahtarı `OTURUM_SIRRI` (≥ 32 karakter). Üretimde zorunlu; geliştirmede yoksa süreç başına
 * rastgele (yeniden başlatınca oturumlar düşer).
 */
export function oturumSirri(): Buffer {
  const s = process.env.OTURUM_SIRRI;
  if (s && s.length >= 32) return Buffer.from(s, "utf8");
  if (process.env.NODE_ENV === "production") throw new Error("OTURUM_SIRRI eksik ya da 32 karakterden kısa.");
  g.__devranSir ??= randomBytes(32);
  return g.__devranSir;
}

/** Açılış denetimi: eksik/yanlış ortam değişkeninde açık hata (sunucu başlamaz). */
export function kimlikAyarlariniDenetle(): void {
  const eksik: string[] = [];
  const uretim = process.env.NODE_ENV === "production";
  if (process.env.KIMLIK_MODU && !["sifre", "kick"].includes(process.env.KIMLIK_MODU)) eksik.push(`KIMLIK_MODU=${process.env.KIMLIK_MODU} (geçerli: sifre)`);
  if (kimlikModu() === "kick") eksik.push("KIMLIK_MODU=kick henüz yok (Kick OAuth sona bırakıldı; sahip kararı). 'sifre' kullan");
  if (uretim) {
    const s = process.env.OTURUM_SIRRI ?? "";
    if (s.length < 32) eksik.push("OTURUM_SIRRI (≥ 32 karakter)");
    if (!(process.env.IZINLI_KOKENLER ?? "").trim()) eksik.push("IZINLI_KOKENLER");
    if (!process.env.VERI_DIZINI) eksik.push("VERI_DIZINI");
  }
  if (eksik.length) throw new Error(`[devran] Sunucu başlatılamadı, ortam eksik/yanlış: ${eksik.join("; ")}. Bkz. .env.example`);
}

// ---- imza yardımcıları ----
const b64 = (b: Buffer): string => b.toString("base64url");

export function imzala(veri: string, sir: Buffer = oturumSirri()): string {
  return b64(createHmac("sha256", sir).update(veri).digest());
}

function esit(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// ---- şifre ----
const SCRYPT = { N: 1 << 15, r: 8, p: 1, uzunluk: 64, maxmem: 64 * 1024 * 1024 } as const;

function scrypt(sifre: string, tuz: Buffer, n: number, r: number, p: number, uzunluk: number): Promise<Buffer> {
  const o: ScryptOptions = { N: n, r, p, maxmem: SCRYPT.maxmem };
  return new Promise((coz, red) => scryptCb(sifre.normalize("NFC"), tuz, uzunluk, o, (e, k) => (e ? red(e) : coz(k))));
}

export async function sifreHashle(sifre: string): Promise<string> {
  const tuz = randomBytes(16);
  const k = await scrypt(sifre, tuz, SCRYPT.N, SCRYPT.r, SCRYPT.p, SCRYPT.uzunluk);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${b64(tuz)}$${b64(k)}`;
}

export async function sifreDogrula(sifre: string, kayit: string): Promise<boolean> {
  const a = kayit.split("$");
  if (a.length !== 6 || a[0] !== "scrypt") return false;
  const [n, r, p] = [Number(a[1]), Number(a[2]), Number(a[3])];
  const tuz = Buffer.from(a[4]!, "base64url");
  const beklenen = Buffer.from(a[5]!, "base64url");
  if (!(n > 1 && r > 0 && p > 0) || beklenen.length < 16) return false;
  const k = await scrypt(sifre, tuz, n, r, p, beklenen.length);
  return timingSafeEqual(k, beklenen);
}

/** Bilinmeyen adda da aynı süre harcansın (ad sızdırmasın). */
let sahteHash: Promise<string> | null = null;
export async function sahteDogrula(sifre: string): Promise<false> {
  sahteHash ??= sifreHashle(randomBytes(12).toString("hex"));
  await sifreDogrula(sifre, await sahteHash);
  return false;
}

// ---- oturum çerezi ----
export const OTURUM_CEREZI = "devran_oturum";
export const OTURUM_GUN = 30;

export function yeniOturumId(): string {
  return b64(randomBytes(24));
}

export function oturumCereziDegeri(oturumId: string): string {
  return `${oturumId}.${imzala(`oturum:${oturumId}`)}`;
}

/** İmza doğruysa oturum kimliği, değilse null. */
export function oturumCereziCoz(deger: string | undefined): string | null {
  if (!deger) return null;
  const i = deger.lastIndexOf(".");
  if (i <= 0) return null;
  const id = deger.slice(0, i);
  return esit(deger.slice(i + 1), imzala(`oturum:${id}`)) ? id : null;
}

export function cerezBasligi(ad: string, deger: string, saniye: number): string {
  const p = [`${ad}=${deger}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${saniye}`];
  if (process.env.NODE_ENV === "production") p.push("Secure");
  return p.join("; ");
}

export function cerezleriCoz(baslik: string | undefined): Record<string, string> {
  const c: Record<string, string> = {};
  for (const parca of (baslik ?? "").split(";")) {
    const i = parca.indexOf("=");
    if (i > 0) c[parca.slice(0, i).trim()] = decodeURIComponent(parca.slice(i + 1).trim());
  }
  return c;
}

// ---- oda bileti (60 s, tek kullanımlık) ----
export const BILET_SN = 60;
const kullanilan = (globalThis as unknown as { __devranBiletler?: Map<string, number> });
kullanilan.__devranBiletler ??= new Map();
const kullanilanBiletler = kullanilan.__devranBiletler;

export function biletUret(oyuncuId: number, simdi = Date.now()): string {
  const govde = b64(Buffer.from(JSON.stringify({ o: oyuncuId, n: b64(randomBytes(12)), s: simdi + BILET_SN * 1000 })));
  return `${govde}.${imzala(`bilet:${govde}`)}`;
}

export type BiletHatasi = "bicim" | "imza" | "sure" | "kullanildi";

/** Bileti doğrula ve tüket. Aynı bilet ikinci kez → "kullanildi". */
export function biletTuket(bilet: unknown, simdi = Date.now()): { oyuncuId: number } | { hata: BiletHatasi } {
  if (typeof bilet !== "string" || bilet.length > 512) return { hata: "bicim" };
  const i = bilet.indexOf(".");
  if (i <= 0) return { hata: "bicim" };
  const govde = bilet.slice(0, i);
  if (!esit(bilet.slice(i + 1), imzala(`bilet:${govde}`))) return { hata: "imza" };
  let v: { o?: unknown; n?: unknown; s?: unknown };
  try { v = JSON.parse(Buffer.from(govde, "base64url").toString("utf8")) as typeof v; } catch { return { hata: "bicim" }; }
  if (typeof v.o !== "number" || typeof v.n !== "string" || typeof v.s !== "number") return { hata: "bicim" };
  if (v.s <= simdi) return { hata: "sure" };
  for (const [n, s] of kullanilanBiletler) if (s <= simdi) kullanilanBiletler.delete(n);
  if (kullanilanBiletler.has(v.n)) return { hata: "kullanildi" };
  kullanilanBiletler.set(v.n, v.s);
  return { oyuncuId: v.o };
}

// ---- kaba kuvvet sınırı ----
export const DENEME_SINIRI = { sayi: 10, pencereMs: 60_000 } as const;
const denemeler = new Map<string, number[]>();

/** (ip + ad) anahtarına bir deneme yaz; pencere içinde sınırı aştıysa false (deneme yapılmaz). */
export function denemeIzinli(anahtar: string, simdi = Date.now()): boolean {
  const liste = (denemeler.get(anahtar) ?? []).filter((t) => simdi - t < DENEME_SINIRI.pencereMs);
  if (liste.length >= DENEME_SINIRI.sayi) { denemeler.set(anahtar, liste); return false; }
  liste.push(simdi);
  denemeler.set(anahtar, liste);
  if (denemeler.size > 50_000) for (const [k, v] of denemeler) if (!v.some((t) => simdi - t < DENEME_SINIRI.pencereMs)) denemeler.delete(k);
  return true;
}

export function denemeleriSifirla(): void {
  denemeler.clear();
}

/**
 * Origin kontrolü (cross-site WS ele geçirme / CSRF). `IZINLI_KOKENLER` virgüllü liste; yoksa geliştirmede
 * localhost / 127.0.0.1 (her port) ve Origin'siz (Node test istemcisi) kabul, üretimde liste zorunlu.
 * MOBIL-1: geliştirmede (NODE_ENV ≠ production VE liste boş) yerel ağ kökenleri de kabul: özel IPv4 aralıkları
 * (10/8, 172.16/12, 192.168/16) ve `.local` adları; telefonla aynı Wi-Fi'den deneme (`npm run dev:ag`). Üretim kuralı
 * aynen sert: liste yoksa her köken reddedilir, liste varsa yalnız listedekiler.
 */
export function kokenIzinli(koken: string | null): boolean {
  const liste = (process.env.IZINLI_KOKENLER ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (liste.length) return koken !== null && liste.includes(koken);
  if (process.env.NODE_ENV === "production") return false;
  if (koken === null) return true;
  try {
    const u = new URL(koken);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return u.hostname === "localhost" || u.hostname === "127.0.0.1" || yerelAgAdi(u.hostname);
  } catch {
    return false;
  }
}

/** Özel (RFC 1918) IPv4 adresi ya da mDNS `.local` adı mı (yalnız geliştirme kökeni için). */
export function yerelAgAdi(ad: string): boolean {
  if (/^[a-z0-9-]+\.local$/i.test(ad)) return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ad);
  if (!m) return false;
  const [a, b, c, d] = m.slice(1).map(Number) as [number, number, number, number];
  if ([a, b, c, d].some((x) => x > 255)) return false;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}
