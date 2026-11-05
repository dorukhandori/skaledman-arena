import type { OyuncuGirdisi } from "./Girdi.ts";
import {
  type Daire, type DugmeAdi, type GuvenliAlan, JOYSTICK, NISAN_EZME, birakmaKarari, dugmeBul, dugmeYerlesimi, joystickBolgesi, joystickYonu,
  nisanEzmeNoktasi, topuzKonumu,
} from "./dokunmatik.ts";

// MOBIL-1 maç dokunmatik denetimi. Tam ekran DOM katmanı (#ustYazi'nin İLK çocuğu: HUD ve menü üstünde kalır, HUD'un
// etkileşimli parçaları — H14 kartları — dokunuşu kendisi alır). Her parmak pointerId ile izlenir (çoklu dokunuş):
//   sol %45: dinamik joystick (ilk dokunuş noktasında açılır, ölü bölge) → OyuncuGirdisi.dokunmatikYon
//   sağ alt kavis: Dash · Sekme · Yetenek 1-2 · Ulti (3) · Takım Ultisi (4). Görseli MacHud'un yuva/rozet öğeleri (durum,
//     bekleme, Enerji aynı yerden); bu katman yalnız isabet sınar. Yetenek: dokun = oto-nişanla at; sürükle = nişanı
//     ez, bırak = at; dışarı çıkıp düğmeye geri dönerek bırak = iptal.
//   sağda boş alan: sürükleme nişanı geçici ezer (ikinci çubuk); bırakınca kısa süre sonra oto-nişana döner.
//   üstte: Menü (Esc) ve Ses (M); bağlamsal GERİ ÇEK (Tab) yalnız açıkken.
// Fare olayları katmandan girdiye aynen geçer (dokunmatik + fareli melez cihaz).

export interface DokunmatikKancalar {
  menu(): void;
  ses(): void;
  geriCek(): void;
  /** hibrit kamera z basıklığı (joystick ve nişan yön düzeltmesi) */
  k(): number;
  /** yerel topacın sim konumu */
  ben(): { x: number; z: number };
  /** fare (melez cihaz): katman tuvali örttüğü için fare basışları buradan girdiye iletilir */
  fare(e: MouseEvent): void;
}

export interface DokunmatikDurum {
  /** yetenek/dash/sekme düğmeleri etkin (faz tur ya da geri sayım; tur arası seçim paneli açıkken gizli) */
  dugmeler: boolean;
  /** Takım Ultisi yuvası gösterilsin mi (yuva boş değilse) */
  y4: boolean;
  geriCek: boolean;
  /** menü / sonuç açık: joystick ve düğmeler susar */
  kilitli: boolean;
  /** GERİ ÇEK düğmesinin yeri (katman CSS px): H8 takım yuvalarının yanı */
  geriCekYeri: { x: number; y: number } | null;
  /** Menü ve Ses düğmelerinin yeri (katman CSS px, sol üst köşeleri) */
  menuYeri: { x: number; y: number };
  sesYeri: { x: number; y: number };
  sesAcik: boolean;
}

type Parmak =
  | { tur: "joy"; x0: number; y0: number }
  | { tur: "dugme"; ad: DugmeAdi; x0: number; y0: number; cikti: boolean }
  | { tur: "nisan"; x0: number; y0: number };

const STIL = `
#ustYazi > .dk, .dk { pointer-events:auto; }
/* z-index YOK: katman #ustYazi'nin ilk çocuğu, HUD (.mh: H14 kartları) ve menü/sonuç (.ms) DOM sırasıyla üstünde kalır */
.dk { position:absolute; inset:0; touch-action:none; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; -webkit-tap-highlight-color:transparent; }
.dk .joy { position:absolute; left:0; top:0; width:${JOYSTICK.yaricap * 2}px; height:${JOYSTICK.yaricap * 2}px; margin:-${JOYSTICK.yaricap}px 0 0 -${JOYSTICK.yaricap}px; border-radius:50%;
  border:2px solid rgba(251,242,195,.55); background:rgba(27,33,49,.35); box-shadow:inset 0 0 0 1px #05050a; pointer-events:none; opacity:.35; }
.dk .joy.acik { opacity:1; }
.dk .joy i { position:absolute; left:50%; top:50%; width:44px; height:44px; margin:-22px 0 0 -22px; border-radius:50%; background:rgba(251,242,195,.85); box-shadow:inset 0 -3px 0 rgba(0,0,0,.25), 0 0 0 2px #05050a; }
.dk .joy b { position:absolute; left:0; right:0; top:100%; margin-top:4px; text-align:center; font:400 16px/1 var(--font-etiket, monospace); color:#fbf2c3; text-shadow:1px 1px 0 #05050a; letter-spacing:1px; }
.dk .joy.acik b { display:none; }
.dk .nis { position:absolute; width:72px; height:72px; margin:-36px 0 0 -36px; border-radius:50%; border:2px dashed rgba(232,118,47,.8); pointer-events:none; display:none; }
.dk .nis.acik { display:block; }
.dk .nis i { position:absolute; left:50%; top:50%; width:24px; height:24px; margin:-12px 0 0 -12px; border-radius:50%; background:rgba(232,118,47,.9); box-shadow:0 0 0 2px #05050a; }
.dk .ipt { position:absolute; width:80px; margin-left:-40px; text-align:center; font:400 16px/18px var(--font-etiket, monospace); color:#fff7e0; background:#9a3d38; box-shadow:0 0 0 2px #05050a; pointer-events:none; display:none; text-transform:uppercase; }
.dk .ipt.acik { display:block; }
.dk button { position:absolute; width:44px; height:44px; padding:0; margin:0; border:2px solid #9a9184; background:rgba(27,33,49,.92); color:#fbf2c3; box-shadow:inset 0 0 0 1px #05050a;
  display:flex; align-items:center; justify-content:center; font:400 16px/1 var(--font-etiket, monospace); letter-spacing:1px; text-transform:uppercase; touch-action:manipulation; cursor:pointer; }
.dk button:active { transform:translateY(2px); }
.dk button.gc { width:auto; min-width:88px; padding:0 10px; border-color:#e8762f; background:#7c3d1c; display:none; }
.dk button.gc.acik { display:flex; }
.dk.kilitli .joy, .dk.kilitli .nis { display:none; }
@media (prefers-reduced-motion: reduce) { .dk button:active { transform:none; } }
`;

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif: string, ust: HTMLElement, metin = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  e.className = sinif;
  if (metin) e.textContent = metin;
  ust.appendChild(e);
  return e;
}

/** Görünüm kenarlarındaki güvenli alan (çentik, ev çubuğu): CSS env() değerleri bir yoklama öğesiyle okunur. */
export function guvenliAlanOku(): GuvenliAlan {
  const y = document.createElement("div");
  y.style.cssText = "position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
  document.body.appendChild(y);
  const s = getComputedStyle(y);
  const g = { ust: parseFloat(s.paddingTop) || 0, sag: parseFloat(s.paddingRight) || 0, alt: parseFloat(s.paddingBottom) || 0, sol: parseFloat(s.paddingLeft) || 0 };
  y.remove();
  return g;
}

export class DokunmatikKontrol {
  readonly kok: HTMLDivElement;
  private stil = document.createElement("style");
  private joy: HTMLElement;
  private topuz: HTMLElement;
  private nis: HTMLElement;
  private nisTopuz: HTMLElement;
  private ipt: HTMLElement;
  private menuD: HTMLButtonElement;
  private sesD: HTMLButtonElement;
  private geriD: HTMLButtonElement;
  private parmaklar = new Map<number, Parmak>();
  private boyut = { w: 0, h: 0 };
  private guvenli: GuvenliAlan = { sol: 0, sag: 0, ust: 0, alt: 0 };
  /** düğme yerleşimi (katman CSS px); MacHud görselleri buna hizalar */
  yer: Record<DugmeAdi, Daire> = dugmeYerlesimi(844, 390);
  private gizli = new Set<DugmeAdi>();
  private durum: DokunmatikDurum | null = null;
  /** debug / test sayaçları */
  readonly sayac = { joy: 0, dash: 0, sekme: 0, yetenek: 0, iptal: 0, ezme: 0, cokluDokunus: 0 };

  constructor(ust: HTMLElement, private girdi: OyuncuGirdisi, private k: DokunmatikKancalar) {
    this.stil.textContent = STIL;
    document.head.appendChild(this.stil);
    this.kok = document.createElement("div");
    this.kok.className = "dk";
    this.kok.dataset["dokunmatik"] = "1";
    this.joy = el("div", "joy", this.kok);
    this.topuz = el("i", "", this.joy);
    el("b", "", this.joy, "SÜR");
    this.nis = el("div", "nis", this.kok);
    this.nisTopuz = el("i", "", this.nis);
    this.ipt = el("div", "ipt", this.kok, "İPTAL");
    this.menuD = el("button", "mn", this.kok);
    this.menuD.type = "button";
    this.menuD.setAttribute("aria-label", "Menü");
    this.menuD.innerHTML = `<svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true"><path d="M2 3h12v2H2zM2 7h12v2H2zM2 11h12v2H2z" fill="#fbf2c3"/></svg>`;
    this.sesD = el("button", "sd", this.kok);
    this.sesD.type = "button";
    this.geriD = el("button", "gc", this.kok, "GERİ ÇEK");
    this.geriD.type = "button";
    this.geriD.dataset["eylem"] = "geri-cek";
    for (const [d, f] of [[this.menuD, () => this.k.menu()], [this.sesD, () => this.k.ses()], [this.geriD, () => this.k.geriCek()]] as const) {
      d.addEventListener("pointerdown", (e) => e.stopPropagation());
      d.addEventListener("click", (e) => { e.stopPropagation(); f(); });
    }
    this.kok.addEventListener("pointerdown", this.asagi);
    this.kok.addEventListener("pointermove", this.hareket);
    this.kok.addEventListener("pointerup", this.yukari);
    this.kok.addEventListener("pointercancel", this.iptalOlayi);
    this.kok.addEventListener("lostpointercapture", this.iptalOlayi);
    this.kok.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("resize", this.yerlestir);
    window.visualViewport?.addEventListener("resize", this.yerlestir);
    ust.prepend(this.kok);
    girdi.dokunmatik = true;
    this.yerlestir();
  }

  /** Ekran boyutu / güvenli alan değişince düğme yerleşimini ve joystick ipucu yerini yeniler. */
  yerlestir = (): void => {
    const w = this.kok.clientWidth || window.innerWidth;
    const h = this.kok.clientHeight || window.innerHeight;
    this.boyut = { w, h };
    this.guvenli = guvenliAlanOku();
    this.yer = dugmeYerlesimi(w, h, this.guvenli);
    if (!this.joyAcik) this.joyIpucu();
  };

  private get joyAcik(): boolean { for (const p of this.parmaklar.values()) if (p.tur === "joy") return true; return false; }

  /** Boşta joystick'in duracağı yer (ipucu halkası): sol alt, güvenli alan içinde. */
  private joyIpucu(): void {
    const R = JOYSTICK.yaricap;
    const x = this.guvenli.sol + 24 + R;
    const y = this.boyut.h - this.guvenli.alt - 34 - R;
    this.joyKonum(x, y, 0, 0);
    this.joy.classList.remove("acik");
  }

  private joyKonum(x: number, y: number, dx: number, dy: number): void {
    this.joy.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    const t = topuzKonumu(dx, dy);
    this.topuz.style.transform = `translate(${Math.round(t.x)}px, ${Math.round(t.y)}px)`;
  }

  private yerel(e: PointerEvent): { x: number; y: number } {
    const r = this.kok.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private asagi = (e: PointerEvent): void => {
    if (e.pointerType === "mouse") { this.k.fare(e); return; }
    e.preventDefault(); // uyumluluk fare olayları (mousedown/mouseup) ve uzun basma menüsü doğmasın
    if (this.durum?.kilitli) return;
    const { x, y } = this.yerel(e);
    try { this.kok.setPointerCapture(e.pointerId); } catch { /* yoklama */ }
    if (this.parmaklar.size >= 1) this.sayac.cokluDokunus++;
    const ad = this.durum?.dugmeler === false ? null : dugmeBul(this.yer, x, y, 6, this.gizli);
    if (ad) {
      if (ad === "dash") { this.girdi.dashIste(); this.sayac.dash++; this.parmaklar.set(e.pointerId, { tur: "dugme", ad, x0: x, y0: y, cikti: false }); return; }
      if (ad === "sekme") { this.girdi.ziplaIste(); this.sayac.sekme++; this.parmaklar.set(e.pointerId, { tur: "dugme", ad, x0: x, y0: y, cikti: false }); return; }
      const yuva = Number(ad.slice(1)) - 1;
      this.girdi.yuvaBas(yuva);
      this.parmaklar.set(e.pointerId, { tur: "dugme", ad, x0: x, y0: y, cikti: false });
      return;
    }
    if (joystickBolgesi(x, this.boyut.w) && !this.joyAcik) {
      // dinamik joystick: ilk dokunuş noktasında açılır (kenara taşmasın diye yarıçap kadar içeride)
      const R = JOYSTICK.yaricap;
      const jx = Math.max(this.guvenli.sol + R + 4, Math.min(this.boyut.w * 0.45, x));
      const jy = Math.max(R + 4, Math.min(this.boyut.h - this.guvenli.alt - R - 4, y));
      this.parmaklar.set(e.pointerId, { tur: "joy", x0: jx, y0: jy });
      this.joy.classList.add("acik");
      this.joyKonum(jx, jy, x - jx, y - jy);
      this.joyYaz(x - jx, y - jy);
      this.sayac.joy++;
      return;
    }
    // sağ boş alan: nişan ezme (ikinci çubuk)
    this.parmaklar.set(e.pointerId, { tur: "nisan", x0: x, y0: y });
    this.nis.style.left = `${Math.round(x)}px`;
    this.nis.style.top = `${Math.round(y)}px`;
    this.nisTopuz.style.transform = "";
  };

  private joyYaz(dx: number, dy: number): void {
    const y = joystickYonu(dx, dy, JOYSTICK.yaricap, JOYSTICK.oluBolge, this.k.k());
    this.girdi.dokunmatikYon(y.guc > 0 ? y : null);
  }

  private hareket = (e: PointerEvent): void => {
    const p = this.parmaklar.get(e.pointerId);
    if (!p) return;
    const { x, y } = this.yerel(e);
    const dx = x - p.x0;
    const dy = y - p.y0;
    if (p.tur === "joy") { this.joyKonum(p.x0, p.y0, dx, dy); this.joyYaz(dx, dy); return; }
    if (p.tur === "nisan") {
      if (Math.hypot(dx, dy) < NISAN_EZME.esik) return;
      this.nis.classList.add("acik");
      const t = topuzKonumu(dx, dy, 36);
      this.nisTopuz.style.transform = `translate(${Math.round(t.x)}px, ${Math.round(t.y)}px)`;
      const n = nisanEzmeNoktasi(this.k.ben(), dx, dy, this.k.k());
      if (n) { if (!this.girdi.nisanEziliyor) this.sayac.ezme++; this.girdi.nisanEz(n, true); }
      return;
    }
    if (p.ad === "dash" || p.ad === "sekme") return;
    // yetenek düğmesinden sürükleme: nişan ezme; düğmeye geri dönüş = iptal hazır
    const d = this.yer[p.ad];
    const disari = Math.hypot(dx, dy) > Math.max(NISAN_EZME.esik, d.r * 0.6);
    if (disari) p.cikti = true;
    if (p.cikti) {
      const n = Math.hypot(dx, dy) > d.r ? nisanEzmeNoktasi(this.k.ben(), dx, dy, this.k.k()) : null;
      if (n) this.girdi.nisanEz(n, true);
      const iptal = birakmaKarari(true, dx, dy, d.r) === "iptal";
      this.ipt.classList.toggle("acik", iptal);
      if (iptal) { this.ipt.style.left = `${Math.round(d.x)}px`; this.ipt.style.top = `${Math.round(d.y - d.r - 24)}px`; }
    }
  };

  private yukari = (e: PointerEvent): void => {
    const p = this.parmaklar.get(e.pointerId);
    if (!p) return;
    this.parmaklar.delete(e.pointerId);
    const { x, y } = this.yerel(e);
    this.bitir(p, x - p.x0, y - p.y0, false);
  };

  private iptalOlayi = (e: PointerEvent): void => {
    const p = this.parmaklar.get(e.pointerId);
    if (!p) return;
    this.parmaklar.delete(e.pointerId);
    this.bitir(p, 0, 0, true);
  };

  private bitir(p: Parmak, dx: number, dy: number, zorlaIptal: boolean): void {
    if (p.tur === "joy") { this.girdi.dokunmatikYon(null); this.joyIpucu(); return; }
    if (p.tur === "nisan") { this.nis.classList.remove("acik"); this.girdi.nisanEzBirak(); return; }
    if (p.ad === "dash" || p.ad === "sekme") return;
    this.ipt.classList.remove("acik");
    const karar = zorlaIptal ? "iptal" : birakmaKarari(p.cikti, dx, dy, this.yer[p.ad].r);
    if (karar === "iptal") this.sayac.iptal++; else this.sayac.yetenek++;
    this.girdi.yuvaBirak(karar === "iptal");
    // sürükleyip attıysa ezme kısa süre korunur (görsel tutarlılık); dokunup attıysa oto-nişan sürer
    if (p.cikti) this.girdi.nisanEzBirak();
  }

  /** Her kare (Mac.ciz): faz, Menü/Ses/GERİ ÇEK yerleri. */
  guncelle(d: DokunmatikDurum): void {
    const once = this.durum;
    this.durum = d;
    this.kok.classList.toggle("kilitli", d.kilitli);
    if (d.kilitli && this.parmaklar.size) { for (const p of this.parmaklar.values()) this.bitir(p, 0, 0, true); this.parmaklar.clear(); }
    this.gizli.clear();
    if (!d.y4) this.gizli.add("y4");
    if (!once || once.menuYeri.x !== d.menuYeri.x || once.menuYeri.y !== d.menuYeri.y) { this.menuD.style.left = `${d.menuYeri.x}px`; this.menuD.style.top = `${d.menuYeri.y}px`; }
    if (!once || once.sesYeri.x !== d.sesYeri.x || once.sesYeri.y !== d.sesYeri.y) { this.sesD.style.left = `${d.sesYeri.x}px`; this.sesD.style.top = `${d.sesYeri.y}px`; }
    if (!once || once.sesAcik !== d.sesAcik) {
      this.sesD.setAttribute("aria-label", d.sesAcik ? "Sesi kapat" : "Sesi aç");
      this.sesD.innerHTML = `<svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true"><path d="M2 6h3l4-3v10l-4-3H2z" fill="#fbf2c3"/>${d.sesAcik ? '<path d="M11 5.5c1 1.2 1 3.8 0 5M12.8 4c1.8 2 1.8 6 0 8" stroke="#fbf2c3" stroke-width="1.5" fill="none"/>' : '<path d="M10.5 5.5l4 5M14.5 5.5l-4 5" stroke="#f2622f" stroke-width="2"/>'}</svg>`;
    }
    this.geriD.classList.toggle("acik", d.geriCek && !d.kilitli && !!d.geriCekYeri);
    if (d.geriCekYeri) { this.geriD.style.left = `${Math.round(d.geriCekYeri.x)}px`; this.geriD.style.top = `${Math.round(d.geriCekYeri.y)}px`; }
  }

  /** Katmanın görünüm içindeki kutusu (MacHud düğme görsellerini katman koordinatından çevirir). */
  get kutu(): DOMRect { return this.kok.getBoundingClientRect(); }

  yokEt(): void {
    window.removeEventListener("resize", this.yerlestir);
    window.visualViewport?.removeEventListener("resize", this.yerlestir);
    this.girdi.dokunmatikYon(null);
    this.girdi.dokunmatik = false;
    this.kok.remove();
    this.stil.remove();
  }
}
