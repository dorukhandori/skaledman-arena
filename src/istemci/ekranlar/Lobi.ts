import { type OdaGorunumu } from "../../ag/durum.ts";
import { MESAJ, ODA_FAZI, odaKoduBicimle, odaKoduCoz } from "../../ag/protokol.ts";
import { takimKoduYaz, takimProfilleriKimlikten } from "../../paylasilan/veri/takimlar.ts";
import { type Girisli, SON_TAKIM, git, oku, sakla } from "../hesap.ts";
import type { EkranBaglami } from "../main.ts";
import { AgMaci } from "../ag/AgMaci.ts";
import { Baglanti, BaglantiHatasiE, HATA_METNI } from "../ag/Baglanti.ts";
import { elementSvg } from "../oyun/elementSimge.ts";
import { type MacEkrani, cevrimiciBaslat } from "./Mac.ts";
import { dereceliAcik, kuyrukAsamasi, sureBicimle } from "../../paylasilan/kurallar/kuyruk.ts";

// Lobi (D4, ux § 3.3, basit DOM): Oda aç (kod + Kodu kopyala + Bağlantıyı kopyala `#oda=ABCDEFGH`, QR yer tutucu),
// Odaya katıl (tek alan; yapıştır çalışır; bağlantıyla gelince dolu), Hızlı maç (D7: kuyruk, "Rakip aranıyor… 0:12" +
// İptal; 20 sn "Beklerken Antrenman yap"; 30 sn "Bot ile oyna" (Altın yarı, başarım yalnız Yol); 60 sn "Şu an rakip
// bulamadık"; Tekrar = yeni eşleşme `?ekran=lobi&hizli=1`; referans 06 sol mod sütunu),
// Antrenman (sunucu botu). Eşleşince "Rakip bulundu: <ad>" 3 sn, takım seçimi 20 sn (süre dolunca son takım).
// D5: kimlik oturumdan (ad + şifre); her katılımda `/api/bilet` (60 s, tek kullanımlık). Takımlar SQLite'tan:
// takım seçiminde oyuncunun kayıtlı takımları (ödünç yuvalar gri), süre dolunca son takım (nile B-21).

const STIL = `
.lobi { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:auto; background:radial-gradient(circle at 50% 40%, #10222a, #070a1c 75%); z-index:5; }
.lobi.ust { background:rgba(5,9,12,.78); }
.lobi .kart { width:min(760px, calc(100% - 32px)); padding:18px 22px; background:#0c191d; border:3px solid #050d10; border-radius:14px; box-shadow:0 0 0 2px #24414b, 0 10px 30px rgba(0,0,0,.6); color:#f3f1e8; font:400 14px/1.45 system-ui; }
.lobi h2 { margin:0 0 4px; font:900 26px/1.1 "Trebuchet MS",system-ui; letter-spacing:2px; }
.lobi .alt { color:#a3b2b6; font-size:12px; margin-bottom:14px; }
.lobi .izgara { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.lobi .blok { background:#10222a; border:2px solid #050d10; border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px; }
.lobi .blok h3 { margin:0; font:800 15px/1.2 system-ui; letter-spacing:.5px; }
.lobi .blok p { margin:0; font-size:12px; color:#a3b2b6; }
.lobi label { font-size:12px; color:#a3b2b6; }
.lobi input { padding:8px 10px; background:#050d10; color:#f3f1e8; border:2px solid #24414b; border-radius:8px; font:700 16px/1.2 ui-monospace,monospace; letter-spacing:2px; text-transform:uppercase; }
.lobi input.ad { text-transform:none; letter-spacing:0; font:600 14px/1.2 system-ui; }
.lobi button { padding:9px 12px; background:#173039; color:#f3f1e8; border:2px solid #050d10; border-radius:8px; font:800 14px/1.2 system-ui; cursor:pointer; box-shadow:0 3px 0 #050d10; }
.lobi button.bir { background:#f4cf47; color:#2a2104; }
.lobi button:disabled { opacity:.5; cursor:default; }
.lobi button:focus-visible, .lobi input:focus-visible { outline:3px solid #fff; outline-offset:2px; }
.lobi .hata { min-height:18px; color:#ff9a7a; font-weight:700; font-size:13px; }
.lobi .kod { font:900 44px/1 ui-monospace,monospace; letter-spacing:6px; text-align:center; padding:14px 0 8px; color:#f4cf47; }
.lobi .satir { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
.lobi .qr { width:96px; height:96px; margin:8px auto 0; border:2px dashed #24414b; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#6f8085; font-size:11px; text-align:center; }
.lobi .bekle { text-align:center; color:#a3b2b6; margin-top:10px; }
.lobi .takimlar { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin:10px 0; }
.lobi .takim { text-align:left; display:flex; flex-direction:column; gap:6px; }
.lobi .takim[aria-pressed="true"] { background:#24414b; outline:3px solid #f4cf47; }
.lobi .takim .els { margin-right:3px; }
.lobi .rakip { display:flex; align-items:center; gap:8px; justify-content:flex-end; color:#a3b2b6; font-size:12px; }
.lobi .duyuru { text-align:center; font:900 22px/1.2 system-ui; color:#f4cf47; min-height:28px; }
.lobi .sayac { font:800 14px/1 system-ui; color:#a3b2b6; text-align:right; }
.lobi .kart.genis { width:min(900px, calc(100% - 32px)); background:#1b2131; border:none; border-radius:0; box-shadow:inset 0 0 0 2px #a99e92, inset 0 0 0 3px #07080f, 0 10px 30px rgba(0,0,0,.6); }
.lobi .ustb { display:grid; grid-template-columns:48px 1fr 48px; align-items:center; margin:-4px 0 12px; }
.lobi .ustb h2 { text-align:center; margin:0; text-transform:uppercase; letter-spacing:4px; }
.lobi .geriK { width:44px; height:38px; padding:0; background:#9a3d38; box-shadow:inset 0 0 0 2px #d8b9a0, inset 0 0 0 3px #3a1210; border:none; border-radius:0; font:900 18px/1 system-ui; }
.lobi .modlar { display:grid; grid-template-columns:230px 1fr; gap:14px; }
.lobi .modc { display:flex; flex-direction:column; gap:10px; padding:12px; background:#151a2a; box-shadow:inset 0 0 0 2px #59607a; }
.lobi .mod { padding:16px 10px; background:#292d39; border:none; border-radius:0; box-shadow:inset 0 0 0 2px #c08e52, inset 0 0 0 3px #07080f; font:900 17px/1 "Trebuchet MS",system-ui; letter-spacing:2px; text-transform:uppercase; }
.lobi .mod[aria-pressed=true] { background:linear-gradient(#7c4a2a,#5a3018); box-shadow:inset 0 0 0 2px #fcd35a, inset 0 0 0 3px #07080f; }
.lobi .mod small { display:block; margin-top:4px; font:700 10px/1 system-ui; letter-spacing:0; text-transform:none; color:#c9b48e; }
.lobi .icerik { padding:14px; background:#151a2a; box-shadow:inset 0 0 0 2px #59607a; display:flex; flex-direction:column; gap:10px; min-height:260px; }
.lobi .icerik h3 { margin:0; font:900 16px/1.2 "Trebuchet MS",system-ui; letter-spacing:2px; text-transform:uppercase; }
.lobi .icerik p { margin:0; font-size:13px; color:#c2c6d6; }
.lobi .arama { text-align:center; font:900 22px/1.2 "Trebuchet MS",system-ui; color:#fcd35a; margin-top:6px; }
.lobi .arama .zm { font-family:ui-monospace,monospace; color:#fff; }
.lobi .oneri { padding:10px 12px; background:#2a1814; box-shadow:inset 0 0 0 2px #e8762f; display:flex; flex-direction:column; gap:8px; align-items:center; text-align:center; }
.lobi .oneri b { color:#ffb070; }
.lobi .bot-kart { box-shadow:inset 0 0 0 2px #fcd35a; }
`;

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif = "", ust?: HTMLElement, metin = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin) e.textContent = metin;
  ust?.appendChild(e);
  return e;
}

const TAKIM_ANAHTAR = SON_TAKIM;

export function baslat(b: EkranBaglami): void {
  new LobiEkrani(b);
}

type Asama = "giris" | "bekliyor" | "secim" | "mac" | "hata";

class LobiEkrani {
  private kok = el("div", "lobi");
  private kart = el("div", "kart", this.kok);
  private stil = el("style");
  private baglanti: Baglanti | null = null;
  private ag: AgMaci | null = null;
  private mac: MacEkrani | null = null;
  asama: Asama = "giris";
  hata = "";
  kod = "";
  private rakipBulunduBitis = 0;
  private sonFaz = -1;
  private secilenTakim = "0";
  private zamanlayici = 0;

  private ben: Girisli;

  constructor(private b: EkranBaglami) {
    this.ben = b.ben as Girisli;
    this.stil.textContent = STIL;
    document.head.appendChild(this.stil);
    b.ustYazi.appendChild(this.kok);
    const takimlar = this.ben.takimlar;
    // D6: varsayılan Atölye'deki aktif takım (oynanabilir takımlar sunucudan; eksik takım listelenmez)
    if (!takimlar.length) { git("atolye"); return; }
    this.secilenTakim = (this.ben.aktifTakim && takimlar.some((t) => t.id === this.ben.aktifTakim) ? this.ben.aktifTakim : null) ?? oku(TAKIM_ANAHTAR) ?? takimlar[0]?.id ?? "0";
    if (!takimlar.some((t) => t.id === this.secilenTakim)) this.secilenTakim = takimlar[0]?.id ?? "0";
    this.giris();
    (window as unknown as { __lobi: LobiEkrani }).__lobi = this;
    if (new URLSearchParams(location.search).get("hizli") === "1") void this.hizliBasla();
    if (location.hash.startsWith("#oda=")) { this.modSecimi = "oda"; this.giris(); }
    this.zamanlayici = window.setInterval(() => this.tik(), 200);
  }

  get macEkrani(): MacEkrani | null { return this.mac; }
  get agMaci(): AgMaci | null { return this.ag; }

  /** sol sütun seçimi (referans 06): hızlı maç varsayılan */
  modSecimi: "hizli" | "oda" = "hizli";
  /** D7: kuyrukta bekleme başlangıcı (istemci saati; sunucu bot isteğini kendi saatiyle denetler) */
  private kuyrukBas = 0;
  private botIstendi = false;

  private giris(hata = "", hizliHata = false): void {
    this.asama = "giris";
    this.hata = hata;
    const k = this.kart;
    k.className = "kart genis";
    k.innerHTML = "";
    const ub = el("div", "ustb", k);
    const geri = el("button", "geriK", ub, "◄");
    geri.setAttribute("aria-label", "Geri: Atölye");
    geri.addEventListener("click", () => git("atolye"));
    el("h2", "", ub, "Lobi");
    el("div", "alt", k, "1v1 · ilk 3 puan · 90 sn");
    const md = el("div", "modlar", k);
    const sol = el("div", "modc", md);
    const sag = el("div", "icerik", md);
    const hz = el("button", "mod", sol);
    hz.textContent = "Hızlı maç";
    hz.dataset["mod"] = "hizli";
    const od = el("button", "mod", sol);
    od.textContent = "Oda kodu";
    od.dataset["mod"] = "oda";
    // Dereceli: yeni oyuncuya hiç görünmez; bir Çekirdek Lv.3 olunca belirir (sahip kararı S4). Mod D7'de yok.
    if (dereceliAcik(this.ben.cekirdekler.map((c) => c.seviye))) {
      const dr = el("button", "mod", sol, "Dereceli");
      dr.dataset["mod"] = "dereceli";
      dr.addEventListener("click", () => { const h = this.kart.querySelector<HTMLElement>(".icerik .hata"); if (h) h.textContent = "Dereceli çok yakında."; });
    }
    for (const [d, m] of [[hz, "hizli"], [od, "oda"]] as const) {
      d.setAttribute("aria-pressed", String(this.modSecimi === m));
      d.addEventListener("click", () => { this.modSecimi = m; this.giris(); });
    }
    if (this.modSecimi === "hizli") { this.hizliPaneli(sag, hata, hizliHata); return; }
    const iz = el("div", "izgara", sag);
    const ac = el("div", "blok", iz);
    el("h3", "", ac, "Oda kodu");
    el("p", "", ac, "Oda aç, kodu ya da bağlantıyı arkadaşına gönder.");
    const acB = el("button", "bir", ac, "Oda aç");
    acB.dataset["eylem"] = "oda-ac";
    el("label", "", ac, "Oda kodu");
    const alan = el("input", "", ac);
    alan.placeholder = "ABCD-EFGH";
    alan.maxLength = 32;
    alan.setAttribute("aria-label", "Oda kodu");
    alan.autocomplete = "off";
    const hash = location.hash.startsWith("#oda=") ? odaKoduCoz(location.hash) : null;
    if (hash) alan.value = odaKoduBicimle(hash);
    const katB = el("button", hash ? "bir" : "", ac, "Odaya katıl");
    katB.dataset["eylem"] = "katil";
    const diger = el("div", "blok", iz);
    el("h3", "", diger, "Antrenman");
    const ant = el("button", "", diger, "Antrenman (sunucu botu)");
    ant.dataset["eylem"] = "antrenman";
    el("p", "", diger, "Altın ve başarım yok.");
    const h = el("div", "hata", sag, hata);
    h.setAttribute("role", "alert");
    acB.addEventListener("click", () => void this.bagla(() => this.yeniBaglanti().odaAc(this.secilenTakim)));
    ant.addEventListener("click", () => void this.bagla(() => this.yeniBaglanti().antrenman(this.secilenTakim)));
    const katil = () => {
      const kod = odaKoduCoz(alan.value);
      if (!kod) { h.textContent = HATA_METNI.gecersiz; this.hata = HATA_METNI.gecersiz; return; }
      void this.bagla(() => this.yeniBaglanti().katil(kod, this.secilenTakim));
    };
    katB.addEventListener("click", katil);
    alan.addEventListener("keydown", (e) => { if (e.key === "Enter") katil(); });
    queueMicrotask(() => (hash ? katB : acB).focus());
  }

  /** Hızlı maç paneli (giriş hâli; 60 sn bulunamadıysa ux § 7 metni + Tekrar dene · Antrenman). */
  private hizliPaneli(k: HTMLElement, hata: string, bulunamadi: boolean): void {
    el("h3", "", k, "Hızlı maç");
    const t = this.ben.takimlar.find((x) => x.id === this.secilenTakim);
    el("p", "", k, `Takım: ${t?.ad ?? "aktif takım"}`);
    if (bulunamadi) {
      const o = el("div", "oneri", k);
      o.dataset["bulunamadi"] = "1";
      el("b", "", o, "Şu an rakip bulamadık. Tekrar deneyebilir ya da Antrenman yapabilirsin.");
      const s = el("div", "satir", o);
      const td = el("button", "bir", s, "Tekrar dene");
      td.dataset["eylem"] = "hizli";
      td.addEventListener("click", () => void this.hizliBasla());
      const an = el("button", "", s, "Antrenman");
      an.addEventListener("click", () => git("antrenman"));
      queueMicrotask(() => td.focus());
    } else {
      const ara = el("button", "bir", k, "Rakip ara");
      ara.dataset["eylem"] = "hizli";
      ara.addEventListener("click", () => void this.hizliBasla());
      queueMicrotask(() => ara.focus());
    }
    const h = el("div", "hata", k, hata && !bulunamadi ? hata : "");
    h.setAttribute("role", "alert");
  }

  private async hizliBasla(): Promise<void> {
    this.modSecimi = "hizli";
    this.kuyrukBas = performance.now();
    this.botIstendi = false;
    await this.bagla(() => this.yeniBaglanti().hizli(this.secilenTakim));
  }

  /** test: kuyrukta geçen süre (sn) */
  get kuyrukSn(): number { return this.kuyrukBas ? (performance.now() - this.kuyrukBas) / 1000 : 0; }

  private yeniBaglanti(): Baglanti {
    this.baglanti = new Baglanti();
    return this.baglanti;
  }

  private async bagla(f: () => Promise<unknown>): Promise<void> {
    for (const b of this.kart.querySelectorAll("button")) b.disabled = true;
    try {
      await f();
    } catch (e) {
      const m = e instanceof BaglantiHatasiE ? e.message : HATA_METNI.bilinmiyor;
      this.giris(m);
      return;
    }
    this.ag = new AgMaci(this.baglanti!);
    this.kod = this.baglanti!.oda!.roomId;
    for (const b of this.ag.bilgiler) this.bilgi(b);
    this.baglanti!.bilgiDinleyicileri.add((b) => this.bilgi(b));
    this.ag.oda.onStateChange((s) => this.durumDegisti(s));
    this.durumDegisti(this.ag.durum);
  }

  private bilgi(b: { tur: string; ad?: string; neden?: string }): void {
    if (b.tur === "rakipBulundu") this.rakipBulunduBitis = performance.now() + 3000;
    if (b.tur === "kapandi" && this.asama !== "mac") {
      const hizli = this.ag?.durum.mod === "hizli";
      const metin = b.neden === "rakipGelmedi" || b.neden === "sureDoldu" ? HATA_METNI.suresiDoldu : b.neden === "rakipAyrildi" ? "Rakip maçtan ayrıldı." : HATA_METNI.bilinmiyor;
      void this.baglanti?.ayril();
      this.ag = null;
      this.kok.classList.remove("ust");
      this.kok.style.display = "";
      if (hizli && b.neden === "rakipGelmedi") { this.modSecimi = "hizli"; this.giris("", true); return; }
      this.giris(metin);
    }
  }

  private durumDegisti(s: OdaGorunumu | undefined): void {
    if (!s || !s.oyuncular || !this.ag) return;
    if (s.faz === this.sonFaz && s.faz !== ODA_FAZI.secim && s.faz !== ODA_FAZI.bekliyor) return;
    const degisti = s.faz !== this.sonFaz;
    this.sonFaz = s.faz;
    if (s.faz === ODA_FAZI.bekliyor) { if (degisti) this.bekleme(s); else this.beklemeGuncelle(s); }
    else if (s.faz === ODA_FAZI.secim) { if (degisti) this.secim(); else this.secimGuncelle(); }
    else if (s.faz === ODA_FAZI.mac) this.macaGec();
  }

  private bekleme(s: OdaGorunumu): void {
    this.asama = "bekliyor";
    if (s.mod === "hizli") { this.kuyrukEkrani(); return; }
    if (s.kod) history.replaceState(null, "", `${location.pathname}${location.search}#oda=${s.kod}`);
    const k = this.kart;
    k.innerHTML = "";
    el("h2", "", k, "Oda açıldı");
    el("div", "alt", k, "Rakip bekleniyor. Kodu ya da bağlantıyı gönder.");
    const kod = el("div", "kod", k, odaKoduBicimle(s.kod));
    kod.dataset["kod"] = s.kod;
    const satir = el("div", "satir", k);
    const kopyala = (metin: string, d: HTMLButtonElement, ilk: string) => {
      void navigator.clipboard?.writeText(metin).then(() => { d.textContent = "Kopyalandı"; setTimeout(() => { d.textContent = ilk; }, 1500); }, () => { d.textContent = "Kopyalanamadı"; });
    };
    const kk = el("button", "bir", satir, "Kodu kopyala");
    kk.addEventListener("click", () => kopyala(odaKoduBicimle(s.kod), kk, "Kodu kopyala"));
    const bk = el("button", "", satir, "Bağlantıyı kopyala");
    const baglantiMetni = `${location.origin}${location.pathname}?ekran=lobi#oda=${s.kod}`;
    bk.title = baglantiMetni;
    bk.addEventListener("click", () => kopyala(baglantiMetni, bk, "Bağlantıyı kopyala"));
    el("div", "qr", k, "QR · yer tutucu");
    const bekle = el("div", "bekle", k, "");
    bekle.dataset["sayac"] = "1";
    this.beklemeGuncelle(s);
    const iptal = el("button", "", el("div", "satir", k), "İptal");
    iptal.style.marginTop = "10px";
    iptal.addEventListener("click", () => { void this.baglanti?.ayril(); this.ag = null; this.giris(); });
  }

  /** "Rakip aranıyor… 0:12" + İptal; 20 sn Antrenman önerisi; 30 sn bot teklifi (nile B-19, ux § 7). */
  private kuyrukEkrani(): void {
    const k = this.kart;
    k.className = "kart genis";
    k.innerHTML = "";
    const ub = el("div", "ustb", k);
    el("span", "", ub);
    el("h2", "", ub, "Hızlı maç");
    const ic = el("div", "icerik", k);
    const ar = el("div", "arama", ic);
    ar.dataset["arama"] = "1";
    ar.setAttribute("role", "status");
    ar.setAttribute("aria-live", "polite");
    const oneri = el("div", "", ic);
    oneri.dataset["oneri"] = "1";
    const s = el("div", "satir", ic);
    const iptal = el("button", "", s, "İptal");
    iptal.dataset["eylem"] = "iptal";
    iptal.addEventListener("click", () => { void this.baglanti?.ayril(); this.ag = null; this.giris(); });
    this.kuyrukAsamasi = "";
    this.kuyrukGuncelle();
    queueMicrotask(() => iptal.focus());
  }

  private kuyrukAsamasi = "";
  private kuyrukGuncelle(): void {
    const ar = this.kart.querySelector<HTMLElement>("[data-arama]");
    if (!ar) return;
    const sn = this.kuyrukSn;
    const metin = `Rakip aranıyor… <span class="zm">${sureBicimle(sn)}</span>`;
    if (ar.innerHTML !== metin) ar.innerHTML = metin;
    const a = this.botIstendi ? "bot" : kuyrukAsamasi(sn);
    if (a === this.kuyrukAsamasi) return;
    this.kuyrukAsamasi = a;
    const o = this.kart.querySelector<HTMLElement>("[data-oneri]")!;
    o.innerHTML = "";
    o.className = "";
    if (a === "antrenmanOner") {
      o.className = "oneri";
      o.dataset["asama"] = a;
      el("b", "", o, "Beklerken Antrenman yap");
      const d = el("button", "", o, "Antrenman");
      d.addEventListener("click", () => { void this.baglanti?.ayril(); git("antrenman"); });
    } else if (a === "botTeklif") {
      o.className = "oneri bot-kart";
      o.dataset["asama"] = a;
      el("b", "", o, "Rakip bulunamadı. Bot ile oyna?");
      el("span", "", o, "Altın yarı · başarımda yalnız Yol");
      const d = el("button", "bir", o, "Bot ile oyna");
      d.dataset["eylem"] = "bot";
      d.addEventListener("click", () => { this.botIstendi = true; this.ag?.gonder(MESAJ.botIste); d.disabled = true; d.textContent = "Bot hazırlanıyor…"; });
      queueMicrotask(() => d.focus());
    }
  }

  private beklemeGuncelle(s: OdaGorunumu): void {
    if (s.mod === "hizli") { this.kuyrukGuncelle(); return; }
    const e = this.kart.querySelector<HTMLElement>("[data-sayac]");
    if (e) e.textContent = `Oda ${s.beklemeKalan} sn açık kalır.`;
  }

  private secim(): void {
    this.asama = "secim";
    const ag = this.ag!;
    if (this.mac) { this.kok.classList.add("ust"); this.kok.style.display = ""; }
    const k = this.kart;
    k.innerHTML = "";
    const duyuru = el("div", "duyuru", k, "");
    duyuru.dataset["duyuru"] = "1";
    el("h2", "", k, this.mac ? "Rövanş: takım seç" : "Takım seç");
    const ust = el("div", "rakip", k);
    ust.dataset["rakip"] = "1";
    const izg = el("div", "takimlar", k);
    for (const t of this.ben.takimlar) {
      const d = el("button", "takim", izg);
      d.dataset["takim"] = t.id;
      const p = takimProfilleriKimlikten(takimKoduYaz(t.uyeler));
      const uyeler = p.map((x, j) => `<span title="${t.uyeler[j]!.odunc ? "Ödünç · Lv.1" : `Lv.${t.uyeler[j]!.seviye}`}" style="${t.uyeler[j]!.odunc ? "filter:grayscale(1);opacity:.55" : ""}">${elementSvg(x.element, 16)}</span>`).join("");
      d.innerHTML = `<b></b><span>${uyeler}</span><small style="color:#a3b2b6">${t.uyeler.filter((u) => u.odunc).length ? `${t.uyeler.filter((u) => u.odunc).length} ödünç topaç` : "3 Çekirdek"}</small>`;
      d.querySelector("b")!.textContent = t.ad;
      d.addEventListener("click", () => {
        this.secilenTakim = t.id;
        sakla(TAKIM_ANAHTAR, t.id);
        ag.gonder(MESAJ.takimSec, { takimId: t.id });
        this.secimGuncelle();
      });
    }
    const alt = el("div", "satir", k);
    const hazir = el("button", "bir", alt, "Hazır");
    hazir.dataset["eylem"] = "hazir";
    hazir.addEventListener("click", () => { ag.gonder(MESAJ.hazir); hazir.disabled = true; hazir.textContent = "Rakip bekleniyor…"; });
    const sayac = el("div", "sayac", k, "");
    sayac.dataset["secimSayac"] = "1";
    // sunucudaki takım bu istemcinin seçtiğinden farklıysa (yeni oda) bildir
    const ben = ag.oyuncu(ag.yerel);
    if (ben && ben.takimNo !== this.secilenTakim) ag.gonder(MESAJ.takimSec, { takimId: this.secilenTakim });
    this.secimGuncelle();
    queueMicrotask(() => hazir.focus());
  }

  private secimGuncelle(): void {
    const ag = this.ag;
    if (!ag || this.asama !== "secim") return;
    const s = ag.durum;
    for (const d of this.kart.querySelectorAll<HTMLElement>("[data-takim]")) d.setAttribute("aria-pressed", String(d.dataset["takim"] === this.secilenTakim));
    const sayac = this.kart.querySelector<HTMLElement>("[data-secim-sayac]");
    if (sayac) sayac.textContent = `Süre ${s.secimKalan} sn · süre dolunca son seçtiğin takım`;
    const rk = ag.oyuncu(1 - ag.yerel);
    const r = this.kart.querySelector<HTMLElement>("[data-rakip]");
    if (r && rk) {
      const p = takimProfilleriKimlikten(rk.takimId);
      const html = `Rakip: <b>${rk.ad.replace(/[<>&]/g, "")}</b> ${p.map((x) => elementSvg(x.element, 16)).join("")}${rk.hazir ? " · hazır" : ""}`;
      if (r.innerHTML !== html) r.innerHTML = html;
    }
    const duyuru = this.kart.querySelector<HTMLElement>("[data-duyuru]");
    if (duyuru) duyuru.textContent = performance.now() < this.rakipBulunduBitis && rk ? `Rakip bulundu: ${rk.ad}` : "";
  }

  private macaGec(): void {
    if (this.asama === "mac") return;
    this.asama = "mac";
    this.kok.style.display = "none";
    if (!this.mac) {
      this.mac = cevrimiciBaslat(this.b, this.ag!, {
        secim: () => {},
        cikis: (neden) => { this.giris(neden); },
        ben: this.ben,
        // D7: hızlı maçta Tekrar = yeni eşleşme (sayfa temiz başlar, kuyruk kendiliğinden)
        tekrar: () => {
          const q = new URLSearchParams(location.search);
          q.set("ekran", "lobi");
          q.set("hizli", "1");
          void this.baglanti?.ayril().finally(() => { location.href = `${location.pathname}?${q.toString()}`; });
        },
      });
    }
  }

  private tik(): void {
    const s = this.ag?.durum;
    if (!s || !s.oyuncular) return;
    if (this.asama === "secim") this.secimGuncelle();
    if (this.asama === "bekliyor") this.beklemeGuncelle(s);
    if (this.asama === "bekliyor" && s.mod === "hizli") this.kuyrukGuncelle();
    // faz değişimini kaçırmamak için (onStateChange zaten çağırır; yedek)
    if (s.faz !== this.sonFaz) this.durumDegisti(s);
  }
}
