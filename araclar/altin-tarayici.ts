// Çapraz motor determinizm (flint § 2 test 3): test/altin/*.json senaryolarını headless Chromium'da (V8) koşar,
// Node'daki .hash dosyalarıyla karşılaştırır. Sim kodu esbuild ile tek IIFE paketi olur (aynı kaynak).
// Çalıştır: npm run test:tarayici   (Playwright gerekir: require('playwright'), chromium.launch())
import { readFileSync, readdirSync } from "node:fs";
import { build } from "esbuild";
import { altinCalistir, type AltinSenaryo } from "../test/altin/calistir.ts";

import { chromium } from "./pw.ts";

const KLASOR = new URL("../test/altin/", import.meta.url);
const paket = await build({ entryPoints: [new URL("../test/altin/tarayiciGiris.ts", import.meta.url).pathname], bundle: true, format: "iife", write: false, target: "es2022", platform: "browser" });
const kod = paket.outputFiles[0]!.text;

const tarayici = await chromium.launch();
const sayfa = await tarayici.newPage();
const hatalar: string[] = [];
sayfa.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text()); });
sayfa.on("pageerror", (e) => hatalar.push(String(e)));
await sayfa.setContent("<!doctype html><html><body></body></html>");
await sayfa.addScriptTag({ content: kod });
const surum = tarayici.version();

let kirmizi = 0;
console.log(`Chromium ${surum} · Node ${process.version}`);
console.log("senaryo".padEnd(16), "beklenen (.hash)".padEnd(18), "node".padEnd(18), "chromium".padEnd(18), "sonuç");
for (const f of readdirSync(KLASOR).filter((x) => x.endsWith(".json")).sort((a, b) => a.localeCompare(b))) {
  const s = JSON.parse(readFileSync(new URL(f, KLASOR), "utf8")) as AltinSenaryo;
  const beklenen = readFileSync(new URL(f.replace(/\.json$/, ".hash"), KLASOR), "utf8").trim();
  const node = altinCalistir(s).hash;
  const krom = await sayfa.evaluate((x) => (globalThis as unknown as { altin: (s: unknown) => { hash: string } }).altin(x).hash, s as unknown);
  const ok = node === beklenen && krom === beklenen;
  if (!ok) kirmizi++;
  console.log(s.senaryo.padEnd(16), beklenen.padEnd(18), node.padEnd(18), krom.padEnd(18), ok ? "AYNI" : "FARKLI");
}
await tarayici.close();
if (hatalar.length) { console.error("Tarayıcı hataları:", hatalar); kirmizi++; }
console.log(kirmizi === 0 ? "Node ve Chromium bit bit aynı." : `${kirmizi} uyuşmazlık`);
process.exit(kirmizi === 0 ? 0 : 1);
