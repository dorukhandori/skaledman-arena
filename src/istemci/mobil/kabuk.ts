import { bagimsizMi, dokunmatikMi, iosMu } from "./cihaz.ts";

// MOBIL-1 telefon kabuğu (main.ts bir kez kurar): html[data-dokunmatik], dikey mod örtüsü ("Cihazı yatay çevir"),
// tarayıcı jestlerinin engellenmesi (çift dokunma / iki parmak yakınlaştırma, aşağı çekip yenileme, uzun basma menüsü;
// CSS tarafı stil/dokunmatik.css), uzun basınca `title` ipucu (fare üstü ipuçlarının dokunmatik karşılığı), tam ekran
// teklifi (Fullscreen API; iOS'ta "Ana Ekrana Ekle" ipucu), ekran uyku kilidi (Wake Lock; yalnız maçta).

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif: string, ust: HTMLElement, metin = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  e.className = sinif;
  if (metin) e.textContent = metin;
  ust.appendChild(e);
  return e;
}

let kuruldu = false;

/** Tam ekran destekleniyor mu (iOS Safari iPhone'da yok). */
export function tamEkranVar(): boolean {
  const d = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  return typeof d.requestFullscreen === "function" || typeof d.webkitRequestFullscreen === "function";
}

/** Tam ekranı aç/kapa; yatay kilit dener (Android Chrome; desteklenmezse sessiz). */
export function tamEkranDegistir(): void {
  const d = document as Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
  const k = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  try {
    if (d.fullscreenElement ?? d.webkitFullscreenElement) { void (d.exitFullscreen?.() ?? d.webkitExitFullscreen?.()); return; }
    const p = k.requestFullscreen ? k.requestFullscreen({ navigationUI: "hide" }) : (k.webkitRequestFullscreen?.(), undefined);
    void Promise.resolve(p).then(() => {
      const yon = (screen as Screen & { orientation?: { lock?: (y: string) => Promise<void> } }).orientation;
      void yon?.lock?.("landscape").catch(() => {});
    }).catch(() => {});
  } catch { /* izin yok */ }
}

/** Kabuğu kur (dokunmatik değilse yalnız `false` döner). `macEkrani`: maç/seyirci ekranında tam ekran bandı gösterilmez. */
export function mobilKabukKur(macEkrani = false): boolean {
  if (kuruldu) return dokunmatikMi();
  kuruldu = true;
  if (!dokunmatikMi()) return false;
  const kok = document.documentElement;
  kok.dataset["dokunmatik"] = "1";
  if (iosMu()) kok.dataset["ios"] = "1";
  // dikey mod örtüsü (CSS yalnız portrait'te gösterir)
  const ortu = el("div", "dikey-ortu", document.body);
  ortu.setAttribute("role", "alert");
  ortu.innerHTML = `<svg viewBox="0 0 32 32" width="64" height="64" aria-hidden="true"><rect x="10" y="4" width="12" height="22" rx="2" fill="none" stroke="#fbf2c3" stroke-width="2"/><path d="M6 24a12 12 0 0 0 18 4" fill="none" stroke="#e8762f" stroke-width="2"/><path d="M24 25l1 4-4 0" fill="none" stroke="#e8762f" stroke-width="2"/></svg><b>CİHAZI YATAY ÇEVİR</b><span>Devran yatay ekranda oynanır.</span>`;
  // iOS Safari: iki parmak yakınlaştırma jesti (touch-action'a uymayan eski sürümler)
  for (const ad of ["gesturestart", "gesturechange"]) document.addEventListener(ad, (e) => e.preventDefault(), { passive: false });
  // çift dokunma yakınlaştırması: `touch-action: manipulation` (dokunmatik.css) kapatır; ikinci dokunuşu yutan JS
  // yaması kullanılmaz (hızlı art arda düğme dokunuşlarını bozar)
  // uzun basma: tarayıcı menüsü yerine `title` ipucu
  document.addEventListener("contextmenu", (e) => { if (!(e.target as HTMLElement | null)?.closest("input, textarea")) e.preventDefault(); });
  uzunBasmaIpucu();
  if (!macEkrani && !bagimsizMi()) tamEkranTeklifi();
  return true;
}

/** Uzun basınca (450 ms) en yakın `title` / `aria-label` sahibinin metni baloncukta; ardından gelen tık yutulur. */
function uzunBasmaIpucu(): void {
  const balon = el("div", "dk-ipucu", document.body);
  balon.setAttribute("role", "status");
  let zaman = 0;
  let yut = false;
  let bas: { x: number; y: number } | null = null;
  const kapat = () => { window.clearTimeout(zaman); bas = null; };
  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch") return;
    const h = (e.target as HTMLElement | null)?.closest<HTMLElement>("[title]");
    if (!h || h.closest(".dk")) return;
    const metin = h.getAttribute("title") ?? "";
    if (!metin) return;
    bas = { x: e.clientX, y: e.clientY };
    window.clearTimeout(zaman);
    zaman = window.setTimeout(() => {
      balon.textContent = metin;
      const r = h.getBoundingClientRect();
      balon.classList.add("acik");
      const bw = balon.offsetWidth;
      balon.style.left = `${Math.max(8, Math.min(window.innerWidth - bw - 8, r.left + r.width / 2 - bw / 2))}px`;
      balon.style.top = `${r.top > 70 ? r.top - balon.offsetHeight - 8 : r.bottom + 8}px`;
      yut = true;
      window.setTimeout(() => balon.classList.remove("acik"), 2400);
    }, 450);
  }, { capture: true });
  document.addEventListener("pointermove", (e) => { if (bas && Math.hypot(e.clientX - bas.x, e.clientY - bas.y) > 10) kapat(); }, { capture: true });
  document.addEventListener("pointerup", kapat, { capture: true });
  document.addEventListener("pointercancel", kapat, { capture: true });
  document.addEventListener("click", (e) => { if (yut) { yut = false; e.preventDefault(); e.stopPropagation(); } }, { capture: true });
}

/** Oturumda bir kez: alt ortada tam ekran bandı (Android) ya da "Ana Ekrana Ekle" ipucu (iOS). 10 sn sonra kapanır. */
function tamEkranTeklifi(): void {
  let goruldu = false;
  try { goruldu = sessionStorage.getItem("devran.tamEkranTeklif") === "1"; } catch { /* kapalı */ }
  if (goruldu) return;
  try { sessionStorage.setItem("devran.tamEkranTeklif", "1"); } catch { /* kapalı */ }
  const bant = el("div", "tam-teklif", document.body);
  bant.setAttribute("role", "status");
  const kapat = () => bant.remove();
  if (tamEkranVar()) {
    el("span", "", bant, "Daha geniş ekran için");
    const d = el("button", "k-dugme kucuk", bant, "TAM EKRAN");
    d.type = "button";
    d.dataset["eylem"] = "tam-ekran";
    d.addEventListener("click", () => { tamEkranDegistir(); kapat(); });
  } else if (iosMu()) {
    el("span", "", bant, "Tam ekran için: Paylaş › Ana Ekrana Ekle");
  } else { bant.remove(); return; }
  const x = el("button", "k-dugme kucuk", bant, "✕");
  x.type = "button";
  x.setAttribute("aria-label", "Kapat");
  x.addEventListener("click", kapat);
  window.setTimeout(kapat, 10000);
}

// ---- ekran uyku kilidi (Wake Lock): yalnız maç sürerken ----
type Kilit = { release(): Promise<void>; released?: boolean };
let kilit: Kilit | null = null;
let kilitIstek = false;
async function kilitAl(): Promise<void> {
  const wl = (navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<Kilit> } }).wakeLock;
  if (!wl || document.hidden) return;
  try { kilit = await wl.request("screen"); } catch { kilit = null; }
}
const gorunurluk = () => { if (kilitIstek && !document.hidden && (!kilit || kilit.released)) void kilitAl(); };

/** Maç başında `true`, çıkışta `false`. Sekme gizlenince tarayıcı kilidi bırakır; dönüşte yeniden alınır. */
export function uyanikTut(acik: boolean): void {
  if (typeof navigator === "undefined") return;
  if (acik === kilitIstek) return;
  kilitIstek = acik;
  if (acik) { document.addEventListener("visibilitychange", gorunurluk); void kilitAl(); }
  else {
    document.removeEventListener("visibilitychange", gorunurluk);
    const k = kilit;
    kilit = null;
    void k?.release().catch(() => {});
  }
}

/** Debug / test: uyku kilidi durumu. */
export function uyanikDurumu(): { istek: boolean; kilit: boolean } { return { istek: kilitIstek, kilit: !!kilit && !kilit.released }; }
