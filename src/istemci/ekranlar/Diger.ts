import type { EkranBaglami } from "../main.ts";
import { apiIstek, git } from "../hesap.ts";
import { AYAR_SECENEKLERI, type OyunAyarlari, ayarlariOku, ayarlariYaz } from "../oyun/Ayarlar.ts";
import { DUZ_YAZI, OLCEKLER, METIN_OLCEGI, duzYaziOku, duzYaziUygula, ekranKok, el, geriDugmesi, metinOlcegiOku, metinOlcegiUygula } from "./arayuz.ts";

// Ayarlar (metin ölçeği ux § 6.3 + maç ayarları ux § 6.2); ◄ geri → Atölye. D7: Market ve Başarımlar kendi
// dosyalarında (Market.ts, Basarimlar.ts).

export function ayarlar(b: EkranBaglami): void {
  const { kart } = ekranKok(b.ustYazi, "Ayarlar");
  geriDugmesi(kart, b.ben?.girisli ? "atolye" : "karsilama");
  el("h2", "k-plaka", kart, "Ayarlar");
  el("label", "", kart, "Metin ölçeği (menüler ve maç HUD'u)");
  const s = el("div", "satir", kart);
  s.setAttribute("role", "radiogroup");
  s.setAttribute("aria-label", "Metin ölçeği");
  const dugmeler: HTMLButtonElement[] = [];
  const yaz = () => { const o = metinOlcegiOku(); for (const d of dugmeler) d.setAttribute("aria-checked", String(Number(d.dataset["o"]) === o)); };
  for (const o of OLCEKLER) {
    const d = el("button", "", s, `%${Math.round(o * 100)}`);
    d.setAttribute("role", "radio");
    d.dataset["o"] = String(o);
    d.addEventListener("click", () => { try { localStorage.setItem(METIN_OLCEGI, String(o)); } catch { /* kapalı */ } metinOlcegiUygula(o); yaz(); });
    dugmeler.push(d);
  }
  yaz();
  // GU-01 erişilebilirlik: pixel yazı tipi yerine düz (sistem) yazı tipi
  el("label", "", kart, "Yazı tipi");
  const yt = el("div", "satir", kart);
  yt.style.marginTop = "0";
  const ytD = el("button", "", yt);
  const ytYaz = () => { ytD.textContent = duzYaziOku() ? "Düz (okunurluk)" : "Pixel"; ytD.setAttribute("aria-pressed", String(duzYaziOku())); };
  ytD.dataset["ayar"] = "duz-yazi";
  ytD.addEventListener("click", () => { const y = !duzYaziOku(); try { localStorage.setItem(DUZ_YAZI, y ? "1" : "0"); } catch { /* kapalı */ } duzYaziUygula(); ytYaz(); });
  ytYaz();
  el("label", "", kart, "Maç ayarları");
  const iz = el("div", "", kart);
  iz.style.display = "grid";
  iz.style.gridTemplateColumns = "1fr calc(110 * var(--p))";
  iz.style.gap = "calc(3 * var(--p)) calc(8 * var(--p))";
  iz.style.alignItems = "center";
  iz.style.textTransform = "uppercase";
  let a: OyunAyarlari = ayarlariOku();
  for (const anahtar of Object.keys(AYAR_SECENEKLERI) as (keyof OyunAyarlari)[]) {
    const t = AYAR_SECENEKLERI[anahtar];
    el("span", "", iz, t.ad);
    const d = el("button", "", iz);
    const goster = () => { d.textContent = t.secenekler.find((x) => x.deger === a[anahtar])?.ad ?? "?"; };
    goster();
    d.addEventListener("click", () => {
      const sec = t.secenekler as { deger: string }[];
      const k = sec.findIndex((x) => x.deger === a[anahtar]);
      a = { ...a, [anahtar]: sec[(k + 1) % sec.length]!.deger } as OyunAyarlari;
      ayarlariYaz(a);
      goster();
    });
  }
  el("p", "yt", kart, "Bu tarayıcıda saklanır. Maç içinde Esc › Ayarlar aynı ayarları açar.");
  // D8: bilgi bağlantıları + hesap silme (iki adım, şifre onayı; misafirde yok)
  const bilgi = el("div", "satir", kart);
  const gz = el("a", "", bilgi, "Gizlilik");
  gz.href = "/gizlilik";
  const kr = el("a", "", bilgi, "Krediler");
  kr.href = "/krediler";
  if (b.ben?.girisli) hesapSilBolumu(kart);
  queueMicrotask(() => dugmeler[0]?.focus());
}

/** D8 "Hesabımı sil" (nile B-28): 1) düğme → 2) açıklama + şifre + "Kalıcı olarak sil" (İptal). */
function hesapSilBolumu(kart: HTMLElement): void {
  const kutu = el("div", "", kart);
  kutu.dataset["hesapSil"] = "1";
  kutu.style.marginTop = "calc(10 * var(--p))";
  kutu.style.borderTop = "var(--p) solid #2a3146";
  kutu.style.paddingTop = "calc(6 * var(--p))";
  const ilk = el("button", "", kutu, "Hesabımı sil");
  ilk.dataset["eylem"] = "hesap-sil";
  ilk.addEventListener("click", () => {
    kutu.replaceChildren();
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
    iptal.addEventListener("click", () => { kutu.replaceChildren(ilk); ilk.focus(); });
    sil.addEventListener("click", () => {
      if (!sifre.value) { hata.textContent = "Şifreni yaz."; sifre.focus(); return; }
      sil.disabled = true;
      void apiIstek("DELETE", "/api/hesap", { sifre: sifre.value }).then((r) => {
        if (r.durum === 200) { location.href = "/?ekran=karsilama&mesaj=silindi"; return; }
        sil.disabled = false;
        hata.textContent = r.durum === 401 && r.veri.hata === "yanlis" ? "Şifre yanlış." : r.durum === 429 ? "Çok deneme. Bir dakika bekle." : "Silinemedi. Tekrar dene.";
      }, () => { sil.disabled = false; hata.textContent = "Sunucuya ulaşılamadı."; });
    });
    queueMicrotask(() => sifre.focus());
  });
}
