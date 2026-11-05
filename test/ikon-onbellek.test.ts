import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { MODEL_OZETI, parcaBoyasi } from "../src/istemci/atolye3d/ikonOnbellek.ts";

// TEMIZLIK #4: ortak 3B ikon önbelleği (three.js'siz modül).

describe("3B ikon önbelleği", () => {
  it("MODEL_OZETI kaynak/topac/parcalar-3b.json ile eşleşir (model değişince localStorage önbelleği geçersizleşir)", () => {
    const b = fs.readFileSync("kaynak/topac/parcalar-3b.json");
    let h = 0x811c9dc5;
    for (const x of b) { h ^= x; h = Math.imul(h, 0x01000193) >>> 0; }
    expect(h.toString(16).padStart(8, "0")).toBe(MODEL_OZETI);
  });
  it("modül three.js ve model JSON'unu statik içe almaz (ana paket büyümesin)", () => {
    const kod = fs.readFileSync("src/istemci/atolye3d/ikonOnbellek.ts", "utf8");
    const statik = kod.split("\n").filter((x) => /^import /.test(x)).join("\n");
    expect(statik).not.toMatch(/"three"|geometri\.ts|parcalar-3b|Goruntuleyici/);
    expect(kod).toMatch(/import\("\.\/Goruntuleyici\.ts"\)/);
  });
  it("boya kuralı: Çekirdek kendi Element + Köken, Gövde verilen Element, Disk/Uç metal", () => {
    expect(parcaBoyasi("kor-goktasi")).toStrictEqual({ element: "kor", koken: "goktasi" });
    expect(parcaBoyasi("ok-govde", "don").element).toBe("don");
    expect(parcaBoyasi("hafif-disk", "don")).toStrictEqual({ element: null, koken: null });
    expect(parcaBoyasi("yok-boyle-parca")).toStrictEqual({ element: null, koken: null });
  });
});
