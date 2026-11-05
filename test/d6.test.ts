import { describe, expect, it } from "vitest";
import {
  type Envanter, type Taslak, bosTopac, oduncKotasi, parcaGorunumu, parcaTak, takimDegerlendir, takimHataMetni, yuvaTasi,
} from "../src/paylasilan/kurallar/atolye.ts";
import { CUBUK_SIRA, type CubukAnahtari, cubukAraliklari, cubukFarki, normalize, profilCubuklari } from "../src/paylasilan/veri/cubuklar.ts";
import { BASARIMLAR, CEKIRDEKLER, DISKLER, GOVDELER, PARCALAR, UCLAR, parcaBul } from "../src/paylasilan/veri/katalog.ts";
import { type TopacProfili, topacProfiliKur } from "../src/paylasilan/veri/profil.ts";
import { takimKoduYaz, takimKurulumu } from "../src/paylasilan/veri/takimlar.ts";
import { macDunyasiKur } from "../src/paylasilan/sim/Dunya.ts";
import { yuvaDurumu } from "../src/paylasilan/sim/yetenek.ts";
import { ENERJI_TAVAN } from "../src/paylasilan/sim/enerji.ts";
import { Depo, veritabaniAc } from "../src/sunucu/db/depo.ts";
import { GOCLER } from "../src/sunucu/db/sema.ts";
import { adAnahtari, adDegisimKalanGun, takimAdDogrula, takimUyeleri } from "../src/sunucu/oyuncu/kurallar.ts";
import { macSonuYaz, type MacSonuGirdisi } from "../src/sunucu/oyuncu/macSonu.ts";
import { DonusSayaci } from "../src/sunucu/oyuncu/defter.ts";
import { sunucuTakimlari } from "../src/sunucu/oyuncu/takim.ts";

// D6 Atölye: çubuk eşlemesi (tide C-1), takım doğrulama, parça takma, envanter görünürlüğü, Uç farkı, seviye kilitleri,
// Yapay yön, ad değişimi 30 gün, Çekirdek defteri (idempotent), dönüş sayacı, ödünç kotası.

const p = (c: string, g: string, d: string, u: string, yon?: "sag" | "sol"): TopacProfili => topacProfiliKur(c, g, d, u, yon ? { yon } : {});
const deger = (pr: TopacProfili, k: CubukAnahtari) => profilCubuklari(pr).cubuklar.find((x) => x.anahtar === k)!.deger;

describe("çubuk eşlemesi (6 çubuk, 0-100)", () => {
  it("4 Gövde × 6 Uç × 3 Disk (her Çekirdekle): NaN/negatif/sınır dışı yok, tam sayı", () => {
    let n = 0;
    for (const c of CEKIRDEKLER) for (const g of GOVDELER.slice(0, 4)) for (const u of UCLAR) for (const d of DISKLER.slice(0, 3)) {
      const oz = profilCubuklari(p(c.id, g.id, d.id, u.id));
      expect(oz.cubuklar.map((x) => x.anahtar)).toStrictEqual([...CUBUK_SIRA]);
      for (const x of oz.cubuklar) {
        expect(Number.isInteger(x.deger)).toBe(true);
        expect(x.deger).toBeGreaterThanOrEqual(0);
        expect(x.deger).toBeLessThanOrEqual(100);
        expect(Number.isFinite(x.ham) && x.ham >= 0).toBe(true);
      }
      expect(["cicek", "merkezci", "cakili", "dengeli", "kusak"]).toContain(oz.desen);
      expect(["sag", "sol"]).toContain(oz.donus);
      n++;
    }
    expect(n).toBe(CEKIRDEKLER.length * 4 * 6 * 3);
  });
  it("tüm katalog (1 920 kombinasyon) aralığı doldurur: her çubukta 0 ve 100 görülür", () => {
    const gorulen = Object.fromEntries(CUBUK_SIRA.map((k) => [k, new Set<number>()])) as Record<CubukAnahtari, Set<number>>;
    for (const c of CEKIRDEKLER) for (const g of GOVDELER) for (const d of DISKLER) for (const u of UCLAR) {
      for (const x of profilCubuklari(p(c.id, g.id, d.id, u.id)).cubuklar) gorulen[x.anahtar].add(x.deger);
    }
    for (const k of CUBUK_SIRA) {
      if (k === "hiz") continue; // Hız iki ham değerin ortalaması: uçları ayrı ayrı dolar
      expect(Math.min(...gorulen[k])).toBe(0);
      expect(Math.max(...gorulen[k])).toBe(100);
    }
    const A = cubukAraliklari();
    expect(A.saldiri.en).toBeLessThan(A.saldiri.ust);
  });
  it("monoton: daha çok saldiri → Saldırı artar; savunma, kütle, havuz, ivme, burstEsik aynı; erime artınca Stamina azalır", () => {
    const taban = p("kasirga-yapay", "savrulan-govde", "denge-disk", "dengeli-uc");
    const degis = (f: (x: TopacProfili) => void): TopacProfili => { const y = structuredClone(taban); f(y); return y; };
    const once = profilCubuklari(taban);
    const kontrol = (k: CubukAnahtari, f: (x: TopacProfili) => void, isaret: 1 | -1) => {
      const sonra = profilCubuklari(degis(f));
      const fark = cubukFarki(once, sonra)[k];
      expect(Math.sign(fark)).toBe(isaret);
    };
    kontrol("saldiri", (x) => { x.parametreler.saldiri += 10; }, 1);
    kontrol("savunma", (x) => { x.parametreler.savunma += 10; }, 1);
    kontrol("agirlik", (x) => { x.parametreler.kutle += 5; }, 1);
    kontrol("stamina", (x) => { x.parametreler.staminaHavuzu += 40; }, 1);
    kontrol("stamina", (x) => { x.sim.erime += 1; }, -1);
    kontrol("hiz", (x) => { x.sim.ivme += 150; }, 1);
    kontrol("saglamlik", (x) => { x.parametreler.burstEsik += 1; }, 1);
    // tek yönlü değişim diğer çubukları oynatmaz
    const s = cubukFarki(once, profilCubuklari(degis((x) => { x.parametreler.saldiri += 10; })));
    for (const k of CUBUK_SIRA) if (k !== "saldiri") expect(s[k]).toBe(0);
    // sınır dışı ham değer sınırlanır
    expect(normalize("saldiri", 10_000)).toBe(100);
    expect(normalize("saldiri", -50)).toBe(0);
  });
  it("tip etiketi + yakın tip; Saldırgan seti Saldırgan, Kale seti Kale", () => {
    expect(profilCubuklari(p("kor-goktasi", "ok-govde", "hafif-disk", "duz-uc")).tip).toBe("saldirgan");
    const k = profilCubuklari(p("kaya-maden", "kalkan-govde", "agir-disk", "igne-uc"));
    expect(k.tip).toBe("kale");
    expect(k.yakinTip).not.toBe("kale");
  });
});

describe("Uç değişimi (Düz → İğne): topacProfiliKur farkı", () => {
  it("ivme, sürtünme, dash maliyeti, desen değişir; Hız çubuğu düşer", () => {
    const duz = p("kaya-maden", "kalkan-govde", "agir-disk", "duz-uc");
    const igne = p("kaya-maden", "kalkan-govde", "agir-disk", "igne-uc");
    // Kaya: ivme ×0,92, Maden ×(köken) — oran Uç oranına eşit
    expect(igne.sim.ivme / duz.sim.ivme).toBeCloseTo(400 / 900, 10);
    expect(igne.sim.vSurus).toBe(160);
    expect(duz.sim.vSurus).toBe(260);
    expect(igne.sim.surtunme).toBeGreaterThan(duz.sim.surtunme);
    expect(igne.sim.dashMaliyet).toBe(18);
    expect(duz.sim.dashMaliyet).toBe(12);
    expect(igne.parametreler.desen).toBe("cakili");
    expect(duz.parametreler.desen).toBe("cicek");
    const f = cubukFarki(profilCubuklari(duz), profilCubuklari(igne));
    expect(f.hiz).toBeLessThan(-30);
    expect(f.saglamlik).toBeGreaterThan(0); // İğne burstEsik +1
    // DENGE-2 SAPMA: Düz Uç erime 5,5 → 5,0 = İğne 5,0; Stamina çubuğu artık eşit
    expect(deger(igne, "stamina")).toBe(deger(duz, "stamina"));
  });
});

// ---- takım kuralları ----
const ENV: Envanter = {
  cekirdekler: [{ id: 1, tanimId: "kaya-maden", devreDisi: false }, { id: 2, tanimId: "kor-goktasi", devreDisi: false }, { id: 3, tanimId: "kaya-maden", devreDisi: false }],
  parcalar: [
    { id: 10, tanimId: "kalkan-govde" }, { id: 11, tanimId: "agir-disk" }, { id: 12, tanimId: "igne-uc" },
    { id: 13, tanimId: "ok-govde" }, { id: 14, tanimId: "hafif-disk" }, { id: 15, tanimId: "duz-uc" },
  ],
};
const MADEN = { cekirdek: 1, govde: 10, disk: 11, uc: 12 };
const GOKTASI = { cekirdek: 2, govde: 13, disk: 14, uc: 15 };

describe("takım doğrulama (sunucu ve istemci aynı kural)", () => {
  it("geçerli: iki sahip + kota 0 → 1 yuva boş (OYNA soluk metni)", () => {
    const v = takimDegerlendir([MADEN, GOKTASI, bosTopac()], ENV);
    expect(v.hatalar).toStrictEqual([]);
    expect(oduncKotasi(ENV)).toBe(0);
    expect(v.bos).toBe(1);
    expect(v.oynanabilir).toBe(false);
  });
  it("kota: 1 kullanılabilir Çekirdek → 2 ödünç, oynanabilir", () => {
    const env: Envanter = { cekirdekler: [ENV.cekirdekler[0]!], parcalar: ENV.parcalar };
    const v = takimDegerlendir([MADEN, bosTopac(), bosTopac()], env);
    expect(v.durum).toStrictEqual(["sahip", "odunc", "odunc"]);
    expect(v.oynanabilir).toBe(true);
  });
  it("aynı Çekirdek iki kez (aynı örnek ya da aynı tanım)", () => {
    expect(takimDegerlendir([MADEN, MADEN, bosTopac()], ENV).hatalar[0]!.kod).toBe("ayniCekirdek");
    expect(takimDegerlendir([MADEN, { cekirdek: 3, govde: 13, disk: 14, uc: 15 }, bosTopac()], ENV).hatalar[0]!.kod).toBe("ayniCekirdek");
  });
  it("aynı parça iki topaçta", () => {
    const v = takimDegerlendir([MADEN, { cekirdek: 2, govde: 10, disk: 14, uc: 15 }, bosTopac()], ENV);
    expect(v.hatalar).toStrictEqual([{ kod: "parcaTekrar", yuva: 1, tur: "govde" }]);
  });
  it("sahip olunmayan parça ve Çekirdek", () => {
    expect(takimDegerlendir([{ ...MADEN, uc: 999 }, bosTopac(), bosTopac()], ENV).hatalar[0]).toStrictEqual({ kod: "sahipDegil", yuva: 0, tur: "uc" });
    expect(takimDegerlendir([{ ...MADEN, cekirdek: 77 }, bosTopac(), bosTopac()], ENV).hatalar[0]!.kod).toBe("sahipDegil");
  });
  it("yanlış tür (Uç yuvasında Gövde)", () => {
    expect(takimDegerlendir([{ ...MADEN, uc: 13 }, bosTopac(), bosTopac()], ENV).hatalar.some((h) => h.kod === "yanlisTur" && h.tur === "uc")).toBe(true);
  });
  it("eksik parça ve Çekirdeksiz parça", () => {
    expect(takimDegerlendir([{ ...MADEN, disk: null }, bosTopac(), bosTopac()], ENV).hatalar[0]).toStrictEqual({ kod: "parcaEksik", yuva: 0, tur: "disk" });
    expect(takimDegerlendir([{ cekirdek: null, govde: 10, disk: null, uc: null }, bosTopac(), bosTopac()], ENV).hatalar[0]!.kod).toBe("cekirdekYok");
    expect(takimHataMetni({ kod: "parcaEksik", yuva: 1, tur: "uc" })).toBe("2. topaçta Uç eksik. Envanterden bir Uç tak.");
  });
  it("ömrü biten Yapay: kota dışı ödünç (B-27), hata değil", () => {
    const env: Envanter = { cekirdekler: [{ id: 5, tanimId: "kasirga-yapay", devreDisi: true }], parcalar: [{ id: 20, tanimId: "savrulan-govde" }, { id: 21, tanimId: "denge-disk" }, { id: 22, tanimId: "dengeli-uc" }] };
    const v = takimDegerlendir([{ cekirdek: 5, govde: 20, disk: 21, uc: 22 }, bosTopac(), bosTopac()], env);
    expect(v.durum).toStrictEqual(["devreDisi", "odunc", "odunc"]);
    expect(v.oynanabilir).toBe(true);
  });
  it("parça tak: başka topaçtaki aynı parça otomatik çıkar; yuva taşı", () => {
    const t: Taslak = [{ ...MADEN }, { cekirdek: 2, govde: 13, disk: 14, uc: 15 }, bosTopac()];
    const r = parcaTak(t, 1, "uc", 12);
    expect(r.cikarilan).toStrictEqual({ yuva: 0, tur: "uc" });
    expect(r.taslak[0].uc).toBeNull();
    expect(r.taslak[1].uc).toBe(12);
    expect(t[0].uc).toBe(12); // saf: girdi değişmez
    const c = parcaTak(t, 2, "cekirdek", 3, (id) => ENV.cekirdekler.find((x) => x.id === id)?.tanimId);
    expect(c.cikarilan).toStrictEqual({ yuva: 0, tur: "cekirdek" }); // aynı tanımlı Çekirdek
    expect(yuvaTasi(t, 0, 2).map((x) => x.cekirdek)).toStrictEqual([null, 2, 1]);
  });
});

describe("envanter görünürlüğü (parcalar.json kilit/gorunum)", () => {
  it("sahip / Market'te / kilitli-görünür (başarım 0/N) / gizli ???", () => {
    expect(parcaGorunumu(parcaBul("igne-uc"), 1).durum).toBe("sahip");
    const m = parcaGorunumu(parcaBul("top-uc"), 0);
    expect(m).toMatchObject({ durum: "market", etiket: "Market'te · 500 Altın" });
    expect(parcaGorunumu(parcaBul("duz-uc"), 0).durum).toBe("market"); // seçilmeyen başlangıç seti
    const k = parcaGorunumu(parcaBul("ayaz-govde"), 0);
    expect(k).toMatchObject({ durum: "kilitli", ad: "Ayaz Gövde", etiket: "Kilitli: Don Ustası 0/10" });
    expect(k.okunan).toContain("2000 Altın");
    expect(parcaGorunumu(parcaBul("ayaz-govde"), 0, { "don-ustasi": 3 }).etiket).toBe("Kilitli: Don Ustası 3/10");
    const g = parcaGorunumu(parcaBul("kor-kalbi"), 0);
    expect(g).toMatchObject({ durum: "gizli", ad: "???" });
    expect(g.okunan).not.toContain("Kor Kalbi");
    expect(parcaGorunumu(parcaBul("kor-kalbi"), 1).ad).toBe("Kor Kalbi");
  });
  it("her parçanın kilidi 'acik' ya da var olan bir başarım", () => {
    for (const x of PARCALAR.parcalar) if (x.kilit !== "acik") expect(BASARIMLAR.some((b) => b.id === x.kilit)).toBe(true);
  });
});

describe("seviye kilitleri sim'e geçer (takım kodu → dünya)", () => {
  const kur = (sv: number) => {
    const uye = { cekirdek: "kor-goktasi", govde: "ok-govde", disk: "hafif-disk", uc: "duz-uc", seviye: sv, odunc: false, yon: "sag" as const };
    const kod = takimKoduYaz([uye, { ...uye, cekirdek: "kaya-maden", seviye: 1, odunc: true }, { ...uye, cekirdek: "kasirga-yapay", seviye: 1, odunc: true }]);
    const k = takimKurulumu(kod);
    const d = macDunyasiKur([k.profiller, k.profiller], 1, { uyeSeviyeleri: [k.seviyeler, k.seviyeler] });
    d.mac.faz = "tur";
    d.topaclar[0]!.enerji = ENERJI_TAVAN;
    return d;
  };
  it("Lv.1: yetenek yok · Lv.2: yalnız Yetenek · Lv.3: Özel Yetenek + Ulti", () => {
    const d1 = kur(1), d2 = kur(2), d3 = kur(3);
    expect([0, 1, 2].map((y) => yuvaDurumu(d1, 0, y) === "kilitli")).toStrictEqual([true, true, true]);
    expect([0, 1, 2].map((y) => yuvaDurumu(d2, 0, y) === "kilitli")).toStrictEqual([false, true, true]);
    expect([0, 1, 2].map((y) => yuvaDurumu(d3, 0, y) === "kilitli")).toStrictEqual([false, false, false]);
    expect(d3.seviye[0]).toBe(3);
  });
  it("Yapay yön tercihi profile (sim) geçer; sabit yönlü Çekirdekte yok sayılır", () => {
    const u = (c: string, yon: "sag" | "sol") => ({ cekirdek: c, govde: "savrulan-govde", disk: "denge-disk", uc: "dengeli-uc", seviye: 2, odunc: false, yon });
    const k = takimKurulumu(takimKoduYaz([u("kasirga-yapay", "sol"), u("kaya-maden", "sol"), u("kor-goktasi", "sag")]));
    expect(k.profiller[0].donus).toBe("sol");
    expect(k.profiller[1].donus).toBe("sag");
  });
});

// ---- sunucu: DB ----
const yeni = () => new Depo(veritabaniAc(":memory:"));
const oyuncu = (d: Depo, ad: string) => d.oyuncuOlustur({ ad, adAnahtar: adAnahtari(ad), sifreHash: "scrypt$x", simdi: 1 })!;

describe("D6 göç ve depo", () => {
  it("göç 2: defter sütunları, aktif takım, ad değişim sayacı", () => {
    const db = veritabaniAc(":memory:");
    expect(db.pragma("user_version", { simple: true })).toBe(GOCLER.length);
    const s = (db.prepare("PRAGMA table_info(cekirdek)").all() as { name: string }[]).map((r) => r.name);
    expect(s).toEqual(expect.arrayContaining(["mac_sayisi", "galibiyet", "kriz_galibiyet", "en_uzun_donus_sn", "edinme"]));
    const o = (db.prepare("PRAGMA table_info(oyuncu)").all() as { name: string }[]).map((r) => r.name);
    expect(o).toEqual(expect.arrayContaining(["aktif_takim", "ad_degisim"]));
  });
  it("parça ver (geliştirme): Çekirdek Lv.1 satırı, diğerleri parça; takım yaz ve oku", () => {
    const d = yeni();
    const a = oyuncu(d, "Ayşe");
    d.ilkCekirdek(a, "maden", 1);
    const c = d.parcaVer(a, "kasirga-yapay", 2);
    expect(c.tur).toBe("cekirdek");
    expect(d.cekirdek(a, c.id)).toMatchObject({ seviye: 1, tecrube: 0, omur: 30 });
    const u = d.parcaVer(a, "duz-uc", 2);
    expect(u.tur).toBe("uc");
    const t = d.takimTaslaklari(a)[0]!;
    t.yuvalar[0]!.uc = u.id;
    d.takimYaz(a, 0, "Kale", t.yuvalar);
    expect(d.takimTaslaklari(a)[0]!.yuvalar[0]!.uc).toBe(u.id);
    expect(d.takimlar(a)[0]!.yuvalar[0]!.uc).toBe("duz-uc");
    expect(d.takimlar(a)[0]!.ad).toBe("Kale");
    // 2 kullanılabilir Çekirdek → kota 1: [maden, boş, boş] → 1 yuva boş, oynanamaz
    const st = sunucuTakimlari(d, a);
    expect(st[0]).toMatchObject({ bos: 1, oynanabilir: false, kod: null });
  });
  it("XP ver: eşik 700 → Lv.3 (tavan); takım kodunda seviye 3", () => {
    const d = yeni();
    const a = oyuncu(d, "Bora");
    d.ilkCekirdek(a, "goktasi", 1);
    const c = d.cekirdekler(a)[0]!;
    expect(d.xpVer(a, c.id, 549)!.seviye).toBe(2);
    expect(d.xpVer(a, c.id, 1)!).toMatchObject({ seviye: 3, tecrube: 700 });
    expect(sunucuTakimlari(d, a)[0]!.kod).toContain("kor-goktasi:ok-govde:hafif-disk:duz-uc:3:0:sag");
  });
  it("Çekirdek defteri maç sonunda yazılır, aynı mac_id ikinci kez yazılmaz", () => {
    const d = yeni();
    const a = oyuncu(d, "Cem");
    const b = oyuncu(d, "Deniz");
    d.ilkCekirdek(a, "maden", 1);
    d.ilkCekirdek(b, "yapay", 1);
    const ta = d.takimlar(a)[0]!, tb = d.takimlar(b)[0]!;
    const g: MacSonuGirdisi = {
      macId: "d6-1", mod: "oda", oyuncular: [a, b], takimKodlari: ["x", "y"], yuvalar: [ta.yuvalar, tb.yuvalar],
      sonuc: { kazanan: 0, neden: "puan", puan: [3, 2], tick: 4000 }, sureSn: 70, krizGordu: [true, false], kalanStaminaOrani: [0.3, 0.1],
      katalogOzeti: "k", baslangic: 1, enUzunDonusSn: [[41.6, 0, 0], [20, 0, 0]], kararma: [0, 0],
    };
    macSonuYaz(d, g);
    macSonuYaz(d, g);
    expect(d.cekirdekler(a)[0]).toMatchObject({ mac_sayisi: 1, galibiyet: 1, kriz_galibiyet: 1, en_uzun_donus_sn: 42 });
    expect(d.cekirdekler(b)[0]).toMatchObject({ mac_sayisi: 1, galibiyet: 0, kriz_galibiyet: 0, en_uzun_donus_sn: 20, omur: 29 });
    macSonuYaz(d, { ...g, macId: "d6-2", sonuc: { kazanan: 1, neden: "puan", puan: [1, 3], tick: 1 }, enUzunDonusSn: [[12, 0, 0], [55, 0, 0]] });
    expect(d.cekirdekler(a)[0]).toMatchObject({ mac_sayisi: 2, galibiyet: 1, en_uzun_donus_sn: 42 });
    expect(d.cekirdekler(b)[0]).toMatchObject({ mac_sayisi: 2, galibiyet: 1, en_uzun_donus_sn: 55 });
    // iptal maç sayılmaz
    macSonuYaz(d, { ...g, macId: "d6-3", sonuc: { kazanan: -1, neden: "iptal", puan: [0, 0], tick: 1 } });
    expect(d.cekirdekler(a)[0]!.mac_sayisi).toBe(2);
  });
});

describe("ad değişimi 30 gün, takım adı", () => {
  it("ilk değişim serbest, sonra 30 gün", () => {
    const gun = 86400_000;
    expect(adDegisimKalanGun({ ad_degisti: 0, ad_degisim: 0 }, 5)).toBe(0);
    expect(adDegisimKalanGun({ ad_degisti: 10 * gun, ad_degisim: 1 }, 10 * gun + 1)).toBe(30);
    expect(adDegisimKalanGun({ ad_degisti: 10 * gun, ad_degisim: 1 }, 39 * gun + 1)).toBe(1);
    expect(adDegisimKalanGun({ ad_degisti: 10 * gun, ad_degisim: 1 }, 40 * gun)).toBe(0);
  });
  it("depo: ad değişir, alınmış ad reddedilir", () => {
    const d = yeni();
    const a = oyuncu(d, "Ece");
    oyuncu(d, "Fikret");
    expect(d.adDegistir(a, "Ece Yeni", adAnahtari("Ece Yeni"), 99)).toBe(true);
    expect(d.oyuncu(a)).toMatchObject({ ad: "Ece Yeni", ad_degisti: 99, ad_degisim: 1 });
    expect(d.adDegistir(a, "FİKRET", adAnahtari("FİKRET"), 100)).toBe(false);
  });
  it("takım adı 1-20, filtre", () => {
    expect(takimAdDogrula("Kale Takımı").hata).toBeNull();
    expect(takimAdDogrula("").hata).toBe("uzunluk");
    expect(takimAdDogrula("x".repeat(21)).hata).toBe("uzunluk");
    expect(takimAdDogrula("orospu").hata).toBe("uygunsuz");
  });
});

describe("dönüş sayacı ve ödünç kotası", () => {
  it("en uzun kesintisiz dönüş: değişim ve tur sonu keser", () => {
    const k = takimKurulumu("takim-1");
    const d = macDunyasiKur([k.profiller, k.profiller], 1);
    const s = new DonusSayaci();
    d.mac.faz = "tur";
    for (let t = 0; t < 120; t++) s.adim(d);
    d.takimlar![0]!.aktif = 1;
    for (let t = 0; t < 60; t++) s.adim(d);
    d.mac.faz = "turArasi";
    s.adim(d);
    d.mac.faz = "tur";
    for (let t = 0; t < 90; t++) s.adim(d);
    expect(s.saniye()[0]).toStrictEqual([2, 1.5, 0]);
    expect(s.saniye()[1]).toStrictEqual([3, 0, 0]); // 180 adım kesintisiz, tur arası keser, sonra 90
  });
  it("takimUyeleri: kotayı aşan boş yuva null, ömrü biten kota dışı", () => {
    const m = { cekirdek: "kaya-maden", govde: "kalkan-govde", disk: "agir-disk", uc: "igne-uc", seviye: 2, yon: "sag" as const };
    expect(takimUyeleri([m, null, null], 0)).toMatchObject({ bos: 2, uyeler: [{ cekirdek: "kaya-maden" }, null, null] });
    expect(takimUyeleri([m, null, null], 1).bos).toBe(1);
    const y = takimUyeleri([{ ...m, cekirdek: "kasirga-yapay", devreDisi: true }, m, null], 0);
    expect(y.bos).toBe(1);
    expect(y.uyeler[0]).toMatchObject({ odunc: true });
  });
});
