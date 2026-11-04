import { describe, expect, it } from "vitest";
import { Depo, veritabaniAc } from "../src/sunucu/db/depo.ts";
import { GOCLER, gocleriUygula } from "../src/sunucu/db/sema.ts";
import { adAnahtari, adDogrula, adUygunsuzMu, oduncDoldur, takimEksigi } from "../src/sunucu/oyuncu/kurallar.ts";
import { macSonuYaz, sonucTuru, type MacSonuGirdisi } from "../src/sunucu/oyuncu/macSonu.ts";
import { ILERLEME, macXp, seviyeAraligi, seviyeBul, yapayOmurSonrasi } from "../src/paylasilan/kurallar/ilerleme.ts";
import { takimKoduCoz, takimKoduYaz, takimKurulumu } from "../src/paylasilan/veri/takimlar.ts";
import { macDunyasiKur } from "../src/paylasilan/sim/Dunya.ts";

// D5 veri katmanı (bellek içi SQLite) + saf kurallar: göç, ad tekilliği, filtre, takım kuralı, ödünç, XP/seviye, Yapay ömür.

const yeni = () => new Depo(veritabaniAc(":memory:"));
const oyuncu = (d: Depo, ad: string) => d.oyuncuOlustur({ ad, adAnahtar: adAnahtari(ad), sifreHash: "scrypt$x", simdi: 1 })!;

describe("göç", () => {
  it("tüm tablolar kurulur, ikinci uygulama bir şey yapmaz", () => {
    const db = veritabaniAc(":memory:");
    expect(db.pragma("user_version", { simple: true })).toBe(GOCLER.length);
    expect(gocleriUygula(db)).toBe(0);
    const tablolar = (db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[]).map((r) => r.name);
    for (const t of ["oyuncu", "oturum", "cekirdek", "parca", "takim", "altin_defteri", "basarim", "mac"]) expect(tablolar).toContain(t);
    const sutun = (db.prepare("PRAGMA table_info(oyuncu)").all() as { name: string }[]).map((r) => r.name);
    expect(sutun).toEqual(expect.arrayContaining(["id", "kick_id", "ad", "sifre_hash", "ad_degisti", "arma", "renk", "destek_kanali", "elo", "olusturma"]));
  });
});

describe("ad", () => {
  it("tekil, büyük/küçük duyarsız (Türkçe İ/ı/I/i dahil)", () => {
    const d = yeni();
    expect(oyuncu(d, "Işık")).toBeGreaterThan(0);
    expect(d.oyuncuOlustur({ ad: "IŞIK", adAnahtar: adAnahtari("IŞIK"), sifreHash: "x", simdi: 1 })).toBeNull();
    expect(d.oyuncuOlustur({ ad: "ışık", adAnahtar: adAnahtari("ışık"), sifreHash: "x", simdi: 1 })).toBeNull();
    expect(oyuncu(d, "İnci")).toBeGreaterThan(0);
    expect(adAnahtari("İNCİ")).toBe(adAnahtari("inci"));
    expect(d.oyuncuAdla(adAnahtari("INCI"))).not.toBeNull(); // I/ı/İ/i ayrımı yok sayılır
    expect(d.oyuncuOlustur({ ad: "işık", adAnahtar: adAnahtari("işık"), sifreHash: "x", simdi: 1 })).toBeNull();
  });
  it("3-16 karakter, izinli karakterler", () => {
    expect(adDogrula("ab").hata).toBe("uzunluk");
    expect(adDogrula("a".repeat(17)).hata).toBe("uzunluk");
    expect(adDogrula("  Ayşe   Kaya ").ad).toBe("Ayşe Kaya");
    expect(adDogrula("Ayşe Kaya").hata).toBeNull();
    expect(adDogrula("<script>").hata).toBe("karakter");
    expect(adDogrula("_alt").hata).toBe("karakter");
  });
  it("küfür filtresi (sade hâl ve benzer karakterler) ve yanlış pozitif yok", () => {
    expect(adUygunsuzMu("Orospu")).toBe(true);
    expect(adUygunsuzMu("0r0spu42")).toBe(true);
    expect(adUygunsuzMu("Siktir Git")).toBe(true);
    expect(adUygunsuzMu("amk")).toBe(true);
    expect(adDogrula("Pezevenk1").hata).toBe("uygunsuz");
    for (const temiz of ["Aşık Veysel", "Sıkı Dönüş", "Gotham", "Malatya", "Kasırga", "Topaççı"]) expect(adUygunsuzMu(temiz)).toBe(false);
  });
});

describe("takım ve ödünç", () => {
  it("takımda 3 farklı Çekirdek: eksik yuva sayısı", () => {
    expect(takimEksigi(["a", "b", "c"])).toBe(0);
    expect(takimEksigi(["a", null, null])).toBe(2);
    expect(takimEksigi(["a", "a", "b"])).toBe(1);
  });
  it("ödünç: boş yuvalar seçilmeyen başlangıç setleriyle Lv.1 dolar, 3 farklı Çekirdek", () => {
    const u = oduncDoldur([{ cekirdek: "kaya-maden", govde: "kalkan-govde", disk: "agir-disk", uc: "igne-uc", seviye: 2, yon: "sag" }, null, null]);
    expect(u.map((x) => [x.cekirdek, x.seviye, x.odunc])).toStrictEqual([["kaya-maden", 2, false], ["kor-goktasi", 1, true], ["kasirga-yapay", 1, true]]);
    expect(takimEksigi(u.map((x) => x.cekirdek))).toBe(0);
    // ömrü biten Yapay boş sayılır → ödünç
    const y = oduncDoldur([{ cekirdek: "kasirga-yapay", govde: "savrulan-govde", disk: "denge-disk", uc: "dengeli-uc", seviye: 3, yon: "sol", devreDisi: true }, null, null]);
    expect(y.every((x) => x.odunc)).toBe(true);
  });
  it("takım kodu: yaz → çöz → profiller + üye seviyeleri; bozuk kod reddedilir", () => {
    const u = oduncDoldur([{ cekirdek: "kasirga-yapay", govde: "savrulan-govde", disk: "denge-disk", uc: "dengeli-uc", seviye: 2, yon: "sol" }, null, null]);
    const kod = takimKoduYaz(u);
    expect(takimKoduCoz(kod)).toStrictEqual(u);
    const k = takimKurulumu(kod);
    expect(k.seviyeler).toStrictEqual([2, 1, 1]);
    expect(k.profiller[0].donus).toBe("sol");
    expect(takimKoduCoz(kod.replace("kasirga-yapay", "yok-boyle"))).toBeNull();
    expect(takimKoduCoz("a|b")).toBeNull();
    // aynı Çekirdek iki kez → null
    expect(takimKoduCoz([kod.split("|")[0], kod.split("|")[0], kod.split("|")[1]].join("|"))).toBeNull();
    // sim: sahadaki üyenin seviyesi oyuncu seviyesi
    const d = macDunyasiKur([k.profiller, k.profiller.map((p) => p) as unknown as typeof k.profiller], 1, { uyeSeviyeleri: [k.seviyeler, null] });
    expect(d.seviye).toStrictEqual([2, 3]);
  });
  it("ilk Çekirdek: Lv.2 / 150 XP, Yapay ömür 30, takım 0 = 1 sahip + 2 ödünç; ikinci kez reddedilir", () => {
    const d = yeni();
    const o = oyuncu(d, "Ayşe");
    expect(d.ilkCekirdek(o, "yapay", 5)).toBe("tamam");
    expect(d.ilkCekirdek(o, "goktasi", 5)).toBe("var");
    expect(d.ilkCekirdek(o, "uydurma", 5)).toBe("set");
    const c = d.cekirdekler(o);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ tanim_id: "kasirga-yapay", seviye: 2, tecrube: 150, omur: 30 });
    const t = d.takimlar(o);
    expect(t).toHaveLength(1);
    expect(t[0]!.yuvalar.map((y) => y?.cekirdek ?? null)).toStrictEqual(["kasirga-yapay", null, null]);
    const parca = d.db.prepare("SELECT tanim_id FROM parca WHERE oyuncu_id = ? ORDER BY id").all(o) as { tanim_id: string }[];
    expect(parca.map((p) => p.tanim_id)).toStrictEqual(["savrulan-govde", "denge-disk", "dengeli-uc"]);
  });
  it("başarım idempotent", () => {
    const d = yeni();
    const o = oyuncu(d, "Ali Veli");
    expect(d.basarimTamamla(o, "ilk-devir")).toBe(true);
    expect(d.basarimTamamla(o, "ilk-devir")).toBe(false);
    expect(d.basarimlar(o)).toStrictEqual([{ basarim_id: "ilk-devir", ilerleme: 1, tamam: 1 }]);
  });
});

describe("XP ve seviye (tuning § 14, § 17)", () => {
  it("eşikler 150 / 700 / 2200, ilk sürüm tavanı Lv.3", () => {
    expect([0, 149, 150, 699, 700, 2199, 2200, 9999].map(seviyeBul)).toStrictEqual([1, 1, 2, 2, 3, 3, 3, 3]);
    expect(seviyeAraligi(2)).toStrictEqual({ alt: 150, ust: 700 });
    expect(seviyeAraligi(3)).toStrictEqual({ alt: 700, ust: 700 });
  });
  it("galibiyet 40 / mağlubiyet 25 / terk 0, kriz +30, temiz +20, Yapay ×1,5, oda ×0,5", () => {
    const g = { krizGordu: false, kalanStaminaOrani: 0.3, yapay: false, oda: false };
    expect(macXp({ ...g, sonuc: "galibiyet" }).toplam).toBe(40);
    expect(macXp({ ...g, sonuc: "maglubiyet" }).toplam).toBe(25);
    expect(macXp({ ...g, sonuc: "terk" }).toplam).toBe(0);
    expect(macXp({ ...g, sonuc: "iptal" }).toplam).toBe(0);
    expect(macXp({ ...g, sonuc: "galibiyet", krizGordu: true }).toplam).toBe(70);
    expect(macXp({ ...g, sonuc: "galibiyet", kalanStaminaOrani: 0.5 }).toplam).toBe(60);
    expect(macXp({ ...g, sonuc: "maglubiyet", krizGordu: true, kalanStaminaOrani: 0.9 }).toplam).toBe(25); // kriz/temiz yalnız galibiyette
    expect(macXp({ ...g, sonuc: "galibiyet", yapay: true }).toplam).toBe(60);
    expect(macXp({ ...g, sonuc: "galibiyet", oda: true }).toplam).toBe(20);
    expect(macXp({ ...g, sonuc: "maglubiyet", yapay: true, oda: true }).toplam).toBe(19); // 25·1,5·0,5 = 18,75 → 19
  });
  it("Yapay ömrü −1/maç, iptal sayılmaz, 0'da durur", () => {
    expect(yapayOmurSonrasi(30, "galibiyet")).toBe(29);
    expect(yapayOmurSonrasi(30, "iptal")).toBe(30);
    expect(yapayOmurSonrasi(0, "terk")).toBe(0);
    expect(ILERLEME.yapayOmur).toBe(30);
  });
  it("maç sonu: satır + XP + ömür tek işlemde, aynı maç ikinci kez yazılmaz, ödünç XP almaz", () => {
    const d = yeni();
    const a = oyuncu(d, "Ayşe");
    const b = oyuncu(d, "Bora");
    d.ilkCekirdek(a, "yapay", 1);
    d.ilkCekirdek(b, "goktasi", 1);
    const ta = d.takimlar(a)[0]!;
    const tb = d.takimlar(b)[0]!;
    const g: MacSonuGirdisi = {
      macId: "m1", mod: "oda", oyuncular: [a, b], takimKodlari: [takimKoduYaz(oduncDoldur(ta.yuvalar)), takimKoduYaz(oduncDoldur(tb.yuvalar))],
      yuvalar: [ta.yuvalar, tb.yuvalar], sonuc: { kazanan: 0, neden: "puan", puan: [3, 1], tick: 4000 }, sureSn: 66, krizGordu: [true, false],
      kalanStaminaOrani: [0.2, 0.1], katalogOzeti: "k", baslangic: 9,
    };
    const [oa, ob] = macSonuYaz(d, g);
    // Yapay galibiyet, kriz: (40 + 30) × 1,5 × 0,5 = 52,5 → 53 ; Göktaşı mağlubiyet oda: 25 × 0,5 = 12,5 → 13
    expect(oa.map((x) => [x.tanimId, x.kazanc, x.xp, x.omur])).toStrictEqual([["kasirga-yapay", 53, 203, 29]]);
    expect(ob.map((x) => [x.tanimId, x.kazanc, x.xp, x.omur])).toStrictEqual([["kor-goktasi", 13, 163, null]]);
    expect(d.mac("m1")).toMatchObject({ mod: "oda", a, b, kazanan: a, puan: "3-1", bitis_nedeni: "puan", katalog_ozeti: "k" });
    expect(macSonuYaz(d, g)).toStrictEqual([[], []]);
    expect(d.cekirdekler(a)[0]!.tecrube).toBe(203);
    expect(sonucTuru({ kazanan: 1, neden: "teslim", puan: [0, 3], tick: 1 }, 0)).toBe("terk");
    expect(sonucTuru({ kazanan: -1, neden: "iptal", puan: [0, 0], tick: 1 }, 0)).toBe("iptal");
  });
  it("seviye atlama: yeni yetenek adı", () => {
    const d = yeni();
    const a = oyuncu(d, "Cem");
    d.ilkCekirdek(a, "goktasi", 1);
    d.db.prepare("UPDATE cekirdek SET tecrube = 690").run();
    const t = d.takimlar(a)[0]!;
    const [oa] = macSonuYaz(d, {
      macId: "m2", mod: "hizli", oyuncular: [a, null], takimKodlari: ["x", "y"], yuvalar: [t.yuvalar, []],
      sonuc: { kazanan: 0, neden: "puan", puan: [3, 0], tick: 1 }, sureSn: 30, krizGordu: [false, false], kalanStaminaOrani: [0.1, 0], katalogOzeti: "k", baslangic: 1,
    });
    expect(oa[0]).toMatchObject({ seviyeOnce: 2, seviye: 3, xp: 730, yeniYetenek: "Közyağmuru" });
  });
});
