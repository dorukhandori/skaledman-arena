import { describe, expect, it } from "vitest";
import { dugumTurnuvasi, vekilTakimi } from "../../araclar/harita-zorluk-turnuvasi.ts";
import { DOVME, buildTurnuvasi, dovmeBuildleri } from "../../araclar/dovme-parca-turnuvasi.ts";
import { dugumBul } from "../../src/paylasilan/kurallar/harita.ts";
import { HARITA, type DovusDugumu } from "../../src/paylasilan/veri/harita.ts";
import { PARCALAR } from "../../src/paylasilan/veri/katalog.ts";
import { takimKurulumu } from "../../src/paylasilan/veri/takimlar.ts";

// H-H4 / H-H5 (docs/design/harita/06 § 5; rapor docs/production/raporlar/HARITA-DENGE.md): turnuva betiklerinin duman
// testi + H-H4 ayarının (zorluk → bot kipi/seviyesi) ve dövme parça bayrağının veri sözleşmesi.

/** H-H4 turnuvasıyla ayarlanan eşleme (HARITA-DENGE.md § 2): zorluk → [botKip, botSeviye]. */
const ZORLUK_BOT: Record<number, [string, number]> = { 1: ["kukla", 1], 2: ["dolas", 2], 3: ["dolas", 3], 4: ["kenar", 2], 5: ["kenar", 3] };

describe("H-H4 harita zorluk turnuvası", () => {
  it("her dövüş düğümü zorluk eşlemesine uyar (dayanıklılık kipi haritada yok)", () => {
    for (const b of HARITA.bolgeler) for (const d of b.dugumler) {
      if (d.tur !== "dusman" && d.tur !== "patron") continue;
      expect([d.botKip, d.botSeviye], d.id).toStrictEqual(ZORLUK_BOT[d.zorluk]);
    }
  });

  it("vekil takımlar kurulur: hazır (Lv.3 oyuncu seviyesi) ve yeni hesap (Lv.2 + iki ödünç Lv.1)", () => {
    expect(takimKurulumu(vekilTakimi("hazir", 0)).seviyeler).toBeNull();
    expect(takimKurulumu(vekilTakimi("yeni", 1)).seviyeler).toStrictEqual([2, 1, 1]);
  });

  it("düğüm turnuvası deterministik (aynı tohum → aynı sonuç)", () => {
    const d = dugumBul("b1-01") as DovusDugumu;
    const a = dugumTurnuvasi(d, 1, 2, 5);
    expect(dugumTurnuvasi(d, 1, 2, 5)).toStrictEqual(a);
    expect(a.n).toBe(2);
    expect(a.bitis.toplam).toBeGreaterThan(0);
  });
});

describe("H-H5 dövme parçalar (bayrak dovmeParcalari kapalı)", () => {
  it("3 dövme parça ayrı dosyada; katalogda (parcalar.json) yoklar", () => {
    expect(DOVME.map((p) => p.id)).toStrictEqual(["dag-diski", "kiragi-ucu", "koz-govde"]);
    for (const p of DOVME) {
      expect(p.katman).toBe("dovme");
      expect(p.fiyat).toBeNull();
      expect(PARCALAR.parcalar.some((x) => x.id === p.id)).toBe(false);
    }
  });

  it("dövme build turnuvası koşar (12 build, düello duman testi)", () => {
    const b = dovmeBuildleri();
    expect(b.length).toBe(12);
    const h = buildTurnuvasi(b[0]!, 2, [1]);
    expect(h.map((x) => x.n)).toStrictEqual([2, 2, 2, 2]);
  });
});
