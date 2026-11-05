import { ELEMENT_CARKI, type ElementAdi } from "../../paylasilan/kurallar/ayar.ts";
import {
  type Envanter, type Taslak, type TaslakTopac, type TakimDegerlendirmesi, type YuvaTuru, YUVA_AD, YUVA_TURLERI, bosTopac, bosYuvaMetni,
  parcaGorunumu, parcaTak, takimDegerlendir, takimHataMetni, yuvaTasi,
} from "../../paylasilan/kurallar/atolye.ts";
import { type CubukOzeti, CUBUK_AD, CUBUK_SIRA, type CubukAnahtari, DESEN_AD, TIP_AD, cubukFarki, profilCubuklari } from "../../paylasilan/veri/cubuklar.ts";
import { BASLANGIC_SETLERI, PARCALAR, cekirdekBul, parcaBul } from "../../paylasilan/veri/katalog.ts";
import { type TopacProfili, topacProfiliKur } from "../../paylasilan/veri/profil.ts";
import type { Parca, Tip } from "../../paylasilan/veri/semalar.ts";
import type { EkranBaglami } from "../main.ts";
import { type AtolyeCekirdegi, type AtolyeGorunumu, BakimHatasi, GORULEN_SEVIYE, HESAP_HATA, apiIstek, apiPost, atolyeGetir, git, oku, sakla } from "../hesap.ts";
import { ELEMENT_RENK } from "../oyun/renkler.ts";
import { AtolyeSahnesi } from "../atolye3d/AtolyeSahnesi.ts";
import type { KatmanTuru } from "../atolye3d/durum.ts";
import { cikintiSayisi } from "../atolye3d/geometri.ts";
import type { TopacKurulumu } from "../atolye3d/tipler.ts";
import { acilirMenu, anaEylem, bakimKatmani, ekranKok, el, gelistirAcik } from "./arayuz.ts";
import { parcaPikselIkonu, pikselTopac } from "./pikselTopac.ts";
import { pergelKur } from "../bilgic/Pergel.ts";
import { sonMacDurumu } from "../bilgic/secim.ts";

// Atölye (D6, US-2.1; ux § 3.2 ana ekran) · ATOLYE3D: referans 03'ün birebir düzeni (docs/design/beyblade/gorunum/03-atolye.jpg).
// Sol: parça ızgarası (4 ikonlu sekme ÇEKİRDEK / GÖVDE / DİSK / UÇ, 4 sütunlu ikon ızgarası, takılı parça turuncu çerçeve;
// Sende / Market'te + fiyat / Kilitli / ??? hâlleri; filtre tek düğme). Orta: blueprint üstünde seçili topaç adı + element
// simgesi ve GERÇEK ZAMANLI 3B patlatılmış görünüm (src/istemci/atolye3d: Çekirdek, Gövde, Disk, Uç dikey ayrı, etiket +
// turuncu bağlantı çizgisi; sürükle/ok tuşu döndür, katmana tıkla → parça öne çıkar + parça kartı, BİRLEŞTİR / AYIR;
// envanterde parçanın üzerine gelince topaçta canlı önizleme, tıklayınca tak). Sağ-orta: ALTI çubuk (turuncu dolgu, değer,
// fark ±) + tip + element uyumu tek satır. En sağ: TAKIM (3 kart: element simgesi, ad, mini topaç, mini çubuklar, sıra
// okları ve sürükle-bırak; TAKIM ULTİSİ rozeti yalnız oluşunca). Alt: MARKET · BAŞARIMLAR · DENE ikincil, OYNA ana.
// İkinci kat: Ayrıntı (Uç deseni, yön, Yapay yön, Dene rakibi, çıkar), takım menüsü, Daha fazla (Günlük, Profil).
// Kural ve sayı paylaşılan saf koddan (sunucu aynı kuralla yetkili doğrular).

const KOKEN_AD: Record<string, string> = { goktasi: "Göktaşı", maden: "Maden", yapay: "Yapay", karanlik: "Karanlık" };
const TASLAK_ANAHTAR = "devran.atolyeTaslak.v1";
const BOS_SEKME = "Burada henüz parça yok. Market'ten alabilir ya da başarımla açabilirsin.";

const STIL = `
.at.k-zemin { overflow:hidden; }
.at [hidden] { display:none !important; }
.at .k-govde { min-height:0; padding:calc(6 * var(--p)) calc(4 * var(--p)) calc(6 * var(--p)); align-items:stretch; }
/* referans 03: dış çerçeve taş, içi blueprint; paneller koyu lacivert + açık kenar (#1B2131 / #BFABA0) */
.at .kart.at-kart { min-height:0; width:100%; max-width:none; padding:calc(3 * var(--p)) calc(3 * var(--p)) calc(40 * var(--p)); position:relative; flex:1; display:flex; flex-direction:column; overflow:hidden; }
.at .at-pano { background:var(--panel); box-shadow:0 0 0 var(--p) #0a0c14, inset 0 0 0 var(--p) #bfaba0, inset 0 0 0 calc(2 * var(--p)) #0a0c14, inset 0 calc(3 * var(--p)) 0 0 #262e45; padding:calc(5 * var(--p)); }
.at .kutu { overflow-y:auto; overflow-x:hidden; min-height:0; min-width:0; scrollbar-width:thin; scrollbar-color:var(--bronz-1) var(--panel-0); }
.at .uc3 { flex:1; min-height:0; padding:calc(4 * var(--p)); box-shadow:inset 0 0 0 var(--p) #0a0c14; display:grid; grid-template-columns:calc(214 * var(--p)) minmax(0,1fr) calc(110 * var(--p)) calc(94 * var(--p)); gap:calc(4 * var(--p)); align-items:stretch; }
.at h3 { margin:0 0 calc(4 * var(--p)); font:400 var(--y-16)/.75 var(--font-etiket); color:var(--gold); letter-spacing:0; }
/* sol: 4 ikonlu sekme + 4 sütunlu ızgara */
.at .sekmeler { display:flex; gap:calc(2 * var(--p)); margin:0 0 calc(4 * var(--p)); border-bottom:var(--p) solid #bfaba0; }
.at .sekmeler button { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; align-items:center; gap:var(--p); padding:calc(2 * var(--p)) calc(2 * var(--p)) calc(3 * var(--p)); cursor:pointer; border:0; border-radius:0; margin-bottom:calc(-1 * var(--p));
  background:#151a28; color:var(--soluk); font:400 var(--y-16)/.5625 var(--font-etiket); text-transform:uppercase; box-shadow:inset 0 0 0 var(--p) #4a4f66, var(--odak-g, 0 0 0 0 transparent); }
.at .sekmeler button[aria-selected=true] { color:var(--ink); background:var(--hucre); box-shadow:inset var(--p) var(--p) 0 0 #bfaba0, inset calc(-1 * var(--p)) 0 0 0 #bfaba0, var(--odak-g, 0 0 0 0 transparent); }
.at .sekmeler .sk-ik { width:calc(16 * var(--p)); height:calc(16 * var(--p)); display:grid; place-items:center; overflow:hidden; }
.at .sekmeler .sk-ik canvas { width:calc(16 * var(--p)) !important; height:calc(16 * var(--p)) !important; image-rendering:pixelated; }
.at .sekmeler .sk-ik canvas.k-parca { width:calc(16 * var(--p)) !important; height:calc(12 * var(--p)) !important; }
.at .filtre-satir { display:flex; gap:calc(3 * var(--p)); margin-bottom:calc(3 * var(--p)); align-items:center; }
.at .filtre-satir .ipucu { margin:0 0 0 auto; color:var(--soluk); text-transform:uppercase; }
.at .filtre { display:grid; grid-template-columns:1fr 1fr; gap:calc(2 * var(--p)); margin-bottom:calc(4 * var(--p)); padding:calc(3 * var(--p)); background:#100e16; box-shadow:inset 0 0 0 var(--p) var(--bronz-1); }
.at .filtre select, .at .dene select { text-transform:uppercase; font:400 var(--y-16)/1 var(--font-etiket); }
.at .filtre option, .at .dene option { text-transform:uppercase; background:var(--panel); color:var(--ink); }
.at .filtre select { min-height:calc(16 * var(--p)); padding:var(--p) calc(12 * var(--p)) var(--p) calc(3 * var(--p)); min-width:0; }
.at .liste { display:grid; grid-template-columns:repeat(4, calc(50 * var(--p))); gap:calc(2 * var(--p)); align-content:start; }
.at .pc { position:relative; padding:calc(2 * var(--p)) var(--p) calc(3 * var(--p)); display:flex; flex-direction:column; align-items:center; gap:var(--p); cursor:pointer; min-height:calc(54 * var(--p));
  background:var(--hucre); color:var(--ink); border:0; border-radius:0; box-shadow:inset 0 0 0 var(--p) #3a4258, inset 0 calc(2 * var(--p)) 0 0 var(--hucre-isik), var(--odak-g, 0 0 0 0 transparent); font:400 var(--y-16)/.5625 var(--font-etiket); text-transform:uppercase; }
.at .pc:hover { box-shadow:inset 0 0 0 var(--p) #bfaba0, var(--odak-g, 0 0 0 0 transparent); }
.at .pc .ik { width:calc(32 * var(--p)); height:calc(32 * var(--p)); display:grid; place-items:center; flex:none; }
.at .pc .ik canvas { image-rendering:pixelated; }
.at .pc .ik canvas.g3-ikon { width:calc(32 * var(--p)); height:calc(32 * var(--p)); }
.at .pc .ad { text-align:center; color:var(--ink); white-space:normal; overflow-wrap:normal; max-width:100%; }
.at .pc .et { position:absolute; right:var(--p); top:calc(24 * var(--p)); }
.at .pc .et:empty { display:none; }
.at .pc .et.k-rozet { font:400 var(--y-16)/.5625 var(--font-etiket); padding:var(--p) calc(2 * var(--p)); }
.at .pc .kilit-et { background:#20232f; color:#ffb070; box-shadow:inset 0 0 0 var(--p) #59607a; padding:var(--p) calc(2 * var(--p)); }
/* takılı (seçili topaçta): turuncu çerçeve + köşe (referans 03) */
.at .pc.takili { box-shadow:inset 0 0 0 var(--p) #8a5a34, var(--odak-g, 0 0 0 0 transparent); }
.at .pc.bu { box-shadow:inset 0 0 0 var(--p) var(--turuncu), inset 0 0 0 calc(2 * var(--p)) #0a0c14, var(--odak-g, 0 0 0 0 transparent); }
.at .pc.bu::before, .at .pc.bu::after { content:""; position:absolute; width:calc(6 * var(--p)); height:calc(6 * var(--p)); pointer-events:none; }
.at .pc.bu::before { left:calc(-2 * var(--p)); top:calc(-2 * var(--p)); border-left:var(--p) solid var(--gold); border-top:var(--p) solid var(--gold); }
.at .pc.bu::after { right:calc(-2 * var(--p)); bottom:calc(-2 * var(--p)); border-right:var(--p) solid var(--gold); border-bottom:var(--p) solid var(--gold); }
.at .pc .tk { position:absolute; left:var(--p); top:var(--p); padding:0 var(--p); font:400 var(--y-16)/.5625 var(--font-etiket); }
.at .pc.kilitli { background:#171a26; }
.at .pc.kilitli .ik, .at .pc.gizli .ik { opacity:.45; }
.at .pc.kilitli .ad { color:var(--kilitli-yazi); }
.at .pc.gizli { background:#0e1018; }
.at .pc.gizli .ad { color:var(--kilitli-yazi); }
.at .pc .kilit-ik { position:absolute; right:calc(2 * var(--p)); top:calc(2 * var(--p)); }
.at .bosmsj { grid-column:1/-1; padding:calc(10 * var(--p)) calc(4 * var(--p)); color:var(--soluk); text-align:center; border:var(--p) dashed #3a3f55; line-height:.875; }
/* orta: başlık + 3B patlatılmış görünüm */
.at .orta-kutu { position:relative; display:flex; flex-direction:column; min-width:0; min-height:0; }
.at .at-baslik { display:flex; align-items:center; gap:calc(4 * var(--p)); min-height:calc(20 * var(--p)); padding:0 0 calc(2 * var(--p)) calc(2 * var(--p)); margin:0 0 calc(2 * var(--p));
  border-bottom:var(--p) solid #bfaba0; font:400 var(--y-20)/1 var(--font-baslik); letter-spacing:var(--yp); color:var(--ink); text-transform:uppercase; text-shadow:var(--p) var(--p) 0 #05060a; }
.at .at-baslik span:last-child { overflow-wrap:anywhere; }
.at .g3 { position:relative; flex:1; min-height:0; overflow:hidden; background:transparent; }
.at .g3-hayalet { position:absolute; inset:0; pointer-events:none; }
.at .g3-hayalet svg { width:100%; height:100%; display:block; }
.at .g3-tuval { position:absolute; left:0; top:0; image-rendering:pixelated; outline:none; cursor:grab; }
.at .g3-tuval:focus-visible { box-shadow:inset 0 0 0 calc(2 * var(--p)) #fff; }
.at .g3-katmanlar { position:absolute; inset:0; pointer-events:none; }
.at .g3-etiket { position:absolute; left:0; transform:translateY(calc(-100% + 0 * var(--p))); pointer-events:auto; display:flex; flex-direction:column; align-items:flex-start; gap:var(--p); padding:var(--p) calc(2 * var(--p)); width:calc(50 * var(--p));
  background:transparent; color:var(--ink); border:0; border-radius:0; cursor:pointer; text-align:left; font:400 var(--y-16)/.5625 var(--font-etiket); text-transform:uppercase; box-shadow:var(--odak-g, 0 0 0 0 transparent); }
.at .g3-etiket small { font:400 var(--y-16)/.5625 var(--font-etiket); color:var(--ink); text-shadow:var(--p) var(--p) 0 #05060a; }
.at .g3-etiket span { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
.at .g3-etiket.bos small { color:#ffb070; }
.at .g3-etiket.onizleme small { color:var(--yesil); }
.at .g3-etiket:hover small, .at .g3-etiket[aria-pressed=true] small { color:var(--gold); }
.at .g3-cizgi { position:absolute; height:var(--p); background:var(--turuncu); margin-top:calc(1 * var(--p)); }
.at .g3-cizgi.sag { margin-top:0; opacity:.8; }
.at .g3-arac { position:absolute; right:var(--p); bottom:var(--p); display:flex; gap:calc(3 * var(--p)); }
.at .k-sr { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
.at .ayrinti { position:absolute; inset:calc(24 * var(--p)) var(--p) var(--p); z-index:3; overflow:auto; display:flex; flex-direction:column; gap:calc(4 * var(--p)); }
.at .ayrinti .ayr-bas { color:var(--gold); text-transform:uppercase; }
/* sağ-orta: altı çubuk (referans 03: turuncu dolgu + değer) */
.at .cubuk-sutun { display:flex; flex-direction:column; padding-top:calc(24 * var(--p)); }
.at .cubuk { display:grid; grid-template-columns:1fr auto auto; grid-template-rows:auto auto; gap:var(--p) calc(3 * var(--p)); align-items:end; margin:0 0 calc(4 * var(--p)); }
.at .cubuk .ad { grid-column:1; text-transform:uppercase; text-shadow:var(--p) var(--p) 0 #05060a; }
.at .cubuk .bar { grid-column:1 / -1; grid-row:2; height:calc(7 * var(--p)); background:#0a0c14; box-shadow:inset 0 0 0 var(--p) #bfaba0; position:relative; overflow:hidden; }
.at .cubuk .bar i { position:absolute; left:calc(2 * var(--p)); top:calc(2 * var(--p)); bottom:calc(2 * var(--p)); max-width:calc(100% - 4 * var(--p)); background:var(--turuncu); box-shadow:inset 0 var(--p) 0 0 #f2a060; }
.at .cubuk .bar i.once { background:none; box-shadow:none; border-right:var(--p) solid #fff; }
.at .cubuk .say { grid-column:3; grid-row:1; text-align:right; color:var(--turuncu); font:400 var(--y-20)/.75 var(--font-baslik); letter-spacing:var(--yp); }
.at .cubuk .fark { grid-column:2; grid-row:1; font-variant-numeric:tabular-nums; }
.at .cubuk .fark.art { color:var(--yesil); } .at .cubuk .fark.azal { color:var(--tehlike-yazi); }
.at [data-cubuklar][data-onizleme] .cubuk .say { color:var(--yesil); }
.at .etiketler { display:flex; flex-wrap:wrap; gap:calc(2 * var(--p)); margin:calc(3 * var(--p)) 0; }
.at .etk { padding:var(--p) calc(3 * var(--p)); background:#20232f; box-shadow:inset 0 0 0 var(--p) #59607a; text-transform:uppercase; }
.at .tip { margin:calc(2 * var(--p)) 0; text-transform:uppercase; }
.at .tip b { color:var(--gold); font-weight:400; }
.at .uyari { display:flex; gap:calc(3 * var(--p)); align-items:flex-start; padding:calc(2 * var(--p)) calc(3 * var(--p)); background:#2a2104; box-shadow:inset 0 0 0 var(--p) var(--gold); color:#fff6c8; margin:0 0 calc(3 * var(--p)); line-height:.875; }
.at .uyari b { color:var(--gold); font-weight:400; }
.at .uyari.iyi { background:#0f2a1d; box-shadow:inset 0 0 0 var(--p) #3f8f60; color:var(--yesil); }
.at .uyari.kirmizi { background:#2a0f08; box-shadow:inset 0 0 0 var(--p) var(--tehlike); color:#ffd8cc; }
.at .uyari svg { width:calc(9 * var(--p)); height:calc(9 * var(--p)); }
.at .bilgi { padding:calc(2 * var(--p)) calc(3 * var(--p)); background:#11141f; box-shadow:inset 0 0 0 var(--p) #3a3f55; color:var(--soluk); margin:0 0 calc(3 * var(--p)); line-height:.875; }
.at .yon { display:flex; gap:calc(3 * var(--p)); align-items:center; margin:calc(3 * var(--p)) 0; text-transform:uppercase; flex-wrap:wrap; }
.at .yon button[aria-checked=true] { --ks: inset 0 0 0 var(--p) var(--gold), inset 0 calc(2 * var(--p)) 0 0 #8a5a34; background-color:var(--secili); }
.at .dene { display:flex; gap:calc(4 * var(--p)); align-items:center; flex-wrap:wrap; }
.at .dene select { width:auto; }
.at .dene-satir { display:flex; gap:calc(3 * var(--p)); flex-wrap:wrap; margin-top:auto; padding-top:calc(3 * var(--p)); }
/* parça kartı (odak) */
.at .parca-karti { display:flex; flex-direction:column; gap:calc(3 * var(--p)); }
.at .parca-karti .pk-tur { color:var(--soluk); text-transform:uppercase; }
.at .parca-karti h4 { margin:0; font:400 var(--y-20)/1 var(--font-baslik); letter-spacing:var(--yp); color:var(--ink); text-transform:uppercase; overflow-wrap:anywhere; }
.at .parca-karti .pk-satir { display:flex; gap:calc(3 * var(--p)); align-items:center; flex-wrap:wrap; text-transform:uppercase; }
.at .parca-karti .pk-durum { color:var(--gold); text-transform:uppercase; }
.at .parca-karti .pk-durum.kilit { color:#ffb070; }
.at .parca-karti .pk-k { display:grid; grid-template-columns:1fr auto; gap:var(--p) calc(3 * var(--p)); align-items:center; text-transform:uppercase; }
.at .parca-karti .pk-k .bar { grid-column:1 / -1; height:calc(4 * var(--p)); background:#0a0c14; box-shadow:inset 0 0 0 var(--p) #59607a; position:relative; }
.at .parca-karti .pk-k .bar i { position:absolute; left:var(--p); top:var(--p); bottom:var(--p); background:var(--turuncu); max-width:calc(100% - 2 * var(--p)); }
.at .parca-karti .pk-k b { color:var(--turuncu); font-weight:400; }
.at .parca-karti .pk-ipucu { color:var(--soluk); line-height:.875; }
/* en sağ: TAKIM */
.at .takim-bas { display:flex; flex-direction:column; align-items:center; gap:calc(2 * var(--p)); margin-bottom:calc(4 * var(--p)); }
.at .takim-bas h3 { margin:0; font:400 var(--y-20)/1 var(--font-baslik); letter-spacing:var(--yp); color:var(--ink); text-transform:uppercase; }
.at .takim-bas .takim-adi { max-width:100%; white-space:normal; text-align:center; }
.at .takim-menu { display:flex; flex-direction:column; gap:calc(4 * var(--p)); margin-bottom:calc(4 * var(--p)); box-shadow:inset 0 0 0 var(--p) var(--bronz); }
.at .tkm { display:flex; flex-direction:column; gap:calc(3 * var(--p)); }
.at .tkart { display:grid; grid-template-columns:auto minmax(0,1fr) auto; grid-template-areas:"b b ok" "ik mini mini"; gap:calc(2 * var(--p)) calc(3 * var(--p)); align-items:center; padding:calc(3 * var(--p)); background:#161c2c; border:0; cursor:grab; text-align:left;
  box-shadow:inset 0 0 0 var(--p) #59607a, inset 0 calc(2 * var(--p)) 0 0 #262e45, var(--odak-g, 0 0 0 0 transparent); text-transform:uppercase; }
.at .tkart[aria-selected=true] { box-shadow:inset 0 0 0 var(--p) var(--turuncu), inset 0 0 0 calc(2 * var(--p)) #0a0c14, var(--odak-g, 0 0 0 0 transparent); }
.at .tkart.odunc { box-shadow:inset 0 0 0 var(--p) #6a7088, var(--odak-g, 0 0 0 0 transparent); }
.at .tkart.odunc .tk-ik { filter:grayscale(1); opacity:.7; }
.at .tkart.bos, .at .tkart.eksik { box-shadow:inset 0 0 0 var(--p) #ffb070, var(--odak-g, 0 0 0 0 transparent); }
.at .tkart.devreDisi { box-shadow:inset 0 0 0 var(--p) var(--tehlike), var(--odak-g, 0 0 0 0 transparent); }
.at .tkart .tk-ik { grid-area:ik; width:calc(24 * var(--p)); height:calc(24 * var(--p)); display:grid; place-items:center; }
.at .tkart .tk-ik canvas.g3-ikon { width:calc(24 * var(--p)); height:calc(24 * var(--p)); image-rendering:pixelated; }
.at .tkart .yazi { grid-area:b; min-width:0; display:flex; flex-direction:column; gap:var(--p); }
.at .tkart b { font-weight:400; color:var(--ink); line-height:.5625; overflow-wrap:normal; }
.at .tkart .yazi > small:not([data-omur-bitti]) { display:none; }
.at .tkart b .k-el { margin-right:var(--p); }
.at .tkart small { display:block; color:var(--soluk); font-size:var(--y-16); line-height:.5625; }
.at .tkart .mini { grid-area:mini; display:grid; grid-template-columns:auto 1fr; gap:var(--p) calc(3 * var(--p)); align-items:center; }
.at .tkart .mini span { color:var(--soluk); font-size:var(--y-16); line-height:.5625; }
.at .tkart .mini i { display:block; height:calc(3 * var(--p)); background:#0a0c14; box-shadow:inset 0 0 0 var(--p) #3a4258; position:relative; }
.at .tkart .mini i u { position:absolute; left:0; top:0; bottom:0; background:var(--turuncu); }
.at .tkart .ok { grid-area:ok; display:flex; gap:var(--p); align-self:start; }
.at .tkart .ok button { width:calc(10 * var(--p)); height:calc(9 * var(--p)); padding:0; border:var(--p) solid var(--harc); background:var(--panel-2); color:var(--ink); cursor:pointer; font:400 calc(7px * var(--yo))/1 system-ui; box-shadow:inset 0 0 0 var(--p) var(--bronz-1), var(--odak-g, 0 0 0 0 transparent); }
.at .tkart .ok button:disabled { opacity:.35; }
.at .tkart.surukle { opacity:.5; }
.at .tkart.hedef { box-shadow:inset 0 0 0 var(--p) var(--sen); }
.at .yenileB { display:block; margin-top:var(--p); padding:var(--p) calc(4 * var(--p)); background:#3b2c0c; color:var(--gold); border:0; box-shadow:inset 0 0 0 var(--p) #c9a33b; cursor:pointer; font:400 var(--y-16)/.75 var(--font-etiket); text-transform:uppercase; }
.at .rozetY { display:inline-block; padding:0 calc(2 * var(--p)); background:var(--yesil); color:#06210f; margin-left:calc(2 * var(--p)); }
.at .cark-ozet { min-height:calc(4 * var(--p)); margin:calc(4 * var(--p)) 0 0; text-align:center; }
.at .kayitli { display:flex; flex-direction:column; gap:calc(2 * var(--p)); margin-top:calc(2 * var(--p)); }
.at .kayitli button { text-align:left; padding:calc(2 * var(--p)) calc(4 * var(--p)); cursor:pointer; display:flex; flex-direction:column; gap:0; border:var(--p) solid var(--harc); border-radius:0;
  background:var(--hucre); color:var(--ink); font:400 var(--y-16)/.75 var(--font-etiket); text-transform:uppercase; box-shadow:inset 0 0 0 var(--p) #3a3f55, var(--odak-g, 0 0 0 0 transparent); }
.at .kayitli button[aria-current=true] { box-shadow:inset 0 0 0 var(--p) var(--gold), var(--odak-g, 0 0 0 0 transparent); }
.at .kayitli small { color:var(--soluk); font-size:var(--y-16); }
.at .adsatir { display:flex; flex-direction:column; align-items:flex-start; gap:calc(2 * var(--p)); margin:calc(2 * var(--p)) 0; }
.at .adsatir input { width:100%; }
.at .eylemler { display:flex; gap:calc(3 * var(--p)); flex-wrap:wrap; margin-top:calc(4 * var(--p)); justify-content:center; }
/* alt şerit: MARKET · BAŞARIMLAR · DENE ikincil, OYNA ana (sabit konum, sağ alt) */
.at .alt-serit { position:absolute; left:calc(3 * var(--p)); right:calc(3 * var(--p)); bottom:calc(3 * var(--p)); display:flex; align-items:flex-end; gap:calc(6 * var(--p)); }
.at .alt-serit .k-dugme:not(.ana) { min-height:calc(24 * var(--p)); min-width:calc(80 * var(--p)); }
.at .kaydet-yer { display:contents; }
.at .durumSatiri { position:absolute; left:calc(220 * var(--p)); bottom:calc(100% + 6 * var(--p)); max-width:calc(170 * var(--p)); padding:calc(2 * var(--p)) calc(4 * var(--p)); pointer-events:none; z-index:4;
  background:#0f1a12; box-shadow:inset 0 0 0 var(--p) #3f8f60; color:var(--yesil); text-transform:uppercase; line-height:.875; }
.at .durumSatiri:empty { display:none; }
.at .durumSatiri.hata { background:#2a0f08; box-shadow:inset 0 0 0 var(--p) var(--tehlike); }
.at .durumSatiri.hata { color:var(--tehlike-yazi); }
.at .oyna { margin-left:auto; }
/* Pergel (docs/ux/bilgic-pergel.md): alt şeridin (Market/Başarımlar/OYNA) üstünde durur, düğmeleri örtmez */
.at .pergel { bottom:calc(34 * var(--p) + .9rem); }
.at .oyna[aria-disabled=true] { --ks: inset 0 0 0 var(--p) var(--cerceve-0), inset 0 0 0 0 transparent; color:var(--kapali-yazi); text-shadow:none; background:var(--tas-2); cursor:not-allowed; }
.at .neden { position:absolute; right:0; bottom:calc(100% + 6 * var(--p)); max-width:calc(200 * var(--p)); padding:calc(2 * var(--p)) calc(4 * var(--p)); pointer-events:none; z-index:4;
  background:#2a1a08; box-shadow:inset 0 0 0 var(--p) #ffb070; color:#ffb070; text-align:right; text-transform:uppercase; line-height:.875; }
.at .neden:empty { display:none; }
.at .toast { margin:0 0 calc(4 * var(--p)); padding:calc(3 * var(--p)) calc(6 * var(--p)); background:#2a2104; box-shadow:inset 0 0 0 var(--p) var(--gold); color:var(--gold); text-transform:uppercase; }
.at .gel { margin-top:calc(6 * var(--p)); padding:calc(3 * var(--p)); border:var(--p) dashed #3a3f55; color:var(--soluk); display:flex; gap:calc(2 * var(--p)); flex-wrap:wrap; align-items:center; }
.at .gel select { width:auto; min-width:0; max-width:100%; }
html[data-yazi-buyuk] .at .uc3 { grid-template-columns:1fr; overflow-y:auto; }
html[data-yazi-buyuk] .at .g3 { min-height:calc(220 * var(--p)); }
html[data-yazi-buyuk] .at .liste { grid-template-columns:repeat(auto-fill, minmax(calc(50 * var(--p)), 1fr)); }
`;

const UYARI_SVG = `<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" style="flex:none"><path d="M8 1.5 15 14.5H1Z" fill="#f4cf47" stroke="#050d10"/><path d="M8 6v4.2M8 12v.4" stroke="#2a2104" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const ART_SVG = `<svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true"><path d="M5 1 9 7H1Z" fill="#7fe3a0"/></svg>`;
const AZAL_SVG = `<svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true"><path d="M5 9 1 3h8Z" fill="#ff9a7a"/></svg>`;

type Sahiplik = "hepsi" | "sahip" | "kilitli";
interface Filtre { element: string; koken: string; tip: string; sahiplik: Sahiplik }

/** Yuva başına görünen topaç: sahip olunan (taslaktan), ödünç (sunucu kuralıyla aynı sıra), boş ya da eksik. */
interface YuvaGorunumu {
  durum: "sahip" | "odunc" | "devreDisi" | "bos" | "eksik";
  profil: TopacProfili | null;
  cekirdek: AtolyeCekirdegi | null;
  /** ödünçte başlangıç seti kimliği */
  oduncCekirdek: string | null;
  seviye: number;
}

export function baslat(b: EkranBaglami): void {
  const ben = b.ben;
  if (!ben?.girisli) { git("karsilama"); return; }
  if (!ben.oyuncu.profilTamam) { git("profil"); return; }
  if (!ben.cekirdekler.length) { git("ilk-cekirdek"); return; }
  void atolyeGetir().then((v) => { new AtolyeEkrani(b, v); }).catch((e) => {
    if (e instanceof BakimHatasi) bakimKatmani(() => location.reload());
    else throw e;
  });
}

/** Parça kartındaki katkı çubukları için katalog en büyükleri (bir kez). */
let katkiTavan: Record<CubukAnahtari, number> | null = null;
function katkiDegerleri(p: Parca): Record<CubukAnahtari, number> {
  const k = p.katki;
  return { saldiri: k.saldiri, savunma: k.savunma, agirlik: k.kutle, stamina: k.staminaHavuzu, hiz: p.tur === "uc" ? p.uc.ivme : 0, saglamlik: k.burstEsik };
}
function katkiTavani(): Record<CubukAnahtari, number> {
  if (katkiTavan) return katkiTavan;
  const t = { saldiri: 1, savunma: 1, agirlik: 1, stamina: 1, hiz: 1, saglamlik: 1 };
  for (const p of PARCALAR.parcalar) { const d = katkiDegerleri(p); for (const k of CUBUK_SIRA) t[k] = Math.max(t[k], d[k]); }
  katkiTavan = t;
  return t;
}

/** Izgara hücresi kısa adı: tür sözcüğü atılır ("Ok Gövde" → "Ok"); en çok iki satır. */
function kisaAd(ad: string): string {
  const k = ad.replace(/\s+(Gövde|Disk|Uç|Ucu|Çekirdeği)$/u, "");
  return k || ad;
}

class AtolyeEkrani {
  private v: AtolyeGorunumu;
  /** D7: tamamlanan başarımlar (kilit açılımı) */
  private get tamamSet(): ReadonlySet<string> { return new Set(this.v.tamamlanan ?? []); }
  private takimNo: number;
  private taslak!: Taslak;
  private takimAdi = "";
  private secili = 0;
  private sekme: YuvaTuru = "uc";
  private filtre: Filtre = { element: "", koken: "", tip: "", sahiplik: "hepsi" };
  private onceki: CubukOzeti | null = null;
  private uyari = "";
  private degisti = false;
  private durumMetni = "";
  private durumHata = false;
  // DOM
  private kart: HTMLElement;
  private sol!: HTMLElement;
  private orta!: HTMLElement;
  private cubukK!: HTMLElement;
  private sag!: HTMLElement;
  private baslikEl!: HTMLElement;
  private ayrintiEl!: HTMLElement;
  private oyna!: HTMLButtonElement;
  private dene!: HTMLButtonElement;
  private neden!: HTMLElement;
  private durumEl!: HTMLElement;
  private kaydetYer!: HTMLElement;
  private surukleKaynak = -1;
  /** ikinci kat (sadelik S-9): filtre paneli, topaç ayrıntısı, takım menüsü */
  private filtreAcik = false;
  private ayrintiAcik = false;
  private takimMenuAcik = false;
  /** ATOLYE3D: merkez 3B görünüm, canlı önizleme (envanterde üzerine gelinen parça), odaktaki katman */
  sahne!: AtolyeSahnesi;
  private onizParca: Parca | null = null;
  private odakKatman: KatmanTuru | null = null;
  private ikonlar3b = false;
  private animasyonla = false;

  constructor(private b: EkranBaglami, v: AtolyeGorunumu) {
    this.v = v;
    const { kok, kart, lento } = ekranKok(b.ustYazi, "Atölye", { kim: true });
    // lento: Daha fazla (Çekirdek Günlüğü, Profil; Topaç Lab yalnız ?gelistir=1) — ad menü başlığında (taş üstünde metin yok)
    const ogeler: [string, string, () => void][] = [
      ["Çekirdek Günlüğü", "gunluk", () => git("gunluk", `&c=${this.yuvalar()[this.secili]?.cekirdek?.id ?? ""}`)],
      ["Profil", "profil", () => git("profil")],
    ];
    if (gelistirAcik()) ogeler.push(["Topaç Lab", "topac-lab", () => git("topac-lab")]);
    const menu = acilirMenu(lento, "Daha fazla", b.ben?.girisli ? b.ben.oyuncu.ad : null, ogeler, "daha-fazla");
    const ayarlar = lento.querySelector("a.k-dugme");
    lento.insertBefore(menu, ayarlar ? ayarlar.nextSibling : lento.querySelector(".k-cuzdan"));
    // referans 03: başlık "◄ ATÖLYE" (◄ süs; Atölye ana ekran, geri hedefi yok: ux § 3.2)
    const plaka = lento.querySelector("h1.k-plaka");
    if (plaka) { plaka.classList.add("at-plaka"); plaka.setAttribute("aria-label", "Atölye"); plaka.innerHTML = `<span aria-hidden="true" class="at-ok">◄</span> Atölye`; }
    kok.classList.add("at");
    kart.className = "kart at-kart k-panel";
    this.kart = kart;
    const st = el("style"); st.textContent = STIL; document.head.appendChild(st);
    this.takimNo = v.takimlar.some((t) => t.takimNo === v.aktifTakim) ? v.aktifTakim : (v.takimlar[0]?.takimNo ?? 0);
    this.takimYukle(this.takimNo);
    // Dene'den dönüş: taslak (kaydedilmemiş değişiklik dahil) korunur
    try {
      const ham = sessionStorage.getItem(TASLAK_ANAHTAR);
      if (ham) {
        const t = JSON.parse(ham) as { takimNo: number; taslak: Taslak; secili: number; sekme: YuvaTuru; ad: string; degisti: boolean };
        if (v.takimlar.some((x) => x.takimNo === t.takimNo) && Array.isArray(t.taslak) && t.taslak.length === 3) {
          this.takimNo = t.takimNo;
          this.taslak = t.taslak;
          this.secili = t.secili;
          this.sekme = YUVA_TURLERI.includes(t.sekme) ? t.sekme : "uc";
          this.takimAdi = t.ad;
          this.degisti = t.degisti;
          if (takimDegerlendir(this.taslak, this.env()).hatalar.some((h) => h.kod === "sahipDegil")) this.takimYukle(this.takimNo);
        }
        sessionStorage.removeItem(TASLAK_ANAHTAR);
      }
    } catch { /* depolama kapalı */ }
    // D7: Market'ten "Atölye'de tak" (?parca=<tanım>): o türün sekmesi açılır, parça odaklanır
    const qp = new URLSearchParams(location.search).get("parca");
    let odakParca: string | null = null;
    if (qp) { try { this.sekme = parcaBul(qp).tur; odakParca = qp; } catch { /* bilinmeyen */ } }
    this.iskelet();
    this.ciz();
    this.pergelBagla(kok, v);
    if (odakParca) (this.kart.querySelector(`.liste [data-parca="${odakParca}"]`) as HTMLElement | null)?.focus();
    (window as unknown as { __atolye: AtolyeEkrani }).__atolye = this;
  }

  // ---- veri ----
  private env(): Envanter {
    return { cekirdekler: this.v.cekirdekler.map((c) => ({ id: c.id, tanimId: c.tanimId, devreDisi: c.devreDisi })), parcalar: this.v.parcalar };
  }

  private takimYukle(no: number): void {
    const t = this.v.takimlar.find((x) => x.takimNo === no);
    this.takimNo = no;
    this.taslak = (t ? t.yuvalar.map((y) => ({ ...y })) : [bosTopac(), bosTopac(), bosTopac()]) as Taslak;
    this.takimAdi = t?.ad ?? `Takım ${no + 1}`;
    this.degisti = false;
    this.onceki = null;
    this.uyari = "";
  }

  private degerlendirme(): TakimDegerlendirmesi { return takimDegerlendir(this.taslak, this.env()); }

  private parcaTanim(id: number | null): string | null {
    if (id === null) return null;
    return this.v.parcalar.find((p) => p.id === id)?.tanimId ?? null;
  }

  private cekirdekOrnek(id: number | null): AtolyeCekirdegi | null {
    return id === null ? null : this.v.cekirdekler.find((c) => c.id === id) ?? null;
  }

  /** Yuvaların görünümü (sunucunun ödünç kuralıyla aynı: takımda olmayan başlangıç setleri, katalog sırası). */
  yuvalar(): YuvaGorunumu[] {
    const v = this.degerlendirme();
    const kullanilan = new Set(this.taslak.map((y) => this.cekirdekOrnek(y.cekirdek)).filter((c): c is AtolyeCekirdegi => !!c && !c.devreDisi).map((c) => c.tanimId));
    const adaylar = BASLANGIC_SETLERI.filter((s) => !kullanilan.has(s.cekirdek));
    let a = 0;
    return this.taslak.map((y, k): YuvaGorunumu => {
      const c = this.cekirdekOrnek(y.cekirdek);
      const durum = v.durum[k]!;
      if (durum === "odunc" || durum === "devreDisi") {
        const s = adaylar[a++] ?? null;
        return { durum, profil: s ? topacProfiliKur(s.cekirdek, s.govde, s.disk, s.uc) : null, cekirdek: c, oduncCekirdek: s?.cekirdek ?? null, seviye: 1 };
      }
      if (durum === "bos") return { durum: "bos", profil: null, cekirdek: null, oduncCekirdek: null, seviye: 0 };
      const g = this.parcaTanim(y.govde), d = this.parcaTanim(y.disk), u = this.parcaTanim(y.uc);
      if (!c || !g || !d || !u) return { durum: "eksik", profil: null, cekirdek: c, oduncCekirdek: null, seviye: c?.seviye ?? 0 };
      let p: TopacProfili | null = null;
      try { p = topacProfiliKur(c.tanimId, g, d, u, { yon: c.yon }); } catch { p = null; }
      return { durum: p ? "sahip" : "eksik", profil: p, cekirdek: c, oduncCekirdek: null, seviye: c.seviye };
    });
  }

  /** test / ekran: seçili topacın çubukları */
  get cubuklar(): CubukOzeti | null {
    const p = this.yuvalar()[this.secili]?.profil;
    return p ? profilCubuklari(p) : null;
  }
  get oncekiCubuklar(): CubukOzeti | null { return this.onceki; }
  get taslakDurumu(): { taslak: Taslak; degisti: boolean; takimNo: number; uyari: string; neden: string } {
    return { taslak: this.taslak, degisti: this.degisti, takimNo: this.takimNo, uyari: this.uyari, neden: this.neden?.textContent ?? "" };
  }

  /** Pergel (docs/ux/bilgic-pergel.md): sona eklenir, odağı çalmaz; yalnız açılıştaki takım durumunu okur. */
  private pergelBagla(kok: HTMLElement, v: AtolyeGorunumu): void {
    const yv = this.yuvalar();
    const tanim = (y: (typeof yv)[number]) => y.cekirdek?.tanimId ?? y.oduncCekirdek;
    pergelKur({
      kok,
      oyuncuId: v.oyuncu.id,
      durum: {
        takimEksik: yv.filter((y) => y.durum === "bos" || y.durum === "eksik").length,
        oduncVar: yv.some((y) => y.durum === "odunc" || y.durum === "devreDisi"),
        seviyeler: v.cekirdekler.map((c) => c.seviye),
        takimElementleri: yv.map(tanim).filter((t): t is string => !!t).map((t) => cekirdekBul(t).element),
        marketYeni: new URLSearchParams(location.search).get("mesaj") === "ilkdevir",
        labVar: gelistirAcik(),
        // TEMIZLIK #5: /api/ben `sonMac` (sunucu `mac` tablosu); maç sayısı sunucudan, yoksa tarayıcı sayacı (Pergel yedeği)
        ...sonMacDurumu(this.b.ben?.girisli ? this.b.ben.sonMac : undefined),
      },
    });
  }

  // ---- iskelet ----
  private iskelet(): void {
    const k = this.kart;
    const q = new URLSearchParams(location.search);
    if (q.get("mesaj") === "ilkdevir") el("div", "toast", k, "İlk Devir başarımı: Market açıldı.").setAttribute("role", "status");
    const uc3 = el("div", "uc3 k-blueprint", k);
    this.sol = el("section", "kutu sol at-pano", uc3);
    this.sol.setAttribute("aria-label", "Envanter");
    this.orta = el("section", "orta-kutu", uc3);
    this.orta.setAttribute("aria-label", "Seçili topaç");
    this.baslikEl = el("div", "at-baslik", this.orta);
    this.baslikEl.dataset["seciliBaslik"] = "1";
    this.sahne = new AtolyeSahnesi(this.orta, {
      odak: (t) => this.odakDegisti(t),
      hazir: () => this.cizerHazir(),
      sil: (t) => { if (this.taslak[this.secili]![t] !== null) this.cikar(t); },
    });
    this.ayrintiEl = el("div", "ayrinti at-pano", this.orta);
    this.ayrintiEl.dataset["ayrinti"] = "1";
    this.ayrintiEl.hidden = true;
    this.cubukK = el("section", "kutu cubuk-sutun", uc3);
    this.cubukK.setAttribute("aria-label", "Topaç değerleri");
    this.sag = el("section", "kutu sag at-pano", uc3);
    this.sag.setAttribute("aria-label", "Takım");
    // alt şerit (KM-4: web gezinti çubuğu yerine): Market · Başarımlar · Dene ikincil, OYNA ana sağ altta
    const serit = el("div", "alt-serit", k);
    const mk = el("button", "k-dugme", serit, "Market");
    mk.dataset["eylem"] = "market";
    mk.addEventListener("click", () => git("market"));
    const bs = el("button", "k-dugme", serit, "Başarımlar");
    bs.dataset["eylem"] = "basarimlar";
    bs.addEventListener("click", () => git("basarimlar"));
    this.dene = el("button", "k-dugme", serit, "Dene · 30 sn");
    this.dene.dataset["eylem"] = "dene";
    this.dene.title = "30 sn Antrenman: sonuç sayılmaz, Altın ve tecrübe yok.";
    this.dene.addEventListener("click", () => this.dene_(oku("devran.deneBot.v1") ?? "kukla"));
    this.kaydetYer = el("span", "kaydet-yer", serit);
    this.durumEl = el("div", "durumSatiri k-e16", serit);
    this.durumEl.setAttribute("role", "status");
    this.durumEl.dataset["durumSatiri"] = "1";
    this.neden = el("div", "neden k-e16", serit);
    this.oyna = el("button", "k-dugme ana oyna", serit, "OYNA");
    this.oyna.dataset["eylem"] = "oyna";
    this.neden.id = "oyna-neden";
    this.neden.setAttribute("role", "status");
    this.oyna.addEventListener("click", () => void this.oynaTikla());
    anaEylem(this.oyna);
    queueMicrotask(() => this.oyna.focus({ preventScroll: true }));
  }

  private ciz(): void {
    this.solCiz();
    this.ortaCiz();
    this.sagCiz();
    this.oynaCiz();
    this.durumYaz();
  }

  private durumYaz(): void {
    this.durumEl.textContent = this.durumMetni;
    this.durumEl.classList.toggle("hata", this.durumHata);
  }

  // ---- ATOLYE3D: sahne bağları ----

  /** Yuvanın 3B kurulumu: takılı parçalar (ödünçte ödünç seti), boya = Çekirdek Element'i. */
  private kurulum(k = this.secili): { kur: TopacKurulumu; adlar: Record<KatmanTuru, string> } {
    const y = this.yuvalar()[k]!;
    const t = this.taslak[k]!;
    const odunc = (y.durum === "odunc" || y.durum === "devreDisi") && y.profil;
    const ids: Record<KatmanTuru, string | null> = odunc
      ? { ...y.profil!.parcalar }
      : { cekirdek: this.cekirdekOrnek(t.cekirdek)?.tanimId ?? null, govde: this.parcaTanim(t.govde), disk: this.parcaTanim(t.disk), uc: this.parcaTanim(t.uc) };
    const c = ids.cekirdek ? cekirdekBul(ids.cekirdek) : null;
    const sol = y.profil ? y.profil.donus === "sol" : (!odunc && y.cekirdek?.yon === "sol");
    const kur: TopacKurulumu = { ...ids, element: c?.element ?? null, koken: c?.koken ?? null, sol };
    const adlar = { cekirdek: "", govde: "", disk: "", uc: "" } as Record<KatmanTuru, string>;
    for (const tur of YUVA_TURLERI) { const id = ids[tur]; if (id) adlar[tur] = parcaBul(id).ad; }
    return { kur, adlar };
  }

  /** Envanterde üzerine gelinen / odaklanan parçanın topaçtaki canlı önizlemesi (null: gerçeğe dön). */
  onizle(p: Parca | null): void {
    if ((p?.id ?? null) === (this.onizParca?.id ?? null)) return;
    const { kur, adlar } = this.kurulum();
    if (!p || kur[p.tur] === p.id) {
      const vardi = !!this.onizParca;
      this.onizParca = null;
      this.sahne.onizle(null);
      if (vardi) this.cubukCiz();
      return;
    }
    this.onizParca = p;
    const k2: TopacKurulumu = { ...kur, [p.tur]: p.id };
    if (p.tur === "cekirdek") { k2.element = p.element; k2.koken = p.koken; k2.sol = p.katki.yon === "sol"; }
    this.sahne.onizle(k2, { ...adlar, [p.tur]: p.ad });
    this.cubukCiz();
  }

  private onizProfil(): TopacProfili | null {
    const p = this.onizParca;
    if (!p) return null;
    const { kur } = this.kurulum();
    const k2 = { ...kur, [p.tur]: p.id };
    if (!k2.cekirdek || !k2.govde || !k2.disk || !k2.uc) return null;
    const c = p.tur === "cekirdek" ? null : this.yuvalar()[this.secili]?.cekirdek;
    try { return topacProfiliKur(k2.cekirdek, k2.govde, k2.disk, k2.uc, c ? { yon: c.yon } : undefined); } catch { return null; }
  }

  private cizerHazir(): void {
    // 3B ikonlar (tek kare) artık çizilebilir: ızgarayı ve takım kartlarını yenile
    this.ikonlar3b = true;
    this.solCiz();
    this.sagCiz();
  }

  private odakDegisti(t: KatmanTuru | null): void {
    this.odakKatman = t;
    if (t && t !== this.sekme) { this.sekme = t; this.solCiz(); }
    this.cubukCiz();
  }

  /** Parça ikonu: 3B tek kare (hazırsa) ya da yordamsal pixel ikon. Gövde seçili topacın Element'iyle boyanır. */
  private parcaIkonu(p: Parca, gizli: boolean, boyut = 32): HTMLCanvasElement {
    const elm = "element" in p && p.element ? (p.element as ElementAdi) : null;
    const pk = p as Parca & { koken?: string; katman?: string };
    if (!gizli && this.ikonlar3b) {
      const kurE = this.kurulum().kur.element;
      const boya = p.tur === "cekirdek" ? { element: p.element, koken: p.koken } : p.tur === "govde" ? { element: kurE ?? elm, koken: null } : { element: null, koken: null };
      const c = this.sahne.ikon(p.id, boya, boyut);
      if (c) { c.className = "g3-ikon"; c.setAttribute("aria-hidden", "true"); return c; }
    }
    return parcaPikselIkonu(p.tur, elm, pk.koken ?? null, pk.katman, gizli);
  }
  // ---- sol: parça ızgarası (referans 03) ----
  private solCiz(): void {
    const s = this.sol;
    const odak = document.activeElement instanceof HTMLElement && s.contains(document.activeElement) ? document.activeElement.dataset["odak"] ?? "" : "";
    s.innerHTML = "";
    const sk = el("div", "sekmeler", s);
    sk.setAttribute("role", "tablist");
    sk.setAttribute("aria-label", "Parça türü");
    const kur = this.kurulum().kur;
    YUVA_TURLERI.forEach((t, k) => {
      const d = el("button", "", sk);
      d.setAttribute("role", "tab");
      d.setAttribute("aria-selected", String(t === this.sekme));
      d.tabIndex = t === this.sekme ? 0 : -1;
      d.dataset["sekme"] = t;
      d.dataset["odak"] = `sekme-${t}`;
      d.dataset["k"] = "yok";
      // sekme ikonu: seçili topaçtaki parça (yoksa türün ilk parçası)
      const ornek = PARCALAR.parcalar.find((p) => p.id === kur[t]) ?? PARCALAR.parcalar.find((p) => p.tur === t);
      const ik = el("span", "sk-ik", d);
      if (ornek) ik.appendChild(this.parcaIkonu(ornek, false, 16));
      el("span", "", d, YUVA_AD[t]);
      d.addEventListener("click", () => { this.sekme = t; this.solCiz(); });
      d.addEventListener("keydown", (e) => {
        const y = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!y) return;
        e.preventDefault();
        this.sekme = YUVA_TURLERI[(k + y + 4) % 4]!;
        this.solCiz();
        (this.sol.querySelector(`[data-sekme=${this.sekme}]`) as HTMLElement | null)?.focus();
      });
    });
    // dört filtre tek "Filtre" düğmesinin arkasında (ikinci kat); etkin filtre sayısı düğmede
    const etkin = (["element", "koken", "tip"] as const).filter((x) => this.filtre[x]).length + (this.filtre.sahiplik !== "hepsi" ? 1 : 0);
    const fs = el("div", "filtre-satir", s);
    const fd = el("button", `k-dugme kucuk${this.filtreAcik ? " secili" : ""}`, fs, etkin ? `Filtre · ${etkin}` : "Filtre");
    fd.dataset["eylem"] = "filtre";
    fd.dataset["odak"] = "filtre";
    fd.setAttribute("aria-expanded", String(this.filtreAcik));
    fd.addEventListener("click", () => { this.filtreAcik = !this.filtreAcik; this.solCiz(); (this.sol.querySelector("[data-eylem=filtre]") as HTMLElement | null)?.focus(); });
    if (etkin) {
      const t = el("button", "k-dugme kucuk", fs, "Temizle");
      t.addEventListener("click", () => { this.filtre = { element: "", koken: "", tip: "", sahiplik: "hepsi" }; this.solCiz(); });
    }
    el("span", "ipucu k-e16", fs, "Üstüne gel: önizle").setAttribute("aria-hidden", "true");
    const f = el("div", "filtre", s);
    f.hidden = !this.filtreAcik;
    const secim = (ad: string, anahtar: keyof Filtre, secenekler: [string, string][]) => {
      const sel = el("select", "", f);
      sel.setAttribute("aria-label", ad);
      sel.dataset["filtre"] = anahtar;
      sel.dataset["odak"] = `filtre-${anahtar}`;
      for (const [deger, metin] of secenekler) { const o = el("option", "", sel, metin); o.value = deger; }
      sel.value = this.filtre[anahtar];
      sel.addEventListener("change", () => { (this.filtre as unknown as Record<string, string>)[anahtar] = sel.value; this.solCiz(); });
    };
    secim("Element", "element", [["", "Element: hepsi"], ...ELEMENT_CARKI.map((e): [string, string] => [e, ELEMENT_RENK[e].ad])]);
    secim("Köken", "koken", [["", "Köken: hepsi"], ...Object.entries(KOKEN_AD)]);
    secim("Tip eğilimi", "tip", [["", "Tip: hepsi"], ...Object.entries(TIP_AD)]);
    secim("Sahiplik", "sahiplik", [["hepsi", "Sahiplik: hepsi"], ["sahip", "Sahip olunan"], ["kilitli", "Kilitli"]]);
    const liste = el("div", "liste", s);
    liste.setAttribute("role", "listbox");
    liste.setAttribute("aria-label", `${YUVA_AD[this.sekme]} parçaları`);
    const ogeler = this.envanterOgeleri();
    if (!ogeler.length) {
      const m = el("div", "bosmsj", liste, BOS_SEKME);
      m.setAttribute("role", "status");
      m.dataset["bosSekme"] = "1";
    }
    const dugmeler: HTMLButtonElement[] = [];
    ogeler.forEach((o, k) => {
      const g = parcaGorunumu(o.parca, o.sahipIdler.length, this.v.basarimIlerleme, this.tamamSet);
      const bu = o.takili === this.secili + 1;
      const d = el("button", `pc ${g.durum}${o.takili ? " takili" : ""}${bu ? " bu" : ""}`, liste);
      d.setAttribute("role", "option");
      d.setAttribute("aria-selected", String(bu));
      d.dataset["parca"] = o.parca.id;
      d.dataset["durum"] = g.durum;
      d.dataset["odak"] = `parca-${o.parca.id}`;
      d.dataset["k"] = "yok";
      d.tabIndex = k === 0 ? 0 : -1;
      const elm = "element" in o.parca && o.parca.element ? (o.parca.element as ElementAdi) : null;
      const ik = el("span", "ik", d);
      ik.dataset["ik"] = o.parca.id;
      ik.appendChild(this.parcaIkonu(o.parca, g.durum === "gizli"));
      if (g.durum === "kilitli") el("span", "k-kilit kilit-ik", d);
      el("span", "ad", d, g.durum === "gizli" ? "???" : kisaAd(g.ad));
      // tek kısa durum rozeti (S-7): fiyat (Market'te) / ilerleme (kilitli); tam metin aria-label ve ipucunda
      const fiyat = /(\d+)\s*Altın/.exec(g.etiket)?.[1];
      const ilr = /(\d+\/\d+)/.exec(g.etiket)?.[1];
      const kisa = g.durum === "market" ? (fiyat ?? "Market") : g.durum === "kilitli" ? (ilr ?? "") : "";
      const et = el("span", `et${g.durum === "market" ? " k-rozet fiyat" : g.durum === "kilitli" && kisa ? " kilit-et" : ""}`, d, kisa);
      et.title = g.etiket;
      d.title = `${g.ad} · ${g.etiket}`;
      if (o.takili) { const tk = el("span", "tk k-rozet tamam", d, String(o.takili)); tk.title = `${o.takili}. topaçta takılı`; }
      const takilabilir = g.durum === "sahip";
      d.setAttribute("aria-label", `${g.okunan} ${TIP_AD[o.parca.tipEgilimi]}.${elm && g.durum !== "gizli" ? ` ${ELEMENT_RENK[elm].ad}.` : ""}${o.takili ? ` ${o.takili}. topaçta takılı.` : ""}${takilabilir ? ` Enter: ${this.secili + 1}. topaca tak.` : ""}`);
      if (!takilabilir) d.setAttribute("aria-disabled", "true");
      // D7: "Market'te" ve kilitli kart Market'te o ürüne bağlanır (gizli değil)
      if (g.durum === "market" || g.durum === "kilitli") d.dataset["marketBag"] = o.parca.id;
      d.addEventListener("click", () => {
        if (takilabilir) this.tak(o.parca, o.sahipIdler);
        else if (g.durum === "market" || g.durum === "kilitli") git("market", `&parca=${o.parca.id}`);
      });
      // ATOLYE3D (d): üzerine gelince / odakta topaçta canlı önizleme (gizli parça önizlenmez)
      if (g.durum !== "gizli") {
        d.addEventListener("pointerenter", () => this.onizle(o.parca));
        d.addEventListener("focus", () => this.onizle(o.parca));
      }
      d.addEventListener("pointerleave", () => { if (this.onizParca?.id === o.parca.id) this.onizle(null); });
      d.addEventListener("blur", () => { if (this.onizParca?.id === o.parca.id) this.onizle(null); });
      d.addEventListener("keydown", (e) => {
        const adim = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : e.key === "ArrowDown" ? 4 : e.key === "ArrowUp" ? -4 : 0;
        if (!adim) return;
        e.preventDefault();
        const n = Math.max(0, Math.min(dugmeler.length - 1, k + adim));
        dugmeler[k]!.tabIndex = -1;
        dugmeler[n]!.tabIndex = 0;
        dugmeler[n]!.focus();
      });
      dugmeler.push(d);
    });
    if (this.v.gelistirme && gelistirAcik()) this.gelistirmePaneli(s);
    if (odak) (s.querySelector(`[data-odak="${odak}"]`) as HTMLElement | null)?.focus({ preventScroll: true });
  }

  private envanterOgeleri(): { parca: Parca; sahipIdler: number[]; takili: number }[] {
    const f = this.filtre;
    const sonuc: { parca: Parca; sahipIdler: number[]; takili: number }[] = [];
    for (const p of PARCALAR.parcalar) {
      if (p.tur !== this.sekme) continue;
      const sahipIdler = p.tur === "cekirdek" ? this.v.cekirdekler.filter((c) => c.tanimId === p.id).map((c) => c.id) : this.v.parcalar.filter((x) => x.tanimId === p.id).map((x) => x.id);
      const durum = parcaGorunumu(p, sahipIdler.length, this.v.basarimIlerleme, this.tamamSet).durum;
      if (f.sahiplik === "sahip" && durum !== "sahip") continue;
      if (f.sahiplik === "kilitli" && durum !== "kilitli" && durum !== "gizli") continue;
      if (f.element && !("element" in p && p.element === f.element)) continue;
      if (f.koken && !(p.tur === "cekirdek" && p.koken === f.koken)) continue;
      if (f.tip && p.tipEgilimi !== (f.tip as Tip)) continue;
      let takili = 0;
      this.taslak.forEach((y, k) => { const id = y[this.sekme]; if (id !== null && sahipIdler.includes(id)) takili = k + 1; });
      sonuc.push({ parca: p, sahipIdler, takili });
    }
    return sonuc;
  }

  /** Envanterden seçili topaca tak; boştaki örnek önce, yoksa başka topaçtaki örnek oradan çıkarılır. */
  tak(p: Parca, idler: number[]): void {
    const tur = p.tur as YuvaTuru;
    const kullanilan = new Set(this.taslak.map((y) => y[tur]).filter((x): x is number => x !== null));
    if (this.taslak[this.secili]![tur] !== null && idler.includes(this.taslak[this.secili]![tur]!)) { this.uyari = ""; this.ciz(); return; }
    const id = idler.find((x) => !kullanilan.has(x)) ?? idler[0];
    if (id === undefined) return;
    const once = this.cubuklar;
    const r = parcaTak(this.taslak, this.secili, tur, id, (x) => this.cekirdekOrnek(x)?.tanimId);
    this.taslak = r.taslak;
    this.degisti = true;
    this.animasyonla = true;
    this.uyari = r.cikarilan ? `${p.ad} ${r.cikarilan.yuva + 1}. topaçtan çıkarıldı: bir parça aynı anda tek topaçta olur. ${r.cikarilan.yuva + 1}. topaçta ${YUVA_AD[r.cikarilan.tur]} eksik.` : "";
    this.onceki = once;
    this.durumMetni = "";
    this.ciz();
  }

  cikar(tur: YuvaTuru): void {
    const once = this.cubuklar;
    if (tur === "cekirdek") this.taslak[this.secili] = bosTopac();
    else this.taslak = parcaTak(this.taslak, this.secili, tur, null).taslak;
    this.degisti = true;
    this.animasyonla = true;
    this.onceki = once;
    this.uyari = "";
    this.ciz();
  }

  // ---- orta: seçili topaç (başlık + 3B patlatılmış görünüm) ----
  private ortaCiz(): void {
    const yv = this.yuvalar();
    const y = yv[this.secili]!;
    const ct = y.cekirdek?.tanimId ?? y.oduncCekirdek;
    const baslik = y.cekirdek ? cekirdekBul(y.cekirdek.tanimId).ad : y.oduncCekirdek ? `${cekirdekBul(y.oduncCekirdek).ad} (ödünç)` : "Boş yuva";
    const b = this.baslikEl;
    b.innerHTML = "";
    if (ct) { const e = el("span", "k-el x2", b); e.dataset["el"] = cekirdekBul(ct).element; e.setAttribute("aria-hidden", "true"); }
    el("span", "", b, `${this.secili + 1}. ${baslik}`);
    const { kur, adlar } = this.kurulum();
    this.onizParca = null;
    this.sahne.ayarla(kur, adlar, this.animasyonla);
    this.animasyonla = false;
    this.ayrintiCiz(y);
    this.cubukCiz();
  }

  /** ikinci kat: topaç ayrıntısı (Uç deseni, yön, Yapay yön seçimi, Dene rakibi, parça çıkar) */
  private ayrintiCiz(y: YuvaGorunumu): void {
    const ayr = this.ayrintiEl;
    const odak = document.activeElement instanceof HTMLElement && ayr.contains(document.activeElement) ? document.activeElement.dataset["odak"] ?? "" : "";
    ayr.innerHTML = "";
    ayr.hidden = !this.ayrintiAcik;
    el("div", "ayr-bas k-e16", ayr, "Ayrıntı");
    const cikarSatiri = el("div", "eylemler", ayr);
    const ct = this.taslak[this.secili]![this.sekme];
    if (ct !== null) {
      const c = el("button", "", cikarSatiri, `${YUVA_AD[this.sekme]} çıkar`);
      c.dataset["eylem"] = "cikar";
      c.addEventListener("click", () => this.cikar(this.sekme));
    }
    const p = y.profil;
    if (p) {
      const oz = profilCubuklari(p);
      const et = el("div", "etiketler", ayr);
      el("span", "etk", et, `Uç: ${oz.desenAd}`).dataset["etiket"] = "desen";
      el("span", "etk", et, `Yön: ${oz.donus === "sol" ? "Sola döner" : "Sağa döner"}${oz.ciftYon ? " (çift yön)" : ""}`).dataset["etiket"] = "yon";
      // Yapay yön seçimi (maç öncesi; sim'e takım koduyla `yon`)
      if (y.cekirdek && y.cekirdek.ciftYon && y.durum === "sahip") {
        const yn = el("div", "yon", ayr);
        yn.setAttribute("role", "radiogroup");
        yn.setAttribute("aria-label", "Dönüş yönü");
        el("span", "", yn, "Yön:");
        for (const [deger, ad] of [["sag", "Sağ"], ["sol", "Sol"]] as const) {
          const d = el("button", "", yn, ad);
          d.setAttribute("role", "radio");
          d.setAttribute("aria-checked", String(y.cekirdek.yon === deger));
          d.dataset["yon"] = deger;
          d.dataset["odak"] = `yon-${deger}`;
          d.addEventListener("click", () => void this.yonSec(y.cekirdek!, deger));
        }
        yn.title = "Yapay: maç öncesi seçilir";
      }
    }
    // Dene rakibi (alt şeritteki DENE · 30 SN bu seçimle açılır)
    const dn = el("div", "dene", ayr);
    const sel = el("select", "", dn);
    sel.setAttribute("aria-label", "Antrenman rakibi");
    sel.dataset["odak"] = "dene-bot";
    for (const [deger, ad] of [["pasif", "Rakip: Hedef"], ["kukla", "Rakip: Kukla"], ["dolas", "Rakip: Dolaşan"], ["kenar", "Rakip: İten"]] as const) { const op = el("option", "", sel, ad); op.value = deger; }
    sel.value = oku("devran.deneBot.v1") ?? "kukla";
    sel.addEventListener("change", () => sakla("devran.deneBot.v1", sel.value));
    this.dene.disabled = !p;
    if (odak) (ayr.querySelector(`[data-odak="${odak}"]`) as HTMLElement | null)?.focus();
  }

  // ---- sağ-orta: altı çubuk (ya da odaktaki parçanın kartı) ----
  private cubukCiz(): void {
    const s = this.cubukK;
    const odak = document.activeElement instanceof HTMLElement && s.contains(document.activeElement) ? document.activeElement.dataset["odak"] ?? "" : "";
    s.innerHTML = "";
    if (this.odakKatman) { this.parcaKartiCiz(s, this.odakKatman); return; }
    const y = this.yuvalar()[this.secili]!;
    const odunc = y.durum === "odunc" || y.durum === "devreDisi";
    const kisaNot = (sinif: string, metin: string, uzun: string) => { const n = el("div", sinif, s, metin); n.title = uzun; n.setAttribute("aria-label", uzun); return n; };
    if (y.durum === "bos") kisaNot("bilgi", "Yuva boş: Çekirdek tak", "Bu yuva boş. Envanterden bir Çekirdek tak.");
    if (y.durum === "eksik") kisaNot("uyari", "! Parça eksik", this.eksikMetni());
    if (odunc) kisaNot("bilgi", "Ödünç · Lv.1", "Ödünç topaç: Lv.1, tecrübe ve başarım almaz. Kendi Çekirdeğini takınca yerini alır.");
    if (y.durum === "devreDisi") kisaNot("uyari kirmizi", "! Ömrü bitti", `${y.cekirdek ? cekirdekBul(y.cekirdek.tanimId).ad : "Çekirdek"}: ömrü bitti. Maça girişte yerine ödünç topaç girer.`);
    const oniz = this.onizProfil();
    const p = oniz ?? y.profil;
    if (p) {
      const oz = profilCubuklari(p);
      // önizlemede fark şimdiki topaca göre; takınca (mevcut mantık) bir önceki hâle göre
      const kiyas = oniz ? (y.profil ? profilCubuklari(y.profil) : null) : this.onceki;
      const fark = kiyas ? cubukFarki(kiyas, oz) : null;
      const kutu = el("div", "", s);
      kutu.dataset["cubuklar"] = "1";
      if (oniz) { kutu.dataset["onizleme"] = this.onizParca?.id ?? ""; kutu.setAttribute("aria-label", `Önizleme: ${this.onizParca?.ad ?? ""} takılırsa`); }
      for (const k of CUBUK_SIRA) {
        const c = oz.cubuklar.find((x) => x.anahtar === k)!;
        const satir = el("div", "cubuk", kutu);
        satir.dataset["cubuk"] = k;
        el("span", "ad", satir, c.ad);
        const bar = el("span", "bar", satir);
        bar.setAttribute("role", "meter");
        bar.setAttribute("aria-label", c.ad);
        bar.setAttribute("aria-valuemin", "0");
        bar.setAttribute("aria-valuemax", "100");
        bar.setAttribute("aria-valuenow", String(c.deger));
        bar.setAttribute("aria-valuetext", `${c.deger} / 100 (${c.ham}${c.birim})`);
        el("i", "", bar).style.width = `${c.deger}%`;
        const fk = fark?.[k] ?? 0;
        if (fk !== 0 && kiyas) {
          const o2 = kiyas.cubuklar.find((x) => x.anahtar === k)!;
          el("i", "once", bar).style.width = `${o2.deger}%`;
        }
        el("span", "say", satir, String(c.deger));
        const fe = el("span", `fark${fk > 0 ? " art" : fk < 0 ? " azal" : ""}`, satir);
        fe.dataset["fark"] = String(fk);
        if (fk !== 0) fe.innerHTML = `${fk > 0 ? ART_SVG : AZAL_SVG} ${fk > 0 ? "+" : "−"}${Math.abs(fk)}`;
        fe.setAttribute("aria-label", fk === 0 ? "" : `${fk > 0 ? "arttı" : "azaldı"} ${Math.abs(fk)}`);
      }
      const tip = el("div", "tip", s);
      tip.dataset["tip"] = oz.tip;
      // tip tek sözcük; "yakın tip" kalktı (sadelik § 2.1)
      tip.innerHTML = `Tip: <b></b>`;
      tip.querySelector("b")!.textContent = oz.tipAd;
      // element uyumu (tuning § 12): aynı ×1,10 / komşu ×1,00 / diğer ×0,80; Yapay'da ceza yok
      if (p.uyumCarpani < 1) {
        const u = el("div", "uyari", s);
        u.dataset["uyum"] = "uyumsuz";
        u.setAttribute("role", "status");
        u.innerHTML = `<span>! Uyumsuz: Enerji yavaş</span>`;
        const uzun = `Enerji dolumu yavaşlar. ${ELEMENT_RENK[p.govdeElement].ad} Gövde, ${ELEMENT_RENK[p.element].ad} Çekirdeğe uzak (×0,80).`;
        u.title = uzun; u.setAttribute("aria-label", uzun);
      } else if (p.uyumCarpani > 1) {
        const u = el("div", "uyari iyi", s);
        u.dataset["uyum"] = "ayni";
        u.textContent = "Uyum: Enerji +%10";
        const uzun = `Element uyumu: Gövde ve Çekirdek ${ELEMENT_RENK[p.element].ad}. Enerji dolumu hızlanır (×1,10).`;
        u.title = uzun; u.setAttribute("aria-label", uzun);
      }
    }
    if (this.uyari) {
      const u = el("div", "uyari", s);
      u.dataset["cakisma"] = "1";
      u.setAttribute("role", "alert");
      u.innerHTML = `${UYARI_SVG}<span></span>`;
      u.querySelector("span")!.textContent = this.uyari;
    }
    const ds = el("div", "dene-satir", s);
    const ad = el("button", `k-dugme kucuk${this.ayrintiAcik ? " secili" : ""}`, ds, "Ayrıntı");
    ad.dataset["eylem"] = "ayrinti";
    ad.dataset["odak"] = "ayrinti";
    ad.setAttribute("aria-expanded", String(this.ayrintiAcik));
    ad.addEventListener("click", () => {
      this.ayrintiAcik = !this.ayrintiAcik;
      this.ayrintiEl.hidden = !this.ayrintiAcik;
      ad.classList.toggle("secili", this.ayrintiAcik);
      ad.setAttribute("aria-expanded", String(this.ayrintiAcik));
    });
    if (odak) (s.querySelector(`[data-odak="${odak}"]`) as HTMLElement | null)?.focus();
  }

  /** Odaktaki katmanın parça kartı: ad, tür, kanat/çıkıntı, element, fiyat/kilit, altı çubuğa katkı. */
  private parcaKartiCiz(s: HTMLElement, tur: KatmanTuru): void {
    const id = this.kurulum().kur[tur];
    const kart = el("div", "parca-karti", s);
    kart.setAttribute("role", "region");
    kart.setAttribute("aria-label", `${YUVA_AD[tur]} parça kartı`);
    el("div", "pk-tur k-e16", kart, YUVA_AD[tur]);
    if (!id) {
      el("h4", "", kart, "Boş");
      el("div", "pk-ipucu k-e16", kart, `Soldan bir ${YUVA_AD[tur]} seç ve tak.`);
      return;
    }
    const p = parcaBul(id);
    kart.dataset["parcaKarti"] = id;
    el("h4", "", kart, p.ad);
    const n = cikintiSayisi(id);
    const meta = p.tur === "govde" ? `${p.kanat} kanat` : p.tur === "disk" ? `${n ?? "?"} çıkıntı · yükseklik ${p.yukseklik}` : p.tur === "uc" ? (p.katki.desen ? DESEN_AD[p.katki.desen] : "Uç") : `${KOKEN_AD[p.koken]} · ${p.katki.yon === "sol" ? "sola" : "sağa"} döner`;
    el("div", "pk-satir k-e16", kart, meta);
    const elm = "element" in p && p.element ? (p.element as ElementAdi) : null;
    if (elm) {
      const r = el("div", "pk-satir k-e16", kart);
      const e = el("span", "k-el", r); e.dataset["el"] = elm; e.setAttribute("aria-hidden", "true");
      el("span", "", r, ELEMENT_RENK[elm].ad);
    }
    el("div", "pk-satir k-e16", kart, `Tip: ${TIP_AD[p.tipEgilimi]}`);
    const sahip = p.tur === "cekirdek" ? this.v.cekirdekler.filter((c) => c.tanimId === p.id).length : this.v.parcalar.filter((x) => x.tanimId === p.id).length;
    const g = parcaGorunumu(p, sahip, this.v.basarimIlerleme, this.tamamSet);
    const yd = this.yuvalar()[this.secili]!;
    const durum = yd.durum === "odunc" || yd.durum === "devreDisi" ? "Ödünç" : g.durum === "sahip" ? "Takılı" : g.etiket;
    el("div", `pk-durum k-e16${g.durum === "kilitli" ? " kilit" : ""}`, kart, durum);
    const tavan = katkiTavani();
    const d = katkiDegerleri(p);
    const kk = el("div", "", kart);
    kk.setAttribute("aria-label", "Altı çubuğa katkı");
    for (const k of CUBUK_SIRA) {
      const satir = el("div", "pk-k k-e16", kk);
      satir.dataset["katki"] = k;
      el("span", "", satir, CUBUK_AD[k]);
      el("b", "", satir, d[k] ? `+${Math.round(d[k])}` : "—");
      const bar = el("span", "bar", satir);
      el("i", "", bar).style.width = `${Math.round((d[k] / tavan[k]) * 100)}%`;
      satir.setAttribute("aria-label", `${CUBUK_AD[k]} katkısı ${Math.round(d[k])}`);
    }
    el("div", "pk-ipucu k-e16", kart, "Döndür: sürükle / oklar · Geri: Esc");
  }

  private eksikMetni(): string {
    const h = this.degerlendirme().hatalar.find((x) => x.yuva === this.secili);
    return h ? takimHataMetni(h) : "Bu topaçta parça eksik.";
  }

  private async yonSec(c: AtolyeCekirdegi, yon: "sag" | "sol"): Promise<void> {
    const once = this.cubuklar;
    try {
      const r = await apiIstek("PATCH", `/api/cekirdek/${c.id}`, { yon });
      if (r.durum !== 200) { this.durum(HESAP_HATA[r.veri.hata ?? "bicim"] ?? "Yön kaydedilemedi.", true); return; }
      c.yon = yon;
      this.onceki = once;
      this.ortaCiz();
      this.durum(`${cekirdekBul(c.tanimId).ad}: ${yon === "sol" ? "sola" : "sağa"} döner. Maçta bu yönle girer.`);
    } catch (e) { if (e instanceof BakimHatasi) bakimKatmani(() => location.reload()); }
  }

  private dene_(bot: string): void {
    const y = this.yuvalar()[this.secili];
    if (!y?.profil) return;
    sakla("devran.deneBot.v1", bot);
    try {
      sessionStorage.setItem(TASLAK_ANAHTAR, JSON.stringify({ takimNo: this.takimNo, taslak: this.taslak, secili: this.secili, sekme: this.sekme, ad: this.takimAdi, degisti: this.degisti }));
      const pr = y.profil.parcalar;
      sessionStorage.setItem("devran.dene.v1", JSON.stringify({ ...pr, yon: y.profil.donus, seviye: Math.max(1, y.seviye), ad: cekirdekBul(pr.cekirdek).ad }));
    } catch { /* depolama kapalı */ }
    git("dene", `&bot=${bot}`);
  }

  // ---- en sağ: TAKIM (referans 03) ----
  private sagCiz(): void {
    const s = this.sag;
    const odak = document.activeElement instanceof HTMLElement && s.contains(document.activeElement) ? document.activeElement.dataset["odak"] ?? "" : "";
    s.innerHTML = "";
    // başlık: TAKIM + takım adı düğmesi → takım menüsü (ikinci kat: ad, kayıtlı takımlar, aktif, yeni)
    const bas = el("div", "takim-bas", s);
    el("h3", "", bas, "Takım");
    const tm = el("button", `k-dugme kucuk takim-adi${this.takimMenuAcik ? " secili" : ""}`, bas, `${this.takimAdi} ▾`);
    tm.dataset["eylem"] = "takim-menu";
    tm.dataset["odak"] = "takim-menu";
    tm.setAttribute("aria-expanded", String(this.takimMenuAcik));
    tm.setAttribute("aria-label", `Takım: ${this.takimAdi}. Takım menüsü`);
    tm.addEventListener("click", () => { this.takimMenuAcik = !this.takimMenuAcik; this.sagCiz(); (this.sag.querySelector("[data-eylem=takim-menu]") as HTMLElement | null)?.focus(); });
    const menu = el("div", "takim-menu k-ic", s);
    menu.hidden = !this.takimMenuAcik;
    const adS = el("div", "adsatir", menu);
    const giris = el("input", "", adS);
    giris.type = "text";
    giris.maxLength = 20;
    giris.value = this.takimAdi;
    giris.setAttribute("aria-label", "Takım adı");
    giris.dataset["takimAdi"] = "1";
    giris.dataset["odak"] = "takim-adi";
    giris.addEventListener("input", () => { this.takimAdi = giris.value; });
    const adK = el("button", "", adS, "Adı kaydet");
    adK.dataset["eylem"] = "ad-kaydet";
    adK.addEventListener("click", () => void this.adKaydet());
    const liste = el("div", "tkm", s);
    liste.setAttribute("role", "listbox");
    liste.setAttribute("aria-label", "Takım sırası (Alt + ok tuşlarıyla taşı)");
    const yv = this.yuvalar();
    const gorulen = this.gorulenSeviye();
    yv.forEach((y, k) => {
      const kart = el("div", `tkart ${y.durum}`, liste);
      kart.setAttribute("role", "option");
      kart.setAttribute("aria-selected", String(k === this.secili));
      kart.tabIndex = k === this.secili ? 0 : -1;
      kart.draggable = true;
      kart.dataset["takimYuva"] = String(k);
      kart.dataset["odak"] = `tkart-${k}`;
      kart.dataset["pergelHedef"] = y.durum === "odunc" || y.durum === "devreDisi" ? "odunc-yuva" : "yuva";
      const cTanim = y.cekirdek?.tanimId ?? y.oduncCekirdek;
      // mini topaç: 3B tek kare (hazırsa) ya da yordamsal ikon
      const ik = el("span", "tk-ik", kart);
      const kur = this.kurulum(k).kur;
      const t3 = this.ikonlar3b && (kur.cekirdek || kur.govde) ? this.sahne.topacIkonu(kur, 24) : null;
      if (t3) { t3.className = "g3-ikon"; t3.setAttribute("aria-hidden", "true"); ik.appendChild(t3); }
      else if (cTanim) ik.appendChild(pikselTopac(cekirdekBul(cTanim).element, { r: 9, golge: false, koken: cekirdekBul(cTanim).koken }));
      else el("span", "k-soru", ik, "?");
      const yazi = el("span", "yazi", kart);
      const bas = el("b", "", yazi);
      if (cTanim) { const e = el("span", "k-el", bas); e.dataset["el"] = cekirdekBul(cTanim).element; e.setAttribute("aria-hidden", "true"); }
      bas.appendChild(document.createTextNode(`${k + 1}. ${cTanim ? cekirdekBul(cTanim).ad : "Boş"}`));
      const yeniYetenek = y.cekirdek && gorulen[y.cekirdek.id] !== undefined && y.cekirdek.seviye > gorulen[y.cekirdek.id]!;
      if (yeniYetenek) { const r = el("span", "rozetY", bas, "Yeni yetenek açıldı"); r.dataset["yeniYetenek"] = "1"; }
      const alt = y.durum === "odunc" ? "Ödünç · Lv.1" : y.durum === "devreDisi" ? "Ömrü bitti · maçta ödünç" : y.durum === "bos" ? "Yuva boş" : y.durum === "eksik" ? "Parça eksik" : `Lv.${y.seviye}${y.cekirdek?.omur !== null && y.cekirdek?.omur !== undefined ? ` · ömür ${y.cekirdek.omur}` : ""}`;
      el("small", "", yazi, alt);
      if (y.durum === "devreDisi") { const u = el("small", "", yazi, "Yapay ömrü bitti: yenile ya da başka Çekirdek tak."); u.style.color = "#ff9a7a"; u.dataset["omurBitti"] = "1"; }
      // D7: Dökümhane yenilemesi (kırmızı kart ya da azalan ömür): Market'te onayla
      const yn = y.cekirdek ? this.v.yenileme?.find((x) => x.cekirdekId === y.cekirdek!.id && x.omur !== null && x.omur < 30) : undefined;
      if (yn && (y.durum === "devreDisi" || (yn.omur ?? 30) <= 10)) {
        const yd = el("button", "yenileB", yazi, `Yenile · ${yn.fiyat} Altın`);
        yd.dataset["yenile"] = String(yn.cekirdekId);
        yd.setAttribute("aria-label", `Yapay Çekirdeği Dökümhane'de yenile, ${yn.fiyat} Altın`);
        yd.addEventListener("click", (e) => { e.stopPropagation(); git("market", `&yenile=${yn.cekirdekId}`); });
      }
      kart.setAttribute("aria-label", `${k + 1}. yuva: ${cTanim ? cekirdekBul(cTanim).ad : "boş"}, ${alt}. Seçmek için tıkla; Alt+yukarı/aşağı ile taşı.`);
      const ok = el("span", "ok", kart);
      const yuk = el("button", "", ok, "▲");
      yuk.setAttribute("aria-label", `${k + 1}. yuvayı yukarı taşı`);
      yuk.disabled = k === 0;
      yuk.addEventListener("click", (e) => { e.stopPropagation(); this.tasi(k, k - 1); });
      const asa = el("button", "", ok, "▼");
      asa.setAttribute("aria-label", `${k + 1}. yuvayı aşağı taşı`);
      asa.disabled = k === 2;
      asa.addEventListener("click", (e) => { e.stopPropagation(); this.tasi(k, k + 1); });
      // mini çubuklar (referans 03 takım kartı): Saldırı, Savunma, Stamina
      if (y.profil) {
        const oz = profilCubuklari(y.profil);
        const mini = el("span", "mini", kart);
        mini.setAttribute("aria-hidden", "true");
        for (const [a, kisa] of [["saldiri", "SAL"], ["savunma", "SAV"], ["stamina", "STA"]] as const) {
          const c = oz.cubuklar.find((x) => x.anahtar === a)!;
          el("span", "", mini, kisa);
          const i = el("i", "", mini);
          el("u", "", i).style.width = `${c.deger}%`;
        }
      }
      kart.addEventListener("click", () => this.sec(k));
      kart.addEventListener("keydown", (e) => {
        if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); this.tasi(k, k + (e.key === "ArrowUp" ? -1 : 1), true); return; }
        if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); this.sec(Math.max(0, Math.min(2, k + (e.key === "ArrowUp" ? -1 : 1))), true); return; }
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.sec(k, true); }
      });
      kart.addEventListener("dragstart", (e) => { this.surukleKaynak = k; kart.classList.add("surukle"); e.dataTransfer?.setData("text/plain", String(k)); });
      kart.addEventListener("dragend", () => { kart.classList.remove("surukle"); this.surukleKaynak = -1; });
      kart.addEventListener("dragover", (e) => { e.preventDefault(); kart.classList.add("hedef"); });
      kart.addEventListener("dragleave", () => kart.classList.remove("hedef"));
      kart.addEventListener("drop", (e) => {
        e.preventDefault();
        const kaynak = this.surukleKaynak >= 0 ? this.surukleKaynak : Number(e.dataTransfer?.getData("text/plain"));
        if (Number.isInteger(kaynak)) this.tasi(kaynak, k);
      });
    });
    // element çarkı yerine: Takım Ultisi oluşunca rozet (üç kendi Çekirdeği); çark verisi data-cark'ta (araçlar)
    const cr = el("div", "cark-ozet", s);
    cr.dataset["cark"] = yv.map((y) => { const t = y.cekirdek?.tanimId ?? y.oduncCekirdek; return t ? cekirdekBul(t).element : "-"; }).join(",");
    if (yv.every((y) => y.durum === "sahip")) {
      const r = el("span", "k-rozet tamam", cr, "Takım Ultisi");
      r.title = "Üç kendi Çekirdeğin hazır: maçta Takım Enerjisi dolunca Takım Ultisi açılır.";
    }
    const kyK = el("div", "", menu);
    el("h3", "", kyK, "Kayıtlı takımlar");
    const ky = el("div", "kayitli", kyK);
    for (const t of this.v.takimlar) {
      const d = el("button", "", ky);
      d.dataset["kayitliTakim"] = String(t.takimNo);
      d.dataset["odak"] = `kayitli-${t.takimNo}`;
      d.setAttribute("aria-current", String(t.takimNo === this.takimNo));
      el("span", "", d, t.ad);
      el("small", "", d, `${t.takimNo === this.v.aktifTakim ? "aktif · " : ""}${t.oynanabilir ? "hazır" : "eksik"}`);
      d.addEventListener("click", () => {
        if (t.takimNo === this.takimNo) return;
        if (this.degisti) this.durum(`${this.takimAdi}: kaydedilmemiş değişiklik bırakıldı.`, true);
        this.takimYukle(t.takimNo);
        this.secili = 0;
        this.ciz();
      });
    }
    const ey = this.kaydetYer;
    ey.innerHTML = "";
    const eyM = el("div", "eylemler", menu);
    const kaydet = el("button", "k-dugme", ey, this.degisti ? "Kaydet *" : "Kaydet");
    kaydet.dataset["eylem"] = "kaydet";
    kaydet.dataset["odak"] = "kaydet";
    const hatalar = this.degerlendirme().hatalar;
    if (hatalar.length) { kaydet.setAttribute("aria-disabled", "true"); kaydet.title = takimHataMetni(hatalar[0]!); }
    kaydet.addEventListener("click", () => void this.kaydet());
    const aktif = el("button", "", eyM, this.takimNo === this.v.aktifTakim ? "Aktif takım" : "Aktif yap");
    aktif.dataset["eylem"] = "aktif";
    aktif.disabled = this.takimNo === this.v.aktifTakim;
    aktif.addEventListener("click", () => void this.aktifYap());
    if (this.v.takimlar.length < this.v.takimTavani) {
      const yeni = el("button", "", eyM, "Yeni takım");
      yeni.dataset["eylem"] = "yeni-takim";
      yeni.addEventListener("click", () => void this.yeniTakim());
    }
    this.durumYaz();
    if (odak) (s.querySelector(`[data-odak="${odak}"]`) as HTMLElement | null)?.focus();
  }

  sec(k: number, odakla = false): void {
    if (k === this.secili) return;
    this.secili = k;
    this.onceki = null;
    this.uyari = "";
    this.solCiz();
    this.ortaCiz();
    this.sagCiz();
    if (odakla) (this.sag.querySelector(`[data-takim-yuva="${k}"]`) as HTMLElement | null)?.focus();
  }

  tasi(kaynak: number, hedef: number, odakla = false): void {
    if (hedef < 0 || hedef > 2 || kaynak === hedef) return;
    this.taslak = yuvaTasi(this.taslak, kaynak, hedef);
    if (this.secili === kaynak) this.secili = hedef; else if (this.secili === hedef) this.secili = kaynak;
    this.degisti = true;
    this.durum(`${kaynak + 1}. yuva ${hedef + 1}. sıraya taşındı. Maça ilk giren 1. yuvadır.`);
    this.ciz();
    if (odakla) (this.sag.querySelector(`[data-takim-yuva="${hedef}"]`) as HTMLElement | null)?.focus();
  }

  private gorulenSeviye(): Record<number, number> {
    let m: Record<number, number> = {};
    try { m = JSON.parse(oku(GORULEN_SEVIYE) ?? "{}") as Record<number, number>; } catch { m = {}; }
    let degisti = false;
    for (const c of this.v.cekirdekler) if (m[c.id] === undefined) { m[c.id] = c.seviye; degisti = true; }
    if (degisti) sakla(GORULEN_SEVIYE, JSON.stringify(m));
    return m;
  }

  private durum(metin: string, hata = false): void {
    this.durumMetni = metin;
    this.durumHata = hata;
    this.durumYaz();
  }

  // ---- sunucu ----
  async kaydet(): Promise<boolean> {
    const h = this.degerlendirme().hatalar;
    if (h.length) { this.durum(takimHataMetni(h[0]!), true); return false; }
    try {
      const r = await apiIstek<{ ok: boolean; atolye: AtolyeGorunumu; yuva?: number; tur?: YuvaTuru }>("PUT", `/api/takim/${this.takimNo}`, { ad: this.takimAdi, yuvalar: this.taslak });
      if (r.durum !== 200) {
        const k = r.veri.hata ?? "bicim";
        const metin = HESAP_HATA[k] ?? (r.veri.yuva !== undefined && r.veri.tur ? takimHataMetni({ kod: k as never, yuva: r.veri.yuva, tur: r.veri.tur }) : "Takım kaydedilemedi.");
        this.durum(metin, true);
        return false;
      }
      this.v = r.veri.atolye;
      const secili = this.secili;
      this.takimYukle(this.takimNo);
      this.secili = secili;
      this.durumMetni = `${this.takimAdi} kaydedildi.`;
      this.durumHata = false;
      this.ciz();
      return true;
    } catch (e) {
      if (e instanceof BakimHatasi) bakimKatmani(() => location.reload());
      return false;
    }
  }

  private async adKaydet(): Promise<void> {
    try {
      const r = await apiIstek<{ ok: boolean; ad: string }>("PATCH", `/api/takim/${this.takimNo}`, { ad: this.takimAdi });
      if (r.durum !== 200) { this.durum(HESAP_HATA[r.veri.hata ?? "bicim"] ?? "Ad kaydedilemedi.", true); return; }
      const t = this.v.takimlar.find((x) => x.takimNo === this.takimNo);
      if (t) t.ad = r.veri.ad;
      this.takimAdi = r.veri.ad;
      this.durumMetni = `Takım adı: ${r.veri.ad}`;
      this.durumHata = false;
      this.sagCiz();
    } catch (e) { if (e instanceof BakimHatasi) bakimKatmani(() => location.reload()); }
  }

  private async aktifYap(): Promise<void> {
    try {
      const r = await apiIstek("PATCH", "/api/aktif-takim", { takimNo: this.takimNo });
      if (r.durum !== 200) { this.durum(HESAP_HATA[r.veri.hata ?? "bicim"] ?? "Seçilemedi.", true); return; }
      this.v.aktifTakim = this.takimNo;
      this.durumMetni = `${this.takimAdi} aktif takım: maça bununla girersin.`;
      this.durumHata = false;
      this.sagCiz();
    } catch (e) { if (e instanceof BakimHatasi) bakimKatmani(() => location.reload()); }
  }

  private async yeniTakim(): Promise<void> {
    try {
      const r = await apiIstek<{ ok: boolean; takimNo: number; atolye: AtolyeGorunumu }>("POST", "/api/takim", {});
      if (r.durum !== 201) { this.durum(HESAP_HATA[r.veri.hata ?? "bicim"] ?? "Takım açılamadı.", true); return; }
      this.v = r.veri.atolye;
      this.takimYukle(r.veri.takimNo);
      this.secili = 0;
      this.sekme = "cekirdek";
      this.durumMetni = `${this.takimAdi} açıldı. Çekirdek tak.`;
      this.durumHata = false;
      this.ciz();
    } catch (e) { if (e instanceof BakimHatasi) bakimKatmani(() => location.reload()); }
  }

  private gelistirmePaneli(s: HTMLElement): void {
    const g = el("div", "gel", s);
    el("span", "", g, "Geliştirme:");
    const sel = el("select", "", g);
    sel.setAttribute("aria-label", "Verilecek parça (geliştirme)");
    for (const p of PARCALAR.parcalar) { const o = el("option", "", sel, `${YUVA_AD[p.tur as YuvaTuru]}: ${p.ad}`); o.value = p.id; }
    const ver = el("button", "", g, "Parça ver");
    ver.dataset["eylem"] = "parca-ver";
    ver.addEventListener("click", async () => {
      const r = await apiPost("/api/gelistirme/parca-ver", { tanim: sel.value });
      if (r.durum === 201) location.reload();
    });
    const xp = el("button", "", g, "+100 XP (seçili Çekirdek)");
    xp.dataset["eylem"] = "xp-ver";
    xp.addEventListener("click", async () => {
      const c = this.yuvalar()[this.secili]?.cekirdek;
      if (!c) return;
      const r = await apiPost("/api/gelistirme/xp-ver", { cekirdekId: c.id, xp: 100 });
      if (r.durum === 200) location.reload();
    });
  }

  // ---- OYNA ----
  private oynaNedeni(): string {
    const v = this.degerlendirme();
    if (v.hatalar.length) return takimHataMetni(v.hatalar[0]!);
    if (v.bos > 0) return bosYuvaMetni(v.bos);
    return "";
  }

  private oynaCiz(): void {
    const n = this.oynaNedeni();
    this.neden.textContent = n;
    if (n) {
      this.oyna.setAttribute("aria-disabled", "true");
      this.oyna.setAttribute("aria-describedby", this.neden.id);
    } else {
      this.oyna.removeAttribute("aria-disabled");
      this.oyna.removeAttribute("aria-describedby");
      if (this.degisti) this.neden.textContent = "Kaydedilmemiş değişiklik: OYNA önce kaydeder.";
    }
  }

  private async oynaTikla(): Promise<void> {
    if (this.oynaNedeni()) return;
    if (this.degisti && !(await this.kaydet())) return;
    if (this.v.aktifTakim !== this.takimNo) {
      try { await apiIstek("PATCH", "/api/aktif-takim", { takimNo: this.takimNo }); } catch { /* lobi yine seçtirir */ }
    }
    git("lobi");
  }
}

export type { TaslakTopac };
