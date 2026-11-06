import { type OdaGorunumu } from "../../ag/durum.ts";
import { dugumBul } from "../../paylasilan/kurallar/harita.ts";
import { cekirdekBul } from "../../paylasilan/veri/katalog.ts";
import { MADENLER } from "../../paylasilan/veri/harita.ts";
import { MESAJ, ODA_FAZI, odaKoduBicimle, odaKoduCoz } from "../../ag/protokol.ts";
import { takimKoduYaz, takimProfilleriKimlikten } from "../../paylasilan/veri/takimlar.ts";
import { type Girisli, type TakimGorunumu, SON_TAKIM, git, oku, sakla } from "../hesap.ts";
import type { EkranBaglami } from "../main.ts";
import { AgMaci } from "../ag/AgMaci.ts";
import { Baglanti, BaglantiHatasiE, HATA_METNI } from "../ag/Baglanti.ts";
import { type MacEkrani, cevrimiciBaslat } from "./Mac.ts";
import { dereceliAcik, kuyrukAsamasi, sureBicimle } from "../../paylasilan/kurallar/kuyruk.ts";
import { lentoKur, stilEkle } from "./arayuz.ts";
import { pikselTopac, topac3bIkonu } from "./pikselTopac.ts";
import { ikonGozle } from "../atolye3d/ikonOnbellek.ts";
import type { TopacProfili } from "../../paylasilan/veri/profil.ts";
import { aramaCanagi, oynaYayi, sureHalkasi, vsZemini } from "./lobiCizim.ts";
import { dokunmatikMi } from "../mobil/cihaz.ts";

// Lobi (D4, ux § 3.3) · GU-08 + GU-14 menü dili v2 "Kuşak Taşı" (maketler docs/art/maketler/menu-v2/b-oyna, b-lobi,
// b-ara0..2, b-vs, b-takim, b-oda). İşlev aynı: Oda aç (kod + Kodu kopyala + Bağlantıyı kopyala `#oda=ABCDEFGH`,
// seyirci bağlantısı; QR yok, sahip kararı S-2), Odaya katıl (tek gizli alan + 8 taş karo; yapıştır çalışır; bağlantıyla gelince dolu),
// Hızlı maç (D7: kuyruk, arama çanağı 12 dilim = 60 sn; 20 sn "Beklerken Antrenman"; 30 sn "Bot ile oyna"; 60 sn
// "Şu an rakip bulamadık"; Tekrar = yeni eşleşme `?ekran=lobi&hizli=1`), Antrenman (sunucu botu). Eşleşince VS anı
// (≤ 1,6 sn; `[data-duyuru]` "Rakip bulundu: <ad>" 3 sn), takım seçimi 20 sn (süre dolunca son takım; 1/2/3 kısayol).
// D5: kimlik oturumdan; her katılımda `/api/bilet`. Takımlar SQLite'tan (ödünç yuvalar gri).
// Seçiciler (araçlar): [data-mod], [data-eylem=hizli|oda-ac|katil|antrenman|iptal|bot|hazir], [data-kod], [data-arama],
// [data-oneri][data-asama], [data-bulunamadi], [data-takim], [data-rakip], [data-duyuru], [data-secim-sayac], [data-sayac],
// [data-seyirci], `.icerik .hata` (Dereceli metni).

const STIL = `
.lobi.k-zemin { display:block; }
.lobi.ust { background:rgba(8,7,12,.82); }
.lobi .lb { position:relative; min-height:100%; display:flex; flex-direction:column; }
.lobi .lb-govde { flex:1; position:relative; display:grid; grid-template-columns:calc(146 * var(--p)) 1fr; grid-template-rows:1fr auto; gap:var(--aralik) calc(12 * var(--p)); padding:calc(10 * var(--p)) var(--kenar) var(--kenar); }
.lobi .lb-sol { align-self:start; display:flex; flex-direction:column; gap:calc(8 * var(--p)); }
.lobi .lb-sol .k-dugme.mod { width:100%; }
.lobi .lb-bilgi { padding-top:calc(6 * var(--p)); border-top:var(--p) solid #2a3146; text-align:center; color:var(--soluk); text-transform:uppercase; line-height:1; white-space:nowrap; }
.lobi .lb-sag { position:relative; display:flex; flex-direction:column; gap:var(--aralik); min-width:0; }
.lobi .lb-alt { grid-column:1 / -1; display:flex; align-items:flex-end; justify-content:flex-end; gap:calc(8 * var(--p)); }
.lobi .lb-alt .sol { margin-right:auto; display:flex; gap:calc(6 * var(--p)); align-items:flex-end; }
.lobi h2, .lobi h3 { margin:0; text-transform:uppercase; font-weight:400; }
.lobi .hata { min-height:calc(10 * var(--p)); color:var(--tehlike-yazi); text-transform:uppercase; }
/* Oyna sahnesi */
.lobi .lb-sahne { position:relative; flex:1; min-height:calc(200 * var(--p)); }
.lobi .lb-sahne-ust { display:flex; align-items:center; justify-content:space-between; gap:var(--aralik); }
.lobi .lb-sahne .k-yay { position:absolute; left:0; right:0; top:calc(40 * var(--p)); margin:0 auto; }
.lobi .lb-ekip { position:absolute; left:0; right:0; top:calc(78 * var(--p)); display:flex; justify-content:center; gap:calc(44 * var(--p)); }
.lobi .lb-uye .k-kaide { width:calc(56 * var(--p)); }
.lobi .lb-uye { display:flex; flex-direction:column; align-items:center; gap:calc(2 * var(--p)); }
.lobi .lb-uye .k-kaide { margin-top:calc(-6 * var(--p)); }
.lobi .lb-uye .etiket { display:flex; flex-direction:column; align-items:center; gap:calc(2 * var(--p)); margin-top:calc(18 * var(--p)); padding:calc(3 * var(--p)) calc(5 * var(--p)); background:#161c2c; box-shadow:inset 0 0 0 var(--p) #59607a; text-transform:uppercase; white-space:nowrap; }
.lobi .lb-uye .etiket b { font-weight:400; color:var(--ink); }
.lobi .lb-uye .lv { display:flex; align-items:center; gap:calc(3 * var(--p)); }
.lobi .lb-uye.odunc .etiket { box-shadow:inset 0 0 0 var(--p) #6a7088; }
.lobi .lb-uye.odunc .lv { color:var(--soluk); }
.lobi .lb-uye.odunc canvas, .lobi .lb-uye.odunc img { filter:grayscale(1); opacity:.7; }
/* Oda kodu */
.lobi .lb-kodla { display:flex; flex-direction:column; gap:calc(6 * var(--p)); padding:calc(8 * var(--p)) calc(12 * var(--p)); }
.lobi .lb-karo-alan { position:relative; align-self:flex-start; margin:calc(6 * var(--p)) 0; }
.lobi .lb-karo-alan input { position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:text; font-size:var(--y-16); }
.lobi .lb-karo-alan:focus-within { outline:calc(2 * var(--p)) solid #fff; outline-offset:calc(2 * var(--p)); }
.lobi .lb-katil-satir { display:flex; align-items:center; justify-content:space-between; gap:var(--aralik); }
.lobi .lb-not { align-self:flex-start; padding:calc(4 * var(--p)) calc(8 * var(--p)); text-transform:uppercase; color:var(--soluk); }
/* Aranıyor */
.lobi .lb-ara { flex:1; position:relative; padding:calc(10 * var(--p)) var(--kenar) var(--kenar); display:flex; flex-direction:column; }
/* K-17 (MENU-P1A): sayaç + öneri tek blokta, çanağın üstünde ortada */
.lobi .lb-ara-blok { align-self:center; display:flex; flex-direction:column; align-items:center; gap:calc(6 * var(--p)); }
.lobi .lb-ara-ust { display:flex; align-items:center; gap:calc(10 * var(--p)); }
.lobi .lb-ara-blok > [data-oneri] { min-height:calc(48 * var(--p)); display:flex; align-items:flex-start; justify-content:center; }
.lobi .lb-sure { color:var(--gold); font:400 var(--y-40)/1 var(--font-baslik); letter-spacing:calc(2 * var(--yp)); }
.lobi .lb-canak-yer { position:relative; flex:1; display:flex; align-items:center; justify-content:center; min-height:calc(150 * var(--p)); }
.lobi .lb-canak { position:relative; }
.lobi .lb-canak .k-topac { position:absolute; left:50%; top:50%; transform:translate(-50%, -62%); }
.lobi .lb-bos-rakip { position:absolute; right:calc(40 * var(--p)); top:50%; transform:translateY(-30%); display:flex; flex-direction:column; align-items:center; gap:calc(2 * var(--p)); color:var(--soluk); text-transform:uppercase; }
.lobi .lb-canak .lb-bos-rakip { right:calc(36 * var(--p)); transform:translateY(-62%); }
.lobi .lb-bos-rakip .k-kaide { opacity:.6; }
.lobi .lb-oneri { display:flex; flex-direction:row; align-items:center; gap:calc(8 * var(--p)); padding:calc(4 * var(--p)) calc(8 * var(--p)); text-transform:uppercase; }
.lobi .lb-oneri .yazi { display:flex; flex-direction:column; gap:calc(2 * var(--p)); }
.lobi .lb-oneri b { color:var(--soluk); font-weight:400; }
.lobi .lb-oneri.bot-kart b { color:var(--gold); }
.lobi .lb-oneri span { color:var(--soluk); text-transform:none; }
.lobi .lb-ara-alt { display:flex; justify-content:center; align-items:flex-end; gap:calc(8 * var(--p)); }
.lobi .lb-bulunamadi { align-self:center; margin:auto; width:min(calc(240 * var(--p)), 100%); text-align:center; display:flex; flex-direction:column; gap:calc(6 * var(--p)); align-items:center; }
.lobi .lb-bulunamadi b { color:var(--gold); font-weight:400; text-transform:uppercase; }
/* VS */
.lobi .lb-vs { position:fixed; inset:0; z-index:30; overflow:hidden; background:#0c0b10; }
.lobi .lb-vs .k-vs-zemin { position:absolute; inset:0; }
.lobi .lb-vs .taraf { position:absolute; top:calc(26 * var(--p)); bottom:calc(40 * var(--p)); width:50%; display:flex; flex-direction:column; align-items:center; gap:0; }
.lobi .lb-vs .taraf .k-vs-plaka { margin-bottom:auto; }
.lobi .lb-vs .taraf .k-kaide { margin-top:calc(-10 * var(--p)); margin-bottom:auto; }
/* H-11 (MENU-P1A): plaka içeriğe göre; ad yalnız taraf genişliğini aşınca kesilir */
.lobi .lb-vs .k-vs-plaka { width:auto; min-width:calc(200 * var(--p)); max-width:calc(100% - 16 * var(--p)); padding:0 calc(20 * var(--p)); white-space:nowrap; }
.lobi .lb-vs .k-vs-plaka > span:nth-child(2) { flex:0 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; }
.lobi .lb-vs .taraf.sol { left:0; } .lobi .lb-vs .taraf.sag { right:0; }
.lobi .lb-vs .k-vs-plaka { animation:lb-kay-sol calc(4 * var(--kare)) steps(4) both; }
.lobi .lb-vs .sag .k-vs-plaka { animation-name:lb-kay-sag; }
.lobi .lb-vs .k-vs-plaka .els { display:flex; gap:calc(2 * var(--p)); margin-left:auto; }
.lobi .lb-vs .sag .k-vs-plaka .els { margin-left:0; margin-right:auto; }
.lobi .lb-vs .isaret-sen { color:var(--sen); } .lobi .lb-vs .isaret-rakip { color:var(--rakip); }
.lobi .lb-vs .damga { position:absolute; left:50%; top:42%; transform:translate(-50%, -50%); color:var(--ink); font:400 var(--y-40)/1 var(--font-baslik); letter-spacing:calc(2 * var(--yp));
  text-shadow:var(--p) 0 0 var(--harc), calc(-1 * var(--p)) 0 0 var(--harc), 0 var(--p) 0 var(--harc), 0 calc(-1 * var(--p)) 0 var(--harc), calc(2 * var(--p)) calc(2 * var(--p)) 0 var(--harc);
  animation:lb-damga calc(2 * var(--kare)) steps(2) calc(4 * var(--kare)) both; }
.lobi .lb-vs .alt-yazi { position:absolute; left:50%; bottom:calc(14 * var(--p)); transform:translateX(-50%); padding:calc(4 * var(--p)) calc(10 * var(--p)); background:#14111a; box-shadow:inset 0 calc(-1 * var(--p)) 0 0 var(--bronz); text-transform:uppercase; color:var(--soluk); }
@keyframes lb-kay-sol { from { transform:translateX(-60%); } to { transform:none; } }
@keyframes lb-kay-sag { from { transform:translateX(60%); } to { transform:none; } }
@keyframes lb-damga { from { transform:translate(-50%, -50%) scale(1.6); } to { transform:translate(-50%, -50%); } }
@keyframes lb-sars { 0%, 100% { translate:0 0; } 50% { translate:calc(2 * var(--p)) calc(-1 * var(--p)); } }
.lobi .lb-vs.sars { animation:lb-sars calc(2 * var(--kare)) steps(2) calc(4 * var(--kare)) 2; }
@media (prefers-reduced-motion: reduce) { .lobi .lb-vs *, .lobi .lb-vs { animation:none !important; } }
/* Takım seçimi */
.lobi .lb-secim { flex:1; display:grid; grid-template-columns:calc(84 * var(--p)) 1fr calc(84 * var(--p)); grid-template-rows:1fr auto; gap:var(--aralik); padding:calc(8 * var(--p)) var(--kenar) var(--kenar); }
.lobi .lb-taraf { grid-row:1; grid-column:1; display:flex; flex-direction:column; gap:calc(6 * var(--p)); align-items:flex-start; text-transform:uppercase; }
.lobi .lb-taraf .rol { font:400 var(--y-20)/1 var(--font-baslik); letter-spacing:var(--yp); }
.lobi .lb-taraf .rol.sen { color:var(--sen); } .lobi .lb-taraf .rol.rakip { color:var(--rakip-yazi); }
.lobi .lb-taraf .kutu { width:calc(38 * var(--p)); height:calc(38 * var(--p)); display:flex; align-items:center; justify-content:center; background:#11141f; box-shadow:inset 0 0 0 var(--p) #2a3146; align-self:center; }
.lobi .lb-taraf .kutu.ilk { box-shadow:inset 0 0 0 var(--p) var(--bronz); }
.lobi .lb-taraf .durum { color:var(--yesil); margin-top:auto; }
.lobi .lb-taraf.sag-taraf { grid-column:3; }
.lobi .lb-ortada { grid-row:1; grid-column:2; display:flex; flex-direction:column; align-items:center; gap:calc(4 * var(--p)); min-width:0; }
.lobi .lb-halka { position:relative; display:flex; align-items:center; justify-content:center; }
.lobi .lb-halka .sayi { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font:400 var(--y-30)/1 var(--font-baslik); color:var(--ink); }
.lobi .lb-halka.son .sayi { color:var(--tehlike-yazi); }
.lobi .lb-kartlar-panel { align-self:stretch; display:flex; flex-direction:column; gap:calc(6 * var(--p)); align-items:center; }
.lobi .lb-kartlar-panel > .k-e16 { color:var(--soluk); text-transform:uppercase; }
.lobi .lb-kartlar { display:flex; justify-content:center; gap:calc(8 * var(--p)); flex-wrap:wrap; }
.lobi .lb-kart { position:relative; background-color:var(--panel-0) !important; width:calc(92 * var(--p)); min-height:calc(100 * var(--p)); padding:calc(14 * var(--p)) calc(4 * var(--p)) calc(6 * var(--p)); display:flex; flex-direction:column; align-items:center; gap:calc(4 * var(--p)); cursor:pointer;
  background:var(--panel); border:var(--p) dashed #4a4f66; color:var(--ink); font:400 var(--y-16)/.75 var(--font-etiket); text-transform:uppercase; box-shadow:var(--odak-g, 0 0 0 0 transparent); }
.lobi .lb-kart[aria-pressed="true"] { border:var(--p) solid var(--gold); }
.lobi .lb-kart .no { position:absolute; left:0; top:0; width:calc(12 * var(--p)); height:calc(12 * var(--p)); display:flex; align-items:center; justify-content:center; background:#2a3146; color:var(--ink); font:400 var(--y-16)/.75 var(--font-etiket); }
.lobi .lb-kart[aria-pressed="true"] .no { background:var(--gold); color:#2a1a0e; }
.lobi .lb-kart .minis { display:flex; gap:calc(1 * var(--p)); align-items:flex-end; justify-content:center; min-height:calc(24 * var(--p)); }
.lobi .lb-kart b { font-weight:400; color:var(--ink); max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lobi .lb-kart small { color:var(--soluk); font-size:var(--y-16); }
.lobi .lb-kart small.lv { color:var(--gold); }
.lobi .lb-secim-alt { grid-column:1 / -1; display:flex; justify-content:center; align-items:flex-end; gap:calc(8 * var(--p)); }
.lobi .lb-duyuru { min-height:calc(10 * var(--p)); color:var(--gold); text-transform:uppercase; text-align:center; }
/* Oda açıldı */
.lobi .lb-oda { flex:1; display:grid; grid-template-columns:1fr calc(150 * var(--p)); grid-template-rows:1fr auto; gap:var(--aralik) calc(10 * var(--p)); padding:calc(10 * var(--p)) var(--kenar) var(--kenar); }
.lobi .lb-oda-sol { display:flex; flex-direction:column; gap:calc(6 * var(--p)); padding:calc(6 * var(--p)) calc(10 * var(--p)); }
.lobi .lb-oda-sol .k-karolar { margin:calc(6 * var(--p)) 0; }
.lobi .lb-oda-sol .satir { display:flex; gap:calc(8 * var(--p)); align-items:center; flex-wrap:wrap; }
.lobi .lb-oda-sol .kopyalandi { color:var(--yesil); text-transform:uppercase; }
.lobi .lb-oda-sol .sayac { margin-top:auto; padding-top:calc(6 * var(--p)); border-top:var(--p) solid #2a3146; display:flex; align-items:center; justify-content:space-between; gap:var(--aralik); text-transform:uppercase; color:var(--soluk); }
.lobi .lb-oda-sag { display:flex; flex-direction:column; gap:calc(14 * var(--p)); align-items:center; justify-content:center; }
.lobi .lb-oda-alt { grid-column:1 / -1; display:flex; justify-content:space-between; align-items:flex-end; }
html[data-yazi-buyuk] .lobi .lb-govde { grid-template-columns:1fr; }
html[data-yazi-buyuk] .lobi .lb-secim { grid-template-columns:1fr; }
html[data-yazi-buyuk] .lobi .lb-taraf { grid-row:auto; }
html[data-yazi-buyuk] .lobi .lb-oda { grid-template-columns:1fr; }
`;

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, sinif = "", ust?: HTMLElement, metin = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin) e.textContent = metin;
  ust?.appendChild(e);
  return e;
}
function dugme(ust: HTMLElement, sinif: string, metin: string, eylem?: string): HTMLButtonElement {
  const d = el("button", `k-dugme ${sinif}`.trim(), ust, metin);
  d.type = "button";
  if (eylem) d.dataset["eylem"] = eylem;
  return d;
}
function elRozet(ust: HTMLElement, element: string, sinif = ""): HTMLElement {
  const e = el("span", `k-el ${sinif}`.trim(), ust);
  e.dataset["el"] = element;
  return e;
}

const TAKIM_ANAHTAR = SON_TAKIM;
/** takım üyeleri: element + ödünç + seviye + Çekirdek adı (sunucu takım kodundan) */
function uyeler(t: TakimGorunumu): { element: string; odunc: boolean; seviye: number; profil: TopacProfili; ad: string }[] {
  const p = takimProfilleriKimlikten(takimKoduYaz(t.uyeler));
  return p.map((x, j) => ({ element: x.element, odunc: !!t.uyeler[j]?.odunc, seviye: t.uyeler[j]?.seviye ?? 1, profil: x, ad: cekirdekAdi(t.uyeler[j]?.cekirdek) }));
}
function cekirdekAdi(id: string | undefined): string {
  try { return id ? cekirdekBul(id).ad : "Topaç"; } catch { return "Topaç"; }
}

export function baslat(b: EkranBaglami): void {
  new LobiEkrani(b);
}

/** Kozmetik malzeme rozetleri (12 § 3, 07 § 5b): 4 küçük kare [Çekirdek, Gövde, Disk, Uç], Market biçimi boş. */
function malzemeRozetleri(ust: HTMLElement, kod: string): void {
  if (!/[1-8]/.test(kod)) return;
  const s = el("span", "mz", ust);
  s.dataset["malzeme"] = kod;
  s.style.cssText = "display:flex;gap:2px;margin-top:2px";
  s.title = `Malzeme: ${[...kod].map((c) => (c === "0" ? "Market" : `K${c}`)).join(" · ")}`;
  for (const c of kod) {
    const q = el("i", "", s);
    q.style.cssText = `display:inline-block;width:6px;height:6px;box-shadow:inset 0 0 0 1px #0b1418;background:${c === "0" ? "transparent" : MADENLER.find((m) => m.kademe === Number(c))?.renk.ana ?? "#888"}`;
  }
}

/** Harita düğümünün lobi bilgisi (ad + zorluk; harita.json). */
function haritaDugumBilgisi(id: string | undefined): { ad: string; zorluk: number } | null {
  const d = id ? dugumBul(id) : undefined;
  if (!d || (d.tur !== "dusman" && d.tur !== "patron")) return null;
  return { ad: d.tur === "patron" ? d.ad : "DÜŞMAN", zorluk: d.zorluk };
}

type Asama = "giris" | "bekliyor" | "secim" | "mac" | "hata";

class LobiEkrani {
  private kok = el("div", "lobi k-zemin");
  private kart = el("div", "lb", this.kok);
  private stil = el("style");
  private baglanti: Baglanti | null = null;
  private ag: AgMaci | null = null;
  private mac: MacEkrani | null = null;
  asama: Asama = "giris";
  hata = "";
  kod = "";
  private rakipBulunduBitis = 0;
  private sonFaz = -1;
  private secilenTakim = "0";
  private zamanlayici = 0;
  private vsKatman: HTMLElement | null = null;

  private ben: Girisli;

  constructor(private b: EkranBaglami) {
    this.ben = b.ben as Girisli;
    stilEkle();
    this.stil.textContent = STIL;
    document.head.appendChild(this.stil);
    b.ustYazi.appendChild(this.kok);
    ikonGozle(this.kok); // TEMIZLIK #4: takım kartı topaçları 3B
    this.kok.setAttribute("role", "main");
    this.kok.setAttribute("aria-label", "Oyna");
    const takimlar = this.ben.takimlar;
    // D6: varsayılan Atölye'deki aktif takım (oynanabilir takımlar sunucudan; eksik takım listelenmez)
    if (!takimlar.length) { git("atolye"); return; }
    this.secilenTakim = (this.ben.aktifTakim && takimlar.some((t) => t.id === this.ben.aktifTakim) ? this.ben.aktifTakim : null) ?? oku(TAKIM_ANAHTAR) ?? takimlar[0]?.id ?? "0";
    if (!takimlar.some((t) => t.id === this.secilenTakim)) this.secilenTakim = takimlar[0]?.id ?? "0";
    this.giris();
    (window as unknown as { __lobi: LobiEkrani }).__lobi = this;
    if (new URLSearchParams(location.search).get("hizli") === "1") void this.hizliBasla();
    // Harita (H6): ?ekran=lobi&dugum=b1-01 → düğüm botuna karşı (karakter düğümde; sunucu denetler)
    const dugum = new URLSearchParams(location.search).get("dugum");
    if (dugum && /^b[1-9]-(0[1-9]|1[0-2])$/.test(dugum)) void this.bagla(() => this.yeniBaglanti().harita(dugum, this.secilenTakim));
    if (location.hash.startsWith("#oda=")) { this.modSecimi = "oda"; this.giris(); }
    this.zamanlayici = window.setInterval(() => this.tik(), 200);
    window.addEventListener("keydown", (e) => this.tus(e));
  }

  get macEkrani(): MacEkrani | null { return this.mac; }
  get agMaci(): AgMaci | null { return this.ag; }

  /** sol sütun seçimi (referans 06): hızlı maç varsayılan */
  modSecimi: "hizli" | "oda" | "antrenman" = "hizli";
  /** D7: kuyrukta bekleme başlangıcı (istemci saati; sunucu bot isteğini kendi saatiyle denetler) */
  private kuyrukBas = 0;
  private botIstendi = false;
  /** ekranın ana düğmesi (Enter) */
  private ana: HTMLButtonElement | null = null;
  /** Esc / ◄ eylemi */
  private geriEylem: (() => void) | null = null;

  private tus(e: KeyboardEvent): void {
    if (this.asama === "mac" || this.kok.style.display === "none") return;
    const yazi = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
    if (e.key === "Escape" && this.geriEylem) { e.preventDefault(); this.geriEylem(); return; }
    if (e.key === "Enter" && this.ana && !(e.target instanceof HTMLButtonElement) && !(e.target instanceof HTMLAnchorElement) && !yazi) { e.preventDefault(); if (!this.ana.disabled) this.ana.click(); return; }
    if (this.asama === "secim" && !yazi && /^[1-9]$/.test(e.key)) {
      const d = this.kart.querySelectorAll<HTMLButtonElement>("[data-takim]")[Number(e.key) - 1];
      if (d) { e.preventDefault(); d.click(); d.focus(); }
    }
  }

  /** ekran iskeleti: lento (◄ özel eylem) + gövde */
  private iskelet(baslik: string, geri: (() => void) | null, govdeSinif: string): HTMLElement {
    const k = this.kart;
    k.innerHTML = "";
    this.ana = null;
    this.geriEylem = geri;
    const l = lentoKur(k, { baslik, geri: null });
    if (geri) {
      const g = el("button", "k-geri", l);
      g.type = "button";
      g.setAttribute("aria-label", geri === this.atolyeyeDon ? "Geri: Atölye" : "Geri: İptal");
      g.addEventListener("click", geri);
      l.prepend(g);
    }
    return el("div", govdeSinif, k);
  }
  private atolyeyeDon = (): void => { git("atolye"); };
  private iptal = (): void => { void this.baglanti?.ayril(); this.ag = null; this.giris(); };

  private giris(hata = "", hizliHata = false): void {
    this.asama = "giris";
    this.hata = hata;
    this.vsKaldir();
    const g = this.iskelet("Oyna", this.atolyeyeDon, "lb-govde");
    const sol = el("div", "k-panel lb-sol k-giris", g);
    const sag = el("div", "icerik lb-sag", g);
    const alt = el("div", "lb-alt", g);
    const modlar: [HTMLButtonElement, "hizli" | "oda" | "antrenman"][] = [];
    const hz = dugme(sol, "mod centik", "Hızlı maç");
    hz.dataset["mod"] = "hizli";
    modlar.push([hz, "hizli"]);
    const od = dugme(sol, "mod centik", "Oda kodu");
    od.dataset["mod"] = "oda";
    modlar.push([od, "oda"]);
    const an = dugme(sol, "mod centik", "Antrenman");
    an.dataset["mod"] = "antrenman";
    modlar.push([an, "antrenman"]);
    // Dereceli: yeni oyuncuya hiç görünmez; bir Çekirdek Lv.3 olunca belirir (sahip kararı S4). Mod D7'de yok.
    // Harita (01 § 7): İlk Devir sonrası 4. mod; Harita ekranına götürür (düğüm orada seçilir)
    if (this.ben.harita?.acik) {
      const hr = dugme(sol, "mod centik", "Harita");
      hr.dataset["mod"] = "harita";
      hr.addEventListener("click", () => git("harita"));
    }
    if (dereceliAcik(this.ben.cekirdekler.map((c) => c.seviye))) {
      const dr = dugme(sol, "mod kilitli", "Dereceli");
      dr.dataset["mod"] = "dereceli";
      dr.setAttribute("aria-disabled", "true");
      dr.addEventListener("click", () => { const h = this.kart.querySelector<HTMLElement>(".icerik .hata"); if (h) h.textContent = "Dereceli çok yakında."; });
    }
    for (const [d, m] of modlar) {
      d.setAttribute("aria-pressed", String(this.modSecimi === m));
      d.addEventListener("click", () => { this.modSecimi = m; this.giris(); });
    }
    // K-8 (MENU-P1A): mod notu panelin içinde, düğmelerin hemen altında tek satır
    el("div", "lb-bilgi k-e16", sol, this.modSecimi === "hizli" ? "İlk 3 puan · 90 sn" : this.modSecimi === "oda" ? "Arkadaşınla oyna" : "Altın, başarım yok");
    if (this.modSecimi === "hizli") this.hizliPaneli(sag, alt, hata, hizliHata);
    else if (this.modSecimi === "oda") this.odaPaneli(sag, alt);
    else this.antrenmanPaneli(sag, alt);
    if (!(this.modSecimi === "hizli" && hizliHata)) el("div", "hata k-e16", sag, hata).setAttribute("role", "alert");
  }

  /** Oyna sahnesi: TAKIM plakası, Kuşak yayı, 3 topaç kaidede (ödünç gri), element + Lv. */
  private takimSahnesi(sag: HTMLElement): void {
    const s = el("div", "lb-sahne", sag);
    const ust = el("div", "lb-sahne-ust", s);
    const t = this.ben.takimlar.find((x) => x.id === this.secilenTakim) ?? this.ben.takimlar[0]!;
    const pl = el("span", "k-plaka k-giris gec", ust, t.ad);
    pl.dataset["takimAdi"] = "1";
    if (this.ben.takimlar.length > 1) {
      const d = dugme(ust, "kucuk", "Değiştir");
      d.title = "Sıradaki kayıtlı takım";
      d.addEventListener("click", () => {
        const i = this.ben.takimlar.findIndex((x) => x.id === this.secilenTakim);
        this.secilenTakim = this.ben.takimlar[(i + 1) % this.ben.takimlar.length]!.id;
        sakla(TAKIM_ANAHTAR, this.secilenTakim);
        this.giris();
      });
    }
    // K-8 (MENU-P1A): halka takımı çevreler: üst yay topaçların üstünde, alt yay kaidelerin hemen altında, etiketler halkanın altında
    s.appendChild(oynaYayi(380, 110, 0.627, 0.295));
    const ekip = el("div", "lb-ekip", s);
    // K-7 (MENU-P1A): Atölye ile aynı temsil: ödünç = gri çerçeve + gri ikon + Çekirdek adı
    for (const u of uyeler(t)) {
      const k = el("div", `lb-uye${u.odunc ? " odunc" : ""}`, ekip);
      k.dataset["odunc"] = u.odunc ? "1" : "0";
      k.appendChild(topac3bIkonu(u.profil, 22)); // TEMIZLIK #4: 3B birleşik topaç (ortak önbellek); ödünçte CSS ile gri
      el("div", "k-kaide", k);
      const et = el("div", "etiket k-e16", k);
      el("b", "", et, u.ad);
      const lv = el("div", "lv", et);
      elRozet(lv, u.element, u.odunc ? "odunc" : "");
      el("span", "", lv, u.odunc ? "Ödünç · Lv.1" : `Lv.${u.seviye}`);
      k.title = u.odunc ? `${u.ad} (ödünç): Lv.1, tecrübe ve başarım almaz` : `${u.ad} · Lv.${u.seviye}`;
    }
  }

  /** Hızlı maç paneli (giriş hâli; 60 sn bulunamadıysa ux § 7 metni + Tekrar dene · Antrenman). */
  private hizliPaneli(k: HTMLElement, alt: HTMLElement, hata: string, bulunamadi: boolean): void {
    if (bulunamadi) {
      const o = el("div", "k-panel lb-bulunamadi oneri", k);
      o.dataset["bulunamadi"] = "1";
      el("b", "k-b20", o, "Şu an rakip bulamadık");
      el("span", "k-e16 k-soluk", o, "Tekrar deneyebilir ya da Antrenman yapabilirsin.");
      const an = dugme(o, "", "Antrenman");
      an.addEventListener("click", () => git("antrenman"));
      const td = dugme(alt, "ana", "Tekrar dene", "hizli");
      td.addEventListener("click", () => void this.hizliBasla());
      this.ana = td;
      queueMicrotask(() => td.focus());
      return;
    }
    this.takimSahnesi(k);
    el("span", "k-tus", alt, "Enter");
    const ara = dugme(alt, "ana", "Maç bul", "hizli");
    ara.addEventListener("click", () => void this.hizliBasla());
    this.ana = ara;
    void hata;
    queueMicrotask(() => ara.focus());
  }

  /** Oda kodu: kodla katıl (8 taş karo, tek gizli alan) + ODA AÇ ana. */
  private odaPaneli(sag: HTMLElement, alt: HTMLElement): void {
    const p = el("div", "k-panel lb-kodla k-giris", sag);
    el("h3", "k-b20", p, "Kodla katıl");
    el("div", "k-e16 k-soluk k-buyuk", p, "Kod: 8 harf · tire isteğe bağlı");
    const alanKutu = el("label", "lb-karo-alan", p);
    const karolar = el("div", "k-karolar", alanKutu);
    karolar.setAttribute("aria-hidden", "true");
    const karo: HTMLElement[] = [];
    for (let i = 0; i < 8; i++) { if (i === 4) el("span", "k-tire", karolar); karo.push(el("span", "k-karo bos", karolar)); }
    const alan = el("input", "", alanKutu);
    alan.placeholder = "ABCD-EFGH";
    alan.maxLength = 32;
    alan.setAttribute("aria-label", "Oda kodu");
    alan.autocomplete = "off";
    alan.spellcheck = false;
    // MOBIL-1: mobil klavye büyük harfle açılır, öneri/düzeltme yok, Enter tuşu "Git"
    alan.inputMode = "text";
    alan.setAttribute("autocapitalize", "characters");
    alan.setAttribute("autocorrect", "off");
    alan.enterKeyHint = "go";
    const hash = location.hash.startsWith("#oda=") ? odaKoduCoz(location.hash) : null;
    if (hash) alan.value = odaKoduBicimle(hash);
    const satir = el("div", "lb-katil-satir", p);
    el("span", "k-e16 k-soluk k-buyuk", satir, dokunmatikMi() ? "Yapıştır: alana uzun bas" : "Yapıştır: Ctrl+V");
    const katB = dugme(satir, hash ? "ana kisa yazi20" : "orta", "Katıl", "katil");
    const ciz = () => {
      const i = alan.value.indexOf("#oda=");
      const ham = (i >= 0 ? alan.value.slice(i + 5) : alan.value).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      const odakta = document.activeElement === alan;
      karo.forEach((k, j) => { k.textContent = ham[j] ?? ""; k.className = `k-karo${ham[j] ? "" : " bos"}${odakta && j === ham.length ? " imlec" : ""}`; });
      katB.disabled = !odaKoduCoz(alan.value) && ham.length < 8;
    };
    for (const o of ["input", "focus", "blur"]) alan.addEventListener(o, ciz);
    ciz();
    el("div", "k-panel sik lb-not k-e16", sag, "Ya da oda aç, kodu gönder");
    const acB = dugme(alt, "ana", "Oda aç", "oda-ac");
    this.ana = hash ? katB : acB;
    acB.addEventListener("click", () => void this.bagla(() => this.yeniBaglanti().odaAc(this.secilenTakim)));
    const katil = () => {
      const kod = odaKoduCoz(alan.value);
      const h = this.kart.querySelector<HTMLElement>(".icerik .hata");
      if (!kod) { if (h) h.textContent = HATA_METNI.gecersiz; this.hata = HATA_METNI.gecersiz; return; }
      void this.bagla(() => this.yeniBaglanti().katil(kod, this.secilenTakim));
    };
    katB.addEventListener("click", katil);
    alan.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); katil(); } });
    queueMicrotask(() => (hash ? katB : acB).focus());
  }

  private antrenmanPaneli(sag: HTMLElement, alt: HTMLElement): void {
    this.takimSahnesi(sag);
    el("span", "k-tus", alt, "Enter");
    const ant = dugme(alt, "ana", "Başla", "antrenman");
    ant.title = "Antrenman (sunucu botu)";
    ant.addEventListener("click", () => void this.bagla(() => this.yeniBaglanti().antrenman(this.secilenTakim)));
    this.ana = ant;
    queueMicrotask(() => ant.focus());
  }

  private async hizliBasla(): Promise<void> {
    this.modSecimi = "hizli";
    this.kuyrukBas = performance.now();
    this.botIstendi = false;
    await this.bagla(() => this.yeniBaglanti().hizli(this.secilenTakim));
  }

  /** test: kuyrukta geçen süre (sn) */
  get kuyrukSn(): number { return this.kuyrukBas ? (performance.now() - this.kuyrukBas) / 1000 : 0; }

  private yeniBaglanti(): Baglanti {
    this.baglanti = new Baglanti();
    return this.baglanti;
  }

  private async bagla(f: () => Promise<unknown>): Promise<void> {
    for (const b of this.kart.querySelectorAll("button")) b.disabled = true;
    try {
      await f();
    } catch (e) {
      const m = e instanceof BaglantiHatasiE ? e.message : HATA_METNI.bilinmiyor;
      this.giris(m);
      return;
    }
    this.ag = new AgMaci(this.baglanti!);
    this.sonFaz = -1; // yeni oda: önceki odanın fazı (İptal sonrası) yeni ekranı engellemesin
    this.kod = this.baglanti!.oda!.roomId;
    for (const b of this.ag.bilgiler) this.bilgi(b);
    this.baglanti!.bilgiDinleyicileri.add((b) => this.bilgi(b));
    this.ag.oda.onStateChange((s) => this.durumDegisti(s));
    this.durumDegisti(this.ag.durum);
  }

  private bilgi(b: { tur: string; ad?: string; neden?: string }): void {
    if (b.tur === "rakipBulundu") this.rakipBulunduBitis = performance.now() + 3000;
    if (b.tur === "kapandi" && this.asama !== "mac") {
      const hizli = this.ag?.durum.mod === "hizli";
      const metin = b.neden === "rakipGelmedi" || b.neden === "sureDoldu" ? HATA_METNI.suresiDoldu : b.neden === "rakipAyrildi" ? "Rakip maçtan ayrıldı." : HATA_METNI.bilinmiyor;
      void this.baglanti?.ayril();
      this.ag = null;
      this.kok.classList.remove("ust");
      this.kok.style.display = "";
      if (hizli && b.neden === "rakipGelmedi") { this.modSecimi = "hizli"; this.giris("", true); return; }
      this.giris(metin);
    }
  }

  private durumDegisti(s: OdaGorunumu | undefined): void {
    if (!s || !s.oyuncular || !this.ag) return;
    if (s.faz === this.sonFaz && s.faz !== ODA_FAZI.secim && s.faz !== ODA_FAZI.bekliyor) return;
    const degisti = s.faz !== this.sonFaz;
    this.sonFaz = s.faz;
    if (s.faz === ODA_FAZI.bekliyor) { if (degisti) this.bekleme(s); else this.beklemeGuncelle(s); }
    else if (s.faz === ODA_FAZI.secim) { if (degisti) this.secim(); else this.secimGuncelle(); }
    else if (s.faz === ODA_FAZI.mac) this.macaGec();
  }

  /** Oda açıldı (b-oda): 8 taş karo kod, BAĞLANTI, seyirci, 20 dilim sayaç, boş rakip kaidesi (QR yok: sahip kararı S-2, MENU-P1A H-1). */
  private bekleme(s: OdaGorunumu): void {
    this.asama = "bekliyor";
    if (s.mod === "hizli") { this.kuyrukEkrani(); return; }
    if (s.kod) history.replaceState(null, "", `${location.pathname}${location.search}#oda=${s.kod}`);
    const g = this.iskelet("Oda kodu", this.iptal, "lb-oda");
    const sol = el("div", "k-panel lb-oda-sol k-giris", g);
    el("h2", "k-b30", sol, "Oda açıldı");
    el("div", "k-e16 k-soluk k-buyuk", sol, "Kodu arkadaşına gönder");
    const kod = el("div", "k-karolar", sol);
    kod.dataset["kod"] = s.kod;
    kod.setAttribute("aria-label", `Oda kodu ${odaKoduBicimle(s.kod)}`);
    kod.setAttribute("role", "text");
    [...s.kod].forEach((h, i) => { if (i === 4) el("span", "k-tire", kod); el("span", "k-karo paylas", kod, h).setAttribute("aria-hidden", "true"); });
    const satir = el("div", "satir", sol);
    const geriBildirim = el("span", "kopyalandi k-e16", satir);
    geriBildirim.setAttribute("role", "status");
    const kopyala = (metin: string, d: HTMLButtonElement, ilk: string) => {
      void navigator.clipboard?.writeText(metin).then(() => { d.textContent = "Kopyalandı"; geriBildirim.textContent = "Kopyalandı"; setTimeout(() => { d.textContent = ilk; geriBildirim.textContent = ""; }, 1500); }, () => { d.textContent = "Kopyalanamadı"; });
    };
    const bk = dugme(satir, "orta", "Bağlantı");
    satir.prepend(bk);
    const baglantiMetni = `${location.origin}${location.pathname}?ekran=lobi#oda=${s.kod}`;
    bk.title = baglantiMetni;
    bk.setAttribute("aria-label", "Bağlantıyı kopyala");
    bk.addEventListener("click", () => kopyala(baglantiMetni, bk, "Bağlantı"));
    // D8 (ux § 5): yayıncı için OBS seyirci bağlantısı; yayın kodu maçtan maça aynı kalır
    if (s.izleKod) {
      const sk = dugme(satir, "kucuk", "Seyirci bağlantısı");
      satir.insertBefore(sk, geriBildirim);
      const seyirciMetni = `${location.origin}${location.pathname}#izle=${s.izleKod}`;
      sk.title = `${seyirciMetni} (OBS'te şeffaf: &seffaf=1)`;
      sk.dataset["seyirci"] = seyirciMetni;
      sk.addEventListener("click", () => kopyala(seyirciMetni, sk, "Seyirci bağlantısı"));
    }
    const sy = el("div", "sayac k-e16", sol);
    const bekle = el("span", "", sy, "");
    bekle.dataset["sayac"] = "1";
    el("span", "k-segment genis", sy).dataset["odaSegment"] = "1";
    const sag = el("div", "lb-oda-sag", g);
    const bos = el("div", "lb-bos-rakip", sag);
    bos.style.position = "static"; bos.style.transform = "none";
    el("span", "k-soru", bos, "?");
    el("div", "k-kaide", bos);
    el("span", "k-e16", bos, "Rakip");
    const alt = el("div", "lb-oda-alt", g);
    const ip = dugme(alt, "orta", "İptal", "iptal");
    ip.addEventListener("click", this.iptal);
    const kk = dugme(alt, "ana", "Kodu kopyala");
    kk.addEventListener("click", () => kopyala(odaKoduBicimle(s.kod), kk, "Kodu kopyala"));
    this.ana = kk;
    this.beklemeGuncelle(s);
    queueMicrotask(() => kk.focus());
  }

  /** Aranıyor (b-ara0..2): çanakta dönen topaç, 12 dilim halka (5 sn/dilim), boş rakip kaidesi, İptal; 20 sn öneri, 30 sn bot. */
  private kuyrukEkrani(): void {
    const g = this.iskelet("Hızlı maç", this.iptal, "lb-ara");
    const blok = el("div", "lb-ara-blok", g);
    const ust = el("div", "lb-ara-ust", blok);
    el("span", "k-plaka genis", ust, "Rakip aranıyor");
    const ar = el("span", "lb-sure", ust);
    ar.dataset["arama"] = "1";
    ar.setAttribute("role", "status");
    ar.setAttribute("aria-live", "polite");
    const yer = el("div", "lb-canak-yer", g);
    const canak = el("div", "lb-canak", yer);
    canak.setAttribute("role", "progressbar");
    canak.setAttribute("aria-label", "Arama süresi");
    canak.setAttribute("aria-valuemin", "0");
    canak.setAttribute("aria-valuemax", "60");
    canak.appendChild(aramaCanagi(0));
    const t = this.ben.takimlar.find((x) => x.id === this.secilenTakim) ?? this.ben.takimlar[0]!;
    const ilk = uyeler(t)[0];
    const topac = pikselTopac(ilk?.element, { r: 16, donsun: true });
    canak.appendChild(topac);
    const bos = el("div", "lb-bos-rakip k-e16", canak);
    el("span", "k-soru", bos, "?");
    el("div", "k-kaide", bos);
    el("span", "", bos, "Rakip");
    const oneri = el("div", "", blok);
    oneri.dataset["oneri"] = "1";
    const s = el("div", "lb-ara-alt", g);
    const iptal = dugme(s, "orta", "İptal", "iptal");
    iptal.style.minWidth = "calc(96 * var(--p))";
    iptal.addEventListener("click", this.iptal);
    el("span", "k-tus", s, "Esc");
    this.kuyrukAsamasi = "";
    this.sonDolu = -1;
    this.kuyrukGuncelle();
    // topaç çanakta küçük bir elips çizer (8 kare döngü, 12 fps)
    let kare = 0;
    const yuru = window.setInterval(() => {
      if (!topac.isConnected) { window.clearInterval(yuru); return; }
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      kare = (kare + 1) % 24;
      const a = (kare / 24) * Math.PI * 2;
      topac.style.translate = `calc(${Math.round(Math.cos(a) * 20)} * var(--p)) calc(${Math.round(Math.sin(a) * 7)} * var(--p))`;
    }, 83);
    queueMicrotask(() => iptal.focus());
  }

  private kuyrukAsamasi = "";
  private sonDolu = -1;
  private kuyrukGuncelle(): void {
    const ar = this.kart.querySelector<HTMLElement>("[data-arama]");
    if (!ar) return;
    const sn = this.kuyrukSn;
    const metin = sureBicimle(sn);
    if (ar.textContent !== metin) { ar.textContent = metin; ar.setAttribute("aria-label", `Rakip aranıyor… ${metin}`); }
    const dolu = Math.min(12, Math.floor(sn / 5));
    if (dolu !== this.sonDolu) {
      this.sonDolu = dolu;
      const canak = this.kart.querySelector<HTMLElement>(".lb-canak");
      const eski = canak?.querySelector("canvas.k-canak");
      if (canak && eski) { canak.replaceChild(aramaCanagi(dolu), eski); canak.setAttribute("aria-valuenow", String(Math.round(sn))); }
    }
    const a = this.botIstendi ? "bot" : kuyrukAsamasi(sn);
    if (a === this.kuyrukAsamasi) return;
    this.kuyrukAsamasi = a;
    const o = this.kart.querySelector<HTMLElement>("[data-oneri]")!;
    o.innerHTML = "";
    o.className = "";
    if (a === "antrenmanOner") {
      o.className = "oneri k-panel lb-oneri k-e16 k-giris";
      o.dataset["asama"] = a;
      el("b", "", o, "Beklerken");
      const d = dugme(o, "kucuk", "Antrenman");
      d.addEventListener("click", () => { void this.baglanti?.ayril(); git("antrenman"); });
    } else if (a === "botTeklif") {
      o.className = "oneri bot-kart k-panel lb-oneri k-e16 k-giris";
      o.dataset["asama"] = a;
      const yz = el("div", "yazi", o);
      el("b", "", yz, "Rakip bulunamadı. Bot ile oyna?");
      el("span", "", yz, "Altın yarı · başarımda yalnız Yol");
      const d = dugme(o, "ana kisa yazi20", "Bot ile oyna", "bot");
      d.addEventListener("click", () => { this.botIstendi = true; this.ag?.gonder(MESAJ.botIste); d.disabled = true; d.textContent = "Bot hazırlanıyor…"; });
      this.ana = d;
      queueMicrotask(() => d.focus());
    }
  }

  private beklemeGuncelle(s: OdaGorunumu): void {
    if (s.mod === "hizli") { this.kuyrukGuncelle(); return; }
    const e = this.kart.querySelector<HTMLElement>("[data-sayac]");
    if (e) e.textContent = `Oda ${sureBicimle(s.beklemeKalan)} açık kalır`;
    const seg = this.kart.querySelector<HTMLElement>("[data-oda-segment]");
    if (seg) {
      const n = Math.max(0, Math.min(20, Math.ceil(s.beklemeKalan / 3)));
      if (seg.childElementCount !== 20) { seg.innerHTML = ""; for (let i = 0; i < 20; i++) el("i", "", seg); }
      [...seg.children].forEach((c, i) => c.classList.toggle("dolu", i < n));
    }
  }

  /** VS anı (b-vs): çatlakla bölünen ekran, ad plakaları + element rozetleri, VS damgası; ≤ 1,6 sn sonra takım seçimi. */
  private vsGoster(): void {
    const ag = this.ag;
    if (!ag || this.vsKatman) return;
    const v = el("div", "lb-vs sars", this.kok);
    v.setAttribute("role", "alert");
    v.setAttribute("aria-live", "assertive");
    this.vsKatman = v;
    const ben = ag.oyuncu(ag.yerel), rk = ag.oyuncu(1 - ag.yerel);
    const o = Number(getComputedStyle(document.documentElement).getPropertyValue("--o")) || 2;
    v.appendChild(vsZemini(Math.ceil(window.innerWidth / o), Math.ceil(window.innerHeight / o), !!rk?.bot));
    const taraf = (sinif: string, ad: string, isaret: string, takimId: string | undefined, sag: boolean) => {
      const t = el("div", `taraf ${sinif}`, v);
      const pl = el("div", `k-vs-plaka${sag ? " sag" : ""}`, t);
      el("i", sag ? "k-isaret rakip" : "k-isaret", pl).setAttribute("aria-label", isaret === "▲" ? "Sen" : "Rakip");
      el("span", "", pl, ad);
      const els = el("span", "els", pl);
      const p = takimId ? takimProfilleriKimlikten(takimId) : [];
      for (const x of p) elRozet(els, x.element, "cerceve");
      t.appendChild(pikselTopac(p[0]?.element, { r: 32, donsun: true }));
      el("div", "k-kaide", t).style.width = "calc(86 * var(--p))";
    };
    taraf("sol", this.ben.oyuncu.ad, "▲", ben?.takimId, false);
    taraf("sag", rk?.ad ?? "Rakip", "◆", rk?.takimId, true);
    el("div", "damga", v, "VS");
    // K-18 (MENU-P1A): etiket yalnız gerçekten seçim varken (birden çok takım + seçim fazı)
    if (this.ben.takimlar.length > 1 && ag.durum.faz === ODA_FAZI.secim) el("div", "alt-yazi k-e16", v, "Takım seçimi");
    const vsAd = el("span", "", v);
    vsAd.style.position = "absolute"; vsAd.style.width = "1px"; vsAd.style.height = "1px"; vsAd.style.overflow = "hidden";
    vsAd.textContent = `Rakip bulundu: ${rk?.ad ?? ""}`;
    window.setTimeout(() => this.vsKaldir(), 1600);
  }
  private vsKaldir(): void { this.vsKatman?.remove(); this.vsKatman = null; }

  /** Takım seçimi (b-takim): SEN · 20 çentik halka + takım kartları (1/2/3) · RAKİP, HAZIR. */
  private secim(): void {
    this.asama = "secim";
    const ag = this.ag!;
    if (this.mac) { this.kok.classList.add("ust"); this.kok.style.display = ""; }
    const g = this.iskelet(this.mac ? "Rövanş: takım seç" : "Takım seç", ag.durum.mod === "harita" ? () => { void this.baglanti?.ayril(); git("harita"); } : null, "lb-secim");
    const sen = el("div", "k-panel lb-taraf k-e16", g);
    const rs = el("span", "rol sen", sen); el("i", "k-isaret", rs); rs.append(" Sen");
    el("span", "", sen, this.ben.oyuncu.ad);
    el("div", "", sen).dataset["senElement"] = "1";
    const orta = el("div", "lb-ortada", g);
    const halka = el("div", "lb-halka", orta);
    halka.appendChild(sureHalkasi(20));
    const sayac = el("span", "sayi", halka, "");
    sayac.dataset["secimSayac"] = "1";
    const panel = el("div", "k-panel lb-kartlar-panel", orta);
    el("div", "k-e16", panel, this.ben.takimlar.length > 1 ? "Takımını seç" : "Takımın");
    const izg = el("div", "lb-kartlar", panel);
    this.ben.takimlar.forEach((t, i) => {
      const d = el("button", "lb-kart k-odak", izg);
      d.type = "button";
      d.dataset["takim"] = t.id;
      el("span", "no", d, String(i + 1));
      const m = el("span", "minis", d);
      const u = uyeler(t);
      for (const x of u) m.appendChild(topac3bIkonu(x.profil, 7, x.odunc));
      el("b", "", d, t.ad);
      const odunc = u.filter((x) => x.odunc).length;
      el("small", odunc ? "" : "lv", d, odunc ? `${odunc} ödünç` : `Lv.${Math.max(...u.map((x) => x.seviye))}`);
      d.setAttribute("aria-label", `${i + 1}. ${t.ad}${odunc ? `, ${odunc} ödünç topaç` : ""}`);
      d.addEventListener("click", () => {
        this.secilenTakim = t.id;
        sakla(TAKIM_ANAHTAR, t.id);
        ag.gonder(MESAJ.takimSec, { takimId: t.id });
        this.secimGuncelle();
      });
    });
    const duyuru = el("div", "lb-duyuru k-e16", orta, "");
    duyuru.dataset["duyuru"] = "1";
    // harita maçı: rakip düğüm botu, zorluk göstergesi (07 § 3)
    const hd = ag.durum.mod === "harita" ? haritaDugumBilgisi(ag.durum.dugum) : null;
    if (hd) { const z = el("div", "k-e16 lb-zorluk", orta, `${hd.ad} · ZORLUK ${"●".repeat(hd.zorluk)}${"○".repeat(5 - hd.zorluk)}`); z.dataset["zorluk"] = String(hd.zorluk); }
    duyuru.setAttribute("aria-live", "polite");
    const rk = el("div", "k-panel lb-taraf sag-taraf k-e16", g);
    rk.dataset["rakip"] = "1";
    const alt = el("div", "lb-secim-alt", g);
    const hazir = dugme(alt, "ana", "Hazır", "hazir");
    hazir.addEventListener("click", () => { ag.gonder(MESAJ.hazir); hazir.disabled = true; hazir.textContent = "Rakip bekleniyor…"; hazir.classList.add("yazi20"); });
    this.ana = hazir;
    // sunucudaki takım bu istemcinin seçtiğinden farklıysa (yeni oda) bildir
    const ben = ag.oyuncu(ag.yerel);
    if (ben && ben.takimNo !== this.secilenTakim) ag.gonder(MESAJ.takimSec, { takimId: this.secilenTakim });
    this.sonSayac = -1;
    this.sonRakip = "";
    this.secimGuncelle();
    if (!this.mac) this.vsGoster();
    queueMicrotask(() => hazir.focus());
  }

  private sonSayac = -1;
  private sonRakip = "";
  private secimGuncelle(): void {
    const ag = this.ag;
    if (!ag || this.asama !== "secim") return;
    const s = ag.durum;
    for (const d of this.kart.querySelectorAll<HTMLElement>("[data-takim]")) d.setAttribute("aria-pressed", String(d.dataset["takim"] === this.secilenTakim));
    // SEN paneli: seçili takımın 3 elementi (ilk topaç bronz çerçeve)
    const se = this.kart.querySelector<HTMLElement>("[data-sen-element]");
    const t = this.ben.takimlar.find((x) => x.id === this.secilenTakim);
    if (se && t && se.dataset["senTakim"] !== t.id) {
      se.dataset["senTakim"] = t.id;
      se.innerHTML = "";
      se.style.display = "flex"; se.style.flexDirection = "column"; se.style.gap = "calc(6 * var(--p))";
      const mz = ag.oyuncu(ag.yerel)?.malzeme ?? "";
      uyeler(t).forEach((x, i) => { const k = el("div", `kutu${i === 0 ? " ilk" : ""}`, se); elRozet(k, x.element, `x2${x.odunc ? " odunc" : ""}`); malzemeRozetleri(k, mz.slice(i * 4, i * 4 + 4)); });
    }
    const sayac = this.kart.querySelector<HTMLElement>("[data-secim-sayac]");
    if (sayac && s.secimKalan !== this.sonSayac) {
      this.sonSayac = s.secimKalan;
      sayac.textContent = String(s.secimKalan);
      sayac.setAttribute("aria-label", `Süre ${s.secimKalan} sn · süre dolunca son seçtiğin takım`);
      const h = sayac.parentElement!;
      h.classList.toggle("son", s.secimKalan <= 5);
      const eski = h.querySelector("canvas");
      if (eski) h.replaceChild(sureHalkasi(s.secimKalan), eski);
    }
    const rk = ag.oyuncu(1 - ag.yerel);
    const r = this.kart.querySelector<HTMLElement>("[data-rakip]");
    if (r && rk) {
      const anahtar = `${rk.ad}|${rk.takimId}|${rk.hazir}`;
      if (anahtar !== this.sonRakip) {
        this.sonRakip = anahtar;
        r.innerHTML = "";
        const rr = el("span", "rol rakip", r); el("i", "k-isaret rakip", rr); rr.append(" Rakip");
        el("b", "", r, rk.ad).style.cssText = "font-weight:400;color:var(--ink)";
        const p = takimProfilleriKimlikten(rk.takimId);
        p.forEach((x, i) => { const k = el("div", "kutu", r); elRozet(k, x.element, "x2"); malzemeRozetleri(k, (rk.malzeme ?? "").slice(i * 4, i * 4 + 4)); });
        if (rk.hazir) el("span", "durum", r, "Hazır");
        r.setAttribute("aria-label", `Rakip: ${rk.ad}${rk.hazir ? " · hazır" : ""}`);
      }
    }
    const duyuru = this.kart.querySelector<HTMLElement>("[data-duyuru]");
    if (duyuru) duyuru.textContent = performance.now() < this.rakipBulunduBitis && rk ? `Rakip bulundu: ${rk.ad}` : "";
    if (this.vsKatman && rk) { const pl = this.vsKatman.querySelector(".sag .k-vs-plaka span:nth-child(2)"); if (pl && pl.textContent !== rk.ad) pl.textContent = rk.ad; }
  }

  private macaGec(): void {
    if (this.asama === "mac") return;
    this.asama = "mac";
    this.vsKaldir();
    this.kok.style.display = "none";
    if (!this.mac) {
      this.mac = cevrimiciBaslat(this.b, this.ag!, {
        secim: () => {},
        cikis: (neden) => { this.giris(neden); },
        ben: this.ben,
        // D7: hızlı maçta Tekrar = yeni eşleşme (sayfa temiz başlar, kuyruk kendiliğinden)
        tekrar: () => {
          const q = new URLSearchParams(location.search);
          q.set("ekran", "lobi");
          // harita: aynı düğüme yeni maç (sunucu karakterin hâlâ orada olduğunu denetler)
          const dg = this.ag?.durum.mod === "harita" ? this.ag.durum.dugum : undefined;
          if (dg) { q.delete("hizli"); q.set("dugum", dg); } else q.set("hizli", "1");
          void this.baglanti?.ayril().finally(() => { location.href = `${location.pathname}?${q.toString()}`; });
        },
      });
    }
  }

  private tik(): void {
    const s = this.ag?.durum;
    if (!s || !s.oyuncular) return;
    if (this.asama === "secim") this.secimGuncelle();
    if (this.asama === "bekliyor") this.beklemeGuncelle(s);
    if (this.asama === "bekliyor" && s.mod === "hizli") this.kuyrukGuncelle();
    // faz değişimini kaçırmamak için (onStateChange zaten çağırır; yedek)
    if (s.faz !== this.sonFaz) this.durumDegisti(s);
  }
}
