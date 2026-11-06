import { ESLint } from "eslint";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { Depo, veritabaniAc } from "../src/sunucu/db/depo.ts";
import { GOCLER, gocleriUygula } from "../src/sunucu/db/sema.ts";
import { adAnahtari, oduncDoldur } from "../src/sunucu/oyuncu/kurallar.ts";
import { takimKoduYaz } from "../src/paylasilan/veri/takimlar.ts";
import { takimDegerlendir } from "../src/paylasilan/kurallar/atolye.ts";

// H1: göç 5 (boş ve dolu veritabanında), Depo yardımcıları, hesap silme, lint kapısı (sim → harita), G-0 malzeme.

const yeni = () => new Depo(veritabaniAc(":memory:"));
const oyuncu = (d: Depo, ad: string) => d.oyuncuOlustur({ ad, adAnahtar: adAnahtari(ad), sifreHash: "scrypt$x", simdi: 1 })!;
const tablolar = (db: Database.Database) => (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((x) => x.name);
const sutun = (db: Database.Database, t: string) => (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((x) => x.name);

describe("göç 5", () => {
  it("boş veritabanı: user_version 5, yeni tablolar ve sütunlar", () => {
    const d = yeni();
    expect(GOCLER.length).toBe(5);
    expect(d.db.pragma("user_version", { simple: true })).toBe(5);
    for (const t of ["harita_dugum", "maden_gunluk", "maden_seans", "maden_vurus", "cevher", "ustalik", "isleme_defteri", "gorunum_sahip", "seri_sayac", "bolge_rozet"]) expect(tablolar(d.db)).toContain(t);
    expect(sutun(d.db, "parca")).toEqual(expect.arrayContaining(["malzeme", "yapimci_id", "yapimci_ad", "seri", "uretim", "usta"]));
    expect(sutun(d.db, "oyuncu")).toEqual(expect.arrayContaining(["vitrin", "cerceve", "karakter", "harita_konum"]));
    expect(sutun(d.db, "mac")).toEqual(expect.arrayContaining(["dugum_id", "yildiz"]));
    expect(sutun(d.db, "harita_dugum")).toContain("basarili_vurus");
  });

  it("dolu göç-4 veritabanı yerinde 5'e geçer; eski veri korunur, yeni sütunlar varsayılanlı", () => {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    for (let k = 0; k < 4; k++) { db.exec(GOCLER[k]!); db.pragma(`user_version = ${k + 1}`); }
    db.prepare("INSERT INTO oyuncu (ad, ad_anahtar, sifre_hash, ad_degisti, olusturma) VALUES ('Ayla', 'ayla', 'x', 1, 1)").run();
    db.prepare("INSERT INTO parca (oyuncu_id, tanim_id, edinme) VALUES (1, 'duz-uc', 1)").run();
    expect(gocleriUygula(db)).toBe(1);
    expect(db.pragma("user_version", { simple: true })).toBe(5);
    expect(db.prepare("SELECT ad, karakter, harita_konum FROM oyuncu").get()).toStrictEqual({ ad: "Ayla", karakter: 0, harita_konum: null });
    expect(db.prepare("SELECT tanim_id, malzeme, usta FROM parca").get()).toStrictEqual({ tanim_id: "duz-uc", malzeme: null, usta: 0 });
    expect(gocleriUygula(db)).toBe(0);
  });
});

describe("Depo yardımcıları (göç 5)", () => {
  it("düğüm: durum yalnız yükselir, yıldız birleşir, ilk tamam korunur, başarılı vuruş birikir", () => {
    const d = yeni();
    const a = oyuncu(d, "Ayla");
    d.dugumYaz(a, "b1-01", { durum: 1 });
    d.dugumYaz(a, "b1-01", { durum: 3, yildiz: 0b001, ilkTamam: 10 });
    d.dugumYaz(a, "b1-01", { durum: 2, yildiz: 0b100, ilkTamam: 20, basariliVurusEk: 2 });
    expect(d.dugumSatiri(a, "b1-01")).toStrictEqual({ dugum_id: "b1-01", durum: 3, yildiz: 5, ilk_tamam: 10, basarili_vurus: 2 });
  });
  it("cevher/külçe eksiye düşmez (CHECK), Ustalık yazılır, seri numarası artar", () => {
    const d = yeni();
    const a = oyuncu(d, "Ayla");
    d.cevherEkle(a, 1, 10, 2);
    expect(d.cevherler(a).cevher[0]).toBe(10);
    expect(() => d.cevherEkle(a, 1, -11)).toThrow();
    d.ustalikYaz(a, "madencilik", 2500);
    expect(d.ustaliklar(a)).toStrictEqual({ madencilik: 2500, isleme: 0 });
    expect([d.sonrakiSeri("duz-uc", 1), d.sonrakiSeri("duz-uc", 1), d.sonrakiSeri("duz-uc", 2)]).toStrictEqual([1, 2, 1]);
  });
  it("hesap silme yeni tabloları boşaltır; seri_sayac kalır", () => {
    const d = yeni();
    const a = oyuncu(d, "Ayla");
    d.dugumYaz(a, "b1-01", { durum: 3 });
    d.cevherEkle(a, 1, 5);
    d.ustalikYaz(a, "isleme", 100);
    d.madenGunlukYaz(a, 1, "*", { vurus: 3, seri: 1, iska: 0 });
    d.seansAc({ id: "00000000-0000-4000-8000-000000000001", oyuncu_id: a, dugum_id: "b1-02", gun: 1, baslangic: 1, vurus_bas: 1, faz_ms: 0, sira: 0, kapasite: 6, nadir_sira: null });
    d.vurusYaz({ seans_id: "00000000-0000-4000-8000-000000000001", sira: 0, kademe: 1, basari: 1, isabet: 0, isabet_ms: null, sunucu_ms: 800, verim: 3, tecrube: 1000, zaman: 1 });
    d.islemeYaz(a, { tur: "erit", tarif_id: null, girdi: {}, cikti: {}, usta: false, ref: "r1", zaman: 1 });
    d.gorunumVer(a, "arma-cevher-demir", false, 1);
    d.bolgeRozetYaz(a, "ocak-yamaci", 1, 1);
    d.sonrakiSeri("duz-uc", 1);
    expect(d.hesapSil(a)).toBe(true);
    for (const t of ["harita_dugum", "maden_gunluk", "maden_seans", "maden_vurus", "cevher", "ustalik", "isleme_defteri", "gorunum_sahip", "bolge_rozet"]) {
      expect((d.db.prepare(`SELECT COUNT(*) n FROM ${t}`).get() as { n: number }).n, t).toBe(0);
    }
    expect((d.db.prepare("SELECT COUNT(*) n FROM seri_sayac").get() as { n: number }).n).toBe(1);
  });
  it("telemetri temizliği 30 gün öncesini siler", () => {
    const d = yeni();
    const a = oyuncu(d, "Ayla");
    d.seansAc({ id: "00000000-0000-4000-8000-000000000002", oyuncu_id: a, dugum_id: "b1-02", gun: 1, baslangic: 1, vurus_bas: 1, faz_ms: 0, sira: 0, kapasite: 6, nadir_sira: null });
    d.vurusYaz({ seans_id: "00000000-0000-4000-8000-000000000002", sira: 0, kademe: 1, basari: 1, isabet: 0, isabet_ms: null, sunucu_ms: 800, verim: 3, tecrube: 1000, zaman: 5 });
    expect(d.madenTelemetriTemizle(10)).toBe(1);
  });
});

describe("G-0: malzeme biçimi takım koduna ve sim girdisine girmez; takımda aynı tanım tek", () => {
  it("parça malzemesi değişince takım kodu bit bit aynı", () => {
    const d = yeni();
    const a = oyuncu(d, "Ayla");
    d.ilkCekirdek(a, "maden", 1);
    const once = takimKoduYaz(oduncDoldur(d.takimlar(a)[0]!.yuvalar));
    d.db.prepare("UPDATE parca SET malzeme = 4, yapimci_ad = 'Ayla', seri = 3, usta = 1 WHERE oyuncu_id = ?").run(a);
    d.db.prepare("UPDATE cekirdek SET malzeme = 8 WHERE oyuncu_id = ?").run(a);
    expect(takimKoduYaz(oduncDoldur(d.takimlar(a)[0]!.yuvalar))).toBe(once);
  });
  it("takımda aynı parça tanımından iki örnek: tanimTekrar", () => {
    const env = {
      cekirdekler: [{ id: 1, tanimId: "kor-goktasi", devreDisi: false }, { id: 2, tanimId: "kaya-maden", devreDisi: false }],
      parcalar: [{ id: 10, tanimId: "ok-govde" }, { id: 11, tanimId: "hafif-disk" }, { id: 12, tanimId: "duz-uc" }, { id: 13, tanimId: "ok-govde" }, { id: 14, tanimId: "agir-disk" }, { id: 15, tanimId: "igne-uc" }],
    };
    const bos = { cekirdek: null, govde: null, disk: null, uc: null };
    const t = [{ cekirdek: 1, govde: 10, disk: 11, uc: 12 }, { cekirdek: 2, govde: 13, disk: 14, uc: 15 }, bos];
    expect(takimDegerlendir(t, env).hatalar).toStrictEqual([{ kod: "tanimTekrar", yuva: 1, tur: "govde" }]);
  });
});

describe("lint kapısı: sim → harita/maden/Ustalık/Ocak yasak", () => {
  const eslint = new ESLint({ cwd: new URL("..", import.meta.url).pathname });
  const hata = async (kod: string, filePath: string) => ((await eslint.lintText(kod, { filePath }))[0]?.messages ?? []).filter((m) => m.severity === 2).length;
  for (const mod of ["../kurallar/harita.ts", "../kurallar/maden.ts", "../kurallar/ustalik.ts", "../kurallar/ocak.ts", "../veri/harita.ts"]) {
    it(`yasak: sim → ${mod}`, async () => { expect(await hata(`import * as x from "${mod}"; export const a = x;`, "src/paylasilan/sim/_d.ts")).toBeGreaterThan(0); });
  }
  it("sim'in mevcut yasakları korunur (node:fs)", async () => { expect(await hata(`import * as x from "node:fs"; export const a = x;`, "src/paylasilan/sim/_d.ts")).toBeGreaterThan(0); });
  it("izinli: kurallar → veri/harita, sim içi içe aktarım", async () => {
    expect(await hata(`import { HARITA } from "../veri/harita.ts"; export const a = HARITA;`, "src/paylasilan/kurallar/_d.ts")).toBe(0);
    expect(await hata(`import { Fnv64 } from "./hash.ts"; export const a = Fnv64;`, "src/paylasilan/sim/_d.ts")).toBe(0);
  });
});
