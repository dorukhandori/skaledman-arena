import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import parcalar from "../veri/parcalar.json";
import { TOPAC_GORSEL, govdeKaymasi, kademeDizisi, kareIndeksi, tanimA, tanimB } from "../src/istemci/oyun/topacKare.ts";

describe("ART-1 topaç atlası (biçim A + B)", () => {
  it("katalogdaki her parçanın biçim A tanımı ve sayfa dosyası var", () => {
    for (const p of parcalar.parcalar) {
      const t = tanimA(p.id);
      expect(t, p.id).not.toBeNull();
      expect(t!.tur).toBe(p.tur);
      const boyalar = p.tur === "govde" ? ["kor", "kasirga", "simsek", "girdap", "kaya", "don"] : [null];
      for (const b of boyalar) for (const y of t!.yonler) for (const k of ["keskin", "bulanik", "disk"] as const) {
        expect(existsSync(`public${t!.serit(k, y, b).dosya}`), `${p.id} ${k} ${y} ${b}`).toBe(true);
      }
    }
  });
  it("kare indeksi periyot içinde döner; sağ artar, sol satır ters ilerler", () => {
    const P = (Math.PI * 2) / 3;
    expect(kareIndeksi(0, 3, 8, false)).toBe(0);
    expect(kareIndeksi(P / 8 + 1e-6, 3, 8, false)).toBe(1);
    expect(kareIndeksi(P + P / 8 + 1e-6, 3, 8, false)).toBe(1);
    expect(kareIndeksi(-P / 8 - 1e-6, 3, 8, false)).toBe(6);
    expect(kareIndeksi(-P / 8 - 1e-6, 3, 8, true)).toBe(1);
    expect(kademeDizisi("yuksek")).toBe("disk");
    expect(kademeDizisi("orta")).toBe("bulanik");
    expect(kademeDizisi("dusuk")).toBe("keskin");
  });
  it("biçim B json doğrulanır, dosya adları sözleşmeye uyar; geçersiz → null", () => {
    const t = tanimB({ surum: 2, parcaId: "ok-govde", tur: "govde", kare: [64, 64], capa: [32, 54], simetri: 3, yonler: ["s", "l"], ustZ: 26.4, boyalar: ["kor"] });
    expect(t?.serit("bulanik", "l", "girdap")).toStrictEqual({ dosya: "/topac/govde/ok-govde-bulanik-l-girdap.png", y: 0, adet: 8 });
    expect(t?.serit("disk", "s", null).adet).toBe(3);
    const u = tanimB({ surum: 2, parcaId: "duz-uc", tur: "uc", kare: [64, 64], capa: [32, 54], simetri: 6, yonler: ["s"], ustZ: 12 });
    expect(u?.serit("keskin", "l", "kor").dosya).toBe("/topac/uc/duz-uc-keskin-s.png");
    expect(tanimB({ surum: 1 })).toBeNull();
    expect(tanimB({ surum: 2, parcaId: "x", tur: "kanat", kare: [64, 64], capa: [1, 1], simetri: 3, yonler: ["s"], ustZ: 1 })).toBeNull();
    expect(tanimB("<!doctype html>")).toBeNull();
  });
  it("Disk yüksekliği Gövde katmanını kaydırır (yüksek Disk = yukarı)", () => {
    const g = tanimA("ok-govde")!;
    expect(govdeKaymasi(TOPAC_GORSEL.kamera.govdeTabanZ, g)).toBe(0);
    expect(govdeKaymasi(tanimA("parlak-disk")!.ustZ, g)).toBeGreaterThan(govdeKaymasi(tanimA("alcak-disk")!.ustZ, g));
  });
});
