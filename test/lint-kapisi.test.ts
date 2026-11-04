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

describe("ESLint netcode yalıtımı (axiom § 2 #7)", () => {
  async function dosyada(kod: string, filePath: string): Promise<string[]> {
    const [r] = await eslint.lintText(kod, { filePath });
    return (r?.messages ?? []).filter((m) => m.severity === 2).map((m) => m.message);
  }
  for (const [ad, kod, yol] of [
    ["src/ag → colyseus", `import { Room } from "colyseus"; export const a = Room;`, "src/ag/_d.ts"],
    ["src/ag → @colyseus/sdk", `import { Client } from "@colyseus/sdk"; export const a = Client;`, "src/ag/_d.ts"],
    ["src/istemci (ag dışı) → @colyseus/sdk", `import { Client } from "@colyseus/sdk"; export const a = Client;`, "src/istemci/ekranlar/_d.ts"],
    ["src/istemci/ag → colyseus", `import { Room } from "colyseus"; export const a = Room;`, "src/istemci/ag/_d.ts"],
    ["src/istemci/ag → @colyseus/schema", `import { schema } from "@colyseus/schema"; export const a = schema;`, "src/istemci/ag/_d.ts"],
    ["src/sunucu → @colyseus/sdk", `import { Client } from "@colyseus/sdk"; export const a = Client;`, "src/sunucu/_d.ts"],
    ["src/sunucu → @colyseus/core", `import { Room } from "@colyseus/core"; export const a = Room;`, "src/sunucu/_d.ts"],
    ["src/paylasilan → colyseus", `import { Room } from "colyseus"; export const a = Room;`, "src/paylasilan/_d.ts"],
    // D5: SQLite yalnız src/sunucu/db/**
    ["src/sunucu/odalar → better-sqlite3", `import Database from "better-sqlite3"; export const a = Database;`, "src/sunucu/odalar/_d.ts"],
    ["src/sunucu/api → better-sqlite3", `import Database from "better-sqlite3"; export const a = Database;`, "src/sunucu/api/_d.ts"],
    ["src/istemci → better-sqlite3", `import Database from "better-sqlite3"; export const a = Database;`, "src/istemci/_d.ts"],
    ["src/paylasilan → better-sqlite3", `import Database from "better-sqlite3"; export const a = Database;`, "src/paylasilan/_d.ts"],
  ] as const) {
    it(`yasak: ${ad}`, async () => { expect((await dosyada(kod, yol)).length).toBeGreaterThan(0); });
  }
  for (const [ad, kod, yol] of [
    ["src/istemci/ag → @colyseus/sdk", `import { Client } from "@colyseus/sdk"; export const a = Client;`, "src/istemci/ag/_d.ts"],
    ["src/sunucu → colyseus + @colyseus/schema", `import { Room } from "colyseus"; import { schema } from "@colyseus/schema"; export const a = [Room, schema];`, "src/sunucu/_d.ts"],
    ["src/sunucu/db → better-sqlite3", `import Database from "better-sqlite3"; export const a = Database;`, "src/sunucu/db/_d.ts"],
    ["src/ag → zod + paylasilan", `import { z } from "zod"; import { AYAR } from "../paylasilan/kurallar/ayar.ts"; export const a = [z, AYAR];`, "src/ag/_d.ts"],
  ] as const) {
    it(`izinli: ${ad}`, async () => { expect(await dosyada(kod, yol)).toStrictEqual([]); });
  }
});
