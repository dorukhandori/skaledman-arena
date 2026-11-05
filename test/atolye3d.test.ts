import { describe, expect, it } from "vitest";
import { PARCALAR } from "../src/paylasilan/veri/katalog.ts";
import { ARALIK, BOS_OLCU, EN_AZ_EGIM, patlatilmisTabanlar, EN_COK_EGIM, KATMAN_ETIKET, KATMAN_SIRASI, VARSAYILAN_EGIM, gorunumOlay, ilkDurum, katmanKaymasi, tusIsler } from "../src/istemci/atolye3d/durum.ts";
import { PARCALAR_3B, SINIF_KOD, cikintiSayisi, parcaGeometrisi, parcaGeometrisiId } from "../src/istemci/atolye3d/geometri.ts";
import { paletDizisi } from "../src/istemci/atolye3d/palet.ts";
import { GLB_LISTESI, glbYolu, modelSec } from "../src/istemci/atolye3d/tipler.ts";

// ATOLYE3D: parametrik geometri (27 parça), katman düzeni / etiketler, odak-klavye durum makinesi, GLB yedeği.

const KOSE_TAVANI = 40_000;

describe("Atölye 3B geometri", () => {
  it("katalogdaki 27 parçanın hepsinin 3B tanımı var", () => {
    const ids = PARCALAR.parcalar.map((p) => p.id).sort();
    expect(ids).toHaveLength(27);
    expect(Object.keys(PARCALAR_3B).sort()).toEqual(ids);
    for (const p of PARCALAR.parcalar) expect(PARCALAR_3B[p.id]!.tur).toBe(p.tur);
  });

  for (const [id, s] of Object.entries(PARCALAR_3B)) {
    it(`${id}: geometri sonlu, sınırlı, yönlü`, () => {
      for (const ayna of [false, true]) {
        const g = parcaGeometrisi(s, ayna && !!s.kiral);
        expect(g.kose).toBeGreaterThan(100);
        expect(g.kose).toBeLessThanOrEqual(KOSE_TAVANI);
        expect(g.kose % 3).toBe(0);
        expect(g.konum.length).toBe(g.kose * 3);
        expect(g.konum.every(Number.isFinite)).toBe(true);
        expect(g.normal.every(Number.isFinite)).toBe(true);
        const kodlar = new Set(Object.values(SINIF_KOD));
        expect(g.sinif.every((c) => kodlar.has(c))).toBe(true);
        // birim normal
        for (let i = 0; i < g.kose; i += 97) expect(Math.hypot(g.normal[i * 3]!, g.normal[i * 3 + 1]!, g.normal[i * 3 + 2]!)).toBeCloseTo(1, 3);
        // ölçü: Gövde ~32, Disk ~30, Uç ≤ 12, Çekirdek ≤ 11 (topaç yerel birimi)
        const ust = { govde: 46, disk: 34, uc: 12, cekirdek: 12 }[s.tur];
        expect(g.yaricap).toBeGreaterThan(3);
        expect(g.yaricap).toBeLessThanOrEqual(ust);
        expect(g.yAlt).toBeGreaterThanOrEqual(-0.01);
        expect(g.yUst).toBeLessThanOrEqual(40);
        expect(g.yUst).toBeGreaterThan(g.yAlt);
      }
      // dış yüzler dışa bakar: üstte en yüksek üçgenin normali yukarı
      const g = parcaGeometrisi(s);
      let enY = -Infinity, ny = 0;
      for (let i = 0; i < g.kose; i++) if (g.konum[i * 3 + 1]! > enY) { enY = g.konum[i * 3 + 1]!; ny = g.normal[i * 3 + 1]!; }
      expect(ny).toBeGreaterThan(0);
    });
  }

  it("kanat sayısı n Gövde taslağında n tepe verir; ayna x'i çevirir", () => {
    for (const [id, s] of Object.entries(PARCALAR_3B)) {
      if (s.tur !== "govde") continue;
      const n = s.loblar![0]!.n;
      expect(cikintiSayisi(id)).toBe(n);
      const kat = PARCALAR.parcalar.find((p) => p.id === id) as { kanat?: number } | undefined;
      if (kat?.kanat) expect(n).toBe(kat.kanat);
    }
    const a = parcaGeometrisiId("ok-govde")!, b = parcaGeometrisiId("ok-govde", true)!;
    expect(b.konum[3]).toBeCloseTo(-a.konum[3]!, 5);
    expect(parcaGeometrisiId("yok")).toBeNull();
  });

  it("palet: 10 sınıf × 5 ton, 0..1", () => {
    const p = paletDizisi({ element: "kor", koken: "goktasi" });
    expect(p.length).toBe(150);
    for (const v of p) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
    expect(paletDizisi({ element: null, koken: null }).length).toBe(150);
  });
});

describe("Atölye 3B katman düzeni", () => {
  it("referans 03 sırası ve etiketleri", () => {
    expect(KATMAN_SIRASI).toEqual(["cekirdek", "govde", "disk", "uc"]);
    expect(KATMAN_SIRASI.map((t) => KATMAN_ETIKET[t])).toEqual(["ÇEKİRDEK", "GÖVDE", "DİSK", "UÇ"]);
  });

  it("patlatılmışta katmanlar yukarıdan aşağı sıralı ve ayrık; birleşikte Disk yüksekliğine oturur", () => {
    for (const disk of ["hafif-disk", "agir-disk", "alcak-disk", "parlak-disk", "denge-disk"]) {
      const ust = PARCALAR_3B[disk]!.profil![0]![1];
      const b = katmanKaymasi(0, ust);
      expect(b.uc).toBe(0);
      expect(b.disk).toBe(0);
      expect(b.govde).toBeCloseTo(ust - 16);
      const p = katmanKaymasi(1, ust);
      expect(p.cekirdek).toBeGreaterThan(p.govde);
      expect(p.govde).toBeGreaterThan(p.disk);
      expect(p.disk).toBeGreaterThan(p.uc);
      expect(p.disk - p.uc).toBe(ARALIK);
    }
  });
});

describe("Atölye 3B patlatılmış düzen (ekranda ayrık)", () => {
  it("her eğimde ardışık katmanlar ekranda üst üste binmez; p=0 birleşik tabanı verir", () => {
    const olcu = Object.fromEntries((["cekirdek", "govde", "disk", "uc"] as const).map((t) => {
      const id = { cekirdek: "kaya-maden", govde: "ok-govde", disk: "agir-disk", uc: "duz-uc" }[t];
      const g = parcaGeometrisiId(id)!;
      return [t, { yAlt: g.yAlt, yUst: g.yUst, R: g.yaricap }];
    }));
    for (const egimDer of [EN_AZ_EGIM, 28, EN_COK_EGIM]) {
      const e = (egimDer * Math.PI) / 180, c = Math.cos(e), s = Math.sin(e);
      const y = patlatilmisTabanlar(olcu, e, 7, 15.25, 1);
      const sira = ["uc", "disk", "govde", "cekirdek"] as const;
      for (let i = 1; i < 4; i++) {
        const alt = sira[i - 1]!, ust = sira[i]!;
        const altUst = (y[alt] + olcu[alt]!.yUst) * c + olcu[alt]!.R * s;
        const ustAlt = (y[ust] + olcu[ust]!.yAlt) * c - olcu[ust]!.R * s;
        expect(ustAlt).toBeGreaterThanOrEqual(altUst + 6.99);
      }
    }
    expect(patlatilmisTabanlar(olcu, 0.5, 7, 15.25, 0)).toEqual(katmanKaymasi(0, 15.25));
    // boş yuva yer tutucuyla yine yer alır
    const bos = patlatilmisTabanlar({ govde: olcu["govde"]! }, 0.5, 7, 16, 1);
    expect(bos.cekirdek).toBeGreaterThan(bos.govde);
    expect(BOS_OLCU.R).toBeGreaterThan(0);
  });
});

describe("Atölye 3B odak / klavye durum makinesi", () => {
  it("Enter seçer, Esc geri döner (önceki moda)", () => {
    let d = ilkDurum();
    expect(d.mod).toBe("patlatilmis");
    d = gorunumOlay(d, { tur: "tus", tus: "Enter", katman: "disk" });
    expect(d).toMatchObject({ mod: "odak", odak: "disk", donus: "patlatilmis" });
    d = gorunumOlay(d, { tur: "tus", tus: "Escape" });
    expect(d).toMatchObject({ mod: "patlatilmis", odak: null });
    // birleşikten odak → geri birleşiğe
    d = gorunumOlay(d, { tur: "birlestirAyir" });
    expect(d.mod).toBe("birlesik");
    d = gorunumOlay(d, { tur: "sec", katman: "govde" });
    d = gorunumOlay(d, { tur: "sec", katman: "uc" });
    expect(d).toMatchObject({ mod: "odak", odak: "uc", donus: "birlesik" });
    d = gorunumOlay(d, { tur: "geri" });
    expect(d.mod).toBe("birlesik");
    // Enter katmansız: değişiklik yok
    expect(gorunumOlay(d, { tur: "tus", tus: "Enter" })).toBe(d);
    expect(gorunumOlay(d, { tur: "tus", tus: "x" })).toBe(d);
    expect(tusIsler("ArrowLeft")).toBe(true);
    expect(tusIsler("Tab")).toBe(false);
  });

  it("ok tuşları döndürür: yatay sarar, dikey sınırlı; odakta parça kendi açısıyla döner", () => {
    let d = ilkDurum();
    d = gorunumOlay(d, { tur: "tus", tus: "ArrowLeft" });
    expect(d.aci.yaw).toBe(345);
    for (let i = 0; i < 20; i++) d = gorunumOlay(d, { tur: "tus", tus: "ArrowUp" });
    expect(d.aci.egim).toBe(EN_COK_EGIM);
    for (let i = 0; i < 20; i++) d = gorunumOlay(d, { tur: "tus", tus: "ArrowDown" });
    expect(d.aci.egim).toBe(EN_AZ_EGIM);
    d = gorunumOlay(d, { tur: "surukle", dx: 100, dy: 0 });
    expect(d.aci.yaw).toBeCloseTo(345 + 60 - 360);
    const ana = d.aci;
    d = gorunumOlay(d, { tur: "sec", katman: "cekirdek" });
    expect(d.odakAci).toEqual({ yaw: 0, egim: VARSAYILAN_EGIM });
    d = gorunumOlay(d, { tur: "tus", tus: "ArrowRight" });
    expect(d.odakAci.yaw).toBe(15);
    expect(d.aci).toEqual(ana);
    // B: birleştir/ayır odaktan da çıkar
    d = gorunumOlay(d, { tur: "tus", tus: "b" });
    expect(d).toMatchObject({ mod: "birlesik", odak: null });
  });
});

describe("Atölye 3B GLB kancası", () => {
  it("liste boş: istek yok, parametrik", async () => {
    let istek = 0;
    const r = await modelSec("ok-govde", GLB_LISTESI, async () => { istek++; return "glb"; }, () => "param");
    expect(r).toEqual({ kaynak: "parametrik", model: "param" });
    expect(istek).toBe(0);
  });
  it("listede ve yüklenirse GLB; yükleme başarısızsa parametrik yedek", async () => {
    const liste = new Set(["ok-govde"]);
    let url = "";
    expect(await modelSec("ok-govde", liste, async (u) => { url = u; return "glb"; }, () => "param")).toEqual({ kaynak: "glb", model: "glb" });
    expect(url).toBe("/topac/model/ok-govde.glb");
    expect(glbYolu("ok-govde")).toBe(url);
    expect(await modelSec("ok-govde", liste, async () => { throw new Error("404"); }, () => "param")).toEqual({ kaynak: "parametrik", model: "param" });
  });
});
