import { describe, expect, it } from "vitest";
import { HARITA, MADENLER, MARKET_FIYAT, TARIFLER, USTALIK, SURUM_KADEME_TAVANI } from "../src/paylasilan/veri/harita.ts";
import { PARCALAR, parcaBul } from "../src/paylasilan/veri/katalog.ts";
import { marketKilidi } from "../src/paylasilan/kurallar/market.ts";
import { bolgeIlerlemesi, DURUM } from "../src/paylasilan/kurallar/harita.ts";
import { KATALOG_OZETI } from "../src/ag/katalog.ts";
import { readFileSync } from "node:fs";

// H1 veri testi (docs/design/harita/08 § 4): graf, takımlar, eşikler, tarif girdileri; sayı otoritesi veri/*.json.

describe("veri/harita.json", () => {
  it("6 bölge, ilk sürüm 3; her bölge 12 düğüm (5 düşman, 1 patron, 4 maden, 2 sandık) ve 34 aşama puanı", () => {
    expect(HARITA.bolgeler.length).toBe(6);
    expect(HARITA.bolgeler.filter((b) => b.ilkSurum).map((b) => b.no)).toStrictEqual([1, 2, 3]);
    for (const b of HARITA.bolgeler) {
      const say = (t: string) => b.dugumler.filter((d) => d.tur === t).length;
      expect([say("dusman"), say("patron"), say("maden"), say("sandik")]).toStrictEqual([5, 1, 4, 2]);
      const hepsi = Object.fromEntries(b.dugumler.map((d) => [d.id, DURUM.ustalas]));
      expect(bolgeIlerlemesi(b, hepsi)).toMatchObject({ puan: 34, enCok: 34, yuzde: 100 });
    }
  });

  it("kimlikler bölge önekli, komşular aynı bölgede var; tek giriş (01); döngü yok; 11 patron, 12 Derin Damar", () => {
    for (const b of HARITA.bolgeler) {
      const ids = new Set(b.dugumler.map((d) => d.id));
      expect(b.dugumler.every((d) => d.id.startsWith(`b${b.no}-`))).toBe(true);
      for (const d of b.dugumler) for (const k of d.komsu) expect(ids.has(k), `${d.id}→${k}`).toBe(true);
      const gelen = new Set(b.dugumler.flatMap((d) => d.komsu));
      expect(b.dugumler.filter((d) => !gelen.has(d.id)).map((d) => d.id)).toStrictEqual([`b${b.no}-01`]);
      // DAG: topolojik sıralama tüm düğümleri tüketir
      const derece = new Map(b.dugumler.map((d) => [d.id, 0]));
      for (const d of b.dugumler) for (const k of d.komsu) derece.set(k, derece.get(k)! + 1);
      const kuyruk = [...derece].filter(([, n]) => n === 0).map(([id]) => id);
      let sayac = 0;
      while (kuyruk.length) {
        const x = kuyruk.shift()!;
        sayac++;
        for (const k of b.dugumler.find((d) => d.id === x)!.komsu) { derece.set(k, derece.get(k)! - 1); if (derece.get(k) === 0) kuyruk.push(k); }
      }
      expect(sayac).toBe(12);
      const p = b.dugumler.find((d) => d.id === `b${b.no}-11`)!;
      expect(p.tur).toBe("patron");
      const dd = b.dugumler.find((d) => d.id === `b${b.no}-12`)!;
      expect(dd.tur === "maden" && dd.kapasite).toBe(8);
      if (p.tur === "patron" && b.no < 6) expect(HARITA.bolgeler.find((x) => x.id === p.sonrakiBolge)?.no).toBe(b.no + 1);
    }
  });

  it("konumlar harita alanında (x 8–472, y 40–192)", () => {
    for (const b of HARITA.bolgeler) for (const d of b.dugumler) {
      expect(d.konum[0]).toBeGreaterThanOrEqual(8);
      expect(d.konum[0]).toBeLessThanOrEqual(472);
      expect(d.konum[1]).toBeGreaterThanOrEqual(40);
      expect(d.konum[1]).toBeLessThanOrEqual(192);
    }
  });

  it("bot takımları: 3 farklı Çekirdek, katalogda var olan doğru türde parçalar; ilk yıldız hep KAZAN", () => {
    for (const b of HARITA.bolgeler) for (const d of b.dugumler) {
      if (d.tur !== "dusman" && d.tur !== "patron") continue;
      expect(d.yildiz[0]).toBe("kazan");
      expect(new Set(d.yildiz).size).toBe(3);
      expect(new Set(d.takim.map((t) => t[0])).size).toBe(3);
      for (const [c, g, di, u] of d.takim) {
        expect(parcaBul(c).tur).toBe("cekirdek");
        expect(parcaBul(g).tur).toBe("govde");
        expect(parcaBul(di).tur).toBe("disk");
        expect(parcaBul(u).tur).toBe("uc");
      }
    }
  });
});

describe("veri/madenler.json + ustalik.json + tarifler.json + market-fiyat.json", () => {
  it("8 kademe, eşikler artan ve ≤ 100; ilk sürüm tavanı K4", () => {
    expect(MADENLER.map((k) => k.kademe)).toStrictEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(MADENLER.map((k) => k.esik)).toStrictEqual([0, 10, 25, 40, 55, 70, 82, 92]);
    for (let i = 1; i < 8; i++) expect(MADENLER[i]!.esik).toBeGreaterThan(MADENLER[i - 1]!.esik);
    expect(SURUM_KADEME_TAVANI).toBe(4);
  });

  it("Ustalık eğrisi: adim(L) = yuvarla(20 + 1,2L + 0,03L²)", () => {
    const k = USTALIK.kumulatif;
    for (let L = 0; L < 100; L++) expect(k[L + 1]! - k[L]!).toBe(Math.round(20 + 1.2 * L + 0.03 * L * L));
    expect(k[100]).toBe(17791);
  });

  it("tarifler: girdi kademeleri geçerli, eşik ≤ 100; ilk sürüm 8 kozmetik; dövme parçalar bayraklı ve K−1 alaşımlı", () => {
    for (const t of TARIFLER.tarifler) {
      expect(t.esik).toBeLessThanOrEqual(100);
      for (const g of t.girdi) { expect(g.kademe).toBeGreaterThanOrEqual(1); expect(g.kademe).toBeLessThanOrEqual(t.kademe); }
      if (t.tur === "parca") { expect(t.bayrak).toBe("dovmeParcalari"); expect(t.girdi.map((g) => g.kademe)).toStrictEqual([t.kademe, t.kademe - 1]); }
    }
    expect(TARIFLER.tarifler.filter((t) => t.ilkSurum && !t.bayrak).length).toBe(8);
  });

  it("Market fiyatı (SAPMA, 12 § 5): kilitsiz 15 parça 0; kilitli 12 parçanın toplamı 326 500", () => {
    const fiyat = (p: (typeof PARCALAR.parcalar)[number]) => (marketKilidi(p).kilit === "acik" ? 0 : MARKET_FIYAT.katman[p.katman]!);
    const kilitsiz = PARCALAR.parcalar.filter((p) => marketKilidi(p).kilit === "acik");
    expect(kilitsiz.length).toBe(15);
    expect(PARCALAR.parcalar.filter((p) => marketKilidi(p).kilit !== "acik").reduce((t, p) => t + fiyat(p), 0)).toBe(326500);
  });

  it("KATALOG_OZETI harita verisinden bağımsız (sim verisi değil)", () => {
    const kaynak = readFileSync(new URL("../src/ag/katalog.ts", import.meta.url), "utf8");
    expect(kaynak).not.toMatch(/harita|madenler|tarifler|market-fiyat|ustalik/);
    expect(KATALOG_OZETI).toMatch(/^[0-9a-f]{16}$/);
  });
});
