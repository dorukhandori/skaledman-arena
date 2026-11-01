import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fusionKayitlari, fusionParcalari, GecmisSema, KartlarSema } from "../src/paylasilan/kart.ts";

const oku = (ad: string) => JSON.parse(readFileSync(new URL(`../veri/${ad}`, import.meta.url), "utf8"));

describe("Skaledman veri anlık görüntüsü", () => {
  it("gecmis.json şemaya uyar ve 226 açılış içerir", () => {
    const g = GecmisSema.parse(oku("gecmis.json"));
    expect(g).toHaveLength(226);
    expect(new Set(g.map((a) => a.fusionId)).size).toBe(226); // bugün kopya yok
  });

  it("kartlar.json şemaya uyar", () => {
    const k = KartlarSema.parse(oku("kartlar.json"));
    expect(Object.keys(k)).toHaveLength(226);
  });

  it("her açılışın kart gövdesi var", () => {
    const kayitlar = fusionKayitlari(oku("gecmis.json"), oku("kartlar.json"));
    expect(kayitlar).toHaveLength(226);
  });

  it("fusionId baş.gövde olarak ayrılır", () => {
    expect(fusionParcalari("251.443")).toEqual({ basDex: 251, govdeDex: 443 });
  });
});
