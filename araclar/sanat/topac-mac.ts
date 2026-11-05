// Mac hattı: Tripo GLB → simetrik render → biçim B şeritleri + Gemini ikonları (docs/art/topac-uretim-istegi.md § 3-6).
//
//   npx tsx araclar/sanat/topac-mac.ts --parca ok-govde,hafif-disk,duz-uc,kor-goktasi
//   npx tsx araclar/sanat/topac-mac.ts --parca ok-govde --onizle     # yalnız kare 0 albedo (eksen/ters kontrolü)
//   ... --render-yok    # .cache/topac-mac-ham önbelleğini kullan, yalnız pişir
//   ... --ikon-yok      # ikonları atla
//
// Girdi (depo dışı, art-source/topac/): glb/<id>.glb (tripo_model.mjs --alan topac), ikon-ham/<id>.png (gemini_uret.py topac-ikon).
// Çıktı: public/topac/<tur>/<id>.json + <id>-<kademe>-<yon>[-<boya>].png (biçim B), public/topac/ikon/<id>-48.png / -24.png,
// docs/art/topac-mac-onizleme.png (kontakt levha), docs/art/topac-mac-kiyas.png (referans 07 | bulut | Mac).
// Işık, rampa, dither, çizgi ve hız kademeleri bulut hattıyla aynı pişirici (topac-uret.ts parcaPisir); fark: geometri
// Tripo'dan (simetrileştirilmiş) ve ton doku albedosuyla modüle (Tripo'nun el boyası oluk/kenar ayrıntısı).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  ELEMENTLER, SANAT, anaSinif, disCizgi, parcaPisir, pngYaz, rampa, ustOlcu, yapistir,
  type Boya, type KatalogParca, type Parca3B, type RGBA, type Tur,
} from "./topac-uret.ts";

const KOK = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const KAYNAK = join(KOK, "art-source", "topac");
const HAM = join(KOK, ".cache", "topac-mac-ham");
const CIKTI = join(KOK, "public", "topac");

/** Parça başına Mac ayarı: eksen (auto = bbox'ın en ince ekseni), ters (alt/üst), sınıf kuralları. Parti 2-3 buraya eklenir. */
const MAC: Record<string, { eksen?: "auto" | "x" | "y" | "z"; ters?: boolean; kural?: Record<string, number | boolean> }> = {
  "ok-govde": { kural: { gobekR: 11.5 } },
  // Parti 2: konsept boyası mat kırmızı, sınıf renkten (renkli)
  "kalkan-govde": { kural: { renkli: true } },
  "savrulan-govde": { kural: { renkli: true } }, // 2. model (yassı konsept); ilki art-source glb/savrulan-govde-1.glb
  "halka-govde": { kural: { renkli: true } },
  "ayaz-govde": { kural: { renkli: true } },
  "dusurucu-govde": { kural: { renkli: true, altin: true } },
  "sivri-govde": { kural: { renkli: true, altin: true } },
  "izli-govde": { kural: { renkli: true, beyaz: true } },
  "hafif-disk": {},
  "duz-uc": { eksen: "z" }, // koni: PCA güvenilmez (yassı değil)
  "kor-goktasi": {},
};

function hedef(spec: Parca3B): { R: number; zAlt: number; zUst: number } {
  const o = ustOlcu(spec);
  const xy = (SANAT.xyOlcek as Record<string, number>)[spec.tur] ?? 1;
  const tor = spec.torna as number[][] | undefined;
  if (tor) return { R: o.disYaricap * xy, zAlt: tor[0]![1]!, zUst: o.ustZ };
  const prof = (spec.profil as number[][] | undefined) ?? [[0, 0]];
  const halka = (spec.halkalar as { yukseklik: number }[] | undefined) ?? [];
  const faset = (spec.fasetler as { tepe: number }[] | undefined) ?? [];
  const zUst = Math.max(...prof.map((p) => p[1]!), ...faset.map((f) => f.tepe)) + Math.max(0, ...halka.map((h) => h.yukseklik)) * 0.5;
  return { R: o.disYaricap * xy, zAlt: (spec.zAlt as number | undefined) ?? SANAT.govdeTabanZ, zUst };
}

function blenderCalistir(idler: string[], specler: Record<string, Parca3B>, onizle: boolean): void {
  mkdirSync(HAM, { recursive: true });
  const ayar = {
    cikti: HAM,
    onizle,
    inceKare: SANAT.inceKare,
    superOrnek: SANAT.superOrnek,
    kamera: { yukselti: SANAT.yukselti, kareBirim: SANAT.birim, kareW: SANAT.kareW, kareH: SANAT.kareH, capaX: SANAT.capaX, capaY: SANAT.capaY },
    parcalar: idler.map((id) => {
      const s = specler[id]!;
      const m = MAC[id] ?? {};
      const glb = join(KAYNAK, "glb", `${id}.glb`);
      if (!existsSync(glb)) throw new Error(`GLB yok: ${glb}`);
      return { id, glb, glb_cikti: join(CIKTI, "model", `${id}.glb`), tur: s.tur, simetri: s.simetri, kiral: !!s.kiral, eksen: m.eksen ?? "auto", ters: !!m.ters, kural: m.kural ?? {}, hedef: hedef(s) };
    }),
  };
  writeFileSync(join(HAM, "ayar.json"), JSON.stringify(ayar, null, 1));
  const blender = process.env.BLENDER ?? "blender";
  const t0 = Date.now();
  const r = spawnSync(blender, ["-b", "--factory-startup", "-P", join(KOK, "araclar/sanat/blender/topac_glb_render.py"), "--", join(HAM, "ayar.json")], { encoding: "utf8", maxBuffer: 1 << 28 });
  const cikti = r.stdout + r.stderr;
  for (const s of cikti.split("\n")) if (/^(PARCA|SIMETRI|UYARI)/.test(s)) console.log(s);
  if (r.status !== 0 || /Traceback|Error:/.test(cikti)) {
    console.error(cikti.split("\n").filter((s) => /Traceback|Error|File "|^\s/.test(s)).slice(-30).join("\n"));
    throw new Error(`Blender başarısız (kod ${r.status})`);
  }
  console.log(`render: ${idler.length} parça, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

// ------------------------------------------------------------------ biçim B şeritleri

async function seritYaz(dosya: string, kareler: RGBA[]): Promise<number> {
  const W = SANAT.kareW, H = SANAT.kareH;
  const sw = W * kareler.length;
  const out = new Uint8ClampedArray(sw * H * 4);
  kareler.forEach((k, i) => yapistir(out, sw, k, W, H, i * W, 0));
  return pngYaz(dosya, out, sw, H);
}

type Onizleme = Map<string, RGBA[][]>;

async function bicimBYaz(id: string, spec: Parca3B, onizleme: Onizleme): Promise<number> {
  const yonler: ("s" | "l")[] = spec.kiral ? ["s", "l"] : ["s"];
  const boyalar = spec.tur === "govde" ? ELEMENTLER : null;
  let bayt = 0;
  for (const yon of yonler) {
    for (const b of boyalar ?? ["-"]) {
      const o = onizleme.get(`${b}:${yon}`);
      if (!o) throw new Error(`kare yok: ${id} ${b}:${yon}`);
      const ek = boyalar ? `-${b}` : "";
      for (const [i, kd] of (["keskin", "bulanik", "disk"] as const).entries()) {
        bayt += await seritYaz(join(CIKTI, spec.tur, `${id}-${kd}-${yon}${ek}.png`), o[i]!);
      }
    }
  }
  const o = ustOlcu(spec);
  const json = {
    surum: 2, parcaId: id, tur: spec.tur, kare: [SANAT.kareW, SANAT.kareH], capa: [SANAT.capaX, SANAT.capaY], birim: SANAT.birim,
    yukselti: SANAT.yukselti, simetri: spec.simetri, periyotKare: SANAT.periyotKare, diskKare: SANAT.diskKare, yonler, boyalar,
    ustZ: o.ustZ, disYaricap: o.disYaricap, kaynak: "gemini-3.1-flash-image + tripo v3.1-20260211 + blender 5.2 (simetrik dilim) + topac-uret pişirici",
    tarih: new Date().toISOString().slice(0, 10), bayt,
  };
  writeFileSync(join(CIKTI, spec.tur, `${id}.json`), JSON.stringify(json, null, 1) + "\n");
  return bayt;
}

// ------------------------------------------------------------------ ikonlar (Gemini 2B → anahtarla → 48/24 kuantize)

function ikonPaleti(tur: Tur, kat: KatalogParca | undefined): number[] {
  const b: Boya = { ad: "", element: kat?.element ?? "kor", koken: kat?.koken ?? "goktasi" };
  const sinif: Record<Tur, Parameters<typeof rampa>[0][]> = {
    govde: ["boya", "metal"], disk: ["metal"], uc: ["koyu", "metal", "lastik"], cekirdek: ["cerceve", "kubbe", "altin"],
  };
  return [...new Set(sinif[tur].flatMap((s) => rampa(s, b)))];
}

async function ikonUret(id: string, tur: Tur, kat: KatalogParca | undefined): Promise<void> {
  const ham = join(KAYNAK, "ikon-ham", `${id}.png`);
  const alfa = join(KAYNAK, "ikon-alfa", `${id}.png`);
  mkdirSync(dirname(alfa), { recursive: true });
  const py = join(process.env.HOME ?? "", ".venvs/uo-asset/bin/python");
  const r = spawnSync(py, ["-I", join(KOK, "araclar/sanat/anahtarla.py"), "512", ham, alfa], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`anahtarla başarısız: ${r.stderr.slice(-400)}`);
  const palet = ikonPaleti(tur, kat).map((c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255] as const);
  const b: Boya = { ad: "", element: kat?.element ?? "kor", koken: kat?.koken ?? "goktasi" };
  const cizgi = rampa(anaSinif(tur), b)[0];
  for (const kare of [48, 24]) {
    const ic = kare - 4; // 1 px çizgi + 1 px pay
    const { data, info } = await sharp(alfa).resize(ic, ic, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: "lanczos3" })
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const img = new Uint8ClampedArray(kare * kare * 4);
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const s = (y * info.width + x) * 4;
        if (data[s + 3]! < 128) continue;
        let en = 0, enD = 1e12;
        for (let i = 0; i < palet.length; i++) {
          const p = palet[i]!;
          const dr = data[s]! - p[0], dg = data[s + 1]! - p[1], db = data[s + 2]! - p[2];
          const dd = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
          if (dd < enD) { enD = dd; en = i; }
        }
        const d = ((y + 2) * kare + (x + 2)) * 4;
        img[d] = palet[en]![0]; img[d + 1] = palet[en]![1]; img[d + 2] = palet[en]![2]; img[d + 3] = 255;
      }
    }
    await pngYaz(join(CIKTI, "ikon", `${id}-${kare}.png`), disCizgi(img, kare, kare, cizgi), kare, kare);
  }
}

// ------------------------------------------------------------------ kontakt levha ve kıyas

function birlestir(set: Record<Tur, Onizleme>, diskUstZ: number, boya: string, kademe: number, f: number, yon: "s" | "l"): RGBA {
  const W = SANAT.kareW, H = SANAT.kareH;
  const kayma = Math.round(((diskUstZ - SANAT.govdeTabanZ) * Math.cos((SANAT.yukselti * Math.PI) / 180)) / SANAT.birim);
  const out = new Uint8ClampedArray(W * H * 4);
  for (const [tur, dy] of [["uc", 0], ["disk", 0], ["govde", -kayma], ["cekirdek", -kayma]] as const) {
    const o = set[tur];
    const k = o.get(`${tur === "govde" ? boya : "-"}:${yon}`) ?? o.get(`${tur === "govde" ? boya : "-"}:s`);
    if (!k) continue;
    const kad = k[kademe]!;
    const kare = kad[f % kad.length]!;
    const kay = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) {
      const yy = y - dy;
      if (yy < 0 || yy >= H) continue;
      kay.set(kare.subarray(yy * W * 4, (yy + 1) * W * 4), y * W * 4);
    }
    yapistir(out, W, kay, W, H, 0, 0);
  }
  return out;
}

async function levhaYaz(set: Record<Tur, Onizleme>, diskUstZ: number, ikonIdler: string[]): Promise<void> {
  const W = SANAT.kareW, H = SANAT.kareH, tile = W + 4, sutun = 8;
  const satirlar: RGBA[][] = [];
  for (let kd = 0; kd < 3; kd++) satirlar.push(Array.from({ length: kd === 2 ? SANAT.diskKare : sutun }, (_, f) => birlestir(set, diskUstZ, "kor", kd, f, "s")));
  satirlar.push(Array.from({ length: sutun }, (_, f) => birlestir(set, diskUstZ, "kor", 0, f, "l")));
  satirlar.push(ELEMENTLER.map((e) => birlestir(set, diskUstZ, e, 0, 1, "s")));
  // ayrık katmanlar: Uç, Disk, Gövde (Kor), Çekirdek, keskin kare 0
  satirlar.push((["uc", "disk", "govde", "cekirdek"] as const).map((t) => set[t].get(`${t === "govde" ? "kor" : "-"}:s`)![0]![0]!));
  const tw = sutun * tile, th = satirlar.length * tile + 52;
  const levha = new Uint8ClampedArray(tw * th * 4);
  for (let i = 0; i < tw * th; i++) { levha[i * 4] = 0x4a; levha[i * 4 + 1] = 0x46; levha[i * 4 + 2] = 0x42; levha[i * 4 + 3] = 255; }
  satirlar.forEach((s, ri) => s.forEach((img, ci) => yapistir(levha, tw, img, W, H, ci * tile + 2, ri * tile + 2)));
  // ikon satırı: 48'ler ve 24'ler
  let x = 2;
  for (const id of ikonIdler) {
    for (const k of [48, 24]) {
      const yol = join(CIKTI, "ikon", `${id}-${k}.png`);
      if (!existsSync(yol)) continue;
      const { data } = await sharp(yol).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      yapistir(levha, tw, new Uint8ClampedArray(data), k, k, x, satirlar.length * tile + 2);
      x += k + 4;
    }
  }
  const olcek = 4;
  await sharp(Buffer.from(levha.buffer), { raw: { width: tw, height: th, channels: 4 } }).resize(tw * olcek, th * olcek, { kernel: "nearest" }).png()
    .toFile(join(KOK, "docs/art/topac-mac-onizleme.png"));

  // kıyas: referans 07 kırpıntısı | bulut spike'ı (keskin kare 0) | Mac (keskin kare 0), aynı ×6 ölçek
  const o = 6;
  const ref = await sharp(join(KOK, "docs/design/beyblade/gorunum/07-arena-mac.jpg")).extract({ left: 548, top: 318, width: 160, height: 140 })
    .resize(Math.round((160 / 2.87) * o * 1.4), Math.round((140 / 2.87) * o * 1.4), { kernel: "nearest" }).png().toBuffer();
  const bulut = await sharp(join(KOK, "docs/art/topac-sprite-onizleme.png")).extract({ left: 8, top: 8, width: W * 4, height: H * 4 })
    .resize(W * o, H * o, { kernel: "nearest" }).png().toBuffer();
  const mac = await sharp(Buffer.from(birlestir(set, diskUstZ, "kor", 0, 0, "s").buffer), { raw: { width: W, height: H, channels: 4 } })
    .resize(W * o, H * o, { kernel: "nearest" }).png().toBuffer();
  const rm = await sharp(ref).metadata();
  const pay = 24, gw = (rm.width ?? 0) + 2 * W * o + 4 * pay, gh = Math.max(rm.height ?? 0, H * o) + 2 * pay;
  await sharp({ create: { width: gw, height: gh, channels: 4, background: "#4a4642" } })
    .composite([
      { input: ref, left: pay, top: pay },
      { input: bulut, left: (rm.width ?? 0) + 2 * pay, top: pay },
      { input: mac, left: (rm.width ?? 0) + W * o + 3 * pay, top: pay },
    ])
    .png().toFile(join(KOK, "docs/art/topac-mac-kiyas.png"));
}

/** Gövde levhası: her Gövde, setin Disk/Uç/Çekirdeğiyle, katalog Element boyasında: keskin 0-3, bulanık 0, disk 0, sol 0. */
async function govdeLevhasi(govdeler: [string, Onizleme][], set: Record<Tur, Onizleme>, diskUstZ: number, katalog: Map<string, KatalogParca>): Promise<void> {
  const W = SANAT.kareW, H = SANAT.kareH, tile = W + 4, sutun = 7;
  const tw = sutun * tile, th = govdeler.length * tile;
  const levha = new Uint8ClampedArray(tw * th * 4);
  for (let i = 0; i < tw * th; i++) { levha[i * 4] = 0x4a; levha[i * 4 + 1] = 0x46; levha[i * 4 + 2] = 0x42; levha[i * 4 + 3] = 255; }
  govdeler.forEach(([id, o], ri) => {
    const boya = katalog.get(id)?.element ?? "kor";
    const s2 = { ...set, govde: o };
    const kareler = [0, 1, 2, 3].map((f) => birlestir(s2, diskUstZ, boya, 0, f, "s"));
    kareler.push(birlestir(s2, diskUstZ, boya, 1, 0, "s"), birlestir(s2, diskUstZ, boya, 2, 0, "s"), birlestir(s2, diskUstZ, boya, 0, 0, "l"));
    kareler.forEach((k, ci) => yapistir(levha, tw, k, W, H, ci * tile + 2, ri * tile + 2));
  });
  await sharp(Buffer.from(levha.buffer), { raw: { width: tw, height: th, channels: 4 } }).resize(tw * 3, th * 3, { kernel: "nearest" }).png()
    .toFile(join(KOK, "docs/art/topac-mac-govdeler.png"));
}

// ------------------------------------------------------------------ liste metaları

/** Üretilen kimlikleri veri/topac-gorsel.json `bicimB` ve veri/topac-model.json `glb` listelerine ekler (sıra katalog sırası). */
function listeleriGuncelle(idler: string[], katalogSirasi: string[]): void {
  const sirala = (l: string[]) => katalogSirasi.filter((id) => l.includes(id));
  const gorsel = join(KOK, "veri/topac-gorsel.json");
  const g = JSON.parse(readFileSync(gorsel, "utf8")) as { bicimB?: string[] };
  g.bicimB = sirala([...new Set([...(g.bicimB ?? []), ...idler])]);
  writeFileSync(gorsel, JSON.stringify(g, null, 1) + "\n");
  const model = join(KOK, "veri/topac-model.json");
  const m = JSON.parse(readFileSync(model, "utf8")) as { glb: string[] };
  m.glb = sirala([...new Set([...m.glb, ...idler.filter((id) => existsSync(join(CIKTI, "model", `${id}.glb`)))])]);
  writeFileSync(model, JSON.stringify(m, null, 1) + "\n");
  console.log(`bicimB: ${g.bicimB.length} parça, glb: ${m.glb.length} parça`);
}

// ------------------------------------------------------------------ ana

async function main(): Promise<void> {
  const arg = process.argv.slice(2);
  const idler = arg.includes("--parca") ? arg[arg.indexOf("--parca") + 1]!.split(",") : Object.keys(MAC);
  const onizle = arg.includes("--onizle");
  const specler = (JSON.parse(readFileSync(join(KOK, "kaynak/topac/parcalar-3b.json"), "utf8")) as { parcalar: Record<string, Parca3B> }).parcalar;
  const katalog = new Map((JSON.parse(readFileSync(join(KOK, "veri/parcalar.json"), "utf8")) as { parcalar: KatalogParca[] }).parcalar.map((p) => [p.id, p]));
  for (const id of idler) if (!specler[id]) throw new Error(`bilinmeyen parça: ${id}`);
  if (!arg.includes("--render-yok")) blenderCalistir(idler, specler, onizle);
  if (onizle) {
    for (const id of idler) console.log(join(HAM, specler[id]!.tur, id, "s", "00_t.png"));
    return;
  }
  const set: Partial<Record<Tur, Onizleme>> = {};
  const govdeler: [string, Onizleme][] = [];
  let diskUstZ: number = SANAT.govdeTabanZ;
  for (const id of idler) {
    const spec = specler[id]!;
    const { onizleme } = await parcaPisir(id, spec, katalog.get(id), { ham: HAM, yaz: false });
    const bayt = await bicimBYaz(id, spec, onizleme);
    console.log(`biçim B: ${id} (${(bayt / 1024).toFixed(1)} KB)`);
    if (spec.tur === "govde") govdeler.push([id, onizleme]);
    if (spec.tur !== "govde" || id === "ok-govde" || !set.govde) set[spec.tur] = onizleme;
    if (spec.tur === "disk") diskUstZ = ustOlcu(spec).ustZ;
    if (!arg.includes("--ikon-yok") && existsSync(join(KAYNAK, "ikon-ham", `${id}.png`))) await ikonUret(id, spec.tur, katalog.get(id));
  }
  listeleriGuncelle(idler, [...katalog.keys()]);
  if (set.govde && set.disk && set.uc && set.cekirdek) {
    await levhaYaz(set as Record<Tur, Onizleme>, diskUstZ, idler);
    console.log("levha: docs/art/topac-mac-onizleme.png, kıyas: docs/art/topac-mac-kiyas.png");
    if (govdeler.length > 1) { await govdeLevhasi(govdeler, set as Record<Tur, Onizleme>, diskUstZ, katalog); console.log("gövde levhası: docs/art/topac-mac-govdeler.png"); }
  }
}

await main();
