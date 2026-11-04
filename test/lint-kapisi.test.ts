import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// Determinizm kapısı gerçekten kapalı mı: yasak işlemler src/paylasilan'da ESLint hatası verir.

const eslint = new ESLint({ cwd: new URL("..", import.meta.url).pathname });
async function hatalar(kod: string): Promise<string[]> {
  const [r] = await eslint.lintText(kod, { filePath: "src/paylasilan/_kapi_deneme.ts" });
  return (r?.messages ?? []).filter((m) => m.severity === 2).map((m) => m.message);
}

describe("ESLint determinizm kapısı (src/paylasilan)", () => {
  for (const [ad, kod] of [
    ["Math.hypot", "export const a = Math.hypot(1, 2);"],
    ["Math.sin", "export const a = Math.sin(1);"],
    ["Math.atan2", "export const a = Math.atan2(1, 2);"],
    ["Math.pow", "export const a = Math.pow(2, 3);"],
    ["Math.exp", "export const a = Math.exp(2);"],
    ["Math.cbrt", "export const a = Math.cbrt(2);"],
    ["**", "export const a = 2 ** 3;"],
    ["Math.random", "export const a = Math.random();"],
    ["Date.now", "export const a = Date.now();"],
    ["performance.now", "export const a = performance.now();"],
    ["karşılaştırıcısız sort", "export const a = [2, 1].sort();"],
    ["Math.fround", "export const a = Math.fround(1.5);"],
  ] as const) {
    it(`yasak: ${ad}`, async () => {
      expect((await hatalar(kod)).length).toBeGreaterThan(0);
    });
  }
  it("izinli: sqrt, abs, min, max, floor, trunc, sign, imul, karşılaştırıcılı sort", async () => {
    expect(await hatalar("export const a = Math.sqrt(2) + Math.abs(-1) + Math.min(1, 2) + Math.max(1, 2) + Math.floor(1.5) + Math.trunc(1.5) + Math.sign(-1) + Math.imul(2, 3) + [2, 1].sort((x, y) => x - y)[0]!;")).toStrictEqual([]);
  });
});
