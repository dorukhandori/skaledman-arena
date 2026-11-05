import { AYAR, type ElementAdi } from "../../paylasilan/kurallar/ayar.ts";
import { ILERLEME } from "../../paylasilan/kurallar/ilerleme.ts";
import { RUHLAR, YETENEKLER, cekirdekBul } from "../../paylasilan/veri/katalog.ts";
import type { Yetenek } from "../../paylasilan/veri/semalar.ts";
import type { EkranBaglami } from "../main.ts";
import { type AtolyeCekirdegi, BakimHatasi, GORULEN_SEVIYE, atolyeGetir, git, oku, sakla } from "../hesap.ts";
import { elementSvg } from "../oyun/elementSimge.ts";
import { ELEMENT_RENK, KOKEN_RENK, renkCss } from "../oyun/renkler.ts";
import { bakimKatmani, ekranKok, el, geriDugmesi } from "./arayuz.ts";

// Çekirdek Günlüğü (D6, US-2.2): seviye ve tecrübe çubuğu, sonraki seviyede ne açılır, defter (maç, galibiyet,
// krizden galibiyet, en uzun dönüş, Kararma, Yapay kalan ömür), ruh kartı (ad, element, kişilik, Yetenek / Özel
// Yetenek / Ulti açıklaması; kilitliyse gölgeli). Seviye kapıları sim'le aynı tablodan (AYAR.yetenek.seviyeYuva):
// Lv.2 Yetenek, Lv.3 Özel Yetenek + Ulti (ilk sürümde tavan Lv.3; tuning § 14'teki "Lv.4 Ulti, sezon 2" SAPMA).

const STIL = `
.gn .kart { width:min(calc(520 * var(--p)),100%); }
.gn .dz { display:grid; grid-template-columns:calc(120 * var(--p)) 1fr; gap:calc(8 * var(--p)); margin-top:calc(4 * var(--p)); }
.gn .liste { display:flex; flex-direction:column; gap:calc(3 * var(--p)); }
.gn .liste button { justify-content:flex-start; text-align:left; gap:calc(4 * var(--p)); min-height:calc(24 * var(--p)); }
.gn .liste button[aria-current=true] { --ks: inset 0 0 0 var(--p) var(--gold), inset 0 calc(2 * var(--p)) 0 0 #8a5a34; background-color:var(--secili); }
.gn .liste button svg { width:calc(11 * var(--p)); height:calc(11 * var(--p)); }
.gn .liste small { color:var(--soluk); display:block; }
.gn .bas { display:flex; gap:calc(6 * var(--p)); align-items:center; }
.gn .bas h3 { margin:0; }
.gn .bas svg { width:calc(22 * var(--p)); height:calc(22 * var(--p)); }
.gn .lv { font:400 var(--y-30)/1 var(--font-baslik); padding:calc(2 * var(--p)) calc(6 * var(--p)); color:var(--gold); background:#3b2c0c; box-shadow:inset 0 0 0 var(--p) #c9a33b; }
.gn .xp { height:calc(6 * var(--p)); background:#0d0f18; box-shadow:inset 0 0 0 var(--p) var(--harc); margin:calc(4 * var(--p)) 0 calc(2 * var(--p)); position:relative; }
.gn .xp i { position:absolute; left:var(--p); top:var(--p); bottom:var(--p); max-width:calc(100% - 2 * var(--p)); background:repeating-linear-gradient(90deg, var(--sen) 0 calc(3 * var(--p)), transparent calc(3 * var(--p)) calc(4 * var(--p))); }
.gn .sonraki { margin:calc(4 * var(--p)) 0; padding:calc(4 * var(--p)) calc(6 * var(--p)); background:#11141f; box-shadow:inset 0 0 0 var(--p) var(--bronz-1); line-height:.875; }
.gn .defter { display:grid; grid-template-columns:repeat(3,1fr); gap:calc(3 * var(--p)); margin:calc(4 * var(--p)) 0; }
.gn .defter div { padding:calc(3 * var(--p)) calc(4 * var(--p)); background:var(--hucre); box-shadow:inset 0 var(--p) 0 0 var(--hucre-isik), inset 0 0 0 var(--p) var(--harc); }
.gn .defter b { display:block; font:400 var(--y-20)/1 var(--font-baslik); color:var(--turuncu); }
.gn .defter span { color:var(--soluk); text-transform:uppercase; }
.gn .ruh { display:grid; grid-template-columns:calc(64 * var(--p)) 1fr; gap:calc(6 * var(--p)); padding:calc(5 * var(--p)); background:#11141f; box-shadow:inset 0 0 0 var(--p) var(--bronz-1); }
.gn .ruh .silu { width:calc(64 * var(--p)); height:calc(64 * var(--p)); background:var(--panel-0); box-shadow:inset 0 0 0 var(--p) var(--harc); display:flex; align-items:center; justify-content:center; }
.gn .ruh .silu svg { width:calc(56 * var(--p)); height:calc(56 * var(--p)); }
.gn .yt3 { display:flex; flex-direction:column; gap:calc(3 * var(--p)); margin-top:calc(3 * var(--p)); }
.gn .yet { padding:calc(3 * var(--p)) calc(4 * var(--p)); background:var(--hucre); box-shadow:inset 0 0 0 var(--p) #3f8f60; line-height:.875; }
.gn .yet b { color:var(--ink); text-transform:uppercase; }
.gn .yet.kilitli { box-shadow:inset 0 0 0 var(--p) #3a3f55; background:#11141f; color:#6a6474; }
.gn .yet .kl { float:right; color:var(--gold); text-transform:uppercase; }
.gn .not { color:var(--soluk); margin-top:calc(3 * var(--p)); line-height:.875; }
html[data-yazi-buyuk] .gn .dz { grid-template-columns:1fr; }
`;

const TUR_AD: Record<Yetenek["tur"], string> = { hucum: "Hücum", savunma: "Savunma", alan: "Alan", sayac: "Sayaç" };
const KOKEN_AD: Record<string, string> = { goktasi: "Göktaşı", maden: "Maden", yapay: "Yapay", karanlik: "Karanlık" };

function yetenekAciklamasi(y: Yetenek | undefined): string {
  if (!y) return "";
  const p = [TUR_AD[y.tur], y.enerjiDilimi ? `${y.enerjiDilimi} Enerji dilimi` : "Enerji istemez", `${y.beklemeSn} sn bekleme`];
  if (y.telegrafSn > 0) p.push(`${y.telegrafSn} sn telegraf`);
  if (y.sureSn > 0) p.push(`${y.sureSn} sn sürer`);
  return p.join(" · ");
}

function ruhSiluet(element: ElementAdi, acik: boolean): string {
  const r = acik ? renkCss(ELEMENT_RENK[element].orta) : "#1b2a30";
  const k = acik ? renkCss(ELEMENT_RENK[element].koyu) : "#2c3d43";
  // yer tutucu ruh silueti (kanatlı canavar biçimi); kilitliyken gölge
  return `<svg viewBox="0 0 64 64" width="112" height="112" role="img" aria-label="${acik ? "Ruh silueti" : "Ruh silueti kilitli (Lv.3)"}">
    <path d="M32 10c6 0 10 5 10 11 0 3-1 5-2 7l12-6-6 12 8 2-10 6c-2 7-7 12-12 12s-10-5-12-12l-10-6 8-2-6-12 12 6c-1-2-2-4-2-7 0-6 4-11 10-11Z" fill="${r}" stroke="${k}" stroke-width="2"/>
    ${acik ? `<circle cx="27" cy="22" r="2.2" fill="#fff"/><circle cx="37" cy="22" r="2.2" fill="#fff"/>` : `<text x="32" y="40" font-size="16" font-weight="900" text-anchor="middle" fill="#5b666b">?</text>`}</svg>`;
}

export function baslat(b: EkranBaglami): void {
  const ben = b.ben;
  if (!ben?.girisli) { git("karsilama"); return; }
  void atolyeGetir().then((v) => ciz(b, v.cekirdekler)).catch((e) => { if (e instanceof BakimHatasi) bakimKatmani(() => location.reload()); else throw e; });
}

function ciz(b: EkranBaglami, cekirdekler: AtolyeCekirdegi[]): void {
  const { kok, kart } = ekranKok(b.ustYazi, "Çekirdek Günlüğü", { baslik: "Günlük" });
  kok.classList.add("gn");
  const st = el("style"); st.textContent = STIL; document.head.appendChild(st);
  geriDugmesi(kart);
  el("h2", "k-plaka", kart, "Çekirdek Günlüğü");
  el("div", "alt", kart, "Çekirdeğin büyümesi: seviye, defter ve ruhu.");
  const q = new URLSearchParams(location.search);
  let secili = cekirdekler.find((c) => String(c.id) === q.get("c")) ?? cekirdekler[0];
  const dz = el("div", "dz", kart);
  const liste = el("nav", "liste", dz);
  liste.setAttribute("aria-label", "Çekirdekler");
  const ana = el("section", "", dz);
  const listeCiz = () => {
    liste.innerHTML = "";
    for (const c of cekirdekler) {
      const d = el("button", "", liste);
      d.dataset["cekirdek"] = String(c.id);
      d.setAttribute("aria-current", String(c === secili));
      d.innerHTML = elementSvg(c.element as ElementAdi, 22);
      const s = el("span", "", d);
      el("span", "", s, c.ad);
      el("small", "", s, `Lv.${c.seviye} · ${c.tecrube} XP${c.devreDisi ? " · ömrü bitti" : ""}`);
      d.addEventListener("click", () => { secili = c; history.replaceState(null, "", `?ekran=gunluk&c=${c.id}`); listeCiz(); anaCiz(); });
    }
  };
  const anaCiz = () => {
    ana.innerHTML = "";
    if (!secili) { el("p", "", ana, "Henüz Çekirdeğin yok."); return; }
    const c = secili;
    // "yeni yetenek açıldı" rozetini temizle (görüldü)
    try {
      const m = JSON.parse(oku(GORULEN_SEVIYE) ?? "{}") as Record<number, number>;
      m[c.id] = c.seviye;
      sakla(GORULEN_SEVIYE, JSON.stringify(m));
    } catch { /* yok */ }
    const t = cekirdekBul(c.tanimId);
    const ruh = RUHLAR.find((r) => r.id === t.ruh);
    const bas = el("div", "bas", ana);
    bas.innerHTML = elementSvg(c.element as ElementAdi, 40);
    const h = el("h3", "", bas, c.ad);
    h.dataset["gunlukAd"] = "1";
    el("span", "lv", bas, `Lv.${c.seviye}`).dataset["seviye"] = String(c.seviye);
    el("span", "yt", bas, `${KOKEN_AD[c.koken] ?? c.koken} · ${ELEMENT_RENK[c.element as ElementAdi].ad}`);
    const tavan = c.seviye >= ILERLEME.tavan;
    const bar = el("div", "xp", ana);
    bar.setAttribute("role", "meter");
    bar.setAttribute("aria-label", "Tecrübe");
    bar.setAttribute("aria-valuemin", String(c.alt));
    bar.setAttribute("aria-valuemax", String(tavan ? c.tecrube : c.ust));
    bar.setAttribute("aria-valuenow", String(c.tecrube));
    el("i", "", bar).style.width = `${tavan ? 100 : Math.round(Math.max(0, Math.min(1, (c.tecrube - c.alt) / Math.max(1, c.ust - c.alt))) * 100)}%`;
    el("div", "yt", ana, tavan ? `Tecrübe ${c.tecrube} XP · tavan Lv.${c.seviye} (ilk sürüm)` : `Tecrübe ${c.tecrube} / ${c.ust} XP · sonraki seviyeye ${c.ust - c.tecrube} XP`).dataset["xp"] = String(c.tecrube);
    const yetenek = YETENEKLER.find((y) => y.id === ruh?.yetenek);
    const ozel = YETENEKLER.find((y) => y.id === ruh?.yetenekAilesi) ?? YETENEKLER.find((y) => y.ad === ruh?.ozelYetenek);
    const ulti = ruh?.ulti ? YETENEKLER.find((y) => y.id === ruh.ulti) : undefined;
    const SY = AYAR.yetenek.seviyeYuva;
    const sn = el("div", "sonraki", ana);
    sn.dataset["sonraki"] = "1";
    if (c.seviye < 2) sn.innerHTML = `<b>Sonraki: Lv.2</b> (${ILERLEME.esikler[1]} XP): pasif + Yetenek <b></b>.`;
    else if (c.seviye < 3) sn.innerHTML = `<b>Sonraki: Lv.3</b> (${ILERLEME.esikler[2]} XP): Özel Yetenek <b></b>, Ulti ve ruh silueti.`;
    else sn.innerHTML = `<b>Tüm yetenekler açık.</b> İlk sürümde tavan Lv.3: Özel Yetenek ve Ulti bu seviyede açılır. Lv.4 (tam ruh) sezon 2.`;
    const b2 = sn.querySelectorAll("b")[1];
    if (b2) b2.textContent = c.seviye < 2 ? (yetenek?.ad ?? "") : (ozel?.ad ?? ruh?.ozelYetenek ?? "");
    // defter
    const df = el("div", "defter", ana);
    df.setAttribute("aria-label", "Defter");
    const kutu = (ad: string, deger: string, anahtar: string) => { const d = el("div", "", df); d.dataset["defter"] = anahtar; el("b", "", d, deger); el("span", "", d, ad); };
    kutu("Maç", String(c.defter.mac), "mac");
    kutu("Galibiyet", String(c.defter.galibiyet), "galibiyet");
    kutu("Krizden galibiyet", String(c.defter.krizGalibiyet), "kriz");
    kutu("En uzun dönüş", `${c.defter.enUzunDonusSn} sn`, "donus");
    if (c.koken === "karanlik" || c.defter.kararma > 0) kutu("Kararma sayacı", String(c.defter.kararma), "kararma");
    if (c.omur !== null) kutu("Yapay kalan ömür", `${c.omur} maç`, "omur");
    // ruh kartı
    if (ruh) {
      const rk = el("div", "ruh", ana);
      rk.dataset["ruh"] = ruh.id;
      const sl = el("div", "silu", rk);
      sl.innerHTML = ruhSiluet(ruh.element as ElementAdi, c.seviye >= 3);
      const sag = el("div", "", rk);
      const rb = el("h3", "", sag, ruh.ad);
      rb.style.margin = "0";
      rb.style.color = renkCss(KOKEN_RENK[c.koken as keyof typeof KOKEN_RENK]?.isik ?? 0xffffff);
      el("div", "yt", sag, `${ELEMENT_RENK[ruh.element as ElementAdi].ad} ruhu · ${KOKEN_AD[ruh.koken] ?? ""}`);
      el("p", "", sag, `"${ruh.kisilik}"`);
      const y3 = el("div", "yt3", sag);
      const yt = (tur: string, y: Yetenek | undefined, ad: string, gerek: number) => {
        const acik = c.seviye >= gerek;
        const d = el("div", `yet${acik ? "" : " kilitli"}`, y3);
        d.dataset["yetenekYuva"] = tur;
        d.dataset["acik"] = acik ? "1" : "0";
        el("span", "kl", d, acik ? "Açık" : `Kilitli: Lv.${gerek}`);
        el("b", "", d, `${tur}: ${y?.ad ?? ad}`);
        el("div", "", d, yetenekAciklamasi(y));
        d.setAttribute("aria-label", `${tur}: ${y?.ad ?? ad}. ${acik ? "Açık" : `Kilitli, Lv.${gerek} gerekir`}. ${yetenekAciklamasi(y)}`);
      };
      yt("Yetenek", yetenek, ruh.yetenek, SY[0]!);
      yt("Özel Yetenek", ozel, ruh.ozelYetenek, SY[1]!);
      if (ruh.ulti) yt("Ulti", ulti, ruh.ulti, SY[2]!);
      el("div", "not", sag, "Lv.1: yetenek yok · Lv.2: Yetenek · Lv.3: Özel Yetenek + Ulti (maçta Çekirdeğin gerçek seviyesi geçerli).");
    }
  };
  listeCiz();
  anaCiz();
}
