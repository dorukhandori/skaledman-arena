import { ayarlariOku } from "../oyun/Ayarlar.ts";
import { el, kalin } from "../ekranlar/arayuz.ts";
import { type Ipucu, IPUCLARI } from "./ipuclari.ts";
import { kayitOku, kayitYaz, oturumOkuPergel, oturumYazPergel } from "./depo.ts";
import {
  GEZINTI_BEKLEME_MS, ILK_BELIRME_MS, type AtolyeDurumu,
  gezintiSec, kapatmaSonucu, otomatikIzin, otomatikSec, sorSec,
} from "./secim.ts";

// Pergel: Atölye'nin gözlüklü bilgici (docs/ux/bilgic-pergel.md). Modal değil, odağı çalmaz, sol altta durur;
// balon role=status/aria-live=polite. UI yalnız okur: oyun durumu üretmez, ipucu seçimi secim.ts'de saf.

const PORTRE_BOYUT = "4.2rem";
const KUCULT_MS = 12_000;
const GEZINTI_EN_COK = 3;

const STIL = `
.pergel { position:fixed; left:.9rem; bottom:.9rem; z-index:20; display:flex; align-items:flex-end; gap:.6rem; max-width:calc(100% - 1.8rem); pointer-events:none; }
.pergel > * { pointer-events:auto; }
.pergel .p-rozet { position:relative; width:${PORTRE_BOYUT}; height:${PORTRE_BOYUT}; flex:none; padding:0; background:#10222a; border:3px solid #050d10; border-radius:50%;
  box-shadow:0 0 0 2px #24414b; cursor:pointer; overflow:hidden; display:flex; align-items:center; justify-content:center; transition:transform .25s ease, opacity .25s ease; }
.pergel .p-rozet img { width:100%; height:100%; object-fit:contain; image-rendering:pixelated; }
.pergel .p-rozet .p-yedek { font:900 1.6rem/1 "Trebuchet MS",system-ui; color:#f4cf47; letter-spacing:-2px; }
.pergel .p-rozet .p-yedek::before { content:"o-o"; }
.pergel .p-nokta { position:absolute; right:.15rem; top:.15rem; width:.8rem; height:.8rem; border-radius:50%; background:#f4cf47; border:2px solid #050d10; display:none; }
.pergel.yeni .p-nokta { display:block; }
.pergel .p-balon { position:relative; width:min(21rem, calc(100vw - 7.5rem)); padding:.7rem .85rem .6rem; background:#fff6c8; color:#2a2104; border:3px solid #050d10;
  border-radius:12px 12px 12px 3px; box-shadow:0 4px 14px rgba(0,0,0,.55); font:600 .92rem/1.4 system-ui,sans-serif; opacity:0; transform:translateY(.6rem) scale(.96);
  visibility:hidden; transition:opacity .25s ease, transform .25s ease, visibility 0s linear .25s; }
.pergel.acik .p-balon { opacity:1; transform:none; visibility:visible; transition:opacity .25s ease, transform .25s ease; }
.pergel .p-metin { margin:0 0 .5rem; }
.pergel .p-metin b { color:#8a2a00; }
.pergel.kucuk .p-metin { margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer; }
.pergel.kucuk .p-dugmeler { display:none; }
.pergel .p-dugmeler { display:flex; gap:.5rem; justify-content:flex-end; }
.pergel .p-dugmeler button { padding:.3rem .7rem; background:#173039; color:#f3f1e8; border:2px solid #050d10; border-radius:7px; font:800 .82rem system-ui; cursor:pointer; box-shadow:0 2px 0 #050d10; }
.pergel .p-dugmeler button:focus-visible, .pergel .p-rozet:focus-visible { outline:3px solid #fff; outline-offset:2px; box-shadow:0 0 0 6px #050d10; }
.pergel.sessiz-gizli { display:none; }
@media (prefers-reduced-motion: reduce) {
  .pergel .p-balon, .pergel.acik .p-balon { transform:none; transition:opacity .25s ease, visibility 0s; }
  .pergel .p-rozet { transition:none; }
}
@media (max-width:600px) {
  .pergel { left:0; right:0; bottom:0; max-width:none; padding:.5rem; background:rgba(7,10,28,.92); border-top:2px solid #24414b; }
  .pergel:not(.acik) { background:none; border:0; right:auto; padding:.5rem; }
  .pergel .p-balon { width:auto; flex:1 1 auto; }
  .pergel:not(.acik) .p-balon { display:none; }
}
`;

export interface PergelGirdi {
  /** Pergel'in ekleneceği ekran kökü (ekran değişince birlikte gider) */
  kok: HTMLElement;
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
  const durum: AtolyeDurumu = { ...g.durum, ziyaret: kayit.ziyaret + 1 };
  kayitYaz(g.oyuncuId, { goruldu: [...goruldu], ziyaret: durum.ziyaret });
  let oturum = oturumOkuPergel();
  let buZiyaretOtomatik = 0;
  let gezintiSayisi = 0;
  let acilis = 0;
  let sonId: string | undefined;
  const zamanlar = new Set<number>();

  const st = el("style"); st.textContent = STIL; g.kok.appendChild(st);
  const kap = el("div", "pergel", g.kok);
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
  const baska = el("button", "", dg, "Başka?");
  const tamam = el("button", "", dg, "Tamam");
  baska.type = tamam.type = "button";
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

  // Rozet yanındaki nokta: gösterilmemiş otomatik ipucu bekliyorsa (ör. "Yalnız sorunca" ya da susturulmuş)
  const beklemede = () => otomatikSec(IPUCLARI, durum, goruldu) !== null;
  const notuYenile = () => { if (!acikMi()) kap.classList.toggle("yeni", beklemede()); };
  notuYenile();

  rozet.addEventListener("click", () => { if (acikMi() && !kap.classList.contains("kucuk")) kapat(); else sor(); });
  tamam.addEventListener("click", () => { kapat(); });
  baska.addEventListener("click", () => { sor(); });
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
    if (!otomatikIzin({ mod, susturuldu: oturum.susturuldu, simdi: simdi(), sonOtomatik: oturum.sonOtomatik, buZiyaretOtomatik })) return;
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
