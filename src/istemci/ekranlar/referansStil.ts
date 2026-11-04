import type { ElementAdi, KokenAdi } from "../../paylasilan/kurallar/ayar.ts";
import { ELEMENT_RENK, KOKEN_RENK, renkCss } from "../oyun/renkler.ts";

// D7 referans paneli (docs/art/tasarim-dili.md § 2.5 hedef tokenları, § 4.3 panel kararı; görseller 04 / 05 / 09):
// lacivert zemin, basamaklı (pahlı) köşe, 2 px bej dış + 1 px koyu iç çizgi, bronz/turuncu vurgu, ahşap tabela başlık,
// sol üstte kırmızı kare ◄ geri, BÜYÜK HARF başlık. Pixel font ve pixel ikon seti henüz yok (Görsel Uyum Geçişi):
// ikonlar burada SVG yer tutucu (parça türü silüeti + element/köken rengi). Market, Başarımlar ve Sonuç ortak kullanır.

export const REF_STIL = `
:root { --r-bg:#0f1020; --r-panel:#1b2131; --r-panel2:#292d39; --r-edge:#a99e92; --r-ic:#07080f; --r-accent:#e8762f; --r-bronze:#c08e52;
  --r-gold:#fcd35a; --r-ink:#fbf2c3; --r-soluk:#9aa0b2; --r-back:#9a3d38; --r-ahsap:#6b4226; --r-ahsap2:#8a5a34; --r-yesil:#7fe3a0; }
.rf { position:absolute; inset:0; overflow:auto; pointer-events:auto; z-index:5; color:var(--r-ink); font:500 .95rem/1.35 "Trebuchet MS",system-ui,sans-serif;
  background:radial-gradient(ellipse at 50% 30%, #1a1f36 0%, #0f1020 60%, #090a14 100%); }
#ustYazi > .rf { pointer-events:auto; }
.rf .pah { clip-path:polygon(6px 0,calc(100% - 6px) 0,100% 6px,100% calc(100% - 6px),calc(100% - 6px) 100%,6px 100%,0 calc(100% - 6px),0 6px); }
.rf .panel { position:relative; background:var(--r-panel); box-shadow:inset 0 0 0 2px var(--r-edge), inset 0 0 0 3px var(--r-ic), inset 0 0 0 5px #252b40; }
.rf .ustbant { display:grid; grid-template-columns:3.2rem 1fr auto; align-items:center; gap:.8rem; margin:0 0 .5rem; padding:.35rem .6rem; }
.rf .ustbant h2 { margin:0; text-align:center; font:900 1.7rem/1 "Trebuchet MS",system-ui; letter-spacing:3px; text-transform:uppercase; color:#fff;
  text-shadow:0 2px 0 #000; }
.rf .geriK { width:2.8rem; height:2.4rem; display:flex; align-items:center; justify-content:center; background:var(--r-back); color:var(--r-ink);
  border:none; box-shadow:inset 0 0 0 2px #d8b9a0, inset 0 0 0 3px #3a1210; cursor:pointer; font:900 1.1rem/1 system-ui; }
.rf .cuzdan { display:flex; align-items:center; gap:.5rem; padding:.35rem .8rem; min-width:9rem; justify-content:flex-end; }
.rf .cuzdan b { display:block; color:var(--r-gold); font:900 .72rem/1 system-ui; letter-spacing:2px; text-align:right; }
.rf .cuzdan span { display:block; font:900 1.35rem/1.05 ui-monospace,monospace; color:#fff; text-align:right; font-variant-numeric:tabular-nums; }
.rf button { font-family:inherit; }
.rf .dg { padding:.55rem 1rem; background:var(--r-panel2); color:var(--r-ink); border:none; box-shadow:inset 0 0 0 2px var(--r-bronze), inset 0 0 0 3px var(--r-ic);
  font:900 .95rem/1.2 "Trebuchet MS",system-ui; letter-spacing:1px; text-transform:uppercase; cursor:pointer; }
.rf .dg.bir { background:linear-gradient(#a8572a,#7c3d1c); box-shadow:inset 0 0 0 2px var(--r-gold), inset 0 0 0 3px var(--r-ic); color:#fff; }
.rf .dg:disabled { opacity:.45; cursor:default; }
.rf button:focus-visible, .rf a:focus-visible, .rf [tabindex]:focus-visible { outline:3px solid #fff; outline-offset:2px; box-shadow:0 0 0 6px #050d10; }
.rf .tabela { position:relative; display:inline-block; padding:.35rem 1.3rem; background:linear-gradient(var(--r-ahsap2),var(--r-ahsap));
  box-shadow:inset 0 0 0 2px #3a2312, inset 0 0 0 4px #a8784a; font:900 1.2rem/1 "Trebuchet MS",system-ui; letter-spacing:2px; color:#fff7e0;
  text-transform:uppercase; text-shadow:0 2px 0 #2a170a; }
.rf .rozet { display:inline-flex; align-items:center; gap:.25rem; padding:.12rem .4rem; font:900 .68rem/1.1 system-ui; letter-spacing:.5px; text-transform:uppercase; }
.rf .rozet.altin { background:#3b2c0c; color:var(--r-gold); box-shadow:inset 0 0 0 2px #c9a33b; }
.rf .rozet.kilit { background:#20232f; color:var(--r-ink); box-shadow:inset 0 0 0 2px #59607a; }
.rf .rozet.sende { background:#173524; color:var(--r-yesil); box-shadow:inset 0 0 0 2px #3f8f60; }
.rf .rozet.gizli { background:#0c0d14; color:#c8c8d0; box-shadow:inset 0 0 0 2px #2c2f3c; }
.rf .cubukc { height:.42rem; background:#11131d; box-shadow:inset 0 0 0 1px #000; overflow:hidden; }
.rf .cubukc i { display:block; height:100%; background:linear-gradient(90deg,#f2622f,var(--r-accent)); }
.rf .yt { color:#727a90; font-size:.72rem; }
.rf .modal { position:fixed; inset:0; z-index:40; display:flex; align-items:center; justify-content:center; background:rgba(4,5,12,.7); }
.rf .modal .kutu { width:min(30rem, calc(100% - 2rem)); padding:1.1rem 1.3rem; background:#2a1814;
  box-shadow:inset 0 0 0 2px var(--r-accent), inset 0 0 0 3px var(--r-ic), inset 0 0 0 5px #4a2a20; }
.rf .modal h3 { margin:0 0 .6rem; text-align:center; font:900 1.35rem/1.1 "Trebuchet MS",system-ui; letter-spacing:2px; color:#ffb070; text-transform:uppercase; }
`;

let eklendi = false;
export function refStilEkle(): void {
  if (eklendi) return;
  eklendi = true;
  const s = document.createElement("style");
  s.textContent = REF_STIL;
  document.head.appendChild(s);
}

export const COIN_SVG = (boyut = 28): string =>
  `<svg viewBox="0 0 16 16" width="${boyut}" height="${boyut}" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="#c9952a" stroke="#4a3208" stroke-width="1"/><circle cx="8" cy="8" r="5" fill="#f7c948" stroke="#a87a14" stroke-width="1"/><path d="M8 4.6v6.8M6.4 6h2.8a1 1 0 0 1 0 2H7a1 1 0 0 0 0 2h2.6" fill="none" stroke="#8a5d0a" stroke-width="1.1"/></svg>`;

export const KILIT_SVG = (boyut = 26): string =>
  `<svg viewBox="0 0 16 16" width="${boyut}" height="${boyut}" aria-hidden="true"><path d="M4.6 7V5.2a3.4 3.4 0 0 1 6.8 0V7" fill="none" stroke="#3a2a10" stroke-width="2.8"/><path d="M4.6 7V5.2a3.4 3.4 0 0 1 6.8 0V7" fill="none" stroke="#c9a55a" stroke-width="1.5"/><rect x="2.8" y="6.6" width="10.4" height="8" fill="#e0b64e" stroke="#3a2a10" stroke-width="1"/><rect x="7.2" y="9.2" width="1.6" height="2.8" fill="#5a3f10"/></svg>`;

/** Para yığını (sonuç ekranı, görsel 09). */
export const YIGIN_SVG = (boyut = 90): string => {
  const p = (x: number, y: number) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="2.6" fill="#f7c948" stroke="#6b4a0c" stroke-width=".8"/><path d="M${x - 7} ${y}v2.2a7 2.6 0 0 0 14 0V${y}" fill="#c9952a" stroke="#6b4a0c" stroke-width=".8"/>`;
  let s = "";
  for (let k = 0; k < 4; k++) s += p(12, 30 - k * 3.2);
  for (let k = 0; k < 6; k++) s += p(24, 32 - k * 3.2);
  for (let k = 0; k < 3; k++) s += p(36, 32 - k * 3.2);
  return `<svg viewBox="0 0 48 38" width="${boyut}" height="${Math.round(boyut * 0.8)}" aria-hidden="true">${s}<circle cx="27" cy="31" r="6" fill="#f7c948" stroke="#6b4a0c" stroke-width=".9"/><circle cx="27" cy="31" r="4" fill="none" stroke="#a87a14" stroke-width=".8"/></svg>`;
};

const METAL: Record<string, [string, string]> = {
  baslangic: ["#9ea6b4", "#5b6272"], standart: ["#b7c4d6", "#5d6c84"], nadir: ["#8fc3ff", "#2f5f9a"], hizip: ["#e0a2ff", "#6a3a8a"], karanlik: ["#8a5cb8", "#2a1340"],
};

/**
 * Parça ikonu (yer tutucu SVG, B-14 şekil listesi gelene kadar): Çekirdek parlayan küre (köken ışığı + element halkası),
 * Gövde kanatlı halka (element boyası), Disk yassı halka (katman metali), Uç koni (katman metali). Gizli: siyah silüet.
 */
export function parcaIkonu(tur: string, element: string | null | undefined, koken: string | null | undefined, katman: string | undefined, boyut = 56, gizli = false): string {
  const el = element && element in ELEMENT_RENK ? ELEMENT_RENK[element as ElementAdi] : null;
  const orta = el ? renkCss(el.orta) : "#9ea6b4";
  const koyu = el ? renkCss(el.koyu) : "#4a5060";
  const acik = el ? renkCss(el.acik) : "#dfe4ee";
  const [m1, m2] = METAL[katman ?? "baslangic"] ?? METAL["baslangic"]!;
  const gz = gizli ? ` style="filter:brightness(0)"` : "";
  let govde = "";
  if (tur === "cekirdek") {
    const k = koken && koken in KOKEN_RENK ? KOKEN_RENK[koken as KokenAdi] : KOKEN_RENK.goktasi;
    govde = `<ellipse cx="16" cy="27" rx="9" ry="2.4" fill="#000" opacity=".35"/><path d="M8 18 16 27 24 18Z" fill="${koyu}" stroke="#090a12" stroke-width="1"/>
      <circle cx="16" cy="14" r="9" fill="${koyu}" stroke="#090a12" stroke-width="1.2"/><circle cx="16" cy="14" r="6.4" fill="${renkCss(k.ikinci)}"/>
      <circle cx="16" cy="14" r="4" fill="${renkCss(k.isik)}"/><circle cx="14.2" cy="12" r="1.4" fill="#fff" opacity=".9"/>
      <circle cx="16" cy="14" r="8.2" fill="none" stroke="${orta}" stroke-width="1.6" stroke-dasharray="3 2"/>`;
  } else if (tur === "govde") {
    govde = `<ellipse cx="16" cy="26" rx="12" ry="3" fill="#000" opacity=".35"/>
      <path d="M3 15 7 9 12 11 16 6 20 11 25 9 29 15 25 21 20 19 16 24 12 19 7 21Z" fill="${orta}" stroke="#090a12" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M7 15 11 12 16 10 21 12 25 15 21 18 16 20 11 18Z" fill="${koyu}"/><circle cx="16" cy="15" r="3.4" fill="${acik}" stroke="#090a12" stroke-width="1"/>`;
  } else if (tur === "disk") {
    govde = `<ellipse cx="16" cy="24" rx="13" ry="3.2" fill="#000" opacity=".35"/><ellipse cx="16" cy="18" rx="13" ry="6" fill="${m2}" stroke="#090a12" stroke-width="1.2"/>
      <ellipse cx="16" cy="15.6" rx="13" ry="6" fill="${m1}" stroke="#090a12" stroke-width="1.2"/><ellipse cx="16" cy="15.6" rx="5" ry="2.3" fill="${m2}" stroke="#090a12" stroke-width="1"/>
      <path d="M5 14.2q11 -6 22 0" fill="none" stroke="#fff" stroke-width="1" opacity=".55"/>`;
  } else {
    govde = `<ellipse cx="16" cy="28" rx="5" ry="1.6" fill="#000" opacity=".35"/><ellipse cx="16" cy="8" rx="10" ry="3.6" fill="${m1}" stroke="#090a12" stroke-width="1.2"/>
      <path d="M6 8 16 27 26 8Z" fill="${m2}" stroke="#090a12" stroke-width="1.2" stroke-linejoin="round"/><path d="M10 9.5 16 22 13 9.8Z" fill="#fff" opacity=".35"/>
      <ellipse cx="16" cy="8" rx="10" ry="3.6" fill="${m1}" stroke="#090a12" stroke-width="1.2"/>`;
  }
  return `<svg viewBox="0 0 32 32" width="${boyut}" height="${boyut}" aria-hidden="true"${gz}>${govde}</svg>`;
}
