import { MeshRope, Point, Texture } from "pixi.js";

// Topaç izi (pixel planı § 5.2): MeshRope, topaç başına 1, 12 nokta halka tampon. Hıza göre uzunluk/saydamlık;
// düşük kademede kısa. Renk element, dönüş yönü kıvrım yönüyle değil şimdilik yalnız renk (v0).

export const IZ_NOKTA = 12;
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

export class Iz {
  readonly rope: MeshRope;
  private noktalar: Point[] = [];
  private gecmis: { x: number; y: number }[] = [];

  constructor(renk: number) {
    for (let i = 0; i < IZ_NOKTA; i++) this.noktalar.push(new Point(i * 0.5, 0));
    this.rope = new MeshRope({ texture: dokuUret(), points: this.noktalar, width: 14 });
    this.rope.tint = renk;
    this.rope.visible = false;
  }

  set renk(r: number) { this.rope.tint = r; }

  sifirla(): void {
    this.gecmis = [];
    this.rope.visible = false;
  }

  /** Her kare: yeni konum + 0..1 güç (hız · kademe). */
  guncelle(x: number, y: number, guc: number): void {
    const son = this.gecmis[this.gecmis.length - 1];
    if (!son || Math.hypot(x - son.x, y - son.y) > 2) {
      this.gecmis.push({ x, y });
      if (this.gecmis.length > IZ_NOKTA) this.gecmis.shift();
    } else {
      son.x = x; son.y = y;
    }
    const n = this.gecmis.length;
    if (n < 3 || guc < 0.05) { this.rope.visible = false; return; }
    this.rope.visible = true;
    this.rope.alpha = Math.min(0.85, guc);
    // eski noktalar ilk; eksik yuvaları ilk noktayla doldur ama çakışmayı önlemek için küçük kaydır
    for (let i = 0; i < IZ_NOKTA; i++) {
      const j = Math.max(0, n - IZ_NOKTA + i);
      const k = this.gecmis[Math.min(j, n - 1)]!;
      const pad = IZ_NOKTA - n > i ? (IZ_NOKTA - n - i) * 0.01 : 0;
      this.noktalar[i]!.set(k.x - pad, k.y);
    }
  }

  yokEt(): void { this.rope.destroy(); }
}
