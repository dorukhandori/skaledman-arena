import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@colyseus/sdk";
import { Depo, veritabaniAc } from "../src/sunucu/db/depo.ts";
import { GOCLER } from "../src/sunucu/db/sema.ts";
import { adAnahtari, oduncDoldur } from "../src/sunucu/oyuncu/kurallar.ts";
import { type MacSonuGirdisi, macSonuKaydet } from "../src/sunucu/oyuncu/macSonu.ts";
import type { OzetHam } from "../src/sunucu/oyuncu/ozetSayaci.ts";
import { basarimOlayiIsle, takimTavani, tamamlananlar } from "../src/sunucu/oyuncu/basarimYaz.ts";
import { bugununParcasi, satinAl, yapayYenile } from "../src/sunucu/api/market.ts";
import { takimKoduYaz } from "../src/paylasilan/veri/takimlar.ts";
import type { BitisKaydi } from "../src/paylasilan/kurallar/basarim.ts";

// D7 sunucu: Altın defteri (idempotent maç ödülü, günlük sayaç 04:00, azalan getiri, aynı çift günde 3, oda/bot/teslim),
// başarım sayaçları (maç sonu tek işlem), satın alma (tek işlem: çift harcama, yarış, yetersiz, kilitli), Yapay yenileme,
// HTTP uçları (Market, Başarımlar, İlk Devir Altını, gizli sızmaz), hızlı maç bot isteği zaman kapısı.

process.env.VERI_DIZINI = ":memory:";
process.env.NODE_ENV = "test";

const yeni = () => new Depo(veritabaniAc(":memory:"));
const oyuncu = (d: Depo, ad: string) => d.oyuncuOlustur({ ad, adAnahtar: adAnahtari(ad), sifreHash: "scrypt$x", simdi: 1 })!;
const B = (tur: BitisKaydi["tur"], e: Partial<BitisKaydi> = {}): BitisKaydi => ({ tur, macSn: 30, yetenekNo: null, yetenekGecenSn: null, alanNo: null, dash: false, macKazandiran: false, ...e });
const H = (e: Partial<OzetHam> = {}): OzetHam => ({
  kazandi: false, sureSn: 70, bitisler: [], enAzStaminaOran: 0.6, bitisStaminaOrani: 0.6, kalanStaminaOrani: 0.4, alinanCarpisma: 5, ozelYetenekSayisi: 1,
  enCokGeriPuan: 0, kusakSn: 5, zitElementCarpisma: 0, carpismaSnleri: [], aniOlum: false, takimUltisi: false, ...e,
});
/** 2026-11-04 12:00 TR */
const OGLE = Date.parse("2026-11-04T09:00:00Z");

function kur(d: Depo, setA = "maden", setB = "goktasi") {
  const a = oyuncu(d, `A${Math.random()}`.slice(0, 12));
  const b = oyuncu(d, `B${Math.random()}`.slice(0, 12));
  d.ilkCekirdek(a, setA, 1);
  d.ilkCekirdek(b, setB, 1);
  return { a, b };
}

let say = 0;
function mac(d: Depo, a: number, b: number | null, e: Partial<MacSonuGirdisi> = {}, kazanan = 0): MacSonuGirdisi {
  const ta = d.takimlar(a)[0]!;
  const tb = b !== null ? d.takimlar(b)[0]! : null;
  return {
    macId: `m-${++say}`, mod: "hizli", oyuncular: [a, b], takimKodlari: [takimKoduYaz(oduncDoldur(ta.yuvalar)), tb ? takimKoduYaz(oduncDoldur(tb.yuvalar)) : "bot"],
    yuvalar: [ta.yuvalar, tb?.yuvalar ?? []], sonuc: { kazanan, neden: "puan", puan: kazanan === 0 ? [3, 1] : [1, 3], tick: 4000 }, sureSn: 70,
    krizGordu: [false, false], kalanStaminaOrani: [0.4, 0.2], katalogOzeti: "k", baslangic: 1,
    ozet: [H({ kazandi: kazanan === 0, bitisler: kazanan === 0 ? [B("ringOut"), B("durma")] : [] }), H({ kazandi: kazanan === 1 })],
    sahayaCikan: [[0], [0]], turlar: [{ tur: "ringOut", kazanan, sn: 20 }], yetenekSayisi: [[1, 0, 0], [0, 0, 0]], ...e,
  };
}

describe("Altın defteri ve maç sonu (tek işlem, idempotent)", () => {
  it("göç 3: user_version, yeni tablo/sütunlar", () => {
    const d = yeni();
    expect(d.db.pragma("user_version", { simple: true })).toBe(GOCLER.length);
    expect(GOCLER.length).toBe(3);
    const sutun = (t: string) => (d.db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((x) => x.name);
    expect(sutun("altin_defteri")).toContain("zaman");
    expect(sutun("basarim")).toContain("tamam_tarihi");
    expect(sutun("mac")).toEqual(expect.arrayContaining(["gun", "bitis", "bot", "bitis_turleri", "yetenek_a", "yetenek_b", "altin_a", "altin_b"]));
    expect(sutun("basarim_kume")).toStrictEqual(["oyuncu_id", "basarim_id", "anahtar"]);
  });
  it("maç ödülü yalnız maç sonunda, ref = mac:<mac_id>:<oyuncu>; aynı maç ikinci kez hiçbir şey yazmaz", () => {
    const d = yeni();
    const { a, b } = kur(d);
    const g = mac(d, a, b);
    const [oa, ob] = macSonuKaydet(d, g, OGLE);
    // A: galibiyet 100 + günün ilk galibiyeti 150 + stil 2 tür (+10) = 260; B: mağlubiyet 60
    expect(oa!.altin).toMatchObject({ toplam: 260, sifirNedeni: null });
    expect(oa!.altin.kalemler.map((k) => k.neden)).toStrictEqual(["galibiyet", "ilkGalibiyet", "stilBitis"]);
    expect(ob!.altin.toplam).toBe(60);
    expect(d.defterRef(`mac:${g.macId}:${a}`)).toMatchObject({ miktar: 260, neden: "mac", zaman: OGLE });
    const bakiyeA = d.bakiye(a);
    expect(bakiyeA).toBe(260 + 100); // + İlk Galibiyet başarım ödülü
    expect(oa!.basarimAltini).toBe(100);
    expect(oa!.basarimlar.find((x) => x.id === "ilk-galibiyet")).toMatchObject({ tamamlandi: true, odulAltin: 100 });
    expect(oa!.basarimlar.find((x) => x.id === "dusurucu")).toMatchObject({ onceki: 0, ilerleme: 1, sayi: 10 });
    expect(macSonuKaydet(d, g, OGLE)).toStrictEqual([null, null]);
    expect(d.bakiye(a)).toBe(bakiyeA);
    expect(d.basarimKayitlari(a)["dusurucu"]!.ilerleme).toBe(1);
    // telemetri (B-40)
    expect(d.mac(g.macId)).toMatchObject({ gun: expect.any(Number), bot: 0, altin_a: 260, altin_b: 60, bitis_turleri: JSON.stringify(g.turlar), yetenek_a: "[1,0,0]" });
  });
  it("günün ilk galibiyeti günde bir; 04:00'te sıfırlanır (enjekte saat)", () => {
    const d = yeni();
    const { a, b } = kur(d);
    expect(macSonuKaydet(d, mac(d, a, b), OGLE)[0]!.altin.kalemler.some((k) => k.neden === "ilkGalibiyet")).toBe(true);
    expect(macSonuKaydet(d, mac(d, a, b), OGLE + 3600_000)[0]!.altin.kalemler.some((k) => k.neden === "ilkGalibiyet")).toBe(false);
    // ertesi gün 03:59 TR hâlâ aynı gün; 04:00 TR yeni gün
    const ertesi0359 = Date.parse("2026-11-05T00:59:00Z");
    const ertesi0400 = Date.parse("2026-11-05T01:00:00Z");
    const c = kur(d);
    macSonuKaydet(d, mac(d, c.a, c.b), OGLE);
    expect(macSonuKaydet(d, mac(d, c.a, c.b), ertesi0359)[0]!.altin.kalemler.some((k) => k.neden === "ilkGalibiyet")).toBe(false);
    expect(macSonuKaydet(d, mac(d, c.a, c.b), ertesi0400)[0]!.altin.kalemler.some((k) => k.neden === "ilkGalibiyet")).toBe(true);
  });
  it("azalan getiri: günün 16. maçı yarı, 31. maçı ×0,2 (bot maçlarıyla; çift sınırı uygulanmaz)", () => {
    const d = yeni();
    const { a } = kur(d);
    const sonuclar: number[] = [];
    for (let k = 1; k <= 31; k++) sonuclar.push(macSonuKaydet(d, mac(d, a, null, { bot: true }, 1), OGLE + k * 1000)[0]!.altin.toplam);
    // bot mağlubiyeti: 60 × 0,5 = 30; 16-30: 30 × 0,5 = 15; 31: 30 × 0,2 = 6
    expect(sonuclar.slice(0, 15).every((x) => x === 30)).toBe(true);
    expect(sonuclar.slice(15, 30).every((x) => x === 15)).toBe(true);
    expect(sonuclar[30]).toBe(6);
    expect(macSonuKaydet(d, mac(d, a, null, { bot: true }, 1), Date.parse("2026-11-05T02:00:00Z"))[0]!.altin.toplam).toBe(30);
  });
  it("aynı iki hesap günde 3 maçtan sonra Altın ve başarım sayılmaz", () => {
    const d = yeni();
    const { a, b } = kur(d);
    for (let k = 0; k < 3; k++) expect(macSonuKaydet(d, mac(d, a, b), OGLE + k)[1]!.altin.toplam).toBeGreaterThan(0);
    const [oa, ob] = macSonuKaydet(d, mac(d, a, b), OGLE + 10);
    expect([oa!.altin.toplam, ob!.altin.toplam]).toStrictEqual([0, 0]);
    expect(oa!.altin.sifirNedeni).toBe("ciftTavani");
    expect(oa!.sayilmadi).toBe("ciftTavani");
    expect(d.basarimKayitlari(a)["dusurucu"]!.ilerleme).toBe(3); // 4. maçın Ring Out'u sayılmadı
    // başka rakiple sayılır
    const c = oyuncu(d, "Cansu");
    d.ilkCekirdek(c, "yapay", 1);
    expect(macSonuKaydet(d, mac(d, a, c), OGLE + 20)[0]!.altin.toplam).toBeGreaterThan(0);
  });
  it("oda maçı Altın ×0,25, başarımda yalnız Sosyal; bot maçı yarı, yalnız Yol", () => {
    const d = yeni();
    const { a, b } = kur(d);
    const [oa] = macSonuKaydet(d, mac(d, a, b, { mod: "oda" }), OGLE);
    expect(oa!.altin.toplam).toBe(65); // 260 × 0,25
    expect(oa!.basarimlar.map((x) => x.id).sort()).toStrictEqual(["davetli", "ev-sahibi"]);
    const [ob] = macSonuKaydet(d, mac(d, b, null, { bot: true }), OGLE);
    expect(ob!.mod).toBe("bot");
    expect(ob!.altin.toplam).toBe(130);
    expect(ob!.basarimlar.map((x) => x.id)).not.toContain("dusurucu");
    expect(ob!.basarimlar.map((x) => x.id)).toContain("ilk-galibiyet");
  });
  it("teslim: teslim eden 0 Altın; kazanan yarım Altın, stil yok, başarım sayacı işlemez", () => {
    const d = yeni();
    const { a, b } = kur(d);
    const [oa, ob] = macSonuKaydet(d, mac(d, a, b, { sonuc: { kazanan: 0, neden: "teslim", puan: [3, 0], tick: 1 } }), OGLE);
    expect(ob!.altin).toMatchObject({ toplam: 0, sifirNedeni: "terk" });
    expect(oa!.altin.toplam).toBe(125); // (100 + 150) × 0,5
    expect(oa!.altin.kalemler.map((k) => k.neden)).toStrictEqual(["galibiyet", "ilkGalibiyet"]);
    expect(oa!.basarimlar).toStrictEqual([]);
    expect(oa!.sayilmadi).toBe("teslim");
  });
  it("maç < 20 sn: Altın 0 (başarım yine sayılır)", () => {
    const d = yeni();
    const { a, b } = kur(d);
    const [oa] = macSonuKaydet(d, mac(d, a, b, { sureSn: 15 }), OGLE);
    expect(oa!.altin).toMatchObject({ toplam: 0, sifirNedeni: "kisaMac" });
    expect(d.defterRef(`mac:m-${say}:${a}`)).toBeNull();
  });
  it("durum başarımı: Çekirdek Lv.3 → Parlayan tamamlanır, Parlak Disk Market'te açılır; Yapay ömür 0 → Aşınmış", () => {
    const d = yeni();
    const { a, b } = kur(d, "goktasi", "yapay");
    d.db.prepare("UPDATE cekirdek SET tecrube = 690 WHERE oyuncu_id = ?").run(a);
    d.db.prepare("UPDATE cekirdek SET omur = 1 WHERE oyuncu_id = ?").run(b);
    const [oa, ob] = macSonuKaydet(d, mac(d, a, b), OGLE);
    expect(oa!.basarimlar.find((x) => x.id === "parlayan")).toMatchObject({ tamamlandi: true, acilanParcalar: [{ id: "parlak-disk", ad: "Parlak Disk" }] });
    expect(tamamlananlar(d, a).has("parlayan")).toBe(true);
    expect(ob!.basarimlar.find((x) => x.id === "asinmis")).toMatchObject({ tamamlandi: true, acilanOzellik: ["yenileme-indirimi-50"] });
    expect(d.basarimSatirlari(a).find((x) => x.basarim_id === "parlayan")!.tamam_tarihi).toBe(OGLE);
  });
  it("başarım ödülü bir kez (ref basarim:<id>:<oyuncu>); Üçlü 4. takım yuvasını açar", () => {
    const d = yeni();
    const { a } = kur(d);
    const r1 = basarimOlayiIsle(d, a, { olay: { antrenmanBitti: true } }, OGLE);
    const r2 = basarimOlayiIsle(d, a, { olay: { antrenmanBitti: true } }, OGLE);
    expect([r1.odul, r2.odul]).toStrictEqual([100, 0]);
    expect(d.bakiye(a)).toBe(100);
    expect(takimTavani(tamamlananlar(d, a))).toBe(3);
    d.basarimYaz(a, "uclu", 3, true, OGLE);
    expect(takimTavani(tamamlananlar(d, a))).toBe(4);
  });
});

describe("satın alma ve Yapay yenileme (tek SQLite işlemi)", () => {
  it("yetersiz bakiye / kilitli / Market kapalı / başarılı / çift satın alma", () => {
    const d = yeni();
    const { a } = kur(d);
    expect(satinAl(d, a, "duz-uc", OGLE)).toMatchObject({ ok: false, hata: "marketKapali" });
    basarimOlayiIsle(d, a, { olay: { antrenmanBitti: true } }, OGLE); // +100
    const gp = bugununParcasi(OGLE);
    const ucuz = ["duz-uc", "dengeli-uc", "ok-govde"].find((x) => x !== gp)!;
    expect(satinAl(d, a, "top-uc", OGLE)).toMatchObject({ ok: false, hata: "yetersiz", eksik: gp === "top-uc" ? 250 : 400 });
    expect(satinAl(d, a, "ayaz-govde", OGLE)).toMatchObject({ ok: false, hata: "kilitli" });
    expect(satinAl(d, a, "kor-kalbi", OGLE)).toMatchObject({ ok: false, hata: "kilitli" });
    expect(satinAl(d, a, "yok-boyle", OGLE)).toMatchObject({ ok: false, hata: "yok" });
    const r = satinAl(d, a, ucuz, OGLE);
    expect(r).toMatchObject({ ok: true, fiyat: 100, bakiye: 0 });
    expect(d.parcalar(a).some((p) => p.tanim_id === ucuz)).toBe(true);
    expect(d.defterRef(`satin:${a}:${ucuz}`)).toMatchObject({ miktar: -100, neden: "satin" });
    d.altinYaz(a, 1000, "test", "test:1", OGLE);
    expect(satinAl(d, a, ucuz, OGLE)).toMatchObject({ ok: false, hata: "sahip" });
    expect(d.bakiye(a)).toBe(1000);
    // Çekirdek satın alımı cekirdek satırı (Lv.1, Yapay ömür 30)
    const c = satinAl(d, a, "kasirga-yapay", OGLE);
    expect(c).toMatchObject({ ok: true, tur: "cekirdek" });
    expect(d.cekirdekler(a).find((x) => x.tanim_id === "kasirga-yapay")).toMatchObject({ seviye: 1, omur: 30 });
  });
  it("başarımla açılan kilitli parça satın alınabilir (Parlayan → Parlak Disk)", () => {
    const d = yeni();
    const { a } = kur(d);
    basarimOlayiIsle(d, a, { olay: { antrenmanBitti: true } }, OGLE);
    d.altinYaz(a, 5000, "test", "test:p", OGLE);
    expect(satinAl(d, a, "parlak-disk", OGLE)).toMatchObject({ ok: false, hata: "kilitli" });
    basarimOlayiIsle(d, a, { durum: { enYuksekSeviye: 3 } }, OGLE);
    expect(satinAl(d, a, "parlak-disk", OGLE)).toMatchObject({ ok: true, fiyat: 2000, bakiye: 3100 + 300 });
  });
  it("yarış: iki ayrı bağlantı aynı bakiyeyle iki parça ister → yalnız biri geçer; aynı parça iki kez → tek defter satırı", () => {
    const dizin = mkdtempSync(join(tmpdir(), "devran-d7-"));
    const yol = join(dizin, "yaris.sqlite");
    const d1 = new Depo(veritabaniAc(yol));
    const d2 = new Depo(veritabaniAc(yol));
    const { a } = kur(d1);
    basarimOlayiIsle(d1, a, { olay: { antrenmanBitti: true } }, OGLE);
    d1.altinYaz(a, 400, "test", "test:y", OGLE); // 500: Top Uç (500) ya da Halka Gövde (500) — biri
    const gp = bugununParcasi(OGLE);
    const iki = ["top-uc", "halka-govde", "girdap-maden"].filter((x) => x !== gp).slice(0, 2);
    const r1 = satinAl(d1, a, iki[0]!, OGLE);
    const r2 = satinAl(d2, a, iki[1]!, OGLE);
    expect([r1.ok, r2.ok].filter(Boolean)).toHaveLength(1);
    expect(d2.bakiye(a)).toBeGreaterThanOrEqual(0);
    d1.altinYaz(a, 5000, "test", "test:y2", OGLE);
    const s1 = satinAl(d1, a, iki[1]!, OGLE);
    const s2 = satinAl(d2, a, iki[1]!, OGLE);
    expect([s1.ok, s2.ok].filter(Boolean).length).toBeLessThanOrEqual(1);
    expect((d1.db.prepare("SELECT COUNT(*) n FROM altin_defteri WHERE ref = ?").get(`satin:${a}:${iki[1]}`) as { n: number }).n).toBe(1);
    expect(d1.parcalar(a).filter((p) => p.tanim_id === iki[1]).length + d1.cekirdekler(a).filter((p) => p.tanim_id === iki[1]).length).toBe(1);
    d1.db.close();
    d2.db.close();
  });
  it("Yapay yenileme: %40 (40 Altın), Aşınmış ile 20; ömür 30; Dökümhane Müşterisi +1; ömür tamken red", () => {
    const d = yeni();
    const { a } = kur(d, "yapay");
    basarimOlayiIsle(d, a, { olay: { antrenmanBitti: true } }, OGLE);
    const cid = d.cekirdekler(a)[0]!.id;
    expect(yapayYenile(d, a, cid, OGLE)).toMatchObject({ ok: false, hata: "tam" });
    d.db.prepare("UPDATE cekirdek SET omur = 0 WHERE id = ?").run(cid);
    expect(yapayYenile(d, a, cid, OGLE)).toMatchObject({ ok: true, omur: 30, fiyat: 40, bakiye: 60 });
    expect(d.basarimKayitlari(a)["dokumhane-musterisi"]!.ilerleme).toBe(1);
    d.db.prepare("UPDATE cekirdek SET omur = 5, mac_sayisi = mac_sayisi + 1 WHERE id = ?").run(cid);
    d.basarimYaz(a, "asinmis", 1, true, OGLE);
    expect(yapayYenile(d, a, cid, OGLE)).toMatchObject({ ok: true, fiyat: 20 });
    // aynı ömür döneminde ikinci istek (mac_sayisi değişmedi) reddedilir
    d.db.prepare("UPDATE cekirdek SET omur = 4 WHERE id = ?").run(cid);
    expect(yapayYenile(d, a, cid, OGLE)).toMatchObject({ ok: false, hata: "tam" });
    const k = kur(d, "goktasi");
    expect(yapayYenile(d, k.a, d.cekirdekler(k.a)[0]!.id, OGLE)).toMatchObject({ ok: false, hata: "yapayDegil" });
  });
});

// ---- HTTP ----
const PORT = 26100 + Math.floor(Math.random() * 100);
const TABAN = `http://127.0.0.1:${PORT}`;
const KOKEN = "http://localhost:5173";
let durdur: () => Promise<void>;
type V = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
async function istek(yontem: string, yol: string, cerez: string | null, govde?: unknown): Promise<{ durum: number; veri: V; cerez: string | null }> {
  const h: Record<string, string> = { "content-type": "application/json", origin: KOKEN };
  if (cerez) h["cookie"] = cerez;
  const r = await fetch(`${TABAN}${yol}`, { method: yontem, headers: h, body: govde === undefined ? undefined : JSON.stringify(govde) });
  const sc = r.headers.get("set-cookie");
  return { durum: r.status, veri: (await r.json()) as V, cerez: sc ? sc.split(";")[0]! : null };
}
async function hesap(ad: string, set: string): Promise<string> {
  const r = await istek("POST", "/api/kayit", null, { ad, sifre: "uzun-sifre-1", sifreTekrar: "uzun-sifre-1" });
  expect(r.durum).toBe(201);
  const c = r.cerez!;
  expect((await istek("POST", "/api/profil", c, { arma: "kaya", renk: "#2fb8e8" })).durum).toBe(200);
  expect((await istek("POST", "/api/ilk-cekirdek", c, { set })).durum).toBe(201);
  return c;
}

describe("D7 HTTP uçları", () => {
  beforeAll(async () => {
    const { server } = await import("../src/sunucu/index.ts");
    await server.listen(PORT);
    durdur = async () => { await server.gracefullyShutdown(false); };
  }, 30000);
  afterAll(async () => { await durdur?.(); });

  let A = "";
  it("Market kilitli → İlk Devir +100 Altın (bir kez) → Market açık; bakiye /api/ben'de", async () => {
    A = await hesap("Market Mert", "maden");
    expect((await istek("GET", "/api/market", A)).veri.acik).toBe(false);
    expect((await istek("POST", "/api/market/satin-al", A, { parca: "duz-uc" })).durum).toBe(403);
    const e1 = await istek("POST", "/api/egitim-bitti", A, {});
    expect(e1.veri).toMatchObject({ yeni: true, altin: 100, bakiye: 100 });
    expect((await istek("POST", "/api/egitim-bitti", A, {})).veri).toMatchObject({ yeni: false, altin: 0, bakiye: 100 });
    expect((await istek("GET", "/api/ben", A)).veri).toMatchObject({ altin: 100, marketAcik: true });
    expect((await istek("GET", "/api/market", null)).durum).toBe(401);
  });
  it("GET /api/market: 4 raf, 27 ürün; gizli ürünün kimliği/adı sızmaz; günün parçası indirimli", async () => {
    const v = (await istek("GET", "/api/market", A)).veri;
    expect(v.raflar.map((r: V) => r.tur)).toStrictEqual(["cekirdek", "govde", "disk", "uc"]);
    expect(v.raflar.flatMap((r: V) => r.urunler)).toHaveLength(27);
    const metin = JSON.stringify(v);
    for (const gizli of ["kor-kalbi", "Kor Kalbi", "karanlik-ucu", "Tutucu Uç"]) expect(metin).not.toContain(gizli);
    expect(v.raflar[0].urunler.find((u: V) => u.id === "kul-cekirdegi")).toMatchObject({ durum: "kilitli", etiket: "Kilitli: Elli Galibiyet 0/50" });
    expect(v.raflar[0].urunler.find((u: V) => u.id === "kaya-maden")).toMatchObject({ durum: "sahip" });
    const gp = v.gununParcasi;
    expect(gp.satisFiyati).toBe(Math.round(gp.fiyat * 0.7));
    expect(v.referans).toMatchObject({ cekirdek: "kaya-maden" });
  });
  it("POST satın al: 402 eksik · 403 kilitli · 201 (bakiye düşer, envanterde) · 409 sahip", async () => {
    const v = (await istek("GET", "/api/market", A)).veri;
    const gp = v.gununParcasi.id;
    expect((await istek("POST", "/api/market/satin-al", A, { parca: "top-uc" })).veri).toMatchObject({ hata: "yetersiz", eksik: (gp === "top-uc" ? 350 : 500) - 100 });
    expect((await istek("POST", "/api/market/satin-al", A, { parca: "ayaz-govde" })).durum).toBe(403);
    const ucuz = ["duz-uc", "dengeli-uc"].find((x) => x !== gp)!;
    const r = await istek("POST", "/api/market/satin-al", A, { parca: ucuz });
    expect(r.durum).toBe(201);
    expect(r.veri).toMatchObject({ ok: true, fiyat: 100, bakiye: 0 });
    expect(r.veri.market.raflar[3].urunler.find((u: V) => u.id === ucuz).durum).toBe("sahip");
    expect((await istek("GET", "/api/atolye", A)).veri.parcalar.some((p: V) => p.tanimId === ucuz)).toBe(true);
    expect((await istek("POST", "/api/market/satin-al", A, { parca: ucuz })).durum).toBe(409);
    const df = (await istek("GET", "/api/defter", A)).veri;
    expect(df.bakiye).toBe(0);
    expect(df.satirlar.map((s: V) => s.neden)).toStrictEqual(["satin", "basarim"]);
  });
  it("GET /api/basarimlar: 46; gizli başarım ??? (ipucu yok); İlk Devir tamam + tarih", async () => {
    const v = (await istek("GET", "/api/basarimlar", A)).veri;
    expect(v.basarimlar).toHaveLength(46);
    const gizli = v.basarimlar.filter((b: V) => !b.gorunur);
    expect(gizli.length).toBe(9);
    for (const g of gizli) expect(g).toMatchObject({ ad: "???", aciklama: "Gizli başarım.", sayi: 0, acilanParcalar: [] });
    expect(JSON.stringify(gizli)).not.toContain("kriz");
    expect(v.basarimlar.find((b: V) => b.id === "ilk-devir")).toMatchObject({ tamam: true, zorluk: "kolay", odulAltin: 100 });
    expect(v.basarimlar.find((b: V) => b.id === "ilk-devir").tamamTarihi).toBeGreaterThan(0);
  });
  it("hızlı maç: 30 sn dolmadan bot isteği reddedilir (oda bekliyor kalır)", async () => {
    const b = await istek("POST", "/api/bilet", A, {});
    const { KATALOG_OZETI } = await import("../src/ag/katalog.ts");
    const { PROTOKOL_SURUMU } = await import("../src/ag/protokol.ts");
    const sdk = new Client(TABAN);
    const oda = await sdk.joinOrCreate("mac", { v: PROTOKOL_SURUMU, mod: "hizli", katalog: KATALOG_OZETI, bilet: b.veri.bilet });
    await new Promise((r) => setTimeout(r, 300));
    oda.send("botIste", { v: PROTOKOL_SURUMU });
    await new Promise((r) => setTimeout(r, 1200));
    const s = oda.state as unknown as { faz: number; oyuncular: { length: number } };
    expect(s.faz).toBe(0);
    expect(s.oyuncular.length).toBe(1);
    await oda.leave(true);
  }, 20000);
});
