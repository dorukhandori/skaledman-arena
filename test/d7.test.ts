import { describe, expect, it } from "vitest";
import {
  type BasarimGirdisi, type BasarimKaydi, type BitisKaydi, type MacOzeti, OLAY_SOZLUGU, basarimAciklama, basarimIsle, macKapisi, pencereEnCok,
} from "../src/paylasilan/kurallar/basarim.ts";
import {
  EKONOMI, type MacAltinGirdisi, azalanGetiriCarpani, gunNo, gununParcasi, indirimliFiyat, macAltini, stilBonusu, yenilemeFiyati, yenilenebilir, zorluk,
} from "../src/paylasilan/kurallar/ekonomi.ts";
import { KUYRUK, botKabul, dereceliAcik, eloPenceresi, eloUygun, kuyrukAsamasi, sureBicimle } from "../src/paylasilan/kurallar/kuyruk.ts";
import {
  KATMAN_FIYATI, RAFLAR, gununParcasiAdaylari, marketDurumu, marketKilidi, rafUrunleri, satinAlmaDenetle, satisFiyati,
} from "../src/paylasilan/kurallar/market.ts";
import { parcaGorunumu } from "../src/paylasilan/kurallar/atolye.ts";
import { BASARIMLAR, PARCALAR, parcaBul } from "../src/paylasilan/veri/katalog.ts";
import { macDunyasiKur, adim } from "../src/paylasilan/sim/Dunya.ts";
import { takimKurulumu } from "../src/paylasilan/veri/takimlar.ts";
import { botGirdisi } from "../src/paylasilan/bot/bot.ts";
import { MacOzetSayaci } from "../src/sunucu/oyuncu/ozetSayaci.ts";

// D7 saf kurallar: Altın (tuning § 15, her kural bir satır), gün 04:00, azalan getiri, stil, yenileme fiyatı, günün
// parçası, Market kataloğu ve kilit durumu, 46 başarımın her biri için pozitif/negatif örnek (tablo güdümlü), kapılar,
// hızlı maç kuyruğu zamanlamaları, sim olaylarından maç özeti.

const G = (e: Partial<MacAltinGirdisi> = {}): MacAltinGirdisi => ({
  mod: "hizli", misafir: false, sonuc: "galibiyet", rakipTerk: false, sureSn: 60, gunlukMacNo: 2, gununIlkGalibiyeti: false, ciftGunlukMacNo: 1,
  stil: { yetenekleBitis: 0, farkliBitisTuru: 0, takimUltisi: false }, ...e,
});

describe("Altın kuralları (tuning § 15, satır satır)", () => {
  const tablo: [string, Partial<MacAltinGirdisi>, number][] = [
    ["galibiyet 100", {}, 100],
    ["mağlubiyet 60", { sonuc: "maglubiyet" }, 60],
    ["terk 0", { sonuc: "terk" }, 0],
    ["iptal 0", { sonuc: "iptal" }, 0],
    ["günün ilk galibiyeti +150", { gununIlkGalibiyeti: true }, 250],
    ["ilk galibiyet bonusu mağlubiyette yok", { sonuc: "maglubiyet", gununIlkGalibiyeti: true }, 60],
    ["stil: yetenekle bitiş +10", { stil: { yetenekleBitis: 2, farkliBitisTuru: 0, takimUltisi: false } }, 110],
    ["stil: her farklı bitiş türü +5", { stil: { yetenekleBitis: 0, farkliBitisTuru: 2, takimUltisi: false } }, 110],
    ["stil: farklı bitiş en çok +15", { stil: { yetenekleBitis: 0, farkliBitisTuru: 5, takimUltisi: false } }, 115],
    ["stil: Takım Ultisi +25", { stil: { yetenekleBitis: 0, farkliBitisTuru: 0, takimUltisi: true } }, 125],
    ["stil: maç başına en çok +40", { stil: { yetenekleBitis: 1, farkliBitisTuru: 3, takimUltisi: true } }, 140],
    ["azalan getiri: 15. maç ×1,0", { gunlukMacNo: 15 }, 100],
    ["azalan getiri: 16. maç ×0,5", { gunlukMacNo: 16 }, 50],
    ["azalan getiri: 30. maç ×0,5", { gunlukMacNo: 30, sonuc: "maglubiyet" }, 30],
    ["azalan getiri: 31. maç ×0,2", { gunlukMacNo: 31 }, 20],
    ["oda maçı ×0,25", { mod: "oda" }, 25],
    ["oda maçı mağlubiyet 60 × 0,25 = 15", { mod: "oda", sonuc: "maglubiyet" }, 15],
    ["bot maçı Altın yarı", { mod: "bot" }, 50],
    ["bot + ilk galibiyet (250 × 0,5)", { mod: "bot", gununIlkGalibiyeti: true }, 125],
    ["maç < 20 sn: 0", { sureSn: 19.9 }, 0],
    ["maç = 20 sn sayılır", { sureSn: 20 }, 100],
    ["misafir 0", { misafir: true }, 0],
    ["Antrenman 0", { mod: "antrenman" }, 0],
    ["aynı çift günde 3. maç sayılır", { ciftGunlukMacNo: 3 }, 100],
    ["aynı çift günde 4. maç 0", { ciftGunlukMacNo: 4 }, 0],
    ["rakip teslim/hükmen: yarım Altın, stil yok (G-17)", { rakipTerk: true, stil: { yetenekleBitis: 1, farkliBitisTuru: 2, takimUltisi: false } }, 50],
    ["çarpanlar çarpılır: 16. maç oda (100 × 0,5 × 0,25 = 12,5 → 13)", { gunlukMacNo: 16, mod: "oda" }, 13],
  ];
  it.each(tablo)("%s", (_ad, girdi, beklenen) => {
    expect(macAltini(G(girdi)).toplam).toBe(beklenen);
  });
  it("sıfır nedenleri ve kalem dökümü", () => {
    expect(macAltini(G({ sureSn: 5 })).sifirNedeni).toBe("kisaMac");
    expect(macAltini(G({ ciftGunlukMacNo: 4 })).sifirNedeni).toBe("ciftTavani");
    expect(macAltini(G({ misafir: true })).sifirNedeni).toBe("misafir");
    const a = macAltini(G({ gununIlkGalibiyeti: true, mod: "bot", stil: { yetenekleBitis: 1, farkliBitisTuru: 1, takimUltisi: false } }));
    expect(a.kalemler.map((k) => [k.neden, k.miktar])).toStrictEqual([["galibiyet", 100], ["ilkGalibiyet", 150], ["stilYetenek", 10], ["stilBitis", 5]]);
    expect(a.carpanlar).toStrictEqual([{ ad: "bot", deger: 0.5 }]);
    expect(a.toplam).toBe(133); // 265 × 0,5 = 132,5 → 133
    expect(stilBonusu({ yetenekleBitis: 3, farkliBitisTuru: 3, takimUltisi: true }).reduce((x, k) => x + k.miktar, 0)).toBe(40);
  });
  it("azalan getiri dilimleri", () => {
    expect([1, 15, 16, 30, 31, 100].map(azalanGetiriCarpani)).toStrictEqual([1, 1, 0.5, 0.5, 0.2, 0.2]);
  });
  it("gün 04:00 (Türkiye, UTC+3) sıfırlanır: enjekte edilen saat", () => {
    const t = (s: string) => Date.parse(s);
    expect(gunNo(t("2026-11-04T00:59:59Z"))).toBe(gunNo(t("2026-11-03T02:00:00Z"))); // 03:59:59 TR = önceki gün
    expect(gunNo(t("2026-11-04T01:00:00Z"))).toBe(gunNo(t("2026-11-04T00:59:59Z")) + 1); // 04:00 TR
    expect(gunNo(t("2026-11-04T20:59:00Z"))).toBe(gunNo(t("2026-11-05T00:30:00Z"))); // 23:59 ve 03:30 aynı gün
  });
  it("başarım ödül rozeti ve toplam (46 başarım = 22 100 Altın)", () => {
    expect([100, 200, 300, 500, 800, 1500].map(zorluk)).toStrictEqual(["kolay", "orta", "orta", "zor", "zor", "efsane"]);
    expect(BASARIMLAR.reduce((a, b) => a + b.odulAltin, 0)).toBe(22100);
  });
  it("Yapay yenileme: fiyatın %40'ı, Aşınmış ile %50 indirim; yalnız ömrü tam olmayan Yapay", () => {
    const kasirga = parcaBul("kasirga-yapay");
    expect(yenilemeFiyati(kasirga.fiyat, false)).toBe(40);
    expect(yenilemeFiyati(kasirga.fiyat, true)).toBe(20);
    expect(yenilemeFiyati(500, false)).toBe(200);
    expect([yenilenebilir(0), yenilenebilir(29), yenilenebilir(30), yenilenebilir(null)]).toStrictEqual([true, true, false, false]);
  });
});

describe("Market kataloğu (tuning § 16, 03 US-3.1)", () => {
  it("27 parçanın her biri tam bir rafta; dört raf + tezgâh alt başlığı", () => {
    expect(RAFLAR.map((r) => [r.ad, r.tezgah])).toStrictEqual([["Çekirdekler", "Kraterci"], ["Gövdeler", "Ocak"], ["Diskler", "Meydan Tezgâhı"], ["Uçlar", "Dökümhane"]]);
    const hepsi = RAFLAR.flatMap((r) => rafUrunleri(r.tur).map((p) => p.id));
    expect(hepsi).toHaveLength(27);
    expect(new Set(hepsi).size).toBe(27);
    expect([...hepsi].sort()).toStrictEqual(PARCALAR.parcalar.map((p) => p.id).sort());
    expect(RAFLAR.map((r) => rafUrunleri(r.tur).length)).toStrictEqual([8, 8, 5, 6]);
  });
  it("fiyat = katman fiyatı (Başlangıç 100 · Standart 500 · Nadir 2000 · Hizip 4000 · Karanlık 6000)", () => {
    for (const p of PARCALAR.parcalar) expect(p.fiyat, p.id).toBe(KATMAN_FIYATI[p.katman]);
    expect(PARCALAR.parcalar.reduce((a, p) => a + p.fiyat, 0)).toBe(46700);
  });
  it("kilit üç hâl: açık / kilitli-görünür (başarım adı + ilerleme) / gizli ???; tamamlanınca açılır", () => {
    const bos = { sahipAdet: 0, tamamlanan: new Set<string>(), ilerleme: {} };
    expect(marketDurumu(parcaBul("top-uc"), bos)).toMatchObject({ durum: "acik", etiket: "500 Altın" });
    expect(marketDurumu(parcaBul("ayaz-govde"), { ...bos, ilerleme: { "don-ustasi": 3 } })).toMatchObject({ durum: "kilitli", etiket: "Kilitli: Don Ustası 3/10" });
    expect(marketDurumu(parcaBul("ayaz-govde"), bos).okunan).toBe("Ayaz Gövde. 2000 Altın. Kilitli: Don Ustası 0/10.");
    expect(marketDurumu(parcaBul("kor-kalbi"), bos)).toMatchObject({ durum: "gizli", ad: "???", basarim: null });
    expect(marketDurumu(parcaBul("kor-kalbi"), { ...bos, tamamlanan: new Set(["kriz-donusu"]) })).toMatchObject({ durum: "acik", ad: "Kor Kalbi", basarimlaAcildi: true });
    expect(marketDurumu(parcaBul("parlak-disk"), { ...bos, tamamlanan: new Set(["parlayan"]) })).toMatchObject({ durum: "acik", basarimlaAcildi: true });
    expect(marketDurumu(parcaBul("duz-uc"), { ...bos, sahipAdet: 1 }).durum).toBe("sahip");
    // Atölye envanteri aynı kural (D6 kartı "Market'te" olur)
    expect(parcaGorunumu(parcaBul("parlak-disk"), 0, {}, new Set(["parlayan"])).durum).toBe("market");
  });
  it("nile B-9: Kül Çekirdeği Market'te kilitli-görünür (Elli Galibiyet); Tutucu Uç gizli (Aydınlanma sürüm dışı)", () => {
    expect(marketKilidi(parcaBul("kul-cekirdegi"))).toStrictEqual({ kilit: "elli-galibiyet", gorunum: "kilitli-gorunur" });
    const bos = { sahipAdet: 0, tamamlanan: new Set<string>(), ilerleme: { "elli-galibiyet": 7 } };
    expect(marketDurumu(parcaBul("kul-cekirdegi"), bos)).toMatchObject({ durum: "kilitli", etiket: "Kilitli: Elli Galibiyet 7/50" });
    expect(marketDurumu(parcaBul("karanlik-ucu"), bos).durum).toBe("gizli");
  });
  it("satın alma reddi: yok / Market kapalı / sahip / kilitli / yetersiz", () => {
    const o = { sahipAdet: 0, tamamlanan: new Set(["ilk-devir"]), ilerleme: {}, bakiye: 450, marketAcik: true };
    expect(satinAlmaDenetle(undefined, o, 0)).toBe("yok");
    expect(satinAlmaDenetle(parcaBul("top-uc"), { ...o, marketAcik: false }, 500)).toBe("marketKapali");
    expect(satinAlmaDenetle(parcaBul("duz-uc"), { ...o, sahipAdet: 1 }, 100)).toBe("sahip");
    expect(satinAlmaDenetle(parcaBul("ayaz-govde"), { ...o, bakiye: 99999 }, 2000)).toBe("kilitli");
    expect(satinAlmaDenetle(parcaBul("kor-kalbi"), { ...o, bakiye: 99999 }, 4000)).toBe("kilitli");
    expect(satinAlmaDenetle(parcaBul("top-uc"), o, 500)).toBe("yetersiz");
    expect(satinAlmaDenetle(parcaBul("duz-uc"), o, 100)).toBeNull();
  });
  it("günün parçası: gün başına sabit, deterministik, yalnız açık raftan; %30 indirim", () => {
    const ad = gununParcasiAdaylari();
    for (const id of ad) expect(marketKilidi(parcaBul(id)).kilit).toBe("acik");
    expect(ad).toHaveLength(15); // 12 başlangıç + Halka Gövde + Top Uç + Girdap Maden
    const g = gununParcasi(20400, "devran", ad);
    expect(gununParcasi(20400, "devran", ad)).toBe(g);
    expect(gununParcasi(20400, "devran", [...ad])).toBe(g);
    const ay = new Set(Array.from({ length: 30 }, (_, k) => gununParcasi(20400 + k, "devran", ad)));
    expect(ay.size).toBeGreaterThan(5);
    expect(gununParcasi(1, "x", [])).toBeNull();
    expect(indirimliFiyat(500)).toBe(350);
    expect(satisFiyati(parcaBul("top-uc"), "top-uc")).toBe(350);
    expect(satisFiyati(parcaBul("top-uc"), "duz-uc")).toBe(500);
  });
});

// ---- başarımlar ----
const OZ = (e: Partial<MacOzeti> = {}): MacOzeti => ({
  mod: "hizli", sayildi: true, kazandi: true, sureSn: 70, bitisler: [], enAzStaminaOran: 0.6, bitisStaminaOrani: 0.6, kalanStaminaOrani: 0.4,
  alinanCarpisma: 5, ozelYetenekSayisi: 1, enCokGeriPuan: 0, kusakSn: 5, zitElementCarpisma: 0, carpismaSnleri: [], aniOlum: false,
  cekirdekler: [{ tanimId: "kor-goktasi", element: "kor", koken: "goktasi" }], takimUltisi: false, rakipId: 9, evSahibi: false, destekKanaliCanli: false, ...e,
});
const B = (tur: BitisKaydi["tur"], e: Partial<BitisKaydi> = {}): BitisKaydi => ({ tur, macSn: 30, yetenekNo: null, yetenekGecenSn: null, alanNo: null, dash: false, macKazandiran: false, ...e });
const C = (tanimId: string, element: string, koken: string) => ({ tanimId, element, koken });
const m = (e: Partial<MacOzeti> = {}): BasarimGirdisi => ({ mac: OZ(e) });

/** Her başarım: [id, pozitif girdi, negatif girdi, pasif mi]. */
const DURUMLAR: [string, BasarimGirdisi, BasarimGirdisi, boolean?][] = [
  ["ilk-devir", { olay: { antrenmanBitti: true } }, m()],
  ["ilk-galibiyet", m(), m({ kazandi: false })],
  ["uclu", m(), m({ kazandi: false })],
  ["parlayan", { durum: { enYuksekSeviye: 3 } }, { durum: { enYuksekSeviye: 2 } }],
  ["on-galibiyet", m(), m({ mod: "oda" })],
  ["elli-galibiyet", m({ mod: "bot" }), m({ kazandi: false })],
  ["yuz-galibiyet", m(), m({ sayildi: false })],
  ["yuz-mac", m({ kazandi: false }), m({ mod: "oda" })],
  ["dusurucu", m({ bitisler: [B("ringOut"), B("ringOut")] }), m({ kazandi: false, bitisler: [B("ringOut")] })],
  ["kirici", m({ bitisler: [B("parcalanma")] }), m({ bitisler: [B("ringOut")] })],
  ["son-doren", m({ bitisler: [B("durma")] }), m({ bitisler: [B("durma")], mod: "bot" })],
  ["uc-yonlu", m({ bitisler: [B("ringOut"), B("durma")] }), m({ bitisler: [] })],
  ["seri", m(), m({ kazandi: false })],
  ["hizli-bitis", m({ sureSn: 35 }), m({ sureSn: 45 })],
  ["temiz-galibiyet", m({ kalanStaminaOrani: 0.6 }), m({ kalanStaminaOrani: 0.4 })],
  ["kor-ustasi", m(), m({ cekirdekler: [C("kaya-maden", "kaya", "maden")] })],
  ["kasirga-ustasi", m({ cekirdekler: [C("kasirga-yapay", "kasirga", "yapay")] }), m()],
  ["simsek-ustasi", m({ cekirdekler: [C("simsek-goktasi", "simsek", "goktasi")] }), m()],
  ["girdap-ustasi", m({ cekirdekler: [C("girdap-maden", "girdap", "maden")] }), m()],
  ["kaya-ustasi", m({ cekirdekler: [C("kaya-maden", "kaya", "maden")] }), m()],
  ["don-ustasi", m({ cekirdekler: [C("sabir-tasi", "don", "maden")] }), m()],
  ["cark-tamam", m(), m({ kazandi: false })],
  ["zit-kutup", m({ zitElementCarpisma: 3 }), m({ zitElementCarpisma: 0 })],
  ["kriz-donusu", m({ enAzStaminaOran: 0.05 }), m({ enAzStaminaOran: 0.2 })],
  ["kenar-yuruyusu", m({ kusakSn: 21 }), m({ kusakSn: 25, kazandi: false })],
  ["sabir", m({ ozelYetenekSayisi: 0 }), m({ ozelYetenekSayisi: 2 })],
  ["geri-gelis", m({ enCokGeriPuan: 2 }), m({ enCokGeriPuan: 1 })],
  ["son-nefes", m({ bitisStaminaOrani: 0.04 }), m({ bitisStaminaOrani: 0.3 })],
  ["takim-ultisi", m({ takimUltisi: true }), m(), true],
  ["alan-ustasi", m({ bitisler: [B("durma", { alanNo: 4 })] }), m({ bitisler: [B("durma")] })],
  ["yetenek-ustasi", m({ bitisler: [B("ringOut", { yetenekNo: 0, yetenekGecenSn: 2 })] }), m({ bitisler: [B("ringOut", { yetenekNo: 0, yetenekGecenSn: 5 })] })],
  ["dash-ustasi", m({ bitisler: [B("parcalanma", { dash: true })] }), m({ bitisler: [B("parcalanma")] })],
  ["zincir", m({ carpismaSnleri: [1, 2, 3, 4, 5] }), m({ carpismaSnleri: [] })],
  ["mor-catlak", { durum: { kararmaDoldu: 1 } }, m(), true],
  ["aydinlanma", { olay: { karanlikGeriDonus: 1 } }, m(), true],
  ["kara-galibiyet", m({ cekirdekler: [C("kul-cekirdegi", "kor", "karanlik")] }), m(), true],
  ["destek-kanali", m({ destekKanaliCanli: true }), m()],
  ["davetli", m({ mod: "oda" }), m()],
  ["ev-sahibi", m({ mod: "oda", evSahibi: true }), m({ mod: "oda" })],
  ["asinmis", { durum: { yapayOmurBitti: 1 } }, { durum: { yapayOmurBitti: 0 } }],
  ["dokumhane-musterisi", { olay: { yapayYenileme: 1 } }, { olay: {} }],
  ["yapay-ustasi", m({ cekirdekler: [C("kasirga-yapay", "kasirga", "yapay")] }), m()],
  ["sifir-darbe", m({ alinanCarpisma: 0 }), m({ alinanCarpisma: 1 })],
  ["son-saniye", m({ bitisler: [B("ringOut", { macSn: 89, macKazandiran: true })] }), m({ bitisler: [B("ringOut", { macSn: 80, macKazandiran: true })] })],
  ["ani-olum", m({ aniOlum: true }), m({ aniOlum: false })],
  ["koleksiyoncu", { durum: { parcaCesidi: 10 } }, { durum: {} }],
];

const bul = (id: string, g: BasarimGirdisi, mevcut: Record<string, BasarimKaydi> = {}) => basarimIsle(g, mevcut).find((x) => x.id === id);

describe("başarım değerlendirmesi: 46 başarımın her biri (tablo güdümlü)", () => {
  it("tablo 46 başarımı kapsar; her olay sözlükte; her başarımın şart metni var", () => {
    expect(DURUMLAR.map((x) => x[0]).sort()).toStrictEqual(BASARIMLAR.map((b) => b.id).sort());
    for (const b of BASARIMLAR) {
      expect(OLAY_SOZLUGU, b.id).toContain(b.sart.olay);
      expect(basarimAciklama(b).length, b.id).toBeGreaterThan(8);
    }
  });
  it.each(DURUMLAR)("%s: pozitif ilerletir, negatif ilerletmez (pasif: hiç)", (id, poz, neg, pasif) => {
    const p = bul(id, poz);
    if (pasif) {
      expect(BASARIMLAR.find((b) => b.id === id)!.ilkSurum).toBe(false);
      expect(p).toBeUndefined();
    } else {
      expect(p, `${id} pozitif`).toBeDefined();
      expect(p!.ilerleme).toBeGreaterThan(p!.onceki);
    }
    expect(bul(id, neg), `${id} negatif`).toBeUndefined();
  });
  it("eşik: sayı tamamlanınca tamamlandı, ilerleme sayıyı aşmaz; tamamlanan yeniden sayılmaz", () => {
    expect(bul("on-galibiyet", m(), { "on-galibiyet": { ilerleme: 9, tamam: false } })).toMatchObject({ ilerleme: 10, sayi: 10, tamamlandi: true });
    expect(bul("dusurucu", m({ bitisler: [B("ringOut"), B("ringOut"), B("ringOut")] }), { dusurucu: { ilerleme: 9, tamam: false } })).toMatchObject({ ilerleme: 10, tamamlandi: true });
    expect(bul("on-galibiyet", m(), { "on-galibiyet": { ilerleme: 10, tamam: true } })).toBeUndefined();
    expect(bul("ilk-galibiyet", m())).toMatchObject({ ilerleme: 1, tamamlandi: true });
  });
  it("küme sayaçları: farklı Çekirdek / element tekrar saymaz; Davetli en az 3 farklı rakip", () => {
    expect(bul("uclu", m(), { uclu: { ilerleme: 1, tamam: false, kume: ["kor-goktasi"] } })).toBeUndefined();
    expect(bul("uclu", m({ cekirdekler: [C("kaya-maden", "kaya", "maden"), C("kasirga-yapay", "kasirga", "yapay")] }), { uclu: { ilerleme: 1, tamam: false, kume: ["kor-goktasi"] } }))
      .toMatchObject({ ilerleme: 3, tamamlandi: true, yeniKume: ["kaya-maden", "kasirga-yapay"] });
    expect(bul("davetli", m({ mod: "oda", rakipId: 5 }), { davetli: { ilerleme: 4, tamam: false, kume: ["5"] } })).toMatchObject({ ilerleme: 5, tamamlandi: false });
    expect(bul("davetli", m({ mod: "oda", rakipId: 7 }), { davetli: { ilerleme: 4, tamam: false, kume: ["5", "6"] } })).toMatchObject({ ilerleme: 5, tamamlandi: true });
  });
  it("galibiyet serisi mağlubiyette sıfırlanır; tek maç sayaçları (kuşak, zincir, bitiş çeşidi) en iyi maçı tutar", () => {
    expect(bul("seri", m({ kazandi: false }), { seri: { ilerleme: 3, tamam: false } })).toMatchObject({ ilerleme: 0 });
    expect(bul("seri", m(), { seri: { ilerleme: 4, tamam: false } })).toMatchObject({ ilerleme: 5, tamamlandi: true });
    expect(bul("kenar-yuruyusu", m({ kusakSn: 12 }), { "kenar-yuruyusu": { ilerleme: 15, tamam: false } })).toBeUndefined();
    expect(bul("zincir", m({ carpismaSnleri: [0, 1, 10, 11, 12, 20] }))).toMatchObject({ ilerleme: 3 });
    expect(pencereEnCok([10, 1, 2, 3, 11, 4, 5], 6)).toBe(5);
  });
  it("kapılar: oda maçı yalnız Sosyal, bot maçı yalnız Yol, sayılmayan maç (teslim/hükmen/çift tavanı) hiçbiri; durum sayaçları moddan bağımsız", () => {
    const oda = basarimIsle(m({ mod: "oda", bitisler: [B("ringOut")], evSahibi: true }), {});
    expect(new Set(oda.map((x) => BASARIMLAR.find((b) => b.id === x.id)!.kategori))).toStrictEqual(new Set(["sosyal"]));
    const bot = basarimIsle(m({ mod: "bot", bitisler: [B("ringOut")] }), {});
    expect(bot.length).toBeGreaterThan(0);
    expect(new Set(bot.map((x) => BASARIMLAR.find((b) => b.id === x.id)!.kategori))).toStrictEqual(new Set(["yol"]));
    expect(basarimIsle(m({ sayildi: false, bitisler: [B("ringOut")] }), {})).toStrictEqual([]);
    const ds = basarimIsle({ mac: OZ({ sayildi: false }), durum: { enYuksekSeviye: 3, yapayOmurBitti: 1 } }, {}).map((x) => x.id);
    expect(ds).toStrictEqual(["parlayan", "asinmis"]);
    expect(macKapisi(BASARIMLAR.find((b) => b.id === "davetli")!, OZ({ mod: "oda" }))).toBe(true);
    expect(macKapisi(BASARIMLAR.find((b) => b.id === "dusurucu")!, OZ({ mod: "oda" }))).toBe(false);
  });
});

describe("hızlı maç kuyruğu (nile B-19, ux § 7; enjekte saat)", () => {
  it("aşamalar 20 / 30 / 60 sn; bot isteği yalnız 30-60 sn", () => {
    expect([0, 19.9, 20, 29.9, 30, 59.9, 60, 90].map(kuyrukAsamasi)).toStrictEqual(["araniyor", "araniyor", "antrenmanOner", "antrenmanOner", "botTeklif", "botTeklif", "bulunamadi", "bulunamadi"]);
    expect([0, 29.9, 30, 59.9, 60].map(botKabul)).toStrictEqual([false, false, true, true, false]);
    expect(KUYRUK.bulunduSn).toBe(3);
    expect(sureBicimle(12)).toBe("0:12");
    expect(sureBicimle(75.4)).toBe("1:15");
  });
  it("Dereceli kapısı (sahip kararı S4): bir Çekirdek Lv.3 olunca açılır", () => {
    expect([dereceliAcik([]), dereceliAcik([2]), dereceliAcik([1, 2, 2]), dereceliAcik([2, 3])]).toStrictEqual([false, false, false, true]);
  });
  it("Elo ±100, her 10 sn +50, en çok ±400 (D7: Elo 1000 sabit, herkes eşleşir)", () => {
    expect([0, 9, 10, 25, 60, 300].map(eloPenceresi)).toStrictEqual([100, 100, 150, 200, 400, 400]);
    expect(eloUygun(1000, 1000, 0)).toBe(true);
    expect(eloUygun(1000, 1150, 0)).toBe(false);
    expect(eloUygun(1000, 1150, 10)).toBe(true);
  });
});

describe("maç özeti sim olaylarından (MacOzetSayaci)", () => {
  it("bot-bot tam maçta bitiş kayıtları tur sonuçlarıyla tutarlı; kazanan/süre/kuşak/çarpışma sayılır", () => {
    const a = takimKurulumu("takim-1"), b = takimKurulumu("takim-2");
    const d = macDunyasiKur([a.profiller, b.profiller], 4242, { seviye: [3, 3] });
    const s = new MacOzetSayaci();
    for (let k = 0; k < 60 * 130 && d.mac.faz !== "bitti"; k++) {
      adim(d, [botGirdisi(d, 0, "kenar", 11), botGirdisi(d, 1, "dolas", 12)]);
      s.adim(d, d.olaylar);
    }
    expect(d.mac.faz).toBe("bitti");
    const [o0, o1] = s.ozet(d, [0.5, 0.5]);
    const puanli = s.turlar.filter((t) => t.tur !== "berabere");
    expect(o0.bitisler.length + o1.bitisler.length).toBe(puanli.length);
    expect(o0.bitisler.length).toBe(puanli.filter((t) => t.kazanan === 0).length);
    expect(o0.kazandi).toBe(d.mac.macSonucu!.kazanan === 0);
    expect(o1.kazandi).toBe(d.mac.macSonucu!.kazanan === 1);
    expect(o0.sureSn).toBeCloseTo(d.mac.saat / 60, 6);
    expect(o0.carpismaSnleri.length).toBe(o1.carpismaSnleri.length);
    expect(o0.carpismaSnleri.length).toBeGreaterThan(0);
    expect(o0.enAzStaminaOran).toBeLessThanOrEqual(1);
    expect(o0.kusakSn + o1.kusakSn).toBeGreaterThan(0);
    const w = d.mac.macSonucu!.kazanan;
    if (d.mac.macSonucu!.neden === "puan") expect((w === 0 ? o0 : o1).bitisler.at(-1)!.macKazandiran).toBe(true);
  });
});

export { EKONOMI };
