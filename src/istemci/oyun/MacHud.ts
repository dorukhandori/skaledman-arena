import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import type { Dunya, Olay, TakimUyesi } from "../../paylasilan/sim/durum.ts";
import { MAC_ADIM, geriCekAcik } from "../../paylasilan/sim/mac.ts";
import { staminaOrani } from "../../paylasilan/sim/topac.ts";
import { TAKIM_ULTI_KART, TAKIM_YUVA, ULTI_YUVA, elenmemisKart, yuvaBedeli, yuvaDurumu, yuvaYetenegi } from "../../paylasilan/sim/yetenek.ts";
import { AYAR as AYAR_ } from "../../paylasilan/kurallar/ayar.ts";
import { RUHLAR } from "../../paylasilan/veri/katalog.ts";
import { YETENEK_SIM } from "../../paylasilan/veri/yetenekSablon.ts";
import { elementSvg } from "./elementSimge.ts";
import { ELEMENT_RENK, KOKEN_RENK } from "./renkler.ts";
import { metinOlcegiOku } from "../ekranlar/arayuz.ts";
import { ayarlariOku } from "./Ayarlar.ts";
import { Ses } from "../ses/Ses.ts";
import type { Daire, DugmeAdi } from "./dokunmatik.ts";

// Maç HUD'u (ux § 2: H1-H15, 960×540 mantıksal DOM katmanı; konum ve boyutlar tablodan birebir).
// Yazı boyutları: ad 10 · sayı 10 · tuş rozeti 10 · bekleme 12 · süre 14 · skor 20 · olay bandı 16.
// Renk hiçbir bilgiyi tek başına taşımaz: ayraç + tarama + simge, element = silüet, elenen = çarpı.
// D3: H6 yuva hâlleri (hazır / bekleme / Enerji yetersiz / kilitli / basılı / etkin / kullanıldı), H1b ULTİ + parıltı,
// H5 "Rakip: Ulti hazırlıyor"; H9 nişan ve H13 telegraf dünyada (YetenekGorsel). H10 D4; H15 yalnız Antrenman.
// D8: H1b'de Takım Enerjisi 4. dilim (altın çerçeve), yuva 4 = Takım Ultisi, H5 "Takım Ultisi hazır" / "Takım düştü".

const STIL = `
.mh { position:absolute; left:0; top:0; width:960px; height:540px; transform-origin:0 0; pointer-events:none; font-family:"Nunito Sans",system-ui,sans-serif; color:#f3f1e8; user-select:none; }
.mh .pn { position:absolute; top:8px; width:288px; height:64px; background:rgba(12,25,29,.9); border:2px solid #050d10; border-radius:8px; box-shadow:inset 0 0 0 1px #24414b; }
.mh .pn.sol { left:8px; } .mh .pn.sag { left:664px; }
.mh .pn .s1 { position:absolute; left:6px; right:6px; top:2px; height:14px; display:flex; align-items:center; gap:5px; font-size:10px; font-weight:800; white-space:nowrap; }
.mh .pn.sag .s1 { flex-direction:row-reverse; }
.mh .pn .ad { overflow:hidden; text-overflow:ellipsis; }
.mh .pn .lv { color:#a3b2b6; font-weight:700; }
.mh .pn .bos { flex:1; }
.mh .pn .ekip { display:flex; gap:2px; }
.mh .pn.sag .ekip { order:-1; }
.mh .bar { position:absolute; left:6px; top:20px; width:272px; height:14px; background:#1b2a30; border:1px solid #050d10; border-radius:3px; overflow:hidden; }
.mh .bar i { position:absolute; top:0; bottom:0; width:100%; background:#f2e8b0; }
.mh .pn.sol .bar i { left:0; } .mh .pn.sag .bar i { right:0; }
.mh .bar i.amber { background:#f2a33a; }
.mh .bar i.kirmizi { background:repeating-linear-gradient(135deg,#e3350d 0 4px,#9e2207 4px 7px); animation:mhNabiz 1.2s ease-in-out infinite; }
@keyframes mhNabiz { 50% { filter:brightness(1.5); } }
.mh .bar u { position:absolute; top:0; bottom:0; width:2px; background:rgba(5,13,16,.9); }
.mh .bar b { position:absolute; top:0; right:4px; font-size:10px; line-height:13px; font-weight:900; text-shadow:0 0 2px #000,0 1px 0 #000; }
.mh .pn.sag .bar b { right:auto; left:4px; }
.mh .bar s { position:absolute; top:0; left:3px; font-size:10px; line-height:13px; font-weight:900; text-decoration:none; display:none; color:#fff; text-shadow:0 1px 0 #000; }
.mh .pn.sag .bar s { left:auto; right:3px; }
.mh .en { position:absolute; left:6px; top:40px; display:flex; gap:4px; }
.mh .pn.sag .en { left:auto; right:6px; flex-direction:row-reverse; }
.mh .en span { position:relative; width:40px; height:12px; border:1px solid #9fb0b5; border-radius:2px; background:rgba(5,13,16,.5); overflow:hidden; }
.mh .en span i { position:absolute; left:0; top:0; bottom:0; background:#7fd3ff; }
.mh .en span.dolu { border-color:#cfeeff; box-shadow:0 0 4px #7fd3ff; }
.mh .en em { font-style:normal; font-size:10px; font-weight:800; color:#a3b2b6; margin-left:4px; line-height:12px; }
.mh .ct { position:absolute; left:254px; top:34px; width:24px; height:24px; }
.mh .pn.sag .ct { left:6px; }
.mh .ct.titre { animation:mhTitre .12s linear infinite; }
@keyframes mhTitre { 25% { transform:translateX(-1px); } 75% { transform:translateX(1px); } }
.mh .skor { position:absolute; left:400px; top:6px; width:160px; height:34px; text-align:center; font:800 20px/30px system-ui; letter-spacing:1px; background:rgba(12,25,29,.9); border:2px solid #050d10; border-radius:8px; }
.mh .sure { position:absolute; left:432px; top:42px; width:96px; height:22px; text-align:center; font:800 14px/20px system-ui; font-variant-numeric:tabular-nums; background:rgba(12,25,29,.85); border:2px solid #050d10; border-radius:6px; }
.mh .sure.son { color:#ff5a3a; text-decoration:underline; text-decoration-thickness:2px; }
.mh .sure.ani { color:#fff; background:#a3260a; letter-spacing:.5px; font-size:12px; }
.mh .bant { position:absolute; left:240px; top:84px; width:480px; height:36px; text-align:center; font:800 16px/32px system-ui; letter-spacing:1px; background:rgba(5,13,16,.86); border:2px solid #f4cf47; border-radius:8px; opacity:0; transition:opacity .15s; }
.mh .bant.acik { opacity:1; }
/* SANAT: Ulti anında bant Shift/Space şeridinin hemen üstünde (Ata hologramının başı üstte serbest; 06 § 1.2) */
.mh.mh .bant.asagi { top:438px; }
.mh .gs { position:absolute; left:330px; top:220px; width:300px; height:80px; text-align:center; font:900 48px/80px system-ui; letter-spacing:2px; color:#fff; text-shadow:0 3px 0 #050d10,0 0 12px rgba(0,0,0,.6); opacity:0; }
.mh .gs.acik { opacity:1; }
.mh .gs small { font-size:24px; letter-spacing:4px; }
.mh .yv { position:absolute; top:494px; width:44px; height:44px; background:rgba(12,25,29,.9); border:3px solid #f2e8b0; text-align:center; font-size:10px; font-weight:800; }
.mh .yv .tus { position:absolute; left:2px; top:1px; font-size:10px; color:#a3b2b6; }
.mh .yv .ic { position:absolute; inset:9px 4px 4px; font-size:10px; line-height:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.mh .yv.kare { border-radius:3px; }
.mh .yv.pah { clip-path:polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px); border-radius:0; }
.mh .yv.elmas { border-radius:3px; }
.mh .yv.elmas::before { content:""; position:absolute; left:9px; top:9px; width:20px; height:20px; transform:rotate(45deg); border:2px solid currentColor; opacity:.35; }
.mh .yv.yuvarlak { border-radius:50%; }
.mh .yv.yetmez { border-style:dashed; border-color:#8d989e; color:#a3b2b6; }
.mh .yv.kilit { border-color:#4a5a60; color:#8d989e; background:rgba(5,13,16,.85); }
.mh .yv.yok { border-color:#2c3d43; color:#4a5a60; background:rgba(5,13,16,.6); }
.mh .yv .nok { display:flex; gap:3px; margin-top:2px; } .mh .yv .nok b { width:5px; height:5px; border-radius:50%; background:#a3b2b6; }
.mh .yv.bekle { border-color:#4a5a60; color:#a3b2b6; }
.mh .yv .k { position:absolute; left:0; right:0; bottom:0; background:rgba(5,13,16,.75); }
.mh .yv .n { position:relative; font-size:12px; font-weight:900; }
.mh .tk { position:absolute; top:494px; width:44px; height:44px; background:rgba(12,25,29,.9); border:2px solid #24414b; border-radius:6px; }
.mh .tk .ik { position:absolute; left:8px; top:5px; }
.mh .tk .st { position:absolute; left:4px; right:4px; bottom:4px; height:4px; background:#1b2a30; }
.mh .tk .st i { position:absolute; left:0; top:0; bottom:0; background:#f2e8b0; }
.mh .tk .st i.amber { background:#f2a33a; } .mh .tk .st i.kirmizi { background:#e3350d; }
.mh .tk.aktif { border:3px solid #2fb8e8; }
.mh .tk .ok { position:absolute; left:15px; top:-12px; font-size:10px; color:#2fb8e8; display:none; }
.mh .tk.aktif .ok { display:block; }
.mh .tk.elendi { opacity:.45; filter:grayscale(1); }
.mh .tk .tab { position:absolute; left:4px; top:-14px; padding:0 3px; font-size:10px; font-weight:900; background:#e3350d; color:#fff; border-radius:3px; display:none; }
.mh .tk.tabhazir .tab { display:block; }
.mh .tk.tabhazir .ok { display:none; }
.mh .tk.cekiliyor { animation:mhNabiz .5s linear infinite; }
.mh .ds { position:absolute; left:240px; top:380px; width:480px; height:96px; padding:6px 8px; background:rgba(5,13,16,.92); border:2px solid #f4cf47; border-radius:8px; display:none; }
.mh .ds.acik { display:block; }
.mh .ds h4 { margin:0 0 4px; font:800 11px/14px system-ui; letter-spacing:.5px; }
.mh .ds .kartlar { display:flex; gap:8px; }
.mh .ds .kart { position:relative; flex:1; height:50px; padding:4px 6px 4px 26px; border:2px solid #24414b; border-radius:6px; background:#10222a; font-size:10px; font-weight:800; pointer-events:auto; cursor:pointer; }
.mh .ds .kart .tus { position:absolute; left:4px; top:4px; width:16px; height:16px; border:1px solid #a3b2b6; border-radius:3px; text-align:center; line-height:14px; }
.mh .ds .kart .ik { position:absolute; left:4px; top:26px; }
.mh .ds .kart .st { position:absolute; left:26px; right:6px; bottom:5px; height:4px; background:#1b2a30; } .mh .ds .kart .st i { position:absolute; left:0; top:0; bottom:0; background:#f2e8b0; }
.mh .ds .kart.secildi { border-color:#f4cf47; background:#2a2a14; }
.mh .ds .kart.elendi { opacity:.35; filter:grayscale(1); cursor:default; }
.mh .ds .kart.sahada { border-style:dashed; }
.mh .ds .sc { position:absolute; left:8px; right:8px; bottom:5px; height:5px; background:#1b2a30; border-radius:2px; overflow:hidden; } .mh .ds .sc i { position:absolute; left:0; top:0; bottom:0; background:#f4cf47; }
.mh .ip { position:absolute; left:160px; top:444px; width:640px; height:40px; display:none; text-align:center; font:700 12px/36px system-ui; background:rgba(5,13,16,.85); border:2px solid #24414b; border-radius:8px; }
.mh .ip.acik { display:block; }
.mh .els { display:block; flex:none; }
.mh .yv { transition:transform .06s; }
.mh .yv.hazir { border-color:#fff6c8; box-shadow:0 0 0 1px #050d10, 0 0 6px rgba(255,246,200,.55); }
.mh .yv.parla { box-shadow:0 0 0 2px #fff, 0 0 14px #fff6c8; }
.mh .yv.basili { border-width:5px; transform:translateY(-4px); }
.mh .yv.etkin { border-color:#7fd3ff; box-shadow:0 0 8px #7fd3ff; }
.mh .yv.kullanildi { border-color:#4a5a60; color:#8d989e; background:rgba(5,13,16,.85); }
.mh .yv .ys { display:block; margin:0 auto; }
.mh .ya { position:absolute; top:481px; width:48px; margin-left:-2px; font-size:8px; line-height:10px; text-align:center; color:#a3b2b6; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-shadow:0 1px 0 #000; }
.mh .ya.on { color:#f3f1e8; }
.mh .en span.parilti { box-shadow:0 0 0 1px #fff, 0 0 10px #cfeeff; }
.mh .en span.parilti i { background:#e6f8ff; }
.mh .en em.ulti { color:#ffb347; text-shadow:0 0 4px #ff8a3d; }
.mh .en span.tk { width:28px; border-color:#d9a441; margin-left:4px; }
.mh .en span.tk i { background:#ffcf5a; }
.mh .en span.tk.dolu { border-color:#ffe39a; box-shadow:0 0 5px #ffb347; }
.mh .en span.tk.dustu { border-style:dashed; border-color:#6d7a7f; }
.mh .en span.tk.dustu i { background:#6d7a7f; }
.mh .bant .els { display:inline-block; vertical-align:-3px; margin-left:6px; }
.mh .pn > .sayi { position:absolute; top:21px; right:14px; font-size:10px; line-height:13px; font-weight:900; text-shadow:0 0 2px #000,0 1px 0 #000; z-index:1; }
.mh .pn.sag > .sayi { right:auto; left:14px; }
/* GU-02 referans 07/08 HUD dili (menü dili v2 jetonları: src/istemci/stil/jetonlar.css; pixel yazı m5x7 + Jersey 10):
   lacivert panel, 2 px bej dış + koyu iç çizgi, pahlı köşe; STAMINA/ENERJİ büyük harf pixel etiketleri; stamina kırmızı→sarı
   bölgeli (dış uçtan kırmızı %25'e kadar, sonra sarı; ayraç + tarama + "!" korunur); Enerji yeşil (dolarken) / sarı-turuncu (Ulti
   hazır, "ULTİ" turuncu); bronz trapez skor plakası + turuncu rakam; süre plakası. Yerleşim (H1–H15) değişmez. */
.mh { --pn:#1b2131; --pn2:#20263a; --bej:#9a9184; --koyu:#05050a; --bronz:#c08e52; --bronzI:#e8c27a; --tur:#e8762f; --sari:#ffe45e; --kirm:#f2622f; --yesil:#86e065; --dolu:#fee55f; color:#fbf2c3; }
.mh .etk { font-family:"m5x7",ui-monospace,monospace; font-size:16px; line-height:12px; letter-spacing:1px; color:#fbf2c3; text-shadow:1px 1px 0 #05050a; font-weight:400; }
.mh .pn { background:var(--pn); border:2px solid var(--bej); border-radius:0; box-shadow:inset 0 0 0 1px var(--koyu), 0 2px 0 var(--koyu);
  clip-path:polygon(4px 0,calc(100% - 4px) 0,100% 4px,100% calc(100% - 4px),calc(100% - 4px) 100%,4px 100%,0 calc(100% - 4px),0 4px); }
.mh .pn .s1 .ad { color:#a49c8c; font-weight:700; }
.mh .bar { height:14px; background:#23283b; border:1px solid var(--koyu); border-radius:0; box-shadow:inset 0 0 0 1px #3a4058; }
.mh .bar i, .mh .bar i.amber { background:linear-gradient(90deg,var(--kirm) 0 25%,var(--sari) 25% 100%); background-size:272px 100%; background-repeat:no-repeat; box-shadow:inset 0 2px 0 rgba(255,255,255,.35), inset 0 -2px 0 rgba(0,0,0,.25); }
.mh .pn.sag .bar i, .mh .pn.sag .bar i.amber { background:linear-gradient(270deg,var(--kirm) 0 25%,var(--sari) 25% 100%); background-size:272px 100%; background-position:right top; }
.mh .bar i.kirmizi, .mh .pn.sag .bar i.kirmizi { background:repeating-linear-gradient(135deg,var(--kirm) 0 4px,#9e2207 4px 7px); }
.mh .bar u { background:var(--koyu); }
.mh .en { left:6px; top:42px; align-items:center; }
.mh .en b.etk { margin-right:6px; }
.mh .pn.sag .en b.etk { margin-right:0; margin-left:6px; }
.mh .en span { width:34px; height:12px; border:1px solid var(--koyu); border-radius:0; background:#23283b; box-shadow:inset 0 0 0 1px #3a4058; }
.mh .en span i { background:var(--yesil); box-shadow:inset 0 2px 0 rgba(255,255,255,.35); }
.mh .en span.dolu { border-color:var(--koyu); box-shadow:inset 0 0 0 1px #c7f5b0; }
.mh .en.ulti span i { background:var(--dolu); }
.mh .en.ulti span.dolu { box-shadow:inset 0 0 0 1px #fffbb3, 0 0 0 1px var(--tur); }
.mh .en span.tk { width:24px; border-color:var(--bronz); }
.mh .en span.tk i { background:var(--bronzI); }
.mh .en em { font-family:"m5x7",ui-monospace,monospace; font-size:16px; font-weight:400; letter-spacing:1px; }
.mh .en em.ulti { color:var(--tur); text-shadow:1px 1px 0 #05050a; }
.mh .skor { left:400px; top:4px; width:160px; height:38px; font:400 30px/34px "Jersey 10","m5x7",system-ui; color:var(--tur); letter-spacing:4px; text-shadow:2px 2px 0 #05050a;
  background:var(--bronz); border:0; border-radius:0; clip-path:polygon(0 0,100% 0,86% 100%,14% 100%); isolation:isolate; }
.mh .skor::before { content:""; position:absolute; inset:2px 2px 3px; background:var(--pn); clip-path:polygon(0 0,100% 0,86% 100%,14% 100%); z-index:-1; box-shadow:inset 0 0 0 1px var(--koyu); }
.mh .sure { top:44px; height:22px; font:400 20px/20px "Jersey 10","m5x7",system-ui; letter-spacing:2px; color:#fbf2c3; background:var(--pn); border:2px solid var(--bronz); border-radius:0; box-shadow:inset 0 0 0 1px var(--koyu); text-shadow:1px 1px 0 #05050a; }
.mh .sure.son { color:#ff8a7a; }
.mh .sure.ani { color:#fff7e0; background:#a3260a; font-size:16px; letter-spacing:1px; }
.mh .bant { font:400 20px/32px "Jersey 10","m5x7",system-ui; letter-spacing:2px; background:rgba(27,33,49,.94); border:2px solid var(--bronz); border-radius:0; box-shadow:inset 0 0 0 1px var(--koyu); }
.mh .gs { font:400 64px/80px "Jersey 10","m5x7",system-ui; letter-spacing:4px; color:#fbf2c3; text-shadow:3px 3px 0 #05050a,-1px -1px 0 #05050a,1px -1px 0 #05050a,-1px 1px 0 #05050a; }
.mh .gs small { font-size:40px; letter-spacing:6px; }
.mh .yv { background:var(--pn); border-color:var(--bej); box-shadow:inset 0 0 0 1px var(--koyu); }
.mh .yv .tus { font-family:"m5x7",ui-monospace,monospace; font-size:16px; line-height:12px; color:#fbf2c3; text-shadow:1px 1px 0 #05050a; }
.mh .yv.hazir { border-color:var(--bronzI); box-shadow:inset 0 0 0 1px var(--koyu), 0 0 0 1px var(--koyu); }
.mh .yv.parla { box-shadow:0 0 0 2px #fff7e0; }
.mh .yv.etkin { border-color:var(--tur); box-shadow:inset 0 0 0 1px var(--koyu); }
.mh .tk { background:var(--pn); border:2px solid var(--bej); border-radius:0; box-shadow:inset 0 0 0 1px var(--koyu); }
.mh .tk.aktif { border:3px solid var(--tur); }
.mh .tk .ok { color:#2fb8e8; text-shadow:1px 1px 0 #05050a; }
.mh .tk .st i, .mh .tk .st i.amber { background:var(--sari); } .mh .tk .st i.kirmizi { background:var(--kirm); }
.mh .ds, .mh .ip { background:rgba(27,33,49,.95); border-color:var(--bronz); border-radius:0; }
.mh .ds .kart { background:var(--pn2); border-color:var(--bej); border-radius:0; }
.mh .ds .kart.secildi { border-color:var(--bronzI); background:#3a2a1a; }
.mh .pn, .mh .skor, .mh .sure, .mh .yv { transition:opacity .12s; }
.mh .ortusme { opacity:.3; }
/* H16 ses düğmesi: her zaman görünür, tık = tümünü kapat/aç (M ile aynı); üzerine gelince Müzik/Efekt kaydırıcıları */
.mh .sd { position:absolute; left:572px; top:10px; width:28px; height:28px; pointer-events:auto; }
.mh .sd button { width:28px; height:28px; padding:0; border:2px solid var(--bej); background:var(--pn); color:#fbf2c3; cursor:pointer; box-shadow:inset 0 0 0 1px var(--koyu); display:flex; align-items:center; justify-content:center; }
.mh .sd button:focus-visible { outline:2px solid var(--bronzI); outline-offset:1px; }
.mh .sd .kd { display:none; position:absolute; left:-46px; top:30px; width:120px; padding:6px; background:var(--pn); border:2px solid var(--bronz); box-shadow:inset 0 0 0 1px var(--koyu); }
.mh .sd:hover .kd, .mh .sd:focus-within .kd { display:block; }
.mh .sd label { display:flex; align-items:center; gap:4px; font-family:"m5x7",ui-monospace,monospace; font-size:16px; line-height:14px; }
.mh .sd input { width:64px; accent-color:var(--tur); }
/* D6 HUD metin ölçeği (ux § 6.3: %100/125/150; panel yeniden dizilir, çubuklar sabit 272×14, Enerji 40×12, yuvalar 44×44) */
.mh.o125 .pn { height:78px; } .mh.o150 .pn { height:92px; }
.mh.o125 .pn .s1 { height:18px; font-size:12.5px; } .mh.o150 .pn .s1 { height:22px; font-size:15px; }
.mh.o125 .bar { top:24px; } .mh.o150 .bar { top:28px; }
.mh.o125 .pn > .sayi { top:24px; font-size:12px; line-height:14px; }
.mh.o150 .pn > .sayi { top:48px; right:44px; font-size:15px; line-height:18px; } .mh.o150 .pn.sag > .sayi { right:auto; left:44px; }
.mh.o125 .bar s { font-size:12px; } .mh.o150 .bar s { font-size:13px; }
.mh.o125 .en { top:46px; } .mh.o150 .en { top:50px; }
.mh.o125 .en em { font-size:12.5px; } .mh.o150 .en em { font-size:15px; }
.mh.o125 .ct { top:44px; } .mh.o150 .ct { top:46px; left:258px; } .mh.o150 .pn.sag .ct { left:6px; }
.mh.o125 .skor { font-size:25px; } .mh.o150 .skor { font-size:30px; line-height:31px; height:36px; }
.mh.o125 .sure { font-size:17.5px; line-height:22px; height:26px; } .mh.o150 .sure { top:44px; font-size:21px; line-height:26px; height:30px; width:110px; left:425px; }
.mh.o125 .bant { font-size:20px; height:40px; line-height:36px; top:90px; } .mh.o150 .bant { font-size:24px; height:46px; line-height:42px; top:100px; width:560px; left:200px; }
.mh.o125 .yv .tus, .mh.o125 .yv .ic { font-size:12.5px; } .mh.o150 .yv .tus, .mh.o150 .yv .ic { font-size:15px; line-height:15px; }
.mh.o125 .yv .n { font-size:15px; } .mh.o150 .yv .n { font-size:18px; }
.mh.o125 .ya { font-size:10px; top:479px; line-height:12px; } .mh.o150 .ya { font-size:12px; top:476px; line-height:14px; }
.mh.o125 .tk .tab, .mh.o125 .tk .ok { font-size:12.5px; } .mh.o150 .tk .tab, .mh.o150 .tk .ok { font-size:15px; top:-18px; }
.mh.o125 .ds { height:110px; top:368px; } .mh.o150 .ds { height:124px; top:356px; }
.mh.o125 .ds h4 { font-size:13.5px; line-height:17px; } .mh.o150 .ds h4 { font-size:16.5px; line-height:20px; }
.mh.o125 .ds .kart { font-size:12.5px; height:60px; } .mh.o150 .ds .kart { font-size:15px; height:68px; }
.mh.o125 .ip { font-size:15px; } .mh.o150 .ip { font-size:18px; }
.mh.o125 .skor { font-size:30px; } .mh.o150 .skor { font-size:40px; line-height:34px; height:38px; }
.mh.o125 .sure { font-size:20px; } .mh.o150 .sure { font-size:30px; line-height:26px; }
.mh.o125 .etk, .mh.o125 .en em, .mh.o125 .yv .tus { font-size:20px; line-height:14px; } .mh.o150 .etk, .mh.o150 .en em, .mh.o150 .yv .tus { font-size:24px; line-height:16px; }
.mh.o125 .bant { font-size:30px; } .mh.o150 .bant { font-size:30px; }
/* MOBIL-1 dokunmatik: yuvalar + Shift/Space rozetleri sağ alt baş parmak kavisinde dokunma düğmesi görseli olur (yerleri
   DokunmatikKontrol hesaplar, hizala() mantıksal px'e çevirir; isabet katmanda); yuva adları ve klavye rozetleri gizli;
   H8 takım yuvaları kendi panelinin altına çıkar (kavisle çakışmasın); ses düğmesi katmana taşınır (44 px). */
.mh.dokunmatik .ya, .mh.dokunmatik .sd, .mh.dokunmatik .yv .tus.kl { display:none; }
.mh.dokunmatik .yv { opacity:.9; border-radius:50%; clip-path:none; }
.mh.dokunmatik .yv .k { border-radius:0 0 50% 50% / 0 0 30% 30%; }
.mh.dokunmatik .yv.elmas::before { left:50%; top:50%; transform:translate(-50%,-50%) rotate(45deg) scale(var(--dki,1)); }
.mh.dokunmatik.dk-kapali .yv { display:none; }
.mh.dokunmatik .yv .ic { transform:scale(var(--dki,1)); }
.mh.dokunmatik .yv.yok { display:none; }
.mh.dokunmatik .yv .ad-dk { position:absolute; left:0; right:0; bottom:-14px; font-family:"m5x7",ui-monospace,monospace; font-size:16px; line-height:12px; color:#fbf2c3; text-shadow:1px 1px 0 #05050a; transform:scale(var(--dki,1)); transform-origin:50% 0; }
.mh .yv .ad-dk { display:none; } .mh.dokunmatik .yv .ad-dk { display:block; }
.mh.dokunmatik .yv.yuvarlak .ad-dk { bottom:auto; top:-14px; transform-origin:50% 100%; }
.mh.dokunmatik .bant.asagi { top:84px; }
.mh.dokunmatik .yv.ortusme { opacity:.45; }
/* Yüksek kontrast HUD (ux § 6.3): opak panel, 2 px beyaz çerçeve */
.mh.kontrast .pn, .mh.kontrast .skor, .mh.kontrast .sure, .mh.kontrast .bant, .mh.kontrast .yv, .mh.kontrast .tk, .mh.kontrast .ds, .mh.kontrast .ip { background:#000; border:2px solid #fff; box-shadow:none; }
.mh.kontrast .pn .lv, .mh.kontrast .en em, .mh.kontrast .yv .tus, .mh.kontrast .ya { color:#fff; }
.mh.kontrast .bar { border-color:#fff; } .mh.kontrast .en span { border-color:#fff; }
.mh.kontrast .skor { background:#fff; } .mh.kontrast .skor::before { background:#000; }
.mh.kontrast .pn { clip-path:none; } .mh.kontrast .etk { color:#fff; }
`;

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif = "", ust?: HTMLElement, metin = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin) e.textContent = metin;
  ust?.appendChild(e);
  return e;
}

/** Çatlak simgesi: 4 hâl, eşikler tik/burstEsik 0,5 / 0,75 / 0,9 (05 § 3.3, ux H1c). */
export function catlakSvg(oran: number): string {
  const s = oran >= 0.9 ? 3 : oran >= 0.75 ? 2 : oran >= 0.5 ? 1 : 0;
  const cizgi = ["", "M12 3 L10 10 L13 13", "M12 3 L10 10 L13 13 M4 15 L10 14 L11 21", "M12 3 L10 10 L13 13 M4 15 L10 14 L11 21 M20 6 L15 12 L21 17 L16 22"][s];
  const renk = s >= 3 ? "#e3350d" : s >= 1 ? "#f2a33a" : "#8d989e";
  return `<svg viewBox="0 0 24 24" width="24" height="24" style="opacity:${s === 0 ? 0.45 : 1}" aria-label="Çatlak ${s}/3"><circle cx="12" cy="12" r="10" fill="#3a4246" stroke="${renk}" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="#8d989e"/><path d="${cizgi}" stroke="#fff" stroke-width="1.7" fill="none"/></svg>`;
}

/** H7 Shift/Space mantıksal konumu (960×540): yetenek yuvası 1-2'nin üstü. Çanak (kamera.ts) bu kutuya girmez (test). */
export const H7 = { x: [8, 58], y: 430 } as const;

export const BITIS_AD ={ durma: "DURMA", ringOut: "RING OUT", parcalanma: "PARÇALANMA", berabere: "BERABERE" } as const;
export const sinifOran = (o: number) => (o < AYAR.kritikEsik ? "kirmizi" : o <= 0.6 ? "amber" : "");

interface Panel { enKok: HTMLElement; kok: HTMLElement; ik: HTMLElement; ad: HTMLElement; lv: HTMLElement; ekip: HTMLElement; dolgu: HTMLElement; sayi: HTMLElement; unlem: HTMLElement; enerji: HTMLElement[]; takimDilim: HTMLElement; enerjiYazi: HTMLElement; ct: HTMLElement }

export class MacHud {
  readonly kok = el("div", "mh");
  private stil = el("style");
  private paneller: [Panel, Panel];
  private skor = el("div", "skor");
  private sure = el("div", "sure");
  private bant = el("div", "bant");
  private gs = el("div", "gs");
  private bantKalan = 0;
  private yuvalar: HTMLElement[] = [];
  private yuvaAdlari: HTMLElement[] = [];
  private dash = el("div", "yv kare");
  private sekme = el("div", "yv kare");
  private takim: HTMLElement[] = [];
  private ds = el("div", "ds");
  private dsBaslik = el("h4");
  private dsKartlar: HTMLElement[] = [];
  private dsSure = el("i");
  readonly ipucu = el("div", "ip");
  private onbellek = new Map<HTMLElement, string>();
  private basla = 0;
  /** H16 ses düğmesi tıkı (Mac: M ile aynı iş). */
  sesTik: () => void = () => {};
  private sesDugme = el("button");
  /** H14 kartına tıklama → seçim. */
  kartSecildi: (uye: number) => void = () => {};

  constructor(ust: HTMLElement, private yerel: number, private adlar: [string, string]) {
    // D6: metin ölçeği (Ayarlar; menülerle aynı) ve yüksek kontrast HUD'a da uygulanır
    const o = metinOlcegiOku();
    if (o > 1) this.kok.classList.add(o >= 1.5 ? "o150" : "o125");
    if (ayarlariOku().kontrast === "acik") this.kok.classList.add("kontrast");
    this.kok.dataset["olcek"] = String(o);
    this.stil.textContent = STIL;
    document.head.appendChild(this.stil);
    this.paneller = [this.panel(yerel === 0 ? "sol" : "sag"), this.panel(yerel === 0 ? "sag" : "sol")];
    this.bant.setAttribute("aria-live", "polite");
    this.bant.setAttribute("role", "status");
    this.kok.append(this.skor, this.sure, this.bant, this.gs);
    // H6 yetenek yuvaları: Yetenek kare, Özel Yetenek pah, Ulti elmas, Parça Tekniği yuvarlak
    const sekil = ["kare", "pah", "elmas", "yuvarlak"];
    for (let k = 0; k < 4; k++) {
      const y = el("div", `yv ${sekil[k]}`, this.kok);
      y.style.left = `${8 + k * 50}px`;
      el("div", "k", y);
      const ya = el("span", "ya", this.kok);
      ya.style.left = `${8 + k * 50}px`;
      this.yuvaAdlari.push(ya);
      el("span", "tus", y, String(k + 1));
      el("div", "ic", y);
      this.yuvalar.push(y);
    }
    // H7 (GU-D): alt ortadan yetenek yuvalarının üstüne (sol alt köşe; alt orta referans 07 gibi boş, çanak büyüdü)
    for (const [r, ad, x] of [[this.dash, "Shift", H7.x[0]], [this.sekme, "Space", H7.x[1]]] as const) {
      r.style.left = `${x}px`;
      r.style.top = `${H7.y}px`;
      el("div", "k", r);
      const ic = el("div", "ic", r);
      el("span", "", ic, ad);
      el("span", "n", ic);
      this.kok.appendChild(r);
    }
    // H8 takım yuvaları
    for (let k = 0; k < 3; k++) {
      const t = el("div", "tk", this.kok);
      t.style.left = `${796 + k * 50}px`;
      el("span", "ok", t, "▲");
      el("span", "tab", t, "Tab");
      el("span", "ik", t);
      const st = el("span", "st", t); el("i", "", st);
      this.takim.push(t);
    }
    // H14
    this.ds.append(this.dsBaslik);
    const kartlar = el("div", "kartlar", this.ds);
    for (let k = 0; k < 3; k++) {
      const kart = el("div", "kart", kartlar);
      el("span", "tus", kart, String(k + 1));
      el("span", "ik", kart);
      el("div", "ad", kart);
      const st = el("span", "st", kart); el("i", "", st);
      kart.addEventListener("click", () => this.kartSecildi(k));
      this.dsKartlar.push(kart);
    }
    const sc = el("div", "sc", this.ds); sc.append(this.dsSure);
    this.kok.append(this.ds, this.ipucu);
    // H16 ses düğmesi (ux § 2): hoparlör; kapalıyken üstü çizili (yalnız renge dayanmaz); Müzik/Efekt kaydırıcıları
    const sd = el("div", "sd", this.kok);
    sd.appendChild(this.sesDugme);
    this.sesDugme.type = "button";
    this.sesDugme.addEventListener("click", (e) => { e.stopPropagation(); this.sesTik(); });
    const kd = el("div", "kd", sd);
    for (const [tur, ad] of [["muzik", "MÜZİK"], ["efekt", "EFEKT"]] as const) {
      const lb = el("label", "", kd);
      el("span", "", lb, ad);
      const r = el("input", "", lb);
      r.type = "range"; r.min = "0"; r.max = "100";
      r.value = String(Math.round(Ses.hacim[tur] * 100));
      r.setAttribute("aria-label", `${ad === "MÜZİK" ? "Müzik" : "Efekt"} sesi`);
      r.addEventListener("input", () => Ses.hacimAyarla(tur, Number(r.value) / 100));
    }
    this.sesDurumu(Ses.acikMi);
    ust.appendChild(this.kok);
  }

  private panel(taraf: "sol" | "sag"): Panel {
    const kok = el("div", `pn ${taraf}`, this.kok);
    const s1 = el("div", "s1", kok);
    el("span", "etk", s1, "STAMINA");
    const ik = el("span", "", s1);
    const ad = el("span", "ad", s1);
    const lv = el("span", "lv", s1);
    el("span", "bos", s1);
    const ekip = el("span", "ekip", s1);
    const bar = el("div", "bar", kok);
    const dolgu = el("i", "", bar);
    for (const o of [AYAR.kritikEsik, 0.6]) { const u = el("u", "", bar); u.style.left = taraf === "sol" ? `${o * 100}%` : `${(1 - o) * 100}%`; }
    const sayi = el("b", "sayi", kok);
    const unlem = el("s", "", bar, "!");
    const en = el("div", "en", kok);
    el("b", "etk", en, "ENERJİ");
    const enerji: HTMLElement[] = [];
    for (let k = 0; k < 3; k++) { const d = el("span", "", en); el("i", "", d); enerji.push(d); }
    // D8: paylaşılan 4. dilim (Takım Enerjisi)
    const takimDilim = el("span", "tk", en); el("i", "", takimDilim);
    takimDilim.title = "Takım Enerjisi";
    const enerjiYazi = el("em", "", en);
    const ct = el("span", "ct", kok);
    return { enKok: en, kok, ik, ad, lv, ekip, dolgu, sayi, unlem, enerji, takimDilim, enerjiYazi, ct };
  }

  /**
   * İkinci tur okunurluk (720p): Hibrit çanakta uzak kenardaki topacın gövdesi üst panellerin / skor plakasının, yakın kenarda
   * takım çemberi Shift/Space'in altına girebilir. Topaç kutularıyla kesişen HUD öğesi saydamlaşır (%30): topaç asla örtülmez.
   */
  ortusmeAyarla(kutular: { x0: number; y0: number; x1: number; y1: number }[]): void {
    const ogeler: [HTMLElement, number, number, number, number][] = [
      [this.paneller[this.yerel === 0 ? 0 : 1]!.kok, 8, 8, 296, 72], [this.paneller[this.yerel === 0 ? 1 : 0]!.kok, 664, 8, 952, 72],
      [this.skor, 400, 4, 560, 42], [this.sure, 432, 44, 528, 66],
      ...(this.dkYer ? this.dkKutular : [[this.dash, H7.x[0], H7.y, H7.x[0] + 44, H7.y + 44], [this.sekme, H7.x[1], H7.y, H7.x[1] + 44, H7.y + 44]] as [HTMLElement, number, number, number, number][]),
    ];
    for (const [e, x0, y0, x1, y1] of ogeler) {
      const kes = kutular.some((k) => k.x0 < x1 && k.x1 > x0 && k.y0 < y1 && k.y1 > y0);
      e.classList.toggle("ortusme", kes);
    }
  }

  /** H16: düğmenin hâli (açık / kapalı). */
  sesDurumu(acik: boolean): void {
    this.sesDugme.setAttribute("aria-label", acik ? "Sesi kapat" : "Sesi aç");
    this.sesDugme.title = acik ? "Sesi kapat (M)" : "Sesi aç (M)";
    this.sesDugme.innerHTML = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 6h3l4-3v10l-4-3H2z" fill="#fbf2c3"/>${acik ? '<path d="M11 5.5c1 1.2 1 3.8 0 5M12.8 4c1.8 2 1.8 6 0 8" stroke="#fbf2c3" stroke-width="1.5" fill="none"/>' : '<path d="M10.5 5.5l4 5M14.5 5.5l-4 5" stroke="#f2622f" stroke-width="2"/>'}</svg>`;
  }

  hizala(x: number, y: number, olcek: number): void {
    this.kok.style.transform = `translate(${x}px, ${y}px) scale(${olcek})`;
    if (this.dkYer) this.dokunmatikUygula(x, y, olcek);
  }

  // ---- MOBIL-1 dokunmatik düzen ----
  private dkYer: Record<DugmeAdi, Daire> | null = null;
  private dkAnahtar = "";
  private dkKutular: [HTMLElement, number, number, number, number][] = [];

  /** Dokunmatik düzeni aç: yuvalar/rozetler düğme görseli, H8 kendi panelinin altına, etiketler dokunmatik dilinde. */
  dokunmatikAc(): void {
    this.kok.classList.add("dokunmatik");
    for (const [r, ad] of [[this.dash, "DASH"], [this.sekme, "SEKME"]] as const) {
      const s = r.querySelector(".ic > span:first-child");
      if (s) s.textContent = ad;
    }
    // ad etiketi .k (bekleme süpürmesi, ilk çocuk) ile .ic (simge, son çocuk) arasına: guncelle() ikisini sırayla okur
    for (let k = 0; k < 4; k++) {
      const y = this.yuvalar[k]!;
      const ad = document.createElement("span");
      ad.className = "ad-dk";
      ad.textContent = k === 2 ? "ULTİ" : k === 3 ? "TAKIM" : "";
      y.insertBefore(ad, y.children[1] ?? null);
    }
    for (let k = 0; k < 3; k++) {
      const t = this.takim[k]!;
      t.style.left = `${(this.yerel === 0 ? 8 : 808) + k * 50}px`;
      t.style.top = "84px";
    }
  }

  /** Tur arası / bitiş: düğme görselleri gizli (seçim paneli ve sonuç alanı serbest). */
  dokunmatikDugmeler(acik: boolean): void { this.kok.classList.toggle("dk-kapali", !acik); }

  /** Düğme yerleri (DokunmatikKontrol katmanı CSS px'i; katman ile HUD aynı #sahne kökünde). */
  dokunmatikYer(yer: Record<DugmeAdi, Daire>): void { this.dkYer = yer; }

  private dokunmatikUygula(x: number, y: number, olcek: number): void {
    const yer = this.dkYer!;
    const anahtar = `${x}|${y}|${olcek}|${JSON.stringify(yer)}`;
    if (anahtar === this.dkAnahtar) return;
    this.dkAnahtar = anahtar;
    this.dkKutular = [];
    const esle: [HTMLElement, DugmeAdi][] = [[this.yuvalar[0]!, "y1"], [this.yuvalar[1]!, "y2"], [this.yuvalar[2]!, "y3"], [this.yuvalar[3]!, "y4"], [this.dash, "dash"], [this.sekme, "sekme"]];
    for (const [e, ad] of esle) {
      const d = yer[ad];
      const L = (d.x - d.r - x) / olcek;
      const T = (d.y - d.r - y) / olcek;
      const S = (2 * d.r) / olcek;
      e.style.left = `${L}px`;
      e.style.top = `${T}px`;
      e.style.width = `${S}px`;
      e.style.height = `${S}px`;
      e.style.setProperty("--dki", String(Math.max(1, S / 44)));
      this.dkKutular.push([e, L, T, L + S, T + S]);
    }
  }

  /** GERİ ÇEK düğmesinin yeri (CSS px, sol üst): H8'in yanında, panel tarafına göre. */
  geriCekYeri(c: { x: number; y: number; olcek: number }): { x: number; y: number } {
    const s = c.olcek;
    const y = c.y + 84 * s + (44 * s - 44) / 2;
    return this.yerel === 0 ? { x: c.x + 158 * s, y } : { x: c.x + 802 * s - 104, y };
  }

  private yaz(e: HTMLElement, s: string, html = false): void {
    if (this.onbellek.get(e) === s) return;
    this.onbellek.set(e, s);
    if (html) e.innerHTML = s; else e.textContent = s;
  }

  /** H5 olay bandı: aynı anda tek band, yeni olay eskinin üstüne biner (1,2-2 sn). */
  bantGoster(metin: string, sure = 1.6, html = false, asagi = false): void {
    if (html) this.bant.innerHTML = metin; else this.bant.textContent = metin;
    this.bant.classList.toggle("asagi", asagi);
    this.bant.classList.add("acik");
    this.bantKalan = sure;
  }

  /** Sim olayından band metni (ux § 7 mikro-kopya). */
  olay(o: Olay, d: Dunya): void {
    const ben = this.yerel;
    switch (o.tur) {
      case "turBitti": {
        const s = o.sonuc;
        if (s.tur === "berabere") this.bantGoster("BERABERE · iki topaç da elendi", 2);
        else this.bantGoster(`${BITIS_AD[s.tur]} +${s.puan} · ${s.kazanan === ben ? "sen" : "rakip"}`, 2);
        break;
      }
      case "aniOlum": this.bantGoster("Ani ölüm", 2); break;
      case "geriCek": if (o.i !== ben) this.bantGoster("Rakip topaç değiştiriyor", 1.4); break;
      case "turBasladi": if (o.turNo > 1) this.basla = 0.6; break;
      case "secim":
        if (o.i !== ben && d.mac.faz === "turArasi") this.bantGoster("Rakip topaç değiştiriyor", 1.4);
        break;
      case "yetenekBasladi":
        // Ulti / Takım Ultisi: Ata hologramı çağıranın çekirdeğinden yukarı açılır (RuhGorsel); tek bant alt-ortada
        // (06-kutsal-canavarlar.md § 1.2: canavarın başına ve üst HUD'a binmez)
        if (o.kademe === 4) this.bantGoster(o.i === ben ? "TAKIM ULTİSİ" : "Rakip: Takım Ultisi hazırlıyor", 1.8, false, true);
        else if (o.kademe === 3 && o.i !== ben) this.bantGoster(`Rakip: Ulti hazırlıyor${elementSvg(d.profiller[o.i]!.element, 16)}`, 1.8, true, true);
        else if (o.kademe === 3) {
          const el = d.profiller[o.i]!.element;
          const unvan = RUHLAR.find((x) => x.ata && x.element === el)?.unvan;
          this.bantGoster(`ULTİ · ${YETENEK_SIM[o.no]!.ad}${unvan ? ` · ${unvan}` : ""}${elementSvg(el, 16)}`, 1.8, true, true);
        }
        break;
      case "yetenekReddi":
        if (o.i === ben) this.bantGoster(this.retMetni(o.neden, o.yuva, d), 1.4);
        break;
      case "takimEnerjiDoldu":
        if (o.i === ben && d.seviye[ben]! >= AYAR_.yetenek.seviyeYuva[TAKIM_YUVA]!) this.bantGoster(elenmemisKart(d, ben) >= TAKIM_ULTI_KART ? "Takım Ultisi hazır · 4" : "Takım düştü", 1.8);
        break;
      case "enerjiDoldu": {
        const k = o.i === ben ? 0 : 1;
        const dl = this.paneller[k]!.enerji[o.dilim - 1];
        if (dl) { dl.classList.add("parilti"); this.parilti.push({ e: dl, kalan: 0.12 }); }
        break;
      }
      default: break;
    }
  }

  private parilti: { e: HTMLElement; kalan: number }[] = [];
  private oncekiKart = 3;
  private oncekiHazir: boolean[] = [false, false, false, false];
  private parlaKalan: number[] = [0, 0, 0, 0];

  /** ux § 7: ne oldu + ne yapabilirsin; suçlayıcı sözcük yok. */
  private retMetni(neden: string, yuva: number, d: Dunya): string {
    const t = d.topaclar[this.yerel]!;
    const p = d.profiller[this.yerel]!;
    switch (neden) {
      case "takimDustu": return "Takım düştü: Takım Ultisi için 2 topaç gerekir.";
      case "enerji": if (yuva === TAKIM_YUVA) return "Takım Enerjisi henüz dolmadı."; return `Enerji yetmiyor: ${Math.ceil(yuvaBedeli(t, p, yuva) / 100)} dilim gerekir.`;
      case "bekleme": return `Bekleme: ${(((yuva === 0 ? t.bekleme1 : t.bekleme2) / AYAR.adimHz)).toFixed(1)} sn.`;
      case "kilitli": return "Bu yuva Lv.3 Çekirdekte açılır.";
      case "ultiKullanildi": return yuva === TAKIM_YUVA ? "Takım Ultisi bu maçta kullanıldı." : "Ulti bu maçta kullanıldı.";
      case "rakipUlti": return "Rakibin Ulti'si sürerken Ulti kullanılamaz.";
      case "stamina": return "Stamina yetmiyor: Ulti'nin bedeli var.";
      case "mesgul": return "Önce süren yetenek bitsin.";
      case "yok": return yuva === 3 ? "Parça Tekniği ilk sürümde yok." : "Bu yuva boş.";
      default: return "";
    }
  }

  guncelle(d: Dunya, dt: number, basiliYuva = -1): void {
    const m = d.mac;
    const T = d.takimlar!;
    // H1 / H2
    for (let k = 0; k < 2; k++) {
      const i = k === 0 ? this.yerel : 1 - this.yerel;
      const p = d.profiller[i]!;
      const t = d.topaclar[i]!;
      const pn = this.paneller[k]!;
      const oran = staminaOrani(t, p);
      this.yaz(pn.ik, elementSvg(p.element, 14), true);
      this.yaz(pn.ad, `${this.adlar[k]} · ${ELEMENT_RENK[p.element].ad} ${KOKEN_RENK[p.koken].ad}`);
      this.yaz(pn.lv, `Lv.${d.seviye[i]}`);
      pn.dolgu.style.width = `${Math.max(0, oran) * 100}%`;
      const sinif = sinifOran(oran);
      if (pn.dolgu.className !== sinif) pn.dolgu.className = sinif;
      pn.unlem.style.display = oran < AYAR.kritikEsik ? "block" : "none";
      // kendi çubuğunda sayı, rakipte yok (ux H2: kendi sayı, rakip oran)
      this.yaz(pn.sayi, k === 0 ? `${Math.max(0, Math.round(oran * 100))}%` : "");
      // H2: rakibin 3 element simgesi, elenen çarpılı (H1'de de kendi takımı H8'de)
      if (k === 1) this.yaz(pn.ekip, T[i]!.uyeler.map((u) => elementSvg(u.profil.element, 14, { soluk: u.elendi === 1, capraz: u.elendi === 1 })).join(""), true);
      // Enerji 3 dilim (D2: yalnız devralma; D3'te dolar)
      const e = t.enerji;
      for (let s = 0; s < 3; s++) {
        const dolu = Math.max(0, Math.min(1, (e - s * 100) / 100));
        const dl = pn.enerji[s]!;
        (dl.firstElementChild as HTMLElement).style.width = `${dolu * 100}%`;
        dl.classList.toggle("dolu", dolu >= 1);
      }
      const ultiAcik = yuvaDurumu(d, i, ULTI_YUVA);
      const ultiVar = d.profiller[i]!.yetenekler[ULTI_YUVA]! >= 0 && ultiAcik !== "kilitli" && ultiAcik !== "ultiKullanildi" && ultiAcik !== "yok";
      this.yaz(pn.enerjiYazi, e >= 300 ? (ultiVar ? "ULTİ" : "DOLU") : "");
      pn.enerjiYazi.classList.toggle("ulti", e >= 300 && ultiVar);
      pn.enKok.classList.toggle("ulti", e >= 300 && ultiVar);
      // D8: Takım Enerjisi (4. dilim): dolu = parlak; takım düştü / kullanıldı = kesikli gri
      const te = d.takimEnerji[i]!;
      (pn.takimDilim.firstElementChild as HTMLElement).style.width = `${Math.max(0, Math.min(1, te / AYAR_.enerji.takimDilim)) * 100}%`;
      pn.takimDilim.classList.toggle("dolu", te >= AYAR_.enerji.takimDilim && !d.takimUltiKullanildi[i]);
      pn.takimDilim.classList.toggle("dustu", d.takimUltiKullanildi[i] === 1 || elenmemisKart(d, i) < TAKIM_ULTI_KART);
      pn.takimDilim.title = d.takimUltiKullanildi[i] ? "Takım Ultisi kullanıldı" : elenmemisKart(d, i) < TAKIM_ULTI_KART ? "Takım düştü" : `Takım Enerjisi ${Math.floor(te)}/100`;
      const tikOran = t.tik / p.parametreler.burstEsik;
      this.yaz(pn.ct, catlakSvg(tikOran), true);
      pn.ct.classList.toggle("titre", tikOran >= 0.9);
    }
    // D8 H5 "Takım düştü": Takım Ultisi kullanılmadan elenmemiş kart 2'nin altına inince bir kez
    const kart = elenmemisKart(d, this.yerel);
    if (this.oncekiKart >= TAKIM_ULTI_KART && kart < TAKIM_ULTI_KART && !d.takimUltiKullanildi[this.yerel] && d.seviye[this.yerel]! >= AYAR_.yetenek.seviyeYuva[TAKIM_YUVA]!) this.bantGoster("Takım düştü", 1.6);
    this.oncekiKart = kart;
    // H3 skor
    this.yaz(this.skor, `${m.puan[this.yerel]} – ${m.puan[1 - this.yerel]}`);
    // H4 süre
    const kalan = Math.max(0, MAC_ADIM.macSuresi - m.saat);
    if (m.aniOlum) {
      const ak = Math.max(0, Math.ceil((MAC_ADIM.aniOlum - m.aniOlumTick) / AYAR.adimHz));
      this.yaz(this.sure, `ANİ ÖLÜM ${ak}`);
      this.sure.className = "sure ani";
    } else {
      const sn = Math.ceil(kalan / AYAR.adimHz);
      this.yaz(this.sure, `${Math.floor(sn / 60)}:${String(sn % 60).padStart(2, "0")}`);
      this.sure.className = sn <= 10 && m.faz !== "geriSayim" ? "sure son" : "sure";
    }
    // geri sayım: Hazır (2 s) → 3-2-1 → BAŞLA (ortada 48 px)
    if (m.faz === "geriSayim") {
      const gecen = MAC_ADIM.geriSayim - m.kalanTick;
      const metin = gecen < MAC_ADIM.hazir ? "<small>HAZIR</small>" : String(3 - Math.floor((gecen - MAC_ADIM.hazir) / AYAR.adimHz));
      this.yaz(this.gs, metin, true);
      this.gs.classList.add("acik");
      this.basla = 0.5;
    } else if (this.basla > 0) {
      this.basla -= dt;
      this.yaz(this.gs, "BAŞLA");
      this.gs.classList.toggle("acik", this.basla > 0);
    } else this.gs.classList.remove("acik");

    const ben = d.topaclar[this.yerel]!;
    const bp = d.profiller[this.yerel]!;
    // H6 yuvaları (ux § 2 H6): hazır · bekleme (karartma + sn) · Enerji yetersiz (kesikli + nokta) · kilitli (Lv.3) ·
    // basılı (kalın + 4 px yukarı) · etkin (telegraf/etki) · kullanıldı (Ulti); yuva 4 boş (Parça Tekniği yok)
    const yv = this.yuvalar;
    for (let k = 0; k < 4; k++) {
      const y = yv[k]!;
      const no = yuvaYetenegi(d, this.yerel, k);
      const bilgi = no >= 0 ? YETENEK_SIM[no]! : null;
      const durum = yuvaDurumu(d, this.yerel, k);
      const etkin = ben.yetenekFaz !== 0 && ben.yetenekYuva === k;
      const bekleme = k === 0 ? ben.bekleme1 : k === 1 ? ben.bekleme2 : 0;
      const hazir = durum === null;
      const kilit = durum === "kilitli" || durum === "takimDustu";
      const kullanildi = durum === "ultiKullanildi";
      const bos = !bilgi;
      const yetmez = !kilit && !kullanildi && !bos && (durum === "enerji" || durum === "stamina");
      if (hazir && !this.oncekiHazir[k]) this.parlaKalan[k] = 0.15;
      this.oncekiHazir[k] = hazir;
      if (this.parlaKalan[k]! > 0) this.parlaKalan[k]! -= dt;
      y.classList.toggle("hazir", hazir);
      y.classList.toggle("parla", this.parlaKalan[k]! > 0);
      y.classList.toggle("bekle", bekleme > 0 && !etkin);
      y.classList.toggle("yetmez", yetmez && bekleme === 0);
      y.classList.toggle("kilit", kilit);
      y.classList.toggle("kullanildi", kullanildi);
      y.classList.toggle("yok", bos);
      y.classList.toggle("etkin", etkin);
      y.classList.toggle("basili", basiliYuva === k && !bos);
      y.dataset["durum"] = etkin ? "etkin" : basiliYuva === k ? "basili" : hazir ? "hazir" : bekleme > 0 ? "bekleme" : (durum ?? "hazir");
      const sweep = y.firstElementChild as HTMLElement;
      const toplam = bilgi?.beklemeAdim ?? 1;
      sweep.style.height = `${bekleme > 0 && !etkin ? (bekleme / toplam) * 100 : 0}%`;
      y.title = bilgi ? (k === TAKIM_YUVA ? "Takım Ultisi · Takım Enerjisi (4. dilim)" : `${["Yetenek", "Özel Yetenek", "Ulti"][k]}: ${bilgi.ad} · ${bilgi.enerjiBedel / 100} dilim`) : "Boş";
      this.yaz(this.yuvaAdlari[k]!, bilgi ? bilgi.ad : "");
      this.yuvaAdlari[k]!.classList.toggle("on", hazir || basiliYuva === k);
      const ic = y.lastElementChild as HTMLElement;
      const simge = bilgi ? elementSvg(bp.element, 18).replace('class="els"', 'class="els ys"') : "";
      if (bos) this.yaz(ic, "—");
      else if (durum === "takimDustu") this.yaz(ic, `<span>✕</span>`, true);
      else if (kilit) this.yaz(ic, `<svg viewBox="0 0 12 12" width="12" height="12" aria-label="kilitli"><rect x="2" y="5" width="8" height="6" rx="1" fill="#8d989e"/><path d="M4 5V3.6a2 2 0 0 1 4 0V5" fill="none" stroke="#8d989e" stroke-width="1.5"/></svg><span>Lv.${AYAR_.yetenek.seviyeYuva[k]}</span>`, true);
      else if (kullanildi) this.yaz(ic, `${simge}<span>✓</span>`, true);
      else if (bekleme > 0 && !etkin) { const sn = bekleme / AYAR.adimHz; this.yaz(ic, `<span class="n">${sn >= 10 ? sn.toFixed(0) : sn.toFixed(1)}</span>`, true); }
      else if (yetmez) this.yaz(ic, `${simge}<span class="nok">${"<b></b>".repeat(k === TAKIM_YUVA ? 1 : Math.ceil(yuvaBedeli(ben, bp, k) / 100))}</span>`, true);
      else this.yaz(ic, simge, true);
    }
    for (const p of this.parilti) { p.kalan -= dt; if (p.kalan <= 0) p.e.classList.remove("parilti"); }
    this.parilti = this.parilti.filter((p) => p.kalan > 0);
    // H7
    this.rozet(this.dash, ben.dashBekleme, bp.sim.dashBekleme, ben.stamina - AYAR.eylemStaminaPayi < bp.sim.dashMaliyet);
    this.rozet(this.sekme, ben.sekmeBekleme, Math.round(AYAR.sekmeBekleme * AYAR.adimHz), ben.stamina - AYAR.eylemStaminaPayi < AYAR.sekmeStamina);
    // H8
    const tk = T[this.yerel]!;
    const tabHazir = geriCekAcik(d, this.yerel);
    for (let k = 0; k < 3; k++) {
      const u = tk.uyeler[k]!;
      const kutu = this.takim[k]!;
      const aktif = k === tk.aktif;
      const o = this.uyeOrani(d, this.yerel, k, u);
      this.yaz(kutu.children[2] as HTMLElement, elementSvg(u.profil.element, 28, { capraz: u.elendi === 1 }), true);
      const st = kutu.querySelector(".st i") as HTMLElement;
      st.style.width = `${o * 100}%`;
      st.className = sinifOran(o);
      kutu.classList.toggle("aktif", aktif && !u.elendi);
      kutu.classList.toggle("elendi", u.elendi === 1);
      kutu.classList.toggle("tabhazir", aktif && tabHazir);
      kutu.classList.toggle("cekiliyor", aktif && ben.geriCekKalan > 0);
      kutu.title = `${ELEMENT_RENK[u.profil.element].ad} ${KOKEN_RENK[u.profil.koken].ad}${u.elendi ? " · elendi" : ""}`;
    }
    // H14 takım değişimi seçimi (kaybeden için; 1/2/3 ya da tıkla; süre çubuğu)
    const seciyor = m.faz === "turArasi" && tk.secim === -2;
    this.ds.classList.toggle("acik", seciyor || (m.faz === "turArasi" && tk.secim >= 0 && tk.uyeler[tk.aktif]!.elendi === 1));
    if (m.faz === "turArasi") {
      this.yaz(this.dsBaslik, seciyor ? "Sıradaki topacını seç · 1 · 2 · 3 (süre dolunca sıradaki gelir)" : "Seçildi · hazırlanıyor");
      for (let k = 0; k < 3; k++) {
        const u = tk.uyeler[k]!;
        const kart = this.dsKartlar[k]!;
        this.yaz(kart.children[1] as HTMLElement, elementSvg(u.profil.element, 18, { capraz: u.elendi === 1 }), true);
        this.yaz(kart.children[2] as HTMLElement, `${ELEMENT_RENK[u.profil.element].ad} ${KOKEN_RENK[u.profil.koken].ad} · ${u.profil.tip}${u.elendi ? " · elendi" : ""}`);
        (kart.querySelector(".st i") as HTMLElement).style.width = `${this.uyeOrani(d, this.yerel, k, u) * 100}%`;
        kart.classList.toggle("elendi", u.elendi === 1);
        kart.classList.toggle("secildi", tk.secim === k);
      }
      const toplam = MAC_ADIM.kutlama + MAC_ADIM.secim;
      this.dsSure.style.width = `${(m.kalanTick / toplam) * 100}%`;
    }
    if (this.bantKalan > 0) {
      this.bantKalan -= dt;
      if (this.bantKalan <= 0) this.bant.classList.remove("acik");
    }
  }

  private uyeOrani(d: Dunya, i: number, k: number, u: TakimUyesi): number {
    if (u.elendi) return 0;
    const tk = d.takimlar![i]!;
    const s = k === tk.aktif ? d.topaclar[i]!.stamina : u.stamina;
    return Math.max(0, s / u.profil.maxStamina);
  }

  private rozet(r: HTMLElement, kalan: number, toplam: number, yetmez: boolean): void {
    r.classList.toggle("bekle", kalan > 0);
    r.classList.toggle("yetmez", yetmez);
    (r.firstElementChild as HTMLElement).style.height = `${toplam > 0 ? (kalan / toplam) * 100 : 0}%`;
    const sn = kalan / AYAR.adimHz;
    this.yaz(r.querySelector(".n") as HTMLElement, kalan > 0 ? (sn >= 10 ? sn.toFixed(0) : sn.toFixed(1)) : "");
  }

  yokEt(): void {
    this.kok.remove();
    this.stil.remove();
  }
}
