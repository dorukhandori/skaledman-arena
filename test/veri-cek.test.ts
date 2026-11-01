import { mkdtempSync, readFileSync, readdirSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  argumanlariOku, cek, KULLANICI_AJANI, SAAT_MS, TABAN_URL, ucDetay, ucGecmis, ucKartlar, VARSAYILAN_CIKTI,
  type Bagimliliklar, type Secenekler,
} from "../araclar/veri-cek.ts";

// Ağ yok: fetch sahte. Gerçek fixture'lar (veri/) yalnızca "geçerli yanıt" örneği olarak okunur.
const kartlarHam = readFileSync("veri/kartlar.json", "utf8");
const gecmisHam = readFileSync("veri/gecmis.json", "utf8");
const detayHam = readFileSync("veri/ornek-detay-251.443.json", "utf8");

const jsonYanit = (govde: string, durum = 200, tur = "application/json; charset=utf-8"): Response =>
  new Response(govde, { status: durum, headers: { "content-type": tur } });

let dizin: string;
let t: number;
let sahteFetch: ReturnType<typeof vi.fn>;
let b: Bagimliliklar;

function secenek(uclar = [ucKartlar(), ucGecmis()], zorla = false): Secenekler {
  return { ciktiDizini: join(dizin, "cikti"), zorla, uclar };
}

beforeEach(() => {
  dizin = mkdtempSync(join(tmpdir(), "veri-cek-"));
  t = 1_000_000;
  sahteFetch = vi.fn(async (url: string | URL | Request) => {
    const u = String(url);
    if (u.endsWith("/api/kartlar")) return jsonYanit(kartlarHam);
    if (u.endsWith("/api/history")) return jsonYanit(gecmisHam);
    if (u.includes("/api/detay")) return jsonYanit(detayHam);
    return jsonYanit("{}", 404);
  });
  b = { fetch: sahteFetch as unknown as typeof fetch, simdi: () => t, durumDosyasi: join(dizin, "durum.json") };
});
afterEach(() => rmSync(dizin, { recursive: true, force: true }));

describe("veri-cek: yazma", () => {
  it("geçerli yanıtları ham gövdeyle (bayt bayt) yazar", async () => {
    const r = await cek(secenek(), b);
    expect(r.map((x) => x.durum)).toEqual(["yazildi", "yazildi"]);
    expect(readFileSync(join(dizin, "cikti", "kartlar.json"), "utf8")).toBe(kartlarHam);
    expect(readFileSync(join(dizin, "cikti", "gecmis.json"), "utf8")).toBe(gecmisHam);
  });

  it("açık User-Agent, GET, yönlendirme yok ve zaman aşımı sinyali gönderir", async () => {
    await cek(secenek([ucKartlar()]), b);
    const [url, init] = sahteFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${TABAN_URL}/api/kartlar`);
    expect(init.method).toBe("GET");
    expect(init.redirect).toBe("error");
    expect((init.headers as Record<string, string>)["user-agent"]).toBe(KULLANICI_AJANI);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("detay ucunu doğrular ve dosyaya yazar", async () => {
    const r = await cek(secenek([ucDetay("251.443")]), b);
    expect(r[0]?.durum).toBe("yazildi");
    expect(existsSync(join(dizin, "cikti", "detay-251.443.json"))).toBe(true);
  });

  it("varsayılan çıktı veri/ değil .cache/veri-cek/ dizinidir", () => {
    expect(VARSAYILAN_CIKTI.endsWith(join(".cache", "veri-cek"))).toBe(true);
    expect(argumanlariOku([]).ciktiDizini).toBe(VARSAYILAN_CIKTI);
    expect(argumanlariOku(["--cikti", "veri"]).ciktiDizini.endsWith("/veri")).toBe(true);
  });
});

describe("veri-cek: saatlik sınır", () => {
  it("aynı uca saat dolmadan ikinci istek atmaz", async () => {
    await cek(secenek(), b);
    expect(sahteFetch).toHaveBeenCalledTimes(2);
    t += SAAT_MS - 1;
    const r = await cek(secenek(), b);
    expect(r.map((x) => x.durum)).toEqual(["atlandi", "atlandi"]);
    expect(sahteFetch).toHaveBeenCalledTimes(2);
  });

  it("saat dolunca yeniden çeker", async () => {
    await cek(secenek(), b);
    t += SAAT_MS;
    const r = await cek(secenek(), b);
    expect(r.map((x) => x.durum)).toEqual(["yazildi", "yazildi"]);
    expect(sahteFetch).toHaveBeenCalledTimes(4);
  });

  it("--zorla sınırı atlar", async () => {
    await cek(secenek(), b);
    const r = await cek(secenek(undefined, true), b);
    expect(r.map((x) => x.durum)).toEqual(["yazildi", "yazildi"]);
  });

  it("başarısız deneme de sayılır: hata sonrası aynı saatte tekrar istek yok", async () => {
    sahteFetch.mockImplementationOnce(async () => jsonYanit("{}", 500));
    const ilk = await cek(secenek([ucKartlar()]), b);
    expect(ilk[0]).toMatchObject({ durum: "hata", ileti: "HTTP 500" });
    const ikinci = await cek(secenek([ucKartlar()]), b);
    expect(ikinci[0]?.durum).toBe("atlandi");
    expect(sahteFetch).toHaveBeenCalledTimes(1);
  });

  it("uçlar birbirinden bağımsız sayılır", async () => {
    await cek(secenek([ucKartlar()]), b);
    const r = await cek(secenek([ucKartlar(), ucGecmis()]), b);
    expect(r.map((x) => x.durum)).toEqual(["atlandi", "yazildi"]);
  });

  it("bozuk durum dosyası sınırı kapatmaz, çökertmez", async () => {
    writeFileSync(b.durumDosyasi, "{bozuk");
    const r = await cek(secenek([ucKartlar()]), b);
    expect(r[0]?.durum).toBe("yazildi");
  });
});

describe("veri-cek: doğrulama (geçersiz veri asla yazılmaz)", () => {
  const dosyalar = (): string[] => (existsSync(join(dizin, "cikti")) ? readdirSync(join(dizin, "cikti")) : []);

  it.each([
    ["HTTP 401", () => jsonYanit('{"error":"Giriş gerekli"}', 401), "HTTP 401"],
    ["JSON olmayan içerik türü", () => jsonYanit("<html>", 200, "text/html"), "yanıt JSON değil"],
    ["bozuk JSON", () => jsonYanit("{kesik"), "geçersiz JSON"],
    ["şema dışı gövde", () => jsonYanit('{"1.2":{"v":2}}'), "şema uyuşmuyor"],
    ["boş nesne", () => jsonYanit("{}"), "boş yanıt"],
  ])("%s → yazılmaz", async (_ad, yanit, ileti) => {
    sahteFetch.mockImplementationOnce(async () => yanit());
    const r = await cek(secenek([ucKartlar()]), b);
    expect(r[0]?.durum).toBe("hata");
    expect(r[0]?.ileti).toContain(ileti);
    expect(dosyalar()).toEqual([]);
  });

  it("history için dizi olmayan gövdeyi reddeder", async () => {
    sahteFetch.mockImplementationOnce(async () => jsonYanit('{"a":1}'));
    const r = await cek(secenek([ucGecmis()]), b);
    expect(r[0]?.durum).toBe("hata");
    expect(dosyalar()).toEqual([]);
  });

  it("ağ hatası ve zaman aşımı hata olarak raporlanır, sızıntı yok", async () => {
    sahteFetch.mockImplementationOnce(async () => { throw new TypeError("fetch failed: gizli ayrıntı"); });
    const r = await cek(secenek([ucKartlar()]), b);
    expect(r[0]).toMatchObject({ durum: "hata", ileti: "istek başarısız (TypeError)" });
    expect(dosyalar()).toEqual([]);
  });

  it("kayıt sayısı düşerse mevcut dosyanın üstüne yazmaz; --zorla geçer", async () => {
    await cek(secenek([ucGecmis()]), b);
    const kisa = JSON.stringify(JSON.parse(gecmisHam).slice(0, 3));
    sahteFetch.mockImplementationOnce(async () => jsonYanit(kisa));
    t += SAAT_MS;
    const r = await cek(secenek([ucGecmis()]), b);
    expect(r[0]?.durum).toBe("hata");
    expect(readFileSync(join(dizin, "cikti", "gecmis.json"), "utf8")).toBe(gecmisHam);

    sahteFetch.mockImplementationOnce(async () => jsonYanit(kisa));
    const z = await cek(secenek([ucGecmis()], true), b);
    expect(z[0]?.durum).toBe("yazildi");
  });

  it("başarısız yazma sonrası geçici dosya kalmaz", async () => {
    sahteFetch.mockImplementationOnce(async () => jsonYanit("{kesik"));
    await cek(secenek([ucKartlar()]), b);
    expect(dosyalar().filter((d) => d.endsWith(".tmp"))).toEqual([]);
  });

  it("detay yanıtı istenen kimlikle uyuşmuyorsa reddeder", async () => {
    const r = await cek(secenek([ucDetay("1.2")]), b);
    expect(r[0]?.durum).toBe("hata");
    expect(r[0]?.ileti).toContain("uyuşmuyor");
  });
});

describe("veri-cek: argümanlar", () => {
  it("geçersiz fusion kimliği yol enjeksiyonunu engeller", () => {
    expect(() => ucDetay("../../etc/passwd")).toThrow();
    expect(() => ucDetay("1.2&x=1")).toThrow();
    expect(() => argumanlariOku(["--detay", "../x"])).toThrow();
  });

  it("bilinmeyen argümanı reddeder; --detay virgüllü listeyi açar", () => {
    expect(() => argumanlariOku(["--bilinmez"])).toThrow();
    expect(argumanlariOku(["--detay", "1.2,3.4"]).uclar.map((u) => u.anahtar)).toEqual([
      "kartlar", "gecmis", "detay:1.2", "detay:3.4",
    ]);
  });
});
