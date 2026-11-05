import { describe, expect, it } from "vitest";
import { KAMERA, ekrandanSime, simdenEkrana } from "../src/istemci/oyun/kamera.ts";

// GU-00 Hibrit kamera: sunum dönüşümü tek yerde; fare nişanı ters dönüşümle sim koordinatına döner (sim düz kalır).
describe("hibrit kamera izdüşümü", () => {
  const hibrit = { k: KAMERA.zOrani, B: KAMERA.yakinlik, my: 270 + KAMERA.kaymaY };
  const duz = { k: 1, B: 1, my: 270 };
  it("düz görünümde eski eşleme (1 sim birimi = 1 mantıksal px)", () => {
    expect(simdenEkrana(duz, 100, -50)).toEqual({ x: 580, y: 220 });
  });
  it("z ekranda zOranı ile basılır, x yalnız yakınlıkla ölçeklenir", () => {
    const a = simdenEkrana(hibrit, 0, 0);
    const b = simdenEkrana(hibrit, 100, 100);
    expect(b.x - a.x).toBeCloseTo(100 * KAMERA.yakinlik, 9);
    expect(b.y - a.y).toBeCloseTo(100 * KAMERA.zOrani * KAMERA.yakinlik, 9);
  });
  it("ters dönüşüm sim noktasını geri verir (fare nişanı)", () => {
    for (const [x, z] of [[0, 0], [-200, 150], [233.5, -239.25], [17, 88]] as const) {
      for (const p of [hibrit, duz]) {
        const e = simdenEkrana(p, x, z);
        const s = ekrandanSime(p, e.x, e.y);
        expect(s.x).toBeCloseTo(x, 9);
        expect(s.z).toBeCloseTo(z, 9);
      }
    }
  });
  it("çanak (R = 240) referans 07 gibi ekranı doldurur ama oynanabilir elips hiçbir maç HUD plakasının altına girmez", () => {
    const ust = simdenEkrana(hibrit, 0, -240).y;
    const alt = simdenEkrana(hibrit, 0, 240).y;
    expect(ust).toBeGreaterThan(66); // süre plakasının alt kenarı
    expect(alt).toBeLessThan(538); // ekranın alt kenarı (alt orta boş: GU-D Shift/Space sol alta taşındı)
    const genislik = simdenEkrana(hibrit, 240, 0).x - simdenEkrana(hibrit, -240, 0).x;
    expect(genislik).toBeLessThan(960); // duvar ekranda kalır
    // GU-D: ışıyan halka (kuşak dış kenarı 0,85 R) referans 07'de ekranın ~%82'si; bizde ≥ %77
    expect((0.85 * genislik) / 960).toBeGreaterThan(0.77);
    // MacHud mantıksal kutuları (960×540; H7 = MacHud.H7): paneller, skor, süre, ses, yetenek yuvaları + adları, Shift/Space, takım
    const kutular: [number, number, number, number][] = [
      [8, 8, 296, 72], [664, 8, 952, 72], [400, 4, 560, 42], [432, 42, 528, 66], [572, 10, 600, 38],
      [6, 476, 204, 538], [8, 430, 52, 474], [58, 430, 102, 474], [796, 480, 940, 538],
    ];
    const icinde = (lx: number, ly: number) => {
      const s = ekrandanSime(hibrit, lx, ly);
      return Math.hypot(s.x, s.z) < 240;
    };
    for (const [x0, y0, x1, y1] of kutular) {
      for (let i = 0; i <= 20; i++) {
        for (let j = 0; j <= 20; j++) {
          expect(icinde(x0 + ((x1 - x0) * i) / 20, y0 + ((y1 - y0) * j) / 20), `kutu ${x0},${y0}`).toBe(false);
        }
      }
    }
  });
});
