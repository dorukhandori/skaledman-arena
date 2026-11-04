import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import { type Girdi, bosGirdi } from "../../paylasilan/sim/Girdi.ts";
import type { Sahne } from "./Sahne.ts";

/**
 * Klavye + fare → paylaşılan `Girdi` (ux § 1): WASD/oklar sür, Shift dash, Space Sekme, Z basılı Sıkı Dönüş,
 * 1-4 / sol-sağ tık yetenek yuvası (basılı tut nişan, BIRAK = at; D3), Tab geri çek (D2).
 * Fare yalnız yetenek yönüdür; sürüşü etkilemez. Odak kaybında tüm tuşlar sıfırlanır (ux § 1.4).
 */
export class OyuncuGirdisi {
  private basili = new Set<string>();
  private fare = { x: 0, y: 0 };
  private secili = 0;
  private bekleyenAtes = false;
  private bekleyenDash = false;
  private bekleyenZipla = false;
  private yuvaBasili = false;
  private dinleyiciler: (() => void)[] = [];

  constructor(private tuval: HTMLCanvasElement, private ekranBoyutu: () => { width: number; height: number }) {
    const ekle = <T extends keyof WindowEventMap>(ad: T, f: (e: WindowEventMap[T]) => void) => {
      window.addEventListener(ad, f as EventListener);
      this.dinleyiciler.push(() => window.removeEventListener(ad, f as EventListener));
    };
    ekle("keydown", (e) => this.tusAsagi(e));
    ekle("keyup", (e) => this.tusYukari(e));
    ekle("blur", () => this.sifirla());
    ekle("mousemove", (e) => this.fareKonumu(e));
    ekle("mouseup", (e) => this.fareBirakildi(e));
    const bag = (e: Event) => { if (e.target === tuval) e.preventDefault(); };
    const asagi = (e: MouseEvent) => this.fareBasildi(e);
    tuval.addEventListener("contextmenu", bag);
    tuval.addEventListener("mousedown", asagi);
    this.dinleyiciler.push(() => { tuval.removeEventListener("contextmenu", bag); tuval.removeEventListener("mousedown", asagi); });
    const gizli = () => { if (document.hidden) this.sifirla(); };
    document.addEventListener("visibilitychange", gizli);
    this.dinleyiciler.push(() => document.removeEventListener("visibilitychange", gizli));
  }

  get secilenYuva(): number { return this.secili; }

  sifirla(): void {
    this.basili.clear();
    this.bekleyenAtes = false;
    this.bekleyenDash = false;
    this.bekleyenZipla = false;
    this.yuvaBasili = false;
  }

  /** Bir sim adımı için girdi. Tek seferlik bayraklar ilk adımda tüketilir. */
  olustur(sahne: Sahne): Girdi {
    const g = bosGirdi();
    const b = this.basili;
    g.yonX = (b.has("KeyD") || b.has("ArrowRight") ? 1 : 0) - (b.has("KeyA") || b.has("ArrowLeft") ? 1 : 0);
    g.yonZ = (b.has("KeyS") || b.has("ArrowDown") ? 1 : 0) - (b.has("KeyW") || b.has("ArrowUp") ? 1 : 0);
    const n = sahne.ekrandanDunyaya(this.fare.x, this.fare.y);
    g.nisanX = n.x;
    g.nisanZ = n.z;
    g.secilenYuva = this.secili;
    g.atesle = this.bekleyenAtes;
    g.dash = this.bekleyenDash;
    g.zipla = this.bekleyenZipla;
    g.dinlen = b.has("KeyZ");
    this.bekleyenAtes = false;
    this.bekleyenDash = false;
    this.bekleyenZipla = false;
    return g;
  }

  private tusAsagi(e: KeyboardEvent): void {
    const hedef = e.target as HTMLElement | null;
    if (hedef && (hedef.tagName === "INPUT" || hedef.tagName === "SELECT" || hedef.tagName === "TEXTAREA") && e.code !== "Escape") return;
    if (e.code.startsWith("Arrow") || e.code === "Space" || e.code === "Tab") e.preventDefault();
    if (e.repeat) return;
    this.basili.add(e.code);
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.bekleyenDash = true;
    if (e.code === "Space") this.bekleyenZipla = true;
    if (e.code === "Escape") this.yuvaBasili = false;
    const m = /^Digit([1-4])$/.exec(e.code);
    if (m) { this.secili = Math.min(AYAR.yuvaSayisi - 1, Number(m[1]) - 1); this.yuvaBasili = true; }
  }

  private tusYukari(e: KeyboardEvent): void {
    this.basili.delete(e.code);
    if (/^Digit[1-4]$/.test(e.code) && this.yuvaBasili) { this.yuvaBasili = false; this.bekleyenAtes = true; }
  }

  private fareKonumu(e: MouseEvent): void {
    const r = this.tuval.getBoundingClientRect();
    const b = this.ekranBoyutu();
    this.fare.x = ((e.clientX - r.left) * b.width) / (r.width || 1);
    this.fare.y = ((e.clientY - r.top) * b.height) / (r.height || 1);
  }

  private fareBasildi(e: MouseEvent): void {
    this.fareKonumu(e);
    if (e.button === 0) { this.secili = 0; this.yuvaBasili = true; }
    if (e.button === 2) { this.secili = 1; this.yuvaBasili = true; }
  }

  private fareBirakildi(e: MouseEvent): void {
    if ((e.button === 0 || e.button === 2) && this.yuvaBasili) {
      this.yuvaBasili = false;
      this.fareKonumu(e);
      this.bekleyenAtes = true;
    }
  }

  yokEt(): void {
    for (const f of this.dinleyiciler) f();
    this.dinleyiciler = [];
  }
}
