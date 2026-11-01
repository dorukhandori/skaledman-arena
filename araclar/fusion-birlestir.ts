// Fusion birleştirme aracı (SA-3): SpriteCollab sayfaları + sanatçının fusion resmi → public/fusion/<id>/ atlası.
// Kullanım:
//   npx tsx araclar/fusion-birlestir.ts --id 251.443 --id 76.538
//   npx tsx araclar/fusion-birlestir.ts --rastgele 20 --tohum 1 [--zorla]
//   npx tsx araclar/fusion-birlestir.ts --mevcut --zorla     (public/fusion'daki her fusion'u yeniden üret)
// Shiny kartlar (gecmis.json `shiny`) için ek olarak `<ad>-Anim-shiny.png` sayfaları üretilir; `--shiny-yok` atlar.
// Spec: docs/art/fusion-animasyon.md § 2 (Yol A).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Acilis } from "../src/paylasilan/kart.ts";
import type { AnimasyonAdi, AtlasAnimasyon, FusionAtlas, FusionListeKaydi } from "../src/paylasilan/atlas.ts";
import type { KapsamaKaydi } from "./spritecollab-kapsama.ts";
import { animDataOku, type AnimVerisi } from "./fusion/animdata.ts";
import { animYukle, type HazirAnim } from "./fusion/anim.ts";
import { basKes, basYerlestir, yaricapTahmin, type BasKirpintisi } from "./fusion/bas.ts";
import { fusionKarti, KOK, spriteDosyasi } from "./fusion/indir.ts";
import { ayakNoktasiBul, golgeBoya } from "./fusion/offsets.ts";
import { dolguYuzdelikleri, kontrastPlanla, kontrastUygula, type Yuzdelikler } from "./fusion/kontrast.ts";
import { shinyUygula, SHINY_DOYGUNLUK } from "./fusion/parlak.ts";
import { baskinRenkler, cizgiMi, hex, paletEsle, parlaklik, renkSayimi, renktenAnahtar, yenidenRenklendir, type PaletHaritasi, type Rgb } from "./fusion/palet.ts";
import { kareAl, kareYaz, resimOku, resimYaz, type Resim } from "./fusion/resim.ts";

const CIKTI = join(KOK, "public", "fusion");
const ARAC = "fusion-birlestir@2"; // @2: boyun köprüsü, kontrast güvencesi, shiny varyant
const ROLLER: AnimasyonAdi[] = ["Idle", "Walk", "Attack", "Hurt", "Charge", "Shoot", "Hop", "Strike"];
const ZORUNLU = ["Walk", "Attack", "Hurt"];
const FUSION_RENK_SAYISI = 8;

interface Secenek { idler: string[]; rastgele: number; tohum: number; zorla: boolean; mevcut: boolean; shinyYok: boolean }

function argumanlar(argv: string[]): Secenek {
  const s: Secenek = { idler: [], rastgele: 20, tohum: 1, zorla: false, mevcut: false, shinyYok: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], d = argv[i + 1];
    if (a === "--id" && d) { s.idler.push(d); i++; }
    else if (a === "--rastgele" && d) { s.rastgele = Number(d); i++; }
    else if (a === "--tohum" && d) { s.tohum = Number(d); i++; }
    else if (a === "--zorla") s.zorla = true;
    else if (a === "--mevcut") s.mevcut = true;
    else if (a === "--shiny-yok") s.shinyYok = true;
    else throw new Error(`bilinmeyen argüman: ${a}`);
  }
  return s;
}

/** mulberry32: araç tarafında tohumlu karıştırma (paylaşılan sim değil). */
function tohumlu(tohum: number): () => number {
  let a = tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296);
  };
}

const json = <T>(yol: string): T => JSON.parse(readFileSync(join(KOK, yol), "utf8")) as T;

function uygunMu(a: Acilis, k: Record<string, KapsamaKaydi>, kartlar: Record<string, unknown>): boolean {
  const g = k[a.body.id], b = k[a.head.id];
  return !!g && !!b && a.fusionId in kartlar
    && ZORUNLU.every((r) => g.animasyonlar.includes(r))
    && (b.animasyonlar.includes("Idle") || b.animasyonlar.includes("Walk"));
}

/** Idle yoksa Walk'ın ilk kareleri kullanılır. */
async function idleYukle(klasor: string, veri: AnimVerisi, dosyalar: readonly string[], uyarilar: string[], kim: string): Promise<HazirAnim> {
  const idle = (await animYukle(klasor, veri, "Idle", dosyalar)) ?? (await animYukle(klasor, veri, "Walk", dosyalar));
  if (!idle) throw new Error(`${kim}: ne Idle ne Walk sayfası var`);
  if (idle.rol === "Walk") uyarilar.push(`${kim}-idle-yok-walk-kullanildi`);
  return idle;
}

async function fusionPaleti(fusionId: string, url: string): Promise<{ renkler: ReturnType<typeof baskinRenkler>; cizgi: Rgb; yayilim: Yuzdelikler | null }> {
  const kart = await resimOku(await fusionKarti(fusionId, url));
  const renkler = baskinRenkler(renkSayimi(kart), FUSION_RENK_SAYISI);
  const enKoyu = [...renkler].sort((a, b) => parlaklik(a.renk) - parlaklik(b.renk))[0];
  const cizgi: Rgb = enKoyu && cizgiMi(enKoyu.renk) ? enKoyu.renk : [20, 16, 24];
  return { renkler, cizgi, yayilim: dolguYuzdelikleri([kart]) };
}

function paletKaydi(...haritalar: PaletHaritasi[]): Record<string, string> {
  const o: Record<string, string> = {};
  for (const p of haritalar) for (const [k, v] of p.harita) if (k !== v) o[hex(renktenAnahtar(k))] ??= hex(renktenAnahtar(v));
  return o;
}

/** A'nın Idle sayfasından her yön için baş kırpıntısı (yönsüz sayfada tek yön hepsine). */
function baslariKes(idleA: HazirAnim, renkli: Resim): (BasKirpintisi | null)[] {
  const { kareGenislik: kg, kareYukseklik: kh } = idleA.tanim;
  return Array.from({ length: 8 }, (_, yon) => {
    const satir = idleA.yonSayisi === 1 ? 0 : yon;
    const isaret = idleA.offsets[satir]?.[0]?.bas;
    if (!isaret) return null;
    const r = yaricapTahmin(renkli, 0, satir * kh, kg, kh);
    return basKes(renkli, 0, satir * kh, kg, kh, isaret, r);
  });
}

interface UretimSonucu {
  durum: "uretildi" | "atlandi";
  uyarilar: string[];
  /** Baş yerleşen kare sayısı ve boyun durumları (kopuk kareler = köprülenen + atlanan) */
  boyun?: { kare: number; koprulendi: number; atlandi: number };
  kontrastKatsayisi?: number;
  shiny?: boolean;
}

async function uret(a: Acilis, kapsama: Record<string, KapsamaKaydi>, secenek: Secenek): Promise<UretimSonucu> {
  const klasorYolu = join(CIKTI, a.fusionId);
  if (existsSync(join(klasorYolu, "atlas.json")) && !secenek.zorla) return { durum: "atlandi", uyarilar: [] };
  const uyarilar: string[] = [];
  const govdeK = kapsama[a.body.id]!, basK = kapsama[a.head.id]!;

  const [govdeVeri, basVeri, fp] = await Promise.all([
    spriteDosyasi(govdeK.klasor, "AnimData.xml").then((y) => animDataOku(readFileSync(y, "utf8"))),
    spriteDosyasi(basK.klasor, "AnimData.xml").then((y) => animDataOku(readFileSync(y, "utf8"))),
    fusionPaleti(a.fusionId, a.sprite),
  ]);

  // gövde sayfaları
  const govdeIdle = await idleYukle(govdeK.klasor, govdeVeri, govdeK.animasyonlar, uyarilar, "govde");
  const anims = new Map<string, HazirAnim>(); // dosya → sayfa
  const roller = new Map<AnimasyonAdi, HazirAnim>();
  for (const rol of ROLLER) {
    const h = rol === "Idle" ? govdeIdle : await animYukle(govdeK.klasor, govdeVeri, rol, govdeK.animasyonlar);
    if (!h) { if (ZORUNLU.includes(rol)) throw new Error(`govde ${govdeK.ad}: ${rol} sayfası yok`); continue; }
    roller.set(rol, h);
    if (!anims.has(h.dosya)) anims.set(h.dosya, h);
  }

  // paletler
  const govdePalet = paletEsle(renkSayimi(govdeIdle.anim), fp.renkler, fp.cizgi);
  const basIdle = await idleYukle(basK.klasor, basVeri, basK.animasyonlar, uyarilar, "bas");
  const basPalet = paletEsle(renkSayimi(basIdle.anim), fp.renkler, fp.cizgi);

  // başlar
  const basKirpintilari = baslariKes(basIdle, yenidenRenklendir(basIdle.anim, basPalet, new Map()));
  const yaricapGovde = Array.from({ length: 8 }, (_, yon) => {
    const satir = govdeIdle.yonSayisi === 1 ? 0 : yon;
    const { kareGenislik: kg, kareYukseklik: kh } = govdeIdle.tanim;
    return yaricapTahmin(govdeIdle.anim, 0, satir * kh, kg, kh);
  });
  if (basKirpintilari.every((b) => !b)) uyarilar.push("bas-yerlestirilemedi");

  // kareleri işle
  let toplamKare = 0, basSizKare = 0, boyunKoprulendi = 0, boyunAtlandi = 0;
  const onbellek = new Map<number, number>();
  const cikis = new Map<string, { anim: Resim; golge?: Resim }>();
  for (const [dosya, h] of anims) {
    const sayfa = yenidenRenklendir(h.anim, govdePalet, onbellek);
    const { kareGenislik: kg, kareYukseklik: kh } = h.tanim;
    if (!uyarilar.includes("bas-yerlestirilemedi")) {
      for (let s = 0; s < h.yonSayisi; s++) {
        for (let c = 0; c < h.kareSayisi; c++) {
          const kare = kareAl(sayfa, c * kg, s * kh, kg, kh);
          if (!kare.veri.some((_, i) => i % 4 === 3 && kare.veri[i]! > 0)) continue;
          toplamKare++;
          const isaret = h.offsets[s]?.[c]?.bas;
          const yon = h.yonSayisi === 1 ? 0 : s;
          const bas = basKirpintilari[yon];
          if (!isaret || !bas) { basSizKare++; continue; }
          const boyun = basYerlestir(kare, isaret, bas, yaricapGovde[yon]!, fp.cizgi);
          if (boyun === "koprulendi") boyunKoprulendi++;
          else if (boyun === "atlandi") boyunAtlandi++;
          kareYaz(sayfa, c * kg, s * kh, kare);
        }
      }
    }
    cikis.set(dosya, { anim: sayfa, golge: h.golge && golgeBoya(h.golge, govdeVeri.golgeBoyu) });
  }
  if (basSizKare > 0.1 * toplamKare && !uyarilar.includes("bas-yerlestirilemedi")) uyarilar.push("bas-yerlestirilemedi");

  // kontrast güvencesi: soluk / düz paletlerde gölgelendirme okunur kalsın (kontrast.ts)
  const kontrast = kontrastPlanla([...cikis.values()].map((c) => c.anim), fp.cizgi, fp.yayilim);
  if (kontrast) for (const c of cikis.values()) kontrastUygula(c.anim, kontrast);

  // yaz
  const shiny = a.shiny && !secenek.shinyYok;
  await mkdir(klasorYolu, { recursive: true });
  for (const [dosya, c] of cikis) {
    await resimYaz(join(klasorYolu, `${dosya}-Anim.png`), c.anim);
    if (shiny) await resimYaz(join(klasorYolu, `${dosya}-Anim-shiny.png`), shinyUygula(c.anim, a.hue));
    if (c.golge) await resimYaz(join(klasorYolu, `${dosya}-Shadow.png`), c.golge);
  }
  const animasyonlar: FusionAtlas["animasyonlar"] = {};
  for (const [rol, h] of roller) {
    const ayak = h.golge ? ayakNoktasiBul(h.golge, h.tanim.kareGenislik, h.tanim.kareYukseklik) : undefined;
    const e: AtlasAnimasyon = {
      ad: h.dosya, kareGenislik: h.tanim.kareGenislik, kareYukseklik: h.tanim.kareYukseklik,
      sureler: h.tanim.sureler.slice(0, h.kareSayisi), yonSayisi: h.yonSayisi, golge: !!h.golge,
    };
    while (e.sureler.length < h.kareSayisi) e.sureler.push(e.sureler.at(-1) ?? 6);
    if (h.tanim.vurusKaresi !== undefined) e.vurusKaresi = h.tanim.vurusKaresi;
    if (h.tanim.hamleKaresi !== undefined) e.hamleKaresi = h.tanim.hamleKaresi;
    if (h.tanim.donusKaresi !== undefined) e.donusKaresi = h.tanim.donusKaresi;
    if (ayak) { e.ayakX = ayak.x; e.ayakY = ayak.y; }
    animasyonlar[rol] = e;
  }
  const atlas: FusionAtlas = {
    surum: 1, fusionId: a.fusionId, ad: a.name, basDex: a.head.id, govdeDex: a.body.id,
    golgeBoyu: govdeVeri.golgeBoyu, palet: paletKaydi(govdePalet, basPalet), animasyonlar,
    ...(shiny ? { shiny: { hue: a.hue, doygunluk: SHINY_DOYGUNLUK } } : {}),
    ...(kontrast ? { kontrast: { capa: kontrast.capa, katsayi: Math.round(kontrast.katsayi * 100) / 100 } } : {}),
    kredi: {
      govde: { dex: a.body.id, ad: a.body.name, sanatcilar: govdeK.kredi },
      bas: { dex: a.head.id, ad: a.head.name, sanatcilar: basK.kredi },
      kartResmi: a.artists, lisans: "CC BY-NC 4.0 (PMD SpriteCollab)",
    },
    uretim: { tarih: new Date().toISOString(), arac: ARAC, kaynakSprite: a.sprite },
    ...(uyarilar.length ? { uyarilar } : {}),
  };
  await writeFile(join(klasorYolu, "atlas.json"), JSON.stringify(atlas, null, 1) + "\n");
  return {
    durum: "uretildi", uyarilar, shiny, kontrastKatsayisi: kontrast?.katsayi,
    boyun: { kare: toplamKare - basSizKare, koprulendi: boyunKoprulendi, atlandi: boyunAtlandi },
  };
}

/** public/fusion/liste.json: Lab'ın okuyacağı özet (atlası olan her fusion). */
async function listeYaz(gecmis: Acilis[]): Promise<number> {
  const harita = new Map(gecmis.map((g) => [g.fusionId, g]));
  const liste: FusionListeKaydi[] = readdirSync(CIKTI, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(CIKTI, d.name, "atlas.json")))
    .map((d) => {
      const atlas = JSON.parse(readFileSync(join(CIKTI, d.name, "atlas.json"), "utf8")) as FusionAtlas;
      const g = harita.get(d.name);
      return {
        fusionId: d.name, ad: atlas.ad, kartResmi: g?.sprite ?? atlas.uretim.kaynakSprite, sahip: g?.user ?? "",
        sanatcilar: atlas.kredi.kartResmi, govde: atlas.kredi.govde.ad, bas: atlas.kredi.bas.ad,
        animasyonlar: Object.keys(atlas.animasyonlar), uyarilar: atlas.uyarilar ?? [],
        ...(atlas.shiny ? { shiny: { hue: atlas.shiny.hue } } : {}),
      };
    })
    .sort((a, b) => a.fusionId.localeCompare(b.fusionId, "en", { numeric: true }));
  await writeFile(join(CIKTI, "liste.json"), JSON.stringify(liste, null, 1) + "\n");
  return liste.length;
}

async function main() {
  const secenek = argumanlar(process.argv.slice(2));
  const gecmis = json<Acilis[]>("veri/gecmis.json");
  const kartlar = json<Record<string, unknown>>("veri/kartlar.json");
  const kapsama = json<Record<string, KapsamaKaydi>>("veri/spritecollab-kapsama.json");

  let secilen: Acilis[];
  if (secenek.mevcut) {
    const var_ = new Set(readdirSync(CIKTI, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(CIKTI, d.name, "atlas.json"))).map((d) => d.name));
    secilen = gecmis.filter((g) => var_.has(g.fusionId) && uygunMu(g, kapsama, kartlar)).sort((x, y) => x.fusionId.localeCompare(y.fusionId, "en", { numeric: true }));
  } else if (secenek.idler.length) {
    secilen = secenek.idler.map((id) => {
      const g = gecmis.find((x) => x.fusionId === id);
      if (!g) throw new Error(`gecmis.json'da yok: ${id}`);
      if (!uygunMu(g, kapsama, kartlar)) throw new Error(`${id}: kart gövdesi ya da sprite kapsaması yetersiz`);
      return g;
    });
  } else {
    const uygun = gecmis.filter((g) => uygunMu(g, kapsama, kartlar)).sort((a, b) => a.fusionId.localeCompare(b.fusionId));
    const rnd = tohumlu(secenek.tohum);
    for (let i = uygun.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [uygun[i], uygun[j]] = [uygun[j]!, uygun[i]!]; }
    secilen = uygun.slice(0, secenek.rastgele);
  }

  let uretildi = 0, atlandi = 0, kopukKare = 0, koprulenen = 0, toplamBasKare = 0, shinyUretildi = 0, kontrastlanan = 0;
  const hatalar: string[] = [];
  for (const a of secilen) {
    try {
      const s = await uret(a, kapsama, secenek);
      if (s.durum === "atlandi") { atlandi++; continue; }
      uretildi++;
      if (s.boyun) { toplamBasKare += s.boyun.kare; koprulenen += s.boyun.koprulendi; kopukKare += s.boyun.koprulendi + s.boyun.atlandi; }
      if (s.shiny) shinyUretildi++;
      if (s.kontrastKatsayisi) kontrastlanan++;
      const ek = [
        s.boyun && s.boyun.koprulendi + s.boyun.atlandi > 0 ? `boyun ${s.boyun.koprulendi}/${s.boyun.koprulendi + s.boyun.atlandi}` : "",
        s.kontrastKatsayisi ? `kontrast×${s.kontrastKatsayisi.toFixed(2)}` : "",
        s.shiny ? `shiny hue ${a.hue}` : "",
      ].filter(Boolean).join(" ");
      console.log(`+ ${a.fusionId} ${a.name} (${a.head.name} baş / ${a.body.name} gövde)${ek ? "  " + ek : ""}${s.uyarilar.length ? "  UYARI: " + s.uyarilar.join(",") : ""}`);
    } catch (h) {
      hatalar.push(`${a.fusionId} ${a.name}: ${h instanceof Error ? h.message : String(h)}`);
      console.error(`! ${hatalar.at(-1)}`);
    }
  }
  const n = await listeYaz(gecmis);
  console.log(`üretilen ${uretildi}, atlanan ${atlandi}, hata ${hatalar.length}; liste.json ${n} fusion`);
  console.log(`boyun: ${toplamBasKare} baş karesinde ${kopukKare} kopuk (${koprulenen} köprülendi); kontrast düzeltilen ${kontrastlanan}; shiny ${shinyUretildi}`);
  if (hatalar.length) process.exit(1);
}

main().catch((h) => { console.error(h instanceof Error ? h.stack : h); process.exit(1); });
