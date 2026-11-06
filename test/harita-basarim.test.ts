import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { type BasarimGirdisi, type MacOzeti, basarimAciklama, basarimIsle, macKapisi, OLAY_SOZLUGU } from "../src/paylasilan/kurallar/basarim.ts";
import { BASARIMLAR } from "../src/paylasilan/veri/katalog.ts";
import { Depo, veritabaniAc } from "../src/sunucu/db/depo.ts";
import { adAnahtari, oduncDoldur } from "../src/sunucu/oyuncu/kurallar.ts";
import { basarimOlayiIsle, tamamlananlar } from "../src/sunucu/oyuncu/basarimYaz.ts";
import { haritaBotTakimi, haritaGit } from "../src/sunucu/oyuncu/harita.ts";
import { madenBasla, madenKaz } from "../src/sunucu/oyuncu/maden.ts";
import { eritYap, parcaUret, vitrinYaz } from "../src/sunucu/oyuncu/ocak.ts";
import { macSonuKaydet } from "../src/sunucu/oyuncu/macSonu.ts";
import { basarimHaritaOlaylari, basarimMadenOlaylari, basarimOcakOlaylari, basarimVitrin } from "../src/sunucu/oyuncu/haritaBasarim.ts";
import { DURUM, dugumBul } from "../src/paylasilan/kurallar/harita.ts";
import { takimKoduYaz } from "../src/paylasilan/veri/takimlar.ts";
import type { DovusDugumu } from "../src/paylasilan/veri/harita.ts";

// H5 (docs/design/harita/05): 29 yeni başarım (22 ilk sürüm + 7 sezon 2), olay sözlüğü, `haritaZorlukMin` kapısı
// (05 § 3 tablosu: zorluk 1'de yalnız takim-ultisi), maç dışı giriş, idempotent ödül, açılan görünüm.

const HARITA_29 = BASARIMLAR.slice(46);
type H = NonNullable<BasarimGirdisi["harita"]>;
/** [id, pozitif, negatif] */
const TABLO: [string, H, H][] = [
  ["ilk-adim", { dugumTamam: 1 }, { dugumTamam: 0 }],
  ["ilk-kazi", { cevherKazildi: [{ kademe: 1, adet: 3 }] }, { cevherKazildi: [] }],
  ["ilk-kulce", { eritme: 1 }, { eritme: 0 }],
  ["ocak-yamaci", { bolgeTamam: ["ocak-yamaci"] }, { bolgeTamam: ["ayaz-gecidi"] }],
  ["ayaz-gecidi", { bolgeTamam: ["ayaz-gecidi"] }, { bolgeTamam: [] }],
  ["kor-kraterleri", { bolgeTamam: ["kor-kraterleri"] }, { bolgeTamam: ["ocak-yamaci"] }],
  ["madenci", { ustalik: { madencilik: 25, isleme: 0 } }, { ustalik: { madencilik: 24, isleme: 99 } }],
  ["usta-madenci", { ustalik: { madencilik: 50, isleme: 0 } }, { ustalik: { madencilik: 49, isleme: 0 } }],
  ["ocakci", { ustalik: { madencilik: 0, isleme: 25 } }, { ustalik: { madencilik: 99, isleme: 24 } }],
  ["usta-ocakci", { ustalik: { madencilik: 0, isleme: 50 } }, { ustalik: { madencilik: 0, isleme: 49 } }],
  ["cevher-defteri", { cevherKazildi: [{ kademe: 1, adet: 1 }, { kademe: 2, adet: 1 }] }, { cevherKazildi: [] }],
  ["otuz-yildiz", { yildizToplam: 12 }, { yildizToplam: 0 }],
  ["bolge-altin", { enYuksekRozet: 3 }, { enYuksekRozet: 2 }],
  ["usta-isi", { ustaIsi: [{ tur: "arma" }] }, { ustaIsi: [] }],
  ["nadir-damar", { nadirDamar: 1 }, { nadirDamar: 0 }],
  ["tam-isabet", { isabetSerisi: 4 }, { isabetSerisi: 0 }],
  ["ilk-parca", { parcaUret: 1 }, { parcaUret: 0 }],
  ["vitrin", { vitrinDolu: 2 }, { vitrinDolu: 0 }],
  ["tam-takim", { malzemeTopac: true }, { malzemeTopac: false }],
  ["malzeme-defteri", { tanimKademeCesidi: 2 }, { tanimKademeCesidi: 0 }],
  ["usta-parca", { ustaIsi: [{ tur: "parca" }] }, { ustaIsi: [{ tur: "cerceve" }] }],
  ["degerli-koleksiyon", { koleksiyonDegeri: 600 }, { koleksiyonDegeri: 0 }],
];
const bul = (id: string, h: H) => basarimIsle({ harita: h }, {}).find((x) => x.id === id);

describe("29 yeni başarım (veri)", () => {
  it("75 kayıt; 29'un 22'si ilk sürüm; sekmeler mevcut 'yol', 'gosteri', 'gizli'; olay sözlükte; şart metni var; parça açmaz (G-6)", () => {
    expect(BASARIMLAR).toHaveLength(75);
    expect(HARITA_29).toHaveLength(29);
    expect(HARITA_29.filter((b) => b.ilkSurum)).toHaveLength(22);
    expect(new Set(HARITA_29.map((b) => b.kategori))).toStrictEqual(new Set(["yol", "gosteri", "gizli"]));
    for (const b of HARITA_29) {
      expect(OLAY_SOZLUGU, b.id).toContain(b.sart.olay);
      expect(basarimAciklama(b).length, b.id).toBeGreaterThan(8);
      expect(b.acilanParcalar).toStrictEqual([]);
    }
    expect(TABLO.map((x) => x[0]).sort()).toStrictEqual(HARITA_29.filter((b) => b.ilkSurum).map((b) => b.id).sort());
    expect(BASARIMLAR.filter((b) => b.haritaZorlukMin !== undefined)).toHaveLength(32);
  });
  it.each(TABLO)("%s: pozitif ilerletir, negatif ilerletmez", (id, poz, neg) => {
    const p = bul(id, poz);
    expect(p, `${id} pozitif`).toBeDefined();
    expect(p!.ilerleme).toBeGreaterThan(p!.onceki);
    expect(bul(id, neg), `${id} negatif`).toBeUndefined();
  });
  it("sezon 2 başarımları pasif (Devir Taşı, Büyük Madenci…)", () => {
    expect(bul("devir-tasi", { cevherKazildi: [{ kademe: 8, adet: 1 }] })).toBeUndefined();
    expect(bul("buyuk-madenci", { ustalik: { madencilik: 100, isleme: 100 } })).toBeUndefined();
  });
});

describe("mevcut 46 başarımın haritada sayılması (05 § 3)", () => {
  const ozet = (e: Partial<MacOzeti>): MacOzeti => ({
    mod: "harita", sayildi: true, kazandi: true, sureSn: 30, bitisler: [{ tur: "ringOut", macSn: 20, yetenekNo: null, yetenekGecenSn: null, alanNo: null, dash: false, macKazandiran: true }],
    enAzStaminaOran: 0.8, bitisStaminaOrani: 0.8, kalanStaminaOrani: 0.9, alinanCarpisma: 0, ozelYetenekSayisi: 0, enCokGeriPuan: 0, kusakSn: 0, zitElementCarpisma: 0,
    carpismaSnleri: [], aniOlum: false, cekirdekler: [{ tanimId: "kor-goktasi", element: "kor", koken: "goktasi" }], takimUltisi: true, rakipId: null, evSahibi: false,
    destekKanaliCanli: false, dugumZorluk: 1, haritaSayilan: true, ...e,
  });
  it("zorluk 1 (kukla): yalnız takim-ultisi", () => {
    const d = basarimIsle({ mac: ozet({}) }, {});
    expect(d.map((x) => x.id)).toStrictEqual(["takim-ultisi"]);
  });
  it("zorluk 2: bitiş/element sayılır, PvP galibiyet sayıları ve 'seri' sayılmaz; zorluk 3: hızlı bitiş, temiz, sıfır darbe", () => {
    const iki = basarimIsle({ mac: ozet({ dugumZorluk: 2 }) }, {}).map((x) => x.id);
    expect(iki).toEqual(expect.arrayContaining(["dusurucu", "kor-ustasi", "takim-ultisi"]));
    for (const yok of ["ilk-galibiyet", "on-galibiyet", "yuz-mac", "seri", "hizli-bitis", "temiz-galibiyet", "sifir-darbe"]) expect(iki).not.toContain(yok);
    const uc = basarimIsle({ mac: ozet({ dugumZorluk: 3 }) }, {}).map((x) => x.id);
    expect(uc).toEqual(expect.arrayContaining(["hizli-bitis", "temiz-galibiyet", "sifir-darbe"]));
  });
  it("günün 11.+ maçı (haritaSayilan false) hiçbirini saymaz", () => {
    expect(basarimIsle({ mac: ozet({ dugumZorluk: 5, haritaSayilan: false }) }, {})).toStrictEqual([]);
    expect(macKapisi(BASARIMLAR.find((b) => b.id === "takim-ultisi")!, ozet({ haritaSayilan: false }))).toBe(false);
  });
});

describe("sunucu akışı: maç dışı olaylar, idempotent ödül, açılan görünüm", () => {
  const yeni = () => new Depo(veritabaniAc(":memory:"));
  const T = Date.parse("2026-11-04T09:00:00Z");
  function kur(d: Depo) {
    const a = d.oyuncuOlustur({ ad: "Basarimci", adAnahtar: adAnahtari("Basarimci"), sifreHash: "x", simdi: 1 })!;
    d.ilkCekirdek(a, "maden", 1);
    basarimOlayiIsle(d, a, { olay: { antrenmanBitti: true } }, 1);
    return a;
  }
  it("harita maçı → İlk Adım; kazı → İlk Kazı (Ocak açılır); erit → İlk Külçe; parça → İlk Parça; vitrin 3 → Vitrin", () => {
    const d = yeni();
    const a = kur(d);
    haritaGit(d, a, "b1-01", T);
    const t = d.takimlar(a)[0]!;
    const [o] = macSonuKaydet(d, {
      macId: "m1", mod: "harita", oyuncular: [a, null], takimKodlari: [takimKoduYaz(oduncDoldur(t.yuvalar)), haritaBotTakimi(dugumBul("b1-01") as DovusDugumu)],
      yuvalar: [t.yuvalar, []], sonuc: { kazanan: 0, neden: "puan", puan: [3, 0], tick: 3000 }, sureSn: 70, krizGordu: [false, false], kalanStaminaOrani: [0.3, 0],
      katalogOzeti: "k", baslangic: 1, bot: true, harita: { dugum: "b1-01" },
      ozet: [{ kazandi: true, sureSn: 70, bitisler: [], enAzStaminaOran: 0.3, bitisStaminaOrani: 0.3, kalanStaminaOrani: 0.3, alinanCarpisma: 3, ozelYetenekSayisi: 0, enCokGeriPuan: 0, kusakSn: 0, zitElementCarpisma: 0, carpismaSnleri: [], aniOlum: false, takimUltisi: false },
        { kazandi: false, sureSn: 70, bitisler: [], enAzStaminaOran: 0, bitisStaminaOrani: 0, kalanStaminaOrani: 0, alinanCarpisma: 3, ozelYetenekSayisi: 0, enCokGeriPuan: 0, kusakSn: 0, zitElementCarpisma: 0, carpismaSnleri: [], aniOlum: false, takimUltisi: false }],
    }, T);
    expect(o!.basarimlar.find((b) => b.id === "ilk-adim")).toMatchObject({ tamamlandi: true, odulAltin: 100 });
    // kazı
    haritaGit(d, a, "b1-02", T);
    const s = madenBasla(d, a, "b1-02", T);
    if (!s.ok) throw new Error(s.hata);
    const k = madenKaz(d, a, { seans: s.seans, sira: 0, isabetMs: null }, T + 800, () => 0);
    if (!k.ok) throw new Error();
    const kb = basarimMadenOlaylari(d, a, k.olaylar, T + 800);
    expect(kb.map((x) => x.id)).toContain("ilk-kazi");
    expect(kb.find((x) => x.id === "ilk-kazi")!.acilanOzellik).toStrictEqual(["atolye-ocak"]);
    expect(tamamlananlar(d, a).has("ilk-kazi")).toBe(true);
    // ikinci kez aynı olay: ödül bir kez
    const bakiye = d.bakiye(a);
    basarimMadenOlaylari(d, a, k.olaylar, T + 900);
    expect(d.bakiye(a)).toBe(bakiye);
    // erit + parça + vitrin
    d.cevherEkle(a, 1, 40);
    const e = eritYap(d, a, { kademe: 1, parti: 10, ref: randomUUID() }, T, () => 0);
    if (!e.ok) throw new Error();
    expect(basarimOcakOlaylari(d, a, e.olaylar, T).map((x) => x.id)).toContain("ilk-kulce");
    const anahtarlar: string[] = [];
    for (const tanim of ["duz-uc", "igne-uc", "dengeli-uc"]) {
      const p = parcaUret(d, a, { tanim, kademe: 1, ref: randomUUID() }, T, () => 0.999);
      if (!p.ok) throw new Error(p.hata);
      anahtarlar.push(p.parca.anahtar);
      if (tanim === "duz-uc") expect(basarimOcakOlaylari(d, a, p.olaylar, T).map((x) => x.id)).toContain("ilk-parca");
    }
    vitrinYaz(d, a, anahtarlar);
    expect(basarimVitrin(d, a, 3, T).map((x) => x.id)).toContain("vitrin");
  });
  it("Ocak Yamacı (patron) → görünüm arma-kazma verilir; yıldız toplamı durum başarımı ilerler", () => {
    const d = yeni();
    const a = kur(d);
    for (const x of ["b1-01", "b1-10"]) d.dugumYaz(a, x, { durum: DURUM.ustalas, yildiz: 7 });
    d.dugumYaz(a, "b1-11", { durum: DURUM.acik });
    const b = basarimHaritaOlaylari(d, a, { dugumTamam: 1, bolgeTamam: ["ocak-yamaci"], rozet: [] }, T);
    expect(b.find((x) => x.id === "ocak-yamaci")).toMatchObject({ acilanGorunum: ["arma-kazma"] });
    expect(d.gorunumler(a).map((x) => x.gorunum_id)).toContain("arma-kazma");
    expect(d.basarimSatirlari(a).find((x) => x.basarim_id === "otuz-yildiz")?.ilerleme).toBe(6);
  });
});
