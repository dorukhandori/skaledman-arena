// Lobi akışının pixel çizimleri (yön B · Kuşak Taşı; menu-tasarim-arastirma § 5.6, § 6.5): Oyna sahnesindeki Kuşak yayı,
// arama çanağı (12 dilim = 60 sn), takım seçimi süre halkası (20 çentik), VS zemini (çatlakla bölünen iki yarı).
// Hepsi mantıksal piksel tuvali; CSS boyutu × var(--p). Gradyan yok: ton geçişi Bayer 4×4 dither.

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const esik = (x: number, y: number) => (BAYER[y & 3]![x & 3]! + 0.5) / 16;
function rastgele(t: number): () => number { return () => { t |= 0; t = (t + 0x6d2b79f5) | 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
function ton(ramp: string[], v: number, x: number, y: number): string {
  const t = Math.max(0, Math.min(ramp.length - 1.001, v * (ramp.length - 1))), i = Math.floor(t);
  return ramp[Math.min(ramp.length - 1, i + (t - i > esik(x, y) ? 1 : 0))]!;
}

export function tuval(w: number, h: number, sinif = ""): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  if (sinif) c.className = sinif;
  c.style.width = `calc(${w} * var(--p))`;
  c.style.height = `calc(${h} * var(--p))`;
  c.style.imageRendering = "pixelated";
  c.setAttribute("aria-hidden", "true");
  return { c, g: c.getContext("2d")! };
}
const px = (g: CanvasRenderingContext2D, x: number, y: number, renk: string) => { g.fillStyle = renk; g.fillRect(x, y, 1, 1); };

/** Kuşak halkası 3 px yay: çekirdek + halka + hale (+ dither). a0..a1 radyan, üst yarı negatif açı. */
function yay(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, renk: "isik" | "sonuk" | "kirmizi" = "isik"): void {
  const R = renk === "isik" ? ["#dca97c", "#fbbe88", "#fff0d8"] : renk === "kirmizi" ? ["#8a1a1a", "#c82625", "#ff8a7a"] : ["#2a2528", "#3d3638", "#4a4246"];
  const adim = 1 / Math.max(rx, ry) / 2;
  for (let a = a0; a <= a1; a += adim) {
    const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry);
    px(g, x, y - 1, R[0]!); px(g, x, y + 1, R[1]!); px(g, x, y, R[2]!);
    if (renk === "isik" && ((x + y) & 3) === 0) px(g, x, y - 2, "#8a5a34");
  }
}

/**
 * Oyna sahnesi: takımın arkasında Kuşak yayı (üst yarı ışıklı, alt yarı sönük taş çizgi). `cyOran`/`ryOran` elipsin
 * merkezini ve dikey yarıçapını tuval yüksekliğine göre verir (K-8: alt yay kaidelerin hemen altından geçer).
 */
export function oynaYayi(w: number, h: number, cyOran = 0.52, ryOran = 0.42): HTMLCanvasElement {
  const { c, g } = tuval(w, h, "k-yay");
  const cx = w / 2, cy = h * cyOran, rx = w / 2 - 6, ry = h * ryOran;
  yay(g, cx, cy, rx, ry, Math.PI * 1.04, Math.PI * 1.96, "isik");
  yay(g, cx, cy, rx, ry, Math.PI * 0.08, Math.PI * 0.92, "sonuk");
  return c;
}

/** Arama çanağı: taş elips (arena 07 rampası) + 12 dilim halka. `dolu` 0..12. */
export function aramaCanagi(dolu: number): HTMLCanvasElement {
  const W = 408, H = 180;
  const { c, g } = tuval(W, H, "k-canak");
  const cx = W / 2, cy = H / 2, RX = 200, RY = 86;
  const r = rastgele(7);
  const gurultu: number[] = Array.from({ length: 64 }, () => r());
  const n = (x: number, y: number) => (gurultu[((x >> 3) * 7 + (y >> 3) * 13) & 63]! * 0.5 + gurultu[((x >> 1) * 5 + (y >> 1) * 11) & 63]! * 0.5);
  const ZEMIN = ["#3a3436", "#4a4446", "#5e5654", "#6f6660", "#7f746c"];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = ((x - cx) / RX) ** 2 + ((y - cy) / RY) ** 2;
    if (d > 1) continue;
    if (d > 0.9) { px(g, x, y, d > 0.96 ? "#1e1b24" : "#2e2a33"); continue; }
    if (d > 0.84) { px(g, x, y, "#4a4550"); continue; }
    let v = 0.55 + 0.3 * (n(x, y) - 0.5) - (y - cy) / RY * 0.12;
    if (d < 0.12) v -= 0.25; // merkez çukur
    px(g, x, y, ton(ZEMIN, v, x, y));
  }
  for (let k = 0; k < 6; k++) { // çatlak
    let x = Math.round(cx + (r() - 0.5) * RX * 1.4), y = Math.round(cy + (r() - 0.5) * RY * 1.2);
    for (let i = 0; i < 10; i++) { if (((x - cx) / RX) ** 2 + ((y - cy) / RY) ** 2 < 0.8) px(g, x, y, "#2a2528"); x += r() < 0.5 ? 1 : -1; y += r() < 0.6 ? 1 : 0; }
  }
  const dilim = (Math.PI * 2) / 12, bosluk = 0.08;
  for (let k = 0; k < 12; k++) {
    const a0 = -Math.PI / 2 + k * dilim + bosluk / 2;
    yay(g, cx, cy, 160, 67, a0, a0 + dilim - bosluk, k < dolu ? "isik" : "sonuk");
  }
  return c;
}

/** Takım seçimi süre halkası: 20 çentik (3×3) elips rx 28 · ry 21; son 5 sn kırmızı. */
export function sureHalkasi(kalan: number, toplam = 20): HTMLCanvasElement {
  const W = 64, H = 50;
  const { c, g } = tuval(W, H, "k-sure");
  const cx = W / 2, cy = H / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (((x - cx) / 22) ** 2 + ((y - cy) / 16) ** 2 <= 1) px(g, x, y, "#14111a");
  for (let k = 0; k < 20; k++) {
    const a = -Math.PI / 2 + (k / 20) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * 28) - 1, y = Math.round(cy + Math.sin(a) * 21) - 1;
    const yanik = k < Math.round((kalan / toplam) * 20);
    const kirmizi = kalan <= 5;
    g.fillStyle = yanik ? (kirmizi ? "#c82625" : "#fbbe88") : "#2a2528";
    g.fillRect(x, y, 3, 3);
    if (yanik) px(g, x + 1, y + 1, kirmizi ? "#ff8a7a" : "#fff0d8");
  }
  return c;
}

/** VS zemini: sol sıcak / sağ soğuk (bot: gri) dither yarılar, çatlak x = W/2 − (y − H/2)·0,35 ± 2 px. */
export function vsZemini(W: number, H: number, bot: boolean): HTMLCanvasElement {
  const { c, g } = tuval(W, H, "k-vs-zemin");
  c.style.width = "100%"; c.style.height = "100%";
  const r = rastgele(3);
  const titresim = Array.from({ length: H }, () => Math.round((r() - 0.5) * 4));
  const SOL = ["#2a0f0a", "#3a160e", "#4a1d12", "#5a2416"];
  const SAG = bot ? ["#1a1a1f", "#24242a", "#2e2e35", "#383840"] : ["#0a1230", "#0f1a40", "#14214f", "#1a2a5e"];
  const nb: number[] = Array.from({ length: 256 }, () => r());
  for (let y = 0; y < H; y++) {
    const sx = Math.round(W / 2 - (y - H / 2) * 0.35) + titresim[y]!;
    for (let x = 0; x < W; x++) {
      const v = 0.5 + 0.35 * (nb[((x >> 2) * 31 + (y >> 2) * 17) & 255]! - 0.5);
      let renk = x < sx ? ton(SOL, v, x, y) : ton(SAG, v, x, y);
      if (x === sx - 1 || x === sx + 2) renk = "#0c0b10";
      else if (x === sx) renk = "#fff0d8";
      else if (x === sx + 1) renk = ((x + y) & 1) ? "#fbbe88" : "#0c0b10";
      px(g, x, y, renk);
    }
  }
  // hız çizgileri (taraf renginde, yatay)
  for (let k = 0; k < 14; k++) {
    const y = Math.floor(r() * H), sol = k % 2 === 0, uz = 20 + Math.floor(r() * 50);
    const x0 = sol ? Math.floor(r() * (W * 0.35)) : Math.floor(W * 0.6 + r() * (W * 0.35));
    g.fillStyle = sol ? "#8a2a14" : bot ? "#4a4a55" : "#2a5bd7";
    g.fillRect(x0, y, uz, 1);
  }
  return c;
}
