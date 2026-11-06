import type { ElementAdi } from "../../paylasilan/kurallar/ayar.ts";
import { CUBUK_AD, CUBUK_SIRA, cubukFarki, profilCubuklari, type CubukOzeti } from "../../paylasilan/veri/cubuklar.ts";
import { topacProfiliKur } from "../../paylasilan/veri/profil.ts";
import { BASLANGIC_SETLERI } from "../../paylasilan/veri/katalog.ts";
import type { EkranBaglami } from "../main.ts";
import { HESAP_HATA, type MarketGorunumu, type MarketUrunu, type YenilemeSatiri, apiGet, apiPost, git } from "../hesap.ts";
import { elementSvg } from "../oyun/elementSimge.ts";
import { ELEMENT_RENK, KOKEN_RENK } from "../oyun/renkler.ts";
import { ayarDugmesi, el, lentoKur, stilEkle } from "./arayuz.ts";
import { refStilEkle } from "./referansStil.ts";
import { parca3bIkonHtml } from "./pikselTopac.ts";
import { ikonGozle } from "../atolye3d/ikonOnbellek.ts";
import { telefonMu } from "../mobil/cihaz.ts";

// GU-11 menü dili v2: pixel ikon (SVG yerine), sikke ve kilit sprite (stil/doku)
const COIN_SVG = (_b = 0): string => `<span class="k-sikke" aria-hidden="true"></span>`;
const KILIT_SVG = (_b = 0): string => `<span class="k-kilit" aria-hidden="true"></span>`;
const parcaIkonu = (id: string, tur: string, element: string | null | undefined, koken: string | null | undefined, katman: string | undefined, boyut = 44, gizli = false): string =>
  parca3bIkonHtml(id, tur, element, koken, katman, boyut >= 60 ? 2 : 1, gizli);

// Market (D7, 03 US-3.1..3.3, ux § 7 / § 6.4, referans görsel 04): üst bant (◄ · MARKET · ALTIN), "GÜNÜN PARÇASI −30%"
// bandı, 2×2 ahşap tabelalı raf (Çekirdekler · Gövdeler · Diskler · Uçlar; tezgâh alt başlığı), hücre = ikon + rozet
// (fiyat / kilit + ilerleme / ??? / Sende). Odakta ve fareyle ipucu: ad + fiyat + kilit koşulu (tide C-13). Satın al →
// tek adım onay (iptal edilebilir) → "Satın alındı" + Atölye bağlantısı. Dökümhane: Yapay yenileme. ERİTME YOK.
// URL: ?ekran=market&parca=<id> (ürünü aç) · &vurgu=<id> (ürüne kaydır + vurgula; Atölye "Market'te aç") · &yenile=<cekirdekId> (yenileme onayı).

const STIL = `
.mk.k-zemin { display:flex; flex-direction:column; }
/* K-10: tek zemin (gece göğü); ahşap yalnız raf tabelalarında */
.mk .ic { position:relative; flex:1; min-height:0; width:100%; padding:calc(5 * var(--p)) var(--kenar) calc(4 * var(--p)); display:grid; grid-template-columns:minmax(0,1fr) calc(144 * var(--p)); grid-template-rows:auto minmax(0,1fr); gap:calc(3 * var(--p)) calc(8 * var(--p)); }
.mk .ic > .gunun { grid-column:1; }
.mk .sol-kol { grid-column:1; min-height:0; overflow-y:auto; overflow-x:hidden; display:flex; flex-direction:column; gap:calc(6 * var(--p)); padding:calc(10 * var(--p)) calc(2 * var(--p)) calc(4 * var(--p)); scrollbar-width:thin; scrollbar-color:var(--bronz-1) var(--panel-0); }
/* K-9: seçili parçanın detay kartı (ad, tür, katkı, fiyat / kilit şartı) + adını söyleyen ana düğme */
.mk .detay { grid-column:2; grid-row:1 / 3; align-self:stretch; min-height:0; display:flex; flex-direction:column; gap:calc(4 * var(--p)); padding:calc(6 * var(--p)) calc(7 * var(--p)); overflow:hidden;
  background:var(--panel) var(--k-doku-panel) 0 0 / calc(32 * var(--p)); box-shadow:inset 0 0 0 var(--p) var(--harc), inset 0 0 0 calc(3 * var(--p)) var(--bronz-1), inset 0 0 0 calc(4 * var(--p)) var(--harc); text-transform:uppercase; }
.mk .detay .d-ust { display:flex; gap:calc(5 * var(--p)); align-items:center; }
.mk .detay .d-ik { flex:none; width:calc(44 * var(--p)); height:calc(36 * var(--p)); display:flex; align-items:center; justify-content:center; background:var(--hucre); box-shadow:inset 0 var(--p) 0 0 var(--hucre-isik), inset 0 0 0 var(--p) var(--harc); }
.mk .detay h3 { margin:0; font:400 var(--y-20)/1 var(--font-baslik); letter-spacing:var(--yp); color:var(--ink); overflow-wrap:anywhere; }
.mk .detay .d-tur { color:var(--soluk); line-height:.875; }
.mk .detay .d-baslik { color:var(--soluk); margin-top:calc(2 * var(--p)); }
.mk .detay .d-fiyat { display:flex; align-items:center; gap:calc(3 * var(--p)); font:400 var(--y-20)/1 var(--font-baslik); color:var(--gold); }
.mk .detay .d-fiyat s { color:var(--soluk); font-size:var(--y-16); }
.mk .detay .d-kosul { color:#ffb070; line-height:.875; text-transform:none; }
.mk .detay .d-kosul .cubukc { margin-top:calc(2 * var(--p)); }
.mk .detay .d-sende { color:var(--yesil); }
.mk .detay .md-cubuk { grid-template-columns:calc(56 * var(--p)) 1fr calc(20 * var(--p)); gap:calc(2 * var(--p)) calc(3 * var(--p)); margin:0; }
.mk .detay .d-al { margin-top:auto; width:100%; min-width:0; flex-direction:column; gap:var(--p); white-space:normal; text-align:center; font-size:var(--y-20); letter-spacing:var(--yp); padding-left:calc(6 * var(--p)); padding-right:calc(6 * var(--p)); }
.mk .detay .d-al small { font:400 var(--y-16)/.75 var(--font-etiket); letter-spacing:0; }
.mk .gunun { align-self:center; display:inline-flex; align-items:center; justify-content:center; gap:calc(8 * var(--p)); height:calc(22 * var(--p)); padding:0 calc(14 * var(--p)); cursor:pointer; margin:0;
  border:0 solid transparent; border-image:var(--k-plaka) 6 fill / calc(6 * var(--p)) / 0 round; color:var(--ink); font:400 var(--y-16)/.75 var(--font-etiket); text-transform:uppercase; box-shadow:var(--odak-g, 0 0 0 0 transparent); }
.mk .gunun .b { font:400 var(--y-20)/1 var(--font-baslik); letter-spacing:var(--yp); text-shadow:var(--p) var(--p) 0 var(--bronz-0); }
.mk .gunun .ind { color:var(--ink); }
.mk .gunun b { font-weight:400; color:var(--ink); }
.mk .gunun s { color:var(--ink); }
.mk .raflar { display:grid; grid-template-columns:1fr 1fr; gap:calc(8 * var(--p)) calc(10 * var(--p)); align-content:start; }
.mk .raf { position:relative; padding:calc(13 * var(--p)) calc(8 * var(--p)) calc(6 * var(--p)); margin-top:calc(9 * var(--p)); background:var(--panel) var(--k-doku-panel) 0 0 / calc(32 * var(--p));
  box-shadow:inset 0 0 0 var(--p) var(--harc), inset 0 0 0 calc(4 * var(--p)) #6b4226, inset 0 0 0 calc(5 * var(--p)) var(--harc), 0 calc(3 * var(--p)) 0 0 #2a170a; }
.mk .raf .tabela { position:absolute; left:50%; top:calc(-12 * var(--p)); transform:translateX(-50%); white-space:nowrap; height:calc(22 * var(--p)); }
.mk .raf .tabela::before, .mk .raf .tabela::after { content:""; position:absolute; top:calc(-8 * var(--p)); width:var(--p); height:calc(8 * var(--p)); background:#3a3640; }
.mk .raf .tabela::before { left:calc(10 * var(--p)); } .mk .raf .tabela::after { right:calc(10 * var(--p)); }
.mk .izg { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:calc(3 * var(--p)) calc(2 * var(--p)); }
.mk .hucre .rozet { padding:0 var(--p); max-width:100%; }
.mk .hucre { position:relative; display:flex; flex-direction:column; align-items:center; gap:calc(2 * var(--p)); padding:0; background:none; border:0; cursor:pointer; color:var(--ink); margin:0; }
.mk .hucre .ik { width:calc(40 * var(--p)); height:calc(26 * var(--p)); display:flex; align-items:center; justify-content:center; background:var(--hucre); border:var(--p) solid var(--harc); box-shadow:inset 0 var(--p) 0 0 var(--hucre-isik), var(--odak-g, 0 0 0 0 transparent); }
.mk .hucre:hover .ik { background:#262d46; }
.mk .hucre:focus-visible { outline:none !important; }
.mk .hucre[data-vurgu] .ik { outline:calc(2 * var(--p)) solid var(--gold, #f2c447); outline-offset:var(--p); animation:mk-vurgu .6s steps(2) 6; }
@keyframes mk-vurgu { 50% { outline-color:#fff; } }
@media (prefers-reduced-motion: reduce) { .mk .hucre[data-vurgu] .ik { animation:none; } }
.mk .hucre .ad { font:400 var(--y-16)/.75 var(--font-etiket); text-align:center; color:var(--soluk); text-transform:uppercase; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:none; }
.mk .hucre[data-durum=kilitli] .ik, .mk .hucre[data-durum=gizli] .ik { background:#11141f; }
.mk .hucre[data-durum=gizli] .ik img { filter:brightness(0); }
.mk .hucre[data-durum=sahip] .ik { box-shadow:inset 0 0 0 var(--p) #3f8f60; }
.mk .hucre[data-gunun="1"] .ik { box-shadow:inset 0 0 0 var(--p) var(--gold); }
.mk .hucre[data-secili="1"]::before { content:""; position:absolute; left:50%; top:calc(-3 * var(--p)); width:calc(46 * var(--p)); height:calc(36 * var(--p)); transform:translateX(-50%); pointer-events:none;
  --c:var(--gold); --u:calc(6 * var(--p)); --k:var(--p);
  background:linear-gradient(var(--c),var(--c)) 0 0 / var(--u) var(--k) no-repeat, linear-gradient(var(--c),var(--c)) 0 0 / var(--k) var(--u) no-repeat, linear-gradient(var(--c),var(--c)) 100% 0 / var(--u) var(--k) no-repeat, linear-gradient(var(--c),var(--c)) 100% 0 / var(--k) var(--u) no-repeat,
    linear-gradient(var(--c),var(--c)) 0 100% / var(--u) var(--k) no-repeat, linear-gradient(var(--c),var(--c)) 0 100% / var(--k) var(--u) no-repeat, linear-gradient(var(--c),var(--c)) 100% 100% / var(--u) var(--k) no-repeat, linear-gradient(var(--c),var(--c)) 100% 100% / var(--k) var(--u) no-repeat; }
.mk .hucre .yeni { position:absolute; top:calc(-2 * var(--p)); right:0; padding:0 calc(2 * var(--p)); background:var(--turuncu); color:#1a0c04; font:400 var(--y-16)/.75 var(--font-etiket); text-transform:uppercase; }
.mk .hucre .ind { position:absolute; top:calc(-2 * var(--p)); left:0; padding:0 calc(2 * var(--p)); background:var(--gold); color:#2a1d02; font:400 var(--y-16)/.75 var(--font-etiket); }
.mk .kilitR { display:flex; align-items:center; gap:calc(2 * var(--p)); }

.mk .dokum { padding:calc(6 * var(--p)) calc(8 * var(--p)); }
.mk .dokum h3 { margin:0 0 calc(4 * var(--p)); }
.mk .dokum .sat { display:flex; align-items:center; gap:calc(6 * var(--p)); padding:calc(3 * var(--p)) 0; border-top:var(--p) solid #2a3146; flex-wrap:wrap; text-transform:uppercase; }
.mk .dokum .sat:first-of-type { border-top:none; }
.mk .dokum .sat b { font-weight:400; }
.mk .dokum .omur { width:calc(60 * var(--p)); }
.mk .dokum .omur .cubukc i { background:repeating-linear-gradient(90deg, #7f95a8 0 calc(3 * var(--p)), transparent calc(3 * var(--p)) calc(4 * var(--p))); }
.mk .md-cubuk { display:grid; grid-template-columns:calc(56 * var(--p)) 1fr calc(30 * var(--p)); gap:calc(2 * var(--p)) calc(4 * var(--p)); align-items:center; margin:calc(4 * var(--p)) 0; text-transform:uppercase; }
.mk .md-cubuk .bar { position:relative; height:calc(5 * var(--p)); background:#0d0f18; box-shadow:inset 0 0 0 var(--p) var(--harc); }
.mk .md-cubuk .bar i { position:absolute; left:0; top:0; bottom:0; background:repeating-linear-gradient(90deg, var(--turuncu) 0 calc(3 * var(--p)), transparent calc(3 * var(--p)) calc(4 * var(--p))); }
.mk .md-cubuk .bar u { position:absolute; top:calc(-1 * var(--p)); bottom:calc(-1 * var(--p)); width:var(--p); background:#fff; }
.mk .md-cubuk .f { text-align:right; font-variant-numeric:tabular-nums; }
.mk .md-cubuk .f.art { color:var(--yesil); } .mk .md-cubuk .f.azal { color:var(--tehlike-yazi); }
.mk .modal .ust { display:flex; gap:calc(8 * var(--p)); align-items:center; margin-bottom:calc(4 * var(--p)); }
.mk .modal .ust .ik { width:calc(56 * var(--p)); height:calc(44 * var(--p)); display:flex; align-items:center; justify-content:center; background:#160c0a; box-shadow:inset 0 0 0 var(--p) #6a3a24; }
.mk .modal .ad { font:400 var(--y-20)/1 var(--font-baslik); letter-spacing:var(--yp); text-transform:uppercase; } .mk .modal .alt { color:#d8c2b0; text-transform:uppercase; }
.mk .modal .alt svg { display:none; }
.mk .modal .fiyat { display:flex; align-items:center; gap:calc(3 * var(--p)); margin:calc(5 * var(--p)) 0; font:400 var(--y-20)/1 var(--font-baslik); color:var(--gold); }
.mk .modal .fiyat s { color:var(--soluk); margin-left:calc(3 * var(--p)); }
.mk .modal .eksik { color:var(--tehlike-yazi); text-transform:uppercase; }
.mk .modal .tamam { color:var(--yesil); text-transform:uppercase; }
.mk .modal .sat { display:flex; gap:calc(6 * var(--p)); justify-content:center; margin-top:calc(8 * var(--p)); flex-wrap:wrap; }
.mk .modal p { line-height:.875; }
.mk .bos { padding:calc(16 * var(--p)); text-align:center; align-self:center; display:flex; flex-direction:column; gap:calc(8 * var(--p)); align-items:center; }
`;

const TUR_AD: Record<string, string> = { cekirdek: "Çekirdek", govde: "Gövde", disk: "Disk", uc: "Uç" };

export async function baslat(b: EkranBaglami): Promise<void> {
  const ben = b.ben;
  if (!ben?.girisli) { git("karsilama"); return; }
  stilEkle();
  refStilEkle();
  const v = await apiGet<MarketGorunumu>("/api/market");
  new MarketEkrani(b.ustYazi, v);
}

class MarketEkrani {
  private kok = el("div", "rf mk k-zemin k-gece");
  private stil = el("style");
  private modalEl: HTMLDivElement | null = null;
  private referansOzet: CubukOzeti | null = null;
  /** test / ekran görüntüsü: son satın alma ve yenileme sonucu */
  sonIslem: unknown = null;
  /** açılıştaki otomatik odak ipucu göstermez (ekran sade açılır) */
  private ilkOdak = true;

  constructor(private ust: HTMLElement, private v: MarketGorunumu) {
    this.stil.textContent = STIL;
    document.head.appendChild(this.stil);
    ust.appendChild(this.kok);
    this.kok.setAttribute("role", "main");
    this.kok.setAttribute("aria-label", "Market");
    (window as unknown as { __market: MarketEkrani }).__market = this;
    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" && e.key !== "Backspace") return;
      if (e.target instanceof HTMLInputElement) return;
      e.preventDefault();
      if (this.modalEl) this.modalKapat(); else git("atolye");
    });
    this.ciz();
    ikonGozle(this.kok); // TEMIZLIK #4: parça ikonları 3B tek kare (ortak önbellek, tembel)
    const q = new URLSearchParams(location.search);
    const p = q.get("parca");
    const y = q.get("yenile");
    const vurgu = q.get("vurgu");
    if (p) { const u = this.urun(p); if (u) this.ac(u); }
    else if (vurgu) queueMicrotask(() => this.vurgula(vurgu));
    else if (y) { const s = this.v.yenileme.find((x) => String(x.cekirdekId) === y); if (s) this.yenileAc(s); }
  }

  get veri(): MarketGorunumu { return this.v; }

  private urun(id: string): MarketUrunu | undefined {
    for (const r of this.v.raflar) for (const u of r.urunler) if (u.id === id) return u;
    return undefined;
  }

  private referans(): CubukOzeti | null {
    if (this.referansOzet) return this.referansOzet;
    const r = this.v.referans ?? { ...BASLANGIC_SETLERI[0]!, yon: "sag" as const };
    try { this.referansOzet = profilCubuklari(topacProfiliKur(r.cekirdek, r.govde, r.disk, r.uc, { yon: r.yon })); } catch { this.referansOzet = null; }
    return this.referansOzet;
  }

  /** Ürün takılınca referans topacın 6 çubuğu (Atölye mantığı). */
  private urunCubuklari(u: MarketUrunu): { once: CubukOzeti; sonra: CubukOzeti } | null {
    const once = this.referans();
    const r = this.v.referans ?? { ...BASLANGIC_SETLERI[0]!, yon: "sag" as const };
    if (!once) return null;
    const p = { cekirdek: r.cekirdek, govde: r.govde, disk: r.disk, uc: r.uc };
    p[u.tur] = u.id;
    try { return { once, sonra: profilCubuklari(topacProfiliKur(p.cekirdek, p.govde, p.disk, p.uc, { yon: r.yon })) }; } catch { return null; }
  }

  private ciz(): void {
    const k = this.kok;
    k.replaceChildren();
    // üst lento (◄ · MARKET · Altın yuvası)
    const lento = lentoKur(k, { baslik: "Market", geri: "atolye", cuzdan: false });
    lento.querySelector<HTMLElement>(".k-geri")!.dataset["eylem"] = "geri";
    const cz = el("div", "k-cuzdan", lento);
    el("span", "", cz, String(this.v.bakiye)).dataset["bakiye"] = "1";
    cz.setAttribute("aria-label", `Bakiye ${this.v.bakiye} Altın`);
    ayarDugmesi(lento);
    const ic = el("div", "ic", k);
    if (!this.v.acik) {
      const p = el("div", "k-panel bos", ic);
      el("p", "", p, "Market kilitli. Antrenman eğitimini bitir: İlk Devir başarımı Market'i açar.");
      const d = el("button", "k-dugme ana yazi20", p, "Antrenmana git");
      d.addEventListener("click", () => git("antrenman"));
      queueMicrotask(() => d.focus());
      return;
    }
    // günün parçası
    const gp = this.v.gununParcasi;
    if (gp) {
      const g = el("button", "gunun", ic);
      g.dataset["gunun"] = gp.id;
      const u = this.urun(gp.id);
      g.innerHTML = `<span class="b">Günün parçası <span class="ind">−30%</span></span>${parcaIkonu(gp.id, gp.tur, gp.element, u?.koken ?? null, u?.katman, 40)}<span><b></b> · ${gp.satisFiyati} Altın <s>${gp.fiyat}</s></span>`;
      g.querySelector("b")!.textContent = gp.ad;
      g.setAttribute("aria-label", `Günün parçası: ${gp.ad}, yüzde 30 indirimli, ${gp.satisFiyati} Altın (normalde ${gp.fiyat}).`);
      g.addEventListener("click", () => { if (u) this.ac(u); });
    }
    // raflar (sol sütun; uzarsa kendi içinde kayar) · detay kartı sağda
    // MOBIL-2 telefon: 4 raf yerine tek raf + sekme çubuğu (hepsi DOM'da kalır; CSS yalnız `.akt` rafı gösterir)
    const solKol = el("div", "sol-kol", ic);
    const tel = telefonMu();
    const sekmeler = tel ? el("div", "mk-sekmeler", solKol) : null;
    sekmeler?.setAttribute("role", "tablist");
    const rf = el("div", "raflar", solKol);
    const hucreler: HTMLButtonElement[] = [];
    for (const r of this.v.raflar) {
      const raf = el("section", "raf", rf);
      raf.dataset["raf"] = r.tur;
      raf.setAttribute("aria-label", r.ad);
      el("div", "tabela", raf, r.ad);
      if (sekmeler) {
        const t = el("button", "mk-sekme", sekmeler, r.ad);
        t.type = "button";
        t.setAttribute("role", "tab");
        t.dataset["raf"] = r.tur;
        t.addEventListener("click", () => this.rafGoster(r.tur));
      }
      const izg = el("div", "izg", raf);
      izg.setAttribute("role", "list");
      for (const u of r.urunler) {
        const h = el("button", "hucre pah", izg);
        h.setAttribute("role", "listitem");
        h.dataset["urun"] = u.id;
        h.dataset["durum"] = u.durum;
        if (u.gununParcasi) h.dataset["gunun"] = "1";
        h.setAttribute("aria-label", `${u.okunan}${u.gununParcasi ? " Günün parçası, yüzde 30 indirim." : ""}${u.basarimlaAcildi && u.durum === "acik" ? " Market'te açıldı." : ""}`);
        const ik = el("span", "ik", h);
        ik.innerHTML = u.durum === "kilitli" ? KILIT_SVG(26) : parcaIkonu(u.id, u.tur, u.element, u.koken, u.katman, 44, u.durum === "gizli");
        el("span", "ad", h, u.durum === "gizli" ? "???" : u.ad);
        const rz = el("span", "", h);
        if (u.durum === "acik") { rz.className = "rozet altin"; rz.textContent = u.satisFiyati === 0 ? "ÜCRETSİZ" : `${u.satisFiyati} Altın`; }
        else if (u.durum === "sahip") { rz.className = "rozet sende"; rz.textContent = "Sende"; }
        else if (u.durum === "gizli") { rz.className = "rozet gizli"; rz.textContent = "???"; }
        else {
          // K-9: kilitli hücrede anlamsız "0/10" çubuğu yok; ilerleme yalnız başlamışsa, şart detay kartında
          rz.className = "rozet kilit kilitR";
          const bb = u.basarim;
          rz.textContent = bb && bb.ilerleme > 0 ? `${bb.ilerleme}/${bb.sayi}` : "Kilitli";
        }
        if (u.gununParcasi) el("span", "ind", h, "−30%");
        if (u.basarimlaAcildi && u.durum === "acik") el("span", "yeni", h, "Açıldı");
        h.addEventListener("click", () => this.ac(u));
        // K-9: üzerine gelince / odakta detay kartı o parçayı gösterir (eski yüzen ipucu yerine)
        h.addEventListener("mouseenter", () => this.detayCiz(u));
        h.addEventListener("mouseleave", () => { if (this.seciliUrun) this.detayCiz(this.seciliUrun); });
        h.addEventListener("focus", () => { this.sec(u, h); this.ilkOdak = false; });
        hucreler.push(h);
      }
    }
    // klavye: ok tuşları rafta 4 sütun; raflar arası Tab ile de geçilir
    rf.addEventListener("keydown", (e) => {
      const i = hucreler.indexOf(document.activeElement as HTMLButtonElement);
      if (i < 0) return;
      const ad = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 4, ArrowUp: -4 } as Record<string, number>;
      const d = ad[e.key];
      if (d === undefined) return;
      e.preventDefault();
      const raf = hucreler[i]!.closest(".raf");
      const ayni = hucreler.filter((x) => x.closest(".raf") === raf);
      const j = ayni.indexOf(hucreler[i]!) + d;
      if (j >= 0 && j < ayni.length) ayni[j]!.focus();
      else hucreler[Math.max(0, Math.min(hucreler.length - 1, i + Math.sign(d)))]!.focus();
    });
    // Dökümhane: Yapay yenileme
    if (this.v.yenileme.length) {
      const dk = el("section", "dokum k-panel", solKol);
      dk.dataset["dokumhane"] = "1";
      el("h3", "", dk, "Yapay yenileme");
      for (const s of this.v.yenileme) {
        const sat = el("div", "sat", dk);
        sat.dataset["yenileme"] = String(s.cekirdekId);
        sat.innerHTML = `${parcaIkonu("kasirga-yapay", "cekirdek", "kasirga", "yapay", "baslangic", 34)}<b></b><span class="omur"><span class="cubukc"><i style="width:${Math.round((s.omur / s.tavan) * 100)}%"></i></span></span><span>Ömür ${s.omur}/${s.tavan} maç</span>`;
        sat.querySelector("b")!.textContent = s.ad;
        const d = el("button", "dg pah", sat, s.yenilenebilir ? `Yenile · ${s.fiyat} Altın` : "Ömür tam");
        d.disabled = !s.yenilenebilir;
        d.dataset["eylem"] = "yenile";
        d.setAttribute("aria-label", `${s.ad}: ömür ${s.omur}/${s.tavan}. Yenile, ${s.fiyat} Altın${s.asinmisIndirimi ? ", Aşınmış indirimi" : ""}.`);
        if (s.asinmisIndirimi) el("span", "rozet altin", sat, `Aşınmış −50% (${s.tamFiyat} → ${s.fiyat})`);
        d.addEventListener("click", () => this.yenileAc(s));
      }
    }
    // K-9: detay kartı (sağ sütun) + neyi aldığını söyleyen ana düğme (onay penceresi aynı)
    this.detayEl = el("aside", "detay", ic);
    this.detayEl.setAttribute("aria-live", "polite");
    this.detayEl.dataset["detay"] = "1";
    // ilk odak: ?vurgu=<id> (Atölye "Market'te aç") o ürün, yoksa ilk satın alınabilir ürün
    const vurguId = new URLSearchParams(location.search).get("vurgu");
    const ilk = (vurguId ? hucreler.find((x) => x.dataset["urun"] === vurguId) : undefined) ?? hucreler.find((x) => x.dataset["durum"] === "acik") ?? hucreler[0];
    if (ilk) { const u = this.urun(ilk.dataset["urun"]!); if (u) this.sec(u, ilk); }
    if (tel) this.rafGoster(ilk?.closest<HTMLElement>(".raf")?.dataset["raf"] ?? this.v.raflar[0]?.tur ?? "");
    queueMicrotask(() => ilk?.focus());
  }

  /** telefon: görünen rafı değiştirir (sekme çubuğu + `.akt` sınıfı) */
  private rafGoster(tur: string): void {
    for (const r of this.kok.querySelectorAll<HTMLElement>(".raf")) r.classList.toggle("akt", r.dataset["raf"] === tur);
    for (const t of this.kok.querySelectorAll<HTMLElement>(".mk-sekme")) { const on = t.dataset["raf"] === tur; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; }
  }

  private seciliUrun: MarketUrunu | null = null;
  private detayEl: HTMLElement | null = null;
  /** seçili hücre (çentik) + alt şerit metni; SATIN AL yalnız satın alınabilir üründe etkin */
  /** TEMIZLIK #6 (Atölye "Market'te aç", ?vurgu=<id>): ürüne kaydır, seç ve kısa süre vurgula (modal açılmaz). */
  vurgula(id: string): void {
    const h = this.kok.querySelector<HTMLElement>(`.hucre[data-urun="${CSS.escape(id)}"]`);
    const u = this.urun(id);
    if (!h || !u) return;
    if (telefonMu()) this.rafGoster(h.closest<HTMLElement>(".raf")?.dataset["raf"] ?? "");
    h.scrollIntoView({ block: "center", behavior: "auto" });
    this.ilkOdak = false;
    h.focus({ preventScroll: true });
    this.sec(u, h);
    h.dataset["vurgu"] = "1";
    window.setTimeout(() => { delete h.dataset["vurgu"]; }, 4000);
  }

  private sec(u: MarketUrunu, h: HTMLElement): void {
    this.seciliUrun = u;
    for (const x of this.kok.querySelectorAll<HTMLElement>(".hucre[data-secili]")) delete x.dataset["secili"];
    h.dataset["secili"] = "1";
    this.detayCiz(u);
  }

  /** K-9: seçili (ya da üzerine gelinen) parçanın kartı; ana düğme parçanın adını ve fiyatını söyler. */
  private detayCiz(u: MarketUrunu): void {
    const k = this.detayEl;
    if (!k) return;
    k.replaceChildren();
    k.dataset["urun"] = u.id;
    const ust = el("div", "d-ust", k);
    el("div", "d-ik", ust).innerHTML = u.durum === "kilitli" ? KILIT_SVG(26) : parcaIkonu(u.id, u.tur, u.element, u.koken, u.katman, 44, u.durum === "gizli");
    const yz = el("div", "", ust);
    el("h3", "", yz, u.durum === "gizli" ? "???" : u.ad);
    const ek: string[] = [TUR_AD[u.tur] ?? u.tur];
    if (u.durum !== "gizli") {
      if (u.element && u.element in ELEMENT_RENK) ek.push(ELEMENT_RENK[u.element as ElementAdi].ad);
      if (u.koken && u.koken in KOKEN_RENK) ek.push(KOKEN_RENK[u.koken as keyof typeof KOKEN_RENK].ad);
      if (u.katmanAd) ek.push(u.katmanAd);
    }
    el("div", "d-tur k-e16", yz, ek.join(" · "));
    if (u.durum === "gizli") {
      el("p", "d-kosul", k, "Gizli parça. Gizli bir başarımla açılır.");
    } else {
      // katkı: aktif takımın 1. topacına takılırsa altı çubuk farkı
      const c = this.urunCubuklari(u);
      if (c) {
        el("div", "d-baslik k-e16", k, "1. topacına takılırsa");
        const g = el("div", "md-cubuk", k);
        const fark = cubukFarki(c.once, c.sonra);
        for (const anahtar of CUBUK_SIRA) {
          const sn = c.sonra.cubuklar.find((x) => x.anahtar === anahtar)!;
          const o = c.once.cubuklar.find((x) => x.anahtar === anahtar)!;
          const f = fark[anahtar];
          el("span", "", g, CUBUK_AD[anahtar]);
          el("span", "bar", g).innerHTML = `<i style="width:${sn.deger}%"></i><u style="left:${o.deger}%"></u>`;
          el("span", `f${f > 0 ? " art" : f < 0 ? " azal" : ""}`, g, f > 0 ? `+${f}` : f < 0 ? `−${-f}` : "=");
        }
      }
      if (u.durum === "acik") {
        const fy = el("div", "d-fiyat", k);
        fy.innerHTML = u.satisFiyati === 0 ? "Ücretsiz" : `${COIN_SVG(14)} ${u.satisFiyati} Altın${u.gununParcasi ? ` <s>${u.fiyat}</s>` : ""}`;
        if (u.craft) { const cr = el("p", "d-kosul", k, u.craft.metin); cr.dataset["craft"] = u.craft.hazir ? "hazir" : u.craft.ustalikEksik ? "ustalik" : "gun"; }
      } else if (u.durum === "sahip") el("div", "d-sende k-e16", k, "Sende · Atölye'de takabilirsin");
      else {
        const bb = u.basarim;
        const kk = el("div", "d-kosul", k, bb ? `Kilit: ${bb.ad} başarımı · ${bb.ilerleme}/${bb.sayi}` : "Kilitli");
        if (bb) el("span", "cubukc", kk).innerHTML = `<i style="width:${Math.round((bb.ilerleme / Math.max(1, bb.sayi)) * 100)}%"></i>`;
      }
    }
    const d = el("button", "k-dugme ana d-al", k);
    d.type = "button";
    d.dataset["eylem"] = "satin-al";
    const ad = u.durum === "gizli" ? "???" : u.ad;
    if (u.durum === "acik") {
      el("span", "", d, ad);
      el("small", "", d, u.satisFiyati === 0 ? "Ücretsiz al" : `${u.satisFiyati} Altın al`);
      d.setAttribute("aria-label", `${ad}: ${u.satisFiyati === 0 ? "ücretsiz al" : `${u.satisFiyati} Altın ile satın al`}`);
      d.addEventListener("click", () => this.ac(u));
    } else if (u.durum === "sahip") {
      el("span", "", d, "Atölye'de tak");
      d.addEventListener("click", () => git("atolye", `&parca=${u.id}`));
    } else if (u.durum === "kilitli") {
      el("span", "", d, "Başarımlar");
      el("small", "", d, "Kilidi nasıl açılır");
      d.addEventListener("click", () => git("basarimlar"));
    } else { el("span", "", d, "Gizli"); d.disabled = true; }
  }

  private modal(baslik: string): HTMLDivElement {
    this.modalKapat();
    const m = el("div", "modal", this.kok);
    m.setAttribute("role", "dialog");
    m.setAttribute("aria-modal", "true");
    m.setAttribute("aria-label", baslik);
    const kutu = el("div", "kutu pah", m);
    el("h3", "", kutu, baslik);
    m.addEventListener("click", (e) => { if (e.target === m) this.modalKapat(); });
    this.modalEl = m;
    return kutu;
  }

  modalKapat(): void {
    this.modalEl?.remove();
    this.modalEl = null;
  }

  /** Ürün kartı: açık → satın alma onayı; kilitli → koşul; gizli → ???; sende → Atölye. */
  ac(u: MarketUrunu): void {
    if (u.durum === "gizli") {
      const k = this.modal("Gizli parça");
      el("p", "", k, "Gizli bir başarımla açılır.");
      this.dugmeler(k, [["Tamam", () => this.modalKapat(), true]]);
      return;
    }
    const k = this.modal(u.durum === "acik" ? "Satın al" : u.durum === "sahip" ? "Sende" : "Kilitli");
    const ust = el("div", "ust", k);
    el("div", "ik pah", ust).innerHTML = u.durum === "kilitli" ? KILIT_SVG(40) : parcaIkonu(u.id, u.tur, u.element, u.koken, u.katman, 70);
    const yz = el("div", "", ust);
    el("div", "ad", yz, u.ad);
    const alt = el("div", "alt", yz);
    alt.innerHTML = `${TUR_AD[u.tur]}${u.element && u.element in ELEMENT_RENK ? ` · ${elementSvg(u.element as ElementAdi, 14)} ${ELEMENT_RENK[u.element as ElementAdi].ad}` : ""}${u.koken && u.koken in KOKEN_RENK ? ` · ${KOKEN_RENK[u.koken as keyof typeof KOKEN_RENK].ad}` : ""} · ${u.katmanAd ?? ""}`;
    // 6 çubuk farkı (aktif takımın ilk topacına takılırsa)
    const c = this.urunCubuklari(u);
    if (c) {
      el("div", "yt", k, "Aktif takımının 1. topacına takılırsa:");
      const g = el("div", "md-cubuk", k);
      g.dataset["cubukFarki"] = "1";
      const fark = cubukFarki(c.once, c.sonra);
      for (const anahtar of CUBUK_SIRA) {
        const s = c.sonra.cubuklar.find((x) => x.anahtar === anahtar)!;
        const o = c.once.cubuklar.find((x) => x.anahtar === anahtar)!;
        const f = fark[anahtar];
        el("span", "", g, CUBUK_AD[anahtar]);
        el("span", "bar", g).innerHTML = `<i style="width:${s.deger}%"></i><u style="left:${o.deger}%"></u>`;
        const fe = el("span", `f${f > 0 ? " art" : f < 0 ? " azal" : ""}`, g, f > 0 ? `▲ +${f}` : f < 0 ? `▼ −${-f}` : "=");
        fe.dataset["fark"] = String(f);
      }
    }
    if (u.durum === "kilitli") {
      const bb = u.basarim;
      el("p", "eksik", k, bb ? `Kilitli: ${bb.ad} ${bb.ilerleme}/${bb.sayi}` : "Kilitli");
      this.dugmeler(k, [["Başarımlara git", () => git("basarimlar"), true], ["Kapat", () => this.modalKapat(), false]]);
      return;
    }
    if (u.durum === "sahip") {
      el("p", "tamam", k, "Sende");
      this.dugmeler(k, [["Atölye'de tak", () => git("atolye", `&parca=${u.id}`), true], ["Kapat", () => this.modalKapat(), false]]);
      return;
    }
    const fiyat = u.satisFiyati ?? 0;
    const fy = el("div", "fiyat", k);
    fy.innerHTML = `${COIN_SVG(18)} ${fiyat} Altın${u.gununParcasi ? `<s>${u.fiyat}</s> <span class="rozet altin">günün parçası −30%</span>` : ""}`;
    const eksik = fiyat - this.v.bakiye;
    if (eksik > 0) {
      const e = el("p", "eksik", k, `${eksik} Altın eksik`);
      e.dataset["eksik"] = String(eksik);
      this.dugmeler(k, [[`Satın al · ${fiyat} Altın`, () => {}, true, true], ["İptal", () => this.modalKapat(), false]]);
      return;
    }
    el("p", "alt", k, `Bakiye ${this.v.bakiye} → ${this.v.bakiye - fiyat} Altın`);
    const hata = el("p", "eksik", k, "");
    hata.setAttribute("role", "alert");
    this.dugmeler(k, [[`Satın al · ${fiyat} Altın`, () => void this.satinAl(u, k, hata), true], ["İptal", () => this.modalKapat(), false]]);
  }

  private dugmeler(k: HTMLElement, l: [string, () => void, boolean, boolean?][]): void {
    const s = el("div", "sat", k);
    let ilk: HTMLButtonElement | null = null;
    for (const [ad, f, bir, kapali] of l) {
      const d = el("button", `dg pah${bir ? " bir" : ""}`, s, ad);
      d.disabled = !!kapali;
      d.addEventListener("click", f);
      if (!ilk && !kapali) ilk = d;
    }
    queueMicrotask(() => ilk?.focus());
  }

  private async satinAl(u: MarketUrunu, k: HTMLElement, hata: HTMLElement): Promise<void> {
    for (const d of k.querySelectorAll("button")) d.disabled = true;
    const r = await apiPost<{ ok: boolean; fiyat: number; bakiye: number; market?: MarketGorunumu; eksik?: number }>("/api/market/satin-al", { parca: u.id });
    this.sonIslem = { tur: "satin", parca: u.id, durum: r.durum, veri: { ...r.veri, market: undefined } };
    if (r.durum !== 201 || !r.veri.market) {
      hata.textContent = r.veri.hata === "yetersiz" ? `${r.veri.eksik ?? 0} Altın eksik` : HESAP_HATA[r.veri.hata ?? ""] ?? "Satın alınamadı. Tekrar dene.";
      for (const d of k.querySelectorAll("button")) d.disabled = false;
      return;
    }
    this.v = r.veri.market;
    this.ciz();
    const m = this.modal("Satın alındı");
    m.dataset["satinAlindi"] = u.id;
    const ust = el("div", "ust", m);
    el("div", "ik pah", ust).innerHTML = parcaIkonu(u.id, u.tur, u.element, u.koken, u.katman, 70);
    const yz = el("div", "", ust);
    el("div", "ad", yz, u.ad);
    el("div", "tamam", yz, `−${r.veri.fiyat} Altın · bakiye ${r.veri.bakiye}`);
    this.dugmeler(m, [["Atölye'de tak", () => git("atolye", `&parca=${u.id}`), true], ["Markete dön", () => this.modalKapat(), false]]);
  }

  yenileAc(s: YenilemeSatiri): void {
    const k = this.modal("Yapay yenile");
    const ust = el("div", "ust", k);
    el("div", "ik pah", ust).innerHTML = parcaIkonu("kasirga-yapay", "cekirdek", "kasirga", "yapay", "baslangic", 70);
    const yz = el("div", "", ust);
    el("div", "ad", yz, s.ad);
    el("div", "alt", yz, `Ömür ${s.omur}/${s.tavan} maç → ${s.tavan}/${s.tavan}`);
    const fy = el("div", "fiyat", k);
    fy.innerHTML = `${COIN_SVG(18)} ${s.fiyat} Altın${s.asinmisIndirimi ? `<s>${s.tamFiyat}</s> <span class="rozet altin">Aşınmış −50%</span>` : ""}`;
    if (!s.yenilenebilir) { el("p", "tamam", k, "Ömür zaten tam."); this.dugmeler(k, [["Kapat", () => this.modalKapat(), true]]); return; }
    const eksik = s.fiyat - this.v.bakiye;
    if (eksik > 0) {
      el("p", "eksik", k, `${eksik} Altın eksik`).dataset["eksik"] = String(eksik);
      this.dugmeler(k, [[`Yenile · ${s.fiyat} Altın`, () => {}, true, true], ["İptal", () => this.modalKapat(), false]]);
      return;
    }
    const hata = el("p", "eksik", k, "");
    hata.setAttribute("role", "alert");
    this.dugmeler(k, [[`Yenile · ${s.fiyat} Altın`, () => void this.yenile(s, k, hata), true], ["İptal", () => this.modalKapat(), false]]);
  }

  private async yenile(s: YenilemeSatiri, k: HTMLElement, hata: HTMLElement): Promise<void> {
    for (const d of k.querySelectorAll("button")) d.disabled = true;
    const r = await apiPost<{ ok: boolean; fiyat: number; bakiye: number; omur: number; market?: MarketGorunumu; eksik?: number }>("/api/market/yenile", { cekirdekId: s.cekirdekId });
    this.sonIslem = { tur: "yenile", cekirdekId: s.cekirdekId, durum: r.durum, veri: { ...r.veri, market: undefined } };
    if (r.durum !== 200 || !r.veri.market) {
      hata.textContent = r.veri.hata === "yetersiz" ? `${r.veri.eksik ?? 0} Altın eksik` : HESAP_HATA[r.veri.hata ?? ""] ?? "Yenilenemedi. Tekrar dene.";
      for (const d of k.querySelectorAll("button")) d.disabled = false;
      return;
    }
    this.v = r.veri.market;
    this.ciz();
    const m = this.modal("Yenilendi");
    m.dataset["yenilendi"] = String(s.cekirdekId);
    el("p", "tamam", m, `${s.ad}: ömür ${r.veri.omur}/${s.tavan} maç. −${r.veri.fiyat} Altın · bakiye ${r.veri.bakiye}`);
    this.dugmeler(m, [["Atölye", () => git("atolye"), true], ["Markete dön", () => this.modalKapat(), false]]);
  }
}
