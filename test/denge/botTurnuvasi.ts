// Bot turnuvası (tuning § 20 H1-H5; vitest dışı). Çalıştır:
//   npx tsx test/denge/botTurnuvasi.ts [--n=40] [--maç=200] [--ref=20] [--tohum=1] [--vRO=170] [--kEgim=400]
//     [--kH=0.007] [--tikTavan=1.0] [--iyilesme=0.4] [--duvarOlayHizi=40] [--json=yol]
// Çıktı: 4×4 düello kazanma matrisi (S/K/D/B, n tur/hücre), referans takım maç matrisi, bitiş dağılımı,
// tur ve maç süresi dağılımı (medyan, p90, p99), 20 rastgele build × 200 maç kazanma bandı; hedef karşılaştırması.
import { writeFileSync } from "node:fs";
import { type DeneyAyari, ozet, turnuva } from "./turnuva.ts";

const arg = (ad: string): string | undefined => process.argv.find((a) => a.startsWith(`--${ad}=`))?.split("=")[1];
const sayi = (ad: string): number | undefined => (arg(ad) === undefined ? undefined : Number(arg(ad)));
const ayar: DeneyAyari = {};
for (const k of ["vRO", "kEgim", "kH", "tikTavan", "iyilesme", "duvarOlayHizi"] as const) { const v = sayi(k); if (v !== undefined) ayar[k] = v; }

const bas = Date.now();
const r = turnuva({ nDuello: sayi("n") ?? 40, nRastgeleMac: sayi("maç") ?? 200, nReferansMac: sayi("ref") ?? 20, tohum: sayi("tohum") ?? 1, ayar });
const yuzde = (x: number) => `${(100 * x).toFixed(0).padStart(3)}%`;

console.log(`# Bot turnuvası · ayar ${JSON.stringify(ayar)} · ${((Date.now() - bas) / 1000).toFixed(1)} s`);
console.log("\n## Düello (tek tur, satır kazanma %, n=%d/hücre, yarısında taraf değişir; berabere 0,5)", r.duelloMatrisi[0]!.n);
const ad = ["S", "K", "D", "B"];
console.log("     " + ad.map((x) => x.padStart(5)).join(""));
for (const a of ad) console.log(a.padEnd(5) + ad.map((b) => yuzde(r.duelloMatrisi.find((x) => x.satir === a && x.sutun === b)!.kazanma).padStart(5)).join("") + "   ort tur s: " + ad.map((b) => r.duelloMatrisi.find((x) => x.satir === a && x.sutun === b)!.ortSure.toFixed(1)).join(" "));
const db = r.duelloBitis;
console.log(`düello bitişleri: Durma ${db.durma} · Ring Out ${db.ringOut} · Parçalanma ${db.parcalanma} · berabere ${db.berabere} · 90 s sınır ${db.sure} / ${db.toplam}`);

console.log("\n## Referans takım maçları (3'lü; '-S' = S dışarıda), satır kazanma %, n=%d", r.referansMacMatrisi[0]!.n);
const tk = ["-S", "-K", "-D", "-B"];
console.log("     " + tk.map((x) => x.padStart(5)).join(""));
for (const a of tk) console.log(a.padEnd(5) + tk.map((b) => yuzde(r.referansMacMatrisi.find((x) => x.satir === a && x.sutun === b)!.kazanma).padStart(5)).join(""));

const b = r.bitis;
const p = (x: number) => `${((100 * x) / b.toplam).toFixed(1)}%`;
console.log(`\n## Maç içi bitiş dağılımı (${b.toplam} tur, ${r.maclar} maç)`);
console.log(`Durma ${p(b.durma)} · Ring Out ${p(b.ringOut)} · Parçalanma ${p(b.parcalanma)} · berabere ${p(b.berabere)}`);
console.log(`tur süresi (s): medyan ${r.turSuresi.medyan.toFixed(1)} · p90 ${r.turSuresi.p90.toFixed(1)} · p99 ${r.turSuresi.p99.toFixed(1)}`);
console.log(`maç süresi (s, saat): medyan ${r.macSuresi.medyan.toFixed(1)} · p90 ${r.macSuresi.p90.toFixed(1)} · p99 ${r.macSuresi.p99.toFixed(1)} · en çok ${r.macSuresi.enFazla.toFixed(1)}`);
console.log(`maç bitiş nedeni: ${JSON.stringify(r.macNedeni)} · geri çek/maç ${r.geriCekOrt.toFixed(2)}`);
console.log(`yetenek kullanımı / maç (iki oyuncu): Yetenek ${r.yetenekMac[0].toFixed(2)} · Özel ${r.yetenekMac[1].toFixed(2)} · Ulti ${r.yetenekMac[2].toFixed(2)} · Takım Ultisi ${r.yetenekMac[3].toFixed(2)} · Ulti görülen maç %${(100 * r.ultiMacOrani).toFixed(0)} · Takım Ultisi görülen maç %${(100 * r.takimUltiMacOrani).toFixed(0)}`);

console.log("\n## 20 rastgele build (200 maç) kazanma");
for (const x of [...r.rastgeleBuildKazanma].sort((a, c) => c.kazanma - a.kazanma)) console.log(`${yuzde(x.kazanma)}  n=${String(x.n).padStart(3)}  ${x.tip.padEnd(10)} ${x.build}`);

const hedef = (ad2: string, ok: boolean, deger: string) => console.log(`${ok ? "TUTUYOR " : "TUTMUYOR"}  ${ad2}: ${deger}`);
console.log("\n## Hedefler");
hedef("maç süresi medyan 40-90 s", r.macSuresi.medyan >= 40 && r.macSuresi.medyan <= 90, r.macSuresi.medyan.toFixed(1));
hedef("maç süresi p99 ≤ 120 s", r.macSuresi.p99 <= 120, r.macSuresi.p99.toFixed(1));
hedef("kazanma bandı %35-65 (20 build)", r.bandIci === 20, `${r.bandIci}/20 bant içinde`);
hedef("Ring Out payı %25-35 (H1)", b.ringOut / b.toplam >= 0.25 && b.ringOut / b.toplam <= 0.35, p(b.ringOut));
console.log("\nÖZET " + ozet(r));
const j = arg("json");
if (j) writeFileSync(j, JSON.stringify(r, null, 1));
