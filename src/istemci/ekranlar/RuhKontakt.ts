import { Container, Graphics, Text } from "pixi.js";
import { ELEMENT_CARKI } from "../../paylasilan/kurallar/ayar.ts";
import type { EkranBaglami } from "../main.ts";
import { ELEMENT_RENK } from "../oyun/renkler.ts";
import { RUH_SILUET_ADI, ruhSiluetCiz } from "../oyun/ruhSiluet.ts";
import { SAHNE, Sahne } from "../oyun/Sahne.ts";

// D8 geliştirici ekranı (`?ekran=ruhlar`): altı ruh siluetinin kontakt levhası (çanak zemini rengi üstünde, 3 × 2).
export function baslat(b: EkranBaglami): void {
  const sahne = new Sahne(b.app);
  sahne.tamSayiOlcek = true;
  sahne.boyutla(true);
  const kap = new Container();
  const zemin = new Graphics().rect(0, 0, SAHNE.genislik, SAHNE.yukseklik).fill(0x14181a);
  kap.addChild(zemin);
  ELEMENT_CARKI.forEach((el, k) => {
    const x = 160 + (k % 3) * 320;
    const y = 150 + Math.floor(k / 3) * 262;
    kap.addChild(new Graphics().roundRect(x - 150, y - 140, 300, 250, 12).fill(0x6e6a66).stroke({ width: 2, color: 0x24414b }));
    const g = ruhSiluetCiz(el);
    g.position.set(x, y - 10);
    g.scale.set(0.82);
    g.alpha = 0.9;
    kap.addChild(g);
    const t = new Text({ text: `${RUH_SILUET_ADI[el]} · ${ELEMENT_RENK[el].ad}`, style: { fontFamily: "system-ui, sans-serif", fontSize: 15, fontWeight: "900", fill: 0xffffff, stroke: { color: 0x050d10, width: 4 } } });
    t.anchor.set(0.5, 0);
    t.position.set(x, y + 86);
    kap.addChild(t);
  });
  sahne.dunya.addChild(kap);
}
