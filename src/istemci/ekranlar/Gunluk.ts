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
.gn .kart { width:min(64rem,100%); }
.gn .dz { display:grid; grid-template-columns:14rem 1fr; gap:1rem; margin-top:.6rem; }
.gn .liste { display:flex; flex-direction:column; gap:.35rem; }
.gn .liste button { text-align:left; display:flex; gap:.45rem; align-items:center; padding:.45rem .55rem; font-size:.85rem; box-shadow:none; }
.gn .liste button[aria-current=true] { border-color:#f4cf47; background:#2a2a14; }
.gn .liste small { color:#a3b2b6; display:block; font-size:.7rem; }
.gn .bas { display:flex; gap:.8rem; align-items:center; }
.gn .bas h3 { margin:0; font-size:1.25rem; }
.gn .lv { font:900 1.6rem/1 system-ui; padding:.3rem .6rem; border-radius:8px; background:#24414b; }
.gn .xp { height:.9rem; background:#1b2a30; border:1px solid #050d10; border-radius:4px; overflow:hidden; margin:.5rem 0 .2rem; }
.gn .xp i { display:block; height:100%; background:#7fd3ff; }
.gn .sonraki { margin:.5rem 0; padding:.55rem .7rem; border:2px solid #24414b; border-radius:8px; background:#10222a; font-size:.88rem; }
.gn .defter { display:grid; grid-template-columns:repeat(3,1fr); gap:.4rem; margin:.6rem 0; }
.gn .defter div { padding:.5rem; background:#10222a; border:2px solid #24414b; border-radius:8px; }
.gn .defter b { display:block; font:900 1.3rem/1.1 system-ui; font-variant-numeric:tabular-nums; }
.gn .defter span { font-size:.75rem; color:#a3b2b6; font-weight:700; }
.gn .ruh { display:grid; grid-template-columns:8rem 1fr; gap:.8rem; padding:.7rem; border:3px solid #24414b; border-radius:12px; background:#0e1c21; }
.gn .ruh .silu { width:8rem; height:8rem; border-radius:10px; background:#081114; display:flex; align-items:center; justify-content:center; }
.gn .yt3 { display:flex; flex-direction:column; gap:.35rem; margin-top:.4rem; }
.gn .yet { padding:.4rem .55rem; border-radius:8px; border:2px solid #3c6b58; background:#10222a; font-size:.82rem; }
.gn .yet b { font-size:.88rem; }
.gn .yet.kilitli { border-style:dashed; border-color:#5b666b; background:#0b1215; color:#7d8a8f; filter:grayscale(1); }
.gn .yet .kl { float:right; font-size:.72rem; font-weight:900; }
.gn .not { font-size:.74rem; color:#a3b2b6; margin-top:.4rem; }
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
  const { kok, kart } = ekranKok(b.ustYazi, "Çekirdek Günlüğü");
  kok.classList.add("gn");
  const st = el("style"); st.textContent = STIL; document.head.appendChild(st);
  geriDugmesi(kart);
  el("h2", "", kart, "Çekirdek Günlüğü");
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
