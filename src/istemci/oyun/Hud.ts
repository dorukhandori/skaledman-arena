import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import type { Dunya, TurSonucu } from "../../paylasilan/sim/durum.ts";
import { staminaOrani } from "../../paylasilan/sim/topac.ts";
import { ELEMENT_RENK, KOKEN_RENK, renkCss } from "./renkler.ts";

// DOM HUD (ux § 2: 960×540 mantıksal; bu kök çerçeveyle aynı ölçekte). D1 alt kümesi: H1/H2 panelleri
// (Stamina çubuğu, Çatlak), H3 skor, H5 olay bandı, H7 Dash/Sekme. Yalnız değişen metni yazar.

const STIL = `
.hud { position:absolute; left:0; top:0; width:960px; height:540px; transform-origin:0 0; pointer-events:none; font-family:"Nunito Sans",system-ui,sans-serif; color:#f3f1e8; user-select:none; }
.hud .pn { position:absolute; top:8px; width:288px; height:64px; padding:4px 8px; background:rgba(12,25,29,.88); border:2px solid #050d10; border-radius:8px; box-shadow:inset 0 0 0 1px #24414b; }
.hud .pn.sol { left:8px; } .hud .pn.sag { left:664px; }
.hud .pn .s1 { display:flex; align-items:center; gap:6px; height:16px; font-size:10px; font-weight:800; letter-spacing:.2px; white-space:nowrap; }
.hud .pn .el { width:12px; height:12px; border-radius:3px; border:1px solid #050d10; flex:none; }
.hud .pn .ad { flex:1; overflow:hidden; text-overflow:ellipsis; }
.hud .pn .tp { color:#a3b2b6; font-weight:700; }
.hud .pn.sag .s1 { flex-direction:row-reverse; text-align:right; }
.hud .bar { position:relative; margin-top:3px; height:14px; background:#1b2a30; border:1px solid #050d10; border-radius:3px; overflow:hidden; }
.hud .bar i { position:absolute; top:0; bottom:0; width:100%; background:#f2e8b0; transition:width .06s linear; }
.hud .pn.sol .bar i { left:0; } .hud .pn.sag .bar i { right:0; }
.hud .bar i.amber { background:#f2a33a; }
.hud .bar i.kirmizi { background:repeating-linear-gradient(135deg,#e3350d 0 4px,#b52708 4px 7px); animation:hudNabiz 1.2s ease-in-out infinite; }
@keyframes hudNabiz { 50% { filter:brightness(1.45); } }
.hud .bar u { position:absolute; top:0; bottom:0; width:1px; background:rgba(5,13,16,.85); }
.hud .bar b { position:absolute; top:0; right:4px; font-size:10px; line-height:13px; color:#fff; font-weight:900; text-shadow:0 0 2px #000, 0 1px 0 #000; }
.hud .bar s { position:absolute; top:0; left:3px; font-size:10px; line-height:13px; color:#fff; font-weight:900; text-decoration:none; display:none; text-shadow:0 1px 0 #000; }
.hud .s3 { display:flex; align-items:center; gap:6px; height:22px; margin-top:4px; font-size:10px; font-weight:700; color:#a3b2b6; }
.hud .pn.sag .s3 { flex-direction:row-reverse; }
.hud .catlak { width:22px; height:22px; flex:none; }
.hud .skor { position:absolute; left:400px; top:6px; width:160px; height:34px; text-align:center; font:400 20px/34px var(--display, system-ui); letter-spacing:1px; background:rgba(12,25,29,.88); border:2px solid #050d10; border-radius:8px; }
.hud .bant { position:absolute; left:240px; top:84px; width:480px; height:36px; text-align:center; font:800 16px/36px "Nunito Sans",system-ui; letter-spacing:1px; background:rgba(5,13,16,.82); border:2px solid #f4cf47; border-radius:8px; opacity:0; transition:opacity .15s; }
.hud .bant.acik { opacity:1; }
.hud .rz { position:absolute; top:494px; width:44px; height:44px; border:3px solid #f2e8b0; border-radius:6px; background:rgba(12,25,29,.9); font-size:10px; font-weight:800; text-align:center; overflow:hidden; }
.hud .rz.dash { left:428px; } .hud .rz.sekme { left:488px; }
.hud .rz.bekle { border-color:#4a5a60; color:#a3b2b6; }
.hud .rz.yetmez { border-style:dashed; }
.hud .rz .k { position:absolute; left:0; right:0; bottom:0; background:rgba(5,13,16,.75); }
.hud .rz .e { position:relative; display:block; margin-top:6px; }
.hud .rz .n { position:relative; display:block; font-size:12px; }
`;

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif = "", ust?: HTMLElement): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  ust?.appendChild(e);
  return e;
}

/** Çatlak simgesi: 4 hâl, eşikler tik/burstEsik 0,5 / 0,75 / 0,9 (05 § 3.3, ux H1c). */
function catlakSvg(oran: number): string {
  const s = oran >= 0.9 ? 3 : oran >= 0.75 ? 2 : oran >= 0.5 ? 1 : 0;
  const cizgi = ["", "M11 3 L9 9 L12 12", "M11 3 L9 9 L12 12 M4 14 L9 13 L10 19", "M11 3 L9 9 L12 12 M4 14 L9 13 L10 19 M18 6 L14 11 L19 16 L15 20"][s];
  const renk = s >= 3 ? "#e3350d" : s >= 1 ? "#f2a33a" : "#8d989e";
  return `<svg viewBox="0 0 22 22" class="catlak" style="opacity:${s === 0 ? 0.45 : 1}"><circle cx="11" cy="11" r="9" fill="#3a4246" stroke="${renk}" stroke-width="2"/><circle cx="11" cy="11" r="3" fill="#8d989e"/><path d="${cizgi}" stroke="#fff" stroke-width="1.6" fill="none"/></svg>`;
}

interface Panel { kok: HTMLElement; el: HTMLElement; ad: HTMLElement; tp: HTMLElement; dolgu: HTMLElement; sayi: HTMLElement; unlem: HTMLElement; catlak: HTMLElement; tik: HTMLElement }

export class Hud {
  readonly kok = el("div", "hud");
  private stil = el("style");
  private paneller: [Panel, Panel];
  private skor = el("div", "skor");
  private bant = el("div", "bant");
  private bantKalan = 0;
  private dash = el("div", "rz dash");
  private sekme = el("div", "rz sekme");
  private onbellek = new Map<HTMLElement, string>();

  constructor(ust: HTMLElement, private yerel: number) {
    this.stil.textContent = STIL;
    document.head.appendChild(this.stil);
    this.paneller = [this.panel(yerel === 0 ? "sol" : "sag"), this.panel(yerel === 0 ? "sag" : "sol")];
    this.kok.append(this.skor, this.bant, this.dash, this.sekme);
    for (const [r, ad] of [[this.dash, "Shift"], [this.sekme, "Space"]] as const) {
      el("div", "k", r);
      const e = el("span", "e", r); e.textContent = ad;
      el("span", "n", r);
    }
    ust.appendChild(this.kok);
  }

  private panel(taraf: "sol" | "sag"): Panel {
    const kok = el("div", `pn ${taraf}`, this.kok);
    const s1 = el("div", "s1", kok);
    const e = el("span", "el", s1);
    const ad = el("span", "ad", s1);
    const tp = el("span", "tp", s1);
    const bar = el("div", "bar", kok);
    const dolgu = el("i", "", bar);
    for (const o of [AYAR.kritikEsik, 0.6]) { const u = el("u", "", bar); u.style.left = `${o * 100}%`; }
    const sayi = el("b", "", bar);
    const unlem = el("s", "", bar); unlem.textContent = "!";
    const s3 = el("div", "s3", kok);
    const catlak = el("span", "", s3);
    const tik = el("span", "", s3);
    return { kok, el: e, ad, tp, dolgu, sayi, unlem, catlak, tik };
  }

  /** HUD kökünü tuval çerçevesine hizala (CSS px). */
  hizala(x: number, y: number, olcek: number): void {
    this.kok.style.transform = `translate(${x}px, ${y}px) scale(${olcek})`;
  }

  private yaz(e: HTMLElement, s: string, html = false): void {
    if (this.onbellek.get(e) === s) return;
    this.onbellek.set(e, s);
    if (html) e.innerHTML = s; else e.textContent = s;
  }

  /** Olay bandı (H5): 1,2-2 sn. */
  bantGoster(metin: string, sure = 1.6): void {
    this.yaz(this.bant, metin);
    this.bant.classList.add("acik");
    this.bantKalan = sure;
  }

  sonuc(s: TurSonucu, yerel: number): void {
    const ad = { durma: "DURMA", ringOut: "RING OUT", parcalanma: "PARÇALANMA", berabere: "BERABERE" }[s.tur];
    if (s.tur === "berabere") this.bantGoster("BERABERE · iki topaç da elendi", 2.4);
    else this.bantGoster(`${ad} +${s.puan} · ${s.kazanan === yerel ? "sen" : "rakip"}`, 2.4);
  }

  guncelle(d: Dunya, dt: number): void {
    for (let k = 0; k < 2; k++) {
      const i = k === 0 ? this.yerel : 1 - this.yerel;
      const p = d.profiller[i]!;
      const t = d.topaclar[i]!;
      const pn = this.paneller[k]!;
      const oran = staminaOrani(t, p);
      pn.el.style.background = renkCss(ELEMENT_RENK[p.element].orta);
      pn.el.style.boxShadow = `inset 0 0 0 2px ${renkCss(KOKEN_RENK[p.koken].isik)}`;
      this.yaz(pn.ad, `${k === 0 ? "Sen" : "Bot"} · ${ELEMENT_RENK[p.element].ad} ${KOKEN_RENK[p.koken].ad}`);
      this.yaz(pn.tp, p.tip.toUpperCase());
      pn.dolgu.style.width = `${Math.max(0, oran) * 100}%`;
      const sinif = oran < AYAR.kritikEsik ? "kirmizi" : oran <= 0.6 ? "amber" : "";
      if (pn.dolgu.className !== sinif) pn.dolgu.className = sinif;
      pn.unlem.style.display = oran < AYAR.kritikEsik ? "block" : "none";
      // kendi çubuğunda sayı, rakipte yok (ux H2)
      this.yaz(pn.sayi, k === 0 ? `${Math.max(0, Math.round(oran * 100))}%` : "");
      const tikOran = t.tik / p.parametreler.burstEsik;
      this.yaz(pn.catlak, catlakSvg(tikOran), true);
      // Lab: basit tık göstergesi (sayı; maç HUD'unda rakipte sayı yok)
      this.yaz(pn.tik, `Tık ${t.tik.toFixed(2)} / ${p.parametreler.burstEsik}  ·  Stamina ${Math.max(0, t.stamina).toFixed(0)} / ${p.maxStamina}`);
    }
    this.yaz(this.skor, `${d.mac.puan[this.yerel]} – ${d.mac.puan[1 - this.yerel]}`);
    const ben = d.topaclar[this.yerel]!;
    const bp = d.profiller[this.yerel]!;
    this.rozet(this.dash, ben.dashBekleme, bp.sim.dashBekleme, ben.stamina - AYAR.eylemStaminaPayi < bp.sim.dashMaliyet);
    this.rozet(this.sekme, ben.sekmeBekleme, Math.round(AYAR.sekmeBekleme * AYAR.adimHz), ben.stamina - AYAR.eylemStaminaPayi < AYAR.sekmeStamina);
    if (this.bantKalan > 0) {
      this.bantKalan -= dt;
      if (this.bantKalan <= 0) this.bant.classList.remove("acik");
    }
  }

  private rozet(r: HTMLElement, kalan: number, toplam: number, yetmez: boolean): void {
    r.classList.toggle("bekle", kalan > 0);
    r.classList.toggle("yetmez", yetmez);
    (r.firstElementChild as HTMLElement).style.height = `${toplam > 0 ? (kalan / toplam) * 100 : 0}%`;
    const sn = kalan / AYAR.adimHz;
    this.yaz(r.lastElementChild as HTMLElement, kalan > 0 ? (sn >= 10 ? sn.toFixed(0) : sn.toFixed(1)) : "");
  }

  yokEt(): void {
    this.kok.remove();
    this.stil.remove();
  }
}
