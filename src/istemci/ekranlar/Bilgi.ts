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
.ekr .bilgi h3 { margin:1.1rem 0 .35rem; }
.ekr .bilgi ul { margin:.2rem 0 .4rem 1.2rem; padding:0; }
.ekr .bilgi code { font:600 .85rem ui-monospace,monospace; background:#050d10; padding:0 .25rem; border-radius:4px; }
.ekr .bilgi table { width:100%; border-collapse:collapse; font-size:.82rem; margin:.3rem 0 .8rem; }
.ekr .bilgi th, .ekr .bilgi td { text-align:left; vertical-align:top; padding:.3rem .4rem; border-bottom:1px solid #24414b; }
.ekr .bilgi th { color:#c9d3d6; font-weight:800; }
.ekr .bilgi pre { white-space:pre-wrap; font:500 .72rem/1.35 ui-monospace,monospace; background:#050d10; padding:.6rem; border-radius:8px; color:#c9d3d6; }
.ekr .bilgi .bos { color:#a3b2b6; font-style:italic; }
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
