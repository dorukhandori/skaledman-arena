import { describe, expect, it } from "vitest";
import { bant, bantEtiketi, basariSansi, ilerleme, seviye, tecrubeEkle, TECRUBE_TAVANI_X100 } from "../src/paylasilan/kurallar/ustalik.ts";
import { damarKapasitesi, dincMetni, gunlukCarpan, isabetGecerli, isabetPenceresi, nadirSira, vurusKademesi, vurusSonucu } from "../src/paylasilan/kurallar/maden.ts";
import {
  degerPuani, eritmeOrani, eritmePartisi, eritmeToplu, kozmetikTarifler, malzemeliAd, parcaEritmeGeri, parcaMaliyeti, tarifBul, tarifDurumu,
  ustaIsiOlasiligi, uretilebilirKademe, yenidenDovBedeli,
} from "../src/paylasilan/kurallar/ocak.ts";
import {
  acilacaklar, asamaHesapla, bolgeIlerlemesi, dugumBul, DURUM, enKisaYol, ILK_BOLGELER, macOdulu, rozetHesapla, ROZET, yildizlar,
} from "../src/paylasilan/kurallar/harita.ts";
import { parcaBul } from "../src/paylasilan/veri/katalog.ts";
import type { MadenDugumu } from "../src/paylasilan/veri/harita.ts";

// H1 saf kurallar (docs/design/harita/08 § 9 "Birim"; 13 § 3–4).

describe("Ustalık", () => {
  it("seviye ve sınırlar (kümülatif tablo, ×100)", () => {
    expect(seviye(0)).toBe(0);
    expect(seviye(1999)).toBe(0);
    expect(seviye(2000)).toBe(1);
    expect(seviye(26300)).toBe(10);
    expect(seviye(1779100)).toBe(100);
    expect(seviye(99999999)).toBe(100);
    expect(ilerleme(1000)).toBeCloseTo(0.5);
    expect(tecrubeEkle(TECRUBE_TAVANI_X100 - 10, 500)).toBe(TECRUBE_TAVANI_X100);
  });
  it("öğrenme bandı 0–14 ×1, 15–29 ×0,5, 30+ ×0,1; negatif kilitli", () => {
    expect([bant(-1), bant(0), bant(14), bant(15), bant(29), bant(30), bant(90)]).toStrictEqual([0, 1, 1, 0.5, 0.5, 0.1, 0.1]);
    expect([bantEtiketi(-1), bantEtiketi(3), bantEtiketi(20), bantEtiketi(40)]).toStrictEqual(["kilitli", "ogretir", "azOgretir", "ogretmez"]);
  });
  it("başarı %50 → %95 (fark 25), eşik altı 0", () => {
    expect(basariSansi(9, 10)).toBe(0);
    expect(basariSansi(10, 10)).toBeCloseTo(0.5);
    expect(basariSansi(20, 10)).toBeCloseTo(0.68);
    expect(basariSansi(35, 10)).toBeCloseTo(0.95);
    expect(basariSansi(100, 0)).toBeCloseTo(0.95);
  });
});

describe("Kazı", () => {
  const b102 = dugumBul("b1-02") as MadenDugumu;
  it("günlük çarpan geçişleri 40/41, 60/61", () => {
    expect(gunlukCarpan(39)).toMatchObject({ verim: 1, dinc: true });
    expect(gunlukCarpan(40)).toMatchObject({ verim: 0.5, tecrube: 0.5, dinc: false });
    expect(gunlukCarpan(59)).toMatchObject({ verim: 0.5 });
    expect(gunlukCarpan(60)).toMatchObject({ verim: 0, tecrube: 0.1, verimsiz: true });
    expect(dincMetni(12)).toBe("DİNÇ VURUŞ 12/40");
    expect(dincMetni(61)).not.toMatch(/ceza|yasak/i);
  });
  it("vuruş sonucu: başarı verim(K)+isabet, ıska yarım tecrübe, yarım günde aşağı yuvarla (en az 1), 61+ cevher 0", () => {
    expect(vurusSonucu({ U: 0, kademe: 1, zar: 0.1, isabet: true, toplamOnce: 0, ardisikIska: 0 })).toMatchObject({ basari: true, verim: 4, tecrubeX100: 1000 });
    expect(vurusSonucu({ U: 0, kademe: 1, zar: 0.9, isabet: true, toplamOnce: 0, ardisikIska: 0 })).toMatchObject({ basari: false, verim: 0, tecrubeX100: 500 });
    expect(vurusSonucu({ U: 0, kademe: 1, zar: 0.1, isabet: false, toplamOnce: 45, ardisikIska: 0 })).toMatchObject({ verim: 1, tecrubeX100: 500 });
    expect(vurusSonucu({ U: 0, kademe: 1, zar: 0.1, isabet: true, toplamOnce: 70, ardisikIska: 0 })).toMatchObject({ basari: true, verim: 0, tecrubeX100: 100 });
    // bant: U 20, K1 (fark 20) → ×0,5
    expect(vurusSonucu({ U: 20, kademe: 1, zar: 0.1, isabet: false, toplamOnce: 0, ardisikIska: 0 }).tecrubeX100).toBe(500);
  });
  it("şanssızlık koruması: 3 ardışık ıskadan sonra başarı", () => {
    expect(vurusSonucu({ U: 0, kademe: 1, zar: 0.99, isabet: false, toplamOnce: 0, ardisikIska: 3 })).toMatchObject({ basari: true, korundu: true });
    expect(vurusSonucu({ U: 0, kademe: 1, zar: 0.99, isabet: false, toplamOnce: 0, ardisikIska: 2 }).basari).toBe(false);
  });
  it("isabet doğrulama: ±150 ms tolerans, faz ve pencere", () => {
    const [bas, bit] = isabetPenceresi();
    expect(bit - bas).toBe(308);
    const orta = (bas + bit) / 2;
    expect(isabetGecerli(orta, orta, 0)).toBe(true);
    expect(isabetGecerli(orta, orta + 150, 0)).toBe(true);
    expect(isabetGecerli(orta, orta + 151, 0)).toBe(false);
    expect(isabetGecerli(10, 10, 0)).toBe(false); // pencere dışında
    expect(isabetGecerli(10, 10, orta - 10)).toBe(true); // faz kaydırması
    expect(isabetGecerli(null, 500, 0)).toBe(false);
  });
  it("nadir yuva: aynı gün aynı sıra (deterministik), olasılık 0 → yok, 1 → hep", () => {
    expect(nadirSira("s", 1, 100, "b1-02", 1, 6)).toBe(nadirSira("s", 1, 100, "b1-02", 1, 6));
    expect(nadirSira("s", 1, 100, "b1-02", 0, 6)).toBeNull();
    let tutan = 0;
    for (let g = 0; g < 2000; g++) if (nadirSira("s", 1, g, "b1-02", 0.1, 6) !== null) tutan++;
    expect(tutan / 2000).toBeGreaterThan(0.07);
    expect(tutan / 2000).toBeLessThan(0.13);
  });
  it("nadir kademe yalnız Ustalık yetince; yetmezse ana kademe; sürüm tavanı K4", () => {
    expect(vurusKademesi(b102, 2, 2, 10)).toStrictEqual({ kademe: 2, nadir: true });
    expect(vurusKademesi(b102, 2, 2, 9)).toStrictEqual({ kademe: 1, nadir: false });
    expect(vurusKademesi(b102, 3, 2, 50)).toStrictEqual({ kademe: 1, nadir: false });
    const b312 = dugumBul("b3-12") as MadenDugumu;
    expect(vurusKademesi(b312, 0, 0, 100).kademe).toBeLessThanOrEqual(4);
  });
  it("USTA DAMAR: kapasite +1, nadir +5 puan", () => {
    expect(damarKapasitesi(b102, false)).toStrictEqual({ kapasite: 6, nadirOlasilik: 0.1 });
    expect(damarKapasitesi(b102, true).kapasite).toBe(7);
    expect(damarKapasitesi(b102, true).nadirOlasilik).toBeCloseTo(0.15);
  });
});

describe("Ocak", () => {
  it("eritme 4:1 → 3:1 (fark ≥ 20), başarısızlıkta 1 cüruf, yarım tecrübe", () => {
    expect(eritmeOrani(19, 0)).toBe(4);
    expect(eritmeOrani(20, 0)).toBe(3);
    expect(eritmePartisi(0, 1, 0.1)).toMatchObject({ basari: true, kulce: 1, harcanan: 4, tecrubeX100: 1600 });
    expect(eritmePartisi(0, 1, 0.9)).toMatchObject({ basari: false, kulce: 0, harcanan: 1, curuf: 1, tecrubeX100: 800 });
    const t = eritmeToplu(0, 1, 10, 20, [0.1, 0.1, 0.1]);
    expect(t.partiler.length).toBe(2);
    expect(t.kulce).toBe(2);
    expect(t.harcanan).toBe(8);
  });
  it("Usta işi olasılığı: fark 10 → 0, 20 → %10, 35+ → %25", () => {
    expect(ustaIsiOlasiligi(10, 0)).toBe(0);
    expect(ustaIsiOlasiligi(20, 0)).toBeCloseTo(0.1);
    expect(ustaIsiOlasiligi(80, 0)).toBe(0.25);
  });
  it("kozmetik tarifler 8; durum: gizli / ustalık / eksik / altın / açık / sahip / bayrak", () => {
    expect(kozmetikTarifler().length).toBe(8);
    const arma = tarifBul("arma-demir")!;
    expect(tarifDurumu(arma, { U: 0, kulce: [0], bakiye: 0, sahip: false })).toBe("eksik");
    expect(tarifDurumu(arma, { U: 0, kulce: [5], bakiye: 0, sahip: false })).toBe("altin");
    expect(tarifDurumu(arma, { U: 0, kulce: [5], bakiye: 100, sahip: false })).toBe("acik");
    expect(tarifDurumu(arma, { U: 0, kulce: [5], bakiye: 100, sahip: true })).toBe("sahip");
    expect(tarifDurumu(tarifBul("cerceve-don")!, { U: 0, kulce: [], bakiye: 0, sahip: false })).toBe("gizli");
    expect(tarifDurumu(tarifBul("arma-kaya")!, { U: 5, kulce: [], bakiye: 0, sahip: false })).toBe("ustalik");
    expect(tarifDurumu(tarifBul("parca-dag-diski")!, { U: 99, kulce: [99, 99], bakiye: 9999, sahip: false })).toBe("bayrak");
    expect(yenidenDovBedeli(tarifBul("arma-kaya")!)).toStrictEqual({ girdi: [{ kademe: 2, kulce: 1 }, { kademe: 1, kulce: 1 }], altin: 100 });
  });
  it("parça üretimi maliyeti (12 § 2): Başlangıç Uç 3 / Disk 4 / Gövde 5 / Çekirdek 6; Hizip Gövde 25 külçe 600 Altın K3+", () => {
    expect(parcaMaliyeti(parcaBul("duz-uc"), 1)).toMatchObject({ kulce: 3, iscilik: 0, esik: 0 });
    expect(parcaMaliyeti(parcaBul("agir-disk"), 1)!.kulce).toBe(4);
    expect(parcaMaliyeti(parcaBul("ok-govde"), 1)!.kulce).toBe(5);
    expect(parcaMaliyeti(parcaBul("kor-goktasi"), 1)!.kulce).toBe(6);
    expect(parcaMaliyeti(parcaBul("dusurucu-govde"), 2)).toBeNull();
    expect(parcaMaliyeti(parcaBul("dusurucu-govde"), 3)).toMatchObject({ kulce: 25, iscilik: 600, esik: 40 });
    expect(parcaMaliyeti(parcaBul("kul-cekirdegi"), 4)).toMatchObject({ kulce: 45, iscilik: 1000, esik: 60 });
    expect(parcaMaliyeti(parcaBul("halka-govde"), 8)!.esik).toBe(97);
    expect(uretilebilirKademe(parcaBul("ayaz-govde"), 19)).toBeNull();
    expect(uretilebilirKademe(parcaBul("ayaz-govde"), 20)).toBe(2);
    expect(degerPuani(25, 3, false)).toBe(625);
    expect(degerPuani(25, 3, true)).toBe(938);
    expect(parcaEritmeGeri(25)).toBe(12);
    expect(malzemeliAd("Düşürücü Gövde", 4)).toBe("KOR DÜŞÜRÜCÜ GÖVDE");
    expect(malzemeliAd("Düz Uç", null)).toBe("DÜZ UÇ");
  });
});

describe("Harita: aşamalar, kilit, yol, ilerleme, rozet, yıldız, ödül", () => {
  const b1 = ILK_BOLGELER[0]!;
  it("aşama: varış KEŞFET; galibiyet TEMİZLE; 3 yıldız USTALAŞ; maden 1 / 30 başarılı vuruş; sandık açılınca tam", () => {
    const dus = dugumBul("b1-01")!;
    expect(asamaHesapla(dus, DURUM.acik, { tur: "varis" })).toBe(DURUM.kesfet);
    expect(asamaHesapla(dus, DURUM.kilitli, { tur: "varis" })).toBe(DURUM.kilitli);
    expect(asamaHesapla(dus, DURUM.kesfet, { tur: "galibiyet", yildizMaske: 1 })).toBe(DURUM.temizle);
    expect(asamaHesapla(dus, DURUM.temizle, { tur: "galibiyet", yildizMaske: 7 })).toBe(DURUM.ustalas);
    const m = dugumBul("b1-02")!;
    expect(asamaHesapla(m, DURUM.kesfet, { tur: "vurus", basariliToplam: 1 })).toBe(DURUM.temizle);
    expect(asamaHesapla(m, DURUM.temizle, { tur: "vurus", basariliToplam: 30 })).toBe(DURUM.ustalas);
    const s = dugumBul("b1-04")!;
    expect(asamaHesapla(s, DURUM.kesfet, { tur: "sandik" })).toBe(DURUM.temizle);
  });
  it("kilit: düşman TEMİZLE ile, maden/sandık KEŞFET ile açar; patron sonraki bölgenin girişini", () => {
    expect(acilacaklar(dugumBul("b1-01")!, DURUM.kesfet, {})).toStrictEqual([]);
    expect(acilacaklar(dugumBul("b1-01")!, DURUM.temizle, {})).toStrictEqual(["b1-02"]);
    expect(acilacaklar(dugumBul("b1-02")!, DURUM.kesfet, {})).toStrictEqual(["b1-03", "b1-04"]);
    expect(acilacaklar(dugumBul("b1-02")!, DURUM.kesfet, { "b1-03": 1 })).toStrictEqual(["b1-04"]);
    expect(acilacaklar(dugumBul("b1-11")!, DURUM.temizle, {})).toStrictEqual(["b1-12", "b2-01"]);
    expect(acilacaklar(dugumBul("b3-11")!, DURUM.temizle, {})).toStrictEqual(["b3-12"]); // sezon 2 kapalı
  });
  it("en kısa yol: yalnız açık düğümlerden, yönsüz (geri yürüme)", () => {
    const d = { "b1-01": 3, "b1-02": 2, "b1-03": 3, "b1-04": 2, "b1-05": 2, "b1-06": 1 };
    expect(enKisaYol(b1, d, "b1-01", "b1-05")).toStrictEqual(["b1-01", "b1-02", "b1-03", "b1-05"]);
    expect(enKisaYol(b1, d, "b1-05", "b1-06")).toStrictEqual(["b1-05", "b1-03", "b1-02", "b1-04", "b1-06"]);
    expect(enKisaYol(b1, d, "b1-01", "b1-07")).toBeNull();
    expect(enKisaYol(b1, d, "b1-04", "b1-04")).toStrictEqual(["b1-04"]);
  });
  it("bölge ilerlemesi ve rozetler (bronz → gümüş → altın)", () => {
    const hepsi = (n: number) => Object.fromEntries(b1.dugumler.map((x) => [x.id, n]));
    expect(bolgeIlerlemesi(b1, {})).toMatchObject({ puan: 0, enCok: 34 });
    const temiz = hepsi(DURUM.temizle);
    expect(bolgeIlerlemesi(b1, temiz).puan).toBe(24);
    expect(rozetHesapla(b1, { ...temiz, "b1-12": 2 })).toBe(ROZET.yok);
    expect(rozetHesapla(b1, temiz)).toBe(ROZET.bronz);
    expect(rozetHesapla(b1, { ...temiz, "b1-11": 4 })).toBe(ROZET.gumus);
    expect(rozetHesapla(b1, hepsi(DURUM.ustalas))).toBe(ROZET.altin);
  });
  it("yıldızlar (7 şart × kazan/kaybet)", () => {
    const o = { kazandi: true, sureSn: 55, kalanStaminaOrani: 0.6, bitisler: [{ tur: "ringOut", yetenekGecenSn: 2, alanNo: null }] };
    expect(yildizlar(o, ["kazan", "temiz", "hizli"])).toBe(7);
    expect(yildizlar(o, ["kazan", "durma", "ringOut"])).toBe(0b101);
    expect(yildizlar(o, ["kazan", "parcalanma", "yetenekBitis"])).toBe(0b101);
    expect(yildizlar({ ...o, kazandi: false }, ["kazan", "temiz", "hizli"])).toBe(0);
    expect(yildizlar({ ...o, sureSn: 61, kalanStaminaOrani: 0.49 }, ["kazan", "temiz", "hizli"])).toBe(1);
  });
  it("ödül: ilk 3 yıldız 150 Altın + 6 Demir; tekrar sayılan galibiyet 50 + 2 cevher; mağlubiyet 30; patron ilk 500 + 3 Kaya külçesi", () => {
    const b = b1;
    const ilk = macOdulu({ bolge: b, dugum: dugumBul("b1-01")!, durumOnce: 2, maskeOnce: 0, maske: 7, kazandi: true, sayilan: true });
    expect(ilk).toMatchObject({ altin: 150, cevher: [{ kademe: 1, adet: 6 }], kulce: [{ kademe: 1, adet: 1 }], durum: 4, yeniMaske: 7 });
    const tekrar = macOdulu({ bolge: b, dugum: dugumBul("b1-01")!, durumOnce: 4, maskeOnce: 7, maske: 7, kazandi: true, sayilan: true });
    expect(tekrar).toMatchObject({ altin: 50, cevher: [{ kademe: 1, adet: 2 }], kulce: [] });
    expect(macOdulu({ bolge: b, dugum: dugumBul("b1-01")!, durumOnce: 4, maskeOnce: 7, maske: 7, kazandi: true, sayilan: false }).altin).toBe(0);
    expect(macOdulu({ bolge: b, dugum: dugumBul("b1-03")!, durumOnce: 2, maskeOnce: 0, maske: 0, kazandi: false, sayilan: true })).toMatchObject({ altin: 30, durum: 2 });
    const p = macOdulu({ bolge: b, dugum: dugumBul("b1-11")!, durumOnce: 2, maskeOnce: 0, maske: 1, kazandi: true, sayilan: true });
    expect(p).toMatchObject({ altin: 600, kulce: [{ kademe: 2, adet: 3 }], cevher: [{ kademe: 2, adet: 2 }], durum: 3 });
    const pu = macOdulu({ bolge: b, dugum: dugumBul("b1-11")!, durumOnce: 3, maskeOnce: 1, maske: 6, kazandi: true, sayilan: true });
    expect(pu.gorunum).toStrictEqual(["arma-ocak-yamaci"]);
  });
});
