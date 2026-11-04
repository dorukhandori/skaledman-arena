import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@colyseus/sdk";

// D5 API uçtan uca: gerçek Colyseus + Express sunucusu (bellek içi SQLite) bu süreçte dinler, `fetch` ile çağrılır;
// oda katılımı gerçek SDK istemcisiyle (bilet `onAuth`'ta). Çerez elle taşınır (Node fetch çerez kavanozu tutmaz).

process.env.VERI_DIZINI = ":memory:";
process.env.NODE_ENV = "test";
const PORT = 25790 + Math.floor(Math.random() * 100);
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
async function istek(yol: string, govde?: unknown, cerez?: string | null, koken: string | null = KOKEN): Promise<Yanit> {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (cerez) h["cookie"] = cerez;
  if (koken) h["origin"] = koken;
  const r = await fetch(`${TABAN}${yol}`, { method: govde === undefined ? "GET" : "POST", headers: h, body: govde === undefined ? undefined : JSON.stringify(govde) });
  const sc = r.headers.get("set-cookie");
  return { durum: r.status, veri: (await r.json()) as Record<string, unknown>, cerez: sc ? sc.split(";")[0]! : null };
}

async function kayitOl(ad: string): Promise<string> {
  const r = await istek("/api/kayit", { ad, sifre: "uzun-sifre-1", sifreTekrar: "uzun-sifre-1" });
  expect(r.durum).toBe(201);
  return r.cerez!;
}

describe("kayıt / giriş / çıkış", () => {
  it("kayıt → oturum çerezi (HttpOnly) → /api/ben", async () => {
    const r = await fetch(`${TABAN}/api/kayit`, { method: "POST", headers: { "content-type": "application/json", origin: KOKEN }, body: JSON.stringify({ ad: "Deniz Su", sifre: "uzun-sifre-1", sifreTekrar: "uzun-sifre-1" }) });
    expect(r.status).toBe(201);
    const sc = r.headers.get("set-cookie")!;
    expect(sc).toMatch(/^devran_oturum=.+; Path=\/; HttpOnly; SameSite=Lax/);
    const ben = await istek("/api/ben", undefined, sc.split(";")[0]);
    expect(ben.veri).toMatchObject({ girisli: true, protokol: 5, oyuncu: { ad: "Deniz Su", profilTamam: false } });
  });
  it("hatalar: ad alınmış (büyük/küçük), şifreler eşleşmiyor, kısa şifre, uygunsuz ad", async () => {
    expect((await istek("/api/kayit", { ad: "DENİZ SU", sifre: "uzun-sifre-1", sifreTekrar: "uzun-sifre-1" })).veri).toStrictEqual({ hata: "alinmis" });
    expect((await istek("/api/kayit", { ad: "Yeni Biri", sifre: "uzun-sifre-1", sifreTekrar: "uzun-sifre-2" })).veri).toStrictEqual({ hata: "eslesmiyor" });
    expect((await istek("/api/kayit", { ad: "Yeni Biri", sifre: "kisa", sifreTekrar: "kisa" })).veri).toStrictEqual({ hata: "sifreKisa" });
    expect((await istek("/api/kayit", { ad: "orospu", sifre: "uzun-sifre-1", sifreTekrar: "uzun-sifre-1" })).veri).toStrictEqual({ hata: "uygunsuz" });
    expect((await istek("/api/ad-uygun?ad=deniz%20su")).veri).toStrictEqual({ uygun: false, hata: "alinmis" });
  });
  it("giriş doğru / yanlış şifre; çıkış oturumu siler", async () => {
    expect((await istek("/api/giris", { ad: "deniz su", sifre: "yanlis-sifre" })).durum).toBe(401);
    const g = await istek("/api/giris", { ad: "deniz su", sifre: "uzun-sifre-1" });
    expect(g.durum).toBe(200);
    expect((await istek("/api/ben", undefined, g.cerez)).veri["girisli"]).toBe(true);
    expect((await istek("/api/cikis", {}, g.cerez)).durum).toBe(200);
    expect((await istek("/api/ben", undefined, g.cerez)).veri["girisli"]).toBe(false);
  });
  it("Origin reddi: yabancı köken yazamaz", async () => {
    const r = await istek("/api/kayit", { ad: "Kotu Koken", sifre: "uzun-sifre-1", sifreTekrar: "uzun-sifre-1" }, null, "https://kotu.example");
    expect(r.durum).toBe(403);
  });
  it("kaba kuvvet: aynı ad + ip dakikada 10 deneme, sonra 429", async () => {
    await kayitOl("Hedef Ad");
    const kodlar: number[] = [];
    for (let i = 0; i < 11; i++) kodlar.push((await istek("/api/giris", { ad: "hedef ad", sifre: `yanlis-${i}-xxxx` })).durum);
    expect(kodlar.slice(0, 10).every((k) => k === 401)).toBe(true);
    expect(kodlar[10]).toBe(429);
    // doğru şifre de pencere içinde reddedilir (deneme sayılır)
    expect((await istek("/api/giris", { ad: "hedef ad", sifre: "uzun-sifre-1" })).durum).toBe(429);
  }, 30000);
});

describe("profil, ilk Çekirdek, eğitim, bilet ve oda", () => {
  it("akış: profil → ilk Çekirdek → takım (1 sahip + 2 ödünç) → İlk Devir → bilet → odaya katılım", async () => {
    const c = await kayitOl("Ece Topaç");
    expect((await istek("/api/ilk-cekirdek", { set: "maden" })).durum).toBe(401); // oturumsuz
    expect((await istek("/api/profil", { arma: "kaya", renk: "#2fb8e8", destekKanali: "ece_tv" }, c)).durum).toBe(200);
    expect((await istek("/api/profil", { arma: "uydurma", renk: "#2fb8e8" }, c)).durum).toBe(400);
    expect((await istek("/api/ilk-cekirdek", { set: "maden" }, c)).durum).toBe(201);
    expect((await istek("/api/ilk-cekirdek", { set: "yapay" }, c)).durum).toBe(409);
    const ben = (await istek("/api/ben", undefined, c)).veri as { takimlar: { eksik: number; uyeler: { cekirdek: string; odunc: boolean; seviye: number }[] }[]; marketAcik: boolean; cekirdekler: { seviye: number; tecrube: number }[] };
    expect(ben.cekirdekler[0]).toMatchObject({ seviye: 2, tecrube: 150 });
    expect(ben.takimlar[0]!.eksik).toBe(0);
    expect(ben.takimlar[0]!.uyeler.map((u) => [u.cekirdek, u.odunc, u.seviye])).toStrictEqual([["kaya-maden", false, 2], ["kor-goktasi", true, 1], ["kasirga-yapay", true, 1]]);
    expect(ben.marketAcik).toBe(false);
    expect((await istek("/api/egitim-bitti", {}, c)).veri).toMatchObject({ yeni: true });
    expect((await istek("/api/egitim-bitti", {}, c)).veri).toMatchObject({ yeni: false });
    expect(((await istek("/api/ben", undefined, c)).veri as { marketAcik: boolean }).marketAcik).toBe(true);

    expect((await istek("/api/bilet", {})).durum).toBe(401);
    const bilet = (await istek("/api/bilet", {}, c)).veri["bilet"] as string;
    const { PROTOKOL_SURUMU } = await import("../src/ag/protokol.ts");
    const { KATALOG_OZETI } = await import("../src/ag/katalog.ts");
    const sdk = new Client(TABAN);
    const oda = await sdk.create<{ oyuncular: { ad: string; takimId: string; takimNo: string }[] }>("mac", { v: PROTOKOL_SURUMU, mod: "oda", katalog: KATALOG_OZETI, bilet, takimId: "0" });
    await new Promise((r) => setTimeout(r, 300));
    const p = oda.state.oyuncular[0]!;
    expect(p.ad).toBe("Ece Topaç");
    expect(p.takimNo).toBe("0");
    expect(p.takimId.split("|").map((u) => u.split(":")[0])).toStrictEqual(["kaya-maden", "kor-goktasi", "kasirga-yapay"]);
    // aynı bilet ikinci kez: tek kullanımlık → ret
    await expect(sdk.joinById(oda.roomId, { v: PROTOKOL_SURUMU, mod: "oda", katalog: KATALOG_OZETI, bilet })).rejects.toThrow(/kimlik/);
    // misafir (bilet yok) oda kodu ile giremez; Antrenman'a girebilir
    await expect(sdk.joinById(oda.roomId, { v: PROTOKOL_SURUMU, mod: "oda", katalog: KATALOG_OZETI })).rejects.toThrow(/kimlik/);
    const ant = await sdk.create("mac", { v: PROTOKOL_SURUMU, mod: "antrenman", katalog: KATALOG_OZETI });
    expect(ant.roomId).toBeTruthy();
    await ant.leave(true);
    await oda.leave(true);
  }, 30000);
  it("sahte bilet ve eski protokol reddedilir", async () => {
    const { KATALOG_OZETI } = await import("../src/ag/katalog.ts");
    const sdk = new Client(TABAN);
    await expect(sdk.create("mac", { v: 5, mod: "oda", katalog: KATALOG_OZETI, bilet: "eyJvIjoxfQ.sahte" })).rejects.toThrow(/kimlik/);
    await expect(sdk.create("mac", { v: 4, mod: "oda", katalog: KATALOG_OZETI, ad: "x", takimId: "takim-1" })).rejects.toThrow(/surum/);
  });
});
