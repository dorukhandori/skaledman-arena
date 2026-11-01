import { Application, Container, Graphics } from "pixi.js";
import type { Arena } from "../../paylasilan/sim/Arena.ts";
import { SAHNE_RENK } from "./renkler.ts";
import { ISKELET_RENK, gokCiz, iskeletEngeliCiz, zeminDokusu } from "./IskeletCizimi.ts";

/** PokeRivals yerleşimi (paket analizi § 8): mantıksal 960×540, ufuk 184, zemin alt 516. */
export const SAHNE = {
  genislik: 960,
  yukseklik: 540,
  ufukY: 184,
  zeminAltY: 516,
  yakinOlcek: 2,
  uzakOlcek: 1,
  /** zemin çizgisi aralığı (z birimi) */
  izgaraAraligi: 60,
  engelYuksekligi: 34,
} as const;

/**
 * 2.5D sahne: x doğrudan ekran x'i (merkez 480), z ufuktan alta doğrusal ekran y'si, derinlik ölçeği z'ye göre.
 * `kok` mantıksal 960×540 alanıdır; pencereye sığacak şekilde ölçeklenir (letterbox).
 */
export class Sahne {
  readonly kok = new Container();
  readonly zeminKatmani = new Container();
  /** z'ye göre sıralı: dövüşçüler, engeller, mermiler */
  readonly nesneKatmani = new Container();
  readonly ustKatman = new Container();
  private olcek = 1;
  private sarsGenlik = 0;
  private sarsKalan = 0;
  private son = { w: 0, h: 0 };
  /** z birimi başına ekran y'si */
  readonly zOrani: number;

  constructor(private app: Application, readonly arena: Arena) {
    this.zOrani = (SAHNE.zeminAltY - SAHNE.ufukY) / arena.derinlik;
    this.nesneKatmani.sortableChildren = true;
    const maske = new Graphics().rect(0, 0, SAHNE.genislik, SAHNE.yukseklik).fill(0xffffff);
    this.kok.addChild(this.zeminKatmani, this.nesneKatmani, this.ustKatman, maske);
    this.kok.mask = maske;
    this.zeminCiz();
    this.engelleriCiz();
    app.stage.addChild(this.kok);
    this.boyutla(true);
  }

  /** z (0 ufuk … derinlik yakın) → ekran y. */
  zEkranY(z: number): number {
    return SAHNE.ufukY + z * this.zOrani;
  }

  /** Derinlik ölçeği: uzak 1 … yakın 2. */
  derinlikOlcegi(z: number): number {
    const t = Math.max(0, Math.min(1, z / this.arena.derinlik));
    return SAHNE.uzakOlcek + (SAHNE.yakinOlcek - SAHNE.uzakOlcek) * t;
  }

  /** Sprite ölçek çarpanı: yakın = 1 (animatörün kendi 3× ölçeği), uzak = 0.5. */
  nesneOlcegi(z: number): number {
    return this.derinlikOlcegi(z) / SAHNE.yakinOlcek;
  }

  ekranX(x: number): number {
    return SAHNE.genislik / 2 + x;
  }

  dunyadanEkrana(x: number, z: number): { x: number; y: number } {
    return { x: this.ekranX(x), y: this.zEkranY(z) };
  }

  /** Tuval pikseli (CSS) → dünya noktası. */
  ekrandanDunyaya(px: number, py: number): { x: number; z: number } {
    const lx = (px - this.kok.x) / this.olcek;
    const ly = (py - this.kok.y) / this.olcek;
    return { x: lx - SAHNE.genislik / 2, z: (ly - SAHNE.ufukY) / this.zOrani };
  }

  sars(genlik: number, sure: number): void {
    if (genlik >= this.sarsGenlik || this.sarsKalan <= 0) { this.sarsGenlik = genlik; this.sarsKalan = sure; }
  }

  /** Her karede: pencere değiştiyse yeniden sığdır, sarsıntıyı uygula. */
  boyutla(zorla = false, dt = 0): void {
    const { width: w, height: h } = this.app.screen;
    if (zorla || w !== this.son.w || h !== this.son.h) {
      this.son = { w, h };
      this.olcek = Math.min(w / SAHNE.genislik, h / SAHNE.yukseklik);
      this.kok.scale.set(this.olcek);
    }
    let sx = 0;
    let sy = 0;
    if (this.sarsKalan > 0) {
      this.sarsKalan -= dt;
      sx = (Math.random() * 2 - 1) * this.sarsGenlik * this.olcek;
      sy = (Math.random() * 2 - 1) * this.sarsGenlik * this.olcek;
    }
    this.kok.position.set((w - SAHNE.genislik * this.olcek) / 2 + sx, (h - SAHNE.yukseklik * this.olcek) / 2 + sy);
  }

  private zeminCiz(): void {
    const g = new Graphics();
    const { genislik: W, ufukY, zeminAltY, yukseklik } = SAHNE;
    const a = this.arena;
    const iskelet = a.id === "iskeletler-diyari";
    const R = iskelet
      ? { gok: ISKELET_RENK.gok, gokUfuk: ISKELET_RENK.ufukSis, disZemin: ISKELET_RENK.disZemin, zemin: ISKELET_RENK.zemin, zeminAcik: ISKELET_RENK.zeminAcik, cizgi: ISKELET_RENK.sinir }
      : SAHNE_RENK;
    g.rect(0, 0, W, ufukY).fill(R.gok);
    g.rect(0, ufukY - 24, W, 24).fill({ color: R.gokUfuk, alpha: 0.9 });
    if (iskelet) gokCiz(g, W, ufukY);
    g.rect(0, ufukY, W, yukseklik - ufukY).fill(R.disZemin);

    const sol = this.ekranX(-a.yariGenislik);
    const sag = this.ekranX(a.yariGenislik);
    g.rect(sol, ufukY, sag - sol, zeminAltY - ufukY).fill(R.zemin);
    // şeritli perspektif: z bantları sırayla açık
    for (let z = 0, k = 0; z < a.derinlik; z += SAHNE.izgaraAraligi, k++) {
      if (k % 2 === 1) g.rect(sol, this.zEkranY(z), sag - sol, SAHNE.izgaraAraligi * this.zOrani).fill(R.zeminAcik);
    }
    if (iskelet) zeminDokusu(g, a, this);
    for (let z = 0; z <= a.derinlik; z += SAHNE.izgaraAraligi) {
      const y = this.zEkranY(z);
      g.moveTo(sol, y).lineTo(sag, y).stroke({ width: 1, color: R.cizgi, alpha: 0.18 });
    }
    for (let x = -a.yariGenislik; x <= a.yariGenislik; x += SAHNE.izgaraAraligi * 2) {
      g.moveTo(this.ekranX(x), ufukY).lineTo(this.ekranX(x), zeminAltY).stroke({ width: 1, color: R.cizgi, alpha: 0.1 });
    }
    g.rect(sol, ufukY, sag - sol, zeminAltY - ufukY).stroke({ width: 2, color: R.cizgi, alpha: 0.7 });
    this.zeminKatmani.addChild(g);
  }

  private engelleriCiz(): void {
    const H = SAHNE.engelYuksekligi;
    for (const e of this.arena.engeller) {
      const g = new Graphics();
      if (iskeletEngeliCiz(g, e, this)) {
        g.zIndex = e.z + (e.tur === "dikdortgen" ? e.yariDerinlik : e.yaricap);
      } else if (e.tur === "dikdortgen") {
        const sol = this.ekranX(e.x - e.yariGenislik);
        const genislik = e.yariGenislik * 2;
        const yArka = this.zEkranY(e.z - e.yariDerinlik);
        const yOn = this.zEkranY(e.z + e.yariDerinlik);
        g.rect(sol, yArka - H, genislik, yOn - yArka).fill(SAHNE_RENK.engelUst).stroke({ width: 1, color: SAHNE_RENK.engelKenar });
        g.rect(sol, yOn - H, genislik, H).fill(SAHNE_RENK.engelOn).stroke({ width: 1, color: SAHNE_RENK.engelKenar });
        g.zIndex = e.z + e.yariDerinlik;
      } else {
        const c = this.dunyadanEkrana(e.x, e.z);
        const ry = e.yaricap * this.zOrani;
        g.ellipse(c.x, c.y, e.yaricap, ry).fill(SAHNE_RENK.engelOn);
        g.rect(c.x - e.yaricap, c.y - H, e.yaricap * 2, H).fill(SAHNE_RENK.engelOn);
        g.ellipse(c.x, c.y - H, e.yaricap, ry).fill(SAHNE_RENK.engelUst).stroke({ width: 1, color: SAHNE_RENK.engelKenar });
        g.zIndex = e.z + e.yaricap;
      }
      this.nesneKatmani.addChild(g);
    }
  }

  yokEt(): void {
    this.kok.destroy({ children: true });
  }
}
