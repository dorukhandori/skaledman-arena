import { afterEach, describe, expect, it } from "vitest";
import {
  BILET_SN, DENEME_SINIRI, biletTuket, biletUret, cerezBasligi, cerezleriCoz, denemeIzinli, denemeleriSifirla, kimlikAyarlariniDenetle,
  kokenIzinli, oturumCereziCoz, oturumCereziDegeri, sifreDogrula, sifreHashle,
} from "../src/sunucu/kimlik.ts";

// D5 kimlik: şifre hash (scrypt + tuz), imzalı oturum çerezi, 60 s tek kullanımlık oda bileti, Origin, hız sınırı.

const ortam = { ...process.env };
afterEach(() => { process.env = { ...ortam }; denemeleriSifirla(); });

describe("şifre (scrypt + tuz)", () => {
  it("hash düz şifreyi içermez, her seferinde farklı tuz, doğru/yanlış şifre", async () => {
    const a = await sifreHashle("gizli-sifre-123");
    const b = await sifreHashle("gizli-sifre-123");
    expect(a).not.toContain("gizli-sifre-123");
    expect(a.startsWith("scrypt$32768$8$1$")).toBe(true);
    expect(a).not.toBe(b);
    expect(await sifreDogrula("gizli-sifre-123", a)).toBe(true);
    expect(await sifreDogrula("gizli-sifre-124", a)).toBe(false);
    expect(await sifreDogrula("gizli-sifre-123", "bozuk$kayit")).toBe(false);
  });
});

describe("oturum çerezi", () => {
  it("imzalı değer çözülür; değiştirilmiş imza ya da kimlik reddedilir", () => {
    const d = oturumCereziDegeri("abc123");
    expect(oturumCereziCoz(d)).toBe("abc123");
    expect(oturumCereziCoz(`abc124.${d.split(".")[1]}`)).toBeNull();
    expect(oturumCereziCoz(`${d}x`)).toBeNull();
    expect(oturumCereziCoz(undefined)).toBeNull();
  });
  it("HttpOnly + SameSite=Lax; Secure yalnız üretimde", () => {
    expect(cerezBasligi("devran_oturum", "v", 60)).toMatch(/HttpOnly; SameSite=Lax; Max-Age=60$/);
    process.env.NODE_ENV = "production";
    expect(cerezBasligi("devran_oturum", "v", 60)).toContain("; Secure");
    expect(cerezleriCoz("a=1; devran_oturum=x.y")["devran_oturum"]).toBe("x.y");
  });
});

describe("oda bileti", () => {
  it("geçerli bilet bir kez kullanılır", () => {
    const b = biletUret(7);
    expect(biletTuket(b)).toStrictEqual({ oyuncuId: 7 });
    expect(biletTuket(b)).toStrictEqual({ hata: "kullanildi" });
  });
  it("60 s sonra süresi dolar", () => {
    const t = 1_000_000;
    const b = biletUret(7, t);
    expect(biletTuket(b, t + BILET_SN * 1000 + 1)).toStrictEqual({ hata: "sure" });
  });
  it("imzası bozuk / sahte / biçimsiz bilet reddedilir", () => {
    const b = biletUret(7);
    const [govde] = b.split(".");
    const sahte = Buffer.from(JSON.stringify({ o: 1, n: "x", s: Date.now() + 9e5 })).toString("base64url");
    expect(biletTuket(`${sahte}.${b.split(".")[1]}`)).toStrictEqual({ hata: "imza" });
    expect(biletTuket(`${govde}.AAAA`)).toStrictEqual({ hata: "imza" });
    expect(biletTuket("x")).toStrictEqual({ hata: "bicim" });
    expect(biletTuket(42)).toStrictEqual({ hata: "bicim" });
  });
});

describe("Origin", () => {
  it("geliştirmede localhost kabul, yabancı köken reddedilir", () => {
    delete process.env.IZINLI_KOKENLER;
    process.env.NODE_ENV = "development";
    expect(kokenIzinli("http://localhost:5173")).toBe(true);
    expect(kokenIzinli("https://kotu.example")).toBe(false);
    expect(kokenIzinli("null")).toBe(false);
  });
  it("üretimde yalnız liste; Origin'siz reddedilir", () => {
    process.env.NODE_ENV = "production";
    process.env.IZINLI_KOKENLER = "https://devran.example";
    expect(kokenIzinli("https://devran.example")).toBe(true);
    expect(kokenIzinli("http://localhost:5173")).toBe(false);
    expect(kokenIzinli(null)).toBe(false);
  });
});

describe("kaba kuvvet sınırı", () => {
  it("aynı anahtar dakikada 10 deneme; pencere geçince yeniden", () => {
    const t = 5_000_000;
    for (let i = 0; i < DENEME_SINIRI.sayi; i++) expect(denemeIzinli("ip:ad", t + i)).toBe(true);
    expect(denemeIzinli("ip:ad", t + 100)).toBe(false);
    expect(denemeIzinli("ip:baska", t + 100)).toBe(true);
    expect(denemeIzinli("ip:ad", t + DENEME_SINIRI.pencereMs + 20)).toBe(true);
  });
});

describe("açılış denetimi", () => {
  it("üretimde eksik ortam açık hata verir", () => {
    process.env.NODE_ENV = "production";
    delete process.env.OTURUM_SIRRI;
    delete process.env.IZINLI_KOKENLER;
    delete process.env.VERI_DIZINI;
    expect(() => kimlikAyarlariniDenetle()).toThrow(/OTURUM_SIRRI.*IZINLI_KOKENLER.*VERI_DIZINI/);
  });
  it("KIMLIK_MODU=kick henüz yok (sona bırakıldı)", () => {
    process.env.KIMLIK_MODU = "kick";
    expect(() => kimlikAyarlariniDenetle()).toThrow(/Kick OAuth sona bırakıldı/);
  });
});
