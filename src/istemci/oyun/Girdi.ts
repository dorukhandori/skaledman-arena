import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import { type Girdi, bosGirdi } from "../../paylasilan/sim/Girdi.ts";
import type { Sahne } from "./Sahne.ts";
import { NISAN_EZME, type NisanAdayi, otoNisanHedefi } from "./dokunmatik.ts";

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
  // ---- MOBIL-1 dokunmatik kaynağı (DokunmatikKontrol yazar; klavye/fare aynen çalışır) ----
  /** Dokunmatik denetim etkin: nişan = oto-nişan + sürükleme ezmesi (fare imleci yok sayılır). */
  dokunmatik = false;
  /** Joystick yönü (sim, uzunluk ≤ 1); null = bırakıldı. Klavye yönüyle toplanır, uzunluk 1'e kırpılır. */
  private dokunYon: { x: number; z: number } | null = null;
  /** Nişan ezme noktası (dünya) ve bitiş zamanı (ms; Infinity = parmak hâlâ basılı). */
  private ezme: { x: number; z: number; bitis: number } | null = null;
  /** Oto-nişan adayları (Mac her kare yazar): rakip topaçlar. */
  rakipler: NisanAdayi[] = [];
  /** saat kancası (test) */
  simdi: () => number = () => performance.now();

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
    this.dokunYon = null;
    this.ezme = null;
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
    if (this.dokunYon) {
      g.yonX += this.dokunYon.x;
      g.yonZ += this.dokunYon.z;
      const u0 = Math.hypot(g.yonX, g.yonZ);
      if (u0 > 1) { g.yonX /= u0; g.yonZ /= u0; }
    }
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

  /**
   * Nişan noktası (dünya): fare modunda imleç (topaca < 20 px ise son yön), hareket modunda son sürüş yönü.
   * Dokunmatikte: sürükleme ezmesi (varsa) > "Hareket yönü" ayarı > oto-nişan (en yakın etkin rakip) > son yön.
   */
  nisanNoktasi(sahne: Sahne, ben: { x: number; z: number }): { x: number; z: number } {
    if (this.dokunmatik) return this.dokunNisani(ben);
    if (this.nisanModu === "hareket") return { x: ben.x + this.sonSurusYonu.x * 150, z: ben.z + this.sonSurusYonu.z * 150 };
    const n = sahne.ekrandanDunyaya(this.fare.x, this.fare.y);
    const dx = n.x - ben.x;
    const dz = n.z - ben.z;
    const m = Math.hypot(dx, dz);
    if (m < 20) return { x: ben.x + this.sonNisanYonu.x * 100, z: ben.z + this.sonNisanYonu.z * 100 };
    this.sonNisanYonu = { x: dx / m, z: dz / m };
    return n;
  }

  private dokunNisani(ben: { x: number; z: number }): { x: number; z: number } {
    const e = this.ezme;
    if (e && this.simdi() <= e.bitis) return this.yonuKaydet(ben, e.x, e.z);
    if (e) this.ezme = null;
    if (this.nisanModu === "hareket") return { x: ben.x + this.sonSurusYonu.x * 150, z: ben.z + this.sonSurusYonu.z * 150 };
    const h = otoNisanHedefi(ben, this.rakipler);
    if (h) return this.yonuKaydet(ben, h.x, h.z);
    return { x: ben.x + this.sonNisanYonu.x * 100, z: ben.z + this.sonNisanYonu.z * 100 };
  }

  private yonuKaydet(ben: { x: number; z: number }, x: number, z: number): { x: number; z: number } {
    const dx = x - ben.x;
    const dz = z - ben.z;
    const m = Math.hypot(dx, dz);
    if (m < 20) return { x: ben.x + this.sonNisanYonu.x * 100, z: ben.z + this.sonNisanYonu.z * 100 };
    this.sonNisanYonu = { x: dx / m, z: dz / m };
    return { x, z };
  }

  // ---- MOBIL-1 dokunmatik API (DokunmatikKontrol çağırır) ----
  /** Joystick yönü (sim; null = bırakıldı). */
  dokunmatikYon(y: { x: number; z: number } | null): void {
    this.dokunYon = y && (y.x !== 0 || y.z !== 0) ? { x: y.x, z: y.z } : null;
    if (this.dokunYon) { const u = Math.hypot(this.dokunYon.x, this.dokunYon.z); this.sonSurusYonu = { x: this.dokunYon.x / u, z: this.dokunYon.z / u }; }
  }
  /** Nişan ezme (dünya noktası): `basili` iken süresiz, değilse NISAN_EZME.surmeMs sürer. null = hemen oto-nişana dön. */
  nisanEz(n: { x: number; z: number } | null, basili = true): void {
    this.ezme = n ? { x: n.x, z: n.z, bitis: basili ? Infinity : this.simdi() + NISAN_EZME.surmeMs } : null;
  }
  /** Ezme parmağı kalktı: son nokta kısa süre korunur, sonra oto-nişan. */
  nisanEzBirak(): void {
    if (this.ezme) this.ezme.bitis = this.simdi() + NISAN_EZME.surmeMs;
  }
  /** Joystick yönü (gözlem; tüketmez). */
  get dokunYonu(): { x: number; z: number } | null { return this.dokunYon ? { ...this.dokunYon } : null; }
  /** Fare basışı (dokunmatik katman tuvali örttüğünde melez cihazda fare buradan gelir). */
  fareOlayi(e: MouseEvent): void { this.fareBasildi(e); }
  get nisanEziliyor(): boolean { return !!this.ezme && this.simdi() <= this.ezme.bitis; }
  /** Yetenek düğmesine basıldı (0..3): basılı tut = nişan, bırak = at (masaüstündeki 1-4 tuşu gibi). */
  yuvaBas(k: number): void {
    this.secili = Math.max(0, Math.min(AYAR.yuvaSayisi - 1, k | 0));
    this.yuvaBasili = true;
  }
  /** Yetenek düğmesi bırakıldı: `iptal` ise atılmaz. */
  yuvaBirak(iptal: boolean): void {
    if (!this.yuvaBasili) return;
    this.yuvaBasili = false;
    if (iptal) { this.iptalSayisi++; return; }
    this.bekleyenAtes = true;
  }
  /** Shift karşılığı (tek seferlik). */
  dashIste(): void { this.bekleyenDash = true; }
  /** Space karşılığı (tek seferlik). */
  ziplaIste(): void { this.bekleyenZipla = true; }

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
