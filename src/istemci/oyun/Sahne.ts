import { Application, Container, Graphics, Rectangle } from "pixi.js";
import type { TopacProfili } from "../../paylasilan/veri/profil.ts";
import { HibritArena } from "./HibritArena.ts";
import { KusakArenasi } from "./KusakArenasi.ts";
import { SusRastgele } from "./SusRastgele.ts";
import { type TakimIsareti, TopacGorsel } from "./TopacGorsel.ts";
import { TopacYandan } from "./TopacYandan.ts";
import type { ArenaCizimi, TopacCizimi } from "./cizimTurleri.ts";
import { KAMERA, type KameraKipi, ekrandanSime } from "./kamera.ts";

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

export { KAMERA, type KameraKipi } from "./kamera.ts";

/**
 * Sahne (pixel planı § 1.1; GU-00 Hibrit): arka (tribün, parallax), zemin, iz, gölge, nesne (ekranY'ye göre sıralı), dudak
 * (yakın çanak dudağı topacın ÜSTÜNDE), efekt ve ekran katmanları. Sarsıntı trauma modelidir: genlik = trauma² · tavan;
 * ilk 2 kare normal boyunca tek yönlü, sonra tohumlu gürültü. Zoom darbesi dünyayı merkez etrafında ölçekler.
 * Hibrit kipte dünya 480×270 önbellek dokusuna çizilip `nearest` büyütülür (pixel görünüm, İ-4); "Düz" kipte eski çizim aynen.
 */
export class Sahne {
  readonly kok = new Container();
  /** pixel önbelleği (hibrit): dünya + arka; sınırı sabit 960×540 */
  private piksel = new Container();
  /** sarsıntı ve zoom bu kapsayıcıya uygulanır; HUD dışı her şey içinde */
  readonly dunya = new Container();
  /** tribün (hibrit; sarsıntının yarısını alır: hafif parallax) */
  readonly arkaKatmani = new Container();
  /** çanağın arkası (uzak duvarın gerisine düşen Ring Out topacı) */
  readonly arkaNesneKatmani = new Container();
  readonly zeminKatmani = new Container();
  /** zemin düzlemi: içindeki çizimler düz sim koordinatında (merkezX + x, merkezY + z) yapılır, kapsayıcı basar (elips) */
  readonly zeminDuzlem = new Container();
  readonly izKatmani = new Container();
  readonly golgeKatmani = new Container();
  readonly nesneKatmani = new Container();
  /** çanak dudağı: topacın üstünde (Ring Out'ta kenarın arkasına düşüş, pixel planı § 6.1) */
  readonly dudakKatmani = new Container();
  readonly efektKatmani = new Container();
  /** efekt üstü zemin düzlemi (nişan, bağ çizgisi, kenar uyarısı): düz koordinat, basılı */
  readonly ustDuzlem = new Container();
  readonly arena: ArenaCizimi;
  /** ekran flaşı: sarsıntıdan etkilenmez */
  readonly ekranKatmani = new Container();
  /** sağda DOM panel için ayrılan CSS piksel */
  sagBosluk = 0;
  olcek = 1;
  /** D8 seyirci/OBS (ux § 5): sabit 960×540, tam sayı ölçek (≥ 1 iken) — yayın ölçeklemesinde bulanıklık yok. */
  tamSayiOlcek = false;
  /** z basıklığı (hibrit KAMERA.zOrani; düz 1) */
  readonly k: number;
  /** kamera yakınlığı (hibrit KAMERA.yakinlik; düz 1) */
  readonly yakinlik: number;
  /** çanak merkezinin dünya y'si */
  readonly my: number;
  private trauma = 0;
  private yonluKare = 0;
  private yon = { x: 0, y: 0 };
  private zoom = { tepe: 0, sure: 0, kalan: 0 };
  private rng = new SusRastgele(0x5a5a);
  private son = { w: 0, h: 0, b: -1 };
  private sarsintiCarpani = 1;
  /** Sürekli asgari trauma (Ulti telegrafı: 0,5 px). Her kare yeniden yazılır. */
  sarsintiTaban = 0;

  constructor(private app: Application, readonly kip: KameraKipi = "duz") {
    const hibrit = kip === "hibrit";
    this.k = hibrit ? KAMERA.zOrani : 1;
    this.yakinlik = hibrit ? KAMERA.yakinlik : 1;
    this.my = SAHNE.merkezY + (hibrit ? KAMERA.kaymaY : 0);
    for (const d of [this.zeminDuzlem, this.ustDuzlem]) {
      d.pivot.set(SAHNE.merkezX, SAHNE.merkezY);
      d.position.set(SAHNE.merkezX, this.my);
      d.scale.set(1, this.k);
    }
    const maske = new Graphics().rect(0, 0, SAHNE.genislik, SAHNE.yukseklik).fill(0xffffff);
    this.zeminKatmani.addChild(this.zeminDuzlem);
    this.efektKatmani.addChild(this.ustDuzlem);
    this.nesneKatmani.sortableChildren = true;
    this.dunya.addChild(this.arkaNesneKatmani, this.zeminKatmani, this.izKatmani, this.golgeKatmani, this.nesneKatmani, this.dudakKatmani, this.efektKatmani);
    this.dunya.pivot.set(SAHNE.merkezX, SAHNE.merkezY);
    this.dunya.position.set(SAHNE.merkezX, SAHNE.merkezY);
    this.arkaKatmani.pivot.set(SAHNE.merkezX, SAHNE.merkezY);
    this.arkaKatmani.position.set(SAHNE.merkezX, SAHNE.merkezY);
    if (hibrit) {
      // sabit sınırlı pixel önbelleği: arka plan dikdörtgeni + boundsArea → doku her zaman 480×270, ızgara kaymaz
      this.piksel.addChild(new Graphics().rect(0, 0, SAHNE.genislik, SAHNE.yukseklik).fill(0x0f1020), this.arkaKatmani, this.dunya);
      this.piksel.boundsArea = new Rectangle(0, 0, SAHNE.genislik, SAHNE.yukseklik);
      this.piksel.cacheAsTexture({ resolution: KAMERA.pikselCozunurluk, antialias: false, scaleMode: "nearest" });
      this.kok.addChild(this.piksel, this.ekranKatmani, maske);
      const a = new HibritArena(this);
      this.arena = a;
      this.arkaKatmani.addChild(a.arka);
      this.zeminKatmani.addChildAt(a.zemin, 0);
      this.zeminDuzlem.addChild(a.zeminDuzlemCizim);
      this.dudakKatmani.addChild(a.dudak);
    } else {
      this.kok.addChild(this.dunya, this.ekranKatmani, maske);
      const a = new KusakArenasi(SAHNE.merkezX, SAHNE.merkezY, SAHNE.genislik, SAHNE.yukseklik);
      this.arena = a;
      this.zeminKatmani.addChildAt(a.zemin, 0);
      this.dudakKatmani.addChild(a.dudak);
    }
    this.kok.mask = maske;
    app.stage.addChild(this.kok);
    this.boyutla(true);
  }

  get hibrit(): boolean { return this.kip === "hibrit"; }

  /** Sim (x, z) → dünya (x, y) (zemin, yükseklik 0). */
  ekranX(x: number): number { return SAHNE.merkezX + x; }
  ekranY(z: number): number { return this.my + z * this.k; }

  /** Sim yönü (nx, nz) → dünya ekranında birim yön (sarsıntı, squash normali, parçacık yönü; 05 § 3.3). */
  ekranYon(nx: number, nz: number): { x: number; y: number } {
    const y = nz * this.k;
    const u = Math.hypot(nx, y);
    return u > 1e-9 ? { x: nx / u, y: y / u } : { x: 0, y: 0 };
  }

  /** Dünya noktası → mantıksal ekran (sarsıntı/zoom darbesi hariç; ekran katmanı ve DOM hizası için). */
  dunyadanEkrana(wx: number, wy: number): { x: number; y: number } {
    const B = this.yakinlik;
    return { x: SAHNE.merkezX + (wx - SAHNE.merkezX) * B, y: SAHNE.merkezY + (wy - SAHNE.merkezY) * B };
  }

  /** Tuval pikseli (CSS) → sim noktası (zemin düzlemi; ters dönüşüm: z = (ekran − merkez) / zOrani). */
  ekrandanDunyaya(px: number, py: number): { x: number; z: number } {
    return ekrandanSime({ k: this.k, B: this.yakinlik, my: this.my }, (px - this.kok.x) / this.olcek, (py - this.kok.y) / this.olcek);
  }

  /** Mantıksal çerçevenin CSS konumu (DOM HUD hizalaması için). */
  cerceve(): { x: number; y: number; olcek: number } {
    return { x: this.kok.x, y: this.kok.y, olcek: this.olcek };
  }

  /** Kipine göre topaç çizimi (hibrit: yandan katmanlı; düz: eski tam üstten) ve katmanlara ekleme. */
  topacOlustur(p: TopacProfili, takim: TakimIsareti): TopacCizimi {
    const g: TopacCizimi = this.hibrit ? new TopacYandan(p, takim, this) : new TopacGorsel(p, takim, this.golgeKatmani, this.efektKatmani);
    this.nesneKatmani.addChild(g.kok);
    return g;
  }

  /** Ayar › Ekran sarsıntısı: 1 / 0,5 / 0. */
  sarsintiAyari(c: number): void { this.sarsintiCarpani = c; }

  /**
   * Trauma ekler (0..1). `nx, ny` (sim yönü) verilirse ilk 2 kare bu yönün ekran izdüşümünde tek yönlü itme.
   * `tekYon` true ise (duvar) tüm sarsıntı normal boyunca kalır.
   */
  sars(trauma: number, nx = 0, ny = 0, tekYon = false): void {
    this.trauma = Math.min(1, this.trauma + trauma);
    const e = this.ekranYon(nx, ny);
    if (e.x !== 0 || e.y !== 0) { this.yon = e; this.yonluKare = tekYon ? 1e9 : 2; }
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
      if (this.tamSayiOlcek && this.olcek >= 1) this.olcek = Math.floor(this.olcek);
      this.kok.scale.set(this.olcek);
      this.kok.position.set(Math.round((w - SAHNE.genislik * this.olcek) / 2), Math.round((h - SAHNE.yukseklik * this.olcek) / 2));
    }
    // sarsıntı
    let sx = 0;
    let sy = 0;
    if (this.sarsintiTaban > this.trauma) this.trauma = this.sarsintiTaban;
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
    this.dunya.scale.set(z * this.yakinlik);
    this.dunya.position.set(SAHNE.merkezX + Math.round(sx), SAHNE.merkezY + Math.round(sy));
    if (this.hibrit) {
      // tribün: sarsıntının yarısı, zoom'un yarısı (hafif parallax)
      this.arkaKatmani.scale.set(1 + (z - 1) * 0.5);
      this.arkaKatmani.position.set(SAHNE.merkezX + Math.round(sx * 0.5), SAHNE.merkezY + Math.round(sy * 0.5));
      this.piksel.updateCacheTexture();
    }
  }

  yokEt(): void {
    this.kok.destroy({ children: true });
  }
}
