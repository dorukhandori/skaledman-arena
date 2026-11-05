import { Container, MeshRope, Point, Texture } from "pixi.js";

// Topaç izi (pixel planı § 5.2): MeshRope, topaç başına 1, halka tampon. Hıza göre uzunluk/saydamlık; düşük kademede kısa.
// Düz görünüm: element renginde düz iz (v0).
// GU-C Hibrit (referans 07): KREM SARMAL iz. İz noktası topacın merkezi değil, zemindeki temas çemberi üzerinde dönüş
// yönünde dolanan bir nokta (yarıçap ~topaç, zeminde elips); topaç ilerledikçe bu nokta kıvrılan bir sarmal (sikloit) çizer.
// İki şerit: dışta element rengine hafif çalan krem hale, içte parlak krem çekirdek; kuyruk incelir ve söner.

export const IZ_NOKTA = 12;
/** sarmal iz: nokta sayısı (her kare bir nokta ≈ 0,4 sn), dolanma hızı (tur/sn), yarıçap (dünya px) */
export const SARMAL = { nokta: 26, turHiz: 1.6, yaricap: 30, krem: 0xf6d9a8, cekirdek: 0xfff4dc } as const;
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
  /** sarmal dolanma yönü: sağ dönüş 1, sol −1 */
  donus = 1;

  /** `zOrani` > 0 → Hibrit sarmal iz (zemin elipsi bu basıklıkta); 0 → düz iz */
  constructor(renk: number, private zOrani = 0) {
    const n = zOrani > 0 ? SARMAL.nokta : IZ_NOKTA;
    for (let i = 0; i < n; i++) this.noktalar.push(new Point(i * 0.5, 0));
    this.rope = new MeshRope({ texture: dokuUret(), points: this.noktalar, width: zOrani > 0 ? 11 : 14 });
    this.kap.addChild(this.rope);
    if (zOrani > 0) {
      for (let i = 0; i < n; i++) this.cekirdekNokta.push(new Point(i * 0.5, 0));
      this.cekirdek = new MeshRope({ texture: dokuUret(), points: this.cekirdekNokta, width: 4 });
      this.cekirdek.tint = SARMAL.cekirdek;
      this.kap.addChild(this.cekirdek);
    }
    this.renk = renk;
    this.kap.visible = false;
  }

  set renk(r: number) { this.rope.tint = this.zOrani > 0 ? karistir(SARMAL.krem, r, 0.25) : r; }

  sifirla(): void {
    this.gecmis = [];
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
    const N = SARMAL.nokta;
    this.faz += this.donus * SARMAL.turHiz * (uzun ? 1.3 : 1) * Math.PI * 2 * Math.min(0.05, dt);
    const r = SARMAL.yaricap;
    this.gecmis.push({ x: x + Math.cos(this.faz) * r, y: y + Math.sin(this.faz) * r * this.zOrani });
    if (this.gecmis.length > N) this.gecmis.shift();
    const n = this.gecmis.length;
    if (n < 4 || guc < 0.08) { this.kap.visible = false; return; }
    this.kap.visible = true;
    this.kap.alpha = Math.min(0.95, guc * 1.2);
    for (let i = 0; i < N; i++) {
      const k = this.gecmis[Math.max(0, n - N + i)]!;
      const pad = N - n > i ? (N - n - i) * 0.01 : 0;
      this.noktalar[i]!.set(k.x - pad, k.y);
      this.cekirdekNokta[i]!.set(k.x - pad, k.y);
    }
  }

  yokEt(): void { this.kap.destroy({ children: true }); }
}
