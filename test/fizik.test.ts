import { describe, expect, it } from "vitest";
import { AYAR } from "../src/paylasilan/kurallar/ayar.ts";
import { adim, dunyaKur, macDunyasiKur, type TakimProfilleri } from "../src/paylasilan/sim/Dunya.ts";
import { bosGirdi } from "../src/paylasilan/sim/Girdi.ts";
import type { Dunya } from "../src/paylasilan/sim/durum.ts";
import { kendiAdimi, topacKopyala } from "../src/paylasilan/sim/tahmin.ts";
import { UCLAR } from "../src/paylasilan/veri/katalog.ts";
import { topacProfiliKur } from "../src/paylasilan/veri/profil.ts";

// FIZIK-1: girdisiz topaçlar çanakta merkeze süzülür ve birbirine çarpar; çarpışmadan sonra sekip ayrılır
// (yapışık titreşim yok), sonra yeniden çarpar. Çanak eğimi tahmin modeli A'da da aynı koddan koşar.

const G = [bosGirdi(), bosGirdi()] as const;
const IGNE = topacProfiliKur("kaya-maden", "kalkan-govde", "agir-disk", "igne-uc");
const ILK_CARPISMA_SINIRI_SN = 15;

function ilkCarpisma(d: Dunya, sinirSn: number): number {
  for (let n = 0; n < sinirSn * AYAR.adimHz; n++) {
    adim(d, G);
    if (d.olaylar.some((o) => o.tur === "carpisma")) return d.tick / AYAR.adimHz;
    if (d.mac.sonuc) break;
  }
  return Number.POSITIVE_INFINITY;
}

describe("çanak eğimi: girdisiz iki topaç çarpışır", () => {
  it(`her Uç eşleşmesi (6×6), sıfır girdi: ilk çarpışma ≤ ${ILK_CARPISMA_SINIRI_SN} s`, () => {
    const enGec: [string, number][] = [];
    for (const a of UCLAR) for (const b of UCLAR) {
      const pa = topacProfiliKur("kor-goktasi", "ok-govde", "hafif-disk", a.id);
      const pb = topacProfiliKur("kaya-maden", "kalkan-govde", "agir-disk", b.id);
      enGec.push([`${a.id}×${b.id}`, ilkCarpisma(dunyaKur([pa, pb], 7), ILK_CARPISMA_SINIRI_SN)]);
    }
    for (const [ad, s] of enGec) expect(s, ad).toBeLessThanOrEqual(ILK_CARPISMA_SINIRI_SN);
  });

  it("tam maç kipi (geri sayım + giriş koruması dahil), sıfır girdi: ilk turda çarpışma var", () => {
    const P = (u: string) => topacProfiliKur("kaya-maden", "kalkan-govde", "agir-disk", u);
    const Q = (u: string) => topacProfiliKur("kor-goktasi", "ok-govde", "hafif-disk", u);
    const R = (u: string) => topacProfiliKur("girdap-maden", "halka-govde", "parlak-disk", u);
    const t0: TakimProfilleri = [P("igne-uc"), Q("duz-uc"), R("top-uc")];
    const t1: TakimProfilleri = [P("igne-uc"), Q("dengeli-uc"), R("kusak-ucu")];
    const d = macDunyasiKur([t0, t1], 3);
    let carpisma = 0;
    for (let n = 0; n < 25 * AYAR.adimHz && carpisma === 0; n++) {
      adim(d, G);
      carpisma += d.olaylar.filter((o) => o.tur === "carpisma").length;
    }
    expect(carpisma).toBeGreaterThan(0);
  });

  it("çanak eğimi radyal ve sürüşten küçük: merkezde 0, dışta sabit, en yavaş Uç ivmesinin ≤ %15'i", () => {
    for (const u of UCLAR) expect(AYAR.canakEgimi).toBeLessThanOrEqual(0.15 * u.uc.ivme);
    expect(AYAR.canakEgimi).toBeGreaterThan(AYAR.sabitSurtunme); // Coulomb'u yener: girdisiz topaç durmaz
    const d = dunyaKur([IGNE, IGNE], 1);
    d.topaclar[0].x = 0; d.topaclar[0].z = 0;
    d.topaclar[1].x = 0; d.topaclar[1].z = 150;
    adim(d, G);
    expect(d.topaclar[0].vx).toBe(0);
    expect(d.topaclar[0].vz).toBe(0);
    expect(d.topaclar[1].vx).toBe(0);
    expect(d.topaclar[1].vz).toBeLessThan(0);
  });
});

describe("sekme: çarpış-ayrıl-çarp ritmi", () => {
  it("iki İğne girdisiz 30 s: ≥ 3 çarpışma, her çarpışmadan sonra ayrılıp yeniden çarparlar (yapışma yok)", () => {
    const d = dunyaKur([IGNE, IGNE], 2);
    let carpisma = 0;
    let ayrilma = 0;
    let temasta = false;
    for (let n = 0; n < 30 * AYAR.adimHz && !d.mac.sonuc; n++) {
      adim(d, G);
      if (d.olaylar.some((o) => o.tur === "carpisma")) {
        expect(temasta, `tick ${d.tick}: ayrılmadan yeni çarpışma`).toBe(false);
        carpisma++;
        temasta = true;
      }
      const [a, b] = d.topaclar;
      const dx = a.x - b.x;
      const dz = a.z - b.z;
      const bosluk = Math.sqrt(dx * dx + dz * dz) - 2 * AYAR.topacYaricap;
      if (temasta && bosluk > 5) { temasta = false; ayrilma++; }
    }
    expect(carpisma).toBeGreaterThanOrEqual(3);
    expect(ayrilma).toBeGreaterThanOrEqual(carpisma - 1);
  });

  it("yavaş temas: darbeden hemen sonra normal boyunca ayrılma hızı ≥ ayrilmaHizi, momentum korunur", () => {
    const d = dunyaKur([IGNE, IGNE], 3);
    const [a, b] = d.topaclar;
    a.x = -29.9; a.z = 0; a.vx = 10; b.x = 29.9; b.z = 0; b.vx = -10;
    const m = IGNE.sim.etkinKutle;
    adim(d, G);
    expect(d.olaylar.some((o) => o.tur === "carpisma")).toBe(true);
    expect(b.vx - a.vx).toBeGreaterThanOrEqual(AYAR.ayrilmaHizi - 1e-9);
    expect(Math.abs(m * a.vx + m * b.vx)).toBeLessThan(1e-6);
  });
});

describe("tahmin modeli A: çanak eğimi istemcide aynı", () => {
  it("girdisiz 90 adım (çarpışmadan önce): kendiAdimi sunucu sim'iyle bit bit aynı", () => {
    const P = (u: string) => topacProfiliKur("kaya-maden", "kalkan-govde", "agir-disk", u);
    const takim: TakimProfilleri = [P("igne-uc"), topacProfiliKur("kor-goktasi", "ok-govde", "hafif-disk", "top-uc"), topacProfiliKur("girdap-maden", "halka-govde", "parlak-disk", "duz-uc")];
    const d = macDunyasiKur([takim, takim], 9);
    while (d.mac.faz !== "tur") adim(d, G);
    const t = topacKopyala(d.topaclar[0]);
    const kopya = structuredClone(d);
    const x0 = t.x;
    for (let k = 0; k < 90; k++) {
      kendiAdimi(kopya, 0, t, bosGirdi(), kopya.tick + 1 + k);
      adim(d, G);
      expect(d.olaylar.some((o) => o.tur === "carpisma")).toBe(false);
    }
    expect(t.x).not.toBe(x0); // çanak eğimi yürüttü
    expect(t.x).toBe(d.topaclar[0].x);
    expect(t.z).toBe(d.topaclar[0].z);
    expect(t.vx).toBe(d.topaclar[0].vx);
    expect(t.vz).toBe(d.topaclar[0].vz);
  });
});
