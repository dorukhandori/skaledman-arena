// MENU-P1A (@glyph): lobi / maç / sonuç / krediler menü düzeltmelerinin saf parçaları ve kaynak denetimleri.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { kredilerDerle, oyuncuKredileri, parantezsiz } from "../src/paylasilan/krediler.ts";
import { ROZET_EN_AZ_MAC_YAMASI, ROZET_EN_AZ_RTT_ORNEGI, baglantiRozetiKarari } from "../src/istemci/ag/baglantiRozeti.ts";
import { heceliAd } from "../src/istemci/oyun/heceliAd.ts";

const oku = (yol: string): string => readFileSync(yol, "utf8");
const json = (yol: string): unknown => JSON.parse(oku(yol));

describe("H-2 krediler oyuncu sürümü (S-3)", () => {
  const k = kredilerDerle(oku("docs/art/krediler.md"), json("veri/manifest-gorsel.json"), json("veri/manifest-ses.json"));
  const bolumler = oyuncuKredileri(k);
  const tum = bolumler.flatMap((b) => b.satirlar);
  const metin = JSON.stringify(bolumler);

  it("yalnız Varlık · Atıf · Lisans; iç durum notu, dosya yolu ve aday ibaresi yok", () => {
    expect(tum.length).toBeGreaterThan(10);
    for (const s of tum) {
      expect(Object.keys(s).sort()).toStrictEqual(["atif", "lisans", "varlik"]);
      expect(s.varlik.length).toBeGreaterThan(0);
    }
    expect(metin).not.toMatch(/entegre|aday|doğrulanacak|yedek havuz|kaynak\/efekt|public\/|src\/|araclar\/|\.png|\.ogg|https?:\/\//i);
  });

  it("oyunda yüklenmeyen varlıklar (Foozle yedek havuzu, bayrakla kapalı ruh portreleri) gösterilmez", () => {
    expect(metin).not.toMatch(/foozle|lordfitoi/i);
    expect(metin).not.toMatch(/ruh portresi/i);
  });

  it("oyunda çalınan kayıt sesleri ve yazı tipleri atıfıyla listelenir", () => {
    expect(tum.some((s) => /Kenney/.test(s.atif) && s.lisans.startsWith("CC0"))).toBe(true);
    expect(tum.some((s) => s.varlik === "Jersey 10" && /OFL/.test(s.lisans))).toBe(true);
    expect(tum.some((s) => s.varlik === "m5x7")).toBe(true);
  });

  it("boş girdi → boş liste; parantez ayıklama iç içe çalışır", () => {
    expect(oyuncuKredileri(kredilerDerle(null, null, null))).toStrictEqual([]);
    expect(parantezsiz("Jersey 10 (`public/yazi/x.ttf`; başlık (ana), düğme)")).toBe("Jersey 10");
  });

  it("aday satırı yalnız kullanılmıyor işareti taşıyorsa düşer", () => {
    const md = "## Depoda bulunan dış varlıklar\n| Varlık | Yazar / kaynak | Lisans | Atıf metni (oyun içi) | Durum |\n|---|---|---|---|---|\n"
      + "| Ses (`kaynak/a/`) | Biri — https://x.y | CC0 1.0 | \"Ses: Biri (CC0)\" | aday, entegre değil |\n"
      + "| Büyü (`kaynak/b/`) | Öteki | CC0 1.0 | \"Büyü: Öteki\" | yedek havuz, atlasa alınmadı |\n";
    expect(oyuncuKredileri(kredilerDerle(md, null, null))).toStrictEqual([{ baslik: "Ses ve görsel efektler", satirlar: [{ varlik: "Ses", atif: "Ses: Biri (CC0)", lisans: "CC0 1.0" }] }]);
  });
});

describe("H-10 bağlantı rozeti kararı", () => {
  const taban = { ms: 20, rakipBot: false, rttOrnek: 10, macYamasi: 400, takilmadanBeri: Infinity };
  it("bot maçında hiç görünmez (localhost bot maçında yanlış 'kayıp')", () => {
    expect(baglantiRozetiKarari({ ...taban, rakipBot: true, ms: 400, takilmadanBeri: 10 }).goster).toBe(false);
  });
  it("ölçüm yetersizken görünmez", () => {
    expect(baglantiRozetiKarari({ ...taban, ms: 400, rttOrnek: ROZET_EN_AZ_RTT_ORNEGI - 1 }).goster).toBe(false);
    expect(baglantiRozetiKarari({ ...taban, ms: 400, macYamasi: ROZET_EN_AZ_MAC_YAMASI - 1 }).goster).toBe(false);
  });
  it("gerçek rakipte yüksek gecikme ya da yakın takılma gösterilir", () => {
    expect(baglantiRozetiKarari({ ...taban, ms: 151 })).toStrictEqual({ goster: true, ms: 151, kayip: false });
    expect(baglantiRozetiKarari({ ...taban, takilmadanBeri: 1000 })).toStrictEqual({ goster: true, ms: 20, kayip: true });
    expect(baglantiRozetiKarari(taban).goster).toBe(false);
  });
  it("takılma yalnız maç fazında ölçülür", () => {
    expect(oku("src/istemci/ag/AgMaci.ts")).toMatch(/macta && this\.oncekiMacta && this\.sonYamaMs/);
  });
});

describe("H-12 HUD yetenek adı", () => {
  it("hece sınırlarına yumuşak tire koyar, metni değiştirmez", () => {
    expect(heceliAd("Közyağmuru").replace(/­/g, "-")).toBe("Köz-yağ-mu-ru");
    expect(heceliAd("Kaya Soğuğu").replace(/­/g, "")).toBe("Kaya Soğuğu");
    expect(heceliAd("Kaya Soğuğu")).toBe("Kaya Soğuğu"); // kısa sözcük: boşlukta kırılır, hecelenmez
  });
  it("etiket pixel yazıda ve kesilmiyor (ellipsis yok); tam ad title'da", () => {
    const s = oku("src/istemci/oyun/MacHud.ts");
    const ya = /\.mh \.ya \{[^}]*\}/.exec(s)?.[0] ?? "";
    expect(ya).toMatch(/m5x7/);
    expect(ya).not.toMatch(/ellipsis|system-ui|font-size:8px/);
    expect(s).toMatch(/yuvaAdlari\[k\]!\.title = bilgi\?\.ad/);
  });
});

describe("menü kaynak denetimleri (MENU-P1A)", () => {
  it("H-1: oda ekranında QR yer tutucu yok (S-2)", () => {
    expect(oku("src/istemci/ekranlar/Lobi.ts")).not.toMatch(/lb-qr|yer tutucu"/);
  });
  it("H-5: sonuç tablosunda rakip puanı eksiyle yazılmaz", () => {
    const s = oku("src/istemci/ekranlar/Mac.ts");
    expect(s).not.toMatch(/"\+" : "−"/);
    expect(s).toMatch(/tr\.rakip td:last-child/);
  });
  it("H-14: ?ekran=ruhlar yalnız ?gelistir=1 ile yönlenir", () => {
    const s = oku("src/istemci/main.ts");
    expect(s).toMatch(/GELISTIRICI_EKRANLARI = new Set<EkranAdi>\(\["ruhlar"\]\)/);
    expect(s).toMatch(/istenen in EKRANLAR && ekranIzinli\(/);
  });
});
