// D8 krediler derleyicisi (saf; istemci sayfası, araclar/krediler-uret.ts ve test aynı kodu koşar). Girdi: `docs/art/krediler.md`
// metni ve `veri/manifest-gorsel.json` / `veri/manifest-ses.json` (efekt oturumu günceller; burada yalnız OKUNUR).
// Eksik dosya → o kaynak boş. Çıktı: krediler.md tablolarının satırları (bölüm başına), MIT bildirimi, manifest
// kaynaklarının krediler satırıyla eşleşmesi (eşleşmeyen = `eksikAtif`), ve kullanılan yazılım / yazı tipi lisansları.

export interface KrediSatiri { hucreler: string[] }
export interface KrediBolumu { baslik: string; basliklar: string[]; satirlar: KrediSatiri[] }
export interface ManifestKaynagi { dosya: string; kaynak: string; lisans: string; anahtar: string; bolum: string | null; eksikAtif: boolean }
export interface YazilimKredisi { ad: string; lisans: string; telif: string; url: string }
export interface Krediler {
  bolumler: KrediBolumu[];
  bildirim: string | null;
  kaynaklar: ManifestKaynagi[];
  yazilim: readonly YazilimKredisi[];
  yaziTipi: string;
}

/** Oyunla dağıtılan yazılım (package.json bağımlılıkları; MIT). Sürüm package.json'da. */
export const YAZILIM: readonly YazilimKredisi[] = [
  { ad: "PixiJS", lisans: "MIT", telif: "Copyright (c) 2013-2024 Mathew Groves, Chad Engler", url: "https://github.com/pixijs/pixijs" },
  { ad: "@pixi/sound", lisans: "MIT", telif: "Copyright (c) 2016-2024 PixiJS", url: "https://github.com/pixijs/sound" },
  { ad: "Colyseus (sunucu, SDK, @colyseus/schema)", lisans: "MIT", telif: "Copyright (c) 2015-present Endel Dreyer", url: "https://github.com/colyseus/colyseus" },
  { ad: "Colyseus + Vite başlangıç şablonu", lisans: "MIT", telif: "docs/tech/LICENSE-colyseus-vite-starter.txt", url: "https://github.com/colyseus" },
  { ad: "better-sqlite3", lisans: "MIT", telif: "Copyright (c) 2017 Joshua Wise", url: "https://github.com/WiseLibs/better-sqlite3" },
  { ad: "three.js (Atölye 3B görüntüleyici, ayrı paket)", lisans: "MIT", telif: "Copyright © 2010-2026 three.js authors", url: "https://github.com/mrdoob/three.js" },
  { ad: "Zod", lisans: "MIT", telif: "Copyright (c) 2025 Colin McDonnell", url: "https://github.com/colinhacks/zod" },
  { ad: "Vite (yapım aracı)", lisans: "MIT", telif: "Copyright (c) 2019-present VoidZero Inc. and Vite contributors", url: "https://github.com/vitejs/vite" },
];

/** Yazı tipleri (GU-01): yerel dosya public/yazi/ (dış istek yok); lisans metinleri yanında. */
export const YAZI_TIPI = "Menü ve HUD yazı tipleri oyunla birlikte dağıtılır: Jersey 10 (Sarah Cadigan-Fried, SIL Open Font License 1.1) ve m5x7 (Daniel Linssen, CC0 1.0). Düz yazı tipi seçeneği cihazın sistem yazı tipini kullanır.";

const temizle = (s: string): string => s.replace(/`/g, "").replace(/\*\*?/g, "").replace(/\s+/g, " ").trim();

/** Markdown tablolarını bölüm başlıklarıyla oku (## başlık → | a | b | satırları). */
export function tablolariOku(md: string): { bolumler: KrediBolumu[]; bildirim: string | null } {
  const bolumler: KrediBolumu[] = [];
  let baslik = "";
  let aktif: KrediBolumu | null = null;
  let bildirim: string | null = null;
  let kodda = false;
  let kod: string[] = [];
  let kodBaslik = "";
  for (const ham of md.split(/\r?\n/)) {
    const satir = ham.trimEnd();
    if (satir.startsWith("```")) {
      if (kodda) { if (/MIT|bildirim/i.test(kodBaslik) && !bildirim) bildirim = kod.join("\n"); kod = []; }
      kodda = !kodda;
      kodBaslik = baslik;
      continue;
    }
    if (kodda) { kod.push(ham); continue; }
    const h = /^#{2,3}\s+(.*)$/.exec(satir);
    if (h) { baslik = temizle(h[1]!); aktif = null; continue; }
    if (!satir.startsWith("|")) { aktif = null; continue; }
    const hucreler = satir.slice(1, satir.endsWith("|") ? -1 : undefined).split("|").map(temizle);
    if (hucreler.every((x) => /^:?-{2,}:?$/.test(x))) continue;
    if (!aktif) { aktif = { baslik, basliklar: hucreler, satirlar: [] }; bolumler.push(aktif); continue; }
    aktif.satirlar.push({ hucreler });
  }
  return { bolumler, bildirim };
}

interface ManifestDosyasi { dosya?: string; klasor?: string; kaynak?: string; lisans?: string }
interface Manifest { dosyalar?: ManifestDosyasi[]; kayitAdaylari?: { dosyalar?: ManifestDosyasi[] } }

/** Manifest kaynağının eşleşme anahtarı: kaynak metninin ilk sözcüğü (küçük harf); kendi sentezimiz → "sentez". */
export function kaynakAnahtari(kaynak: string): string {
  const k = kaynak.toLowerCase().trim();
  if (k.startsWith("sentez") || k.startsWith("kendi")) return "sentez";
  return (/^[^\s,(']+/.exec(k)?.[0] ?? k).replace(/[^a-z0-9çğıöşü-]/g, "");
}

function manifestKaynaklari(m: Manifest | null): ManifestDosyasi[] {
  if (!m) return [];
  return [...(m.dosyalar ?? []), ...(m.kayitAdaylari?.dosyalar ?? [])];
}

export function kredilerDerle(md: string | null, gorsel: unknown, ses: unknown): Krediler {
  const { bolumler, bildirim } = md ? tablolariOku(md) : { bolumler: [], bildirim: null };
  const kaynaklar: ManifestKaynagi[] = [];
  for (const x of [...manifestKaynaklari(gorsel as Manifest | null), ...manifestKaynaklari(ses as Manifest | null)]) {
    const kaynak = x.kaynak ?? "";
    const anahtar = kaynakAnahtari(kaynak);
    let bolum: string | null = null;
    if (anahtar === "sentez") bolum = bolumler.find((b) => /kendi/i.test(b.baslik))?.baslik ?? null;
    else {
      const b = bolumler.find((bb) => bb.satirlar.some((s) => s.hucreler.join(" ").toLowerCase().includes(anahtar)));
      bolum = b?.baslik ?? null;
    }
    kaynaklar.push({ dosya: x.dosya ?? x.klasor ?? "", kaynak, lisans: x.lisans ?? "", anahtar, bolum, eksikAtif: !anahtar || bolum === null });
  }
  return { bolumler, bildirim, kaynaklar, yazilim: YAZILIM, yaziTipi: YAZI_TIPI };
}

// ---- H-2 (MENU-P1A, sahip kararı S-3): oyuncu sürümü ----
// Oyun içi /krediler yalnız oyunda kullanılan varlıkları gösterir: Varlık · Atıf · Lisans. Aday / yedek / oyunda yüklenmeyen
// satırlar, "Durum" ve "Not" sütunları, dosya yolları ve iç notlar gösterilmez; tam iç kayıt docs/art/krediler.md'de kalır.
// Kullanılmıyor sayılan satır: Durum ya da Varlık hücresi aşağıdaki işaretlerden birini taşır. ("aday, entegre değil"
// notları eski: bu sesler public/ses/kayit/ altında ve Ses.ts tarafından çalınıyor; o yüzden "aday" tek başına dışlamaz.)

export interface OyuncuKredisi { varlik: string; atif: string; lisans: string }
export interface OyuncuKrediBolumu { baslik: string; satirlar: OyuncuKredisi[] }

/** Oyunda yüklenmeyen varlık işaretleri (krediler.md "Durum" / "Varlık" hücrelerinde). */
const KULLANILMIYOR = /yedek havuz|atlasa alınmadı|maçta yüklenmez|bayrakla kapalı|çalışma anında kullanılmaz|bağlı değil/i;

/** İç içe parantezleri ve içeriklerini at ("Jersey 10 (public/yazi/…; başlık)" → "Jersey 10"). */
export function parantezsiz(s: string): string {
  let o = s;
  for (let i = 0; i < 5 && /\([^()]*\)/.test(o); i++) o = o.replace(/\s*\([^()]*\)/g, "");
  return o.replace(/\s+/g, " ").replace(/\s+([,;.])/g, "$1").trim();
}

/** URL'yi kısa, okunur biçime getir ("https://github.com/x/y" → "github.com/x/y"). */
const kisaUrl = (s: string): string => s.replace(/https?:\/\/(www\.)?/g, "").replace(/\/$/, "");

const OYUNCU_BASLIK: [RegExp, string][] = [
  [/dış varlık/i, "Ses ve görsel efektler"],
  [/görsel yazılım/i, "3B görüntüleyici"],
  [/yazı tip/i, "Yazı tipleri"],
  [/pişirilmiş|kod kaynaklı/i, "Efekt kodu"],
  [/kendi/i, "Kendi üretimimiz"],
];
const oyuncuBasligi = (b: string): string => OYUNCU_BASLIK.find(([r]) => r.test(b))?.[1] ?? parantezsiz(b);

function hucre(b: KrediBolumu, s: KrediSatiri, ad: RegExp): string {
  const i = b.basliklar.findIndex((h) => ad.test(h));
  return i >= 0 ? (s.hucreler[i] ?? "").trim() : "";
}

function oyuncuSatiri(b: KrediBolumu, s: KrediSatiri): OyuncuKredisi | null {
  const varlikHam = hucre(b, s, /^(varlık|kaynak)$/i);
  if (KULLANILMIYOR.test(hucre(b, s, /^durum$/i)) || KULLANILMIYOR.test(varlikHam)) return null;
  const kendi = /kendi/i.test(b.baslik);
  // "pixelfx — https://…" → "pixelfx"; yol/parantez notları atılır
  // "A (…) ve B (…, dağıtılmaz)" → yalnız dağıtılan parça kalır
  const dagitilan = varlikHam.split(/\s+ve\s+(?=[^()]*\([^()]*dağıtılmaz)/i)[0] ?? varlikHam;
  const varlik = parantezsiz(dagitilan.split(/\s+—\s+/)[0] ?? dagitilan).replace(/;.*$/, "").trim();
  const atifHam = hucre(b, s, /^atıf/i).replace(/^"|"$/g, "").replace(/"\s*\+.*$/, "").trim();
  const yazar = parantezsiz(hucre(b, s, /yazar|telif/i));
  const yzUretim = /yapay zekâ/i.test(hucre(b, s, /^araç$/i));
  const atif = atifHam && atifHam !== "—" ? atifHam
    : kendi || /^kendi/i.test(yazar) ? (yzUretim ? "Devran (yapay zekâ destekli üretim)" : "Devran")
    : kisaUrl(yazar);
  const lisansHam = parantezsiz(hucre(b, s, /^lisans$/i));
  const lisans = /^bizim$/i.test(lisansHam) ? "Devran" : lisansHam.replace(/\s*\(bizim\)/i, "");
  if (!varlik) return null;
  return { varlik, atif: kisaUrl(atif), lisans: lisans || "—" };
}

/** Oyuncu sürümü: yalnız kullanılan varlıklar, Varlık · Atıf · Lisans (boş bölüm atlanır). */
export function oyuncuKredileri(k: Krediler): OyuncuKrediBolumu[] {
  const out: OyuncuKrediBolumu[] = [];
  for (const b of k.bolumler) {
    const satirlar = b.satirlar.map((s) => oyuncuSatiri(b, s)).filter((x): x is OyuncuKredisi => x !== null);
    if (satirlar.length) out.push({ baslik: oyuncuBasligi(b.baslik), satirlar });
  }
  return out;
}
