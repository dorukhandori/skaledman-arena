import type { ElementAdi } from "../../paylasilan/kurallar/ayar.ts";
import { ELEMENT_RENK, KOKEN_RENK, renkCss } from "../oyun/renkler.ts";

// Menü topaç ikonu (yer tutucu pixel sanat; menu-tasarim-arastirma § 6.5 "Topaç ikon": r 9 mini, 17-18 kart, 32 VS).
// Yan/üç çeyrek görünüş: element boyalı gövde (4 tonlu rampa + Bayer dither), metal disk halkası, uç konisi, altın göbek,
// dither gölge. 8 karelik dönüş döngüsü (12 fps) yalnız vurgu pikselleri kaydırır; azaltılmış harekette tek kare.
// Mantıksal piksel tuvali; CSS genişliği × var(--p) (tam sayı ölçek, pixelated). Sanat hattı gelince sprite'la değişir.

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const esik = (x: number, y: number) => (BAYER[y & 3]![x & 3]! + 0.5) / 16;

export interface TopacSecenek { r?: number; odunc?: boolean; koken?: string | null; donsun?: boolean; golge?: boolean }

const aktif = new Set<{ c: HTMLCanvasElement; ciz: (k: number) => void }>();
let zaman = 0;
function dongu(): void {
  if (zaman) return;
  let kare = 0;
  zaman = window.setInterval(() => {
    kare = (kare + 1) % 8;
    for (const a of [...aktif]) { if (!a.c.isConnected) { aktif.delete(a); continue; } a.ciz(kare); }
    if (!aktif.size) { window.clearInterval(zaman); zaman = 0; }
  }, 83);
}
const azHareket = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || document.documentElement.hasAttribute("data-az-hareket");

/** Topaç tuvali: genişlik 2r+4, yükseklik ≈ 1,45r+6 mantıksal px. */
export function pikselTopac(element: string | null | undefined, s: TopacSecenek = {}): HTMLCanvasElement {
  const r = s.r ?? 17;
  const W = r * 2 + 4, H = Math.round(r * 1.5) + 6;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  c.className = "k-topac";
  c.style.width = `calc(${W} * var(--p))`;
  c.style.height = `calc(${H} * var(--p))`;
  c.style.imageRendering = "pixelated";
  c.setAttribute("aria-hidden", "true");
  const e = element && element in ELEMENT_RENK ? ELEMENT_RENK[element as ElementAdi] : null;
  const ramp = e ? [e.koyu, e.orta, e.acik, e.vurgu].map(renkCss) : ["#3a3f4c", "#6a7080", "#9aa0ae", "#d8dce6"];
  const g = c.getContext("2d")!;
  const nokta = (x: number, y: number, renk: string) => { g.fillStyle = renk; g.fillRect(x, y, 1, 1); };
  const cx = W / 2 - 0.5, gy = Math.round(r * 0.55) + 2; // gövde merkezi
  const rx = r, ry = Math.max(3, Math.round(r * 0.42));
  const ciz = (kare: number) => {
    g.clearRect(0, 0, W, H);
    // gölge (dither elips)
    if (s.golge !== false) {
      const sy = H - 3, srx = r * 0.85, sry = Math.max(2, r * 0.16);
      for (let y = Math.floor(sy - sry); y <= sy + sry; y++) for (let x = Math.floor(cx - srx); x <= cx + srx; x++) {
        const d = ((x - cx) / srx) ** 2 + ((y - sy) / sry) ** 2;
        if (d <= 1 && ((x + y) & 1) === 0) nokta(x, y, "#05050a");
      }
    }
    // uç konisi
    const ucUst = gy + ry, ucAlt = H - 3;
    for (let y = ucUst; y <= ucAlt; y++) {
      const t = (y - ucUst) / Math.max(1, ucAlt - ucUst), w = Math.max(0, Math.round((1 - t) * r * 0.28));
      for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) nokta(x, y, x < cx ? "#8d93a0" : x > cx + w - 1 ? "#3c404a" : "#5d6270");
    }
    // disk halkası (gövdenin altında, metal)
    const dy = gy + Math.round(ry * 0.55), drx = r * 0.88, dry = ry * 0.7;
    for (let y = Math.floor(dy - dry - 1); y <= dy + dry + 1; y++) for (let x = Math.floor(cx - drx - 1); x <= cx + drx + 1; x++) {
      const d = ((x - cx) / drx) ** 2 + ((y - dy) / dry) ** 2;
      if (d > 1.15) continue;
      nokta(x, y, d > 0.85 ? "#22252e" : y < dy ? "#a7adba" : "#5d6270");
    }
    // gövde (element boyası)
    for (let y = Math.floor(gy - ry - 1); y <= gy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - gy) / ry) ** 2;
      if (d > 1) continue;
      if (d > 0.82) { nokta(x, y, ramp[0]!); continue; }
      // ışık sol üstten: üst yarı açık, alt yarı koyu; dönüşte parlak leke yatayda kayar
      const lx = (x - cx) / rx, ly = (y - gy) / ry;
      let v = 0.55 - ly * 0.45 - lx * 0.15;
      const faz = ((kare / 8) * 2 - 1) * 0.8;
      if (Math.abs(lx - faz) < 0.18 && ly < 0.1) v += 0.35;
      const t = Math.max(0, Math.min(2.999, v * 3));
      const i = Math.floor(t), f = t - i;
      nokta(x, y, ramp[Math.min(3, i + (f > esik(x, y) ? 1 : 0))]!);
    }
    // göbek (altın ya da köken ışığı)
    const kk = s.koken && s.koken in KOKEN_RENK ? KOKEN_RENK[s.koken as keyof typeof KOKEN_RENK] : null;
    const gob = kk ? [renkCss(kk.ikinci), renkCss(kk.isik)] : ["#c9952a", "#f7c948"];
    const grx = Math.max(2, Math.round(r * 0.32)), gry = Math.max(1, Math.round(ry * 0.4)), gcy = gy - Math.round(ry * 0.25);
    for (let y = gcy - gry; y <= gcy + gry; y++) for (let x = Math.round(cx - grx); x <= Math.round(cx + grx); x++) {
      const d = ((x - cx) / grx) ** 2 + ((y - gcy) / (gry + 0.5)) ** 2;
      if (d <= 1) nokta(x, y, d > 0.55 ? "#4a3208" : y <= gcy ? gob[1]! : gob[0]!);
    }
    if (r >= 12) { nokta(Math.round(cx), gcy - gry - 1, gob[1]!); nokta(Math.round(cx), gcy - gry - 2, "#fff0b0"); }
  };
  ciz(0);
  if (s.odunc) { c.style.filter = "grayscale(1) brightness(.85)"; c.style.opacity = ".7"; }
  if (s.donsun && !azHareket()) { aktif.add({ c, ciz }); dongu(); }
  return c;
}

/** Köken küresi (İlk Çekirdek, referans 02): 4 tonlu küre + 1 px dış çizgi + vurgu. */
export function kokenKuresi(koken: string, r = 14): HTMLCanvasElement {
  const W = r * 2 + 2, c = document.createElement("canvas");
  c.width = W; c.height = W;
  c.className = "k-kure";
  c.style.width = `calc(${W} * var(--p))`;
  c.style.height = `calc(${W} * var(--p))`;
  c.style.imageRendering = "pixelated";
  c.setAttribute("aria-hidden", "true");
  const RENK: Record<string, string[]> = { goktasi: ["#7a5c2a", "#d5b787", "#f3e3b8", "#fffbe8"], maden: ["#5a3410", "#c0793a", "#e0a050", "#ffd890"], yapay: ["#2c3a44", "#6b8792", "#9db3bc", "#e0eef2"], karanlik: ["#1a0f26", "#5b2a86", "#8a5cb8", "#d0b0f0"] };
  const ramp = RENK[koken] ?? RENK["goktasi"]!;
  const g = c.getContext("2d")!;
  const m = W / 2 - 0.5;
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const dx = (x - m) / r, dy = (y - m) / r, d = dx * dx + dy * dy;
    if (d > 1) continue;
    let renk: string;
    if (d > 0.86) renk = "#0a0910";
    else {
      const v = 0.6 - dx * 0.3 - dy * 0.45 - d * 0.25;
      const t = Math.max(0, Math.min(2.999, v * 3)), i = Math.floor(t);
      renk = ramp[Math.min(3, i + (t - i > esik(x, y) ? 1 : 0))]!;
    }
    g.fillStyle = renk; g.fillRect(x, y, 1, 1);
  }
  g.fillStyle = "#ffffff"; g.fillRect(Math.round(m - r * 0.4), Math.round(m - r * 0.45), 2, 2);
  return c;
}

const METAL: Record<string, string[]> = {
  baslangic: ["#3c404a", "#6a7080", "#9ea6b4", "#d8dce6"], standart: ["#3d4a5e", "#5d6c84", "#b7c4d6", "#e8eef6"], nadir: ["#1f3f6a", "#2f5f9a", "#8fc3ff", "#e0f0ff"],
  hizip: ["#4a2a60", "#6a3a8a", "#e0a2ff", "#f6e0ff"], karanlik: ["#1a0f26", "#2a1340", "#8a5cb8", "#d0b0f0"],
};

/** Parça ikonu (pixel; Atölye ızgarası, Market hücresi): Çekirdek küre · Gövde boyalı yassı elips · Disk metal halka · Uç koni. 24×18. */
export function parcaPikselIkonu(tur: string, element: string | null | undefined, koken: string | null | undefined, katman: string | undefined, gizli = false): HTMLCanvasElement {
  const W = 24, H = 18;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  c.className = "k-parca";
  c.style.width = `calc(${W} * var(--p))`;
  c.style.height = `calc(${H} * var(--p))`;
  c.style.imageRendering = "pixelated";
  c.setAttribute("aria-hidden", "true");
  const g = c.getContext("2d")!;
  const e = element && element in ELEMENT_RENK ? ELEMENT_RENK[element as ElementAdi] : null;
  const el = e ? [e.koyu, e.orta, e.acik, e.vurgu].map(renkCss) : ["#3a3f4c", "#6a7080", "#9aa0ae", "#d8dce6"];
  const me = METAL[katman ?? "baslangic"] ?? METAL["baslangic"]!;
  const nokta = (x: number, y: number, r: string) => { g.fillStyle = gizli ? "#0a0910" : r; g.fillRect(x, y, 1, 1); };
  const elips = (cx: number, cy: number, rx: number, ry: number, ramp: string[], delik = 0) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d > 1) continue;
      if (delik && ((x - cx) / (rx * delik)) ** 2 + ((y - cy) / (ry * delik)) ** 2 < 1) { if (((x - cx) / (rx * delik)) ** 2 + ((y - cy) / (ry * delik)) ** 2 > 0.6) nokta(x, y, "#0a0910"); continue; }
      const v = 0.55 - ((y - cy) / ry) * 0.4 - ((x - cx) / rx) * 0.15;
      const t = Math.max(0, Math.min(2.999, v * 3)), i = Math.floor(t);
      nokta(x, y, d > 0.78 ? ramp[0]! : ramp[Math.min(3, i + (t - i > esik(x, y) ? 1 : 0))]!);
    }
  };
  if (tur === "cekirdek") {
    const kk = koken && koken in KOKEN_RENK ? KOKEN_RENK[koken as keyof typeof KOKEN_RENK] : KOKEN_RENK.goktasi;
    elips(12, 9.5, 10, 4, el, 0.62); // element halkası
    elips(12, 8.5, 5, 5, ["#0a0910", renkCss(kk.ikinci), renkCss(kk.isik), "#ffffff"]);
  } else if (tur === "govde") {
    elips(12, 9, 11, 5, el);
    elips(12, 8.5, 5, 2, [el[0]!, el[0]!, el[1]!, el[1]!]);
  } else if (tur === "disk") {
    elips(12, 10, 11, 4.5, me, 0.45);
  } else {
    for (let y = 6; y <= 16; y++) { const w = Math.round((16 - y) * 0.55); for (let x = 12 - w; x <= 12 + w; x++) nokta(x, y, x < 12 ? me[2]! : x > 12 + w - 1 ? me[0]! : me[1]!); }
    elips(12, 5, 7, 2.5, me);
  }
  return c;
}

/** innerHTML şablonları için: pixel parça ikonu `<img>` (data URL; ölçek mantıksal px katı). */
export function parcaIkonHtml(tur: string, element: string | null | undefined, koken: string | null | undefined, katman: string | undefined, olcek = 1, gizli = false): string {
  const c = parcaPikselIkonu(tur, element, koken, katman, gizli);
  return `<img class="k-parca" alt="" aria-hidden="true" src="${c.toDataURL()}" style="width:calc(${24 * olcek} * var(--p));height:calc(${18 * olcek} * var(--p));image-rendering:pixelated">`;
}

/** Giriş/Profil sol panel (referans 01): ışıyan Çekirdek illüstrasyonu (eş merkezli bronz halkalar + Kuşak halkası + çekirdek ışığı). */
export function cekirdekIllustrasyonu(R = 60): HTMLCanvasElement {
  const W = R * 2 + 8;
  const c = document.createElement("canvas");
  c.width = W; c.height = W;
  c.className = "k-illus";
  c.style.width = `calc(${W} * var(--p))`;
  c.style.height = `calc(${W} * var(--p))`;
  c.style.imageRendering = "pixelated";
  c.setAttribute("aria-hidden", "true");
  const g = c.getContext("2d")!;
  const m = W / 2 - 0.5;
  // halka bantları: dıştan içe (yarıçap oranı, ton)
  const BANT: [number, string[]][] = [
    [1.0, ["#2a1a0e", "#6b4a2a"]], [0.96, ["#fbbe88", "#fff0d8"]], [0.92, ["#6b4a2a", "#8f6538"]], [0.78, ["#8f6538", "#c08e52"]],
    [0.62, ["#c08e52", "#e8c27a"]], [0.5, ["#2a1a0e", "#0c0b10"]], [0.4, ["#e8c27a", "#c08e52"]], [0.32, ["#fff0d8", "#fbbe88"]],
  ];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - m, y - m) / R;
    if (d > 1.06) { if (d < 1.14 && ((x + y) & 1) === 0) { g.fillStyle = "#8a5a34"; g.fillRect(x, y, 1, 1); } continue; }
    let renk = "#2a1a0e";
    for (const [r, ton] of BANT) if (d <= r) { const ust = (y - m) < 0 ? 1 : 0; renk = ((x * 3 + y) & 3) === 0 ? ton[1 - ust]! : ton[ust]!; }
    if (d > 1) renk = ((x + y) & 1) ? "#dca97c" : "#8a5a34";
    g.fillStyle = renk; g.fillRect(x, y, 1, 1);
  }
  // halka parıltıları (yay kesitleri)
  g.fillStyle = "#fff0d8";
  for (let a = -2.4; a < -1.6; a += 0.01) g.fillRect(Math.round(m + Math.cos(a) * R * 0.7), Math.round(m + Math.sin(a) * R * 0.7), 1, 1);
  for (let a = 0.5; a < 1.1; a += 0.01) g.fillRect(Math.round(m + Math.cos(a) * R * 0.7), Math.round(m + Math.sin(a) * R * 0.7), 1, 1);
  return c;
}
