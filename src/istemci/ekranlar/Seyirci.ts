import { ODA_FAZI, odaKoduBicimle, odaKoduCoz } from "../../ag/protokol.ts";
import { TOPAC_DURUM, type Dunya, type Olay } from "../../paylasilan/sim/durum.ts";
import { kok2, kusakta } from "../../paylasilan/sim/fizik.ts";
import { MAC_ADIM } from "../../paylasilan/sim/mac.ts";
import { aktifMi, staminaOrani } from "../../paylasilan/sim/topac.ts";
import type { EkranBaglami } from "../main.ts";
import { IzleAgi } from "../ag/IzleAgi.ts";
import { ayarlariOku, hisAyari } from "../oyun/Ayarlar.ts";
import { Efektler } from "../oyun/Efektler.ts";
import { Iz } from "../oyun/Iz.ts";
import { ELEMENT_RENK } from "../oyun/renkler.ts";
import { Sahne } from "../oyun/Sahne.ts";
import { SeyirciHud } from "../oyun/SeyirciHud.ts";
import { TopacGorsel } from "../oyun/TopacGorsel.ts";
import { YetenekGorsel } from "../oyun/YetenekGorsel.ts";
import { Ses } from "../ses/Ses.ts";

// D8 seyirci / OBS görünümü (ux § 5): `#izle=ABCDEFGH` (`&seffaf=1` şeffaf arka plan) ya da `?ekran=seyirci&kod=`.
// Giriş yok, kontrol yok, imleç gizli; sabit 960×540, tam sayı ölçek. Maç: iki taraf aynı HUD (SeyirciHud) +
// oyuncu görünümüyle birebir aynı dünya sunumu (telegraf, Ulti, Takım Ultisi, bitiş efektleri). Maç dışı: tek ekran
// "Sıradaki maç bekleniyor" + son skor; bekleme fazında katılma kodu (maç başlayınca gizli).

const STIL = `
body.seyirci, body.seyirci * { cursor:none !important; }
body.seyirci.seffaf, body.seyirci.seffaf #sahne { background:transparent !important; }
.sy { position:absolute; left:0; top:0; width:960px; height:540px; transform-origin:0 0; pointer-events:none; font-family:"Nunito Sans",system-ui,sans-serif; color:#f3f1e8; }
.sy .bekle { position:absolute; left:230px; top:170px; width:500px; padding:22px 24px; box-sizing:border-box; text-align:center; background:rgba(12,25,29,.94); border:2px solid #24414b; border-radius:12px; display:none; }
.sy .bekle.acik { display:block; }
.sy .bekle h1 { margin:0; font:900 26px/32px system-ui; letter-spacing:.5px; }
.sy .bekle .son { margin-top:12px; font:800 20px/26px system-ui; color:#ffcf5a; }
.sy .bekle .son span { color:#f3f1e8; }
.sy .bekle .kod { margin-top:14px; font:800 16px/22px system-ui; color:#c9d4d7; }
.sy .bekle .kod b { display:block; margin-top:4px; font:900 34px/40px ui-monospace,monospace; letter-spacing:3px; color:#fff; }
.sy .bekle .alt { margin-top:8px; font:700 13px/18px system-ui; color:#a3b2b6; }
`;

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif = "", ust?: HTMLElement, metin = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin) e.textContent = metin;
  ust?.appendChild(e);
  return e;
}

/** `#izle=KOD&seffaf=1` ya da `?kod=KOD&seffaf=1`. */
export function seyirciAyarlari(): { kod: string | null; seffaf: boolean } {
  const h = new URLSearchParams(location.hash.replace(/^#/, ""));
  const q = new URLSearchParams(location.search);
  const ham = h.get("izle") ?? q.get("kod") ?? "";
  return { kod: odaKoduCoz(ham), seffaf: h.get("seffaf") === "1" || q.get("seffaf") === "1" };
}

class SeyirciEkrani {
  private sahne: Sahne;
  private efektler: Efektler;
  private yetenekGorsel: YetenekGorsel;
  private gorseller: TopacGorsel[] = [];
  private izler: Iz[] = [];
  private hud: SeyirciHud | null = null;
  private ust = el("div", "sy");
  private bekle = el("div", "bekle", this.ust);
  private baslik = el("h1", "", this.bekle);
  private son = el("div", "son", this.bekle);
  private kodSatiri = el("div", "kod", this.bekle);
  private alt = el("div", "alt", this.bekle);
  private stil = el("style");
  private dunya: Dunya | null = null;
  private onceki: { x: number; z: number }[] = [];
  private macNo = -1;
  private zaman = 0;
  /** test kancası */
  readonly gorulen: Record<string, number> = {};

  constructor(private b: EkranBaglami, readonly ag: IzleAgi, private seffaf: boolean) {
    this.stil.textContent = STIL;
    document.head.appendChild(this.stil);
    document.body.classList.add("seyirci");
    if (seffaf) document.body.classList.add("seffaf");
    this.sahne = new Sahne(b.app);
    this.sahne.tamSayiOlcek = true;
    this.sahne.boyutla(true);
    if (seffaf) this.sahne.arena.arkaPlanGoster(false);
    this.efektler = new Efektler(this.sahne, () => this.gorseller);
    // iki taraf da "karşı taraf" gibi: tehlike telegrafı (kırmızı + tarama) iki oyuncu için de birebir oyuncu görünümü
    this.yetenekGorsel = new YetenekGorsel(this.sahne, -1);
    this.yetenekGorsel.ipucuAcik = false;
    const a = ayarlariOku();
    this.efektler.ayar = hisAyari(a);
    this.sahne.sarsintiAyari(this.efektler.ayar.sarsinti);
    this.yetenekGorsel.flas = a.flas;
    Ses.yukle();
    if (a.ses === "acik") Ses.ac(); else Ses.kapat();
    this.efektler.sesKanca = (ad, hacim) => Ses.cal(ad, hacim);
    b.ustYazi.appendChild(this.ust);
    b.app.ticker.add(this.kare);
    (window as unknown as { __seyirci: SeyirciEkrani }).__seyirci = this;
  }

  /** Maç değişti (ya da ilk maç): görseller ve HUD yeniden. */
  private macKur(d: Dunya): void {
    this.efektler.temizle();
    this.yetenekGorsel.temizle();
    if (!this.gorseller.length) {
      for (let i = 0; i < 2; i++) {
        const g = new TopacGorsel(d.profiller[i]!, i === 0 ? "oyuncu" : "rakip", this.sahne.golgeKatmani, this.sahne.efektKatmani);
        this.sahne.nesneKatmani.addChild(g.kok);
        this.gorseller.push(g);
        const iz = new Iz(ELEMENT_RENK[d.profiller[i]!.element].acik);
        this.sahne.izKatmani.addChild(iz.rope);
        this.izler.push(iz);
      }
    }
    for (let i = 0; i < 2; i++) this.gorselYenile(d, i);
    this.hud?.yokEt();
    const s = this.ag.durum!;
    this.hud = new SeyirciHud(this.b.ustYazi, [s.oyuncular.at(0)?.ad ?? "", s.oyuncular.at(1)?.ad ?? ""], this.ag.seviyeler);
    this.b.ustYazi.appendChild(this.ust);
    this.onceki = d.topaclar.map((t) => ({ x: t.x, z: t.z }));
  }

  private gorselYenile(d: Dunya, i: number): void {
    const p = d.profiller[i]!;
    this.gorseller[i]!.profilAyarla(p, i === 0 ? "oyuncu" : "rakip");
    this.gorseller[i]!.sifirla();
    this.izler[i]!.sifirla();
    this.izler[i]!.renk = ELEMENT_RENK[p.element].acik;
  }

  private olayUygula(o: Olay, d: Dunya): boolean {
    this.gorulen[o.tur] = (this.gorulen[o.tur] ?? 0) + 1;
    if (o.tur === "degisim" && this.ag.profiller) d.profiller[o.i] = this.ag.profiller[o.i]![o.uye]!;
    this.efektler.olay(o, d);
    this.hud?.olay(o, d);
    this.yetenekGorsel.olay(o, d);
    if (o.tur === "degisim") { this.gorselYenile(d, o.i); return true; }
    if (o.tur === "turBasladi") {
      if (o.turNo > 1) { this.efektler.temizle(); for (const g of this.gorseller) g.sifirla(); for (const z of this.izler) z.sifirla(); }
      return true;
    }
    return false;
  }

  /** Maç dışı tek ekran: "Sıradaki maç bekleniyor" + son skor (+ bekleme fazında katılma kodu). */
  private bekleYaz(): void {
    const s = this.ag.durum;
    const ag = this.ag;
    let baslik = "Sıradaki maç bekleniyor";
    let alt = "";
    if (ag.hata === "yok") { baslik = "Yayın bulunamadı"; alt = "Bağlantıyı yayıncıdan yeniden iste."; }
    else if (ag.hata === "dolu") { baslik = "Seyirci odası dolu"; alt = "En çok 50 seyirci. Biraz sonra tekrar dene."; }
    else if (ag.hata === "surum") { baslik = "Oyun güncellendi"; alt = "Sayfayı yenile."; }
    else if (!ag.bagli) { baslik = "Yayına bağlanıyoruz…"; }
    else if (s && s.faz === ODA_FAZI.secim) baslik = "Maç hazırlanıyor";
    else if (s && s.faz === ODA_FAZI.bitti) baslik = "Maç bitti";
    this.baslik.textContent = baslik;
    // son skor (adlar textContent ile)
    this.son.replaceChildren();
    if (s?.sonVar && !ag.hata) {
      const a = el("span", "", this.son, s.sonAd0);
      this.son.append(` ${s.sonPuan0} – ${s.sonPuan1} `);
      el("span", "", this.son, s.sonAd1);
      void a;
    } else if (s && s.faz === ODA_FAZI.secim && s.oyuncular.length >= 2) {
      el("span", "", this.son, s.oyuncular.at(0)!.ad);
      this.son.append(" – ");
      el("span", "", this.son, s.oyuncular.at(1)!.ad);
    }
    this.kodSatiri.replaceChildren();
    if (s?.kod && !ag.hata) {
      this.kodSatiri.append("Katılmak için oda kodu");
      el("b", "", this.kodSatiri, odaKoduBicimle(s.kod));
      alt = "Lobi › Oda kodu › Katıl";
    }
    this.alt.textContent = alt;
  }

  private kare = (): void => {
    const dt = Math.min(this.b.app.ticker.deltaMS / 1000, 0.25);
    this.zaman += dt;
    const s = this.ag.durum;
    const macta = !!s && s.dunyaVar && (s.faz === ODA_FAZI.mac || s.faz === ODA_FAZI.bitti) && !!this.ag.sunucu;
    if (macta && this.ag.macNo !== this.macNo && this.ag.sunucu) { this.macNo = this.ag.macNo; this.macKur(this.ag.sunucu); }
    const g = macta ? this.ag.gorunum() : null;
    if (g) this.dunya = g;
    const d = this.dunya;
    const goster = macta && !!d && !!this.hud;
    this.bekle.classList.toggle("acik", !goster);
    if (!goster) this.bekleYaz();
    for (const gr of this.gorseller) gr.kok.visible = goster;
    for (const z of this.izler) z.rope.visible = goster;
    this.hud?.kok.style.setProperty("display", goster ? "" : "none");
    const S = this.sahne;
    S.boyutla(false, dt);
    const c = S.cerceve();
    this.ust.style.transform = `translate(${c.x}px, ${c.y}px) scale(${c.olcek})`;
    if (!goster || !d) { this.ag.olaylariAl(); return; }
    let isinla = false;
    for (const o of this.ag.olaylariAl()) isinla = this.olayUygula(o, d) || isinla;
    if (isinla) { for (const z of this.izler) z.sifirla(); this.onceki = d.topaclar.map((t) => ({ x: t.x, z: t.z })); }
    this.hud!.hizala(c.x, c.y, c.olcek);
    this.efektler.guncelle(dt);
    d.topaclar.forEach((t, i) => {
      const p = d.profiller[i]!;
      const ekran = this.efektler.konum(i, S.ekranX(t.x), S.ekranY(t.z), dt);
      const oran = staminaOrani(t, p);
      const gr = this.gorseller[i]!;
      gr.guncelle(dt, ekran.x, ekran.y, t.durum === TOPAC_DURUM.durma ? 0.02 : oran, t.sekmeKalan > 0, this.efektler.yavas);
      gr.kok.alpha = t.koruma > 0 ? 0.55 + 0.25 * Math.sin(this.zaman * 20) : t.geriCekKalan > 0 ? 0.7 + 0.3 * Math.sin(this.zaman * 30) : gr.kok.alpha < 1 && aktifMi(t) ? 1 : gr.kok.alpha;
      gr.catlakAyarla(t.tik / p.parametreler.burstEsik);
      const kademeGucu = gr.kademeAdi === "yuksek" ? 1 : gr.kademeAdi === "orta" ? 0.6 : 0.25;
      const hiz = kok2(t.vx, t.vz) / p.sim.vSurus;
      const serit = aktifMi(t) && kusakta(t, d.arenaYaricap);
      this.izler[i]!.guncelle(ekran.x, ekran.y, aktifMi(t) ? Math.min(1, hiz * (serit ? 1.6 : 1)) * kademeGucu * (t.dashKalan > 0 ? 1.6 : 1) : 0, serit);
    });
    const daralma = d.mac.aniOlum ? Math.min(1, d.mac.aniOlumTick / MAC_ADIM.aniOlumDaralma) : 0;
    S.arena.guncelle(dt, d.arenaYaricap, d.topaclar.some((t) => aktifMi(t) && kusakta(t, d.arenaYaricap)), d.mac.aniOlum ? Math.max(0.05, daralma) : 0);
    this.yetenekGorsel.guncelle(d, dt, null);
    this.hud!.guncelle(d, dt);
  };
}

export async function baslat(b: EkranBaglami): Promise<void> {
  const { kod, seffaf } = seyirciAyarlari();
  const ag = new IzleAgi();
  const ekran = new SeyirciEkrani(b, ag, seffaf);
  if (!kod) { ag.hata = "yok"; return; }
  try { await ag.baglan(kod); } catch { /* hata metni bekleme kartında */ }
  void ekran;
}
