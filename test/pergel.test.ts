import { describe, expect, it } from "vitest";
import { IPUCLARI } from "../src/istemci/bilgic/ipuclari.ts";
import { OTOMATIK_ARA_MS, gezintiSec, kapatmaSonucu, kosulSagli, otomatikIzin, otomatikSec, sorSec, ucKomsuMu, zitCiftVarMi, type AtolyeDurumu } from "../src/istemci/bilgic/secim.ts";

const taban: AtolyeDurumu = { ziyaret: 5, takimEksik: 0, oduncVar: false, seviyeler: [1, 1, 1], takimElementleri: ["kor", "simsek", "kaya"], marketYeni: false };
const bos = new Set<string>();

describe("Pergel ipucu seçimi", () => {
  it("katalog zod'dan geçer ve 12 ipucu içerir", () => { expect(IPUCLARI.length).toBe(12); });
  it("ilk ziyarette ilk-ziyaret, ikincide (takım eksik) takim-eksik gelir; görülen bir daha gelmez", () => {
    const d1 = { ...taban, ziyaret: 1, takimEksik: 2 };
    expect(otomatikSec(IPUCLARI, d1, bos)?.id).toBe("ilk-ziyaret");
    const g = new Set(["ilk-ziyaret"]);
    expect(otomatikSec(IPUCLARI, { ...d1, ziyaret: 2 }, g)?.id).toBe("takim-eksik");
    g.add("takim-eksik");
    expect(otomatikSec(IPUCLARI, { ...d1, ziyaret: 2 }, g)?.id).not.toBe("takim-eksik");
  });
  it("yeni açılan (ulti-acik, market) ders ve genel bilgiden önce gelir", () => {
    expect(otomatikSec(IPUCLARI, { ...taban, seviyeler: [3, 1, 1], marketYeni: true }, bos)?.id).toBe("ulti-acik");
    expect(otomatikSec(IPUCLARI, { ...taban, marketYeni: true }, bos)?.id).toBe("market-acildi");
  });
  it("stamina yalnız başka aday yokken", () => {
    const d = { ...taban, ziyaret: 2, seviyeler: [3, 3, 3], takimElementleri: ["kor", "simsek", "kaya"] };
    expect(otomatikSec(IPUCLARI, d, new Set(["ulti-acik"]))?.id).toBe("stamina");
    expect(otomatikSec(IPUCLARI, { ...d, ziyaret: 2, seviyeler: [1, 3, 3] }, bos)?.id).toBe("ulti-acik");
  });
  it("ring-out verisi yoksa tetik çalışmaz", () => {
    expect(kosulSagli("ring-out", taban)).toBe(false);
    expect(kosulSagli("ring-out", { ...taban, sonMacRingOutKayip: true })).toBe(true);
  });
  it("element çarkı: yay ve karşıt çift", () => {
    expect(ucKomsuMu(["kor", "kasirga", "simsek"])).toBe(true);
    expect(ucKomsuMu(["girdap", "kaya", "don"])).toBe(true);
    expect(ucKomsuMu(["don", "kor", "kasirga"])).toBe(true);
    expect(ucKomsuMu(["kor", "simsek", "kaya"])).toBe(false);
    expect(zitCiftVarMi(["kor", "girdap", "kaya"])).toBe(true);
    expect(zitCiftVarMi(["kor", "kasirga", "simsek"])).toBe(false);
  });
  it("gezinti: ödünç yuva ve lab hedefleri", () => {
    expect(gezintiSec(IPUCLARI, "odunc-yuva", { ...taban, oduncVar: true }, bos)?.id).toBe("odunc");
    expect(gezintiSec(IPUCLARI, "lab", taban, bos)?.id).toBe("lab");
    expect(gezintiSec(IPUCLARI, "lab", taban, new Set(["lab"]))).toBeNull();
  });
  it("sor: önce görülmemiş, hepsi görüldüyse rastgele eski", () => {
    const d = { ...taban, ziyaret: 9 };
    const s = sorSec(IPUCLARI, d, bos, () => 0);
    expect(s).not.toBeNull();
    const hepsi = new Set(IPUCLARI.map((x) => x.id));
    const r = sorSec(IPUCLARI, d, hepsi, () => 0.999, "ruh-ozel");
    expect(r).not.toBeNull();
    expect(r?.id).not.toBe("ruh-ozel");
  });
  it("kendiliğinden izin: mod, susma, ziyaret başına bir, 45 s ara", () => {
    const c = { mod: "acik" as const, susturuldu: false, simdi: 100_000, sonOtomatik: null, buZiyaretOtomatik: 0 };
    expect(otomatikIzin(c)).toBe(true);
    expect(otomatikIzin({ ...c, mod: "sorunca" })).toBe(false);
    expect(otomatikIzin({ ...c, mod: "kapali" })).toBe(false);
    expect(otomatikIzin({ ...c, susturuldu: true })).toBe(false);
    expect(otomatikIzin({ ...c, buZiyaretOtomatik: 1 })).toBe(false);
    expect(otomatikIzin({ ...c, sonOtomatik: 100_000 - OTOMATIK_ARA_MS + 1 })).toBe(false);
    expect(otomatikIzin({ ...c, sonOtomatik: 100_000 - OTOMATIK_ARA_MS })).toBe(true);
  });
  it("üç okunmamış kapatma susturur; okunan sayacı sıfırlar", () => {
    let s = kapatmaSonucu(0, 300);
    s = kapatmaSonucu(s.okunmadan, 500);
    expect(s.sus).toBe(false);
    s = kapatmaSonucu(s.okunmadan, 400);
    expect(s.sus).toBe(true);
    expect(kapatmaSonucu(2, 5000)).toEqual({ okunmadan: 0, sus: false });
  });
});
