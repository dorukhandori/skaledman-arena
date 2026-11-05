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
  /** Nişan modu (ux § 1.3): fare = imleç yönü; hareket = son sürüş yönü (nişan çizgisi çizilmez). */
  nisanModu: "fare" | "hareket" = "fare";
  /** Bırakma noktası iptal bölgesinde mi (alt şerit y > 492, mantıksal): Mac ekranı bağlar. */
  iptalBolgesi: (px: number, py: number) => boolean = () => false;
  /** İptal edilen bırakma sayısı (HUD geri bildirimi / test). */
  iptalSayisi = 0;
  private sonSurusYonu = { x: 1, z: 0 };
  private sonNisanYonu = { x: 1, z: 0 };

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
  /** Basılı tutulan yuva (nişanlanıyor), yoksa −1. */
  get basiliYuva(): number { return this.yuvaBasili ? this.secili : -1; }
  /** Fare (CSS tuval pikseli). */
  get fareKonum(): { x: number; y: number } { return { ...this.fare }; }

  /** Basılıyken Esc: yetenek iptal (ux § 1). */
  iptalEt(): boolean {
    if (!this.yuvaBasili) return false;
    this.yuvaBasili = false;
    this.iptalSayisi++;
    return true;
  }

  /** Bırakma anı: iptal bölgesindeyse atma (atesle = 0). */
  private birak(): void {
    this.yuvaBasili = false;
    if (this.iptalBolgesi(this.fare.x, this.fare.y)) { this.iptalSayisi++; return; }
    this.bekleyenAtes = true;
  }

  sifirla(): void {
    this.basili.clear();
    this.bekleyenAtes = false;
    this.bekleyenDash = false;
    this.bekleyenZipla = false;
    this.yuvaBasili = false;
  }

  /**
   * Bir sim adımı için girdi. Tek seferlik bayraklar ilk adımda tüketilir. `ben`: yerel topacın konumu (nişan yönü:
   * imleç topaca 20 px'ten yakınsa son yön korunur; "Hareket yönü" modunda son sürüş yönü).
   */
  olustur(sahne: Sahne, ben: { x: number; z: number } = { x: 0, z: 0 }): Girdi {
    const g = bosGirdi();
    const b = this.basili;
    g.yonX = (b.has("KeyD") || b.has("ArrowRight") ? 1 : 0) - (b.has("KeyA") || b.has("ArrowLeft") ? 1 : 0);
    g.yonZ = (b.has("KeyS") || b.has("ArrowDown") ? 1 : 0) - (b.has("KeyW") || b.has("ArrowUp") ? 1 : 0);
    if (g.yonX !== 0 || g.yonZ !== 0) { const u = Math.hypot(g.yonX, g.yonZ); this.sonSurusYonu = { x: g.yonX / u, z: g.yonZ / u }; }
    const n = this.nisanNoktasi(sahne, ben);
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

  /** Nişan noktası (dünya): fare modunda imleç (topaca < 20 px ise son yön), hareket modunda son sürüş yönü. */
  nisanNoktasi(sahne: Sahne, ben: { x: number; z: number }): { x: number; z: number } {
    if (this.nisanModu === "hareket") return { x: ben.x + this.sonSurusYonu.x * 150, z: ben.z + this.sonSurusYonu.z * 150 };
    const n = sahne.ekrandanDunyaya(this.fare.x, this.fare.y);
    const dx = n.x - ben.x;
    const dz = n.z - ben.z;
    const m = Math.hypot(dx, dz);
    if (m < 20) return { x: ben.x + this.sonNisanYonu.x * 100, z: ben.z + this.sonNisanYonu.z * 100 };
    this.sonNisanYonu = { x: dx / m, z: dz / m };
    return n;
  }

  private tusAsagi(e: KeyboardEvent): void {
    const hedef = e.target as HTMLElement | null;
    if (hedef && (hedef.tagName === "INPUT" || hedef.tagName === "SELECT" || hedef.tagName === "TEXTAREA") && e.code !== "Escape") return;
    if (e.code.startsWith("Arrow") || e.code === "Space" || e.code === "Tab") e.preventDefault();
    if (e.repeat) return;
    this.basili.add(e.code);
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.bekleyenDash = true;
    if (e.code === "Space") this.bekleyenZipla = true;
    if (e.code === "Escape") this.iptalEt();
    const m = /^Digit([1-4])$/.exec(e.code);
    if (m) { this.secili = Math.min(AYAR.yuvaSayisi - 1, Number(m[1]) - 1); this.yuvaBasili = true; }
  }

  private tusYukari(e: KeyboardEvent): void {
    this.basili.delete(e.code);
    if (/^Digit[1-4]$/.test(e.code) && this.yuvaBasili && Number(e.code.slice(5)) - 1 === this.secili) this.birak();
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
      this.fareKonumu(e);
      this.birak();
    }
  }

  yokEt(): void {
    for (const f of this.dinleyiciler) f();
    this.dinleyiciler = [];
  }
}
