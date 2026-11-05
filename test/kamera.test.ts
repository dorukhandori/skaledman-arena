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
  it("çanak (R = 240) referans 07 gibi ekranı doldurur ama oynanabilir elips HUD'a (süre plakası y 66, Shift/Space y 494) girmez", () => {
    const ust = simdenEkrana(hibrit, 0, -240).y;
    const alt = simdenEkrana(hibrit, 0, 240).y;
    expect(ust).toBeGreaterThan(62);
    expect(alt).toBeLessThan(494);
    expect(simdenEkrana(hibrit, 240, 0).x - simdenEkrana(hibrit, -240, 0).x).toBeGreaterThan(600);
  });
});
