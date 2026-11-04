import { describe, expect, it } from "vitest";
import { botGirdisi } from "../src/paylasilan/bot/bot.ts";
import { AYAR } from "../src/paylasilan/kurallar/ayar.ts";
import { adim, dunyaKur } from "../src/paylasilan/sim/Dunya.ts";
import { BASARIMLAR, BASLANGIC_SETLERI, CEKIRDEKLER, DISKLER, GOVDELER, PARCALAR, RUHLAR, UCLAR, YETENEKLER, parcaBul } from "../src/paylasilan/veri/katalog.ts";
import { type SekizParametre, type TopacProfili, setProfili, topacProfiliKur } from "../src/paylasilan/veri/profil.ts";

// veri/*.json zod şemaları (tuning § 21) ve parçalardan profil (§ 13).

describe("veri dosyaları", () => {
  it("dört dosya şemaya uyar; sayılar tuning'deki gibi", () => {
    expect(GOVDELER.length).toBe(8);
    expect(DISKLER.length).toBe(5);
    expect(UCLAR.length).toBe(6);
    expect(CEKIRDEKLER.length).toBe(8);
    expect(RUHLAR.length).toBe(21);
    expect(YETENEKLER.length).toBe(29);
    expect(BASARIMLAR.length).toBe(46);
  });

  it("parça kimlikleri tekil; başlangıç setleri ve çekirdek ruhları geçerli", () => {
    const ids = PARCALAR.parcalar.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of BASLANGIC_SETLERI) for (const k of ["cekirdek", "govde", "disk", "uc"] as const) expect(parcaBul(s[k]).tur).toBe(k);
    const ruhIds = new Set(RUHLAR.map((r) => r.id));
    for (const c of CEKIRDEKLER) expect(ruhIds.has(c.ruh)).toBe(true);
    const yetIds = new Set(YETENEKLER.map((y) => y.id));
    for (const r of RUHLAR) expect(yetIds.has(r.yetenek)).toBe(true);
  });
});

const ARALIK: Record<keyof Omit<SekizParametre, "desen" | "yon">, [number, number]> = {
  // tuning § 13 "gerçek aralık (1 920 geçerli kombinasyon)"
  kutle: [26, 48], saldiri: [22, 80], savunma: [16, 76], staminaHavuzu: [330, 500], erime: [2.5, 7.2], burstEsik: [6, 10],
};

function gecerliMi(p: TopacProfili): void {
  for (const [k, [a, b]] of Object.entries(ARALIK) as [keyof typeof ARALIK, [number, number]][]) {
    const v = p.parametreler[k];
    expect(Number.isFinite(v), `${p.id} ${k}`).toBe(true);
    expect(v, `${p.id} ${k}`).toBeGreaterThanOrEqual(a);
    expect(v, `${p.id} ${k}`).toBeLessThanOrEqual(b);
  }
  for (const [k, v] of Object.entries(p.sim)) {
    if (typeof v === "number") {
      expect(Number.isFinite(v), `${p.id} sim.${k}`).toBe(true);
      expect(v, `${p.id} sim.${k}`).toBeGreaterThanOrEqual(0);
    }
  }
  expect(p.sim.onCos2).toBeGreaterThan(0);
  expect(p.sim.onCos2).toBeLessThan(1);
}

describe("topacProfiliKur (8 parametre)", () => {
  it("başlangıç setleri tuning § 13 tablosundaki sayılar", () => {
    const [g, m] = BASLANGIC_SETLERI.map((s) => setProfili(s)) as [TopacProfili, TopacProfili];
    expect(g.parametreler).toMatchObject({ kutle: 27, saldiri: 66, savunma: 28, staminaHavuzu: 385, erime: 5.5, burstEsik: 7, desen: "cicek", yon: "sag" });
    expect(m.parametreler).toMatchObject({ kutle: 48, saldiri: 22, savunma: 76, staminaHavuzu: 400, erime: 5.2, burstEsik: 10, desen: "cakili" });
    expect(g.tip).toBe("saldirgan");
    expect(m.tip).toBe("kale");
  });

  it("1 920 kombinasyonun hepsi sınır içinde; tip dağılımı tuning § 13 ile aynı", () => {
    const tip: Record<string, number> = {};
    let n = 0;
    for (const c of CEKIRDEKLER) for (const g of GOVDELER) for (const d of DISKLER) for (const u of UCLAR) {
      const p = topacProfiliKur(c.id, g.id, d.id, u.id);
      gecerliMi(p);
      tip[p.tip] = (tip[p.tip] ?? 0) + 1;
      n++;
    }
    expect(n).toBe(1920);
    expect(tip).toStrictEqual({ saldirgan: 727, denge: 595, dayanikli: 396, kale: 202 });
  });

  it("4 Gövde × 6 Uç × 3 Disk tablosu: profil + 300 adım bot maçında NaN / negatif / sınır dışı yok", () => {
    const govdeler = GOVDELER.slice(0, 4);
    const diskler = DISKLER.slice(0, 3);
    const rakip = setProfili(BASLANGIC_SETLERI[2]!);
    let k = 0;
    for (const g of govdeler) for (const u of UCLAR) for (const d of diskler) {
      const c = CEKIRDEKLER[k % CEKIRDEKLER.length]!;
      const p = topacProfiliKur(c.id, g.id, d.id, u.id);
      gecerliMi(p);
      const w = dunyaKur([p, rakip], k);
      for (let t = 0; t < 300; t++) {
        adim(w, [botGirdisi(w, 0, "saldirgan", k), botGirdisi(w, 1, "saldirgan", k + 1)]);
        for (const tp of w.topaclar) {
          for (const v of [tp.x, tp.z, tp.vx, tp.vz, tp.stamina, tp.tik]) expect(Number.isFinite(v)).toBe(true);
          expect(tp.tik).toBeGreaterThanOrEqual(0);
          expect(tp.stamina).toBeGreaterThanOrEqual(0);
          expect(Math.hypot(tp.vx, tp.vz)).toBeLessThanOrEqual(AYAR.vMutlak * 2.5);
          expect(Math.hypot(tp.x, tp.z)).toBeLessThanOrEqual(AYAR.arenaYaricap);
        }
      }
      k++;
    }
    expect(k).toBe(72);
  });

  it("Yapay (çift yön) maç öncesi seçilir; Karanlık sol", () => {
    expect(topacProfiliKur("kasirga-yapay", "ok-govde", "hafif-disk", "duz-uc", { yon: "sol" }).donus).toBe("sol");
    expect(topacProfiliKur("kasirga-yapay", "ok-govde", "hafif-disk", "duz-uc").donus).toBe("sag");
    expect(topacProfiliKur("kul-cekirdegi", "ok-govde", "hafif-disk", "duz-uc").donus).toBe("sol");
  });
});
