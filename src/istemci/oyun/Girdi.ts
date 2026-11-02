import { type Girdi, bosGirdi } from "../../paylasilan/sim/Girdi.ts";
import { YUVA_SAYISI } from "../../paylasilan/kurallar/hamleler.ts";
import type { Sahne } from "./Sahne.ts";

/**
 * Klavye + fare → paylaşılan `Girdi` (K-7):
 * WASD/oklar hareket, 1-4 ve tekerlek yuva seçer, sağ tuş basılı nişan + bırakınca atış,
 * sol tık seçili yuvayı anında atar, Shift dash, Space zıplama, Z basılı dinlenme, Q/E takımda önceki/sonraki,
 * Tab basılıyken 1-3 üye seçer ve yeni üye fare noktasına düşer (Q/E de Tab ile düşüş noktası alır). Esc nişanı iptal eder.
 */

/** Girdinin takım isteğini çözmek için gereken salt-okunur bilgi. */
export interface TakimBilgisi { aktif: number; ko: readonly boolean[] }

type DegisimIstegi = { tur: "kaydir"; yon: 1 | -1 } | { tur: "uye"; i: number };
export class OyuncuGirdisi {
  private basili = new Set<string>();
  private fare = { x: 0, y: 0 };
  private secili = 0;
  private bekleyenAtes = false;
  private bekleyenDash = false;
  private bekleyenZipla = false;
  private bekleyenDegisim: DegisimIstegi | null = null;
  private _nisanAliyor = false;
  private yuvaDolu: boolean[] = new Array<boolean>(YUVA_SAYISI).fill(true);
  private dinleyiciler: (() => void)[] = [];

  constructor(private tuval: HTMLCanvasElement, private ekranBoyutu: () => { width: number; height: number }) {
    const ekle = <T extends keyof WindowEventMap>(hedef: Window, ad: T, f: (e: WindowEventMap[T]) => void) => {
      hedef.addEventListener(ad, f as EventListener);
      this.dinleyiciler.push(() => hedef.removeEventListener(ad, f as EventListener));
    };
    ekle(window, "keydown", (e) => this.tusAsagi(e));
    ekle(window, "keyup", (e) => this.basili.delete(e.code));
    ekle(window, "blur", () => { this.basili.clear(); this._nisanAliyor = false; });
    ekle(window, "mousemove", (e) => this.fareKonumu(e));
    ekle(window, "mouseup", (e) => this.fareBirakildi(e));
    ekle(window, "wheel", (e) => this.tekerlek(e));
    const tuvaleEkle = <T extends keyof HTMLElementEventMap>(ad: T, f: (e: HTMLElementEventMap[T]) => void) => {
      tuval.addEventListener(ad, f as EventListener);
      this.dinleyiciler.push(() => tuval.removeEventListener(ad, f as EventListener));
    };
    tuvaleEkle("mousedown", (e) => this.fareBasildi(e));
    tuvaleEkle("contextmenu", (e) => e.preventDefault());
    const bag = (e: Event) => e.preventDefault();
    window.addEventListener("contextmenu", bag);
    this.dinleyiciler.push(() => window.removeEventListener("contextmenu", bag));
  }

  get nisanAliyor(): boolean { return this._nisanAliyor; }
  get secilenYuva(): number { return this.secili; }
  /** Tab basılı: takım paneli ve düşüş noktası nişanı */
  get takimPaneli(): boolean { return this.basili.has("Tab"); }

  /** Boş yuvalar tekerlekte atlanır ve seçilemez. */
  yuvalariBildir(dolu: boolean[]): void {
    this.yuvaDolu = dolu;
    if (!dolu[this.secili]) this.secili = Math.max(0, dolu.findIndex(Boolean));
  }

  yuvaSec(i: number): void {
    if (i >= 0 && i < YUVA_SAYISI && this.yuvaDolu[i]) this.secili = i;
  }

  sifirla(): void {
    this.basili.clear();
    this.bekleyenAtes = false;
    this.bekleyenDash = false;
    this.bekleyenZipla = false;
    this.bekleyenDegisim = null;
    this._nisanAliyor = false;
  }

  /** Fare dünya noktası (hud ve gösterge için). */
  fareDunya(sahne: Sahne): { x: number; z: number } {
    return sahne.ekrandanDunyaya(this.fare.x, this.fare.y);
  }

  /** Bir sim adımı için girdi. Tek seferlik bayraklar ilk adımda tüketilir. */
  olustur(sahne: Sahne, takim?: TakimBilgisi): Girdi {
    const g = bosGirdi();
    const sol = this.basili.has("KeyA") || this.basili.has("ArrowLeft");
    const sag = this.basili.has("KeyD") || this.basili.has("ArrowRight");
    const yukari = this.basili.has("KeyW") || this.basili.has("ArrowUp");
    const asagi = this.basili.has("KeyS") || this.basili.has("ArrowDown");
    g.yonX = (sag ? 1 : 0) - (sol ? 1 : 0);
    g.yonZ = (asagi ? 1 : 0) - (yukari ? 1 : 0);
    const n = this.fareDunya(sahne);
    g.nisanX = n.x;
    g.nisanZ = n.z;
    g.secilenYuva = this.secili;
    g.atesle = this.bekleyenAtes;
    g.dash = this.bekleyenDash;
    g.zipla = this.bekleyenZipla;
    g.dinlen = this.basili.has("KeyZ");
    g.dusus = this.takimPaneli;
    g.degistir = takim ? this.degisimHedefi(takim) : -1;
    this.bekleyenAtes = false;
    this.bekleyenDash = false;
    this.bekleyenZipla = false;
    this.bekleyenDegisim = null;
    return g;
  }

  /** Q/E: aktiften sonraki/önceki yaşayan üye; Tab+1-3: doğrudan üye. */
  private degisimHedefi(t: TakimBilgisi): number {
    const istek = this.bekleyenDegisim;
    if (!istek) return -1;
    if (istek.tur === "uye") return istek.i < t.ko.length ? istek.i : -1;
    const n = t.ko.length;
    for (let k = 1; k < n; k++) {
      const i = (t.aktif + istek.yon * k + n * 2) % n;
      if (!t.ko[i]) return i;
    }
    return -1;
  }

  private tusAsagi(e: KeyboardEvent): void {
    if (e.code.startsWith("Arrow") || e.code === "Space" || e.code === "Tab") e.preventDefault();
    if (e.repeat) return;
    this.basili.add(e.code);
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.bekleyenDash = true;
    if (e.code === "Escape") { this._nisanAliyor = false; }
    if (e.code === "Space") this.bekleyenZipla = true;
    if (e.code === "KeyQ") this.bekleyenDegisim = { tur: "kaydir", yon: -1 };
    if (e.code === "KeyE") this.bekleyenDegisim = { tur: "kaydir", yon: 1 };
    const m = /^Digit([1-4])$/.exec(e.code);
    if (m && this.takimPaneli) this.bekleyenDegisim = { tur: "uye", i: Number(m[1]) - 1 };
    else if (m) this.yuvaSec(Number(m[1]) - 1);
  }

  private fareKonumu(e: MouseEvent): void {
    const r = this.tuval.getBoundingClientRect();
    const b = this.ekranBoyutu();
    this.fare.x = ((e.clientX - r.left) * b.width) / (r.width || 1);
    this.fare.y = ((e.clientY - r.top) * b.height) / (r.height || 1);
  }

  private fareBasildi(e: MouseEvent): void {
    this.fareKonumu(e);
    if (e.button === 2) this._nisanAliyor = true;
    else if (e.button === 0) this.bekleyenAtes = true; // kolaylık: seçili yuvayı anında nişan yönüne at
  }

  private fareBirakildi(e: MouseEvent): void {
    if (e.button === 2 && this._nisanAliyor) {
      this._nisanAliyor = false;
      this.fareKonumu(e);
      this.bekleyenAtes = true;
    }
  }

  private tekerlek(e: WheelEvent): void {
    const yon = e.deltaY > 0 ? 1 : -1;
    for (let k = 1; k <= YUVA_SAYISI; k++) {
      const i = (this.secili + yon * k + YUVA_SAYISI * 4) % YUVA_SAYISI;
      if (this.yuvaDolu[i]) { this.secili = i; break; }
    }
  }

  yokEt(): void {
    for (const f of this.dinleyiciler) f();
    this.dinleyiciler = [];
  }
}
