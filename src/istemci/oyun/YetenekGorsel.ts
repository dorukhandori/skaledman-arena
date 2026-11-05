import { Container, Graphics, Text } from "pixi.js";
import type { ElementAdi } from "../../paylasilan/kurallar/ayar.ts";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import type { Dunya, Olay, Topac } from "../../paylasilan/sim/durum.ts";
import { yetenekHedefi } from "../../paylasilan/sim/yetenek.ts";
import { YETENEK_SIM, type YetenekSim } from "../../paylasilan/veri/yetenekSablon.ts";
import { YOL } from "./elementSimge.ts";
import { ruhSiluetCiz } from "./ruhSiluet.ts";
import { RuhGorsel } from "./RuhGorsel.ts";
import { ELEMENT_RENK, SAHNE_RENK, TAKIM_RENK } from "./renkler.ts";
import { SAHNE, type Sahne } from "./Sahne.ts";
import { SusRastgele } from "./SusRastgele.ts";

// Yetenek sunumu (istemci, sim'e yazmaz): H9 nişan önizlemesi, H13 telegraf (ux § 2.2 beş soru), alan zemin dekalleri
// (pixel planı § 5.2; doku yok, Graphics), engeller, zincir şimşeği, Ulti anı (ruh silüeti 0,3 s belirir + parıltı,
// ekran kenarı turuncu parlaması 0,3 s, yalnız "Flaş: Normal"), "Sekme: Space" ipucu (ilk 3 maç).
// Tehlike = kırmızı + çapraz tarama + dolu kenar; kendi önizlemen = kesikli, taramasız (renk tek kanal değil).

const r = AYAR.topacYaricap;
/** GU-05: telegraf kırmızısı referans 08'den (#C82625, tasarım dili § 2.5); düz görünümde eski ton. */
const TEHLIKE_HIBRIT = 0xc82625;
let TEHLIKE: number = SAHNE_RENK.tehlike;
/** Ulti kenar parlaması (08: #E6680C) */
const KENAR_RENK = 0xe6680c;
const KENAR_PARLAMA_SN = 0.3;
const SILUET_BELIRME = 0.3;
/** D8: Takım Ultisi'nde üç ruhun belirme aralığı (s). */
const TAM_TUR = Math.PI * 2;

export interface NisanDurumu { yuva: number; x: number; z: number }

interface Simsek { x1: number; y1: number; x2: number; y2: number; kalan: number; tohum: number }
interface Siluet { el: ElementAdi; t: number; sure: number; x: number; kap: Container; olcek?: number }

const sx = (x: number) => SAHNE.merkezX + x;
const sy = (z: number) => SAHNE.merkezY + z;

/** Bir yeteneğin dünya şekli (telegraf ve önizleme ortak). */
interface Sekil { tur: "daire" | "serit" | "kendi"; cx: number; cz: number; R: number; dx: number; dz: number; L: number; W: number }

function sekilBul(y: YetenekSim, t: Topac, d: Dunya, hx: number, hz: number, dx: number, dz: number): Sekil {
  if (y.sekil === "daire") {
    const R = y.sablon === "engel" && y.engelSayisi > 1 ? 78 + y.engelYaricap : y.sablon === "engel" ? y.engelYaricap : y.yaricap >= AYAR.yetenek.tumCanakYaricap ? d.arenaYaricap : y.yaricap;
    return { tur: "daire", cx: hx, cz: hz, R, dx, dz, L: 0, W: 0 };
  }
  if (y.sekil === "cevre") return { tur: "daire", cx: t.x, cz: t.z, R: y.yaricap + r, dx, dz, L: 0, W: 0 };
  if (y.sekil === "kendi") return { tur: "kendi", cx: t.x, cz: t.z, R: r + 10, dx, dz, L: 0, W: 0 };
  const L = y.sablon === "dalga" ? y.dalgaMenzil + r : Math.max(120, Math.min(300, (y.atilisHizi || AYAR.yetenek.varsayilanAtilisHizi) * (y.sureAdim / AYAR.adimHz) * 0.55));
  const W = y.sablon === "dalga" ? y.yaricap : 2 * r;
  return { tur: "serit", cx: t.x, cz: t.z, R: 0, dx, dz, L, W };
}

export class YetenekGorsel {
  readonly zemin = new Container();
  private dekal = new Graphics();
  private tel = new Graphics();
  private simgeKap = new Container();
  private ruhKap = new Container();
  /** zemin düzleminde, topaçların üstünde (nişan, bağ çizgisi, nabız çemberi, zincir): düz koordinat, Sahne basar */
  private ust = new Graphics();
  /** ekranda dik (basılmaz): ruh parıltıları */
  private ustEkran = new Graphics();
  private kenar = new Graphics();
  private ipucu: Text;
  private simgeler = new Map<ElementAdi, Graphics>();
  private simgeHavuz: Graphics[] = [];
  private simsekler: Simsek[] = [];
  private siluetler: Siluet[] = [];
  private kenarKalan = 0;
  private zaman = 0;
  private rng = new SusRastgele(0x7e1e);
  /** Ayarlar: flaş (kenar parlaması yalnız normal), "Sekme: Space" ipucu, nişan modu. */
  /** Kutsal canavar belirmesi (06-kutsal-canavarlar.md). */
  readonly ruh: RuhGorsel;
  private flasDeger: "normal" | "azaltilmis" | "kapali" = "normal";
  get flas(): "normal" | "azaltilmis" | "kapali" { return this.flasDeger; }
  set flas(v: "normal" | "azaltilmis" | "kapali") { this.flasDeger = v; this.ruh.flas = v; }
  ipucuAcik = true;
  readonly sayac = { telegrafKare: 0, rakipTelegrafKare: 0, dekalKare: 0, nisanKare: 0, siluet: 0, takimUlti: 0, kenarParlama: 0, ipucuKare: 0, engelKare: 0 };

  constructor(private sahne: Sahne, private yerel: number) {
    TEHLIKE = sahne.hibrit ? TEHLIKE_HIBRIT : SAHNE_RENK.tehlike;
    this.ruh = new RuhGorsel(sahne, yerel, (el) => this.ruhCiz(el));
    // canavar zemin düzleminde, dekal ve telegraftan önce: zeminin üstünde, telegraf/nişan/topaçların altında (06 § 1.1)
    this.zemin.addChild(this.ruh.kap, this.dekal, this.tel);
    sahne.zeminDuzlem.addChild(this.zemin);
    // simge ve ruh dik durur (basılmaz): zemin katmanında, düzlemin üstünde
    sahne.zeminKatmani.addChild(this.simgeKap, this.ruhKap);
    sahne.ustDuzlem.addChild(this.ust);
    sahne.efektKatmani.addChild(this.ustEkran);
    sahne.ekranKatmani.addChild(this.kenar);
    this.ipucu = new Text({ text: "Sekme: Space", style: { fontFamily: sahne.hibrit ? "m5x7, system-ui, sans-serif" : "system-ui, sans-serif", fontSize: sahne.hibrit ? 16 : 11, fontWeight: sahne.hibrit ? "400" : "800", fill: 0xffffff, stroke: { color: 0x050d10, width: 3 } } });
    this.ipucu.anchor.set(0.5, 0);
    this.ipucu.visible = false;
    // metin pixel önbelleğine girmez (okunurluk): ekran katmanında, dünya → ekran çevrimiyle
    sahne.ekranKatmani.addChild(this.ipucu);
  }

  temizle(): void {
    this.simsekler = [];
    for (const s of this.siluetler) s.kap.destroy({ children: true });
    this.siluetler = [];
    this.kenarKalan = 0;
    this.kenar.clear();
    this.ruh.temizle();
    this.sahne.sarsintiTaban = 0;
  }

  olay(o: Olay, d: Dunya): void {
    this.ruh.olay(o, d);
    switch (o.tur) {
      case "zincir":
        this.simsekler.push({ x1: sx(o.x1), y1: sy(o.z1), x2: sx(o.x2), y2: sy(o.z2), kalan: 0.18, tohum: o.tick });
        break;
      case "yetenekBasladi":
        // Kutsal canavarları RuhGorsel çizer (06-kutsal-canavarlar.md): kademe 2 ruh, 3 Ata, 4 takımın üç ruhu.
        // Burada yalnız sayaçlar ve ekran kenarı parlaması (yalnız Flaş: Normal).
        if (o.kademe === 4 && d.takimlar) {
          this.sayac.siluet += 3;
          this.sayac.takimUlti++;
          if (this.flas === "normal") { this.kenarKalan = KENAR_PARLAMA_SN; this.sayac.kenarParlama++; }
        } else if (o.kademe === 3) {
          this.sayac.siluet++;
          if (this.flas === "normal") { this.kenarKalan = KENAR_PARLAMA_SN; this.sayac.kenarParlama++; }
        }
        break;
      default:
        break;
    }
  }

  /** Düz (zemin düzlemi) y → dünya y (dik duran öğeler için: simge, ipucu). */
  private py(yDuz: number): number { return this.sahne.my + (yDuz - SAHNE.merkezY) * this.sahne.k; }

  // ---- çizim yardımcıları ----
  private simge(el: ElementAdi): Graphics {
    let g = this.simgeHavuz.pop();
    if (!g) g = new Graphics();
    g.clear();
    const y = YOL[el];
    const renk = ELEMENT_RENK[el].orta;
    try {
      const svg = y.dolgu
        ? `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="${y.d}" fill="#${renk.toString(16).padStart(6, "0")}" stroke="#050d10" stroke-width="1"/></svg>`
        : `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="${y.d}" fill="none" stroke="#050d10" stroke-width="3.4" stroke-linecap="round"/><path d="${y.d}" fill="none" stroke="#${renk.toString(16).padStart(6, "0")}" stroke-width="1.8" stroke-linecap="round"/></svg>`;
      g.svg(svg);
    } catch {
      g.circle(8, 8, 6).fill(renk);
    }
    g.pivot.set(8, 8);
    this.simgeKap.addChild(g);
    return g;
  }

  private kesikliDaire(g: Graphics, x: number, y: number, R: number, renk: number, kalinlik = 2, alfa = 0.95): void {
    const n = Math.max(12, Math.round((TAM_TUR * R) / 14));
    for (let k = 0; k < n; k += 2) {
      const a0 = (k / n) * TAM_TUR + this.zaman * 0.6;
      const a1 = ((k + 1) / n) * TAM_TUR + this.zaman * 0.6;
      g.moveTo(x + Math.cos(a0) * R, y + Math.sin(a0) * R).arc(x, y, R, a0, a1);
    }
    g.stroke({ width: kalinlik, color: renk, alpha: alfa });
  }

  private kesikliCizgi(g: Graphics, x1: number, y1: number, x2: number, y2: number, renk: number, kalinlik = 2, alfa = 0.95): void {
    const L = Math.hypot(x2 - x1, y2 - y1);
    if (L < 1) return;
    const ux = (x2 - x1) / L;
    const uy = (y2 - y1) / L;
    for (let s = 0; s < L; s += 14) {
      const e = Math.min(L, s + 8);
      g.moveTo(x1 + ux * s, y1 + uy * s).lineTo(x1 + ux * e, y1 + uy * e);
    }
    g.stroke({ width: kalinlik, color: renk, alpha: alfa });
  }

  /** Çapraz tarama: daire içinde ±45° çizgiler. */
  private taramaDaire(g: Graphics, x: number, y: number, R: number, renk: number, alfa: number): void {
    const k2 = Math.SQRT1_2;
    for (const [nx, ny, ux, uy] of [[k2, k2, k2, -k2], [k2, -k2, k2, k2]] as const) {
      for (let k = -R + 5; k < R; k += 11) {
        const h = Math.sqrt(R * R - k * k);
        const cx = x + nx * k;
        const cy = y + ny * k;
        g.moveTo(cx - ux * h, cy - uy * h).lineTo(cx + ux * h, cy + uy * h);
      }
    }
    g.stroke({ width: 1.5, color: renk, alpha: alfa });
  }

  /** Şerit (döndürülmüş dikdörtgen) köşeleri, ekran. */
  private seritKoseler(s: Sekil): number[] {
    const vx = -s.dz;
    const vy = s.dx;
    const w = s.W / 2;
    const x0 = sx(s.cx);
    const y0 = sy(s.cz);
    return [x0 + vx * w, y0 + vy * w, x0 + s.dx * s.L + vx * w, y0 + s.dz * s.L + vy * w, x0 + s.dx * s.L - vx * w, y0 + s.dz * s.L - vy * w, x0 - vx * w, y0 - vy * w];
  }

  private taramaSerit(g: Graphics, s: Sekil, renk: number, alfa: number): void {
    const vx = -s.dz;
    const vy = s.dx;
    const w = s.W / 2;
    const x0 = sx(s.cx);
    const y0 = sy(s.cz);
    for (const yon of [1, -1]) {
      for (let c = -w; c < s.L + w; c += 11) {
        // a - yon·b = c, a ∈ [0, L], b ∈ [-w, w]
        let b0 = -w;
        let b1 = w;
        const aMin = c + yon * b0;
        const aMax = c + yon * b1;
        const lo = Math.max(0, Math.min(aMin, aMax));
        const hi = Math.min(s.L, Math.max(aMin, aMax));
        if (hi <= lo) continue;
        b0 = (lo - c) * yon;
        b1 = (hi - c) * yon;
        g.moveTo(x0 + s.dx * lo + vx * b0, y0 + s.dz * lo + vy * b0).lineTo(x0 + s.dx * hi + vx * b1, y0 + s.dz * hi + vy * b1);
      }
    }
    g.stroke({ width: 1.5, color: renk, alpha: alfa });
  }

  /** Dolan halka (süre = telegraf); son 0,1 s beyaz. */
  private dolanHalka(g: Graphics, x: number, y: number, R: number, oran: number, beyaz: boolean, renk: number): void {
    g.circle(x, y, R).stroke({ width: 4, color: 0x050d10, alpha: 0.55 });
    const a0 = -Math.PI / 2;
    g.moveTo(x + Math.cos(a0) * R, y + Math.sin(a0) * R).arc(x, y, R, a0, a0 + TAM_TUR * Math.max(0.001, oran));
    g.stroke({ width: 4, color: beyaz ? 0xffffff : renk, alpha: 1 });
  }

  // ---- ruh silüeti (D8: ruhSiluet.ts, maket m2 dili; özgün, kanatsız) ----
  private ruhCiz(el: ElementAdi): Graphics {
    return ruhSiluetCiz(el);
  }

  // ---- dekaller ----
  private dekalCiz(d: Dunya): void {
    const g = this.dekal;
    for (const a of d.alanlar) {
      if (!a) continue;
      const y = YETENEK_SIM[a.no]!;
      const el = d.profiller[a.sahip]!.element;
      const c = ELEMENT_RENK[el];
      const x = sx(a.x);
      const yy = sy(a.z);
      const R = a.yaricap;
      const gecen = a.toplam - a.kalan;
      const giris = Math.min(1, gecen / 12);
      const cikis = Math.min(1, a.kalan / 30);
      const f = giris * cikis;
      this.sayac.dekalKare++;
      g.circle(x, yy, R).fill({ color: c.koyu, alpha: 0.22 * f }).stroke({ width: 2, color: c.acik, alpha: 0.6 * f });
      const rng = new SusRastgele(((a.sahip + 1) * 7919 + a.toplam * 31 + Math.round(a.x * 13)) >>> 0);
      const nabiz = 0.6 + 0.4 * Math.sin(this.zaman * TAM_TUR * 1.2); // ≤ 2 Hz
      switch (el) {
        case "kor": {
          for (let k = 0; k < 9; k++) {
            let px = x;
            let py = yy;
            let aci = rng.aralik(0, TAM_TUR);
            g.moveTo(px, py);
            for (let s = 0; s < 4; s++) { aci += rng.isaretli() * 0.7; const l = (R / 4) * rng.aralik(0.6, 1); px += Math.cos(aci) * l; py += Math.sin(aci) * l; g.lineTo(px, py); }
          }
          g.stroke({ width: 2, color: 0xffb347, alpha: 0.75 * f * nabiz });
          g.circle(x, yy, R * 0.35).fill({ color: c.orta, alpha: 0.18 * f * nabiz });
          break;
        }
        case "don":
          g.circle(x, yy, R).fill({ color: c.acik, alpha: 0.16 * f });
          for (let k = 0; k < 12; k++) {
            const aci = rng.aralik(0, TAM_TUR);
            const m = Math.sqrt(rng.sayi()) * R * 0.9;
            const px = x + Math.cos(aci) * m;
            const py = yy + Math.sin(aci) * m;
            const b = rng.aralik(3, 7);
            g.poly([px, py - b, px + b * 0.6, py, px, py + b, px - b * 0.6, py]);
          }
          g.fill({ color: 0xffffff, alpha: 0.55 * f });
          break;
        case "girdap":
          for (let k = 0; k < 3; k++) {
            const rr = R * (0.3 + 0.25 * k);
            const a0 = this.zaman * (1.6 - k * 0.3) * a.isaret + k * 2.1;
            g.moveTo(x + Math.cos(a0) * rr, yy + Math.sin(a0) * rr).arc(x, yy, rr, a0, a0 + 2.2);
          }
          g.stroke({ width: 3, color: c.acik, alpha: 0.7 * f });
          break;
        case "kasirga":
          for (let k = 0; k < 6; k++) {
            const rr = R * rng.aralik(0.25, 0.95);
            const a0 = this.zaman * 2.6 * a.isaret + k * 1.05;
            g.moveTo(x + Math.cos(a0) * rr, yy + Math.sin(a0) * rr).arc(x, yy, rr, a0, a0 + 0.9);
          }
          g.stroke({ width: 2, color: c.vurgu, alpha: 0.7 * f });
          break;
        default:
          for (let k = 0; k < 8; k++) {
            const a0 = (k / 8) * TAM_TUR + this.zaman * 0.5;
            g.moveTo(x + Math.cos(a0) * R * 0.2, yy + Math.sin(a0) * R * 0.2).lineTo(x + Math.cos(a0 + 0.2) * R * 0.6, yy + Math.sin(a0 + 0.2) * R * 0.6).lineTo(x + Math.cos(a0) * R * 0.9, yy + Math.sin(a0) * R * 0.9);
          }
          g.stroke({ width: 2, color: c.vurgu, alpha: 0.7 * f });
          break;
      }
      void y;
    }
    for (const e of d.engeller) {
      this.sayac.engelKare++;
      const c = ELEMENT_RENK.kaya;
      const x = sx(e.x);
      const yy = sy(e.z);
      const f = Math.min(1, e.kalan / 30);
      g.circle(x + 3, yy + 4, e.r).fill({ color: 0x000000, alpha: 0.3 * f });
      g.poly([x - e.r, yy + e.r * 0.3, x - e.r * 0.6, yy - e.r * 0.8, x + e.r * 0.3, yy - e.r, x + e.r, yy - e.r * 0.2, x + e.r * 0.7, yy + e.r * 0.9, x - e.r * 0.4, yy + e.r])
        .fill({ color: c.orta, alpha: f }).stroke({ width: 2, color: c.koyu, alpha: f });
      g.poly([x - e.r * 0.5, yy - e.r * 0.5, x + e.r * 0.2, yy - e.r * 0.8, x + e.r * 0.5, yy - e.r * 0.2]).fill({ color: c.acik, alpha: 0.8 * f });
      const kayip = YETENEK_SIM.find((y) => y.sablon === "engel")!.engelDayanikliligi - e.can;
      if (kayip > 0) g.moveTo(x, yy - e.r * 0.6).lineTo(x - 6, yy).lineTo(x + 4, yy + e.r * 0.6).stroke({ width: 2, color: 0x1a1208, alpha: f });
      if (kayip > 1) g.moveTo(x - e.r * 0.7, yy + 4).lineTo(x, yy + 8).lineTo(x + e.r * 0.6, yy - 6).stroke({ width: 2, color: 0x1a1208, alpha: f });
    }
  }

  // ---- telegraf ----
  private telegrafCiz(d: Dunya): { x: number; y: number } | null {
    const g = this.tel;
    const u = this.ust;
    let ipucuYeri: { x: number; y: number } | null = null;
    for (const [i, t] of d.topaclar.entries()) {
      if (t.yetenekFaz === 0 || t.etkinNo < 0) continue;
      const y = YETENEK_SIM[t.etkinNo]!;
      const rakip = i !== this.yerel;
      const el = d.profiller[i]!.element;
      const c = ELEMENT_RENK[el];
      const s = sekilBul(y, t, d, t.yetenekHx, t.yetenekHz, t.yetenekDx, t.yetenekDz);
      const x = sx(s.cx);
      const yy = sy(s.cz);
      if (t.yetenekFaz === 2) {
        // etki fazında yalnız kendine dönük durumlar: zırh halkası, kontra penceresi
        if (y.sablon === "zirh") g.circle(sx(t.x), sy(t.z), r + 8).stroke({ width: 4, color: c.vurgu, alpha: 0.6 + 0.3 * Math.sin(this.zaman * TAM_TUR * 1.5) });
        if (y.sablon === "kontra") g.circle(sx(t.x), sy(t.z), y.yaricap).stroke({ width: 3, color: c.orta, alpha: 0.5 + 0.4 * Math.sin(this.zaman * TAM_TUR * 2) });
        if (y.sablon === "zincir") this.kesikliDaire(g, sx(t.x), sy(t.z), y.yaricap + r, c.acik, 2, 0.45);
        continue;
      }
      this.sayac.telegrafKare++;
      if (rakip) this.sayac.rakipTelegrafKare++;
      const oran = t.telegrafToplam > 0 ? 1 - t.yetenekKalan / t.telegrafToplam : 1;
      const beyaz = t.yetenekKalan <= Math.round(0.1 * AYAR.adimHz);
      const kenarRenk = rakip ? TEHLIKE : TAKIM_RENK.oyuncu;
      let merkezX = x;
      let merkezY = yy;
      let halkaR = s.R + 6;
      if (s.tur === "serit") {
        const k = this.seritKoseler(s);
        if (rakip) {
          g.poly(k).fill({ color: TEHLIKE, alpha: 0.16 });
          this.taramaSerit(g, s, TEHLIKE, 0.45);
          g.poly(k).stroke({ width: 3, color: TEHLIKE, alpha: 0.95 });
        } else {
          for (let q = 0; q < 4; q++) this.kesikliCizgi(g, k[q * 2]!, k[q * 2 + 1]!, k[((q + 1) % 4) * 2]!, k[((q + 1) % 4) * 2 + 1]!, kenarRenk, 2);
        }
        // dolan dolgu şerit boyunca
        const p = this.seritKoseler({ ...s, L: s.L * oran });
        g.poly(p).fill({ color: beyaz ? 0xffffff : rakip ? 0xffb199 : TAKIM_RENK.oyuncu, alpha: beyaz ? 0.5 : 0.25 });
        merkezX = x + s.dx * s.L * 0.5;
        merkezY = yy + s.dz * s.L * 0.5;
        halkaR = 16;
        this.dolanHalka(g, merkezX, merkezY, halkaR, oran, beyaz, rakip ? 0xffd0c0 : TAKIM_RENK.oyuncu);
      } else {
        if (rakip) {
          g.circle(x, yy, s.R).fill({ color: TEHLIKE, alpha: 0.16 });
          this.taramaDaire(g, x, yy, s.R, TEHLIKE, 0.42);
          g.circle(x, yy, s.R).stroke({ width: 3, color: TEHLIKE, alpha: 0.95 });
        } else this.kesikliDaire(g, x, yy, s.R, kenarRenk, 2);
        this.dolanHalka(g, x, yy, Math.min(s.R + 6, 280), oran, beyaz, rakip ? 0xffd0c0 : TAKIM_RENK.oyuncu);
      }
      // merkezde element silüeti
      const sim = this.simge(el);
      sim.position.set(merkezX, this.py(merkezY));
      sim.scale.set(1.6);
      // bağ çizgisi kaynak → alan + kaynağın takım çemberi nabız
      const kx = sx(t.x);
      const ky = sy(t.z);
      if (s.tur === "daire" && y.sekil === "daire") {
        if (rakip) u.moveTo(kx, ky).lineTo(x, yy).stroke({ width: 1.5, color: TEHLIKE, alpha: 0.9 });
        else this.kesikliCizgi(u, kx, ky, x, yy, kenarRenk, 1.5);
      }
      const nabiz = 0.5 + 0.5 * Math.sin(this.zaman * TAM_TUR * 2);
      if (rakip) this.kesikliDaire(u, kx, ky, r + 6, TAKIM_RENK.rakip, 3, 0.5 + 0.5 * nabiz);
      else u.circle(kx, ky, r + 6).stroke({ width: 3, color: TAKIM_RENK.oyuncu, alpha: 0.5 + 0.5 * nabiz });
      // Ulti telegrafı: kaynak element renginde parlar (aviso boyunca artar)
      if (y.kademe >= 3 || YETENEK_SIM[t.yetenekNo]!.kademe >= 3) {
        u.circle(kx, ky, r + 12).stroke({ width: 6, color: c.acik, alpha: 0.25 + 0.55 * oran });
        if (this.sahne.hibrit) {
          // referans 08: atanın altında eş merkezli iki kırmızı halka (zeminde elips) + dışta dolan halka; üstünde element aurası
          u.circle(kx, ky, r + 22).stroke({ width: 5, color: TEHLIKE, alpha: 0.95 });
          u.circle(kx, ky, r + 22 + 46 * (0.6 + 0.4 * oran)).stroke({ width: 5, color: TEHLIKE, alpha: 0.85 });
          this.aura(el, kx, this.py(ky), oran);
        }
      }
      if (rakip && y.kacilabilir && !ipucuYeri) ipucuYeri = { x: merkezX, y: Math.min(462, (s.tur === "serit" ? merkezY : yy + Math.min(s.R, 200)) + 10) };
    }
    return ipucuYeri;
  }

  private nisanCiz(d: Dunya, n: NisanDurumu): void {
    const t = d.topaclar[this.yerel]!;
    const p = d.profiller[this.yerel]!;
    let no = p.yetenekler[n.yuva] ?? -1;
    if (no < 0) return;
    let y = YETENEK_SIM[no]!;
    if (y.sablon === "taklit" && d.sonYetenek[1 - this.yerel]! >= 0) { no = d.sonYetenek[1 - this.yerel]!; y = YETENEK_SIM[no]!; }
    this.sayac.nisanKare++;
    const u = this.ust;
    const renk = TAKIM_RENK.oyuncu;
    const kx = sx(t.x);
    const ky = sy(t.z);
    const nx = sx(n.x);
    const ny = sy(n.z);
    // H9: topaçtan imlece kesikli çizgi + uçta hedef halkası
    this.kesikliCizgi(u, kx, ky, nx, ny, renk, 2);
    u.circle(nx, ny, 9).stroke({ width: 2, color: renk, alpha: 0.95 });
    u.moveTo(nx - 13, ny).lineTo(nx - 5, ny).moveTo(nx + 5, ny).lineTo(nx + 13, ny).moveTo(nx, ny - 13).lineTo(nx, ny - 5).moveTo(nx, ny + 5).lineTo(nx, ny + 13).stroke({ width: 2, color: renk, alpha: 0.95 });
    let dx = n.x - t.x;
    let dz = n.z - t.z;
    const m = Math.hypot(dx, dz) || 1;
    dx /= m; dz /= m;
    const [hx, hz] = yetenekHedefi(d, this.yerel, no, n.x, n.z);
    const s = sekilBul(y, t, d, hx, hz, dx, dz);
    if (s.tur === "serit") {
      const k = this.seritKoseler(s);
      for (let q = 0; q < 4; q++) this.kesikliCizgi(u, k[q * 2]!, k[q * 2 + 1]!, k[((q + 1) % 4) * 2]!, k[((q + 1) % 4) * 2 + 1]!, renk, 1.5, 0.8);
    } else if (s.tur === "daire") this.kesikliDaire(u, sx(s.cx), sy(s.cz), s.R, renk, 2, 0.85);
    else this.kesikliDaire(u, kx, ky, s.R, renk, 2, 0.85);
  }

  /** Ulti telegrafında topaç üstünde element aurası (08: Kor topacın üstünde alev). Ekranda dik. */
  private aura(el: ElementAdi, x: number, yZemin: number, oran: number): void {
    const g = this.ustEkran;
    const c = ELEMENT_RENK[el];
    const tepe = yZemin - 44;
    for (let k = 0; k < 7; k++) {
      const fx = x + (k - 3) * 7;
      const faz = Math.sin(this.zaman * 11 + k * 1.7);
      const h = (14 + 14 * oran) * (k === 3 ? 1.4 : k === 2 || k === 4 ? 1.15 : 0.85) * (0.8 + 0.2 * faz);
      const yb = tepe + Math.abs(k - 3) * 2;
      g.poly([fx - 5, yb, fx + 5, yb, fx + faz * 2, yb - h]).fill({ color: k % 2 ? c.orta : c.acik, alpha: 0.85 });
      g.poly([fx - 2, yb, fx + 2, yb, fx + faz, yb - h * 0.55]).fill({ color: c.vurgu, alpha: 0.9 });
    }
  }

  /** Dash koni izi (08: atılan topacın arkasında renkli üçgen iz): zemin düzleminde, düz koordinat. */
  private dashKonisi(d: Dunya): void {
    if (!this.sahne.hibrit) return;
    const u = this.ust;
    for (const [i, t] of d.topaclar.entries()) {
      if (t.dashKalan <= 0) continue;
      const v = Math.hypot(t.vx, t.vz);
      if (v < 40) continue;
      const ux = t.vx / v, uz = t.vz / v;
      const c = ELEMENT_RENK[d.profiller[i]!.element];
      const x = sx(t.x), y = sy(t.z);
      const L = Math.min(150, 60 + v * 0.25);
      u.poly([x - uz * r * 0.9, y + ux * r * 0.9, x + uz * r * 0.9, y - ux * r * 0.9, x - ux * L, y - uz * L]).fill({ color: c.orta, alpha: 0.45 });
      u.poly([x - uz * r * 0.45, y + ux * r * 0.45, x + uz * r * 0.45, y - ux * r * 0.45, x - ux * L * 0.75, y - uz * L * 0.75]).fill({ color: c.acik, alpha: 0.55 });
    }
  }

  private simsekCiz(dt: number): void {
    const u = this.ust;
    for (const s of this.simsekler) {
      s.kalan -= dt;
      const rng = new SusRastgele(s.tohum * 97 + Math.floor(this.zaman * 30));
      const n = 7;
      u.moveTo(s.x1, s.y1);
      for (let k = 1; k < n; k++) {
        const t = k / n;
        const px = s.x1 + (s.x2 - s.x1) * t;
        const py = s.y1 + (s.y2 - s.y1) * t;
        const L = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) || 1;
        const sap = rng.isaretli() * 12;
        u.lineTo(px + (-(s.y2 - s.y1) / L) * sap, py + ((s.x2 - s.x1) / L) * sap);
      }
      u.lineTo(s.x2, s.y2);
      u.stroke({ width: 4, color: ELEMENT_RENK.simsek.orta, alpha: Math.min(1, s.kalan / 0.1) });
      u.stroke({ width: 1.5, color: 0xffffff, alpha: Math.min(1, s.kalan / 0.1) });
    }
    this.simsekler = this.simsekler.filter((s) => s.kalan > 0);
  }

  private siluetIlerlet(dt: number): void {
    for (const s of this.siluetler) {
      s.t += dt;
      const giris = Math.max(0, Math.min(1, s.t / SILUET_BELIRME));
      const cikis = Math.min(1, Math.max(0, (s.sure - s.t) / 0.3));
      s.kap.alpha = 0.75 * giris * cikis; // avatar oyun alanını kapatamaz: alfa ≤ %75
      s.kap.scale.set((s.olcek ?? 1) * (0.9 + 0.1 * giris));
      // hibrit: arenanın üstünde, uzak duvar hizasında (referans 08); dünya yakınlığı ölçekte telafi edildi
      s.kap.position.set(s.x, (this.sahne.hibrit ? 196 : 160) - 10 * giris);
      // yükselen parıltılar
      const g = this.ustEkran;
      const c = ELEMENT_RENK[s.el];
      for (let k = 0; k < 10; k++) {
        const faz = (s.t * 0.8 + k / 10) % 1;
        g.circle(s.x + Math.sin(k * 2.7) * 90, 250 - faz * 170, 2.5).fill({ color: k % 2 ? c.vurgu : c.acik, alpha: 0.8 * giris * cikis * (1 - faz) });
      }
    }
    for (const s of this.siluetler) if (s.t >= s.sure) s.kap.destroy({ children: true });
    this.siluetler = this.siluetler.filter((s) => s.t < s.sure);
  }

  private kenarCiz(dt: number): void {
    const g = this.kenar;
    g.clear();
    if (this.kenarKalan <= 0) return;
    this.kenarKalan = Math.max(0, this.kenarKalan - dt);
    if (this.flas !== "normal") return;
    // tek yönlü yumuşak sönme (ux § 2.2): tepe ≤ %25
    const a = 0.25 * (this.kenarKalan / KENAR_PARLAMA_SN);
    if (this.sahne.hibrit) {
      // referans 08: sol ve sağ kenarda dikey turuncu parlama, içe doğru söner (tepe ≤ %25, tek yönlü sönme)
      for (let k = 0; k < 10; k++) {
        const w = 6;
        const al = a * (1 - k / 10);
        g.rect(k * w, 0, w, SAHNE.yukseklik).fill({ color: KENAR_RENK, alpha: al });
        g.rect(SAHNE.genislik - (k + 1) * w, 0, w, SAHNE.yukseklik).fill({ color: KENAR_RENK, alpha: al });
      }
      return;
    }
    for (let k = 0; k < 8; k++) {
      const p = k * 6;
      g.rect(p + 3, p + 3, SAHNE.genislik - 2 * p - 6, SAHNE.yukseklik - 2 * p - 6).stroke({ width: 6, color: 0xff8a3d, alpha: a * (1 - k / 8) });
    }
  }

  /** Her kare. `nisan`: yerel oyuncu bir yuvayı basılı tutuyorsa (Fare nişan modu) imleç noktası. */
  guncelle(d: Dunya, dt: number, nisan: NisanDurumu | null): void {
    this.zaman += dt;
    this.dekal.clear();
    this.tel.clear();
    this.ust.clear();
    this.ustEkran.clear();
    for (const c of [...this.simgeKap.children]) { this.simgeKap.removeChild(c); this.simgeHavuz.push(c as Graphics); }
    this.dekalCiz(d);
    const ipucu = this.telegrafCiz(d);
    this.dashKonisi(d);
    if (nisan && d.mac.faz === "tur") this.nisanCiz(d, nisan);
    this.simsekCiz(dt);
    this.siluetIlerlet(dt);
    this.ruh.onYukle(d);
    this.ruh.ilerle(dt, d);
    this.kenarCiz(dt);
    this.ipucu.visible = !!ipucu && this.ipucuAcik;
    if (ipucu && this.ipucuAcik) {
      const e = this.sahne.dunyadanEkrana(ipucu.x, this.py(ipucu.y));
      this.ipucu.position.set(e.x, e.y);
      this.sayac.ipucuKare++;
    }
    // Ulti telegrafı: sürekli 0,5 px sarsıntı
    const ultiTel = d.topaclar.some((t) => t.yetenekFaz === 1 && t.yetenekYuva === 2);
    this.sahne.sarsintiTaban = ultiTel ? Math.sqrt(0.5 / SAHNE.sarsintiTavan) : 0;
    void this.rng;
  }
}
