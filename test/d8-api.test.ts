import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, type Room } from "@colyseus/sdk";

// D8 uçtan uca (gerçek Colyseus + Express, bellek içi SQLite): seyirci odası (`izle`), hesap silme, gizlilik/krediler.

process.env.VERI_DIZINI = ":memory:";
process.env.NODE_ENV = "test";
const PORT = 26790 + Math.floor(Math.random() * 100);
const TABAN = `http://127.0.0.1:${PORT}`;
const KOKEN = "http://localhost:5173";
let durdur: () => Promise<void>;

beforeAll(async () => {
  const { server } = await import("../src/sunucu/index.ts");
  await server.listen(PORT);
  durdur = async () => { await server.gracefullyShutdown(false); };
}, 30000);
afterAll(async () => { await durdur?.(); });

interface Yanit { durum: number; veri: Record<string, unknown>; cerez: string | null }
async function istek(yol: string, govde?: unknown, cerez?: string | null, yontem?: string): Promise<Yanit> {
  const h: Record<string, string> = { "content-type": "application/json", origin: KOKEN };
  if (cerez) h["cookie"] = cerez;
  const r = await fetch(`${TABAN}${yol}`, { method: yontem ?? (govde === undefined ? "GET" : "POST"), headers: h, body: govde === undefined ? undefined : JSON.stringify(govde) });
  const sc = r.headers.get("set-cookie");
  const metin = await r.text();
  let veri: Record<string, unknown> = {};
  try { veri = JSON.parse(metin) as Record<string, unknown>; } catch { veri = { metin }; }
  return { durum: r.status, veri, cerez: sc ? sc.split(";")[0]! : null };
}

/** Oynanabilir hesap: kayıt → profil → ilk Çekirdek → İlk Devir. */
async function hesap(ad: string): Promise<string> {
  const r = await istek("/api/kayit", { ad, sifre: "uzun-sifre-1", sifreTekrar: "uzun-sifre-1" });
  expect(r.durum).toBe(201);
  const c = r.cerez!;
  expect((await istek("/api/profil", { arma: "kor", renk: "#2fb8e8" }, c)).durum).toBe(200);
  expect((await istek("/api/ilk-cekirdek", { set: "goktasi" }, c)).durum).toBe(201);
  await istek("/api/egitim-bitti", {}, c);
  return c;
}
async function bilet(c: string): Promise<string> { return (await istek("/api/bilet", {}, c)).veri["bilet"] as string; }
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface OdaDurumu { faz: number; kod: string; izleKod: string; oyuncular: { ad: string }[] }
interface IzleDurumu { faz: number; kod: string; dunyaVar: boolean; seyirci: number; oyuncular: { ad: string; takimId: string }[]; sonVar: boolean; sonPuan0: number; sonPuan1: number; dunya: { tick: number } }

describe("seyirci odası (ux § 5, #izle=)", () => {
  it("ev sahibinin yayını: giriş yok, kod bekleme fazında görünür, maç başlayınca gizlenir; seyirci girdisi yok sayılır; oda kapanınca son skor", async () => {
    const { PROTOKOL_SURUMU, ODA_FAZI } = await import("../src/ag/protokol.ts");
    const { KATALOG_OZETI } = await import("../src/ag/katalog.ts");
    const A = await hesap("Yayinci Ada");
    const B = await hesap("Izleyici Bora");
    const sdkA = new Client(TABAN);
    const oda = await sdkA.create<OdaDurumu>("mac", { v: PROTOKOL_SURUMU, mod: "oda", katalog: KATALOG_OZETI, bilet: await bilet(A) });
    await bekle(200);
    const kod = oda.state.kod;
    expect(oda.state.izleKod).toBe(kod); // ilk odada yayın kodu = oda kodu
    // misafir seyirci (bilet yok)
    const sdkS = new Client(TABAN);
    await expect(sdkS.joinOrCreate("izle", { v: PROTOKOL_SURUMU, kod: "ZZZZZZZZ" })).rejects.toThrow(/yok/);
    await expect(sdkS.joinOrCreate("izle", { v: 5, kod })).rejects.toThrow(/surum/);
    const s1 = await sdkS.joinOrCreate<IzleDurumu>("izle", { v: PROTOKOL_SURUMU, kod });
    await bekle(200);
    expect(s1.state.faz).toBe(ODA_FAZI.bekliyor);
    expect(s1.state.kod).toBe(kod);
    expect(s1.state.oyuncular[0]!.ad).toBe("Yayinci Ada");
    // ikinci oyuncu katılır, ikisi hazır → maç
    const sdkB = new Client(TABAN);
    const odaB = await sdkB.joinById<OdaDurumu>(oda.roomId, { v: PROTOKOL_SURUMU, mod: "oda", katalog: KATALOG_OZETI, bilet: await bilet(B) });
    await bekle(200);
    oda.send("hazir", { v: PROTOKOL_SURUMU });
    odaB.send("hazir", { v: PROTOKOL_SURUMU });
    // seyirci "kontrol" dener: yok sayılır (teslim, hazır, girdi)
    s1.send("teslim", { v: PROTOKOL_SURUMU });
    s1.send("hazir", { v: PROTOKOL_SURUMU });
    s1.send("rastgele", { x: 1 });
    await bekle(1500);
    expect(oda.state.faz).toBe(ODA_FAZI.mac);
    expect(s1.state.faz).toBe(ODA_FAZI.mac);
    expect(s1.state.kod).toBe(""); // maç başlayınca kod gizli
    expect(s1.state.dunyaVar).toBe(true);
    expect(s1.state.oyuncular.map((p) => p.ad)).toStrictEqual(["Yayinci Ada", "Izleyici Bora"]);
    expect(s1.state.oyuncular[1]!.takimId).toMatch(/:/);
    const t0 = s1.state.dunya.tick;
    await bekle(500);
    expect(s1.state.dunya.tick).toBeGreaterThan(t0); // yama akıyor
    // olaylar seyirciye de gelir (hash'siz)
    let paket: { h?: string; o: unknown[] } | null = null;
    s1.onMessage("olaylar", (p: { h?: string; o: unknown[] }) => { paket = p; });
    oda.send("teslim", { v: PROTOKOL_SURUMU }); // A teslim: maç 0-3 biter
    await bekle(800);
    expect(paket).not.toBeNull();
    expect(paket!.h).toBeUndefined();
    expect(oda.state.faz).toBe(ODA_FAZI.bitti);
    expect(s1.state.faz).toBe(ODA_FAZI.bitti);
    expect(s1.state.sonVar).toBe(true);
    expect([s1.state.sonPuan0, s1.state.sonPuan1]).toStrictEqual([0, 3]);
    // oyuncular odadan çıkar → oda kapanır → seyirci bekleme ekranında (kod boş), bağlı kalır
    await odaB.leave(true);
    await oda.leave(true);
    await bekle(800);
    expect(s1.state.faz).toBe(ODA_FAZI.bekliyor);
    expect(s1.state.kod).toBe("");
    expect(s1.state.sonVar).toBe(true);
    // ev sahibi yeni oda açar: yayın kodu taşınır, seyirci yeni kodu görür
    const oda2 = await sdkA.create<OdaDurumu>("mac", { v: PROTOKOL_SURUMU, mod: "oda", katalog: KATALOG_OZETI, bilet: await bilet(A) });
    await bekle(300);
    expect(oda2.state.kod).not.toBe(kod);
    expect(oda2.state.izleKod).toBe(kod);
    expect(s1.state.kod).toBe(oda2.state.kod);
    // yeni oda kodu da yayın koduna çözülür (/api/izle/:kod) → aynı seyirci odası
    expect((await istek(`/api/izle/${oda2.state.kod}`)).veri).toStrictEqual({ durum: "var", kod });
    expect((await istek("/api/izle/ABCDEFGH")).veri).toStrictEqual({ durum: "yok" });
    const s2 = await new Client(TABAN).joinOrCreate<IzleDurumu>("izle", { v: PROTOKOL_SURUMU, kod });
    await bekle(200);
    expect(s2.roomId).toBe(s1.roomId);
    expect(s1.state.seyirci).toBe(2);
    await s2.leave(true);
    await s1.leave(true);
    await oda2.leave(true);
  }, 30000);

  it("oda başı 50 seyirci sınırı: 51. seyirci reddedilir", async () => {
    const { PROTOKOL_SURUMU, SEYIRCI_SINIRI } = await import("../src/ag/protokol.ts");
    const { KATALOG_OZETI } = await import("../src/ag/katalog.ts");
    const A = await hesap("Kalabalik Yayin");
    const oda = await new Client(TABAN).create<OdaDurumu>("mac", { v: PROTOKOL_SURUMU, mod: "oda", katalog: KATALOG_OZETI, bilet: await bilet(A) });
    await bekle(200);
    const seyirciler: Room[] = [];
    for (let k = 0; k < SEYIRCI_SINIRI; k++) seyirciler.push(await new Client(TABAN).joinOrCreate("izle", { v: PROTOKOL_SURUMU, kod: oda.state.kod }));
    expect(new Set(seyirciler.map((s) => s.roomId)).size).toBe(1);
    await expect(new Client(TABAN).joinOrCreate("izle", { v: PROTOKOL_SURUMU, kod: oda.state.kod })).rejects.toThrow(/dolu|full/);
    await Promise.all(seyirciler.map((s) => s.leave(true)));
    await oda.leave(true);
  }, 60000);
});
