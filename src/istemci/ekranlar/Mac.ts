import { Graphics } from "pixi.js";
import { botGirdisi, botKademesiSec, type BotKipi } from "../../paylasilan/bot/bot.ts";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import { adim, macDunyasiKur } from "../../paylasilan/sim/Dunya.ts";
import { TOPAC_DURUM, type Dunya, type MacSonucu, type Olay, type TurSonucu } from "../../paylasilan/sim/durum.ts";
import { kok2, kusakta } from "../../paylasilan/sim/fizik.ts";
import type { Girdi } from "../../paylasilan/sim/Girdi.ts";
import { MAC_ADIM, geriCekAcik, siradakiUye, teslimEt } from "../../paylasilan/sim/mac.ts";
import { aktifMi, staminaOrani } from "../../paylasilan/sim/topac.ts";
import type { EkranBaglami } from "../main.ts";
import { Efektler } from "../oyun/Efektler.ts";
import { OyuncuGirdisi } from "../oyun/Girdi.ts";
import { Iz } from "../oyun/Iz.ts";
import { kenarUyarisiCiz } from "../oyun/KenarUyari.ts";
import { MacHud } from "../oyun/MacHud.ts";
import { ELEMENT_RENK } from "../oyun/renkler.ts";
import { SAHNE, Sahne } from "../oyun/Sahne.ts";
import { takimProfilleri, takimlariOku } from "../oyun/takimlar.ts";
import { TopacGorsel } from "../oyun/TopacGorsel.ts";
import { AYAR_SECENEKLERI, type OyunAyarlari, ayarlariOku, ayarlariYaz, hisAyari, sekmeIpucuGoster, sekmeIpucuMacBitti } from "../oyun/Ayarlar.ts";
import { YetenekGorsel } from "../oyun/YetenekGorsel.ts";
import { Ses } from "../ses/Ses.ts";
import { ENERJI_TAVAN } from "../../paylasilan/sim/enerji.ts";
import { YETENEK_SIM } from "../../paylasilan/veri/yetenekSablon.ts";

// Bota karşı tam maç (D2, çevrimdışı): geri sayım → tur → tur arası (H14 seçimi) → … → bitti → sonuç ekranı.
// Sim paylaşılan kod (mac.ts, adim.ts), bot paylaşılan kod (bot.ts); bu dosya yalnız sunum ve girdi.
// URL: ?ekran=mac&tohum=7&takim=0..2&rakip=0..2&bot=dolas|kenar|dayaniklilik|kukla|tip&oto=<kip>&hiz=1..8&seviye=2|3&debug
// D3: yetenekler (1-3 / sol-sağ tık: basılı tut = nişan, bırak = at; Esc ya da alt şeritte bırakma = iptal), telegraf,
// alan dekalleri, Ulti anı, ses (M), Esc › Ayarlar (ux § 6.2).
//   oto: yerel topacı paylaşılan bot sürer (otomatik oynanış; H14 seçimi yine klavyeden, yoksa süre dolunca).

const YEREL = 0;
const RAKIP = 1;
/** Son bitişten sonra sonuç ekranına geçiş (ux § 3.4: 1,5 sn). */
const SONUC_GECIKMESI = 1.5;

const STIL = `
.ms { position:absolute; left:0; top:0; width:960px; height:540px; transform-origin:0 0; pointer-events:none; font-family:"Nunito Sans",system-ui,sans-serif; color:#f3f1e8; }
.ms .ort { position:absolute; inset:0; background:rgba(5,9,12,.72); display:none; pointer-events:auto; }
.ms .ort.acik { display:block; }
.ms .kutu { position:absolute; left:250px; top:40px; width:460px; height:460px; padding:16px 20px; background:#0c191d; border:3px solid #050d10; border-radius:12px; box-shadow:0 0 0 2px #24414b, 0 10px 30px rgba(0,0,0,.6); }
.ms h2 { margin:0; display:flex; align-items:center; justify-content:center; gap:10px; font:900 34px/1.1 system-ui; letter-spacing:3px; }
.ms h2.zafer { color:#f4cf47; } .ms h2.yenilgi { color:#c9d3d6; } .ms h2.berabere { color:#a3d8ff; }
.ms .alt { text-align:center; margin:4px 0 0; font-size:13px; color:#a3b2b6; min-height:18px; }
.ms .skr { text-align:center; margin:6px 0 2px; font:800 26px/1 system-ui; letter-spacing:2px; }
.ms .ndn { text-align:center; font-size:12px; color:#a3b2b6; margin-bottom:8px; }
.ms table { width:100%; border-collapse:collapse; font-size:12px; }
.ms th { text-align:left; font-size:10px; letter-spacing:1px; color:#a3b2b6; border-bottom:1px solid #24414b; padding:2px 4px; }
.ms td { padding:3px 4px; border-bottom:1px solid #173039; } .ms td:last-child, .ms th:last-child { text-align:right; }
.ms .satir { opacity:0; transition:opacity .2s; } .ms .satir.gor { opacity:1; }
.ms .od { margin-top:8px; font-size:12px; display:grid; grid-template-columns:1fr auto; gap:3px 8px; }
.ms .od .yt { color:#6f8085; font-size:10px; }
.ms .dg { position:absolute; left:20px; right:20px; bottom:16px; display:flex; gap:10px; }
.ms button { flex:1; padding:9px 10px; background:#173039; color:#f3f1e8; border:2px solid #050d10; border-radius:8px; font:800 14px/1.2 system-ui; cursor:pointer; box-shadow:0 3px 0 #050d10; pointer-events:auto; }
.ms button.bir { background:#f4cf47; color:#2a2104; }
.ms button:focus-visible { outline:3px solid #fff; outline-offset:2px; box-shadow:0 0 0 6px #050d10; }
.ms .ipc { position:absolute; left:20px; right:20px; bottom:64px; text-align:center; font-size:10px; color:#6f8085; }
.ms .menu { position:absolute; left:330px; top:160px; width:300px; padding:14px 16px; background:#0c191d; border:3px solid #050d10; border-radius:12px; box-shadow:0 0 0 2px #24414b; display:none; pointer-events:auto; }
.ms .menu.acik { display:block; }
.ms .menu h3 { margin:0 0 10px; font:900 18px/1 system-ui; letter-spacing:1px; }
.ms .menu p { margin:0 0 10px; font-size:13px; }
.ms .menu .dg { position:static; display:flex; flex-direction:column; gap:8px; }
.ms .menu .tut { position:relative; overflow:hidden; }
.ms .menu .tut i { position:absolute; left:0; top:0; bottom:0; width:0; background:rgba(227,53,13,.45); }
.ms .menu .not { margin-top:8px; font-size:10px; color:#6f8085; }
.ms .menu.genis { left:270px; top:70px; width:420px; }
.ms .ay { display:grid; grid-template-columns:1fr 150px; gap:6px 10px; align-items:center; font-size:12px; margin-bottom:10px; }
.ms .ay button { flex:none; padding:5px 8px; font-size:12px; }
`;

const BITIS_AD = { durma: "DURMA", ringOut: "RING OUT", parcalanma: "PARÇALANMA", berabere: "BERABERE" } as const;
const NEDEN_AD: Record<MacSonucu["neden"], string> = {
  puan: "İlk 3 puan",
  tukenme: "Takım tükendi (3 topaç elendi)",
  aniOlum: "Ani ölüm: ilk bitiş",
  surePuan: "Süre doldu: puan üstünlüğü",
  sureStamina: "Süre doldu: toplam Stamina oranı",
  surePuanEsitlik: "Süre doldu: Stamina eşit, puan",
  yaziTura: "Süre doldu: her şey eşit, yazı-tura",
  teslim: "Teslim",
};

const SIMGE = {
  zafer: `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M12 2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17l-6 3.3 1.3-6.7-5-4.6 6.8-.8Z" fill="#f4cf47" stroke="#050d10" stroke-width="1.5"/></svg>`,
  yenilgi: `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5Z" fill="#5b666b" stroke="#050d10" stroke-width="1.5"/><path d="M12 4 10 10l3 2-2 7" fill="none" stroke="#0c191d" stroke-width="2"/></svg>`,
  berabere: `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><rect x="3" y="7" width="18" height="3.5" rx="1" fill="#a3d8ff" stroke="#050d10"/><rect x="3" y="13.5" width="18" height="3.5" rx="1" fill="#a3d8ff" stroke="#050d10"/></svg>`,
};

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif = "", ust?: HTMLElement, metin = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin) e.textContent = metin;
  ust?.appendChild(e);
  return e;
}

export function baslat(b: EkranBaglami): void {
  new MacEkrani(b);
}

class MacEkrani {
  private sahne: Sahne;
  private efektler: Efektler;
  private gorseller: TopacGorsel[] = [];
  private izler: Iz[] = [];
  private hud!: MacHud;
  private girdi: OyuncuGirdisi;
  private kenarUyari = new Graphics();
  private dunya!: Dunya;
  private onceki: { x: number; z: number }[] = [];
  private birikim = 0;
  private tohum: number;
  private takimNo: number;
  private rakipNo: number;
  private botSecimi: BotKipi | "tip";
  private oto: BotKipi | null;
  private hiz: number;
  private bekleyenDegistir = -1;
  private turlar: TurSonucu[] = [];
  private sonucKalan = -1;
  private ust = el("div", "ms");
  private stil = el("style");
  private sonucOrt = el("div", "ort", this.ust);
  private sonucKutu = el("div", "kutu", this.sonucOrt);
  private menu = el("div", "menu", this.ust);
  private sonucSatirlari: HTMLElement[] = [];
  private sonucAdim = 0;
  private sonucSaat = 0;
  private teslimTutma = -1;
  private teslimDolgu: HTMLElement | null = null;
  private zaman = 0;
  private sonOlaylar: Olay[] = [];
  /** Oturumda görülen bitiş türleri (debug / uçtan uca doğrulama). */
  readonly gorulenBitisler: Record<string, number> = {};
  readonly macSonuclari: MacSonucu[] = [];
  private durTalebi: { turler: Olay["tur"][]; kare: number; oldu: Olay | null; i: number } | null = null;
  private yetenekGorsel: YetenekGorsel;
  private ayarlar: OyunAyarlari;
  private seviye: number;
  private sonGeriSayim = -1;
  private sonSureSn = -1;
  private kenarTikSaat = 0;
  /** Oturumda kullanılan yetenekler (yuva → sayı; debug / uçtan uca). */
  readonly yetenekKullanimi: Record<string, number> = {};

  constructor(private b: EkranBaglami) {
    const q = new URLSearchParams(location.search);
    this.tohum = Number(q.get("tohum") ?? 7) | 0;
    this.takimNo = Math.max(0, Math.min(2, Number(q.get("takim") ?? 0) | 0));
    this.rakipNo = Math.max(0, Math.min(2, Number(q.get("rakip") ?? (this.takimNo + 1) % 3) | 0));
    const bot = q.get("bot");
    this.botSecimi = bot === "dolas" || bot === "kenar" || bot === "dayaniklilik" || bot === "kukla" ? bot : "tip";
    const oto = q.get("oto");
    this.oto = oto === "dolas" || oto === "kenar" || oto === "dayaniklilik" ? oto : null;
    this.hiz = q.has("debug") ? Math.max(1, Math.min(8, Number(q.get("hiz") ?? 1) | 0)) : 1;
    this.seviye = q.get("seviye") === "2" ? 2 : 3;

    this.sahne = new Sahne(b.app);
    this.efektler = new Efektler(this.sahne, () => this.gorseller);
    this.sahne.efektKatmani.addChild(this.kenarUyari);
    this.girdi = new OyuncuGirdisi(b.app.canvas, () => b.app.screen);
    this.yetenekGorsel = new YetenekGorsel(this.sahne, YEREL);
    // iptal bölgesi: alt şerit (mantıksal y > 492, ux § 1)
    this.girdi.iptalBolgesi = (px, py) => { const c = this.sahne.cerceve(); return (py - c.y) / c.olcek > 492; };
    this.ayarlar = ayarlariOku();
    this.ayarlariUygula();
    Ses.yukle();
    this.efektler.sesKanca = (ad, hacim) => Ses.cal(ad, hacim);
    // arayüz tıkı: menü ve sonuç düğmeleri
    this.ust.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest("button")) Ses.cal("ui-tik"); });
    this.stil.textContent = STIL;
    document.head.appendChild(this.stil);
    b.ustYazi.appendChild(this.ust);
    this.menuKur();
    this.yeniMac(this.tohum);
    window.addEventListener("keydown", this.tus, { capture: true });
    window.addEventListener("keyup", this.tusBirak, { capture: true });
    b.app.ticker.add(this.kare);
    if (q.has("debug")) (window as unknown as { __mac: MacEkrani }).__mac = this;
  }

  // ---- hata ayıklama kancaları (Playwright) ----
  get durum(): Dunya { return this.dunya; }
  get sayac(): Efektler["sayac"] { return this.efektler.sayac; }
  get olaylar(): Olay[] { return this.sonOlaylar; }
  get sonucAcik(): boolean { return this.sonucOrt.classList.contains("acik"); }
  /** Debug: Enerji'yi doldurur (uçtan uca doğrulama; yalnız ?debug). */
  enerjiDoldur(i = YEREL, miktar = ENERJI_TAVAN): void { this.dunya.topaclar[i]!.enerji = Math.min(ENERJI_TAVAN, miktar); }
  get ses(): { sayac: Record<string, number>; calinan: Record<string, number>; yuklenen: string[]; hatalar: string[]; acik: boolean; bagli: boolean } {
    return { sayac: { ...Ses.sayac }, calinan: { ...Ses.calinan }, yuklenen: [...Ses.yuklenen], hatalar: [...Ses.hatalar], acik: Ses.acikMi, bagli: Ses.bagliMi };
  }
  get gorselSayac(): YetenekGorsel["sayac"] { return { ...this.yetenekGorsel.sayac }; }
  get ayar(): OyunAyarlari { return { ...this.ayarlar }; }
  get girdiDurumu(): { basili: number; iptal: number; nisanModu: string } { return { basili: this.girdi.basiliYuva, iptal: this.girdi.iptalSayisi, nisanModu: this.girdi.nisanModu }; }

  private ayarlariUygula(): void {
    const a = this.ayarlar;
    const h = hisAyari(a);
    this.efektler.ayar = h;
    this.sahne.sarsintiAyari(h.sarsinti);
    this.yetenekGorsel.flas = a.flas;
    this.yetenekGorsel.ipucuAcik = sekmeIpucuGoster();
    this.girdi.nisanModu = a.nisan;
    if (a.ses === "acik") Ses.ac(); else Ses.kapat();
  }
  get menuAcik(): boolean { return this.menu.classList.contains("acik"); }
  /** Ekran görüntüsü için: bu olaylardan biri olunca `kare` render karesi sonra ticker'ı durdur (yalnız ?debug). */
  olaydaDur(turler: Olay["tur"][], kare: number, i = -1): void { this.durTalebi = { turler, kare, oldu: null, i }; }
  /** ZORLAMA (yalnız ?debug, uçtan uca ekran görüntüsü): rakip botun bir sonraki adımda bu yuvayı bana nişanlayıp atması. */
  rakipYetenek(yuva: number): void { this.zorlaRakip = yuva; }
  private zorlaRakip = -1;
  get durmaOlayi(): Olay | null { return this.durTalebi?.oldu ?? this.sonDurmaOlayi; }
  private sonDurmaOlayi: Olay | null = null;
  get durdu(): boolean { return !this.b.app.ticker.started; }
  devam(): void { this.durTalebi = null; this.b.app.ticker.start(); }

  /** Yeni maç (Tekrar): aynı takımlar, yeni tohum. */
  yeniMac(tohum: number): void {
    this.tohum = tohum;
    const takimlar = takimlariOku();
    const ta = takimProfilleri(takimlar[this.takimNo]!);
    const tb = takimProfilleri(takimlar[this.rakipNo]!);
    this.dunya = macDunyasiKur([ta, tb], tohum, { seviye: [this.seviye, this.seviye] });
    this.yetenekGorsel?.temizle();
    this.sonGeriSayim = -1;
    this.turlar = [];
    this.sonucKalan = -1;
    this.birikim = 0;
    this.bekleyenDegistir = -1;
    this.sonucOrt.classList.remove("acik");
    this.menu.classList.remove("acik");
    this.efektler.temizle();
    if (!this.gorseller.length) {
      for (let i = 0; i < 2; i++) {
        const g = new TopacGorsel(this.dunya.profiller[i]!, i === YEREL ? "oyuncu" : "rakip", this.sahne.golgeKatmani, this.sahne.efektKatmani);
        this.sahne.nesneKatmani.addChild(g.kok);
        this.gorseller.push(g);
        const iz = new Iz(ELEMENT_RENK[this.dunya.profiller[i]!.element].acik);
        this.sahne.izKatmani.addChild(iz.rope);
        this.izler.push(iz);
      }
    }
    for (let i = 0; i < 2; i++) this.gorselYenile(i);
    this.onceki = this.dunya.topaclar.map((t) => ({ x: t.x, z: t.z }));
    this.hud?.yokEt();
    const kip = this.botSecimi === "tip" ? "tipine göre" : this.botSecimi;
    this.hud = new MacHud(this.b.ustYazi, YEREL, [this.oto ? "Sen (oto)" : "Sen", `Bot (${kip})`]);
    this.hud.kartSecildi = (k) => this.secimIste(k);
    this.b.ustYazi.appendChild(this.ust); // sonuç/menü HUD'un üstünde
  }

  private gorselYenile(i: number): void {
    const p = this.dunya.profiller[i]!;
    this.gorseller[i]!.profilAyarla(p, i === YEREL ? "oyuncu" : "rakip");
    this.gorseller[i]!.sifirla();
    this.izler[i]!.sifirla();
    this.izler[i]!.renk = ELEMENT_RENK[p.element].acik;
  }

  private botKipi(i: number): BotKipi {
    if (i === RAKIP && this.botSecimi !== "tip") return this.botSecimi;
    return botKademesiSec(this.dunya.profiller[i]!.tip);
  }

  // ---- girdi ----
  private secimIste(uye: number): void {
    const d = this.dunya;
    const tk = d.takimlar![YEREL]!;
    if (d.mac.faz === "turArasi" && tk.secim === -2 && !tk.uyeler[uye]!.elendi) this.bekleyenDegistir = uye;
  }

  private tus = (e: KeyboardEvent): void => {
    const d = this.dunya;
    if (this.sonucAcik) {
      if (e.code === "Space" || e.code === "Enter" || e.code === "NumpadEnter") {
        e.preventDefault();
        if (this.sonucAdim < this.sonucSatirlari.length) this.sonucHepsiniGoster();
        else if (e.code !== "Space") {
          const odak = document.activeElement;
          if (odak instanceof HTMLButtonElement && this.sonucKutu.contains(odak)) odak.click();
          else this.yeniMac(this.tohum + 1);
        }
      }
      return;
    }
    if (e.code === "Escape") {
      e.preventDefault();
      // basılı yetenek varken Esc = iptal (ux § 1), menü açılmaz
      if (this.girdi.basiliYuva >= 0) { this.girdi.iptalEt(); this.hud.bantGoster("Yetenek iptal edildi.", 1); return; }
      if (!e.repeat) this.menuAcKapa();
      return;
    }
    if (e.code === "KeyM" && !e.repeat) {
      const acik = Ses.degistir();
      this.ayarlar = { ...this.ayarlar, ses: acik ? "acik" : "kapali" };
      ayarlariYaz(this.ayarlar);
      this.hud.bantGoster(acik ? "Ses açık" : "Ses kapalı", 1);
      return;
    }
    if (e.code === "KeyF" && !e.repeat) { e.preventDefault(); this.tamEkran(); return; }
    if (this.menuAcik) return;
    if (e.code === "Tab") {
      e.preventDefault();
      if (e.repeat || d.mac.faz !== "tur") return;
      if (geriCekAcik(d, YEREL)) this.bekleyenDegistir = siradakiUye(d.takimlar![YEREL]!);
      else this.hud.bantGoster(d.topaclar[YEREL].geriCekKalan > 0 ? "Geri çekiliyor…" : d.takimlar![YEREL]!.geriCekBekleme > 0 ? "Geri çek beklemede." : "Geri çekmek için stamina %25'in altında olmalı.", 1.6);
      return;
    }
    const m = /^Digit([1-3])$/.exec(e.code) ?? /^Numpad([1-3])$/.exec(e.code);
    if (m && d.mac.faz === "turArasi") this.secimIste(Number(m[1]) - 1);
  };

  private tusBirak = (e: KeyboardEvent): void => {
    if (e.code === "Enter" && this.teslimTutma >= 0) this.teslimBirak();
  };

  private tamEkran(): void {
    try {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else document.documentElement.requestFullscreen().catch(() => {});
    } catch { /* izin yok */ }
  }

  // ---- Esc menüsü: Devam · Teslim ol (iki adım; Evet 2 sn basılı tutma). Maçı durdurmaz. ----
  private menuKur(): void {
    this.menuGoster("ana");
  }

  private menuGoster(adim: "ana" | "teslim" | "ayarlar"): void {
    const m = this.menu;
    m.innerHTML = "";
    m.classList.remove("genis");
    if (adim === "ana") {
      el("h3", "", m, "Menü");
      const dg = el("div", "dg", m);
      const devam = el("button", "bir", dg, "Devam");
      devam.addEventListener("click", () => this.menuAcKapa(false));
      const ayar = el("button", "", dg, "Ayarlar");
      ayar.addEventListener("click", () => { this.menuGoster("ayarlar"); });
      const teslim = el("button", "", dg, "Teslim ol");
      teslim.addEventListener("click", () => { this.menuGoster("teslim"); });
      el("div", "not", m, "Maç durmaz. Esc ile kapat.");
      queueMicrotask(() => devam.focus());
    } else if (adim === "ayarlar") {
      // ux § 6.2 erişilebilirlik + § 1.3 nişan + ses: düğmeye bas = sıradaki seçenek (klavye: Tab + Enter)
      m.classList.add("genis");
      el("h3", "", m, "Ayarlar");
      const ay = el("div", "ay", m);
      let ilk: HTMLButtonElement | null = null;
      for (const anahtar of Object.keys(AYAR_SECENEKLERI) as (keyof OyunAyarlari)[]) {
        const tanim = AYAR_SECENEKLERI[anahtar];
        el("span", "", ay, tanim.ad);
        const d = el("button", "", ay);
        d.dataset["ayar"] = anahtar;
        const yaz = () => { d.textContent = tanim.secenekler.find((x) => x.deger === this.ayarlar[anahtar])?.ad ?? "?"; };
        yaz();
        d.addEventListener("click", () => {
          const sec = tanim.secenekler as { deger: string }[];
          const k = sec.findIndex((x) => x.deger === this.ayarlar[anahtar]);
          this.ayarlar = { ...this.ayarlar, [anahtar]: sec[(k + 1) % sec.length]!.deger } as OyunAyarlari;
          ayarlariYaz(this.ayarlar);
          this.ayarlariUygula();
          yaz();
        });
        ilk ??= d;
      }
      el("div", "not", m, "Bu tarayıcıda saklanır. İlk açılışta sistemde 'hareketi azalt' açıksa efektler azaltılmış başlar. Nabızlar ≤ 2 Hz, tam ekran flaş ≤ %25.");
      const dg = el("div", "dg", m);
      const geri = el("button", "bir", dg, "Geri");
      geri.addEventListener("click", () => this.menuGoster("ana"));
      queueMicrotask(() => ilk?.focus());
    } else {
      el("h3", "", m, "Teslim ol");
      el("p", "", m, "Teslim olmak istediğine emin misin?");
      const dg = el("div", "dg", m);
      const evet = el("button", "tut", dg, "Evet (2 sn basılı tut)");
      this.teslimDolgu = el("i", "", evet);
      evet.addEventListener("pointerdown", () => this.teslimBasla());
      evet.addEventListener("pointerup", () => this.teslimBirak());
      evet.addEventListener("pointerleave", () => this.teslimBirak());
      evet.addEventListener("keydown", (e) => { if (e.code === "Enter" && !e.repeat) { e.preventDefault(); this.teslimBasla(); } });
      const hayir = el("button", "bir", dg, "Hayır");
      hayir.addEventListener("click", () => this.menuGoster("ana"));
      queueMicrotask(() => hayir.focus());
    }
  }

  private teslimBasla(): void { if (this.teslimTutma < 0) { this.teslimTutma = 0; this.teslimBas = performance.now(); } }
  private teslimBas = 0;
  private teslimBirak(): void {
    this.teslimTutma = -1;
    if (this.teslimDolgu) this.teslimDolgu.style.width = "0";
  }

  private menuAcKapa(ac = !this.menuAcik): void {
    if (this.dunya.mac.faz === "bitti") ac = false;
    this.menu.classList.toggle("acik", ac);
    if (ac) this.menuGoster("ana");
    this.teslimBirak();
    this.girdi.sifirla();
  }

  // ---- döngü ----
  private tekAdim(): void {
    const d = this.dunya;
    this.onceki = d.topaclar.map((t) => ({ x: t.x, z: t.z }));
    let g0: Girdi = this.girdi.olustur(this.sahne, d.topaclar[YEREL]);
    if (this.menuAcik) { g0 = { ...g0, yonX: 0, yonZ: 0, dash: false, zipla: false, dinlen: false }; }
    if (this.oto && !this.menuAcik) {
      const b = botGirdisi(d, YEREL, this.oto, this.tohum * 7907 + 11);
      // otomatik oynanış: sürüş/eylem/geri çek bottan; tur arası seçimi klavyeden (H14), yoksa süre dolunca sıradaki
      g0 = { ...b, degistir: d.mac.faz === "turArasi" ? -1 : b.degistir };
    }
    if (this.bekleyenDegistir >= 0) { g0 = { ...g0, degistir: this.bekleyenDegistir }; this.bekleyenDegistir = -1; }
    let g1 = botGirdisi(d, RAKIP, this.botKipi(RAKIP), this.tohum * 7919 + 3);
    if (this.zorlaRakip >= 0) { g1 = { ...g1, atesle: true, secilenYuva: this.zorlaRakip, nisanX: d.topaclar[YEREL].x, nisanZ: d.topaclar[YEREL].z }; this.zorlaRakip = -1; }
    adim(d, [g0, g1]);
    let isinla = false;
    for (const o of d.olaylar) {
      if (this.durTalebi && !this.durTalebi.oldu && this.durTalebi.turler.includes(o.tur) && (this.durTalebi.i < 0 || ("i" in o && o.i === this.durTalebi.i))) this.durTalebi.oldu = o;
      this.efektler.olay(o, d);
      this.hud.olay(o, d);
      this.yetenekGorsel.olay(o, d);
      switch (o.tur) {
        case "turBitti":
          this.turlar.push(o.sonuc);
          this.gorulenBitisler[o.sonuc.tur] = (this.gorulenBitisler[o.sonuc.tur] ?? 0) + 1;
          break;
        case "degisim": this.gorselYenile(o.i); isinla = true; break;
        case "turBasladi":
          if (o.turNo > 1) { this.efektler.temizle(); for (const g of this.gorseller) g.sifirla(); for (const z of this.izler) z.sifirla(); }
          isinla = true;
          break;
        case "macBitti": this.macSonuclari.push(o.sonuc); this.sonucKalan = SONUC_GECIKMESI; sekmeIpucuMacBitti(); break;
        case "yetenekBasladi": {
          const ad = `${o.i === YEREL ? "sen" : "rakip"}:${YETENEK_SIM[o.no]!.id}`;
          this.yetenekKullanimi[ad] = (this.yetenekKullanimi[ad] ?? 0) + 1;
          break;
        }
        default: break;
      }
    }
    if (isinla) this.onceki = d.topaclar.map((t) => ({ x: t.x, z: t.z }));
    if (d.olaylar.length) this.sonOlaylar = [...this.sonOlaylar, ...d.olaylar].slice(-60);
  }

  private kare = (): void => {
    const dt = Math.min(this.b.app.ticker.deltaMS / 1000, 0.25);
    this.zaman += dt;
    this.birikim += dt * this.hiz;
    let n = 0;
    const tavan = AYAR.enFazlaAdimKare * this.hiz;
    while (this.birikim >= AYAR.dt && n < tavan) {
      this.tekAdim(); this.birikim -= AYAR.dt; n++;
      // ekran görüntüsü talebi (yalnız ?debug): olaydan sonra kare başına tek adım, `kare` adım sonra dur
      if (this.durTalebi?.oldu) { this.birikim = 0; break; }
    }
    if (n === tavan) this.birikim = 0;
    if (this.sonucKalan > 0) {
      this.sonucKalan -= dt;
      if (this.sonucKalan <= 0) this.sonucGoster();
    }
    if (this.teslimTutma >= 0) {
      // gerçek saat (kare hızından bağımsız 2 sn basılı tutma)
      this.teslimTutma = (performance.now() - this.teslimBas) / 1000;
      if (this.teslimDolgu) this.teslimDolgu.style.width = `${Math.min(100, (this.teslimTutma / 2) * 100)}%`;
      if (this.teslimTutma >= 2) {
        this.teslimBirak();
        this.menu.classList.remove("acik");
        teslimEt(this.dunya, YEREL);
        for (const o of this.dunya.olaylar) if (o.tur === "macBitti") { this.macSonuclari.push(o.sonuc); this.sonucKalan = 0.3; }
      }
    }
    if (this.sonucAcik) this.sonucIlerlet(dt);
    this.ciz(dt, Math.min(1, this.birikim / AYAR.dt));
    const dur = this.durTalebi;
    if (dur?.oldu && dur.kare-- <= 0) { this.sonDurmaOlayi = dur.oldu; this.durTalebi = null; this.b.app.ticker.stop(); this.b.app.render(); }
  };

  private ciz(dt: number, alfa: number): void {
    const d = this.dunya;
    const S = this.sahne;
    S.boyutla(false, dt);
    const c = S.cerceve();
    this.hud.hizala(c.x, c.y, c.olcek);
    this.ust.style.transform = `translate(${c.x}px, ${c.y}px) scale(${c.olcek})`;
    this.efektler.guncelle(dt);
    d.topaclar.forEach((t, i) => {
      const o = this.onceki[i] ?? t;
      const akar = aktifMi(t) || t.durum === TOPAC_DURUM.durma;
      const x = akar ? o.x + (t.x - o.x) * alfa : t.x;
      const z = akar ? o.z + (t.z - o.z) * alfa : t.z;
      const p = d.profiller[i]!;
      const ekran = this.efektler.konum(i, S.ekranX(x), S.ekranY(z), dt);
      const oran = staminaOrani(t, p);
      const g = this.gorseller[i]!;
      g.guncelle(dt, ekran.x, ekran.y, t.durum === TOPAC_DURUM.durma ? 0.02 : oran, t.sekmeKalan > 0, this.efektler.yavas);
      // giriş koruması: yarı saydam yanıp söner; geri çekilen: hızlı nabız
      g.kok.alpha = t.koruma > 0 ? 0.55 + 0.25 * Math.sin(this.zaman * 20) : t.geriCekKalan > 0 ? 0.7 + 0.3 * Math.sin(this.zaman * 30) : g.kok.alpha < 1 && aktifMi(t) ? 1 : g.kok.alpha;
      g.catlakAyarla(t.tik / p.parametreler.burstEsik);
      const kademeGucu = g.kademeAdi === "yuksek" ? 1 : g.kademeAdi === "orta" ? 0.6 : 0.25;
      const hiz = kok2(t.vx, t.vz) / p.sim.vSurus;
      const serit = aktifMi(t) && kusakta(t, d.arenaYaricap);
      this.izler[i]!.guncelle(ekran.x, ekran.y, aktifMi(t) ? Math.min(1, hiz * (serit ? 1.6 : 1)) * kademeGucu * (t.dashKalan > 0 ? 1.6 : 1) : 0, serit);
    });
    const daralma = d.mac.aniOlum ? Math.min(1, d.mac.aniOlumTick / MAC_ADIM.aniOlumDaralma) : 0;
    S.arena.guncelle(dt, d.arenaYaricap, d.topaclar.some((t) => aktifMi(t) && kusakta(t, d.arenaYaricap)), d.mac.aniOlum ? Math.max(0.05, daralma) : 0);
    kenarUyarisiCiz(this.kenarUyari, d, YEREL, SAHNE.merkezX, SAHNE.merkezY, this.zaman);
    // H9 nişan (yalnız Fare modu; "Hareket yönü" modunda çizgi çizilmez) + H13 telegraf + dekaller + Ulti anı
    const basili = this.menuAcik ? -1 : this.girdi.basiliYuva;
    const nisan = basili >= 0 && basili < 3 && this.girdi.nisanModu === "fare" ? { yuva: basili, ...this.girdi.nisanNoktasi(S, d.topaclar[YEREL]) } : null;
    this.yetenekGorsel.guncelle(d, dt, nisan);
    this.hud.guncelle(d, dt, basili);
    this.sesKancalari(dt);
  }

  /** Sim olayı olmayan ses kancaları: geri sayım, son 10 sn tıkı, kenar uyarısı (≤ 2 Hz). */
  private sesKancalari(dt: number): void {
    const d = this.dunya;
    const m = d.mac;
    if (m.faz === "geriSayim") {
      const gecen = MAC_ADIM.geriSayim - m.kalanTick;
      const n = gecen < MAC_ADIM.hazir ? 0 : 3 - Math.floor((gecen - MAC_ADIM.hazir) / AYAR.adimHz);
      if (n > 0 && n !== this.sonGeriSayim) Ses.cal("geri-sayim");
      this.sonGeriSayim = n;
    } else if (m.faz === "tur" && !m.aniOlum) {
      const sn = Math.ceil((MAC_ADIM.macSuresi - m.saat) / AYAR.adimHz);
      if (sn <= 10 && sn > 0 && sn !== this.sonSureSn) Ses.cal("geri-sayim", 0.6);
      this.sonSureSn = sn;
    }
    this.kenarTikSaat -= dt;
    const t = d.topaclar[YEREL]!;
    if (m.faz === "tur" && aktifMi(t) && this.kenarTikSaat <= 0) {
      const dm = kok2(t.x, t.z);
      const disa = dm > 1e-6 ? (t.vx * t.x + t.vz * t.z) / dm : 0;
      if (dm > AYAR.kusakDis * d.arenaYaricap && disa > 0.7 * d.profiller[YEREL]!.sim.ringOutHizi) { Ses.cal("kenar-uyari"); this.kenarTikSaat = 0.5; }
    }
  }

  // ---- sonuç ekranı (ux § 3.5) ----
  private sonucGoster(): void {
    const d = this.dunya;
    const s = d.mac.macSonucu!;
    const k = this.sonucKutu;
    k.innerHTML = "";
    const tur = s.kazanan === YEREL ? "zafer" : s.kazanan < 0 ? "berabere" : "yenilgi";
    const h = el("h2", tur, k);
    h.innerHTML = `${SIMGE[tur]}<span>${tur === "zafer" ? "ZAFER" : tur === "yenilgi" ? "YENİLGİ" : "BERABERE"}</span>`;
    el("div", "alt", k, tur === "yenilgi" ? "Bu sefer olmadı." : "");
    el("div", "skr", k, `${s.puan[YEREL]} – ${s.puan[RAKIP]}`);
    el("div", "ndn", k, `Rakip: Bot (${this.botSecimi === "tip" ? "tipine göre" : this.botSecimi}) · ${NEDEN_AD[s.neden]} · ${(d.mac.saat / AYAR.adimHz).toFixed(0)} sn`);
    const tablo = el("table", "", k);
    tablo.innerHTML = "<thead><tr><th>Bitiş</th><th>Puan</th></tr></thead>";
    const govde = el("tbody", "", tablo);
    this.sonucSatirlari = [];
    this.turlar.forEach((t, n) => {
      const tr = el("tr", "satir", govde);
      const kim = t.kazanan < 0 ? "puan yok" : t.kazanan === YEREL ? "sen" : "rakip";
      tr.innerHTML = `<td>${n + 1}. ${BITIS_AD[t.tur]} · ${kim}</td><td>${t.puan > 0 ? `+${t.puan}` : "0"}</td>`;
      this.sonucSatirlari.push(tr);
    });
    if (s.neden === "teslim") { const tr = el("tr", "satir", govde); tr.innerHTML = `<td>Teslim</td><td>0 – 3</td>`; this.sonucSatirlari.push(tr); }
    const od = el("div", "od", k);
    const kazandi = s.kazanan === YEREL;
    const satir = (a: string, b2: string) => {
      const x = el("div", "satir", od, a);
      const y = el("div", "satir", od);
      y.innerHTML = b2;
      this.sonucSatirlari.push(x, y);
    };
    // Altın/XP/başarım: yer tutucu (D5-D7). Sayılar tuning § 14-15'ten gösterim için.
    satir("Altın", `+${kazandi ? 100 : 60} Altın <span class="yt">yer tutucu</span>`);
    satir("Çekirdek tecrübesi", `+${kazandi ? 40 : 25} XP · Lv.2 <span class="yt">yer tutucu</span>`);
    satir("Başarım", `ilerleme D7'de <span class="yt">yer tutucu</span>`);
    const ys = d.yetenekSayisi[YEREL];
    satir("Yetenek kullanımı", `Yetenek ${ys[0]} · Özel ${ys[1]} · Ulti ${ys[2]}`);
    if (d.kararma[YEREL]! > 0) satir("Kararma sayacı", `+${d.kararma[YEREL]} <span class="yt">Çekirdek sönmesi D7</span>`);
    el("div", "ipc", k, "Space / Enter: atla · Enter: Tekrar");
    const dg = el("div", "dg", k);
    const tekrar = el("button", "bir", dg, "Tekrar");
    tekrar.addEventListener("click", () => this.yeniMac(this.tohum + 1));
    const atolye = el("button", "", dg, "Atölye");
    atolye.title = "Atölye D6'da gelir; şimdilik Topaç Lab";
    atolye.addEventListener("click", () => { location.search = "?ekran=topac-lab"; });
    this.sonucAdim = 0;
    this.sonucSaat = 0;
    this.sonucOrt.classList.add("acik");
    this.hud.kok.style.opacity = "0.35";
    queueMicrotask(() => tekrar.focus());
  }

  /** Satırlar sırayla belirir (≤ 6 sn); Space/Enter atlar; ekran kendiliğinden kapanmaz. */
  private sonucIlerlet(dt: number): void {
    if (this.sonucAdim >= this.sonucSatirlari.length) return;
    this.sonucSaat += dt;
    const aralik = Math.min(0.45, 5 / Math.max(1, this.sonucSatirlari.length));
    while (this.sonucAdim < this.sonucSatirlari.length && this.sonucSaat >= aralik * (this.sonucAdim + 1)) this.sonucSatirlari[this.sonucAdim++]!.classList.add("gor");
  }

  private sonucHepsiniGoster(): void {
    for (const s of this.sonucSatirlari) s.classList.add("gor");
    this.sonucAdim = this.sonucSatirlari.length;
  }
}
