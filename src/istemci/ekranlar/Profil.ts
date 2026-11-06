import { ELEMENT_CARKI, type ElementAdi } from "../../paylasilan/kurallar/ayar.ts";
import { karakterSayfasi } from "./haritaVarlik.ts";
import type { EkranBaglami } from "../main.ts";
import { BakimHatasi, HESAP_HATA, apiGet, apiIstek, apiPost, git } from "../hesap.ts";
import { ELEMENT_RENK } from "../oyun/renkler.ts";
import { anaEylem, bakimKatmani, el } from "./arayuz.ts";
import { kimlikKok } from "./Kimlik.ts";

// Profil (US-1.2, ux § 7): ad kayıttan gelir; arma = 6 element simgesinden biri, renk = profil çerçevesi, destek
// kanalı (isteğe bağlı Kick kanal adı; bonus yok). İlk kez: düğme **Başla**. D6 Atölye › Profil (profil tamamsa):
// ad değiştirme (30 günde bir, sunucu kuralı; hata "Adı 30 günde bir değiştirebilirsin."), arma/renk **Kaydet**.

const RENKLER = ["#f4cf47", "#e3350d", "#2fb8e8", "#7fe3a0", "#c58bff", "#f2a33a"] as const;
const RENK_AD = ["Altın", "Kızıl", "Gök", "Yeşim", "Eflatun", "Amber"];

const STIL = `
.pf .izgara { display:grid; grid-template-columns:repeat(6, 1fr); gap:calc(3 * var(--p)); }
.pf .sec { position:relative; display:flex; flex-direction:column; align-items:center; gap:calc(2 * var(--p)); padding:calc(3 * var(--p)) var(--p); cursor:pointer; margin:0;
  background:var(--hucre); color:var(--soluk); border:var(--p) solid var(--harc); border-radius:0; box-shadow:inset 0 var(--p) 0 0 var(--hucre-isik), var(--odak-g, 0 0 0 0 transparent);
  font:400 var(--y-16)/.75 var(--font-etiket); text-transform:uppercase; }
.pf .sec[aria-checked=true] { color:var(--ink); box-shadow:inset 0 0 0 var(--p) var(--gold), var(--odak-g, 0 0 0 0 transparent); }
.pf .sec[aria-checked=true]::before { content:""; position:absolute; inset:calc(-3 * var(--p)); pointer-events:none; --c:var(--gold); --u:calc(5 * var(--p)); --k:var(--p);
  background:linear-gradient(var(--c),var(--c)) 0 0 / var(--u) var(--k) no-repeat, linear-gradient(var(--c),var(--c)) 0 0 / var(--k) var(--u) no-repeat, linear-gradient(var(--c),var(--c)) 100% 0 / var(--u) var(--k) no-repeat, linear-gradient(var(--c),var(--c)) 100% 0 / var(--k) var(--u) no-repeat,
    linear-gradient(var(--c),var(--c)) 0 100% / var(--u) var(--k) no-repeat, linear-gradient(var(--c),var(--c)) 0 100% / var(--k) var(--u) no-repeat, linear-gradient(var(--c),var(--c)) 100% 100% / var(--u) var(--k) no-repeat, linear-gradient(var(--c),var(--c)) 100% 100% / var(--k) var(--u) no-repeat; }
.pf .renk { width:calc(10 * var(--p)); height:calc(10 * var(--p)); box-shadow:inset 0 0 0 var(--p) var(--harc); }
.pf .onizleme { display:flex; align-items:center; gap:calc(6 * var(--p)); padding:calc(2 * var(--p)) calc(6 * var(--p)); margin-top:calc(4 * var(--p)); background:#11141f; border:var(--p) solid; text-transform:uppercase; }
.pf .onizleme b { font:400 var(--y-20)/1 var(--font-baslik); letter-spacing:var(--yp); color:var(--ink); }
.pf .kart { flex-basis:calc(300 * var(--p)) !important; }
.pf .kart > .alt { display:none; }
.pf .kart label { margin:calc(4 * var(--p)) 0 calc(2 * var(--p)); }
.pf .kart .satir { margin-top:calc(4 * var(--p)); }
.pf .k-govde { padding-top:calc(4 * var(--p)); }
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
  const kart = kimlikKok(b.ustYazi, "Profil");
  const kok = kart.closest(".ekr") as HTMLElement;
  kok.classList.add("pf");
  const st = el("style"); st.textContent = STIL; document.head.appendChild(st);
  if (ben.oyuncu.profilTamam) { el("button", "geri", kart, "◄ Geri").addEventListener("click", () => git("atolye")); }
  el("h2", "k-plaka", kart, ben.oyuncu.profilTamam ? "Profil" : "Profil oluştur");
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
    on.innerHTML = `<span class="k-el x2" data-el="${arma}"></span><b></b>`;
    on.querySelector("b")!.textContent = gorunenAd;
  };
  el("label", "", kart, "Arma").id = "l-arma";
  radyoGrubu(kart, "Arma", ELEMENT_CARKI, (v, d) => { d.innerHTML = `<span class="k-el" data-el="${v}"></span><span>${ELEMENT_RENK[v].ad}</span>`; d.setAttribute("aria-label", `Arma: ${ELEMENT_RENK[v].ad}`); }, (v) => { arma = v; guncelle(); }, arma);
  el("label", "", kart, "Renk");
  radyoGrubu(kart, "Renk", RENKLER, (v, d) => {
    const k = RENKLER.indexOf(v);
    d.innerHTML = `<span class="renk" style="background:${v}"></span>`; // renk adı ARIA'da (sadelik § 2.9)
    d.title = RENK_AD[k]!;
    d.setAttribute("aria-label", `Renk: ${RENK_AD[k]}`);
  }, (v) => { renk = v; guncelle(); }, (RENKLER as readonly string[]).includes(renk) ? (renk as (typeof RENKLER)[number]) : RENKLER[0]);
  // destek kanalı ikinci katta (sadelik § 2.9): düğmeyle açılır; doluysa açık başlar
  const kd = el("button", "", kart, "Destek kanalı ▾");
  kd.type = "button";
  kd.dataset["eylem"] = "destek-kanali";
  const kk = el("div", "kanal-kutu", kart);
  kk.hidden = !ben.oyuncu.destekKanali;
  kd.setAttribute("aria-expanded", String(!kk.hidden));
  kd.addEventListener("click", () => { kk.hidden = !kk.hidden; kd.setAttribute("aria-expanded", String(!kk.hidden)); if (!kk.hidden) kanal.focus(); });
  const l = el("label", "", kk, "Destek kanalı (isteğe bağlı)");
  l.htmlFor = "a-kanal";
  const kanal = el("input", "", kk);
  kanal.type = "text";
  kanal.id = "a-kanal";
  kanal.maxLength = 25;
  kanal.placeholder = "Kick kanal adı";
  kanal.value = ben.oyuncu.destekKanali ?? "";
  el("div", "ipucu", kk, "Yayıncının kanalı. Yalnız profilde görünür.");
  // Harita (13 § 2, 12 § 3, 04 § 6): KARAKTER (4 gövde), çerçeve (Ocak/başarım görünümü), vitrin (3 üretilmiş parça), Ustalık rozetleri
  let karakter = ben.karakter ?? 0;
  let cerceve: string | null = ben.cerceve ?? null;
  let vitrin: string[] | null = null;
  if (duzenle && ben.harita?.acik) {
    el("label", "", kart, "Karakter");
    radyoGrubu(kart, "Karakter", ["0", "1", "2", "3"] as const, (v, d) => {
      const n = Number(v);
      // karakter sayfasının BEKLE karesi (16×24, ×2; public/harita/karakter, sanat turu)
      const sp = el("span", "", d);
      sp.setAttribute("aria-hidden", "true");
      sp.style.cssText = `display:inline-block;width:32px;height:48px;background:url(${karakterSayfasi(n, renk)}) 0 0 / 288px 144px no-repeat;image-rendering:pixelated`;
      d.dataset["karakter"] = v;
      d.setAttribute("aria-label", `Karakter gövdesi ${n + 1}`);
    }, (v) => { karakter = Number(v); }, String(Math.max(0, Math.min(3, karakter))) as "0" | "1" | "2" | "3");
    if (ben.ustalik) el("div", "ipucu", kart, `⛏ MADENCİLİK ${ben.ustalik.madencilik} · ⚒ İŞLEME ${ben.ustalik.isleme}`).dataset["ustalik"] = "1";
    const ek = el("div", "", kart);
    void apiGet<{ gorunumler: { id: string; usta: boolean }[]; uretilenler: { anahtar: string; ad: string; deger: number }[]; vitrin: string[] }>("/api/ocak").then((o) => {
      const cer = o.gorunumler.filter((x) => x.id.startsWith("cerceve-"));
      el("label", "", ek, "Çerçeve");
      const sc = el("select", "k-alan", ek);
      sc.dataset["cerceve"] = "1";
      for (const [v, ad] of [["", "Yok"], ...cer.map((x) => [x.id, `${x.id.replace("cerceve-", "").toUpperCase()}${x.usta ? " ✦" : ""}`])] as [string, string][]) {
        const op = el("option", "", sc, ad); op.value = v; if (v === (cerceve ?? "")) op.selected = true;
      }
      sc.addEventListener("change", () => { cerceve = sc.value || null; });
      el("label", "", ek, "Vitrin");
      vitrin = [...o.vitrin];
      const ur = [...o.uretilenler].sort((a, b) => b.deger - a.deger);
      for (let i = 0; i < 3; i++) {
        const sv = el("select", "k-alan", ek);
        sv.dataset["vitrin"] = String(i);
        for (const [v, ad] of [["", "Boş yuva"], ...ur.map((x) => [x.anahtar, `${x.ad} · ${x.deger}`])] as [string, string][]) {
          const op = el("option", "", sv, ad); op.value = v; if (v === (o.vitrin[i] ?? "")) op.selected = true;
        }
        sv.addEventListener("change", () => { vitrin![i] = sv.value; });
      }
      if (!ur.length) el("div", "ipucu", ek, "Ocak'ta parça üretince vitrine koyabilirsin.");
    }).catch(() => { /* Ocak kapalı: yalnız karakter */ });
  }
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
      if (r.durum === 200 && duzenle && ben.harita?.acik) {
        await apiIstek("PATCH", "/api/profil", { karakter, cerceve });
        if (vitrin) await apiIstek("PATCH", "/api/vitrin", { parcalar: vitrin.filter((x) => x) });
      }
      if (r.durum === 200) { git(ben.cekirdekler.length ? "atolye" : "ilk-cekirdek"); return; }
      h.textContent = HESAP_HATA[r.veri.hata ?? "bicim"] ?? HESAP_HATA["bicim"]!;
    } catch (e) {
      if (e instanceof BakimHatasi) bakimKatmani(() => location.reload());
    } finally { d.disabled = false; }
  });
  anaEylem(d);
  queueMicrotask(() => d.focus());
}
