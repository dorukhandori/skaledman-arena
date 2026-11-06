import { ELEMENT_CARKI, type ElementAdi } from "../../paylasilan/kurallar/ayar.ts";
import { GORUNUM_IKON, karakterSayfasi } from "./haritaVarlik.ts";
import type { EkranBaglami } from "../main.ts";
import { BakimHatasi, HESAP_HATA, apiGet, apiIstek, apiPost, git } from "../hesap.ts";
import { ELEMENT_RENK } from "../oyun/renkler.ts";
import { anaEylem, bakimKatmani, el, geriDugmesi, kaydirmaIpucu } from "./arayuz.ts";
import { kimlikKok } from "./Kimlik.ts";
import { cekirdekIllustrasyonu } from "./pikselTopac.ts";

// Profil (US-1.2, ux § 7): ad kayıttan gelir; arma = 6 element simgesinden biri ya da Ocak'ta dövülen arma, renk = profil
// çerçevesi, destek kanalı (isteğe bağlı Kick kanal adı; bonus yok). İlk kez: düğme **Başla**. Atölye › Profil (profil
// tamamsa): ad değiştirme (30 günde bir, sunucu kuralı), arma/renk/karakter/çerçeve/vitrin. MENU-P2: tek KAYDET (ad
// değiştiyse önce ad, sonra profil; K-15), sol panel = canlı önizleme (seçilen çerçeve 9-dilim, kenar 6; dövülen arma) +
// ana düğme; sağ panel form (uzarsa içinde kayar, ipucu şeridiyle). Lento plakası PROFİL, ◄ Atölye.

const RENKLER = ["#f4cf47", "#e3350d", "#2fb8e8", "#7fe3a0", "#c58bff", "#f2a33a"] as const;
const RENK_AD = ["Altın", "Kızıl", "Gök", "Yeşim", "Eflatun", "Amber"];

const STIL = `
.pf .izgara { display:grid; grid-template-columns:repeat(6, 1fr); gap:calc(3 * var(--p)); }
.pf .izgara.arma { grid-template-columns:repeat(3, 1fr); }
.pf .sec { position:relative; display:flex; flex-direction:row; align-items:center; justify-content:center; gap:calc(3 * var(--p)); min-width:0; padding:calc(3 * var(--p)) calc(3 * var(--p)); cursor:pointer; margin:0;
  background:var(--hucre); color:var(--soluk); border:var(--p) solid var(--harc); border-radius:0; box-shadow:inset 0 var(--p) 0 0 var(--hucre-isik), var(--odak-g, 0 0 0 0 transparent);
  font:400 var(--y-16)/.75 var(--font-etiket); text-transform:uppercase; }
.pf .sec > span:last-child:not(.k-el):not(.renk) { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pf .sec img.dovulen { width:calc(12 * var(--p)); height:calc(12 * var(--p)); image-rendering:pixelated; flex:none; }
.pf .sec[aria-checked=true] { color:var(--ink); box-shadow:inset 0 0 0 var(--p) var(--gold), var(--odak-g, 0 0 0 0 transparent); }
.pf .renk { width:calc(10 * var(--p)); height:calc(10 * var(--p)); box-shadow:inset 0 0 0 var(--p) var(--harc); }
.pf .kart label { margin:calc(4 * var(--p)) 0 calc(2 * var(--p)); }
.pf .kart .satir { margin-top:calc(2 * var(--p)); }
.pf .k-govde { padding-top:calc(6 * var(--p)); }
.pf .kml-sol { justify-content:flex-start; padding-top:calc(10 * var(--p)); }
.pf .kml-sol .k-dugme.ana { margin:auto 0 0; min-width:calc(140 * var(--p)); }
/* önizleme kartı: seçilen çerçeve 9-dilim (24×24 kaynak, kenar 6), yoksa profil rengi çizgisi */
.pf .onizleme { position:relative; align-self:stretch; display:flex; flex-direction:column; align-items:center; gap:calc(4 * var(--p)); padding:calc(8 * var(--p)) calc(6 * var(--p));
  background:#11141f; text-transform:uppercase; border:calc(6 * var(--p)) solid var(--renk, var(--bronz)); }
.pf .onizleme[data-cerceve] { border-color:transparent; border-image-slice:6; border-image-width:calc(6 * var(--p)); border-image-repeat:stretch; }
.pf .onizleme b { font:400 var(--y-20)/1 var(--font-baslik); letter-spacing:var(--yp); color:var(--ink); max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pf .onizleme .arma-ik { width:calc(32 * var(--p)); height:calc(32 * var(--p)); display:grid; place-items:center; }
.pf .onizleme .arma-ik img { width:calc(24 * var(--p)); height:calc(24 * var(--p)); image-rendering:pixelated; }
.pf .onizleme .yt { text-transform:none; }
.pf .onizleme .renk-cizgi { width:100%; height:calc(2 * var(--p)); background:var(--renk, var(--bronz)); }
.pf .aciklama { color:var(--soluk); text-transform:none; line-height:.875; margin:0 0 calc(2 * var(--p)); }
.pf .onizleme .karakter { width:calc(32 * var(--p)); height:calc(48 * var(--p)); margin:calc(-4 * var(--p)) 0; background:0 0 / calc(288 * var(--p)) calc(144 * var(--p)) no-repeat; image-rendering:pixelated; }
.pf .pf-topac { margin-top:calc(6 * var(--p)); }
.pf .sabit-ad { font:400 var(--y-20)/1 var(--font-baslik); letter-spacing:var(--yp); color:var(--ink); text-transform:uppercase; }
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
  const duzenle = ben.oyuncu.profilTamam;
  // S-1 / K-2: plaka = PROFİL; ◄ Atölye (ilk kez profil oluştururken ◄ yok: önce profil)
  const { kart, sol } = kimlikKok(b.ustYazi, "Profil", { geri: duzenle ? "atolye" : null, tanitim: false });
  const kok = kart.closest(".ekr") as HTMLElement;
  kok.classList.add("pf");
  sol.replaceChildren();
  const st = el("style"); st.textContent = STIL; document.head.appendChild(st);
  if (duzenle) geriDugmesi(kart, "atolye");
  el("div", "alt", kart, duzenle ? "Arenada seni böyle tanırlar." : "Arenada seni böyle tanırlar. Arma ve rengi sonra da değiştirebilirsin.");
  let gorunenAd = ben.oyuncu.ad;
  const lAd = el("label", "", kart, "Oyuncu adı");
  let adGiris: HTMLInputElement | null = null;
  let adH: HTMLElement | null = null;
  if (duzenle) {
    lAd.htmlFor = "a-ad";
    adGiris = el("input", "k-alan", kart);
    adGiris.type = "text";
    adGiris.id = "a-ad";
    adGiris.maxLength = 16;
    adGiris.value = ben.oyuncu.ad;
    adGiris.setAttribute("aria-describedby", "ad-ipucu ad-hata");
    adGiris.addEventListener("input", () => { gorunenAd = adGiris!.value.trim() || ben.oyuncu.ad; guncelle(); });
    const ip = el("div", "ipucu", kart, "Adı 30 günde bir değiştirebilirsin. 3-16 karakter. KAYDET ile kaydedilir.");
    ip.id = "ad-ipucu";
    adH = el("div", "hata", kart);
    adH.id = "ad-hata";
    adH.setAttribute("role", "alert");
    adH.dataset["adHata"] = "1";
  } else {
    el("div", "sabit-ad", kart, ben.oyuncu.ad); // H-7: ad pixel başlık yazısıyla (Arial'e düşmez)
    el("div", "ipucu", kart, "Adı 30 günde bir değiştirebilirsin.");
  }
  let arma: string = ben.oyuncu.arma ?? "kor";
  let renk = ben.oyuncu.renk ?? RENKLER[0];
  let karakter = ben.karakter ?? 0;
  let cerceve: string | null = ben.cerceve ?? null;
  let vitrin: string[] | null = null;
  // sol panel: canlı önizleme + ana düğme (tek KAYDET; K-15)
  const on = el("div", "onizleme", sol);
  on.dataset["onizleme"] = "1";
  const guncelle = () => {
    on.style.setProperty("--renk", renk);
    if (cerceve) { on.dataset["cerceve"] = cerceve; on.style.borderImageSource = `url("${GORUNUM_IKON(cerceve)}")`; }
    else { delete on.dataset["cerceve"]; on.style.borderImageSource = ""; }
    on.replaceChildren();
    const ik = el("div", "arma-ik", on);
    if (arma.startsWith("arma-")) { const im = el("img", "", ik); im.src = GORUNUM_IKON(arma); im.alt = ""; }
    else { const e = el("span", "k-el x2", ik); e.dataset["el"] = arma; }
    if (ben.harita?.acik) {
      // haritadaki karakter (BEKLE karesi, profil rengiyle): profil kartında da aynı kimlik
      const kr = el("span", "karakter", on);
      kr.setAttribute("aria-hidden", "true");
      kr.style.backgroundImage = `url(${karakterSayfasi(karakter, renk)})`;
    }
    el("b", "", on, gorunenAd).title = gorunenAd;
    el("div", "renk-cizgi", on);
    el("div", "yt k-e16", on, cerceve ? `Çerçeve: ${gorunumAdi(cerceve)}` : "Çerçeve yok");
  };
  // Arma: 6 element simgesi + Ocak'ta dövülen armalar (harita açıksa, /api/ocak). H-7: 3 sütun, ad hücreye sığar.
  el("label", "", kart, "Arma").id = "l-arma";
  const armaKap = el("div", "", kart);
  const armaCiz = (dovulen: { id: string; usta: boolean }[]) => {
    armaKap.replaceChildren();
    const secenekler = [...ELEMENT_CARKI, ...dovulen.map((x) => x.id)];
    if (!secenekler.includes(arma)) arma = "kor";
    const g = radyoGrubu(armaKap, "Arma", secenekler, (v, d) => {
      if (v.startsWith("arma-")) {
        const im = el("img", "dovulen", d); im.src = GORUNUM_IKON(v); im.alt = "";
        el("span", "", d, gorunumAdi(v).replace(/^Cevher /i, "")); // düğmede kısa ad; tam ad title'da
        d.title = `Dövülen arma: ${gorunumAdi(v)}${dovulen.find((x) => x.id === v)?.usta ? " (Usta işi)" : ""}`;
        d.setAttribute("aria-label", `Arma: ${gorunumAdi(v)}, Ocak'ta dövüldü`);
        d.dataset["dovulenArma"] = v;
      } else {
        const e = el("span", "k-el", d); e.dataset["el"] = v;
        el("span", "", d, ELEMENT_RENK[v as ElementAdi].ad);
        d.setAttribute("aria-label", `Arma: ${ELEMENT_RENK[v as ElementAdi].ad}`);
      }
    }, (v) => { arma = v; guncelle(); }, arma);
    g.classList.add("arma");
  };
  armaCiz([]);
  el("label", "", kart, "Renk");
  radyoGrubu(kart, "Renk", RENKLER, (v, d) => {
    const k = RENKLER.indexOf(v);
    d.innerHTML = `<span class="renk" style="background:${v}"></span>`; // renk adı ARIA'da (sadelik § 2.9)
    d.title = RENK_AD[k]!;
    d.setAttribute("aria-label", `Renk: ${RENK_AD[k]}`);
  }, (v) => { renk = v; guncelle(); }, (RENKLER as readonly string[]).includes(renk) ? (renk as (typeof RENKLER)[number]) : RENKLER[0]);
  // K-15: destek kanalı her zaman görünür, ne olduğu tek cümleyle
  const l = el("label", "", kart, "Destek kanalı (isteğe bağlı)");
  l.htmlFor = "a-kanal";
  el("p", "aciklama", kart, "Desteklediğin Kick yayıncısının kanal adı. Yalnız profilinde görünür; oyuna etkisi yok.");
  const kanal = el("input", "k-alan", kart);
  kanal.type = "text";
  kanal.id = "a-kanal";
  kanal.maxLength = 25;
  kanal.placeholder = "Kick kanal adı";
  kanal.value = ben.oyuncu.destekKanali ?? "";
  kanal.dataset["eylem"] = "destek-kanali";
  // Harita (13 § 2, 12 § 3, 04 § 6): KARAKTER (4 gövde), çerçeve (Ocak/başarım görünümü), vitrin (3 üretilmiş parça), Ustalık rozetleri
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
    }, (v) => { karakter = Number(v); guncelle(); }, String(Math.max(0, Math.min(3, karakter))) as "0" | "1" | "2" | "3");
    if (ben.ustalik) el("div", "ipucu", kart, `Madencilik ${ben.ustalik.madencilik} · İşleme ${ben.ustalik.isleme}`).dataset["ustalik"] = "1";
    const ek = el("div", "", kart);
    void apiGet<{ gorunumler: { id: string; usta: boolean }[]; uretilenler: { anahtar: string; ad: string; deger: number }[]; vitrin: string[] }>("/api/ocak").then((o) => {
      // HARITA-KOD kalan iş: Ocak'ta dövülen armalar profilde seçilebilir
      const dov = o.gorunumler.filter((x) => x.id.startsWith("arma-"));
      if (dov.length) armaCiz(dov);
      const cer = o.gorunumler.filter((x) => x.id.startsWith("cerceve-"));
      el("label", "", ek, "Çerçeve");
      const sc = el("select", "k-alan", ek);
      sc.dataset["cerceve"] = "1";
      for (const [v, ad] of [["", "Yok"], ...cer.map((x) => [x.id, `${gorunumAdi(x.id)}${x.usta ? " ✦" : ""}`])] as [string, string][]) {
        const op = el("option", "", sc, ad); op.value = v; if (v === (cerceve ?? "")) op.selected = true;
      }
      if (!cer.length) el("div", "ipucu", ek, "Ocak'ta çerçeve dövünce burada seçersin.");
      sc.addEventListener("change", () => { cerceve = sc.value || null; guncelle(); });
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
  guncelle();
  // K-14: sol panelde topaç (kimlik ekranlarıyla aynı Çekirdek çizimi)
  const tp = cekirdekIllustrasyonu(36);
  tp.classList.add("pf-topac");
  sol.appendChild(tp);
  const h = el("div", "hata", sol);
  h.setAttribute("role", "alert");
  const d = el("button", "k-dugme ana", sol, duzenle ? "Kaydet" : "Başla");
  d.type = "button";
  d.dataset["eylem"] = duzenle ? "profil-kaydet" : "basla";
  d.addEventListener("click", async () => {
    h.textContent = "";
    const k = kanal.value.trim();
    if (k && !/^[A-Za-z0-9_]{1,25}$/.test(k)) { h.textContent = "Kanal adında yalnız harf, rakam ve alt çizgi olabilir."; kanal.focus(); return; }
    d.disabled = true;
    try {
      // tek KAYDET (K-15): ad değiştiyse önce ad (30 gün kuralı sunucuda); hata ad alanının altında, kayıt durur
      if (adGiris && adH && adGiris.value.trim() !== ben.oyuncu.ad) {
        adH.textContent = "";
        adGiris.removeAttribute("aria-invalid");
        const r = await apiIstek<{ ok: boolean; ad: string; kalanGun?: number }>("PATCH", "/api/ad", { ad: adGiris.value });
        if (r.durum !== 200) {
          const kod = r.veri.hata ?? "bicim";
          adH.textContent = (HESAP_HATA[kod] ?? HESAP_HATA["bicim"]!) + (kod === "sure" && r.veri.kalanGun ? ` ${r.veri.kalanGun} gün sonra tekrar deneyebilirsin.` : "");
          adH.dataset["hataKodu"] = kod;
          adGiris.setAttribute("aria-invalid", "true");
          adGiris.focus();
          return;
        }
        ben.oyuncu.ad = r.veri.ad;
      }
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
  kaydirmaIpucu(kart);
  queueMicrotask(() => d.focus());
}

/** Görünüm kimliği → okunur ad ("arma-cevher-kor" → "Kor", "cerceve-ayaz-gecidi" → "Ayaz Gecidi"). */
function gorunumAdi(id: string): string {
  return id.replace(/^(arma|cerceve)-/, "").replace(/^cevher-/, "").split("-").map((w) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1)).join(" ");
}
