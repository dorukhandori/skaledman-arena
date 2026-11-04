import { botGirdisi } from "../../paylasilan/bot/bot.ts";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import { EGITIM_ADIMLARI, EGITIM_KAPANIS, type EgitimDurumu, egitimBitti, egitimIlerlet, egitimKur, egitimNabiz } from "../../paylasilan/egitim.ts";
import type { TakimProfilleri } from "../../paylasilan/sim/Dunya.ts";
import type { Dunya } from "../../paylasilan/sim/durum.ts";
import type { Girdi } from "../../paylasilan/sim/Girdi.ts";
import { ENERJI_TAVAN } from "../../paylasilan/sim/enerji.ts";
import { kok2 } from "../../paylasilan/sim/fizik.ts";
import { staminaOrani } from "../../paylasilan/sim/topac.ts";
import { yuvaDurumu } from "../../paylasilan/sim/yetenek.ts";
import type { TopacProfili } from "../../paylasilan/veri/profil.ts";
import { YETENEKLER } from "../../paylasilan/veri/katalog.ts";
import { YETENEK_SIM } from "../../paylasilan/veri/yetenekSablon.ts";
import { BASLANGIC_TAKIMLARI, takimKoduYaz, takimKurulumu } from "../../paylasilan/veri/takimlar.ts";
import type { EkranBaglami } from "../main.ts";
import { MISAFIR_EGITIM, apiPost, git, sakla } from "../hesap.ts";
import { type MacEkrani, egitimBaslat } from "./Mac.ts";
import { kalin } from "./arayuz.ts";

// Antrenman eğitimi (D5, ux § 4.2, tide G-22 / O-1 b: misafire açık, giriş sonda). Maç sunumunun kendisi (MacEkrani)
// çevrimdışı sim + eğitim kancaları: bot "Antrenman Kuklası" (hareketsiz → yavaş; 5. adımda yavaş alan yeteneği),
// stamina erimez (erime 0), bot kazanamaz (puan ve elenme sıfırlanır, oyuncu Stamina'sı %60 altına inmez), maç
// saati durur. Adım eylemle biter, 12 sn'de tuş nabız atar, 25 sn'de kendiliğinden geçer. Öğretilmeyen HUD %40.
// Bitince: girişliyse "İlk Devir" (sunucu yazar) → Market açıldı; misafirse "İlerlemeni kaydetmek için kayıt ol".

const STIL = `
.mh.egitim > * { opacity:.4; transition:opacity .2s; }
.mh.egitim > .vurgu { opacity:1; }
.mh.egitim > .vurgu.nabiz, .eg .kb.nabiz { animation:egNabiz 1s ease-in-out infinite; }
@keyframes egNabiz { 50% { box-shadow:0 0 0 3px #fff6c8, 0 0 14px #f4cf47; transform:scale(1.06); } }
.eg { position:absolute; inset:0; pointer-events:none; }
.eg .serit { position:absolute; left:160px; top:444px; width:640px; height:40px; display:flex; align-items:center; gap:10px; padding:0 10px;
  background:rgba(5,13,16,.92); border:2px solid #f4cf47; border-radius:8px; font:700 13px/1.2 system-ui; color:#f3f1e8; }
.eg .serit b { color:#f4cf47; }
.eg .kb { flex:none; min-width:30px; height:24px; padding:0 6px; display:flex; align-items:center; justify-content:center; background:#173039;
  border:2px solid #a3b2b6; border-bottom-width:4px; border-radius:5px; font:900 11px/1 ui-monospace,monospace; color:#fff; }
.eg .no { flex:none; font:800 10px/1 system-ui; color:#a3b2b6; }
.eg .atla { position:absolute; left:812px; top:448px; width:72px; height:32px; pointer-events:auto; padding:0; background:#173039; color:#f3f1e8;
  border:2px solid #050d10; border-radius:8px; font:800 13px system-ui; cursor:pointer; box-shadow:0 3px 0 #050d10; }
.eg .atla:focus-visible, .eg .kapanis button:focus-visible { outline:3px solid #fff; outline-offset:2px; }
.eg .not { position:absolute; left:8px; top:76px; width:288px; padding:3px 6px; background:rgba(5,13,16,.9); border:1px solid #f4cf47; border-radius:5px; font:700 10px/1.3 system-ui; display:none; }
.eg .not.acik { display:block; }
.eg .ok4 { position:absolute; width:0; height:0; display:none; }
.eg .ok4.acik { display:block; }
.eg .ok4 i { position:absolute; width:0; height:0; border:7px solid transparent; }
.eg .ok4 .u { left:-7px; top:-50px; border-bottom:10px solid #f4cf47; } .eg .ok4 .d { left:-7px; top:36px; border-top:10px solid #f4cf47; }
.eg .ok4 .l { left:-50px; top:-7px; border-right:10px solid #f4cf47; } .eg .ok4 .r { left:36px; top:-7px; border-left:10px solid #f4cf47; }
.eg .kapanis { position:absolute; left:230px; top:130px; width:500px; padding:18px 22px; background:#0c191d; border:3px solid #050d10; border-radius:12px;
  box-shadow:0 0 0 2px #f4cf47, 0 10px 30px rgba(0,0,0,.6); font:600 15px/1.45 system-ui; color:#f3f1e8; pointer-events:auto; text-align:center; display:none; }
.eg .kapanis.acik { display:block; }
.eg .kapanis h3 { margin:0 0 8px; font:900 22px/1.1 system-ui; letter-spacing:1px; color:#f4cf47; }
.eg .kapanis p { margin:6px 0; }
.eg .kapanis .dg { display:flex; gap:10px; justify-content:center; margin-top:12px; }
.eg .kapanis button { padding:8px 14px; background:#173039; color:#f3f1e8; border:2px solid #050d10; border-radius:8px; font:800 14px system-ui; cursor:pointer; }
.eg .kapanis button.bir { background:#f4cf47; color:#2a2104; }
`;

function erimesiz(p: TopacProfili): TopacProfili {
  return { ...p, sim: { ...p.sim, erime: 0 } };
}

/** Antrenman Kuklası hafif: kenardan kolay düşer (VARSAYIM: Ring Out eşiği ×0,35 (en çok 70), etkin kütle ×0,6; 6. adım öğretilebilsin). */
function kukla(p: TopacProfili): TopacProfili {
  const e = erimesiz(p);
  return { ...e, sim: { ...e.sim, ringOutHizi: Math.min(70, e.sim.ringOutHizi * 0.35), etkinKutle: e.sim.etkinKutle * 0.6 } };
}

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif: string, ust: HTMLElement, metin = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  e.className = sinif;
  if (metin) e.textContent = metin;
  ust.appendChild(e);
  return e;
}

export function baslat(b: EkranBaglami): void {
  new AntrenmanEgitimi(b);
}

class AntrenmanEgitimi {
  readonly durum: EgitimDurumu = egitimKur();
  private mac: MacEkrani;
  private kat!: HTMLElement;
  private serit!: HTMLElement;
  private not!: HTMLElement;
  private ok4!: HTMLElement;
  private kapanis!: HTMLElement;
  private gosterilen = -1;
  private nabizGosterilen = false;
  private sonYetenekDenemesi = -999;
  private girisli: boolean;
  /** test / ekran görüntüsü: son kapanış sonucu */
  sonuc: "" | "ilkDevir" | "misafir" | "atlandi" = "";

  constructor(private b: EkranBaglami) {
    this.girisli = b.ben?.girisli === true;
    const st = document.createElement("style");
    st.textContent = STIL;
    document.head.appendChild(st);
    // oyuncu: kayıtlı takımı (ilk Çekirdeği + ödünç), misafirse Göktaşı başlangıç takımı (Lv.2)
    const ben = b.ben;
    const kod = ben?.girisli && ben.takimlar[0] ? takimKoduYaz(ben.takimlar[0].uyeler) : BASLANGIC_TAKIMLARI[0]!.id;
    const oyuncu = takimKurulumu(kod);
    const seviye0 = oyuncu.seviyeler?.[0] ?? 2;
    const kuklaTakimi = takimKurulumu(BASLANGIC_TAKIMLARI[0]!.id);
    const ta = oyuncu.profiller.map(erimesiz) as unknown as TakimProfilleri;
    const tb = kuklaTakimi.profiller.map(kukla) as unknown as TakimProfilleri;
    this.mac = egitimBaslat(b, {
      takimlar: () => ({ ta, tb, seviye: [Math.max(2, seviye0), 3] }),
      adlar: [ben?.girisli ? ben.oyuncu.ad : "Misafir", "Antrenman Kuklası"],
      rakipGirdisi: (d, g) => this.rakipGirdisi(d, g),
      adimSonrasi: (d, g0) => this.adimSonrasi(d, g0),
      atla: () => this.atla(),
    });
    this.katmanKur();
    (window as unknown as { __egitim: AntrenmanEgitimi }).__egitim = this;
    requestAnimationFrame(this.kare);
  }

  get adim(): number { return this.durum.adim; }
  get bitti(): boolean { return egitimBitti(this.durum); }

  private katmanKur(): void {
    const ust = this.mac.ustKatman;
    this.kat = el("div", "eg", ust);
    this.serit = el("div", "serit", this.kat);
    this.serit.setAttribute("role", "status");
    this.serit.setAttribute("aria-live", "polite");
    this.serit.dataset["egitimSerit"] = "1";
    this.not = el("div", "not", this.kat);
    this.ok4 = el("div", "ok4", this.kat);
    for (const k of ["u", "d", "l", "r"]) el("i", k, this.ok4);
    const atla = el("button", "atla", this.kat, "Atla");
    atla.dataset["eylem"] = "atla";
    atla.setAttribute("aria-label", "Eğitimi atla");
    atla.addEventListener("click", () => this.atla());
    this.kapanis = el("div", "kapanis", this.kat);
    this.kapanis.setAttribute("role", "dialog");
    this.kapanis.setAttribute("aria-label", "Antrenman bitti");
    this.mac.hudKok.classList.add("egitim");
  }

  // ---- eğitim kuralları ----
  private rakipGirdisi(d: Dunya, _g: Girdi): Girdi {
    const r = 1 - this.mac.yerelIndeks;
    const ben = d.topaclar[this.mac.yerelIndeks]!;
    // Antrenman Kuklası: 1-2. adımda hareketsiz, sonra yavaş (paylaşılan "kukla" kipi)
    let g = botGirdisi(d, r, "kukla", 4242);
    if (this.durum.adim <= 1) g = { ...g, yonX: 0, yonZ: 0, dash: false, atesle: false };
    const t = d.topaclar[r]!;
    if (this.durum.adim === 5) {
      // 6. adım: kukla çanak kenarına yakın yavaş döner (Ring Out öğretimi)
      const R = d.arenaYaricap * 0.8;
      const m = kok2(t.x, t.z) || 1;
      const hx = (t.x / m) * R - (t.z / m) * 40 - t.x;
      const hz = (t.z / m) * R + (t.x / m) * 40 - t.z;
      const u = kok2(hx, hz) || 1;
      g = { ...g, yonX: (hx / u) * 0.35, yonZ: (hz / u) * 0.35, atesle: false };
    }
    if (this.durum.adim === 4 && d.mac.faz === "tur" && d.tick - this.sonYetenekDenemesi > 180 && yuvaDurumu(d, r, 1) === null) {
      // 5. adım: yavaş alan yeteneği (Özel Yetenek, telegraflı) oyuncunun üstüne
      this.sonYetenekDenemesi = d.tick;
      g = { ...g, yonX: 0, yonZ: 0, secilenYuva: 1, atesle: true, nisanX: ben.x, nisanZ: ben.z };
    }
    return g;
  }

  private adimSonrasi(d: Dunya, g0: Girdi): void {
    const y = this.mac.yerelIndeks;
    const r = 1 - y;
    d.mac.saat = 0; // maç saati durur (ani ölüm yok)
    for (const o of d.olaylar) {
      if (o.tur === "turBitti" && d.takimlar) {
        // bot kazanamaz, maç bitmez: puan ve elenmeler sıfırlanır
        d.mac.puan = [0, 0];
        for (const tk of d.takimlar) { tk.elenen = 0; for (const u of tk.uyeler) u.elendi = 0; }
      }
    }
    const ben = d.topaclar[y]!;
    if (staminaOrani(ben, d.profiller[y]!) < 0.6) ben.stamina = d.profiller[y]!.maxStamina;
    const rk = d.topaclar[r]!;
    if (this.durum.adim < 5 && staminaOrani(rk, d.profiller[r]!) < 0.35) rk.stamina = d.profiller[r]!.maxStamina;
    if (this.durum.adim === 3) ben.enerji = ENERJI_TAVAN; // Yetenek adımı: Enerji dolu
    if (this.durum.adim === 4) rk.enerji = ENERJI_TAVAN;
    // 6. adım: önceki adımın alan/engel kalıntısı (ör. Yontu Siperi kayası) itmeyi kapatmasın
    if (this.durum.adim === 5 && d.engeller.length) d.engeller.length = 0;
    if (egitimBitti(this.durum)) return;
    const tur = d.mac.faz === "tur";
    const no = d.profiller[y]!.yetenekler[0];
    const yt = no !== undefined && no >= 0 ? YETENEKLER.find((x) => x.id === YETENEK_SIM[no]?.id) : undefined;
    const gecis = egitimIlerlet(this.durum, {
      dt: tur ? AYAR.dt : 0, hareket: tur && (g0.yonX !== 0 || g0.yonZ !== 0), olaylar: d.olaylar, yerel: y,
      vurussuzYetenek: !!yt && yt.tur !== "hucum",
    });
    if (gecis && egitimBitti(this.durum)) this.bitir();
  }

  // ---- arayüz ----
  private kare = (): void => {
    if (!this.kat.isConnected) return;
    const a = this.durum.adim;
    if (a !== this.gosterilen && a < EGITIM_ADIMLARI.length) this.adimGoster(a);
    const nabiz = egitimNabiz(this.durum);
    if (nabiz !== this.nabizGosterilen) {
      this.nabizGosterilen = nabiz;
      this.serit.querySelector(".kb")?.classList.toggle("nabiz", nabiz);
      for (const v of this.mac.hudKok.querySelectorAll(".vurgu")) v.classList.toggle("nabiz", nabiz);
    }
    if (this.ok4.classList.contains("acik")) {
      const t = this.mac.durum.topaclar[this.mac.yerelIndeks]!;
      this.ok4.style.left = `${480 + t.x}px`;
      this.ok4.style.top = `${270 + t.z}px`;
    }
    requestAnimationFrame(this.kare);
  };

  private adimGoster(a: number): void {
    this.gosterilen = a;
    const t = EGITIM_ADIMLARI[a]!;
    this.serit.innerHTML = `<span class="no">${a + 1}/6</span><span class="kb">${t.tus}</span><span>${kalin(t.metin)}</span>`;
    this.serit.dataset["adim"] = String(a + 1);
    this.nabizGosterilen = false;
    const hud = this.mac.hudKok;
    for (const v of hud.querySelectorAll(".vurgu")) v.classList.remove("vurgu", "nabiz");
    const yv = hud.querySelectorAll<HTMLElement>(":scope > .yv");
    const hedefler: (Element | null | undefined)[] = [];
    if (t.vurgu === "stamina") hedefler.push(hud.querySelector(this.mac.yerelIndeks === 0 ? ":scope > .pn.sol" : ":scope > .pn.sag"));
    if (t.vurgu === "dash") hedefler.push(yv[4]);
    if (t.vurgu === "yuva1") hedefler.push(yv[0]);
    if (t.vurgu === "telegraf") hedefler.push(yv[5]);
    for (const h of hedefler) h?.classList.add("vurgu");
    this.not.textContent = t.not ?? "";
    this.not.classList.toggle("acik", !!t.not);
    this.ok4.classList.toggle("acik", t.vurgu === "oklar");
  }

  private bitir(): void {
    this.serit.style.display = "none";
    this.ok4.classList.remove("acik");
    this.not.classList.remove("acik");
    this.mac.hudKok.classList.remove("egitim");
    const k = this.kapanis;
    k.innerHTML = `<h3>Antrenman bitti</h3><p>${kalin(EGITIM_KAPANIS[0])}</p>`;
    k.classList.add("acik");
    k.dataset["kapanis"] = "1";
    window.setTimeout(() => void this.sonuc_(), 3000);
  }

  private async sonuc_(): Promise<void> {
    const k = this.kapanis;
    const dg = document.createElement("div");
    dg.className = "dg";
    if (this.girisli) {
      let yazildi = false;
      try { yazildi = (await apiPost("/api/egitim-bitti")).durum === 200; } catch { /* bakım: Atölye'de tekrar */ }
      const p = el("p", "", k);
      p.innerHTML = yazildi ? kalin(EGITIM_KAPANIS[1]) : "Başarım kaydedilemedi. Bağlantını kontrol et.";
      this.sonuc = yazildi ? "ilkDevir" : "";
      const d = el("button", "bir", dg, "Atölye");
      d.dataset["eylem"] = "atolye";
      d.addEventListener("click", () => git("atolye", yazildi ? "&mesaj=ilkdevir" : ""));
      k.appendChild(dg);
      d.focus();
    } else {
      sakla(MISAFIR_EGITIM, "1");
      this.sonuc = "misafir";
      el("p", "", k, "İlerlemeni kaydetmek için kayıt ol.");
      const d = el("button", "bir", dg, "Kayıt ol");
      d.dataset["eylem"] = "kayit";
      d.addEventListener("click", () => git("kayit"));
      const g = el("button", "", dg, "Giriş yap");
      g.addEventListener("click", () => git("giris"));
      k.appendChild(dg);
      d.focus();
    }
    window.addEventListener("keydown", (e) => { if (e.key === "Enter") (k.querySelector("button.bir") as HTMLButtonElement | null)?.click(); });
  }

  private atla(): void {
    this.sonuc = "atlandi";
    // atlanan eğitim İlk Devir vermez (nile B-23: Market İlk Devir ile açılır, bilerek)
    git(this.girisli ? "atolye" : "karsilama");
  }
}
