import { describe, expect, it } from "vitest";
import { cihazSinifi, dokunmatikMetin, dokunmatikTus, efektTavani, iosMu, olcekHesapla } from "../src/istemci/mobil/cihaz.ts";
import { EGITIM_ADIMLARI } from "../src/paylasilan/egitim.ts";

// MOBIL-1: telefon ölçeği (GU-A tam sayı kuralı korunur), cihaz sınıfı, dokunmatik metinleri.
describe("menü ölçeği", () => {
  it("masaüstü kuralı değişmedi: o = max(2, floor(min(W/640, H/360)))", () => {
    expect(olcekHesapla(1280, 720)).toMatchObject({ o: 2, yo: 2 });
    expect(olcekHesapla(1920, 1080)).toMatchObject({ o: 3, yo: 3 });
    expect(olcekHesapla(2560, 1440)).toMatchObject({ o: 4, yo: 4 });
    expect(olcekHesapla(1000, 600)).toMatchObject({ o: 2, yo: 2 });
    expect(olcekHesapla(1280, 720, 1.5)).toMatchObject({ o: 2, yo: 3 });
  });
  const telefonlar: [string, number, number, number][] = [
    ["iPhone 14/15", 844, 390, 3], ["iPhone Pro Max", 932, 430, 3], ["Pixel 7", 915, 412, 2.625], ["küçük", 667, 375, 2], ["DPR 2 iPhone SE", 667, 375, 2],
  ];
  for (const [ad, w, h, dpr] of telefonlar) {
    it(`${ad} ${w}×${h} @${dpr}: o = 1 (mantıksal alan ≥ 640×360), yazı ×1,5 ve cihaz pikseline tam sayı`, () => {
      const r = olcekHesapla(w, h, 1, true, dpr);
      expect(r.o).toBe(1);
      expect(w / r.o).toBeGreaterThanOrEqual(640);
      expect(h / r.o).toBeGreaterThanOrEqual(360);
      // yazı tipi pikseli cihazda tam sayı (kesirli yumuşama yok)
      expect(Math.abs(r.yo * dpr - Math.round(r.yo * dpr))).toBeLessThan(1e-9);
      expect(r.yo).toBeGreaterThanOrEqual(1.3);
      expect(r.yo).toBeLessThanOrEqual(1.75);
    });
  }
  it("metin ölçeği telefonda da büyür (cihaz pikseline yuvarlı)", () => {
    const a = olcekHesapla(844, 390, 1, true, 2);
    const b = olcekHesapla(844, 390, 1.5, true, 2);
    expect(b.yo).toBeGreaterThan(a.yo);
    expect((b.yo * 2) % 1).toBe(0);
  });
  it("büyük dokunmatik ekran (o ≥ 2) masaüstü kuralını kullanır", () => {
    expect(olcekHesapla(1366, 1024, 1, true, 2)).toMatchObject({ o: 2, yo: 2 });
  });
});

describe("cihaz sınıfı ve efekt tavanı", () => {
  it("dokunmatik ya da zayıf donanım = mobil", () => {
    expect(cihazSinifi(true)).toBe("mobil");
    expect(cihazSinifi(false, 4)).toBe("mobil");
    expect(cihazSinifi(false, 8, 2)).toBe("mobil");
    expect(cihazSinifi(false, 8, 8)).toBe("masaustu");
  });
  it("mobilde parçacık/kıvılcım tavanı düşer, masaüstünde aynen", () => {
    expect(efektTavani(400, "masaustu")).toBe(400);
    expect(efektTavani(400, "mobil")).toBeLessThan(400);
    expect(efektTavani(150, "mobil")).toBeGreaterThan(50);
  });
  it("iOS algılama (iPadOS masaüstü UA dahil)", () => {
    expect(iosMu("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", 5)).toBe(true);
    expect(iosMu("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe(true);
    expect(iosMu("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0)).toBe(false);
    expect(iosMu("Mozilla/5.0 (Linux; Android 14; Pixel 7)", 5)).toBe(false);
  });
});

describe("eğitim metinleri dokunmatikte", () => {
  it("klavye terimi kalmaz (WASD, Shift, Space, Fare)", () => {
    for (const a of EGITIM_ADIMLARI) {
      const m = dokunmatikMetin(a.metin);
      expect(m).not.toMatch(/W A S D|WASD|Shift|Space|Fare/);
      expect(dokunmatikTus(a.tus)).not.toMatch(/WASD|Shift|Space/);
    }
  });
});
