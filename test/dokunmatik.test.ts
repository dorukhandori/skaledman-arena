import { beforeAll, describe, expect, it } from "vitest";
import {
  EN_AZ_HEDEF, JOYSTICK, NISAN_EZME, birakmaKarari, dugmeBul, dugmeYerlesimi, joystickBolgesi, joystickYonu, nisanEzmeNoktasi,
  otoNisanHedefi, topuzKonumu, type DugmeAdi,
} from "../src/istemci/oyun/dokunmatik.ts";
import type { OyuncuGirdisi as OG } from "../src/istemci/oyun/Girdi.ts";
import { KAMERA } from "../src/istemci/oyun/kamera.ts";

// MOBIL-1: dokunmatik maç girdisi → mevcut `Girdi` şeması (sim ve ağ protokolü değişmez).
describe("joystick → sürüş yönü", () => {
  const R = JOYSTICK.yaricap;
  it("ölü bölgede yön 0", () => {
    expect(joystickYonu(0, 0)).toEqual({ x: 0, z: 0, guc: 0 });
    expect(joystickYonu(R * JOYSTICK.oluBolge * 0.99, 0).guc).toBe(0);
    expect(joystickYonu(0, -R * JOYSTICK.oluBolge).guc).toBe(0);
  });
  it("ölü bölge dışında doğrusal güç, tam eşikte ve ötesinde 1", () => {
    const yari = joystickYonu(R * ((JOYSTICK.oluBolge + JOYSTICK.tamEsik) / 2), 0);
    expect(yari.guc).toBeCloseTo(0.5, 9);
    expect(yari.x).toBeCloseTo(0.5, 9);
    expect(joystickYonu(R * JOYSTICK.tamEsik, 0).guc).toBe(1);
    expect(joystickYonu(R * 3, 0)).toEqual({ x: 1, z: 0, guc: 1 });
  });
  it("ekran y aşağı = sim z+ ; yukarı = z− (W tuşu gibi)", () => {
    expect(joystickYonu(0, -R).z).toBeCloseTo(-1, 9);
    expect(joystickYonu(0, R).z).toBeCloseTo(1, 9);
  });
  it("uzunluk hiçbir zaman 1'i aşmaz (girdiTemizle kırpmasına gerek kalmaz)", () => {
    for (let a = 0; a < 360; a += 7) for (const m of [10, 30, 56, 200]) {
      const y = joystickYonu(Math.cos(a) * m, Math.sin(a) * m, R, JOYSTICK.oluBolge, KAMERA.zOrani);
      expect(Math.hypot(y.x, y.z)).toBeLessThanOrEqual(1 + 1e-12);
    }
  });
  it("hibrit kamera basıklığı düzeltilir: ekranda çapraz itiş simde z'ye daha çok gider (ekranda parmak yönünde gider)", () => {
    const k = KAMERA.zOrani;
    const y = joystickYonu(R, R, R, JOYSTICK.oluBolge, k);
    // ekran yönü (1,1) → sim (1, 1/k) normalize; simden ekrana geri izdüşüm (x, z·k) yine 45°
    expect(y.z / y.x).toBeCloseTo(1 / k, 9);
    expect((y.z * k) / y.x).toBeCloseTo(1, 9);
  });
  it("topuz tabanın dışına çıkmaz", () => {
    const t = topuzKonumu(300, 400);
    expect(Math.hypot(t.x, t.y)).toBeCloseTo(R, 9);
    expect(topuzKonumu(10, -5)).toEqual({ x: 10, y: -5 });
  });
});

describe("oto-nişan ve nişan ezme", () => {
  it("en yakın etkin rakibi hedefler, elenmişi atlar", () => {
    const ben = { x: 0, z: 0 };
    expect(otoNisanHedefi(ben, [{ x: 100, z: 0, aktif: true }, { x: 30, z: 30, aktif: true }])).toEqual({ x: 30, z: 30 });
    expect(otoNisanHedefi(ben, [{ x: 10, z: 0, aktif: false }, { x: 200, z: 0, aktif: true }])).toEqual({ x: 200, z: 0 });
    expect(otoNisanHedefi(ben, [{ x: 10, z: 0, aktif: false }])).toBeNull();
    expect(otoNisanHedefi(ben, [])).toBeNull();
  });
  it("ezme: sürükleme yönünde topaçtan sabit uzaklıkta dünya noktası (basıklık düzeltmeli)", () => {
    const n = nisanEzmeNoktasi({ x: 10, z: 20 }, -50, 0, KAMERA.zOrani)!;
    expect(n.x).toBeCloseTo(10 - NISAN_EZME.uzaklik, 9);
    expect(n.z).toBeCloseTo(20, 9);
    const m = nisanEzmeNoktasi({ x: 0, z: 0 }, 0, 10, 0.5)!;
    expect(m.z).toBeCloseTo(NISAN_EZME.uzaklik, 9);
    expect(nisanEzmeNoktasi({ x: 0, z: 0 }, 0, 0)).toBeNull();
  });
  it("bırakma: dokunma = at; dışarı çıkıp düğmeye dönme = iptal; dışarıda bırakma = at", () => {
    expect(birakmaKarari(false, 0, 0, 28)).toBe("at");
    expect(birakmaKarari(true, 3, 2, 28)).toBe("iptal");
    expect(birakmaKarari(true, 60, -20, 28)).toBe("at");
  });
});

describe("düğme yerleşimi (sağ alt baş parmak kavisi)", () => {
  const CIHAZLAR: [string, number, number, { sol: number; sag: number; ust: number; alt: number }][] = [
    ["iPhone 14/15 yatay", 844, 390, { sol: 47, sag: 47, ust: 0, alt: 21 }],
    ["iPhone 14/15 Plus/Pro Max yatay", 932, 430, { sol: 59, sag: 59, ust: 0, alt: 21 }],
    ["Pixel 7 yatay", 915, 412, { sol: 0, sag: 0, ust: 0, alt: 0 }],
    ["küçük 667×375", 667, 375, { sol: 0, sag: 0, ust: 0, alt: 0 }],
    ["tablet 1180×820", 1180, 820, { sol: 0, sag: 0, ust: 0, alt: 20 }],
  ];
  for (const [ad, w, h, g] of CIHAZLAR) {
    it(`${ad}: her düğme ≥ ${EN_AZ_HEDEF} px, ekranda ve güvenli alanda, birbirine binmiyor, joystick bölgesine girmiyor`, () => {
      const y = dugmeYerlesimi(w, h, g);
      const adlar = Object.keys(y) as DugmeAdi[];
      expect(adlar.sort()).toEqual(["dash", "sekme", "y1", "y2", "y3", "y4"]);
      for (const a of adlar) {
        const d = y[a];
        expect(2 * d.r).toBeGreaterThanOrEqual(EN_AZ_HEDEF);
        expect(d.x - d.r).toBeGreaterThanOrEqual(g.sol);
        expect(d.x + d.r).toBeLessThanOrEqual(w - g.sag);
        expect(d.y - d.r).toBeGreaterThanOrEqual(g.ust);
        expect(d.y + d.r).toBeLessThanOrEqual(h - g.alt);
        expect(joystickBolgesi(d.x - d.r, w)).toBe(false);
      }
      for (let i = 0; i < adlar.length; i++) for (let j = i + 1; j < adlar.length; j++) {
        const a = y[adlar[i]!], b = y[adlar[j]!];
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.r + b.r + 4);
      }
      // her düğmenin merkezine dokunuş o düğmeyi bulur
      for (const a of adlar) expect(dugmeBul(y, y[a].x, y[a].y)).toBe(a);
      // Dash köşede ve en büyük
      expect(y.dash.r).toBe(Math.max(...adlar.map((a) => y[a].r)));
    });
  }
  it("gizli düğme (Takım Ultisi yokken) isabet almaz; boş alan null", () => {
    const y = dugmeYerlesimi(844, 390);
    expect(dugmeBul(y, y.y4.x, y.y4.y, 6, new Set<DugmeAdi>(["y4"]))).not.toBe("y4");
    expect(dugmeBul(y, 100, 100)).toBeNull();
  });
});

describe("OyuncuGirdisi dokunmatik kaynağı → Girdi", () => {
  let Sinif: typeof OG;
  beforeAll(async () => {
    // Node ortamı: OyuncuGirdisi yalnız olay dinleyicisi kaydeder; asgari window/document taklidi yeter
    const g = globalThis as Record<string, unknown>;
    g["window"] ??= { addEventListener() {}, removeEventListener() {} };
    g["document"] ??= { addEventListener() {}, removeEventListener() {}, hidden: false };
    Sinif = (await import("../src/istemci/oyun/Girdi.ts")).OyuncuGirdisi;
  });
  const yeni = () => {
    const tuval = { addEventListener() {}, removeEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }) } as unknown as HTMLCanvasElement;
    const o = new Sinif(tuval, () => ({ width: 960, height: 540 }));
    o.dokunmatik = true;
    let t = 1000;
    o.simdi = () => t;
    return { o, ilerle: (ms: number) => { t += ms; } };
  };
  const sahne = {} as never;
  it("joystick yönü analog yonX/yonZ olarak gider; bırakınca 0", () => {
    const { o } = yeni();
    o.dokunmatikYon({ x: 0.6, z: -0.8 });
    const g = o.olustur(sahne, { x: 0, z: 0 });
    expect(g.yonX).toBeCloseTo(0.6, 9);
    expect(g.yonZ).toBeCloseTo(-0.8, 9);
    o.dokunmatikYon(null);
    const g2 = o.olustur(sahne, { x: 0, z: 0 });
    expect(g2.yonX).toBe(0);
    expect(g2.yonZ).toBe(0);
  });
  it("Dash / Sekme tek seferlik: yalnız ilk adımda", () => {
    const { o } = yeni();
    o.dashIste();
    o.ziplaIste();
    const g = o.olustur(sahne, { x: 0, z: 0 });
    expect(g.dash).toBe(true);
    expect(g.zipla).toBe(true);
    const g2 = o.olustur(sahne, { x: 0, z: 0 });
    expect(g2.dash).toBe(false);
    expect(g2.zipla).toBe(false);
  });
  it("yetenek: bas = yuva seçili + basılı, bırak = atesle (oto-nişan rakibe); iptal = atesle yok", () => {
    const { o } = yeni();
    o.rakipler = [{ x: 120, z: -40, aktif: true }];
    o.yuvaBas(2);
    expect(o.basiliYuva).toBe(2);
    const g0 = o.olustur(sahne, { x: 0, z: 0 });
    expect(g0.atesle).toBe(false);
    expect(g0.secilenYuva).toBe(2);
    o.yuvaBirak(false);
    const g = o.olustur(sahne, { x: 0, z: 0 });
    expect(g.atesle).toBe(true);
    expect(g.secilenYuva).toBe(2);
    expect([g.nisanX, g.nisanZ]).toEqual([120, -40]);
    o.yuvaBas(0);
    o.yuvaBirak(true);
    expect(o.olustur(sahne, { x: 0, z: 0 }).atesle).toBe(false);
    expect(o.iptalSayisi).toBe(1);
  });
  it("nişan ezme oto-nişanı geçici ezer; parmak kalkınca süre dolunca oto-nişana döner", () => {
    const { o, ilerle } = yeni();
    o.rakipler = [{ x: 100, z: 0, aktif: true }];
    o.nisanEz({ x: -150, z: 0 }, true);
    expect(o.olustur(sahne, { x: 0, z: 0 }).nisanX).toBe(-150);
    ilerle(5000);
    expect(o.olustur(sahne, { x: 0, z: 0 }).nisanX).toBe(-150); // basılıyken süresiz
    o.nisanEzBirak();
    ilerle(NISAN_EZME.surmeMs - 10);
    expect(o.olustur(sahne, { x: 0, z: 0 }).nisanX).toBe(-150);
    ilerle(20);
    expect(o.olustur(sahne, { x: 0, z: 0 }).nisanX).toBe(100);
  });
  it("rakip yoksa son nişan yönü korunur; klavye + joystick toplamı 1'e kırpılır", () => {
    const { o } = yeni();
    o.rakipler = [{ x: 0, z: 100, aktif: true }];
    o.olustur(sahne, { x: 0, z: 0 });
    o.rakipler = [];
    const g = o.olustur(sahne, { x: 0, z: 0 });
    expect(g.nisanX).toBeCloseTo(0, 9);
    expect(g.nisanZ).toBeCloseTo(100, 9);
    o.dokunmatikYon({ x: 1, z: 0 });
    (o as unknown as { basili: Set<string> }).basili.add("KeyD");
    const h = o.olustur(sahne, { x: 0, z: 0 });
    expect(Math.hypot(h.yonX, h.yonZ)).toBeLessThanOrEqual(1 + 1e-12);
  });
});
