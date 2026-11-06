import { odaKoduCoz } from "../../ag/protokol.ts";
import type { EkranBaglami } from "../main.ts";
import { BakimHatasi, HESAP_HATA, apiGet, apiPost, git, sonrakiEkran, type Ben } from "../hesap.ts";
import { anaEylem, bakimKatmani, ekranKok, el, geriDugmesi, kalin } from "./arayuz.ts";
import { cekirdekIllustrasyonu } from "./pikselTopac.ts";
import { dokunmatikMetin, dokunmatikMi } from "../mobil/cihaz.ts";

// GU-10 (menü dili v2, maket b-giris / referans 01): sol panelde ışıyan Çekirdek, sağda form paneli; ana düğme
// bronz-turuncu (K-2; referanstaki yeşil değil). MENU-P2: lento plakası ekranın adı (Karşılama'da marka logosu), içerikte
// ikinci başlık yok; ◄ lentoda (Kayıt/Giriş → Karşılama, Profil → Atölye); sol panelde oyunun 3 cümlelik tanıtımı (K-14);
// "Hesabın var mı?" ikincil düğme. Yazı tipleri jetonlardan (H-7).
const KIMLIK_STIL = `
.kml .k-govde { flex-direction:row; justify-content:center; align-items:stretch; gap:calc(12 * var(--p)); padding-top:calc(8 * var(--p)); }
.kml .kml-sol { flex:0 1 calc(200 * var(--p)); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:calc(6 * var(--p)); min-height:0; overflow:hidden; }
.kml .kml-sol canvas { flex:none; }
.kml .kml-tanitim { margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:calc(4 * var(--p)); max-width:calc(172 * var(--p)); }
.kml .kml-tanitim li { margin:0; color:var(--ink); line-height:.875; text-align:center; }
.kml .kml-tanitim li:first-child { color:var(--gold); }
.kml .kart { flex:0 1 calc(260 * var(--p)); width:auto; }
.kml .kart.dar { width:auto; }
.kml .kart > h2:first-of-type { display:flex; justify-content:center; }
.kml .kart > p, .kml .kart > div > p { text-transform:none; line-height:1; }
.kml .kart p b { color:var(--ink); }
.kml .satir .k-dugme.ana { margin-left:0; order:0; }
.kml .satir .ikincil { margin-left:auto; }
.kml input.k-alan { font-family:var(--font-etiket); }
html[data-yazi-buyuk] .kml .kml-sol { display:none; }
`;
let kimlikStil = false;

/** Sol panelin tanıtımı (K-14): oyun ne, nasıl oynanır, nasıl başlanır; her biri tek cümle. */
const TANITIM = [
  "Devran, iki topacın arenada çarpışıp birbirini devirdiği hızlı bir düellodur.",
  "Topacını Çekirdek, Gövde, Disk ve Uç'tan kurar, WASD ile sürersin.",
  "Rakibi çarparak, yetenekle ya da kenardan iterek yen; ilk 3 puanı alan kazanır.",
];

export interface KimlikSecenek {
  /** ◄ hedefi (yoksa ◄ yok) */
  geri?: string | null;
  /** sol panelde tanıtım metni (Karşılama'da sağ panel zaten anlatır: kapalı) */
  tanitim?: boolean;
  /** plaka yerine marka logosu (yalnız Karşılama) */
  logo?: boolean;
}

/** iki panelli kimlik ekranı: sol illüstrasyon (+ tanıtım) + sağ form kartı */
export function kimlikKok(ust: HTMLElement, etiket: string, s: KimlikSecenek = {}): { kart: HTMLDivElement; sol: HTMLDivElement } {
  if (!kimlikStil) { kimlikStil = true; const st = document.createElement("style"); st.textContent = KIMLIK_STIL; document.head.appendChild(st); }
  const { kok, kart, govde } = ekranKok(ust, etiket, { baslik: s.logo ? "Devran" : etiket, logo: !!s.logo, yer: "lacivert", geri: s.geri ?? null });
  kok.classList.add("kml");
  const sol = el("div", "k-panel kml-sol");
  sol.appendChild(cekirdekIllustrasyonu(s.tanitim === false ? 64 : 40));
  if (s.tanitim !== false) {
    const ul = el("ul", "kml-tanitim", sol);
    ul.setAttribute("aria-label", "Devran nedir");
    for (const c of TANITIM) el("li", "", ul, dokunmatikMi() ? dokunmatikMetin(c) : c);
  }
  govde.insertBefore(sol, kart);
  return { kart, sol };
}

// Karşılama, Kayıt, Giriş (D5; sahip kararı 2026-11-04: Kick OAuth en sona, kimlik ad + şifre).
// ux § 4.1 üç cümle (üçüncüsü Kick yerine kayıt), § 7 mikro-kopya; tide O-1 (b): "Antrenmanı dene" misafire açık.

const UC_CUMLE = [
  "**Devran, iki topacın arenada çarpışıp birbirini devirdiği hızlı bir düellodur.**",
  "**Topacını WASD ile sür; rakibi çarparak, yeteneklerle ya da kenardan iterek yen, ilk 3 puanı alan kazanır.**",
  "**Kayıt ol, 60 saniyelik antrenmanla başla.**",
];

/** ◄ ve Esc → Karşılama (oda dönüş eki korunur; yazı alanındayken Backspace geri gitmez). */
function geriBagla(kart: HTMLElement): void {
  const g = geriDugmesi(kart, "karsilama");
  const ek = donusEki();
  if (ek) { const y = g.cloneNode(true) as HTMLButtonElement; g.replaceWith(y); y.addEventListener("click", () => git("karsilama", ek)); }
}

/** Oda bağlantısıyla gelen misafir: giriş sonrası aynı odaya döner. */
function donusEki(): string {
  const q = new URLSearchParams(location.search).get("donus");
  const kod = q ? odaKoduCoz(q) : location.hash.startsWith("#oda=") ? odaKoduCoz(location.hash) : null;
  return kod ? `&donus=${kod}` : "";
}

function girisSonrasi(ben: Ben): void {
  if (!ben.girisli) return;
  const donus = new URLSearchParams(location.search).get("donus");
  const kod = donus ? odaKoduCoz(donus) : null;
  const hedef = sonrakiEkran(ben);
  if (hedef === "atolye" && kod) { location.href = `${location.pathname}?ekran=lobi#oda=${kod}`; return; }
  git(hedef);
}

export function karsilama(b: EkranBaglami): void {
  if (b.ben?.girisli) { girisSonrasi(b.ben); return; }
  const { kart } = kimlikKok(b.ustYazi, "Karşılama", { logo: true, tanitim: false });
  kart.classList.add("dar");
  kart.style.textAlign = "center";
  el("h2", "k-plaka", kart, "Hoş geldin");
  const p = el("div", "", kart);
  p.innerHTML = UC_CUMLE.map((c) => `<p>${kalin(dokunmatikMi() ? dokunmatikMetin(c) : c)}</p>`).join("");
  const mesaj = new URLSearchParams(location.search).get("mesaj");
  if (mesaj === "oda" || location.hash.startsWith("#oda=")) el("p", "hata", kart, "Odaya katılmak için kayıt ol ya da giriş yap.");
  if (mesaj === "cikis") el("p", "alt", kart, "Çıkış yaptın.");
  if (mesaj === "silindi") el("p", "alt", kart, "Hesabın silindi.");
  const s = el("div", "satir", kart);
  s.style.justifyContent = "center";
  const kayit = el("button", "bir", s, "Kayıt ol");
  kayit.dataset["eylem"] = "kayit";
  kayit.addEventListener("click", () => git("kayit", donusEki()));
  const giris = el("button", "", s, "Giriş yap");
  giris.dataset["eylem"] = "giris";
  giris.addEventListener("click", () => git("giris", donusEki()));
  const ant = el("button", "", s, "Antrenmanı dene");
  ant.dataset["eylem"] = "antrenman";
  ant.title = "Misafir: kayıtsız, ilerleme saklanmaz";
  ant.addEventListener("click", () => git("antrenman"));
  el("p", "yt", kart, "Antrenman misafire açık; maç için kayıt gerekir.");
  queueMicrotask(() => kayit.focus());
}

function alan(kart: HTMLElement, etiket: string, tur: "text" | "password", ad: string, ipucu = ""): { girdi: HTMLInputElement; hata: HTMLElement } {
  const id = `a-${ad}`;
  const l = el("label", "", kart, etiket);
  l.htmlFor = id;
  const girdi = el("input", "", kart);
  girdi.type = tur;
  girdi.id = id;
  girdi.name = ad;
  girdi.autocomplete = tur === "password" ? (ad === "sifre" && etiket.startsWith("Şifre") ? "new-password" : "current-password") : "username";
  if (ipucu) { const i = el("div", "ipucu", kart, ipucu); i.id = `${id}-ip`; girdi.setAttribute("aria-describedby", i.id); }
  const hata = el("div", "hata", kart);
  hata.setAttribute("role", "alert");
  hata.style.minHeight = "0";
  return { girdi, hata };
}

function hataYaz(h: HTMLElement, girdi: HTMLInputElement | null, kod: string | null): void {
  h.textContent = kod ? (HESAP_HATA[kod] ?? HESAP_HATA["bicim"]!) : "";
  girdi?.setAttribute("aria-invalid", String(!!kod));
}

async function yenile(): Promise<Ben> {
  return apiGet<Ben>("/api/ben");
}

export function kayit(b: EkranBaglami): void {
  if (b.ben?.girisli) { girisSonrasi(b.ben); return; }
  const { kart } = kimlikKok(b.ustYazi, "Kayıt ol", { geri: "karsilama" });
  kart.classList.add("dar");
  geriBagla(kart);
  el("div", "alt", kart, "Adın arenada görünür. Şifren yalnız sende kalır.");
  const ad = alan(kart, "Oyuncu adı", "text", "ad", "3-16 karakter");
  ad.girdi.maxLength = 16;
  const s1 = alan(kart, "Şifre", "password", "sifre", "En az 8 karakter");
  s1.girdi.autocomplete = "new-password";
  const s2 = alan(kart, "Şifre tekrar", "password", "sifreTekrar");
  s2.girdi.autocomplete = "new-password";
  const genel = el("div", "hata", kart);
  genel.setAttribute("role", "alert");
  const satir = el("div", "satir", kart);
  const d = el("button", "bir", satir, "Kayıt ol");
  d.dataset["eylem"] = "kayit-ol";
  // K-14: web bağlantısı yerine ikincil düğme
  const g = el("a", "k-dugme kucuk ikincil", satir, "Hesabın var mı? Giriş yap");
  g.href = `?ekran=giris${donusEki()}`;
  g.dataset["eylem"] = "girise-git";
  // ad uygunluğu: alandan çıkınca (sunucu kuralı: biçim, filtre, tekillik)
  ad.girdi.addEventListener("blur", async () => {
    const v = ad.girdi.value.trim();
    if (!v) return;
    try {
      const r = await apiGet<{ uygun: boolean; hata?: string }>(`/api/ad-uygun?ad=${encodeURIComponent(v)}`);
      hataYaz(ad.hata, ad.girdi, r.uygun ? null : (r.hata ?? "uygunsuz"));
    } catch { /* gönderimde yine denetlenir */ }
  });
  const gonder = async () => {
    for (const x of [ad, s1, s2]) hataYaz(x.hata, x.girdi, null);
    genel.textContent = "";
    if (s1.girdi.value.length < 8) { hataYaz(s1.hata, s1.girdi, "sifreKisa"); s1.girdi.focus(); return; }
    if (s1.girdi.value !== s2.girdi.value) { hataYaz(s2.hata, s2.girdi, "eslesmiyor"); s2.girdi.focus(); return; }
    d.disabled = true;
    try {
      const r = await apiPost("/api/kayit", { ad: ad.girdi.value, sifre: s1.girdi.value, sifreTekrar: s2.girdi.value });
      if (r.durum === 201) { girisSonrasi(await yenile()); return; }
      const h = r.veri.hata ?? "bicim";
      if (h === "eslesmiyor") hataYaz(s2.hata, s2.girdi, h);
      else if (h === "sifreKisa" || h === "sifreUzun") hataYaz(s1.hata, s1.girdi, h);
      else if (["uzunluk", "karakter", "uygunsuz", "alinmis"].includes(h)) { hataYaz(ad.hata, ad.girdi, h); ad.girdi.focus(); }
      else genel.textContent = HESAP_HATA[h] ?? HESAP_HATA["bicim"]!;
    } catch (e) {
      if (e instanceof BakimHatasi) bakimKatmani(() => location.reload());
    } finally {
      d.disabled = false;
    }
  };
  d.addEventListener("click", () => void gonder());
  anaEylem(d);
  queueMicrotask(() => ad.girdi.focus());
}

export function giris(b: EkranBaglami): void {
  if (b.ben?.girisli) { girisSonrasi(b.ben); return; }
  const { kart } = kimlikKok(b.ustYazi, "Giriş yap", { geri: "karsilama" });
  kart.classList.add("dar");
  geriBagla(kart);
  el("div", "alt", kart, "Kayıtlı adın ve şifrenle gir.");
  const ad = alan(kart, "Oyuncu adı", "text", "ad");
  ad.girdi.maxLength = 16;
  const s = alan(kart, "Şifre", "password", "sifre");
  s.girdi.autocomplete = "current-password";
  const genel = el("div", "hata", kart);
  genel.setAttribute("role", "alert");
  const satir = el("div", "satir", kart);
  const d = el("button", "bir", satir, "Giriş yap");
  d.dataset["eylem"] = "giris-yap";
  const k = el("a", "k-dugme kucuk ikincil", satir, "Hesabın yok mu? Kayıt ol");
  k.href = `?ekran=kayit${donusEki()}`;
  k.dataset["eylem"] = "kayda-git";
  const gonder = async () => {
    genel.textContent = "";
    d.disabled = true;
    try {
      const r = await apiPost("/api/giris", { ad: ad.girdi.value, sifre: s.girdi.value });
      if (r.durum === 200) { girisSonrasi(await yenile()); return; }
      genel.textContent = HESAP_HATA[r.veri.hata ?? "yanlis"] ?? HESAP_HATA["yanlis"]!;
      s.girdi.value = "";
      s.girdi.focus();
    } catch (e) {
      if (e instanceof BakimHatasi) bakimKatmani(() => location.reload());
    } finally {
      d.disabled = false;
    }
  };
  d.addEventListener("click", () => void gonder());
  anaEylem(d);
  queueMicrotask(() => ad.girdi.focus());
}
