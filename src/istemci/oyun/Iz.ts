import { Container, Graphics, MeshRope, Point, Texture } from "pixi.js";

// Topaç izi (pixel planı § 5.2): MeshRope, topaç başına 1, halka tampon. Hıza göre uzunluk/saydamlık; düşük kademede kısa.
// Düz görünüm: element renginde düz iz (v0).
// Hibrit (referans 07): KREM SARMAL iz. GU-C: temas çemberinde dolanan noktanın geçmişi (sikloit) → topaç yavaşken
// art arda ilmekler. GU-D: TEK KALIN KIVRIM: topaca bağlı bir sarmal kol; başı topacın temas çemberinde (dönüş yönünde
// dolanır), kol geriye doğru ~0,9 tur kıvrılıp 2,1 katına açılır, hareketin tersine uzar; kalınlık ve saydamlık
// kuyruğa doğru incelir (sivri uç). İki şerit: dışta element rengine hafif çalan krem hale, içte parlak krem çekirdek.

export const IZ_NOKTA = 12;
/** sarmal iz: parça sayısı, dolanma hızı (tur/sn), baş yarıçapı (dünya px), kolun kıvrımı (tur), açılma (yarıçap ×),
 *  hareketin tersine en çok uzama (px), baş kalınlığı (hale / çekirdek, px) */
export const SARMAL = {
  parca: 24, turHiz: 1.6, yaricap: 32, kivrim: 0.9, acilma: 1.1, uzama: 30, kalin: 11, cekirdekKalin: 4,
  krem: 0xf6d9a8, cekirdek: 0xfff4dc,
} as const;
let izDokusu: Texture | null = null;

function dokuUret(): Texture {
  if (izDokusu) return izDokusu;
  const c = document.createElement("canvas");
  c.width = 64; c.height = 8;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 64, 0);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(255,255,255,0.9)");
  x.fillStyle = g;
  x.fillRect(0, 1, 64, 6);
  izDokusu = Texture.from(c);
  return izDokusu;
}

const karistir = (a: number, b: number, t: number): number => {
  const k = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t) << s;
  return k(16) | k(8) | k(0);
};

export class Iz {
  /** sahneye eklenecek kap (düz: tek şerit; sarmal: hale + çekirdek) */
  readonly kap = new Container();
  readonly rope: MeshRope;
  private cekirdek: MeshRope | null = null;
  private noktalar: Point[] = [];
  private cekirdekNokta: Point[] = [];
  private gecmis: { x: number; y: number }[] = [];
  private faz = 0;
  /** sarmal (hibrit) çizimi; düzde null */
  private sarmalG: Graphics | null = null;
  private haleRenk: number = SARMAL.krem;
  /** son konum ve yumuşatılmış ekran hızı (kolun hareketin tersine uzaması için) */
  private son: { x: number; y: number } | null = null;
  private v = { x: 0, y: 0 };
  /** sarmal dolanma yönü: sağ dönüş 1, sol −1 */
  donus = 1;

  /** `zOrani` > 0 → Hibrit sarmal iz (zemin elipsi bu basıklıkta); 0 → düz iz */
  constructor(renk: number, private zOrani = 0) {
    for (let i = 0; i < IZ_NOKTA; i++) this.noktalar.push(new Point(i * 0.5, 0));
    this.rope = new MeshRope({ texture: dokuUret(), points: this.noktalar, width: 14 });
    if (zOrani > 0) {
      this.sarmalG = new Graphics();
      this.kap.addChild(this.sarmalG);
    } else this.kap.addChild(this.rope);
    this.renk = renk;
    this.kap.visible = false;
  }

  set renk(r: number) {
    this.rope.tint = r;
    this.haleRenk = karistir(SARMAL.krem, r, 0.25);
  }

  sifirla(): void {
    this.gecmis = [];
    this.son = null;
    this.v = { x: 0, y: 0 };
    this.kap.visible = false;
  }

  /** Her kare: yeni konum + 0..1 güç (hız · kademe). `uzun`: hız şeridinde iz uzar (nokta aralığı büyür). */
  guncelle(x: number, y: number, guc: number, uzun = false, dt = 1 / 60): void {
    if (this.zOrani > 0) { this.sarmalGuncelle(x, y, guc, uzun, dt); return; }
    const son = this.gecmis[this.gecmis.length - 1];
    if (!son || Math.hypot(x - son.x, y - son.y) > (uzun ? 5 : 2)) {
      this.gecmis.push({ x, y });
      if (this.gecmis.length > IZ_NOKTA) this.gecmis.shift();
    } else {
      son.x = x; son.y = y;
    }
    const n = this.gecmis.length;
    if (n < 3 || guc < 0.05) { this.kap.visible = false; return; }
    this.kap.visible = true;
    this.rope.alpha = Math.min(0.85, guc);
    // eski noktalar ilk; eksik yuvaları ilk noktayla doldur ama çakışmayı önlemek için küçük kaydır
    for (let i = 0; i < IZ_NOKTA; i++) {
      const j = Math.max(0, n - IZ_NOKTA + i);
      const k = this.gecmis[Math.min(j, n - 1)]!;
      const pad = IZ_NOKTA - n > i ? (IZ_NOKTA - n - i) * 0.01 : 0;
      this.noktalar[i]!.set(k.x - pad, k.y);
    }
  }

  private sarmalGuncelle(x: number, y: number, guc: number, uzun: boolean, dt: number): void {
    const S = SARMAL;
    const h = Math.min(0.05, Math.max(1e-3, dt));
    this.faz += this.donus * S.turHiz * (uzun ? 1.3 : 1) * Math.PI * 2 * h;
    // yumuşatılmış ekran hızı (ışınlanma/tur başı sıçramaları sınırlı)
    if (this.son) {
      const vx = (x - this.son.x) / h, vy = (y - this.son.y) / h;
      const ok = Math.hypot(vx, vy) < 2000;
      const a = Math.min(1, h * 10);
      if (ok) { this.v.x += (vx - this.v.x) * a; this.v.y += (vy - this.v.y) * a; }
    }
    this.son = { x, y };
    const g = this.sarmalG!.clear();
    if (guc < 0.08) { this.kap.visible = false; return; }
    this.kap.visible = true;
    this.kap.alpha = Math.min(1, 0.45 + guc);
    const hiz = Math.hypot(this.v.x, this.v.y);
    const L = Math.min(S.uzama, hiz * 0.1) * (uzun ? 1.3 : 1);
    const dx = hiz > 1e-6 ? this.v.x / hiz : 0, dy = hiz > 1e-6 ? this.v.y / hiz : 0;
    const k = this.zOrani;
    const nokta = (u: number): [number, number] => {
      // baş (u = 0) temas çemberinde dönüş yönünde; kol dönüşün tersine kıvrılır, açılır ve hareketin tersine uzar
      const a = this.faz - this.donus * u * S.kivrim * Math.PI * 2;
      const r = S.yaricap * (1 + S.acilma * u);
      return [x + Math.cos(a) * r - dx * L * u, y + Math.sin(a) * r * k - dy * L * u];
    };
    // şerit çokgeni (tek dolgu: üst üste binen yarı saydam parça uçları boncuk gibi görünmesin); kalınlık kuyruğa incelir
    const P: [number, number][] = [];
    for (let q = 0; q <= S.parca; q++) P.push(nokta(q / S.parca));
    const serit = (kalin: number, uc: number): number[] => {
      const sol: number[] = [], sag: number[] = [];
      for (let q = 0; q <= S.parca; q++) {
        const [ax, ay] = P[Math.max(0, q - 1)]!, [bx, by] = P[Math.min(S.parca, q + 1)]!;
        const tx = bx - ax, ty = by - ay, tu = Math.hypot(tx, ty) || 1;
        const w = (uc + kalin * Math.pow(1 - q / S.parca, 0.8)) / 2;
        const [px, py] = P[q]!;
        sol.push(px - (ty / tu) * w, py + (tx / tu) * w);
        sag.unshift(px + (ty / tu) * w, py - (tx / tu) * w);
      }
      return [...sol, ...sag];
    };
    g.poly(serit(S.kalin, 1)).fill({ color: this.haleRenk, alpha: 0.85 });
    g.poly(serit(S.cekirdekKalin, 0.3)).fill({ color: S.cekirdek, alpha: 1 });
  }

  yokEt(): void { this.kap.destroy({ children: true }); }
}
