import gizlilikMetni from "../../../docs/gizlilik.md?raw";
import { type Krediler, kredilerDerle, oyuncuKredileri } from "../../paylasilan/krediler.ts";
import type { EkranBaglami } from "../main.ts";
import { el, ekranKok, geriDugmesi } from "./arayuz.ts";

// D8 bilgi sayfaları: `/gizlilik` (docs/gizlilik.md, nile B-28) ve `/krediler` (docs/art/krediler.md + veri/manifest-*.json,
// efekt oturumu günceller; burada yalnız OKUNUR, eksik dosya → boş durum). Ekran başına tek eylem: oku, geri dön.
// Metin yalnız `textContent` / öğe kurarak basılır (innerHTML yok).

/** Basit Markdown: #, ##, - liste, paragraf, **kalın**, `kod`. */
function mdYaz(ust: HTMLElement, md: string): void {
  let liste: HTMLUListElement | null = null;
  let paragraf: HTMLParagraphElement | null = null;
  const satirIci = (hedef: HTMLElement, metin: string) => {
    for (const p of metin.split(/(\*\*[^*]+\*\*|`[^`]+`)/)) {
      if (!p) continue;
      if (p.startsWith("**")) el("b", "", hedef, p.slice(2, -2));
      else if (p.startsWith("`")) el("code", "", hedef, p.slice(1, -1));
      else hedef.append(p);
    }
  };
  for (const ham of md.split(/\r?\n/)) {
    const s = ham.trim();
    if (!s) { liste = null; paragraf = null; continue; }
    if (s.startsWith("# ")) { el("h2", "", ust, s.slice(2)); liste = null; paragraf = null; continue; }
    if (s.startsWith("## ")) { el("h3", "", ust, s.slice(3)); liste = null; paragraf = null; continue; }
    if (s.startsWith("- ")) { liste ??= el("ul", "", ust); satirIci(el("li", "", liste), s.slice(2)); paragraf = null; continue; }
    if (liste && /^\s{2,}/.test(ham)) { const li = liste.lastElementChild as HTMLElement; li.append(" "); satirIci(li, s); continue; }
    if (paragraf) { paragraf.append(" "); satirIci(paragraf, s); continue; }
    paragraf = el("p", "", ust);
    satirIci(paragraf, s);
    liste = null;
  }
}

const STIL = `
.ekr .bilgi { line-height:.875; }
.ekr .bilgi h2 { font-size:var(--y-30); }
.ekr .bilgi h3 { margin:calc(8 * var(--p)) 0 calc(3 * var(--p)); color:var(--gold); }
.ekr .bilgi ul { margin:calc(2 * var(--p)) 0 calc(3 * var(--p)) calc(10 * var(--p)); padding:0; }
.ekr .bilgi li { margin:var(--p) 0; }
.ekr .bilgi code { font:400 var(--y-16)/1 var(--font-etiket); color:var(--gold); background:#100e16; padding:0 var(--p); }
.ekr .bilgi table { width:100%; table-layout:fixed; border-collapse:collapse; margin:calc(2 * var(--p)) 0 calc(6 * var(--p)); }
.ekr .bilgi th, .ekr .bilgi td { overflow-wrap:anywhere; text-align:left; vertical-align:top; padding:calc(2 * var(--p)) calc(3 * var(--p)); border-bottom:var(--p) solid #2a3146; }
.ekr .bilgi th { color:var(--gold); text-transform:uppercase; font-weight:400; }
.ekr .bilgi pre { white-space:pre-wrap; overflow-wrap:anywhere; font:400 var(--y-16)/.875 var(--font-etiket); background:#100e16; padding:calc(4 * var(--p)); color:var(--soluk); }
.ekr .bilgi .bos { color:var(--soluk); }
.ekr .bilgi.kredi table { margin-bottom:calc(4 * var(--p)); }
.ekr .bilgi.kredi th:nth-child(1), .ekr .bilgi.kredi td:nth-child(1) { width:34%; }
.ekr .bilgi.kredi th:nth-child(3), .ekr .bilgi.kredi td:nth-child(3) { width:18%; }
.ekr .bilgi.kredi td { overflow-wrap:break-word; }
.ekr .bilgi.kredi td:nth-child(3) { color:var(--soluk); }
.ekr .bilgi details { margin-top:calc(8 * var(--p)); }
.ekr .bilgi summary { cursor:pointer; color:var(--gold); text-transform:uppercase; }
`;
function stil(): void { const s = document.createElement("style"); s.textContent = STIL; document.head.appendChild(s); }

export function gizlilik(b: EkranBaglami): void {
  stil();
  const { kart } = ekranKok(b.ustYazi, "Gizlilik");
  geriDugmesi(kart, "ayarlar");
  const ic = el("div", "bilgi", kart);
  ic.dataset["sayfa"] = "gizlilik";
  mdYaz(ic, gizlilikMetni);
}

// efekt oturumunun dosyaları: derleme anında okunur; dosya yoksa boş nesne (boş durum)
const MD = import.meta.glob("../../../docs/art/krediler.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const MANIFEST = import.meta.glob("../../../veri/manifest-*.json", { import: "default", eager: true }) as Record<string, unknown>;

export function kredileriOku(): Krediler {
  const md = Object.values(MD)[0] ?? null;
  const bul = (ad: string) => Object.entries(MANIFEST).find(([k]) => k.endsWith(`manifest-${ad}.json`))?.[1] ?? null;
  return kredilerDerle(md, bul("gorsel"), bul("ses"));
}

/**
 * H-2 (MENU-P1A, sahip kararı S-3): oyuncu sürümü. Yalnız oyunda kullanılan varlıklar, sütunlar Varlık · Atıf · Lisans;
 * aday satırları, Durum/Not sütunları, dosya yolları ve manifest denetimi gösterilmez (tam iç kayıt docs/art/krediler.md,
 * denetim `npm run krediler:uret`). MIT bildirimi açılır kutuda.
 */
export function krediler(b: EkranBaglami): void {
  stil();
  const { kart } = ekranKok(b.ustYazi, "Krediler");
  kart.classList.add("genis");
  geriDugmesi(kart, "ayarlar");
  const ic = el("div", "bilgi kredi", kart);
  ic.dataset["sayfa"] = "krediler";
  el("p", "alt", ic, "Devran: özgün dönen topaç dövüşü. Kâr amaçsız. Oyunda kullandığımız her şeyin sahibi ve lisansı:");
  const k = kredileriOku();
  const bolumler = oyuncuKredileri(k);
  if (!bolumler.length) el("p", "bos", ic, "Varlık kredisi kaydı henüz yok.");
  const tablo = (basliklar: string[], satirlar: string[][]) => {
    const t = el("table", "", ic);
    const tr = el("tr", "", el("thead", "", t));
    for (const h of basliklar) el("th", "", tr, h);
    const govde = el("tbody", "", t);
    for (const s of satirlar) { const r = el("tr", "", govde); for (const h of s) el("td", "", r, h); }
  };
  for (const bl of bolumler) {
    el("h3", "", ic, bl.baslik);
    tablo(["Varlık", "Atıf", "Lisans"], bl.satirlar.map((s) => [s.varlik, s.atif, s.lisans]));
  }
  if (!bolumler.some((x) => x.baslik === "Yazı tipleri")) { el("h3", "", ic, "Yazı tipleri"); el("p", "", ic, k.yaziTipi); }
  el("h3", "", ic, "Yazılım");
  tablo(["Yazılım", "Atıf", "Lisans"], k.yazilim.map((y) => [y.ad, `${y.telif.replace(/^docs\/.*$/, "")} ${y.url.replace(/^https?:\/\//, "")}`.trim(), y.lisans]));
  if (k.bildirim) {
    const d = el("details", "", ic);
    el("summary", "", d, "MIT bildirimi");
    el("pre", "", d, k.bildirim);
  }
  el("p", "yt", ic, `${bolumler.reduce((n, x) => n + x.satirlar.length, 0)} varlık · ${k.yazilim.length} yazılım`);
}
