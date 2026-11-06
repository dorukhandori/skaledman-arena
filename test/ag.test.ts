import { describe, expect, it } from "vitest";
import { dunyaGorunumu, f32, gorunumdenDunya, TOPAC_TURLERI } from "../src/ag/durum.ts";
import { diziGirdiye, girdiDiziye, kaydiOynat } from "../src/ag/kayit.ts";
import { KATALOG_OZETI } from "../src/ag/katalog.ts";
import {
  BOSTA_TASIMA_ADIMI, KatilmaSema, ODA_KODU_HARFLERI, PROTOKOL_SURUMU, UZLASMA, odaKoduBicimle, odaKoduCoz, odaKoduUret,
} from "../src/ag/protokol.ts";
import { adim, macDunyasiKur } from "../src/paylasilan/sim/Dunya.ts";
import { type Girdi, bosGirdi } from "../src/paylasilan/sim/Girdi.ts";
import { TOPAC_ALANLARI, dunyaHash } from "../src/paylasilan/sim/hash.ts";
import { kendiAdimi, topacKopyala } from "../src/paylasilan/sim/tahmin.ts";
import { rastgele } from "../src/paylasilan/sim/rastgele.ts";
import { botGirdisi } from "../src/paylasilan/bot/bot.ts";
import { takimProfilleriKimlikten } from "../src/paylasilan/veri/takimlar.ts";
import { type AgGirdisi, type GirdiKaynagi, KOPMA_ADIM, MacYonetimi } from "../src/sunucu/mac/MacYonetimi.ts";

// D4 netcode birim testleri: protokol v3, oda kodu, durum şeması gidiş-dönüş (f32 wire hash), tahmin modeli A,
// sunucu girdi tüketimi (borç / taşıma / birikme), kopma-dondurma-hükmen-iptal (flint #10-#12), AFK, teslim,
// maç kaydı yeniden oynatma (sunucu sim'i ≡ paylaşılan sim).

const T = ["takim-1", "takim-2"] as const;
const profiller = () => [takimProfilleriKimlikten(T[0]), takimProfilleriKimlikten(T[1])] as const;

describe("protokol v7 (Harita H2)", () => {
  it("sürüm 7, katılma şeması mod + katalog (+ bilet, takım numarası; harita modunda düğüm) ister; parça listesi yok", () => {
    expect(PROTOKOL_SURUMU).toBe(7);
    expect(KatilmaSema.safeParse({ v: 7, mod: "oda", bilet: "x.y", takimId: "0", katalog: KATALOG_OZETI }).success).toBe(true);
    expect(KatilmaSema.safeParse({ v: 7, mod: "antrenman", katalog: KATALOG_OZETI }).success).toBe(true);
    expect(KatilmaSema.safeParse({ v: 6, mod: "oda", bilet: "x.y", katalog: KATALOG_OZETI }).success).toBe(false);
    expect(KatilmaSema.safeParse({ v: 7, mod: "oda", bilet: "x".repeat(600), katalog: KATALOG_OZETI }).success).toBe(false);
    expect(KatilmaSema.safeParse({ v: 7, mod: "dereceli", katalog: "x" }).success).toBe(false);
    expect(KatilmaSema.safeParse({ v: 7, mod: "harita", bilet: "x.y", katalog: KATALOG_OZETI, dugum: "b1-01" }).success).toBe(true);
    expect(KatilmaSema.safeParse({ v: 7, mod: "harita", bilet: "x.y", katalog: KATALOG_OZETI }).success).toBe(false);
    expect(KatilmaSema.safeParse({ v: 7, mod: "harita", bilet: "x.y", katalog: KATALOG_OZETI, dugum: "b1-13" }).success).toBe(false);
  });
  it("uzlaşma eşikleri flint § 2: yumuşak > 0,5, büyük yumuşak > 8, sıçrama > 40 (sahip kararı N3); boşluk taşıma TCP yeniden iletimini kapsar", () => {
    expect(UZLASMA.yokSay).toBe(0.5);
    expect(UZLASMA.buyukEsik).toBe(8);
    expect(UZLASMA.sicrama).toBe(40);
    expect(BOSTA_TASIMA_ADIMI * 1000 / 60).toBeGreaterThanOrEqual(350);
  });
});

describe("oda kodu (ux § 3.3: ABCD-EFGH)", () => {
  it("8 harf, 0/O/1/I yok", () => {
    expect(ODA_KODU_HARFLERI).not.toMatch(/[OI01]/);
    let n = 0;
    const k = odaKoduUret(() => rastgele(9, n++));
    expect(k).toMatch(/^[A-Z]{8}$/);
    expect(odaKoduBicimle(k)).toMatch(/^[A-Z]{4}-[A-Z]{4}$/);
  });
  it("büyük-küçük duyarsız, tire ve boşluk isteğe bağlı, bağlantı yapıştırılabilir", () => {
    expect(odaKoduCoz("abcd-efgh")).toBe("ABCDEFGH");
    expect(odaKoduCoz(" ABCD EFGH ")).toBe("ABCDEFGH");
    expect(odaKoduCoz("https://devran.example/?ekran=lobi#oda=ABCDEFGH")).toBe("ABCDEFGH");
    expect(odaKoduCoz("ABCD-EFG")).toBeNull();
    expect(odaKoduCoz("ABCD-EFGO")).toBeNull(); // O yok
    expect(odaKoduCoz("ABCD-EFG1")).toBeNull();
  });
});

describe("durum şeması (axiom #5)", () => {
  it("hash'teki tüm topaç alanları şemada", () => {
    expect(Object.keys(TOPAC_TURLERI).sort()).toStrictEqual([...TOPAC_ALANLARI].sort());
  });
  it("gidiş-dönüş: float64 görünüm aynı dünya hash'i; f32 görünüm iki tarafta aynı (wire hash)", () => {
    const d = macDunyasiKur(profiller(), 77);
    for (let i = 0; i < 900; i++) adim(d, [botGirdisi(d, 0, "dolas", 1), botGirdisi(d, 1, "kenar", 2)]);
    const g = dunyaGorunumu(d);
    expect(dunyaHash(gorunumdenDunya(g, profiller()))).toBe(dunyaHash(d));
    // sunucu: kendi şemasını f32'ye indirger; istemci: aldığı (zaten f32) değeri tekrar indirger (etkisiz)
    const sunucu = gorunumdenDunya(g, profiller(), f32);
    const istemci = gorunumdenDunya(dunyaGorunumu(sunucu), profiller(), f32);
    expect(dunyaHash(istemci)).toBe(dunyaHash(sunucu));
    // f32 nicemleme hatası reconcile eşiğinin çok altında (flint § 2)
    expect(Math.abs(sunucu.topaclar[0].x - d.topaclar[0].x)).toBeLessThan(UZLASMA.yokSay / 100);
  });
});

describe("tahmin modeli A (paylasilan/sim/tahmin.ts)", () => {
  it("rakipten uzakta, aynı girdilerle kendi topacının tahmini sunucu sim'iyle bit bit aynı", () => {
    const d = macDunyasiKur(profiller(), 5);
    while (d.mac.faz !== "tur") adim(d, [bosGirdi(), bosGirdi()]);
    const g: Girdi = { ...bosGirdi(), yonX: 0, yonZ: -1 };
    const t = topacKopyala(d.topaclar[0]);
    const kopya = structuredClone(d);
    for (let k = 0; k < 30; k++) {
      kendiAdimi(kopya, 0, t, g, kopya.tick + 1 + k);
      adim(d, [g, bosGirdi()]);
    }
    expect(t.x).toBe(d.topaclar[0].x);
    expect(t.z).toBe(d.topaclar[0].z);
    expect(t.vx).toBe(d.topaclar[0].vx);
  });
  it("tur dışında tahmin yok (sunucu gösterilir)", () => {
    const d = macDunyasiKur(profiller(), 5);
    expect(kendiAdimi(d, 0, topacKopyala(d.topaclar[0]), bosGirdi(), 1)).toBe(false);
  });
});

/** Test girdi kaynağı: kuyruk + sıra. */
class Kuyruk implements GirdiKaynagi {
  q: AgGirdisi[] = [];
  seq = 0;
  ekle(yonX = 127, tuslar = 0): void { this.q.push({ seq: ++this.seq, yonX, yonZ: 0, nisanX: 0, nisanZ: 0, yuva: 0, tuslar, degistir: -1 }); }
  al(): AgGirdisi | undefined { return this.q.shift(); }
  get boyut(): number { return this.q.length; }
  temizle(): void { this.q = []; }
}

function turaKadar(y: MacYonetimi, a: Kuyruk, b: Kuyruk): void {
  while (y.dunya.mac.faz !== "tur") { a.ekle(0); b.ekle(0); y.adimla([a, b]); }
}

describe("MacYonetimi: girdi tüketimi", () => {
  it("adım başına bir girdi, ack = sıra; boşlukta taşıma, sonra borç: geç gelen girdiler atlanır (zaman çizelgesi hizalı)", () => {
    const y = new MacYonetimi({ takimlar: [...T], tohum: 3 });
    const a = new Kuyruk(); const b = new Kuyruk();
    turaKadar(y, a, b);
    const ack0 = y.ack[0];
    a.ekle(); b.ekle(); y.adimla([a, b]);
    expect(y.ack[0]).toBe(ack0 + 1);
    // A'nın 5 girdisi gecikir: 5 adım taşıma
    for (let k = 0; k < 5; k++) { b.ekle(); y.adimla([a, b]); }
    expect(y.sayac.tasima).toBe(5);
    // 6 girdi birden gelir: 5'i borçtan atlanır, 1'i uygulanır → ack son sıra
    for (let k = 0; k < 6; k++) a.ekle();
    b.ekle(); y.adimla([a, b]);
    expect(y.ack[0]).toBe(a.seq);
    expect(y.sayac.borc).toBe(5);
    expect(a.boyut).toBe(0);
  });
  it("borç atlamasında tek seferlik düğme (dash) kaybolmaz", () => {
    const y = new MacYonetimi({ takimlar: [...T], tohum: 3 });
    const a = new Kuyruk(); const b = new Kuyruk();
    turaKadar(y, a, b);
    for (let k = 0; k < 3; k++) { b.ekle(); y.adimla([a, b]); }
    a.ekle(127, 2); a.ekle(); a.ekle(); a.ekle(); // ilk girdide dash (TUS.dash = 2)
    b.ekle();
    const r = y.adimla([a, b]);
    expect(r.olaylar.some((o) => o.tur === "dash" && o.i === 0)).toBe(true);
  });
});

describe("MacYonetimi: kopma (flint #10-#12)", () => {
  it("3 sn akış → dondurma; 20 sn → kopan 0-3 hükmen", () => {
    const y = new MacYonetimi({ takimlar: [...T], tohum: 3 });
    const a = new Kuyruk(); const b = new Kuyruk();
    turaKadar(y, a, b);
    y.kopma(1);
    const t0 = y.dunya.tick;
    for (let k = 0; k < KOPMA_ADIM.akis - 1; k++) { a.ekle(); y.adimla([a, null]); }
    expect(y.donmus).toBe(false);
    expect(y.dunya.tick - t0).toBe(KOPMA_ADIM.akis - 1); // sim aktı (kopan nötr)
    a.ekle(); y.adimla([a, null]);
    expect(y.donmus).toBe(true);
    expect(y.dondurmaHakki[1]).toBe(1);
    const tDon = y.dunya.tick;
    for (let k = 0; k < 600; k++) { a.ekle(); y.adimla([a, null]); }
    expect(y.dunya.tick).toBe(tDon); // donuk: sim akmaz
    expect(y.kopmaKalanSn(1)).toBe(Math.ceil((KOPMA_ADIM.toplam - KOPMA_ADIM.akis - 600) / 60));
    for (let k = 0; k < KOPMA_ADIM.toplam; k++) { a.ekle(); y.adimla([a, null]); if (y.bitti) break; }
    expect(y.dunya.mac.macSonucu).toMatchObject({ kazanan: 0, neden: "hukmen", puan: [3, 0] });
  });
  it("20 sn içinde dönerse maç sürer; dondurma hakkı biterse 3 sn sonunda hükmen", () => {
    const y = new MacYonetimi({ takimlar: [...T], tohum: 3 });
    const a = new Kuyruk(); const b = new Kuyruk();
    turaKadar(y, a, b);
    for (let n = 0; n < 2; n++) {
      y.kopma(1);
      for (let k = 0; k < KOPMA_ADIM.akis + 60; k++) { a.ekle(); y.adimla([a, null]); }
      expect(y.donmus).toBe(true);
      y.baglandi(1);
      expect(y.donmus).toBe(false);
      for (let k = 0; k < 10; k++) { a.ekle(); b.ekle(); y.adimla([a, b]); }
    }
    expect(y.dondurmaHakki[1]).toBe(0);
    y.kopma(1);
    for (let k = 0; k < KOPMA_ADIM.akis; k++) { a.ekle(); y.adimla([a, null]); if (y.bitti) break; }
    expect(y.dunya.mac.macSonucu?.neden).toBe("hukmen");
    expect(y.dunya.mac.macSonucu?.kazanan).toBe(0);
  });
  it("ikisi de kopup 20 sn'de dönmezse iptal (kazanan −1)", () => {
    const y = new MacYonetimi({ takimlar: [...T], tohum: 3 });
    const a = new Kuyruk(); const b = new Kuyruk();
    turaKadar(y, a, b);
    y.kopma(0); y.kopma(1);
    for (let k = 0; k < KOPMA_ADIM.toplam + 5; k++) { y.adimla([null, null]); if (y.bitti) break; }
    expect(y.dunya.mac.macSonucu).toMatchObject({ kazanan: -1, neden: "iptal" });
  });
  it("biri dönmez, diğeri de koptuysa ve sonra dönerse: dönmeyen hükmen yenik", () => {
    const y = new MacYonetimi({ takimlar: [...T], tohum: 3 });
    const a = new Kuyruk(); const b = new Kuyruk();
    turaKadar(y, a, b);
    y.kopma(1);
    for (let k = 0; k < 120; k++) { a.ekle(); y.adimla([a, null]); }
    y.kopma(0);
    for (let k = 0; k < KOPMA_ADIM.toplam; k++) { y.adimla([null, null]); if (y.suresiDoldu[1]) break; }
    expect(y.suresiDoldu[1]).toBe(true);
    expect(y.bitti).toBe(false);
    y.baglandi(0);
    expect(y.dunya.mac.macSonucu).toMatchObject({ kazanan: 0, neden: "hukmen" });
  });
});

describe("MacYonetimi: AFK ve teslim", () => {
  it("bağlı ama girdisiz: 10 sn uyarı, 30 sn hükmen", () => {
    const y = new MacYonetimi({ takimlar: [...T], tohum: 3 });
    const a = new Kuyruk(); const b = new Kuyruk();
    turaKadar(y, a, b);
    let uyari = -1;
    for (let k = 0; k < KOPMA_ADIM.afkTerk + 5; k++) {
      a.ekle();
      const r = y.adimla([a, b]);
      if (r.afkUyari.some((u) => u.i === 1) && uyari < 0) uyari = k;
      if (y.bitti) break;
    }
    expect(uyari).toBe(KOPMA_ADIM.afkUyari - 1);
    expect(y.dunya.mac.macSonucu).toMatchObject({ kazanan: 0, neden: "hukmen" });
  });
  it("teslim: 0-3, kayda eylem olarak girer", () => {
    const y = new MacYonetimi({ takimlar: [...T], tohum: 3 });
    const a = new Kuyruk(); const b = new Kuyruk();
    turaKadar(y, a, b);
    const o = y.teslim(0);
    expect(o.some((x) => x.tur === "macBitti")).toBe(true);
    expect(y.dunya.mac.macSonucu).toMatchObject({ kazanan: 1, neden: "teslim", puan: [0, 3] });
    expect(y.kayit.eylemler).toStrictEqual([{ tick: y.dunya.tick, tur: "teslim", i: 0 }]);
  });
});

describe("maç kaydı: sunucu sim'i ≡ yeniden oynatma (flint § 2 madde 6)", () => {
  it("bot girdileri, boşluk, borç, teslim: her 60 adım ve son hash aynı", () => {
    const y = new MacYonetimi({ takimlar: [...T], tohum: 991 });
    const a = new Kuyruk(); const b = new Kuyruk();
    for (let k = 0; k < 3000 && !y.bitti; k++) {
      const d = y.dunya;
      const ga = botGirdisi(d, 0, "kenar", 7);
      const gb = botGirdisi(d, 1, "dolas", 8);
      const ag = (g: Girdi, q: Kuyruk) => q.q.push({ seq: ++q.seq, yonX: Math.round(g.yonX * 127), yonZ: Math.round(g.yonZ * 127), nisanX: Math.round(g.nisanX), nisanZ: Math.round(g.nisanZ), yuva: g.secilenYuva, tuslar: (g.atesle ? 1 : 0) | (g.dash ? 2 : 0) | (g.zipla ? 4 : 0) | (g.dinlen ? 8 : 0) | (g.dusus ? 16 : 0), degistir: g.degistir });
      if (k % 97 < 90) ag(ga, a); // A ara ara gecikir (borç / taşıma)
      ag(gb, b);
      if (k % 97 === 96) for (let j = 0; j < 7; j++) ag(ga, a);
      y.adimla([a, b]);
    }
    if (!y.bitti) y.teslim(1);
    const r = kaydiOynat(JSON.parse(JSON.stringify(y.kayit)));
    expect(r.hashler).toStrictEqual(y.kayit.hashler);
    expect(r.sonHash).toBe(y.kayit.sonHash);
    expect(r.sonHash).toBe(dunyaHash(y.dunya));
    expect(y.sayac.borc).toBeGreaterThan(0);
  });
  it("girdi dizisi biçimi gidiş-dönüş", () => {
    const g: Girdi = { yonX: 0.5, yonZ: -1, nisanX: 12, nisanZ: -40, secilenYuva: 2, atesle: true, dash: false, zipla: true, dinlen: true, degistir: 1, dusus: false };
    expect(diziGirdiye(girdiDiziye(g))).toStrictEqual(g);
  });
});
