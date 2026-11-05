import { describe, expect, it } from "vitest";
import { botGirdisi } from "../src/paylasilan/bot/bot.ts";
import { AYAR } from "../src/paylasilan/kurallar/ayar.ts";
import { adim, dunyaKur } from "../src/paylasilan/sim/Dunya.ts";
import { type Girdi, bosGirdi, girdiTemizle } from "../src/paylasilan/sim/Girdi.ts";
import { hasarHesapla, tikHesapla, zitElementMi } from "../src/paylasilan/sim/carpisma.ts";
import { TOPAC_DURUM, type Dunya, type Olay } from "../src/paylasilan/sim/durum.ts";
import { rastgele } from "../src/paylasilan/sim/rastgele.ts";
import { type TopacProfili, setProfili, topacProfiliKur } from "../src/paylasilan/veri/profil.ts";
import { BASLANGIC_SETLERI } from "../src/paylasilan/veri/katalog.ts";

const [GOKTASI, MADEN, YAPAY] = BASLANGIC_SETLERI.map((s) => setProfili(s)) as [TopacProfili, TopacProfili, TopacProfili];
const DAYANIKLI = topacProfiliKur("girdap-maden", "halka-govde", "parlak-disk", "top-uc");
const g = (o: Partial<Girdi> = {}): Girdi => ({ ...bosGirdi(), ...o });
const ileri = (d: Dunya, n: number, g0 = bosGirdi(), g1 = bosGirdi()): Olay[] => {
  const o: Olay[] = [];
  for (let i = 0; i < n; i++) { adim(d, [g0, g1]); o.push(...d.olaylar); }
  return o;
};

/** Tohumlu girdi: blok başına hedef (yarı olasılıkla rakip), ara sıra dash. */
function tohumluGirdi(d: Dunya, i: number, tick: number, tohum: number): Girdi {
  const blok = Math.floor(tick / 15);
  const k = blok * 16 + i * 8;
  const ben = d.topaclar[i]!;
  const rakip = d.topaclar[1 - i]!;
  const rakibe = rastgele(tohum, k) < 0.6;
  const hx = rakibe ? rakip.x : (rastgele(tohum, k + 1) * 2 - 1) * 100;
  const hz = rakibe ? rakip.z : (rastgele(tohum, k + 2) * 2 - 1) * 100;
  const u = Math.hypot(hx - ben.x, hz - ben.z) || 1;
  return g({ yonX: (hx - ben.x) / u, yonZ: (hz - ben.z) / u, dash: rakibe && tick % 15 === 0 && rastgele(tohum, k + 3) < 0.3, dinlen: !rakibe && rastgele(tohum, k + 4) < 0.1 });
}

/**
 * Çarpışmalı uzun koşu: tur bitince 30 adım sonra yeni dünya (Lab gibi). Her adımın durum kopyası döner.
 * Durumlar düz nesnelere kopyalanır (toStrictEqual: -0, NaN ve tüm alanlar dahil).
 */
function uzunKosu(n: number, tohum: number): { kayit: unknown[]; carpisma: number; tur: number } {
  let d = dunyaKur([GOKTASI, MADEN], tohum);
  const kayit: unknown[] = [];
  let carpisma = 0;
  let tur = 0;
  let bekle = -1;
  for (let t = 0; t < n; t++) {
    adim(d, [tohumluGirdi(d, 0, t, tohum), tohumluGirdi(d, 1, t, tohum + 1)]);
    carpisma += d.olaylar.filter((o) => o.tur === "carpisma").length;
    kayit.push(structuredClone({ tick: d.tick, topaclar: d.topaclar, mac: d.mac, olaylar: d.olaylar, kilit: d.temasKilidi }));
    if (d.mac.faz === "turBitti" && bekle < 0) bekle = 30;
    if (bekle > 0 && --bekle === 0) { tur++; d = dunyaKur([GOKTASI, MADEN], tohum + tur); bekle = -1; }
  }
  return { kayit, carpisma, tur };
}

describe("determinizm", () => {
  it("600 adım, iki topaç çarpışmalı: aynı tohum + girdi → bit bit aynı (toStrictEqual)", () => {
    const a = uzunKosu(600, 42);
    const b = uzunKosu(600, 42);
    expect(a.carpisma).toBeGreaterThan(3);
    expect(b.kayit).toStrictEqual(a.kayit);
  });

  it("3600 adım (60 s), çok tur, çarpışmalı: bit bit aynı", () => {
    const a = uzunKosu(3600, 9);
    const b = uzunKosu(3600, 9);
    expect(a.carpisma).toBeGreaterThan(20);
    expect(a.tur).toBeGreaterThan(0);
    expect(b.kayit).toStrictEqual(a.kayit);
  });

  it("paylaşılan bot saf: aynı dünya ve tohum → aynı girdi", () => {
    const d = dunyaKur([GOKTASI, YAPAY], 3);
    ileri(d, 30);
    expect(botGirdisi(d, 1, "saldirgan", 77)).toStrictEqual(botGirdisi(structuredClone(d), 1, "saldirgan", 77));
  });

  it("A-B / B-A simetri: taraflar yer değişince sonuç aynalanır", () => {
    const fazlar = [17.25, 201.5] as const;
    const d1 = dunyaKur([GOKTASI, DAYANIKLI], 5, { fazlar });
    const d2 = dunyaKur([DAYANIKLI, GOKTASI], 5, { fazlar: [fazlar[1], fazlar[0]] });
    // d2'de konumlar d1'in tersi
    for (const k of ["x", "z"] as const) { d2.topaclar[0][k] = d1.topaclar[1][k]; d2.topaclar[1][k] = d1.topaclar[0][k]; }
    let carp = 0;
    for (let t = 0; t < 900; t++) {
      const a = tohumluGirdi(d1, 0, t, 31);
      const b = tohumluGirdi(d1, 1, t, 32);
      adim(d1, [a, b]);
      adim(d2, [b, a]);
      carp += d1.olaylar.filter((o) => o.tur === "carpisma").length;
      expect(d2.topaclar[0]).toStrictEqual(d1.topaclar[1]);
      expect(d2.topaclar[1]).toStrictEqual(d1.topaclar[0]);
      expect(d2.temasKilidi).toBe(d1.temasKilidi);
    }
    expect(carp).toBeGreaterThan(3);
    const s1 = d1.mac.sonuc;
    const s2 = d2.mac.sonuc;
    expect(s2?.tur).toBe(s1?.tur);
    if (s1 && s1.kazanan >= 0) expect(s2?.kazanan).toBe(1 - s1.kazanan);
    expect(d2.mac.puan).toStrictEqual([d1.mac.puan[1], d1.mac.puan[0]]);
  });

  it("rastgele(tohum, sira) kararlı ve [0,1)", () => {
    expect(rastgele(5, 3)).toBe(rastgele(5, 3));
    for (let i = 0; i < 100; i++) { const r = rastgele(1, i); expect(r).toBeGreaterThanOrEqual(0); expect(r).toBeLessThan(1); }
  });
});

describe("hareket", () => {
  it("sürüş tavanı vSurus · yorgunluk; dış hız (dash) korunur ve söner", () => {
    const d = dunyaKur([MADEN, MADEN], 1); // İğne uç: desen yok
    d.topaclar[0].x = 0; d.topaclar[1].x = 200; d.topaclar[1].z = 100;
    ileri(d, 120, g({ yonX: 1 }));
    const v = Math.hypot(d.topaclar[0].vx, d.topaclar[0].vz);
    expect(v).toBeLessThanOrEqual(MADEN.sim.vSurus + 1e-9);
  });

  it("çiçek deseni girdisiz topacı yürütür; çakılı (İğne) yalnız çanak eğimiyle yavaşça süzülür", () => {
    const d = dunyaKur([GOKTASI, MADEN], 2);
    const x0 = [d.topaclar[0].x, d.topaclar[1].x];
    ileri(d, 60);
    expect(Math.abs(d.topaclar[0].x - x0[0]!) + Math.abs(d.topaclar[0].z)).toBeGreaterThan(20);
    // FIZIK-1: İğne (sürtünme 3/s) 1 s'de merkeze doğru birkaç birim; yan sapma yok
    const dx = x0[1]! - d.topaclar[1].x;
    expect(dx).toBeGreaterThan(0);
    expect(dx).toBeLessThan(10);
    expect(d.topaclar[1].z).toBe(0);
  });

  it("Sıkı Dönüş: hareket 0, erime × Uç çarpanı", () => {
    const a = dunyaKur([MADEN, MADEN], 1);
    const b = dunyaKur([MADEN, MADEN], 1);
    // çanak merkezinde: çanak eğimi 0, iki topaç da hızsız kalır (FIZIK-1)
    a.topaclar[0].x = 0; b.topaclar[0].x = 0;
    ileri(a, 60, g({ dinlen: true }));
    ileri(b, 60);
    const kayipA = MADEN.maxStamina - a.topaclar[0].stamina;
    const kayipB = MADEN.maxStamina - b.topaclar[0].stamina;
    expect(kayipA / kayipB).toBeCloseTo(MADEN.sim.sikiDonusCarpani, 5);
  });

  it("dash: +dashHiziEki, bekleme, bedel; eylem staminayı sıfıra indiremez", () => {
    const d = dunyaKur([MADEN, MADEN], 1);
    adim(d, [g({ dash: true, yonX: 1 }), bosGirdi()]);
    expect(d.olaylar.some((o) => o.tur === "dash")).toBe(true);
    expect(d.topaclar[0].dashBekleme).toBe(MADEN.sim.dashBekleme);
    adim(d, [g({ dash: true, yonX: 1 }), bosGirdi()]);
    expect(d.olaylar.some((o) => o.tur === "dash")).toBe(false); // beklemede
    const e = dunyaKur([MADEN, MADEN], 1);
    e.topaclar[0].stamina = MADEN.sim.dashMaliyet + AYAR.eylemStaminaPayi - 0.5;
    adim(e, [g({ dash: true, yonX: 1 }), bosGirdi()]);
    expect(e.olaylar.some((o) => o.tur === "dash")).toBe(false);
  });

  it("sekme: 0,30 s çarpışma geçirmez", () => {
    const d = dunyaKur([MADEN, MADEN], 1);
    d.topaclar[0].x = -20; d.topaclar[1].x = 40; d.topaclar[0].vx = 300;
    adim(d, [g({ zipla: true }), bosGirdi()]);
    const o = ileri(d, 10);
    expect(o.some((x) => x.tur === "carpisma")).toBe(false);
  });

  it("girdiTemizle: yön uzunluğu ≤ 1, nişan çanaktan kırpılır, NaN 0", () => {
    const t = girdiTemizle(g({ yonX: 5, yonZ: 5, nisanX: 1e9, nisanZ: Number.NaN }));
    expect(Math.hypot(t.yonX, t.yonZ)).toBeCloseTo(1, 12);
    expect(t.nisanX).toBe(AYAR.arenaYaricap + AYAR.nisanTasma);
    expect(t.nisanZ).toBe(0);
  });
});

describe("çarpışma", () => {
  /** İki topaç karşılıklı vn ile. */
  function karsi(p1: TopacProfili, p2: TopacProfili, v: number): Dunya {
    const d = dunyaKur([p1, p2], 1, { fazlar: [0, 0] });
    d.topaclar[0].x = -31; d.topaclar[0].vx = v;
    d.topaclar[1].x = 31; d.topaclar[1].vx = -v;
    return d;
  }

  it("ağır topaç hafifi daha çok savurur; ikisi de stamina kaybeder (geri tepme)", () => {
    const d = karsi(GOKTASI, MADEN, 200);
    const o = ileri(d, 1).find((x) => x.tur === "carpisma");
    expect(o).toBeDefined();
    expect(Math.abs(d.topaclar[0].vx)).toBeGreaterThan(Math.abs(d.topaclar[1].vx));
    expect(d.topaclar[0].stamina).toBeLessThan(GOKTASI.maxStamina);
    expect(d.topaclar[1].stamina).toBeLessThan(MADEN.maxStamina);
  });

  it("Ş = μ·vn, tek vuruş tavanı %30, tık tavanı 1,2", () => {
    const S = 1e7;
    expect(hasarHesapla(S, GOKTASI, 1, MADEN, 1.3)).toBe(AYAR.tekVurusTavani * GOKTASI.maxStamina);
    expect(tikHesapla(S, GOKTASI, MADEN, 1)).toBe(AYAR.tikTavan);
    const d = karsi(YAPAY, YAPAY, 150);
    const o = ileri(d, 1).find((x) => x.tur === "carpisma");
    if (o?.tur !== "carpisma") throw new Error("çarpışma yok");
    const m = YAPAY.sim.etkinKutle;
    expect(o.s).toBeCloseTo(((m * m) / (m + m)) * o.vn, 9);
  });

  it("temas kilidi: 6 adım aynı çiftte ikinci darbe yok", () => {
    const d = karsi(MADEN, MADEN, 60);
    const o = ileri(d, AYAR.temasKilidi, g({ yonX: 1 }), g({ yonX: -1 }));
    expect(o.filter((x) => x.tur === "carpisma").length).toBe(1);
  });

  it("yorgun topaç daha uzağa savrulur (kb büyür)", () => {
    const a = karsi(MADEN, MADEN, 200);
    const b = karsi(MADEN, MADEN, 200);
    b.topaclar[1].stamina = MADEN.maxStamina * 0.1;
    ileri(a, 1); ileri(b, 1);
    expect(Math.abs(b.topaclar[1].vx)).toBeGreaterThan(Math.abs(a.topaclar[1].vx));
  });

  it("zıt yön eşitleme: yüksek oranlıdan düşüğe stamina akar (sağ vs sol)", () => {
    const sol = topacProfiliKur("kasirga-yapay", "savrulan-govde", "denge-disk", "dengeli-uc", { yon: "sol" });
    const d = karsi(YAPAY, sol, 80);
    d.topaclar[1].stamina = sol.maxStamina * 0.5;
    const o = ileri(d, 1).find((x) => x.tur === "carpisma");
    if (o?.tur !== "carpisma") throw new Error("çarpışma yok");
    expect(o.zitYon).toBe(true);
    expect(o.esitleme).toBeGreaterThan(0);
    expect(o.esitleme).toBeLessThanOrEqual(AYAR.kEsitEnFazla);
  });

  it("karşıt element çarkta +3 (Kor-Girdap, Kasırga-Kaya, Şimşek-Don)", () => {
    expect(zitElementMi("kor", "girdap")).toBe(true);
    expect(zitElementMi("kaya", "kasirga")).toBe(true);
    expect(zitElementMi("don", "simsek")).toBe(true);
    expect(zitElementMi("kor", "kasirga")).toBe(false);
  });
});

describe("bitişler ve tur kararı", () => {
  it("Ring Out: kenarda dışa hız ≥ vRO", () => {
    const d = dunyaKur([GOKTASI, MADEN], 1);
    d.topaclar[1].x = 205; d.topaclar[1].vx = 400;
    const o = ileri(d, 3);
    expect(o.some((x) => x.tur === "ringOut" && x.i === 1)).toBe(true);
    expect(d.mac.sonuc).toMatchObject({ tur: "ringOut", kazanan: 0, puan: AYAR.puan.ringOut });
  });

  it("vRO altında sekme: duvar olayı, stamina bedeli, Ring Out yok", () => {
    const d = dunyaKur([GOKTASI, MADEN], 1);
    d.topaclar[1].x = 205; d.topaclar[1].vx = 150;
    const s0 = d.topaclar[1].stamina;
    const o = ileri(d, 3);
    expect(o.some((x) => x.tur === "duvar")).toBe(true);
    expect(d.topaclar[1].durum).toBe(TOPAC_DURUM.aktif);
    expect(d.topaclar[1].vx).toBeLessThan(0);
    expect(d.topaclar[1].stamina).toBeLessThan(s0);
  });

  it("Parçalanma: tik ≥ burstEsik, geri dönüş yok", () => {
    const d = dunyaKur([GOKTASI, MADEN], 1);
    d.topaclar[1].tik = MADEN.parametreler.burstEsik;
    ileri(d, 1);
    expect(d.mac.sonuc).toMatchObject({ tur: "parcalanma", kaybeden: 1 });
  });

  it("aynı topaçta aynı adım Parçalanma + Ring Out → Parçalanma yazılır", () => {
    const d = dunyaKur([GOKTASI, MADEN], 1);
    d.topaclar[1].x = 209; d.topaclar[1].vx = 400; d.topaclar[1].tik = 99;
    ileri(d, 1);
    expect(d.mac.sonuc?.tur).toBe("parcalanma");
  });

  it("aynı topaçta Ring Out + Durma → Ring Out (öncelik)", () => {
    const d = dunyaKur([GOKTASI, MADEN], 1);
    d.topaclar[1].x = 209; d.topaclar[1].vx = 400; d.topaclar[1].stamina = 0.01;
    ileri(d, 1);
    expect(d.mac.sonuc?.tur).toBe("ringOut");
  });

  it("farklı topaçlar aynı adım → berabere, puan yok, ikisi de elenir", () => {
    const d = dunyaKur([GOKTASI, MADEN], 1);
    d.topaclar[0].tik = 99;
    d.topaclar[1].stamina = 0.01;
    ileri(d, 1);
    expect(d.mac.sonuc).toMatchObject({ tur: "berabere", kazanan: -1, puan: 0 });
    expect(d.mac.puan).toStrictEqual([0, 0]);
    expect(d.topaclar.every((t) => t.durum !== TOPAC_DURUM.aktif)).toBe(true);
  });

  it("Durma: karar stamina ≤ 0 anında; 40 adım sönümde gelen olay sonucu değiştirmez", () => {
    const d = dunyaKur([GOKTASI, MADEN], 1);
    d.topaclar[1].stamina = 0.01;
    ileri(d, 1);
    expect(d.mac.sonuc?.tur).toBe("durma");
    expect(d.topaclar[1].sonumKalan).toBe(AYAR.durmaSonumu);
    // sönüm sırasında rakip kendini düşürse bile sonuç Durma kalır (flint #6)
    d.topaclar[0].x = 205; d.topaclar[0].vx = 500;
    const o = ileri(d, 40);
    expect(o.some((x) => x.tur === "ringOut")).toBe(false);
    expect(d.mac.sonuc?.tur).toBe("durma");
    expect(Math.abs(d.topaclar[1].vx)).toBe(0); // çanak eğimi içe hız verdiyse sönüm -0 bırakır
  });
});
