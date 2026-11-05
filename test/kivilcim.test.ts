import { describe, expect, it } from "vitest";
import { HIS, siddetBul, siddetPuani } from "../src/istemci/oyun/his.ts";

// GU-E: çarpışma kıvılcımı / tepki ölçeği tek sürekli puandan gelir; kademe (siddetBul) ile tutarlı olmalı.
describe("çarpışma şiddet puanı (GU-E)", () => {
  it("vn ile tekdüze artar, kademe içinde de değişir", () => {
    let once = -1;
    for (let vn = 0; vn <= 700; vn += 10) {
      const g = siddetPuani(vn, 0, 0, false, false);
      expect(g).toBeGreaterThanOrEqual(once);
      once = g;
    }
    // hafif kademenin iki ucu farklı puan alır (sürekli ölçek)
    expect(siddetPuani(HIS.esik.agir - 1, 0, 0, false, false) - siddetPuani(HIS.esik.hafif, 0, 0, false, false)).toBeGreaterThan(0.25);
  });
  it("hasar ve tik puanı yükseltir; kritik her zaman ≥ 1, tavan 1,2", () => {
    expect(siddetPuani(200, 1, 1, false, false)).toBeGreaterThan(siddetPuani(200, 0, 0, false, false) + 0.25);
    for (const vn of [HIS.esik.kritik, 600, 2000]) {
      expect(siddetBul(vn, false)).toBe("kritik");
      expect(siddetPuani(vn, 0, 0, true, false)).toBeGreaterThanOrEqual(1);
      expect(siddetPuani(vn, 1, 1, true, true)).toBeLessThanOrEqual(1.2);
    }
  });
  it("hafif sürtme düşük, ağır vuruş yüksek puan (kıvılcım adedi/uzunluğu buna bağlı)", () => {
    expect(siddetPuani(HIS.esik.hafif, 0.05, 0.05, false, false)).toBeLessThan(0.15);
    expect(siddetPuani(HIS.esik.agir + 100, 0.6, 1, false, false)).toBeGreaterThan(0.6);
  });
});
