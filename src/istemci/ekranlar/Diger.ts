import type { EkranBaglami } from "../main.ts";
import { apiIstek, apiPost, git, oku, sakla } from "../hesap.ts";
import { AYAR_SECENEKLERI, type OyunAyarlari, ayarlariOku, ayarlariYaz } from "../oyun/Ayarlar.ts";
import { DUZ_YAZI, OLCEKLER, METIN_OLCEGI, duzYaziOku, duzYaziUygula, ekranKok, el, geriDugmesi, kaydirmaIpucu, metinOlcegiOku, metinOlcegiUygula } from "./arayuz.ts";

// Ayarlar (metin ölçeği ux § 6.3 + maç ayarları ux § 6.2); ◄ geri → Atölye. MENU-P2: bölümler Görünüm · Maç · Bilgi ·
// Hesap (Çıkış + Hesabımı sil; S-1, H-13); bağlantılar düğme dilinde (K-13); yazı tipi iki seçenekli radyo. D7: Market ve Başarımlar kendi
// dosyalarında (Market.ts, Basarimlar.ts).

const STIL = `
.ay .kart { width:min(calc(600 * var(--p)), 100%); }
.ay .bolum { margin:0 0 calc(6 * var(--p)); }
.ay .bolum > h3 { margin:0 0 calc(3 * var(--p)); padding-bottom:var(--p); border-bottom:var(--p) solid #2a3146; font:400 var(--y-16)/.75 var(--font-etiket); color:var(--gold); }
.ay .k-govde { padding-top:calc(8 * var(--p)); }
.ay .iki { display:grid; grid-template-columns:1fr 1fr; gap:calc(4 * var(--p)) calc(12 * var(--p)); }
.ay .iki > div > label { margin-top:0; }
.ay .satir { margin-top:0; }
.ay .mac { display:grid; grid-template-columns:1fr calc(80 * var(--p)) 1fr calc(80 * var(--p)); gap:calc(2 * var(--p)) calc(8 * var(--p)); align-items:center; text-transform:uppercase; }
.ay .mac .k-dugme { min-width:0; }
.ay .hesap { padding:calc(5 * var(--p)) calc(6 * var(--p)); background:#140f13; box-shadow:inset 0 0 0 var(--p) #4a2028; }
.ay .hesap > h3 { color:#ffb070; }
.ay .hesap .yt { margin:0 0 calc(4 * var(--p)); }
html[data-yazi-buyuk] .ay .iki { grid-template-columns:1fr; }
html[data-yazi-buyuk] .ay .mac { grid-template-columns:1fr calc(80 * var(--p)); }
`;
const OLCEK_AD: Record<number, string> = { 1: "Normal", 1.25: "Büyük", 1.5: "Çok büyük" };

/** İki ya da üç seçenekli radyo grubu (metin ölçeği, yazı tipi): seçili olan bronz-altın (k-dugme aria-checked). */
function secimSatiri<T>(ust: HTMLElement, etiket: string, secenekler: readonly T[], ad: (v: T) => string, secili: () => T, sec: (v: T) => void, ipucu?: (v: T) => string): HTMLButtonElement[] {
  const s = el("div", "satir", ust);
  s.setAttribute("role", "radiogroup");
  s.setAttribute("aria-label", etiket);
  s.dataset["odakCerceve"] = "secim";
  const dugmeler: HTMLButtonElement[] = [];
  const yaz = () => { for (const [k, d] of dugmeler.entries()) { const on = secenekler[k] === secili(); d.setAttribute("aria-checked", String(on)); d.tabIndex = on ? 0 : -1; } };
  secenekler.forEach((v, k) => {
    const d = el("button", "k-dugme kucuk", s, ad(v));
    d.type = "button";
    d.setAttribute("role", "radio");
    if (ipucu) d.title = ipucu(v);
    d.addEventListener("click", () => { sec(v); yaz(); });
    d.addEventListener("keydown", (e) => {
      const y = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!y) return;
      e.preventDefault();
      const n = (k + y + secenekler.length) % secenekler.length;
      sec(secenekler[n]!); yaz(); dugmeler[n]!.focus();
    });
    dugmeler.push(d);
  });
  yaz();
  return dugmeler;
}

export function ayarlar(b: EkranBaglami): void {
  // S-1: plaka = ekran adı (içerikte ikinci başlık yok); ⚙ bu ekranın kendisinde yok; ◄ Atölye (misafirde Karşılama)
  const { kok, kart } = ekranKok(b.ustYazi, "Ayarlar", { ayar: false });
  kok.classList.add("ay");
  const st = el("style"); st.textContent = STIL; document.head.appendChild(st);
  geriDugmesi(kart, b.ben?.girisli ? "atolye" : "karsilama");
  // Görünüm: metin ölçeği (ux § 6.3) + yazı tipi (pixel / düz; erişilebilirlik, menu-tasarim-arastirma § 6.2)
  const gor = el("section", "bolum", kart);
  el("h3", "", gor, "Görünüm");
  const iki = el("div", "iki", gor);
  const m1 = el("div", "", iki);
  el("label", "", m1, "Metin ölçeği (menüler ve maç HUD'u)");
  const olcekD = secimSatiri(m1, "Metin ölçeği", OLCEKLER, (o) => OLCEK_AD[o] ?? `%${Math.round(o * 100)}`, () => metinOlcegiOku() as (typeof OLCEKLER)[number],
    (o) => { try { localStorage.setItem(METIN_OLCEGI, String(o)); } catch { /* kapalı */ } metinOlcegiUygula(o); }, (o) => `Metin ${Math.round(o * 100)} yüzde`);
  for (const [k, d] of olcekD.entries()) d.dataset["o"] = String(OLCEKLER[k]);
  const m2 = el("div", "", iki);
  el("label", "", m2, "Yazı tipi");
  const ytD = secimSatiri(m2, "Yazı tipi", [false, true] as const, (duz) => (duz ? "Düz (okunaklı)" : "Pixel"), () => duzYaziOku(),
    (duz) => { try { localStorage.setItem(DUZ_YAZI, duz ? "1" : "0"); } catch { /* kapalı */ } duzYaziUygula(); });
  ytD[1]!.dataset["ayar"] = "duz-yazi";
  // Maç ayarları (ux § 6.2): satır başına tek düğme, tıklayınca sıradaki seçenek
  const mc = el("section", "bolum", kart);
  el("h3", "", mc, "Maç");
  const iz = el("div", "mac", mc);
  let a: OyunAyarlari = ayarlariOku();
  for (const anahtar of Object.keys(AYAR_SECENEKLERI) as (keyof OyunAyarlari)[]) {
    const t = AYAR_SECENEKLERI[anahtar];
    el("span", "", iz, t.ad);
    const d = el("button", "k-dugme kucuk", iz);
    d.type = "button";
    d.dataset["ayar"] = anahtar;
    const goster = () => { d.textContent = t.secenekler.find((x) => x.deger === a[anahtar])?.ad ?? "?"; d.setAttribute("aria-label", `${t.ad}: ${d.textContent}. Değiştirmek için tıkla.`); };
    goster();
    d.addEventListener("click", () => {
      const sec = t.secenekler as { deger: string }[];
      const k = sec.findIndex((x) => x.deger === a[anahtar]);
      a = { ...a, [anahtar]: sec[(k + 1) % sec.length]!.deger } as OyunAyarlari;
      ayarlariYaz(a);
      goster();
    });
  }
  // Harita (07 § 9): kazıda isabet halkası; kapalıysa halka gizli, her vuruş isabetsiz (ceza yok, yalnız +1 bonus yok)
  el("span", "", iz, "Kazı: isabet halkası");
  const ih = el("button", "k-dugme kucuk", iz);
  ih.type = "button";
  ih.dataset["isabetHalkasi"] = "1";
  const ihGoster = () => { ih.textContent = oku("devran.isabetHalkasi") === "0" ? "Kapalı" : "Açık"; };
  ihGoster();
  ih.addEventListener("click", () => { sakla("devran.isabetHalkasi", oku("devran.isabetHalkasi") === "0" ? "1" : "0"); ihGoster(); });
  el("p", "yt", mc, "Bu tarayıcıda saklanır. Maçta: Esc › Ayarlar.");
  // Bilgi (K-13: bağlantılar düğme dilinde) + Hesap (H-13: tehlikeli eylem ayrı bölümde; S-1: Çıkış burada)
  const alt = el("div", "iki", kart);
  const bilgi = el("section", "bolum", alt);
  el("h3", "", bilgi, "Bilgi");
  const bs = el("div", "satir", bilgi);
  const gz = el("a", "k-dugme kucuk", bs, "Gizlilik");
  gz.href = "/gizlilik";
  const kr = el("a", "k-dugme kucuk", bs, "Krediler");
  kr.href = "/krediler";
  if (b.ben?.girisli) hesapBolumu(alt, b.ben.oyuncu.ad);
  kaydirmaIpucu(kart);
  queueMicrotask(() => olcekD.find((d) => d.getAttribute("aria-checked") === "true")?.focus());
}

/** Hesap bölümü: oturum (Çıkış) ve kalıcı silme ayrı, kırmızı çerçeveli kutuda. */
function hesapBolumu(ust: HTMLElement, ad: string): void {
  const h = el("section", "bolum hesap", ust);
  h.dataset["hesap"] = "1";
  el("h3", "", h, "Hesap");
  el("p", "yt", h, `Giriş: ${ad}`);
  const s = el("div", "satir", h);
  const c = el("button", "k-dugme kucuk", s, "Çıkış yap");
  c.type = "button";
  c.dataset["eylem"] = "cikis";
  c.addEventListener("click", () => { void apiPost("/api/cikis").finally(() => git("karsilama", "&mesaj=cikis")); });
  hesapSilBolumu(s);
}

/** D8 "Hesabımı sil" (nile B-28): 1) düğme → 2) açıklama + şifre + "Kalıcı olarak sil" (İptal). */
function hesapSilBolumu(kart: HTMLElement): void {
  const kutu = el("div", "", kart);
  kutu.dataset["hesapSil"] = "1";
  const ilk = el("button", "k-dugme kucuk tehlike", kutu, "Hesabımı sil");
  ilk.type = "button";
  ilk.dataset["eylem"] = "hesap-sil";
  ilk.addEventListener("click", () => {
    kutu.replaceChildren();
    kutu.style.flexBasis = "100%";
    el("h3", "", kutu, "Hesabın kalıcı olarak silinsin mi?");
    el("p", "", kutu, "Çekirdeklerin, parçaların, Altın'ın ve başarımların silinir. Maç geçmişinde adın \"Silinmiş oyuncu\" olur. Geri alınamaz.");
    el("label", "", kutu, "Onay için şifren");
    const sifre = el("input", "", kutu);
    sifre.type = "password";
    sifre.autocomplete = "current-password";
    sifre.setAttribute("aria-label", "Şifre");
    const hata = el("div", "hata", kutu);
    hata.setAttribute("role", "alert");
    const satir = el("div", "satir", kutu);
    const sil = el("button", "k-dugme tehlike", satir, "Kalıcı olarak sil");
    sil.dataset["eylem"] = "hesap-sil-onay";
    const iptal = el("button", "", satir, "İptal");
    iptal.addEventListener("click", () => { kutu.replaceChildren(ilk); kutu.style.flexBasis = ""; ilk.focus(); });
    sil.addEventListener("click", () => {
      if (!sifre.value) { hata.textContent = "Şifreni yaz."; sifre.focus(); return; }
      sil.disabled = true;
      void apiIstek("DELETE", "/api/hesap", { sifre: sifre.value }).then((r) => {
        if (r.durum === 200) { location.href = "/?ekran=karsilama&mesaj=silindi"; return; }
        sil.disabled = false;
        hata.textContent = r.durum === 401 && r.veri.hata === "yanlis" ? "Şifre yanlış." : r.durum === 429 ? "Çok deneme. Bir dakika bekle." : "Silinemedi. Tekrar dene.";
      }, () => { sil.disabled = false; hata.textContent = "Sunucuya ulaşılamadı."; });
    });
    queueMicrotask(() => { sifre.focus(); kutu.scrollIntoView({ block: "nearest" }); });
  });
}
