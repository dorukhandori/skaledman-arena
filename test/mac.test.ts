import { describe, expect, it } from "vitest";
import { BOT_KADEMELERI, botGirdisi } from "../src/paylasilan/bot/bot.ts";
import { AYAR } from "../src/paylasilan/kurallar/ayar.ts";
import { adim, dunyaKur, macDunyasiKur, type TakimProfilleri } from "../src/paylasilan/sim/Dunya.ts";
import { type Girdi, bosGirdi } from "../src/paylasilan/sim/Girdi.ts";
import { TOPAC_DURUM, type BitisTuru, type Dunya, type Olay } from "../src/paylasilan/sim/durum.ts";
import { MAC_ADIM, dogumNoktasi, inisNoktasi, komsuElementMi, teslimEt } from "../src/paylasilan/sim/mac.ts";
import { type TopacProfili, topacProfiliKur } from "../src/paylasilan/veri/profil.ts";

// D2 maç akışı (flint § 1 test sütunu, tuning § 10). Kurulumlar adım fiziği üzerinden: durum alanları yazılıp `adim` koşulur.

const P = {
  S: topacProfiliKur("kor-goktasi", "ok-govde", "hafif-disk", "duz-uc"),
  K: topacProfiliKur("kaya-maden", "kalkan-govde", "agir-disk", "igne-uc"),
  D: topacProfiliKur("girdap-maden", "halka-govde", "parlak-disk", "top-uc"),
  B: topacProfiliKur("kasirga-yapay", "savrulan-govde", "denge-disk", "dengeli-uc"),
};
const TAKIM_A: TakimProfilleri = [P.K, P.S, P.D];
const TAKIM_B: TakimProfilleri = [P.K, P.B, P.S];
const g = (o: Partial<Girdi> = {}): Girdi => ({ ...bosGirdi(), ...o });

/** Geri sayımı atlanmış maç: faz `tur`, ilk tur. */
function macTur(a: TakimProfilleri = TAKIM_A, b: TakimProfilleri = TAKIM_B, tohum = 1): Dunya {
  const d = macDunyasiKur([a, b], tohum);
  d.mac.faz = "tur";
  d.mac.kalanTick = 0;
  d.mac.turNo = 1;
  return d;
}

function ileri(d: Dunya, n: number, g0: Girdi = bosGirdi(), g1: Girdi = bosGirdi()): Olay[] {
  const o: Olay[] = [];
  for (let k = 0; k < n; k++) { adim(d, [g0, g1]); o.push(...d.olaylar); }
  return o;
}

/** Tur arası bitene kadar boş girdiyle ilerlet. */
function turaKadar(d: Dunya, sinir = 2000): void {
  for (let k = 0; k < sinir && d.mac.faz === "turArasi"; k++) adim(d, [bosGirdi(), bosGirdi()]);
}

/** Topaç i'ye bu adımda `tur` bitişini hazırla (adım fiziğiyle oluşur). */
function hazirla(d: Dunya, i: number, tur: BitisTuru): void {
  const t = d.topaclar[i]!;
  const s = i === 0 ? -1 : 1;
  if (tur === "ringOut") { t.x = s * 205; t.z = 0; t.vx = s * 420; t.vz = 0; }
  if (tur === "parcalanma") t.tik = 99;
  if (tur === "durma") t.stamina = 0.01;
}

const TURLER: BitisTuru[] = ["durma", "ringOut", "parcalanma"];
const ONCELIK: Record<BitisTuru, number> = { durma: 0, ringOut: 1, parcalanma: 2 };

describe("bitiş tablosu (flint #2, #5, #17): 3×3 × aynı/farklı topaç = 18 hücre", () => {
  for (const kip of ["mac", "tekTur"] as const) {
    for (const a of TURLER) for (const b of TURLER) {
      it(`${kip} · aynı topaç: ${a} + ${b}`, () => {
        const d = kip === "mac" ? macTur() : dunyaKur([P.S, P.K], 1);
        hazirla(d, 1, a);
        hazirla(d, 1, b);
        ileri(d, 1);
        const beklenen = ONCELIK[a] >= ONCELIK[b] ? a : b;
        expect(d.mac.sonuc).toMatchObject({ tur: beklenen, kazanan: 0, kaybeden: 1, puan: AYAR.puan[beklenen] });
        expect(d.mac.puan).toStrictEqual([AYAR.puan[beklenen], 0]);
        if (kip === "mac") {
          expect(d.takimlar![1].elenen).toBe(1);
          expect(d.takimlar![0].elenen).toBe(0);
          expect(d.mac.faz).toBe("turArasi");
        }
      });
      it(`${kip} · farklı topaç: ${a} | ${b} → berabere`, () => {
        const d = kip === "mac" ? macTur() : dunyaKur([P.S, P.K], 1);
        hazirla(d, 0, a);
        hazirla(d, 1, b);
        ileri(d, 1);
        expect(d.mac.sonuc).toMatchObject({ tur: "berabere", kazanan: -1, puan: 0 });
        expect(d.mac.puan).toStrictEqual([0, 0]);
        expect(d.topaclar.every((t) => t.durum !== TOPAC_DURUM.aktif)).toBe(true);
        if (kip === "mac") expect([d.takimlar![0].elenen, d.takimlar![1].elenen]).toStrictEqual([1, 1]);
      });
    }
  }
});

describe("maç akışı", () => {
  it("berabere simetrisi (A-B / B-A): taraflar ve bitişler yer değişince sonuç aynı", () => {
    for (const a of TURLER) for (const b of TURLER) {
      const d1 = macTur(TAKIM_A, TAKIM_B);
      const d2 = macTur(TAKIM_B, TAKIM_A);
      hazirla(d1, 0, a); hazirla(d1, 1, b);
      hazirla(d2, 0, b); hazirla(d2, 1, a);
      ileri(d1, 1); ileri(d2, 1);
      expect(d2.mac.sonuc).toStrictEqual(d1.mac.sonuc);
      expect(d2.mac.puan).toStrictEqual(d1.mac.puan);
      expect([d2.takimlar![1].elenen, d2.takimlar![0].elenen]).toStrictEqual([d1.takimlar![0].elenen, d1.takimlar![1].elenen]);
    }
  });

  it("geri sayım: Hazır 2 s + 3-2-1 = 300 adım, topaçlar girdiye rağmen yerinde; sonra tur", () => {
    const d = macDunyasiKur([TAKIM_A, TAKIM_B], 3);
    const x0 = d.topaclar.map((t) => t.x);
    const o = ileri(d, MAC_ADIM.geriSayim - 1, g({ yonX: 1, dash: true }), g({ yonX: -1 }));
    expect(d.mac.faz).toBe("geriSayim");
    expect(d.topaclar.map((t) => t.x)).toStrictEqual(x0);
    expect(o).toHaveLength(0);
    const o2 = ileri(d, 1);
    expect(d.mac.faz).toBe("tur");
    expect(o2.some((x) => x.tur === "turBasladi")).toBe(true);
    expect(d.tick).toBe(300);
  });

  it("Durma sönümü sırasında olay yok sayılır (flint #6): rakip kendini düşürse de sonuç Durma", () => {
    const d = macTur();
    hazirla(d, 1, "durma");
    ileri(d, 1);
    expect(d.mac.sonuc?.tur).toBe("durma");
    d.topaclar[0].x = -205; d.topaclar[0].vx = -500;
    const o = ileri(d, AYAR.durmaSonumu);
    expect(o.some((x) => x.tur === "ringOut")).toBe(false);
    expect(d.mac.sonuc?.tur).toBe("durma");
    expect(d.mac.puan).toStrictEqual([1, 0]);
  });

  it("tur arası: kaybeden 1/2/3 ile seçer, kazanan +%20 ve tık 0, iki topaç doğumda, yeni topaç giriş koruması", () => {
    const d = macTur();
    d.topaclar[0].stamina = P.K.maxStamina * 0.5;
    d.topaclar[0].tik = 2.5;
    hazirla(d, 1, "parcalanma");
    ileri(d, 1);
    expect(d.mac.faz).toBe("turArasi");
    expect(d.topaclar[0].stamina).toBeCloseTo(P.K.maxStamina * (0.5 + AYAR.mac.kazananIyilesme), 0);
    expect(d.topaclar[0].tik).toBe(0);
    expect(d.takimlar![1].secim).toBe(-2);
    // seçim kutlama sırasında da alınır; tur kutlama bitmeden başlamaz
    const o = ileri(d, 1, bosGirdi(), g({ degistir: 2 }));
    expect(o.some((x) => x.tur === "secim" && x.uye === 2 && !x.otomatik)).toBe(true);
    ileri(d, MAC_ADIM.kutlama - 3);
    expect(d.mac.faz).toBe("turArasi");
    ileri(d, 2);
    expect(d.mac.faz).toBe("tur");
    expect(d.takimlar![1].aktif).toBe(2);
    expect(d.profiller[1]).toBe(TAKIM_B[2]);
    expect(d.topaclar[1].koruma).toBe(MAC_ADIM.koruma);
    expect(d.topaclar[1].stamina).toBe(TAKIM_B[2].maxStamina);
    expect(d.topaclar[1].tik).toBe(0);
    for (let i = 0; i < 2; i++) expect([d.topaclar[i]!.x, d.topaclar[i]!.z]).toStrictEqual([AYAR.dogum[i]!.x, AYAR.dogum[i]!.z]);
    // kazanan korumasız
    expect(d.topaclar[0].koruma).toBe(0);
  });

  it("seçim yapılmazsa 1,2 + 4 s sonra sıradaki otomatik; elenen seçilemez", () => {
    const d = macTur();
    hazirla(d, 1, "durma");
    ileri(d, 1);
    // elenen üye (0) seçilmek istenir: yok sayılır
    ileri(d, 10, bosGirdi(), g({ degistir: 0 }));
    expect(d.takimlar![1].secim).toBe(-2);
    ileri(d, MAC_ADIM.kutlama + MAC_ADIM.secim);
    expect(d.mac.faz).toBe("tur");
    expect(d.takimlar![1].aktif).toBe(1);
  });

  it("giriş koruması: yeni topaç 1,0 s çarpışmaz, sonra çarpışır", () => {
    const d = macTur();
    hazirla(d, 1, "parcalanma");
    ileri(d, 1);
    turaKadar(d);
    d.topaclar[0].x = -31; d.topaclar[1].x = 31; d.topaclar[0].vx = 250; d.topaclar[1].vx = -250;
    const o = ileri(d, 10);
    expect(o.some((x) => x.tur === "carpisma")).toBe(false);
    ileri(d, MAC_ADIM.koruma);
    d.topaclar[0].x = -31; d.topaclar[1].x = 31; d.topaclar[0].vx = 250; d.topaclar[1].vx = -250; d.topaclar[0].z = 0; d.topaclar[1].z = 0;
    expect(ileri(d, 3).some((x) => x.tur === "carpisma")).toBe(true);
  });

  it("komşu element devralma: yeni topaç +40 Enerji (Kor → Kasırga komşu, Kaya → Kor değil)", () => {
    expect(komsuElementMi("kor", "kasirga")).toBe(true);
    expect(komsuElementMi("don", "kor")).toBe(true);
    expect(komsuElementMi("kaya", "kor")).toBe(false);
    // takım B: Kaya(0) → Kasırga(1): Kaya-Kasırga karşıt, devir yok; Kasırga(1) → Kor(2): komşu, +40
    const d = macTur();
    hazirla(d, 1, "durma");
    ileri(d, 1);
    turaKadar(d);
    expect(d.takimlar![1].aktif).toBe(1);
    expect(d.topaclar[1].enerji).toBe(0);
    hazirla(d, 1, "durma");
    ileri(d, 1);
    turaKadar(d);
    expect(d.takimlar![1].aktif).toBe(2);
    expect(d.topaclar[1].enerji).toBe(AYAR.mac.enerjiKomsuDevir);
  });

  it("3 ardışık berabere → iki takım tükenir → ani ölüm (flint #4); ilk bitiş maçı bitirir", () => {
    const d = macTur();
    for (let k = 0; k < 3; k++) {
      expect(d.mac.faz).toBe("tur");
      hazirla(d, 0, "durma"); hazirla(d, 1, "durma");
      ileri(d, 1);
      expect(d.mac.sonuc?.tur).toBe("berabere");
      turaKadar(d);
    }
    expect(d.mac.aniOlum).toBe(1);
    expect(d.mac.macSonucu).toBeNull();
    expect(d.mac.faz).toBe("tur");
    hazirla(d, 1, "parcalanma");
    ileri(d, 1);
    expect(d.mac.macSonucu).toMatchObject({ kazanan: 0, neden: "aniOlum" });
    expect(d.mac.faz).toBe("bitti");
  });

  it("takımın 3. elenmesi maçı kaybettirir (puandan bağımsız: berabere + Durma ile)", () => {
    const d = macTur();
    hazirla(d, 0, "durma"); hazirla(d, 1, "durma");
    ileri(d, 1); turaKadar(d);
    hazirla(d, 0, "durma"); hazirla(d, 1, "durma");
    ileri(d, 1); turaKadar(d);
    hazirla(d, 1, "durma");
    ileri(d, 1);
    expect(d.mac.macSonucu).toMatchObject({ kazanan: 0, neden: "tukenme", puan: [1, 0] });
  });

  it("ilk 3 puan kazanır (Ring Out 2 + Durma 1)", () => {
    const d = macTur();
    hazirla(d, 1, "ringOut");
    ileri(d, 1); turaKadar(d);
    hazirla(d, 1, "durma");
    ileri(d, 1);
    expect(d.mac.macSonucu).toMatchObject({ kazanan: 0, neden: "puan", puan: [3, 0] });
  });

  it("self-düşüş rakibe puan (Ring Out 2)", () => {
    const d = macTur();
    hazirla(d, 0, "ringOut");
    ileri(d, 1);
    expect(d.mac.sonuc).toMatchObject({ tur: "ringOut", kazanan: 1 });
    expect(d.mac.puan).toStrictEqual([0, 2]);
  });

  it("90 s: puan farklıysa çok olan kazanır; saat tur arasında durmaz", () => {
    const d = macTur();
    hazirla(d, 1, "durma");
    ileri(d, 1);
    const s0 = d.mac.saat;
    turaKadar(d);
    expect(d.mac.saat).toBeGreaterThan(s0 + MAC_ADIM.kutlama);
    d.mac.saat = MAC_ADIM.macSuresi - 1;
    ileri(d, 1);
    expect(d.mac.macSonucu).toMatchObject({ kazanan: 0, neden: "surePuan" });
  });

  it("pasif bot çifti → 90 + 30 s'de sonuç var (sonsuz maç yok); ani ölümde R daralır, erime artar", () => {
    const sonsuz = (p: TopacProfili): TopacProfili => ({ ...p, sim: { ...p.sim, erime: 0 } });
    const a: TakimProfilleri = [sonsuz(P.K), sonsuz(P.S), sonsuz(P.D)];
    const b: TakimProfilleri = [sonsuz(P.K), sonsuz(P.B), sonsuz(P.S)];
    const d = macDunyasiKur([a, b], 5);
    let aniOlumGoruldu = false;
    for (let k = 0; k < 9000 && !d.mac.macSonucu; k++) {
      adim(d, [botGirdisi(d, 0, "pasif", 1), botGirdisi(d, 1, "pasif", 2)]);
      if (d.olaylar.some((o) => o.tur === "aniOlum")) { aniOlumGoruldu = true; expect(d.mac.saat).toBe(MAC_ADIM.macSuresi); }
    }
    expect(aniOlumGoruldu).toBe(true);
    expect(d.mac.macSonucu).not.toBeNull();
    expect(d.mac.saat).toBe(MAC_ADIM.macSuresi + MAC_ADIM.aniOlum);
    expect(d.mac.saat).toBeLessThanOrEqual(MAC_ADIM.mutlak);
    expect(d.arenaYaricap).toBeCloseTo(AYAR.arenaYaricap * AYAR.mac.aniOlumTabanR, 9);
    expect(["sureStamina", "yaziTura"]).toContain(d.mac.macSonucu!.neden);
    // tekrar aynı tohum → aynı sonuç
    const e = macDunyasiKur([a, b], 5);
    for (let k = 0; k < 9000 && !e.mac.macSonucu; k++) adim(e, [bosGirdi(), bosGirdi()]);
    expect(e.mac.macSonucu).toStrictEqual(d.mac.macSonucu);
  });

  it("süre kararı yedek sırası: stamina oranı eşit, puan eşit → tohumlu yazı-tura (tekrarlanabilir)", () => {
    const kur = (tohum: number) => {
      const d = macTur(TAKIM_A, TAKIM_A, tohum);
      d.mac.aniOlum = 1;
      d.mac.aniOlumTick = MAC_ADIM.aniOlum - 1;
      ileri(d, 1);
      return d.mac.macSonucu;
    };
    expect(kur(4)).toMatchObject({ neden: "yaziTura" });
    expect(kur(4)).toStrictEqual(kur(4));
    const kazananlar = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((t) => kur(t)!.kazanan));
    expect(kazananlar.size).toBe(2);
  });

  it("ani ölüm 30 s'de bitmezse toplam stamina oranı yüksek olan kazanır", () => {
    const d = macTur();
    d.mac.saat = MAC_ADIM.macSuresi - 1;
    ileri(d, 1);
    expect(d.mac.aniOlum).toBe(1);
    d.topaclar[1].stamina = 50;
    d.mac.aniOlumTick = MAC_ADIM.aniOlum - 1;
    ileri(d, 1);
    expect(d.mac.macSonucu).toMatchObject({ kazanan: 0, neden: "sureStamina" });
  });

  it("geri çek: yalnız stamina < %25; 2,0 s savunmasız (vuruş alınır, kb × 1,5), sonra swap; iyileşme yok; bekleme 20 s", () => {
    const kur = (geriCek: boolean) => {
      const d = macTur();
      const t0 = d.topaclar[0];
      t0.stamina = d.profiller[0].maxStamina * 0.2;
      if (geriCek) ileri(d, 1, g({ degistir: 2 }));
      else ileri(d, 1);
      t0.x = 0; t0.z = 0; t0.vx = 0; t0.vz = 0;
      const t1 = d.topaclar[1];
      t1.x = 61; t1.z = 0; t1.vx = -300; t1.vz = 0;
      const o = ileri(d, 1).find((x) => x.tur === "carpisma");
      return { d, o };
    };
    const normal = kur(false);
    const cekilen = kur(true);
    expect(cekilen.d.topaclar[0].geriCekKalan).toBeGreaterThan(0);
    if (cekilen.o?.tur !== "carpisma" || normal.o?.tur !== "carpisma") throw new Error("çarpışma yok");
    expect(cekilen.o.taraflar[0].hasar).toBeGreaterThan(0);
    expect(cekilen.o.taraflar[0].hasar).toBeCloseTo(normal.o.taraflar[0].hasar, 9);
    expect(Math.abs(cekilen.d.topaclar[0].vx) / Math.abs(normal.d.topaclar[0].vx)).toBeCloseTo(AYAR.mac.geriCekKb, 1);

    const d = cekilen.d;
    const kalanStamina = d.topaclar[0].stamina;
    ileri(d, MAC_ADIM.geriCek);
    expect(d.takimlar![0].aktif).toBe(2);
    expect(d.takimlar![0].uyeler[0].stamina).toBeLessThanOrEqual(kalanStamina);
    expect(d.takimlar![0].uyeler[0].elendi).toBe(0);
    expect(d.takimlar![0].geriCekBekleme).toBeGreaterThan(MAC_ADIM.geriCekBekleme - 5);
    expect(d.topaclar[0].koruma).toBeGreaterThan(0);

    // stamina %50'de geri çek isteği yok sayılır
    const e = macTur();
    e.topaclar[0].stamina = e.profiller[0].maxStamina * 0.5;
    expect(ileri(e, 1, g({ degistir: 1 })).some((x) => x.tur === "geriCek")).toBe(false);
  });

  it("geri çek sırasında biterse tur biter (geri çek başarısız); çekilen üye sonra geri dönebilir", () => {
    const d = macTur();
    d.topaclar[0].stamina = d.profiller[0].maxStamina * 0.2;
    ileri(d, 1, g({ degistir: 1 }));
    d.topaclar[0].stamina = 0.01;
    ileri(d, 1);
    expect(d.mac.sonuc).toMatchObject({ tur: "durma", kaybeden: 0 });
    expect(d.topaclar[0].geriCekKalan).toBe(0);

    // çekilen üye döner: 0 → 1 geri çek, sonra 1 → 0 (bekleme bittikten sonra)
    const e = macTur();
    e.topaclar[0].stamina = e.profiller[0].maxStamina * 0.2;
    ileri(e, 1, g({ degistir: 1 }));
    ileri(e, MAC_ADIM.geriCek);
    expect(e.takimlar![0].aktif).toBe(1);
    const saklanan = e.takimlar![0].uyeler[0].stamina;
    e.takimlar![0].geriCekBekleme = 0;
    e.topaclar[0].stamina = e.profiller[0].maxStamina * 0.2;
    e.topaclar[0].koruma = 0;
    ileri(e, 1, g({ degistir: 0 }));
    ileri(e, MAC_ADIM.geriCek);
    expect(e.takimlar![0].aktif).toBe(0);
    expect(e.topaclar[0].stamina).toBeLessThanOrEqual(saklanan);
  });

  it("iniş çakışması: rakip doğum noktasındaysa deterministik kaydırma, en az inisMesafesi uzak", () => {
    const d = macTur();
    const s = dogumNoktasi(d, 0);
    d.topaclar[1].x = s.x; d.topaclar[1].z = s.z;
    const a = inisNoktasi(d, 0);
    const b = inisNoktasi(structuredClone(d), 0);
    expect(a).toStrictEqual(b);
    expect(Math.sqrt((a.x - s.x) ** 2 + (a.z - s.z) ** 2)).toBeGreaterThanOrEqual(AYAR.mac.inisMesafesi);
    // rakip uzaktaysa doğum noktası
    d.topaclar[1].x = 150; d.topaclar[1].z = 0;
    expect(inisNoktasi(d, 0)).toStrictEqual(s);
    // tam geri çekte de aynı: swap sonrası konum kaydırılmış
    const e = macTur();
    e.topaclar[0].stamina = e.profiller[0].maxStamina * 0.2;
    ileri(e, 1, g({ degistir: 1 }));
    for (let k = 0; k < MAC_ADIM.geriCek; k++) {
      e.topaclar[1].x = s.x; e.topaclar[1].z = s.z; e.topaclar[1].vx = 0; e.topaclar[1].vz = 0;
      adim(e, [bosGirdi(), bosGirdi()]);
    }
    expect(e.takimlar![0].aktif).toBe(1);
    expect(Math.sqrt((e.topaclar[0].x - s.x) ** 2 + (e.topaclar[0].z - s.z) ** 2)).toBeGreaterThanOrEqual(AYAR.mac.inisMesafesi - 1);
  });

  it("dash ve sekme stamina'yı 0'a indiremez (flint #20)", () => {
    const d = macTur();
    d.topaclar[0].stamina = AYAR.sekmeStamina + AYAR.eylemStaminaPayi - 0.5;
    expect(ileri(d, 1, g({ zipla: true })).some((x) => x.tur === "sekme")).toBe(false);
    d.topaclar[0].stamina = d.profiller[0].sim.dashMaliyet + AYAR.eylemStaminaPayi - 0.5;
    expect(ileri(d, 1, g({ dash: true, yonX: 1 })).some((x) => x.tur === "dash")).toBe(false);
    d.topaclar[0].stamina = 100;
    expect(ileri(d, 1, g({ zipla: true })).some((x) => x.tur === "sekme")).toBe(true);
  });

  it("teslim: anında 0-3", () => {
    const d = macTur();
    hazirla(d, 1, "ringOut");
    ileri(d, 1);
    teslimEt(d, 0);
    expect(d.mac.macSonucu).toMatchObject({ kazanan: 1, neden: "teslim", puan: [0, 3] });
    expect(d.mac.faz).toBe("bitti");
  });

  it("takımda 3 farklı Çekirdek zorunlu", () => {
    expect(() => macDunyasiKur([[P.K, P.K, P.S], TAKIM_B], 1)).toThrow();
  });
});

describe("bot kademeleri", () => {
  it("saf: aynı dünya ve tohum → aynı girdi (her kademe)", () => {
    const d = macTur();
    ileri(d, 40);
    for (const k of BOT_KADEMELERI) expect(botGirdisi(d, 1, k, 9)).toStrictEqual(botGirdisi(structuredClone(d), 1, k, 9));
  });

  it("her kademe bota karşı tam maçı bitirir (≤ 120 s), tur arası seçimi girdiyle yapar", () => {
    for (const k of ["dolas", "kenar", "dayaniklilik"] as const) {
      const d = macDunyasiKur([TAKIM_A, TAKIM_B], 21);
      let secim = 0;
      for (let n = 0; n < 8000 && !d.mac.macSonucu; n++) {
        adim(d, [botGirdisi(d, 0, k, 1), botGirdisi(d, 1, "kenar", 2)]);
        secim += d.olaylar.filter((o) => o.tur === "secim" && !o.otomatik).length;
      }
      expect(d.mac.macSonucu, k).not.toBeNull();
      expect(d.mac.saat).toBeLessThanOrEqual(MAC_ADIM.mutlak);
      expect(secim + d.mac.turNo).toBeGreaterThan(0);
    }
  });

  it("Antrenman Kuklası: ilk 10 s hareketsiz, sonra yavaş", () => {
    const d = macTur();
    expect(botGirdisi(d, 1, "kukla", 1).yonX).toBe(0);
    d.tick = 11 * 60;
    const k = botGirdisi(d, 1, "kukla", 1);
    expect(Math.sqrt(k.yonX * k.yonX + k.yonZ * k.yonZ)).toBeCloseTo(0.4, 9);
  });
});
