import { beforeAll, describe, expect, it } from "vitest";
import type { DovuscuProfili } from "../src/paylasilan/dovuscu.ts";
import { AYAR } from "../src/paylasilan/kurallar/ayar.ts";
import { yuvalariKur } from "../src/paylasilan/kurallar/hamleler.ts";
import type { Saldiri, Tip } from "../src/paylasilan/kart.ts";
import { varsayilanArena } from "../src/paylasilan/sim/Arena.ts";
import { type Girdi, bosGirdi } from "../src/paylasilan/sim/Girdi.ts";
import { adim, dunyaKur, type Dunya } from "../src/paylasilan/sim/Dunya.ts";
import { rastgele } from "../src/paylasilan/sim/rastgele.ts";

const DT = AYAR.dt;

function profil(ad: string, saldirilar: Saldiri[], tipler: Tip[] = ["NORMAL"], ek: Partial<DovuscuProfili> = {}): DovuscuProfili {
  return {
    id: ad, fusionId: "1.1", ad, sahip: "t", shiny: false, tipler, seviye: 50, maxHp: 150,
    atk: 120, def: 120, spa: 120, spd: 120, hiz: 150, yuvalar: yuvalariKur(saldirilar, tipler), agirlik: 100, ...ek,
  };
}
const g = (o: Partial<Girdi> = {}): Girdi => ({ ...bosGirdi(), ...o });

/** n adım; bosGirdi'ler. */
function ileri(d: Dunya, n: number, g0: Girdi = bosGirdi(), g1: Girdi = bosGirdi()) {
  const olaylar = [];
  for (let i = 0; i < n; i++) { adim(d, [g0, g1], DT); olaylar.push(...d.olaylar); }
  return olaylar;
}
/** İlk adımda tek seferlik girdi (atesle/dash), sonra boş. */
function bir(d: Dunya, g0: Girdi, n: number, g1: Girdi = bosGirdi()) {
  const olaylar = ileri(d, 1, g0, g1);
  olaylar.push(...ileri(d, n - 1));
  return olaylar;
}
function yanyana(d: Dunya, mesafe = 40, z = 240) {
  d.dovusculer[0]!.x = -mesafe / 2; d.dovusculer[0]!.z = z;
  d.dovusculer[1]!.x = mesafe / 2; d.dovusculer[1]!.z = z;
}
const sagaBak = (i: number, d: Dunya) => ({ nisanX: d.dovusculer[i]!.x + 100, nisanZ: d.dovusculer[i]!.z });
const duz = (): ReturnType<typeof varsayilanArena> => ({ ...varsayilanArena(), engeller: [] });

const POKE = (tip: Tip = "NORMAL") => profil("p", [{ name: "Vuruş", type: tip, power: 40 }]);

// Formül testleri çarpansız değerleri bekler; F0 varsayılanı 0,2 (ayar.ts). Dosya başına ayrı modül örneği var.
beforeAll(() => { (AYAR as { hasarCarpani: number }).hasarCarpani = 1; });

describe("determinizm", () => {
  it("aynı tohum ve girdi dizisi → aynı durum (300 adım)", () => {
    const a = profil("a", [{ name: "x", type: "FIRE", power: 90 }, { name: "y", type: "ELECTRIC", power: 120 }], ["FIRE"]);
    const b = profil("b", [{ name: "x", type: "WATER", power: 100 }, { name: "y", type: "GRASS", power: 140 }], ["WATER"]);
    const calistir = () => {
      const d = dunyaKur([a, b], 1234);
      for (let i = 0; i < 300; i++) {
        const girdi = (k: number): Girdi => ({ ...bosGirdi(),
          yonX: rastgele(7, i * 4 + k) * 2 - 1, yonZ: rastgele(8, i * 4 + k) * 2 - 1,
          nisanX: rastgele(9, i * 4 + k) * 700 - 350, nisanZ: rastgele(10, i * 4 + k) * 480,
          secilenYuva: Math.floor(rastgele(11, i * 4 + k) * 4), atesle: rastgele(12, i * 4 + k) < 0.1, dash: rastgele(13, i * 4 + k) < 0.02,
        });
        adim(d, [girdi(0), girdi(1)], DT);
      }
      return JSON.stringify(d);
    };
    const bir = calistir();
    expect(calistir()).toBe(bir);
    expect(bir).toContain('"tick":300');
  });

  it("rastgele(tohum, sira) kararlı ve [0,1)", () => {
    expect(rastgele(5, 3)).toBe(rastgele(5, 3));
    expect(rastgele(5, 3)).not.toBe(rastgele(5, 4));
    for (let i = 0; i < 100; i++) { const r = rastgele(1, i); expect(r).toBeGreaterThanOrEqual(0); expect(r).toBeLessThan(1); }
  });
});

describe("hareket", () => {
  it("hız profil hızına eşit, köşegen normalize", () => {
    const d = dunyaKur([POKE(), POKE()], 1, duz());
    const x0 = d.dovusculer[0]!.x;
    ileri(d, 60, g({ yonX: 1 }));
    expect(d.dovusculer[0]!.x - x0).toBeCloseTo(150, 3);
    const d2 = dunyaKur([POKE(), POKE()], 1, duz());
    ileri(d2, 60, g({ yonX: -1, yonZ: 1 }));
    expect(Math.hypot(d2.dovusculer[0]!.x + 110, d2.dovusculer[0]!.z - 120)).toBeCloseTo(150, 3);
  });

  it("duvar geçirmez, saha dışına çıkılmaz", () => {
    const d = dunyaKur([POKE(), POKE()], 1);
    ileri(d, 200, g({ yonX: 1 }));
    expect(d.dovusculer[0]!.x).toBeLessThanOrEqual(-14 - 14 + 1e-6);
    const d2 = dunyaKur([POKE(), POKE()], 1);
    ileri(d2, 600, g({ yonX: -1 }));
    expect(d2.dovusculer[0]!.x).toBeCloseTo(-380 + 14, 6);
  });

  it("gövdeler iç içe geçmez", () => {
    const d = dunyaKur([POKE(), POKE()], 1, duz());
    yanyana(d, 60);
    ileri(d, 120, g({ yonX: 1 }), g({ yonX: -1 }));
    const [a, b] = d.dovusculer;
    expect(Math.hypot(b!.x - a!.x, b!.z - a!.z)).toBeGreaterThanOrEqual(28 - 1e-6);
  });
});

describe("dash", () => {
  it("60 birim, 0.12 s dokunulmaz, 10 s bekleme", () => {
    const d = dunyaKur([POKE(), POKE()], 1, duz());
    const x0 = d.dovusculer[0]!.x;
    ileri(d, 1, g({ dash: true, yonX: 1 }));
    expect(d.dovusculer[0]!.dokunulmaz).toBeGreaterThan(0);
    ileri(d, 9);
    expect(d.dovusculer[0]!.x - x0).toBeCloseTo(60, 6);
    expect(d.dovusculer[0]!.dashKalan).toBe(0);
    ileri(d, 20);
    expect(d.dovusculer[0]!.dokunulmaz).toBe(0);
    ileri(d, 1, g({ dash: true, yonX: -1 }));
    expect(d.dovusculer[0]!.dashKalan).toBe(0); // bekleme sürüyor
    ileri(d, 600);
    ileri(d, 1, g({ dash: true, yonX: -1 }));
    expect(d.dovusculer[0]!.dashKalan).toBeGreaterThan(0);
  });

  it("dash sırasında vuruş girmez", () => {
    const d = dunyaKur([POKE(), POKE()], 1, duz());
    yanyana(d, 30);
    const hp0 = d.dovusculer[1]!.hp;
    // 2. dövüşçü dash'e başlar, 1. hemen vurur (yuva 0 = 40 güç poke)
    const olaylar = ileri(d, 6, g({ atesle: true, ...sagaBak(0, d) }), g({ dash: true, yonZ: 1 }));
    expect(d.dovusculer[1]!.hp).toBe(hp0);
    expect(olaylar.some((o) => o.tur === "kacildi")).toBe(true);
  });
});

describe("hamle aileleri", () => {
  it("poke: aviso sonrası vurur, hasar formülü, knockback, cooldown", () => {
    const d = dunyaKur([POKE(), POKE()], 1, duz());
    yanyana(d, 40);
    const olaylar = bir(d, g({ atesle: true, ...sagaBak(0, d) }), 12);
    const vurdu = olaylar.find((o) => o.tur === "vurdu");
    expect(vurdu).toMatchObject({ tur: "vurdu", kime: 1, kimden: 0, etkinlik: 1 });
    // Lv50 güç 40 A=D=120 NORMAL STAB: floor(floor(22*40)/50)+2 = 19 → ×1.5 = 28.5 → 29
    expect(d.dovusculer[1]!.hp).toBe(150 - 29);
    expect(d.dovusculer[1]!.x).toBeGreaterThan(20); // itildi
    // cooldown: hemen tekrar atılamaz
    const sayi = ileri(d, 6, g({ atesle: true, ...sagaBak(0, d) })).filter((o) => o.tur === "hamleBasladi").length;
    expect(sayi).toBe(0);
    ileri(d, 40);
    expect(ileri(d, 1, g({ atesle: true, ...sagaBak(0, d) })).filter((o) => o.tur === "hamleBasladi")).toHaveLength(1);
  });

  it("poke menzil ve yay dışına vurmaz", () => {
    const d = dunyaKur([POKE(), POKE()], 1, duz());
    yanyana(d, 150);
    bir(d, g({ atesle: true, ...sagaBak(0, d) }), 12);
    expect(d.dovusculer[1]!.hp).toBe(150);
    const d2 = dunyaKur([POKE(), POKE()], 1, duz());
    yanyana(d2, 40);
    bir(d2, g({ atesle: true, nisanX: d2.dovusculer[0]!.x - 100, nisanZ: d2.dovusculer[0]!.z }), 12); // ters yön
    expect(d2.dovusculer[1]!.hp).toBe(150);
  });

  it("tip etkinliği hasarı değiştirir", () => {
    const sudan = profil("s", [{ name: "x", type: "WATER", power: 40 }], ["WATER"]);
    const ateste = profil("a", [{ name: "x", type: "WATER", power: 40 }], ["FIRE"]);
    const d = dunyaKur([sudan, ateste], 1, duz());
    yanyana(d, 40);
    const olaylar = bir(d, g({ atesle: true, ...sagaBak(0, d) }), 12);
    expect(olaylar.find((o) => o.tur === "vurdu")).toMatchObject({ etkinlik: 2 });
    // 19 ×1.5 STAB ×1.5 süper = 42.75 → 43
    expect(d.dovusculer[1]!.hp).toBe(150 - 43);
  });

  it("mermi uçar ve çarpar; duvara çarparsa biter", () => {
    const m = profil("m", [{ name: "x", type: "NORMAL", power: 80 }]);
    const d = dunyaKur([m, POKE()], 1, duz());
    d.dovusculer[0]!.x = -150; d.dovusculer[0]!.z = 240; d.dovusculer[1]!.x = 100; d.dovusculer[1]!.z = 240;
    const olaylar = bir(d, g({ atesle: true, nisanX: 100, nisanZ: 240 }), 40);
    expect(olaylar.some((o) => o.tur === "vurdu" && o.kime === 1)).toBe(true);
    expect(d.mermiler).toHaveLength(0);

    const d2 = dunyaKur([m, POKE()], 1);
    const hp0 = d2.dovusculer[1]!.hp;
    const o2 = bir(d2, g({ atesle: true, nisanX: 110, nisanZ: 120 }), 40);
    expect(d2.dovusculer[1]!.hp).toBe(hp0);
    expect(o2.some((o) => o.tur === "mermiBitti" && !o.vurdu)).toBe(true);
  });

  it("ışın anında vurur, duvar keser", () => {
    const i = profil("i", [{ name: "x", type: "PSYCHIC", power: 110 }], ["PSYCHIC"]);
    const d = dunyaKur([i, POKE()], 1, duz());
    d.dovusculer[0]!.x = -100; d.dovusculer[0]!.z = 240; d.dovusculer[1]!.x = 100; d.dovusculer[1]!.z = 240;
    bir(d, g({ atesle: true, nisanX: 100, nisanZ: 240 }), 40);
    expect(d.dovusculer[1]!.hp).toBeLessThan(150);

    const d2 = dunyaKur([i, POKE()], 1);
    d2.dovusculer[0]!.x = -100; d2.dovusculer[0]!.z = 130; d2.dovusculer[1]!.x = 100; d2.dovusculer[1]!.z = 130;
    bir(d2, g({ atesle: true, nisanX: 100, nisanZ: 130 }), 40);
    expect(d2.dovusculer[1]!.hp).toBe(150); // duvar araya girdi (ışın menzili 250 > 200)
  });

  it("koni yay içindekini vurur", () => {
    const k = profil("k", [{ name: "x", type: "FIRE", power: 110 }], ["FIRE"]);
    const d = dunyaKur([k, POKE()], 1, duz());
    yanyana(d, 80);
    bir(d, g({ atesle: true, ...sagaBak(0, d) }), 30);
    expect(d.dovusculer[1]!.hp).toBeLessThan(150);
  });

  it("alan: gecikmeli vurur, dash ile kaçılır", () => {
    const a = profil("a", [{ name: "x", type: "ROCK", power: 105 }], ["ROCK"]); // varsayılan alan: yarıçap 64
    const d = dunyaKur([a, POKE()], 1, duz());
    yanyana(d, 150);
    const olaylar = bir(d, g({ atesle: true, nisanX: d.dovusculer[1]!.x, nisanZ: 240 }), 20);
    expect(d.alanlar).toHaveLength(1);
    expect(d.dovusculer[1]!.hp).toBe(150); // 0.33 s geçti, 0.4 s'de vurur
    expect(olaylar.some((o) => o.tur === "alanPatladi")).toBe(false);
    ileri(d, 10);
    expect(d.dovusculer[1]!.hp).toBeLessThan(150);

    const d2 = dunyaKur([a, POKE()], 1, duz());
    yanyana(d2, 150);
    ileri(d2, 1, g({ atesle: true, nisanX: d2.dovusculer[1]!.x, nisanZ: 240 }), g({ dash: true, yonZ: 1 }));
    ileri(d2, 40, bosGirdi(), g({ yonZ: 1 })); // dash 60 + yürüyüş: yarıçap 64+14'ün dışına çıkar
    expect(d2.dovusculer[1]!.hp).toBe(150);
  });

  it("embestida 180 birim ilerler ve temasta vurur", () => {
    const e = profil("e", [{ name: "x", type: "FIGHTING", power: 110 }], ["FIGHTING"]);
    const d = dunyaKur([e, POKE()], 1, duz());
    d.dovusculer[0]!.x = -200; d.dovusculer[0]!.z = 240; d.dovusculer[1]!.x = 300; d.dovusculer[1]!.z = 100;
    bir(d, g({ atesle: true, nisanX: 100, nisanZ: 240 }), 60);
    expect(d.dovusculer[0]!.x).toBeCloseTo(-20, 3);

    const d2 = dunyaKur([e, POKE()], 1, duz());
    yanyana(d2, 120);
    bir(d2, g({ atesle: true, ...sagaBak(0, d2) }), 60);
    expect(d2.dovusculer[1]!.hp).toBeLessThan(150);
  });

  it("sersemletici vuruş telegrafı keser", () => {
    const k = profil("k", [{ name: "x", type: "ELECTRIC", power: 110 }], ["ELECTRIC"]);
    const d = dunyaKur([POKE(), k], 1, duz());
    yanyana(d, 40);
    // dövüşçü 1 uzun telegrafa başlar; dövüşçü 0 poke ile keser
    const olaylar = ileri(d, 8, g({ atesle: true, ...sagaBak(0, d) }), g({ atesle: true, nisanX: -100, nisanZ: 240 }));
    expect(olaylar.some((o) => o.tur === "hamleIptal" && o.kim === 1)).toBe(true);
  });
});

describe("maç sonu ve durum", () => {
  it("KO maçı bitirir", () => {
    const d = dunyaKur([POKE(), POKE()], 1, duz());
    yanyana(d, 40);
    d.dovusculer[1]!.hp = 5;
    const olaylar = bir(d, g({ atesle: true, ...sagaBak(0, d) }), 12);
    expect(d.sonuc).toEqual({ kazanan: 0, neden: "ko" });
    expect(olaylar.some((o) => o.tur === "ko" && o.kim === 1)).toBe(true);
    expect(olaylar.some((o) => o.tur === "fin")).toBe(true);
    const tick = d.tick;
    ileri(d, 5);
    expect(d.tick).toBe(tick); // donmuş
  });

  it("süre dolunca HP oranı kazanır", () => {
    const d = dunyaKur([POKE(), POKE()], 1, duz());
    d.dovusculer[0]!.hp = 100;
    ileri(d, 90 * 60 + 2);
    expect(d.sonuc).toEqual({ kazanan: 1, neden: "sure" });
    const d2 = dunyaKur([POKE(), POKE()], 1, duz());
    ileri(d2, 90 * 60 + 2);
    expect(d2.sonuc).toEqual({ kazanan: null, neden: "sure" });
  });

  it("yanık: 1.5 s'de bir maxHP/16", () => {
    const d = dunyaKur([POKE(), POKE()], 1, duz());
    d.dovusculer[0]!.yanik = AYAR.yanik.sure;
    d.dovusculer[0]!.yanikSayac = AYAR.yanik.aralik;
    ileri(d, 6 * 60 + 5);
    expect(d.dovusculer[0]!.hp).toBe(150 - 4 * Math.floor(150 / 16));
    expect(d.dovusculer[0]!.yanik).toBe(0);
  });

  it("felç hızı yarıya indirir", () => {
    const d = dunyaKur([POKE(), POKE()], 1, duz());
    d.dovusculer[0]!.felc = 5;
    d.dovusculer[0]!.felcSayac = 1e9;
    const x0 = d.dovusculer[0]!.x;
    ileri(d, 60, g({ yonX: 1 }));
    expect(d.dovusculer[0]!.x - x0).toBeCloseTo(75, 3);
  });

  it("Ateş tipi yanmaz, Elektrik felç olmaz; Ateş vuruşu rakibi bazen yakar", () => {
    const ates = profil("a", [{ name: "x", type: "FIRE", power: 40 }], ["FIRE"]);
    const hedefNormal = POKE();
    let yanan = 0;
    for (let tohum = 1; tohum <= 60; tohum++) {
      const d = dunyaKur([ates, hedefNormal], tohum, duz());
      yanyana(d, 40);
      d.dovusculer[1]!.hp = 100000; d.dovusculer[1]!.maxHp = 100000;
      bir(d, g({ atesle: true, ...sagaBak(0, d) }), 8);
      if (d.dovusculer[1]!.yanik > 0) yanan++;
    }
    expect(yanan).toBeGreaterThan(0);
    expect(yanan).toBeLessThan(30);
    const d = dunyaKur([ates, ates], 3, duz());
    yanyana(d, 40);
    for (let k = 0; k < 20; k++) { d.dovusculer[0]!.cooldown.fill(0); bir(d, g({ atesle: true, ...sagaBak(0, d) }), 8); d.dovusculer[1]!.hp = 150; }
    expect(d.dovusculer[1]!.yanik).toBe(0);
  });
});
