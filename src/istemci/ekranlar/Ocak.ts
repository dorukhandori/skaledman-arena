import { MADENLER } from "../../paylasilan/veri/harita.ts";
import { BANT_METNI, type BantEtiketi } from "../../paylasilan/kurallar/ustalik.ts";
import type { EkranBaglami } from "../main.ts";
import { apiGet, apiPost, git } from "../hesap.ts";
import { type Ipucu } from "../bilgic/ipuclari.ts";
import { ipucuBas, ipucuSec } from "../bilgic/haritaIpucu.ts";
import { cuzdanYaz, ekranKok, el } from "./arayuz.ts";
import { Ses } from "../ses/Ses.ts";
import { CEVHER_IKON, GORUNUM_IKON, KULCE_IKON, USTALIK_IKON, USTA_PARILTI } from "./haritaVarlik.ts";
import { efektStili, halkaDalga, kirintiPatlat, merkez, parilti } from "./haritaEfekt.ts";

// Ocak ekranı (docs/design/harita/07 § 5, 03, 12): Atölye'nin masası. Üst bant iki Ustalık çubuğu; solda cevher listesi
// (K1–K4; kilitli kademe "USTALIK n"), sağda seçili kademe paneli: ERİT (parti −/+ 1–20, önizleme, başarı %, oran, bant),
// kozmetik TARİFLER (durum: ✓ / İŞL. n / SAHİP / eksik soluk), PARÇA ızgarası (kilidi açık ve bu kademede üretilebilen
// parçalar; Uç/Disk/Gövde/Çekirdek), sonuç kartı (malzemeli ad, YAPAN, NO., USTA İŞİ) ve ana düğme (ERİT · DÖV · ÜRET).
// Sunucu yetkili; her yazım `ref` (UUID) ile idempotent. Seçiciler: [data-kademe], [data-tarif], [data-parca],
// [data-eylem=ana|eksi|arti|yeniden|atolye], [data-sonuc].

interface Ust { seviye: number; ilerleme: number; tecrube: number; sonraki: number | null }
interface KademeG { kademe: number; id: string; ad: string; renk: { ana: string; koyu: string }; esik: number; cevher: number; kulce: number; oran: number; basari: number; bant: BantEtiketi; eritilebilir: boolean }
interface TarifG { id: string; durum: string; tur: string; kademe: number; ad: string; girdi?: { kademe: number; kulce: number }[]; altin?: number; esik?: number; ustaIsiSansi?: number; usta?: boolean; yeniden?: { girdi: { kademe: number; kulce: number }[]; altin: number } }
interface ParcaG { id: string; ad: string; tur: string; katman: string; acik: boolean; enAzKademe: number | null; kademeler: { kademe: number; uygun: boolean; kulce?: number; iscilik?: number; esik?: number; ustalik?: boolean; hazir?: boolean }[] }
interface UretilenG { anahtar: string; id: number; tur: string; tanim: string; ad: string; malzeme: number; seri: number; yapimciAd: string; usta: boolean; uretim: number; deger: number }
export interface OcakG {
  acik: boolean; bakiye: number; cevher: number[]; kulce: number[]; kademeler: KademeG[]; ustalik: { madencilik: Ust; isleme: Ust };
  tarifler: TarifG[]; parcalar: ParcaG[]; gorunumler: { id: string; usta: boolean }[]; uretilenler: UretilenG[]; vitrin: string[]; koleksiyonDegeri: number;
}

const STIL = `
.ock .kart { width:min(calc(620 * var(--p)), 100%); padding:calc(4 * var(--p)); background-image: linear-gradient(rgba(70,110,170,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(70,110,170,.08) 1px, transparent 1px); background-size: calc(12 * var(--p)) calc(12 * var(--p)); }
.ock .oc-ust { display:flex; gap:calc(10 * var(--p)); color:var(--soluk); text-transform:uppercase; flex-wrap:wrap; }
.ock .oc-ust .cb { display:inline-block; width:calc(40 * var(--p)); height:calc(4 * var(--p)); background:#0d0f18; box-shadow:inset 0 0 0 var(--p) var(--harc); position:relative; vertical-align:middle; }
.ock .oc-ust .cb i { position:absolute; left:0; top:0; bottom:0; background:#e8762f; }
.ock .oc-govde { display:grid; grid-template-columns:calc(150 * var(--p)) 1fr; gap:calc(6 * var(--p)); margin-top:calc(4 * var(--p)); }
.ock .oc-liste { display:flex; flex-direction:column; gap:calc(2 * var(--p)); }
.ock .oc-liste button { display:grid; grid-template-columns:calc(14 * var(--p)) 1fr auto; gap:calc(4 * var(--p)); text-align:left; justify-content:stretch; min-height:max(44px, calc(20 * var(--p))); }
.ock .oc-liste button[aria-pressed=true] { box-shadow:inset 0 0 0 var(--p) var(--gold, #fcd35a); }
.ock .rz { display:inline-flex; align-items:center; justify-content:center; width:calc(12 * var(--p)); height:calc(12 * var(--p)); color:#0b1418; font-size:.8em; box-shadow:inset 0 0 0 var(--p) #0b1418; }
.ock .oc-panel { padding:calc(4 * var(--p)) calc(6 * var(--p)); background:#11141f; box-shadow:inset 0 0 0 var(--p) var(--bronz-1); line-height:.95; display:flex; flex-direction:column; gap:calc(3 * var(--p)); }
.ock .oc-panel b { color:var(--ink); font-weight:400; text-transform:uppercase; }
.ock .oc-erit { display:flex; align-items:center; gap:calc(4 * var(--p)); flex-wrap:wrap; }
.ock .oc-erit button { min-width:44px; min-height:44px; }
.ock .oc-tarifler, .ock .oc-parcalar { display:flex; flex-wrap:wrap; gap:calc(3 * var(--p)); }
.ock .oc-tarifler button, .ock .oc-parcalar button { min-height:44px; text-align:left; }
.ock button[data-durum=eksik], .ock button[data-durum=ustalik], .ock button[data-durum=altin] { opacity:.6; }
.ock button[aria-pressed=true] { box-shadow:inset 0 0 0 var(--p) var(--gold, #fcd35a); }
.ock .oc-sonuc { padding:calc(4 * var(--p)) calc(6 * var(--p)); background:#1d1a10; box-shadow:inset 0 0 0 var(--p) #c9a33b; color:var(--ink); text-transform:uppercase; }
.ock .oc-sonuc.usta { box-shadow:inset 0 0 0 var(--p) #fcd35a, 0 0 calc(6 * var(--p)) #fcd35a; }
.ock .oc-alt { display:flex; justify-content:flex-end; gap:calc(6 * var(--p)); margin-top:calc(4 * var(--p)); }
.ock .oc-alt button.ana { min-width:calc(140 * var(--p)); min-height:max(44px, calc(30 * var(--p))); }
.ock .ipucu { color:var(--turuncu, #e8762f); }
.ock img { image-rendering:pixelated; vertical-align:middle; }
.ock .oc-ust img.ui { width:22px; height:22px; margin-right:4px; }
.ock .oc-liste .oc-sayi { display:inline-flex; align-items:center; gap:2px; }
.ock .oc-tarifler img.gi { width:24px; height:24px; margin-right:4px; }
.ock .oc-sonuc img.gi.buyuk { width:48px; height:48px; margin-right:8px; }
.ock .oc-sonuc { position:relative; display:flex; align-items:center; flex-wrap:wrap; }
.ock .oc-sonuc .parilti { position:absolute; right:6px; top:6px; width:32px; height:32px; background-position:0 0; background-size:256px 32px; image-rendering:pixelated; animation: oc-parilti .8s steps(8) infinite; }
@keyframes oc-parilti { to { background-position:-256px 0; } }
@media (prefers-reduced-motion: reduce) { .ock .oc-sonuc .parilti { animation:none; } }
html[data-telefon] .ock .oc-govde { grid-template-columns:calc(120 * var(--p)) 1fr; }
.ock .oc-panel { max-height:calc(190 * var(--p)); overflow:auto; }
html[data-telefon] .ock .oc-panel { max-height:52vh; }
`;

const kAd = (k: number) => (MADENLER.find((x) => x.kademe === k)?.ad ?? "").replace(/ CEVHERİ$/, "");
const kRenk = (k: number) => MADENLER.find((x) => x.kademe === k)?.renk.ana ?? "#888";
const TUR_AD: Record<string, string> = { uc: "UÇ", disk: "DİSK", govde: "GÖVDE", cekirdek: "ÇEKİRDEK" };
const yeniRef = () => crypto.randomUUID();
const ust = (u: Ust) => `${u.seviye}`;

export function baslat(b: EkranBaglami): void {
  const ben = b.ben;
  if (!ben?.girisli) { git("karsilama"); return; }
  void apiGet<OcakG>("/api/ocak").then((o) => { if (!o.acik) { git("atolye"); return; } new OcakEkrani(b, o); });
}

type Secim = { tur: "erit" } | { tur: "tarif"; id: string } | { tur: "parca"; id: string };

class OcakEkrani {
  private kart: HTMLElement;
  private kademe: number;
  private parti = 1;
  private secim: Secim = { tur: "erit" };
  private sonuc: { metin: string; usta: boolean; parca?: UretilenG; gorunum?: string; kulce?: number } | null = null;
  /** Bir sonraki çizimde sonuç kartında oynatılacak efekt (yalnız görsel). */
  private efekt: "erit" | "dov" | null = null;
  private mesaj = "";
  /** bu ziyaretin Pergel ipucu (bir kez; 07 § 10) */
  private ipucu: Ipucu | null | undefined;
  private mesgul = false;

  constructor(private b: EkranBaglami, private o: OcakG) {
    const r = ekranKok(b.ustYazi, "Ocak", { baslik: "Ocak", geri: "atolye" });
    this.kart = r.kart;
    r.kok.classList.add("ock");
    const st = el("style"); st.textContent = STIL; document.head.appendChild(st);
    const ilk = o.kademeler.find((k) => k.cevher > 0 || k.kulce > 0) ?? o.kademeler[0]!;
    this.kademe = ilk.kademe;
    this.parti = this.enCokParti();
    Ses.yukle();
    this.ciz();
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); git("atolye"); return; }
      if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); void this.ana(); }
      if (this.secim.tur === "erit" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); this.partiDegis(e.key === "ArrowRight" ? 1 : -1); }
    });
    (window as unknown as { __ocak: OcakEkrani }).__ocak = this;
  }

  get durum(): OcakG { return this.o; }

  private get k(): KademeG { return this.o.kademeler.find((x) => x.kademe === this.kademe)!; }
  private enCokParti(): number {
    const k = this.k;
    return Math.max(1, Math.min(20, Math.floor(k.cevher / k.oran)));
  }
  private partiDegis(d: number): void { this.parti = Math.max(1, Math.min(20, this.parti + d)); this.ciz(); }

  private ciz(): void {
    const kart = this.kart;
    kart.innerHTML = "";
    const o = this.o;
    const u = el("div", "oc-ust k-e16", kart);
    const cubuk = (ad: string, x: Ust) => { const s = el("span", "", u); const ic = el("img", "ui", s); ic.src = USTALIK_IKON(ad.includes("MADEN") ? "madencilik" : "isleme"); ic.alt = ""; s.append(`${ad.replace(/^[⛏⚒] /, "")} ${ust(x)} `); const c = el("span", "cb", s); el("i", "", c).style.width = `${Math.round(x.ilerleme * 100)}%`; return s; };
    cubuk("⛏ MADENCİLİK", o.ustalik.madencilik).dataset["madencilik"] = String(o.ustalik.madencilik.seviye);
    cubuk("⚒ İŞLEME", o.ustalik.isleme).dataset["isleme"] = String(o.ustalik.isleme.seviye);
    el("span", "", u, `KOLEKSİYON ${o.koleksiyonDegeri}`);
    // ilk ziyaret: ERİT/DÖV; sonra seçili kademede alt kademe külçesi isteyen tarif görününce alaşım
    const alasim = o.tarifler.some((t) => t.kademe === this.kademe && t.durum !== "gizli" && (t.girdi ?? []).some((x) => x.kademe < t.kademe));
    if (!this.ipucu) this.ipucu = ipucuSec((this.b.ben?.girisli ? this.b.ben.oyuncu.id : null), "ocak-ilk", ...(alasim ? ["ocak-alasim" as const] : []));
    ipucuBas(kart, "ipucu k-e16", this.ipucu);
    const g = el("div", "oc-govde", kart);
    // sol: cevher listesi
    const l = el("div", "oc-liste k-e16", g);
    el("div", "", l, "CEVHER · KÜLÇE");
    for (const k of o.kademeler) {
      const d = el("button", "k-dugme kucuk", l);
      d.type = "button";
      d.dataset["kademe"] = String(k.kademe);
      d.setAttribute("aria-pressed", String(k.kademe === this.kademe));
      const rz = el("span", "rz", d); rz.style.background = k.renk.koyu;
      const ci = el("img", "", rz); ci.src = CEVHER_IKON(k.kademe); ci.alt = ""; ci.width = 16; ci.height = 16;
      el("span", "", d, kAd(k.kademe));
      const sy = el("span", "oc-sayi", d, k.eritilebilir ? `${k.cevher} · ${k.kulce}` : `İŞL ${k.esik}`);
      if (k.eritilebilir) { const ki = el("img", "", sy); ki.src = KULCE_IKON(k.kademe); ki.alt = ""; ki.width = 16; ki.height = 16; }
      d.setAttribute("aria-label", `${kAd(k.kademe)}: ${k.cevher} cevher, ${k.kulce} külçe${k.eritilebilir ? "" : `, İşleme ${k.esik} gerekir`}`);
      d.addEventListener("click", () => { this.kademe = k.kademe; this.secim = { tur: "erit" }; this.parti = this.enCokParti(); this.sonuc = null; this.mesaj = ""; this.ciz(); });
    }
    // sağ: seçili kademe paneli
    const p = el("div", "oc-panel k-e16", g);
    const k = this.k;
    el("b", "", p, `◆${k.kademe} ${k.ad}`);
    const e = el("div", "oc-erit", p);
    const eksi = el("button", "k-dugme kucuk", e, "−"); eksi.dataset["eylem"] = "eksi"; eksi.addEventListener("click", () => { this.secim = { tur: "erit" }; this.partiDegis(-1); });
    el("span", "", e, `${this.parti} PARTİ`).dataset["parti"] = String(this.parti);
    const arti = el("button", "k-dugme kucuk", e, "+"); arti.dataset["eylem"] = "arti"; arti.addEventListener("click", () => { this.secim = { tur: "erit" }; this.partiDegis(1); });
    el("span", "", e, `${this.parti * k.oran} CEV → ${this.parti} KÜLÇE`);
    el("div", "", p, k.eritilebilir ? `BAŞARI %${Math.round(k.basari * 100)} · ${k.oran}:1 · ${BANT_METNI[k.bant]}` : `İŞLEME ${k.esik} GEREKİR`);
    // tarifler (bu kademe)
    const tarifler = o.tarifler.filter((t) => t.kademe === this.kademe);
    if (tarifler.length) {
      el("div", "", p, "TARİF");
      const tl = el("div", "oc-tarifler", p);
      for (const t of tarifler) {
        const d = el("button", "k-dugme kucuk", tl);
        d.type = "button";
        d.dataset["tarif"] = t.id;
        d.dataset["durum"] = t.durum;
        d.setAttribute("aria-pressed", String(this.secim.tur === "tarif" && this.secim.id === t.id));
        const girdi = (t.girdi ?? []).map((x) => `${x.kulce} ${kAd(x.kademe)}`).join(" + ");
        const durum = t.durum === "sahip" ? (t.usta ? "✓ USTA İŞİ" : "✓ SAHİP") : t.durum === "ustalik" ? `İŞL. ${t.esik}` : t.durum === "gizli" ? "???" : t.durum === "acik" ? "✓ EŞİK" : t.durum === "altin" ? "ALTIN EKSİK" : "EKSİK";
        d.textContent = t.durum === "gizli" ? "???" : `${t.ad} · ${girdi} · ${t.altin} · ${durum}`;
        if (t.durum !== "gizli") { const gi = el("img", "gi", d); gi.src = GORUNUM_IKON(`${t.tur}-${t.tur === "arma" ? "cevher-" : ""}${MADENLER.find((m) => m.kademe === t.kademe)?.id}`); gi.alt = ""; d.prepend(gi); }
        d.disabled = t.durum === "gizli";
        d.addEventListener("click", () => { this.secim = { tur: "tarif", id: t.id }; this.sonuc = null; this.ciz(); });
      }
    }
    // parçalar (kilidi açık, bu kademede üretilebilen)
    const parcalar = o.parcalar.filter((x) => x.acik && x.kademeler.find((y) => y.kademe === this.kademe)?.uygun);
    if (parcalar.length) {
      el("div", "", p, "PARÇA");
      const pl = el("div", "oc-parcalar", p);
      for (const x of parcalar) {
        const kb = x.kademeler.find((y) => y.kademe === this.kademe)!;
        const d = el("button", "k-dugme kucuk", pl);
        d.type = "button";
        d.dataset["parca"] = x.id;
        d.dataset["durum"] = kb.hazir ? "acik" : !kb.ustalik ? "ustalik" : "eksik";
        d.setAttribute("aria-pressed", String(this.secim.tur === "parca" && this.secim.id === x.id));
        d.textContent = `${TUR_AD[x.tur]} ${x.ad} · ${kb.kulce} KÜLÇE${kb.iscilik ? ` · ${kb.iscilik}` : ""}${!kb.ustalik ? ` · İŞL. ${kb.esik}` : ""}`;
        d.addEventListener("click", () => { this.secim = { tur: "parca", id: x.id }; this.sonuc = null; this.ciz(); });
      }
    }
    if (this.sonuc) {
      const s = el("div", `oc-sonuc${this.sonuc.usta ? " usta" : ""}`, p, this.sonuc.metin);
      if (this.sonuc.gorunum) { const gi = el("img", "gi buyuk", s); gi.src = GORUNUM_IKON(this.sonuc.gorunum); gi.alt = ""; s.prepend(gi); }
      else if (this.sonuc.kulce) { const gi = el("img", "gi buyuk", s); gi.src = KULCE_IKON(this.sonuc.kulce); gi.alt = ""; s.prepend(gi); }
      if (this.sonuc.usta) { const pr = el("span", "parilti", s); pr.setAttribute("aria-hidden", "true"); pr.style.backgroundImage = `url(${USTA_PARILTI()})`; }
      if (this.efekt) { const tur = this.efekt, usta = this.sonuc.usta; this.efekt = null; requestAnimationFrame(() => this.sonucEfekti(s, tur, usta)); }
      s.dataset["sonuc"] = "1";
      s.setAttribute("role", "status");
    }
    if (this.mesaj) el("div", "ipucu", p, this.mesaj).setAttribute("role", "alert");
    // ana düğme
    const alt = el("div", "oc-alt", kart);
    if (this.sonuc?.parca) {
      const a = el("button", "k-dugme", alt, "ATÖLYE'DE TAK");
      a.dataset["eylem"] = "atolye";
      a.addEventListener("click", () => git("atolye"));
    }
    const sec = this.secim;
    if (sec.tur === "tarif") {
      const t = tarifler.find((x) => x.id === sec.id);
      if (t?.durum === "sahip") {
        const y = el("button", "k-dugme", alt, `YENİDEN DÖV · %${Math.round((t.ustaIsiSansi ?? 0) * 100)}`);
        y.dataset["eylem"] = "yeniden";
        y.disabled = (t.ustaIsiSansi ?? 0) <= 0 || t.usta === true;
        y.addEventListener("click", () => void this.dov(t.id, true));
      }
    }
    const etiket = sec.tur === "erit" ? "ERİT" : sec.tur === "tarif" ? "DÖV" : "ÜRET";
    const d = el("button", "k-dugme ana", alt, etiket);
    d.dataset["eylem"] = "ana";
    d.dataset["tur"] = sec.tur;
    d.disabled = this.mesgul || (sec.tur === "erit" && (!k.eritilebilir || k.cevher < k.oran)) || (sec.tur === "tarif" && tarifler.find((x) => x.id === sec.id)?.durum !== "acik");
    d.addEventListener("click", () => void this.ana());
  }

  /** ERİT: kademe renginde kor kıvılcımı; DÖV/ÜRET: çekiç kıvılcımı; usta işi: halka + iki parıltı. */
  private sonucEfekti(s: HTMLElement, tur: "erit" | "dov", usta: boolean): void {
    if (!s.isConnected) return;
    efektStili();
    const ikon = s.querySelector("img.gi") ?? s;
    const [x, y] = merkez(s, ikon);
    const r = this.k.renk;
    if (tur === "erit") kirintiPatlat(s, x, y, [r.ana, "#ff8a5c", "#ffd2a8", r.koyu], { adet: 14, guc: 36, boy: 4, yukari: 18, yercekimi: -6 });
    else kirintiPatlat(s, x, y, ["#fcd35a", "#fff6d0", "#e8762f", "#ffffff"], { adet: 16, guc: 46, boy: 3 });
    if (usta) { halkaDalga(s, x, y, "#fcd35a", 10); parilti(s, x - 14, y - 12, 3); parilti(s, x + 16, y + 6, 2, 520); }
  }

  private async yenile(): Promise<void> {
    this.o = await apiGet<OcakG>("/api/ocak");
    cuzdanYaz(this.o.bakiye);
    this.mesgul = false;
    this.ciz();
  }

  private async ana(): Promise<void> {
    if (this.mesgul) return;
    const s = this.secim;
    if (s.tur === "erit") return this.erit();
    if (s.tur === "tarif") return this.dov(s.id, false);
    return this.uret(s.id);
  }

  private async erit(): Promise<void> {
    this.mesgul = true;
    const r = await apiPost<{ sonuc: { kulce: number; curuf: number; parti: number }; yeniBasarimlar: { ad: string }[] }>("/api/ocak/erit", { kademe: this.kademe, parti: this.parti, ref: yeniRef() });
    if (r.durum === 200) {
      Ses.cal("eritme");
      const x = r.veri.sonuc;
      this.efekt = x.kulce > 0 ? "erit" : null;
      this.sonuc = { kulce: this.kademe, metin: `${x.kulce} KÜLÇE${x.curuf ? ` · ${x.curuf} CÜRUF` : ""}${r.veri.yeniBasarimlar?.length ? ` · AÇILDI: ${r.veri.yeniBasarimlar.map((y) => y.ad).join(", ")}` : ""}`, usta: false };
      this.mesaj = "";
    } else this.mesaj = r.veri.hata === "ustalik" ? "İŞLEME YETMİYOR" : r.veri.hata === "yetersiz" ? "CEVHER YETMİYOR" : "ERİTİLEMEDİ";
    await this.yenile();
    this.parti = this.enCokParti();
    this.ciz();
  }

  private async dov(id: string, yeniden: boolean): Promise<void> {
    const t = this.o.tarifler.find((x) => x.id === id);
    if (!yeniden && (t?.altin ?? 0) >= 1000 && !window.confirm(`${t?.ad}: ${t?.altin} Altın. Dövülsün mü?`)) return;
    this.mesgul = true;
    const r = await apiPost<{ cikti: string; usta: boolean; yeniBasarimlar: { ad: string }[] }>("/api/ocak/dov", { tarif: id, ref: yeniRef(), ...(yeniden ? { yeniden: true } : {}) });
    if (r.durum === 201) {
      Ses.cal("dovme");
      this.efekt = "dov";
      this.sonuc = { metin: `${r.veri.cikti.startsWith("arma") ? "ARMA" : "ÇERÇEVE"} AÇILDI · PROFİLDE KULLAN${r.veri.usta ? " · USTA İŞİ" : ""}`, usta: r.veri.usta, gorunum: r.veri.cikti };
      this.mesaj = r.veri.yeniBasarimlar?.length ? `AÇILDI: ${r.veri.yeniBasarimlar.map((y) => y.ad).join(", ")}` : "";
    } else this.mesaj = r.veri.hata === "altin" ? "ALTIN YETMİYOR" : r.veri.hata === "eksik" ? "KÜLÇE EKSİK" : r.veri.hata === "ustalik" ? "İŞLEME YETMİYOR" : "DÖVÜLEMEDİ";
    await this.yenile();
  }

  private async uret(id: string): Promise<void> {
    this.mesgul = true;
    const r = await apiPost<{ parca: UretilenG; yeniBasarimlar: { ad: string }[] }>("/api/ocak/parca", { tanim: id, kademe: this.kademe, ref: yeniRef() });
    if (r.durum === 201) {
      Ses.cal("dovme");
      this.efekt = "dov";
      const p = r.veri.parca;
      this.sonuc = { metin: `${p.ad} · YAPAN: ${p.yapimciAd.toLocaleUpperCase("tr")} · NO. ${String(p.seri).padStart(4, "0")} · ${new Date(p.uretim).toLocaleDateString("tr-TR")}${p.usta ? " · USTA İŞİ" : ""}`, usta: p.usta, parca: p };
      this.mesaj = r.veri.yeniBasarimlar?.length ? `AÇILDI: ${r.veri.yeniBasarimlar.map((y) => y.ad).join(", ")}` : "";
    } else this.mesaj = r.veri.hata === "altin" ? "ALTIN YETMİYOR" : r.veri.hata === "eksik" ? "KÜLÇE EKSİK" : r.veri.hata === "ustalik" ? "İŞLEME YETMİYOR" : r.veri.hata === "kilitli" ? "PARÇA KİLİTLİ" : "ÜRETİLEMEDİ";
    await this.yenile();
  }
}

/** Yardımcı (test/araç): seçili kademenin rengi. */
export const kademeRengi = kRenk;
