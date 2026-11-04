import type { ElementAdi } from "../../paylasilan/kurallar/ayar.ts";
import { CUBUK_AD, CUBUK_SIRA, cubukFarki, profilCubuklari, type CubukOzeti } from "../../paylasilan/veri/cubuklar.ts";
import { topacProfiliKur } from "../../paylasilan/veri/profil.ts";
import { BASLANGIC_SETLERI } from "../../paylasilan/veri/katalog.ts";
import type { EkranBaglami } from "../main.ts";
import { HESAP_HATA, type MarketGorunumu, type MarketUrunu, type YenilemeSatiri, apiGet, apiPost, git } from "../hesap.ts";
import { elementSvg } from "../oyun/elementSimge.ts";
import { ELEMENT_RENK, KOKEN_RENK } from "../oyun/renkler.ts";
import { el } from "./arayuz.ts";
import { COIN_SVG, KILIT_SVG, parcaIkonu, refStilEkle } from "./referansStil.ts";

// Market (D7, 03 US-3.1..3.3, ux § 7 / § 6.4, referans görsel 04): üst bant (◄ · MARKET · ALTIN), "GÜNÜN PARÇASI −30%"
// bandı, 2×2 ahşap tabelalı raf (Çekirdekler · Gövdeler · Diskler · Uçlar; tezgâh alt başlığı), hücre = ikon + rozet
// (fiyat / kilit + ilerleme / ??? / Sende). Odakta ve fareyle ipucu: ad + fiyat + kilit koşulu (tide C-13). Satın al →
// tek adım onay (iptal edilebilir) → "Satın alındı" + Atölye bağlantısı. Dökümhane: Yapay yenileme. ERİTME YOK.
// URL: ?ekran=market&parca=<id> (ürünü aç) · &yenile=<cekirdekId> (yenileme onayı).

const STIL = `
.mk { padding:.6rem 1.4rem 1.2rem; }
.mk .ic { width:min(78rem,100%); margin:0 auto; }
.mk .gunun { display:flex; align-items:center; justify-content:center; gap:1rem; width:min(36rem,100%); margin:0 auto .5rem; padding:.3rem 1rem; cursor:pointer;
  background:#151a2a; box-shadow:inset 0 0 0 2px var(--r-gold), inset 0 0 0 3px var(--r-ic), inset 0 0 0 5px #2b2410; border:none; color:#fff; }
.mk .gunun .b { font:900 1.15rem/1 "Trebuchet MS",system-ui; letter-spacing:2px; text-transform:uppercase; }
.mk .gunun .ind { color:var(--r-accent); }
.mk .gunun s { color:var(--r-soluk); font-size:.8rem; }
.mk .raflar { display:grid; grid-template-columns:1fr 1fr; gap:1.1rem 1.6rem; }
.mk .raf { position:relative; padding:1.7rem .8rem .7rem; margin-top:.8rem; background:#151827;
  box-shadow:inset 0 0 0 3px var(--r-ahsap), inset 0 0 0 5px #2a170a, inset 0 0 0 7px #1d2133; }
.mk .raf .tabela { position:absolute; left:50%; top:-1rem; transform:translateX(-50%); white-space:nowrap; }
.mk .izg { display:grid; grid-template-columns:repeat(4, 1fr); gap:.4rem; }
.mk .hucre { position:relative; display:flex; flex-direction:column; align-items:center; gap:.18rem; padding:.3rem .2rem .28rem; background:#20253a; border:none; cursor:pointer;
  box-shadow:inset 0 0 0 2px #59607a, inset 0 0 0 3px var(--r-ic); color:var(--r-ink); min-height:5.3rem; }
.mk .hucre:hover { background:#272d46; }
.mk .hucre .ik { width:3.2rem; height:3.2rem; display:flex; align-items:center; justify-content:center; background:#141826; box-shadow:inset 0 0 0 2px #3a4058; }
.mk .hucre .ad { font:800 .68rem/1.1 system-ui; text-align:center; color:#d9dbe6; min-height:1rem; display:flex; align-items:center; }
.mk .hucre[data-durum=kilitli] .ik, .mk .hucre[data-durum=gizli] .ik { background:#0e1019; }
.mk .hucre[data-durum=sahip] { box-shadow:inset 0 0 0 2px #3f8f60, inset 0 0 0 3px var(--r-ic); }
.mk .hucre[data-gunun="1"] { box-shadow:inset 0 0 0 2px var(--r-gold), inset 0 0 0 3px var(--r-ic); }
.mk .hucre .yeni { position:absolute; top:.15rem; right:.15rem; padding:.05rem .3rem; background:var(--r-accent); color:#1a0c04; font:900 .55rem/1.2 system-ui; letter-spacing:.5px; }
.mk .hucre .ind { position:absolute; top:.15rem; left:.15rem; padding:.05rem .3rem; background:var(--r-gold); color:#2a1d02; font:900 .55rem/1.2 system-ui; }
.mk .kilitR { display:flex; align-items:center; gap:.3rem; }
.mk .kilitR .cubukc { width:2.2rem; }
.mk .ipucu { position:fixed; z-index:30; width:17rem; padding:.6rem .75rem; pointer-events:none; background:#10131f; box-shadow:inset 0 0 0 2px var(--r-edge), inset 0 0 0 3px var(--r-ic);
  font-size:.8rem; display:none; }
.mk .ipucu.acik { display:block; }
.mk .ipucu h4 { margin:0 0 .2rem; font:900 .95rem/1.2 system-ui; }
.mk .ipucu p { margin:.15rem 0; color:#c9ccd8; }
.mk .ipucu .kosul { color:#ffb070; font-weight:800; }
.mk .dokum { margin-top:1.3rem; padding:.8rem 1rem; }
.mk .dokum h3 { margin:0 0 .5rem; font:900 1rem/1 "Trebuchet MS",system-ui; letter-spacing:2px; text-transform:uppercase; color:#e0c8a0; }
.mk .dokum .sat { display:flex; align-items:center; gap:.8rem; padding:.35rem 0; border-top:1px solid #2c3247; flex-wrap:wrap; }
.mk .dokum .sat:first-of-type { border-top:none; }
.mk .dokum .omur { width:9rem; }
.mk .dokum .omur .cubukc i { background:linear-gradient(90deg,#4d5d6b,#7f95a8); }
.mk .md-cubuk { display:grid; grid-template-columns:6rem 1fr 3.6rem; gap:.2rem .5rem; align-items:center; font-size:.78rem; margin:.5rem 0; }
.mk .md-cubuk .bar { position:relative; height:.5rem; background:#11131d; box-shadow:inset 0 0 0 1px #000; }
.mk .md-cubuk .bar i { position:absolute; left:0; top:0; bottom:0; background:#cfd6e6; }
.mk .md-cubuk .bar u { position:absolute; top:-2px; bottom:-2px; width:2px; background:var(--r-accent); }
.mk .md-cubuk .f { text-align:right; font-weight:900; font-variant-numeric:tabular-nums; }
.mk .md-cubuk .f.art { color:var(--r-yesil); } .mk .md-cubuk .f.azal { color:#ff9a7a; }
.mk .modal .ust { display:flex; gap:.9rem; align-items:center; margin-bottom:.4rem; }
.mk .modal .ust .ik { width:5rem; height:5rem; display:flex; align-items:center; justify-content:center; background:#160c0a; box-shadow:inset 0 0 0 2px #6a3a24; }
.mk .modal .ad { font:900 1.15rem/1.2 system-ui; } .mk .modal .alt { font-size:.8rem; color:#d8c2b0; }
.mk .modal .fiyat { margin:.6rem 0; font:900 1.05rem/1.2 system-ui; color:var(--r-gold); }
.mk .modal .fiyat s { color:var(--r-soluk); font-size:.85rem; margin-left:.4rem; }
.mk .modal .eksik { color:#ff9a7a; font-weight:900; }
.mk .modal .tamam { color:var(--r-yesil); font-weight:900; }
.mk .modal .sat { display:flex; gap:.6rem; justify-content:center; margin-top:.8rem; flex-wrap:wrap; }
.mk .bos { padding:2rem; text-align:center; }
`;

const TUR_AD: Record<string, string> = { cekirdek: "Çekirdek", govde: "Gövde", disk: "Disk", uc: "Uç" };

export async function baslat(b: EkranBaglami): Promise<void> {
  const ben = b.ben;
  if (!ben?.girisli) { git("karsilama"); return; }
  refStilEkle();
  const v = await apiGet<MarketGorunumu>("/api/market");
  new MarketEkrani(b.ustYazi, v);
}

class MarketEkrani {
  private kok = el("div", "rf mk");
  private stil = el("style");
  private ipucu = el("div", "ipucu", this.kok);
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
    const q = new URLSearchParams(location.search);
    const p = q.get("parca");
    const y = q.get("yenile");
    if (p) { const u = this.urun(p); if (u) this.ac(u); }
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
    for (const c of [...k.children]) if (c !== this.ipucu) c.remove();
    const ic = el("div", "ic", k);
    // üst bant
    const ub = el("div", "ustbant panel pah", ic);
    const geri = el("button", "geriK pah", ub, "◄");
    geri.setAttribute("aria-label", "Geri: Atölye");
    geri.dataset["eylem"] = "geri";
    geri.addEventListener("click", () => git("atolye"));
    el("h2", "", ub, "Market");
    const cz = el("div", "cuzdan panel pah", ub);
    cz.innerHTML = `<div><b>ALTIN</b><span data-bakiye>${this.v.bakiye}</span></div>${COIN_SVG(30)}`;
    cz.setAttribute("aria-label", `Bakiye ${this.v.bakiye} Altın`);
    if (!this.v.acik) {
      const p = el("div", "panel pah bos", ic);
      el("p", "", p, "Market kilitli. Antrenman eğitimini bitir: İlk Devir başarımı Market'i açar.");
      const d = el("button", "dg bir pah", p, "Antrenmana git");
      d.addEventListener("click", () => git("antrenman"));
      queueMicrotask(() => d.focus());
      return;
    }
    // günün parçası
    const gp = this.v.gununParcasi;
    if (gp) {
      const g = el("button", "gunun pah", ic);
      g.dataset["gunun"] = gp.id;
      const u = this.urun(gp.id);
      g.innerHTML = `<span class="b">Günün parçası <span class="ind">−30%</span></span>${parcaIkonu(gp.tur, gp.element, u?.koken ?? null, u?.katman, 40)}<span><b></b> · ${gp.satisFiyati} Altın <s>${gp.fiyat}</s></span>`;
      g.querySelector("b")!.textContent = gp.ad;
      g.setAttribute("aria-label", `Günün parçası: ${gp.ad}, yüzde 30 indirimli, ${gp.satisFiyati} Altın (normalde ${gp.fiyat}).`);
      g.addEventListener("click", () => { if (u) this.ac(u); });
    }
    // raflar
    const rf = el("div", "raflar", ic);
    const hucreler: HTMLButtonElement[] = [];
    for (const r of this.v.raflar) {
      const raf = el("section", "raf", rf);
      raf.dataset["raf"] = r.tur;
      raf.setAttribute("aria-label", r.ad);
      el("div", "tabela pah", raf, r.ad);
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
        ik.innerHTML = u.durum === "kilitli" ? KILIT_SVG(26) : parcaIkonu(u.tur, u.element, u.koken, u.katman, 44, u.durum === "gizli");
        el("span", "ad", h, u.durum === "gizli" ? "???" : u.ad);
        const rz = el("span", "", h);
        if (u.durum === "acik") { rz.className = "rozet altin"; rz.textContent = `${u.satisFiyati} Altın`; }
        else if (u.durum === "sahip") { rz.className = "rozet sende"; rz.textContent = "Sende"; }
        else if (u.durum === "gizli") { rz.className = "rozet gizli"; rz.textContent = "???"; }
        else {
          rz.className = "rozet kilit kilitR";
          const bb = u.basarim;
          rz.innerHTML = `<span class="cubukc"><i style="width:${bb ? Math.round((bb.ilerleme / bb.sayi) * 100) : 0}%"></i></span>${bb ? `${bb.ilerleme}/${bb.sayi}` : "Kilitli"}`;
        }
        if (u.gununParcasi) el("span", "ind", h, "−30%");
        if (u.basarimlaAcildi && u.durum === "acik") el("span", "yeni", h, "Açıldı");
        h.addEventListener("click", () => this.ac(u));
        h.addEventListener("mouseenter", () => this.ipucuGoster(u, h));
        h.addEventListener("focus", () => { if (this.ilkOdak) { this.ilkOdak = false; return; } this.ipucuGoster(u, h); });
        h.addEventListener("mouseleave", () => this.ipucu.classList.remove("acik"));
        h.addEventListener("blur", () => this.ipucu.classList.remove("acik"));
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
      const dk = el("section", "dokum panel pah", ic);
      dk.dataset["dokumhane"] = "1";
      el("h3", "", dk, "Yapay yenileme");
      for (const s of this.v.yenileme) {
        const sat = el("div", "sat", dk);
        sat.dataset["yenileme"] = String(s.cekirdekId);
        sat.innerHTML = `${parcaIkonu("cekirdek", "kasirga", "yapay", "baslangic", 34)}<b></b><span class="omur"><span class="cubukc"><i style="width:${Math.round((s.omur / s.tavan) * 100)}%"></i></span></span><span>Ömür ${s.omur}/${s.tavan} maç</span>`;
        sat.querySelector("b")!.textContent = s.ad;
        const d = el("button", "dg pah", sat, s.yenilenebilir ? `Yenile · ${s.fiyat} Altın` : "Ömür tam");
        d.disabled = !s.yenilenebilir;
        d.dataset["eylem"] = "yenile";
        d.setAttribute("aria-label", `${s.ad}: ömür ${s.omur}/${s.tavan}. Yenile, ${s.fiyat} Altın${s.asinmisIndirimi ? ", Aşınmış indirimi" : ""}.`);
        if (s.asinmisIndirimi) el("span", "rozet altin", sat, `Aşınmış −50% (${s.tamFiyat} → ${s.fiyat})`);
        d.addEventListener("click", () => this.yenileAc(s));
      }
    }
    queueMicrotask(() => (hucreler.find((x) => x.dataset["durum"] === "acik") ?? hucreler[0])?.focus());
  }

  private ipucuGoster(u: MarketUrunu, h: HTMLElement): void {
    const p = this.ipucu;
    p.innerHTML = "";
    if (u.durum === "gizli") {
      el("h4", "", p, "???");
      el("p", "", p, "Gizli parça. Gizli bir başarımla açılır.");
    } else {
      el("h4", "", p, u.ad);
      const ek: string[] = [TUR_AD[u.tur] ?? u.tur];
      if (u.element && u.element in ELEMENT_RENK) ek.push(ELEMENT_RENK[u.element as ElementAdi].ad);
      if (u.koken && u.koken in KOKEN_RENK) ek.push(KOKEN_RENK[u.koken as keyof typeof KOKEN_RENK].ad);
      if (u.katmanAd) ek.push(u.katmanAd);
      el("p", "", p, ek.join(" · "));
      el("p", "", p, u.durum === "sahip" ? "Sende" : `${u.satisFiyati} Altın${u.gununParcasi ? ` (günün parçası, normalde ${u.fiyat})` : ""}`);
      if (u.durum === "kilitli" && u.basarim) el("p", "kosul", p, `Kilitli: ${u.basarim.ad} ${u.basarim.ilerleme}/${u.basarim.sayi}`);
      if (u.basarimlaAcildi && u.durum === "acik" && u.basarim) el("p", "kosul", p, `Market'te açıldı: ${u.basarim.ad}`);
    }
    const r = h.getBoundingClientRect();
    p.style.left = `${Math.min(window.innerWidth - 290, Math.max(8, r.left))}px`;
    p.style.top = `${r.bottom + 6 + 120 > window.innerHeight ? r.top - 130 : r.bottom + 6}px`;
    p.classList.add("acik");
  }

  private modal(baslik: string): HTMLDivElement {
    this.modalKapat();
    this.ipucu.classList.remove("acik");
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
    el("div", "ik pah", ust).innerHTML = u.durum === "kilitli" ? KILIT_SVG(40) : parcaIkonu(u.tur, u.element, u.koken, u.katman, 70);
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
    el("div", "ik pah", ust).innerHTML = parcaIkonu(u.tur, u.element, u.koken, u.katman, 70);
    const yz = el("div", "", ust);
    el("div", "ad", yz, u.ad);
    el("div", "tamam", yz, `−${r.veri.fiyat} Altın · bakiye ${r.veri.bakiye}`);
    this.dugmeler(m, [["Atölye'de tak", () => git("atolye", `&parca=${u.id}`), true], ["Markete dön", () => this.modalKapat(), false]]);
  }

  yenileAc(s: YenilemeSatiri): void {
    const k = this.modal("Yapay yenile");
    const ust = el("div", "ust", k);
    el("div", "ik pah", ust).innerHTML = parcaIkonu("cekirdek", "kasirga", "yapay", "baslangic", 70);
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
