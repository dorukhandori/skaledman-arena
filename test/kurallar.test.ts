import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { AYAR } from "../src/paylasilan/kurallar/ayar.ts";
import { TIPLER } from "../src/paylasilan/kart.ts";
import { fusionKayitlari } from "../src/paylasilan/kart.ts";
import { profilKur } from "../src/paylasilan/dovuscu.ts";
import { ETKINLIK_TABLOSU, budanmisEtkinlik, etkinlik, fizikselMi } from "../src/paylasilan/kurallar/tipler.ts";
import { hasar, hareketHizi, hp, stat } from "../src/paylasilan/kurallar/statlar.ts";
import { aileKurali, hamleKur, yuvalariKur } from "../src/paylasilan/kurallar/hamleler.ts";

const oku = (ad: string) => JSON.parse(readFileSync(new URL(`../veri/${ad}`, import.meta.url), "utf8"));

// Formül testleri çarpansız değerleri bekler; F0 varsayılanı 0,2 (ayar.ts). Dosya başına ayrı modül örneği var.
beforeAll(() => { (AYAR as { hasarCarpani: number }).hasarCarpani = 1; });

describe("tip tablosu", () => {
  it("324 hücre: 51 süper, 61 az, 8 bağışık", () => {
    let s = 0, a = 0, b = 0, n = 0;
    for (const x of TIPLER) for (const y of TIPLER) {
      const e = ETKINLIK_TABLOSU[x][y];
      if (e === 2) s++; else if (e === 0.5) a++; else if (e === 0) b++; else n++;
    }
    expect([s, a, b, n]).toEqual([51, 61, 8, 204]);
  });

  it("bilinen hücreler", () => {
    expect(etkinlik("WATER", ["FIRE"])).toBe(2);
    expect(etkinlik("ELECTRIC", ["GROUND"])).toBe(0);
    expect(etkinlik("GROUND", ["FLYING", "FIRE"])).toBe(0);
    expect(etkinlik("FIRE", ["GRASS", "BUG"])).toBe(4);
    expect(etkinlik("FIRE", ["WATER", "ROCK"])).toBe(0.25);
    expect(etkinlik("DRAGON", ["FAIRY"])).toBe(0);
    expect(etkinlik("NORMAL", ["GHOST", "NORMAL"])).toBe(0);
    expect(etkinlik("FAIRY", ["DRAGON"])).toBe(2);
    expect(etkinlik("ICE", ["DRAGON", "FLYING"])).toBe(4);
  });

  it("PokeRivals budaması", () => {
    expect(budanmisEtkinlik(4)).toBe(1.5);
    expect(budanmisEtkinlik(2)).toBe(1.5);
    expect(budanmisEtkinlik(1)).toBe(1);
    expect(budanmisEtkinlik(0.5)).toBeCloseTo(2 / 3);
    expect(budanmisEtkinlik(0.25)).toBeCloseTo(2 / 3);
    expect(budanmisEtkinlik(0)).toBe(0);
  });

  it("fiziksel/özel sınıfı", () => {
    expect(fizikselMi("FIGHTING")).toBe(true);
    expect(fizikselMi("DARK")).toBe(true);
    expect(fizikselMi("FIRE")).toBe(false);
    expect(fizikselMi("FAIRY")).toBe(false);
  });
});

describe("statlar ve hasar", () => {
  it("Pikachu base 35 HP Lv5 = 20", () => {
    expect(hp(35, 5)).toBe(20);
  });
  it("Lv50 formülleri", () => {
    expect(hp(80)).toBe(Math.floor((191 * 50) / 100) + 60);
    expect(stat(100)).toBe(Math.floor((231 * 50) / 100) + 5);
    expect(hp(7)).toBe(82); // dokümandaki ~82
  });
  it("hız 105..195", () => {
    expect(hareketHizi(0)).toBeCloseTo(105);
    expect(hareketHizi(65)).toBeCloseTo(150);
    expect(hareketHizi(130)).toBeCloseTo(195);
  });
  it("hasar formülü", () => {
    // Lv50, güç 100, A=D: floor(floor(22*100)/50)+2 = 46
    expect(hasar(50, 100, 120, 120, false, 1, false)).toBe(46);
    expect(hasar(50, 100, 120, 120, true, 1, false)).toBe(69);
    expect(hasar(50, 100, 120, 120, false, 2, false)).toBe(69);
    expect(hasar(50, 100, 120, 120, false, 0.25, false)).toBe(Math.round(46 * (2 / 3)));
    expect(hasar(50, 100, 120, 120, false, 1, true)).toBe(23);
    expect(hasar(50, 100, 120, 120, false, 0, false)).toBe(0);
    expect(hasar(50, 40, 10, 400, false, 0.5, true)).toBeGreaterThanOrEqual(1);
  });
});

describe("hamle aileleri", () => {
  it("geri dönüş bantları", () => {
    expect(aileKurali("FIRE", 40).aile).toBe("poke");
    expect(aileKurali("WATER", 60).aile).toBe("poke");
    expect(aileKurali("WATER", 65).aile).toBe("mermi");
    expect(aileKurali("FIRE", 95).aile).toBe("mermi");
    expect(aileKurali("GRASS", 120).aile).toBe("koni");
    expect(aileKurali("PSYCHIC", 120).aile).toBe("isin");
    expect(aileKurali("DRAGON", 120).aile).toBe("embestida");
    expect(aileKurali("ROCK", 110).aile).toBe("alan");
    expect(aileKurali("FLYING", 110).aile).toBe("mermi");
  });
  it("≥130: aile aynı, cooldown ×1.5, telegraf uzun", () => {
    const k = aileKurali("FIGHTING", 120);
    const a = aileKurali("FIGHTING", 140);
    expect(a.aile).toBe(k.aile);
    expect(a.cooldown).toBeCloseTo(k.cooldown * 1.5);
    expect(a.aviso).toBe("uzun");
  });
  it("el yapımı kural yalnız (tip, güç) ile eşlenir", () => {
    const deprem = hamleKur("Deprem", "GROUND", 100);
    expect(deprem.aile).toBe("alan");
    expect(deprem.yaricap).toBe(110);
    expect(hamleKur("Başka Ad", "GROUND", 100).yaricap).toBe(110);
  });
  it("Skaledman'daki her (tip, güç) bir aileye düşer", () => {
    const kartlar = oku("kartlar.json") as Record<string, { attacks: { type: never; power: number }[] }>;
    for (const k of Object.values(kartlar)) for (const a of k.attacks) {
      const kural = aileKurali(a.type, a.power);
      expect(kural.cooldown).toBeGreaterThan(0);
      expect(kural.menzil).toBeGreaterThan(0);
    }
  });
  it("yuva kuralı (K-7)", () => {
    const y = yuvalariKur([{ name: "A", type: "FIRE", power: 90 }, { name: "B", type: "WATER", power: 120 }], ["GRASS", "POISON"]);
    expect(y).toHaveLength(4);
    expect(y[0]?.ad).toBe("A");
    expect(y[1]?.ad).toBe("B");
    expect(y[2]).toMatchObject({ aile: "poke", guc: 40, tip: "GRASS" });
    expect(y[3]).toBeNull();
  });
});

describe("dövüşçü profili", () => {
  it("226 kartın hepsi profile dönüşür", () => {
    const kayitlar = fusionKayitlari(oku("gecmis.json"), oku("kartlar.json"));
    for (const k of kayitlar) {
      const p = profilKur(k);
      expect(p.maxHp).toBeGreaterThan(0);
      expect(p.hiz).toBeGreaterThanOrEqual(105);
      expect(p.yuvalar[0]).not.toBeNull();
      expect(p.yuvalar[3]).toBeNull();
    }
  });
});
