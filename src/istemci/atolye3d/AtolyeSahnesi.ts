import { type GorunumDurumu, KATMAN_ETIKET, KATMAN_SIRASI, type KatmanTuru, gorunumOlay, ilkDurum, tusIsler } from "./durum.ts";
import type { Boya } from "./palet.ts";
import type { Cizer, KatmanKonumlari, TopacKurulumu } from "./tipler.ts";
import { Yedek2B } from "./Yedek2B.ts";

// Atölye merkez görünümü (referans 03): blueprint üstünde patlatılmış topaç + sol etiketler (ÇEKİRDEK / GÖVDE / DİSK /
// UÇ) ve turuncu bağlantı çizgileri. DOM ve etkileşim burada (three.js'siz); çizer tembel yüklenir: önce WebGL
// (Goruntuleyici.ts, ayrı paket), yoksa / başarısızsa Yedek2B. `?webgl=0` yedeği zorlar (ekran görüntüsü, sınama).
// Etkileşim: sürükle (fare + dokunma) / ok tuşları döndürür; katmana tıkla ya da etiketi Enter → odak (parça öne çıkar,
// diğerleri soluk, parça kartı Atölye'de); Esc / GERİ → patlatılmış; BİRLEŞTİR / AYIR; boşta yavaş dönme.

export interface SahneOlaylari {
  /** odak değişti (null: odak bitti) */
  odak(t: KatmanTuru | null): void;
  /** çizer hazır (ikonlar artık çizilebilir) */
  hazir(c: Cizer): void;
  /** katman etiketi: Delete → çıkar */
  sil?(t: KatmanTuru): void;
}

const el = <K extends keyof HTMLElementTagNameMap>(e: K, sinif: string, ust?: HTMLElement, metin = ""): HTMLElementTagNameMap[K] => {
  const x = document.createElement(e);
  if (sinif) x.className = sinif;
  if (metin) x.textContent = metin;
  ust?.appendChild(x);
  return x;
};

/** Blueprint hayalet çizimleri (yordamsal SVG): eş merkezli elipsler, eksen, ölçü çizgileri, soluk topaç silueti. */
function hayaletSvg(): string {
  const c = "#3d6fb0";
  const elips = (cx: number, cy: number, rx: number, ry: number, k = 1) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" stroke-width="${k}"/>`;
  const cizgi = (x1: number, y1: number, x2: number, y2: number, k = 1, kesik = "") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${k}"${kesik ? ` stroke-dasharray="${kesik}"` : ""}/>`;
  const parcalar = [
    // sağ üst: yandan topaç silueti
    `<path d="M150 18h40l4 6h-48zM144 24h56v8h-56zM152 32h40l-6 10h-28zM166 42h12l-6 12z" stroke-width="1"/>`,
    cizgi(140, 14, 140, 58, 1), cizgi(137, 14, 143, 14), cizgi(137, 58, 143, 58),
    // sol alt: üstten bakış elipsleri
    elips(30, 196, 26, 10), elips(30, 196, 18, 7), elips(30, 196, 6, 2.4), cizgi(2, 196, 58, 196, 1, "3 2"),
    // sağ alt: ölçü ızgarası
    `<rect x="150" y="186" width="44" height="24" stroke-width="1"/>`, cizgi(150, 194, 194, 194), cizgi(150, 202, 194, 202), cizgi(165, 186, 165, 210), cizgi(180, 186, 180, 210),
    // orta eksen
    cizgi(120, 6, 120, 214, 1, "2 3"),
  ];
  return `<svg viewBox="0 0 200 220" preserveAspectRatio="none" aria-hidden="true" fill="none" stroke="${c}" opacity=".38" shape-rendering="crispEdges">${parcalar.join("")}</svg>`;
}

export class AtolyeSahnesi {
  readonly kok: HTMLElement;
  private tuval: HTMLCanvasElement;
  private katmanEl = {} as Record<KatmanTuru, { dugme: HTMLButtonElement; ad: HTMLElement; cizgi: HTMLElement; sag: HTMLElement }>;
  private birlestir: HTMLButtonElement;
  private geri: HTMLButtonElement;
  private srListe: HTMLElement;
  private cizer: Cizer | null = null;
  private gd: GorunumDurumu = ilkDurum();
  private kur: TopacKurulumu | null = null;
  private onizKur: TopacKurulumu | null = null;
  private adlar: Record<KatmanTuru, string> = { cekirdek: "", govde: "", disk: "", uc: "" };
  private hareketAz = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  private sw = 0;
  private sh = 0;
  private surukle: { x: number; y: number; id: number; hareket: number } | null = null;
  private sonKonum = "";
  private gozlemci: ResizeObserver | null = null;

  constructor(ust: HTMLElement, private olay: SahneOlaylari) {
    const k = el("div", "g3 k-blueprint", ust);
    this.kok = k;
    k.setAttribute("role", "group");
    k.setAttribute("aria-label", "Topaç parçaları, 3B patlatılmış görünüm. Sürükle ya da ok tuşlarıyla döndür; katmanı seçmek için Enter, geri için Esc.");
    k.dataset["mod"] = this.gd.mod;
    const h = el("div", "g3-hayalet", k);
    h.innerHTML = hayaletSvg();
    this.tuval = el("canvas", "g3-tuval", k);
    this.tuvalHazirla(this.tuval);
    const ust2 = el("div", "g3-katmanlar", k);
    for (const t of KATMAN_SIRASI) {
      const cizgi = el("i", "g3-cizgi", ust2);
      const sag = el("i", "g3-cizgi sag", ust2);
      const d = el("button", "g3-etiket", ust2);
      d.type = "button";
      d.dataset["yuva"] = t;
      d.dataset["odak"] = `yuva-${t}`;
      d.dataset["k"] = "yok";
      el("small", "", d, KATMAN_ETIKET[t]);
      const ad = el("span", "", d);
      d.addEventListener("click", () => this.olayIsle({ tur: "sec", katman: t }));
      d.addEventListener("pointerenter", () => this.cizer?.vurgu(t));
      d.addEventListener("pointerleave", () => this.cizer?.vurgu(null));
      d.addEventListener("focus", () => this.cizer?.vurgu(t));
      d.addEventListener("blur", () => this.cizer?.vurgu(null));
      d.addEventListener("keydown", (e) => {
        if (e.key === "Delete" && this.olay.sil) { e.preventDefault(); this.olay.sil(t); return; }
      });
      this.katmanEl[t] = { dugme: d, ad, cizgi, sag };
    }
    const arac = el("div", "g3-arac", k);
    this.geri = el("button", "k-dugme kucuk", arac, "◄ Geri");
    this.geri.type = "button";
    this.geri.dataset["eylem"] = "odak-geri";
    this.geri.hidden = true;
    this.geri.addEventListener("click", () => this.olayIsle({ tur: "geri" }));
    this.birlestir = el("button", "k-dugme kucuk", arac, "Birleştir");
    this.birlestir.type = "button";
    this.birlestir.dataset["eylem"] = "birlestir";
    this.birlestir.title = "Birleştir / ayır (B)";
    this.birlestir.addEventListener("click", () => this.olayIsle({ tur: "birlestirAyir" }));
    // klavye: odak görünümün herhangi bir yerindeyken ok tuşları döndürür, Esc geri, B birleştir/ayır;
    // düğme üstünde Enter/Space düğmenin kendi işidir (etiket → seç)
    k.addEventListener("keydown", (e) => {
      if (!tusIsler(e.key)) return;
      const dugmede = e.target instanceof HTMLButtonElement;
      if (dugmede && (e.key === "Enter" || e.key === " ")) return;
      if (e.key === "Escape" && this.gd.mod !== "odak") return;
      e.preventDefault();
      e.stopPropagation();
      this.olayIsle({ tur: "tus", tus: e.key, katman: this.gd.mod === "odak" ? this.gd.odak : null });
    });
    this.srListe = el("ul", "k-sr g3-liste", k);
    this.srListe.setAttribute("aria-label", "Topaç parçaları (metin)");
    this.gozlemci = typeof ResizeObserver === "function" ? new ResizeObserver(() => this.boyutla()) : null;
    this.gozlemci?.observe(k);
    window.addEventListener("resize", () => this.boyutla());
    this.yukle();
  }

  private tuvalHazirla(c: HTMLCanvasElement): void {
    c.tabIndex = 0;
    c.setAttribute("role", "img");
    c.addEventListener("pointerdown", (e) => {
      c.setPointerCapture(e.pointerId);
      this.surukle = { x: e.clientX, y: e.clientY, id: e.pointerId, hareket: 0 };
    });
    c.addEventListener("pointermove", (e) => {
      const s = this.surukle;
      if (s && s.id === e.pointerId) {
        const dx = e.clientX - s.x, dy = e.clientY - s.y;
        s.x = e.clientX; s.y = e.clientY;
        s.hareket += Math.abs(dx) + Math.abs(dy);
        if (dx || dy) this.olayIsle({ tur: "surukle", dx: dx / this.o(), dy: dy / this.o() });
        return;
      }
      if (e.pointerType === "mouse") {
        const t = this.secAt(e);
        this.cizer?.vurgu(t);
        c.style.cursor = t ? "pointer" : "grab";
      }
    });
    const bitir = (e: PointerEvent) => {
      const s = this.surukle;
      if (!s || s.id !== e.pointerId) return;
      this.surukle = null;
      if (s.hareket < 4 && e.type === "pointerup") {
        const t = this.secAt(e);
        if (t && this.kur?.[t]) this.olayIsle({ tur: "sec", katman: t });
        else if (this.gd.mod === "odak") this.olayIsle({ tur: "geri" });
      }
    };
    c.addEventListener("pointerup", bitir);
    c.addEventListener("pointercancel", bitir);
    c.addEventListener("pointerleave", () => this.cizer?.vurgu(null));
    c.style.touchAction = "none";
  }

  private o(): number {
    return Number(getComputedStyle(document.documentElement).getPropertyValue("--o")) || 2;
  }

  private secAt(e: PointerEvent): KatmanTuru | null {
    const r = this.tuval.getBoundingClientRect();
    if (!r.width) return null;
    return this.cizer?.sec(((e.clientX - r.left) / r.width) * this.sw, ((e.clientY - r.top) / r.height) * this.sh) ?? null;
  }

  private async yukle(): Promise<void> {
    const izin = new URLSearchParams(location.search).get("webgl") !== "0";
    if (izin) {
      try {
        const m = await import("./Goruntuleyici.ts");
        const g = new m.Goruntuleyici(this.tuval, { kare: () => this.konumla(), kayip: () => this.yedegeGec() });
        this.cizerKur(g);
        return;
      } catch { /* yedek */ }
    }
    this.yedegeGec();
  }

  private yedegeGec(): void {
    // bağlamı alınmış tuval 2B'ye dönemez: yenisiyle değiştir
    this.cizer?.yokEt?.();
    const yeni = el("canvas", "g3-tuval");
    this.tuvalHazirla(yeni);
    this.tuval.replaceWith(yeni);
    this.tuval = yeni;
    this.cizerKur(new Yedek2B(yeni, () => this.konumla()));
  }

  private cizerKur(c: Cizer): void {
    this.cizer = c;
    this.kok.dataset["cizer"] = c.tur;
    c.hareketAz(this.hareketAz);
    this.sw = 0;
    this.boyutla();
    if (this.kur) c.ayarla(this.onizKur ?? this.kur, false);
    c.durum(this.gd);
    // kurucu dönmeden çağrılmasın (yedek eşzamanlı kurulur)
    queueMicrotask(() => this.olay.hazir(c));
  }

  private boyutla(): void {
    const o = this.o();
    const w = Math.floor(this.kok.clientWidth / o), h = Math.floor(this.kok.clientHeight / o);
    if (!w || !h || (w === this.sw && h === this.sh)) return;
    this.sw = w; this.sh = h;
    this.tuval.style.width = `calc(${w} * var(--p))`;
    this.tuval.style.height = `calc(${h} * var(--p))`;
    this.cizer?.boyut(w, h);
    this.konumla();
  }

  /** etiket ve bağlantı çizgilerini katman konumlarına taşı (tuval pikseli = mantıksal px) */
  private konumla(): void {
    const k: KatmanKonumlari | undefined = this.cizer?.konumlar();
    if (!k) return;
    const anahtar = KATMAN_SIRASI.map((t) => { const v = k[t]; return v ? `${Math.round(v.y)},${Math.round(v.sol)},${Math.round(v.sag)},${v.gorunur ? 1 : 0}` : "-"; }).join("|") + this.gd.mod;
    if (anahtar === this.sonKonum) return;
    this.sonKonum = anahtar;
    const birlesik = this.gd.mod === "birlesik" || (this.gd.mod === "odak" && this.gd.donus === "birlesik");
    // birleşikte katmanlar üst üste: etiketler en az 15 px aralıkla aşağı itilir (okunur kalsın)
    let onceki = -Infinity;
    KATMAN_SIRASI.forEach((t) => {
      const v = k[t];
      const e = this.katmanEl[t];
      if (!v) return;
      const etiketY = Math.round(birlesik ? Math.max(v.y, onceki + 15) : v.y);
      onceki = etiketY;
      e.dugme.style.top = `calc(${etiketY} * var(--p))`;
      const gor = v.gorunur && (this.gd.mod !== "odak" || this.gd.odak === t);
      e.dugme.hidden = !gor && this.gd.mod === "odak";
      e.cizgi.hidden = !gor;
      e.sag.hidden = !gor || birlesik || this.gd.mod === "odak";
      const x0 = 2, x1 = Math.max(x0 + 40, Math.round(v.sol) - 2);
      e.cizgi.style.left = `calc(${x0} * var(--p))`;
      e.cizgi.style.width = `calc(${x1 - x0} * var(--p))`;
      e.cizgi.style.top = `calc(${etiketY} * var(--p))`;
      const s0 = Math.round(v.sag) + 2;
      e.sag.style.left = `calc(${s0} * var(--p))`;
      e.sag.style.width = `calc(${Math.max(0, this.sw - s0)} * var(--p))`;
      e.sag.style.top = `calc(${Math.round(v.y)} * var(--p))`;
    });
  }

  // ---------------------------------------------------------------- dış arayüz

  /** gerçek kurulum (takılı parçalar) */
  ayarla(k: TopacKurulumu, adlar: Record<KatmanTuru, string>, animasyon: boolean): void {
    const once = this.kur;
    this.kur = { ...k };
    this.adlar = { ...adlar };
    const onizlemedenGeldi = !!this.onizKur && KATMAN_SIRASI.every((t) => this.onizKur![t] === k[t]) && this.onizKur.element === k.element;
    this.onizKur = null;
    if (!onizlemedenGeldi) this.cizer?.ayarla(k, animasyon && !!once);
    if (this.gd.mod === "odak" && this.gd.odak && !k[this.gd.odak]) this.olayIsle({ tur: "geri" });
    this.metinYaz(k);
  }

  /** envanterden canlı önizleme (null: gerçeğe dön) */
  onizle(k: TopacKurulumu | null, adlar?: Record<KatmanTuru, string>): void {
    if (!this.kur) return;
    const hedef = k ?? this.kur;
    const simdi = this.onizKur ?? this.kur;
    if (KATMAN_SIRASI.every((t) => simdi[t] === hedef[t]) && simdi.element === hedef.element && simdi.sol === hedef.sol) { this.onizKur = k; return; }
    this.onizKur = k;
    this.cizer?.ayarla(hedef, true);
    this.metinYaz(hedef, adlar ?? this.adlar, !!k);
  }

  private metinYaz(k: TopacKurulumu, adlar = this.adlar, onizleme = false): void {
    this.srListe.innerHTML = "";
    for (const t of KATMAN_SIRASI) {
      const ad = k[t] ? adlar[t] || k[t]! : "boş";
      const e = this.katmanEl[t];
      e.ad.textContent = k[t] ? adlar[t] || "" : "Boş";
      e.dugme.classList.toggle("bos", !k[t]);
      e.dugme.classList.toggle("onizleme", onizleme && this.kur?.[t] !== k[t]);
      e.dugme.setAttribute("aria-label", `${KATMAN_ETIKET[t]}: ${ad}. Enter: parçayı öne çıkar ve incele.${k[t] ? " Delete: çıkar." : ""}`);
      el("li", "", this.srListe, `${KATMAN_ETIKET[t]}: ${ad}`);
    }
    this.tuval.setAttribute("aria-label", `3B topaç: ${KATMAN_SIRASI.map((t) => `${KATMAN_ETIKET[t]} ${k[t] ? adlar[t] : "boş"}`).join(", ")}${onizleme ? " (önizleme)" : ""}`);
  }

  olayIsle(o: Parameters<typeof gorunumOlay>[1]): void {
    const once = this.gd;
    const d = gorunumOlay(once, o);
    if (d === once) return;
    this.gd = d;
    this.kok.dataset["mod"] = d.mod;
    this.cizer?.durum(d);
    const odakMi = d.mod === "odak";
    this.geri.hidden = !odakMi;
    const birlesik = d.mod === "birlesik" || (odakMi && d.donus === "birlesik");
    this.birlestir.textContent = birlesik ? "Ayır" : "Birleştir";
    this.birlestir.setAttribute("aria-pressed", String(birlesik));
    for (const t of KATMAN_SIRASI) this.katmanEl[t].dugme.setAttribute("aria-pressed", String(odakMi && d.odak === t));
    if (once.odak !== d.odak || once.mod !== d.mod) {
      this.sonKonum = "";
      this.konumla();
      if (once.odak !== d.odak) this.olay.odak(odakMi ? d.odak : null);
      if (odakMi && once.mod !== "odak") this.geri.focus({ preventScroll: true });
    }
  }

  get durum(): GorunumDurumu { return this.gd; }
  get cizerTuru(): "webgl" | "yedek" | null { return this.cizer?.tur ?? null; }
  kareSureleri(): number[] { return this.cizer?.kareSureleri() ?? []; }
  ikon(id: string, boya: Boya, boyut: number): HTMLCanvasElement | null { return this.cizer?.ikon(id, boya, boyut) ?? null; }
  topacIkonu(k: TopacKurulumu, boyut: number): HTMLCanvasElement | null { return this.cizer?.topacIkonu(k, boyut) ?? null; }
  etiket(t: KatmanTuru): HTMLButtonElement { return this.katmanEl[t].dugme; }

  yokEt(): void {
    this.gozlemci?.disconnect();
    this.cizer?.yokEt();
  }
}
