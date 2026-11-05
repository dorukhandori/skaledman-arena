import { PROTOKOL_SURUMU } from "../../ag/protokol.ts";
import { KATALOG_OZETI } from "../../ag/katalog.ts";
import { type Ben, apiPost, git } from "../hesap.ts";
import { dokunmatikMi, olcekHesapla as mobilOlcek } from "../mobil/cihaz.ts";

// Menü ekranları ortak DOM kalıbı (D5, ux § 3.2, § 6.3-6.4) · GU-01 menü dili v2 "Kuşak Taşı" (sahip onayı 2026-11-05;
// docs/art/menu-tasarim-arastirma.md § 5, § 6.5). Tek stil kaynağı: src/istemci/stil/{jetonlar,bilesenler,ekranlar}.css
// (index.html bağlar). Ekran kökü `.ekr.k-zemin` = taş duvar yeri + üst lento (◄ · başlık plakası · Altın yuvası) + gövde;
// kart `.kart.k-panel` taş panel. Eski işaretleme (button, button.bir, input, .geri) `kSiniflandir` ile bileşen sınıflarına
// eşlenir (seçiciler ve data-* korunur). Ölçek: tam sayı `--o` (480×270 mantıksal ızgara), metin ölçeği `--yo`.
// Web gezinti çubuğu menülerde yok (KM-4): Atölye ana ekran, alt ekranlarda sol üstte ◄; Esc / Backspace → geri.

/** Eski satır içi stil bloğu (geriye uyum): bileşen kuralları artık CSS dosyalarında. */
export const ARAYUZ_STIL = "";

/** Bilinen son `/api/ben` (Altın yuvası ve lento için; main → ustGezinti verir). */
let sonBen: Ben | null = null;

let stilEklendi = false;
export function stilEkle(): void {
  if (stilEklendi) return;
  stilEklendi = true;
  olcekUygula();
  window.addEventListener("resize", () => olcekUygula());
}

/**
 * Tam sayı UI ölçeği: floor(min(W/640, H/360)), en az 2 → mantıksal alan her zaman ≥ 640×360 (1280×720 ×2, 1920×1080 ×3,
 * 2560×1440 ×4). İkinci tur kararı (GU-A § 6): maket ızgarası 480×270 iken 1080p'de ×4 yoğun ekranlarda (Atölye) sayfa
 * kaymasına ve kesilen metne yol açıyordu; 640×360 her iki çözünürlükte aynı yerleşimi verir. Yazı ölçeği metin ölçeğiyle
 * tam sayıya yukarı yuvarlanır.
 */
export function olcekHesapla(w: number, h: number, metin = 1, dokunmatik = false, dpr = 1): { o: number; yo: number } {
  const { o, yo } = mobilOlcek(w, h, metin, dokunmatik, dpr);
  return { o, yo };
}
/** Telefon/dokunmatik ölçek kuralı (yeniden dışa aktarım; birim testi buradan da erişir). */
export { mobilOlcek };

export function olcekUygula(metin = metinOlcegiOku()): void {
  // MOBIL-1: dokunmatikte o = 1 (telefon yatay), yazı ölçeği cihaz pikseline yuvarlı ×1,5 (mobil/cihaz.ts)
  const dokun = dokunmatikMi();
  const { o, yo } = mobilOlcek(window.innerWidth, window.innerHeight, metin, dokun, window.devicePixelRatio || 1);
  const r = document.documentElement;
  r.style.setProperty("--o", String(o));
  r.style.setProperty("--yo", String(yo));
  // telefon (o = 1): mantıksal alan görünüm kadar geniş (≥ 640×360) olduğu için çok sütunlu yerleşim kalır; tek sütuna
  // kırılma yalnız kullanıcı metin ölçeğini büyüttüyse (masaüstüyle aynı kural)
  const telefon = dokun && o === 1;
  if (telefon) r.dataset["telefon"] = "1"; else delete r.dataset["telefon"];
  if (metin > 1) r.dataset["yaziBuyuk"] = String(metin); else delete r.dataset["yaziBuyuk"];
}

/**
 * Eski işaretlemeyi bileşen sınıflarına eşler (kök altında; sonradan eklenenler için gözlemci).
 * `k-` sınıfı ya da `data-k="yok"` taşıyan öğeye dokunmaz.
 */
export function kSiniflandir(kok: HTMLElement): void {
  const isle = (e: Element) => {
    if (!(e instanceof HTMLElement) || e.dataset["k"] === "yok" || [...e.classList].some((c) => c.startsWith("k-"))) return;
    if (e instanceof HTMLButtonElement) {
      if (e.classList.contains("geri") || e.classList.contains("geriK")) {
        e.classList.add("k-geri");
        if (!e.getAttribute("aria-label")) e.setAttribute("aria-label", "Geri");
        // lento varsa ◄ sol üstteki yerine taşınır (ux § 3.2: ◄ yalnız sol üstte)
        const lento = e.closest(".k-zemin")?.querySelector(":scope > .k-lento");
        if (lento && e.parentElement !== lento && !lento.querySelector(".k-geri")) lento.prepend(e);
        return;
      }
      // sınıfsız düğme → ikincil (küçük); "bir" → ana; özel sınıflı düğmeyi ekran kendi stiller
      if (e.classList.contains("bir")) e.classList.add("k-dugme", "ana");
      else if (!e.className.trim()) e.classList.add("k-dugme", "kucuk");
    } else if ((e instanceof HTMLInputElement && ["text", "password", "search", ""].includes(e.type)) || e instanceof HTMLSelectElement || e instanceof HTMLTextAreaElement) {
      e.classList.add("k-alan");
    }
  };
  const tara = (u: Element) => { isle(u); for (const x of u.querySelectorAll("button, input, select, textarea")) isle(x); };
  tara(kok);
  new MutationObserver((ml) => { for (const m of ml) for (const n of m.addedNodes) if (n instanceof Element) tara(n); }).observe(kok, { childList: true, subtree: true });
}

export interface LentoSecenek {
  /** plaka metni (null: plaka yok) */
  baslik?: string | null;
  /** ◄ hedefi (null: ◄ yok; Atölye ana ekran) */
  geri?: string | null;
  /** Altın yuvası (varsayılan: girişliyse göster) */
  cuzdan?: boolean;
  /** Atölye: ad + Ayarlar + Çıkış */
  kim?: boolean;
}

/** Üst lento: ◄ (20×20 @5,3) · bronz plaka (@30,3) · boşluk · Altın yuvası (80×20). */
export function lentoKur(kok: HTMLElement, s: LentoSecenek): HTMLElement {
  const l = el("header", "k-lento", kok);
  if (s.geri) {
    const g = el("button", "k-geri", l);
    g.type = "button";
    g.setAttribute("aria-label", s.geri === "atolye" ? "Geri: Atölye" : "Geri");
    g.dataset["geri"] = s.geri;
    const hedef = s.geri;
    g.addEventListener("click", () => git(hedef));
  }
  if (s.baslik) el("h1", "k-plaka", l, s.baslik);
  el("span", "k-bosluk", l);
  const ben = sonBen?.girisli ? sonBen : null;
  if (s.kim && ben) {
    // metin taş üstünde durmaz (§ 5.1): oyuncu adı "Daha fazla" menüsünün başlığında
    const ay = el("a", "k-dugme kucuk", l, "Ayarlar");
    ay.href = "?ekran=ayarlar";
    const c = el("button", "k-dugme kucuk", l, "Çıkış");
    c.type = "button";
    c.dataset["eylem"] = "cikis";
    c.addEventListener("click", () => { void apiPost("/api/cikis").finally(() => git("karsilama")); });
  }
  if ((s.cuzdan ?? true) && ben && typeof ben.altin === "number") {
    const a = el("a", "k-cuzdan", l, String(ben.altin));
    a.href = "?ekran=market";
    a.dataset["bakiye"] = String(ben.altin);
    a.setAttribute("aria-label", `Bakiye ${ben.altin} Altın: Market`);
  }
  return l;
}

/**
 * Açılır menü (ikinci kat; sadelik S-9): düğme + liste. Liste düğmenin altında, Esc ya da dışarı tıklama kapatır.
 * `ogeler`: [etiket, eylem anahtarı, tıklama] (eylem → data-eylem).
 */
export function acilirMenu(ust: HTMLElement, etiket: string, baslik: string | null, ogeler: [string, string, () => void][], anahtar = "menu"): HTMLElement {
  const kap = el("div", "k-menu", ust);
  const d = el("button", "k-dugme kucuk", kap, etiket);
  d.type = "button";
  d.dataset["eylem"] = anahtar;
  d.setAttribute("aria-haspopup", "true");
  d.setAttribute("aria-expanded", "false");
  const liste = el("div", "k-menu-liste", kap);
  liste.setAttribute("role", "menu");
  liste.hidden = true;
  if (baslik) el("div", "k-menu-baslik k-e16", liste, baslik);
  for (const [ad, eylem, f] of ogeler) {
    const o = el("button", "k-dugme kucuk", liste, ad);
    o.type = "button";
    o.setAttribute("role", "menuitem");
    o.dataset["eylem"] = eylem;
    o.addEventListener("click", () => { kapat(); f(); });
  }
  const kapat = () => { liste.hidden = true; d.setAttribute("aria-expanded", "false"); };
  d.addEventListener("click", (e) => { e.stopPropagation(); liste.hidden = !liste.hidden; d.setAttribute("aria-expanded", String(!liste.hidden)); if (!liste.hidden) liste.querySelector<HTMLButtonElement>("button")?.focus(); });
  document.addEventListener("click", (e) => { if (!kap.contains(e.target as Node)) kapat(); });
  kap.addEventListener("keydown", (e) => { if (e.key === "Escape" && !liste.hidden) { e.stopPropagation(); kapat(); d.focus(); } });
  return kap;
}

/** Geliştirici araçları yalnız `?gelistir=1` ile (sadelik S-10). */
export function gelistirAcik(): boolean {
  return new URLSearchParams(location.search).get("gelistir") === "1";
}

/** Lento Altın yuvasını güncelle (Market satın alma sonrası). */
export function cuzdanYaz(altin: number): void {
  for (const a of document.querySelectorAll<HTMLElement>(".k-cuzdan[data-bakiye]")) { a.textContent = String(altin); a.dataset["bakiye"] = String(altin); a.setAttribute("aria-label", `Bakiye ${altin} Altın: Market`); }
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

/** Ekran kökü (#ustYazi içinde): taş duvar + lento + gövde + taş panel kart. */
export function ekranKok(ust: HTMLElement, etiket: string, s: LentoSecenek & { yer?: "duvar" | "gece" | "tapinak" | "lacivert" } = {}): { kok: HTMLDivElement; kart: HTMLDivElement; lento: HTMLElement; govde: HTMLDivElement } {
  stilEkle();
  const kok = el("div", `ekr k-zemin${s.yer && s.yer !== "duvar" ? ` yer-${s.yer}` : ""}`, ust);
  kok.setAttribute("role", "main");
  kok.setAttribute("aria-label", etiket);
  const lento = lentoKur(kok, { baslik: s.baslik === undefined ? etiket : s.baslik, geri: s.geri ?? null, cuzdan: s.cuzdan, kim: s.kim });
  const govde = el("div", "k-govde", kok);
  const kart = el("div", "kart k-panel", govde);
  kSiniflandir(kok);
  return { kok, kart, lento, govde };
}

/** ◄ geri → Atölye; Esc / Backspace (yazı alanında değilken) aynı (ux § 3.2). */
export function geriDugmesi(kart: HTMLElement, hedef = "atolye"): HTMLButtonElement {
  // lentoda ◄ varsa onu kullan; yoksa lentonun ◄ yerine yeni düğme
  const kok = kart.closest(".ekr");
  const lento = kok?.querySelector(".k-lento");
  const g = el("button", "k-geri");
  g.type = "button";
  if (lento) lento.prepend(g); else kart.prepend(g);
  g.setAttribute("aria-label", hedef === "atolye" ? "Geri: Atölye" : "Geri");
  g.dataset["geri"] = hedef;
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

export function ustGezinti(ekran: string, ben: Ben | null): void {
  stilEkle();
  sonBen = ben;
  const nav = document.getElementById("menu");
  const rozet = document.querySelector("body > header h1 span");
  if (rozet) rozet.textContent = "D8";
  // geliştirici ekranları (maç bota karşı, Topaç Lab) eski üst bandı korur; menüler kabuklu (KM-4)
  if (ekran === "mac" || ekran === "topac-lab") {
    if (!nav) return;
    nav.innerHTML = "";
    nav.setAttribute("aria-label", "Geliştirici gezintisi");
    for (const [k, ad] of [["atolye", "Atölye"], ["mac", "Maç (bota karşı)"], ["topac-lab", "Topaç Lab"]] as const) {
      const a = el("a", "", nav, ad);
      a.href = `?ekran=${k}`;
      if (k === ekran) a.setAttribute("aria-current", "page");
    }
    return;
  }
  document.body.classList.add("kabuk");
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
  const b = el("div", "ust-bant k-panel sik", document.body);
  b.setAttribute("role", "alert");
  el("span", "k-e16 k-buyuk", b, "Oyun güncellendi. Sayfayı yenile.");
  const d = el("button", "k-dugme ana kisa yazi20", b, "Yenile");
  d.addEventListener("click", () => location.reload());
}

/** Sunucuya ulaşılamıyor: ux § 7 bakım metni, 30 sn'de bir otomatik deneme. */
export function bakimKatmani(yeniden: () => void): void {
  stilEkle();
  const k = el("div", "tam-katman", document.body);
  k.setAttribute("role", "alertdialog");
  k.setAttribute("aria-label", "Sunucu bakımda");
  const kart = el("div", "kart k-panel", k);
  el("h2", "k-plaka", kart, "Bakım");
  el("p", "", kart, "Devran kısa bir bakımda. Birkaç dakika sonra tekrar dene.");
  const sayac = el("p", "yt", kart, "");
  const d = el("button", "k-dugme ana kisa", kart, "Tekrar dene");
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
  // MOBIL-1: dokunmatik cihaz artık desteklenir (dokunmatik denetim + telefon ölçeği); uyarı yalnız dar masaüstü penceresinde
  if (dokunmatikMi()) return;
  const dar = window.innerWidth < 1280 || window.innerHeight < 720;
  if (gec || !dar) return;
  stilEkle();
  const k = el("div", "tam-katman", document.body);
  k.dataset["dar"] = "1";
  k.setAttribute("role", "alertdialog");
  k.setAttribute("aria-label", "Ekran uyarısı");
  const kart = el("div", "kart k-panel", k);
  el("h2", "k-plaka", kart, "Klavye ve fare");
  el("p", "k-b20 k-buyuk", kart, "Bu oyun klavye ve fare ister");
  el("p", "", kart, `Pencere en az 1280×720 olmalı (şu an ${window.innerWidth}×${window.innerHeight}). Pencereyi büyüt ya da telefonda yatay aç.`);
  const d = el("button", "k-dugme ana kisa yazi20", kart, "Yine de devam et");
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

/** Ayarlar › Yazı tipi: düz (sistem) yazı tipi (okunurluk; menu-tasarim-arastirma § 6.2). */
export const DUZ_YAZI = "devran.duzYazi.v1";
export function duzYaziOku(): boolean {
  try { return localStorage.getItem(DUZ_YAZI) === "1"; } catch { return false; }
}
export function duzYaziUygula(): void {
  if (duzYaziOku()) document.documentElement.dataset["duzYazi"] = "1"; else delete document.documentElement.dataset["duzYazi"];
}

export function metinOlcegiUygula(o = metinOlcegiOku()): void {
  duzYaziUygula();
  document.documentElement.style.fontSize = `${15 * o}px`;
  olcekUygula(o);
}
