import { MADENLER } from "../../paylasilan/veri/harita.ts";
import { BANT_METNI, type BantEtiketi } from "../../paylasilan/kurallar/ustalik.ts";
import type { EkranBaglami } from "../main.ts";
import { apiGet, apiPost, git, oku, sakla } from "../hesap.ts";
import { ekranKok, el } from "./arayuz.ts";

// Maden ekranı (docs/design/harita/07 § 4, 02 § 3): ortada damar + Kuşak halkası (1,4 sn tur, bronz isabet yayı %22),
// alt ortada KAZ (≥ 64 CSS px; ekranın boş alanı / Boşluk / Enter da kazar; 700 ms kilit), uçuşan sonuç ("+3 ◆" /
// "İSABET" / "ISKA +5"), sol üstte Madencilik paneli (seviye, çubuk, bant, başarı %), damar kalan ●●●●○○, nadir damar
// satırı, DİNÇ sayacı (41+ "YARIM VERİM" bandı). Kapasite bitince ana düğme HARİTA. Sunucu yetkili (POST /api/maden/*);
// isabet zamanı istemci saatiyle (yanıt alındığı andan) + son 3 isteğin RTT ortancası (`gecikmeMs`).
// "Hareketi azalt": halka ucu 8 sabit konumda basamaklı; Ayarlar "İsabet halkası kapalı" (`devran.isabetHalkasi=0`):
// halka gizli, isabet gönderilmez (ceza yok, +1 bonus yok). Seçiciler: [data-eylem=kaz|harita], [data-halka], [data-kalan].

interface Ustalik { seviye: number; ilerleme: number; tecrube: number; sonraki: number | null; bant: BantEtiketi; basari: number }
interface Basla {
  seans: string; dugum: string; kademe: number; kalan: number; kapasite: number; ustaDamar: boolean; sira: number;
  nadir: { sira: number; kademe: number; kazilabilir: boolean } | null; ustalik: Ustalik;
  halka: { periyotMs: number; pencere: [number, number]; fazMs: number }; vurus: { bugun: number; tam: number; tavan: number; carpan: number; metin: string };
}
interface Kaz {
  basari: boolean; isabet: boolean; kademe: number; nadir: boolean; verim: number; tecrube: number; ustalik: Ustalik & { atladi: boolean };
  kalan: number; sira: number; vurus: { bugun: number; carpan: number; metin: string }; halka: { fazMs: number }; asama: number; yeniAsama: boolean;
  yeniBasarimlar: { ad: string; acilanOzellik: string[] }[];
}

const STIL = `
.mdn .kart { width:min(calc(620 * var(--p)), 100%); padding:calc(4 * var(--p)); }
.mdn .md-govde { position:relative; display:grid; grid-template-columns:calc(130 * var(--p)) 1fr calc(120 * var(--p)); gap:calc(6 * var(--p)); min-height:calc(190 * var(--p)); }
.mdn .md-panel { padding:calc(4 * var(--p)) calc(6 * var(--p)); background:#11141f; box-shadow:inset 0 0 0 var(--p) var(--bronz-1); line-height:.9; align-self:start; }
.mdn .md-panel b { color:var(--ink); font-weight:400; text-transform:uppercase; }
.mdn .md-cubuk { height:calc(5 * var(--p)); background:#0d0f18; box-shadow:inset 0 0 0 var(--p) var(--harc); margin:calc(3 * var(--p)) 0; position:relative; }
.mdn .md-cubuk i { position:absolute; left:var(--p); top:var(--p); bottom:var(--p); background:#e8762f; max-width:calc(100% - 2 * var(--p)); }
.mdn .md-cubuk.atladi i { background:#fcd35a; }
.mdn .md-orta { display:flex; flex-direction:column; align-items:center; gap:calc(3 * var(--p)); }
.mdn .md-orta svg { width:calc(130 * var(--p)); height:calc(130 * var(--p)); max-width:100%; }
.mdn .md-ucus { position:absolute; left:50%; top:30%; transform:translateX(-50%); pointer-events:none; font:400 var(--y-30, 24px)/1 var(--font-baslik); color:#fcd35a; text-shadow:0 2px 0 #000; animation: md-ucus 1s ease-out forwards; }
.mdn .md-ucus.iska { color:var(--soluk); }
@keyframes md-ucus { to { transform:translate(-50%, -40px); opacity:0; } }
.mdn .md-alt { display:flex; justify-content:center; align-items:center; gap:calc(8 * var(--p)); margin-top:calc(4 * var(--p)); }
.mdn .md-alt button.ana { min-width:calc(140 * var(--p)); min-height:max(64px, calc(32 * var(--p))); }
.mdn .md-bant { background:#3b2c0c; color:#f7d83a; padding:calc(2 * var(--p)) calc(6 * var(--p)); text-align:center; text-transform:uppercase; }
.mdn .md-satir { text-transform:uppercase; color:var(--ink); }
.mdn .md-satir.nadir { color:#fcd35a; }
.mdn .md-seans span { display:block; }
.mdn .md-mini { position:absolute; left:calc(4 * var(--p)); bottom:calc(4 * var(--p)); }
html[data-telefon] .mdn .md-govde { grid-template-columns:calc(118 * var(--p)) 1fr calc(100 * var(--p)); min-height:0; }
html[data-telefon] .mdn .md-orta svg { width:calc(110 * var(--p)); height:calc(110 * var(--p)); }
@media (prefers-reduced-motion: reduce) { .mdn .md-ucus { animation:none; opacity:1; } }
`;

const kademe = (k: number) => MADENLER.find((x) => x.kademe === k)!;
const kAd = (k: number) => kademe(k).ad.replace(/ CEVHERİ$/, "");
const azalt = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
export const ISABET_HALKASI = "devran.isabetHalkasi";

export function baslat(b: EkranBaglami): void {
  const ben = b.ben;
  if (!ben?.girisli) { git("karsilama"); return; }
  const dugum = new URLSearchParams(location.search).get("dugum") ?? "";
  void new MadenEkrani(b, dugum).ac();
}

class MadenEkrani {
  private kok!: HTMLElement;
  private kart!: HTMLElement;
  private s: Basla | null = null;
  private alinma = 0;
  private kilit = 0;
  private rtt: number[] = [];
  private seansCevher = new Map<number, number>();
  private ucuz: SVGCircleElement | null = null;
  private halkaAcik = oku(ISABET_HALKASI) !== "0";
  private bitti = false;

  constructor(private b: EkranBaglami, private dugum: string) {}

  /** RTT ölçerek POST (son 3 örnek). */
  private async post<T>(yol: string, g: unknown): Promise<{ durum: number; veri: T & { hata?: string; gerekli?: number; beklemeMs?: number } }> {
    const t0 = performance.now();
    const r = await apiPost<T>(yol, g);
    this.rtt.push(performance.now() - t0);
    if (this.rtt.length > 3) this.rtt.shift();
    return r as never;
  }
  private get gecikme(): number { const s = [...this.rtt].sort((x, y) => x - y); return Math.round(s[Math.floor(s.length / 2)] ?? 0); }

  async ac(): Promise<void> {
    const r = ekranKok(this.b.ustYazi, "Maden", { baslik: "Maden" });
    this.kok = r.kok;
    this.kart = r.kart;
    this.kok.classList.add("mdn");
    const st = el("style"); st.textContent = STIL; document.head.appendChild(st);
    const geri = this.kok.querySelector<HTMLButtonElement>(".k-geri");
    const lento = this.kok.querySelector(".k-lento");
    if (lento && !geri) {
      const g = el("button", "k-geri", lento as HTMLElement);
      g.type = "button"; g.setAttribute("aria-label", "Geri: Harita");
      g.addEventListener("click", () => this.cik());
      lento.prepend(g);
    }
    // damar bugün bittiyse / uzaksa istek atmadan söyle (gereksiz 409 yok)
    try {
      const h = await apiGet<{ konum: string | null; bolgeler: { dugumler: { id: string; kalanVurus?: number }[] }[] }>("/api/harita");
      const d = h.bolgeler.flatMap((b) => b.dugumler).find((x) => x.id === this.dugum);
      if (!d) { this.hataCiz("yok"); return; }
      if (h.konum !== this.dugum) { this.hataCiz("uzak"); return; }
      if (d.kalanVurus === 0) { this.hataCiz("bitti"); return; }
    } catch { /* aşağıdaki istek hatayı söyler */ }
    const t0 = performance.now();
    const s = await apiPost<Basla>("/api/maden/basla", { dugum: this.dugum });
    this.rtt.push(performance.now() - t0);
    this.alinma = performance.now();
    if (s.durum !== 201) { this.hataCiz(s.veri.hata ?? "", (s.veri as { gerekli?: number }).gerekli); return; }
    this.s = s.veri;
    this.ciz();
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); this.cik(); return; }
      if ((e.key === " " || e.key === "Enter") && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); void this.kaz(); }
    });
    // ekranın boş alanına dokunmak da KAZ (sol kenardan 60 px içeride: Android geri jesti)
    this.kart.addEventListener("pointerdown", (e) => {
      if ((e.target as HTMLElement).closest("button, a")) return;
      if (e.clientX < 60) return;
      void this.kaz();
    });
    const kare = () => { this.halkaCiz(); requestAnimationFrame(kare); };
    requestAnimationFrame(kare);
    (window as unknown as { __maden: MadenEkrani }).__maden = this;
  }

  get durum(): Basla | null { return this.s; }

  private cik(): void {
    const s = this.s;
    if (s) void apiPost("/api/maden/bitir", { seans: s.seans }).finally(() => git("harita", "&donus=1"));
    else git("harita");
  }

  private hataCiz(h: string, gerekli?: number): void {
    const m: Record<string, string> = {
      ustalik: `USTALIK ${gerekli ?? ""} GEREKİR`, bitti: "BU DAMAR BUGÜN BİTTİ · 04:00'TE DOLAR", uzak: "ÖNCE DAMARA YÜRÜ", kilitli: "DAMAR KİLİTLİ", kapali: "HARİTA KAPALI", yok: "DAMAR YOK",
    };
    el("div", "md-satir", this.kart, m[h] ?? "BAĞLANTI YOK · TEKRAR DENE").setAttribute("role", "alert");
    const alt = el("div", "md-alt", this.kart);
    const d = el("button", "k-dugme ana", alt, "HARİTA");
    d.dataset["eylem"] = "harita";
    d.addEventListener("click", () => git("harita"));
  }

  private ciz(): void {
    const s = this.s!;
    const k = this.kart;
    k.innerHTML = "";
    const g = el("div", "md-govde", k);
    // sol: Madencilik paneli
    const p = el("div", "md-panel k-e16", g);
    p.dataset["ustalik"] = String(s.ustalik.seviye);
    el("b", "", p, `MADENCİLİK ${s.ustalik.seviye}`);
    const c = el("div", "md-cubuk", p);
    el("i", "", c).style.width = `${Math.round(s.ustalik.ilerleme * 100)}%`;
    el("div", "", p, BANT_METNI[s.ustalik.bant]);
    el("div", "", p, `BAŞARI %${Math.round(s.ustalik.basari * 100)}`);
    // orta: damar + halka
    const o = el("div", "md-orta", g);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "-60 -60 120 120");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${kAd(s.kademe)} damarı`);
    svg.dataset["halka"] = this.halkaAcik ? "1" : "0";
    const R = 46;
    const yay = (a0: number, a1: number, renk: string, kalin: number) => {
      const x = document.createElementNS("http://www.w3.org/2000/svg", "path");
      x.setAttribute("d", `M ${(R * Math.cos(a0)).toFixed(2)} ${(R * Math.sin(a0)).toFixed(2)} A ${R} ${R} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${(R * Math.cos(a1)).toFixed(2)} ${(R * Math.sin(a1)).toFixed(2)}`);
      x.setAttribute("fill", "none"); x.setAttribute("stroke", renk); x.setAttribute("stroke-width", String(kalin));
      svg.appendChild(x);
    };
    const tam = Math.PI * 2;
    // damar kayası (kademe renginde) + nadir çatlak
    const kaya = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    for (const [a, v] of Object.entries({ x: -22, y: -22, width: 44, height: 44, fill: kademe(s.kademe).renk.koyu, stroke: kademe(s.kademe).renk.ana, "stroke-width": 3 })) kaya.setAttribute(a, String(v));
    svg.appendChild(kaya);
    const rz = document.createElementNS("http://www.w3.org/2000/svg", "text");
    rz.setAttribute("text-anchor", "middle"); rz.setAttribute("y", "6"); rz.setAttribute("font-size", "16"); rz.setAttribute("fill", "#fff");
    rz.textContent = String(s.kademe);
    svg.appendChild(rz);
    if (this.halkaAcik) {
      yay(-Math.PI / 2 + 0.001, -Math.PI / 2 + tam - 0.001, "#2a3236", 4);
      const [bas, bit] = s.halka.pencere;
      const P = s.halka.periyotMs;
      yay(-Math.PI / 2 + (bas / P) * tam, -Math.PI / 2 + (bit / P) * tam, "#b07a4a", 6);
      const u = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      u.setAttribute("r", "5"); u.setAttribute("fill", "#FBBE88");
      svg.appendChild(u);
      this.ucuz = u;
    } else this.ucuz = null;
    o.appendChild(svg);
    const kalan = el("div", "md-satir k-e16", o, `${kAd(s.kademe)} (${s.kademe}) · ${"●".repeat(s.kalan)}${"○".repeat(Math.max(0, s.kapasite - s.kalan))} ${s.kalan}/${s.kapasite}`);
    kalan.dataset["kalan"] = String(s.kalan);
    if (s.nadir && s.nadir.sira >= s.sira) {
      el("div", "md-satir nadir k-e16", o, s.nadir.kazilabilir ? `✦ NADİR DAMAR: ${s.nadir.sira + 1}. VURUŞ · ${kAd(s.nadir.kademe)}` : `✦ NADİR DAMAR · USTALIĞIN YETMİYOR · ${kademe(s.nadir.kademe).esik}`);
    }
    if (s.ustaDamar) el("div", "md-satir nadir k-e16", o, "USTA DAMAR");
    // sağ: bu seans
    const sg = el("div", "md-panel md-seans k-e16", g);
    el("b", "", sg, "BU SEANS");
    if (!this.seansCevher.size) el("span", "", sg, "—");
    for (const [kd, n] of this.seansCevher) el("span", "", sg, `◆${kd} ${kAd(kd)} ×${n}`);
    // karakterin küçük kopyası (KAZ animasyonu yer tutucusu, 13 § 2.2)
    const mini = el("div", "md-mini", g);
    mini.innerHTML = `<svg width="20" height="30" viewBox="-10 -26 20 30" aria-hidden="true"><rect x="-3" y="-24" width="6" height="6" fill="#e9c9a0"/><rect x="-5" y="-18" width="10" height="9" fill="#f4cf47" data-giysi="1"/><rect x="-4" y="-9" width="3" height="9" fill="#2a2f3a"/><rect x="1" y="-9" width="3" height="9" fill="#2a2f3a"/></svg>`;
    const giysi = mini.querySelector("[data-giysi]");
    const ben = this.b.ben?.girisli ? this.b.ben : null;
    if (giysi && ben?.oyuncu.renk) giysi.setAttribute("fill", ben.oyuncu.renk); // profil rengi DOM özniteliğiyle
    // alt: dinç sayacı + KAZ
    if (s.vurus.bugun >= s.vurus.tam && s.vurus.bugun < s.vurus.tavan) el("div", "md-bant k-e16", k, "BUNDAN SONRA YARIM VERİM");
    const alt = el("div", "md-alt", k);
    el("span", "k-e16", alt, `⛏ ${s.vurus.metin}`).dataset["dinc"] = String(s.vurus.bugun);
    const bitti = s.kalan <= 0;
    this.bitti = bitti;
    const d = el("button", "k-dugme ana", alt, bitti ? "HARİTA" : "KAZ");
    d.dataset["eylem"] = bitti ? "harita" : "kaz";
    d.addEventListener("click", () => { if (this.bitti) this.cik(); else void this.kaz(); });
    if (!oku("devran.madenIpucu.v1")) { el("div", "md-satir k-e16", k, "Işık bronz yaydayken bas: İSABET +1 cevher.").style.textAlign = "center"; sakla("devran.madenIpucu.v1", "1"); }
  }

  /** Halka ucu (istemci saati, yanıt alındığı andan); hareketi azalt → 8 sabit konum. */
  private halkaCiz(): void {
    const s = this.s;
    if (!s || !this.ucuz) return;
    const P = s.halka.periyotMs;
    const t = performance.now() - this.alinma;
    let f = ((t + s.halka.fazMs) % P) / P;
    if (azalt()) f = Math.floor(f * 8) / 8;
    const a = -Math.PI / 2 + f * Math.PI * 2;
    this.ucuz.setAttribute("cx", (46 * Math.cos(a)).toFixed(2));
    this.ucuz.setAttribute("cy", (46 * Math.sin(a)).toFixed(2));
  }

  private async kaz(): Promise<void> {
    const s = this.s;
    if (!s || this.bitti) return;
    const simdi = performance.now();
    if (simdi < this.kilit) return;
    const gecen = simdi - this.alinma;
    if (gecen < 700) return; // sunucu kuralı (429 erken) istemcide de
    this.kilit = simdi + 700;
    const r = await this.post<Kaz>("/api/maden/kaz", { seans: s.seans, sira: s.sira, isabetMs: this.halkaAcik ? Math.round(gecen) : null, gecikmeMs: this.gecikme });
    this.alinma = performance.now();
    if (r.durum !== 200) {
      if (r.durum === 429) { this.alinma -= 700 - (r.veri.beklemeMs ?? 0); return; }
      this.bitti = true;
      this.ucusGoster(r.veri.hata === "bitti" ? "DAMAR BİTTİ" : "HATA", true);
      this.ciz();
      return;
    }
    const v = r.veri;
    if (v.verim > 0) this.seansCevher.set(v.kademe, (this.seansCevher.get(v.kademe) ?? 0) + v.verim);
    s.sira = v.sira;
    s.kalan = v.kalan;
    s.halka.fazMs = v.halka.fazMs;
    s.ustalik = { ...s.ustalik, ...v.ustalik };
    s.vurus = { ...s.vurus, bugun: v.vurus.bugun, carpan: v.vurus.carpan, metin: v.vurus.metin };
    this.ciz();
    this.ucusGoster(v.basari ? `+${v.verim} ◆${v.kademe}${v.isabet ? " İSABET" : ""}${v.nadir ? " NADİR" : ""}` : `ISKA +${v.tecrube}`, !v.basari);
    if (v.ustalik.atladi) { this.kart.querySelector(".md-cubuk")?.classList.add("atladi"); this.ucusGoster(`MADENCİLİK ${v.ustalik.seviye}`, false, 30); }
    if (v.yeniBasarimlar?.length) this.ucusGoster(`AÇILDI: ${v.yeniBasarimlar.map((x) => x.ad).join(", ")}`, false, 60);
  }

  private ucusGoster(metin: string, iska: boolean, dy = 0): void {
    const g = this.kart.querySelector<HTMLElement>(".md-govde");
    if (!g) return;
    const u = el("div", `md-ucus${iska ? " iska" : ""}`, g, metin);
    u.dataset["ucus"] = metin;
    u.style.top = `calc(30% + ${dy * 1.6}px)`;
    u.setAttribute("role", "status");
    window.setTimeout(() => u.remove(), 1200);
  }
}
