import { describe, expect, it } from "vitest";
import { HIS, KIVILCIM_OLCEK, TEMAS, type TemasOturumu, akisAcik, birikmeCarpani, patlamaAdedi, siddetBul, siddetPuani, temasAdimi } from "../src/istemci/oyun/his.ts";

// GU-E: çarpışma kıvılcımı / tepki ölçeği tek sürekli puandan gelir; kademe (siddetBul) ile tutarlı olmalı.
describe("çarpışma şiddet puanı (GU-E)", () => {
  it("vn ile tekdüze artar, kademe içinde de değişir", () => {
    let once = -1;
    for (let vn = 0; vn <= 700; vn += 10) {
      const g = siddetPuani(vn, 0, 0, false, false);
      expect(g).toBeGreaterThanOrEqual(once);
      once = g;
    }
    // hafif kademenin iki ucu farklı puan alır (sürekli ölçek)
    expect(siddetPuani(HIS.esik.agir - 1, 0, 0, false, false) - siddetPuani(HIS.esik.hafif, 0, 0, false, false)).toBeGreaterThan(0.25);
  });
  it("hasar ve tik puanı yükseltir; kritik her zaman ≥ 1, tavan 1,2", () => {
    expect(siddetPuani(200, 1, 1, false, false)).toBeGreaterThan(siddetPuani(200, 0, 0, false, false) + 0.25);
    for (const vn of [HIS.esik.kritik, 600, 2000]) {
      expect(siddetBul(vn, false)).toBe("kritik");
      expect(siddetPuani(vn, 0, 0, true, false)).toBeGreaterThanOrEqual(1);
      expect(siddetPuani(vn, 1, 1, true, true)).toBeLessThanOrEqual(1.2);
    }
  });
  it("hafif sürtme düşük, ağır vuruş yüksek puan (kıvılcım adedi/uzunluğu buna bağlı)", () => {
    expect(siddetPuani(HIS.esik.hafif, 0.05, 0.05, false, false)).toBeLessThan(0.15);
    expect(siddetPuani(HIS.esik.agir + 100, 0.6, 1, false, false)).toBeGreaterThan(0.6);
  });
});

// GU-F: FIZIK-1 sonrası temaslar kısa (medyan 2 kare, ≥ 90 br/s ayrılma); kıvılcım ölçeği ve temas oturumu buna göre.
describe("kıvılcım ölçeği ve birikme (GU-F)", () => {
  it("patlama adedi puanla artar; hafif az, ağır referans 07 düzeyinde, kritik tavanı aşmaz", () => {
    let once = 0;
    for (let s = 0; s <= 1.2; s += 0.05) { const n = patlamaAdedi(s); expect(n).toBeGreaterThanOrEqual(once); once = n; }
    expect(patlamaAdedi(0.1)).toBeLessThanOrEqual(5);
    expect(patlamaAdedi(0.6)).toBeGreaterThanOrEqual(15);
    expect(patlamaAdedi(1.2)).toBeLessThanOrEqual(55);
    expect(patlamaAdedi(1.2, 0.4)).toBeLessThan(patlamaAdedi(1.2));
  });
  it("art arda patlama kısılır ama hiç sıfırlanmaz; yük sönünce tam adet geri gelir", () => {
    expect(birikmeCarpani(0)).toBe(1);
    expect(birikmeCarpani(1)).toBeLessThan(0.6);
    expect(birikmeCarpani(100)).toBe(KIVILCIM_OLCEK.birikmeTaban);
    // 0,15 s arayla 6 ağır darbe: toplam adet kısmasız toplamın %60'ından az, son darbe ilkin ≤ %40'ı
    let yuk = 0, toplam = 0, son = 0;
    for (let k = 0; k < 6; k++) { son = Math.round(patlamaAdedi(1) * birikmeCarpani(yuk)); toplam += son; yuk = (yuk + 1) * Math.exp(-0.15 / KIVILCIM_OLCEK.yukTauSn); }
    expect(toplam).toBeLessThan(patlamaAdedi(1) * 6 * 0.6);
    expect(son).toBeLessThanOrEqual(patlamaAdedi(1) * 0.4);
    expect(birikmeCarpani(1.2 * Math.exp(-2 / KIVILCIM_OLCEK.yukTauSn))).toBeGreaterThan(0.98);
  });
  it("hafif temas hızlı söner (ömür üst sınırı ağırın yarısından az)", () => {
    const ust = (s: number) => KIVILCIM_OLCEK.omurUst[0] + KIVILCIM_OLCEK.omurUst[1] * s;
    expect(ust(0.1)).toBeLessThan(ust(1) * 0.5);
  });
});

describe("sürekli temas oturumu (GU-F)", () => {
  const dt = 1 / 60;
  const yeni = (): TemasOturumu => ({ oturum: false, temasSn: 0, kopukSn: TEMAS.toleransSn });
  it("FIZIK-1 tipik kısa temas (2 kare, sonra 90 br/s ayrılma) akış açmaz", () => {
    const o = yeni();
    let acildi = false;
    for (const m of [60, 60, 61.5, 63, 64.5, 66, 67.5, 69, 70.5]) { temasAdimi(o, m, 60, dt); acildi ||= akisAcik(o); }
    expect(acildi).toBe(false);
  });
  it("uzun temas akışı açar; kısa ayrılma-yeniden temas titremesinde akış kapanmaz", () => {
    const o = yeni();
    for (let k = 0; k < 10; k++) temasAdimi(o, 60, 60, dt);
    expect(akisAcik(o)).toBe(true);
    // 5 kare ayrılma (0,083 s < tolerans), sonra yeniden temas: oturum ve süre sürer
    const sure = o.temasSn;
    for (let k = 0; k < 5; k++) { temasAdimi(o, 70, 60, dt); expect(akisAcik(o)).toBe(true); }
    temasAdimi(o, 61, 60, dt);
    expect(o.temasSn).toBeGreaterThan(sure);
  });
  it("art arda kısa temaslar (0,22 s arayla) süreyi biriktirir ve akışa geçer; uzun ayrılma oturumu bitirir", () => {
    const o = yeni();
    let acildi = -1;
    for (let c = 0; c < 6 && acildi < 0; c++) {
      for (let k = 0; k < 4; k++) temasAdimi(o, 60, 60, dt);
      if (akisAcik(o)) acildi = c;
      for (let k = 0; k < 9; k++) temasAdimi(o, 75, 60, dt);
    }
    expect(acildi).toBeGreaterThanOrEqual(1);
    for (let k = 0; k < Math.ceil(TEMAS.toleransSn / dt) + 1; k++) temasAdimi(o, 90, 60, dt);
    expect(o.oturum).toBe(false);
    expect(o.temasSn).toBe(0);
  });
  it("histerezis: yeni oturum 2r + payPx ister, oturum sürerken 2r + cikisPx temas sayılır", () => {
    const o = yeni();
    expect(temasAdimi(o, 60 + TEMAS.cikisPx, 60, dt)).toBe(false);
    temasAdimi(o, 60, 60, dt);
    expect(temasAdimi(o, 60 + TEMAS.cikisPx, 60, dt)).toBe(true);
  });
});
