import { beforeAll, describe, expect, it } from "vitest";
import type { DovuscuProfili } from "../src/paylasilan/dovuscu.ts";
import { AYAR } from "../src/paylasilan/kurallar/ayar.ts";
import { yuvalariKur } from "../src/paylasilan/kurallar/hamleler.ts";
import type { Saldiri, Tip } from "../src/paylasilan/kart.ts";
import { varsayilanArena } from "../src/paylasilan/sim/Arena.ts";
import { type Girdi, bosGirdi, girdiTemizle } from "../src/paylasilan/sim/Girdi.ts";
import { adim, dunyaKur, type Dunya } from "../src/paylasilan/sim/Dunya.ts";
import { kademeCarpani, kademeDegistir } from "../src/paylasilan/sim/kademe.ts";

// Zıplama, Z dinlenme, takım geçişi ve stat kademeleri (K-7, oyun-konsepti § 11).

const DT = AYAR.dt;
const sn = (s: number) => Math.round(s / DT);

function profil(ad: string, saldirilar: Saldiri[], tipler: Tip[] = ["NORMAL"], ek: Partial<DovuscuProfili> = {}): DovuscuProfili {
  return {
    id: ad, fusionId: "1.1", ad, sahip: "t", shiny: false, tipler, seviye: 50, maxHp: 150,
    atk: 120, def: 120, spa: 120, spd: 120, hiz: 150, yuvalar: yuvalariKur(saldirilar, tipler), agirlik: 100, ...ek,
  };
}
const g = (o: Partial<Girdi> = {}): Girdi => ({ ...bosGirdi(), ...o });
const duz = () => ({ ...varsayilanArena(), engeller: [] });

function ileri(d: Dunya, n: number, g0: Girdi = bosGirdi(), g1: Girdi = bosGirdi()) {
  const olaylar = [];
  for (let i = 0; i < n; i++) { adim(d, [g0, g1], DT); olaylar.push(...d.olaylar); }
  return olaylar;
}
function bir(d: Dunya, g0: Girdi, n: number, g1: Girdi = bosGirdi()) {
  const olaylar = ileri(d, 1, g0, g1);
  olaylar.push(...ileri(d, n - 1));
  return olaylar;
}

const NORMAL = (ad = "n") => profil(ad, [{ name: "Vuruş", type: "NORMAL", power: 40 }]);
const DEPREM = profil("deprem", [{ name: "Deprem", type: "GROUND", power: 100 }], ["GROUND"]);

beforeAll(() => { (AYAR as { hasarCarpani: number }).hasarCarpani = 1; });

describe("zıplama", () => {
  it("0,5 s havada kalır, tepe 22 birim, enerjinin 1/3'ünü harcar", () => {
    const d = dunyaKur([NORMAL(), NORMAL()], 1, duz());
    const dv = d.dovusculer[0]!;
    ileri(d, 1, g({ zipla: true }));
    expect(dv.ziplaKalan).toBeGreaterThan(0);
    expect(dv.enerji).toBeCloseTo(1 - AYAR.zipla.maliyet, 6); // dolu enerji tavanda, harcama dolumdan sonra
    let tepe = 0;
    const olaylar = [];
    for (let i = 0; i < sn(0.6); i++) { adim(d, [bosGirdi(), bosGirdi()], DT); tepe = Math.max(tepe, dv.yukseklik); olaylar.push(...d.olaylar); }
    expect(tepe).toBeGreaterThan(AYAR.zipla.yukseklik * 0.98);
    expect(tepe).toBeLessThanOrEqual(AYAR.zipla.yukseklik + 1e-9);
    expect(olaylar.some((o) => o.tur === "indi")).toBe(true);
    expect(dv.yukseklik).toBe(0);
  });

  it("enerji bitince zıplanmaz; 0,4/s dolar", () => {
    const d = dunyaKur([NORMAL(), NORMAL()], 1, duz());
    const dv = d.dovusculer[0]!;
    dv.enerji = 0.2;
    ileri(d, 1, g({ zipla: true }));
    expect(dv.ziplaKalan).toBe(0);
    ileri(d, sn(1));
    expect(dv.enerji).toBeCloseTo(0.2 + 0.4 * (1 + DT), 2);
  });

  it("havadaki hedefe Deprem değmez, yerdekine değer", () => {
    const vur = (zipla: boolean) => {
      const d = dunyaKur([DEPREM, NORMAL()], 1, duz());
      const [a, b] = d.dovusculer;
      a!.x = -40; a!.z = 240; b!.x = 40; b!.z = 240;
      // alan 0,2 s telegraf + 0,4 s gecikme: hedef patlama anında havada olsun
      ileri(d, 1, g({ atesle: true, nisanX: 40, nisanZ: 240 }));
      ileri(d, sn(0.3));
      ileri(d, 1, bosGirdi(), g({ zipla }));
      ileri(d, sn(0.4));
      return b!.hp;
    };
    expect(vur(true)).toBe(150);
    expect(vur(false)).toBeLessThan(150);
  });
});

describe("Z dinlenme", () => {
  it("dinlenirken cooldown iki kat hızlı düşer ve yürünmez", () => {
    const d = dunyaKur([NORMAL(), NORMAL()], 1, duz());
    const dv = d.dovusculer[0]!;
    dv.cooldown[0] = 2;
    ileri(d, sn(0.5), g({ dinlen: true }));
    expect(dv.dinleniyor).toBe(true);
    expect(dv.cooldown[0]).toBeCloseTo(2 - 0.5 * AYAR.dinlen.cooldownHizi, 1);
    const x = dv.x;
    ileri(d, 10, g({ dinlen: true, yonX: 1 }));
    expect(dv.dinleniyor).toBe(false); // hareket girdisi dinlenmeyi bozar
    expect(dv.x).toBeGreaterThan(x);
  });
});

describe("takım", () => {
  const takim = () => dunyaKur([[NORMAL("a1"), NORMAL("a2"), NORMAL("a3")], [NORMAL("b1")]], 3, duz());

  it("Q/E geçişi ~1,15 s sürer, boşlukta sahada yoktur, sonra 2 s bekleme", () => {
    const d = takim();
    const dv = d.dovusculer[0]!;
    dv.hp = 90;
    ileri(d, 1, g({ degistir: 1 }));
    expect(dv.gecis?.evre).toBe("geri");
    ileri(d, sn(0.45));
    expect(dv.sahaDisi).toBe(true);
    ileri(d, sn(0.5));
    expect(d.profiller[0]!.id).toBe("a2");
    expect(dv.hp).toBe(150);
    expect(d.takimlar[0]!.uyeler[0]!.hp).toBe(90);
    ileri(d, sn(0.3));
    expect(dv.gecis).toBeNull();
    expect(d.takimlar[0]!.bekleme).toBeGreaterThan(1.9);
    ileri(d, 1, g({ degistir: 0 }));
    expect(dv.gecis).toBeNull(); // beklemede
  });

  it("Tab ile düşüş noktası nişana iner, en çok 160 birim", () => {
    const d = takim();
    const dv = d.dovusculer[0]!;
    const x0 = dv.x;
    ileri(d, 1, g({ degistir: 2, dusus: true, nisanX: x0 + 400, nisanZ: dv.z }));
    ileri(d, sn(1));
    expect(dv.x).toBeCloseTo(x0 + AYAR.takim.dususMenzili, 0);
  });

  it("KO sonrası seçim; seçilmezse 5 s sonra sıradaki iner; tüm takım düşünce maç biter", () => {
    const d = takim();
    const dv = d.dovusculer[0]!;
    dv.hp = 0;
    const olaylar = ileri(d, 1);
    expect(olaylar.some((o) => o.tur === "secimBekliyor")).toBe(true);
    expect(d.sonuc).toBeNull();
    ileri(d, sn(5.1));
    expect(dv.olu).toBe(false);
    expect(d.takimlar[0]!.aktif).toBe(1);
    dv.hp = 0;
    ileri(d, 1);
    ileri(d, 1, g({ degistir: 2 }));
    expect(d.takimlar[0]!.aktif).toBe(2);
    dv.hp = 0;
    ileri(d, 1);
    expect(d.sonuc).toEqual({ kazanan: 1, neden: "ko" });
  });

  it("geri çekilirken vurulan geçiş bozulur", () => {
    const d = dunyaKur([[NORMAL("a1"), NORMAL("a2")], [NORMAL("b1")]], 3, duz());
    const [a, b] = d.dovusculer;
    a!.x = -20; a!.z = 240; b!.x = 20; b!.z = 240;
    ileri(d, 1, g({ degistir: 1 }), g({ atesle: true, nisanX: -100, nisanZ: 240 }));
    ileri(d, sn(0.15)); // poke telegrafı 0,08 s, geri çekilme 0,4 s
    expect(a!.gecis).toBeNull();
    expect(d.profiller[0]!.id).toBe("a1");
  });
});

describe("stat kademeleri", () => {
  it("karekök çarpanı: +2 → √2, +6 → 2, −6 → 0,5", () => {
    expect(kademeCarpani(2)).toBeCloseTo(Math.SQRT2, 9);
    expect(kademeCarpani(6)).toBeCloseTo(2, 9);
    expect(kademeCarpani(-6)).toBeCloseTo(0.5, 9);
  });

  it("+2 hız yürümeyi √2 kat hızlandırır, 8 s sonra düşer, tavan ±6", () => {
    const d = dunyaKur([NORMAL(), NORMAL()], 1, duz());
    const dv = d.dovusculer[0]!;
    kademeDegistir(d, 0, "hiz", 2);
    ileri(d, 1, g({ yonX: 1 }));
    expect(dv.hizX).toBeCloseTo(150 * Math.SQRT2, 3);
    expect(kademeDegistir(d, 0, "atk", 9)).toBe(6);
    ileri(d, sn(8.1));
    expect(dv.kademe.every((k) => k === 0)).toBe(true);
  });
});

describe("girdi temizliği (yeni alanlar)", () => {
  it("degistir aralık dışıysa −1, bayraklar boolean", () => {
    const t = girdiTemizle({ ...bosGirdi(), degistir: 7, zipla: 1 as unknown as boolean, dusus: true });
    expect(t.degistir).toBe(-1);
    expect(t.zipla).toBe(false);
    expect(t.dusus).toBe(true);
    expect(girdiTemizle({ ...bosGirdi(), degistir: 2.5 }).degistir).toBe(-1);
  });
});
