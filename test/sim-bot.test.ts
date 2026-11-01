import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fusionKayitlari } from "../src/paylasilan/kart.ts";
import { profilKur } from "../src/paylasilan/dovuscu.ts";
import { AYAR } from "../src/paylasilan/kurallar/ayar.ts";
import { BOT_PROFILLERI } from "../src/paylasilan/kurallar/botlar.ts";
import { adim, dunyaKur } from "../src/paylasilan/sim/Dunya.ts";
import { rastgele } from "../src/paylasilan/sim/rastgele.ts";
import { Bot } from "../src/istemci/oyun/Bot.ts";

const oku = (ad: string) => JSON.parse(readFileSync(new URL(`../veri/${ad}`, import.meta.url), "utf8"));
const kayitlar = fusionKayitlari(oku("gecmis.json"), oku("kartlar.json"));

function mac(tohum: number) {
  const a = kayitlar[Math.floor(rastgele(tohum, 0) * kayitlar.length)]!;
  const b = kayitlar[Math.floor(rastgele(tohum, 1) * kayitlar.length)]!;
  const d = dunyaKur([profilKur(a), profilKur(b)], tohum);
  const botlar = [new Bot(BOT_PROFILLERI.normal, 0, tohum), new Bot(BOT_PROFILLERI.normal, 1, tohum + 1)];
  let adimSayisi = 0;
  while (!d.sonuc && adimSayisi < 60 * 100) {
    adim(d, [botlar[0]!.girdiUret(d, AYAR.dt), botlar[1]!.girdiUret(d, AYAR.dt)], AYAR.dt);
    adimSayisi++;
    for (const v of d.dovusculer) {
      if (!Number.isFinite(v.x) || !Number.isFinite(v.z) || !Number.isFinite(v.hp)) throw new Error(`sayı bozuldu tohum=${tohum} adım=${adimSayisi}`);
    }
  }
  return { d, adimSayisi };
}

describe("bot - bot maçları", () => {
  it("60 maçın hepsi biter, sayılar bozulmaz, saha içinde kalınır", () => {
    let ko = 0;
    let sure = 0;
    const kazananlar = [0, 0];
    for (let t = 1; t <= 60; t++) {
      const { d } = mac(t);
      expect(d.sonuc).not.toBeNull();
      for (const v of d.dovusculer) {
        expect(Math.abs(v.x)).toBeLessThanOrEqual(d.arena.yariGenislik);
        expect(v.z).toBeGreaterThanOrEqual(0);
        expect(v.z).toBeLessThanOrEqual(d.arena.derinlik);
      }
      if (d.sonuc?.neden === "ko") ko++; else sure++;
      if (d.sonuc?.kazanan != null) kazananlar[d.sonuc.kazanan]!++;
    }
    expect(ko + sure).toBe(60);
    expect(ko).toBeGreaterThan(30); // botlar birbirini gerçekten vuruyor
    expect(kazananlar[0]).toBeGreaterThan(5); // iki doğum noktası da kazanabiliyor
    expect(kazananlar[1]).toBeGreaterThan(5);
  });

  it("aynı tohum aynı maçı verir (bot dahil)", () => {
    const a = mac(7);
    const b = mac(7);
    expect(JSON.stringify(a.d)).toBe(JSON.stringify(b.d));
  });
});
