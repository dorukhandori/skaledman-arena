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
