import { PROTOKOL_SURUMU } from "../../ag/protokol.ts";
import { KATALOG_OZETI } from "../../ag/katalog.ts";
import { type Ben, apiPost, git } from "../hesap.ts";

// Menü ekranları ortak DOM kalıbı (D5, ux § 3.2, § 6.3-6.4): kart düzeni, rem birimleri (metin ölçeği %100/125/150
// kökte), odak halkası 3 px (beyaz + siyah dış), üst gezinti (Atölye · Market · Başarımlar · Oyna · Ayarlar), ◄ geri
// (Esc / Backspace → Atölye), Enter = ana eylem, sürüm "yenile" bandı, bakım katmanı, dar ekran uyarısı.

export const ARAYUZ_STIL = `
.ekr { position:absolute; inset:0; overflow:auto; pointer-events:auto; z-index:5; color:#f3f1e8; font:400 1rem/1.45 system-ui,sans-serif;
  background:radial-gradient(circle at 50% 35%, #10222a, #070a1c 75%); display:flex; align-items:flex-start; justify-content:center; padding:2.2rem 1rem; }
.ekr .kart { position:relative; width:min(52rem, 100%); padding:1.4rem 1.6rem; background:#0c191d; border:3px solid #050d10; border-radius:14px;
  box-shadow:0 0 0 2px #24414b, 0 10px 30px rgba(0,0,0,.6); }
.ekr .kart.dar { width:min(28rem, 100%); }
.ekr h2 { margin:0 0 .3rem; font:900 1.75rem/1.1 "Trebuchet MS",system-ui; letter-spacing:2px; }
.ekr h3 { margin:0 0 .4rem; font:800 1.05rem/1.2 system-ui; }
.ekr p { margin:.3rem 0; }
.ekr .alt { color:#a3b2b6; font-size:.85rem; margin-bottom:.9rem; }
.ekr label { display:block; font-size:.85rem; color:#c9d3d6; margin:.7rem 0 .25rem; font-weight:700; }
.ekr .ipucu { font-size:.78rem; color:#a3b2b6; margin-top:.2rem; }
.ekr input[type=text], .ekr input[type=password] { width:100%; padding:.55rem .7rem; background:#050d10; color:#f3f1e8; border:2px solid #24414b;
  border-radius:8px; font:600 1rem/1.2 system-ui; }
.ekr input[aria-invalid=true] { border-color:#ff9a7a; }
.ekr button { padding:.6rem .9rem; background:#173039; color:#f3f1e8; border:2px solid #050d10; border-radius:8px; font:800 .95rem/1.2 system-ui;
  cursor:pointer; box-shadow:0 3px 0 #050d10; }
.ekr button.bir { background:#f4cf47; color:#2a2104; }
.ekr button:disabled { opacity:.45; cursor:default; }
.ekr button:focus-visible, .ekr input:focus-visible, .ekr [tabindex]:focus-visible, .ekr a:focus-visible {
  outline:3px solid #fff; outline-offset:2px; box-shadow:0 0 0 6px #050d10; }
.ekr .hata { min-height:1.2rem; color:#ff9a7a; font-weight:700; font-size:.88rem; margin-top:.5rem; }
.ekr .satir { display:flex; gap:.7rem; align-items:center; flex-wrap:wrap; margin-top:1rem; }
.ekr .geri { position:absolute; left:.8rem; top:.8rem; padding:.3rem .6rem; font-size:.85rem; box-shadow:none; }
.ekr .geri + h2 { margin-left:3.2rem; }
.ekr a { color:#f4cf47; }
.ekr .yt { color:#6f8085; font-size:.75rem; }
.ust-bant { position:fixed; left:50%; top:46px; transform:translateX(-50%); z-index:50; padding:.5rem .9rem; background:#2a2104; color:#fff6c8;
  border:2px solid #f4cf47; border-radius:10px; font:800 .95rem/1.3 system-ui; display:flex; gap:.7rem; align-items:center; pointer-events:auto; }
.ust-bant button { padding:.3rem .7rem; background:#f4cf47; color:#2a2104; border:2px solid #050d10; border-radius:6px; font:800 .85rem system-ui; cursor:pointer; }
.tam-katman { position:fixed; inset:0; z-index:60; display:flex; align-items:center; justify-content:center; padding:1rem;
  background:rgba(5,9,12,.94); color:#f3f1e8; font:400 1rem/1.45 system-ui; pointer-events:auto; }
.tam-katman .kart { width:min(30rem,100%); padding:1.4rem 1.6rem; background:#0c191d; border:3px solid #050d10; border-radius:14px; box-shadow:0 0 0 2px #24414b; text-align:center; }
.tam-katman h2 { margin:0 0 .5rem; font:900 1.5rem/1.2 system-ui; }
.tam-katman button { margin-top:1rem; padding:.55rem 1rem; background:#173039; color:#f3f1e8; border:2px solid #050d10; border-radius:8px; font:800 .95rem system-ui; cursor:pointer; }
.tam-katman button:focus-visible { outline:3px solid #fff; outline-offset:2px; }
body > header nav { display:flex; gap:4px; align-items:center; }
body > header nav a[aria-disabled=true] { opacity:.5; }
body > header .kim { margin-left:auto; display:flex; gap:10px; align-items:center; color:#a3b2b6; font:700 13px/1 system-ui; }
body > header .kim button { padding:4px 10px; background:transparent; color:#a3b2b6; border:1px solid #24414b; border-radius:6px; font:700 12px system-ui; cursor:pointer; }
`;

let stilEklendi = false;
export function stilEkle(): void {
  if (stilEklendi) return;
  stilEklendi = true;
  const s = document.createElement("style");
  s.textContent = ARAYUZ_STIL;
  document.head.appendChild(s);
}

export function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif = "", ust?: HTMLElement, metin = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin) e.textContent = metin;
  ust?.appendChild(e);
  return e;
}

/** `**kalın**` → <b> (yalnız güvenilir sabit metin). */
export function kalin(metin: string): string {
  return metin.replace(/[<>&]/g, "").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}

/** Ekran kökü (#ustYazi içinde). */
export function ekranKok(ust: HTMLElement, etiket: string): { kok: HTMLDivElement; kart: HTMLDivElement } {
  stilEkle();
  const kok = el("div", "ekr", ust);
  kok.setAttribute("role", "main");
  kok.setAttribute("aria-label", etiket);
  const kart = el("div", "kart", kok);
  return { kok, kart };
}

/** ◄ geri → Atölye; Esc / Backspace (yazı alanında değilken) aynı (ux § 3.2). */
export function geriDugmesi(kart: HTMLElement, hedef = "atolye"): HTMLButtonElement {
  const g = el("button", "geri", kart, "◄ Geri");
  g.setAttribute("aria-label", "Geri: Atölye");
  g.addEventListener("click", () => git(hedef));
  window.addEventListener("keydown", (e) => {
    const yazi = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
    if (e.key === "Escape" || (e.key === "Backspace" && !yazi)) { e.preventDefault(); git(hedef); }
  });
  return g;
}

/** Enter = ana eylem (odak bir düğmedeyse o düğme kendi işini yapar). */
export function anaEylem(d: HTMLButtonElement): void {
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement) return;
    e.preventDefault();
    if (!d.disabled) d.click();
  });
}

// ---- üst gezinti ----
const GEZINTI: [string, string][] = [["atolye", "Atölye"], ["market", "Market"], ["basarimlar", "Başarımlar"], ["lobi", "Oyna"], ["ayarlar", "Ayarlar"]];

export function ustGezinti(ekran: string, ben: Ben | null): void {
  stilEkle();
  const nav = document.getElementById("menu");
  const rozet = document.querySelector("body > header h1 span");
  if (rozet) rozet.textContent = "D6";
  if (!nav) return;
  nav.innerHTML = "";
  nav.setAttribute("aria-label", "Ana gezinti");
  const girisli = ben?.girisli === true;
  if (ekran === "mac" || ekran === "topac-lab") {
    for (const [k, ad] of [["atolye", "Atölye"], ["mac", "Maç (bota karşı)"], ["topac-lab", "Topaç Lab"]] as const) {
      const a = el("a", "", nav, ad);
      a.href = `?ekran=${k}`;
      if (k === ekran) a.setAttribute("aria-current", "page");
    }
    return;
  }
  if (girisli && ben.oyuncu.profilTamam && ben.cekirdekler.length) {
    for (const [k, ad] of GEZINTI) {
      const a = el("a", "", nav, ad);
      a.href = `?ekran=${k}`;
      if (k === ekran) a.setAttribute("aria-current", "page");
    }
  }
  const kim = el("div", "kim", document.querySelector("body > header") as HTMLElement);
  if (girisli) {
    el("span", "", kim, ben.oyuncu.ad);
    const c = el("button", "", kim, "Çıkış");
    c.dataset["eylem"] = "cikis";
    c.addEventListener("click", () => { void apiPost("/api/cikis").finally(() => git("karsilama")); });
  } else if (ekran !== "karsilama") {
    const a = el("a", "", kim, "Giriş yap");
    a.href = "?ekran=giris";
  }
}

// ---- hata / uyarı katmanları (nile B-22, B-25) ----
export function surumDenetle(ben: Ben): boolean {
  if (ben.protokol === PROTOKOL_SURUMU && ben.katalog === KATALOG_OZETI) return true;
  surumBandi();
  return false;
}

export function surumBandi(): void {
  stilEkle();
  if (document.querySelector(".ust-bant")) return;
  const b = el("div", "ust-bant", document.body);
  b.setAttribute("role", "alert");
  el("span", "", b, "Oyun güncellendi. Sayfayı yenile.");
  const d = el("button", "", b, "Yenile");
  d.addEventListener("click", () => location.reload());
}

/** Sunucuya ulaşılamıyor: ux § 7 bakım metni, 30 sn'de bir otomatik deneme. */
export function bakimKatmani(yeniden: () => void): void {
  stilEkle();
  const k = el("div", "tam-katman", document.body);
  k.setAttribute("role", "alertdialog");
  k.setAttribute("aria-label", "Sunucu bakımda");
  const kart = el("div", "kart", k);
  el("h2", "", kart, "Bakım");
  el("p", "", kart, "Devran kısa bir bakımda. Birkaç dakika sonra tekrar dene.");
  const sayac = el("p", "yt", kart, "");
  const d = el("button", "", kart, "Tekrar dene");
  d.addEventListener("click", () => { k.remove(); yeniden(); });
  let n = 30;
  const t = window.setInterval(() => {
    n--;
    sayac.textContent = `${n} sn sonra kendiliğinden denenecek.`;
    if (n <= 0) { window.clearInterval(t); k.remove(); yeniden(); }
  }, 1000);
  sayac.textContent = `${n} sn sonra kendiliğinden denenecek.`;
  queueMicrotask(() => d.focus());
}

/** Dar ekran / dokunmatik (B-25): "Bu oyun klavye ve fare ister". Kapatılabilir; bu oturumda bir kez. */
export function darEkranDenetle(): void {
  let gec = false;
  try { gec = sessionStorage.getItem("devran.darGec") === "1"; } catch { /* kapalı */ }
  const dar = window.innerWidth < 1280 || window.innerHeight < 720;
  const dokunmatik = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  if (gec || !(dar || dokunmatik)) return;
  stilEkle();
  const k = el("div", "tam-katman", document.body);
  k.dataset["dar"] = "1";
  k.setAttribute("role", "alertdialog");
  k.setAttribute("aria-label", "Ekran uyarısı");
  const kart = el("div", "kart", k);
  el("h2", "", kart, "Bu oyun klavye ve fare ister");
  el("p", "", kart, dokunmatik ? "Dokunmatik ekranda oynanmaz. Masaüstü tarayıcıda aç." : `Pencere en az 1280×720 olmalı (şu an ${window.innerWidth}×${window.innerHeight}). Pencereyi büyüt ya da masaüstünde aç.`);
  el("p", "yt", kart, "Telefonda maçları seyirci olarak izlemek ileride gelecek.");
  const d = el("button", "", kart, "Yine de devam et");
  d.addEventListener("click", () => { try { sessionStorage.setItem("devran.darGec", "1"); } catch { /* kapalı */ } k.remove(); });
  queueMicrotask(() => d.focus());
}

// ---- metin ölçeği (ux § 6.3) ----
export const METIN_OLCEGI = "devran.metinOlcegi.v1";
export const OLCEKLER = [1, 1.25, 1.5] as const;

export function metinOlcegiOku(): number {
  let v = 1;
  try { v = Number(localStorage.getItem(METIN_OLCEGI) ?? 1); } catch { /* kapalı */ }
  return (OLCEKLER as readonly number[]).includes(v) ? v : 1;
}

export function metinOlcegiUygula(o = metinOlcegiOku()): void {
  document.documentElement.style.fontSize = `${15 * o}px`;
}
