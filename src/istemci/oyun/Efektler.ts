import { Container, Graphics, Text } from "pixi.js";
import { parcaEngel } from "../../paylasilan/sim/carpisma.ts";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import type { Dunya, Olay } from "../../paylasilan/sim/durum.ts";
import { TIP_RENK } from "./renkler.ts";
import type { Sahne } from "./Sahne.ts";

// Hamle efektleri: Graphics + havuz. Sim olaylarından ve durum listelerinden (mermi, alan) beslenir.
// Telegraf (aviso) okunaklılığı önceliklidir: kırmızı gölge hazırlık boyunca belirginleşir.

type Nokta = [number, number];

const EFEKT = {
  telegrafRengi: 0xe3350d,
  koniSure: 0.15,
  isinSure: 0.12,
  pokeSure: 0.1,
  patlamaSure: 0.28,
  vurusSure: 0.22,
  tozSure: 0.35,
  yaziSure: 0.85,
  yaziYukselme: 38,
  mermiIzUzunlugu: 6,
  mermiYuksekligi: 22,
  isinYuksekligi: 34,
  yaySegment: 14,
  kesikUzunluk: 8,
  tozAraligi: 3,
} as const;

interface Zamanli {
  g: Graphics;
  gecen: number;
  sure: number;
  ciz: (g: Graphics, t: number) => void;
}
interface MermiGorseli { g: Graphics; iz: Nokta[] }

function yelpaze(ox: number, oz: number, dx: number, dz: number, r: number, yayDerece: number): Nokta[] {
  const ort = Math.atan2(dz, dx);
  const yari = (yayDerece * Math.PI) / 360;
  const pts: Nokta[] = [[ox, oz]];
  for (let i = 0; i <= EFEKT.yaySegment; i++) {
    const a = ort - yari + (2 * yari * i) / EFEKT.yaySegment;
    pts.push([ox + Math.cos(a) * r, oz + Math.sin(a) * r]);
  }
  return pts;
}

function serit(ox: number, oz: number, dx: number, dz: number, uzunluk: number, genislik: number): Nokta[] {
  const px = -dz * (genislik / 2);
  const pz = dx * (genislik / 2);
  const bx = ox + dx * uzunluk;
  const bz = oz + dz * uzunluk;
  return [[ox + px, oz + pz], [bx + px, bz + pz], [bx - px, bz - pz], [ox - px, oz - pz]];
}

export class Efektler {
  private zamanlilar: Zamanli[] = [];
  private telegraflar = new Map<number, Zamanli>();
  private alanlar = new Map<number, Graphics>();
  private mermiler = new Map<number, MermiGorseli>();
  private havuz: Graphics[] = [];
  private yaziHavuzu: Text[] = [];
  private yazilar: { t: Text; gecen: number; y0: number }[] = [];

  constructor(private sahne: Sahne) {}

  private nokta(x: number, z: number, yukseklik = 0): Nokta {
    return [this.sahne.ekranX(x), this.sahne.zEkranY(z) - yukseklik];
  }

  private duz(pts: Nokta[], yukseklik = 0): number[] {
    return pts.flatMap(([x, z]) => this.nokta(x, z, yukseklik));
  }

  private elips(g: Graphics, x: number, z: number, yaricap: number): Graphics {
    const [sx, sy] = this.nokta(x, z);
    return g.ellipse(sx, sy, yaricap, yaricap * this.sahne.zOrani);
  }

  private grafik(katman: Container): Graphics {
    const g = this.havuz.pop() ?? new Graphics();
    g.visible = true;
    katman.addChild(g);
    return g;
  }

  private ekle(katman: Container, sure: number, ciz: Zamanli["ciz"]): Zamanli {
    const z: Zamanli = { g: this.grafik(katman), gecen: 0, sure, ciz };
    this.zamanlilar.push(z);
    return z;
  }

  private birak(g: Graphics): void {
    g.clear();
    g.visible = false;
    g.removeFromParent();
    g.zIndex = 0;
    this.havuz.push(g);
  }

  // ---- olaylar ----------------------------------------------------------------------------

  olay(o: Olay, d: Dunya): void {
    switch (o.tur) {
      case "hamleBasladi": this.telegrafBaslat(o); break;
      case "hamleIptal": this.telegrafKaldir(o.kim); break;
      case "hamleCikti": this.hamleCikti(o); break;
      case "alanPatladi": this.alanPatla(o); break;
      case "mermiBitti": this.vurusPatlamasi(o.x, o.z, TIP_RENK[o.tip], o.vurdu ? 1 : 0.6); break;
      case "vurdu": this.vurdu(o, d); break;
      case "kacildi": this.yaziCikar("DODGE", o.x, o.z, 0xeef2f5, 16); break;
      case "durum": {
        const dv = d.dovusculer[o.kime];
        if (dv) this.yaziCikar(o.durum === "yanik" ? "burn!" : "paralyzed!", dv.x, dv.z, o.durum === "yanik" ? TIP_RENK.FIRE : TIP_RENK.ELECTRIC, 16);
        break;
      }
      case "dash": {
        const dv = d.dovusculer[o.kim];
        if (dv) this.toz(dv.x, dv.z);
        break;
      }
      case "ko": {
        const dv = d.dovusculer[o.kim];
        if (dv) { this.vurusPatlamasi(dv.x, dv.z, 0xffffff, 2); this.sahne.sars(5, 0.25); }
        break;
      }
      case "fin": break;
    }
  }

  private telegrafBaslat(o: Extract<Olay, { tur: "hamleBasladi" }>): void {
    this.telegrafKaldir(o.kim);
    let sekil: Nokta[] | null = null;
    if (o.aile === "koni" || o.aile === "poke") sekil = yelpaze(o.x, o.z, o.yonX, o.yonZ, o.menzil, o.yay);
    else if (o.aile === "isin") {
      const t = parcaEngel(this.sahne.arena, o.x, o.z, o.x + o.yonX * o.menzil, o.z + o.yonZ * o.menzil);
      sekil = serit(o.x, o.z, o.yonX, o.yonZ, t === null ? o.menzil : o.menzil * t, o.kalinlik);
    } else if (o.aile === "embestida") sekil = serit(o.x, o.z, o.yonX, o.yonZ, o.mesafe, 2 * this.sahne.arena.govdeYaricap);
    if (!sekil) return;
    const pts = sekil;
    const duz = this.duz(pts);
    const t = this.ekle(this.sahne.zeminKatmani, o.aviso, (g, p) => {
      g.poly(duz).fill({ color: EFEKT.telegrafRengi, alpha: 0.18 + 0.34 * p }).stroke({ width: 2, color: EFEKT.telegrafRengi, alpha: 0.5 + 0.5 * p });
    });
    this.telegraflar.set(o.kim, t);
  }

  private telegrafKaldir(kim: number): void {
    const t = this.telegraflar.get(kim);
    if (t) { t.gecen = t.sure; this.telegraflar.delete(kim); }
  }

  private hamleCikti(o: Extract<Olay, { tur: "hamleCikti" }>): void {
    this.telegrafKaldir(o.kim);
    const renk = TIP_RENK[o.tip];
    switch (o.aile) {
      case "poke": {
        const duz = this.duz(yelpaze(o.x, o.z, o.yonX, o.yonZ, o.menzil, o.yay));
        this.ekle(this.sahne.zeminKatmani, EFEKT.pokeSure, (g, t) => { g.poly(duz).fill({ color: renk, alpha: 0.5 * (1 - t) }).stroke({ width: 3, color: 0xffffff, alpha: 1 - t }); });
        break;
      }
      case "koni": {
        const duz = this.duz(yelpaze(o.x, o.z, o.yonX, o.yonZ, o.menzil, o.yay));
        this.ekle(this.sahne.zeminKatmani, EFEKT.koniSure, (g, t) => { g.poly(duz).fill({ color: renk, alpha: 0.65 * (1 - t) }).stroke({ width: 2, color: 0xffffff, alpha: 0.8 * (1 - t) }); });
        break;
      }
      case "isin": {
        const a = this.nokta(o.x, o.z, EFEKT.isinYuksekligi);
        const b = this.nokta(o.x + o.yonX * o.menzil, o.z + o.yonZ * o.menzil, EFEKT.isinYuksekligi);
        const kalin = Math.max(6, o.kalinlik);
        this.ekle(this.sahne.ustKatman, EFEKT.isinSure, (g, t) => {
          g.moveTo(a[0], a[1]).lineTo(b[0], b[1]).stroke({ width: kalin * (1 - 0.4 * t), color: renk, alpha: 0.9 * (1 - t), cap: "round" });
          g.moveTo(a[0], a[1]).lineTo(b[0], b[1]).stroke({ width: kalin * 0.35, color: 0xffffff, alpha: 1 - t, cap: "round" });
        });
        break;
      }
      case "mermi": {
        this.vurusPatlamasi(o.x + o.yonX * 18, o.z + o.yonZ * 18, renk, 0.5);
        break;
      }
      case "embestida": this.toz(o.x, o.z); break;
      case "alan": this.vurusPatlamasi(o.x, o.z, renk, 0.4); break;
    }
  }

  private alanPatla(o: Extract<Olay, { tur: "alanPatladi" }>): void {
    const renk = TIP_RENK[o.tip];
    const a = this.alanlar.get(o.id);
    if (a) { this.birak(a); this.alanlar.delete(o.id); }
    this.ekle(this.sahne.zeminKatmani, EFEKT.patlamaSure, (g, t) => {
      this.elips(g, o.x, o.z, o.yaricap * (0.6 + 0.4 * t)).fill({ color: renk, alpha: 0.55 * (1 - t) });
      this.elips(g, o.x, o.z, o.yaricap * (0.6 + 0.4 * t)).stroke({ width: 4 * (1 - t) + 1, color: 0xffffff, alpha: 1 - t });
    });
    this.sahne.sars(3, 0.15);
  }

  private vurdu(o: Extract<Olay, { tur: "vurdu" }>, d: Dunya): void {
    const dv = d.dovusculer[o.kime];
    if (!dv) return;
    if (o.durum === "yanik") { this.yaziCikar(String(o.hasar), dv.x, dv.z, TIP_RENK.FIRE, 16); return; }
    if (o.hasar === 0) { this.yaziCikar("immune!", dv.x, dv.z, 0xaab4bb, 16); return; }
    this.vurusPatlamasi(dv.x, dv.z, TIP_RENK[o.tip], 1);
    this.sahne.sars(2, 0.08);
    const etk = o.etkinlik;
    const renk = etk > 1 ? 0xf4cf47 : etk < 1 ? 0x8fb4c8 : 0xffffff;
    this.yaziCikar(String(o.hasar), dv.x, dv.z, renk, etk === 1 ? 22 : 26, 0);
    if (etk > 1) this.yaziCikar("super!", dv.x, dv.z, 0xf4cf47, 15, 22);
    else if (etk < 1) this.yaziCikar("resisted!", dv.x, dv.z, 0x8fb4c8, 15, 22);
  }

  /** Parlayan halka + kıvılcımlar (vuruş, mermi sonu, KO). */
  private vurusPatlamasi(x: number, z: number, renk: number, boy: number): void {
    const olcek = this.sahne.nesneOlcegi(z);
    const yuk = 30 * olcek * 2;
    const kivilcim = 7;
    this.ekle(this.sahne.ustKatman, EFEKT.vurusSure * Math.max(1, boy * 0.7), (g, t) => {
      const [sx, sy] = this.nokta(x, z, yuk * 0.5);
      const r = (10 + 26 * t) * boy * olcek * 1.4;
      g.circle(sx, sy, r).stroke({ width: 3 * (1 - t) + 1, color: renk, alpha: 1 - t });
      g.circle(sx, sy, r * 0.45).fill({ color: 0xffffff, alpha: 0.8 * (1 - t) });
      for (let i = 0; i < kivilcim; i++) {
        const a = (i / kivilcim) * Math.PI * 2 + x;
        g.moveTo(sx + Math.cos(a) * r * 0.7, sy + Math.sin(a) * r * 0.7).lineTo(sx + Math.cos(a) * r * 1.3, sy + Math.sin(a) * r * 1.3).stroke({ width: 2, color: renk, alpha: 1 - t });
      }
    });
  }

  /** Embestida ve dash tozu. */
  private toz(x: number, z: number): void {
    this.ekle(this.sahne.zeminKatmani, EFEKT.tozSure, (g, t) => {
      for (let i = 0; i < 3; i++) this.elips(g, x + (i - 1) * 10, z + 2, 8 + 14 * t).fill({ color: 0xd8c9a0, alpha: 0.4 * (1 - t) });
    });
  }

  private yaziCikar(metin: string, x: number, z: number, renk: number, boyut: number, ofset = 0): void {
    const t = this.yaziHavuzu.pop() ?? new Text({ text: "", style: { fontFamily: "Jersey 15, monospace", fontSize: 20, fill: 0xffffff, stroke: { color: 0x050d10, width: 4 }, align: "center" } });
    t.text = metin;
    t.style.fontSize = boyut;
    t.style.fill = renk;
    t.anchor.set(0.5);
    t.alpha = 1;
    this.sahne.ustKatman.addChild(t);
    const p = this.nokta(x, z, 64 * this.sahne.nesneOlcegi(z) + 8);
    t.position.set(p[0], p[1] - ofset);
    t.visible = true;
    this.yazilar.push({ t, gecen: 0, y0: p[1] - ofset });
  }

  // ---- her karede -----------------------------------------------------------------------------

  /** @param alfa  son sim adımı ile önceki arasındaki kesir (0..1), mermi ara değerlemesi için */
  guncelle(dt: number, d: Dunya, alfa: number): void {
    for (let i = this.zamanlilar.length - 1; i >= 0; i--) {
      const z = this.zamanlilar[i]!;
      z.gecen += dt;
      z.g.clear();
      if (z.gecen >= z.sure) { this.birak(z.g); this.zamanlilar.splice(i, 1); continue; }
      z.ciz(z.g, z.gecen / z.sure);
    }
    this.alanlariCiz(d);
    this.mermileriCiz(d, alfa);
    this.yazilariGuncelle(dt);
    if (d.tick % EFEKT.tozAraligi === 0) {
      for (const dv of d.dovusculer) if (dv.hamle?.evre === "atilis") this.toz(dv.x, dv.z);
    }
  }

  private alanlariCiz(d: Dunya): void {
    const var_ = new Set<number>();
    for (const a of d.alanlar) {
      var_.add(a.id);
      let g = this.alanlar.get(a.id);
      if (!g) { g = this.grafik(this.sahne.zeminKatmani); this.alanlar.set(a.id, g); }
      const ilerleme = 1 - a.kalan / a.toplam;
      g.clear();
      this.elips(g, a.x, a.z, a.yaricap).fill({ color: EFEKT.telegrafRengi, alpha: 0.1 });
      this.elips(g, a.x, a.z, a.yaricap * ilerleme).fill({ color: EFEKT.telegrafRengi, alpha: 0.18 + 0.3 * ilerleme });
      this.elips(g, a.x, a.z, a.yaricap).stroke({ width: 2, color: EFEKT.telegrafRengi, alpha: 0.5 + 0.4 * ilerleme });
    }
    for (const [id, g] of this.alanlar) {
      if (!var_.has(id)) { this.birak(g); this.alanlar.delete(id); }
    }
  }

  private mermileriCiz(d: Dunya, alfa: number): void {
    const var_ = new Set<number>();
    for (const m of d.mermiler) {
      var_.add(m.id);
      let v = this.mermiler.get(m.id);
      if (!v) { v = { g: this.grafik(this.sahne.nesneKatmani), iz: [] }; this.mermiler.set(m.id, v); }
      // son adımın başına geri extrapolasyon: ekranda alfa kadar ilerlemiş görünür
      const x = m.x - m.vx * AYAR.dt * (1 - alfa);
      const z = m.z - m.vz * AYAR.dt * (1 - alfa);
      if (v.iz.length === 0 || v.iz[v.iz.length - 1]![0] !== x) v.iz.push([x, z]);
      if (v.iz.length > EFEKT.mermiIzUzunlugu) v.iz.shift();
      const renk = TIP_RENK[m.tip];
      const olcek = this.sahne.nesneOlcegi(z);
      const g = v.g;
      g.clear();
      const [gx, gy] = this.nokta(x, z);
      g.position.set(0, 0);
      g.zIndex = z;
      this.elips(g, x, z, m.yaricap * 0.9).fill({ color: 0x000000, alpha: 0.25 });
      const yuk = EFEKT.mermiYuksekligi * olcek * 2;
      v.iz.forEach(([ix, iz], i) => {
        const [px, py] = this.nokta(ix, iz, yuk);
        const k = (i + 1) / v.iz.length;
        g.circle(px, py, m.yaricap * olcek * 2.2 * k * 0.8).fill({ color: renk, alpha: 0.4 * k });
      });
      g.circle(gx, gy - yuk, m.yaricap * olcek * 2.4).fill(renk).stroke({ width: 2, color: 0xffffff, alpha: 0.8 });
      g.circle(gx, gy - yuk, m.yaricap * olcek * 1.0).fill({ color: 0xffffff, alpha: 0.85 });
    }
    for (const [id, v] of this.mermiler) {
      if (!var_.has(id)) { this.birak(v.g); this.mermiler.delete(id); }
    }
  }

  private yazilariGuncelle(dt: number): void {
    for (let i = this.yazilar.length - 1; i >= 0; i--) {
      const y = this.yazilar[i]!;
      y.gecen += dt;
      const t = y.gecen / EFEKT.yaziSure;
      if (t >= 1) {
        y.t.removeFromParent();
        y.t.visible = false;
        this.yaziHavuzu.push(y.t);
        this.yazilar.splice(i, 1);
        continue;
      }
      y.t.y = y.y0 - EFEKT.yaziYukselme * t;
      y.t.alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
    }
  }

  /** Yeni maç: bütün efektleri sil. */
  temizle(): void {
    for (const z of this.zamanlilar) this.birak(z.g);
    this.zamanlilar = [];
    this.telegraflar.clear();
    for (const g of this.alanlar.values()) this.birak(g);
    this.alanlar.clear();
    for (const v of this.mermiler.values()) this.birak(v.g);
    this.mermiler.clear();
    for (const y of this.yazilar) { y.t.removeFromParent(); this.yaziHavuzu.push(y.t); }
    this.yazilar = [];
  }
}
