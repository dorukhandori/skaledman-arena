import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import type { Dunya, Olay, TakimUyesi } from "../../paylasilan/sim/durum.ts";
import { MAC_ADIM, geriCekAcik } from "../../paylasilan/sim/mac.ts";
import { staminaOrani } from "../../paylasilan/sim/topac.ts";
import { TAKIM_ULTI_KART, TAKIM_YUVA, ULTI_YUVA, elenmemisKart, yuvaBedeli, yuvaDurumu, yuvaYetenegi } from "../../paylasilan/sim/yetenek.ts";
import { AYAR as AYAR_ } from "../../paylasilan/kurallar/ayar.ts";
import { YETENEK_SIM } from "../../paylasilan/veri/yetenekSablon.ts";
import { elementSvg } from "./elementSimge.ts";
import { ELEMENT_RENK, KOKEN_RENK } from "./renkler.ts";
import { metinOlcegiOku } from "../ekranlar/arayuz.ts";
import { ayarlariOku } from "./Ayarlar.ts";

// Maç HUD'u (ux § 2: H1-H15, 960×540 mantıksal DOM katmanı; konum ve boyutlar tablodan birebir).
// Yazı boyutları: ad 10 · sayı 10 · tuş rozeti 10 · bekleme 12 · süre 14 · skor 20 · olay bandı 16.
// Renk hiçbir bilgiyi tek başına taşımaz: ayraç + tarama + simge, element = silüet, elenen = çarpı.
// D3: H6 yuva hâlleri (hazır / bekleme / Enerji yetersiz / kilitli / basılı / etkin / kullanıldı), H1b ULTİ + parıltı,
// H5 "Rakip: Ulti hazırlıyor"; H9 nişan ve H13 telegraf dünyada (YetenekGorsel). H10 D4; H15 yalnız Antrenman.
// D8: H1b'de Takım Enerjisi 4. dilim (altın çerçeve), yuva 4 = Takım Ultisi, H5 "Takım Ultisi hazır" / "Takım düştü".

const STIL = `
.mh { position:absolute; left:0; top:0; width:960px; height:540px; transform-origin:0 0; pointer-events:none; font-family:"Nunito Sans",system-ui,sans-serif; color:#f3f1e8; user-select:none; }
.mh .pn { position:absolute; top:8px; width:288px; height:64px; background:rgba(12,25,29,.9); border:2px solid #050d10; border-radius:8px; box-shadow:inset 0 0 0 1px #24414b; }
.mh .pn.sol { left:8px; } .mh .pn.sag { left:664px; }
.mh .pn .s1 { position:absolute; left:6px; right:6px; top:2px; height:14px; display:flex; align-items:center; gap:5px; font-size:10px; font-weight:800; white-space:nowrap; }
.mh .pn.sag .s1 { flex-direction:row-reverse; }
.mh .pn .ad { overflow:hidden; text-overflow:ellipsis; }
.mh .pn .lv { color:#a3b2b6; font-weight:700; }
.mh .pn .bos { flex:1; }
.mh .pn .ekip { display:flex; gap:2px; }
.mh .pn.sag .ekip { order:-1; }
.mh .bar { position:absolute; left:6px; top:20px; width:272px; height:14px; background:#1b2a30; border:1px solid #050d10; border-radius:3px; overflow:hidden; }
.mh .bar i { position:absolute; top:0; bottom:0; width:100%; background:#f2e8b0; }
.mh .pn.sol .bar i { left:0; } .mh .pn.sag .bar i { right:0; }
.mh .bar i.amber { background:#f2a33a; }
.mh .bar i.kirmizi { background:repeating-linear-gradient(135deg,#e3350d 0 4px,#9e2207 4px 7px); animation:mhNabiz 1.2s ease-in-out infinite; }
@keyframes mhNabiz { 50% { filter:brightness(1.5); } }
.mh .bar u { position:absolute; top:0; bottom:0; width:2px; background:rgba(5,13,16,.9); }
.mh .bar b { position:absolute; top:0; right:4px; font-size:10px; line-height:13px; font-weight:900; text-shadow:0 0 2px #000,0 1px 0 #000; }
.mh .pn.sag .bar b { right:auto; left:4px; }
.mh .bar s { position:absolute; top:0; left:3px; font-size:10px; line-height:13px; font-weight:900; text-decoration:none; display:none; color:#fff; text-shadow:0 1px 0 #000; }
.mh .pn.sag .bar s { left:auto; right:3px; }
.mh .en { position:absolute; left:6px; top:40px; display:flex; gap:4px; }
.mh .pn.sag .en { left:auto; right:6px; flex-direction:row-reverse; }
.mh .en span { position:relative; width:40px; height:12px; border:1px solid #9fb0b5; border-radius:2px; background:rgba(5,13,16,.5); overflow:hidden; }
.mh .en span i { position:absolute; left:0; top:0; bottom:0; background:#7fd3ff; }
.mh .en span.dolu { border-color:#cfeeff; box-shadow:0 0 4px #7fd3ff; }
.mh .en em { font-style:normal; font-size:10px; font-weight:800; color:#a3b2b6; margin-left:4px; line-height:12px; }
.mh .ct { position:absolute; left:254px; top:34px; width:24px; height:24px; }
.mh .pn.sag .ct { left:6px; }
.mh .ct.titre { animation:mhTitre .12s linear infinite; }
@keyframes mhTitre { 25% { transform:translateX(-1px); } 75% { transform:translateX(1px); } }
.mh .skor { position:absolute; left:400px; top:6px; width:160px; height:34px; text-align:center; font:800 20px/30px system-ui; letter-spacing:1px; background:rgba(12,25,29,.9); border:2px solid #050d10; border-radius:8px; }
.mh .sure { position:absolute; left:432px; top:42px; width:96px; height:22px; text-align:center; font:800 14px/20px system-ui; font-variant-numeric:tabular-nums; background:rgba(12,25,29,.85); border:2px solid #050d10; border-radius:6px; }
.mh .sure.son { color:#ff5a3a; text-decoration:underline; text-decoration-thickness:2px; }
.mh .sure.ani { color:#fff; background:#a3260a; letter-spacing:.5px; font-size:12px; }
.mh .bant { position:absolute; left:240px; top:84px; width:480px; height:36px; text-align:center; font:800 16px/32px system-ui; letter-spacing:1px; background:rgba(5,13,16,.86); border:2px solid #f4cf47; border-radius:8px; opacity:0; transition:opacity .15s; }
.mh .bant.acik { opacity:1; }
.mh .gs { position:absolute; left:330px; top:220px; width:300px; height:80px; text-align:center; font:900 48px/80px system-ui; letter-spacing:2px; color:#fff; text-shadow:0 3px 0 #050d10,0 0 12px rgba(0,0,0,.6); opacity:0; }
.mh .gs.acik { opacity:1; }
.mh .gs small { font-size:24px; letter-spacing:4px; }
.mh .yv { position:absolute; top:494px; width:44px; height:44px; background:rgba(12,25,29,.9); border:3px solid #f2e8b0; text-align:center; font-size:10px; font-weight:800; }
.mh .yv .tus { position:absolute; left:2px; top:1px; font-size:10px; color:#a3b2b6; }
.mh .yv .ic { position:absolute; inset:9px 4px 4px; font-size:10px; line-height:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.mh .yv.kare { border-radius:3px; }
.mh .yv.pah { clip-path:polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px); border-radius:0; }
.mh .yv.elmas { border-radius:3px; }
.mh .yv.elmas::before { content:""; position:absolute; left:9px; top:9px; width:20px; height:20px; transform:rotate(45deg); border:2px solid currentColor; opacity:.35; }
.mh .yv.yuvarlak { border-radius:50%; }
.mh .yv.yetmez { border-style:dashed; border-color:#8d989e; color:#a3b2b6; }
.mh .yv.kilit { border-color:#4a5a60; color:#8d989e; background:rgba(5,13,16,.85); }
.mh .yv.yok { border-color:#2c3d43; color:#4a5a60; background:rgba(5,13,16,.6); }
.mh .yv .nok { display:flex; gap:3px; margin-top:2px; } .mh .yv .nok b { width:5px; height:5px; border-radius:50%; background:#a3b2b6; }
.mh .yv.bekle { border-color:#4a5a60; color:#a3b2b6; }
.mh .yv .k { position:absolute; left:0; right:0; bottom:0; background:rgba(5,13,16,.75); }
.mh .yv .n { position:relative; font-size:12px; font-weight:900; }
.mh .tk { position:absolute; top:494px; width:44px; height:44px; background:rgba(12,25,29,.9); border:2px solid #24414b; border-radius:6px; }
.mh .tk .ik { position:absolute; left:8px; top:5px; }
.mh .tk .st { position:absolute; left:4px; right:4px; bottom:4px; height:4px; background:#1b2a30; }
.mh .tk .st i { position:absolute; left:0; top:0; bottom:0; background:#f2e8b0; }
.mh .tk .st i.amber { background:#f2a33a; } .mh .tk .st i.kirmizi { background:#e3350d; }
.mh .tk.aktif { border:3px solid #2fb8e8; }
.mh .tk .ok { position:absolute; left:15px; top:-12px; font-size:10px; color:#2fb8e8; display:none; }
.mh .tk.aktif .ok { display:block; }
.mh .tk.elendi { opacity:.45; filter:grayscale(1); }
.mh .tk .tab { position:absolute; left:4px; top:-14px; padding:0 3px; font-size:10px; font-weight:900; background:#e3350d; color:#fff; border-radius:3px; display:none; }
.mh .tk.tabhazir .tab { display:block; }
.mh .tk.tabhazir .ok { display:none; }
.mh .tk.cekiliyor { animation:mhNabiz .5s linear infinite; }
.mh .ds { position:absolute; left:240px; top:380px; width:480px; height:96px; padding:6px 8px; background:rgba(5,13,16,.92); border:2px solid #f4cf47; border-radius:8px; display:none; }
.mh .ds.acik { display:block; }
.mh .ds h4 { margin:0 0 4px; font:800 11px/14px system-ui; letter-spacing:.5px; }
.mh .ds .kartlar { display:flex; gap:8px; }
.mh .ds .kart { position:relative; flex:1; height:50px; padding:4px 6px 4px 26px; border:2px solid #24414b; border-radius:6px; background:#10222a; font-size:10px; font-weight:800; pointer-events:auto; cursor:pointer; }
.mh .ds .kart .tus { position:absolute; left:4px; top:4px; width:16px; height:16px; border:1px solid #a3b2b6; border-radius:3px; text-align:center; line-height:14px; }
.mh .ds .kart .ik { position:absolute; left:4px; top:26px; }
.mh .ds .kart .st { position:absolute; left:26px; right:6px; bottom:5px; height:4px; background:#1b2a30; } .mh .ds .kart .st i { position:absolute; left:0; top:0; bottom:0; background:#f2e8b0; }
.mh .ds .kart.secildi { border-color:#f4cf47; background:#2a2a14; }
.mh .ds .kart.elendi { opacity:.35; filter:grayscale(1); cursor:default; }
.mh .ds .kart.sahada { border-style:dashed; }
.mh .ds .sc { position:absolute; left:8px; right:8px; bottom:5px; height:5px; background:#1b2a30; border-radius:2px; overflow:hidden; } .mh .ds .sc i { position:absolute; left:0; top:0; bottom:0; background:#f4cf47; }
.mh .ip { position:absolute; left:160px; top:444px; width:640px; height:40px; display:none; text-align:center; font:700 12px/36px system-ui; background:rgba(5,13,16,.85); border:2px solid #24414b; border-radius:8px; }
.mh .ip.acik { display:block; }
.mh .els { display:block; flex:none; }
.mh .yv { transition:transform .06s; }
.mh .yv.hazir { border-color:#fff6c8; box-shadow:0 0 0 1px #050d10, 0 0 6px rgba(255,246,200,.55); }
.mh .yv.parla { box-shadow:0 0 0 2px #fff, 0 0 14px #fff6c8; }
.mh .yv.basili { border-width:5px; transform:translateY(-4px); }
.mh .yv.etkin { border-color:#7fd3ff; box-shadow:0 0 8px #7fd3ff; }
.mh .yv.kullanildi { border-color:#4a5a60; color:#8d989e; background:rgba(5,13,16,.85); }
.mh .yv .ys { display:block; margin:0 auto; }
.mh .ya { position:absolute; top:481px; width:48px; margin-left:-2px; font-size:8px; line-height:10px; text-align:center; color:#a3b2b6; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-shadow:0 1px 0 #000; }
.mh .ya.on { color:#f3f1e8; }
.mh .en span.parilti { box-shadow:0 0 0 1px #fff, 0 0 10px #cfeeff; }
.mh .en span.parilti i { background:#e6f8ff; }
.mh .en em.ulti { color:#ffb347; text-shadow:0 0 4px #ff8a3d; }
.mh .en span.tk { width:28px; border-color:#d9a441; margin-left:4px; }
.mh .en span.tk i { background:#ffcf5a; }
.mh .en span.tk.dolu { border-color:#ffe39a; box-shadow:0 0 5px #ffb347; }
.mh .en span.tk.dustu { border-style:dashed; border-color:#6d7a7f; }
.mh .en span.tk.dustu i { background:#6d7a7f; }
.mh .bant .els { display:inline-block; vertical-align:-3px; margin-left:6px; }
.mh .pn > .sayi { position:absolute; top:21px; right:14px; font-size:10px; line-height:13px; font-weight:900; text-shadow:0 0 2px #000,0 1px 0 #000; z-index:1; }
.mh .pn.sag > .sayi { right:auto; left:14px; }
/* D6 HUD metin ölçeği (ux § 6.3: %100/125/150; panel yeniden dizilir, çubuklar sabit 272×14, Enerji 40×12, yuvalar 44×44) */
.mh.o125 .pn { height:78px; } .mh.o150 .pn { height:92px; }
.mh.o125 .pn .s1 { height:18px; font-size:12.5px; } .mh.o150 .pn .s1 { height:22px; font-size:15px; }
.mh.o125 .bar { top:24px; } .mh.o150 .bar { top:28px; }
.mh.o125 .pn > .sayi { top:24px; font-size:12px; line-height:14px; }
.mh.o150 .pn > .sayi { top:48px; right:44px; font-size:15px; line-height:18px; } .mh.o150 .pn.sag > .sayi { right:auto; left:44px; }
.mh.o125 .bar s { font-size:12px; } .mh.o150 .bar s { font-size:13px; }
.mh.o125 .en { top:46px; } .mh.o150 .en { top:50px; }
.mh.o125 .en em { font-size:12.5px; } .mh.o150 .en em { font-size:15px; }
.mh.o125 .ct { top:44px; } .mh.o150 .ct { top:46px; left:258px; } .mh.o150 .pn.sag .ct { left:6px; }
.mh.o125 .skor { font-size:25px; } .mh.o150 .skor { font-size:30px; line-height:31px; height:36px; }
.mh.o125 .sure { font-size:17.5px; line-height:22px; height:26px; } .mh.o150 .sure { top:44px; font-size:21px; line-height:26px; height:30px; width:110px; left:425px; }
.mh.o125 .bant { font-size:20px; height:40px; line-height:36px; top:90px; } .mh.o150 .bant { font-size:24px; height:46px; line-height:42px; top:100px; width:560px; left:200px; }
.mh.o125 .yv .tus, .mh.o125 .yv .ic { font-size:12.5px; } .mh.o150 .yv .tus, .mh.o150 .yv .ic { font-size:15px; line-height:15px; }
.mh.o125 .yv .n { font-size:15px; } .mh.o150 .yv .n { font-size:18px; }
.mh.o125 .ya { font-size:10px; top:479px; line-height:12px; } .mh.o150 .ya { font-size:12px; top:476px; line-height:14px; }
.mh.o125 .tk .tab, .mh.o125 .tk .ok { font-size:12.5px; } .mh.o150 .tk .tab, .mh.o150 .tk .ok { font-size:15px; top:-18px; }
.mh.o125 .ds { height:110px; top:368px; } .mh.o150 .ds { height:124px; top:356px; }
.mh.o125 .ds h4 { font-size:13.5px; line-height:17px; } .mh.o150 .ds h4 { font-size:16.5px; line-height:20px; }
.mh.o125 .ds .kart { font-size:12.5px; height:60px; } .mh.o150 .ds .kart { font-size:15px; height:68px; }
.mh.o125 .ip { font-size:15px; } .mh.o150 .ip { font-size:18px; }
/* Yüksek kontrast HUD (ux § 6.3): opak panel, 2 px beyaz çerçeve */
.mh.kontrast .pn, .mh.kontrast .skor, .mh.kontrast .sure, .mh.kontrast .bant, .mh.kontrast .yv, .mh.kontrast .tk, .mh.kontrast .ds, .mh.kontrast .ip { background:#000; border:2px solid #fff; box-shadow:none; }
.mh.kontrast .pn .lv, .mh.kontrast .en em, .mh.kontrast .yv .tus, .mh.kontrast .ya { color:#fff; }
.mh.kontrast .bar { border-color:#fff; } .mh.kontrast .en span { border-color:#fff; }
`;

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif = "", ust?: HTMLElement, metin = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin) e.textContent = metin;
  ust?.appendChild(e);
  return e;
}

/** Çatlak simgesi: 4 hâl, eşikler tik/burstEsik 0,5 / 0,75 / 0,9 (05 § 3.3, ux H1c). */
export function catlakSvg(oran: number): string {
  const s = oran >= 0.9 ? 3 : oran >= 0.75 ? 2 : oran >= 0.5 ? 1 : 0;
  const cizgi = ["", "M12 3 L10 10 L13 13", "M12 3 L10 10 L13 13 M4 15 L10 14 L11 21", "M12 3 L10 10 L13 13 M4 15 L10 14 L11 21 M20 6 L15 12 L21 17 L16 22"][s];
  const renk = s >= 3 ? "#e3350d" : s >= 1 ? "#f2a33a" : "#8d989e";
  return `<svg viewBox="0 0 24 24" width="24" height="24" style="opacity:${s === 0 ? 0.45 : 1}" aria-label="Çatlak ${s}/3"><circle cx="12" cy="12" r="10" fill="#3a4246" stroke="${renk}" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="#8d989e"/><path d="${cizgi}" stroke="#fff" stroke-width="1.7" fill="none"/></svg>`;
}

export const BITIS_AD = { durma: "DURMA", ringOut: "RING OUT", parcalanma: "PARÇALANMA", berabere: "BERABERE" } as const;
export const sinifOran = (o: number) => (o < AYAR.kritikEsik ? "kirmizi" : o <= 0.6 ? "amber" : "");

interface Panel { kok: HTMLElement; ik: HTMLElement; ad: HTMLElement; lv: HTMLElement; ekip: HTMLElement; dolgu: HTMLElement; sayi: HTMLElement; unlem: HTMLElement; enerji: HTMLElement[]; takimDilim: HTMLElement; enerjiYazi: HTMLElement; ct: HTMLElement }

export class MacHud {
  readonly kok = el("div", "mh");
  private stil = el("style");
  private paneller: [Panel, Panel];
  private skor = el("div", "skor");
  private sure = el("div", "sure");
  private bant = el("div", "bant");
  private gs = el("div", "gs");
  private bantKalan = 0;
  private yuvalar: HTMLElement[] = [];
  private yuvaAdlari: HTMLElement[] = [];
  private dash = el("div", "yv kare");
  private sekme = el("div", "yv kare");
  private takim: HTMLElement[] = [];
  private ds = el("div", "ds");
  private dsBaslik = el("h4");
  private dsKartlar: HTMLElement[] = [];
  private dsSure = el("i");
  readonly ipucu = el("div", "ip");
  private onbellek = new Map<HTMLElement, string>();
  private basla = 0;
  /** H14 kartına tıklama → seçim. */
  kartSecildi: (uye: number) => void = () => {};

  constructor(ust: HTMLElement, private yerel: number, private adlar: [string, string]) {
    // D6: metin ölçeği (Ayarlar; menülerle aynı) ve yüksek kontrast HUD'a da uygulanır
    const o = metinOlcegiOku();
    if (o > 1) this.kok.classList.add(o >= 1.5 ? "o150" : "o125");
    if (ayarlariOku().kontrast === "acik") this.kok.classList.add("kontrast");
    this.kok.dataset["olcek"] = String(o);
    this.stil.textContent = STIL;
    document.head.appendChild(this.stil);
    this.paneller = [this.panel(yerel === 0 ? "sol" : "sag"), this.panel(yerel === 0 ? "sag" : "sol")];
    this.bant.setAttribute("aria-live", "polite");
    this.bant.setAttribute("role", "status");
    this.kok.append(this.skor, this.sure, this.bant, this.gs);
    // H6 yetenek yuvaları: Yetenek kare, Özel Yetenek pah, Ulti elmas, Parça Tekniği yuvarlak
    const sekil = ["kare", "pah", "elmas", "yuvarlak"];
    for (let k = 0; k < 4; k++) {
      const y = el("div", `yv ${sekil[k]}`, this.kok);
      y.style.left = `${8 + k * 50}px`;
      el("div", "k", y);
      const ya = el("span", "ya", this.kok);
      ya.style.left = `${8 + k * 50}px`;
      this.yuvaAdlari.push(ya);
      el("span", "tus", y, String(k + 1));
      el("div", "ic", y);
      this.yuvalar.push(y);
    }
    // H7
    for (const [r, ad, x] of [[this.dash, "Shift", 428], [this.sekme, "Space", 488]] as const) {
      r.style.left = `${x}px`;
      el("div", "k", r);
      const ic = el("div", "ic", r);
      el("span", "", ic, ad);
      el("span", "n", ic);
      this.kok.appendChild(r);
    }
    // H8 takım yuvaları
    for (let k = 0; k < 3; k++) {
      const t = el("div", "tk", this.kok);
      t.style.left = `${796 + k * 50}px`;
      el("span", "ok", t, "▲");
      el("span", "tab", t, "Tab");
      el("span", "ik", t);
      const st = el("span", "st", t); el("i", "", st);
      this.takim.push(t);
    }
    // H14
    this.ds.append(this.dsBaslik);
    const kartlar = el("div", "kartlar", this.ds);
    for (let k = 0; k < 3; k++) {
      const kart = el("div", "kart", kartlar);
      el("span", "tus", kart, String(k + 1));
      el("span", "ik", kart);
      el("div", "ad", kart);
      const st = el("span", "st", kart); el("i", "", st);
      kart.addEventListener("click", () => this.kartSecildi(k));
      this.dsKartlar.push(kart);
    }
    const sc = el("div", "sc", this.ds); sc.append(this.dsSure);
    this.kok.append(this.ds, this.ipucu);
    ust.appendChild(this.kok);
  }

  private panel(taraf: "sol" | "sag"): Panel {
    const kok = el("div", `pn ${taraf}`, this.kok);
    const s1 = el("div", "s1", kok);
    const ik = el("span", "", s1);
    const ad = el("span", "ad", s1);
    const lv = el("span", "lv", s1);
    el("span", "bos", s1);
    const ekip = el("span", "ekip", s1);
    const bar = el("div", "bar", kok);
    const dolgu = el("i", "", bar);
    for (const o of [AYAR.kritikEsik, 0.6]) { const u = el("u", "", bar); u.style.left = taraf === "sol" ? `${o * 100}%` : `${(1 - o) * 100}%`; }
    const sayi = el("b", "sayi", kok);
    const unlem = el("s", "", bar, "!");
    const en = el("div", "en", kok);
    const enerji: HTMLElement[] = [];
    for (let k = 0; k < 3; k++) { const d = el("span", "", en); el("i", "", d); enerji.push(d); }
    // D8: paylaşılan 4. dilim (Takım Enerjisi)
    const takimDilim = el("span", "tk", en); el("i", "", takimDilim);
    takimDilim.title = "Takım Enerjisi";
    const enerjiYazi = el("em", "", en);
    const ct = el("span", "ct", kok);
    return { kok, ik, ad, lv, ekip, dolgu, sayi, unlem, enerji, takimDilim, enerjiYazi, ct };
  }

  hizala(x: number, y: number, olcek: number): void {
    this.kok.style.transform = `translate(${x}px, ${y}px) scale(${olcek})`;
  }

  private yaz(e: HTMLElement, s: string, html = false): void {
    if (this.onbellek.get(e) === s) return;
    this.onbellek.set(e, s);
    if (html) e.innerHTML = s; else e.textContent = s;
  }

  /** H5 olay bandı: aynı anda tek band, yeni olay eskinin üstüne biner (1,2-2 sn). */
  bantGoster(metin: string, sure = 1.6, html = false): void {
    if (html) this.bant.innerHTML = metin; else this.bant.textContent = metin;
    this.bant.classList.add("acik");
    this.bantKalan = sure;
  }

  /** Sim olayından band metni (ux § 7 mikro-kopya). */
  olay(o: Olay, d: Dunya): void {
    const ben = this.yerel;
    switch (o.tur) {
      case "turBitti": {
        const s = o.sonuc;
        if (s.tur === "berabere") this.bantGoster("BERABERE · iki topaç da elendi", 2);
        else this.bantGoster(`${BITIS_AD[s.tur]} +${s.puan} · ${s.kazanan === ben ? "sen" : "rakip"}`, 2);
        break;
      }
      case "aniOlum": this.bantGoster("Ani ölüm", 2); break;
      case "geriCek": if (o.i !== ben) this.bantGoster("Rakip topaç değiştiriyor", 1.4); break;
      case "turBasladi": if (o.turNo > 1) this.basla = 0.6; break;
      case "secim":
        if (o.i !== ben && d.mac.faz === "turArasi") this.bantGoster("Rakip topaç değiştiriyor", 1.4);
        break;
      case "yetenekBasladi":
        if (o.kademe === 4) this.bantGoster(o.i === ben ? "TAKIM ULTİSİ" : "Rakip: Takım Ultisi hazırlıyor", 1.8);
        else if (o.kademe === 3 && o.i !== ben) this.bantGoster(`Rakip: Ulti hazırlıyor${elementSvg(d.profiller[o.i]!.element, 16)}`, 1.8, true);
        else if (o.kademe === 3) this.bantGoster(`ULTİ · ${YETENEK_SIM[o.no]!.ad}${elementSvg(d.profiller[o.i]!.element, 16)}`, 1.6, true);
        break;
      case "yetenekReddi":
        if (o.i === ben) this.bantGoster(this.retMetni(o.neden, o.yuva, d), 1.4);
        break;
      case "takimEnerjiDoldu":
        if (o.i === ben && d.seviye[ben]! >= AYAR_.yetenek.seviyeYuva[TAKIM_YUVA]!) this.bantGoster(elenmemisKart(d, ben) >= TAKIM_ULTI_KART ? "Takım Ultisi hazır · 4" : "Takım düştü", 1.8);
        break;
      case "enerjiDoldu": {
        const k = o.i === ben ? 0 : 1;
        const dl = this.paneller[k]!.enerji[o.dilim - 1];
        if (dl) { dl.classList.add("parilti"); this.parilti.push({ e: dl, kalan: 0.12 }); }
        break;
      }
      default: break;
    }
  }

  private parilti: { e: HTMLElement; kalan: number }[] = [];
  private oncekiKart = 3;
  private oncekiHazir: boolean[] = [false, false, false, false];
  private parlaKalan: number[] = [0, 0, 0, 0];

  /** ux § 7: ne oldu + ne yapabilirsin; suçlayıcı sözcük yok. */
  private retMetni(neden: string, yuva: number, d: Dunya): string {
    const t = d.topaclar[this.yerel]!;
    const p = d.profiller[this.yerel]!;
    switch (neden) {
      case "takimDustu": return "Takım düştü: Takım Ultisi için 2 topaç gerekir.";
      case "enerji": if (yuva === TAKIM_YUVA) return "Takım Enerjisi henüz dolmadı."; return `Enerji yetmiyor: ${Math.ceil(yuvaBedeli(t, p, yuva) / 100)} dilim gerekir.`;
      case "bekleme": return `Bekleme: ${(((yuva === 0 ? t.bekleme1 : t.bekleme2) / AYAR.adimHz)).toFixed(1)} sn.`;
      case "kilitli": return "Bu yuva Lv.3 Çekirdekte açılır.";
      case "ultiKullanildi": return yuva === TAKIM_YUVA ? "Takım Ultisi bu maçta kullanıldı." : "Ulti bu maçta kullanıldı.";
      case "rakipUlti": return "Rakibin Ulti'si sürerken Ulti kullanılamaz.";
      case "stamina": return "Stamina yetmiyor: Ulti'nin bedeli var.";
      case "mesgul": return "Önce süren yetenek bitsin.";
      case "yok": return yuva === 3 ? "Parça Tekniği ilk sürümde yok." : "Bu yuva boş.";
      default: return "";
    }
  }

  guncelle(d: Dunya, dt: number, basiliYuva = -1): void {
    const m = d.mac;
    const T = d.takimlar!;
    // H1 / H2
    for (let k = 0; k < 2; k++) {
      const i = k === 0 ? this.yerel : 1 - this.yerel;
      const p = d.profiller[i]!;
      const t = d.topaclar[i]!;
      const pn = this.paneller[k]!;
      const oran = staminaOrani(t, p);
      this.yaz(pn.ik, elementSvg(p.element, 14), true);
      this.yaz(pn.ad, `${this.adlar[k]} · ${ELEMENT_RENK[p.element].ad} ${KOKEN_RENK[p.koken].ad}`);
      this.yaz(pn.lv, `Lv.${d.seviye[i]}`);
      pn.dolgu.style.width = `${Math.max(0, oran) * 100}%`;
      const sinif = sinifOran(oran);
      if (pn.dolgu.className !== sinif) pn.dolgu.className = sinif;
      pn.unlem.style.display = oran < AYAR.kritikEsik ? "block" : "none";
      // kendi çubuğunda sayı, rakipte yok (ux H2: kendi sayı, rakip oran)
      this.yaz(pn.sayi, k === 0 ? `${Math.max(0, Math.round(oran * 100))}%` : "");
      // H2: rakibin 3 element simgesi, elenen çarpılı (H1'de de kendi takımı H8'de)
      if (k === 1) this.yaz(pn.ekip, T[i]!.uyeler.map((u) => elementSvg(u.profil.element, 14, { soluk: u.elendi === 1, capraz: u.elendi === 1 })).join(""), true);
      // Enerji 3 dilim (D2: yalnız devralma; D3'te dolar)
      const e = t.enerji;
      for (let s = 0; s < 3; s++) {
        const dolu = Math.max(0, Math.min(1, (e - s * 100) / 100));
        const dl = pn.enerji[s]!;
        (dl.firstElementChild as HTMLElement).style.width = `${dolu * 100}%`;
        dl.classList.toggle("dolu", dolu >= 1);
      }
      const ultiAcik = yuvaDurumu(d, i, ULTI_YUVA);
      const ultiVar = d.profiller[i]!.yetenekler[ULTI_YUVA]! >= 0 && ultiAcik !== "kilitli" && ultiAcik !== "ultiKullanildi" && ultiAcik !== "yok";
      this.yaz(pn.enerjiYazi, e >= 300 ? (ultiVar ? "ULTİ" : "DOLU") : "");
      pn.enerjiYazi.classList.toggle("ulti", e >= 300 && ultiVar);
      // D8: Takım Enerjisi (4. dilim): dolu = parlak; takım düştü / kullanıldı = kesikli gri
      const te = d.takimEnerji[i]!;
      (pn.takimDilim.firstElementChild as HTMLElement).style.width = `${Math.max(0, Math.min(1, te / AYAR_.enerji.takimDilim)) * 100}%`;
      pn.takimDilim.classList.toggle("dolu", te >= AYAR_.enerji.takimDilim && !d.takimUltiKullanildi[i]);
      pn.takimDilim.classList.toggle("dustu", d.takimUltiKullanildi[i] === 1 || elenmemisKart(d, i) < TAKIM_ULTI_KART);
      pn.takimDilim.title = d.takimUltiKullanildi[i] ? "Takım Ultisi kullanıldı" : elenmemisKart(d, i) < TAKIM_ULTI_KART ? "Takım düştü" : `Takım Enerjisi ${Math.floor(te)}/100`;
      const tikOran = t.tik / p.parametreler.burstEsik;
      this.yaz(pn.ct, catlakSvg(tikOran), true);
      pn.ct.classList.toggle("titre", tikOran >= 0.9);
    }
    // D8 H5 "Takım düştü": Takım Ultisi kullanılmadan elenmemiş kart 2'nin altına inince bir kez
    const kart = elenmemisKart(d, this.yerel);
    if (this.oncekiKart >= TAKIM_ULTI_KART && kart < TAKIM_ULTI_KART && !d.takimUltiKullanildi[this.yerel] && d.seviye[this.yerel]! >= AYAR_.yetenek.seviyeYuva[TAKIM_YUVA]!) this.bantGoster("Takım düştü", 1.6);
    this.oncekiKart = kart;
    // H3 skor
    this.yaz(this.skor, `${m.puan[this.yerel]} – ${m.puan[1 - this.yerel]}`);
    // H4 süre
    const kalan = Math.max(0, MAC_ADIM.macSuresi - m.saat);
    if (m.aniOlum) {
      const ak = Math.max(0, Math.ceil((MAC_ADIM.aniOlum - m.aniOlumTick) / AYAR.adimHz));
      this.yaz(this.sure, `ANİ ÖLÜM ${ak}`);
      this.sure.className = "sure ani";
    } else {
      const sn = Math.ceil(kalan / AYAR.adimHz);
      this.yaz(this.sure, `${Math.floor(sn / 60)}:${String(sn % 60).padStart(2, "0")}`);
      this.sure.className = sn <= 10 && m.faz !== "geriSayim" ? "sure son" : "sure";
    }
    // geri sayım: Hazır (2 s) → 3-2-1 → BAŞLA (ortada 48 px)
    if (m.faz === "geriSayim") {
      const gecen = MAC_ADIM.geriSayim - m.kalanTick;
      const metin = gecen < MAC_ADIM.hazir ? "<small>HAZIR</small>" : String(3 - Math.floor((gecen - MAC_ADIM.hazir) / AYAR.adimHz));
      this.yaz(this.gs, metin, true);
      this.gs.classList.add("acik");
      this.basla = 0.5;
    } else if (this.basla > 0) {
      this.basla -= dt;
      this.yaz(this.gs, "BAŞLA");
      this.gs.classList.toggle("acik", this.basla > 0);
    } else this.gs.classList.remove("acik");

    const ben = d.topaclar[this.yerel]!;
    const bp = d.profiller[this.yerel]!;
    // H6 yuvaları (ux § 2 H6): hazır · bekleme (karartma + sn) · Enerji yetersiz (kesikli + nokta) · kilitli (Lv.3) ·
    // basılı (kalın + 4 px yukarı) · etkin (telegraf/etki) · kullanıldı (Ulti); yuva 4 boş (Parça Tekniği yok)
    const yv = this.yuvalar;
    for (let k = 0; k < 4; k++) {
      const y = yv[k]!;
      const no = yuvaYetenegi(d, this.yerel, k);
      const bilgi = no >= 0 ? YETENEK_SIM[no]! : null;
      const durum = yuvaDurumu(d, this.yerel, k);
      const etkin = ben.yetenekFaz !== 0 && ben.yetenekYuva === k;
      const bekleme = k === 0 ? ben.bekleme1 : k === 1 ? ben.bekleme2 : 0;
      const hazir = durum === null;
      const kilit = durum === "kilitli" || durum === "takimDustu";
      const kullanildi = durum === "ultiKullanildi";
      const bos = !bilgi;
      const yetmez = !kilit && !kullanildi && !bos && (durum === "enerji" || durum === "stamina");
      if (hazir && !this.oncekiHazir[k]) this.parlaKalan[k] = 0.15;
      this.oncekiHazir[k] = hazir;
      if (this.parlaKalan[k]! > 0) this.parlaKalan[k]! -= dt;
      y.classList.toggle("hazir", hazir);
      y.classList.toggle("parla", this.parlaKalan[k]! > 0);
      y.classList.toggle("bekle", bekleme > 0 && !etkin);
      y.classList.toggle("yetmez", yetmez && bekleme === 0);
      y.classList.toggle("kilit", kilit);
      y.classList.toggle("kullanildi", kullanildi);
      y.classList.toggle("yok", bos);
      y.classList.toggle("etkin", etkin);
      y.classList.toggle("basili", basiliYuva === k && !bos);
      y.dataset["durum"] = etkin ? "etkin" : basiliYuva === k ? "basili" : hazir ? "hazir" : bekleme > 0 ? "bekleme" : (durum ?? "hazir");
      const sweep = y.firstElementChild as HTMLElement;
      const toplam = bilgi?.beklemeAdim ?? 1;
      sweep.style.height = `${bekleme > 0 && !etkin ? (bekleme / toplam) * 100 : 0}%`;
      y.title = bilgi ? (k === TAKIM_YUVA ? "Takım Ultisi · Takım Enerjisi (4. dilim)" : `${["Yetenek", "Özel Yetenek", "Ulti"][k]}: ${bilgi.ad} · ${bilgi.enerjiBedel / 100} dilim`) : "Boş";
      this.yaz(this.yuvaAdlari[k]!, bilgi ? bilgi.ad : "");
      this.yuvaAdlari[k]!.classList.toggle("on", hazir || basiliYuva === k);
      const ic = y.lastElementChild as HTMLElement;
      const simge = bilgi ? elementSvg(bp.element, 18).replace('class="els"', 'class="els ys"') : "";
      if (bos) this.yaz(ic, "—");
      else if (durum === "takimDustu") this.yaz(ic, `<span>✕</span>`, true);
      else if (kilit) this.yaz(ic, `<svg viewBox="0 0 12 12" width="12" height="12" aria-label="kilitli"><rect x="2" y="5" width="8" height="6" rx="1" fill="#8d989e"/><path d="M4 5V3.6a2 2 0 0 1 4 0V5" fill="none" stroke="#8d989e" stroke-width="1.5"/></svg><span>Lv.${AYAR_.yetenek.seviyeYuva[k]}</span>`, true);
      else if (kullanildi) this.yaz(ic, `${simge}<span>✓</span>`, true);
      else if (bekleme > 0 && !etkin) { const sn = bekleme / AYAR.adimHz; this.yaz(ic, `<span class="n">${sn >= 10 ? sn.toFixed(0) : sn.toFixed(1)}</span>`, true); }
      else if (yetmez) this.yaz(ic, `${simge}<span class="nok">${"<b></b>".repeat(k === TAKIM_YUVA ? 1 : Math.ceil(yuvaBedeli(ben, bp, k) / 100))}</span>`, true);
      else this.yaz(ic, simge, true);
    }
    for (const p of this.parilti) { p.kalan -= dt; if (p.kalan <= 0) p.e.classList.remove("parilti"); }
    this.parilti = this.parilti.filter((p) => p.kalan > 0);
    // H7
    this.rozet(this.dash, ben.dashBekleme, bp.sim.dashBekleme, ben.stamina - AYAR.eylemStaminaPayi < bp.sim.dashMaliyet);
    this.rozet(this.sekme, ben.sekmeBekleme, Math.round(AYAR.sekmeBekleme * AYAR.adimHz), ben.stamina - AYAR.eylemStaminaPayi < AYAR.sekmeStamina);
    // H8
    const tk = T[this.yerel]!;
    const tabHazir = geriCekAcik(d, this.yerel);
    for (let k = 0; k < 3; k++) {
      const u = tk.uyeler[k]!;
      const kutu = this.takim[k]!;
      const aktif = k === tk.aktif;
      const o = this.uyeOrani(d, this.yerel, k, u);
      this.yaz(kutu.children[2] as HTMLElement, elementSvg(u.profil.element, 28, { capraz: u.elendi === 1 }), true);
      const st = kutu.querySelector(".st i") as HTMLElement;
      st.style.width = `${o * 100}%`;
      st.className = sinifOran(o);
      kutu.classList.toggle("aktif", aktif && !u.elendi);
      kutu.classList.toggle("elendi", u.elendi === 1);
      kutu.classList.toggle("tabhazir", aktif && tabHazir);
      kutu.classList.toggle("cekiliyor", aktif && ben.geriCekKalan > 0);
      kutu.title = `${ELEMENT_RENK[u.profil.element].ad} ${KOKEN_RENK[u.profil.koken].ad}${u.elendi ? " · elendi" : ""}`;
    }
    // H14 takım değişimi seçimi (kaybeden için; 1/2/3 ya da tıkla; süre çubuğu)
    const seciyor = m.faz === "turArasi" && tk.secim === -2;
    this.ds.classList.toggle("acik", seciyor || (m.faz === "turArasi" && tk.secim >= 0 && tk.uyeler[tk.aktif]!.elendi === 1));
    if (m.faz === "turArasi") {
      this.yaz(this.dsBaslik, seciyor ? "Sıradaki topacını seç · 1 · 2 · 3 (süre dolunca sıradaki gelir)" : "Seçildi · hazırlanıyor");
      for (let k = 0; k < 3; k++) {
        const u = tk.uyeler[k]!;
        const kart = this.dsKartlar[k]!;
        this.yaz(kart.children[1] as HTMLElement, elementSvg(u.profil.element, 18, { capraz: u.elendi === 1 }), true);
        this.yaz(kart.children[2] as HTMLElement, `${ELEMENT_RENK[u.profil.element].ad} ${KOKEN_RENK[u.profil.koken].ad} · ${u.profil.tip}${u.elendi ? " · elendi" : ""}`);
        (kart.querySelector(".st i") as HTMLElement).style.width = `${this.uyeOrani(d, this.yerel, k, u) * 100}%`;
        kart.classList.toggle("elendi", u.elendi === 1);
        kart.classList.toggle("secildi", tk.secim === k);
      }
      const toplam = MAC_ADIM.kutlama + MAC_ADIM.secim;
      this.dsSure.style.width = `${(m.kalanTick / toplam) * 100}%`;
    }
    if (this.bantKalan > 0) {
      this.bantKalan -= dt;
      if (this.bantKalan <= 0) this.bant.classList.remove("acik");
    }
  }

  private uyeOrani(d: Dunya, i: number, k: number, u: TakimUyesi): number {
    if (u.elendi) return 0;
    const tk = d.takimlar![i]!;
    const s = k === tk.aktif ? d.topaclar[i]!.stamina : u.stamina;
    return Math.max(0, s / u.profil.maxStamina);
  }

  private rozet(r: HTMLElement, kalan: number, toplam: number, yetmez: boolean): void {
    r.classList.toggle("bekle", kalan > 0);
    r.classList.toggle("yetmez", yetmez);
    (r.firstElementChild as HTMLElement).style.height = `${toplam > 0 ? (kalan / toplam) * 100 : 0}%`;
    const sn = kalan / AYAR.adimHz;
    this.yaz(r.querySelector(".n") as HTMLElement, kalan > 0 ? (sn >= 10 ? sn.toFixed(0) : sn.toFixed(1)) : "");
  }

  yokEt(): void {
    this.kok.remove();
    this.stil.remove();
  }
}
