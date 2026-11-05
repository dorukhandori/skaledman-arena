import { GOVDE_TABAN_Z, kareIndeksi, tanimA } from "../oyun/topacKare.ts";
import { type GorunumDurumu, KATMAN_SIRASI, type KatmanTuru, ilkDurum, katmanKaymasi } from "./durum.ts";
import { PARCALAR_3B } from "./geometri.ts";
import type { Boya } from "./palet.ts";
import type { Cizer, KatmanKonumlari, TopacKurulumu } from "./tipler.ts";

// WebGL yoksa (ya da bağlam kaybolursa) YEDEK: topaç atlasının (public/topac/**, ART-1) keskin satırından tek kare ile
// 2B patlatılmış yığın. Etiketler, bağlantı çizgileri, odak ve birleştir/ayır aynı (DOM katmanı ortak); sürükleme
// yatayda atlas karesini ilerletir (simetri periyodu içinde 8 kare). Ölçek tam sayı (nearest).

interface Sprite { img: HTMLImageElement; y: number; adet: number; w: number; h: number; capa: [number, number]; birim: number; yukselti: number; simetri: number; hazir: boolean }

const resimler = new Map<string, HTMLImageElement>();
function resim(url: string, bitti: () => void): HTMLImageElement {
  let r = resimler.get(url);
  if (!r) {
    r = new Image();
    r.decoding = "async";
    r.src = url;
    resimler.set(url, r);
  }
  if (!r.complete) r.addEventListener("load", bitti, { once: true });
  return r;
}

export class Yedek2B implements Cizer {
  readonly tur = "yedek" as const;
  private g: CanvasRenderingContext2D | null;
  private w = 160;
  private h = 200;
  private kur: TopacKurulumu | null = null;
  private gd: GorunumDurumu = ilkDurum();
  private vurgulu: KatmanTuru | null = null;
  private sprite: Partial<Record<KatmanTuru, Sprite>> = {};
  private son: KatmanKonumlari | null = null;

  constructor(private tuval: HTMLCanvasElement, private kareSonrasi: () => void = () => {}) {
    this.g = tuval.getContext("2d");
  }

  boyut(w: number, h: number): void {
    this.w = Math.max(16, Math.floor(w)); this.h = Math.max(16, Math.floor(h));
    this.tuval.width = this.w; this.tuval.height = this.h;
    this.ciz();
  }

  hareketAz(): void { /* statik */ }

  ayarla(k: TopacKurulumu): void {
    this.kur = { ...k };
    for (const t of KATMAN_SIRASI) {
      const id = k[t];
      const ta = id ? tanimA(id) : null;
      if (!id || !ta) { delete this.sprite[t]; continue; }
      const s = ta.serit("keskin", k.sol && ta.yonler.includes("l") ? "l" : "s", t === "govde" ? k.element ?? "kaya" : null);
      const img = resim(s.dosya, () => this.ciz());
      this.sprite[t] = { img, y: s.y, adet: s.adet, w: ta.kare[0], h: ta.kare[1], capa: ta.capa, birim: ta.birim, yukselti: ta.yukselti, simetri: ta.simetri, hazir: true };
    }
    this.ciz();
  }

  durum(d: GorunumDurumu): void { this.gd = d; this.ciz(); }
  vurgu(t: KatmanTuru | null): void { this.vurgulu = t; this.ciz(); }

  private yerlesim(): { olcek: number; cx: number; tabanPx: Record<KatmanTuru, number>; p: number } {
    const mod = this.gd.mod === "odak" ? this.gd.donus : this.gd.mod;
    const p = mod === "patlatilmis" ? 1 : 0;
    const s0 = Object.values(this.sprite)[0];
    const birim = s0?.birim ?? 1.157, yuk = ((s0?.yukselti ?? 26) * Math.PI) / 180;
    const kay = katmanKaymasi(p, PARCALAR_3B[this.kur?.disk ?? ""]?.profil?.[0]?.[1] ?? GOVDE_TABAN_Z);
    // yığın yüksekliği (sanat pikseli, ölçek 1): Uç tabanından Çekirdek tepesine (+ elips payı)
    const yuksek = ((kay.cekirdek + 38) * Math.cos(yuk)) / birim + 16;
    const bos = p ? 52 : 0;
    const olcek = Math.max(1, Math.floor(Math.min((this.h - 10) / yuksek, (this.w - bos - 6) / 64)));
    const cx = bos + (this.w - bos) / 2;
    const tabanPx = {} as Record<KatmanTuru, number>;
    const altY = this.h / 2 + (yuksek * olcek) / 2 - 6 * olcek;
    for (const t of KATMAN_SIRASI) tabanPx[t] = altY - ((kay[t] * Math.cos(yuk)) / birim) * olcek;
    return { olcek, cx, tabanPx, p };
  }

  private ciz(): void {
    const g = this.g;
    if (!g) return;
    g.clearRect(0, 0, this.w, this.h);
    g.imageSmoothingEnabled = false;
    const { olcek, cx, tabanPx } = this.yerlesim();
    const odak = this.gd.mod === "odak" ? this.gd.odak : null;
    const konum = {} as KatmanKonumlari;
    const sira: KatmanTuru[] = ["uc", "disk", "govde", "cekirdek"];
    for (const t of sira) {
      const s = this.sprite[t];
      const pz = PARCALAR_3B[this.kur?.[t] ?? ""];
      if (!s || !pz) { konum[t] = { y: tabanPx[t] - 10 * olcek, sol: cx - 12, sag: cx + 12, gorunur: !odak }; continue; }
      const yaw = odak === t ? this.gd.odakAci.yaw : this.gd.aci.yaw;
      const kare = kareIndeksi((yaw * Math.PI) / 180, s.simetri, s.adet, false);
      const o = odak === t ? olcek + 1 : olcek;
      const ax = cx - s.capa[0] * o, ay = (odak === t ? this.h / 2 + 12 * o : tabanPx[t]) - s.capa[1] * o;
      g.globalAlpha = odak && odak !== t ? 0.28 : 1;
      if (s.img.complete && s.img.naturalWidth) g.drawImage(s.img, kare * s.w, s.y, s.w, s.h, Math.round(ax), Math.round(ay), s.w * o, s.h * o);
      g.globalAlpha = 1;
      const r = ((pz.R0 ?? 9) + (pz.loblar?.[0]?.genlik ?? 0) * 0.5) / s.birim * o;
      const zOrta = (((pz.zAlt ?? 0) + (pz.profil?.[0]?.[1] ?? pz.torna?.[pz.torna.length - 1]?.[1] ?? 10)) / 2) * Math.cos((s.yukselti * Math.PI) / 180) / s.birim;
      const yy = (odak === t ? this.h / 2 + 12 * o : tabanPx[t]) - zOrta * o;
      konum[t] = { y: yy, sol: cx - r, sag: cx + r, gorunur: !odak || odak === t };
      if (this.vurgulu === t && !odak) { g.fillStyle = "#e8762f"; g.fillRect(Math.round(cx - r), Math.round(yy + 10 * o), Math.round(2 * r), 1); }
    }
    this.son = konum;
    this.kareSonrasi();
  }

  konumlar(): KatmanKonumlari {
    if (!this.son) this.ciz();
    return this.son ?? ({} as KatmanKonumlari);
  }

  sec(_x: number, y: number): KatmanTuru | null {
    const k = this.konumlar();
    let en: KatmanTuru | null = null, d = Infinity;
    for (const t of KATMAN_SIRASI) { const v = k[t]; if (v && this.kur?.[t] && Math.abs(v.y - y) < d) { d = Math.abs(v.y - y); en = t; } }
    return d < 24 ? en : null;
  }

  ikon(_id: string, _b: Boya, _boyut: number): HTMLCanvasElement | null { return null; }
  topacIkonu(): HTMLCanvasElement | null { return null; }
  kareSureleri(): number[] { return []; }
  yokEt(): void { /* kaynak yok */ }
}
