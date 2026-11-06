import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@colyseus/sdk";
import { Depo, veritabaniAc } from "../src/sunucu/db/depo.ts";
import { adAnahtari, oduncDoldur } from "../src/sunucu/oyuncu/kurallar.ts";
import { type MacSonuGirdisi, macSonuKaydet } from "../src/sunucu/oyuncu/macSonu.ts";
import type { OzetHam } from "../src/sunucu/oyuncu/ozetSayaci.ts";
import { basarimOlayiIsle } from "../src/sunucu/oyuncu/basarimYaz.ts";
import { dovusGirisi, haritaBotTakimi, haritaGit, haritaGorunumu, sandikAc } from "../src/sunucu/oyuncu/harita.ts";
import { DURUM, dugumBul } from "../src/paylasilan/kurallar/harita.ts";
import { MacYonetimi } from "../src/sunucu/mac/MacYonetimi.ts";
import { dunyaHash } from "../src/paylasilan/sim/hash.ts";
import { takimKoduYaz } from "../src/paylasilan/veri/takimlar.ts";
import type { BitisKaydi } from "../src/paylasilan/kurallar/basarim.ts";
import type { DovusDugumu } from "../src/paylasilan/veri/harita.ts";
import { malzemeKodu } from "../src/sunucu/odalar/MacOdasi.ts";

// H2 (docs/design/harita/09): harita açılışı, yürüme (git, KEŞFET, kilit, yolYok), sandık, harita maçı sonu (yıldız
// maskesi + Altın defteri + cevher + komşu AÇIK; 11. maçta ödül 0; patron → sonraki bölge; teslim/kısa maç geçersiz),
// G-0 hash (Ustalık ve malzeme farkı → aynı maç hash'i), oda katılımı (4110 kilitli, 4111 uzak, misafir reddi).

process.env.VERI_DIZINI = ":memory:";
process.env.NODE_ENV = "test";

const yeni = () => new Depo(veritabaniAc(":memory:"));
let sira = 0;
function kur(d: Depo, ilkDevir = true) {
  const a = d.oyuncuOlustur({ ad: `Harita${++sira}`, adAnahtar: adAnahtari(`Harita${sira}`), sifreHash: "x", simdi: 1 })!;
  d.ilkCekirdek(a, "maden", 1);
  if (ilkDevir) basarimOlayiIsle(d, a, { olay: { antrenmanBitti: true } }, 1);
  return a;
}
const OGLE = Date.parse("2026-11-04T09:00:00Z");
const B = (tur: BitisKaydi["tur"], e: Partial<BitisKaydi> = {}): BitisKaydi => ({ tur, macSn: 30, yetenekNo: null, yetenekGecenSn: null, alanNo: null, dash: false, macKazandiran: false, ...e });
const H = (e: Partial<OzetHam> = {}): OzetHam => ({
  kazandi: false, sureSn: 50, bitisler: [], enAzStaminaOran: 0.6, bitisStaminaOrani: 0.6, kalanStaminaOrani: 0.6, alinanCarpisma: 5, ozelYetenekSayisi: 0,
  enCokGeriPuan: 0, kusakSn: 0, zitElementCarpisma: 0, carpismaSnleri: [], aniOlum: false, takimUltisi: false, ...e,
});
let mid = 0;
function haritaMaci(d: Depo, a: number, dugum: string, e: Partial<MacSonuGirdisi> = {}, kazanan = 0): MacSonuGirdisi {
  const t = d.takimlar(a)[0]!;
  return {
    macId: `h-${++mid}`, mod: "harita", oyuncular: [a, null], takimKodlari: [takimKoduYaz(oduncDoldur(t.yuvalar)), haritaBotTakimi(dugumBul(dugum) as DovusDugumu)],
    yuvalar: [t.yuvalar, []], sonuc: { kazanan, neden: "puan", puan: kazanan === 0 ? [3, 0] : [0, 3], tick: 3000 }, sureSn: 50,
    krizGordu: [false, false], kalanStaminaOrani: [0.6, 0], katalogOzeti: "k", baslangic: 1, bot: true,
    ozet: [H({ kazandi: kazanan === 0, bitisler: kazanan === 0 ? [B("ringOut")] : [] }), H({ kazandi: kazanan === 1 })], sahayaCikan: [[0], [0]],
    harita: { dugum }, ...e,
  };
}

describe("harita açılışı ve yürüme", () => {
  it("İlk Devir yoksa kapalı; varsa b1-01 AÇIK, karakter b1-01'e yürür (KEŞFET), kilitli düğüme yürümez", () => {
    const d = yeni();
    const k = kur(d, false);
    expect(haritaGit(d, k, "b1-01", OGLE)).toStrictEqual({ ok: false, hata: "kapali" });
    expect(haritaGorunumu(d, k, OGLE).acik).toBe(false);
    const a = kur(d);
    const g = haritaGorunumu(d, a, OGLE);
    expect(g.acik).toBe(true);
    expect(g.bolgeler.map((b) => b.acik)).toStrictEqual([true, false, false]);
    expect(g.bolgeler[1]!.kilitNedeni).toBe("BÖLGE 1 PATRONU");
    expect(g.bolgeler[0]!.dugumler[0]).toMatchObject({ id: "b1-01", durum: DURUM.acik });
    expect(haritaGit(d, a, "b1-02", OGLE)).toStrictEqual({ ok: false, hata: "kilitli" });
    const s = haritaGit(d, a, "b1-01", OGLE);
    expect(s).toMatchObject({ ok: true, konum: "b1-01", asama: DURUM.kesfet, yeniAsama: true, acilan: [] });
    expect(haritaGit(d, a, "b1-01", OGLE)).toMatchObject({ ok: true, yeniAsama: false });
    expect(haritaGit(d, a, "b9-01", OGLE)).toStrictEqual({ ok: false, hata: "yok" });
  });

  it("maden KEŞFET ile komşularını açar; sandık yalnız düğümdeyken, bir kez açılır (150 Altın + 6 Demir)", () => {
    const d = yeni();
    const a = kur(d);
    haritaGit(d, a, "b1-01", OGLE);
    d.dugumYaz(a, "b1-01", { durum: DURUM.temizle });
    d.dugumYaz(a, "b1-02", { durum: DURUM.acik });
    const m = haritaGit(d, a, "b1-02", OGLE);
    expect(m).toMatchObject({ ok: true, asama: DURUM.kesfet, acilan: ["b1-03", "b1-04"] });
    expect(sandikAc(d, a, "b1-04", OGLE)).toStrictEqual({ ok: false, hata: "uzak" });
    expect(sandikAc(d, a, "b1-02", OGLE)).toStrictEqual({ ok: false, hata: "tur" });
    expect(haritaGit(d, a, "b1-04", OGLE)).toMatchObject({ ok: true, acilan: ["b1-06"] }); // sandık KEŞFET ile açar
    const bakiye = d.bakiye(a);
    const s = sandikAc(d, a, "b1-04", OGLE);
    expect(s).toMatchObject({ ok: true, altin: 150, cevher: { kademe: 1, adet: 6 }, acilan: [] });
    expect(d.dugumSatiri(a, "b1-04")!.durum).toBe(DURUM.temizle);
    expect(d.bakiye(a)).toBe(bakiye + 150);
    expect(d.cevherler(a).cevher[0]).toBe(6);
    expect(sandikAc(d, a, "b1-04", OGLE)).toStrictEqual({ ok: false, hata: "acilmis" });
  });

  it("yolYok: açık ama bağlantısız düğüm (yalnız açık yollardan)", () => {
    const d = yeni();
    const a = kur(d);
    d.dugumYaz(a, "b1-07", { durum: DURUM.acik });
    expect(haritaGit(d, a, "b1-07", OGLE)).toStrictEqual({ ok: false, hata: "yolYok" });
  });

  it("dövüş girişi: kilitli, tür, uzak", () => {
    const d = yeni();
    const a = kur(d);
    expect(dovusGirisi(d, a, "b1-03")).toStrictEqual({ ok: false, hata: "kilitli" });
    expect(dovusGirisi(d, a, "b1-01")).toStrictEqual({ ok: false, hata: "uzak" });
    haritaGit(d, a, "b1-01", OGLE);
    expect(dovusGirisi(d, a, "b1-01").ok).toBe(true);
    expect(dovusGirisi(d, a, "b1-02")).toStrictEqual({ ok: false, hata: "tur" });
  });
});

describe("harita maçı sonu (tek işlem)", () => {
  it("galibiyet: yıldız maskesi + Altın defteri + cevher + TEMİZLE + komşu AÇIK; maç satırı mod/dugum/yildiz", () => {
    const d = yeni();
    const a = kur(d);
    haritaGit(d, a, "b1-01", OGLE);
    const bakiye = d.bakiye(a);
    const g = haritaMaci(d, a, "b1-01");
    const [o] = macSonuKaydet(d, g, OGLE);
    // b1-01 şartları kazan · temiz (≥ %50) · hızlı (≤ 60 sn) → 3 yıldız
    expect(o!.harita).toMatchObject({ maske: 7, yildiz: 7, yeniYildiz: 3, asama: DURUM.ustalas, altin: 150, acilan: ["b1-02"], sayilan: true });
    expect(o!.harita!.cevher).toStrictEqual([{ kademe: 1, adet: 6 }]);
    expect(o!.harita!.kulce).toStrictEqual([{ kademe: 1, adet: 1 }]);
    expect(o!.mod).toBe("harita");
    expect(d.bakiye(a)).toBe(bakiye + 150 + (o!.basarimAltini ?? 0));
    expect(d.cevherler(a)).toMatchObject({ cevher: [6, 0, 0, 0, 0, 0, 0, 0], kulce: [1, 0, 0, 0, 0, 0, 0, 0] });
    expect(d.dugumSatiri(a, "b1-02")!.durum).toBe(DURUM.acik);
    expect(d.mac(g.macId)).toMatchObject({ mod: "harita", dugum_id: "b1-01", yildiz: 7, bot: 1 });
    // Çekirdek XP verildi (sayılan)
    expect(o!.cekirdekler[0]!.kazanc).toBeGreaterThan(0);
    // aynı maç ikinci kez yazılmaz
    expect(macSonuKaydet(d, g, OGLE)).toStrictEqual([null, null]);
  });

  it("tekrar galibiyet 50 Altın + 2 cevher; mağlubiyet 30; 11. maçta ödül ve XP 0", () => {
    const d = yeni();
    const a = kur(d);
    haritaGit(d, a, "b1-01", OGLE);
    macSonuKaydet(d, haritaMaci(d, a, "b1-01"), OGLE);
    const [t] = macSonuKaydet(d, haritaMaci(d, a, "b1-01"), OGLE);
    expect(t!.harita).toMatchObject({ altin: 50, cevher: [{ kademe: 1, adet: 2 }], yeniYildiz: 0, sayilanMac: 2 });
    const [m] = macSonuKaydet(d, haritaMaci(d, a, "b1-01", {}, 1), OGLE);
    expect(m!.harita).toMatchObject({ altin: 30, sayilan: true });
    for (let i = 0; i < 7; i++) macSonuKaydet(d, haritaMaci(d, a, "b1-01"), OGLE);
    const [on1] = macSonuKaydet(d, haritaMaci(d, a, "b1-01"), OGLE);
    expect(on1!.harita).toMatchObject({ sayilan: false, altin: 0, cevher: [], sayilanMac: 11 });
    expect(on1!.cekirdekler.every((c) => c.kazanc === 0)).toBe(true);
    expect(on1!.sayilmadi).toBe("haritaTavani");
  });

  it("teslim / 20 sn altı: geçersiz (yıldız, ödül, aşama yok, sayaç işlemez)", () => {
    const d = yeni();
    const a = kur(d);
    haritaGit(d, a, "b1-01", OGLE);
    const [o] = macSonuKaydet(d, haritaMaci(d, a, "b1-01", { sonuc: { kazanan: 1, neden: "teslim", puan: [0, 3], tick: 100 } }, 1), OGLE);
    expect(o!.harita).toMatchObject({ gecersiz: "teslim", altin: 0, asama: DURUM.kesfet });
    const [k] = macSonuKaydet(d, haritaMaci(d, a, "b1-01", { sureSn: 15 }), OGLE);
    expect(k!.harita).toMatchObject({ gecersiz: "kisaMac", altin: 0, yildiz: 0 });
    expect(d.gunlukHaritaMaci(a, 20396)).toBe(0);
  });

  it("patron ilk galibiyeti 500 Altın + 3 Kaya külçesi, b1-12 ve sonraki bölgenin girişi (b2-01) AÇIK", () => {
    const d = yeni();
    const a = kur(d);
    for (const id of ["b1-01", "b1-10"]) d.dugumYaz(a, id, { durum: DURUM.temizle });
    d.dugumYaz(a, "b1-11", { durum: DURUM.acik });
    d.haritaKonumYaz(a, "b1-11");
    const [o] = macSonuKaydet(d, haritaMaci(d, a, "b1-11", { ozet: [H({ kazandi: true, sureSn: 70, bitisler: [] }), H()], sureSn: 70 }), OGLE);
    expect(o!.harita).toMatchObject({ maske: 1, altin: 600, kulce: [{ kademe: 2, adet: 3 }], acilan: ["b1-12", "b2-01"], bolgeAcildi: "ayaz-gecidi", asama: DURUM.temizle });
    expect(haritaGorunumu(d, a, OGLE).bolgeler[1]!.acik).toBe(true);
  });

  it("bölge rozeti: bütün düğümler TEMİZLE olunca BRONZ (300 Altın, bir kez)", () => {
    const d = yeni();
    const a = kur(d);
    for (let k = 1; k <= 12; k++) if (k !== 1) d.dugumYaz(a, `b1-${String(k).padStart(2, "0")}`, { durum: DURUM.temizle });
    d.dugumYaz(a, "b1-01", { durum: DURUM.kesfet });
    d.haritaKonumYaz(a, "b1-01");
    const [o] = macSonuKaydet(d, haritaMaci(d, a, "b1-01", { ozet: [H({ kazandi: true, sureSn: 70, kalanStaminaOrani: 0.1 }), H()], sureSn: 70, kalanStaminaOrani: [0.1, 0] }), OGLE);
    expect(o!.harita).toMatchObject({ rozet: 1, rozetAltini: 300 });
    expect(d.bolgeRozetleri(a)).toStrictEqual({ "ocak-yamaci": 1 });
    expect(d.defterRef(`rozet:${a}:ocak-yamaci:1`)?.miktar).toBe(300);
  });
});

describe("G-0: Ustalık ve malzeme maç hash'ine girmez", () => {
  it("Ustalık 0 ile 100 ve farklı malzeme: aynı takım kodu, aynı tohum → aynı maç hash'i", () => {
    const d = yeni();
    const a = kur(d);
    const b = kur(d);
    d.ustalikYaz(b, "madencilik", 1779100);
    d.ustalikYaz(b, "isleme", 1779100);
    d.db.prepare("UPDATE parca SET malzeme = 4 WHERE oyuncu_id = ?").run(b);
    const kod = (id: number) => takimKoduYaz(oduncDoldur(d.takimlar(id)[0]!.yuvalar));
    expect(kod(a)).toBe(kod(b));
    expect(malzemeKodu(d.takimlar(b)[0]!.yuvalar)).toBe("044400000000");
    const bot = haritaBotTakimi(dugumBul("b1-07") as DovusDugumu);
    const kos = (k: string) => {
      const y = new MacYonetimi({ takimlar: [k, bot], tohum: 1234, bot: [true, true], botKipleri: [null, "dolas"] });
      for (let i = 0; i < 600; i++) y.adimla([null, null]);
      return dunyaHash(y.dunya);
    };
    expect(kos(kod(a))).toBe(kos(kod(b)));
  });
});

// ---- HTTP + oda ----
const PORT = 26300 + Math.floor(Math.random() * 100);
const TABAN = `http://127.0.0.1:${PORT}`;
type V = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
async function istek(yontem: string, yol: string, cerez: string | null, govde?: unknown): Promise<{ durum: number; veri: V; cerez: string | null }> {
  const h: Record<string, string> = { "content-type": "application/json", origin: "http://localhost:5173" };
  if (cerez) h["cookie"] = cerez;
  const r = await fetch(`${TABAN}${yol}`, { method: yontem, headers: h, body: govde === undefined ? undefined : JSON.stringify(govde) });
  const sc = r.headers.get("set-cookie");
  return { durum: r.status, veri: (await r.json()) as V, cerez: sc ? sc.split(";")[0]! : null };
}

describe("H2 HTTP uçları ve harita odası", () => {
  let durdur: () => Promise<void>;
  beforeAll(async () => {
    const { server } = await import("../src/sunucu/index.ts");
    await server.listen(PORT);
    durdur = async () => { await server.gracefullyShutdown(false); };
  }, 30000);
  afterAll(async () => { await durdur?.(); });

  let A = "";
  it("misafir 401; İlk Devir öncesi kapalı; sonra açık ve git/sandık/profil uçları", async () => {
    expect((await istek("GET", "/api/harita", null)).durum).toBe(401);
    const k = await istek("POST", "/api/kayit", null, { ad: "Harita Ayla", sifre: "uzun-sifre-1", sifreTekrar: "uzun-sifre-1" });
    A = k.cerez!;
    await istek("POST", "/api/profil", A, { arma: "kaya", renk: "#2fb8e8" });
    await istek("POST", "/api/ilk-cekirdek", A, { set: "maden" });
    expect((await istek("GET", "/api/harita", A)).veri.acik).toBe(false);
    expect((await istek("POST", "/api/harita/git", A, { dugum: "b1-01" })).durum).toBe(403);
    await istek("POST", "/api/egitim-bitti", A, {});
    const h = (await istek("GET", "/api/harita", A)).veri;
    expect(h).toMatchObject({ acik: true, konum: null, sayac: { haritaMac: { sayilan: 0, tavan: 10 }, vurus: { tam: 40, tavan: 60 } } });
    expect((await istek("POST", "/api/harita/git", A, { dugum: "b1-02" })).durum).toBe(409);
    expect((await istek("POST", "/api/harita/git", A, { dugum: "x" })).durum).toBe(400);
    expect((await istek("POST", "/api/harita/git", A, { dugum: "b1-01" })).veri).toMatchObject({ konum: "b1-01", asama: 2, yeniAsama: true });
    expect((await istek("POST", "/api/harita/sandik", A, { dugum: "b1-04" })).durum).toBe(409);
    expect((await istek("PATCH", "/api/profil", A, { karakter: 2 })).durum).toBe(200);
    expect((await istek("PATCH", "/api/profil", A, { karakter: 4 })).durum).toBe(400);
    expect((await istek("PATCH", "/api/profil", A, { cerceve: "cerceve-don" })).durum).toBe(403);
    expect((await istek("GET", "/api/ben", A)).veri).toMatchObject({ harita: { acik: true, konum: "b1-01" }, karakter: 2, protokol: 7 });
  });

  it("oda: harita düğümüne katılım → düğüm botu hemen, seçim fazı; kilitli 4110, uzak 4111, misafir reddi, protokol 6 reddi", async () => {
    const { KATALOG_OZETI } = await import("../src/ag/katalog.ts");
    const { PROTOKOL_SURUMU } = await import("../src/ag/protokol.ts");
    const bilet = async () => (await istek("POST", "/api/bilet", A, {})).veri.bilet as string;
    const sdk = new Client(TABAN);
    const hata = async (o: V) => { try { const r = await sdk.create("mac", o); await r.leave(true); return 0; } catch (e) { return (e as { code?: number }).code ?? -1; } };
    expect(await hata({ v: PROTOKOL_SURUMU, mod: "harita", katalog: KATALOG_OZETI, bilet: await bilet(), dugum: "b1-03" })).toBe(4110);
    expect(await hata({ v: PROTOKOL_SURUMU, mod: "harita", katalog: KATALOG_OZETI, dugum: "b1-01" })).toBe(4103);
    expect(await hata({ v: 6, mod: "harita", katalog: KATALOG_OZETI, bilet: await bilet(), dugum: "b1-01" })).toBe(4101);
    expect(await hata({ v: PROTOKOL_SURUMU, mod: "harita", katalog: KATALOG_OZETI, bilet: await bilet() })).toBe(4105);
    const { depo } = await import("../src/sunucu/db/depo.ts");
    const id = depo().oyuncuAdla("harita ayla")!.id;
    depo().dugumYaz(id, "b1-03", { durum: DURUM.acik });
    expect(await hata({ v: PROTOKOL_SURUMU, mod: "harita", katalog: KATALOG_OZETI, bilet: await bilet(), dugum: "b1-03" })).toBe(4111);
    const oda = await sdk.create("mac", { v: PROTOKOL_SURUMU, mod: "harita", katalog: KATALOG_OZETI, bilet: await bilet(), dugum: "b1-01" });
    await new Promise((r) => setTimeout(r, 400));
    const s = oda.state as unknown as { faz: number; mod: string; dugum: string; oyuncular: { length: number; at(i: number): { bot: boolean; ad: string; takimId: string } } };
    expect(s.mod).toBe("harita");
    expect(s.dugum).toBe("b1-01");
    expect(s.faz).toBe(1);
    expect(s.oyuncular.length).toBe(2);
    expect(s.oyuncular.at(1)).toMatchObject({ bot: true, ad: "Düşman", takimId: haritaBotTakimi(dugumBul("b1-01") as DovusDugumu) });
    oda.send("hazir", { v: PROTOKOL_SURUMU });
    await new Promise((r) => setTimeout(r, 600));
    expect(s.faz).toBe(2);
    await oda.leave(true);
  }, 30000);

  it("maden uçları: başla 201 → hemen kaz 429 erken → 800 ms sonra 200; bitir 200; uzak 409", async () => {
    const { depo } = await import("../src/sunucu/db/depo.ts");
    const id = depo().oyuncuAdla("harita ayla")!.id;
    expect((await istek("POST", "/api/maden/basla", A, { dugum: "b1-02" })).durum).toBe(409);
    depo().dugumYaz(id, "b1-01", { durum: DURUM.temizle });
    depo().dugumYaz(id, "b1-02", { durum: DURUM.acik });
    expect((await istek("POST", "/api/harita/git", A, { dugum: "b1-02" })).veri.acilan).toStrictEqual(["b1-04"]);
    const b = await istek("POST", "/api/maden/basla", A, { dugum: "b1-02" });
    expect(b.durum).toBe(201);
    expect(b.veri).toMatchObject({ kademe: 1, kalan: 6 });
    expect((await istek("POST", "/api/maden/kaz", A, { seans: b.veri.seans, sira: 0, isabetMs: null })).durum).toBe(429);
    await new Promise((r) => setTimeout(r, 750));
    const k = await istek("POST", "/api/maden/kaz", A, { seans: b.veri.seans, sira: 0, isabetMs: 700, gecikmeMs: 20 });
    expect(k.durum).toBe(200);
    expect(k.veri).toMatchObject({ sira: 1, kalan: 5 });
    expect(Array.isArray(k.veri.yeniBasarimlar)).toBe(true);
    expect((await istek("POST", "/api/maden/bitir", A, { seans: b.veri.seans })).durum).toBe(200);
    expect((await istek("POST", "/api/maden/kaz", A, { seans: "x", sira: 0, isabetMs: null })).durum).toBe(400);
    expect((await istek("GET", "/api/ben", A)).veri.ocakAcik).toBe(true); // ilk vuruş tecrübe verir
  });
});
