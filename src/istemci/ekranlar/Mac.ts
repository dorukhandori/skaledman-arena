import { Graphics, UPDATE_PRIORITY } from "pixi.js";
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
import { parca3bIkonEl } from "./pikselTopac.ts";
import { ikonlariYukselt } from "../atolye3d/ikonOnbellek.ts";
import { DokunmatikKontrol } from "../oyun/DokunmatikKontrol.ts";
import { yuvaYetenegi } from "../../paylasilan/sim/yetenek.ts";
import { dokunmatikMi } from "../mobil/cihaz.ts";
import { tamEkranDegistir, tamEkranVar, uyanikTut } from "../mobil/kabuk.ts";

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

// GU-06 sonuç ekranı + maç menüsü · menü dili v2 "Kuşak Taşı" (maket b-sonuc; menu-tasarim-arastirma § 5): gece zemini,
// bronz ZAFER plakası (basamaklı kanat + pixel yıldız), taş paneller, pixel yazı (Jersey 10 / m5x7), tek ana düğme
// bronz-turuncu (K-2), konfeti yerine taş kıymığı + kıvılcım (KM-7), gelir dökümü ikinci katta (Altın kartına odak/üzerine gel; KM-6).
// Çerçeve 960×540 = 480×270 mantıksal × 2 (`--q` = 2 px; maç HUD çerçevesiyle aynı dönüşüm).
const STIL = `
.ms { --q:2px; position:absolute; left:0; top:0; width:960px; height:540px; transform-origin:0 0; pointer-events:none; font:400 32px/1 var(--font-etiket); color:var(--ink); image-rendering:pixelated; }
.ms .ort { position:absolute; inset:0; display:none; pointer-events:auto; overflow:hidden; background-color:#07070d; background-size:256px 256px; }
.ms .ort.acik { display:block; }
.ms .kutu { position:absolute; left:144px; top:8px; width:672px; height:524px; }
.ms .pah { clip-path:none; }
.ms .rpanel { position:relative; border:10px solid transparent; border-image:var(--k-tas-cerceve) 5 fill / 10px / 0 round; }
.ms .plaka { position:relative; z-index:2; width:380px; margin:0 auto; height:64px; display:flex; align-items:center; justify-content:center; gap:16px;
  border:0 solid transparent; border-image:var(--k-plaka) 6 fill / 12px / 0 round; }
.ms .plaka.yenilgi { filter:grayscale(.85) brightness(.85); }
.ms .plaka.berabere { filter:hue-rotate(180deg) saturate(.5); }
.ms .kanat { position:absolute; top:22px; z-index:1; width:72px; height:28px;
  background:linear-gradient(var(--bronz-isik),var(--bronz-isik)) 100% 0 / 100% 4px no-repeat, linear-gradient(var(--bronz),var(--bronz)) 100% 6px / 84% 4px no-repeat,
  linear-gradient(var(--bronz-2),var(--bronz-2)) 100% 12px / 66% 4px no-repeat, linear-gradient(var(--bronz-1),var(--bronz-1)) 100% 18px / 48% 4px no-repeat, linear-gradient(var(--bronz-0),var(--bronz-0)) 100% 24px / 30% 4px no-repeat; }
.ms .kanat svg { display:none; }
.ms .kanat.sol { left:84px; } .ms .kanat.sag { right:84px; transform:scaleX(-1); }
.ms h2 { margin:0; display:flex; align-items:center; justify-content:center; gap:14px; font:400 60px/1 var(--font-baslik); letter-spacing:4px; color:var(--ink); text-shadow:2px 2px 0 var(--bronz-0), 4px 4px 0 var(--bronz-0); }
.ms h2.zafer, .ms h2.yenilgi, .ms h2.berabere { color:var(--ink); }
.ms h2 svg { width:20px; height:20px; }
.ms h2.zafer svg { display:none; }
.ms h2.zafer::before, .ms h2.zafer::after { content:""; width:14px; height:14px; background:var(--halka-cekirdek); clip-path:polygon(50% 0, 64% 36%, 100% 50%, 64% 64%, 50% 100%, 36% 64%, 0 50%, 36% 36%); }
.ms h2.zafer::before { order:-1; }
.ms .alt { text-align:center; margin:2px 0 0; color:var(--soluk); min-height:0; line-height:28px; text-transform:uppercase; }
.ms .skr { display:inline-block; margin-right:12px; font:400 40px/1 var(--font-baslik); letter-spacing:2px; color:var(--ink); vertical-align:middle; }
.ms .ndn { text-align:center; color:var(--ink); margin:0 0 6px; text-transform:uppercase; line-height:40px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ms .tablo { padding:2px 14px; max-height:118px; overflow-y:auto; scrollbar-width:thin; scrollbar-color:var(--bronz-1) var(--panel-0); }
.ms table { width:100%; border-collapse:collapse; }
.ms th { text-align:left; font:400 32px/28px var(--font-etiket); color:var(--gold); padding:0 4px 4px; text-transform:uppercase; border-bottom:2px solid #2a3146; }
.ms td { padding:0 4px; height:30px; line-height:28px; color:var(--ink); text-transform:uppercase; } .ms td:last-child, .ms th:last-child { text-align:right; width:80px; }
.ms td:last-child { font:400 40px/28px var(--font-baslik); }
.ms td .bk { display:inline-flex; vertical-align:middle; margin-right:10px; }
.ms td small { color:var(--soluk); margin-left:10px; font-size:32px; }
.ms .tablo .yk { margin-top:3px; color:var(--soluk); text-align:right; }
.ms .satir { opacity:0; transition:opacity 83ms steps(1); } .ms .satir.gor { opacity:1; }
.ms .oduller { display:grid; grid-template-columns:170px 180px 1fr; gap:12px; margin-top:6px; padding:4px 12px; height:180px; overflow:visible; align-items:start; line-height:28px; }
.ms .oduller .yt { color:var(--soluk); font-size:32px; line-height:26px; }
.ms .ac { position:relative; display:flex; flex-direction:column; align-items:center; text-align:center; gap:2px; }
.ms .ac b.bas { font:400 32px/1 var(--font-etiket); color:var(--gold); text-transform:uppercase; font-weight:400; }
.ms .ac .say { font:400 48px/1 var(--font-baslik); color:var(--gold); letter-spacing:4px; text-shadow:2px 2px 0 #4a3208; font-variant-numeric:tabular-nums; }
.ms .ac svg { image-rendering:pixelated; }
.ms .ac[data-altin] { outline:none; cursor:default; }
.ms .ac[data-altin] ul { position:absolute; left:0; top:100%; z-index:5; display:none; min-width:220px; margin:4px 0 0; padding:8px 10px; list-style:none; text-align:left;
  background:var(--panel); box-shadow:inset 0 0 0 2px var(--bronz), 0 4px 0 var(--golge); color:var(--ink); font-size:32px; }
.ms .ac[data-altin]:hover ul, .ms .ac[data-altin]:focus-within ul, .ms .ac[data-altin]:focus ul, .ms .ac[data-altin].acik ul { display:block; }
.ms .ac[data-altin] .dokum { color:var(--soluk); font-size:32px; text-transform:uppercase; }
.ms .ac ul li { display:flex; justify-content:space-between; gap:12px; } .ms .ac ul li.c { color:#ffb070; }
.ms .ck0 { padding:8px 8px; background:var(--panel-0); box-shadow:inset 0 0 0 2px var(--bronz), inset 0 0 0 4px var(--harc); }
.ms .bsr { display:flex; flex-direction:column; gap:4px; max-height:164px; overflow-y:auto; scrollbar-width:thin; scrollbar-color:var(--bronz-1) var(--panel-0); }
.ms .bsk { display:grid; grid-template-columns:30px 1fr; gap:0 8px; align-items:center; padding:4px 8px; line-height:26px; background:var(--panel-0); box-shadow:inset 0 0 0 2px var(--bronz-1); }
.ms .bsk.tamam { box-shadow:inset 0 0 0 2px var(--turuncu); background:#2a1610; }
.ms .bsk .ad { font:400 32px/1.05 var(--font-etiket); color:var(--ink); text-transform:uppercase; }
.ms .bsk .ad em { font-style:normal; color:var(--gold); margin-right:6px; }
.ms .bsk .cb { grid-column:2; height:14px; background:#0d0f18; box-shadow:inset 0 0 0 2px var(--harc); overflow:hidden; }
.ms .bsk .cb i { display:block; height:100%; background:repeating-linear-gradient(90deg, var(--turuncu) 0 6px, transparent 6px 8px); }
.ms .bsk.tamam .cb i { background:repeating-linear-gradient(90deg, var(--gold) 0 6px, transparent 6px 8px); }
.ms .bsk .acl { grid-column:1 / -1; color:var(--gold); display:flex; align-items:center; justify-content:space-between; gap:8px; text-transform:uppercase; }
.ms .bsk .acl button { flex:none; min-height:28px; padding:2px 10px; font:400 32px/1 var(--font-etiket); }
.ms .dg { position:absolute; left:96px; right:96px; bottom:4px; display:flex; gap:40px; justify-content:center; }
.ms button { flex:0 1 224px; min-height:56px; padding:6px 16px; margin:0; cursor:pointer; pointer-events:auto; border:2px solid var(--harc); border-radius:0;
  background-color:var(--panel-2); color:var(--ink); font:400 40px/1 var(--font-baslik); letter-spacing:2px; text-transform:uppercase;
  box-shadow:inset 0 0 0 2px var(--bronz), inset 0 4px 0 0 #3a4258, 0 4px 0 0 var(--golge); }
.ms button.bir { background-color:var(--ana); color:var(--ana-yazi); border-color:var(--ana-kenar); font-size:60px; min-height:60px; text-shadow:2px 2px 0 var(--ana-alt);
  box-shadow:inset 0 0 0 2px var(--gold), inset 0 -10px 0 0 var(--ana-alt), 0 4px 0 0 var(--golge); }
.ms button:active:not(:disabled) { transform:translateY(4px); box-shadow:inset 0 0 0 2px var(--bronz); }
.ms button:disabled { color:var(--kapali-yazi); background-color:var(--tas-2); text-shadow:none; box-shadow:inset 0 0 0 2px var(--cerceve-0); cursor:default; }
.ms button.bir:disabled { font-size:40px; }
.ms button:focus-visible { outline:4px solid #fff; outline-offset:2px; }
.ms .ipc { position:absolute; right:-120px; bottom:20px; line-height:28px; text-align:right; color:var(--soluk); text-transform:uppercase; }
.ms .konfeti { position:absolute; inset:0; pointer-events:none; overflow:hidden; }
.ms .konfeti i { position:absolute; top:-10px; width:6px; height:6px; animation:dusus steps(12) forwards; }
@keyframes dusus { to { transform:translateY(560px); opacity:.25; } }
@media (prefers-reduced-motion: reduce) { .ms .konfeti { display:none; } }
.ms .menu { position:absolute; left:320px; top:150px; width:320px; padding:16px 18px; display:none; pointer-events:auto; border:10px solid transparent; border-image:var(--k-tas-cerceve) 5 fill / 10px / 0 round; }
.ms .menu.acik { display:block; }
.ms .menu h3 { margin:0 0 12px; font:400 40px/1 var(--font-baslik); letter-spacing:2px; text-transform:uppercase; }
.ms .menu p { margin:0 0 12px; }
.ms .menu .dg { position:static; display:flex; flex-direction:column; gap:10px; }
.ms .menu .dg button { flex:none; width:100%; }
.ms .menu .dg button.bir { font-size:40px; min-height:56px; }
.ms .menu .tut { position:relative; overflow:hidden; }
.ms .menu .tut i { position:absolute; left:0; top:0; bottom:0; width:0; background:rgba(200,38,37,.5); }
.ms .menu .not { margin-top:10px; color:var(--soluk); line-height:1.05; }
.ms .menu.genis { left:240px; top:40px; width:480px; }
.ms .ay { display:grid; grid-template-columns:1fr 170px; gap:6px 10px; align-items:center; margin-bottom:10px; text-transform:uppercase; }
.ms .ay button { flex:none; min-height:32px; padding:2px 8px; font:400 32px/1 var(--font-etiket); }
.ms .ck { display:flex; flex-wrap:wrap; align-items:center; gap:2px 6px; justify-content:center; margin-bottom:2px; text-transform:uppercase; line-height:26px; }
.ms .ck .ckad { width:100%; text-align:center; color:var(--ink); }
.ms .ck .xpb { display:block; width:100%; height:12px; background:#0d0f18; box-shadow:inset 0 0 0 2px var(--harc); overflow:hidden; }
.ms .ck .xpb i { display:block; height:100%; background:repeating-linear-gradient(90deg, var(--sen) 0 6px, transparent 6px 8px); }
.ms .ck small { width:100%; text-align:center; color:var(--soluk); font-size:32px; }
.ms .ck em { width:100%; text-align:center; font-style:normal; color:var(--gold); }
.ms .hlk { display:inline-flex; gap:4px; } .ms .hl { width:10px; height:10px; box-shadow:inset 0 0 0 2px var(--halka-sonuk); }
.ms .hl.on { background:var(--halka); box-shadow:none; } .ms .hl.yeni { background:var(--halka-cekirdek); box-shadow:0 0 0 2px var(--halka); }
/* MOBIL-1: çerçeve telefonda küçülür (×0,7); düğmeler en az 44 CSS px (--dk = 1 / ölçek) */
html[data-dokunmatik] .ms button { min-height:max(56px, calc(44px * var(--dk, 1))); }
html[data-dokunmatik] .ms .ay button, html[data-dokunmatik] .ms .bsk .acl button { min-height:calc(44px * var(--dk, 1)); }
html[data-dokunmatik] .ms .menu { top:50%; transform:translateY(-50%); max-height:532px; overflow-y:auto; overscroll-behavior:contain; }
html[data-dokunmatik] .ms .menu .dg { gap:6px; }
html[data-dokunmatik] .ms .ipc { display:none; }
html[data-dokunmatik] .ms .oduller { height:164px; }
.ms .hrt { line-height:24px; text-align:left; font-size:28px; }
.ms .hrt .yildizlar { display:flex; gap:10px; flex-wrap:wrap; }
.ms .hrt .yz { color:var(--soluk); }
.ms .hrt .yz.dolu { color:var(--gold, #fcd35a); }
.ms .hrt .yz.yeni { text-decoration:underline; }
.ms .hrt .hodul { color:var(--ink, #fff); }
.ms .hrt .hasama, .ms .hrt .hacilan { color:var(--turuncu, #e8762f); text-transform:uppercase; }
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
  haritaTavani: "Bugünlük harita ödülü bitti (10/10) · 04:00'te yenilenir.", kisaMac: "20 saniyeden kısa maç sayılmaz.",
};
const YILDIZ_AD: Record<string, string> = {
  kazan: "Kazan", temiz: "Temiz kazan", hizli: "60 sn'de kazan", ringOut: "Ring Out ile puan", durma: "Durma ile puan", parcalanma: "Parçalanma ile puan", yetenekBitis: "Yetenekle bitir",
};
const KADEME_AD = ["Demir", "Kaya", "Don", "Kor", "Kasırga", "Şimşek", "Girdap", "Devir Taşı"];
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
  /** MOBIL-1: dokunmatik denetim (yalnız dokunmatik cihazda) */
  private dokun: DokunmatikKontrol | null = null;

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
    // kutsal canavar hologramı topacın çizildiği yerden çıkar (RuhGorsel, docs/art/ruh-entegrasyon-notu.md)
    this.yetenekGorsel.ruh.topacKonumu = (i) => { const g = this.gorseller[i]; return g ? { x: g.kok.x, y: g.kok.y } : null; };
    // iptal bölgesi: alt şerit (mantıksal y > 492, ux § 1)
    this.girdi.iptalBolgesi = (px, py) => { const c = this.sahne.cerceve(); return (py - c.y) / c.olcek > 492; };
    if (dokunmatikMi()) {
      this.dokun = new DokunmatikKontrol(b.ustYazi, this.girdi, {
        menu: () => this.menuAcKapa(),
        ses: () => this.sesDegistir(),
        geriCek: () => this.geriCek(),
        k: () => this.sahne.k,
        ben: () => { const t = this.dunya.topaclar[this.yerel]!; return { x: t.x, z: t.z }; },
        fare: (e) => this.girdi.fareOlayi(e),
      });
    }
    uyanikTut(true);
    this.ayarlariUygula();
    Ses.yukle();
    Ses.muzikBaslat();
    this.efektler.sesKanca = (ad, hacim, perde) => Ses.cal(ad, hacim, perde);
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
  durdur(): void {
    Ses.muzikDurdur(); this.b.app.ticker.stop(); window.clearInterval(this.agZamanlayici); window.removeEventListener("keydown", this.tus, { capture: true });
    this.dokun?.yokEt(); this.dokun = null; uyanikTut(false);
  }
  /** Debug (MOBIL-1 doğrulama): dokunmatik katman sayaçları ve düğme yerleri. */
  get dokunmatik(): { sayac: DokunmatikKontrol["sayac"]; yer: DokunmatikKontrol["yer"]; yon: { x: number; z: number }; nisan: { x: number; z: number }; eziliyor: boolean } | null {
    if (!this.dokun) return null;
    return { sayac: { ...this.dokun.sayac }, yer: this.dokun.yer, yon: this.girdi.dokunYonu ?? { x: 0, z: 0 }, nisan: this.girdi.nisanNoktasi(this.sahne, this.dunya.topaclar[this.yerel]!), eziliyor: this.girdi.nisanEziliyor };
  }

  // ---- hata ayıklama kancaları (Playwright) ----
  get durum(): Dunya { return this.dunya; }
  get sayac(): Efektler["sayac"] { return this.efektler.sayac; }
  get olaylar(): Olay[] { return this.sonOlaylar; }
  get sonucAcik(): boolean { return this.sonucOrt.classList.contains("acik"); }
  /** Debug: Enerji'yi doldurur (uçtan uca doğrulama; yalnız ?debug). */
  enerjiDoldur(i = this.yerel, miktar = ENERJI_TAVAN): void { this.dunya.topaclar[i]!.enerji = Math.min(ENERJI_TAVAN, miktar); }
  get ses(): { sayac: Record<string, number>; calinan: Record<string, number>; yuklenen: string[]; hatalar: string[]; acik: boolean; bagli: boolean; baglam: string } {
    return { sayac: { ...Ses.sayac }, calinan: { ...Ses.calinan }, yuklenen: [...Ses.yuklenen], hatalar: [...Ses.hatalar], acik: Ses.acikMi, bagli: Ses.bagliMi, baglam: Ses.baglamDurumu };
  }
  get gorselSayac(): YetenekGorsel["sayac"] { return { ...this.yetenekGorsel.sayac }; }
  get ayar(): OyunAyarlari { return { ...this.ayarlar }; }
  get girdiDurumu(): { basili: number; iptal: number; nisanModu: string } { return { basili: this.girdi.basiliYuva, iptal: this.girdi.iptalSayisi, nisanModu: this.girdi.nisanModu }; }

  /** M tuşu ve H16 ses düğmesi. */
  private sesDegistir(): void {
    const acik = Ses.degistir();
    this.ayarlar = { ...this.ayarlar, ses: acik ? "acik" : "kapali" };
    ayarlariYaz(this.ayarlar);
    this.hud.sesDurumu(acik);
    this.hud.bantGoster(acik ? "Ses açık" : "Ses kapalı", 1);
  }

  private ayarlariUygula(): void {
    const a = this.ayarlar;
    const h = hisAyari(a);
    this.efektler.ayar = h;
    this.sahne.sarsintiAyari(h.sarsinti);
    this.yetenekGorsel.flas = a.flas;
    this.yetenekGorsel.ipucuAcik = sekmeIpucuGoster();
    this.girdi.nisanModu = a.nisan;
    if (a.ses === "acik") Ses.ac(); else Ses.kapat();
    (this.hud as MacHud | undefined)?.sesDurumu(a.ses === "acik");
  }
  get menuAcik(): boolean { return this.menu.classList.contains("acik"); }
  /** Ekran görüntüsü için: bu olaylardan biri olunca `kare` render karesi sonra ticker'ı durdur (yalnız ?debug). */
  olaydaDur(turler: Olay["tur"][], kare: number, i = -1): void { this.durTalebi = { turler, kare, oldu: null, i }; }
  /** Debug (GU-B ekran görüntüsü / fare nişanı): sim noktası → sayfa CSS koordinatı (hibrit izdüşüm dahil). */
  ekranNoktasi(x: number, z: number): { x: number; y: number } {
    const S = this.sahne;
    const e = S.dunyadanEkrana(S.ekranX(x), S.ekranY(z));
    const c = S.cerceve();
    const r = this.b.app.canvas.getBoundingClientRect();
    return { x: r.left + c.x + e.x * c.olcek, y: r.top + c.y + e.y * c.olcek };
  }
  get kameraKipi(): string { return this.sahne.kip; }
  /** Debug ölçüm: kare başına CPU işi (mantık + Pixi render; ms). Ticker'a en önde ve render'dan sonra kanca. */
  olcumBaslat(): { isMs: number[] } {
    const o = { isMs: [] as number[] };
    let bas = 0;
    this.b.app.ticker.add(() => { bas = performance.now(); }, null, UPDATE_PRIORITY.INTERACTION + 10);
    this.b.app.ticker.add(() => { if (bas) o.isMs.push(performance.now() - bas); }, null, UPDATE_PRIORITY.UTILITY - 10);
    return o;
  }
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
        const iz = new Iz(ELEMENT_RENK[this.dunya.profiller[i]!.element].acik, this.sahne.hibrit ? this.sahne.k : 0);
        this.sahne.izKatmani.addChild(iz.kap);
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
    this.hud.sesTik = () => this.sesDegistir();
    if (this.dokun) this.hud.dokunmatikAc();
    this.b.ustYazi.appendChild(this.ust); // sonuç/menü HUD'un üstünde
  }

  private gorselYenile(i: number): void {
    const p = this.dunya.profiller[i]!;
    this.gorseller[i]!.profilAyarla(p, i === this.yerel ? "oyuncu" : "rakip");
    this.gorseller[i]!.sifirla();
    this.izler[i]!.sifirla();
    this.izler[i]!.renk = ELEMENT_RENK[p.element].acik;
    this.izler[i]!.donus = p.donus === "sol" ? -1 : 1;
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
    if (e.code === "KeyM" && !e.repeat) { this.sesDegistir(); return; }
    if (e.code === "KeyF" && !e.repeat) { e.preventDefault(); this.tamEkran(); return; }
    if (this.menuAcik) return;
    if (e.code === "Tab") {
      e.preventDefault();
      if (!e.repeat) this.geriCek();
      return;
    }
    const m = /^Digit([1-3])$/.exec(e.code) ?? /^Numpad([1-3])$/.exec(e.code);
    if (m && d.mac.faz === "turArasi") this.secimIste(Number(m[1]) - 1);
  };

  /** Tab ve dokunmatik GERİ ÇEK: stamina %25 altındaysa sıradaki üyeyle değiş, değilse nedenini bantta söyle. */
  private geriCek(): void {
    const d = this.dunya;
    if (d.mac.faz !== "tur" || this.menuAcik) return;
    if (geriCekAcik(d, this.yerel)) this.bekleyenDegistir = siradakiUye(d.takimlar![this.yerel]!);
    else this.hud.bantGoster(d.topaclar[this.yerel]!.geriCekKalan > 0 ? "Geri çekiliyor…" : d.takimlar![this.yerel]!.geriCekBekleme > 0 ? "Geri çek beklemede." : "Geri çekmek için stamina %25'in altında olmalı.", 1.6);
  }

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
      if (this.dokun && tamEkranVar()) {
        const te = el("button", "", dg, document.fullscreenElement ? "Tam ekrandan çık" : "Tam ekran");
        te.dataset["eylem"] = "tam-ekran";
        te.addEventListener("click", () => { tamEkranDegistir(); this.menuAcKapa(false); });
      }
      if (!this.egitim) {
        const teslim = el("button", "", dg, "Teslim ol");
        teslim.addEventListener("click", () => { this.menuGoster("teslim"); });
      }
      el("div", "not", m, this.dokun ? "Maç durmaz." : "Maç durmaz. Esc ile kapat.");
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

  private kare = (): void => { this.kareIsle(Math.min(this.b.app.ticker.deltaMS / 1000, 0.25)); };
  /** GU-E debug (yalnız ?debug, ekran görüntüsü kare şeridi): ticker durmuşken sabit `dt` ile tek kare işle ve çiz. */
  kareAt(dt: number): void { this.kareIsle(dt); this.b.app.render(); }

  private kareIsle(dt: number): void {
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
  }

  private ciz(dt: number, alfa: number): void {
    const d = this.dunya;
    const S = this.sahne;
    S.boyutla(false, dt);
    const c = S.cerceve();
    if (this.dokun) this.hud.dokunmatikYer(this.dokun.yer);
    this.hud.hizala(c.x, c.y, c.olcek);
    this.ust.style.transform = `translate(${c.x}px, ${c.y}px) scale(${c.olcek})`;
    if (this.dokun) this.dokunmatikGuncelle(d, c);
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
      // giriş koruması: yarı saydam yanıp söner; geri çekilen: hızlı nabız
      g.kok.alpha = t.koruma > 0 ? 0.55 + 0.25 * Math.sin(this.zaman * 20) : t.geriCekKalan > 0 ? 0.7 + 0.3 * Math.sin(this.zaman * 30) : g.kok.alpha < 1 && aktifMi(t) ? 1 : g.kok.alpha;
      g.catlakAyarla(t.tik / p.parametreler.burstEsik);
      const kademeGucu = g.kademeAdi === "yuksek" ? 1 : g.kademeAdi === "orta" ? 0.6 : 0.25;
      const hiz = kok2(t.vx, t.vz) / p.sim.vSurus;
      const serit = aktifMi(t) && kusakta(t, d.arenaYaricap);
      this.izler[i]!.guncelle(ekran.x, ekran.y, aktifMi(t) ? Math.min(1, hiz * (serit ? 1.6 : 1)) * kademeGucu * (t.dashKalan > 0 ? 1.6 : 1) : 0, serit, dt);
    });
    const daralma = d.mac.aniOlum ? Math.min(1, d.mac.aniOlumTick / MAC_ADIM.aniOlumDaralma) : 0;
    S.arena.guncelle(dt, d.arenaYaricap, d.topaclar.some((t) => aktifMi(t) && kusakta(t, d.arenaYaricap)), d.mac.aniOlum ? Math.max(0.05, daralma) : 0);
    kenarUyarisiCiz(this.kenarUyari, d, this.yerel, S, this.zaman);
    // H9 nişan (yalnız Fare modu; "Hareket yönü" modunda çizgi çizilmez) + H13 telegraf + dekaller + Ulti anı
    const basili = this.menuAcik ? -1 : this.girdi.basiliYuva;
    const nisan = basili >= 0 && basili < 3 && (this.girdi.nisanModu === "fare" || this.girdi.dokunmatik) ? { yuva: basili, ...this.girdi.nisanNoktasi(S, d.topaclar[this.yerel]!) } : null;
    this.yetenekGorsel.guncelle(d, dt, nisan);
    this.hud.guncelle(d, dt, basili);
    if (S.hibrit) {
      // topaç gövde kutusu (ekran): zemin noktasından yukarı ~70 px, yanlara ~48 px (çizim ölçeği dahil)
      this.hud.ortusmeAyarla(d.topaclar.filter((t) => aktifMi(t)).map((t) => {
        const e = S.dunyadanEkrana(S.ekranX(t.x), S.ekranY(t.z));
        return { x0: e.x - 48, y0: e.y - 72, x1: e.x + 48, y1: e.y + 26 };
      }));
    }
    this.sesKancalari(dt);
  }

  /** MOBIL-1: dokunmatik katmanın durumu (oto-nişan adayları, faz, Menü/Ses/GERİ ÇEK yerleri, --dk ölçeği). */
  private dokunmatikGuncelle(d: Dunya, c: { x: number; y: number; olcek: number }): void {
    const dk = this.dokun!;
    const r = d.topaclar[this.rakip]!;
    this.girdi.rakipler = [{ x: r.x, z: r.z, aktif: aktifMi(r) }];
    const tk = d.takimlar?.[this.yerel];
    const faz = d.mac.faz;
    const s = c.olcek;
    const dkStr = String(1 / s);
    if (this.ust.style.getPropertyValue("--dk") !== dkStr) { this.ust.style.setProperty("--dk", dkStr); this.hud.kok.style.setProperty("--dk", dkStr); }
    const dugmeler = faz === "tur" || faz === "geriSayim";
    this.hud.dokunmatikDugmeler(dugmeler);
    dk.guncelle({
      dugmeler,
      y4: yuvaYetenegi(d, this.yerel, 3) >= 0,
      geriCek: faz === "tur" && !!tk && geriCekAcik(d, this.yerel),
      kilitli: this.menuAcik || this.sonucAcik || faz === "bitti",
      geriCekYeri: this.hud.geriCekYeri(c),
      menuYeri: { x: Math.round(c.x + 396 * s - 48), y: Math.round(c.y + 4 * s) },
      sesYeri: { x: Math.round(c.x + 564 * s + 4), y: Math.round(c.y + 4 * s) },
      sesAcik: Ses.acikMi,
    });
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
      for (const yon of ["sol", "sag"]) el("div", `kanat ${yon}`, k).setAttribute("aria-hidden", "true");
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
    altin.tabIndex = 0; // KM-6: gelir dökümü ikinci katta (odak / üzerine gel)
    altin.setAttribute("aria-label", "Altın: döküm için odaklan");
    // MOBIL-1: üzerine gelme olmayan cihazda dokunuş dökümü aç/kapa yapar
    altin.addEventListener("click", () => altin.classList.toggle("acik"));
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
    if (mod === "harita") {
      const h = el("button", "bir pah", dg, "Harita");
      h.dataset["eylem"] = "harita";
      h.addEventListener("click", () => { void this.ag?.baglanti.ayril().finally(() => { location.search = "?ekran=harita&donus=1"; }); });
      queueMicrotask(() => h.focus());
    }
    const oda = this.ag && mod === "oda";
    const tekrar = el("button", mod === "harita" ? "pah" : "bir pah", dg, oda ? "Rövanş" : "Tekrar");
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
    this.sonucOrt.classList.add("acik", "k-gece");
    this.hud.kok.style.opacity = "0.35";
    if (mod !== "harita") queueMicrotask(() => tekrar.focus());
  }

  /** ZAFER taş kıymığı + kıvılcım (KM-7; konfeti yerine; ≤ 60 parça, 2-3 sn, bir kez; "Parçacık: Az" ×0,4). */
  private konfeti(): void {
    const n = Math.round(48 * (this.ayarlar.parcacik === "az" ? 0.4 : 1));
    const k = el("div", "konfeti", this.sonucOrt);
    const renk = ["#8f877c", "#5a5460", "#6e6a66", "#e8762f", "#fcd35a", "#3a3640"];
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
    el("span", "dokum", altin, "Döküm");
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
    if (o.harita) this.haritaOdulYaz(o.harita, bas);
    else if (o.mod === "oda") el("span", "yt", bas, "Oda maçı: yalnız Sosyal başarımlar sayılır.");
    if (!liste.length && !o.harita) el("div", "bsk pah", bas).innerHTML = `<span>${BASARIM_IKON}</span><span class="ad">Başarım</span><span class="yt" style="grid-column:2">Bu maçta ilerleme yok.</span>`;
    for (const x of liste.slice(0, o.harita ? 1 : 3)) {
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
          const sp = el("span", "", acl, "Market'te açıldı: ");
          sp.appendChild(parca3bIkonEl(p.id, null, 16)); // TEMIZLIK #4: 3B parça ikonu (ortak önbellek, tembel)
          sp.append(p.ad);
          ikonlariYukselt(acl);
          const g = el("button", "pah", acl, "Markete git");
          g.dataset["marketeGit"] = p.id;
          g.addEventListener("click", () => { location.search = `?ekran=market&parca=${p.id}`; });
        } else el("span", "", acl, `Tamamlandı · +${x.odulAltin} Altın`);
      }
    }
    if (this.sonucAdim >= this.sonucSatirlari.length) this.altinSayBitir();
  }

  /** Harita eki: ★★☆ yıldızlar (yeni yananlar işaretli), ödül, aşama, açılan düğümler, sayaç. */
  private haritaOdulYaz(h: NonNullable<Extract<BilgiMesaji, { tur: "odul" }>["harita"]>, bas: HTMLElement): void {
    const hp = el("div", "hrt", bas);
    hp.dataset["haritaOdul"] = "1";
    hp.dataset["yildiz"] = String(h.yildiz);
    hp.dataset["asama"] = String(h.asama);
    const yr = el("div", "yildizlar", hp);
    h.sartlar.forEach((s, i) => {
      const alindi = (h.yildiz & (1 << i)) !== 0;
      const yeni = (h.maske & (1 << i)) !== 0 && alindi;
      const y = el("span", `yz${alindi ? " dolu" : ""}${yeni ? " yeni" : ""}`, yr, `${alindi ? "★" : "☆"} ${YILDIZ_AD[s] ?? s}`);
      y.setAttribute("aria-label", `${YILDIZ_AD[s] ?? s}: ${alindi ? "alındı" : "alınmadı"}`);
    });
    const parcalar: string[] = [];
    if (h.altin) parcalar.push(`+${h.altin} ALTIN`);
    for (const c of h.cevher) parcalar.push(`+${c.adet} ${KADEME_AD[c.kademe - 1]!.toUpperCase()}`);
    for (const c of h.kulce) parcalar.push(`+${c.adet} ${KADEME_AD[c.kademe - 1]!.toUpperCase()} KÜLÇESİ`);
    if (h.rozetAltini) parcalar.push(`ROZET +${h.rozetAltini} ALTIN`);
    el("div", "hodul", hp, h.gecersiz ? (BASARIM_SAYILMADI[h.gecersiz] ?? "Bu maç sayılmadı.") : parcalar.length ? parcalar.join(" · ") : "Bu maçta ödül yok.");
    const as = ["", "", "KEŞFET", "TEMİZLE", "USTALAŞ"];
    if (h.asama > h.asamaOnce) el("div", "hasama", hp, `DÜĞÜM: ${as[h.asama] ?? ""}`);
    if (h.acilan.length) el("div", "hacilan", hp, h.bolgeAcildi ? "YENİ BÖLGE AÇILDI" : `${h.acilan.length} YENİ DÜĞÜM AÇILDI`);
    el("div", "hsayac yt", hp, h.sayilan ? `Sayılan harita maçı ${h.sayilanMac}/${h.tavan}` : "BUGÜNLÜK ÖDÜL BİTTİ · 04:00");
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
