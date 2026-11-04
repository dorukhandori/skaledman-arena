import { type BotKipi, botGirdisi } from "../../paylasilan/bot/bot.ts";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import type { TakimProfilleri } from "../../paylasilan/sim/Dunya.ts";
import type { Dunya } from "../../paylasilan/sim/durum.ts";
import type { Girdi } from "../../paylasilan/sim/Girdi.ts";
import { kok2 } from "../../paylasilan/sim/fizik.ts";
import { BASLANGIC_SETLERI } from "../../paylasilan/veri/katalog.ts";
import { type TopacProfili, topacProfiliKur } from "../../paylasilan/veri/profil.ts";
import { BASLANGIC_TAKIMLARI, takimKurulumu } from "../../paylasilan/veri/takimlar.ts";
import type { EkranBaglami } from "../main.ts";
import { git } from "../hesap.ts";
import { type MacEkrani, egitimBaslat } from "./Mac.ts";

// "Dene" (D6, US-2.3): Atölye'den seçili topaçla bot karşısında 30 sn Antrenman. Sonuç sayılmaz (sunucuya hiçbir şey
// yazılmaz, Altın/XP yok); maç sunumu aynı (MacEkrani + eğitim kancaları: çevrimdışı paylaşılan sim). Bot mevcut
// kademelerden (pasif hedef / kukla / dolas / kenar). Bot kazanamaz (tur sonunda puan sıfırlanır), ani ölüm yok. Ölçüm: sürüş
// ivmesi (yön tuşuna basıldıktan sonraki 0,5 sn'de, basılan yöndeki hız kazancı / 0,5 → br/sn²), en yüksek hız, kayma
// (tuş bırakıldıktan sonraki 1 sn'de gidilen yol), çarpışma. Uç deseni (çiçek) topacı hiç durdurmadığı için "duruştan"
// ya da "durana kadar" ölçüsü kullanılmaz. Bitince Atölye'ye döner; Atölye taslağı (kaydedilmemiş değişiklik dahil) sessionStorage'da korunur.

const SURE_SN = 30;
const IVME_PENCERE = 30; // adım (0,5 sn)
const KAYMA_PENCERE = 60; // adım (1 sn)

const STIL = `
.dn { position:absolute; inset:0; pointer-events:none; }
.dn .ust { position:absolute; left:304px; top:76px; width:352px; padding:4px 8px; background:rgba(5,13,16,.9); border:2px solid #7fd3ff; border-radius:8px;
  font:700 11px/1.35 system-ui; color:#f3f1e8; text-align:center; }
.dn .ust b { color:#7fd3ff; }
.dn .olc { position:absolute; left:8px; top:160px; width:200px; padding:6px 8px; background:rgba(5,13,16,.88); border:1px solid #24414b; border-radius:6px; font:700 10px/1.45 system-ui; color:#c9d3d6; }
.dn .olc b { color:#f3f1e8; font-variant-numeric:tabular-nums; }
.dn .son { position:absolute; left:230px; top:110px; width:500px; padding:16px 20px; background:#0c191d; border:3px solid #050d10; border-radius:12px;
  box-shadow:0 0 0 2px #7fd3ff, 0 10px 30px rgba(0,0,0,.6); font:600 14px/1.45 system-ui; color:#f3f1e8; pointer-events:auto; display:none; }
.dn .son.acik { display:block; }
.dn .son h3 { margin:0 0 6px; font:900 20px/1.1 system-ui; color:#7fd3ff; }
.dn .son table { width:100%; border-collapse:collapse; margin:6px 0; font-size:13px; }
.dn .son td { padding:3px 4px; border-bottom:1px solid #24414b; } .dn .son td:last-child { text-align:right; font-weight:800; font-variant-numeric:tabular-nums; }
.dn .son .dgd { display:flex; gap:10px; justify-content:center; margin-top:10px; }
.dn .son button { padding:8px 14px; background:#173039; color:#f3f1e8; border:2px solid #050d10; border-radius:8px; font:800 14px system-ui; cursor:pointer; }
.dn .son button.bir { background:#f4cf47; color:#2a2104; }
.dn .son button:focus-visible { outline:3px solid #fff; outline-offset:2px; }
`;

interface DeneSecimi { cekirdek: string; govde: string; disk: string; uc: string; yon: "sag" | "sol"; seviye: number; ad: string }

export interface DeneOlcumu {
  turSn: number;
  enYuksekHiz: number;
  /** sürüş ivmesi ortalaması (br/sn²): basılan yöndeki hız kazancı / 0,5 sn; ölçülmediyse null */
  ivme: number | null;
  ivmeOrnek: number;
  /** tuş bırakılınca 1 sn'de kayma ortalaması (br) */
  kayma: number | null;
  kaymaOrnek: number;
  carpisma: number;
  yol: number;
  staminaYuzde: number;
}

export function baslat(b: EkranBaglami): void {
  let s: DeneSecimi | null = null;
  try { s = JSON.parse(sessionStorage.getItem("devran.dene.v1") ?? "null") as DeneSecimi | null; } catch { s = null; }
  if (!s) { git("atolye"); return; }
  new Dene(b, s);
}

class Dene {
  private mac: MacEkrani;
  private kat!: HTMLElement;
  private olcEl!: HTMLElement;
  private sayacEl!: HTMLElement;
  private son!: HTMLElement;
  private kip: BotKipi;
  private turTick = 0;
  bitti = false;
  readonly olcum: DeneOlcumu = { turSn: 0, enYuksekHiz: 0, ivme: null, ivmeOrnek: 0, kayma: null, kaymaOrnek: 0, carpisma: 0, yol: 0, staminaYuzde: 100 };
  private ivmeBas: { t: number; v: number; ux: number; uz: number } | null = null;
  private kaymaBas: { t: number; x: number; z: number } | null = null;
  private ivmeToplam = 0;
  private kaymaToplam = 0;
  private oncekiGirdi = false;
  private oncekiKonum: { x: number; z: number } | null = null;

  constructor(private b: EkranBaglami, private s: DeneSecimi) {
    const q = new URLSearchParams(location.search);
    const bot = q.get("bot");
    this.kip = bot === "dolas" || bot === "kenar" || bot === "pasif" ? bot : "kukla";
    const st = document.createElement("style");
    st.textContent = STIL;
    document.head.appendChild(st);
    let p: TopacProfili;
    try { p = topacProfiliKur(s.cekirdek, s.govde, s.disk, s.uc, { yon: s.yon }); } catch { git("atolye"); throw new Error("dene: profil"); }
    // takımın diğer iki yuvası: Antrenman'a özgü, seçili Çekirdekten farklı başlangıç setleri (sayılmaz)
    const diger = BASLANGIC_SETLERI.filter((x) => x.cekirdek !== s.cekirdek).slice(0, 2).map((x) => topacProfiliKur(x.cekirdek, x.govde, x.disk, x.uc));
    const ta = [p, diger[0]!, diger[1]!] as unknown as TakimProfilleri;
    const tb = takimKurulumu(BASLANGIC_TAKIMLARI[1]!.id).profiller as unknown as TakimProfilleri;
    this.mac = egitimBaslat(b, {
      takimlar: () => ({ ta, tb, seviye: [Math.max(1, Math.min(3, s.seviye)), 3] }),
      adlar: [b.ben?.girisli ? b.ben.oyuncu.ad : "Sen", `Antrenman botu (${({ kukla: "kukla", dolas: "dolaşan", kenar: "kenara iten", pasif: "hareketsiz" } as Record<string, string>)[this.kip] ?? this.kip})`],
      rakipGirdisi: (d, g) => this.rakipGirdisi(d, g),
      adimSonrasi: (d, g0) => this.adimSonrasi(d, g0),
      atla: () => git("atolye"),
    });
    this.katman();
    (window as unknown as { __dene: Dene }).__dene = this;
  }

  private katman(): void {
    const k = document.createElement("div");
    k.className = "dn";
    this.kat = k;
    this.mac.ustKatman.appendChild(k);
    this.sayacEl = document.createElement("div");
    this.sayacEl.className = "ust";
    this.sayacEl.setAttribute("role", "status");
    k.appendChild(this.sayacEl);
    this.olcEl = document.createElement("div");
    this.olcEl.className = "olc";
    this.olcEl.dataset["olcum"] = "1";
    k.appendChild(this.olcEl);
    this.son = document.createElement("div");
    this.son.className = "son";
    this.son.setAttribute("role", "dialog");
    this.son.setAttribute("aria-label", "Antrenman bitti");
    k.appendChild(this.son);
    this.yaz();
  }

  private rakipGirdisi(d: Dunya, _g: Girdi): Girdi {
    return botGirdisi(d, 1 - this.mac.yerelIndeks, this.kip, 4243);
  }

  private adimSonrasi(d: Dunya, g0: Girdi): void {
    if (this.bitti) return;
    const y = this.mac.yerelIndeks;
    d.mac.saat = 0; // ani ölüm yok
    for (const o of d.olaylar) {
      if (o.tur === "turBitti" && d.takimlar) {
        d.mac.puan = [0, 0]; // bot kazanamaz, maç bitmez (sayılmaz)
        for (const tk of d.takimlar) { tk.elenen = 0; for (const u of tk.uyeler) u.elendi = 0; }
      }
      if (o.tur === "carpisma") this.olcum.carpisma++;
    }
    if (d.mac.faz !== "tur") { this.ivmeBas = null; this.kaymaBas = null; this.oncekiKonum = null; return; }
    this.turTick++;
    const t = d.topaclar[y]!;
    const hiz = kok2(t.vx, t.vz);
    const girdi = g0.yonX !== 0 || g0.yonZ !== 0;
    const O = this.olcum;
    if (hiz > O.enYuksekHiz) O.enYuksekHiz = hiz;
    if (this.oncekiKonum) O.yol += kok2(t.x - this.oncekiKonum.x, t.z - this.oncekiKonum.z);
    this.oncekiKonum = { x: t.x, z: t.z };
    // sürüş ivmesi: tuşa basılınca (yükselen kenar) 0,5 sn içinde basılan yöndeki hız kazancı
    if (girdi && !this.oncekiGirdi) {
      const u = kok2(g0.yonX, g0.yonZ) || 1;
      const ux = g0.yonX / u, uz = g0.yonZ / u;
      this.ivmeBas = { t: this.turTick, v: t.vx * ux + t.vz * uz, ux, uz };
    }
    if (!girdi) this.ivmeBas = null;
    if (this.ivmeBas && this.turTick - this.ivmeBas.t >= IVME_PENCERE) {
      const v = t.vx * this.ivmeBas.ux + t.vz * this.ivmeBas.uz;
      this.ivmeToplam += (v - this.ivmeBas.v) / (IVME_PENCERE * AYAR.dt);
      O.ivmeOrnek++;
      O.ivme = this.ivmeToplam / O.ivmeOrnek;
      this.ivmeBas = null;
    }
    // kayma: tuş bırakılınca (düşen kenar) 1 sn'de gidilen yol
    if (this.oncekiGirdi && !girdi) this.kaymaBas = { t: this.turTick, x: t.x, z: t.z };
    if (girdi) this.kaymaBas = null;
    if (this.kaymaBas && this.turTick - this.kaymaBas.t >= KAYMA_PENCERE) {
      this.kaymaToplam += kok2(t.x - this.kaymaBas.x, t.z - this.kaymaBas.z);
      O.kaymaOrnek++;
      O.kayma = this.kaymaToplam / O.kaymaOrnek;
      this.kaymaBas = null;
    }
    this.oncekiGirdi = girdi;
    O.turSn = this.turTick * AYAR.dt;
    O.staminaYuzde = Math.round((t.stamina / d.profiller[y]!.maxStamina) * 100);
    if (this.turTick % 15 === 0) this.yaz();
    if (O.turSn >= SURE_SN) this.bitir();
  }

  private yaz(): void {
    const O = this.olcum;
    const kalan = Math.max(0, Math.ceil(SURE_SN - O.turSn));
    this.sayacEl.innerHTML = `<b>Dene</b> · ${this.s.ad} · kalan <b>${kalan} sn</b> · sayılmaz, Altın ve tecrübe yok · Esc: Atölye`;
    this.olcEl.innerHTML = `Ölçüm (bu topaç)<br>En yüksek hız: <b>${Math.round(O.enYuksekHiz)}</b> br/sn<br>`
      + `Sürüş ivmesi: <b>${O.ivme === null ? "–" : `${Math.round(O.ivme)} br/sn²`}</b> (${O.ivmeOrnek})<br>`
      + `Bırakınca 1 sn kayma: <b>${O.kayma === null ? "–" : `${Math.round(O.kayma)} br`}</b> (${O.kaymaOrnek})<br>Çarpışma: <b>${O.carpisma}</b> · Stamina: <b>%${O.staminaYuzde}</b>`;
  }

  private bitir(): void {
    this.bitti = true;
    this.yaz();
    this.mac.durdur();
    const O = this.olcum;
    const k = this.son;
    k.innerHTML = `<h3>Antrenman bitti</h3><p>${this.s.ad}: 30 sn. Sonuç sayılmadı, Altın ve tecrübe yok.</p>`;
    const tb = document.createElement("table");
    const satir = (a: string, v: string) => { const tr = tb.insertRow(); tr.insertCell().textContent = a; tr.insertCell().textContent = v; };
    satir("En yüksek hız", `${Math.round(O.enYuksekHiz)} br/sn`);
    satir("Sürüş ivmesi (0,5 sn, ortalama)", O.ivme === null ? "ölçülmedi" : `${Math.round(O.ivme)} br/sn² (${O.ivmeOrnek} ölçüm)`);
    satir("Bırakınca 1 sn kayma (ortalama)", O.kayma === null ? "ölçülmedi" : `${Math.round(O.kayma)} br (${O.kaymaOrnek} ölçüm)`);
    satir("Çarpışma", String(O.carpisma));
    satir("Gidilen yol", `${Math.round(O.yol)} br`);
    satir("Kalan Stamina", `%${O.staminaYuzde}`);
    k.appendChild(tb);
    const dg = document.createElement("div");
    dg.className = "dgd";
    const at = document.createElement("button");
    at.className = "bir";
    at.textContent = "Atölye'ye dön";
    at.dataset["eylem"] = "atolye";
    at.addEventListener("click", () => git("atolye"));
    const tk = document.createElement("button");
    tk.textContent = "Tekrar dene";
    tk.addEventListener("click", () => location.reload());
    dg.append(at, tk);
    k.appendChild(dg);
    k.classList.add("acik");
    k.dataset["bitti"] = "1";
    window.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); git("atolye"); } });
    at.focus();
  }
}
