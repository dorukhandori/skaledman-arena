import { describe, expect, it } from "vitest";
import { botGirdisi } from "../src/paylasilan/bot/bot.ts";
import { AYAR } from "../src/paylasilan/kurallar/ayar.ts";
import { adim, dunyaKur, macDunyasiKur, type TakimProfilleri } from "../src/paylasilan/sim/Dunya.ts";
import type { Dunya, Olay } from "../src/paylasilan/sim/durum.ts";
import { ENERJI_TAVAN, carpismaEnerjisi, dolumCarpani } from "../src/paylasilan/sim/enerji.ts";
import { type Girdi, bosGirdi } from "../src/paylasilan/sim/Girdi.ts";
import { ULTI_YUVA, telegrafAdimi, yuvaBedeli, yuvaDurumu } from "../src/paylasilan/sim/yetenek.ts";
import { CEKIRDEKLER, RUHLAR, YETENEKLER } from "../src/paylasilan/veri/katalog.ts";
import { type TopacProfili, topacProfiliKur } from "../src/paylasilan/veri/profil.ts";
import { RuhlarDosyaSema, YeteneklerDosyaSema } from "../src/paylasilan/veri/semalar.ts";
import { YETENEK_SIM, ruhYuvalari, sablonBul, yetenekNo } from "../src/paylasilan/veri/yetenekSablon.ts";
import ruhlarHam from "../veri/ruhlar.json";
import yeteneklerHam from "../veri/yetenekler.json";

// D3: Enerji (tuning § 8, § 11), yetenek kademeleri (§ 9), şablonlar (§ 21), flint #14-15, axiom #35.

const P = {
  S: topacProfiliKur("kor-goktasi", "ok-govde", "hafif-disk", "duz-uc"),
  K: topacProfiliKur("kaya-maden", "kalkan-govde", "agir-disk", "igne-uc"),
  D: topacProfiliKur("girdap-maden", "halka-govde", "parlak-disk", "top-uc"),
  B: topacProfiliKur("kasirga-yapay", "savrulan-govde", "denge-disk", "dengeli-uc"),
  SIM: topacProfiliKur("simsek-goktasi", "ok-govde", "alcak-disk", "kusak-ucu"),
  DON: topacProfiliKur("sabir-tasi", "ayaz-govde", "denge-disk", "duz-uc"),
  KUL: topacProfiliKur("kul-cekirdegi", "ok-govde", "hafif-disk", "duz-uc"),
  KK: topacProfiliKur("kor-kalbi", "ok-govde", "hafif-disk", "duz-uc"),
};
const g = (o: Partial<Girdi> = {}): Girdi => ({ ...bosGirdi(), ...o });
const ates = (yuva: number, d: Dunya, i: number): Girdi => g({ atesle: true, secilenYuva: yuva, nisanX: d.topaclar[1 - i]!.x, nisanZ: d.topaclar[1 - i]!.z });

function ileri(d: Dunya, n: number, g0: Girdi = bosGirdi(), g1: Girdi = bosGirdi()): Olay[] {
  const o: Olay[] = [];
  for (let k = 0; k < n; k++) { adim(d, [g0, g1]); o.push(...d.olaylar); }
  return o;
}

/** Tek tur, iki topaç uzakta ve durgun (çarpışma yok), Enerji verilmiş. */
function sakin(a: TopacProfili, b: TopacProfili, enerji = 300): Dunya {
  const d = dunyaKur([a, b], 1);
  d.topaclar[0].x = -150; d.topaclar[1].x = 150;
  d.topaclar[0].enerji = enerji; d.topaclar[1].enerji = enerji;
  return d;
}

describe("veri: şemalar ve şablonlar (tuning § 21)", () => {
  it("29 yetenek ve 21 ruh şemaya uyar", () => {
    expect(YeteneklerDosyaSema.parse(yeteneklerHam).yetenekler).toHaveLength(29);
    expect(RuhlarDosyaSema.parse(ruhlarHam).ruhlar).toHaveLength(21);
  });

  it("her ruhun yetenek id'leri çözülür; her Çekirdeğin ruhu var; yuvalar doğru kademede", () => {
    for (const r of RUHLAR) {
      for (const id of [r.yetenek, r.yetenekAilesi, ...(r.ulti ? [r.ulti] : [])]) expect(() => yetenekNo(id), `${r.id} → ${id}`).not.toThrow();
      const [y1, y2, y3] = ruhYuvalari(r.id);
      expect(YETENEK_SIM[y1]!.kademe).toBe(1);
      expect(YETENEK_SIM[y2]!.kademe).toBe(2);
      if (y3 >= 0) expect(YETENEK_SIM[y3]!.kademe).toBe(3);
    }
    for (const c of CEKIRDEKLER) expect(RUHLAR.some((r) => r.id === c.ruh), c.id).toBe(true);
  });

  it("her yeteneğin bir davranış şablonu var; türetilmiş sayılar sonlu ve sınırlı", () => {
    for (const y of YETENEKLER) expect(() => sablonBul(y), y.id).not.toThrow();
    for (const y of YETENEK_SIM) {
      for (const [k, v] of Object.entries(y)) if (typeof v === "number") expect(Number.isFinite(v), `${y.id}.${k}`).toBe(true);
      expect(y.telegrafSn).toBeGreaterThanOrEqual(0);
      expect(y.sureAdim).toBeGreaterThan(0);
      expect(y.enerjiBedel).toBe(y.kademe === 4 ? 100 : y.kademe * 100);
      expect(y.kendineDeEtki).toBeGreaterThanOrEqual(0);
      expect(y.kendineDeEtki).toBeLessThanOrEqual(1);
    }
    const sablonlar = new Set(YETENEK_SIM.map((y) => y.sablon));
    for (const s of ["atilis", "kavis", "zincir", "zirh", "kontra", "alan", "dalga", "sok", "cekim", "engel", "emis", "taklit"]) expect(sablonlar).toContain(s);
  });

  it("kademe kuralları § 9: telegraf aralıkları, bekleme Yetenek 6 / Özel 10-12, Ulti 0,9 s", () => {
    for (const y of YETENEK_SIM) {
      if (y.kademe === 1) { expect(y.beklemeAdim).toBe(360); expect(y.telegrafSn).toBeLessThanOrEqual(0.5); }
      if (y.kademe === 2) { expect(y.beklemeAdim).toBeGreaterThanOrEqual(600); expect(y.beklemeAdim).toBeLessThanOrEqual(720); }
      if (y.kademe === 3) expect(y.telegrafSn).toBe(0.9);
    }
  });

  it("8 Çekirdeğin hepsi Lv.3'te Yetenek, Özel Yetenek ve Ulti'yi çözer (Kasırga Döküm → Ata Savruğu)", () => {
    expect(CEKIRDEKLER).toHaveLength(8);
    for (const c of CEKIRDEKLER) {
      const p = topacProfiliKur(c.id, "ok-govde", "hafif-disk", "duz-uc");
      expect(p.yetenekler.map((n) => YETENEK_SIM[n]?.kademe), c.id).toEqual([1, 2, 3]);
      const ulti = YETENEKLER[p.yetenekler[2]]!;
      expect(ulti.element, c.id).toBe(c.element);
      const d = sakin(p, P.K, 300);
      d.seviye = [3, 3];
      for (const yuva of [0, 1, 2]) expect(yuvaDurumu(d, 0, yuva), `${c.id} yuva ${yuva}`).toBeNull();
    }
    expect(YETENEKLER[P.B.yetenekler[2]]!.id).toBe("ata-savrugu");
  });
});

describe("Enerji (tuning § 8, § 11)", () => {
  it("pasif 1,5/s; Sıkı Dönüş'te pasif durur; tavan 300 (taşan kaybolur)", () => {
    const d = sakin(P.K, P.D, 0);
    d.topaclar[0].x = 0; d.topaclar[1].x = 0; d.topaclar[1].z = 100; d.topaclar[0].z = -100;
    ileri(d, 60, g(), g({ dinlen: true }));
    expect(d.topaclar[0].enerji).toBeCloseTo(AYAR.enerji.pasifDolum * P.K.uyumCarpani, 6);
    expect(d.topaclar[1].enerji).toBe(0);
    d.topaclar[0].enerji = 299.99;
    ileri(d, 60);
    expect(d.topaclar[0].enerji).toBe(ENERJI_TAVAN);
  });

  it("çarpışma kazanımı clamp(8·Ş/4000, 3, 12), zıt element × 1,25", () => {
    expect(carpismaEnerjisi(100, false)).toBe(3);
    expect(carpismaEnerjisi(3000, false)).toBe(6);
    expect(carpismaEnerjisi(99999, false)).toBe(12);
    expect(carpismaEnerjisi(99999, true)).toBe(15);
  });

  it("uyum: aynı ×1,10 / komşu ×1,00 / diğer ×0,80; Yapay'da ceza yok", () => {
    expect(P.S.uyumCarpani).toBe(1.1); // Kor Çekirdek + Kor Gövde
    expect(topacProfiliKur("kor-goktasi", "savrulan-govde", "hafif-disk", "duz-uc").uyumCarpani).toBe(1.0); // Kasırga komşu
    expect(topacProfiliKur("kor-goktasi", "halka-govde", "hafif-disk", "duz-uc").uyumCarpani).toBe(0.8); // Girdap
    expect(topacProfiliKur("kasirga-yapay", "halka-govde", "denge-disk", "dengeli-uc").uyumCarpani).toBe(1.0); // Yapay: ceza yok
  });

  it("Göktaşı: giriş başına ilk 12 s × 0,8; Kriz Alevi (< %30) × 1,5; Kor Kalbi × 1,75 ve giriş yavaşlığı yok", () => {
    const d = sakin(P.S, P.KK, 0);
    const [t0, t1] = d.topaclar;
    expect(dolumCarpani(t0, P.S)).toBeCloseTo(1.1 * 0.8, 12);
    expect(dolumCarpani(t1, P.KK)).toBeCloseTo(1.1, 12);
    t0.sahadaTick = 12 * 60;
    t0.stamina = 0.2 * P.S.maxStamina;
    t1.stamina = 0.2 * P.KK.maxStamina;
    expect(dolumCarpani(t0, P.S)).toBeCloseTo(1.1 * 1.5, 12);
    expect(dolumCarpani(t1, P.KK)).toBeCloseTo(1.1 * 1.75, 12);
  });

  it("kuşakta 2,0/s, kenarda 1,5/s (büyüğü), Enerji dilimi olayı", () => {
    const d = sakin(P.K, P.D, 99.99);
    d.topaclar[0].x = 0.7 * AYAR.arenaYaricap;
    const o = ileri(d, 1);
    expect(d.topaclar[0].enerji - 99.99).toBeCloseTo((AYAR.enerji.pasifDolum + AYAR.enerji.kusakDolum) * AYAR.dt * P.K.uyumCarpani, 9);
    expect(o.some((x) => x.tur === "enerjiDoldu" && x.i === 0 && x.dilim === 1)).toBe(true);
  });

  it("yakın geçiş: boşluk < 20, bağıl hız > 150, temas yok → iki tarafa +3, bekleme 2 s", () => {
    const d = sakin(P.K, P.D, 0);
    const [a, b] = d.topaclar;
    a.x = 0; a.z = -35; a.vx = 200; b.x = 0; b.z = 35; b.vx = -200;
    ileri(d, 1);
    expect(a.enerji).toBeGreaterThan(3);
    expect(d.yakinGecisBekleme).toBe(120);
  });
});

describe("yetenek kademeleri ve reddi (tuning § 9, flint #14)", () => {
  it("Yetenek: 1 dilim, bekleme 6 s; tekrar basış bekleme/mesgul ile reddedilir", () => {
    const d = sakin(P.S, P.K, 300);
    const o = ileri(d, 1, ates(0, d, 0));
    expect(o.find((x) => x.tur === "yetenekBasladi")).toBeTruthy();
    expect(d.topaclar[0].enerji).toBeLessThanOrEqual(201);
    expect(d.topaclar[0].bekleme1).toBe(360);
    ileri(d, 120);
    const o2 = ileri(d, 1, ates(0, d, 0));
    expect(o2.find((x) => x.tur === "yetenekReddi")).toMatchObject({ neden: "bekleme" });
  });

  it("Enerji yetersiz → ret; Lv.2'de Özel ve Ulti kilitli", () => {
    const d = sakin(P.S, P.K, 150);
    expect(yuvaDurumu(d, 0, 1)).toBe("enerji");
    d.seviye = [2, 2];
    expect(yuvaDurumu(d, 0, 1)).toBe("kilitli");
    expect(yuvaDurumu(d, 0, 2)).toBe("kilitli");
    expect(yuvaDurumu(d, 0, 0)).toBeNull();
    const o = ileri(d, 1, ates(2, d, 0));
    expect(o.find((x) => x.tur === "yetenekReddi")).toMatchObject({ neden: "kilitli" });
  });

  it("eylem stamina'yı 0'a indiremez: Ulti stamina bedeli yetmezse ret", () => {
    const d = sakin(P.S, P.K, 300);
    d.topaclar[0].stamina = 0.1 * P.S.maxStamina; // Ata Közü bedeli %20
    expect(yuvaDurumu(d, 0, ULTI_YUVA)).toBe("stamina");
  });

  it("Yapay Uyum: ilk yetenek −100 Enerji (alt sınır 50), yalnız bir kez", () => {
    const d = sakin(P.B, P.K, 300);
    expect(yuvaBedeli(d.topaclar[0], P.B, 0)).toBe(50);
    expect(yuvaBedeli(d.topaclar[0], P.B, 1)).toBe(100);
    ileri(d, 1, ates(1, d, 0));
    expect(d.topaclar[0].enerji).toBeCloseTo(200, 0);
    expect(yuvaBedeli(d.topaclar[0], P.B, 0)).toBe(100);
  });

  it("Ulti maçta bir kez; ulti süresince ve +1 s Enerji dolmaz", () => {
    const d = sakin(P.S, P.K, 300);
    d.topaclar[1].enerji = 0;
    ileri(d, 1, ates(ULTI_YUVA, d, 0));
    expect(d.ultiKullanildi[0]).toBe(1);
    const y = YETENEK_SIM[P.S.yetenekler[2]]!;
    const kilit = telegrafAdimi(y, d.topaclar[0], P.S) + y.sureAdim + 60;
    expect(d.ultiKilit).toBe(kilit);
    ileri(d, kilit - 2);
    expect(d.topaclar[1].enerji).toBe(0);
    ileri(d, 5);
    expect(d.topaclar[1].enerji).toBeGreaterThan(0);
    d.topaclar[0].enerji = 300;
    const o = ileri(d, 1, ates(ULTI_YUVA, d, 0));
    expect(o.find((x) => x.tur === "yetenekReddi")).toMatchObject({ neden: "ultiKullanildi" });
  });

  it("rakip Ulti sürerken Ulti reddedilir; aynı adımda iki Ulti ikisi de çalışır", () => {
    const d = sakin(P.S, P.D, 300);
    ileri(d, 1, ates(ULTI_YUVA, d, 0));
    const o = ileri(d, 1, bosGirdi(), ates(ULTI_YUVA, d, 1));
    expect(o.find((x) => x.tur === "yetenekReddi")).toMatchObject({ i: 1, neden: "rakipUlti" });
    const e = sakin(P.S, P.D, 300);
    const o2 = ileri(e, 1, ates(ULTI_YUVA, e, 0), ates(ULTI_YUVA, e, 1));
    expect(o2.filter((x) => x.tur === "yetenekBasladi")).toHaveLength(2);
    // sıra bağımsız: taraflar yer değiştirince de ikisi çalışır
    const f = sakin(P.D, P.S, 300);
    expect(ileri(f, 1, ates(ULTI_YUVA, f, 0), ates(ULTI_YUVA, f, 1)).filter((x) => x.tur === "yetenekBasladi")).toHaveLength(2);
  });

  it("telegraf: kaçılabilir yetenekte alt sınır 0,3 s; Kriz Alevi × 0,85 (alt sınırın üstünde)", () => {
    const d = sakin(P.S, P.K, 300);
    const kor = YETENEK_SIM[yetenekNo("kor-atilisi")]!; // veri 0,2 s
    expect(telegrafAdimi(kor, d.topaclar[0], P.S)).toBe(18);
    const koz = YETENEK_SIM[yetenekNo("kozyagmuru")]!; // 0,6 s
    expect(telegrafAdimi(koz, d.topaclar[0], P.S)).toBe(36);
    d.topaclar[0].stamina = 0.2 * P.S.maxStamina;
    expect(telegrafAdimi(koz, d.topaclar[0], P.S)).toBe(Math.round(0.6 * 0.85 * 60));
    const zirh = YETENEK_SIM[yetenekNo("buz-zirhi")]!; // kendine etki: 0,2 s kalır
    expect(telegrafAdimi(zirh, d.topaclar[0], P.DON)).toBe(12);
    for (const y of YETENEK_SIM) if (y.kacilabilir) expect(telegrafAdimi(y, d.topaclar[0], P.K)).toBeGreaterThanOrEqual(18);
  });

  it("Kararma: Karanlık Kara yetenek +25", () => {
    const d = sakin(P.KUL, P.K, 300);
    ileri(d, 1, ates(1, d, 0));
    expect(d.kararma).toEqual([25, 0]);
  });
});

describe("kesinti (flint #15)", () => {
  it("hasar telegrafı kesmez; Durma keser; tur kararından sonra alan ve engel kalmaz", () => {
    const d = sakin(P.D, P.K, 300);
    ileri(d, 1, ates(1, d, 0)); // Dip Girdabı (telegraf 0,6 s)
    d.topaclar[0].stamina -= 30; // hasar
    ileri(d, 5);
    expect(d.topaclar[0].yetenekFaz).toBe(1);
    ileri(d, 40);
    expect(d.alanlar[0]).not.toBeNull();
    ileri(d, 1, bosGirdi(), ates(1, d, 1)); // Yontu Siperi
    ileri(d, 40);
    expect(d.engeller.length).toBeGreaterThan(0);
    d.topaclar[1].stamina = 0.001;
    ileri(d, 2);
    expect(d.mac.sonuc?.tur).toBe("durma");
    expect(d.alanlar).toEqual([null, null]);
    expect(d.engeller).toHaveLength(0);
    expect(d.topaclar[0].yetenekFaz).toBe(0);
  });

  it("telegraf sırasında Ring Out → yetenek etkisiz söner", () => {
    const d = sakin(P.S, P.K, 300);
    ileri(d, 1, ates(1, d, 0));
    const t = d.topaclar[0];
    t.x = -205; t.vx = -420;
    const o = ileri(d, 2);
    expect(o.some((x) => x.tur === "ringOut")).toBe(true);
    expect(o.some((x) => x.tur === "yetenekBitti" && x.kesildi)).toBe(true);
    expect(o.some((x) => x.tur === "yetenekEtki")).toBe(false);
  });
});

describe("şablonlar sim'de: her ruhun üç yuvası sonlu ve sınırlı sonuç verir", () => {
  const ruhlu = CEKIRDEKLER.map((c) => topacProfiliKur(c.id, "ok-govde", "denge-disk", "dengeli-uc"));
  for (const p of ruhlu) {
    it(`${p.parcalar.cekirdek}: yuva 1-3 + bot maçı, NaN / sınır dışı yok`, () => {
      for (let yuva = 0; yuva < 3; yuva++) {
        if (p.yetenekler[yuva]! < 0) continue;
        const d = sakin(p, P.D, 300);
        d.topaclar[0].x = -60; d.topaclar[1].x = 60;
        const o = ileri(d, 1, ates(yuva, d, 0));
        expect(o.some((x) => x.tur === "yetenekBasladi"), `yuva ${yuva}`).toBe(true);
        for (let k = 0; k < 400 && !d.mac.sonuc; k++) {
          adim(d, [g({ yonX: 1, nisanX: d.topaclar[1].x, nisanZ: d.topaclar[1].z }), bosGirdi()]);
          for (const t of d.topaclar) {
            for (const v of [t.x, t.z, t.vx, t.vz, t.stamina, t.enerji, t.tik]) expect(Number.isFinite(v)).toBe(true);
            expect(t.enerji).toBeGreaterThanOrEqual(0);
            expect(t.enerji).toBeLessThanOrEqual(ENERJI_TAVAN);
            expect(Math.hypot(t.vx, t.vz)).toBeLessThanOrEqual(AYAR.vMutlak + 1e-9);
          }
        }
      }
    });
  }

  it("bot yetenekleri kullanır (tam maç), determinizm: aynı tohum aynı sonuç", () => {
    const A: TakimProfilleri = [P.S, P.K, P.D];
    const B: TakimProfilleri = [P.B, P.SIM, P.DON];
    const kos = () => {
      const d = macDunyasiKur([A, B], 5);
      let n = 0;
      while (!d.mac.macSonucu && d.tick < 200 * 60) {
        adim(d, [botGirdisi(d, 0, "kenar", 1), botGirdisi(d, 1, "dolas", 2)]);
        for (const o of d.olaylar) if (o.tur === "yetenekBasladi") n++;
      }
      return { n, s: d.mac.macSonucu, tick: d.tick };
    };
    const a = kos();
    expect(a.n).toBeGreaterThan(0);
    expect(kos()).toStrictEqual(a);
  });
});
