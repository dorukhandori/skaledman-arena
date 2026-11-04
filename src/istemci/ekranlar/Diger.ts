import { BASARIMLAR } from "../../paylasilan/veri/katalog.ts";
import type { EkranBaglami } from "../main.ts";
import { git } from "../hesap.ts";
import { AYAR_SECENEKLERI, type OyunAyarlari, ayarlariOku, ayarlariYaz } from "../oyun/Ayarlar.ts";
import { OLCEKLER, METIN_OLCEGI, ekranKok, el, geriDugmesi, metinOlcegiOku, metinOlcegiUygula } from "./arayuz.ts";

// Market (yer tutucu, D7; "İlk Devir" ile açılır, nile B-23), Başarımlar (D5'te yalnız İlk Devir işlenir; liste
// veri/basarimlar.json), Ayarlar (metin ölçeği ux § 6.3 + maç ayarları ux § 6.2). Hepsinde ◄ geri → Atölye.

export function market(b: EkranBaglami): void {
  const ben = b.ben;
  if (!ben?.girisli) { git("karsilama"); return; }
  const { kart } = ekranKok(b.ustYazi, "Market");
  geriDugmesi(kart);
  el("h2", "", kart, "Market");
  if (!ben.marketAcik) {
    el("p", "", kart, "Market kilitli. Antrenman eğitimini bitir: İlk Devir başarımı Market'i açar.");
    const d = el("button", "bir", kart, "Antrenmana git");
    d.addEventListener("click", () => git("antrenman"));
    queueMicrotask(() => d.focus());
    return;
  }
  el("p", "", kart, "Market açık. Raflar, Altın ve fiyatlar yakında gelecek.");
  el("p", "yt", kart, "Başlangıç rafı: seçmediğin iki başlangıç seti burada 100 Altın'a duracak.");
}

export function basarimlar(b: EkranBaglami): void {
  const ben = b.ben;
  if (!ben?.girisli) { git("karsilama"); return; }
  const { kart } = ekranKok(b.ustYazi, "Başarımlar");
  geriDugmesi(kart);
  el("h2", "", kart, "Başarımlar");
  if (!ben.basarimlar.length) el("p", "", kart, "Henüz başarım yok. İlk maçını oyna.");
  const liste = el("ul", "", kart);
  liste.setAttribute("aria-label", "Başarım listesi");
  for (const x of BASARIMLAR.filter((y) => y.ilkSurum && !y.gizli).slice(0, 12)) {
    const li = el("li", "", liste);
    const tamam = ben.basarimlar.includes(x.id);
    li.textContent = `${tamam ? "✔" : "○"} ${x.ad}${tamam ? "" : " · kilitli"}`;
    li.dataset["basarim"] = x.id;
  }
  el("p", "yt", kart, "İlerleme sayaçları yakında (sunucuda sayılır).");
}

export function ayarlar(b: EkranBaglami): void {
  const { kart } = ekranKok(b.ustYazi, "Ayarlar");
  geriDugmesi(kart, b.ben?.girisli ? "atolye" : "karsilama");
  el("h2", "", kart, "Ayarlar");
  el("label", "", kart, "Metin ölçeği (menüler)");
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
  el("label", "", kart, "Maç ayarları");
  const iz = el("div", "", kart);
  iz.style.display = "grid";
  iz.style.gridTemplateColumns = "1fr 12rem";
  iz.style.gap = ".4rem .8rem";
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
  queueMicrotask(() => dugmeler[0]?.focus());
}
