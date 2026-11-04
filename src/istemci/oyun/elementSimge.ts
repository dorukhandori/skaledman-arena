import type { ElementAdi } from "../../paylasilan/kurallar/ayar.ts";
import { ELEMENT_RENK, renkCss } from "./renkler.ts";

// Element silüetleri (ux § 6.1, onaylı görsel 01): Kor alev · Kasırga hortum · Şimşek yıldırım · Girdap sarmal ·
// Kaya küme · Don kristal. Renk tek kanal değil: şekil gri tonda da ayrılır. Basit SVG (16×16 viewBox).

const YOL: Record<ElementAdi, { d: string; dolgu: boolean }> = {
  kor: { d: "M8 1C10.5 4 13 6.2 12.4 10.2 12 13 10 15 8 15 5.4 15 3.6 13 3.8 10.4 4 8.4 5.4 7.4 5.9 5.8 7 7.4 7.1 8.6 8 9.2 8.6 7 9.2 4.4 8 1Z", dolgu: true },
  kasirga: { d: "M1.5 3h13M3 6.2h10M4.6 9.2h6.8M6 12h4M7.2 14.6h1.6", dolgu: false },
  simsek: { d: "M9.6 1 3 9.2h4.6L6 15l7-8.6H8.4L10.4 1Z", dolgu: true },
  girdap: { d: "M8 8.2c.9 0 1.3-.8.9-1.4-.6-.9-2.3-.6-2.6.8-.4 1.8 1.4 3.2 3.2 2.7 2.4-.6 3-3.6 1.5-5.4C9 2.6 5.2 3 3.8 5.6c-1.7 3.2.6 7.4 4.3 7.7 2.8.2 5.2-1.5 6.1-3.9", dolgu: false },
  kaya: { d: "M1.5 13.5 3.6 8.2 7 7.2 9 10.4 8.2 13.5ZM7.6 13.5 9.4 6 12.4 4.6 14.6 9 13.6 13.5ZM4.6 7.4 6 3.4 8.6 3 9.4 5.6 7 6.8Z", dolgu: true },
  don: { d: "M8 1v14M2 4.6l12 6.8M14 4.6 2 11.4M8 1 6.6 2.6M8 1l1.4 1.6M8 15l-1.4-1.6M8 15l1.4-1.6", dolgu: false },
};

/** Element simgesi SVG metni. `boyut` px; `soluk` elenmiş/karartılmış; `capraz` çarpı (elenen). */
export function elementSvg(e: ElementAdi, boyut = 14, secenek: { soluk?: boolean; capraz?: boolean } = {}): string {
  const y = YOL[e];
  const renk = renkCss(ELEMENT_RENK[e].orta);
  const koyu = renkCss(ELEMENT_RENK[e].koyu);
  const ciz = y.dolgu
    ? `<path d="${y.d}" fill="${renk}" stroke="#050d10" stroke-width="1" stroke-linejoin="round"/>`
    : `<path d="${y.d}" fill="none" stroke="#050d10" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="${y.d}" fill="none" stroke="${renk}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  const capraz = secenek.capraz ? `<path d="M2 2 14 14M14 2 2 14" stroke="#050d10" stroke-width="3.6" stroke-linecap="round"/><path d="M2 2 14 14M14 2 2 14" stroke="#f3f1e8" stroke-width="1.6" stroke-linecap="round"/>` : "";
  return `<svg class="els" viewBox="0 0 16 16" width="${boyut}" height="${boyut}" aria-label="${ELEMENT_RENK[e].ad}" role="img" style="${secenek.soluk ? "opacity:.35;filter:grayscale(1)" : ""}"><title>${ELEMENT_RENK[e].ad}</title><rect x=".5" y=".5" width="15" height="15" rx="3" fill="${koyu}" fill-opacity=".35"/>${ciz}${capraz}</svg>`;
}
