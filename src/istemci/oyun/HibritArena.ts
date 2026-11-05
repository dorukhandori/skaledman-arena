import { Container, Graphics, Sprite, Texture } from "pixi.js";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import type { ArenaCizimi } from "./cizimTurleri.ts";
import type { Sahne } from "./Sahne.ts";
import { SusRastgele } from "./SusRastgele.ts";

// GU-00 / GU-03 Hibrit Kuşak Arenası (referans 07; maket m1): eğik elips çanak, yordamsal pixel dokular (dışarıdan sanat yok).
// Statik katmanlar bir kez, ekranın yarı çözünürlüğünde (480×270, 1 doku pikseli = 1 sanat pikseli) kanvasa piksel piksel
// çizilir: tribün + kalabalık (arka, parallax), uzak duvar iç yüzü + dudak, çatlaklı taş levha zemin (dither, çakıl, çukur,
// kenar eğim gölgesi), yakın dudak (topacın ÜSTÜNDE ayrı doku). Dinamik: ışıyan kuşak halkası #FBBE88 (topaç şeritteyken
// parlar, ≤ 1 Hz nabız), dönen hız şeridi çizgileri, ani ölüm kararması + kalınlaşan kırmızı sınır (zemin düzleminde elips).

const R0 = AYAR.arenaYaricap;
const CW = 480;
const CH = 270;
/** tribün dokusunun kenar payı (parallax kayması boşluk açmasın), sanat pikseli */
const PAY = 12;

/** Palet (tasarım dili § 2.0 örneklemeleri: 07 sıcak taş #91847B, gölge #534747, çukur #867468, duvar #1A1C28). */
const TAS = [0x2e2828, 0x3f3634, 0x534747, 0x665a55, 0x7a6d66, 0x8b7e75, 0x9a8c81, 0xab9d90, 0xbdae9f];
const DUVAR = [0x14151f, 0x1a1c28, 0x232536, 0x2d3043, 0x3a3d52];
const DUDAK = [0x2a2c3a, 0x45475a, 0x5e6074, 0x7b7c8e, 0x9a9aa8];
const KALABALIK = [0x1a1418, 0x2a2026, 0x3a2c2f, 0x4d3a3a, 0x5e4840, 0x6e5548];
export const ARENA_HIBRIT_RENK = { halka: 0xfbbe88, hale: 0xdca97c, halkaCekirdek: 0xfff1d8, serit: 0xf2e8b0, kapanan: 0x0d0b0c, aniOlum: 0xe3350d } as const;

/** 4×4 Bayer eşiği [0, 1) */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)]!;

function hash2(x: number, y: number, t: number): number {
  let h = (x * 374761393 + y * 668265263 + t * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Değer gürültüsü (yumuşak), [0, 1). */
function gurultu(x: number, y: number, olcek: number, t: number): number {
  const fx = x / olcek;
  const fy = y / olcek;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const ux = fx - ix;
  const uy = fy - iy;
  const sx = ux * ux * (3 - 2 * ux);
  const sy = uy * uy * (3 - 2 * uy);
  const a = hash2(ix, iy, t), b = hash2(ix + 1, iy, t), c = hash2(ix, iy + 1, t), d = hash2(ix + 1, iy + 1, t);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function rgb(c: number): [number, number, number] { return [(c >> 16) & 255, (c >> 8) & 255, c & 255]; }

/** Rampada sürekli değer (0..n-1) → Bayer dither'lı renk indeksi. */
function ditherIndeks(v: number, x: number, y: number, n: number): number {
  const t = Math.max(0, Math.min(n - 1, v));
  const i = Math.floor(t);
  return Math.min(n - 1, t - i > bayer(x, y) ? i + 1 : i);
}

interface Geometri { cx: number; cy: number; rx: number; ry: number; t: number; hUzak: number; hYakin: number; disYuz: number }

/** Duvar yüksekliği (sanat pikseli) açıya göre: uzak yarıda tam, yakın yarıda alçak (yakın dudak az örtsün). */
function duvarH(g: Geometri, sin: number): number {
  return sin <= 0 ? g.hUzak : g.hUzak - (g.hUzak - g.hYakin) * Math.pow(sin, 0.6);
}

/** Yükseltilmiş elips üzerinde (r, θ) çözümü: px = cx + rx·r·cosθ, py = cy + ry·r·sinθ − H(θ). */
function dudakCoz(g: Geometri, px: number, py: number): { r: number; sin: number; cos: number; h: number } {
  let h = g.hYakin;
  let r = 0, s = 0, c = 1;
  for (let k = 0; k < 4; k++) {
    const x = (px - g.cx) / g.rx;
    const y = (py - g.cy + h) / g.ry;
    r = Math.hypot(x, y);
    c = r > 1e-9 ? x / r : 1;
    s = r > 1e-9 ? y / r : 0;
    h = duvarH(g, s);
  }
  return { r, sin: s, cos: c, h };
}

type Yuzey = "bos" | "zemin" | "duvar" | "dudak" | "disYuz";

export class HibritArena implements ArenaCizimi {
  /** arka katman: tribün + kalabalık (sarsıntının yarısını alır) */
  readonly arka = new Container();
  /** zemin katmanı: duvar + taş zemin dokusu */
  readonly zemin = new Container();
  /** zemin düzleminde (basılı) dinamik çizimler: halka, şerit, ani ölüm */
  readonly zeminDuzlemCizim = new Container();
  /** yakın dudak: topacın üstünde */
  readonly dudak = new Container();
  private halka = new Graphics();
  private serit = new Graphics();
  private kapanan = new Graphics();
  private aci = 0;
  private zaman = 0;
  private parilti = 0;
  private sonR = -1;
  private sonAni = -1;
  private arkaSprite: Sprite;

  constructor(private sahne: Sahne) {
    const B = sahne.yakinlik;
    const ekranCy = 270 + (sahne.my - 270) * B;
    const g: Geometri = {
      cx: CW / 2, cy: ekranCy / 2, rx: (B * R0) / 2, ry: (B * R0 * sahne.k) / 2,
      t: 0.075, hUzak: 15, hYakin: 4, disYuz: 10,
    };
    const tribun = this.tribunCiz(g);
    const { zemin, dudak } = this.canakCiz(g);
    this.arkaSprite = new Sprite(tribun);
    this.arkaSprite.position.set(-PAY * 2, -PAY * 2);
    this.arkaSprite.scale.set(2);
    this.arka.addChild(this.arkaSprite);
    // dünya → ekran: ekran = 480 + B·(dünya − 480) → doku pikseli (ekran/2) dünyada 2/B birim
    const yerlestir = (s: Sprite) => { s.position.set(480 - 480 / B, 270 - 270 / B); s.scale.set(2 / B); return s; };
    this.zemin.addChild(yerlestir(new Sprite(zemin)));
    this.dudak.addChild(yerlestir(new Sprite(dudak)));
    this.halka.blendMode = "add";
    this.zeminDuzlemCizim.addChild(this.kapanan, this.serit, this.halka);
  }

  arkaPlanGoster(goster: boolean): void { this.arkaSprite.visible = goster; }

  private doku(c: HTMLCanvasElement): Texture {
    const t = Texture.from(c);
    t.source.scaleMode = "nearest";
    return t;
  }

  // ---------------------------------------------------------------- tribün
  private tribunCiz(g: Geometri): Texture {
    const W = CW + PAY * 2;
    const H = CH + PAY * 2;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const x = c.getContext("2d")!;
    const im = x.createImageData(W, H);
    const px = im.data;
    const koy = (i: number, j: number, renk: number) => {
      if (i < 0 || j < 0 || i >= W || j >= H) return;
      const o = (j * W + i) * 4;
      const [r, gg, b] = rgb(renk);
      px[o] = r; px[o + 1] = gg; px[o + 2] = b; px[o + 3] = 255;
    };
    // zemin: koyu mor-lacivert, aşağı doğru hafif açılır
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const v = 0.4 + (j / H) * 1.2 + gurultu(i, j, 9, 7) * 0.6;
      koy(i, j, [0x0b0a0f, 0x100f18, 0x15141f][ditherIndeks(v, i, j, 3)]!);
    }
    // tribün: çanağın arkasında yükselen basamaklar (eş merkezli elips bantları, arkadan öne); yalnız uzak yarı + yanlar
    const rng = new SusRastgele(0x7b1b);
    const cx = g.cx + PAY;
    const cy = g.cy + PAY;
    const sira = 8;
    const bantA0 = Math.PI * 1.02; // sol-alt
    const bantA1 = Math.PI * 1.98; // sağ-alt (y ekseni aşağı: π..2π = uzak yarı)
    const yay = 0.42; // yanlardan aşağı taşma (rad)
    for (let s = sira - 1; s >= 0; s--) {
      const olc = 1 + g.t + 0.05 + s * 0.075;
      const yuk = g.hUzak + 4 + s * 11;
      const rx = g.rx * olc;
      const ry = g.ry * olc;
      const uzak = s / sira;
      // basamak: koyu zemin bandı + açık kenar
      for (let a = bantA0 - yay; a < bantA1 + yay; a += 0.5 / rx) {
        const i = Math.round(cx + Math.cos(a) * rx);
        const j = Math.round(cy + Math.sin(a) * ry - yuk);
        for (let q = 1; q <= 10; q++) koy(i, j + q, q === 1 ? 0x24222f : q < 4 ? 0x171621 : 0x100f17);
      }
      // seyirciler: omuz 5×4 + baş 3×3 (uzak sıralar biraz küçük ve koyu); ara sıra kalkık kol, renkli giysi
      const adim = 6 - Math.floor(uzak * 1.5);
      for (let a = bantA0 - yay + rng.aralik(0, 0.02); a < bantA1 + yay; a += (adim + rng.aralik(-0.8, 1.6)) / rx) {
        if (rng.sayi() < 0.06) continue;
        const i0 = Math.round(cx + Math.cos(a) * rx);
        const j0 = Math.round(cy + Math.sin(a) * ry - yuk) + 2;
        const ton = Math.max(0, Math.min(KALABALIK.length - 1, Math.round(rng.aralik(1.2, 5.6) - uzak * 2)));
        const giysi = rng.sayi() < 0.06 ? [0x4a2a2c, 0x2a3048, 0x3e3a28][Math.floor(rng.sayi() * 3)]! : KALABALIK[Math.max(0, ton - 1)]!;
        const bas = KALABALIK[ton]!;
        for (let dj = 0; dj < 4; dj++) for (let di = -2; di <= 2; di++) if (!(dj === 0 && Math.abs(di) === 2)) koy(i0 + di, j0 + dj, giysi);
        for (let dj = -3; dj < 0; dj++) for (let di = -1; di <= 1; di++) koy(i0 + di, j0 + dj, bas);
        koy(i0 - 1, j0 - 3, KALABALIK[Math.max(0, ton - 2)]!); // saç gölgesi
        if (rng.sayi() < 0.09) { const yon = rng.sayi() < 0.5 ? -1 : 1; koy(i0 + yon * 3, j0, giysi); koy(i0 + yon * 3, j0 - 1, giysi); koy(i0 + yon * 3, j0 - 2, giysi); koy(i0 + yon * 3, j0 - 3, bas); }
      }
    }
    // çanak çevresi: tribünün önünde koyu koruma duvarı (07 #1A1C28)
    for (let a = 0; a < Math.PI * 2; a += 0.4 / g.rx) {
      const rx = g.rx * (1 + g.t + 0.02);
      const ry = g.ry * (1 + g.t + 0.02);
      const i = Math.round(cx + Math.cos(a) * rx);
      const j = Math.round(cy + Math.sin(a) * ry - g.hUzak);
      for (let q = -6; q <= 2; q++) koy(i, j + q, q === -6 ? 0x2d3043 : 0x1a1c28);
    }
    x.putImageData(im, 0, 0);
    return this.doku(c);
  }

  // ---------------------------------------------------------------- çanak (duvar + zemin + yakın dudak)
  private canakCiz(g: Geometri): { zemin: Texture; dudak: Texture } {
    const cz = document.createElement("canvas");
    const cd = document.createElement("canvas");
    cz.width = cd.width = CW;
    cz.height = cd.height = CH;
    const xz = cz.getContext("2d")!;
    const xd = cd.getContext("2d")!;
    const imz = xz.createImageData(CW, CH);
    const imd = xd.createImageData(CW, CH);
    const tur: Yuzey[] = new Array(CW * CH).fill("bos");
    const renk = new Int32Array(CW * CH).fill(-1);
    const slabId = new Int32Array(CW * CH).fill(-1);
    const K = AYAR;
    // levha halkaları (dünya yarıçap oranı) ve halka başına levha sayısı
    const halkalar = [0, K.merkezKucukAlan, K.kusakIc, K.egimBaslangic, K.kusakDis, 1.0001];
    const levha = [1, 9, 14, 18, 24];
    const kaydir = [0, 0.13, 0.41, 0.07, 0.29];
    for (let j = 0; j < CH; j++) for (let i = 0; i < CW; i++) {
      const p = j * CW + i;
      const X = i + 0.5, Y = j + 0.5;
      // 1) yakın dudak (ön): üst yüz + dış yüz
      const d = dudakCoz(g, X, Y);
      if (d.sin > 0.02 && d.r >= 1 && d.r <= 1 + g.t) {
        tur[p] = "dudak";
        const kenar = d.r < 1 + 0.018 ? 4 : d.r > 1 + g.t - 0.014 ? 1 : 2.4 + gurultu(i, j, 3, 5) * 1.2;
        renk[p] = DUDAK[ditherIndeks(kenar, i, j, DUDAK.length)]!;
        continue;
      }
      {
        const r1 = 1 + g.t;
        const cosv = (X - g.cx) / (g.rx * r1);
        if (Math.abs(cosv) <= 1) {
          const sin = Math.sqrt(1 - cosv * cosv);
          const ust = g.cy + g.ry * r1 * sin - duvarH(g, sin);
          if (sin > 0.02 && Y >= ust && Y <= ust + duvarH(g, sin) + g.disYuz) {
            tur[p] = "disYuz";
            const derin = (Y - ust) / (duvarH(g, sin) + g.disYuz);
            // dikey taş blok dikişleri
            const aci = Math.acos(cosv);
            const dikis = Math.abs(((aci * 30) % 1) - 0.5) > 0.46;
            renk[p] = dikis ? DUVAR[0]! : DUVAR[ditherIndeks(2.6 - derin * 2.6, i, j, DUVAR.length)]!;
            continue;
          }
        }
      }
      // 2) zemin
      const zx = (X - g.cx) / g.rx;
      const zy = (Y - g.cy) / g.ry;
      const r = Math.hypot(zx, zy);
      if (r <= 1) {
        tur[p] = "zemin";
        const phi = Math.atan2(zy, zx);
        let h = 0;
        while (h < halkalar.length - 2 && r > halkalar[h + 1]!) h++;
        const n = levha[h]!;
        const dilim = Math.floor((((phi / (Math.PI * 2) + 1 + kaydir[h]!) % 1) * n));
        slabId[p] = h * 64 + dilim;
        continue;
      }
      // 3) uzak duvar iç yüzü
      const cosw = zx;
      if (Math.abs(cosw) <= 1) {
        const sin = -Math.sqrt(1 - cosw * cosw);
        const y0 = g.cy + g.ry * sin;
        const hh = y0 - Y;
        const H = duvarH(g, sin);
        if (hh >= 0 && hh <= H) {
          tur[p] = "duvar";
          const aci = Math.acos(cosw);
          const blok = Math.abs(((aci * 24) % 1) - 0.5) > 0.45 || Math.abs(hh - H * 0.5) < 0.5;
          // alt kısım koyu (zemin gölgesi), üst kenar açık
          const v = 0.6 + (hh / H) * 2.2 + gurultu(i, j, 4, 11) * 0.8 + (1 - Math.abs(cosw)) * 0.3;
          renk[p] = blok ? DUVAR[0]! : DUVAR[ditherIndeks(v, i, j, DUVAR.length)]!;
          if (hh > H - 1) renk[p] = DUDAK[3]!;
          continue;
        }
      }
      // 4) dudak üst yüzü (uzak + yan)
      if (d.r >= 1 && d.r <= 1 + g.t) {
        tur[p] = "dudak";
        const v = d.r < 1 + 0.02 ? 3.6 : d.r > 1 + g.t - 0.015 ? 1 : 2.2 + gurultu(i, j, 3, 5) * 1.4;
        renk[p] = DUDAK[ditherIndeks(v, i, j, DUDAK.length)]!;
      }
    }
    // zemin dokusu: levha tonu + gürültü + dither, eklem çizgileri, çukur, eğim gölgesi
    const levhaTon = new Map<number, number>();
    const tonAl = (id: number) => { let v = levhaTon.get(id); if (v === undefined) { v = (hash2(id, 3, 91) - 0.5) * 0.9; levhaTon.set(id, v); } return v; };
    for (let j = 0; j < CH; j++) for (let i = 0; i < CW; i++) {
      const p = j * CW + i;
      if (tur[p] !== "zemin") continue;
      const zx = (i + 0.5 - g.cx) / g.rx;
      const zy = (j + 0.5 - g.cy) / g.ry;
      const r = Math.hypot(zx, zy);
      const id = slabId[p]!;
      let v = 5.6 + tonAl(id) + (gurultu(i, j, 6, 1) - 0.5) * 1.3 + (gurultu(i, j, 2, 2) - 0.5) * 0.6;
      // çukur (merkez 0,35R): koyu, uzak iç kenarı açık (görünen eğim), yakın kenarı gölge
      if (r < AYAR.merkezKucukAlan) {
        v -= 0.9;
        const kenar = AYAR.merkezKucukAlan - r;
        if (kenar < 0.03) v += zy < 0 ? 1.4 : -1.6;
      }
      // kenar eğim gölgesi (0,70R → R), uzak duvar dibi ek karartma
      if (r > AYAR.egimBaslangic) v -= ((r - AYAR.egimBaslangic) / (1 - AYAR.egimBaslangic)) * 1.8;
      if (zy < 0 && r > 0.93) v -= (r - 0.93) * 18 * (-zy);
      // eklem: komşu farklı levha → koyu çizgi; altındaki piksel açık (pah)
      const sag = i + 1 < CW ? slabId[p + 1] : id;
      const alt = j + 1 < CH ? slabId[p + CW] : id;
      const ust = j > 0 ? slabId[p - CW] : id;
      if ((sag !== id && sag! >= 0) || (alt !== id && alt! >= 0)) v = 1.6;
      else if (ust !== id && ust! >= 0) v += 1.4;
      renk[p] = TAS[ditherIndeks(v, i, j, TAS.length)]!;
    }
    // çatlaklar (rastgele yürüyüş) + çakıllar
    const rng = new SusRastgele(0xca7a);
    const koy = (i: number, j: number, c: number) => { const p = j * CW + i; if (i >= 0 && j >= 0 && i < CW && j < CH && tur[p] === "zemin") renk[p] = c; };
    for (let k = 0; k < 34; k++) {
      let a = rng.aralik(0, Math.PI * 2);
      let rr = Math.sqrt(rng.sayi()) * 0.95;
      let fx = g.cx + Math.cos(a) * rr * g.rx;
      let fy = g.cy + Math.sin(a) * rr * g.ry;
      let yon = rng.aralik(0, Math.PI * 2);
      const uz = rng.aralik(10, 34);
      for (let s = 0; s < uz; s++) {
        yon += rng.isaretli() * 0.6;
        fx += Math.cos(yon);
        fy += Math.sin(yon) * 0.7;
        const i = Math.round(fx), j = Math.round(fy);
        koy(i, j, TAS[1]!);
        if (rng.sayi() < 0.5) koy(i, j + 1, TAS[7]!);
        if (rng.sayi() < 0.08) { // dal
          let bx = fx, by = fy, by2 = yon + rng.isaretli() * 1.5;
          for (let q = 0; q < 6; q++) { by2 += rng.isaretli() * 0.5; bx += Math.cos(by2); by += Math.sin(by2) * 0.7; koy(Math.round(bx), Math.round(by), TAS[2]!); }
        }
      }
      void a; void rr;
      a = 0; rr = 0;
    }
    for (let k = 0; k < 170; k++) {
      const a = rng.aralik(0, Math.PI * 2);
      const rr = Math.sqrt(rng.sayi()) * 0.97;
      const i = Math.round(g.cx + Math.cos(a) * rr * g.rx);
      const j = Math.round(g.cy + Math.sin(a) * rr * g.ry);
      const iri = rng.sayi() < 0.25;
      koy(i, j, TAS[8]!);
      if (iri) { koy(i + 1, j, TAS[7]!); koy(i, j + 1, TAS[2]!); koy(i + 1, j + 1, TAS[2]!); }
      else koy(i + 1, j + 1, TAS[2]!);
    }
    // kanvaslara yaz
    for (let p = 0; p < CW * CH; p++) {
      const c = renk[p]!;
      if (c < 0) continue;
      const [r, gg, b] = rgb(c);
      const o = p * 4;
      imz.data[o] = r; imz.data[o + 1] = gg; imz.data[o + 2] = b; imz.data[o + 3] = 255;
      if (tur[p] === "dudak" || tur[p] === "disYuz") {
        // yalnız yakın yarı (çanak merkezinin altı) topacın üstüne
        const j = Math.floor(p / CW);
        if (j > g.cy) { imd.data[o] = r; imd.data[o + 1] = gg; imd.data[o + 2] = b; imd.data[o + 3] = 255; }
      }
    }
    xz.putImageData(imz, 0, 0);
    xd.putImageData(imd, 0, 0);
    return { zemin: this.doku(cz), dudak: this.doku(cd) };
  }

  // ---------------------------------------------------------------- dinamik
  guncelle(dt: number, R: number, seritte: boolean, aniOlum: number): void {
    this.zaman += dt;
    this.aci += 0.9 * dt;
    this.parilti += ((seritte ? 1 : 0) - this.parilti) * Math.min(1, dt * 6);
    const cx = 480;
    const cy = 270; // zemin düzlemi: düz koordinat (Sahne.zeminDuzlem basar)
    const k = R / R0;
    const kd = AYAR.kusakDis * R0 * k;
    const ki = AYAR.kusakIc * R0 * k;
    // ışıyan halka: hale (geniş, soluk) + çekirdek; ≤ 1 Hz hafif nabız; şeritte topaç varken parlar (tasarım dili § 5)
    const nabiz = 0.85 + 0.15 * Math.sin(this.zaman * Math.PI * 2 * 0.5);
    const p = (0.75 + 0.35 * this.parilti) * nabiz;
    const h = this.halka.clear();
    h.circle(cx, cy, kd).stroke({ width: 26, color: ARENA_HIBRIT_RENK.hale, alpha: 0.1 * p });
    h.circle(cx, cy, kd).stroke({ width: 14, color: ARENA_HIBRIT_RENK.hale, alpha: 0.2 * p });
    h.circle(cx, cy, kd).stroke({ width: 7, color: ARENA_HIBRIT_RENK.halka, alpha: 0.8 * p });
    h.circle(cx, cy, kd).stroke({ width: 3, color: ARENA_HIBRIT_RENK.halkaCekirdek, alpha: 0.95 * p });
    h.circle(cx, cy, ki).stroke({ width: 3, color: ARENA_HIBRIT_RENK.hale, alpha: 0.16 * p });
    // hız şeridi: kuşak bandında dönen kısa krem çizgiler ("burada hızlanıyorsun", pixel planı § 6.2)
    const s = this.serit.clear();
    const orta = (ki + kd) / 2;
    const n = 36;
    for (let i = 0; i < n; i++) {
      const a = this.aci + (i / n) * Math.PI * 2;
      s.moveTo(cx + Math.cos(a) * orta, cy + Math.sin(a) * orta).arc(cx, cy, orta, a, a + 0.07);
    }
    s.stroke({ width: 4, color: ARENA_HIBRIT_RENK.serit, alpha: 0.12 + 0.3 * this.parilti });
    // ani ölüm: kapanan bölge koyulaşır, sınırda kalınlaşan kırmızı çizgi (ux § 3.4)
    const aniK = Math.round(aniOlum * 20);
    if (R !== this.sonR || aniK !== this.sonAni) {
      this.sonR = R;
      this.sonAni = aniK;
      const kp = this.kapanan.clear();
      if (R < R0 - 0.01) kp.circle(cx, cy, R0 + 1).fill({ color: ARENA_HIBRIT_RENK.kapanan, alpha: 0.82 }).circle(cx, cy, R).cut();
      if (aniOlum > 0) kp.circle(cx, cy, R + 2).stroke({ width: 4 + 8 * aniOlum, color: ARENA_HIBRIT_RENK.aniOlum, alpha: 0.9 });
    }
    void this.sahne;
  }
}
