import { describe, expect, it } from "vitest";
import { botGirdisi } from "../src/paylasilan/bot/bot.ts";
import { AYAR } from "../src/paylasilan/kurallar/ayar.ts";
import { adim, dunyaKur, macDunyasiKur, type TakimProfilleri } from "../src/paylasilan/sim/Dunya.ts";
import type { Dunya, Olay } from "../src/paylasilan/sim/durum.ts";
import { dolumCarpani, enerjiKazan, TAKIM_ENERJI_TAVAN } from "../src/paylasilan/sim/enerji.ts";
import { type Girdi, bosGirdi } from "../src/paylasilan/sim/Girdi.ts";
import { dunyaHash } from "../src/paylasilan/sim/hash.ts";
import { TAKIM_ULTI_NO, TAKIM_YUVA, ULTI_YUVA, elenmemisKart, yuvaDurumu, yuvaYetenegi } from "../src/paylasilan/sim/yetenek.ts";
import { topacProfiliKur } from "../src/paylasilan/veri/profil.ts";
import { YETENEK_SIM } from "../src/paylasilan/veri/yetenekSablon.ts";
import { dunyaGorunumu, f32, gorunumdenDunya } from "../src/ag/durum.ts";

// D8 Takım Ultisi (flint #16, tuning § 8-9): paylaşılan 4. dilim, basış anı şartı, maç başına bir kez, Ulti çakışması.

const P = {
  S: topacProfiliKur("kor-goktasi", "ok-govde", "hafif-disk", "duz-uc"),
  K: topacProfiliKur("kaya-maden", "kalkan-govde", "agir-disk", "igne-uc"),
  D: topacProfiliKur("girdap-maden", "halka-govde", "parlak-disk", "top-uc"),
};
const TAKIM: TakimProfilleri = [P.S, P.K, P.D];
const g = (o: Partial<Girdi> = {}): Girdi => ({ ...bosGirdi(), ...o });
const ates = (yuva: number, d: Dunya, i: number): Girdi => g({ atesle: true, secilenYuva: yuva, nisanX: d.topaclar[1 - i]!.x, nisanZ: d.topaclar[1 - i]!.z });

/** Maç dünyası, tur fazında, iki topaç yakın. */
function mac(seviye: [number, number] = [3, 3]): Dunya {
  const d = macDunyasiKur([TAKIM, TAKIM], 21, { seviye });
  Object.assign(d.mac, { faz: "tur", kalanTick: 0, turNo: 1 });
  d.topaclar[0].x = -90; d.topaclar[0].z = 0; d.topaclar[1].x = 90; d.topaclar[1].z = 0;
  d.topaclar[0].koruma = 0; d.topaclar[1].koruma = 0;
  return d;
}
function ileri(d: Dunya, n: number, g0: Girdi = bosGirdi(), g1: Girdi = bosGirdi()): Olay[] {
  const o: Olay[] = [];
  for (let k = 0; k < n; k++) { adim(d, [k === 0 ? g0 : bosGirdi(), k === 0 ? g1 : bosGirdi()]); o.push(...d.olaylar); }
  return o;
}
const ret = (o: Olay[], i: number) => o.find((x) => x.tur === "yetenekReddi" && x.i === i) as Extract<Olay, { tur: "yetenekReddi" }> | undefined;

describe("Takım Enerjisi (4. dilim, tuning § 8)", () => {
  it("her topaç kazancının %25'i takıma akar; tavan 100; dolunca olay bir kez", () => {
    const d = mac();
    d.topaclar[0].enerji = 0;
    enerjiKazan(d, 0, 40);
    const c = 40 * dolumCarpani(d.topaclar[0], d.profiller[0]);
    expect(d.topaclar[0].enerji).toBeCloseTo(c, 9);
    expect(d.takimEnerji[0]).toBeCloseTo(c * AYAR.enerji.takimOran, 9);
    expect(d.takimEnerji[1]).toBe(0);
    d.olaylar = [];
    d.takimEnerji[0] = 99;
    enerjiKazan(d, 0, 50);
    expect(d.takimEnerji[0]).toBe(TAKIM_ENERJI_TAVAN);
    expect(d.olaylar.filter((o) => o.tur === "takimEnerjiDoldu")).toHaveLength(1);
    enerjiKazan(d, 0, 50);
    expect(d.olaylar.filter((o) => o.tur === "takimEnerjiDoldu")).toHaveLength(1);
  });
  it("topaç Enerjisi tavandayken de takım dolar (kazanç tavan öncesi); ulti kilidinde dolmaz", () => {
    const d = mac();
    d.topaclar[0].enerji = 300;
    enerjiKazan(d, 0, 20);
    expect(d.takimEnerji[0]).toBeGreaterThan(0);
    const once = d.takimEnerji[0];
    d.ultiKilit = 10;
    enerjiKazan(d, 0, 20);
    expect(d.takimEnerji[0]).toBe(once);
  });
  it("tek tur kipinde Takım Enerjisi yok, yuva 4 'yok'", () => {
    const d = dunyaKur([P.S, P.K], 3);
    enerjiKazan(d, 0, 50);
    expect(d.takimEnerji).toEqual([0, 0]);
    expect(yuvaYetenegi(d, 0, TAKIM_YUVA)).toBe(-1);
    expect(yuvaDurumu(d, 0, TAKIM_YUVA)).toBe("yok");
  });
  it("Takım Ultisi kullanıldıktan sonra takım dolmaz", () => {
    const d = mac();
    d.takimEnerji[0] = 100;
    ileri(d, 1, ates(TAKIM_YUVA, d, 0));
    expect(d.takimEnerji[0]).toBe(0);
    d.ultiKilit = 0;
    enerjiKazan(d, 0, 80);
    expect(d.takimEnerji[0]).toBe(0);
  });
});

describe("Takım Ultisi şartı (flint #16)", () => {
  it("yetenek verisi: kademe 4, telegraf 1,0 s, süre 3,5 s, ilk sürümde açık, kaçılabilir", () => {
    const y = YETENEK_SIM[TAKIM_ULTI_NO]!;
    expect(y.kademe).toBe(4);
    expect(y.telegrafSn).toBe(1);
    expect(y.sureAdim).toBe(Math.round(3.5 * AYAR.adimHz));
    expect(y.sablon).toBe("takim");
    expect(y.kacilabilir).toBe(true);
  });
  it("dilim dolu + 3 kart + Lv.3: kabul, Takım Enerjisi sıfırlanır, bayrak, telegraf 60 adım", () => {
    const d = mac();
    d.takimEnerji[0] = 100;
    expect(yuvaDurumu(d, 0, TAKIM_YUVA)).toBeNull();
    const o = ileri(d, 1, ates(TAKIM_YUVA, d, 0));
    const b = o.find((x) => x.tur === "yetenekBasladi") as Extract<Olay, { tur: "yetenekBasladi" }>;
    expect(b).toMatchObject({ i: 0, yuva: TAKIM_YUVA, kademe: 4, no: TAKIM_ULTI_NO, telegraf: 60 });
    expect(d.takimUltiKullanildi[0]).toBe(1);
    expect(d.takimEnerji[0]).toBe(0);
    // Ulti sınıfı: dash kilidi, Enerji kilidi = telegraf + süre + 1 s
    expect(d.ultiKilit).toBe(60 + Math.round(3.5 * 60) + 60 - 0);
  });
  it("dilim dolu değilse 'enerji' reddi", () => {
    const d = mac();
    d.takimEnerji[0] = 99.9;
    expect(ret(ileri(d, 1, ates(TAKIM_YUVA, d, 0)), 0)?.neden).toBe("enerji");
  });
  it("aktif Çekirdek Lv.2: kilitli (Ulti-açık seviye Lv.3)", () => {
    const d = mac([2, 3]);
    d.takimEnerji[0] = 100;
    expect(yuvaDurumu(d, 0, TAKIM_YUVA)).toBe("kilitli");
  });
  it("2 elenmemiş kart: kullanılabilir; 1 kart: 'takimDustu' (dilim kalır)", () => {
    const d = mac();
    d.takimEnerji[0] = 100;
    d.takimlar![0].uyeler[2].elendi = 1;
    expect(elenmemisKart(d, 0)).toBe(2);
    expect(yuvaDurumu(d, 0, TAKIM_YUVA)).toBeNull();
    d.takimlar![0].uyeler[1].elendi = 1;
    expect(elenmemisKart(d, 0)).toBe(1);
    expect(ret(ileri(d, 1, ates(TAKIM_YUVA, d, 0)), 0)?.neden).toBe("takimDustu");
    expect(d.takimEnerji[0]).toBe(100);
  });
  it("dilim dolduktan sonra kart elenirse dilim kalır ve şart sağlanıyorsa kullanılır (gerçek tur sonu)", () => {
    const d = mac();
    d.takimEnerji[0] = 100;
    d.topaclar[0].stamina = 0.0001; // A'nın topacı bu adımda durur
    ileri(d, 3);
    expect(d.takimlar![0].uyeler[0].elendi).toBe(1);
    expect(d.takimEnerji[0]).toBe(100);
    // tur arası → yeni tur
    let n = 0;
    while (d.mac.faz !== "tur" && n++ < 2000) adim(d, [bosGirdi(), bosGirdi()]);
    expect(d.mac.faz).toBe("tur");
    d.topaclar[0].koruma = 0;
    expect(elenmemisKart(d, 0)).toBe(2);
    expect(yuvaDurumu(d, 0, TAKIM_YUVA)).toBeNull();
  });
  it("maç başına bir kez: ikinci basış 'ultiKullanildi'", () => {
    const d = mac();
    d.takimEnerji[0] = 100;
    ileri(d, 1, ates(TAKIM_YUVA, d, 0));
    ileri(d, 400);
    d.takimEnerji[0] = 100;
    expect(yuvaDurumu(d, 0, TAKIM_YUVA)).toBe("ultiKullanildi");
  });
  it("Takım Ultisi sürerken rakibin Ulti'si ve Takım Ultisi reddedilir (rakipUlti); rakip Ulti sürerken Takım Ultisi reddedilir", () => {
    const d = mac();
    d.takimEnerji = [100, 100];
    d.topaclar[1].enerji = 300;
    ileri(d, 1, ates(TAKIM_YUVA, d, 0));
    expect(ret(ileri(d, 1, bosGirdi(), ates(ULTI_YUVA, d, 1)), 1)?.neden).toBe("rakipUlti");
    expect(ret(ileri(d, 1, bosGirdi(), ates(TAKIM_YUVA, d, 1)), 1)?.neden).toBe("rakipUlti");
    const e = mac();
    e.takimEnerji = [100, 100];
    e.topaclar[1].enerji = 300;
    ileri(e, 1, bosGirdi(), ates(ULTI_YUVA, e, 1));
    expect(ret(ileri(e, 1, ates(TAKIM_YUVA, e, 0)), 0)?.neden).toBe("rakipUlti");
  });
  it("kendi Ulti'si sürerken Takım Ultisi 'mesgul'", () => {
    const d = mac();
    d.takimEnerji[0] = 100;
    d.topaclar[0].enerji = 300;
    ileri(d, 1, ates(ULTI_YUVA, d, 0));
    expect(ret(ileri(d, 1, ates(TAKIM_YUVA, d, 0)), 0)?.neden).toBe("mesgul");
  });
  it("etki: telegraf sonunda alan kurulur, menzildeki rakip itilir ve hasar alır", () => {
    const d = mac();
    d.takimEnerji[0] = 100;
    const s0 = d.topaclar[1].stamina;
    ileri(d, 1, ates(TAKIM_YUVA, d, 0));
    // rakibi yerinde tut (bot yok), telegraf 60 adım
    const o = ileri(d, 62);
    expect(o.some((x) => x.tur === "yetenekEtki" && x.i === 0 && x.kademe === 4)).toBe(true);
    expect(d.alanlar[0]?.no).toBe(TAKIM_ULTI_NO);
    expect(d.topaclar[1].stamina).toBeLessThan(s0);
  });
});

describe("Takım Ultisi: ağ ve hash", () => {
  it("wire görünümü Takım Enerjisini ve bayrağı taşır (f32 hash eşitliği)", () => {
    const d = mac();
    d.takimEnerji = [37.25, 100];
    d.takimUltiKullanildi = [0, 1];
    const geri = gorunumdenDunya(dunyaGorunumu(d), [TAKIM, TAKIM], f32);
    expect(geri.takimEnerji).toEqual([37.25, 100]);
    expect(geri.takimUltiKullanildi).toEqual([0, 1]);
    expect(dunyaHash(geri)).toBe(dunyaHash(gorunumdenDunya(dunyaGorunumu(geri), [TAKIM, TAKIM], f32)));
  });
  it("hash Takım Enerjisini maç kipinde içerir, tek turda içermez", () => {
    const d = mac();
    const h = dunyaHash(d);
    d.takimEnerji[0] = 1;
    expect(dunyaHash(d)).not.toBe(h);
    const t = dunyaKur([P.S, P.K], 3);
    const ht = dunyaHash(t);
    t.takimEnerji[0] = 1;
    expect(dunyaHash(t)).toBe(ht);
  });
});

describe("D8 bot: yetenek kullanır (Takım Ultisi dahil)", () => {
  it("Takım Enerjisi dolu, rakip menzilde: bot yuva 4'ü ateşler (birkaç adım içinde)", () => {
    const d = mac();
    d.takimEnerji[0] = 100;
    let atti = false;
    for (let k = 0; k < 600 && !atti; k++) {
      const b = botGirdisi(d, 0, "dolas", 5);
      if (b.atesle && b.secilenYuva === TAKIM_YUVA) atti = true;
      adim(d, [b, bosGirdi()]);
      d.topaclar[1].x = d.topaclar[0].x + 120; d.topaclar[1].z = d.topaclar[0].z;
    }
    expect(atti).toBe(true);
  });
  it("bot-bot 20 maç (Lv.3): yetenekler kullanılır, Takım Ultisi en az bir kez", () => {
    let yetenek = 0;
    let takim = 0;
    const kip = ["dolas", "kenar", "dayaniklilik"] as const;
    for (let s = 0; s < 20; s++) {
      const d = macDunyasiKur([TAKIM, [P.D, P.S, P.K]], 300 + s, { seviye: [3, 3] });
      for (let k = 0; k < 60 * 125 && d.mac.faz !== "bitti"; k++) {
        adim(d, [botGirdisi(d, 0, kip[s % 3]!, s), botGirdisi(d, 1, kip[(s + 1) % 3]!, s + 50)]);
        for (const o of d.olaylar) if (o.tur === "yetenekBasladi") { yetenek++; if (o.yuva === TAKIM_YUVA) takim++; }
      }
      expect(d.mac.faz).toBe("bitti");
    }
    expect(yetenek).toBeGreaterThan(40);
    expect(takim).toBeGreaterThan(0);
  });
});

// ---- D8 d: hesap silme (depo), krediler ↔ manifest, gizlilik, XSS taraması ----
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Depo, veritabaniAc } from "../src/sunucu/db/depo.ts";
import { adAnahtari, adDogrula, takimAdDogrula } from "../src/sunucu/oyuncu/kurallar.ts";
import { kaynakAnahtari, kredilerDerle, tablolariOku } from "../src/paylasilan/krediler.ts";

describe("hesap silme (depo, nile B-28)", () => {
  const kur = () => {
    const d = new Depo(veritabaniAc(":memory:"));
    const yeni = (ad: string) => d.oyuncuOlustur({ ad, adAnahtar: adAnahtari(ad), sifreHash: "scrypt$x", simdi: 1 })!;
    const a = yeni("Silinen Sude");
    const b = yeni("Kalan Kaan");
    for (const id of [a, b]) {
      expect(d.ilkCekirdek(id, "goktasi", 1)).toBe("tamam");
      d.oturumAc(`oturum-${id}`, id, 9e15);
      d.altinYaz(id, 100, "basarim", `basarim:ilk-devir:${id}`, 1);
      d.basarimYaz(id, "zit-kutup", 3, false, 1, ["kor"]);
    }
    const ck = d.cekirdekler(a)[0]!;
    d.macYaz({ id: "m1", mod: "oda", a, b, kazanan: a, puan: "3-1", sure: 60, bitis_nedeni: "puan", katalog_ozeti: "k", baslangic: 5, takim_a: "x", takim_b: "y" }, [{ cekirdekId: ck.id, kazanc: 10, tecrube: 160, seviye: 2, omur: null }]);
    d.macYaz({ id: "m2", mod: "oda", a: b, b: a, kazanan: b, puan: "3-0", sure: 50, bitis_nedeni: "puan", katalog_ozeti: "k", baslangic: 6, takim_a: "y", takim_b: "x" }, []);
    return { d, a, b };
  };
  const izSay = (d: Depo, id: number) => {
    const db = d.db;
    const tablolar = (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[]).map((r) => r.name);
    let n = 0;
    for (const t of tablolar) {
      const sutun = (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((r) => r.name);
      if (sutun.includes("oyuncu_id")) n += (db.prepare(`SELECT COUNT(*) n FROM ${t} WHERE oyuncu_id = ?`).get(id) as { n: number }).n;
    }
    n += (db.prepare("SELECT COUNT(*) n FROM oyuncu WHERE id = ?").get(id) as { n: number }).n;
    n += (db.prepare("SELECT COUNT(*) n FROM mac WHERE a = ? OR b = ? OR kazanan = ?").get(id, id, id) as { n: number }).n;
    return { n, tablolar };
  };
  it("tüm tablolardan siler, maç satırlarını anonimleştirir, rakibin verisi kalır", () => {
    const { d, a, b } = kur();
    const once = izSay(d, a);
    expect(once.n).toBeGreaterThan(10);
    expect(once.tablolar).toEqual(expect.arrayContaining(["oyuncu", "oturum", "cekirdek", "parca", "takim", "altin_defteri", "basarim", "basarim_kume", "mac", "cekirdek_xp"]));
    const kalanOnce = izSay(d, b).n;
    expect(d.hesapSil(a)).toBe(true);
    expect(izSay(d, a).n).toBe(0);
    expect((d.db.prepare("SELECT COUNT(*) n FROM cekirdek_xp").get() as { n: number }).n).toBe(0);
    const m1 = d.mac("m1")!;
    const m2 = d.mac("m2")!;
    expect([m1.a, m1.silinen_a, m1.kazanan, m1.b]).toStrictEqual([null, 1, null, b]);
    expect([m2.b, m2.silinen_b, m2.kazanan]).toStrictEqual([null, 1, b]);
    // rakip: oyuncu, oturum, Çekirdek, Altın, başarım ve iki maç satırı duruyor (kazanan = rakip olan maç dahil)
    expect(izSay(d, b).n).toBe(kalanOnce);
    expect(d.bakiye(b)).toBe(100);
    expect(d.sonMaclar(b).map((m) => m.id)).toStrictEqual(["m2", "m1"]);
  });
  it("idempotent: ikinci silme false, hiçbir şey değişmez", () => {
    const { d, a, b } = kur();
    expect(d.hesapSil(a)).toBe(true);
    const sonra = izSay(d, b).n;
    expect(d.hesapSil(a)).toBe(false);
    expect(izSay(d, b).n).toBe(sonra);
    expect(d.hesapSil(999)).toBe(false);
  });
});

describe("krediler (manifest ↔ docs/art/krediler.md)", () => {
  const oku = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : null);
  const json = (p: string) => { const m = oku(p); return m ? JSON.parse(m) as unknown : null; };
  it("manifest'teki her kaynağın krediler listesinde karşılığı var", () => {
    const k = kredilerDerle(oku("docs/art/krediler.md"), json("veri/manifest-gorsel.json"), json("veri/manifest-ses.json"));
    expect(k.kaynaklar.length).toBeGreaterThan(0);
    const eksik = k.kaynaklar.filter((x) => x.eksikAtif).map((x) => `${x.dosya} (${x.kaynak})`);
    expect(eksik).toStrictEqual([]);
    expect(k.bildirim).toMatch(/Permission is hereby granted/);
    expect(k.yazilim.map((y) => y.ad).join(" ")).toMatch(/PixiJS.*@pixi\/sound.*Colyseus/);
    expect(k.yaziTipi).toMatch(/yazı tipi/i);
  });
  it("eksik dosya → boş durum; atıfsız kaynak işaretlenir", () => {
    expect(kredilerDerle(null, null, null)).toMatchObject({ bolumler: [], bildirim: null, kaynaklar: [] });
    const k = kredilerDerle("## Bölüm\n| A | B |\n|---|---|\n| Kenney | CC0 |\n", { dosyalar: [{ dosya: "x.png", kaynak: "Bilinmeyen Usta, paket", lisans: "CC0-1.0" }, { dosya: "y.ogg", kaynak: "Kenney, Impact", lisans: "CC0-1.0" }] }, { dosyalar: [{ dosya: "s.wav", kaynak: "sentez (araclar/ses-uret.ts)" }] });
    expect(k.kaynaklar.map((x) => [x.anahtar, x.eksikAtif])).toStrictEqual([["bilinmeyen", true], ["kenney", false], ["sentez", true]]);
    expect(kaynakAnahtari("Joseph Sardin, BigSoundBank")).toBe("joseph");
    expect(tablolariOku("## T\n| a | b |\n|---|---|\n| `x` | **y** |").bolumler[0]!.satirlar[0]!.hucreler).toStrictEqual(["x", "y"]);
  });
});

describe("gizlilik (nile B-28)", () => {
  it("docs/gizlilik.md var: ne / ne için / ne kadar / silme yolu / kâr amaçsız / çerezler", () => {
    const m = readFileSync("docs/gizlilik.md", "utf8");
    for (const s of ["## Ne saklıyoruz", "## Ne için", "## Ne kadar süre", "## Silme yolu", "## Çerezler", "kâr amaçsız", "Hesabımı sil", "Silinmiş oyuncu", "devran_oturum"]) expect(m).toContain(s);
    expect(readFileSync("src/istemci/ekranlar/Bilgi.ts", "utf8")).toContain("docs/gizlilik.md?raw");
    expect(readFileSync("src/istemci/ekranlar/Diger.ts", "utf8")).toMatch(/\/gizlilik[\s\S]*\/krediler[\s\S]*Hesabımı sil/);
  });
});

describe("XSS: kullanıcı / takım adı (güvenlik öz denetimi)", () => {
  const dosyalar = (k: string): string[] => readdirSync(k).flatMap((f) => { const p = join(k, f); return statSync(p).isDirectory() ? dosyalar(p) : p.endsWith(".ts") ? [p] : []; });
  it("sunucu ad ve takım adında < > & \" karakterlerini reddeder", () => {
    for (const ad of ["<script>x", "a<img src=x>", "ab\"c", "a&b"]) expect(adDogrula(ad).hata, ad).toBe("karakter");
    for (const ad of ["<b>takım</b>", "Takım\"1", "x&y"]) expect(takimAdDogrula(ad).hata, ad).toBe("karakter");
  });
  it("istemcide innerHTML / insertAdjacentHTML şablonları oyuncu / rakip / takım adı içermez (adlar textContent ile)", () => {
    const yasak = /(oyuncu\(|\.oyuncu\.ad|rakipAd|adlar\[|sonAd|takim[A-Za-z]*\.ad|ben\.oyuncu|\.ad \?\? "Rakip")/;
    const ihlal: string[] = [];
    for (const f of dosyalar("src/istemci")) {
      readFileSync(f, "utf8").split("\n").forEach((satir, n) => {
        const m = /(innerHTML\s*=|insertAdjacentHTML\([^,]+,)\s*(.*)$/.exec(satir);
        if (m && /\$\{/.test(m[2]!) && yasak.test(m[2]!)) ihlal.push(`${f}:${n + 1}`);
      });
    }
    expect(ihlal).toStrictEqual([]);
  });
});

describe("eski marka / varlık temizliği (B-37)", () => {
  it("kod, public, araçlar, index.html, package.json, README, .github: eski marka ve fan-IP adı yok (depo URL'si hariç)", () => {
    const yasak = /skaledman|spritecollab|pok[eé]mon|fusion|pokerivals/i;
    const tara = (k: string): string[] => readdirSync(k).flatMap((f) => { const p = join(k, f); return statSync(p).isDirectory() ? tara(p) : [p]; });
    const dosyalar = [...tara("src"), ...tara("araclar"), ...tara("public").filter((p) => /\.(html|json|txt|md|js|css)$/.test(p) && !p.startsWith(join("public", "efekt"))), ...tara(".github"), "index.html", "package.json", "README.md", "CONTRIBUTING.md"];
    const ihlal: string[] = [];
    for (const f of dosyalar) {
      readFileSync(f, "utf8").split("\n").forEach((s, n) => { if (yasak.test(s.replace(/github\.com\/dorukhandori\/skaledman-arena/g, ""))) ihlal.push(`${f}:${n + 1}`); });
    }
    expect(ihlal).toStrictEqual([]);
    expect(existsSync("public/fusion")).toBe(false);
  });
});
