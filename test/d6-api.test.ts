import { afterAll, beforeAll, describe, expect, it } from "vitest";

// D6 Atölye API uçtan uca: gerçek Express + Colyseus sunucusu (bellek içi SQLite), `fetch` ile. İstemci yalnız örnek
// kimliği gönderir; doğrulama ve çubuk sayıları sunucuda.

process.env.VERI_DIZINI = ":memory:";
process.env.NODE_ENV = "test";
const PORT = 25900 + Math.floor(Math.random() * 100);
const TABAN = `http://127.0.0.1:${PORT}`;
const KOKEN = "http://localhost:5173";
let durdur: () => Promise<void>;

beforeAll(async () => {
  const { server } = await import("../src/sunucu/index.ts");
  await server.listen(PORT);
  durdur = async () => { await server.gracefullyShutdown(false); };
}, 30000);
afterAll(async () => { await durdur?.(); });

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

describe("Atölye API", () => {
  let A = "";
  let B = "";
  it("GET /api/atolye: yeni oyuncu = seçtiği setin 4 parçası, takım 0 oynanabilir (2 ödünç)", async () => {
    A = await hesap("Atölye Ayşe", "maden");
    B = await hesap("Atölye Bora", "goktasi");
    const v = (await istek("GET", "/api/atolye", A)).veri;
    expect(v.cekirdekler.map((c: V) => c.tanimId)).toStrictEqual(["kaya-maden"]);
    expect(v.parcalar.map((p: V) => p.tanimId)).toStrictEqual(["kalkan-govde", "agir-disk", "igne-uc"]);
    expect(v.takimlar).toHaveLength(1);
    expect(v.takimlar[0]).toMatchObject({ takimNo: 0, oynanabilir: true, degerlendirme: { durum: ["sahip", "odunc", "odunc"], bos: 0 } });
    expect(v.takimlar[0].cubuklar[0].cubuklar).toHaveLength(6);
    expect(v.cekirdekler[0].defter).toStrictEqual({ mac: 0, galibiyet: 0, krizGalibiyet: 0, enUzunDonusSn: 0, kararma: 0 });
    expect((await istek("GET", "/api/atolye", null)).durum).toBe(401);
  });
  it("Uç değiştir (geliştirme ucuyla Düz Uç ver): sunucu çubukları hesaplar, Hız artar", async () => {
    const ver = await istek("POST", "/api/gelistirme/parca-ver", A, { tanim: "duz-uc" });
    expect(ver.durum).toBe(201);
    const v = (await istek("GET", "/api/atolye", A)).veri;
    const t = v.takimlar[0];
    const once = t.cubuklar[0].cubuklar.find((c: V) => c.anahtar === "hiz").deger;
    const yuvalar = structuredClone(t.yuvalar);
    yuvalar[0].uc = ver.veri.id;
    const r = await istek("PUT", "/api/takim/0", A, { yuvalar });
    expect(r.durum).toBe(200);
    const sonra = r.veri.atolye.takimlar[0].cubuklar[0];
    expect(sonra.desen).toBe("cicek");
    expect(sonra.cubuklar.find((c: V) => c.anahtar === "hiz").deger).toBeGreaterThan(once);
    // /api/ben (Lobi) takım kodu yeni Ucu taşır
    const ben = (await istek("GET", "/api/ben", A)).veri;
    expect(ben.takimlar[0].uyeler[0]).toMatchObject({ cekirdek: "kaya-maden", uc: "duz-uc", odunc: false });
  });
  it("PUT doğrulama: başkasının parçası, yanlış tür, parça iki topaçta, aynı Çekirdek, eksik parça", async () => {
    const v = (await istek("GET", "/api/atolye", A)).veri;
    const vb = (await istek("GET", "/api/atolye", B)).veri;
    const benim = v.takimlar[0].yuvalar[0];
    const bos = { cekirdek: null, govde: null, disk: null, uc: null };
    const put = (yuvalar: unknown) => istek("PUT", "/api/takim/0", A, { yuvalar });
    expect((await put([{ ...benim, govde: vb.parcalar[0].id }, bos, bos])).veri).toMatchObject({ hata: "sahipDegil", yuva: 0, tur: "govde" });
    expect((await put([{ ...benim, uc: benim.govde }, bos, bos])).veri).toMatchObject({ hata: "yanlisTur", tur: "uc" }); // Uç yuvasında Gövde
    const govde2 = await istek("POST", "/api/gelistirme/parca-ver", A, { tanim: "halka-govde" });
    expect((await put([{ ...benim, uc: govde2.veri.id }, bos, bos])).veri).toMatchObject({ hata: "yanlisTur", tur: "uc" });
    const kor = await istek("POST", "/api/gelistirme/parca-ver", A, { tanim: "kor-goktasi" });
    // aynı Gövde iki topaçta
    expect((await put([benim, { cekirdek: kor.veri.id, govde: benim.govde, disk: null, uc: null }, bos])).veri).toMatchObject({ hata: "parcaTekrar", yuva: 1, tur: "govde" });
    expect((await put([benim, { cekirdek: kor.veri.id, govde: govde2.veri.id, disk: null, uc: null }, bos])).veri).toMatchObject({ hata: "parcaEksik", yuva: 1, tur: "disk" });
    expect((await put([benim, { ...benim }, bos])).veri.hata).toBe("ayniCekirdek");
    expect((await put([benim, bos])).durum).toBe(400); // 3 yuva şart
    expect((await istek("PUT", "/api/takim/7", A, { yuvalar: [bos, bos, bos] })).veri.hata).toBe("sira");
  });
  it("kota: 2 Çekirdek → 1 ödünç; boş yuva kotayı aşarsa takım Lobi'de listelenmez", async () => {
    const v = (await istek("GET", "/api/atolye", A)).veri; // kaya-maden + kor-goktasi (Lv.1)
    expect(v.takimlar[0]).toMatchObject({ oynanabilir: false, degerlendirme: { durum: ["sahip", "odunc", "bos"], bos: 1 } });
    const kasirga = await istek("POST", "/api/gelistirme/parca-ver", A, { tanim: "kasirga-yapay" });
    const v2 = (await istek("GET", "/api/atolye", A)).veri;
    expect(v2.takimlar[0]).toMatchObject({ oynanabilir: false, degerlendirme: { bos: 2 } });
    expect((await istek("GET", "/api/ben", A)).veri.takimlar).toStrictEqual([]);
    expect(kasirga.veri.tur).toBe("cekirdek");
  });
  it("yeni takım (tavan 3), ad, aktif takım", async () => {
    const y1 = await istek("POST", "/api/takim", A, {});
    expect(y1.durum).toBe(201);
    expect(y1.veri.takimNo).toBe(1);
    expect((await istek("POST", "/api/takim", A, { ad: "Kale" })).veri.takimNo).toBe(2);
    expect((await istek("POST", "/api/takim", A, {})).veri.hata).toBe("dolu");
    expect((await istek("PATCH", "/api/takim/1", A, { ad: "Hızlılar" })).veri).toMatchObject({ ok: true, ad: "Hızlılar" });
    expect((await istek("PATCH", "/api/takim/1", A, { ad: "" })).veri.hata).toBe("ad-uzunluk");
    expect((await istek("PATCH", "/api/aktif-takim", A, { takimNo: 2 })).durum).toBe(200);
    const v = (await istek("GET", "/api/atolye", A)).veri;
    expect(v.aktifTakim).toBe(2);
    expect(v.takimlar.map((t: V) => t.ad)).toStrictEqual(["Takım 1", "Hızlılar", "Kale"]);
  });
  it("Yapay yön: çift yönlüde kaydedilir ve takım koduna geçer; sabit yönlüde reddedilir", async () => {
    const v = (await istek("GET", "/api/atolye", A)).veri;
    const maden = v.cekirdekler.find((c: V) => c.tanimId === "kaya-maden");
    const yapay = v.cekirdekler.find((c: V) => c.tanimId === "kasirga-yapay");
    expect((await istek("PATCH", `/api/cekirdek/${maden.id}`, A, { yon: "sol" })).veri.hata).toBe("yonSabit");
    expect((await istek("PATCH", `/api/cekirdek/${yapay.id}`, A, { yon: "sol" })).durum).toBe(200);
    // üç Çekirdekli tam takım yaz: Yapay sola
    const p = (tanim: string) => v.parcalar.find((x: V) => x.tanimId === tanim).id;
    const g1 = await istek("POST", "/api/gelistirme/parca-ver", A, { tanim: "savrulan-govde" });
    const d1 = await istek("POST", "/api/gelistirme/parca-ver", A, { tanim: "denge-disk" });
    const u1 = await istek("POST", "/api/gelistirme/parca-ver", A, { tanim: "dengeli-uc" });
    const g2 = await istek("POST", "/api/gelistirme/parca-ver", A, { tanim: "ok-govde" });
    const d2 = await istek("POST", "/api/gelistirme/parca-ver", A, { tanim: "hafif-disk" });
    const kor = v.cekirdekler.find((c: V) => c.tanimId === "kor-goktasi");
    const yuvalar = [
      { cekirdek: yapay.id, govde: g1.veri.id, disk: d1.veri.id, uc: u1.veri.id },
      { cekirdek: maden.id, govde: p("kalkan-govde"), disk: p("agir-disk"), uc: p("igne-uc") },
      { cekirdek: kor.id, govde: g2.veri.id, disk: d2.veri.id, uc: p("duz-uc") },
    ];
    const r = await istek("PUT", "/api/takim/2", A, { yuvalar, ad: "Üçlü" });
    expect(r.durum).toBe(200);
    expect(r.veri.atolye.takimlar[2]).toMatchObject({ oynanabilir: true, ad: "Üçlü" });
    expect(r.veri.atolye.takimlar[2].cubuklar[0].donus).toBe("sol");
    const ben = (await istek("GET", "/api/ben", A)).veri;
    expect(ben.aktifTakim).toBe("2");
    expect(ben.takimlar.find((t: V) => t.id === "2").uyeler[0]).toMatchObject({ cekirdek: "kasirga-yapay", yon: "sol", seviye: 1, odunc: false });
  });
  it("XP ucu: Lv.3'e çıkar; takım kodunda seviye 3 (Özel Yetenek açılır)", async () => {
    const v = (await istek("GET", "/api/atolye", A)).veri;
    const maden = v.cekirdekler.find((c: V) => c.tanimId === "kaya-maden");
    const r = await istek("POST", "/api/gelistirme/xp-ver", A, { cekirdekId: maden.id, xp: 600 });
    expect(r.veri).toMatchObject({ seviye: 3, tecrube: 750 });
    const ben = (await istek("GET", "/api/ben", A)).veri;
    expect(ben.takimlar.find((t: V) => t.id === "2").uyeler[1]).toMatchObject({ cekirdek: "kaya-maden", seviye: 3 });
    expect((await istek("POST", "/api/gelistirme/xp-ver", B, { cekirdekId: maden.id, xp: 5 })).durum).toBe(404); // başkasının
  });
  it("ad değiştirme: ilki serbest, ikincisi 30 gün kuralına takılır", async () => {
    const r1 = await istek("PATCH", "/api/ad", B, { ad: "Bora Yeni" });
    expect(r1.veri).toMatchObject({ ok: true, ad: "Bora Yeni" });
    const r2 = await istek("PATCH", "/api/ad", B, { ad: "Bora Üç" });
    expect(r2.durum).toBe(409);
    expect(r2.veri).toMatchObject({ hata: "sure", kalanGun: 30 });
    expect((await istek("PATCH", "/api/ad", A, { ad: "BORA YENİ" })).veri.hata).toBe("alinmis");
    expect((await istek("PATCH", "/api/ad", A, { ad: "x" })).veri.hata).toBe("uzunluk");
    expect((await istek("GET", "/api/ben", B)).veri.oyuncu.ad).toBe("Bora Yeni");
  });
});
