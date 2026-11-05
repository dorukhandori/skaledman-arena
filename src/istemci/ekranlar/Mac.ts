import { Graphics } from "pixi.js";
import { botGirdisi, botKademesiSec, type BotKipi } from "../../paylasilan/bot/bot.ts";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import { adim, macDunyasiKur, type TakimProfilleri } from "../../paylasilan/sim/Dunya.ts";
import { TOPAC_DURUM, type Dunya, type MacSonucu, type Olay, type TurSonucu } from "../../paylasilan/sim/durum.ts";
import { kok2, kusakta } from "../../paylasilan/sim/fizik.ts";
import type { Girdi } from "../../paylasilan/sim/Girdi.ts";
import { MAC_ADIM, geriCekAcik, siradakiUye, teslimEt } from "../../paylasilan/sim/mac.ts";
import { type BilgiMesaji, MESAJ, ODA_FAZI } from "../../ag/protokol.ts";
import { YIGIN_SVG } from "./referansStil.ts";
import type { Girisli } from "../hesap.ts";
import { aktifMi, staminaOrani } from "../../paylasilan/sim/topac.ts";
import type { EkranBaglami } from "../main.ts";
import { Efektler } from "../oyun/Efektler.ts";
import { OyuncuGirdisi } from "../oyun/Girdi.ts";
import { Iz } from "../oyun/Iz.ts";
import { kenarUyarisiCiz } from "../oyun/KenarUyari.ts";
import { MacHud } from "../oyun/MacHud.ts";
import { ELEMENT_RENK } from "../oyun/renkler.ts";
import { Sahne } from "../oyun/Sahne.ts";
import { takimProfilleri, takimlariOku } from "../oyun/takimlar.ts";
import type { TopacCizimi } from "../oyun/cizimTurleri.ts";
import { AYAR_SECENEKLERI, type OyunAyarlari, ayarlariOku, kameraKipi, ayarlariYaz, hisAyari, sekmeIpucuGoster, sekmeIpucuMacBitti } from "../oyun/Ayarlar.ts";
import { YetenekGorsel } from "../oyun/YetenekGorsel.ts";
import { Ses } from "../ses/Ses.ts";
import { ENERJI_TAVAN } from "../../paylasilan/sim/enerji.ts";
import { YETENEK_SIM } from "../../paylasilan/veri/yetenekSablon.ts";
import type { AgMaci } from "../ag/AgMaci.ts";
import { AgKatmani } from "../ag/AgKatmani.ts";

// Bota karşı tam maç (D2, çevrimdışı): geri sayım → tur → tur arası (H14 seçimi) → … → bitti → sonuç ekranı.
// Sim paylaşılan kod (mac.ts, adim.ts), bot paylaşılan kod (bot.ts); bu dosya yalnız sunum ve girdi.
// URL: ?ekran=mac&tohum=7&takim=0..2&rakip=0..2&bot=dolas|kenar|dayaniklilik|kukla|tip&oto=<kip>&hiz=1..8&seviye=2|3&debug
// D3: yetenekler (1-3 / sol-sağ tık: basılı tut = nişan, bırak = at; Esc ya da alt şeritte bırakma = iptal), telegraf,
// alan dekalleri, Ulti anı, ses (M), Esc › Ayarlar (ux § 6.2).
//   oto: yerel topacı paylaşılan bot sürer (otomatik oynanış; H14 seçimi yine klavyeden, yoksa süre dolunca).

const YEREL = 0;
const RAKIP = 1;
/** Çevrimiçi kare başına en çok girdi adımı (250 ms'lik kare = 15 adım; daha uzun donma tahmini atar). */
const AG_ADIM_TAVANI = 15;
/** Son bitişten sonra sonuç ekranına geçiş (ux § 3.4: 1,5 sn). */
const SONUC_GECIKMESI = 1.5;

const STIL = `
.ms { position:absolute; left:0; top:0; width:960px; height:540px; transform-origin:0 0; pointer-events:none; font-family:"Nunito Sans",system-ui,sans-serif; color:#f3f1e8; }
.ms .ort { position:absolute; inset:0; background:radial-gradient(ellipse at 50% 20%, rgba(40,30,10,.94), rgba(3,3,8,.97) 60%); display:none; pointer-events:auto; overflow:hidden; }
.ms .ort.acik { display:block; }
.ms .kutu { position:absolute; left:150px; top:14px; width:660px; height:512px; }
.ms .pah { clip-path:polygon(5px 0,calc(100% - 5px) 0,100% 5px,100% calc(100% - 5px),calc(100% - 5px) 100%,5px 100%,0 calc(100% - 5px),0 5px); }
.ms .rpanel { position:relative; background:#1b2131; box-shadow:inset 0 0 0 2px #a99e92, inset 0 0 0 3px #07080f, inset 0 0 0 5px #252b40; }
.ms .plaka { position:relative; z-index:2; width:330px; margin:0 auto; height:52px; display:flex; align-items:center; justify-content:center; gap:10px;
  background:#1b2131; box-shadow:inset 0 0 0 3px #e0a23a, inset 0 0 0 4px #07080f, inset 0 0 0 6px #6b4a12; }
.ms .plaka.yenilgi { box-shadow:inset 0 0 0 3px #8a90a2, inset 0 0 0 4px #07080f, inset 0 0 0 6px #3a3e4a; }
.ms .plaka.berabere { box-shadow:inset 0 0 0 3px #7fb6e0, inset 0 0 0 4px #07080f, inset 0 0 0 6px #23405a; }
.ms .kanat { position:absolute; top:-6px; z-index:1; }
.ms .kanat.sol { left:110px; } .ms .kanat.sag { right:110px; transform:scaleX(-1); }
.ms h2 { margin:0; display:flex; align-items:center; justify-content:center; gap:10px; font:900 34px/1 "Trebuchet MS",system-ui; letter-spacing:4px; text-shadow:0 3px 0 #000; }
.ms h2.zafer { color:#fcd35a; } .ms h2.yenilgi { color:#c9d3d6; } .ms h2.berabere { color:#a3d8ff; }
.ms .alt { text-align:center; margin:4px 0 0; font-size:13px; color:#e8d9b0; min-height:16px; }
.ms .skr { display:inline-block; margin-right:8px; font:900 18px/1 system-ui; letter-spacing:2px; color:#fff; }
.ms .ndn { text-align:center; font-size:11px; color:#b8bdd0; margin:2px 0 6px; }
.ms .tablo { padding:6px 12px 6px; }
.ms table { width:100%; border-collapse:separate; border-spacing:0 2px; font-size:12px; }
.ms th { text-align:left; font:900 11px/1 "Trebuchet MS",system-ui; letter-spacing:2px; color:#fcd35a; background:#262d47; padding:5px 8px; text-transform:uppercase; }
.ms td { padding:2px 8px; background:#232a40; color:#fff; font-weight:800; } .ms td:last-child, .ms th:last-child { text-align:right; width:64px; }
.ms td .bk { display:inline-flex; vertical-align:middle; margin-right:6px; }
.ms td small { color:#9aa0b2; font-weight:600; margin-left:6px; }
.ms .tablo .yk { margin-top:3px; font-size:10px; color:#9aa0b2; text-align:right; }
.ms .satir { opacity:0; transition:opacity .2s; } .ms .satir.gor { opacity:1; }
.ms .oduller { display:grid; grid-template-columns:170px 150px 1fr; gap:10px; margin-top:6px; padding:8px 12px; min-height:150px; }
.ms .oduller .yt { color:#727a90; font-size:10px; }
.ms .ac { display:flex; flex-direction:column; align-items:center; text-align:center; gap:2px; }
.ms .ac b.bas { font:900 13px/1 "Trebuchet MS",system-ui; letter-spacing:2px; color:#fcd35a; text-transform:uppercase; }
.ms .ac .say { font:900 30px/1 ui-monospace,monospace; color:#fcd35a; text-shadow:0 2px 0 #000; font-variant-numeric:tabular-nums; }
.ms .ac ul { margin:2px 0 0; padding:0; list-style:none; font-size:10px; color:#e8d9b0; text-align:left; width:100%; }
.ms .ac ul li { display:flex; justify-content:space-between; gap:4px; } .ms .ac ul li.c { color:#ffb070; }
.ms .ck0 { padding:6px 6px; background:#14182a; box-shadow:inset 0 0 0 2px #e0a23a, inset 0 0 0 3px #07080f; }
.ms .bsr { display:flex; flex-direction:column; gap:4px; }
.ms .bsk { display:grid; grid-template-columns:30px 1fr; gap:1px 8px; align-items:center; padding:3px 8px; background:#14182a;
  box-shadow:inset 0 0 0 2px #c08e52, inset 0 0 0 3px #07080f; font-size:11px; }
.ms .bsk.tamam { box-shadow:inset 0 0 0 2px #fcd35a, inset 0 0 0 3px #07080f; background:#2a1814; }
.ms .bsk .ad { font:900 11px/1.1 "Trebuchet MS",system-ui; letter-spacing:1px; color:#fff; text-transform:uppercase; }
.ms .bsk .ad em { font-style:normal; color:#fcd35a; margin-right:4px; }
.ms .bsk .cb { grid-column:2; height:7px; background:#0b0d16; box-shadow:inset 0 0 0 1px #000; overflow:hidden; }
.ms .bsk .cb i { display:block; height:100%; background:linear-gradient(90deg,#f2622f,#e8762f); }
.ms .bsk .acl { grid-column:1 / -1; color:#ffb070; font-weight:900; display:flex; align-items:center; justify-content:space-between; gap:6px; }
.ms .bsk .acl button { flex:none; padding:3px 8px; font-size:10px; }
.ms .dg { position:absolute; left:110px; right:110px; bottom:6px; display:flex; gap:28px; }
.ms button { flex:1; padding:9px 10px; background:#292d39; color:#fbf2c3; border:none; font:900 16px/1.2 "Trebuchet MS",system-ui; letter-spacing:2px; text-transform:uppercase; cursor:pointer;
  box-shadow:inset 0 0 0 2px #c08e52, inset 0 0 0 3px #07080f; pointer-events:auto; }
.ms button.bir { background:linear-gradient(#3a3f58,#262b40); box-shadow:inset 0 0 0 2px #fcd35a, inset 0 0 0 3px #07080f; }
.ms button:disabled { opacity:.5; }
.ms button:focus-visible { outline:3px solid #fff; outline-offset:2px; box-shadow:0 0 0 6px #050d10; }
.ms .ipc { position:absolute; right:14px; top:70px; text-align:right; font-size:10px; color:#727a90; }
.ms .konfeti { position:absolute; inset:0; pointer-events:none; overflow:hidden; }
.ms .konfeti i { position:absolute; top:-10px; width:5px; height:5px; animation:dusus linear forwards; }
@keyframes dusus { to { transform:translateY(560px) rotate(360deg); opacity:.2; } }
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
.ms .ck { display:flex; flex-wrap:wrap; align-items:center; gap:3px; justify-content:center; margin-bottom:3px; font-size:11px; }
.ms .ck .ckad { width:100%; text-align:center; font-weight:900; }
.ms .ck .xpb { display:block; width:100%; height:6px; background:#0b0d16; box-shadow:inset 0 0 0 1px #000; overflow:hidden; }
.ms .ck .xpb i { display:block; height:100%; background:#7fd3ff; }
.ms .ck small { width:100%; text-align:center; color:#b8bdd0; font-size:10px; }
.ms .ck em { width:100%; text-align:center; font-style:normal; color:#fcd35a; font-weight:800; font-size:10px; }
.ms .hlk { display:inline-flex; gap:2px; } .ms .hl { width:8px; height:8px; border-radius:50%; border:1px solid #7fd3ff; }
.ms .hl.on { background:#7fd3ff; } .ms .hl.yeni { background:#f4cf47; border-color:#f4cf47; box-shadow:0 0 6px #f4cf47; }
`;

const BITIS_AD = { durma: "DURMA", ringOut: "RING OUT", parcalanma: "PARÇALANMA", berabere: "BERABERE" } as const;
/** Bitiş ikonları (görsel 09 tablo satırı; SVG yer tutucu): Durma yatık topaç · Ring Out dışa ok · Parçalanma kırık · Berabere eşit. */
const BITIS_IKON: Record<keyof typeof BITIS_AD, string> = {
  durma: `<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><ellipse cx="8" cy="12" rx="6" ry="1.6" fill="#000" opacity=".4"/><path d="M2.5 9.5 12 6.5l1.5 2.5-9.5 3Z" fill="#c08e52" stroke="#1a0f08"/><path d="M12.8 7.6 15 6.8" stroke="#e8d9b0" stroke-width="1.4"/></svg>`,
  ringOut: `<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d="M2 13V3h6" fill="none" stroke="#9aa0b2" stroke-width="1.6"/><path d="M6 9 13 3M9.5 3H13v3.5" fill="none" stroke="#e8762f" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  parcalanma: `<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d="M3 6 7 3 8 7 5 9Z M9 3 13 6 11 9 8.5 7Z M4 10 7.5 9 8 13 5 13Z M9 9 12 10 11 13 8.5 13Z" fill="#e8452c" stroke="#1a0f08" stroke-width=".8"/></svg>`,
  berabere: `<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><rect x="3" y="5" width="10" height="2" fill="#a3d8ff"/><rect x="3" y="9" width="10" height="2" fill="#a3d8ff"/></svg>`,
};
const YILDIZ = `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17l-6 3.3 1.3-6.7-5-4.6 6.8-.8Z" fill="#fcd35a" stroke="#4a3208" stroke-width="1.5"/></svg>`;
/** Altın kanat (görsel 09 plaka süsü; avatar değil, IP riski yok: tasarım dili § 7.10). */
const KANAT_SVG = `<svg viewBox="0 0 120 60" width="120" height="60" aria-hidden="true"><path d="M118 40 C90 38 60 30 40 10 C46 24 30 26 14 18 C22 30 12 34 2 32 C18 46 60 54 118 50Z" fill="#e0a23a" stroke="#4a3208" stroke-width="2"/><path d="M110 44 C80 42 56 36 38 22 M100 47 C70 46 40 40 18 30" fill="none" stroke="#fcd35a" stroke-width="2"/></svg>`;
const BASARIM_IKON = `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><path d="M16 2 28 9v14L16 30 4 23V9Z" fill="#1a0f08" stroke="#c08e52" stroke-width="2"/><path d="M16 6 24 10.5v10L16 26 8 20.5v-10Z" fill="#7c3d1c"/><path d="M16 9l2 4.3 4.6.5-3.4 3.1.9 4.6L16 19.2l-4.1 2.3.9-4.6-3.4-3.1 4.6-.5Z" fill="#fcd35a"/></svg>`;
const ALTIN_KALEM: Record<string, string> = {
  galibiyet: "Galibiyet", maglubiyet: "Maç", terk: "Terk", ilkGalibiyet: "Günün ilk galibiyeti", stilYetenek: "Stil: yetenekle bitiş",
  stilBitis: "Stil: farklı bitişler", stilTakimUltisi: "Stil: Takım Ultisi",
};
const CARPAN_AD: Record<string, string> = { azalanGetiri: "Günlük maç sayısı", oda: "Oda maçı", bot: "Bot maçı", rakipTerk: "Rakip ayrıldı" };
const ALTIN_SIFIR: Record<string, string> = {
  kisaMac: "Maç 20 sn'den kısa: Altın yok.", ciftTavani: "Bu rakiple bugün 3 maçı geçtin: Altın ve başarım sayılmaz.", terk: "Teslim/terk: Altın yok.",
  iptal: "Maç iptal: Altın yok.", antrenman: "Antrenman: Altın yok.", misafir: "Hesapsız: Altın yok.",
};
const BASARIM_SAYILMADI: Record<string, string> = {
  teslim: "Teslim edilen maçta başarım sayılmaz.", hukmen: "Hükmen biten maçta başarım sayılmaz.", ciftTavani: "Bu rakiple bugün 3 maçı geçtin: başarım sayılmaz.",
};
const NEDEN_AD: Record<MacSonucu["neden"], string> = {
  puan: "İlk 3 puan",
  tukenme: "Takım tükendi (3 topaç elendi)",
  aniOlum: "Ani ölüm: ilk bitiş",
  surePuan: "Süre doldu: puan üstünlüğü",
  sureStamina: "Süre doldu: toplam Stamina oranı",
  surePuanEsitlik: "Süre doldu: Stamina eşit, puan",
  yaziTura: "Süre doldu: her şey eşit, yazı-tura",
  teslim: "Teslim",
  hukmen: "Hükmen (bağlantı koptu / girdi yok)",
  iptal: "Maç iptal (iki taraf da koptu)",
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

/** Çevrimiçi maç (D4): aynı sunum, kaynak sunucu (tahmin modeli A). Lobi ekranı çağırır. */
export function cevrimiciBaslat(b: EkranBaglami, ag: AgMaci, kancalar: CevrimiciKancalar): MacEkrani {
  return new MacEkrani(b, ag, kancalar);
}

/** Antrenman eğitimi (D5, ux § 4.2): aynı maç sunumu, eğitim kuralları ekranın kancalarında. */
export interface EgitimKancalari {
  takimlar(): { ta: TakimProfilleri; tb: TakimProfilleri; seviye: [number, number] };
  adlar: [string, string];
  /** rakip (Antrenman Kuklası) girdisi: varsayılan bot girdisi verilir, eğitim adımı değiştirebilir */
  rakipGirdisi(d: Dunya, g: Girdi): Girdi;
  /** her sim adımından sonra (olaylar d.olaylar'da): adım makinesi, stamina/saat kuralları */
  adimSonrasi(d: Dunya, g0: Girdi): void;
  /** Esc menüsünün ilk maddesi */
  atla(): void;
}

/** Antrenman eğitimi ekranı (çevrimdışı sim, bot Antrenman Kuklası). */
export function egitimBaslat(b: EkranBaglami, k: EgitimKancalari): MacEkrani {
  return new MacEkrani(b, null, null, k);
}

export interface CevrimiciKancalar {
  /** D5: oturumdaki oyuncu (sonuç ekranı) */
  ben?: Girisli;
  /** oda seçim fazına döndü (rövanş kabul): lobi takım seçimini gösterir */
  secim(): void;
  /** maç bitti ve odadan çıkıldı / bağlantı tamamen gitti */
  cikis(neden: string): void;
  /** D7 hızlı maç: Tekrar = yeni eşleşme (aynı mod; ux § 3.5, tide G-21) */
  tekrar?: () => void;
}

export class MacEkrani {
  private yerel = YEREL;
  private rakip = RAKIP;
  private sahne: Sahne;
  private efektler: Efektler;
  private gorseller: TopacCizimi[] = [];
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
  // ---- D4: çevrimiçi ----
  private agMacNo = -1;
  /** ölçüm: çevrimiçi kare ve girdi adımı sayısı */
  agKareSayisi = 0;
  agAdimSayisi = 0;
  private agSonZaman = performance.now();
  private agZamanlayici = 0;
  private agKatman: AgKatmani | null = null;
  private rovansIstendi = false;

  constructor(private b: EkranBaglami, private ag: AgMaci | null = null, private kancalar: CevrimiciKancalar | null = null, private egitim: EgitimKancalari | null = null) {
    if (ag) { this.yerel = ag.yerel; this.rakip = 1 - ag.yerel; }
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

    this.ayarlar = ayarlariOku();
    this.sahne = new Sahne(b.app, kameraKipi(this.ayarlar));
    this.efektler = new Efektler(this.sahne, () => this.gorseller);
    this.sahne.efektKatmani.addChild(this.kenarUyari);
    this.girdi = new OyuncuGirdisi(b.app.canvas, () => b.app.screen);
    this.yetenekGorsel = new YetenekGorsel(this.sahne, this.yerel);
    // iptal bölgesi: alt şerit (mantıksal y > 492, ux § 1)
    this.girdi.iptalBolgesi = (px, py) => { const c = this.sahne.cerceve(); return (py - c.y) / c.olcek > 492; };
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
    if (this.ag) {
      this.agKatman = new AgKatmani(this.ust, this.ag, () => this.hud);
      this.agZamanlayici = window.setInterval(this.agDongu, 1000 / 240);
    }
    window.addEventListener("keydown", this.tus, { capture: true });
    window.addEventListener("keyup", this.tusBirak, { capture: true });
    b.app.ticker.add(this.kare);
    if (q.has("debug") && q.get("cizim") === "yok") {
      // ölçüm koşusu (yalnız ?debug): headless yazılım GL'de çizim ana iş parçacığını kilitliyor (2-4 kare/sn);
      // çizim kapalı, mantık (olay, HUD, bantlar) 30 Hz zamanlayıcıyla akar. Ekran görüntüsü koşusu çizimlidir.
      b.app.stop();
      let son = performance.now();
      window.setInterval(() => { const t = performance.now(); b.app.ticker.deltaMS = t - son; son = t; this.kare(); }, 1000 / 30);
    }
    if (q.has("debug") || this.egitim) (window as unknown as { __mac: MacEkrani }).__mac = this;
  }

  // ---- D5: Antrenman eğitimi katmanı için ----
  get hudKok(): HTMLElement { return this.hud.kok; }
  get ustKatman(): HTMLElement { return this.ust; }
  get yerelIndeks(): number { return this.yerel; }
  /** son karede basılı tutulan yuva (eğitim nişan vurgusu) */
  get basiliYuva(): number { return this.girdi.basiliYuva; }
  durdur(): void { this.b.app.ticker.stop(); window.clearInterval(this.agZamanlayici); window.removeEventListener("keydown", this.tus, { capture: true }); }

  // ---- hata ayıklama kancaları (Playwright) ----
  get durum(): Dunya { return this.dunya; }
  get sayac(): Efektler["sayac"] { return this.efektler.sayac; }
  get olaylar(): Olay[] { return this.sonOlaylar; }
  get sonucAcik(): boolean { return this.sonucOrt.classList.contains("acik"); }
  /** Debug: Enerji'yi doldurur (uçtan uca doğrulama; yalnız ?debug). */
  enerjiDoldur(i = this.yerel, miktar = ENERJI_TAVAN): void { this.dunya.topaclar[i]!.enerji = Math.min(ENERJI_TAVAN, miktar); }
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
    if (this.ag && this.ag.yerel !== this.yerel) { this.yerel = this.ag.yerel; this.rakip = 1 - this.yerel; }
    this.tohum = tohum;
    const gorunum = this.ag?.gorunum(1) ?? null;
    if (gorunum) {
      this.dunya = gorunum;
      this.agMacNo = this.ag!.macNo;
    } else {
      if (this.egitim) {
        const e = this.egitim.takimlar();
        this.dunya = macDunyasiKur([e.ta, e.tb], tohum, { seviye: e.seviye });
      } else {
        const takimlar = takimlariOku();
        const ta = takimProfilleri(takimlar[this.takimNo]!);
        const tb = takimProfilleri(takimlar[this.rakipNo]!);
        this.dunya = macDunyasiKur([ta, tb], tohum, { seviye: [this.seviye, this.seviye] });
      }
    }
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
        const g = this.sahne.topacOlustur(this.dunya.profiller[i]!, i === this.yerel ? "oyuncu" : "rakip");
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
    const adlar: [string, string] = this.ag
      ? [`${this.ag.oyuncu(this.yerel)?.ad ?? "Sen"}${this.oto ? " (oto)" : ""}`, this.ag.oyuncu(this.rakip)?.ad ?? "Rakip"]
      : this.egitim ? this.egitim.adlar : [this.oto ? "Sen (oto)" : "Sen", `Bot (${kip})`];
    const hudAdlari: [string, string] = this.yerel === 0 ? adlar : [adlar[1], adlar[0]];
    this.hud = new MacHud(this.b.ustYazi, this.yerel, this.yerel === 0 ? adlar : hudAdlari);
    this.hud.kartSecildi = (k) => this.secimIste(k);
    this.b.ustYazi.appendChild(this.ust); // sonuç/menü HUD'un üstünde
  }

  private gorselYenile(i: number): void {
    const p = this.dunya.profiller[i]!;
    this.gorseller[i]!.profilAyarla(p, i === this.yerel ? "oyuncu" : "rakip");
    this.gorseller[i]!.sifirla();
    this.izler[i]!.sifirla();
    this.izler[i]!.renk = ELEMENT_RENK[p.element].acik;
  }

  private botKipi(i: number): BotKipi {
    if (i === this.rakip && this.botSecimi !== "tip") return this.botSecimi;
    return botKademesiSec(this.dunya.profiller[i]!.tip);
  }

  // ---- girdi ----
  private secimIste(uye: number): void {
    const d = this.dunya;
    const tk = d.takimlar![this.yerel]!;
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
          else if (!this.ag) this.yeniMac(this.tohum + 1);
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
      if (geriCekAcik(d, this.yerel)) this.bekleyenDegistir = siradakiUye(d.takimlar![this.yerel]!);
      else this.hud.bantGoster(d.topaclar[this.yerel]!.geriCekKalan > 0 ? "Geri çekiliyor…" : d.takimlar![this.yerel]!.geriCekBekleme > 0 ? "Geri çek beklemede." : "Geri çekmek için stamina %25'in altında olmalı.", 1.6);
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
      if (this.egitim) {
        const atla = el("button", "", dg, "Atla");
        atla.addEventListener("click", () => { this.menuAcKapa(false); this.egitim!.atla(); });
      }
      const devam = el("button", "bir", dg, "Devam");
      devam.addEventListener("click", () => this.menuAcKapa(false));
      const ayar = el("button", "", dg, "Ayarlar");
      ayar.addEventListener("click", () => { this.menuGoster("ayarlar"); });
      if (!this.egitim) {
        const teslim = el("button", "", dg, "Teslim ol");
        teslim.addEventListener("click", () => { this.menuGoster("teslim"); });
      }
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
  /** Yerel girdi (klavye/fare ya da ?oto botu); menü açıkken sürüş yok. */
  private yerelGirdi(d: Dunya): Girdi {
    let g0: Girdi = this.girdi.olustur(this.sahne, d.topaclar[this.yerel]!);
    if (this.menuAcik) { g0 = { ...g0, yonX: 0, yonZ: 0, dash: false, zipla: false, dinlen: false }; }
    if (this.oto && !this.menuAcik) {
      const b = botGirdisi(d, this.yerel, this.oto, this.tohum * 7907 + 11);
      // otomatik oynanış: sürüş/eylem/geri çek bottan; tur arası seçimi klavyeden (H14), yoksa süre dolunca sıradaki
      g0 = { ...b, degistir: d.mac.faz === "turArasi" ? -1 : b.degistir };
    }
    if (this.ag && this.oto && this.otoKlavye) g0 = this.klavyeyeIndir(g0);
    if (this.bekleyenDegistir >= 0) { g0 = { ...g0, degistir: this.bekleyenDegistir }; this.bekleyenDegistir = -1; }
    return g0;
  }

  /**
   * Çevrimiçi otomatik oynanış (yalnız test): botun analog yönünü klavye oyuncusu gibi 8 yöne indirir ve yön
   * değişimini en az 6 adım (100 ms) tutar (ADR-003: WASD). `&otoGirdi=analog` ile ham bot (en kötü durum).
   */
  private klavyeyeIndir(g: Girdi): Girdi {
    const esik = 0.38;
    const x = g.yonX > esik ? 1 : g.yonX < -esik ? -1 : 0;
    const z = g.yonZ > esik ? 1 : g.yonZ < -esik ? -1 : 0;
    if ((x !== this.otoYon.x || z !== this.otoYon.z) && this.otoTutma <= 0) { this.otoYon = { x, z }; this.otoTutma = 6; }
    this.otoTutma--;
    return { ...g, yonX: this.otoYon.x, yonZ: this.otoYon.z };
  }
  private otoYon = { x: 0, z: 0 };
  private otoTutma = 0;
  private otoKlavye = new URLSearchParams(location.search).get("otoGirdi") !== "analog";

  /** Çevrimiçi adım: girdi gönder + kendi topacını tahmin et (sim sunucuda). */
  private agAdim(): void {
    this.ag!.yerelAdim(this.yerelGirdi(this.dunya), this.efektler.hitstopVar(this.yerel));
  }

  /** Bir olayı sunuma uygula (çevrimdışı adımdan ya da sunucudan). Dönen: ışınlama gerekli mi. */
  private olayUygula(o: Olay, d: Dunya): boolean {
    let isinla = false;
    if (this.durTalebi && !this.durTalebi.oldu && this.durTalebi.turler.includes(o.tur) && (this.durTalebi.i < 0 || ("i" in o && o.i === this.durTalebi.i))) this.durTalebi.oldu = o;
    if (o.tur === "degisim" && this.ag?.profiller) d.profiller[o.i] = this.ag.profiller[o.i]![o.uye]!;
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
      case "macBitti":
        this.macSonuclari.push(o.sonuc); this.sonucKalan = o.sonuc.neden === "teslim" || o.sonuc.neden === "hukmen" || o.sonuc.neden === "iptal" ? 0.3 : SONUC_GECIKMESI;
        sekmeIpucuMacBitti();
        break;
      case "yetenekBasladi": {
        const ad = `${o.i === this.yerel ? "sen" : "rakip"}:${YETENEK_SIM[o.no]!.id}`;
        this.yetenekKullanimi[ad] = (this.yetenekKullanimi[ad] ?? 0) + 1;
        break;
      }
      default: break;
    }
    return isinla;
  }

  /**
   * Çevrimiçi girdi/tahmin döngüsü: çizimden bağımsız zamanlayıcı (performance.now birikimi, 60 adım/sn). Kare hızı
   * düşse de (yazılım GL, ağır efekt) girdi hızı sunucu adımına yetişir. Sekme gizliyken girdi gönderilmez
   * (sunucu AFK sayar: 10 sn uyarı, 30 sn terk); dönüşte tam durumdan yetişilir (AgKatmani).
   */
  private agDongu = (): void => {
    const simdi = performance.now();
    const dt = Math.min(0.25, (simdi - this.agSonZaman) / 1000);
    this.agSonZaman = simdi;
    if (document.hidden) { this.birikim = 0; return; }
    this.birikim += dt;
    let n = 0;
    while (this.birikim >= AYAR.dt && n < AG_ADIM_TAVANI) { this.agAdim(); this.birikim -= AYAR.dt; n++; this.agAdimSayisi++; }
    if (n === AG_ADIM_TAVANI) this.birikim = 0;
  };

  private agKare(dt: number): void {
    const ag = this.ag!;
    if (ag.macNo !== this.agMacNo && ag.sunucu && ag.faz === ODA_FAZI.mac) { this.rovansIstendi = false; this.rovansRed = false; this.yeniMac(this.tohum + 1); }
    this.agKareSayisi++;
    const alfa = Math.min(1, this.birikim / AYAR.dt);
    const g = ag.gorunum(alfa);
    if (g) this.dunya = g;
    const d = this.dunya;
    let isinla = false;
    const olaylar = ag.olaylariAl();
    for (const o of olaylar) isinla = this.olayUygula(o, d) || isinla;
    if (olaylar.length) this.sonOlaylar = [...this.sonOlaylar, ...olaylar].slice(-60);
    if (isinla) for (const z of this.izler) z.sifirla();
    this.onceki = d.topaclar.map((t) => ({ x: t.x, z: t.z }));
    this.agKatman?.guncelle(dt, d, this.yerel);
    if (this.sonucAcik) { this.odulYaz(); this.rovansDenetle(); }
  }

  private tekAdim(): void {
    const d = this.dunya;
    this.onceki = d.topaclar.map((t) => ({ x: t.x, z: t.z }));
    const g0 = this.yerelGirdi(d);
    let g1 = botGirdisi(d, this.rakip, this.botKipi(this.rakip), this.tohum * 7919 + 3);
    if (this.zorlaRakip >= 0) { g1 = { ...g1, atesle: true, secilenYuva: this.zorlaRakip, nisanX: d.topaclar[this.yerel]!.x, nisanZ: d.topaclar[this.yerel]!.z }; this.zorlaRakip = -1; }
    if (this.egitim) g1 = this.egitim.rakipGirdisi(d, g1);
    const girdiler: [Girdi, Girdi] = this.yerel === 0 ? [g0, g1] : [g1, g0];
    adim(d, girdiler);
    let isinla = false;
    for (const o of d.olaylar) isinla = this.olayUygula(o, d) || isinla;
    if (isinla) this.onceki = d.topaclar.map((t) => ({ x: t.x, z: t.z }));
    if (d.olaylar.length) this.sonOlaylar = [...this.sonOlaylar, ...d.olaylar].slice(-60);
    this.egitim?.adimSonrasi(d, g0);
  }

  private kare = (): void => {
    const dt = Math.min(this.b.app.ticker.deltaMS / 1000, 0.25);
    this.zaman += dt;
    if (this.ag) this.agKare(dt);
    else {
      this.birikim += dt * this.hiz;
      let n = 0;
      const tavan = AYAR.enFazlaAdimKare * this.hiz;
      while (this.birikim >= AYAR.dt && n < tavan) {
        this.tekAdim(); this.birikim -= AYAR.dt; n++;
        // ekran görüntüsü talebi (yalnız ?debug): olaydan sonra kare başına tek adım, `kare` adım sonra dur
        if (this.durTalebi?.oldu) { this.birikim = 0; break; }
      }
      if (n === tavan) this.birikim = 0;
    }
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
        if (this.ag) this.ag.gonder(MESAJ.teslim);
        else {
          teslimEt(this.dunya, this.yerel);
          for (const o of this.dunya.olaylar) if (o.tur === "macBitti") { this.macSonuclari.push(o.sonuc); this.sonucKalan = 0.3; }
        }
      }
    }
    if (this.sonucAcik) this.sonucIlerlet(dt);
    this.ciz(dt, this.ag ? 1 : Math.min(1, this.birikim / AYAR.dt));
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
    kenarUyarisiCiz(this.kenarUyari, d, this.yerel, S, this.zaman);
    // H9 nişan (yalnız Fare modu; "Hareket yönü" modunda çizgi çizilmez) + H13 telegraf + dekaller + Ulti anı
    const basili = this.menuAcik ? -1 : this.girdi.basiliYuva;
    const nisan = basili >= 0 && basili < 3 && this.girdi.nisanModu === "fare" ? { yuva: basili, ...this.girdi.nisanNoktasi(S, d.topaclar[this.yerel]!) } : null;
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
    const t = d.topaclar[this.yerel]!;
    if (m.faz === "tur" && aktifMi(t) && this.kenarTikSaat <= 0) {
      const dm = kok2(t.x, t.z);
      const disa = dm > 1e-6 ? (t.vx * t.x + t.vz * t.z) / dm : 0;
      if (dm > AYAR.kusakDis * d.arenaYaricap && disa > 0.7 * d.profiller[this.yerel]!.sim.ringOutHizi) { Ses.cal("kenar-uyari"); this.kenarTikSaat = 0.5; }
    }
  }

  // ---- sonuç ekranı (ux § 3.5, referans görsel 09) ----
  /**
   * Sıra: plaka (ZAFER kanat + yıldız / YENİLGİ / BERABERE) → bitiş tablosu (Bitiş / Puan, ikonlu) → Altın (sayma
   * animasyonu + stil kalemleri) → Çekirdek kartı → başarım ilerlemesi (+1; tamamlanırsa "Market'te açıldı: <parça>" +
   * Markete git) → Tekrar · Atölye (oda: Rövanş). ≤ 6 sn, Space/Enter atlar; kendiliğinden kapanmaz.
   */
  private sonucGoster(): void {
    const d = this.dunya;
    const s = d.mac.macSonucu!;
    const k = this.sonucKutu;
    k.innerHTML = "";
    this.sonucOrt.querySelector(".konfeti")?.remove();
    const tur = s.kazanan === this.yerel ? "zafer" : s.kazanan < 0 ? "berabere" : "yenilgi";
    if (tur === "zafer") {
      for (const yon of ["sol", "sag"]) el("div", `kanat ${yon}`, k).innerHTML = KANAT_SVG;
      this.konfeti();
    }
    const pl = el("div", `plaka pah ${tur}`, k);
    const h = el("h2", tur, pl);
    h.innerHTML = tur === "zafer" ? `${YILDIZ}<span>ZAFER</span>${YILDIZ}` : `${SIMGE[tur]}<span>${tur === "yenilgi" ? "YENİLGİ" : "BERABERE"}</span>`;
    const rakipTerk = this.ag && (s.neden === "hukmen" || s.neden === "teslim") && s.kazanan === this.yerel;
    const altYazi = rakipTerk ? (s.neden === "teslim" ? "Rakip teslim oldu. Galibiyet sende." : "Rakip maçtan ayrıldı. Galibiyet sende.") : s.neden === "iptal" ? "İki taraf da koptu: bu maç sayılmaz." : tur === "yenilgi" ? "Bu sefer olmadı." : "";
    el("div", "alt", k, altYazi);
    const rakipAdi = this.ag ? (this.ag.oyuncu(this.rakip)?.ad ?? "Rakip") : `Bot (${this.botSecimi === "tip" ? "tipine göre" : this.botSecimi})`;
    const nd = el("div", "ndn", k);
    nd.innerHTML = `<span class="skr">${s.puan[this.yerel]} – ${s.puan[this.rakip]}</span>`;
    nd.append(`Rakip: ${rakipAdi} · ${NEDEN_AD[s.neden]} · ${(d.mac.saat / AYAR.adimHz).toFixed(0)} sn`);
    // 1) bitiş tablosu
    this.sonucSatirlari = [];
    const tp = el("div", "tablo rpanel pah", k);
    const tablo = el("table", "", tp);
    tablo.innerHTML = "<thead><tr><th>Bitiş</th><th>Puan</th></tr></thead>";
    const govde = el("tbody", "", tablo);
    const turlar = this.turlar.slice(-6);
    turlar.forEach((t) => {
      const tr = el("tr", "satir", govde);
      const kim = t.kazanan < 0 ? "puan yok" : t.kazanan === this.yerel ? "sen" : "rakip";
      tr.innerHTML = `<td><span class="bk">${BITIS_IKON[t.tur]}</span>${BITIS_AD[t.tur]}<small>${kim}</small></td><td>${t.puan > 0 ? `${t.kazanan === this.yerel ? "+" : "−"}${t.puan}` : "0"}</td>`;
      tr.dataset["bitis"] = t.tur;
      this.sonucSatirlari.push(tr);
    });
    if (s.neden === "teslim") { const tr = el("tr", "satir", govde); tr.innerHTML = `<td>Teslim</td><td>0 – 3</td>`; this.sonucSatirlari.push(tr); }
    if (!turlar.length && s.neden !== "teslim") { const tr = el("tr", "satir", govde); tr.innerHTML = `<td>Bitiş yok</td><td>0</td>`; this.sonucSatirlari.push(tr); }
    // 2-4) Altın · Çekirdek · Başarım
    const od = el("div", "oduller rpanel pah", k);
    const altin = el("div", "ac satir", od);
    altin.dataset["altin"] = "1";
    const cek = el("div", "ac ck0 pah satir", od);
    cek.dataset["odul"] = "1";
    const bas = el("div", "bsr satir", od);
    bas.dataset["basarim"] = "1";
    this.sonucSatirlari.push(altin, cek, bas);
    const mod = this.ag?.durum.mod;
    if (!this.ag || mod === "antrenman") {
      const neden = !this.ag ? "Bota karşı çevrimdışı maç" : this.b.ben?.girisli ? "Antrenman" : "Hesapsız Antrenman";
      altin.innerHTML = `<b class="bas">Altın</b><span class="say">—</span>${YIGIN_SVG(70)}<span class="yt">${neden}: Altın ve başarım yok.</span>`;
      cek.innerHTML = `<b class="bas">Çekirdek</b><span class="yt">${neden}: tecrübe yok.</span>`;
      bas.innerHTML = `<div class="bsk pah"><span></span><span class="ad">Başarım</span><span class="yt" style="grid-column:2">${neden} sayılmaz.</span></div>`;
    } else {
      altin.innerHTML = `<b class="bas">Altın</b><span class="say" data-sayi="0">+0</span>${YIGIN_SVG(70)}<span class="yt">hesaplanıyor…</span>`;
      cek.innerHTML = `<b class="bas">Çekirdek</b><span class="yt">hesaplanıyor…</span>`;
      bas.innerHTML = `<span class="yt">hesaplanıyor…</span>`;
      this.odulYazildi = false;
      this.odulYaz();
    }
    el("div", "ipc", k, "Space / Enter: atla");
    const dg = el("div", "dg", k);
    const oda = this.ag && mod === "oda";
    const tekrar = el("button", "bir pah", dg, oda ? "Rövanş" : "Tekrar");
    tekrar.dataset["rovans"] = "1";
    tekrar.addEventListener("click", () => {
      if (!this.ag) { this.yeniMac(this.tohum + 1); return; }
      if (!oda && this.kancalar?.tekrar) { this.kancalar.tekrar(); return; }
      this.rovansIstendi = true;
      this.ag.gonder(MESAJ.rovans);
      tekrar.textContent = "Rövanş bekleniyor…";
      tekrar.disabled = true;
    });
    const atolye = el("button", "pah", dg, "Atölye");
    atolye.dataset["eylem"] = "atolye";
    atolye.addEventListener("click", () => { location.search = "?ekran=atolye"; });
    this.sonucAdim = 0;
    this.sonucSaat = 0;
    this.sonucOrt.classList.add("acik");
    this.hud.kok.style.opacity = "0.35";
    queueMicrotask(() => tekrar.focus());
  }

  /** ZAFER konfetisi (≤ 60 parça, 2-3 sn; "Parçacık: Az" ×0,4; tasarım dili § 5). */
  private konfeti(): void {
    const n = Math.round(48 * (this.ayarlar.parcacik === "az" ? 0.4 : 1));
    const k = el("div", "konfeti", this.sonucOrt);
    const renk = ["#fcd35a", "#e8762f", "#7fe3a0", "#2fb8e8", "#e83a8c", "#fbf2c3"];
    for (let i = 0; i < n; i++) {
      const c = el("i", "", k);
      c.style.left = `${(i * 97) % 960}px`;
      c.style.background = renk[i % renk.length]!;
      c.style.animationDuration = `${2 + ((i * 37) % 10) / 10}s`;
      c.style.animationDelay = `${((i * 53) % 12) / 10}s`;
    }
  }

  private odulYazildi = false;
  private rovansRed = false;
  private altinHedef = 0;
  private altinSaat = -1;
  private altinBas = -1;
  /** Sonuç ekranı ödülleri (sunucu `odul` bilgisi): Altın kalemleri + sayma, Çekirdek kartı, başarım ilerlemesi. */
  private odulYaz(): void {
    if (!this.ag || this.odulYazildi) return;
    const cek = this.sonucKutu.querySelector<HTMLElement>("[data-odul]");
    const altin = this.sonucKutu.querySelector<HTMLElement>("[data-altin]");
    const bas = this.sonucKutu.querySelector<HTMLElement>("[data-basarim]");
    if (!cek || !altin || !bas) return;
    let o: Extract<BilgiMesaji, { tur: "odul" }> | null = null;
    for (const b of this.ag.bilgiler) if (b.tur === "odul") o = b;
    if (!o) return;
    this.odulYazildi = true;
    // Altın
    const a = o.altin;
    altin.innerHTML = `<b class="bas">Altın</b><span class="say" data-sayi="0">+0</span>${YIGIN_SVG(64)}`;
    const ul = el("ul", "", altin);
    if (a) {
      this.altinHedef = a.toplam;
      this.altinSaat = 0;
      this.altinBas = -1;
      altin.dataset["toplam"] = String(a.toplam);
      if (a.sifirNedeni) el("li", "c", ul, ALTIN_SIFIR[a.sifirNedeni] ?? "Bu maç Altın vermedi.");
      for (const x of a.kalemler) { const li = el("li", x.neden.startsWith("stil") ? "c" : "", ul); li.innerHTML = `<span>${ALTIN_KALEM[x.neden] ?? x.neden}</span><span>+${x.miktar}</span>`; }
      for (const c of a.carpanlar) { const li = el("li", "", ul); li.innerHTML = `<span>${CARPAN_AD[c.ad] ?? c.ad}</span><span>×${String(c.deger).replace(".", ",")}</span>`; }
      if (o.basarimAltini) { const li = el("li", "c", ul); li.innerHTML = `<span>Başarım ödülü</span><span>+${o.basarimAltini}</span>`; }
      el("li", "", ul).innerHTML = `<span>Bakiye</span><span data-bakiye>${a.bakiye}</span>`;
      // üst bant bakiyesi (sayfa açılışındaki değer) tazelenir
      const ub = document.querySelector<HTMLElement>("body > header .altinB");
      if (ub) { ub.textContent = `${a.bakiye} Altın`; ub.dataset["bakiye"] = String(a.bakiye); }
    }
    // Çekirdek kartı (D5/D6: Lv. + tecrübe çubuğu; seviye atlarsa halkalar yanar, yeni yetenek)
    cek.innerHTML = `<b class="bas">Çekirdek</b>`;
    if (o.sayilmadi) el("span", "yt", cek, "Bu maç sayılmadı.");
    else if (!o.cekirdekler.length) el("span", "yt", cek, "Ödünç topaçlar tecrübe almaz.");
    for (const c of o.cekirdekler.slice(0, 3)) {
      const kutu = el("div", "ck", cek);
      const oran = c.ust > c.alt ? Math.max(0, Math.min(1, (c.xp - c.alt) / (c.ust - c.alt))) : 1;
      const atladi = c.seviye > c.seviyeOnce;
      const halka = [1, 2, 3].map((n) => `<b class="hl${n <= c.seviye ? " on" : ""}${atladi && n > c.seviyeOnce && n <= c.seviye ? " yeni" : ""}" aria-hidden="true"></b>`).join("");
      kutu.innerHTML = `<span class="ckad"></span> <span class="hlk">${halka}</span> Lv.${c.seviye} · +${c.kazanc} XP<span class="xpb" role="meter" aria-label="Tecrübe" aria-valuenow="${c.xp}"><i style="width:${Math.round(oran * 100)}%"></i></span><small>${c.ust > c.alt ? `${c.xp} / ${c.ust} XP` : `${c.xp} XP · tavan`}${c.omur !== null ? ` · ömür ${c.omur} maç` : ""}</small>${atladi ? `<em>Seviye atladı! Yeni: <span class="yy"></span></em>` : ""}`;
      kutu.querySelector(".ckad")!.textContent = c.ad;
      const yy = kutu.querySelector(".yy");
      if (yy) yy.textContent = c.yeniYetenek ?? `Lv.${c.seviye}`;
      kutu.dataset["seviye"] = String(c.seviye);
      kutu.dataset["kazanc"] = String(c.kazanc);
    }
    // Başarım ilerlemesi (+1 Kor Ustası 4/10; tamamlanan önce; en çok 3)
    bas.innerHTML = "";
    const liste = [...(o.basarimlar ?? [])].sort((x, y) => Number(y.tamamlandi) - Number(x.tamamlandi) || (y.ilerleme / y.sayi) - (x.ilerleme / x.sayi));
    if (o.basarimSayilmadi && o.basarimSayilmadi !== "iptal") el("span", "yt", bas, BASARIM_SAYILMADI[o.basarimSayilmadi] ?? "Bu maç başarım saymadı.");
    else if (o.mod === "bot") el("span", "yt", bas, "Bot maçı: başarımda yalnız Yol sayılır.");
    else if (o.mod === "oda") el("span", "yt", bas, "Oda maçı: yalnız Sosyal başarımlar sayılır.");
    if (!liste.length) el("div", "bsk pah", bas).innerHTML = `<span>${BASARIM_IKON}</span><span class="ad">Başarım</span><span class="yt" style="grid-column:2">Bu maçta ilerleme yok.</span>`;
    for (const x of liste.slice(0, 3)) {
      const kart = el("div", `bsk pah${x.tamamlandi ? " tamam" : ""}`, bas);
      kart.dataset["basarimId"] = x.id;
      kart.dataset["ilerleme"] = `${x.ilerleme}/${x.sayi}`;
      if (x.tamamlandi) kart.dataset["tamam"] = "1";
      kart.innerHTML = `<span>${BASARIM_IKON}</span><span class="ad"><em>+${x.ilerleme - x.onceki}</em><span class="bad"></span> ${x.ilerleme}/${x.sayi}</span><span class="cb"><i style="width:${Math.round((x.ilerleme / x.sayi) * 100)}%"></i></span>`;
      kart.querySelector(".bad")!.textContent = x.ad;
      if (x.tamamlandi) {
        const p = x.acilanParcalar[0];
        const acl = el("div", "acl", kart);
        if (p) {
          el("span", "", acl, `Market'te açıldı: ${p.ad}`);
          const g = el("button", "pah", acl, "Markete git");
          g.dataset["marketeGit"] = p.id;
          g.addEventListener("click", () => { location.search = `?ekran=market&parca=${p.id}`; });
        } else el("span", "", acl, `Tamamlandı · +${x.odulAltin} Altın`);
      }
    }
    if (this.sonucAdim >= this.sonucSatirlari.length) this.altinSayBitir();
  }

  private altinSayBitir(): void {
    const s = this.sonucKutu.querySelector<HTMLElement>("[data-altin] .say");
    if (s && this.altinSaat >= 0) { s.textContent = `+${this.altinHedef}`; s.dataset["sayi"] = String(this.altinHedef); }
    this.altinSaat = -1;
  }

  /** Rövanş reddi: rakip sonuç ekranından ayrıldıysa düğme kapanır (B-21: ceza yok). */
  private rovansDenetle(): void {
    const ag = this.ag;
    if (!ag || this.rovansRed || !this.sonucAcik) return;
    const rk = ag.oyuncu(this.rakip);
    const ayrildi = ag.faz === ODA_FAZI.kapandi || (rk !== undefined && !rk.bagli) || ag.bilgiler.some((b) => b.tur === "kapandi");
    if (!ayrildi) return;
    this.rovansRed = true;
    const d = this.sonucKutu.querySelector<HTMLButtonElement>("[data-rovans]");
    if (d) { d.textContent = "Rakip ayrıldı"; d.disabled = true; d.dataset["red"] = "1"; }
    const alt = el("div", "alt", this.sonucKutu, "Rakip rövanş istemedi. Atölye'ye dönebilirsin.");
    alt.dataset["rovansRed"] = "1";
    alt.setAttribute("role", "status");
    this.sonucKutu.querySelector<HTMLButtonElement>("[data-eylem=atolye]")?.focus();
  }

  /** Satırlar sırayla belirir (≤ 6 sn); Space/Enter atlar; ekran kendiliğinden kapanmaz. */
  private sonucIlerlet(dt: number): void {
    // Altın sayma animasyonu (Altın sütunu göründükten sonra ~1,2 sn)
    const altinGorundu = this.sonucKutu.querySelector("[data-altin]")?.classList.contains("gor");
    if (this.altinSaat >= 0 && altinGorundu) {
      // gerçek saat (kare hızından bağımsız ~1,2 sn sayma)
      const simdi = performance.now();
      if (this.altinBas < 0) this.altinBas = simdi;
      this.altinSaat = (simdi - this.altinBas) / 1000;
      const s = this.sonucKutu.querySelector<HTMLElement>("[data-altin] .say");
      const t = Math.min(1, this.altinSaat / 1.2);
      const n = Math.round(this.altinHedef * t);
      if (s) { s.textContent = `+${n}`; s.dataset["sayi"] = String(n); }
      if (t >= 1) this.altinSaat = -1;
    }
    if (this.sonucAdim >= this.sonucSatirlari.length) return;
    this.sonucSaat += dt;
    const aralik = Math.min(0.45, 5 / Math.max(1, this.sonucSatirlari.length));
    while (this.sonucAdim < this.sonucSatirlari.length && this.sonucSaat >= aralik * (this.sonucAdim + 1)) this.sonucSatirlari[this.sonucAdim++]!.classList.add("gor");
  }

  private sonucHepsiniGoster(): void {
    for (const s of this.sonucSatirlari) s.classList.add("gor");
    this.sonucAdim = this.sonucSatirlari.length;
    this.altinSayBitir();
  }
}
