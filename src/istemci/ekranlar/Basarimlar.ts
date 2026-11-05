import type { EkranBaglami } from "../main.ts";
import { type BasarimGorunumu, apiGet, git } from "../hesap.ts";
import { KATEGORI_AD } from "../../paylasilan/kurallar/basarim.ts";
import { ZORLUK_AD } from "../../paylasilan/kurallar/ekonomi.ts";
import { el, lentoKur, stilEkle } from "./arayuz.ts";
import { refStilEkle } from "./referansStil.ts";

const COIN_SVG = (_b = 0): string => `<span class="k-sikke" aria-hidden="true"></span>`;
const KILIT_SVG = (_b = 0): string => `<span class="k-kilit" aria-hidden="true"></span>`;

// Başarımlar (D7, 03 § 4, ux § 7, referans görsel 05): tam çerçeve panel, üst bantta BAŞARIMLAR (◄ geri: G-15, X yalnız
// modalda), kategori sekmeleri (Yol · Bitiş · Element · Risk · Gösteri · Kararma (gizli) · Sosyal · Yapay · Gizli),
// 4 sütun kart ızgarası: altıgen kalkan rozet, ad, zorluk rozeti (Kolay/Orta/Zor/Efsane), turuncu ilerleme çubuğu +
// asma kilit, tamamlananda ✔ + tarih, ödül (Altın + açılan parça + "Markete git"); gizli "???" (ipucu yok).
// "Market'te açıldı" kartı sonuç ekranında (tide C-14), burada kart üzerinde "Markete git".

const STIL = `
.bs.k-zemin { display:flex; flex-direction:column; }
.bs .ic { flex:1; display:flex; flex-direction:column; padding:calc(8 * var(--p)) var(--kenar) var(--kenar); gap:0; }
.bs .sekmeler { display:flex; gap:calc(2 * var(--p)); margin:0; padding:0 calc(2 * var(--p)); position:relative; z-index:1; }
.bs .sekme { flex:1; min-width:0; min-height:calc(22 * var(--p)); padding:calc(3 * var(--p)) calc(4 * var(--p)); margin:0; cursor:pointer; border:var(--p) solid var(--harc); border-bottom:0; border-radius:0;
  background:var(--panel-0) var(--k-doku-normal) 0 0 / calc(32 * var(--p)); color:var(--soluk); box-shadow:inset 0 0 0 var(--p) #3a3f55, var(--odak-g, 0 0 0 0 transparent);
  font:400 var(--y-16)/.75 var(--font-etiket); text-transform:uppercase; display:flex; flex-direction:column; align-items:center; gap:var(--p); }
.bs .sekme[aria-selected=true] { color:var(--ink); background:var(--panel); min-height:calc(24 * var(--p)); margin-bottom:calc(-1 * var(--p));
  box-shadow:inset var(--p) var(--p) 0 0 var(--gold), inset calc(-1 * var(--p)) 0 0 0 var(--gold), var(--odak-g, 0 0 0 0 transparent); }
.bs .sekme small { font-size:var(--y-16); color:var(--soluk); }
.bs .cerceve { flex:1; padding:calc(8 * var(--p)); }
.bs .izg { display:grid; grid-template-columns:repeat(4, 1fr); gap:calc(8 * var(--p)); align-content:start; }
.bs .kart { position:relative; display:grid; grid-template-columns:calc(26 * var(--p)) 1fr; grid-template-rows:auto auto 1fr auto; gap:calc(2 * var(--p)) calc(6 * var(--p)); padding:calc(6 * var(--p));
  min-height:calc(64 * var(--p)); background:var(--hucre); border:var(--p) solid var(--harc); box-shadow:inset 0 var(--p) 0 0 var(--hucre-isik), inset 0 0 0 calc(2 * var(--p)) #2e3550, var(--odak-g, 0 0 0 0 transparent); text-transform:uppercase; }
.bs .kart.tamam { box-shadow:inset 0 0 0 var(--p) var(--gold), var(--odak-g, 0 0 0 0 transparent); }
.bs .kart.tamam::before { content:""; position:absolute; inset:calc(-4 * var(--p)); pointer-events:none; --c:var(--gold); --u:calc(6 * var(--p)); --k:var(--p);
  background:linear-gradient(var(--c),var(--c)) 0 0 / var(--u) var(--k) no-repeat, linear-gradient(var(--c),var(--c)) 0 0 / var(--k) var(--u) no-repeat, linear-gradient(var(--c),var(--c)) 100% 0 / var(--u) var(--k) no-repeat, linear-gradient(var(--c),var(--c)) 100% 0 / var(--k) var(--u) no-repeat,
    linear-gradient(var(--c),var(--c)) 0 100% / var(--u) var(--k) no-repeat, linear-gradient(var(--c),var(--c)) 0 100% / var(--k) var(--u) no-repeat, linear-gradient(var(--c),var(--c)) 100% 100% / var(--u) var(--k) no-repeat, linear-gradient(var(--c),var(--c)) 100% 100% / var(--k) var(--u) no-repeat; }
.bs .kart.sifir, .bs .kart.gizli { background:#171a24; color:var(--kilitli-yazi); }
.bs .kart.pasif { opacity:.6; filter:grayscale(1); }
.bs .kart .rozetK { grid-row:1 / 3; display:flex; align-items:flex-start; justify-content:center; }
.bs .kart.sifir .k-kalkan, .bs .kart.gizli .k-kalkan { filter:grayscale(1) brightness(.6); }
.bs .kart h4 { margin:0; font:400 var(--y-16)/.75 var(--font-etiket); color:var(--ink); }
.bs .kart.sifir h4, .bs .kart.gizli h4 { color:var(--kilitli-yazi); }
.bs .kart .ac { display:none; }
.bs .kart .ilr { grid-column:1 / -1; grid-row:4; display:grid; grid-template-columns:1fr auto; gap:calc(2 * var(--p)) calc(4 * var(--p)); align-items:center; }
.bs .kart .ilr .sayi { grid-column:1 / -1; grid-row:1; color:var(--soluk); }
.bs .kart .ilr .cubukc { height:calc(7 * var(--p)); }
.bs .kart.tamam .ilr .cubukc i { background:repeating-linear-gradient(90deg, var(--gold) 0 calc(3 * var(--p)), transparent calc(3 * var(--p)) calc(4 * var(--p))); }
.bs .kart .ilr .tamamY { color:var(--gold); }
.bs .kart .odl { grid-column:2; grid-row:2 / 4; display:flex; align-items:flex-start; gap:calc(2 * var(--p)); flex-wrap:wrap; color:#e2c98e; line-height:.875; }
.bs .kart.sifir .odl, .bs .kart.gizli .odl { color:var(--kilitli-yazi); }
.bs .kart .odl b { font-weight:400; color:var(--gold); }
.bs .kart .odl a { color:var(--turuncu); }
.bs .kart .zr { display:none; }
.bs .bos { padding:calc(6 * var(--p)); margin:0 0 calc(6 * var(--p)); text-align:center; color:#ffb070; background:#2a1610; box-shadow:inset 0 0 0 var(--p) var(--turuncu); text-transform:uppercase; }
.bs .alt-serit { display:flex; align-items:flex-end; gap:calc(8 * var(--p)); margin-top:calc(8 * var(--p)); min-height:calc(36 * var(--p)); }
.bs .alt-serit .son { margin-right:auto; color:var(--gold); text-transform:uppercase; }
html[data-yazi-buyuk] .bs .izg { grid-template-columns:repeat(2, 1fr); }
`;
const KAT_EL: Record<string, string> = { yol: "kaya", bitis: "kor", element: "kasirga", risk: "simsek", gosteri: "girdap", sosyal: "don", yapay: "don", kararma: "girdap" };

/** Kalkan rozet (pixel sprite; tamamlanmamış soluk, gizli gri) + kategori simgesi. */
function kalkan(kat: string, durum: "tamam" | "acik" | "sifir" | "gizli"): string {
  const e = durum === "gizli" ? "" : KAT_EL[kat] ?? "";
  return `<span class="k-kalkan x2" aria-hidden="true">${e ? `<span class="k-el" data-el="${e}"></span>` : ""}</span>`;
}

export async function baslat(b: EkranBaglami): Promise<void> {
  const ben = b.ben;
  if (!ben?.girisli) { git("karsilama"); return; }
  stilEkle();
  refStilEkle();
  const v = await apiGet<{ kategoriler: string[]; basarimlar: BasarimGorunumu[] }>("/api/basarimlar");
  new BasarimEkrani(b.ustYazi, v.kategoriler, v.basarimlar);
}

class BasarimEkrani {
  private kok = el("div", "rf bs k-zemin");
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
    const lento = lentoKur(this.kok, { baslik: "Başarımlar", geri: "atolye" });
    const tamamSay = this.liste.filter((x) => x.tamam).length;
    const sayac = el("div", "k-plaka kucuk", lento);
    sayac.setAttribute("aria-label", `Tamamlanan ${tamamSay} / ${this.liste.length}`);
    el("span", "", sayac, `Tamam ${tamamSay}/${this.liste.length}`).dataset["tamam"] = "1";
    lento.insertBefore(sayac, lento.querySelector(".k-cuzdan"));
    const ic = el("div", "ic", this.kok);
    if (!this.liste.some((x) => x.tamam || x.ilerleme > 0)) el("div", "bos", ic, "Henüz başarım yok. İlk maçını oyna.").setAttribute("role", "status");
    // sekmeler
    const sk = el("div", "sekmeler", ic);
    const cer = el("div", "cerceve k-panel", ic);
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
    // alt şerit (b-basarimlar): son açılan parça + MARKETE GİT ana (yalnız açılmış parça varsa)
    const serit = el("div", "alt-serit", ic);
    const son = [...this.liste].filter((x) => x.tamam && x.acilanParcalar.length).sort((a, b) => (b.tamamTarihi ?? 0) > (a.tamamTarihi ?? 0) ? 1 : -1)[0];
    el("span", "son k-e16", serit, son ? `${son.ad} · Market'te açıldı` : "");
    if (son) {
      const d = el("button", "k-dugme ana", serit, "Markete git");
      d.dataset["eylem"] = "markete-git";
      d.addEventListener("click", () => git("market", `&parca=${son.acilanParcalar[0]!.id}`));
    }
  }

  private kart(izg: HTMLElement, x: BasarimGorunumu): void {
    const durum = !x.gorunur ? "gizli" : x.tamam ? "tamam" : x.ilerleme > 0 ? "acik" : "sifir";
    const k = el("div", `kart ${durum === "acik" ? "" : durum}${!x.ilkSurum ? " pasif" : ""}`, izg);
    k.dataset["basarim"] = x.id;
    k.dataset["durum"] = durum;
    k.tabIndex = 0;
    const tarih = x.tamamTarihi ? new Date(x.tamamTarihi).toLocaleDateString("tr-TR") : "";
    k.setAttribute("aria-label", !x.gorunur ? "Gizli başarım. İpucu yok."
      : `${x.ad}. ${x.aciklama} ${x.tamam ? `Tamamlandı${tarih ? ` ${tarih}` : ""}.` : `İlerleme ${x.ilerleme}/${x.sayi}.`} ${ZORLUK_AD[x.zorluk]}. Ödül ${x.odulAltin} Altın${x.acilanParcalar.length ? `, Market'te açılır: ${x.acilanParcalar.map((p) => p.ad).join(", ")}` : ""}.${!x.ilkSurum ? " Sezon 2." : ""}`);
    el("div", "rozetK", k).innerHTML = kalkan(x.kategori, durum);
    el("h4", "", k, x.gorunur ? x.ad : "???");
    el("div", "ac", k, x.gorunur ? x.aciklama : "Gizli başarım.");
    const ilr = el("div", "ilr", k);
    if (x.tamam) ilr.innerHTML = `<span class="sayi tamamY">Tamam <span class="yt">${tarih}</span></span><span class="cubukc"><i style="width:100%"></i></span>`;
    else if (x.gorunur) ilr.innerHTML = `<span class="sayi">${x.ilerleme}/${x.sayi}</span><span class="cubukc"><i style="width:${x.sayi ? Math.round((x.ilerleme / x.sayi) * 100) : 0}%"></i></span>${x.ilerleme > 0 ? "" : KILIT_SVG(16)}`;
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
