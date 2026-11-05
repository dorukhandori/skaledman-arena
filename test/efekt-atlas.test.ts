import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { GRUP } from "../araclar/sanat/efekt-paketle.ts";

// TEMIZLIK #2: yayımlanan efekt atlasları (public/efekt/) kodun çaldığı her animasyonu içerir; açılış bütçesi küçük.

const kod = fs.readFileSync("src/istemci/oyun/Efektler.ts", "utf8");
const atlas = (ad: string) => JSON.parse(fs.readFileSync(`public/efekt/${ad}.json`, "utf8")) as { animations: Record<string, string[]>; meta: { image: string } };

describe("efekt atlasları (TEMIZLIK #2)", () => {
  it("Efektler.ts'teki her (atlas, animasyon) çifti yayımlanan atlasta var", () => {
    const ciftler = [...kod.matchAll(/\["?(efekt(?:-[a-z]+)?)"?,\s*"([a-z-]+)"\]|sheet\("(efekt(?:-[a-z]+)?)",\s*"([a-z-]+)"/g)].map((m) => [m[1] ?? m[3], m[2] ?? m[4]] as const);
    expect(ciftler.length).toBeGreaterThanOrEqual(12);
    for (const [ad, anim] of ciftler) expect(atlas(ad!).animations[anim!], `${ad}#${anim}`).toBeTruthy();
  });

  it("paketleme reçetesi ile yayımlanan dosyalar aynı; açılış atlası (efekt-cekirdek) ≤ 40 KB, toplam ≤ 600 KB", () => {
    let toplam = 0;
    for (const [ad, ogeler] of Object.entries(GRUP)) {
      expect(Object.keys(atlas(ad).animations)).toStrictEqual(ogeler.map(([, a]) => a));
      toplam += fs.statSync(`public/efekt/${atlas(ad).meta.image}`).size;
    }
    expect(fs.statSync("public/efekt/efekt-cekirdek.png").size).toBeLessThanOrEqual(40 * 1024);
    expect(toplam).toBeLessThanOrEqual(600 * 1024);
    expect(fs.readdirSync("public/efekt").filter((f) => f.endsWith(".png")).sort()).toStrictEqual(Object.keys(GRUP).map((a) => `${a}.png`).sort());
  });

  it("açılışta yalnız çekirdek atlas istenir (diğerleri atlasHazirla eşiklerinde)", () => {
    expect(kod).toMatch(/if \(sahne\.hibrit\) void efektAtlasYukle\("efekt-cekirdek"\)/);
    expect([...kod.matchAll(/efektAtlasYukle\(/g)].length).toBe(3);
  });
});
