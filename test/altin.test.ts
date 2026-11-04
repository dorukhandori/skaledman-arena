import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type AltinSenaryo, altinCalistir } from "./altin/calistir.ts";

// Altın tekrar hash'leri (flint § 2 test 2). Bilinçli sim değişikliğinde `npm run altin:uret` + PR gerekçesi.
// Aynı dosyalar headless Chromium'da `npm run test:tarayici` ile koşar (test 3).

const KLASOR = new URL("./altin/", import.meta.url);
const dosyalar = readdirSync(KLASOR).filter((f) => f.endsWith(".json")).sort((a, b) => a.localeCompare(b));

describe("altın hash (FNV-1a 64, Float64 baytları)", () => {
  it("en az 4 senaryo, her bitiş türü var", () => {
    expect(dosyalar.length).toBeGreaterThanOrEqual(4);
    const turler = new Set(dosyalar.map((f) => altinCalistir(JSON.parse(readFileSync(new URL(f, KLASOR), "utf8")) as AltinSenaryo).sonuc?.tur));
    for (const t of ["durma", "ringOut", "parcalanma", "berabere"]) expect(turler).toContain(t);
  }, 60_000);

  for (const f of dosyalar) {
    it(f, () => {
      const s = JSON.parse(readFileSync(new URL(f, KLASOR), "utf8")) as AltinSenaryo;
      const beklenen = readFileSync(new URL(f.replace(/\.json$/, ".hash"), KLASOR), "utf8").trim();
      const a = altinCalistir(s);
      expect(a.hash).toBe(beklenen);
      // aynı süreçte ikinci koşu da aynı
      expect(altinCalistir(s).hash).toBe(a.hash);
    }, 60_000);
  }
});
