import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Depo, veritabaniAc } from "../src/sunucu/db/depo.ts";
import { adAnahtari, oduncDoldur } from "../src/sunucu/oyuncu/kurallar.ts";
import { basarimOlayiIsle } from "../src/sunucu/oyuncu/basarimYaz.ts";
import { dovYap, eritYap, koleksiyonDegeri, ocakGorunumu, parcaErit, parcaUret, uretilenler, vitrinYaz } from "../src/sunucu/oyuncu/ocak.ts";
import { craftBilgisi, marketGorunumu } from "../src/sunucu/api/market.ts";
import { takimKoduYaz, takimKurulumu } from "../src/paylasilan/veri/takimlar.ts";
import { parcaBul } from "../src/paylasilan/veri/katalog.ts";

// H4 Ocak (docs/design/harita/09 H4 + § 2b; 11 § 10 #1, #2, #12, #13): eritme 4:1/3:1 + cüruf + toplu + ref idempotent,
// kozmetik dövme 402/409 + tek seferlik + yeniden döv, parça üretimi (Market kilidi, kademe, Ustalık, seri, yapımcı,
// değer), parça eritme %50, vitrin, Market craft satırı, G-0 (üretilmiş = Market biçimi aynı sim profili).

const yeni = () => new Depo(veritabaniAc(":memory:"));
let n = 0;
const T = Date.parse("2026-11-04T09:00:00Z");
function kur(d: Depo) {
  const a = d.oyuncuOlustur({ ad: `Ocakci${++n}`, adAnahtar: adAnahtari(`Ocakci${n}`), sifreHash: "x", simdi: 1 })!;
  d.ilkCekirdek(a, "maden", 1);
  basarimOlayiIsle(d, a, { olay: { antrenmanBitti: true } }, 1);
  return a;
}
const ref = () => randomUUID();
const tut = () => 0;
const tutmaz = () => 0.999;

describe("eritme", () => {
  it("Ocak kapalıyken (cevher yok, İlk Kazı yok) 403 kapali; 4:1; cüruf; toplu; ref idempotent", () => {
    const d = yeni();
    const a = kur(d);
    expect(eritYap(d, a, { kademe: 1, parti: 1, ref: ref() }, T)).toMatchObject({ ok: false, hata: "kapali" });
    d.cevherEkle(a, 1, 10);
    const r = ref();
    const e = eritYap(d, a, { kademe: 1, parti: 5, ref: r }, T, tut);
    expect(e).toMatchObject({ ok: true, sonuc: { kulce: 2, harcanan: 8, parti: 2, basarili: 2 } });
    expect(d.cevherler(a)).toMatchObject({ cevher: [2, 0, 0, 0, 0, 0, 0, 0], kulce: [2, 0, 0, 0, 0, 0, 0, 0] });
    // aynı ref: önceki sonuç, ikinci kez yazılmaz
    expect(eritYap(d, a, { kademe: 1, parti: 5, ref: r }, T, tut)).toMatchObject({ ok: true, tekrar: true, sonuc: { kulce: 2 } });
    expect(d.cevherler(a).kulce[0]).toBe(2);
    expect(eritYap(d, a, { kademe: 1, parti: 1, ref: ref() }, T, tut)).toMatchObject({ ok: false, hata: "yetersiz", gerekli: 4 });
    d.cevherEkle(a, 1, 2);
    const c = eritYap(d, a, { kademe: 1, parti: 1, ref: ref() }, T, tutmaz);
    expect(c).toMatchObject({ ok: true, sonuc: { kulce: 0, curuf: 1, harcanan: 1 } });
    expect(eritYap(d, a, { kademe: 2, parti: 1, ref: ref() }, T, tut)).toMatchObject({ ok: false, hata: "ustalik", gerekli: 10 });
  });
  it("İşleme − eşik ≥ 20: 3:1", () => {
    const d = yeni();
    const a = kur(d);
    d.ustalikYaz(a, "isleme", 70400); // seviye 20
    d.cevherEkle(a, 1, 9);
    expect(eritYap(d, a, { kademe: 1, parti: 3, ref: ref() }, T, tut)).toMatchObject({ ok: true, sonuc: { kulce: 3, harcanan: 9 } });
  });
});

describe("kozmetik dövme", () => {
  it("402 altın / 409 eksik / ustalık / sahip / bayrak; tek seferlik; YENİDEN DÖV yarım bedel, tecrübe yok", () => {
    const d = yeni();
    const a = kur(d);
    d.cevherEkle(a, 1, 0, 5);
    d.altinYaz(a, -100, "test", "t0", T); // İlk Devir 100 → 0
    expect(dovYap(d, a, { tarif: "arma-demir", ref: ref() }, T, tut)).toMatchObject({ ok: false, hata: "altin", gerekli: 100 });
    d.altinYaz(a, 300, "test", "t1", T);
    expect(dovYap(d, a, { tarif: "arma-kaya", ref: ref() }, T)).toMatchObject({ ok: false, hata: "ustalik", gerekli: 10 });
    expect(dovYap(d, a, { tarif: "parca-dag-diski", ref: ref() }, T)).toMatchObject({ ok: false, hata: "bayrak" });
    expect(dovYap(d, a, { tarif: "yok-boyle", ref: ref() }, T)).toMatchObject({ ok: false, hata: "yok" });
    const r = dovYap(d, a, { tarif: "arma-demir", ref: ref() }, T, tutmaz);
    expect(r).toMatchObject({ ok: true, cikti: "arma-cevher-demir", usta: false, bakiye: 200 });
    expect(d.ustaliklar(a).isleme).toBe(3000);
    expect(dovYap(d, a, { tarif: "arma-demir", ref: ref() }, T)).toMatchObject({ ok: false, hata: "sahip" });
    expect(dovYap(d, a, { tarif: "cerceve-demir", ref: ref(), yeniden: true }, T)).toMatchObject({ ok: false, hata: "sahipDegil" });
    d.cevherEkle(a, 1, 0, 3);
    const y = dovYap(d, a, { tarif: "arma-demir", ref: ref(), yeniden: true }, T, tutmaz);
    expect(y).toMatchObject({ ok: true, bakiye: 150, kulce: [1, 0, 0, 0, 0, 0, 0, 0] });
    expect(d.ustaliklar(a).isleme).toBe(3000);
    expect(d.gorunumler(a).map((x) => x.gorunum_id)).toStrictEqual(["arma-cevher-demir"]);
  });
});

describe("parça üretimi (12)", () => {
  it("403 kilitli (Market kilidi) · 409 kademe · ustalık · eksik · 402 altın; başarılı: malzeme, yapımcı, seri, değer", () => {
    const d = yeni();
    const a = kur(d);
    d.cevherEkle(a, 1, 1);
    expect(parcaUret(d, a, { tanim: "ayaz-govde", kademe: 2, ref: ref() }, T)).toMatchObject({ ok: false, hata: "kilitli" });
    expect(parcaUret(d, a, { tanim: "duz-uc", kademe: 5, ref: ref() }, T)).toMatchObject({ ok: false, hata: "kademe" });
    expect(parcaUret(d, a, { tanim: "top-uc", kademe: 1, ref: ref() }, T)).toMatchObject({ ok: false, hata: "ustalik", gerekli: 5 });
    expect(parcaUret(d, a, { tanim: "duz-uc", kademe: 1, ref: ref() }, T)).toMatchObject({ ok: false, hata: "eksik", gerekli: 3 });
    d.cevherEkle(a, 1, 0, 3);
    const p = parcaUret(d, a, { tanim: "duz-uc", kademe: 1, ref: ref() }, T, tutmaz);
    expect(p).toMatchObject({ ok: true, parca: { tanim: "duz-uc", ad: "DEMİR DÜZ UÇ", malzeme: 1, seri: 1, usta: false, deger: 30 }, kulce: [0, 0, 0, 0, 0, 0, 0, 0] });
    expect(p.ok && p.parca.yapimciAd).toBe(d.oyuncu(a)!.ad);
    expect(d.parcalar(a).find((x) => x.malzeme === 1)).toMatchObject({ tanim_id: "duz-uc", yapimci_id: a, seri: 1 });
    // ikinci Demir Düz Uç: seri 2 (aynı oyuncuda birden çok biçim)
    d.cevherEkle(a, 1, 0, 3);
    expect(parcaUret(d, a, { tanim: "duz-uc", kademe: 1, ref: ref() }, T, tutmaz)).toMatchObject({ ok: true, parca: { seri: 2 } });
    // Hizip parça K2 ile üretilemez (en düşük K3)
    basarimOlayiIsle(d, a, { durum: { enYuksekSeviye: 3 } }, T);
    expect(parcaUret(d, a, { tanim: "parlak-disk", kademe: 1, ref: ref() }, T)).toMatchObject({ ok: false, hata: "kademe" });
    // Çekirdek üretimi: Lv.1, XP 0
    d.cevherEkle(a, 1, 0, 6);
    const c = parcaUret(d, a, { tanim: "kor-goktasi", kademe: 1, ref: ref() }, T, tut);
    expect(c).toMatchObject({ ok: true, parca: { tur: "cekirdek" } });
    expect(d.cekirdekler(a).find((x) => x.tanim_id === "kor-goktasi")).toMatchObject({ seviye: 1, tecrube: 0 });
    expect(uretilenler(d, a)).toHaveLength(3);
    expect(koleksiyonDegeri(d, a)).toBeGreaterThan(60);
  });

  it("seri sunucu geneli, (tanım, malzeme) başına çakışmaz: iki oyuncu 100 üretim", () => {
    const d = yeni();
    const a = kur(d);
    const b = kur(d);
    d.cevherEkle(a, 1, 0, 150);
    d.cevherEkle(b, 1, 0, 150);
    const seriler: number[] = [];
    for (let i = 0; i < 50; i++) for (const o of [a, b]) {
      const r = parcaUret(d, o, { tanim: "igne-uc", kademe: 1, ref: ref() }, T, tutmaz);
      if (r.ok) seriler.push(r.parca.seri);
    }
    expect(seriler).toHaveLength(100);
    expect(new Set(seriler).size).toBe(100);
    expect(Math.max(...seriler)).toBe(100);
  });

  it("G-0: üretilmiş biçim takım kodunu ve sim profilini değiştirmez; takımda aynı tanımdan tek örnek", () => {
    const d = yeni();
    const a = kur(d);
    const kod = takimKoduYaz(oduncDoldur(d.takimlar(a)[0]!.yuvalar));
    d.cevherEkle(a, 1, 0, 5);
    d.ustalikYaz(a, "isleme", 1779100);
    const p = parcaUret(d, a, { tanim: "kalkan-govde", kademe: 4, ref: ref() }, T, tut);
    expect(p.ok).toBe(false); // K4 külçe yok
    d.cevherEkle(a, 4, 0, 5);
    const q = parcaUret(d, a, { tanim: "kalkan-govde", kademe: 4, ref: ref() }, T, tut);
    expect(q).toMatchObject({ ok: true, parca: { usta: true, ad: "KOR KALKAN GÖVDE" } });
    const t = d.takimTaslaklari(a)[0]!;
    const yeniId = q.ok ? q.parca.id : 0;
    d.takimYaz(a, 0, "Takım 1", [{ ...t.yuvalar[0]!, govde: yeniId }, t.yuvalar[1]!, t.yuvalar[2]!]);
    const kod2 = takimKoduYaz(oduncDoldur(d.takimlar(a)[0]!.yuvalar));
    expect(kod2).toBe(kod);
    expect(JSON.stringify(takimKurulumu(kod2).profiller)).toBe(JSON.stringify(takimKurulumu(kod).profiller));
    expect(d.takimlar(a)[0]!.yuvalar[0]!.malzeme).toStrictEqual([0, 4, 0, 0]);
  });

  it("parça eritme: %50 aynı kademe; Market biçimi ve takımdaki eritilemez; vitrinden düşer", () => {
    const d = yeni();
    const a = kur(d);
    d.cevherEkle(a, 1, 0, 10);
    const p = parcaUret(d, a, { tanim: "ok-govde", kademe: 1, ref: ref() }, T, tutmaz);
    if (!p.ok) throw new Error();
    const market = d.parcalar(a).find((x) => x.malzeme === null)!;
    expect(parcaErit(d, a, { parcaId: market.id, ref: ref() }, T)).toMatchObject({ ok: false, hata: "marketBicimi" });
    expect(vitrinYaz(d, a, [p.parca.anahtar])).toMatchObject({ ok: true });
    expect(vitrinYaz(d, a, [`p${market.id}`])).toMatchObject({ ok: false, hata: "sahipDegil" });
    const kulceOnce = d.cevherler(a).kulce[0]!;
    expect(parcaErit(d, a, { parcaId: p.parca.id, ref: ref() }, T)).toMatchObject({ ok: true, kulce: { kademe: 1, adet: 2 } });
    expect(d.cevherler(a).kulce[0]).toBe(kulceOnce + 2);
    expect(ocakGorunumu(d, a).vitrin).toStrictEqual([]);
    // takımdaki üretilmiş parça
    const q = parcaUret(d, a, { tanim: "hafif-disk", kademe: 1, ref: ref() }, T, tutmaz);
    if (!q.ok) throw new Error();
    const t = d.takimTaslaklari(a)[0]!;
    d.takimYaz(a, 0, "Takım 1", [{ ...t.yuvalar[0]!, disk: q.parca.id }, t.yuvalar[1]!, t.yuvalar[2]!]);
    expect(parcaErit(d, a, { parcaId: q.parca.id, ref: ref() }, T)).toMatchObject({ ok: false, hata: "takimda" });
  });
});

describe("Market SAPMA + craft satırı (12 § 5)", () => {
  it("kilitsiz 0; craft metni HAZIR / ~N GÜN / İŞLEME N GEREKİR; tek biçim (araştırma 11 § 10 #2)", () => {
    expect(craftBilgisi(parcaBul("duz-uc"), 0, [3], 0)).toMatchObject({ hazir: true, metin: "CRAFT: HAZIR · OCAK'A GİT" });
    expect(craftBilgisi(parcaBul("dusurucu-govde"), 40, [0, 0, 5], 4)).toMatchObject({ kademe: 3, kulce: 25, gun: 5, tahmini: false, metin: "CRAFT: 25 DON KÜLÇESİ · ~5 GÜN" });
    expect(craftBilgisi(parcaBul("dusurucu-govde"), 10, [], 0)).toMatchObject({ ustalikEksik: 40, metin: "CRAFT: İŞLEME 40 GEREKİR" });
    const d = yeni();
    const a = kur(d);
    const m = marketGorunumu(d, a, T);
    const hepsi = m.raflar.flatMap((r) => r.urunler) as { id: string; fiyat?: number; craft?: { metin: string } }[];
    expect(hepsi.find((u) => u.id === "halka-govde")!.fiyat).toBe(0);
    expect(hepsi.find((u) => u.id === "ayaz-govde")!.fiyat).toBe(12000);
    expect(hepsi.find((u) => u.id === "simsek-goktasi")!.fiyat).toBe(2500);
    expect(hepsi.find((u) => u.id === "kul-cekirdegi")!.fiyat).toBe(48000);
    for (const u of hepsi) if (u.craft) expect(u.craft.metin).not.toMatch(/son fırsat|sınırlı|acele/i);
  });
});
