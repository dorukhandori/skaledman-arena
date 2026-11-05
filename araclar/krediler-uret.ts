// D8 krediler derleme/denetim betiği: docs/art/krediler.md + veri/manifest-gorsel.json + veri/manifest-ses.json (efekt
// oturumu günceller; burada yalnız OKUNUR) → oyun içi /krediler sayfasının gösterdiği liste (aynı saf kod:
// src/paylasilan/krediler.ts). Eksik dosya boş sayılır. Atıfı eksik manifest kaynağı varsa çıkış kodu 1.
// Çalıştır: npm run krediler:uret  [--json]
import { existsSync, readFileSync } from "node:fs";
import { kredilerDerle } from "../src/paylasilan/krediler.ts";

const oku = (yol: string): string | null => (existsSync(yol) ? readFileSync(yol, "utf8") : null);
const json = (yol: string): unknown => { const m = oku(yol); return m ? JSON.parse(m) : null; };

const k = kredilerDerle(oku("docs/art/krediler.md"), json("veri/manifest-gorsel.json"), json("veri/manifest-ses.json"));
if (process.argv.includes("--json")) { console.log(JSON.stringify(k, null, 1)); process.exit(0); }
console.log(`# Krediler: ${k.bolumler.length} bölüm, ${k.bolumler.reduce((n, b) => n + b.satirlar.length, 0)} satır, MIT bildirimi ${k.bildirim ? "var" : "yok"}`);
for (const b of k.bolumler) console.log(`- ${b.baslik}: ${b.satirlar.length} satır`);
const gruplar = new Map<string, { n: number; bolum: string | null; lisans: Set<string> }>();
for (const x of k.kaynaklar) {
  const g = gruplar.get(x.anahtar) ?? { n: 0, bolum: x.bolum, lisans: new Set<string>() };
  g.n++; g.lisans.add(x.lisans); gruplar.set(x.anahtar, g);
}
console.log(`\n# Manifest kaynakları: ${k.kaynaklar.length}`);
for (const [a, g] of gruplar) console.log(`${g.bolum ? "✓" : "✗"} ${a.padEnd(10)} ${String(g.n).padStart(3)} dosya · ${[...g.lisans].join("/")} · ${g.bolum ?? "KREDİ SATIRI YOK"}`);
console.log(`\n# Yazılım: ${k.yazilim.map((y) => `${y.ad} (${y.lisans})`).join(", ")}`);
const eksik = k.kaynaklar.filter((x) => x.eksikAtif);
if (eksik.length) { console.error(`\nAtıfı eksik ${eksik.length} kaynak:`, eksik.map((x) => x.dosya)); process.exit(1); }
