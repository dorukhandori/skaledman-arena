import type { ElementAdi, KokenAdi } from "../../paylasilan/kurallar/ayar.ts";
import { ELEMENT_RENK, KOKEN_RENK, renkCss } from "../oyun/renkler.ts";

// D7 referans paneli → GU-01 menü dili v2 "Kuşak Taşı" (docs/art/menu-tasarim-arastirma.md § 5, § 6.5): eski sınıflar
// (.rf .panel, .dg, .dg.bir, .tabela, .rozet, .cubukc, .modal) aynı jetonlarla yeni dile eşlenir (Market, Başarımlar, Sonuç).
// Dokular `--k-*` değişkenlerinden (stil/bilesenler.css). Gradyan / gölge / parlama yok.

export const REF_STIL = `
.rf { --r-gold:var(--gold); --r-accent:var(--turuncu); --r-ink:var(--ink); --r-soluk:var(--soluk); --r-ic:var(--harc); --r-edge:var(--cerceve-isik); --r-yesil:var(--yesil); --r-ahsap:#6b4226; }
.rf { position:absolute; inset:0; overflow:auto; pointer-events:auto; z-index:5; color:var(--ink); font:400 var(--y-16)/.875 var(--font-etiket); }
#ustYazi > .rf { pointer-events:auto; }
.rf .pah { clip-path:none; }
.rf .panel { position:relative; border:calc(5 * var(--p)) solid transparent; border-image:var(--k-tas-cerceve) 5 fill / calc(5 * var(--p)) / 0 round; }
.rf button { font-family:inherit; }
.rf .dg { --ks: inset 0 0 0 var(--p) var(--bronz), inset 0 calc(2 * var(--p)) 0 0 #3a4258; display:inline-flex; align-items:center; justify-content:center; min-height:calc(20 * var(--p)); padding:calc(3 * var(--p)) calc(10 * var(--p)); cursor:pointer;
  background:var(--panel-2) var(--k-doku-normal) 0 0 / calc(32 * var(--p)); color:var(--ink); border:var(--p) solid var(--harc); border-radius:0;
  font:400 var(--y-20)/1 var(--font-baslik); letter-spacing:var(--yp); text-transform:uppercase; box-shadow:var(--ks), 0 calc(2 * var(--p)) 0 0 var(--golge), var(--odak-g, 0 0 0 0 transparent); }
.rf .dg.bir { --ks: inset 0 0 0 var(--p) var(--gold), inset 0 calc(-5 * var(--p)) 0 0 var(--ana-alt); background:var(--ana) var(--k-doku-ana) 0 0 / calc(32 * var(--p)); color:var(--ana-yazi); border-color:var(--ana-kenar); text-shadow:var(--p) var(--p) 0 var(--ana-alt); padding-bottom:calc(6 * var(--p)); }
.rf .dg:active:not(:disabled) { transform:translateY(calc(2 * var(--p))); box-shadow:var(--ks); }
.rf .dg:disabled { --ks: inset 0 0 0 var(--p) var(--cerceve-0), inset 0 0 0 0 transparent; color:var(--kapali-yazi); text-shadow:none; background:var(--tas-2) var(--k-doku-kapali) 0 0 / calc(32 * var(--p)); cursor:default; }
.rf button:focus-visible, .rf a:focus-visible, .rf [tabindex]:focus-visible { outline:calc(2 * var(--p)) solid #fff; outline-offset:var(--p); --odak-g: 0 0 0 calc(4 * var(--p)) var(--golge); }
.rf .tabela { position:relative; display:inline-flex; align-items:center; height:calc(20 * var(--p)); padding:0 calc(14 * var(--p)); color:var(--ink); text-transform:uppercase;
  font:400 var(--y-20)/1 var(--font-baslik); letter-spacing:var(--yp); text-shadow:var(--p) var(--p) 0 #2a170a;
  background:#6b4226 var(--k-ahsap) 0 0 / calc(64 * var(--p)) calc(16 * var(--p)); box-shadow:inset 0 0 0 var(--p) #2a170a, inset 0 calc(2 * var(--p)) 0 0 #a8784a; }
.rf .rozet { display:inline-flex; align-items:center; justify-content:center; gap:calc(2 * var(--p)); min-height:calc(11 * var(--p)); padding:0 calc(3 * var(--p)); font:400 var(--y-16)/.75 var(--font-etiket); text-transform:uppercase; }
.rf .rozet.altin { background:#3b2c0c; color:var(--gold); box-shadow:inset 0 0 0 var(--p) #c9a33b; }
.rf .rozet.kilit { background:#20232f; color:var(--ink); box-shadow:inset 0 0 0 var(--p) #59607a; }
.rf .rozet.sende { background:#173524; color:var(--yesil); box-shadow:inset 0 0 0 var(--p) #3f8f60; }
.rf .rozet.gizli { background:#0c0d14; color:#c8c8d0; box-shadow:inset 0 0 0 var(--p) #2c2f3c; }
.rf .cubukc { height:calc(5 * var(--p)); background:#0d0f18; box-shadow:inset 0 0 0 var(--p) var(--harc); overflow:hidden; position:relative; }
.rf .cubukc i { display:block; height:100%; background:repeating-linear-gradient(90deg, var(--turuncu) 0 calc(3 * var(--p)), transparent calc(3 * var(--p)) calc(4 * var(--p))); }
.rf .yt { color:#7d7688; }
.rf .modal { position:fixed; inset:0; z-index:40; display:flex; align-items:center; justify-content:center; background:rgba(8,7,12,.78); }
.rf .modal .kutu { width:min(calc(260 * var(--p)), calc(100% - 2 * var(--kenar))); padding:calc(8 * var(--p)) calc(10 * var(--p)); background:#2a1610;
  box-shadow:inset 0 0 0 var(--p) var(--harc), inset 0 0 0 calc(2 * var(--p)) var(--turuncu), inset 0 0 0 calc(3 * var(--p)) var(--harc); }
.rf .modal h3 { margin:0 0 calc(6 * var(--p)); text-align:center; font:400 var(--y-20)/1 var(--font-baslik); letter-spacing:var(--yp); color:#ffb070; text-transform:uppercase; }
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
