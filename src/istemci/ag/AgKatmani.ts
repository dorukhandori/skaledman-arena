import { ODA_FAZI } from "../../ag/protokol.ts";
import type { Dunya } from "../../paylasilan/sim/durum.ts";
import type { MacHud } from "../oyun/MacHud.ts";
import type { AgMaci } from "./AgMaci.ts";

// Çevrimiçi maç üst katmanı (DOM, 960×540 mantıksal; Mac ekranının `.ms` kökünde):
// H10 bağlantı rozeti (yalnız > 150 ms ya da kayıp belirtisi, ux § 2), kopma bantları (flint #10, ux § 7),
// sekme gizli / dönüş (ux § 1.4, B-26), AFK uyarısı, ?debug hash satırı.

const STIL = `
.agk { position:absolute; inset:0; pointer-events:none; font-family:"Nunito Sans",system-ui,sans-serif; }
.agk .h10 { position:absolute; left:456px; top:68px; width:48px; height:14px; display:none; align-items:center; gap:3px; justify-content:center;
  background:rgba(5,13,16,.85); border:1px solid #e3a33d; border-radius:4px; color:#f3d39a; font:800 9px/1 system-ui; }
.agk .h10.acik { display:flex; }
.agk .h10 svg { flex:none; }
.agk .bant { position:absolute; left:230px; width:500px; top:150px; padding:10px 14px; text-align:center; display:none;
  background:rgba(5,13,16,.92); border:2px solid #24414b; border-radius:10px; color:#f3f1e8; font:800 17px/1.3 system-ui; }
.agk .bant.acik { display:block; }
.agk .bant small { display:block; margin-top:4px; font:600 12px/1.3 system-ui; color:#a3b2b6; }
.agk .bant .dg { display:flex; gap:10px; justify-content:center; margin-top:10px; pointer-events:auto; }
.agk .bant button { padding:7px 14px; background:#173039; color:#f3f1e8; border:2px solid #050d10; border-radius:8px; font:800 13px/1.2 system-ui; cursor:pointer; }
.agk .bant button.bir { background:#f4cf47; color:#2a2104; }
.agk .dbg { position:absolute; left:6px; bottom:4px; font:600 9px/1.2 ui-monospace,monospace; color:#7fe3a0; background:rgba(0,0,0,.55); padding:2px 4px; border-radius:3px; }
`;

/** ux § 7: "Yeniden bağlanıyoruz… N" (15 sn geri sayım), sonra "Bağlanamadık". */
const KOPMA_GERI_SAYIM_SN = 15;

const SINYAL = `<svg viewBox="0 0 12 10" width="12" height="10" aria-hidden="true"><rect x="0" y="7" width="2.5" height="3" fill="currentColor"/><rect x="4" y="4" width="2.5" height="6" fill="currentColor"/><rect x="8" y="1" width="2.5" height="9" fill="currentColor" opacity=".35"/></svg>`;

export class AgKatmani {
  private kok = document.createElement("div");
  private h10 = document.createElement("div");
  private bant = document.createElement("div");
  private dbg: HTMLElement | null = null;
  private stil = document.createElement("style");
  private kopmaBas = -1;
  private donusBandi = 0;
  private afkBitis = -1;
  private sonBilgi = 0;
  private kalici = false;
  private gizli = false;
  /** debug / test: son gösterilen bant metni */
  bantMetni = "";

  constructor(ust: HTMLElement, private ag: AgMaci, private hud: () => MacHud) {
    this.stil.textContent = STIL;
    document.head.appendChild(this.stil);
    this.kok.className = "agk";
    this.h10.className = "h10";
    this.h10.setAttribute("role", "status");
    this.bant.className = "bant";
    this.bant.setAttribute("aria-live", "polite");
    this.kok.append(this.h10, this.bant);
    if (new URLSearchParams(location.search).has("debug")) {
      this.dbg = document.createElement("div");
      this.dbg.className = "dbg";
      this.kok.appendChild(this.dbg);
    }
    ust.appendChild(this.kok);
    document.addEventListener("visibilitychange", this.gorunurluk);
    ag.oda.onDrop(() => { this.kopmaBas = performance.now(); });
    ag.oda.onReconnect(() => { this.kopmaBas = -1; this.kalici = false; this.hud().bantGoster("Yeniden bağlandın.", 1.2); });
    ag.oda.onLeave((kod) => { if (kod !== 1000 && kod !== 4000 && ag.faz !== ODA_FAZI.kapandi) this.kalici = true; });
  }

  private gorunurluk = (): void => {
    if (document.hidden) { this.gizli = true; return; }
    if (!this.gizli) return;
    this.gizli = false;
    this.ag.yetis();
    this.donusBandi = performance.now() + 1000;
  };

  private bantYaz(metin: string, alt = "", dugmeler = false): void {
    const anahtar = `${metin}|${alt}|${dugmeler}`;
    if (this.bantMetni === anahtar) return;
    this.bantMetni = anahtar;
    if (!metin) { this.bant.classList.remove("acik"); this.bant.innerHTML = ""; return; }
    this.bant.innerHTML = "";
    this.bant.append(metin);
    if (alt) { const s = document.createElement("small"); s.textContent = alt; this.bant.appendChild(s); }
    if (dugmeler) {
      const dg = document.createElement("div");
      dg.className = "dg";
      const tekrar = document.createElement("button");
      tekrar.className = "bir";
      tekrar.textContent = "Tekrar dene";
      tekrar.addEventListener("click", () => { location.reload(); });
      const atolye = document.createElement("button");
      atolye.textContent = "Atölye";
      atolye.dataset["eylem"] = "atolye";
      atolye.addEventListener("click", () => { location.search = "?ekran=atolye"; });
      dg.append(tekrar, atolye);
      this.bant.appendChild(dg);
    }
    this.bant.classList.add("acik");
  }

  guncelle(_dt: number, d: Dunya, yerel: number): void {
    const ag = this.ag;
    const simdi = performance.now();
    // bilgi mesajları
    for (; this.sonBilgi < ag.bilgiler.length; this.sonBilgi++) {
      const b = ag.bilgiler[this.sonBilgi]!;
      if (b.tur === "afkUyari") this.afkBitis = simdi + b.kalanSn * 1000;
      if (b.tur === "kapandi" && b.neden === "rakipAyrildi") this.hud().bantGoster("Rakip odadan ayrıldı.", 3);
    }
    const s = ag.durum;
    const rakip = 1 - yerel;
    const r = ag.baglantiRozeti();
    // sonuç ekranında rozet başlığın üstüne binmesin
    this.h10.classList.toggle("acik", r.goster && ag.bagli && s?.faz === ODA_FAZI.mac);
    if (r.goster) this.h10.innerHTML = `${SINYAL}${r.kayip && r.ms <= 150 ? "kayıp" : `${r.ms} ms`}`;
    // D4 notu düzeltmesi: SDK 30 denemeyi bitirmeyi beklemeden, 15 sn geri sayım bitince (ux § 7) kalıcı bant;
    // SDK arka planda denemeyi sürdürür, dönerse bant kalkar (onReconnect).
    if (!this.kalici && !ag.bagli && this.kopmaBas >= 0 && simdi - this.kopmaBas >= KOPMA_GERI_SAYIM_SN * 1000) this.kalici = true;
    if (this.kalici) this.bantYaz("Bağlanamadık. Sorun sunucudaysa bu maç sayılmaz.", "", true);
    else if (!ag.bagli && this.kopmaBas >= 0) {
      const n = Math.max(0, KOPMA_GERI_SAYIM_SN - Math.floor((simdi - this.kopmaBas) / 1000));
      this.bantYaz(`Bağlantı koptu. Yeniden bağlanıyoruz… ${n}`);
    } else if (s && s.faz === ODA_FAZI.mac && s.kopan === rakip) {
      this.bantYaz(s.donma ? `Rakip bağlanıyor… ${s.donmaKalan}` : "Rakibin bağlantısı koptu.", s.donma ? "Maç donduruldu. 20 sn içinde dönmezse galibiyet sende." : "");
    } else if (s && s.faz === ODA_FAZI.mac && s.donma && s.kopan === yerel) {
      this.bantYaz("Maç donduruldu.", "Bağlantın geri geldi; rakip bekleniyor.");
    } else if (this.gizli) this.bantYaz("Duraklatıldı");
    else if (simdi < this.donusBandi) this.bantYaz("Oyuna dönüldü.");
    else if (simdi < this.afkBitis && s?.faz === ODA_FAZI.mac) this.bantYaz(`Girdi yok: ${Math.ceil((this.afkBitis - simdi) / 1000)} sn içinde terk sayılır.`);
    else this.bantYaz("");
    if (this.dbg) {
      const o = ag.olcum;
      const u = o.uzlasma;
      const tp = o.tepkiMs.length ? Math.round(o.tepkiMs.reduce((a, b) => a + b, 0) / o.tepkiMs.length) : 0;
      this.dbg.textContent = `hash ${o.hashKarsilastirma - o.hashSapma}/${o.hashKarsilastirma} sapma ${o.hashSapma} · t${d.tick} · rtt ${r.ms} · uzl ${u.yokSay}/${u.yumusak}/${u.darbeYumusak}/${u.sicrama} · çarp ${o.carpismalar} tepki ${tp} ms · sunucu ${o.sunucuHashSon}`;
    }
  }
}
