import { USTA_PARILTI } from "./haritaVarlik.ts";

// Harita / Maden / Ocak görsel efektleri (sanat turu, docs/production/raporlar/HARITA-SANAT.md): piksel kırıntı
// patlaması, usta işi parıltısı (public/harita/efekt/usta-isi.png, 8 kare), halka dalgası, sarsıntı, bölge ortam
// parçacıkları (SVG). Hepsi yalnız görsel; oyun durumu değiştirmez. "Hareketi azalt" (sistem ya da data-azalt=1) açıkken
// hareketli efekt çizilmez (yalnız sabit parıltı karesi). DOM efektleri kendini ~1,2 sn içinde siler.

export const hareketiAzalt = (): boolean =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true || document.documentElement.dataset["azalt"] === "1";

const STIL = `
.ef-p { position:absolute; left:0; top:0; width:var(--b,4px); height:var(--b,4px); background:var(--c); pointer-events:none; z-index:5;
  animation: ef-p var(--t,650ms) cubic-bezier(.15,.6,.35,1) forwards; box-shadow:0 0 0 1px rgba(5,5,10,.55); }
@keyframes ef-p { 0% { transform:translate(var(--x0),var(--y0)) } 55% { transform:translate(calc(var(--x0) + var(--dx) * .8), calc(var(--y0) + var(--dy) * .8)); opacity:1 }
  100% { transform:translate(calc(var(--x0) + var(--dx)), calc(var(--y0) + var(--dy) + var(--g,0px))); opacity:0 } }
.ef-parilti { position:absolute; left:0; top:0; pointer-events:none; z-index:6; image-rendering:pixelated; background-repeat:no-repeat;
  animation: ef-par var(--t,640ms) steps(8) forwards; }
@keyframes ef-par { from { background-position:0 0 } to { background-position:calc(-8 * var(--w)) 0 } }
.ef-halka { position:absolute; left:0; top:0; pointer-events:none; z-index:4; border:2px solid var(--c); width:8px; height:8px;
  animation: ef-halka 520ms ease-out forwards; }
@keyframes ef-halka { from { transform:translate(var(--x0),var(--y0)) scale(1); opacity:1 } to { transform:translate(var(--x0),var(--y0)) scale(var(--s,7)); opacity:0 } }
.ef-sars { animation: ef-sars 260ms steps(4) 1; }
@keyframes ef-sars { 25% { transform:translate(2px,-1px) } 50% { transform:translate(-2px,1px) } 75% { transform:translate(1px,1px) } }
.ef-ortam rect, .ef-ortam circle, .ef-ortam line { transform-box:fill-box; animation-iteration-count:infinite; animation-timing-function:linear; }
.ef-kar { animation-name:ef-kar }
@keyframes ef-kar { from { transform:translate(0,-30px) } 50% { transform:translate(6px,90px) } to { transform:translate(-4px,210px) } }
.ef-kor { animation-name:ef-kor }
@keyframes ef-kor { 0% { transform:translate(0,0); opacity:0 } 15% { opacity:1 } 100% { transform:translate(8px,-70px); opacity:0 } }
.ef-yel { animation-name:ef-yel }
@keyframes ef-yel { 0% { transform:translate(-80px,0); opacity:0 } 20% { opacity:.8 } 80% { opacity:.8 } 100% { transform:translate(520px,-10px); opacity:0 } }
.ef-toz { animation-name:ef-toz }
@keyframes ef-toz { 0% { transform:translate(0,0); opacity:0 } 30% { opacity:.7 } 100% { transform:translate(40px,-8px); opacity:0 } }
.ef-kabarcik { animation-name:ef-kab }
@keyframes ef-kab { 0% { transform:translate(0,0) scale(.6); opacity:0 } 20% { opacity:.9 } 100% { transform:translate(-3px,-40px) scale(1.2); opacity:0 } }
.ef-cakim { animation-name:ef-cak; animation-timing-function:steps(1) }
@keyframes ef-cak { 0%, 91%, 95%, 100% { opacity:0 } 92%, 96% { opacity:.22 } }
.ef-kivilcim { animation-name:ef-kiv }
@keyframes ef-kiv { 0%, 80% { opacity:0 } 84% { opacity:1 } 100% { transform:translate(4px,-14px); opacity:0 } }
.ef-iz { animation: ef-iz 700ms ease-out forwards; transform-box:fill-box; transform-origin:center; }
@keyframes ef-iz { from { opacity:.75; transform:scale(.6) } to { opacity:0; transform:translate(0,-3px) scale(1.6) } }
.ef-nabiz { animation: ef-nabiz 1.6s ease-in-out infinite; transform-box:fill-box; transform-origin:center; }
@keyframes ef-nabiz { 0%, 100% { opacity:.25; transform:scale(1) } 50% { opacity:.9; transform:scale(1.12) } }
.ef-isima { animation: ef-isima 2.2s ease-in-out infinite; transform-box:fill-box; transform-origin:center; }
@keyframes ef-isima { 0%, 100% { opacity:.45 } 50% { opacity:.95 } }
@media (prefers-reduced-motion: reduce) { .ef-ortam, .ef-p, .ef-halka, .ef-iz { display:none } .ef-sars, .ef-nabiz, .ef-isima { animation:none } }
html[data-azalt="1"] .ef-ortam, html[data-azalt="1"] .ef-p, html[data-azalt="1"] .ef-halka { display:none }
`;

let stilVar = false;
export function efektStili(): void {
  if (stilVar) return;
  stilVar = true;
  const st = document.createElement("style");
  st.dataset["efekt"] = "harita";
  st.textContent = STIL;
  document.head.appendChild(st);
}

function sonra(e: Element, ms: number): void {
  window.setTimeout(() => e.remove(), ms);
}

export interface KirintiAyar { adet?: number; guc?: number; boy?: number; sure?: number; yercekimi?: number; yukari?: number }

/** Kap içinde (x, y) px noktasından piksel kırıntıları saçar. Kap `position:relative|absolute` olmalı. */
export function kirintiPatlat(kap: HTMLElement, x: number, y: number, renkler: readonly string[], a: KirintiAyar = {}): void {
  if (hareketiAzalt() || !renkler.length) return;
  efektStili();
  const adet = a.adet ?? 12, guc = a.guc ?? 34, boy = a.boy ?? 4, sure = a.sure ?? 650;
  for (let i = 0; i < adet; i++) {
    const aci = (i / adet) * Math.PI * 2 + Math.random() * 0.6;
    const r = guc * (0.45 + Math.random() * 0.55);
    const p = document.createElement("i");
    p.className = "ef-p";
    const b = Math.max(2, Math.round(boy * (0.6 + Math.random() * 0.7)));
    p.style.cssText = `--c:${renkler[i % renkler.length]};--b:${b}px;--t:${Math.round(sure * (0.8 + Math.random() * 0.4))}ms;` +
      `--x0:${Math.round(x - b / 2)}px;--y0:${Math.round(y - b / 2)}px;--dx:${Math.round(Math.cos(aci) * r)}px;` +
      `--dy:${Math.round(Math.sin(aci) * r - (a.yukari ?? 10))}px;--g:${a.yercekimi ?? 18}px`;
    kap.appendChild(p);
    sonra(p, sure * 1.3);
  }
}

/** Usta işi parıltısı (8 kare şerit) tek sefer; ölçek tam sayı (nearest). */
export function parilti(kap: HTMLElement, x: number, y: number, olcek = 2, sure = 640): void {
  efektStili();
  const w = 16 * olcek;
  const p = document.createElement("i");
  p.className = "ef-parilti";
  p.style.cssText = `--w:${w}px;--t:${sure}ms;width:${w}px;height:${w}px;transform:translate(${Math.round(x - w / 2)}px,${Math.round(y - w / 2)}px);` +
    `background-image:url(${USTA_PARILTI()});background-size:${w * 8}px ${w}px;`;
  if (hareketiAzalt()) { p.style.animation = "none"; p.style.backgroundPosition = `${-3 * w}px 0`; }
  kap.appendChild(p);
  sonra(p, sure + 80);
}

/** Genişleyen kare halka (isabet, düğüm açılışı). */
export function halkaDalga(kap: HTMLElement, x: number, y: number, renk: string, olcek = 7): void {
  if (hareketiAzalt()) return;
  efektStili();
  const h = document.createElement("i");
  h.className = "ef-halka";
  h.style.cssText = `--c:${renk};--s:${olcek};--x0:${Math.round(x - 4)}px;--y0:${Math.round(y - 4)}px;border-radius:50%`;
  kap.appendChild(h);
  sonra(h, 600);
}

/** Kısa sarsıntı (vuruş). */
export function sarsinti(e: Element): void {
  if (hareketiAzalt()) return;
  efektStili();
  e.classList.remove("ef-sars");
  void (e as HTMLElement).offsetWidth;
  e.classList.add("ef-sars");
  window.setTimeout(() => e.classList.remove("ef-sars"), 300);
}

/** Elemanın merkezi, kabın sol üstüne göre px. */
export function merkez(kap: Element, e: Element): [number, number] {
  const a = kap.getBoundingClientRect(), b = e.getBoundingClientRect();
  return [b.left - a.left + b.width / 2, b.top - a.top + b.height / 2];
}

/** SVG kullanıcı koordinatı → kabın içinde px. */
export function svgNoktasi(kap: Element, svg: SVGSVGElement, x: number, y: number): [number, number] {
  const m = svg.getScreenCTM();
  const a = kap.getBoundingClientRect();
  if (!m) return [0, 0];
  return [m.a * x + m.c * y + m.e - a.left, m.b * x + m.d * y + m.f - a.top];
}

// ---- bölge ortam parçacıkları (SVG, 480×200 alan, viewBox y 18'den) ----
type Ortam = "kaya" | "don" | "kor" | "kasirga" | "simsek" | "girdap";
const NS = "http://www.w3.org/2000/svg";
const ozellik = (e: Element, o: Record<string, string | number>) => { for (const [k, v] of Object.entries(o)) e.setAttribute(k, String(v)); return e; };

/** Deterministik sözde rastgele (aynı bölge her açılışta aynı desen). */
function tohumlu(t: number): () => number {
  let s = t >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function ortamParcaciklari(ust: SVGElement, element: string, y0 = 18, w = 480, h = 200): SVGGElement | null {
  efektStili();
  const g = document.createElementNS(NS, "g") as SVGGElement;
  g.setAttribute("class", "ef-ortam");
  g.setAttribute("aria-hidden", "true");
  g.setAttribute("pointer-events", "none");
  const r = tohumlu(element.length * 97 + element.charCodeAt(0));
  const ekle = (ad: string, o: Record<string, string | number>, sinif: string, sure: number, gecikme: number) => {
    const e = ozellik(document.createElementNS(NS, ad), o);
    e.setAttribute("class", sinif);
    (e as SVGElement).style.animationDuration = `${sure.toFixed(2)}s`;
    (e as SVGElement).style.animationDelay = `${(-gecikme).toFixed(2)}s`;
    g.appendChild(e);
  };
  const e = element as Ortam;
  if (e === "don") for (let i = 0; i < 34; i++) ekle("rect", { x: r() * w, y: y0, width: 2, height: 2, fill: i % 4 ? "#ffffff" : "#cff3fb" }, "ef-kar", 6 + r() * 5, r() * 11);
  else if (e === "kor") for (let i = 0; i < 26; i++) ekle("rect", { x: r() * w, y: y0 + h * (0.4 + r() * 0.6), width: 2, height: 2, fill: ["#ffd2a8", "#ff8a5c", "#e8452c"][i % 3]! }, "ef-kor", 2.6 + r() * 2.4, r() * 5);
  else if (e === "kasirga") for (let i = 0; i < 12; i++) ekle("rect", { x: 0, y: y0 + r() * h, width: 10 + r() * 18, height: 1, fill: "#e2fff2", opacity: 0.8 }, "ef-yel", 2.8 + r() * 2.2, r() * 5);
  else if (e === "girdap") for (let i = 0; i < 20; i++) ekle("circle", { cx: r() * w, cy: y0 + h * (0.3 + r() * 0.7), r: 1.2 + r(), fill: "none", stroke: "#cfdcff", "stroke-width": 0.8 }, "ef-kabarcik", 3 + r() * 3, r() * 6);
  else if (e === "simsek") {
    ekle("rect", { x: 0, y: y0, width: w, height: h, fill: "#fffbe0" }, "ef-cakim", 7.5, 0);
    for (let i = 0; i < 18; i++) ekle("rect", { x: r() * w, y: y0 + r() * h, width: 2, height: 2, fill: i % 2 ? "#f7d83a" : "#fffbe0" }, "ef-kivilcim", 2 + r() * 3, r() * 5);
  } else for (let i = 0; i < 22; i++) ekle("rect", { x: r() * w, y: y0 + r() * h, width: 2, height: 2, fill: i % 3 ? "#e6c08a" : "#b0743a" }, "ef-toz", 4 + r() * 4, r() * 8);
  ust.appendChild(g);
  return g;
}

/** Yürürken ayak tozu (SVG; kendini siler). */
export function ayakTozu(ust: SVGElement, x: number, y: number, renk = "#c8b89a"): void {
  if (hareketiAzalt()) return;
  efektStili();
  const c = ozellik(document.createElementNS(NS, "rect"), { x: x - 1.5, y: y - 1.5, width: 3, height: 3, fill: renk });
  c.setAttribute("class", "ef-iz");
  c.setAttribute("pointer-events", "none");
  ust.appendChild(c);
  sonra(c, 760);
}
