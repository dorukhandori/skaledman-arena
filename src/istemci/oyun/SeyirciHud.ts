import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import type { Dunya, Olay } from "../../paylasilan/sim/durum.ts";
import { MAC_ADIM } from "../../paylasilan/sim/mac.ts";
import { staminaOrani } from "../../paylasilan/sim/topac.ts";
import { TAKIM_ULTI_KART, elenmemisKart } from "../../paylasilan/sim/yetenek.ts";
import { CEKIRDEKLER, DISKLER, GOVDELER, UCLAR } from "../../paylasilan/veri/katalog.ts";
import { MADENLER } from "../../paylasilan/veri/harita.ts";
import { YETENEK_SIM } from "../../paylasilan/veri/yetenekSablon.ts";
import { elementSvg } from "./elementSimge.ts";
import { BITIS_AD, catlakSvg, sinifOran } from "./MacHud.ts";
import { ELEMENT_RENK } from "./renkler.ts";

// D8 seyirci / OBS HUD'u (ux § 5): 960×540 mantıksal DOM katmanı. İki taraf SİMETRİK (sol = oyuncu 1, sağ = oyuncu 2),
// iki tarafta da stamina YÜZDESİ, Enerji 3 dilim + Takım Enerjisi, Çatlak, takımın üç element simgesi (elenen çarpılı).
// Yetenek yuvaları, takım yuvaları, Tab, ipuçları YOK. Ad 14 px, skor 28, süre 18, olay bandı 20; çizgiler ≥ 2 px.
// Alt köşeler (GU-E; y 450-532): iki tarafın üç parça kartı dikey yığın (Çekirdek + Lv + element simgesi; aktif kartta
// Gövde · Disk · Uç), aktif vurgulu. Çanağın oynanabilir elipsiyle kesişmez (test/kamera.test.ts).
// Kullanıcı adları yalnız `textContent` ile basılır (XSS); innerHTML yalnız kendi SVG'lerimiz.

const STIL = `
.sh { position:absolute; left:0; top:0; width:960px; height:540px; transform-origin:0 0; pointer-events:none; font-family:"Nunito Sans",system-ui,sans-serif; color:#f3f1e8; user-select:none; }
.sh .pn { position:absolute; top:8px; width:300px; height:78px; background:rgba(12,25,29,.92); border:2px solid #050d10; border-radius:8px; box-shadow:inset 0 0 0 2px #24414b; }
.sh .pn.sol { left:8px; } .sh .pn.sag { left:652px; }
.sh .pn .s1 { position:absolute; left:8px; right:8px; top:3px; height:20px; display:flex; align-items:center; gap:6px; font-size:14px; line-height:18px; font-weight:900; white-space:nowrap; }
.sh .pn.sag .s1 { flex-direction:row-reverse; }
.sh .pn .ad { overflow:hidden; text-overflow:ellipsis; max-width:170px; }
.sh .pn .lv { color:#c9d4d7; font-weight:800; font-size:12px; }
.sh .pn .bos { flex:1; }
.sh .pn .ekip { display:flex; gap:3px; }
.sh .bar { position:absolute; left:8px; top:26px; width:280px; height:16px; background:#1b2a30; border:2px solid #050d10; border-radius:3px; overflow:hidden; }
.sh .bar i { position:absolute; top:0; bottom:0; width:100%; background:#f2e8b0; }
.sh .pn.sol .bar i { left:0; } .sh .pn.sag .bar i { right:0; }
.sh .bar i.amber { background:#f2a33a; }
.sh .bar i.kirmizi { background:repeating-linear-gradient(135deg,#e3350d 0 4px,#9e2207 4px 7px); }
.sh .bar u { position:absolute; top:0; bottom:0; width:2px; background:rgba(5,13,16,.9); }
.sh .bar b { position:absolute; top:0; right:6px; font-size:13px; line-height:14px; font-weight:900; color:#fff; text-shadow:0 0 2px #000,0 1px 0 #000,1px 0 0 #000,-1px 0 0 #000; z-index:1; }
.sh .pn.sag .bar b { right:auto; left:6px; }
.sh .en { position:absolute; left:8px; top:48px; display:flex; gap:4px; align-items:center; }
.sh .pn.sag .en { left:auto; right:8px; flex-direction:row-reverse; }
.sh .en span { position:relative; width:40px; height:12px; border:2px solid #9fb0b5; border-radius:2px; background:rgba(5,13,16,.5); overflow:hidden; }
.sh .en span i { position:absolute; left:0; top:0; bottom:0; background:#7fd3ff; }
.sh .en span.dolu { border-color:#cfeeff; }
.sh .en span.tk { width:28px; border-color:#d9a441; margin:0 4px; }
.sh .en span.tk i { background:#ffcf5a; }
.sh .en span.tk.dolu { border-color:#ffe39a; box-shadow:0 0 5px #ffb347; }
.sh .en span.tk.dustu { border-style:dashed; border-color:#6d7a7f; } .sh .en span.tk.dustu i { background:#6d7a7f; }
.sh .ct { position:absolute; left:264px; top:46px; width:24px; height:24px; }
.sh .pn.sag .ct { left:8px; }
.sh .skor { position:absolute; left:394px; top:6px; width:172px; height:32px; text-align:center; font:900 28px/32px system-ui; letter-spacing:1px; background:rgba(12,25,29,.92); border:2px solid #050d10; border-radius:8px; }
/* GU-D: skor + süre y ≤ 66 (çanak ×1,83: oynanabilir elipsin üst ucu y 69, plakanın altına girmesin) */
.sh .sure { position:absolute; left:428px; top:44px; width:104px; height:18px; text-align:center; font:800 17px/18px system-ui; font-variant-numeric:tabular-nums; background:rgba(12,25,29,.88); border:2px solid #050d10; border-radius:6px; }
.sh .sure.son { color:#ff5a3a; text-decoration:underline; text-decoration-thickness:2px; }
.sh .sure.ani { color:#fff; background:#a3260a; font-size:15px; }
.sh .bant { position:absolute; left:190px; top:96px; width:580px; height:42px; text-align:center; font:900 20px/38px system-ui; letter-spacing:.5px; background:rgba(5,13,16,.9); border:2px solid #f4cf47; border-radius:8px; opacity:0; transition:opacity .15s; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding:0 10px; }
.sh .bant.acik { opacity:1; }
.sh .bant .els { display:inline-block; vertical-align:-3px; margin-left:6px; }
.sh .gs { position:absolute; left:330px; top:220px; width:300px; height:80px; text-align:center; font:900 48px/80px system-ui; letter-spacing:2px; color:#fff; text-shadow:0 3px 0 #050d10,0 0 12px rgba(0,0,0,.6); opacity:0; }
.sh .gs.acik { opacity:1; } .sh .gs small { font-size:30px; }
/* GU-E (sahip kararı 3): parça kartları köşelerde dikey yığın, büyük çanağın (oynanabilir elips y 69–526, x 41–919) dışında.
   Aktif kart iki satır (Çekirdek + Lv / Gövde · Disk · Uç), diğerleri tek satır: yığın y 450–532, x 8–148 ve 812–952 (simge 14 px). */
.sh .kartlar { position:absolute; bottom:8px; width:140px; display:flex; flex-direction:column; gap:3px; }
.sh .kartlar.sol { left:8px; } .sh .kartlar.sag { left:812px; }
.sh .kart { position:relative; width:140px; height:20px; padding:1px 6px; box-sizing:border-box; background:rgba(12,25,29,.9); border:2px solid #24414b; border-radius:6px; overflow:hidden; }
.sh .kart .ust { height:14px; display:flex; align-items:center; gap:4px; font-size:12px; line-height:14px; font-weight:900; white-space:nowrap; }
.sh .kart .ust .ca { min-width:0; overflow:hidden; text-overflow:ellipsis; }
.sh .kart .ust .lv { color:#ffcf5a; margin-left:auto; }
.sh .kart .alt { display:none; font-size:10px; line-height:11px; color:#c9d4d7; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:1px; }
.sh .kart.aktif { height:36px; border:3px solid #f4cf47; padding:1px 5px; }
.sh .kart.aktif .alt { display:block; padding-right:10px; }
.sh .kart.aktif::after { content:"▲"; position:absolute; right:4px; bottom:1px; font-size:9px; color:#f4cf47; }
/* harita kozmetiği: parça kartında 4 malzeme karesi [Çekirdek, Gövde, Disk, Uç]; tümü Market ise hiç yok */
.sh .kart .mz { display:flex; gap:2px; flex:none; } .sh .kart .mz i { width:6px; height:6px; box-shadow:inset 0 0 0 1px #050d10; }
.sh .kart.elendi { opacity:.45; } .sh .kart.elendi .ust span.ca { text-decoration:line-through; text-decoration-thickness:2px; }
`;

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif = "", ust?: HTMLElement, metin = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin) e.textContent = metin;
  ust?.appendChild(e);
  return e;
}

const ADLAR = new Map<string, string>([...CEKIRDEKLER, ...GOVDELER, ...DISKLER, ...UCLAR].map((p) => [p.id, p.ad]));
const parcaAdi = (id: string): string => ADLAR.get(id) ?? id;

interface Panel { ik: HTMLElement; ad: HTMLElement; lv: HTMLElement; ekip: HTMLElement; dolgu: HTMLElement; sayi: HTMLElement; enerji: HTMLElement[]; takim: HTMLElement; ct: HTMLElement }
interface Kart { kok: HTMLElement; ik: HTMLElement; ca: HTMLElement; lv: HTMLElement; alt: HTMLElement }

export class SeyirciHud {
  readonly kok = el("div", "sh");
  private stil = el("style");
  private paneller: [Panel, Panel];
  private kartlar: [Kart[], Kart[]] = [[], []];
  private skor = el("div", "skor");
  private sure = el("div", "sure");
  private bant = el("div", "bant");
  private gs = el("div", "gs");
  private bantKalan = 0;
  private onbellek = new Map<HTMLElement, string>();
  private oncekiKart: [number, number] = [3, 3];
  /** son gösterilen bant metni (test) */
  bantMetni = "";

  constructor(ust: HTMLElement, private adlar: [string, string], private seviyeler: [readonly number[] | null, readonly number[] | null], malzemeler: [string, string] = ["", ""]) {
    this.stil.textContent = STIL;
    document.head.appendChild(this.stil);
    this.paneller = [this.panel("sol"), this.panel("sag")];
    this.bant.setAttribute("aria-live", "polite");
    this.bant.setAttribute("role", "status");
    this.kok.append(this.skor, this.sure, this.bant, this.gs);
    for (let i = 0; i < 2; i++) {
      const sira = el("div", `kartlar ${i === 0 ? "sol" : "sag"}`, this.kok);
      for (let k = 0; k < 3; k++) {
        const kok = el("div", "kart", sira);
        const ustS = el("div", "ust", kok);
        const ik = el("span", "", ustS);
        const ca = el("span", "ca", ustS);
        const mz = (malzemeler[i] ?? "").slice(k * 4, k * 4 + 4);
        if (/[1-8]/.test(mz)) {
          const s = el("span", "mz", ustS);
          s.dataset["malzeme"] = mz;
          for (const c of mz) { const q = el("i", "", s); q.style.background = c === "0" ? "transparent" : MADENLER.find((m) => m.kademe === Number(c))?.renk.ana ?? "#888"; }
        }
        const lv = el("span", "lv", ustS);
        const alt = el("div", "alt", kok);
        this.kartlar[i]!.push({ kok, ik, ca, lv, alt });
      }
    }
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
    const sayi = el("b", "", bar);
    const en = el("div", "en", kok);
    const enerji: HTMLElement[] = [];
    for (let k = 0; k < 3; k++) { const d = el("span", "", en); el("i", "", d); enerji.push(d); }
    const takim = el("span", "tk", en); el("i", "", takim);
    const ct = el("span", "ct", kok);
    return { ik, ad, lv, ekip, dolgu, sayi, enerji, takim, ct };
  }

  hizala(x: number, y: number, olcek: number): void {
    this.kok.style.transform = `translate(${x}px, ${y}px) scale(${olcek})`;
  }

  private yaz(e: HTMLElement, s: string, html = false): void {
    if (this.onbellek.get(e) === s) return;
    this.onbellek.set(e, s);
    if (html) e.innerHTML = s; else e.textContent = s;
  }

  /** H5: metin parçaları textContent ile; `simge` yalnız kendi SVG'miz. */
  private bantGoster(metin: string, sure = 1.8, simge = ""): void {
    this.bant.textContent = metin;
    if (simge) this.bant.insertAdjacentHTML("beforeend", simge);
    this.bantMetni = metin;
    this.bant.classList.add("acik");
    this.bantKalan = sure;
  }

  /** Sim olayı → nötr anlatım (oyuncu görünümündeki bantların seyirci karşılığı; kim + ne). */
  olay(o: Olay, d: Dunya): void {
    const ad = (i: number) => this.adlar[i] ?? "";
    switch (o.tur) {
      case "turBitti": {
        const s = o.sonuc;
        if (s.tur === "berabere") this.bantGoster("BERABERE · iki topaç da elendi", 2);
        else this.bantGoster(`${BITIS_AD[s.tur]} +${s.puan} · ${ad(s.kazanan)}`, 2);
        break;
      }
      case "aniOlum": this.bantGoster("Ani ölüm", 2); break;
      case "geriCek": this.bantGoster(`${ad(o.i)} topaç değiştiriyor`, 1.4); break;
      case "yetenekBasladi":
        if (o.kademe === 4) this.bantGoster(`${ad(o.i)}: TAKIM ULTİSİ`, 2);
        else if (o.kademe === 3) this.bantGoster(`${ad(o.i)}: Ulti · ${YETENEK_SIM[o.no]!.ad}`, 1.8, elementSvg(d.profiller[o.i]!.element, 18));
        break;
      case "takimEnerjiDoldu": if (d.seviye[o.i]! >= AYAR.yetenek.seviyeYuva[3]! && elenmemisKart(d, o.i) >= TAKIM_ULTI_KART) this.bantGoster(`${ad(o.i)}: Takım Ultisi hazır`, 1.6); break;
      case "macBitti": {
        const m = o.sonuc;
        if (m.kazanan >= 0) this.bantGoster(`${ad(m.kazanan)} kazandı · ${m.puan[0]} – ${m.puan[1]}`, 4);
        break;
      }
      default: break;
    }
  }

  guncelle(d: Dunya, dt: number): void {
    const m = d.mac;
    const T = d.takimlar!;
    for (let i = 0; i < 2; i++) {
      const p = d.profiller[i]!;
      const t = d.topaclar[i]!;
      const pn = this.paneller[i]!;
      const oran = staminaOrani(t, p);
      this.yaz(pn.ik, elementSvg(p.element, 18), true);
      this.yaz(pn.ad, this.adlar[i] ?? "");
      this.yaz(pn.lv, `Lv.${d.seviye[i]}`);
      pn.dolgu.style.width = `${Math.max(0, oran) * 100}%`;
      const sinif = sinifOran(oran);
      if (pn.dolgu.className !== sinif) pn.dolgu.className = sinif;
      // ux § 5: iki tarafta da stamina YÜZDESİ
      this.yaz(pn.sayi, `${Math.max(0, Math.round(oran * 100))}%`);
      this.yaz(pn.ekip, T[i]!.uyeler.map((u) => elementSvg(u.profil.element, 16, { soluk: u.elendi === 1, capraz: u.elendi === 1 })).join(""), true);
      for (let s = 0; s < 3; s++) {
        const dolu = Math.max(0, Math.min(1, (t.enerji - s * 100) / 100));
        const dl = pn.enerji[s]!;
        (dl.firstElementChild as HTMLElement).style.width = `${dolu * 100}%`;
        dl.classList.toggle("dolu", dolu >= 1);
      }
      const te = d.takimEnerji[i]!;
      (pn.takim.firstElementChild as HTMLElement).style.width = `${Math.max(0, Math.min(1, te / AYAR.enerji.takimDilim)) * 100}%`;
      pn.takim.classList.toggle("dolu", te >= AYAR.enerji.takimDilim && !d.takimUltiKullanildi[i]);
      const kart = elenmemisKart(d, i);
      pn.takim.classList.toggle("dustu", d.takimUltiKullanildi[i] === 1 || kart < TAKIM_ULTI_KART);
      if (this.oncekiKart[i]! >= TAKIM_ULTI_KART && kart < TAKIM_ULTI_KART && !d.takimUltiKullanildi[i]) this.bantGoster(`${this.adlar[i]}: Takım düştü`, 1.6);
      this.oncekiKart[i] = kart;
      this.yaz(pn.ct, catlakSvg(t.tik / p.parametreler.burstEsik), true);
      // parça kartları (aktif topaç vurgulu, elenen soluk + üstü çizili)
      const tk = T[i]!;
      for (let k = 0; k < 3; k++) {
        const u = tk.uyeler[k]!;
        const c = this.kartlar[i]![k]!;
        const pr = u.profil.parcalar;
        this.yaz(c.ik, elementSvg(u.profil.element, 14, { capraz: u.elendi === 1 }), true);
        this.yaz(c.ca, parcaAdi(pr.cekirdek));
        const lv = u.seviye ?? this.seviyeler[i]?.[k] ?? (k === tk.aktif ? d.seviye[i] : null);
        this.yaz(c.lv, lv ? `Lv.${lv}` : "");
        this.yaz(c.alt, `${parcaAdi(pr.govde)} · ${parcaAdi(pr.disk)} · ${parcaAdi(pr.uc)}`);
        c.kok.classList.toggle("aktif", k === tk.aktif && !u.elendi);
        c.kok.classList.toggle("elendi", u.elendi === 1);
        c.kok.style.borderColor = k === tk.aktif && !u.elendi ? "" : `#${ELEMENT_RENK[u.profil.element].orta.toString(16).padStart(6, "0")}`;
      }
    }
    this.yaz(this.skor, `${m.puan[0]} – ${m.puan[1]}`);
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
    if (m.faz === "geriSayim") {
      const gecen = MAC_ADIM.geriSayim - m.kalanTick;
      this.yaz(this.gs, gecen < MAC_ADIM.hazir ? "<small>HAZIR</small>" : String(3 - Math.floor((gecen - MAC_ADIM.hazir) / AYAR.adimHz)), true);
      this.gs.classList.add("acik");
    } else this.gs.classList.remove("acik");
    if (this.bantKalan > 0) {
      this.bantKalan -= dt;
      if (this.bantKalan <= 0) this.bant.classList.remove("acik");
    }
  }

  yokEt(): void {
    this.kok.remove();
    this.stil.remove();
  }
}
