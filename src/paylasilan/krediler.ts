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
  { ad: "Zod", lisans: "MIT", telif: "Copyright (c) 2025 Colin McDonnell", url: "https://github.com/colinhacks/zod" },
  { ad: "Vite (yapım aracı)", lisans: "MIT", telif: "Copyright (c) 2019-present VoidZero Inc. and Vite contributors", url: "https://github.com/vitejs/vite" },
];

/** Yazı tipleri: oyunla dosya dağıtılmaz (index.html: sistem yazı tipleri, dış istek yok). */
export const YAZI_TIPI = "Oyun yazı tipi dosyası dağıtmaz: menü ve HUD cihazdaki sistem yazı tiplerini kullanır (system-ui, Trebuchet MS; varsa Nunito Sans, SIL Open Font License 1.1).";

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
