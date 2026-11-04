import type { EkranBaglami } from "../main.ts";
import { type BasarimGorunumu, apiGet, git } from "../hesap.ts";
import { KATEGORI_AD } from "../../paylasilan/kurallar/basarim.ts";
import { ZORLUK_AD } from "../../paylasilan/kurallar/ekonomi.ts";
import { el } from "./arayuz.ts";
import { COIN_SVG, KILIT_SVG, refStilEkle } from "./referansStil.ts";

// Başarımlar (D7, 03 § 4, ux § 7, referans görsel 05): tam çerçeve panel, üst bantta BAŞARIMLAR (◄ geri: G-15, X yalnız
// modalda), kategori sekmeleri (Yol · Bitiş · Element · Risk · Gösteri · Kararma (gizli) · Sosyal · Yapay · Gizli),
// 4 sütun kart ızgarası: altıgen kalkan rozet, ad, zorluk rozeti (Kolay/Orta/Zor/Efsane), turuncu ilerleme çubuğu +
// asma kilit, tamamlananda ✔ + tarih, ödül (Altın + açılan parça + "Markete git"); gizli "???" (ipucu yok).
// "Market'te açıldı" kartı sonuç ekranında (tide C-14), burada kart üzerinde "Markete git".

const STIL = `
.bs { padding:1rem 1.4rem 1.6rem; }
.bs .ic { width:min(78rem,100%); margin:0 auto; }
.bs .cerceve { padding:.8rem 1rem 1.1rem; }
.bs .sekmeler { display:flex; gap:.35rem; margin:0 0 .8rem; flex-wrap:wrap; }
.bs .sekme { flex:1; min-width:6.5rem; padding:.55rem .4rem; background:#151a2a; color:#b8bdd0; border:none; cursor:pointer;
  box-shadow:inset 0 0 0 2px #4b5270, inset 0 0 0 3px var(--r-ic); font:900 .9rem/1 "Trebuchet MS",system-ui; letter-spacing:2px; text-transform:uppercase; }
.bs .sekme[aria-selected=true] { background:#262d47; color:#fff; box-shadow:inset 0 0 0 2px var(--r-edge), inset 0 0 0 3px var(--r-ic), inset 0 -4px 0 3px var(--r-accent); }
.bs .sekme small { display:block; margin-top:.25rem; font:700 .62rem/1 system-ui; letter-spacing:0; color:#8d93a8; }
.bs .izg { display:grid; grid-template-columns:repeat(4, 1fr); gap:.7rem; }
.bs .kart { position:relative; display:grid; grid-template-columns:4.4rem 1fr; gap:.2rem .6rem; padding:.6rem .65rem; background:#1d2338; min-height:7.6rem;
  box-shadow:inset 0 0 0 2px #4b5270, inset 0 0 0 3px var(--r-ic); }
.bs .kart.tamam { box-shadow:inset 0 0 0 2px var(--r-gold), inset 0 0 0 3px var(--r-ic); background:#232a44; }
.bs .kart.sifir { background:#1a1d29; filter:saturate(.25); opacity:.78; }
.bs .kart.gizli { background:#12131b; }
.bs .kart.pasif { background:#16181f; opacity:.6; filter:grayscale(1); }
.bs .kart .rozetK { grid-row:span 3; display:flex; align-items:center; justify-content:center; }
.bs .kart h4 { margin:0; font:900 .86rem/1.15 "Trebuchet MS",system-ui; letter-spacing:1px; text-transform:uppercase; color:#fff; }
.bs .kart .ac { font-size:.72rem; color:#c2c6d6; line-height:1.25; }
.bs .kart .ilr { display:flex; align-items:center; gap:.4rem; font:800 .72rem/1 system-ui; }
.bs .kart .ilr .cubukc { flex:1; height:.55rem; }
.bs .kart .odl { grid-column:1 / -1; display:flex; align-items:center; gap:.35rem; flex-wrap:wrap; font-size:.7rem; color:#e2c98e; margin-top:.15rem; }
.bs .kart .odl a { color:var(--r-accent); font-weight:900; }
.bs .kart .zr { position:absolute; right:.5rem; top:.45rem; }
.bs .rozet.kolay { background:#173524; color:var(--r-yesil); box-shadow:inset 0 0 0 1px #3f8f60; }
.bs .rozet.orta { background:#1a2a44; color:#8fc3ff; box-shadow:inset 0 0 0 1px #2f5f9a; }
.bs .rozet.zor { background:#3a2410; color:#ffb070; box-shadow:inset 0 0 0 1px #a8572a; }
.bs .rozet.efsane { background:#33163f; color:#e0a2ff; box-shadow:inset 0 0 0 1px #6a3a8a; }
.bs .bos { padding:.8rem 1rem; margin-bottom:.8rem; text-align:center; font-weight:800; color:#ffcf9a; background:#2a1814; box-shadow:inset 0 0 0 2px var(--r-accent); }
.bs .ozet { color:#b8bdd0; font-size:.8rem; margin:-.3rem 0 .6rem; text-align:center; }
`;

const KAT_RENK: Record<string, [string, string]> = {
  yol: ["#e8762f", "#7c3d1c"], bitis: ["#e8452c", "#7a1d12"], element: ["#5bd1a5", "#1f6b52"], risk: ["#f7d83a", "#8a6a08"],
  gosteri: ["#c58bff", "#4a2a6a"], kararma: ["#8a5cb8", "#1a0f26"], sosyal: ["#2fb8e8", "#14286b"], yapay: ["#9fb3c8", "#4d5d6b"], gizli: ["#7a7f90", "#22252f"],
};
const KAT_IKON: Record<string, string> = {
  yol: "M16 7 22 13 19 13 19 22 13 22 13 13 10 13Z", bitis: "M10 9 22 21M22 9 10 21", element: "M16 8C19 11 21 13 20.5 17 20 20 18 22 16 22 13 22 11.5 20 11.6 17.4 11.8 15.4 13 14.5 13.5 12.8 14.6 14.4 14.8 15.6 15.6 16.2 16.2 14 16.8 11.4 16 8Z",
  risk: "M16 8 23 21H9Z", gosteri: "M16 8l2.4 5 5.4.6-4 3.7 1.1 5.3L16 20l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6Z", kararma: "M12 9 20 13 13 16 21 21",
  sosyal: "M11 13a2.5 2.5 0 1 0 0 .1M21 13a2.5 2.5 0 1 0 0 .1M8 21c1-3 5-3 6 0M18 21c1-3 5-3 6 0", yapay: "M12 10h8v8h-8ZM16 7v3M16 18v3M9 14h3M20 14h3", gizli: "M13 12a3 3 0 1 1 3 3v2M16 20v1",
};

/** Altıgen kalkan rozet (görsel 05): kategori rengi; tamamlanmamış soluk, gizli koyu. */
function kalkan(kat: string, durum: "tamam" | "acik" | "sifir" | "gizli", boyut = 62): string {
  const [orta, koyu] = durum === "gizli" ? ["#2a2d38", "#15161d"] : KAT_RENK[kat] ?? KAT_RENK["gizli"]!;
  const kenar = durum === "tamam" ? "#fcd35a" : "#c08e52";
  const ikon = durum === "gizli" ? KAT_IKON["gizli"]! : KAT_IKON[kat] ?? "";
  const dolu = kat === "element" || kat === "risk" || kat === "gosteri" || kat === "yol" || kat === "yapay";
  return `<svg viewBox="0 0 32 32" width="${boyut}" height="${boyut}" aria-hidden="true"><path d="M16 1.5 28.5 8.5v14L16 30.5 3.5 22.5v-14Z" fill="#1a0f08" stroke="${kenar}" stroke-width="2"/>
    <path d="M16 4.6 26 10.2v11L16 27.4 6 21.2v-11Z" fill="${koyu}"/><path d="M16 6.5 24.2 11v9.2L16 25.4 7.8 20.2V11Z" fill="${orta}" opacity="${durum === "sifir" ? 0.45 : 0.9}"/>
    <path d="${ikon}" fill="${dolu ? "#fff7e0" : "none"}" stroke="#1a0f08" stroke-width="${dolu ? 0.9 : 2.2}" stroke-linecap="round" stroke-linejoin="round"/>
    ${dolu ? "" : `<path d="${ikon}" fill="none" stroke="#fff7e0" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`}</svg>`;
}

export async function baslat(b: EkranBaglami): Promise<void> {
  const ben = b.ben;
  if (!ben?.girisli) { git("karsilama"); return; }
  refStilEkle();
  const v = await apiGet<{ kategoriler: string[]; basarimlar: BasarimGorunumu[] }>("/api/basarimlar");
  new BasarimEkrani(b.ustYazi, v.kategoriler, v.basarimlar);
}

class BasarimEkrani {
  private kok = el("div", "rf bs");
  private stil = el("style");
  private secili: string;

  constructor(ust: HTMLElement, private kategoriler: string[], private liste: BasarimGorunumu[]) {
    this.stil.textContent = STIL;
    document.head.appendChild(this.stil);
    ust.appendChild(this.kok);
    this.kok.setAttribute("role", "main");
    this.kok.setAttribute("aria-label", "Başarımlar");
    const q = new URLSearchParams(location.search).get("k");
    this.secili = q && kategoriler.includes(q) ? q : "yol";
    (window as unknown as { __basarimlar: BasarimEkrani }).__basarimlar = this;
    window.addEventListener("keydown", (e) => { if (e.key === "Escape" || (e.key === "Backspace" && !(e.target instanceof HTMLInputElement))) { e.preventDefault(); git("atolye"); } });
    this.ciz();
  }

  get veri(): BasarimGorunumu[] { return this.liste; }

  sekmeSec(k: string): void { this.secili = k; this.ciz(); this.kok.querySelector<HTMLButtonElement>(`[data-sekme="${k}"]`)?.focus(); }

  private ciz(): void {
    this.kok.innerHTML = "";
    const ic = el("div", "ic", this.kok);
    const cer = el("div", "cerceve panel pah", ic);
    const ub = el("div", "ustbant", cer);
    const geri = el("button", "geriK pah", ub, "◄");
    geri.setAttribute("aria-label", "Geri: Atölye");
    geri.addEventListener("click", () => git("atolye"));
    el("h2", "", ub, "Başarımlar");
    const tamamSay = this.liste.filter((x) => x.tamam).length;
    const sayac = el("div", "cuzdan", ub);
    sayac.innerHTML = `<div><b>TAMAM</b><span data-tamam>${tamamSay}/${this.liste.length}</span></div>`;
    if (!this.liste.some((x) => x.tamam || x.ilerleme > 0)) el("div", "bos pah", cer, "Henüz başarım yok. İlk maçını oyna.").setAttribute("role", "status");
    // sekmeler
    const sk = el("div", "sekmeler", cer);
    sk.setAttribute("role", "tablist");
    sk.setAttribute("aria-label", "Başarım kategorileri");
    const dugmeler: HTMLButtonElement[] = [];
    for (const k of this.kategoriler) {
      const ogeler = this.liste.filter((x) => x.kategori === k);
      if (!ogeler.length) continue;
      const gorunurYok = ogeler.every((x) => !x.gorunur);
      const ad = k === "kararma" && gorunurYok ? "???" : KATEGORI_AD[k] ?? k;
      const d = el("button", "sekme pah", sk);
      d.setAttribute("role", "tab");
      d.dataset["sekme"] = k;
      d.setAttribute("aria-selected", String(k === this.secili));
      d.tabIndex = k === this.secili ? 0 : -1;
      d.innerHTML = `${ad}<small>${ogeler.filter((x) => x.tamam).length}/${ogeler.length}</small>`;
      d.setAttribute("aria-label", `${k === "kararma" && gorunurYok ? "Gizli kategori" : KATEGORI_AD[k]}: ${ogeler.filter((x) => x.tamam).length} / ${ogeler.length} tamam`);
      d.addEventListener("click", () => this.sekmeSec(k));
      dugmeler.push(d);
    }
    sk.addEventListener("keydown", (e) => {
      const i = dugmeler.indexOf(document.activeElement as HTMLButtonElement);
      if (i < 0 || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
      e.preventDefault();
      const j = (i + (e.key === "ArrowRight" ? 1 : -1) + dugmeler.length) % dugmeler.length;
      this.sekmeSec(dugmeler[j]!.dataset["sekme"]!);
    });
    const ogeler = this.liste.filter((x) => x.kategori === this.secili);
    const izg = el("div", "izg", cer);
    izg.setAttribute("role", "tabpanel");
    izg.setAttribute("aria-label", KATEGORI_AD[this.secili] ?? this.secili);
    for (const x of ogeler) this.kart(izg, x);
  }

  private kart(izg: HTMLElement, x: BasarimGorunumu): void {
    const durum = !x.gorunur ? "gizli" : x.tamam ? "tamam" : x.ilerleme > 0 ? "acik" : "sifir";
    const k = el("div", `kart pah ${durum === "acik" ? "" : durum}${!x.ilkSurum ? " pasif" : ""}`, izg);
    k.dataset["basarim"] = x.id;
    k.dataset["durum"] = durum;
    k.tabIndex = 0;
    const tarih = x.tamamTarihi ? new Date(x.tamamTarihi).toLocaleDateString("tr-TR") : "";
    k.setAttribute("aria-label", !x.gorunur ? "Gizli başarım. İpucu yok."
      : `${x.ad}. ${x.aciklama} ${x.tamam ? `Tamamlandı${tarih ? ` ${tarih}` : ""}.` : `İlerleme ${x.ilerleme}/${x.sayi}.`} ${ZORLUK_AD[x.zorluk]}. Ödül ${x.odulAltin} Altın${x.acilanParcalar.length ? `, Market'te açılır: ${x.acilanParcalar.map((p) => p.ad).join(", ")}` : ""}.${!x.ilkSurum ? " Sezon 2." : ""}`);
    el("div", "rozetK", k).innerHTML = kalkan(x.kategori, durum);
    el("h4", "", k, x.ad);
    el("div", "ac", k, x.gorunur ? x.aciklama : "Gizli başarım.");
    const ilr = el("div", "ilr", k);
    if (x.tamam) ilr.innerHTML = `<span class="rozet sende">✔ Tamam</span><span class="yt">${tarih}</span>`;
    else if (x.gorunur) ilr.innerHTML = `<span class="cubukc"><i style="width:${x.sayi ? Math.round((x.ilerleme / x.sayi) * 100) : 0}%"></i></span><span>${x.ilerleme}/${x.sayi}</span>${KILIT_SVG(16)}`;
    else ilr.innerHTML = `<span class="cubukc"></span>${KILIT_SVG(16)}`;
    if (x.gorunur) {
      el("span", `rozet zr ${x.zorluk}`, k, x.ilkSurum ? ZORLUK_AD[x.zorluk] : "Sezon 2");
      const od = el("div", "odl", k);
      od.innerHTML = `${COIN_SVG(14)} ${x.odulAltin} Altın`;
      for (const p of x.acilanParcalar) {
        const s = el("span", "", od, ` · ${x.tamam ? "Market'te açıldı" : "Açar"}: `);
        el("b", "", s, p.ad);
        if (x.tamam) {
          const a = el("a", "", od, "Markete git");
          a.href = `?ekran=market&parca=${p.id}`;
          a.dataset["marketeGit"] = p.id;
        }
      }
      if (x.acilanOzellik.includes("takim-yuvasi-4")) el("span", "", od, " · 4. takım yuvası");
      if (x.acilanOzellik.includes("yenileme-indirimi-50")) el("span", "", od, " · Yapay yenileme %50 indirim");
      if (x.acilanOzellik.includes("market")) el("span", "", od, " · Market");
    }
  }
}
