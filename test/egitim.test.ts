import { describe, expect, it } from "vitest";
import { EGITIM, EGITIM_ADIMLARI, egitimBitti, egitimIlerlet, egitimKur, egitimNabiz } from "../src/paylasilan/egitim.ts";
import type { Olay } from "../src/paylasilan/sim/durum.ts";

// Antrenman eğitimi adım makinesi (ux § 4.2): eylemle tamamlanır, 12 sn nabız, 25 sn otomatik geçiş.

const dt = 1 / 60;
const kare = (olaylar: Olay[] = [], hareket = false) => ({ dt, hareket, olaylar, yerel: 0 });
const carp = { tur: "carpisma", tick: 0 } as unknown as Olay;
const dash = { tur: "dash", tick: 0, i: 0, dx: 1, dz: 0 } as Olay;

describe("eğitim adımları", () => {
  it("6 adım, metinler ux § 4.2 ile birebir", () => {
    expect(EGITIM_ADIMLARI.map((a) => a.metin)).toStrictEqual([
      "**W A S D** ile topacını sür.",
      "Rakibe çarp. Hızlı çarparsan daha sert vurursun.",
      "**Shift** ile hızlan, sonra çarp.",
      "Fareyi rakibe tut, **1**'e bas ve bırak: Yetenek.",
      "Kırmızı taralı alana girme. **Space** ile sekip kaç.",
      "Rakibi çanağın kenarından dışarı it.",
    ]);
  });
  it("eylemlerle baştan sona", () => {
    const e = egitimKur();
    for (let i = 0; i < 89; i++) expect(egitimIlerlet(e, kare([], true))).toBeNull();
    expect(egitimIlerlet(e, kare([], true))).toBe("eylem"); // 1,5 sn sürüş
    expect(e.adim).toBe(1);
    expect(egitimIlerlet(e, kare([carp]))).toBe("eylem");
    // 3: dash'siz çarpma geçmez; dash + 1,5 sn içinde çarpma geçer
    expect(egitimIlerlet(e, kare([carp]))).toBeNull();
    egitimIlerlet(e, kare([dash]));
    expect(egitimIlerlet(e, kare([carp]))).toBe("eylem");
    // 4: rakibe yetenek isabeti (kendine değil)
    expect(egitimIlerlet(e, kare([{ tur: "yetenekVurus", tick: 0, i: 1, hedef: 0, no: 0, hasar: 1, x: 0, z: 0, nx: 0, nz: 0 }]))).toBeNull();
    expect(egitimIlerlet(e, kare([{ tur: "yetenekVurus", tick: 0, i: 0, hedef: 1, no: 0, hasar: 1, x: 0, z: 0, nx: 0, nz: 0 }]))).toBe("eylem");
    // 5: telegraf sırasında sekme
    expect(egitimIlerlet(e, kare([{ tur: "sekme", tick: 0, i: 0 }]))).toBeNull(); // rakip yeteneği yokken sayılmaz
    egitimIlerlet(e, kare([{ tur: "yetenekBasladi", tick: 0, i: 1, no: 3, etkinNo: 3, yuva: 1, kademe: 2, x: 0, z: 0, dx: 1, dz: 0, telegraf: 36 }]));
    expect(egitimIlerlet(e, kare([{ tur: "sekme", tick: 0, i: 0 }]))).toBe("eylem");
    // 6: oyuncunun Ring Out'u
    expect(egitimIlerlet(e, kare([{ tur: "turBitti", tick: 0, sonuc: { tur: "ringOut", kazanan: 1, kaybeden: 0, puan: 2, tick: 0 } }]))).toBeNull();
    expect(egitimIlerlet(e, kare([{ tur: "turBitti", tick: 0, sonuc: { tur: "ringOut", kazanan: 0, kaybeden: 1, puan: 2, tick: 0 } }]))).toBe("eylem");
    expect(egitimBitti(e)).toBe(true);
    expect(e.gecisler).toStrictEqual(["eylem", "eylem", "eylem", "eylem", "eylem", "eylem"]);
  });
  it("5. adım: rakip yeteneği isabet ederse de geçer", () => {
    const e = egitimKur();
    e.adim = 4;
    expect(egitimIlerlet(e, kare([{ tur: "yetenekVurus", tick: 0, i: 1, hedef: 0, no: 0, hasar: 1, x: 0, z: 0, nx: 0, nz: 0 }]))).toBe("eylem");
  });
  it("4. adım: vuruşsuz Yetenek (savunma) atmak yeter; vuruşlu Yetenek'te atmak yetmez", () => {
    const e = egitimKur();
    e.adim = 3;
    const bas = { tur: "yetenekBasladi", tick: 0, i: 0, no: 28, etkinNo: 28, yuva: 0, kademe: 1, x: 0, z: 0, dx: 1, dz: 0, telegraf: 12 } as Olay;
    expect(egitimIlerlet(e, { ...kare([bas]) })).toBeNull();
    expect(egitimIlerlet(e, { ...kare([bas]), vurussuzYetenek: true })).toBe("eylem");
  });
  it("12 sn'de nabız, 25 sn'de kendiliğinden geçer", () => {
    const e = egitimKur();
    e.adim = 1;
    for (let i = 0; i < EGITIM.nabizSn * 60 - 1; i++) egitimIlerlet(e, kare());
    expect(egitimNabiz(e)).toBe(false);
    egitimIlerlet(e, kare());
    egitimIlerlet(e, kare());
    expect(egitimNabiz(e)).toBe(true);
    let g = null;
    for (let i = 0; i < 25 * 60 && !g; i++) g = egitimIlerlet(e, kare());
    expect(g).toBe("sure");
    expect(e.adim).toBe(2);
    expect(egitimNabiz(e)).toBe(false);
  });
  it("dash penceresi 1,5 sn", () => {
    const e = egitimKur();
    e.adim = 2;
    egitimIlerlet(e, kare([dash]));
    for (let i = 0; i < 100; i++) egitimIlerlet(e, kare());
    expect(egitimIlerlet(e, kare([carp]))).toBeNull();
  });
});
