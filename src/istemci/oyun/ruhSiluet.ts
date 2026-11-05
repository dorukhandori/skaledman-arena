import { Graphics } from "pixi.js";
import type { ElementAdi } from "../../paylasilan/kurallar/ayar.ts";
import { ELEMENT_RENK } from "./renkler.ts";

// D8 ruh siluetleri (Ulti ve Takım Ultisi anı; maket m2 "Közkaracal" dili): yandan, tam gövde, sağa bakan, TEK RENK
// yarı saydam dolgu + açık renkli kalın anahat + göz parlaması; parçacıklar YetenekGorsel'de (yükselen kıvılcım).
// Hepsi özgün: kanatlı kuş / ejderha / anka YOK (IP; tasarım dili). Doku yok, Pixi Graphics; kök (0,0) gövde ortası,
// ayaklar ≈ y +95, en üst ≈ y −130. Genişlik ≈ 240 mantıksal px.
//   kor     Közkaracal    alev yeleli karakulak (sivri püsküllü kulaklar, sırtta alev dişleri, kıvrık kuyruk)
//   kasirga Sarmaltazı    ince uzun tazı, sarmal kuyruk, arkasında üç rüzgâr şeridi (baykuş yerine: kuş yok)
//   simsek  Çatırgeyik    geyik, zikzak (yıldırım) boynuzlar
//   girdap  Emişahtapot   kubbe başlı ahtapot, kıvrılan kollar
//   kaya    Yontuboğa     iri boğa, öne bakan boynuzlar, sırtta köşeli taş plakalar
//   don     Ayazmors      mors, iki uzun diş, sırtta buz kristali tarağı

type Nokta = readonly number[];

export const RUH_SILUET_ADI: Record<ElementAdi, string> = {
  kor: "Közkaracal", kasirga: "Sarmaltazı", simsek: "Çatırgeyik", girdap: "Emişahtapot", kaya: "Yontuboğa", don: "Ayazmors",
};

export function ruhSiluetCiz(el: ElementAdi): Graphics {
  const c = ELEMENT_RENK[el];
  const g = new Graphics();
  const dolgu = { color: c.orta, alpha: 0.55 };
  const anahat = { width: 3, color: c.acik, alpha: 0.95, join: "round" as const };
  const govde = (p: Nokta) => g.poly([...p]).fill(dolgu).stroke(anahat);
  const serit = (genislik: number, alfa = 0.9, renk = c.acik) => g.stroke({ width: genislik, color: renk, alpha: alfa, cap: "round", join: "round" });
  let goz: [number, number][] = [];
  switch (el) {
    case "kor": {
      // kıvrık kuyruk (gövdenin arkasında)
      g.moveTo(-72, 10).bezierCurveTo(-118, 0, -128, -70, -92, -84).bezierCurveTo(-70, -92, -62, -66, -80, -60);
      serit(16, 0.6, c.orta); g.moveTo(-72, 10).bezierCurveTo(-118, 0, -128, -70, -92, -84).bezierCurveTo(-70, -92, -62, -66, -80, -60); serit(3);
      govde([-76, 50, -70, 95, -56, 95, -48, 58, -8, 64, 28, 62, 32, 95, 46, 95, 50, 38, 64, 8, 62, -22, 74, -30, 98, -32, 106, -42, 98, -56,
        94, -60, 104, -116, 110, -132, 96, -112, 82, -66, 72, -66, 68, -114, 62, -130, 58, -106, 52, -62, 46, -50, 10, -30, -40, -26, -70, -4]);
      // sırtta alev dişleri (yele)
      const yele: number[] = [];
      for (let k = 0; k <= 7; k++) {
        const x = -46 + k * 13;
        const y = -26 - k * 3;
        yele.push(x, y, x + 6, y - 34 - (k % 2) * 14);
      }
      yele.push(50, -52);
      g.poly([-46, -26, ...yele]).fill({ color: c.vurgu, alpha: 0.55 }).stroke(anahat);
      goz = [[88, -50]];
      break;
    }
    case "kasirga": {
      // rüzgâr şeritleri
      for (const [y, uz] of [[-30, 70], [0, 90], [30, 60]] as const) { g.moveTo(-150, y).quadraticCurveTo(-120, y - 14, -150 + uz, y - 4); serit(3, 0.6); }
      // sarmal kuyruk
      g.moveTo(-70, -2).bezierCurveTo(-100, -20, -110, -64, -82, -72).bezierCurveTo(-60, -78, -52, -52, -70, -48).bezierCurveTo(-80, -46, -82, -58, -74, -60);
      serit(10, 0.6, c.orta); g.moveTo(-70, -2).bezierCurveTo(-100, -20, -110, -64, -82, -72).bezierCurveTo(-60, -78, -52, -52, -70, -48); serit(3);
      govde([-72, 4, -64, 50, -70, 95, -58, 95, -50, 46, -40, 24, 0, 22, 26, 30, 34, 95, 46, 95, 46, 34, 56, 6, 84, -30, 120, -36,
        122, -46, 88, -58, 66, -50, 50, -22, 30, -12, 0, -4, -40, -8]);
      // geriye yatık kulak
      govde([70, -54, 46, -76, 56, -52]);
      goz = [[92, -48]];
      break;
    }
    case "simsek": {
      govde([-70, -4, -66, 40, -62, 95, -50, 95, -46, 40, -10, 44, 30, 42, 36, 95, 48, 95, 50, 30, 62, 10, 84, -46, 106, -56, 104, -66,
        84, -76, 72, -72, 56, -40, 44, -12, 0, -10, -40, -10]);
      // zikzak (yıldırım) boynuzlar
      g.moveTo(76, -74).lineTo(64, -100).lineTo(80, -106).lineTo(62, -134).moveTo(64, -100).lineTo(44, -112).lineTo(50, -126);
      g.moveTo(86, -74).lineTo(98, -100).lineTo(86, -108).lineTo(110, -136).moveTo(98, -100).lineTo(118, -108);
      serit(7, 0.95);
      g.moveTo(76, -74).lineTo(64, -100).lineTo(80, -106).lineTo(62, -134).moveTo(86, -74).lineTo(98, -100).lineTo(86, -108).lineTo(110, -136);
      serit(2.5, 1, c.vurgu);
      // kısa kuyruk
      govde([-70, -4, -88, -16, -76, 4]);
      goz = [[90, -64]];
      break;
    }
    case "girdap": {
      // kıvrılan kollar (arkada)
      for (let k = 0; k < 6; k++) {
        const x = -60 + k * 24;
        const yon = k % 2 ? 1 : -1;
        g.moveTo(x, 10).bezierCurveTo(x + yon * 30, 50, x - yon * 20, 80, x + yon * 18, 100).quadraticCurveTo(x + yon * 34, 104, x + yon * 30, 88);
      }
      serit(14, 0.55, c.orta);
      for (let k = 0; k < 6; k++) {
        const x = -60 + k * 24;
        const yon = k % 2 ? 1 : -1;
        g.moveTo(x, 10).bezierCurveTo(x + yon * 30, 50, x - yon * 20, 80, x + yon * 18, 100);
      }
      serit(3);
      // kubbe baş (manto)
      g.ellipse(0, -46, 82, 70).fill(dolgu).stroke(anahat);
      // emiş halkaları (girdap) kubbe üstünde
      g.circle(-24, -78, 14).stroke({ width: 3, color: c.vurgu, alpha: 0.7 });
      g.circle(-24, -78, 6).stroke({ width: 2, color: c.vurgu, alpha: 0.7 });
      goz = [[-18, -30], [22, -30]];
      break;
    }
    case "kaya": {
      govde([-96, 0, -90, 60, -86, 95, -70, 95, -64, 62, -20, 70, 30, 70, 38, 95, 54, 95, 60, 56, 86, 40, 108, 46, 120, 30, 112, 6, 96, -6,
        80, -26, 50, -40, 0, -46, -50, -44, -86, -30]);
      // öne bakan kalın boynuzlar
      g.moveTo(92, -4).quadraticCurveTo(126, -18, 132, -50); serit(12, 0.95);
      g.moveTo(84, -10).quadraticCurveTo(96, -40, 78, -62); serit(10, 0.8);
      // sırtta köşeli taş plakalar
      for (const [x, y, h] of [[-60, -40, 26], [-30, -46, 34], [0, -48, 40], [30, -44, 30], [56, -36, 22]] as const) {
        g.poly([x - 14, y + 4, x - 4, y - h, x + 12, y - h + 8, x + 16, y + 2]).fill({ color: c.vurgu, alpha: 0.5 }).stroke(anahat);
      }
      goz = [[98, 8]];
      break;
    }
    case "don": {
      govde([-104, 40, -112, 80, -80, 70, -60, 90, -20, 92, 30, 92, 50, 70, 70, 92, 96, 90, 92, 60, 110, 30, 112, -6, 96, -30, 64, -44, 20, -48,
        -30, -44, -70, -30, -96, 0]);
      // iki uzun diş
      g.poly([82, 30, 92, 30, 90, 104]).fill({ color: 0xffffff, alpha: 0.9 }).stroke({ width: 2, color: c.acik });
      g.poly([98, 26, 106, 26, 108, 96]).fill({ color: 0xffffff, alpha: 0.8 }).stroke({ width: 2, color: c.acik });
      // bıyık noktaları
      for (const [x, y] of [[100, 16], [108, 12], [104, 22]] as const) g.circle(x, y, 2.5).fill({ color: c.acik, alpha: 0.9 });
      // sırtta buz kristali tarağı
      for (const [x, y, h] of [[-60, -36, 30], [-30, -44, 42], [0, -48, 52], [30, -46, 40], [58, -40, 28]] as const) {
        g.poly([x, y - h, x + 8, y - h / 2, x, y + 2, x - 8, y - h / 2]).fill({ color: c.vurgu, alpha: 0.55 }).stroke(anahat);
      }
      goz = [[86, -14]];
      break;
    }
  }
  // göz parlaması: dış hale + parlak çekirdek (yayında okunur)
  for (const [x, y] of goz) {
    g.circle(x, y, 9).fill({ color: 0xfff2a8, alpha: 0.35 });
    g.rect(x - 3.5, y - 3.5, 7, 7).fill({ color: 0xfffbd0, alpha: 1 });
  }
  return g;
}
