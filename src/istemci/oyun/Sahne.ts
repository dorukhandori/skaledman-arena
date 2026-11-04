import { Application, Container, Graphics } from "pixi.js";
import { KusakArenasi } from "./KusakArenasi.ts";
import { SusRastgele } from "./SusRastgele.ts";

/** Mantıksal tuval 960×540; arena merkezi (480, 270). 1 sim birimi = 1 mantıksal piksel (axiom karar 3). */
export const SAHNE = {
  genislik: 960,
  yukseklik: 540,
  merkezX: 480,
  merkezY: 270,
  /** trauma² · bu = sarsıntı tepe genliği (px) */
  sarsintiTavan: 12,
  /** trauma 1 s'de lineer söner (05 § 3.3) */
  traumaSonum: 1,
} as const;

/**
 * Tam üstten sahne (pixel planı § 1.1 C): zemin, iz, gölge, nesne, efekt ve ekran katmanları.
 * Sarsıntı trauma modelidir: genlik = trauma² · tavan; ilk 2 kare normal boyunca tek yönlü, sonra tohumlu gürültü.
 * Zoom darbesi kok'u merkez etrafında ölçekler. Letterbox: tam sayı olmayan ölçek de kabul (Lab).
 */
export class Sahne {
  readonly kok = new Container();
  /** sarsıntı ve zoom bu kapsayıcıya uygulanır; HUD dışı her şey içinde */
  readonly dunya = new Container();
  readonly zeminKatmani = new Container();
  readonly izKatmani = new Container();
  readonly golgeKatmani = new Container();
  readonly nesneKatmani = new Container();
  /** çanak dudağı: topacın üstünde (Ring Out'ta kenarın arkasına düşüş, pixel planı § 6.1) */
  readonly dudakKatmani = new Container();
  readonly efektKatmani = new Container();
  readonly arena: KusakArenasi;
  /** ekran flaşı: sarsıntıdan etkilenmez */
  readonly ekranKatmani = new Container();
  /** sağda DOM panel için ayrılan CSS piksel */
  sagBosluk = 0;
  olcek = 1;
  private trauma = 0;
  private yonluKare = 0;
  private yon = { x: 0, y: 0 };
  private zoom = { tepe: 0, sure: 0, kalan: 0 };
  private rng = new SusRastgele(0x5a5a);
  private son = { w: 0, h: 0, b: -1 };
  private sarsintiCarpani = 1;

  constructor(private app: Application) {
    const maske = new Graphics().rect(0, 0, SAHNE.genislik, SAHNE.yukseklik).fill(0xffffff);
    this.dunya.addChild(this.zeminKatmani, this.izKatmani, this.golgeKatmani, this.nesneKatmani, this.dudakKatmani, this.efektKatmani);
    this.dunya.pivot.set(SAHNE.merkezX, SAHNE.merkezY);
    this.dunya.position.set(SAHNE.merkezX, SAHNE.merkezY);
    this.kok.addChild(this.dunya, this.ekranKatmani, maske);
    this.kok.mask = maske;
    this.arena = new KusakArenasi(SAHNE.merkezX, SAHNE.merkezY, SAHNE.genislik, SAHNE.yukseklik);
    this.zeminKatmani.addChild(this.arena.zemin);
    this.dudakKatmani.addChild(this.arena.dudak);
    app.stage.addChild(this.kok);
    this.boyutla(true);
  }

  /** Sim (x, z) → mantıksal ekran (x, y). */
  ekranX(x: number): number { return SAHNE.merkezX + x; }
  ekranY(z: number): number { return SAHNE.merkezY + z; }

  /** Tuval pikseli (CSS) → sim noktası. */
  ekrandanDunyaya(px: number, py: number): { x: number; z: number } {
    return { x: (px - this.kok.x) / this.olcek - SAHNE.merkezX, z: (py - this.kok.y) / this.olcek - SAHNE.merkezY };
  }

  /** Mantıksal çerçevenin CSS konumu (DOM HUD hizalaması için). */
  cerceve(): { x: number; y: number; olcek: number } {
    return { x: this.kok.x, y: this.kok.y, olcek: this.olcek };
  }

  /** Ayar › Ekran sarsıntısı: 1 / 0,5 / 0. */
  sarsintiAyari(c: number): void { this.sarsintiCarpani = c; }

  /**
   * Trauma ekler (0..1). `nx, ny` verilirse ilk 2 kare bu yönde tek yönlü itme (vuruş yönü okunsun).
   * `tekYon` true ise (duvar) tüm sarsıntı normal boyunca kalır.
   */
  sars(trauma: number, nx = 0, ny = 0, tekYon = false): void {
    this.trauma = Math.min(1, this.trauma + trauma);
    const u = Math.hypot(nx, ny);
    if (u > 0) { this.yon = { x: nx / u, y: ny / u }; this.yonluKare = tekYon ? 1e9 : 2; }
  }

  /** Zoom darbesi: tepe oranı (0,03 = %3), süre s. Büyüğü kazanır. */
  zoomDarbesi(tepe: number, sure: number): void {
    if (tepe >= this.zoom.tepe * (this.zoom.kalan / (this.zoom.sure || 1))) this.zoom = { tepe, sure, kalan: sure };
  }

  /** Her karede: pencere değiştiyse yeniden sığdır, sarsıntı ve zoom uygula. dt = gerçek saniye. */
  boyutla(zorla = false, dt = 0): void {
    const { width: w0, height: h } = this.app.screen;
    const w = Math.max(1, w0 - this.sagBosluk);
    if (zorla || w !== this.son.w || h !== this.son.h || this.sagBosluk !== this.son.b) {
      this.son = { w, h, b: this.sagBosluk };
      this.olcek = Math.min(w / SAHNE.genislik, h / SAHNE.yukseklik);
      this.kok.scale.set(this.olcek);
      this.kok.position.set(Math.round((w - SAHNE.genislik * this.olcek) / 2), Math.round((h - SAHNE.yukseklik * this.olcek) / 2));
    }
    // sarsıntı
    let sx = 0;
    let sy = 0;
    if (this.trauma > 0) {
      const genlik = this.trauma * this.trauma * SAHNE.sarsintiTavan * this.sarsintiCarpani;
      if (this.yonluKare > 0) {
        const isaret = this.yonluKare > 1e8 ? this.rng.isaretli() : 1;
        sx = this.yon.x * genlik * isaret;
        sy = this.yon.y * genlik * isaret;
        if (this.yonluKare < 1e8) this.yonluKare--;
      } else {
        sx = this.rng.isaretli() * genlik;
        sy = this.rng.isaretli() * genlik;
      }
      this.trauma = Math.max(0, this.trauma - SAHNE.traumaSonum * dt);
      if (this.trauma === 0) this.yonluKare = 0;
    }
    let z = 1;
    if (this.zoom.kalan > 0) {
      this.zoom.kalan = Math.max(0, this.zoom.kalan - dt);
      const t = 1 - this.zoom.kalan / this.zoom.sure; // 0 → 1
      z = 1 + this.zoom.tepe * (t < 0.3 ? t / 0.3 : (1 - t) / 0.7);
      if (this.zoom.kalan === 0) this.zoom.tepe = 0;
    }
    this.dunya.scale.set(z);
    this.dunya.position.set(SAHNE.merkezX + Math.round(sx), SAHNE.merkezY + Math.round(sy));
  }

  yokEt(): void {
    this.kok.destroy({ children: true });
  }
}
