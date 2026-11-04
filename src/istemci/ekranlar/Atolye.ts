import { ELEMENT_CARKI, type ElementAdi } from "../../paylasilan/kurallar/ayar.ts";
import {
  type Envanter, type Taslak, type TaslakTopac, type TakimDegerlendirmesi, type YuvaTuru, YUVA_AD, YUVA_TURLERI, bosTopac, bosYuvaMetni,
  parcaGorunumu, parcaTak, takimDegerlendir, takimHataMetni, yuvaTasi,
} from "../../paylasilan/kurallar/atolye.ts";
import { type CubukOzeti, CUBUK_SIRA, TIP_AD, cubukFarki, profilCubuklari } from "../../paylasilan/veri/cubuklar.ts";
import { BASLANGIC_SETLERI, PARCALAR, cekirdekBul, parcaBul } from "../../paylasilan/veri/katalog.ts";
import { type TopacProfili, topacProfiliKur } from "../../paylasilan/veri/profil.ts";
import type { Parca, Tip } from "../../paylasilan/veri/semalar.ts";
import type { EkranBaglami } from "../main.ts";
import { type AtolyeCekirdegi, type AtolyeGorunumu, BakimHatasi, GORULEN_SEVIYE, HESAP_HATA, apiIstek, apiPost, atolyeGetir, git, oku, sakla } from "../hesap.ts";
import { elementSvg } from "../oyun/elementSimge.ts";
import { ELEMENT_RENK } from "../oyun/renkler.ts";
import { TopacOnizleme } from "../oyun/TopacOnizleme.ts";
import { anaEylem, bakimKatmani, ekranKok, el } from "./arayuz.ts";

// Atölye (D6, US-2.1; ux § 3.2 ana ekran, geri oku yok). Sol: envanter (Çekirdek / Gövde / Disk / Uç sekmeleri, filtre:
// element, köken, tip eğilimi, sahip olunan/kilitli; boş sekme mesajı ux § 7). Orta: seçili topaç (katmanlı önizleme
// gerçek profilden, 4 yuva, ALTI çubuk tide C-1: parça değişince anında + fark işareti ve sayıyla; Uç deseni ve dönüş
// yönü etiket; tip + yakın tip; element uyumu uyarısı; Yapay yön seçimi; "Dene" 30 sn Antrenman). Sağ: takım (3 yuva,
// sürükle-bırak ve klavye ile sıra; element çarkı; kayıtlı takımlar: ad, kaydet, yeni, aktif). Kural ve sayı
// paylaşılan saf koddan (sunucu aynı kuralla yetkili doğrular). Sağ altta büyük OYNA (eksikse soluk + neden).

const KOKEN_AD: Record<string, string> = { goktasi: "Göktaşı", maden: "Maden", yapay: "Yapay", karanlik: "Karanlık" };
const TASLAK_ANAHTAR = "devran.atolyeTaslak.v1";
const BOS_SEKME = "Burada henüz parça yok. Market'ten alabilir ya da başarımla açabilirsin.";

const STIL = `
.at .kart { width:min(86rem,100%); padding:1rem 1.2rem 5.2rem; }
.at .ust { display:flex; align-items:baseline; gap:1rem; flex-wrap:wrap; }
.at .ust h2 { margin:0; }
.at .ust .baglar { margin-left:auto; display:flex; gap:.5rem; flex-wrap:wrap; }
.at .ust .baglar button { padding:.35rem .7rem; font-size:.82rem; }
.at .uc3 { display:grid; grid-template-columns:20rem minmax(0,1fr) 18rem; gap:1rem; margin-top:.7rem; align-items:start; }
.at .kutu { background:#10222a; border:2px solid #24414b; border-radius:10px; padding:.7rem; }
.at h3 { font-size:.95rem; margin:0 0 .45rem; }
.at .sekmeler { display:flex; gap:.25rem; margin-bottom:.45rem; }
.at .sekmeler button { flex:1; padding:.4rem .2rem; font-size:.82rem; box-shadow:none; }
.at .sekmeler button[aria-selected=true] { background:#f4cf47; color:#2a2104; }
.at .filtre { display:grid; grid-template-columns:1fr 1fr; gap:.3rem; margin-bottom:.5rem; }
.at .filtre select { width:100%; padding:.28rem; background:#050d10; color:#f3f1e8; border:2px solid #24414b; border-radius:6px; font:600 .78rem system-ui; }
.at .filtre select:focus-visible { outline:3px solid #fff; outline-offset:1px; }
.at .liste { display:grid; grid-template-columns:1fr 1fr; gap:.35rem; max-height:22rem; overflow:auto; padding:.15rem; }
.at .pc { text-align:left; padding:.4rem .45rem; display:flex; flex-direction:column; gap:.12rem; background:#173039; font-size:.8rem; box-shadow:0 2px 0 #050d10; }
.at .pc .ad { display:flex; gap:.3rem; align-items:center; font-weight:800; font-size:.82rem; }
.at .pc .et { font-size:.7rem; font-weight:700; color:#a3b2b6; }
.at .pc.sahip { border-color:#3c6b58; }
.at .pc.takili { outline:2px solid #7fe3a0; }
.at .pc.market .et { color:#f4cf47; }
.at .pc.kilitli { background:#121b1f; color:#a3b2b6; }
.at .pc.kilitli .et { color:#ffcf9a; }
.at .pc.gizli { background:#0b1215; color:#5b666b; }
.at .pc .silu { width:1.1rem; height:1.1rem; border-radius:50%; background:#1b2a30; border:2px dashed #5b666b; display:inline-block; }
.at .pc .tk { font-size:.68rem; color:#7fe3a0; }
.at .bosmsj { grid-column:1/-1; padding:1rem .5rem; color:#a3b2b6; font-size:.85rem; text-align:center; border:2px dashed #24414b; border-radius:8px; }
.at .orta { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:.8rem; }
.at canvas.onz { width:100%; height:11rem; border-radius:8px; border:2px solid #050d10; background:#081114; display:block; }
.at .yuvalar4 { display:grid; grid-template-columns:repeat(4,1fr); gap:.3rem; margin-top:.5rem; }
.at .yuva4 { padding:.35rem; font-size:.74rem; text-align:left; display:flex; flex-direction:column; gap:.1rem; box-shadow:none; background:#0c191d; border:2px solid #24414b; min-height:3.6rem; }
.at .yuva4 small { color:#a3b2b6; font-weight:700; font-size:.66rem; }
.at .yuva4[aria-pressed=true] { border-color:#f4cf47; }
.at .yuva4.eksik { border-style:dashed; border-color:#ffcf9a; }
.at .cubuk { display:grid; grid-template-columns:5.2rem 1fr 2.6rem 3rem; gap:.4rem; align-items:center; font-size:.8rem; margin:.18rem 0; }
.at .cubuk .ad { font-weight:800; }
.at .cubuk .bar { height:.75rem; background:#1b2a30; border:1px solid #050d10; border-radius:3px; overflow:hidden; position:relative; }
.at .cubuk .bar i { position:absolute; left:0; top:0; bottom:0; background:#f2e8b0; }
.at .cubuk .bar i.once { background:none; border-right:2px solid #fff; }
.at .cubuk .say { text-align:right; font-variant-numeric:tabular-nums; font-weight:800; }
.at .cubuk .fark { font-weight:900; font-variant-numeric:tabular-nums; }
.at .cubuk .fark.art { color:#7fe3a0; } .at .cubuk .fark.azal { color:#ff9a7a; }
.at .etiketler { display:flex; flex-wrap:wrap; gap:.3rem; margin:.4rem 0; }
.at .etk { padding:.15rem .45rem; border-radius:5px; background:#24414b; font-size:.74rem; font-weight:800; }
.at .tip { font-size:.85rem; margin:.3rem 0; }
.at .uyari { display:flex; gap:.45rem; align-items:flex-start; padding:.45rem .55rem; border:2px solid #f4cf47; border-radius:8px; background:#2a2104; color:#fff6c8; font-size:.8rem; font-weight:700; margin:.35rem 0; }
.at .uyari.iyi { border-color:#7fe3a0; background:#0f2a1d; color:#d8ffe8; }
.at .uyari.kirmizi { border-color:#ff6b4a; background:#2a0f08; color:#ffd8cc; }
.at .bilgi { padding:.4rem .55rem; border-radius:8px; background:#0c191d; border:2px dashed #5b666b; color:#c9d3d6; font-size:.78rem; margin:.35rem 0; }
.at .yon { display:flex; gap:.3rem; align-items:center; font-size:.8rem; margin:.35rem 0; }
.at .yon button { padding:.3rem .6rem; font-size:.8rem; box-shadow:none; }
.at .yon button[aria-checked=true] { background:#f4cf47; color:#2a2104; }
.at .dene { display:flex; gap:.4rem; align-items:center; margin-top:.5rem; flex-wrap:wrap; }
.at .dene select { padding:.35rem; background:#050d10; color:#f3f1e8; border:2px solid #24414b; border-radius:6px; font:600 .8rem system-ui; }
.at .tkm { display:flex; flex-direction:column; gap:.35rem; }
.at .tkart { display:grid; grid-template-columns:auto 1fr auto; gap:.45rem; align-items:center; padding:.3rem .45rem; background:#0c191d; border:3px solid #24414b; border-radius:9px; cursor:grab; text-align:left; box-shadow:none; }
.at .tkart[aria-selected=true] { border-color:#f4cf47; }
.at .tkart.odunc { border-style:dashed; border-color:#5b666b; filter:grayscale(.8); }
.at .tkart.bos { border-style:dashed; border-color:#ffcf9a; }
.at .tkart.devreDisi { border-color:#ff6b4a; }
.at .tkart.surukle { opacity:.5; }
.at .tkart.hedef { box-shadow:0 0 0 3px #7fd3ff; }
.at .tkart b { font-size:.85rem; }
.at .tkart small { display:block; color:#a3b2b6; font-size:.7rem; font-weight:700; }
.at .tkart .ok { display:flex; flex-direction:column; gap:.1rem; }
.at .tkart .ok button { padding:0 .35rem; font-size:.7rem; line-height:1.1rem; box-shadow:none; }
.at .rozetY { display:inline-block; padding:.05rem .35rem; border-radius:4px; background:#7fe3a0; color:#06210f; font-size:.66rem; font-weight:900; margin-left:.3rem; }
.at .cark { display:block; flex:none; }
.at .altsira { display:flex; gap:.5rem; align-items:flex-start; margin-top:.45rem; }
.at .altsira > div { flex:1; min-width:0; }
.at .kayitli { display:flex; flex-direction:column; gap:.3rem; margin-top:.4rem; }
.at .kayitli button { text-align:left; padding:.3rem .5rem; font-size:.8rem; box-shadow:none; display:flex; flex-direction:column; gap:0; }
.at .kayitli button[aria-current=true] { border-color:#f4cf47; background:#2a2a14; }
.at .kayitli small { color:#a3b2b6; font-weight:700; }
.at .adsatir { display:flex; gap:.3rem; margin:.3rem 0; }
.at .adsatir input { flex:1; min-width:0; padding:.35rem .5rem; background:#050d10; color:#f3f1e8; border:2px solid #24414b; border-radius:6px; font:700 .85rem system-ui; }
.at .adsatir input:focus-visible { outline:3px solid #fff; outline-offset:1px; }
.at .adsatir button { padding:.35rem .55rem; font-size:.78rem; box-shadow:none; }
.at .eylemler { display:flex; gap:.35rem; flex-wrap:wrap; margin-top:.45rem; }
.at .eylemler button { padding:.4rem .6rem; font-size:.8rem; }
.at .durumSatiri { min-height:1.1rem; font-size:.78rem; font-weight:700; color:#7fe3a0; margin-top:.3rem; }
.at .durumSatiri.hata { color:#ff9a7a; }
.at .oyna { position:absolute; right:1.4rem; bottom:1.2rem; padding:.9rem 2.6rem; font:900 1.6rem/1 "Trebuchet MS",system-ui; letter-spacing:3px; }
.at .oyna[aria-disabled=true] { opacity:.45; filter:grayscale(.6); cursor:not-allowed; }
.at .neden { position:absolute; right:13.5rem; bottom:1.7rem; max-width:34rem; color:#ffcf9a; font-weight:700; font-size:.88rem; text-align:right; }
.at .toast { margin:.4rem 0 0; padding:.45rem .8rem; border:2px solid #f4cf47; border-radius:8px; background:#2a2104; color:#fff6c8; font-weight:800; font-size:.85rem; }
.at .gel { margin-top:.6rem; padding:.45rem; border:2px dashed #5b666b; border-radius:8px; font-size:.74rem; color:#a3b2b6; display:flex; gap:.3rem; flex-wrap:wrap; align-items:center; }
.at .gel select, .at .gel button { font-size:.74rem; padding:.25rem .4rem; box-shadow:none; }
.at .gel select { background:#050d10; color:#f3f1e8; border:1px solid #24414b; border-radius:5px; }
@media (max-width: 1200px) { .at .uc3 { grid-template-columns:18rem minmax(0,1fr); } .at .sag { grid-column:1/-1; } }
`;

const UYARI_SVG = `<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" style="flex:none"><path d="M8 1.5 15 14.5H1Z" fill="#f4cf47" stroke="#050d10"/><path d="M8 6v4.2M8 12v.4" stroke="#2a2104" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const ART_SVG = `<svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true"><path d="M5 1 9 7H1Z" fill="#7fe3a0"/></svg>`;
const AZAL_SVG = `<svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true"><path d="M5 9 1 3h8Z" fill="#ff9a7a"/></svg>`;

type Sahiplik = "hepsi" | "sahip" | "kilitli";
interface Filtre { element: string; koken: string; tip: string; sahiplik: Sahiplik }

/** Yuva başına görünen topaç: sahip olunan (taslaktan), ödünç (sunucu kuralıyla aynı sıra), boş ya da eksik. */
interface YuvaGorunumu {
  durum: "sahip" | "odunc" | "devreDisi" | "bos" | "eksik";
  profil: TopacProfili | null;
  cekirdek: AtolyeCekirdegi | null;
  /** ödünçte başlangıç seti kimliği */
  oduncCekirdek: string | null;
  seviye: number;
}

export function baslat(b: EkranBaglami): void {
  const ben = b.ben;
  if (!ben?.girisli) { git("karsilama"); return; }
  if (!ben.oyuncu.profilTamam) { git("profil"); return; }
  if (!ben.cekirdekler.length) { git("ilk-cekirdek"); return; }
  void atolyeGetir().then((v) => { new AtolyeEkrani(b, v); }).catch((e) => {
    if (e instanceof BakimHatasi) bakimKatmani(() => location.reload());
    else throw e;
  });
}

class AtolyeEkrani {
  private v: AtolyeGorunumu;
  private takimNo: number;
  private taslak!: Taslak;
  private takimAdi = "";
  private secili = 0;
  private sekme: YuvaTuru = "uc";
  private filtre: Filtre = { element: "", koken: "", tip: "", sahiplik: "hepsi" };
  private onceki: CubukOzeti | null = null;
  private uyari = "";
  private degisti = false;
  private durumMetni = "";
  private durumHata = false;
  private onizleme: TopacOnizleme | null = null;
  // DOM
  private kart: HTMLElement;
  private sol!: HTMLElement;
  private orta!: HTMLElement;
  private sag!: HTMLElement;
  private oyna!: HTMLButtonElement;
  private neden!: HTMLElement;
  private surukleKaynak = -1;

  constructor(private b: EkranBaglami, v: AtolyeGorunumu) {
    this.v = v;
    const { kok, kart } = ekranKok(b.ustYazi, "Atölye");
    kok.classList.add("at");
    this.kart = kart;
    const st = el("style"); st.textContent = STIL; document.head.appendChild(st);
    this.takimNo = v.takimlar.some((t) => t.takimNo === v.aktifTakim) ? v.aktifTakim : (v.takimlar[0]?.takimNo ?? 0);
    this.takimYukle(this.takimNo);
    // Dene'den dönüş: taslak (kaydedilmemiş değişiklik dahil) korunur
    try {
      const ham = sessionStorage.getItem(TASLAK_ANAHTAR);
      if (ham) {
        const t = JSON.parse(ham) as { takimNo: number; taslak: Taslak; secili: number; sekme: YuvaTuru; ad: string; degisti: boolean };
        if (v.takimlar.some((x) => x.takimNo === t.takimNo) && Array.isArray(t.taslak) && t.taslak.length === 3) {
          this.takimNo = t.takimNo;
          this.taslak = t.taslak;
          this.secili = t.secili;
          this.sekme = YUVA_TURLERI.includes(t.sekme) ? t.sekme : "uc";
          this.takimAdi = t.ad;
          this.degisti = t.degisti;
          if (takimDegerlendir(this.taslak, this.env()).hatalar.some((h) => h.kod === "sahipDegil")) this.takimYukle(this.takimNo);
        }
        sessionStorage.removeItem(TASLAK_ANAHTAR);
      }
    } catch { /* depolama kapalı */ }
    this.iskelet();
    this.ciz();
    (window as unknown as { __atolye: AtolyeEkrani }).__atolye = this;
  }

  // ---- veri ----
  private env(): Envanter {
    return { cekirdekler: this.v.cekirdekler.map((c) => ({ id: c.id, tanimId: c.tanimId, devreDisi: c.devreDisi })), parcalar: this.v.parcalar };
  }

  private takimYukle(no: number): void {
    const t = this.v.takimlar.find((x) => x.takimNo === no);
    this.takimNo = no;
    this.taslak = (t ? t.yuvalar.map((y) => ({ ...y })) : [bosTopac(), bosTopac(), bosTopac()]) as Taslak;
    this.takimAdi = t?.ad ?? `Takım ${no + 1}`;
    this.degisti = false;
    this.onceki = null;
    this.uyari = "";
  }

  private degerlendirme(): TakimDegerlendirmesi { return takimDegerlendir(this.taslak, this.env()); }

  private parcaTanim(id: number | null): string | null {
    if (id === null) return null;
    return this.v.parcalar.find((p) => p.id === id)?.tanimId ?? null;
  }

  private cekirdekOrnek(id: number | null): AtolyeCekirdegi | null {
    return id === null ? null : this.v.cekirdekler.find((c) => c.id === id) ?? null;
  }

  /** Yuvaların görünümü (sunucunun ödünç kuralıyla aynı: takımda olmayan başlangıç setleri, katalog sırası). */
  yuvalar(): YuvaGorunumu[] {
    const v = this.degerlendirme();
    const kullanilan = new Set(this.taslak.map((y) => this.cekirdekOrnek(y.cekirdek)).filter((c): c is AtolyeCekirdegi => !!c && !c.devreDisi).map((c) => c.tanimId));
    const adaylar = BASLANGIC_SETLERI.filter((s) => !kullanilan.has(s.cekirdek));
    let a = 0;
    return this.taslak.map((y, k): YuvaGorunumu => {
      const c = this.cekirdekOrnek(y.cekirdek);
      const durum = v.durum[k]!;
      if (durum === "odunc" || durum === "devreDisi") {
        const s = adaylar[a++] ?? null;
        return { durum, profil: s ? topacProfiliKur(s.cekirdek, s.govde, s.disk, s.uc) : null, cekirdek: c, oduncCekirdek: s?.cekirdek ?? null, seviye: 1 };
      }
      if (durum === "bos") return { durum: "bos", profil: null, cekirdek: null, oduncCekirdek: null, seviye: 0 };
      const g = this.parcaTanim(y.govde), d = this.parcaTanim(y.disk), u = this.parcaTanim(y.uc);
      if (!c || !g || !d || !u) return { durum: "eksik", profil: null, cekirdek: c, oduncCekirdek: null, seviye: c?.seviye ?? 0 };
      let p: TopacProfili | null = null;
      try { p = topacProfiliKur(c.tanimId, g, d, u, { yon: c.yon }); } catch { p = null; }
      return { durum: p ? "sahip" : "eksik", profil: p, cekirdek: c, oduncCekirdek: null, seviye: c.seviye };
    });
  }

  /** test / ekran: seçili topacın çubukları */
  get cubuklar(): CubukOzeti | null {
    const p = this.yuvalar()[this.secili]?.profil;
    return p ? profilCubuklari(p) : null;
  }
  get oncekiCubuklar(): CubukOzeti | null { return this.onceki; }
  get taslakDurumu(): { taslak: Taslak; degisti: boolean; takimNo: number; uyari: string; neden: string } {
    return { taslak: this.taslak, degisti: this.degisti, takimNo: this.takimNo, uyari: this.uyari, neden: this.neden?.textContent ?? "" };
  }

  // ---- iskelet ----
  private iskelet(): void {
    const k = this.kart;
    const ust = el("div", "ust", k);
    el("h2", "", ust, "Atölye");
    el("span", "alt", ust, `${this.v.oyuncu.ad} · ${this.v.cekirdekler.length} Çekirdek · ${this.v.parcalar.length} parça`);
    const baglar = el("div", "baglar", ust);
    const gunluk = el("button", "", baglar, "Çekirdek Günlüğü");
    gunluk.dataset["eylem"] = "gunluk";
    gunluk.addEventListener("click", () => git("gunluk", `&c=${this.yuvalar()[this.secili]?.cekirdek?.id ?? ""}`));
    const pr = el("button", "", baglar, "Profil");
    pr.dataset["eylem"] = "profil";
    pr.addEventListener("click", () => git("profil"));
    const lab = el("button", "", baglar, "Topaç Lab");
    lab.addEventListener("click", () => git("topac-lab"));
    const q = new URLSearchParams(location.search);
    if (q.get("mesaj") === "ilkdevir") el("div", "toast", k, "İlk Devir başarımı: Market açıldı.").setAttribute("role", "status");
    const uc3 = el("div", "uc3", k);
    this.sol = el("section", "kutu sol", uc3);
    this.sol.setAttribute("aria-label", "Envanter");
    this.orta = el("section", "kutu", uc3);
    this.orta.setAttribute("aria-label", "Seçili topaç");
    this.sag = el("section", "kutu sag", uc3);
    this.sag.setAttribute("aria-label", "Takım");
    this.oyna = el("button", "bir oyna", k, "OYNA");
    this.oyna.dataset["eylem"] = "oyna";
    this.neden = el("div", "neden", k);
    this.neden.id = "oyna-neden";
    this.neden.setAttribute("role", "status");
    this.oyna.addEventListener("click", () => void this.oynaTikla());
    anaEylem(this.oyna);
    queueMicrotask(() => this.oyna.focus({ preventScroll: true }));
  }

  private ciz(): void {
    this.solCiz();
    this.ortaCiz();
    this.sagCiz();
    this.oynaCiz();
  }

  // ---- sol: envanter ----
  private solCiz(): void {
    const s = this.sol;
    const odak = document.activeElement instanceof HTMLElement && s.contains(document.activeElement) ? document.activeElement.dataset["odak"] ?? "" : "";
    s.innerHTML = "";
    el("h3", "", s, "Envanter");
    const sk = el("div", "sekmeler", s);
    sk.setAttribute("role", "tablist");
    sk.setAttribute("aria-label", "Parça türü");
    YUVA_TURLERI.forEach((t, k) => {
      const d = el("button", "", sk, YUVA_AD[t]);
      d.setAttribute("role", "tab");
      d.setAttribute("aria-selected", String(t === this.sekme));
      d.tabIndex = t === this.sekme ? 0 : -1;
      d.dataset["sekme"] = t;
      d.dataset["odak"] = `sekme-${t}`;
      d.addEventListener("click", () => { this.sekme = t; this.solCiz(); });
      d.addEventListener("keydown", (e) => {
        const y = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!y) return;
        e.preventDefault();
        this.sekme = YUVA_TURLERI[(k + y + 4) % 4]!;
        this.solCiz();
        (this.sol.querySelector(`[data-sekme=${this.sekme}]`) as HTMLElement | null)?.focus();
      });
    });
    const f = el("div", "filtre", s);
    const secim = (ad: string, anahtar: keyof Filtre, secenekler: [string, string][]) => {
      const sel = el("select", "", f);
      sel.setAttribute("aria-label", ad);
      sel.dataset["filtre"] = anahtar;
      sel.dataset["odak"] = `filtre-${anahtar}`;
      for (const [deger, metin] of secenekler) { const o = el("option", "", sel, metin); o.value = deger; }
      sel.value = this.filtre[anahtar];
      sel.addEventListener("change", () => { (this.filtre as unknown as Record<string, string>)[anahtar] = sel.value; this.solCiz(); });
    };
    secim("Element", "element", [["", "Element: hepsi"], ...ELEMENT_CARKI.map((e): [string, string] => [e, ELEMENT_RENK[e].ad])]);
    secim("Köken", "koken", [["", "Köken: hepsi"], ...Object.entries(KOKEN_AD)]);
    secim("Tip eğilimi", "tip", [["", "Tip: hepsi"], ...Object.entries(TIP_AD)]);
    secim("Sahiplik", "sahiplik", [["hepsi", "Hepsi"], ["sahip", "Sahip olunan"], ["kilitli", "Kilitli"]]);
    const liste = el("div", "liste", s);
    liste.setAttribute("role", "listbox");
    liste.setAttribute("aria-label", `${YUVA_AD[this.sekme]} parçaları`);
    const ogeler = this.envanterOgeleri();
    if (!ogeler.length) {
      const m = el("div", "bosmsj", liste, BOS_SEKME);
      m.setAttribute("role", "status");
      m.dataset["bosSekme"] = "1";
    }
    const dugmeler: HTMLButtonElement[] = [];
    ogeler.forEach((o, k) => {
      const g = parcaGorunumu(o.parca, o.sahipIdler.length, this.v.basarimIlerleme);
      const d = el("button", `pc ${g.durum}${o.takili ? " takili" : ""}`, liste);
      d.setAttribute("role", "option");
      d.dataset["parca"] = o.parca.id;
      d.dataset["durum"] = g.durum;
      d.dataset["odak"] = `parca-${o.parca.id}`;
      d.tabIndex = k === 0 ? 0 : -1;
      const elm = "element" in o.parca && o.parca.element ? (o.parca.element as ElementAdi) : null;
      const ad = el("span", "ad", d);
      ad.innerHTML = g.durum === "gizli" ? `<span class="silu" aria-hidden="true"></span>` : elm ? elementSvg(elm, 14) : "";
      el("span", "", ad, g.ad);
      el("span", "et", d, g.etiket);
      if (g.durum !== "gizli") el("span", "et", d, `${TIP_AD[o.parca.tipEgilimi]}${o.parca.tur === "cekirdek" ? ` · ${KOKEN_AD[o.parca.koken]}` : ""}`);
      if (o.takili) el("span", "tk", d, `${o.takili}. topaçta`);
      const takilabilir = g.durum === "sahip";
      d.setAttribute("aria-label", `${g.okunan}${o.takili ? ` ${o.takili}. topaçta takılı.` : ""}${takilabilir ? ` Enter: ${this.secili + 1}. topaca tak.` : ""}`);
      if (!takilabilir) d.setAttribute("aria-disabled", "true");
      d.addEventListener("click", () => { if (takilabilir) this.tak(o.parca, o.sahipIdler); });
      d.addEventListener("keydown", (e) => {
        const adim = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : e.key === "ArrowDown" ? 2 : e.key === "ArrowUp" ? -2 : 0;
        if (!adim) return;
        e.preventDefault();
        const n = Math.max(0, Math.min(dugmeler.length - 1, k + adim));
        dugmeler[k]!.tabIndex = -1;
        dugmeler[n]!.tabIndex = 0;
        dugmeler[n]!.focus();
      });
      dugmeler.push(d);
    });
    if (this.v.gelistirme) this.gelistirmePaneli(s);
    if (odak) (s.querySelector(`[data-odak="${odak}"]`) as HTMLElement | null)?.focus();
  }

  private envanterOgeleri(): { parca: Parca; sahipIdler: number[]; takili: number }[] {
    const f = this.filtre;
    const sonuc: { parca: Parca; sahipIdler: number[]; takili: number }[] = [];
    for (const p of PARCALAR.parcalar) {
      if (p.tur !== this.sekme) continue;
      const sahipIdler = p.tur === "cekirdek" ? this.v.cekirdekler.filter((c) => c.tanimId === p.id).map((c) => c.id) : this.v.parcalar.filter((x) => x.tanimId === p.id).map((x) => x.id);
      const durum = parcaGorunumu(p, sahipIdler.length).durum;
      if (f.sahiplik === "sahip" && durum !== "sahip") continue;
      if (f.sahiplik === "kilitli" && durum !== "kilitli" && durum !== "gizli") continue;
      if (f.element && !("element" in p && p.element === f.element)) continue;
      if (f.koken && !(p.tur === "cekirdek" && p.koken === f.koken)) continue;
      if (f.tip && p.tipEgilimi !== (f.tip as Tip)) continue;
      let takili = 0;
      this.taslak.forEach((y, k) => { const id = y[this.sekme]; if (id !== null && sahipIdler.includes(id)) takili = k + 1; });
      sonuc.push({ parca: p, sahipIdler, takili });
    }
    return sonuc;
  }

  /** Envanterden seçili topaca tak; boştaki örnek önce, yoksa başka topaçtaki örnek oradan çıkarılır. */
  tak(p: Parca, idler: number[]): void {
    const tur = p.tur as YuvaTuru;
    const kullanilan = new Set(this.taslak.map((y) => y[tur]).filter((x): x is number => x !== null));
    if (this.taslak[this.secili]![tur] !== null && idler.includes(this.taslak[this.secili]![tur]!)) { this.uyari = ""; this.ciz(); return; }
    const id = idler.find((x) => !kullanilan.has(x)) ?? idler[0];
    if (id === undefined) return;
    const once = this.cubuklar;
    const r = parcaTak(this.taslak, this.secili, tur, id, (x) => this.cekirdekOrnek(x)?.tanimId);
    this.taslak = r.taslak;
    this.degisti = true;
    this.uyari = r.cikarilan ? `${p.ad} ${r.cikarilan.yuva + 1}. topaçtan çıkarıldı: bir parça aynı anda tek topaçta olur. ${r.cikarilan.yuva + 1}. topaçta ${YUVA_AD[r.cikarilan.tur]} eksik.` : "";
    this.onceki = once;
    this.durumMetni = "";
    this.ciz();
  }

  cikar(tur: YuvaTuru): void {
    const once = this.cubuklar;
    if (tur === "cekirdek") this.taslak[this.secili] = bosTopac();
    else this.taslak = parcaTak(this.taslak, this.secili, tur, null).taslak;
    this.degisti = true;
    this.onceki = once;
    this.uyari = "";
    this.ciz();
  }

  // ---- orta: seçili topaç ----
  private ortaCiz(): void {
    const o = this.orta;
    const odak = document.activeElement instanceof HTMLElement && o.contains(document.activeElement) ? document.activeElement.dataset["odak"] ?? "" : "";
    const yv = this.yuvalar();
    const y = yv[this.secili]!;
    const canvas = o.querySelector("canvas.onz") as HTMLCanvasElement | null;
    o.innerHTML = "";
    const baslik = y.cekirdek ? cekirdekBul(y.cekirdek.tanimId).ad : y.oduncCekirdek ? `${cekirdekBul(y.oduncCekirdek).ad} (ödünç)` : "Boş yuva";
    el("h3", "", o, `${this.secili + 1}. topaç · ${baslik}`).dataset["seciliBaslik"] = "1";
    const ikili = el("div", "orta", o);
    const solK = el("div", "", ikili);
    const cv = canvas ?? el("canvas", "onz");
    cv.className = "onz";
    cv.setAttribute("role", "img");
    cv.setAttribute("aria-label", y.profil ? `Önizleme: ${baslik}, ${y.profil.donus === "sol" ? "sola" : "sağa"} dönüyor` : "Önizleme: boş");
    solK.appendChild(cv);
    this.onizleme ??= new TopacOnizleme(cv);
    this.onizleme.ayarla(y.profil);
    // 4 yuva
    const y4 = el("div", "yuvalar4", solK);
    const t = this.taslak[this.secili]!;
    const odunc = y.durum === "odunc" || y.durum === "devreDisi";
    for (const tur of YUVA_TURLERI) {
      const id = t[tur];
      const tanim = tur === "cekirdek" ? this.cekirdekOrnek(id)?.tanimId ?? null : this.parcaTanim(id);
      const d = el("button", `yuva4${!tanim && t.cekirdek !== null ? " eksik" : ""}`, y4);
      d.dataset["yuva"] = tur;
      d.dataset["odak"] = `yuva-${tur}`;
      d.setAttribute("aria-pressed", String(this.sekme === tur));
      el("small", "", d, YUVA_AD[tur]);
      el("span", "", d, tanim ? parcaBul(tanim).ad : odunc && y.profil ? `${parcaBul(y.profil.parcalar[tur]).ad}` : "Boş");
      if (odunc) el("small", "", d, "ödünç");
      d.setAttribute("aria-label", `${YUVA_AD[tur]} yuvası: ${tanim ? parcaBul(tanim).ad : "boş"}. Envanterde ${YUVA_AD[tur]} sekmesini aç.`);
      d.addEventListener("click", () => {
        this.sekme = tur;
        this.solCiz();
        this.ortaCiz();
        (this.sol.querySelector(".liste [tabindex='0']") as HTMLElement | null)?.focus();
      });
      if (tanim) {
        d.addEventListener("keydown", (e) => { if (e.key === "Delete") { e.preventDefault(); this.cikar(tur); } });
        d.title = "Delete: çıkar";
      }
    }
    const cikarSatiri = el("div", "eylemler", solK);
    const ct = this.taslak[this.secili]![this.sekme];
    if (ct !== null) {
      const c = el("button", "", cikarSatiri, `${YUVA_AD[this.sekme]} çıkar`);
      c.dataset["eylem"] = "cikar";
      c.addEventListener("click", () => this.cikar(this.sekme));
    }
    // sağ sütun: çubuklar
    const sagK = el("div", "", ikili);
    if (y.durum === "bos") el("div", "bilgi", sagK, "Bu yuva boş. Envanterden bir Çekirdek tak.");
    if (y.durum === "eksik") el("div", "uyari", sagK, "").innerHTML = `${UYARI_SVG}<span>${this.eksikMetni()}</span>`;
    if (odunc) el("div", "bilgi", sagK, "Ödünç topaç: Lv.1, tecrübe ve başarım almaz. Kendi Çekirdeğini takınca yerini alır.");
    if (y.durum === "devreDisi") el("div", "uyari kirmizi", sagK, "").innerHTML = `${UYARI_SVG}<span>${y.cekirdek ? cekirdekBul(y.cekirdek.tanimId).ad : "Çekirdek"}: ömrü bitti. Maça girişte yerine ödünç topaç girer.</span>`;
    const p = y.profil;
    if (p) {
      const oz = profilCubuklari(p);
      const fark = this.onceki ? cubukFarki(this.onceki, oz) : null;
      const kutu = el("div", "", sagK);
      kutu.dataset["cubuklar"] = "1";
      for (const k of CUBUK_SIRA) {
        const c = oz.cubuklar.find((x) => x.anahtar === k)!;
        const satir = el("div", "cubuk", kutu);
        satir.dataset["cubuk"] = k;
        el("span", "ad", satir, c.ad);
        const bar = el("span", "bar", satir);
        bar.setAttribute("role", "meter");
        bar.setAttribute("aria-label", c.ad);
        bar.setAttribute("aria-valuemin", "0");
        bar.setAttribute("aria-valuemax", "100");
        bar.setAttribute("aria-valuenow", String(c.deger));
        bar.setAttribute("aria-valuetext", `${c.deger} / 100 (${c.ham}${c.birim})`);
        el("i", "", bar).style.width = `${c.deger}%`;
        const fk = fark?.[k] ?? 0;
        if (fk !== 0 && this.onceki) {
          const o2 = this.onceki.cubuklar.find((x) => x.anahtar === k)!;
          el("i", "once", bar).style.width = `${o2.deger}%`;
        }
        el("span", "say", satir, String(c.deger));
        const fe = el("span", `fark${fk > 0 ? " art" : fk < 0 ? " azal" : ""}`, satir);
        fe.dataset["fark"] = String(fk);
        if (fk !== 0) fe.innerHTML = `${fk > 0 ? ART_SVG : AZAL_SVG} ${fk > 0 ? "+" : "−"}${Math.abs(fk)}`;
        fe.setAttribute("aria-label", fk === 0 ? "" : `${fk > 0 ? "arttı" : "azaldı"} ${Math.abs(fk)}`);
      }
      const et = el("div", "etiketler", sagK);
      el("span", "etk", et, `Uç: ${oz.desenAd}`).dataset["etiket"] = "desen";
      el("span", "etk", et, `Yön: ${oz.donus === "sol" ? "Sola döner" : "Sağa döner"}${oz.ciftYon ? " (çift yön)" : ""}`).dataset["etiket"] = "yon";
      const tip = el("div", "tip", sagK);
      tip.dataset["tip"] = oz.tip;
      tip.innerHTML = `Tip: <b></b> <span class="yt"></span>`;
      tip.querySelector("b")!.textContent = oz.tipAd;
      tip.querySelector("span")!.textContent = oz.tip === "denge" ? `· en çok ${oz.yakinTipAd}'a yakın` : `· sonra ${oz.yakinTipAd}'a yakın`;
      // element uyumu (tuning § 12): aynı ×1,10 / komşu ×1,00 / diğer ×0,80; Yapay'da ceza yok
      if (p.uyumCarpani < 1) {
        const u = el("div", "uyari", sagK);
        u.dataset["uyum"] = "uyumsuz";
        u.setAttribute("role", "status");
        u.innerHTML = `${UYARI_SVG}<span><b>Enerji dolumu yavaşlar.</b> ${ELEMENT_RENK[p.govdeElement].ad} Gövde, ${ELEMENT_RENK[p.element].ad} Çekirdeğe uzak (×0,80).</span>`;
      } else if (p.uyumCarpani > 1) {
        const u = el("div", "uyari iyi", sagK);
        u.dataset["uyum"] = "ayni";
        u.textContent = `Element uyumu: Gövde ve Çekirdek ${ELEMENT_RENK[p.element].ad}. Enerji dolumu hızlanır (×1,10).`;
      }
      // Yapay yön seçimi (maç öncesi; sim'e takım koduyla `yon`)
      if (y.cekirdek && y.cekirdek.ciftYon && y.durum === "sahip") {
        const yn = el("div", "yon", sagK);
        yn.setAttribute("role", "radiogroup");
        yn.setAttribute("aria-label", "Dönüş yönü");
        el("span", "", yn, "Dönüş yönü:");
        for (const [deger, ad] of [["sag", "Sağ"], ["sol", "Sol"]] as const) {
          const d = el("button", "", yn, ad);
          d.setAttribute("role", "radio");
          d.setAttribute("aria-checked", String(y.cekirdek.yon === deger));
          d.dataset["yon"] = deger;
          d.dataset["odak"] = `yon-${deger}`;
          d.addEventListener("click", () => void this.yonSec(y.cekirdek!, deger));
        }
        el("span", "yt", yn, "Yapay: maç öncesi seçilir");
      }
    }
    // Dene
    const dn = el("div", "dene", o);
    const sel = el("select", "", dn);
    sel.setAttribute("aria-label", "Antrenman rakibi");
    sel.dataset["odak"] = "dene-bot";
    for (const [deger, ad] of [["pasif", "Rakip: Hareketsiz hedef"], ["kukla", "Rakip: Kukla (yavaş)"], ["dolas", "Rakip: Dolaşan"], ["kenar", "Rakip: Kenara iten"]] as const) { const op = el("option", "", sel, ad); op.value = deger; }
    sel.value = oku("devran.deneBot.v1") ?? "kukla";
    const dene = el("button", "", dn, "Dene: 30 sn Antrenman");
    dene.dataset["eylem"] = "dene";
    dene.dataset["odak"] = "dene";
    dene.disabled = !p;
    dene.addEventListener("click", () => this.dene(sel.value));
    el("span", "yt", dn, "Sonuç sayılmaz, Altın ve tecrübe yok.");
    if (this.uyari) {
      const u = el("div", "uyari", o);
      u.dataset["cakisma"] = "1";
      u.setAttribute("role", "alert");
      u.innerHTML = `${UYARI_SVG}<span></span>`;
      u.querySelector("span")!.textContent = this.uyari;
    }
    if (odak) (o.querySelector(`[data-odak="${odak}"]`) as HTMLElement | null)?.focus();
  }

  private eksikMetni(): string {
    const h = this.degerlendirme().hatalar.find((x) => x.yuva === this.secili);
    return h ? takimHataMetni(h) : "Bu topaçta parça eksik.";
  }

  private async yonSec(c: AtolyeCekirdegi, yon: "sag" | "sol"): Promise<void> {
    const once = this.cubuklar;
    try {
      const r = await apiIstek("PATCH", `/api/cekirdek/${c.id}`, { yon });
      if (r.durum !== 200) { this.durum(HESAP_HATA[r.veri.hata ?? "bicim"] ?? "Yön kaydedilemedi.", true); return; }
      c.yon = yon;
      this.onceki = once;
      this.ortaCiz();
      this.durum(`${cekirdekBul(c.tanimId).ad}: ${yon === "sol" ? "sola" : "sağa"} döner. Maçta bu yönle girer.`);
    } catch (e) { if (e instanceof BakimHatasi) bakimKatmani(() => location.reload()); }
  }

  private dene(bot: string): void {
    const y = this.yuvalar()[this.secili];
    if (!y?.profil) return;
    sakla("devran.deneBot.v1", bot);
    try {
      sessionStorage.setItem(TASLAK_ANAHTAR, JSON.stringify({ takimNo: this.takimNo, taslak: this.taslak, secili: this.secili, sekme: this.sekme, ad: this.takimAdi, degisti: this.degisti }));
      const pr = y.profil.parcalar;
      sessionStorage.setItem("devran.dene.v1", JSON.stringify({ ...pr, yon: y.profil.donus, seviye: Math.max(1, y.seviye), ad: cekirdekBul(pr.cekirdek).ad }));
    } catch { /* depolama kapalı */ }
    git("dene", `&bot=${bot}`);
  }

  // ---- sağ: takım ----
  private sagCiz(): void {
    const s = this.sag;
    const odak = document.activeElement instanceof HTMLElement && s.contains(document.activeElement) ? document.activeElement.dataset["odak"] ?? "" : "";
    s.innerHTML = "";
    el("h3", "", s, "Takım");
    const adS = el("div", "adsatir", s);
    const giris = el("input", "", adS);
    giris.type = "text";
    giris.maxLength = 20;
    giris.value = this.takimAdi;
    giris.setAttribute("aria-label", "Takım adı");
    giris.dataset["takimAdi"] = "1";
    giris.dataset["odak"] = "takim-adi";
    giris.addEventListener("input", () => { this.takimAdi = giris.value; });
    const adK = el("button", "", adS, "Adı kaydet");
    adK.dataset["eylem"] = "ad-kaydet";
    adK.addEventListener("click", () => void this.adKaydet());
    const liste = el("div", "tkm", s);
    liste.setAttribute("role", "listbox");
    liste.setAttribute("aria-label", "Takım sırası (Alt + ok tuşlarıyla taşı)");
    const yv = this.yuvalar();
    const gorulen = this.gorulenSeviye();
    yv.forEach((y, k) => {
      const kart = el("div", `tkart ${y.durum}`, liste);
      kart.setAttribute("role", "option");
      kart.setAttribute("aria-selected", String(k === this.secili));
      kart.tabIndex = k === this.secili ? 0 : -1;
      kart.draggable = true;
      kart.dataset["takimYuva"] = String(k);
      kart.dataset["odak"] = `tkart-${k}`;
      const cTanim = y.cekirdek?.tanimId ?? y.oduncCekirdek;
      const ik = el("span", "", kart);
      ik.innerHTML = cTanim ? elementSvg(cekirdekBul(cTanim).element as ElementAdi, 26) : `<span class="silu" style="display:inline-block;width:26px;height:26px;border-radius:50%;border:2px dashed #ffcf9a"></span>`;
      const yazi = el("span", "", kart);
      const bas = el("b", "", yazi, `${k + 1}. ${cTanim ? cekirdekBul(cTanim).ad : "Boş"}`);
      const yeniYetenek = y.cekirdek && gorulen[y.cekirdek.id] !== undefined && y.cekirdek.seviye > gorulen[y.cekirdek.id]!;
      if (yeniYetenek) { const r = el("span", "rozetY", bas, "Yeni yetenek açıldı"); r.dataset["yeniYetenek"] = "1"; }
      const alt = y.durum === "odunc" ? "Ödünç · Lv.1" : y.durum === "devreDisi" ? "Ömrü bitti · maçta ödünç" : y.durum === "bos" ? "Yuva boş" : y.durum === "eksik" ? "Parça eksik" : `Lv.${y.seviye}${y.cekirdek?.omur !== null && y.cekirdek?.omur !== undefined ? ` · ömür ${y.cekirdek.omur}` : ""}`;
      el("small", "", yazi, alt);
      if (y.durum === "devreDisi") { const u = el("small", "", yazi, "Yapay ömrü bitti: yenile ya da başka Çekirdek tak."); u.style.color = "#ff9a7a"; u.dataset["omurBitti"] = "1"; }
      kart.setAttribute("aria-label", `${k + 1}. yuva: ${cTanim ? cekirdekBul(cTanim).ad : "boş"}, ${alt}. Seçmek için tıkla; Alt+yukarı/aşağı ile taşı.`);
      const ok = el("span", "ok", kart);
      const yuk = el("button", "", ok, "▲");
      yuk.setAttribute("aria-label", `${k + 1}. yuvayı yukarı taşı`);
      yuk.disabled = k === 0;
      yuk.addEventListener("click", (e) => { e.stopPropagation(); this.tasi(k, k - 1); });
      const asa = el("button", "", ok, "▼");
      asa.setAttribute("aria-label", `${k + 1}. yuvayı aşağı taşı`);
      asa.disabled = k === 2;
      asa.addEventListener("click", (e) => { e.stopPropagation(); this.tasi(k, k + 1); });
      kart.addEventListener("click", () => this.sec(k));
      kart.addEventListener("keydown", (e) => {
        if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); this.tasi(k, k + (e.key === "ArrowUp" ? -1 : 1), true); return; }
        if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); this.sec(Math.max(0, Math.min(2, k + (e.key === "ArrowUp" ? -1 : 1))), true); return; }
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.sec(k, true); }
      });
      kart.addEventListener("dragstart", (e) => { this.surukleKaynak = k; kart.classList.add("surukle"); e.dataTransfer?.setData("text/plain", String(k)); });
      kart.addEventListener("dragend", () => { kart.classList.remove("surukle"); this.surukleKaynak = -1; });
      kart.addEventListener("dragover", (e) => { e.preventDefault(); kart.classList.add("hedef"); });
      kart.addEventListener("dragleave", () => kart.classList.remove("hedef"));
      kart.addEventListener("drop", (e) => {
        e.preventDefault();
        const kaynak = this.surukleKaynak >= 0 ? this.surukleKaynak : Number(e.dataTransfer?.getData("text/plain"));
        if (Number.isInteger(kaynak)) this.tasi(kaynak, k);
      });
    });
    const alt = el("div", "altsira", s);
    alt.insertAdjacentHTML("beforeend", this.cark(yv));
    const kyK = el("div", "", alt);
    el("h3", "", kyK, "Kayıtlı takımlar").style.marginTop = ".3rem";
    const ky = el("div", "kayitli", kyK);
    for (const t of this.v.takimlar) {
      const d = el("button", "", ky);
      d.dataset["kayitliTakim"] = String(t.takimNo);
      d.dataset["odak"] = `kayitli-${t.takimNo}`;
      d.setAttribute("aria-current", String(t.takimNo === this.takimNo));
      el("span", "", d, t.ad);
      el("small", "", d, `${t.takimNo === this.v.aktifTakim ? "aktif · " : ""}${t.oynanabilir ? "hazır" : "eksik"}`);
      d.addEventListener("click", () => {
        if (t.takimNo === this.takimNo) return;
        if (this.degisti) this.durum(`${this.takimAdi}: kaydedilmemiş değişiklik bırakıldı.`, true);
        this.takimYukle(t.takimNo);
        this.secili = 0;
        this.ciz();
      });
    }
    const ey = el("div", "eylemler", s);
    const kaydet = el("button", "bir", ey, this.degisti ? "Kaydet *" : "Kaydet");
    kaydet.dataset["eylem"] = "kaydet";
    kaydet.dataset["odak"] = "kaydet";
    const hatalar = this.degerlendirme().hatalar;
    if (hatalar.length) { kaydet.setAttribute("aria-disabled", "true"); kaydet.title = takimHataMetni(hatalar[0]!); }
    kaydet.addEventListener("click", () => void this.kaydet());
    const aktif = el("button", "", ey, this.takimNo === this.v.aktifTakim ? "Aktif takım" : "Aktif yap");
    aktif.dataset["eylem"] = "aktif";
    aktif.disabled = this.takimNo === this.v.aktifTakim;
    aktif.addEventListener("click", () => void this.aktifYap());
    if (this.v.takimlar.length < this.v.takimTavani) {
      const yeni = el("button", "", ey, "Yeni takım");
      yeni.dataset["eylem"] = "yeni-takim";
      yeni.addEventListener("click", () => void this.yeniTakim());
    }
    const dm = el("div", `durumSatiri${this.durumHata ? " hata" : ""}`, s, this.durumMetni);
    dm.setAttribute("role", "status");
    dm.dataset["durumSatiri"] = "1";
    if (odak) (s.querySelector(`[data-odak="${odak}"]`) as HTMLElement | null)?.focus();
  }

  /** Element çarkı (Kor–Kasırga–Şimşek–Girdap–Kaya–Don): takımın üç elementi numaralı; renk tek kanal değil (silüet + sayı). */
  private cark(yv: YuvaGorunumu[]): string {
    const R = 46, cx = 70, cy = 62;
    const nokta = ELEMENT_CARKI.map((e, k) => {
      const a = -Math.PI / 2 + (k / 6) * Math.PI * 2;
      return { e, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R };
    });
    const takim = yv.map((y) => { const t = y.cekirdek?.tanimId ?? y.oduncCekirdek; return t ? (cekirdekBul(t).element as ElementAdi) : null; });
    let s = `<svg class="cark" viewBox="0 0 140 124" width="128" height="114" role="img" aria-label="Element çarkı: ${takim.map((e, k) => `${k + 1}. ${e ? ELEMENT_RENK[e].ad : "boş"}`).join(", ")}" data-cark="${takim.map((e) => e ?? "-").join(",")}">`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#24414b" stroke-width="2"/>`;
    const secili = takim.map((e) => (e ? nokta.find((n) => n.e === e)! : null)).filter((n): n is (typeof nokta)[number] => !!n);
    if (secili.length >= 2) s += `<polygon points="${secili.map((n) => `${n.x},${n.y}`).join(" ")}" fill="rgba(244,207,71,.12)" stroke="#f4cf47" stroke-width="1.5" stroke-dasharray="3 2"/>`;
    for (const n of nokta) {
      const sira = takim.map((e, k) => (e === n.e ? k + 1 : 0)).filter(Boolean);
      const on = sira.length > 0;
      s += `<g transform="translate(${n.x - 9},${n.y - 9})" opacity="${on ? 1 : 0.4}">${elementSvg(n.e, 18).replace('class="els"', 'class="els" x="0" y="0"')}</g>`;
      if (on) s += `<circle cx="${n.x + 10}" cy="${n.y - 9}" r="6" fill="#f4cf47" stroke="#050d10"/><text x="${n.x + 10}" y="${n.y - 6.3}" font-size="8" font-weight="900" text-anchor="middle" fill="#2a2104">${sira.join("")}</text>`;
    }
    s += `<text x="${cx}" y="${cy + 3}" font-size="7.5" text-anchor="middle" fill="#a3b2b6">Takım Ultisi D8</text></svg>`;
    return s;
  }

  sec(k: number, odakla = false): void {
    if (k === this.secili) return;
    this.secili = k;
    this.onceki = null;
    this.uyari = "";
    this.ortaCiz();
    this.sagCiz();
    if (odakla) (this.sag.querySelector(`[data-takim-yuva="${k}"]`) as HTMLElement | null)?.focus();
  }

  tasi(kaynak: number, hedef: number, odakla = false): void {
    if (hedef < 0 || hedef > 2 || kaynak === hedef) return;
    this.taslak = yuvaTasi(this.taslak, kaynak, hedef);
    if (this.secili === kaynak) this.secili = hedef; else if (this.secili === hedef) this.secili = kaynak;
    this.degisti = true;
    this.durum(`${kaynak + 1}. yuva ${hedef + 1}. sıraya taşındı. Maça ilk giren 1. yuvadır.`);
    this.ciz();
    if (odakla) (this.sag.querySelector(`[data-takim-yuva="${hedef}"]`) as HTMLElement | null)?.focus();
  }

  private gorulenSeviye(): Record<number, number> {
    let m: Record<number, number> = {};
    try { m = JSON.parse(oku(GORULEN_SEVIYE) ?? "{}") as Record<number, number>; } catch { m = {}; }
    let degisti = false;
    for (const c of this.v.cekirdekler) if (m[c.id] === undefined) { m[c.id] = c.seviye; degisti = true; }
    if (degisti) sakla(GORULEN_SEVIYE, JSON.stringify(m));
    return m;
  }

  private durum(metin: string, hata = false): void {
    this.durumMetni = metin;
    this.durumHata = hata;
    const d = this.sag.querySelector("[data-durum-satiri]");
    if (d) { d.textContent = metin; d.classList.toggle("hata", hata); }
  }

  // ---- sunucu ----
  async kaydet(): Promise<boolean> {
    const h = this.degerlendirme().hatalar;
    if (h.length) { this.durum(takimHataMetni(h[0]!), true); return false; }
    try {
      const r = await apiIstek<{ ok: boolean; atolye: AtolyeGorunumu; yuva?: number; tur?: YuvaTuru }>("PUT", `/api/takim/${this.takimNo}`, { ad: this.takimAdi, yuvalar: this.taslak });
      if (r.durum !== 200) {
        const k = r.veri.hata ?? "bicim";
        const metin = HESAP_HATA[k] ?? (r.veri.yuva !== undefined && r.veri.tur ? takimHataMetni({ kod: k as never, yuva: r.veri.yuva, tur: r.veri.tur }) : "Takım kaydedilemedi.");
        this.durum(metin, true);
        return false;
      }
      this.v = r.veri.atolye;
      const secili = this.secili;
      this.takimYukle(this.takimNo);
      this.secili = secili;
      this.durumMetni = `${this.takimAdi} kaydedildi.`;
      this.durumHata = false;
      this.ciz();
      return true;
    } catch (e) {
      if (e instanceof BakimHatasi) bakimKatmani(() => location.reload());
      return false;
    }
  }

  private async adKaydet(): Promise<void> {
    try {
      const r = await apiIstek<{ ok: boolean; ad: string }>("PATCH", `/api/takim/${this.takimNo}`, { ad: this.takimAdi });
      if (r.durum !== 200) { this.durum(HESAP_HATA[r.veri.hata ?? "bicim"] ?? "Ad kaydedilemedi.", true); return; }
      const t = this.v.takimlar.find((x) => x.takimNo === this.takimNo);
      if (t) t.ad = r.veri.ad;
      this.takimAdi = r.veri.ad;
      this.durumMetni = `Takım adı: ${r.veri.ad}`;
      this.durumHata = false;
      this.sagCiz();
    } catch (e) { if (e instanceof BakimHatasi) bakimKatmani(() => location.reload()); }
  }

  private async aktifYap(): Promise<void> {
    try {
      const r = await apiIstek("PATCH", "/api/aktif-takim", { takimNo: this.takimNo });
      if (r.durum !== 200) { this.durum(HESAP_HATA[r.veri.hata ?? "bicim"] ?? "Seçilemedi.", true); return; }
      this.v.aktifTakim = this.takimNo;
      this.durumMetni = `${this.takimAdi} aktif takım: maça bununla girersin.`;
      this.durumHata = false;
      this.sagCiz();
    } catch (e) { if (e instanceof BakimHatasi) bakimKatmani(() => location.reload()); }
  }

  private async yeniTakim(): Promise<void> {
    try {
      const r = await apiIstek<{ ok: boolean; takimNo: number; atolye: AtolyeGorunumu }>("POST", "/api/takim", {});
      if (r.durum !== 201) { this.durum(HESAP_HATA[r.veri.hata ?? "bicim"] ?? "Takım açılamadı.", true); return; }
      this.v = r.veri.atolye;
      this.takimYukle(r.veri.takimNo);
      this.secili = 0;
      this.sekme = "cekirdek";
      this.durumMetni = `${this.takimAdi} açıldı. Çekirdek tak.`;
      this.durumHata = false;
      this.ciz();
    } catch (e) { if (e instanceof BakimHatasi) bakimKatmani(() => location.reload()); }
  }

  private gelistirmePaneli(s: HTMLElement): void {
    const g = el("div", "gel", s);
    el("span", "", g, "Geliştirme:");
    const sel = el("select", "", g);
    sel.setAttribute("aria-label", "Verilecek parça (geliştirme)");
    for (const p of PARCALAR.parcalar) { const o = el("option", "", sel, `${YUVA_AD[p.tur as YuvaTuru]}: ${p.ad}`); o.value = p.id; }
    const ver = el("button", "", g, "Parça ver");
    ver.dataset["eylem"] = "parca-ver";
    ver.addEventListener("click", async () => {
      const r = await apiPost("/api/gelistirme/parca-ver", { tanim: sel.value });
      if (r.durum === 201) location.reload();
    });
    const xp = el("button", "", g, "+100 XP (seçili Çekirdek)");
    xp.dataset["eylem"] = "xp-ver";
    xp.addEventListener("click", async () => {
      const c = this.yuvalar()[this.secili]?.cekirdek;
      if (!c) return;
      const r = await apiPost("/api/gelistirme/xp-ver", { cekirdekId: c.id, xp: 100 });
      if (r.durum === 200) location.reload();
    });
  }

  // ---- OYNA ----
  private oynaNedeni(): string {
    const v = this.degerlendirme();
    if (v.hatalar.length) return takimHataMetni(v.hatalar[0]!);
    if (v.bos > 0) return bosYuvaMetni(v.bos);
    return "";
  }

  private oynaCiz(): void {
    const n = this.oynaNedeni();
    this.neden.textContent = n;
    if (n) {
      this.oyna.setAttribute("aria-disabled", "true");
      this.oyna.setAttribute("aria-describedby", this.neden.id);
    } else {
      this.oyna.removeAttribute("aria-disabled");
      this.oyna.removeAttribute("aria-describedby");
      if (this.degisti) this.neden.textContent = "Kaydedilmemiş değişiklik: OYNA önce kaydeder.";
    }
  }

  private async oynaTikla(): Promise<void> {
    if (this.oynaNedeni()) return;
    if (this.degisti && !(await this.kaydet())) return;
    if (this.v.aktifTakim !== this.takimNo) {
      try { await apiIstek("PATCH", "/api/aktif-takim", { takimNo: this.takimNo }); } catch { /* lobi yine seçtirir */ }
    }
    git("lobi");
  }
}

export type { TaslakTopac };
