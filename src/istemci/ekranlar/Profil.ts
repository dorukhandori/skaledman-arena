import { ELEMENT_CARKI, type ElementAdi } from "../../paylasilan/kurallar/ayar.ts";
import type { EkranBaglami } from "../main.ts";
import { BakimHatasi, HESAP_HATA, apiIstek, apiPost, git } from "../hesap.ts";
import { elementSvg } from "../oyun/elementSimge.ts";
import { ELEMENT_RENK } from "../oyun/renkler.ts";
import { anaEylem, bakimKatmani, ekranKok, el } from "./arayuz.ts";

// Profil (US-1.2, ux § 7): ad kayıttan gelir; arma = 6 element simgesinden biri, renk = profil çerçevesi, destek
// kanalı (isteğe bağlı Kick kanal adı; bonus yok). İlk kez: düğme **Başla**. D6 Atölye › Profil (profil tamamsa):
// ad değiştirme (30 günde bir, sunucu kuralı; hata "Adı 30 günde bir değiştirebilirsin."), arma/renk **Kaydet**.

const RENKLER = ["#f4cf47", "#e3350d", "#2fb8e8", "#7fe3a0", "#c58bff", "#f2a33a"] as const;
const RENK_AD = ["Altın", "Kızıl", "Gök", "Yeşim", "Eflatun", "Amber"];

const STIL = `
.pf .izgara { display:grid; grid-template-columns:repeat(6, 1fr); gap:.5rem; }
.pf .sec { display:flex; flex-direction:column; align-items:center; gap:.25rem; padding:.55rem .2rem; font-size:.8rem; }
.pf .sec[aria-checked=true] { background:#24414b; outline:3px solid #f4cf47; }
.pf .renk { width:2.2rem; height:2.2rem; border-radius:50%; border:3px solid #050d10; }
.pf .onizleme { display:flex; align-items:center; gap:.8rem; padding:.7rem; margin-top:1rem; border-radius:10px; background:#10222a; border:3px solid; }
.pf .onizleme b { font-size:1.15rem; }
`;

/** Ok tuşlarıyla gezilen radyo grubu (ux § 6.4). */
function radyoGrubu<T extends string>(ust: HTMLElement, etiket: string, secenekler: readonly T[], ciz: (v: T, d: HTMLButtonElement) => void, sec: (v: T) => void, ilk: T): HTMLElement {
  const g = el("div", "izgara", ust);
  g.setAttribute("role", "radiogroup");
  g.setAttribute("aria-label", etiket);
  const dugmeler: HTMLButtonElement[] = [];
  const isaretle = (v: T) => {
    for (const d of dugmeler) { const on = d.dataset["deger"] === v; d.setAttribute("aria-checked", String(on)); d.tabIndex = on ? 0 : -1; }
    sec(v);
  };
  secenekler.forEach((v, k) => {
    const d = el("button", "sec", g);
    d.type = "button";
    d.setAttribute("role", "radio");
    d.dataset["deger"] = v;
    ciz(v, d);
    d.addEventListener("click", () => isaretle(v));
    d.addEventListener("keydown", (e) => {
      const yon = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!yon) return;
      e.preventDefault();
      const n = (k + yon + secenekler.length) % secenekler.length;
      isaretle(secenekler[n]!);
      dugmeler[n]!.focus();
    });
    dugmeler.push(d);
  });
  isaretle(ilk);
  return g;
}

export function baslat(b: EkranBaglami): void {
  const ben = b.ben;
  if (!ben?.girisli) { git("karsilama"); return; }
  const { kok, kart } = ekranKok(b.ustYazi, "Profil");
  kok.classList.add("pf");
  const st = el("style"); st.textContent = STIL; document.head.appendChild(st);
  if (ben.oyuncu.profilTamam) { el("button", "geri", kart, "◄ Geri").addEventListener("click", () => git("atolye")); }
  el("h2", "", kart, "Profil");
  el("div", "alt", kart, "Arenada seni böyle tanırlar. Arma ve rengi sonra da değiştirebilirsin.");
  const duzenle = ben.oyuncu.profilTamam;
  let gorunenAd = ben.oyuncu.ad;
  const lAd = el("label", "", kart, "Oyuncu adı");
  if (duzenle) {
    lAd.htmlFor = "a-ad";
    const satirAd = el("div", "satir", kart);
    satirAd.style.marginTop = "0";
    const adGiris = el("input", "", satirAd);
    adGiris.type = "text";
    adGiris.id = "a-ad";
    adGiris.maxLength = 16;
    adGiris.value = ben.oyuncu.ad;
    adGiris.style.flex = "1";
    adGiris.style.width = "auto";
    adGiris.setAttribute("aria-describedby", "ad-ipucu ad-hata");
    const adD = el("button", "", satirAd, "Adı değiştir");
    adD.dataset["eylem"] = "ad-degistir";
    const ip = el("div", "ipucu", kart, "Adı 30 günde bir değiştirebilirsin. 3-16 karakter.");
    ip.id = "ad-ipucu";
    const adH = el("div", "hata", kart);
    adH.id = "ad-hata";
    adH.setAttribute("role", "alert");
    adH.dataset["adHata"] = "1";
    adD.addEventListener("click", async () => {
      adH.textContent = "";
      adH.style.color = "";
      adGiris.removeAttribute("aria-invalid");
      adD.disabled = true;
      try {
        const r = await apiIstek<{ ok: boolean; ad: string; kalanGun?: number }>("PATCH", "/api/ad", { ad: adGiris.value });
        if (r.durum === 200) {
          gorunenAd = r.veri.ad;
          adH.style.color = "#7fe3a0";
          adH.textContent = `Adın artık ${r.veri.ad}.`;
          document.querySelector("body > header .kim span")?.replaceChildren(r.veri.ad);
          guncelle();
          return;
        }
        const k = r.veri.hata ?? "bicim";
        adH.textContent = (HESAP_HATA[k] ?? HESAP_HATA["bicim"]!) + (k === "sure" && r.veri.kalanGun ? ` ${r.veri.kalanGun} gün sonra tekrar deneyebilirsin.` : "");
        adH.dataset["hataKodu"] = k;
        adGiris.setAttribute("aria-invalid", "true");
        adGiris.focus();
      } catch (e) {
        if (e instanceof BakimHatasi) bakimKatmani(() => location.reload());
      } finally { adD.disabled = false; }
    });
  } else {
    const ad = el("div", "", kart, ben.oyuncu.ad);
    ad.style.fontWeight = "800";
    el("div", "ipucu", kart, "Adı 30 günde bir değiştirebilirsin.");
  }
  let arma = (ben.oyuncu.arma as ElementAdi | null) ?? "kor";
  let renk = ben.oyuncu.renk ?? RENKLER[0];
  const on = el("div", "onizleme");
  const guncelle = () => {
    on.style.borderColor = renk;
    on.innerHTML = `${elementSvg(arma, 36)}<b></b>`;
    on.querySelector("b")!.textContent = gorunenAd;
  };
  el("label", "", kart, "Arma").id = "l-arma";
  radyoGrubu(kart, "Arma", ELEMENT_CARKI, (v, d) => { d.innerHTML = `${elementSvg(v, 28)}<span>${ELEMENT_RENK[v].ad}</span>`; d.setAttribute("aria-label", `Arma: ${ELEMENT_RENK[v].ad}`); }, (v) => { arma = v; guncelle(); }, arma);
  el("label", "", kart, "Renk");
  radyoGrubu(kart, "Renk", RENKLER, (v, d) => {
    const k = RENKLER.indexOf(v);
    d.innerHTML = `<span class="renk" style="background:${v}"></span><span>${RENK_AD[k]}</span>`;
    d.setAttribute("aria-label", `Renk: ${RENK_AD[k]}`);
  }, (v) => { renk = v; guncelle(); }, (RENKLER as readonly string[]).includes(renk) ? (renk as (typeof RENKLER)[number]) : RENKLER[0]);
  const l = el("label", "", kart, "Destek kanalı (isteğe bağlı)");
  l.htmlFor = "a-kanal";
  const kanal = el("input", "", kart);
  kanal.type = "text";
  kanal.id = "a-kanal";
  kanal.maxLength = 25;
  kanal.placeholder = "Kick kanal adı";
  kanal.value = ben.oyuncu.destekKanali ?? "";
  el("div", "ipucu", kart, "Desteklediğin yayıncının kanalı. Şimdilik yalnız profilde görünür.");
  kart.appendChild(on);
  guncelle();
  const h = el("div", "hata", kart);
  h.setAttribute("role", "alert");
  const satir = el("div", "satir", kart);
  const d = el("button", "bir", satir, duzenle ? "Kaydet" : "Başla");
  d.dataset["eylem"] = duzenle ? "profil-kaydet" : "basla";
  d.addEventListener("click", async () => {
    h.textContent = "";
    const k = kanal.value.trim();
    if (k && !/^[A-Za-z0-9_]{1,25}$/.test(k)) { h.textContent = "Kanal adında yalnız harf, rakam ve alt çizgi olabilir."; kanal.focus(); return; }
    d.disabled = true;
    try {
      const r = await apiPost("/api/profil", { arma, renk, destekKanali: k });
      if (r.durum === 200) { git(ben.cekirdekler.length ? "atolye" : "ilk-cekirdek"); return; }
      h.textContent = HESAP_HATA[r.veri.hata ?? "bicim"] ?? HESAP_HATA["bicim"]!;
    } catch (e) {
      if (e instanceof BakimHatasi) bakimKatmani(() => location.reload());
    } finally { d.disabled = false; }
  });
  anaEylem(d);
  queueMicrotask(() => d.focus());
}
