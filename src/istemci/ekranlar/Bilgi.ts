import gizlilikMetni from "../../../docs/gizlilik.md?raw";
import { type Krediler, kredilerDerle } from "../../paylasilan/krediler.ts";
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
.ekr .bilgi table { width:100%; border-collapse:collapse; margin:calc(2 * var(--p)) 0 calc(6 * var(--p)); }
.ekr .bilgi th, .ekr .bilgi td { text-align:left; vertical-align:top; padding:calc(2 * var(--p)) calc(3 * var(--p)); border-bottom:var(--p) solid #2a3146; }
.ekr .bilgi th { color:var(--gold); text-transform:uppercase; font-weight:400; }
.ekr .bilgi pre { white-space:pre-wrap; font:400 var(--y-16)/.875 var(--font-etiket); background:#100e16; padding:calc(4 * var(--p)); color:var(--soluk); }
.ekr .bilgi .bos { color:var(--soluk); }
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

export function krediler(b: EkranBaglami): void {
  stil();
  const { kart } = ekranKok(b.ustYazi, "Krediler");
  geriDugmesi(kart, "ayarlar");
  const ic = el("div", "bilgi", kart);
  ic.dataset["sayfa"] = "krediler";
  el("h2", "", ic, "Krediler");
  el("p", "alt", ic, "Devran: özgün dönen topaç dövüşü. Kâr amaçsız. Kullandığımız her şeyin sahibi ve lisansı:");
  const k = kredileriOku();
  if (!k.bolumler.length) el("p", "bos", ic, "Varlık kredisi kaydı henüz yok.");
  for (const bl of k.bolumler) {
    el("h3", "", ic, bl.baslik);
    const t = el("table", "", ic);
    const tr = el("tr", "", el("thead", "", t));
    for (const h of bl.basliklar) el("th", "", tr, h);
    const govde = el("tbody", "", t);
    for (const s of bl.satirlar) { const r = el("tr", "", govde); for (const h of s.hucreler) el("td", "", r, h); }
  }
  const eksik = k.kaynaklar.filter((x) => x.eksikAtif);
  if (eksik.length) {
    el("h3", "", ic, "Atıfı bekleyen kaynaklar");
    const ul = el("ul", "", ic);
    for (const x of eksik) el("li", "", ul, `${x.kaynak || x.dosya} (${x.lisans || "lisans ?"})`);
  }
  el("h3", "", ic, "Yazılım");
  const t = el("table", "", ic);
  const tr = el("tr", "", el("thead", "", t));
  for (const h of ["Yazılım", "Lisans", "Telif", "Kaynak"]) el("th", "", tr, h);
  const govde = el("tbody", "", t);
  for (const y of k.yazilim) { const r = el("tr", "", govde); for (const h of [y.ad, y.lisans, y.telif, y.url]) el("td", "", r, h); }
  el("h3", "", ic, "Yazı tipleri");
  el("p", "", ic, k.yaziTipi);
  if (k.bildirim) { el("h3", "", ic, "MIT bildirimi"); el("pre", "", ic, k.bildirim); }
  el("p", "yt", ic, `Manifest kaynağı: ${k.kaynaklar.length} · atıfı eksik: ${eksik.length}`);
}
