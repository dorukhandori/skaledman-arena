import { DURUM, YILDIZ_AD, enKisaYol, yonsuzKomsular } from "../../paylasilan/kurallar/harita.ts";
import { HARITA, MADENLER, type YildizSartKodu } from "../../paylasilan/veri/harita.ts";
import { takimKoduYaz, takimProfilleriKimlikten } from "../../paylasilan/veri/takimlar.ts";
import type { EkranBaglami } from "../main.ts";
import { BakimHatasi, apiGet, apiPost, git, oku, sakla } from "../hesap.ts";
import { ELEMENT_RENK, renkCss } from "../oyun/renkler.ts";
import { bakimKatmani, cuzdanYaz, ekranKok, el } from "./arayuz.ts";
import { type Ipucu } from "../bilgic/ipuclari.ts";
import { ipucuBas, ipucuSec } from "../bilgic/haritaIpucu.ts";
import { CEVHER_IKON, DUGUM_IKON, KARAKTER_KARE, KILIT_IKON, type KarakterAnim, animKaresi, karakterSayfasi, kareKonumu } from "./haritaVarlik.ts";

// Harita ekranı (docs/design/harita/07 § 2–3, 13): bölge başına sabit kamera düğüm haritası (480×270 mantıksal ızgara,
// SVG), oyuncu KARAKTERİ (yer tutucu: 3 dikdörtgen + taşıdığı aktif topaç; sanat hattı 10 § 3.6), açık düğüme dokununca
// yol boyunca yürüme (kenar başına 0,3 sn, en çok 1,2 sn; dokunuş/ana düğme atlatır; "hareketi azalt" → solup belirme),
// 3 çentikli Kuşak halkası (KEŞFET/TEMİZLE/USTALAŞ), keşfedilmemiş açık düğümde "!", alt şeritte düğüm detayı + tek ana
// düğme (DÖVÜŞ / KAZ / AÇ), sayaç rozetleri, mini profil şeridi. Stil/asset en sonda (10): metin rozetleri + kademe rengi.
// Seçiciler (araçlar): [data-dugum], [data-karakter], [data-eylem=ana|onceki|sonraki|profil], [data-serit], [data-bolge].

interface DugumG {
  id: string; tur: "dusman" | "patron" | "maden" | "sandik"; konum: [number, number]; durum: number; asama: string; onKosul: string[];
  ad?: string | null; zorluk?: number; yildiz?: number; sartlar?: { id: YildizSartKodu; ad: string; alindi: boolean }[];
  odul?: { altinYildiz?: number; cevherYildiz?: { kademe: number; adet: number }; altinIlk?: number; kulceIlk?: { kademe: number; adet: number }; altin?: number; cevher?: { kademe: number; adet: number } };
  kademe?: number; kademeAd?: string; esik?: number; kapasite?: number; kalanVurus?: number; basariliVurus?: number; ustaDamar?: boolean; acildi?: boolean;
}
interface BolgeG {
  id: string; no: number; ad: string; element: string; acik: boolean; kilitNedeni: string | null; yildiz: { alinan: number; toplam: number };
  ilerleme: { puan: number; enCok: number; yuzde: number }; rozet: number; rozetAd: string; dugumler: DugumG[];
}
export interface HaritaG {
  acik: boolean; konum: string | null; baslangic: string; karakter: number; yildiz: { alinan: number; toplam: number }; bolgeler: BolgeG[];
  sayac: { haritaMac: { sayilan: number; tavan: number }; vurus: { bugun: number; tam: number; tavan: number } };
}

const STIL = `
.hr .kart { width:min(calc(620 * var(--p)), 100%); padding:calc(4 * var(--p)); }
.hr .hr-ust { display:flex; align-items:center; justify-content:space-between; gap:calc(4 * var(--p)); flex-wrap:wrap; }
.hr .hr-plaka { display:flex; align-items:center; gap:calc(4 * var(--p)); }
.hr .hr-plaka button { min-width:calc(24 * var(--p)); min-height:calc(24 * var(--p)); }
.hr .hr-sayac { display:flex; gap:calc(6 * var(--p)); color:var(--soluk); text-transform:uppercase; }
.hr .hr-sayac .yarim { color:#f7d83a; }
.hr .hr-alan { position:relative; width:100%; height:min(calc(150 * var(--p)), 48vh); background:#101a1e; box-shadow:inset 0 0 0 var(--p) var(--harc); margin-top:calc(3 * var(--p)); touch-action:manipulation; }
.hr .hr-alan svg { position:absolute; inset:0; width:100%; height:100%; display:block; }
.hr .hr-alan .kilitliB { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:var(--ink); background:rgba(8,12,16,.72); text-transform:uppercase; }
.hr [data-dugum] { cursor:pointer; }
.hr [data-dugum]:focus { outline:none; }
.hr [data-dugum]:focus-visible .secim { stroke:#fff; }
.hr .hr-serit { display:grid; grid-template-columns:1fr auto; gap:calc(6 * var(--p)); align-items:center; margin-top:calc(3 * var(--p)); padding:calc(4 * var(--p)) calc(6 * var(--p)); background:#11141f; box-shadow:inset 0 0 0 var(--p) var(--bronz-1); min-height:calc(46 * var(--p)); line-height:.9; }
.hr .hr-serit b { color:var(--ink); text-transform:uppercase; font-weight:400; }
.hr .hr-serit .s2, .hr .hr-serit .s3 { color:var(--soluk); }
.hr .hr-serit .s2 .dolu { color:var(--gold, #fcd35a); }
.hr .hr-serit .ipucu { color:var(--turuncu, #e8762f); }
.hr .hr-serit .vitrin { display:flex; gap:calc(3 * var(--p)); }
.hr .hr-serit .vitrin span { padding:calc(1 * var(--p)) calc(3 * var(--p)); box-shadow:inset 0 0 0 var(--p) var(--harc); }
.hr .hr-serit button.ana { min-width:calc(110 * var(--p)); min-height:calc(30 * var(--p)); }
.hr .hr-serit .sag { display:flex; flex-direction:column; gap:calc(3 * var(--p)); align-items:stretch; }
.hr .kutla { animation: hr-kutla 0.6s steps(3) 2; }
@keyframes hr-kutla { 50% { transform: translateY(-3px); } }
@media (prefers-reduced-motion: reduce) { .hr .kutla { animation:none; } }
html[data-telefon] .hr .hr-alan { height:44vh; }
html[data-telefon] .hr .hr-serit { min-height:0; padding-top:2px; padding-bottom:2px; }
html[data-telefon] .hr .hr-plaka button, html[data-telefon] .hr .hr-serit button { min-width:44px; min-height:44px; }
`;

const TUR_HARF: Record<DugumG["tur"], string> = { dusman: "D", patron: "P", maden: "M", sandik: "S" };
const TUR_AD: Record<DugumG["tur"], string> = { dusman: "DÜŞMAN", patron: "PATRON", maden: "MADEN", sandik: "SANDIK" };
const ESKI_ASAMA = "devran.haritaAsama.v1";
const BOLGE_ANAHTAR = "devran.haritaBolge.v1";
const PROFIL_RENK = ["#f4cf47", "#e3350d", "#2fb8e8", "#7fe3a0", "#c58bff", "#f2a33a"];

const kademeRengi = (k: number) => MADENLER.find((x) => x.kademe === k)?.renk.ana ?? "#8C8A88";
const kademeAdi = (k: number) => (MADENLER.find((x) => x.kademe === k)?.ad ?? "").replace(/ CEVHERİ$/, "");
const svgEl = <K extends keyof SVGElementTagNameMap>(ad: K, ust: Element, ozel: Record<string, string | number> = {}): SVGElementTagNameMap[K] => {
  const e = document.createElementNS("http://www.w3.org/2000/svg", ad);
  for (const [k, v] of Object.entries(ozel)) e.setAttribute(k, String(v));
  ust.appendChild(e);
  return e;
};
const hareketiAzalt = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true || document.documentElement.dataset["azalt"] === "1";

export function baslat(b: EkranBaglami): void {
  const ben = b.ben;
  if (!ben?.girisli) { git("karsilama"); return; }
  if (!ben.harita?.acik) { git("lobi"); return; }
  void apiGet<HaritaG>("/api/harita").then((h) => new HaritaEkrani(b, h)).catch((e) => {
    if (e instanceof BakimHatasi) bakimKatmani(() => location.reload()); else throw e;
  });
}

/** Seçili düğümün ana eylemi (07 § 3): kilitli/uzak → null. */
export function anaEylem(d: DugumG, konum: string | null): { etiket: string; tur: "dovus" | "kaz" | "ac" } | null {
  if (d.durum < DURUM.acik || konum !== d.id) return null;
  if (d.tur === "dusman" || d.tur === "patron") return { etiket: "DÖVÜŞ", tur: "dovus" };
  if (d.tur === "maden") return { etiket: "KAZ", tur: "kaz" };
  return d.acildi ? null : { etiket: "AÇ", tur: "ac" };
}

class HaritaEkrani {
  private kok: HTMLElement;
  private kart: HTMLElement;
  private alan!: HTMLElement;
  private svg!: SVGSVGElement;
  private serit!: HTMLElement;
  private bolgeNo: number;
  private secili: string | null;
  private karakterG: SVGGElement | null = null;
  private karakterXY: [number, number] = [0, 0];
  private yuruyus: { yol: [number, number][]; bas: number; sure: number; bitis: () => void } | null = null;
  private miniProfil = false;
  private mesaj = "";
  /** bu ziyaretin Pergel ipucu (bir kez; 07 § 10) */
  private ipucu: Ipucu | null | undefined;
  private kutla: Set<string> = new Set();

  constructor(private b: EkranBaglami, private h: HaritaG) {
    const r = ekranKok(b.ustYazi, "Harita", { baslik: "Harita", geri: "lobi" });
    this.kok = r.kok;
    this.kart = r.kart;
    this.kok.classList.add("hr");
    const st = el("style"); st.textContent = STIL; document.head.appendChild(st);
    const konumBolge = h.konum ? Number(h.konum.slice(1, h.konum.indexOf("-"))) : null;
    const sakli = Number(oku(BOLGE_ANAHTAR) ?? "");
    this.bolgeNo = konumBolge ?? (h.bolgeler.some((x) => x.no === sakli && x.acik) ? sakli : 1);
    this.secili = h.konum ?? this.enMantikliDugum();
    this.asamaKarsilastir();
    this.ciz();
    window.addEventListener("keydown", (e) => this.tus(e));
    let son = performance.now();
    const kare = (t: number) => { this.kare(t, t - son); son = t; requestAnimationFrame(kare); };
    requestAnimationFrame(kare);
    (window as unknown as { __harita: HaritaEkrani }).__harita = this;
  }

  get bolge(): BolgeG { return this.h.bolgeler.find((x) => x.no === this.bolgeNo) ?? this.h.bolgeler[0]!; }
  get durum(): HaritaG { return this.h; }

  /** İlk giriş: açık, tamamlanmamış, en kolay düğüm (07 § 2). */
  private enMantikliDugum(): string | null {
    const ds = this.bolge.dugumler.filter((d) => d.durum >= DURUM.acik);
    const eksik = ds.filter((d) => d.durum < DURUM.temizle);
    return (eksik[0] ?? ds[0])?.id ?? null;
  }

  /** Dönüşte (Sonuç / Maden) yükselen aşamaları bul: KUTLA + tek satır (13 § 3.4). */
  private asamaKarsilastir(): void {
    let eski: Record<string, number> = {};
    try { eski = JSON.parse(oku(ESKI_ASAMA) ?? "{}") as Record<string, number>; } catch { eski = {}; }
    const simdi: Record<string, number> = {};
    for (const b of this.h.bolgeler) for (const d of b.dugumler) simdi[d.id] = d.durum;
    if (Object.keys(eski).length) {
      for (const [id, d] of Object.entries(simdi)) if (d > (eski[id] ?? 0) && d >= DURUM.temizle) this.kutla.add(id);
      const usta = [...this.kutla].find((id) => this.dugum(id)?.tur === "maden" && simdi[id] === DURUM.ustalas);
      if (usta) this.mesaj = "USTA DAMAR: +1 KAPASİTE";
      else if (this.kutla.size) this.mesaj = `${[...this.kutla].map((id) => ["", "", "KEŞFET", "TEMİZLE", "USTALAŞ"][simdi[id]!]).pop()}!`;
    }
    sakla(ESKI_ASAMA, JSON.stringify(simdi));
  }

  private dugum(id: string | null): DugumG | undefined {
    if (!id) return undefined;
    for (const b of this.h.bolgeler) { const d = b.dugumler.find((x) => x.id === id); if (d) return d; }
    return undefined;
  }

  private durumlar(): Record<string, number> {
    return Object.fromEntries(this.bolge.dugumler.map((d) => [d.id, d.durum]));
  }

  // ---- çizim ----
  private ciz(): void {
    const k = this.kart;
    k.innerHTML = "";
    const b = this.bolge;
    const ust = el("div", "hr-ust", k);
    const pl = el("div", "hr-plaka", ust);
    const once = el("button", "k-dugme kucuk", pl, "◄");
    once.dataset["eylem"] = "onceki";
    once.setAttribute("aria-label", "Önceki bölge");
    once.disabled = b.no <= 1;
    once.addEventListener("click", () => this.bolgeDegistir(-1));
    const ad = el("h2", "k-plaka", pl, `${b.ad} · %${b.ilerleme.yuzde}${b.rozet ? ` · ◈ ${b.rozetAd}` : ""}`);
    ad.dataset["bolge"] = b.id;
    el("span", "k-e16", pl, `${b.no}/${this.h.bolgeler.length}`);
    const sonra = el("button", "k-dugme kucuk", pl, "►");
    sonra.dataset["eylem"] = "sonraki";
    sonra.setAttribute("aria-label", "Sonraki bölge");
    sonra.disabled = b.no >= this.h.bolgeler.length;
    sonra.addEventListener("click", () => this.bolgeDegistir(1));
    const sy = el("div", "hr-sayac k-e16", ust);
    const v = this.h.sayac.vurus;
    const vs = el("span", v.bugun >= v.tam ? "yarim" : "", sy, v.bugun >= v.tavan ? "⛏ KAZI BİTTİ" : `⛏ KAZI ${v.bugun}/${v.tam}${v.bugun >= v.tam ? " YARIM" : ""}`);
    vs.dataset["kazi"] = String(v.bugun);
    const m = this.h.sayac.haritaMac;
    el("span", "", sy, `⚔ ${m.sayilan}/${m.tavan}`).dataset["haritaMac"] = String(m.sayilan);
    el("span", "", sy, `★ ${b.yildiz.alinan}/${b.yildiz.toplam}`);

    this.alan = el("div", "hr-alan", k);
    this.svg = svgEl("svg", this.alan, { viewBox: "0 18 480 200", role: "group", "aria-label": `${b.ad} haritası` });
    this.yollariCiz();
    for (const d of b.dugumler) this.dugumCiz(d);
    this.karakterCiz();
    if (!b.acik) el("div", "kilitliB", this.alan, `${b.ad} · KİLİTLİ · ${b.kilitNedeni ?? ""}`);
    this.serit = el("div", "hr-serit k-e16", k);
    this.serit.dataset["serit"] = "1";
    this.seritCiz();
  }

  private yollariCiz(): void {
    const b = this.bolge;
    const g = svgEl("g", this.svg, { "aria-hidden": "true" });
    const bd = HARITA.bolgeler.find((x) => x.id === b.id)!;
    for (const d of bd.dugumler) {
      for (const k of d.komsu) {
        const h = bd.dugumler.find((x) => x.id === k);
        if (!h) continue;
        const a = this.dugum(d.id)!.durum, c = this.dugum(k)!.durum;
        const yurunmus = a >= DURUM.kesfet && c >= DURUM.kesfet;
        const acik = a >= DURUM.acik && c >= DURUM.acik;
        svgEl("line", g, {
          x1: d.konum[0], y1: d.konum[1], x2: h.konum[0], y2: h.konum[1],
          stroke: yurunmus ? "#FBBE88" : acik ? "#b07a4a" : "#3a4448", "stroke-width": yurunmus ? 3 : 2,
          "stroke-dasharray": yurunmus ? "" : acik ? "6 4" : "2 4", "data-yol": `${d.id}:${k}`,
        });
      }
    }
  }

  private dugumCiz(d: DugumG): void {
    const dis = svgEl("g", this.svg, { transform: `translate(${d.konum[0]} ${d.konum[1]})` });
    // iç grup: KUTLA CSS animasyonu dış grubun konum transform'unu ezmesin
    const g = svgEl("g", dis, { tabindex: 0, role: "button" });
    g.dataset["dugum"] = d.id;
    g.dataset["durum"] = String(d.durum);
    const kilitli = d.durum < DURUM.acik;
    g.setAttribute("aria-label", `${TUR_AD[d.tur]}${d.ad ? ` ${d.ad}` : ""} · ${d.asama}${kilitli ? " · kilitli" : ""}`);
    // isabet alanı (görünmez; ≥ 48 CSS px hedefi telefonda da)
    svgEl("circle", g, { r: 27, fill: "transparent", "data-isabet": "1" });
    // 3 çentikli Kuşak halkası: KEŞFET/TEMİZLE/USTALAŞ (sandık 2)
    const parca = d.tur === "sandik" ? 2 : 3;
    const lit = Math.max(0, Math.min(parca, d.durum - DURUM.acik));
    for (let i = 0; i < parca; i++) {
      const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / parca + 0.18, a1 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / parca - 0.18;
      const R = 14;
      svgEl("path", g, {
        d: `M ${(R * Math.cos(a0)).toFixed(2)} ${(R * Math.sin(a0)).toFixed(2)} A ${R} ${R} 0 0 1 ${(R * Math.cos(a1)).toFixed(2)} ${(R * Math.sin(a1)).toFixed(2)}`,
        fill: "none", stroke: i < lit ? "#FBBE88" : kilitli ? "#2a3236" : "#5a4a3a", "stroke-width": 2.5, "data-centik": i < lit ? "1" : "0",
      });
    }
    // zemin karesi (kademe/tür rengi) + kodla çizilmiş ikon (public/harita/**; 10 § 3.1 A1/A3)
    const renk = d.tur === "maden" ? kademeRengi(d.kademe ?? 1) : d.tur === "patron" ? "#c9a33b" : d.tur === "sandik" ? "#8a5a34" : "#7a3a2e";
    svgEl("rect", g, { x: -10, y: -10, width: 20, height: 20, fill: kilitli ? "#1b2226" : "#11141f", stroke: kilitli ? "#2c3d43" : renk, "stroke-width": 1.5 });
    const ikon = d.tur === "maden" ? CEVHER_IKON(d.kademe ?? 1) : DUGUM_IKON(d.tur, d.acildi === true);
    const im = svgEl("image", g, { href: ikon, x: -8, y: -8, width: 16, height: 16, style: "image-rendering:pixelated", opacity: kilitli ? 0.35 : 1 });
    im.dataset["ikon"] = d.tur;
    if (kilitli) svgEl("image", g, { href: KILIT_IKON(), x: 2, y: 2, width: 9, height: 9, style: "image-rendering:pixelated" });
    if (d.tur === "maden" && !kilitli) {
      const r = svgEl("text", g, { x: 8, y: -6, "font-size": 8, fill: "#fff", "text-anchor": "middle", stroke: "#0b1418", "stroke-width": 0.6, "paint-order": "stroke" });
      r.textContent = String(d.kademe);
    }
    if (d.durum === DURUM.acik) {
      const u = svgEl("text", g, { x: 12, y: -10, "font-size": 11, fill: "#fcd35a" });
      u.textContent = "!";
    }
    if ((d.tur === "dusman" || d.tur === "patron") && d.durum >= DURUM.temizle) {
      const y = svgEl("text", g, { y: 25, "text-anchor": "middle", "font-size": 8, fill: "#fcd35a" });
      y.textContent = [0, 1, 2].map((i) => ((d.yildiz ?? 0) & (1 << i) ? "★" : "☆")).join("");
    }
    if (this.secili === d.id) {
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
        svgEl("path", g, { class: "secim", d: `M ${sx * 17} ${sy * 11} L ${sx * 17} ${sy * 17} L ${sx * 11} ${sy * 17}`, fill: "none", stroke: "#e8762f", "stroke-width": 2 });
      }
    }
    if (this.kutla.has(d.id)) g.classList.add("kutla");
    g.addEventListener("click", (e) => { e.stopPropagation(); this.dugumDokun(d.id); });
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.dugumDokun(d.id); } });
  }

  /** Karakter yer tutucusu (13 § 2.2): 3 dikdörtgen (baş, gövde, bacak) profil renginde + taşıdığı aktif topaç. */
  private karakterCiz(): void {
    const b = this.bolge;
    const konum = this.h.konum && this.dugum(this.h.konum) && b.dugumler.some((d) => d.id === this.h.konum) ? this.h.konum : this.h.baslangic.replace(/^b\d/, `b${b.no}`);
    const d = this.dugum(konum);
    if (!d || !b.acik) { this.karakterG = null; return; }
    const ben = this.b.ben?.girisli ? this.b.ben : null;
    const renk = ben?.oyuncu.renk ?? PROFIL_RENK[0]!;
    const g = svgEl("g", this.svg, { role: "button", tabindex: 0, "aria-label": "Karakterin: mini profil" });
    g.dataset["karakter"] = String(this.h.karakter);
    svgEl("rect", g, { x: -27, y: -44, width: 54, height: 56, fill: "transparent", "data-isabet": "1" }); // isabet payı
    // kodla çizilmiş karakter sayfası (16×24, 27 kare; profil rengi önceden boyalı sayfa): iç <svg> viewBox ile kare seçilir
    const kutu = svgEl("svg", g, { x: -10, y: -30, width: 20, height: 30, viewBox: "0 0 16 24", overflow: "hidden" });
    this.sprite = svgEl("image", kutu, { href: karakterSayfasi(this.h.karakter, renk), width: 144, height: 72, style: "image-rendering:pixelated" });
    this.spriteKutu = kutu;
    this.animBas = performance.now();
    this.anim = this.kutla.size ? "kutla" : "bekle";
    // taşıdığı topaç: aktif takımın ilk üyesinin element rengi
    const t = ben?.takimlar.find((x) => x.id === ben.aktifTakim) ?? ben?.takimlar[0];
    const kod = t ? takimKoduVeya(t) : "";
    const p = kod ? takimProfilleriKimlikten(kod) : [];
    const el0 = (p[0]?.element ?? "kaya") as keyof typeof ELEMENT_RENK;
    const tp = svgEl("circle", g, { cx: 7, cy: -8, r: 2.5, fill: renkCss(ELEMENT_RENK[el0]?.orta ?? 0x8c8a88), stroke: "#0b1418", "stroke-width": 1 });
    tp.dataset["topac"] = el0;
    g.addEventListener("click", (e) => { e.stopPropagation(); this.yuruyusuBitir(); this.miniProfil = !this.miniProfil; this.seritCiz(); });
    this.karakterG = g;
    this.karakterXY = [d.konum[0] - 14, d.konum[1] + 6];
    this.karakterYerlestir();
  }

  private karakterYerlestir(sallan = 0): void {
    this.karakterG?.setAttribute("transform", `translate(${this.karakterXY[0].toFixed(1)} ${(this.karakterXY[1] - sallan).toFixed(1)})`);
  }

  private sprite: SVGImageElement | null = null;
  private spriteKutu: SVGSVGElement | null = null;
  private anim: KarakterAnim = "bekle";
  private animBas = 0;
  private sonKare = -1;
  private spriteKare(t: number): void {
    if (!this.sprite || !this.spriteKutu) return;
    const tek = this.anim === "kutla";
    let k = animKaresi(this.anim, t - this.animBas, this.anim === "yuru" ? 12 : 6, !tek);
    if (tek && t - this.animBas > 1600) { this.anim = "bekle"; this.animBas = t; k = KARAKTER_KARE.bekle[0]; }
    if (hareketiAzalt() && this.anim === "bekle") k = KARAKTER_KARE.bekle[0];
    if (k === this.sonKare) return;
    this.sonKare = k;
    const [x, y] = kareKonumu(k);
    this.spriteKutu.setAttribute("viewBox", `${x} ${y} 16 24`);
    this.spriteKutu.dataset["kare"] = String(k);
  }

  private kare(t: number, _dt: number): void {
    this.spriteKare(t);
    const y = this.yuruyus;
    if (!y) return;
    if (this.anim !== "yuru") { this.anim = "yuru"; this.animBas = t; }
    const u = Math.min(1, (t - y.bas) / y.sure);
    const n = y.yol.length - 1;
    const f = u * n;
    const i = Math.min(n - 1, Math.floor(f));
    const a = y.yol[i]!, c = y.yol[i + 1] ?? a;
    const k = f - i;
    this.karakterXY = [a[0] + (c[0] - a[0]) * k - 14, a[1] + (c[1] - a[1]) * k + 6];
    // sola yürürken ayna (13 § 2.2: sağ; sol = ayna)
    if (this.spriteKutu) this.spriteKutu.setAttribute("transform", c[0] < a[0] ? "translate(0 0) scale(-1 1)" : "");
    this.karakterYerlestir();
    if (u >= 1) this.yuruyusuBitir();
  }

  private yuruyusuBitir(): void {
    const y = this.yuruyus;
    if (!y) return;
    this.yuruyus = null;
    this.anim = "bekle";
    this.animBas = performance.now();
    this.spriteKutu?.setAttribute("transform", "");
    const son = y.yol[y.yol.length - 1]!;
    this.karakterXY = [son[0] - 14, son[1] + 6];
    this.karakterYerlestir();
    y.bitis();
  }

  // ---- etkileşim ----
  private dugumDokun(id: string): void {
    if (this.yuruyus) { this.yuruyusuBitir(); return; } // yürürken dokunuş = anında var
    const d = this.dugum(id);
    if (!d) return;
    this.secili = id;
    this.miniProfil = false;
    this.mesaj = "";
    if (d.durum < DURUM.acik || id === this.h.konum) { this.ciz(); return; }
    void this.yuru(id);
  }

  /** Açık düğüme yürü: sunucuya varış yürüyüş BAŞINDA bildirilir (13 § 1.2); animasyon beklenmez. */
  private async yuru(id: string): Promise<void> {
    const b = this.bolge;
    const bd = HARITA.bolgeler.find((x) => x.id === b.id)!;
    const durumlar = this.durumlar();
    const from = this.h.konum && b.dugumler.some((x) => x.id === this.h.konum) ? this.h.konum : `b${b.no}-01`;
    const yol = enKisaYol(bd, durumlar, from, id);
    const istek = apiPost<{ konum: string; asama: number; yeniAsama: boolean; acilan: string[]; yol: string[]; yeniBasarimlar: { ad: string }[] }>("/api/harita/git", { dugum: id });
    if (yol && yol.length > 1 && this.karakterG) {
      const noktalar = yol.map((x) => bd.dugumler.find((y) => y.id === x)!.konum as [number, number]);
      if (hareketiAzalt()) {
        this.karakterG.style.transition = "opacity .15s";
        this.karakterG.style.opacity = "0";
        await new Promise((r) => setTimeout(r, 150));
        this.karakterXY = [noktalar[noktalar.length - 1]![0] - 14, noktalar[noktalar.length - 1]![1] + 6];
        this.karakterYerlestir();
        this.karakterG.style.opacity = "1";
      } else {
        await new Promise<void>((bitis) => { this.yuruyus = { yol: noktalar, bas: performance.now(), sure: Math.min(1200, 300 * (noktalar.length - 1)), bitis }; });
      }
    }
    const r = await istek;
    if (r.durum !== 200) { this.mesaj = r.veri.hata === "kilitli" ? "BU DÜĞÜM KİLİTLİ" : r.veri.hata === "yolYok" ? "AÇIK YOL YOK" : "BAĞLANTI YOK · TEKRAR DENE"; await this.yenile(); return; }
    if (r.veri.yeniBasarimlar?.length) this.mesaj = `AÇILDI: ${r.veri.yeniBasarimlar.map((x) => x.ad).join(", ")}`;
    else if (r.veri.acilan.length) this.mesaj = `${r.veri.acilan.length} YENİ DÜĞÜM AÇILDI`;
    await this.yenile();
  }

  private async yenile(): Promise<void> {
    try {
      this.h = await apiGet<HaritaG>("/api/harita");
      const s: Record<string, number> = {};
      for (const b of this.h.bolgeler) for (const d of b.dugumler) s[d.id] = d.durum;
      sakla(ESKI_ASAMA, JSON.stringify(s));
    } catch { this.mesaj = "BAĞLANTI YOK · TEKRAR DENE"; }
    this.ciz();
  }

  private bolgeDegistir(y: number): void {
    const n = this.bolgeNo + y;
    if (!this.h.bolgeler.some((x) => x.no === n)) return;
    this.yuruyusuBitir();
    this.bolgeNo = n;
    sakla(BOLGE_ANAHTAR, String(n));
    this.secili = this.h.konum && this.h.konum.startsWith(`b${n}-`) ? this.h.konum : this.enMantikliDugum();
    this.ciz();
  }

  private async anaEylemCalistir(): Promise<void> {
    if (this.yuruyus) { this.yuruyusuBitir(); return; }
    const d = this.dugum(this.secili);
    if (!d) return;
    const e = anaEylem(d, this.h.konum);
    if (!e) return;
    if (e.tur === "dovus") { git("lobi", `&dugum=${d.id}`); return; }
    if (e.tur === "kaz") { git("maden", `&dugum=${d.id}`); return; }
    const r = await apiPost<{ altin: number; cevher: { kademe: number; adet: number }; bakiye: number; yeniBasarimlar: { ad: string }[] }>("/api/harita/sandik", { dugum: d.id });
    if (r.durum === 200) {
      cuzdanYaz(r.veri.bakiye);
      this.mesaj = `+${r.veri.altin} ALTIN · +${r.veri.cevher.adet} ${kademeAdi(r.veri.cevher.kademe)}${r.veri.yeniBasarimlar?.length ? ` · AÇILDI: ${r.veri.yeniBasarimlar.map((x) => x.ad).join(", ")}` : ""}`;
    } else this.mesaj = r.veri.hata === "acilmis" ? "SANDIK BOŞ" : "AÇILAMADI";
    await this.yenile();
  }

  private seritCiz(): void {
    const s = this.serit;
    s.innerHTML = "";
    const sol = el("div", "sol", s);
    const sag = el("div", "sag", s);
    const ben = this.b.ben?.girisli ? this.b.ben : null;
    if (this.ipucu === undefined) {
      // dallanma: bölgede oynanmamış iki açık düğüm aynı anda
      const dal = this.bolge.dugumler.filter((x) => x.durum === DURUM.acik && (x.tur === "dusman" || x.tur === "patron")).length >= 2;
      this.ipucu = ipucuSec(ben?.oyuncu.id, "harita-ilk", ...(dal ? ["harita-dal" as const] : []));
    }
    ipucuBas(sol, "ipucu", this.ipucu);
    if (this.miniProfil && ben) {
      el("b", "", sol, `${ben.oyuncu.ad}${ben.oyuncu.arma ? ` · ${ben.oyuncu.arma.toUpperCase()}` : ""}`);
      el("div", "s2", sol, `⛏ ${ben.ustalik?.madencilik ?? 0} · ⚒ ${ben.ustalik?.isleme ?? 0} · ${this.bolge.ad} %${this.bolge.ilerleme.yuzde}`);
      const v = el("div", "s3 vitrin", sol);
      void apiGet<{ vitrin: string[]; uretilenler: { anahtar: string; ad: string }[] }>("/api/ocak").then((o) => {
        const ad = new Map(o.uretilenler.map((x) => [x.anahtar, x.ad]));
        for (let i = 0; i < 3; i++) el("span", "", v, o.vitrin[i] ? ad.get(o.vitrin[i]!) ?? "?" : "BOŞ YUVA");
      }).catch(() => { el("span", "", v, "VİTRİN"); });
      const p = el("button", "k-dugme ana", sag, "PROFİL");
      p.dataset["eylem"] = "profil";
      p.addEventListener("click", () => git("profil"));
      return;
    }
    const d = this.dugum(this.secili);
    if (!d) { el("b", "", sol, this.bolge.acik ? "BİR DÜĞÜME DOKUN" : `${this.bolge.ad} · KİLİTLİ`); return; }
    const satir = (m: string, c = "s2") => el("div", c, sol, m);
    if (d.durum < DURUM.acik) {
      el("b", "", sol, `${TUR_AD[d.tur]} · KİLİTLİ`);
      satir(`ÖNCE: ${d.onKosul.map((x) => `${TUR_AD[this.dugum(x)?.tur ?? "dusman"]} ${x.slice(-2)}`).join(" YA DA ")}`);
    } else if (d.tur === "dusman" || d.tur === "patron") {
      el("b", "", sol, `${d.tur === "patron" ? d.ad ?? "PATRON" : "DÜŞMAN"} · ZORLUK ${"●".repeat(d.zorluk ?? 1)}${"○".repeat(5 - (d.zorluk ?? 1))} · ${d.asama}`);
      const y = satir("");
      for (const x of d.sartlar ?? []) el("span", x.alindi ? "dolu" : "", y, `${x.alindi ? "★" : "☆"} ${YILDIZ_AD[x.id]}   `);
      const o = d.odul!;
      satir(d.durum >= DURUM.temizle ? `TEKRAR: 2 ${kademeAdi(o.cevherYildiz!.kademe)} + 50 ALTIN` : `İLK: ★ başı ${o.altinYildiz} ALTIN + ${o.cevherYildiz!.adet} ${kademeAdi(o.cevherYildiz!.kademe)}${o.altinIlk ? ` · İLK GALİBİYET ${o.altinIlk} ALTIN + ${o.kulceIlk!.adet} ${kademeAdi(o.kulceIlk!.kademe)} KÜLÇESİ` : ""}`, "s3");
      if (this.h.sayac.haritaMac.sayilan >= this.h.sayac.haritaMac.tavan) satir("BUGÜNLÜK ÖDÜL BİTTİ · 04:00", "s3");
    } else if (d.tur === "maden") {
      el("b", "", sol, `${d.ad ?? "MADEN"} · ${d.kademeAd} (${d.kademe}) · ${d.asama}${d.ustaDamar ? " · USTA DAMAR" : ""}`);
      const U = ben?.ustalik?.madencilik ?? 0;
      satir(U < (d.esik ?? 0) ? `USTALIK ${d.esik} GEREKİR` : `USTALIK ${U} · EŞİK ${d.esik}`);
      if (U < (d.esik ?? 0) && !this.ipucu) { this.ipucu = ipucuSec(ben?.oyuncu.id, "maden-ustalik"); ipucuBas(sol, "ipucu", this.ipucu); }
      satir(`BUGÜN ${d.kalanVurus}/${d.kapasite} · BAŞARILI ${d.basariliVurus}/30`, "s3");
    } else {
      el("b", "", sol, `SANDIK · ${d.asama}`);
      satir(d.acildi ? "BOŞ" : `${d.odul!.altin} ALTIN + ${d.odul!.cevher!.adet} ${kademeAdi(d.odul!.cevher!.kademe)}`);
    }
    if (this.mesaj) el("div", "ipucu", sol, this.mesaj).setAttribute("role", "status");
    const e = anaEylem(d, this.h.konum);
    const btn = el("button", "k-dugme ana", sag, e?.etiket ?? (d.durum < DURUM.acik ? "KİLİTLİ" : d.id !== this.h.konum ? "YÜRÜ" : "—"));
    btn.dataset["eylem"] = "ana";
    btn.dataset["tur"] = e?.tur ?? "";
    btn.disabled = !e && !(d.durum >= DURUM.acik && d.id !== this.h.konum);
    btn.addEventListener("click", () => { if (e) void this.anaEylemCalistir(); else void this.yuru(d.id); });
    if (d.tur === "maden" && e && (ben?.ustalik?.madencilik ?? 0) < (d.esik ?? 0)) { btn.disabled = true; btn.title = `Ustalık ${d.esik} gerekir`; }
  }

  private tus(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); git("lobi"); return; }
    if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement) && !(e.target instanceof SVGElement)) { e.preventDefault(); void this.anaEylemCalistir(); return; }
    if (!e.key.startsWith("Arrow")) return;
    // ok tuşları: konumdan (yoksa seçiliden) grafik komşuluğuyla yönlü komşuya yürü
    const bd = HARITA.bolgeler.find((x) => x.id === this.bolge.id)!;
    const kom = yonsuzKomsular(bd);
    const merkez = this.h.konum && kom.has(this.h.konum) ? this.h.konum : this.secili;
    if (!merkez) return;
    const m = bd.dugumler.find((x) => x.id === merkez)!.konum;
    const yon = e.key === "ArrowRight" ? [1, 0] : e.key === "ArrowLeft" ? [-1, 0] : e.key === "ArrowUp" ? [0, -1] : [0, 1];
    let en: string | null = null;
    let enSkor = -Infinity;
    for (const k of kom.get(merkez) ?? []) {
      const p = bd.dugumler.find((x) => x.id === k)!.konum;
      const dx = p[0] - m[0], dy = p[1] - m[1];
      const skor = (dx * yon[0]! + dy * yon[1]!) / Math.max(1, Math.hypot(dx, dy));
      if (skor > 0.2 && skor > enSkor && (this.dugum(k)?.durum ?? 0) >= DURUM.acik) { en = k; enSkor = skor; }
    }
    if (en) { e.preventDefault(); this.dugumDokun(en); }
  }
}

/** /api/ben takımı üye kodlarını taşır; karakterin taşıdığı topaç için takım kodu (yalnız görünüm). */
function takimKoduVeya(t: { uyeler: Parameters<typeof takimKoduYaz>[0] }): string {
  try { return takimKoduYaz(t.uyeler); } catch { return ""; }
}
