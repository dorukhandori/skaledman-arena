import { Container, Graphics, Text } from "pixi.js";
import { botGirdisi, type BotKipi } from "../../paylasilan/bot/bot.ts";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import { adim, dunyaKur } from "../../paylasilan/sim/Dunya.ts";
import { TOPAC_DURUM, type Dunya, type Olay } from "../../paylasilan/sim/durum.ts";
import { kok2, kusakta } from "../../paylasilan/sim/fizik.ts";
import { DASH_PENCERESI_ADIM, aktifMi, staminaOrani } from "../../paylasilan/sim/topac.ts";
import { BASLANGIC_SETLERI, CEKIRDEKLER, DISKLER, GOVDELER, UCLAR } from "../../paylasilan/veri/katalog.ts";
import { type TopacProfili, topacProfiliKur } from "../../paylasilan/veri/profil.ts";
import type { EkranBaglami } from "../main.ts";
import { takimaYaz, takimlariOku } from "../oyun/takimlar.ts";
import { Efektler } from "../oyun/Efektler.ts";
import { OyuncuGirdisi } from "../oyun/Girdi.ts";
import { Hud } from "../oyun/Hud.ts";
import { Iz } from "../oyun/Iz.ts";
import { kenarUyarisiCiz } from "../oyun/KenarUyari.ts";
import { ayarlariOku, kameraKipi } from "../oyun/Ayarlar.ts";
import { ELEMENT_RENK } from "../oyun/renkler.ts";
import { Sahne } from "../oyun/Sahne.ts";
import { TopacGorsel } from "../oyun/TopacGorsel.ts";
import type { TopacCizimi } from "../oyun/cizimTurleri.ts";

// Topaç Lab (D1, nile § 2): WASD ile topaç sür, bota çarp; Stamina kaydırıcısı kademeleri sürer, üç hız kademesi
// yan yana, parça seçimi veri'den, bitişler (gerekirse "zorla" düğmeleriyle). Sim çevrimdışı, 60 Hz sabit adım.
// URL: ?ekran=topac-lab&tohum=7&bot=saldirgan|rota|pasif&oyuncu=<set>&rakip=<set>&debug

const YEREL = 0;
const BOT = 1;
const PANEL_GENISLIK = 300;
const YENI_TUR_SN = 3;
const KADEME_ONIZLEME = [
  { oran: 0.85, ad: "%85 · bulanık disk" },
  { oran: 0.42, ad: "%42 · bulanık kanat" },
  { oran: 0.15, ad: "%15 · keskin + yalpa" },
] as const;

interface Secim { cekirdek: string; govde: string; disk: string; uc: string }

const STIL = `
.lab { position:absolute; top:0; right:0; bottom:0; width:${PANEL_GENISLIK}px; overflow:auto; padding:10px 12px 16px; background:#0c191d; border-left:3px solid #050d10; font:600 12px/1.35 "Nunito Sans",system-ui,sans-serif; color:#f3f1e8; pointer-events:auto; }
.lab h2 { margin:0 0 6px; font:800 18px/1.1 system-ui; letter-spacing:.5px; }
.lab h3 { margin:12px 0 4px; font:800 11px/1 system-ui; letter-spacing:1px; text-transform:uppercase; color:#a3b2b6; }
.lab label { display:grid; grid-template-columns:62px 1fr; align-items:center; gap:6px; margin:3px 0; }
.lab select, .lab input[type=range] { width:100%; min-width:0; }
.lab select { background:#173039; color:#f3f1e8; border:1px solid #24414b; border-radius:4px; padding:2px 4px; font:inherit; }
.lab .dugmeler { display:flex; flex-wrap:wrap; gap:5px; margin-top:4px; }
.lab button { flex:1 1 auto; padding:5px 8px; background:#173039; color:#f3f1e8; border:2px solid #050d10; border-radius:6px; font:700 11px/1.2 system-ui; cursor:pointer; box-shadow:0 2px 0 #050d10; }
.lab button:hover { background:#1d3a44; } .lab button.bir { background:#f4cf47; color:#2a2104; }
.lab table { width:100%; border-collapse:collapse; font-size:11px; }
.lab td { padding:1px 2px; border-bottom:1px solid #173039; } .lab td:last-child { text-align:right; font-variant-numeric:tabular-nums; }
.lab .not { color:#a3b2b6; font-size:11px; font-weight:600; }
.lab kbd { padding:0 3px; border:1px solid #24414b; border-radius:3px; background:#173039; font:700 10px/1.4 system-ui; }
`;

function setSecimi(id: string | null): Secim {
  const s = BASLANGIC_SETLERI.find((x) => x.id === id) ?? BASLANGIC_SETLERI[0]!;
  return { cekirdek: s.cekirdek, govde: s.govde, disk: s.disk, uc: s.uc };
}

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, ust?: HTMLElement, sinif = "", metin = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin) e.textContent = metin;
  ust?.appendChild(e);
  return e;
}

export function baslat(b: EkranBaglami): void {
  // S-1 / sadelik S-10: Topaç Lab geliştirici aracı; yalnız ?gelistir=1 (araçların ?debug'ı da) ile açılır
  const q = new URLSearchParams(location.search);
  if (q.get("gelistir") !== "1" && !q.has("debug")) { location.replace(`${location.pathname}?ekran=atolye`); return; }
  new TopacLab(b);
}

class TopacLab {
  private sahne: Sahne;
  private efektler: Efektler;
  private gorseller: TopacCizimi[] = [];
  private onizleme: TopacCizimi[] = [];
  private izler: Iz[] = [];
  private hud: Hud;
  private girdi: OyuncuGirdisi;
  private kenarUyari = new Graphics();
  private dunya!: Dunya;
  private onceki: { x: number; z: number }[] = [];
  private birikim = 0;
  private turSayaci = 0;
  private yeniTurKalan = -1;
  private tohum: number;
  private botKipi: BotKipi;
  private secim: [Secim, Secim];
  private profiller!: [TopacProfili, TopacProfili];
  private panel = el("div", undefined, "lab");
  private stil = el("style");
  private kaydirici!: HTMLInputElement;
  private kaydiriciEtiket!: HTMLElement;
  private surukleniyor = false;
  private profilTablosu!: HTMLElement;
  private sayacYazi!: HTMLElement;
  private otomatik = true;
  private fps = { kare: 0, sure: 0, deger: 0 };
  private sonOlaylar: Olay[] = [];

  constructor(private b: EkranBaglami) {
    const q = new URLSearchParams(location.search);
    this.tohum = Number(q.get("tohum") ?? 7) | 0;
    const kip = q.get("bot");
    this.botKipi = kip === "rota" || kip === "pasif" ? kip : "saldirgan";
    this.secim = [setSecimi(q.get("oyuncu") ?? "goktasi"), setSecimi(q.get("rakip") ?? "maden")];

    this.sahne = new Sahne(b.app, kameraKipi(ayarlariOku()));
    this.sahne.sagBosluk = PANEL_GENISLIK;
    this.efektler = new Efektler(this.sahne, () => this.gorseller);
    this.sahne.efektKatmani.addChild(this.kenarUyari);
    this.profilleriKur();
    for (let i = 0; i < 2; i++) {
      const g = this.sahne.topacOlustur(this.profiller[i]!, i === YEREL ? "oyuncu" : "rakip");
      this.gorseller.push(g);
      const iz = new Iz(ELEMENT_RENK[this.profiller[i]!.element].acik, this.sahne.hibrit ? this.sahne.k : 0);
      this.sahne.izKatmani.addChild(iz.kap);
      this.izler.push(iz);
    }
    this.onizlemeKur();
    this.hud = new Hud(b.ustYazi, YEREL);
    this.girdi = new OyuncuGirdisi(b.app.canvas, () => b.app.screen);
    this.panelKur();
    this.yeniTur();
    window.addEventListener("keydown", this.kisayol);
    b.app.ticker.add(this.kare);
    if (q.has("debug")) (window as unknown as { __lab: TopacLab }).__lab = this;
  }

  // ---- hata ayıklama kancaları (Playwright) ----
  get durum(): Dunya { return this.dunya; }
  get sayac(): Efektler["sayac"] { return this.efektler.sayac; }
  get canliParcacik(): number { return this.efektler.parcaciklar.canli; }
  get kademeler(): (string | null)[] { return [...this.gorseller, ...this.onizleme].map((g) => g.kademeAdi); }
  get kareHizi(): number { return this.fps.deger; }
  get olaylar(): Olay[] { return this.sonOlaylar; }
  private durTalebi: { tur: Olay["tur"]; kare: number; oldu: boolean } | null = null;
  /** Ekran görüntüsü için: bu olaydan `kare` render karesi sonra ticker'ı durdur (yalnız ?debug). */
  olaydaDur(tur: Olay["tur"], kare: number): void { this.durTalebi = { tur, kare, oldu: false }; }
  get durdu(): boolean { return !this.b.app.ticker.started; }
  devam(): void { this.durTalebi = null; this.b.app.ticker.start(); }

  private profilleriKur(): void {
    const p = (s: Secim) => topacProfiliKur(s.cekirdek, s.govde, s.disk, s.uc);
    this.profiller = [p(this.secim[0]), p(this.secim[1])];
  }

  private onizlemeKur(): void {
    const kap = new Container();
    const baslik = new Text({ text: "HIZ KADEMELERİ", style: { fill: 0xa3b2b6, fontSize: 11, fontWeight: "800", fontFamily: "system-ui", letterSpacing: 1 } });
    baslik.anchor.set(0.5, 0);
    baslik.position.set(104, 92);
    kap.addChild(baslik);
    const hibrit = this.sahne.hibrit;
    KADEME_ONIZLEME.forEach((k, j) => {
      const y = 160 + j * 128;
      // hibrit: önizleme de yandan topaç; dünya konumu ekran (104, y)'ye denk (kamera yakınlığı)
      const B = this.sahne.yakinlik;
      const g: TopacCizimi = hibrit ? this.sahne.topacOlustur(this.profiller[YEREL], "yok") : new TopacGorsel(this.profiller[YEREL], "yok", kap, kap);
      g.kok.position.set(hibrit ? 480 + (104 - 480) / B : 104, hibrit ? 270 + (y + 16 - 270) / B : y);
      if (!hibrit) kap.addChild(g.kok);
      // GU-D: çanak ×1,83 ile önizleme sütunu yakın dudağın üstüne düşer; dudak örtmesin diye efekt katmanında çizilir
      else this.sahne.efektKatmani.addChild(g.kok);
      const t = new Text({ text: k.ad, style: { fill: 0xf3f1e8, fontSize: 11, fontWeight: "700", fontFamily: "system-ui" } });
      t.anchor.set(0.5, 0);
      t.position.set(104, y + 44);
      kap.addChild(t);
      this.onizleme.push(g);
    });
    (hibrit ? this.sahne.ekranKatmani : this.sahne.nesneKatmani).addChild(kap);
  }

  private yeniTur(): void {
    this.profilleriKur();
    this.dunya = dunyaKur(this.profiller, this.tohum + this.turSayaci);
    this.turSayaci++;
    this.birikim = 0;
    this.yeniTurKalan = -1;
    this.onceki = this.dunya.topaclar.map((t) => ({ x: t.x, z: t.z }));
    this.efektler.temizle();
    this.gorseller.forEach((g, i) => { g.profilAyarla(this.profiller[i]!, i === YEREL ? "oyuncu" : "rakip"); g.sifirla(); });
    this.izler.forEach((z, i) => { z.sifirla(); z.renk = ELEMENT_RENK[this.profiller[i]!.element].acik; });
    for (const g of this.onizleme) g.profilAyarla(this.profiller[YEREL], "yok");
    this.profilTablosuYaz();
  }

  // ---- bitişleri zorla (Lab) ----
  private ringOutZorla(): void {
    if (this.dunya.mac.faz !== "tur") this.yeniTur();
    const [o, r] = this.dunya.topaclar;
    // rakip sağ kenarda, dışa 380 br/s (vRO 200'ün üstü); oyuncu arkasından gelir
    r.x = AYAR.arenaYaricap - AYAR.topacYaricap - 14; r.z = 0; r.vx = 380; r.vz = 0;
    o.x = r.x - 90; o.z = 0; o.vx = 300; o.vz = 0;
  }

  private parcalanmaZorla(): void {
    if (this.dunya.mac.faz !== "tur") this.yeniTur();
    const [o, r] = this.dunya.topaclar;
    const pr = this.dunya.profiller[BOT];
    r.tik = pr.parametreler.burstEsik - 0.2;
    r.x = 40; r.z = 0; r.vx = 0; r.vz = 0;
    o.x = -40; o.z = 0; o.vx = 520; o.vz = 0; o.dashKalan = DASH_PENCERESI_ADIM;
  }

  private durmaZorla(): void {
    if (this.dunya.mac.faz !== "tur") this.yeniTur();
    this.dunya.topaclar[BOT].stamina = 0.3;
  }

  private kisayol = (e: KeyboardEvent): void => {
    const hedef = e.target as HTMLElement | null;
    if (hedef && (hedef.tagName === "INPUT" || hedef.tagName === "SELECT")) return;
    if (e.code === "KeyR" && !e.repeat) this.yeniTur();
  };

  private panelKur(): void {
    this.stil.textContent = STIL;
    document.head.appendChild(this.stil);
    const p = this.panel;
    el("h2", p, "", "Topaç Lab");
    el("div", p, "not", "Çevrimdışı · 60 Hz deterministik sim. WASD sür, bota çarp. Tam maç: üst menüde Maç.");

    const parcaSecici = (taraf: 0 | 1, baslik: string) => {
      el("h3", p, "", baslik);
      const satirlar: [keyof Secim, string, readonly { id: string; ad: string }[]][] = [
        ["cekirdek", "Çekirdek", CEKIRDEKLER], ["govde", "Gövde", GOVDELER], ["disk", "Disk", DISKLER], ["uc", "Uç", UCLAR],
      ];
      const secimler: HTMLSelectElement[] = [];
      for (const [k, ad, liste] of satirlar) {
        const l = el("label", p);
        el("span", l, "", ad);
        const s = el("select", l);
        s.dataset.taraf = String(taraf);
        s.dataset.parca = k;
        for (const x of liste) { const o = el("option", s, "", x.ad); o.value = x.id; }
        s.value = this.secim[taraf][k];
        s.addEventListener("change", () => { this.secim[taraf] = { ...this.secim[taraf], [k]: s.value }; this.yeniTur(); });
        secimler.push(s);
      }
      const d = el("div", p, "dugmeler");
      for (const set of BASLANGIC_SETLERI) {
        const btn = el("button", d, "", set.ad.replace(" Seti", ""));
        btn.title = `${set.ad}: başlangıç seti`;
        btn.addEventListener("click", () => {
          this.secim[taraf] = setSecimi(set.id);
          secimler.forEach((s) => { s.value = this.secim[taraf][s.dataset.parca as keyof Secim]; });
          this.yeniTur();
        });
      }
    };
    parcaSecici(YEREL, "Senin topacın");
    this.takimBolumu(p);
    parcaSecici(BOT, "Bot rakip");
    const kipL = el("label", p);
    el("span", kipL, "", "Bot kipi");
    const kip = el("select", kipL);
    for (const [v, ad] of [["saldirgan", "Saldırgan (çarpar, dash)"], ["rota", "Sabit rota (daire)"], ["pasif", "Pasif (durur)"]] as const) {
      const o = el("option", kip, "", ad); o.value = v;
    }
    kip.value = this.botKipi;
    kip.addEventListener("change", () => { this.botKipi = kip.value as BotKipi; });

    el("h3", p, "", "Stamina (senin)");
    const sl = el("label", p);
    this.kaydiriciEtiket = el("span", sl, "", "100%");
    this.kaydirici = el("input", sl);
    this.kaydirici.type = "range";
    this.kaydirici.min = "0"; this.kaydirici.max = "100"; this.kaydirici.step = "1"; this.kaydirici.value = "100";
    this.kaydirici.setAttribute("aria-label", "Stamina oranı");
    this.kaydirici.addEventListener("pointerdown", () => { this.surukleniyor = true; });
    window.addEventListener("pointerup", () => { this.surukleniyor = false; });
    this.kaydirici.addEventListener("input", () => {
      const t = this.dunya.topaclar[YEREL];
      if (aktifMi(t)) t.stamina = (Number(this.kaydirici.value) / 100) * this.dunya.profiller[YEREL].maxStamina;
    });
    el("div", p, "not", "Kademe sınırları %60 ve %25; yalpa %40'ta başlar. 0 = Durma.");

    el("h3", p, "", "Bitişler");
    const d = el("div", p, "dugmeler");
    const dugme = (ad: string, f: () => void, bir = false) => { const x = el("button", d, bir ? "bir" : "", ad); x.addEventListener("click", () => { f(); x.blur(); }); return x; };
    dugme("Yeni tur (R)", () => this.yeniTur(), true);
    dugme("Ring Out'a zorla", () => this.ringOutZorla());
    dugme("Parçalanma'ya zorla", () => this.parcalanmaZorla());
    dugme("Durma'ya zorla", () => this.durmaZorla());
    const ol = el("label", p);
    el("span", ol, "", "Otomatik");
    const oc = el("input", ol);
    oc.type = "checkbox"; oc.checked = true;
    oc.addEventListener("change", () => { this.otomatik = oc.checked; });

    el("h3", p, "", "Efekt ayarları");
    const ayar = (ad: string, secenek: [string, string][], f: (v: string) => void) => {
      const l = el("label", p); el("span", l, "", ad);
      const s = el("select", l);
      for (const [v, a] of secenek) { const o = el("option", s, "", a); o.value = v; }
      s.addEventListener("change", () => f(s.value));
    };
    ayar("Sarsıntı", [["1", "Normal"], ["0.5", "%50"], ["0", "Kapalı"]], (v) => { this.efektler.ayar.sarsinti = Number(v); });
    ayar("Flaş", [["normal", "Normal"], ["azaltilmis", "Azaltılmış"], ["kapali", "Kapalı"]], (v) => { this.efektler.ayar.flas = v as "normal"; });
    ayar("Hitstop", [["1", "Tam"], ["0.5", "Yarı"], ["0", "Kapalı"]], (v) => { this.efektler.ayar.hitstop = Number(v); });

    el("h3", p, "", "Profil (8 parametre)");
    this.profilTablosu = el("div", p);
    el("h3", p, "", "Sayaçlar");
    this.sayacYazi = el("div", p, "not");
    el("h3", p, "", "Kontroller");
    const k = el("div", p, "not");
    k.innerHTML = "<kbd>WASD</kbd>/<kbd>oklar</kbd> sür · <kbd>Shift</kbd> dash · <kbd>Space</kbd> sekme · <kbd>Z</kbd> basılı sıkı dönüş · <kbd>R</kbd> yeni tur. Fare yalnız yetenek yönü (D3).";
    this.b.ustYazi.appendChild(p);
  }

  /** D2: parça seçimi takım seçimine evrilir. 3 kayıtlı takım (yer tutucu), seçimi bir yuvaya yaz, maça çık. */
  private takimBolumu(p: HTMLElement): void {
    el("h3", p, "", "Takım (maç için)");
    const tl = el("label", p);
    el("span", tl, "", "Takım");
    const ts = el("select", tl);
    const yl = el("label", p);
    el("span", yl, "", "Yuva");
    const ys = el("select", yl);
    for (const k of [0, 1, 2]) { const o = el("option", ys, "", `${k + 1}. topaç`); o.value = String(k); }
    const ozet = el("div", p, "not");
    const yenile = () => {
      const t = takimlariOku();
      const secili = ts.value || "0";
      ts.innerHTML = "";
      t.forEach((x, k) => { const o = el("option", ts, "", x.ad); o.value = String(k); });
      ts.value = secili;
      const tk = t[Number(ts.value)]!;
      ozet.textContent = tk.uyeler.map((u, k) => `${k + 1}) ${CEKIRDEKLER.find((c) => c.id === u.cekirdek)?.ad ?? u.cekirdek}`).join(" · ");
    };
    ts.addEventListener("change", yenile);
    const d = el("div", p, "dugmeler");
    const yaz = el("button", d, "", "Seçimi yuvaya yaz");
    yaz.addEventListener("click", () => {
      const hata = takimaYaz(Number(ts.value), Number(ys.value), this.secim[YEREL]);
      yenile();
      if (hata) ozet.textContent = hata;
      yaz.blur();
    });
    const git = el("button", d, "bir", "Bu takımla maça çık");
    git.addEventListener("click", () => { location.search = `?ekran=mac&takim=${ts.value}`; });
    yenile();
  }

  private profilTablosuYaz(): void {
    if (!this.profilTablosu) return;
    const satir = (p: TopacProfili) => {
      const q = p.parametreler;
      return [
        ["Tip", p.tip], ["Element / köken", `${ELEMENT_RENK[p.element].ad} · ${p.koken}`], ["kutle", q.kutle], ["saldiri", q.saldiri], ["savunma", q.savunma],
        ["staminaHavuzu", q.staminaHavuzu], ["erime", q.erime.toFixed(1)], ["desen", q.desen], ["burstEsik", q.burstEsik], ["yon", `${q.yon} (${p.donus})`],
      ] as [string, string | number][];
    };
    const a = satir(this.profiller[YEREL]);
    const b = satir(this.profiller[BOT]);
    this.profilTablosu.innerHTML = `<table><tr><td></td><td style="text-align:right">sen</td><td>bot</td></tr>${a.map((r, i) => `<tr><td>${r[0]}</td><td style="text-align:right">${r[1]}</td><td>${b[i]![1]}</td></tr>`).join("")}</table>`;
  }

  private tekAdim(): void {
    const d = this.dunya;
    this.onceki = d.topaclar.map((t) => ({ x: t.x, z: t.z }));
    const g0 = this.girdi.olustur(this.sahne);
    const g1 = botGirdisi(d, BOT, this.botKipi, this.tohum * 7919 + this.turSayaci);
    adim(d, [g0, g1]);
    for (const o of d.olaylar) {
      if (this.durTalebi && this.durTalebi.tur === o.tur) this.durTalebi.oldu = true;
      this.efektler.olay(o, d);
      if (o.tur === "turBitti") { this.hud.sonuc(o.sonuc, YEREL); this.yeniTurKalan = YENI_TUR_SN; }
    }
    if (d.olaylar.length) this.sonOlaylar = [...this.sonOlaylar, ...d.olaylar].slice(-40);
  }

  private kare = (): void => {
    const dt = Math.min(this.b.app.ticker.deltaMS / 1000, 0.25);
    this.fps.kare++; this.fps.sure += dt;
    if (this.fps.sure >= 0.5) { this.fps.deger = this.fps.kare / this.fps.sure; this.fps.kare = 0; this.fps.sure = 0; }
    this.birikim += dt;
    let n = 0;
    while (this.birikim >= AYAR.dt && n < AYAR.enFazlaAdimKare) { this.tekAdim(); this.birikim -= AYAR.dt; n++; }
    if (n === AYAR.enFazlaAdimKare) this.birikim = 0;
    if (this.yeniTurKalan > 0) {
      this.yeniTurKalan -= dt;
      if (this.yeniTurKalan <= 0 && this.otomatik) this.yeniTur();
    }
    this.ciz(dt, Math.min(1, this.birikim / AYAR.dt));
    const dur = this.durTalebi;
    if (dur?.oldu && dur.kare-- <= 0) { this.durTalebi = null; this.b.app.ticker.stop(); this.b.app.render(); }
  };

  private ciz(dt: number, alfa: number): void {
    const d = this.dunya;
    const S = this.sahne;
    S.boyutla(false, dt);
    const c = S.cerceve();
    this.hud.hizala(c.x, c.y, c.olcek);
    this.efektler.guncelle(dt, d);
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
      const kademeGucu = g.kademeAdi === "yuksek" ? 1 : g.kademeAdi === "orta" ? 0.6 : 0.25;
      const hiz = kok2(t.vx, t.vz) / p.sim.vSurus;
      // hız şeridinde iz uzar (pixel planı § 6.2)
      const serit = aktifMi(t) && kusakta(t, d.arenaYaricap) ? 1.6 : 1;
      this.izler[i]!.guncelle(ekran.x, ekran.y, aktifMi(t) ? Math.min(1, hiz * serit) * kademeGucu * (t.dashKalan > 0 ? 1.6 : 1) : 0, serit > 1);
      g.catlakAyarla(t.tik / p.parametreler.burstEsik);
    });
    S.arena.guncelle(dt, d.arenaYaricap, d.topaclar.some((t) => aktifMi(t) && kusakta(t, d.arenaYaricap)), 0);
    this.onizleme.forEach((g, j) => g.guncelle(dt, g.kok.x, g.kok.y, KADEME_ONIZLEME[j]!.oran, false));
    this.kenarUyarisiCiz();
    this.hud.guncelle(d, dt);
    const ben = d.topaclar[YEREL];
    const oran = staminaOrani(ben, d.profiller[YEREL]);
    if (!this.surukleniyor) this.kaydirici.value = String(Math.round(oran * 100));
    this.kaydiriciEtiket.textContent = `${Math.round(oran * 100)}%`;
    const s = this.efektler.sayac;
    this.sayacYazi.textContent = `çarpışma: hafif ${s.hafif} · ağır ${s.agir} · kritik ${s.kritik} · temas ${s.yok}  |  duvar ${s.duvar}  |  Ring Out ${s.ringOut} · Parçalanma ${s.parcalanma} · Durma ${s.durma}  |  parçacık ${this.efektler.parcaciklar.canli}/400  |  ${this.fps.deger.toFixed(0)} fps  |  tık ${d.tick}`;
  }

  private kenarUyarisiCiz(): void {
    kenarUyarisiCiz(this.kenarUyari, this.dunya, YEREL, this.sahne, performance.now() / 1000);
  }
}


