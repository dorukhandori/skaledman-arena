// H-H5 (docs/design/harita/06 § 5, 00 G-3): dövme parça bot turnuvası. Her dövme parça, yuvasına uyan dört referans
// build'e (tuning § 13 S/K/D/B) takılır → dövme build; her dövme build × 4 referans build, tek tur düello
// (`test/denge/turnuva.ts` `duello`, Topaç Lab tekTur kipi), N düello × 3 tohum, yarısında taraf değişir. Kıyas tabanı:
// aynı build'in dövme parçasız hâli (ev sahibi referans) aynı tohumlarda. Sim değişmez; parçalar katalogdan değil
// `veri/parcalar-dovme.json`'dan profil kurucuya doğrudan verilir (bayrak kapalıyken katalogda değiller).
//
// Çalıştır:  npx tsx araclar/dovme-parca-turnuvasi.ts [--n=1000] [--tohumlar=1,2,3] [--is=6] [--json=yol]
// Kapı (06 H-H5): kazanım %35-65 (dövme build'in 4 build'lik alana karşı ortalaması); Ring Out payı ev sahibi
// referansa göre ±3 puan. Ayrıca bilgi: rakip başına kazanım ve ev sahibine göre fark; tip etiketi (Kale payı).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import dovmeHam from "../veri/parcalar-dovme.json";
import { REFERANS, duello, type ParcaSecimi } from "../test/denge/turnuva.ts";
import { cekirdekBul, diskBul, govdeBul, ucBul } from "../src/paylasilan/veri/katalog.ts";
import { topacProfiliKurParcalarla, type TopacProfili } from "../src/paylasilan/veri/profil.ts";
import { DiskSema, GovdeSema, UcSema } from "../src/paylasilan/veri/semalar.ts";
import type { Disk, Govde, Uc } from "../src/paylasilan/veri/semalar.ts";

const dovme = { katman: z.literal("dovme"), fiyat: z.null() };
const DovmeSema = z.object({
  surum: z.number().int(),
  parcalar: z.array(z.discriminatedUnion("tur", [GovdeSema.extend(dovme), DiskSema.extend(dovme), UcSema.extend(dovme)])),
});
export const DOVME = DovmeSema.parse(dovmeHam).parcalar;
type DovmeParca = (typeof DOVME)[number];

const ADLAR = ["S", "K", "D", "B"] as const;
type Ad = (typeof ADLAR)[number];
export const BANT = { kazanma: [0.35, 0.65], ringOutPuan: 0.03 } as const;

interface Build { ad: string; ev: Ad; parca: string | null; secim: ParcaSecimi; es?: string }

/** Katalog eşi (03 § 4.3 "Kıyas" sütunu): dövme parçanın yan-grade kıyaslandığı mevcut parça. */
export const ES: Record<string, string> = { "dag-diski": "agir-disk", "kiragi-ucu": "top-uc", "koz-govde": "ok-govde" };

/** Profil: referans parçaları katalogdan, dövme parça (varsa) veri dosyasından. */
function profilKur(b: Build): TopacProfili {
  const p = b.parca ? DOVME.find((x) => x.id === b.parca)! : null;
  const g = p?.tur === "govde" ? (p as unknown as Govde) : govdeBul(b.secim.govde);
  const d = p?.tur === "disk" ? (p as unknown as Disk) : diskBul(b.secim.disk);
  const u = p?.tur === "uc" ? (p as unknown as Uc) : ucBul(b.secim.uc);
  return topacProfiliKurParcalarla(cekirdekBul(b.secim.cekirdek), g, d, u);
}

export function dovmeBuildleri(): Build[] {
  const r: Build[] = [];
  for (const p of DOVME) for (const ev of ADLAR) {
    const s = REFERANS[ev];
    const secim: ParcaSecimi = { ...s, [p.tur]: p.id };
    r.push({ ad: `${p.id}@${ev}`, ev, parca: p.id, secim });
  }
  return r;
}

/** Eş build'ler: dövme parçanın yerine katalog eşi (ör. agir-disk@S); ev sahibi zaten eşi taşıyorsa atlanır. */
export function esBuildleri(): Build[] {
  const r: Build[] = [];
  for (const p of DOVME) for (const ev of ADLAR) {
    const es = ES[p.id]!;
    if (REFERANS[ev][p.tur as keyof ParcaSecimi] === es) continue;
    r.push({ ad: `${es}@${ev}`, ev, parca: null, secim: { ...REFERANS[ev], [p.tur]: es }, es: p.id });
  }
  return r;
}
export const referansBuild = (ev: Ad): Build => ({ ad: ev, ev, parca: null, secim: REFERANS[ev] });

interface Hucre { rakip: Ad; kaz: number; n: number; ringOut: number; durma: number; parcalanma: number; tur: number }

/** Bir build'in 4 referansa karşı düelloları (aynı tohum dizisi her build için ortak: eşli kıyas). */
export function buildTurnuvasi(b: Build, n: number, tohumlar: readonly number[]): Hucre[] {
  const pb = profilKur(b);
  return ADLAR.map((rakip) => {
    const pr = profilKur(referansBuild(rakip));
    const h: Hucre = { rakip, kaz: 0, n: 0, ringOut: 0, durma: 0, parcalanma: 0, tur: 0 };
    for (const t of tohumlar) for (let k = 0; k < n; k++) {
      const tohum = t * 1_000_003 + k * 7 + ADLAR.indexOf(rakip) * 100;
      const ters = k % 2 === 1;
      const r = ters ? duello(pr, pb, tohum) : duello(pb, pr, tohum);
      const kazandi = ters ? r.kazanan === 1 : r.kazanan === 0;
      h.n++;
      if (kazandi) h.kaz++;
      else if (r.kazanan === -1) h.kaz += 0.5;
      if (r.tur === "ringOut") h.ringOut++;
      else if (r.tur === "durma") h.durma++;
      else if (r.tur === "parcalanma") h.parcalanma++;
      h.tur++;
    }
    return h;
  });
}

export interface BuildSonucu {
  ad: string; ev: Ad; parca: string | null; es?: string; tip: string; hucreler: Hucre[];
  kazanma: number; ringOutPayi: number;
}

function ozetle(b: Build, h: Hucre[]): BuildSonucu {
  const n = h.reduce((s, x) => s + x.n, 0);
  return {
    ad: b.ad, ev: b.ev, parca: b.parca, ...(b.es ? { es: b.es } : {}), tip: profilKur(b).tip, hucreler: h,
    kazanma: h.reduce((s, x) => s + x.kaz, 0) / n, ringOutPayi: h.reduce((s, x) => s + x.ringOut, 0) / n,
  };
}

export function degerlendir(sonuclar: readonly BuildSonucu[]) {
  return sonuclar.filter((s) => s.parca).map((s) => {
    const ev = sonuclar.find((x) => !x.parca && !x.es && x.ev === s.ev)!;
    // eş: katalog eşini taşıyan build (eş build ya da eşi zaten taşıyan ev sahibi)
    const es = sonuclar.find((x) => x.es === s.parca && x.ev === s.ev) ?? ev;
    const roFark = s.ringOutPayi - ev.ringOutPayi;
    const kazBantta = s.kazanma >= BANT.kazanma[0] && s.kazanma <= BANT.kazanma[1];
    const roBantta = Math.abs(roFark) <= BANT.ringOutPuan;
    return {
      ad: s.ad, parca: s.parca!, ev: s.ev, tip: s.tip, evTip: ev.tip, kazanma: s.kazanma, evKazanma: ev.kazanma, ringOutPayi: s.ringOutPayi,
      evRingOutPayi: ev.ringOutPayi, roFark, esAd: es.ad, esKazanma: es.kazanma, esRingOutPayi: es.ringOutPayi, kazBantta, roBantta, gecti: kazBantta && roBantta,
      rakipBasina: Object.fromEntries(s.hucreler.map((h, i) => [h.rakip, { kaz: h.kaz / h.n, ev: ev.hucreler[i]!.kaz / ev.hucreler[i]!.n }])),
    };
  });
}

const arg = (ad: string): string | undefined => process.argv.find((a) => a.startsWith(`--${ad}=`))?.split("=")[1];
const yuzde = (x: number) => `${(100 * x).toFixed(1).padStart(5)}%`;

async function ana(): Promise<void> {
  const n = Number(arg("n") ?? 1000);
  const tohumlar = (arg("tohumlar") ?? "1,2,3").split(",").map(Number);
  const is = Number(arg("is") ?? 1);
  const json = arg("json");
  const sadece = arg("sadece");
  const bas = Date.now();
  const hepsi: Build[] = [...ADLAR.map(referansBuild), ...dovmeBuildleri(), ...esBuildleri()];
  const secili = sadece ? hepsi.filter((b) => sadece.split(",").includes(b.ad)) : hepsi;
  let sonuclar: BuildSonucu[] = [];
  if (is > 1 && !sadece) {
    const kuyruk = [...hepsi.map((b) => b.ad)];
    const { spawn } = await import("node:child_process");
    const calistir = (ad: string) => new Promise<BuildSonucu[]>((coz, red) => {
      const gecici = `${process.env["TMPDIR"] ?? "/tmp"}/dovme-${process.pid}-${ad.replace("@", "_")}.json`;
      const c = spawn(process.execPath, [...process.execArgv, process.argv[1]!, `--n=${n}`, `--tohumlar=${tohumlar.join(",")}`, `--sadece=${ad}`, `--json=${gecici}`, "--sessiz=1"], { stdio: "inherit" });
      c.on("exit", (kod) => (kod === 0 ? coz(JSON.parse(readFileSync(gecici, "utf8")).buildler as BuildSonucu[]) : red(new Error(`${ad} çıkış ${kod}`))));
    });
    const parcalar: BuildSonucu[][] = [];
    await Promise.all(Array.from({ length: Math.min(is, kuyruk.length) }, async () => {
      for (let ad = kuyruk.shift(); ad !== undefined; ad = kuyruk.shift()) parcalar.push(await calistir(ad));
    }));
    const sira = hepsi.map((b) => b.ad);
    sonuclar = parcalar.flat().sort((a, b) => sira.indexOf(a.ad) - sira.indexOf(b.ad));
  } else {
    for (const b of secili) sonuclar.push(ozetle(b, buildTurnuvasi(b, n, tohumlar)));
  }
  const d = sonuclar.some((s) => !s.parca) && sonuclar.some((s) => s.parca) ? degerlendir(sonuclar) : [];
  if (!arg("sessiz")) {
    console.log(`# H-H5 dövme parça turnuvası · ${n} düello × ${tohumlar.length} tohum (${tohumlar.join(",")}) × 4 rakip / build · ${((Date.now() - bas) / 1000).toFixed(0)} s`);
    console.log("\n## Referans (ev sahibi) build'ler: kazanma, Ring Out payı, rakip başına");
    for (const s of sonuclar.filter((x) => !x.parca && !x.es)) console.log(`${s.ad.padEnd(16)} ${s.tip.padEnd(10)} ${yuzde(s.kazanma)}  RO ${yuzde(s.ringOutPayi)}   ${s.hucreler.map((h) => `${h.rakip}:${yuzde(h.kaz / h.n)}`).join(" ")}`);
    console.log("\n## Dövme build'ler (kapı: kazanma 35-65 %, RO payı ev sahibine göre ±3 puan)");
    for (const x of d) {
      console.log(`${x.ad.padEnd(16)} ${x.tip.padEnd(10)} ${yuzde(x.kazanma)} (ev ${yuzde(x.evKazanma)})  RO ${yuzde(x.ringOutPayi)} (${x.roFark >= 0 ? "+" : ""}${(100 * x.roFark).toFixed(1)} p)  eş ${x.esAd} ${yuzde(x.esKazanma)}  ${x.gecti ? "GEÇTİ" : `KALDI${x.kazBantta ? "" : " [kazanma]"}${x.roBantta ? "" : " [RO]"}`}   ${Object.entries(x.rakipBasina).map(([k, v]) => `${k}:${yuzde(v.kaz)}`).join(" ")}`);
    }
  }
  if (json) writeFileSync(json, JSON.stringify({ n, tohumlar, bant: BANT, buildler: sonuclar, degerlendirme: d }, null, 1));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) void ana();
