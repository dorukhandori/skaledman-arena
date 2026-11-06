import { ayarlariOku, bitenMacSayisi } from "../oyun/Ayarlar.ts";
import { el, kalin } from "../ekranlar/arayuz.ts";
import { type Ipucu, IPUCLARI } from "./ipuclari.ts";
import { dokunmatikMi } from "../mobil/cihaz.ts";
import { kayitOku, kayitYaz, oturumOkuPergel, oturumYazPergel } from "./depo.ts";
import {
  GEZINTI_BEKLEME_MS, ILK_BELIRME_MS, type AtolyeDurumu,
  gezintiSec, kapatmaSonucu, otomatikIzin, otomatikSec, sorSec,
} from "./secim.ts";

// Pergel: Atölye'nin gözlüklü bilgici (docs/ux/bilgic-pergel.md). Modal değil, odağı çalmaz, sol altta durur;
// balon role=status/aria-live=polite. UI yalnız okur: oyun durumu üretmez, ipucu seçimi secim.ts'de saf.

const KUCULT_MS = 12_000;
const GEZINTI_EN_COK = 3;

// Kuşak Taşı menü dili (src/istemci/stil/jetonlar.css + bilesenler.css): taş-bronz panel, pixel yazı (m5x7 / Jersey 10),
// gradyan/bulanık gölge/yuvarlak köşe yok; ölçü mantıksal px × var(--p). Balonda tek düğme (TAMAM): ekranın ana eylemi
// OYNA kalır (sadelik S-2); "başka ipucu" rozet tıklaması ya da H ile.
const STIL = `
.pergel { position:fixed; left:calc(8 * var(--p)); bottom:calc(8 * var(--p)); z-index:20; display:flex; align-items:flex-end; gap:calc(4 * var(--p));
  max-width:calc(100% - 16 * var(--p)); pointer-events:none; color:var(--ink); }
.pergel > * { pointer-events:auto; }
.pergel .p-rozet { position:relative; width:calc(32 * var(--p)); height:calc(32 * var(--p)); flex:none; padding:0; cursor:pointer;
  background:var(--panel-0); border:var(--p) solid var(--harc); border-radius:0;
  box-shadow:inset 0 0 0 var(--p) var(--bronz), inset 0 0 0 calc(2 * var(--p)) var(--golge), 0 calc(2 * var(--p)) 0 0 var(--golge);
  overflow:hidden; display:flex; align-items:flex-end; justify-content:center; }
.pergel .p-rozet:hover { box-shadow:inset 0 0 0 var(--p) var(--bronz-isik), inset 0 0 0 calc(2 * var(--p)) var(--golge), 0 calc(2 * var(--p)) 0 0 var(--golge); }
.pergel .p-rozet img { width:calc(28 * var(--p)); height:calc(28 * var(--p)); object-fit:contain; image-rendering:pixelated; }
.pergel .p-rozet .p-yedek { font:400 var(--y-20)/1 var(--font-baslik); color:var(--gold); align-self:center; }
.pergel .p-rozet .p-yedek::before { content:"o-o"; }
.pergel .p-nokta { position:absolute; right:calc(2 * var(--p)); top:calc(2 * var(--p)); width:calc(4 * var(--p)); height:calc(4 * var(--p));
  background:var(--gold); box-shadow:0 0 0 var(--p) var(--golge); display:none; }
.pergel.yeni .p-nokta { display:block; }
.pergel .p-balon { position:relative; width:min(calc(196 * var(--p)), calc(100vw - 56 * var(--p))); padding:calc(4 * var(--p)) calc(6 * var(--p));
  background:var(--panel) var(--k-doku-panel, none) 0 0 / calc(32 * var(--p)) calc(32 * var(--p));
  border:var(--p) solid var(--harc); border-radius:0;
  box-shadow:inset 0 0 0 var(--p) var(--bronz), inset 0 calc(2 * var(--p)) 0 0 #2a3146, 0 calc(2 * var(--p)) 0 0 var(--golge);
  font:400 var(--y-16)/.8 var(--font-etiket); letter-spacing:0; color:var(--ink); visibility:hidden; opacity:0; }
.pergel .p-balon, .pergel .p-balon * { font-family:var(--font-etiket); }
/* balon kuyruğu: rozete bakan 2 basamaklı pixel üçgen (gradyan değil, düz kutular) */
.pergel .p-balon::before, .pergel .p-balon::after { content:""; position:absolute; left:calc(-3 * var(--p)); background:var(--bronz); width:calc(3 * var(--p)); }
.pergel .p-balon::before { bottom:calc(6 * var(--p)); height:calc(4 * var(--p)); }
.pergel .p-balon::after { left:calc(-5 * var(--p)); bottom:calc(7 * var(--p)); width:calc(2 * var(--p)); height:calc(2 * var(--p)); }
.pergel.acik .p-balon { visibility:visible; opacity:1; animation:p-gir calc(3 * var(--kare)) steps(3) both; }
@keyframes p-gir { from { transform:translateY(calc(6 * var(--p))); opacity:0; } to { transform:none; opacity:1; } }
.pergel .p-metin { margin:0 0 calc(3 * var(--p)); }
.pergel .p-metin b { color:var(--gold); font-weight:400; }
.pergel.kucuk .p-metin { margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer; }
.pergel.kucuk .p-dugmeler { display:none; }
.pergel .p-dugmeler { display:flex; gap:calc(4 * var(--p)); justify-content:flex-end; align-items:center; }
.pergel .p-dugmeler .p-kisayol { margin-right:auto; }
/* odak: ortak bronz köşe çerçevesi (arayuz.ts, C-1); beyaz halka yok */
.pergel .p-dugme:focus-visible, .pergel .p-rozet:focus-visible { outline:none; }
.pergel.sessiz-gizli { display:none; }
@media (prefers-reduced-motion: reduce) { .pergel.acik .p-balon { animation:none; } }
@media (max-width:600px) {
  .pergel { left:0; right:0; bottom:0; max-width:none; padding:calc(4 * var(--p)); background:var(--tas-1); box-shadow:inset 0 var(--p) 0 0 var(--bronz); }
  .pergel:not(.acik) { background:none; box-shadow:none; right:auto; }
  .pergel .p-balon { width:auto; flex:1 1 auto; }
  .pergel:not(.acik) .p-balon { display:none; }
}
`;

export interface PergelGirdi {
  /** Pergel'in ekleneceği ekran kökü (ekran değişince birlikte gider) */
  kok: HTMLElement;
  /** MOBIL-2: rozetin DOM'da duracağı yer (varsayılan `kok`; telefonda Atölye alt şeridi). Dinleyiciler `kok`ta kalır. */
  yer?: HTMLElement;
  oyuncuId: number;
  /** Ziyaret sayısı hariç durum; Pergel ziyareti kendisi sayar */
  durum: Omit<AtolyeDurumu, "ziyaret">;
}

function simdi(): number { return Date.now(); }

/** Pergel'i kurar; kapalıysa hiçbir şey eklemez. Döndürdüğü işlev dinleyicileri söker. */
export function pergelKur(g: PergelGirdi): () => void {
  const mod = ayarlariOku().pergel;
  if (mod === "kapali") return () => {};
  const kayit = kayitOku(g.oyuncuId);
  const goruldu = new Set(kayit.goruldu);
  const durum: AtolyeDurumu = { bitenMac: bitenMacSayisi(), ...g.durum, ziyaret: kayit.ziyaret + 1 };
  kayitYaz(g.oyuncuId, { goruldu: [...goruldu], ziyaret: durum.ziyaret });
  let oturum = oturumOkuPergel();
  let buZiyaretOtomatik = 0;
  let gezintiSayisi = 0;
  let acilis = 0;
  let sonId: string | undefined;
  const zamanlar = new Set<number>();

  const yer = g.yer ?? g.kok;
  const st = el("style"); st.textContent = STIL; yer.appendChild(st);
  const kap = el("div", "pergel", yer);
  const rozet = el("button", "p-rozet", kap);
  rozet.type = "button";
  rozet.setAttribute("aria-label", "Pergel'e sor (H)");
  rozet.title = "Pergel'e sor (H)";
  const img = el("img", "", rozet);
  img.alt = "";
  img.setAttribute("aria-hidden", "true");
  img.addEventListener("error", () => { img.remove(); if (!rozet.querySelector(".p-yedek")) el("span", "p-yedek", rozet).setAttribute("aria-hidden", "true"); });
  el("i", "p-nokta", rozet);
  const balon = el("div", "p-balon", kap);
  balon.setAttribute("role", "status");
  balon.setAttribute("aria-live", "polite");
  balon.setAttribute("aria-atomic", "true");
  const metin = el("p", "p-metin", balon);
  const dg = el("div", "p-dugmeler", balon);
  // MOBIL-1: klavye kısayolu dokunmatikte yok; rozete dokunmak aynı işi görür
  // C-2: kısayol rozeti ortak biçimde (.k-tus + .k-kisayol; ENTER / ESC ile aynı)
  const ks = el("span", "p-kisayol k-kisayol", dg);
  if (dokunmatikMi()) ks.textContent = "Rozete dokun: başka ipucu";
  else { el("span", "k-tus", ks, "H"); ks.appendChild(document.createTextNode("başka ipucu")); }
  const tamam = el("button", "k-dugme kucuk p-dugme", dg, "Tamam");
  tamam.type = "button";
  img.src = "/bilgic/anlatiyor.png";

  const zamanla = (f: () => void, ms: number): number => {
    const t = window.setTimeout(() => { zamanlar.delete(t); f(); }, ms);
    zamanlar.add(t);
    return t;
  };
  let kucultT = 0;
  const acikMi = () => kap.classList.contains("acik");

  function goster(x: Ipucu, otomatik: boolean): void {
    sonId = x.id;
    img.src = `/bilgic/${x.ifade}.png`;
    metin.innerHTML = kalin(x.metin);
    metin.removeAttribute("title");
    kap.classList.remove("kucuk", "yeni");
    kap.classList.add("acik");
    acilis = simdi();
    goruldu.add(x.id);
    kayitYaz(g.oyuncuId, { goruldu: [...goruldu], ziyaret: durum.ziyaret });
    if (otomatik) {
      buZiyaretOtomatik += 1;
      oturum = { ...oturum, sonOtomatik: simdi() };
      oturumYazPergel(oturum);
    }
    window.clearTimeout(kucultT);
    kucultT = zamanla(() => {
      if (!acikMi()) return;
      kap.classList.add("kucuk");
      metin.title = metin.textContent ?? "";
      oturum = { ...oturum, okunmadan: 0 }; // 12 s açık kaldı: okunmuş sayılır
      oturumYazPergel(oturum);
    }, KUCULT_MS);
  }

  function kapat(): void {
    if (!acikMi()) return;
    window.clearTimeout(kucultT);
    const bitti = kap.classList.contains("kucuk") ? { okunmadan: 0, sus: false } : kapatmaSonucu(oturum.okunmadan, simdi() - acilis);
    kap.classList.remove("acik", "kucuk");
    img.src = "/bilgic/anlatiyor.png";
    oturum = { ...oturum, okunmadan: bitti.okunmadan, susturuldu: oturum.susturuldu || bitti.sus };
    oturumYazPergel(oturum);
  }

  function sor(): void {
    const x = sorSec(IPUCLARI, durum, goruldu, Math.random, acikMi() ? sonId : undefined);
    if (x) goster(x, false);
  }

  // Rozet yanındaki nokta: gösterilmemiş otomatik ipucu bekliyorsa (ör. azalan sıklık ya da susturulmuş)
  const beklemede = () => otomatikSec(IPUCLARI, durum, goruldu) !== null;
  const notuYenile = () => { if (!acikMi()) kap.classList.toggle("yeni", beklemede()); };
  notuYenile();

  rozet.addEventListener("click", () => { if (acikMi() && !kap.classList.contains("kucuk")) kapat(); else sor(); });
  tamam.addEventListener("click", () => { kapat(); });
  metin.addEventListener("click", () => { if (kap.classList.contains("kucuk")) { kap.classList.remove("kucuk"); } });

  const tus = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && acikMi()) { kapat(); e.stopPropagation(); return; }
    if ((e.key === "h" || e.key === "H") && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      sor();
    }
  };
  document.addEventListener("keydown", tus, true);

  // Dolaşırken: öğenin üstünde 1,2 s durma (fare ya da klavye odağı)
  let gezintiT = 0;
  const hedefBul = (n: EventTarget | null): HTMLElement | null => (n instanceof Element ? n.closest<HTMLElement>("[data-pergel-hedef]") : null);
  const durdu = (e: Event): void => {
    const h = hedefBul(e.target);
    window.clearTimeout(gezintiT);
    if (!h || mod !== "acik" || oturum.susturuldu || acikMi() || gezintiSayisi >= GEZINTI_EN_COK) return;
    const ad = h.dataset["pergelHedef"] as NonNullable<Ipucu["hedef"]>;
    const d: AtolyeDurumu = { ...durum, oduncVar: durum.oduncVar || ad === "odunc-yuva" };
    gezintiT = zamanla(() => {
      if (acikMi()) return;
      const x = gezintiSec(IPUCLARI, ad, d, goruldu);
      if (x) { gezintiSayisi += 1; goster(x, false); }
    }, GEZINTI_BEKLEME_MS);
  };
  const ayrildi = (e: Event): void => { if (hedefBul(e.target)) window.clearTimeout(gezintiT); };
  g.kok.addEventListener("pointerover", durdu);
  g.kok.addEventListener("focusin", durdu);
  g.kok.addEventListener("pointerout", ayrildi);
  g.kok.addEventListener("focusout", ayrildi);

  // Kendiliğinden belirme: ekran açılışından 1,5 s sonra
  zamanla(() => {
    if (!otomatikIzin({ mod, susturuldu: oturum.susturuldu, simdi: simdi(), sonOtomatik: oturum.sonOtomatik, buZiyaretOtomatik, bitenMac: durum.bitenMac })) return;
    if (acikMi()) return;
    const x = otomatikSec(IPUCLARI, durum, goruldu);
    if (x) goster(x, true);
  }, ILK_BELIRME_MS);

  return () => {
    document.removeEventListener("keydown", tus, true);
    for (const t of zamanlar) window.clearTimeout(t);
    kap.remove(); st.remove();
  };
}
