import type { ElementAdi } from "../../paylasilan/kurallar/ayar.ts";
import { cekirdekBul, diskBul, govdeBul, ucBul } from "../../paylasilan/veri/katalog.ts";
import type { EkranBaglami } from "../main.ts";
import { git, type CekirdekGorunumu } from "../hesap.ts";
import { elementSvg } from "../oyun/elementSimge.ts";
import { anaEylem, ekranKok, el } from "./arayuz.ts";

// Atölye iskeleti (ux § 3.1-3.2: ana ekran, geri oku yok): profil kartı, kayıtlı takım (3 yuva; ödünç gri çerçeve,
// nile B-10), sağ altta büyük OYNA (takım eksikse soluk + neden, ux § 7). Parça/yuva düzenleme D6.

const KOKEN_AD: Record<string, string> = { goktasi: "Göktaşı", maden: "Maden", yapay: "Yapay", karanlik: "Karanlık" };

const STIL = `
.at .kart { width:min(64rem,100%); min-height:32rem; }
.at .dz { display:grid; grid-template-columns:15rem 1fr; gap:1.2rem; margin-top:.8rem; }
.at .pk { padding:.9rem; background:#10222a; border:3px solid; border-radius:12px; display:flex; flex-direction:column; gap:.4rem; align-items:flex-start; }
.at .pk b { font-size:1.15rem; }
.at .yuvalar { display:grid; grid-template-columns:repeat(3,1fr); gap:.8rem; }
.at .yv { padding:.8rem; background:#10222a; border:3px solid #24414b; border-radius:12px; display:flex; flex-direction:column; gap:.3rem; min-height:12rem; }
.at .yv.odunc { border-color:#5b666b; border-style:dashed; filter:grayscale(.85); background:#0e1a1e; }
.at .yv h4 { margin:0; display:flex; gap:.4rem; align-items:center; font-size:1rem; }
.at .yv .k { font-size:.78rem; color:#a3b2b6; }
.at .xp { height:.6rem; background:#1b2a30; border:1px solid #050d10; border-radius:3px; overflow:hidden; }
.at .xp i { display:block; height:100%; background:#7fd3ff; }
.at .rozet { align-self:flex-start; padding:.1rem .45rem; border-radius:5px; background:#3a4246; color:#c9d3d6; font-size:.72rem; font-weight:800; }
.at .oyna { position:absolute; right:1.4rem; bottom:1.4rem; padding:1rem 2.6rem; font:900 1.6rem/1 "Trebuchet MS",system-ui; letter-spacing:3px; }
.at .oyna[aria-disabled=true] { opacity:.45; filter:grayscale(.6); cursor:not-allowed; }
.at .neden { position:absolute; right:1.4rem; bottom:5.2rem; color:#ffcf9a; font-weight:700; font-size:.9rem; }
.at .baglar { display:flex; gap:.6rem; flex-wrap:wrap; margin-top:1rem; }
.at .toast { margin:.4rem 0 .6rem; padding:.5rem .8rem; border:2px solid #f4cf47; border-radius:8px; background:#2a2104; color:#fff6c8; font-weight:800; }
`;

function cekirdekKarti(ust: HTMLElement, sira: number, u: { cekirdek: string; govde: string; disk: string; uc: string; seviye: number; odunc: boolean }, c: CekirdekGorunumu | undefined): void {
  const t = cekirdekBul(u.cekirdek);
  const k = el("section", `yv${u.odunc ? " odunc" : ""}`, ust);
  k.dataset["yuva"] = String(sira);
  k.dataset["odunc"] = u.odunc ? "1" : "0";
  k.setAttribute("aria-label", `${sira + 1}. yuva: ${t.ad}${u.odunc ? " (ödünç)" : ""}`);
  const h = el("h4", "", k);
  h.innerHTML = `${elementSvg(t.element as ElementAdi, 20)}<span></span>`;
  h.querySelector("span")!.textContent = t.ad;
  el("div", "k", k, `${KOKEN_AD[t.koken] ?? t.koken} · Lv.${u.seviye}`);
  el("div", "k", k, `${govdeBul(u.govde).ad} · ${diskBul(u.disk).ad} · ${ucBul(u.uc).ad}`);
  if (u.odunc) {
    el("span", "rozet", k, "Ödünç");
    el("div", "k", k, "Lv.1 ödünç topaç: tecrübe ve başarım almaz. Yeni Çekirdek edinince yerini alır.");
    return;
  }
  if (c) {
    const bar = el("div", "xp", k);
    bar.setAttribute("role", "meter");
    bar.setAttribute("aria-label", "Tecrübe");
    const oran = c.ust > c.alt ? (c.tecrube - c.alt) / (c.ust - c.alt) : 1;
    bar.setAttribute("aria-valuenow", String(c.tecrube));
    el("i", "", bar).style.width = `${Math.round(Math.max(0, Math.min(1, oran)) * 100)}%`;
    el("div", "k", k, c.ust > c.alt ? `Tecrübe ${c.tecrube} / ${c.ust} XP` : `Tecrübe ${c.tecrube} XP · tavan Lv.${c.seviye}`);
    if (c.omur !== null) el("div", "k", k, `Ömür: ${c.omur} maç kaldı`);
  }
}

export function baslat(b: EkranBaglami): void {
  const ben = b.ben;
  if (!ben?.girisli) { git("karsilama"); return; }
  if (!ben.oyuncu.profilTamam) { git("profil"); return; }
  if (!ben.cekirdekler.length) { git("ilk-cekirdek"); return; }
  const { kok, kart } = ekranKok(b.ustYazi, "Atölye");
  kok.classList.add("at");
  const st = el("style"); st.textContent = STIL; document.head.appendChild(st);
  el("h2", "", kart, "Atölye");
  el("div", "alt", kart, "Takımını gör, maça hazırlan. Parça takma ve yuva düzenleme yakında.");
  if (new URLSearchParams(location.search).get("mesaj") === "ilkdevir" || ben.marketAcik && new URLSearchParams(location.search).get("mesaj") === "egitim") {
    const t = el("div", "toast", kart, "İlk Devir başarımı: Market açıldı.");
    t.setAttribute("role", "status");
  }
  const dz = el("div", "dz", kart);
  const pk = el("div", "pk", dz);
  pk.style.borderColor = ben.oyuncu.renk ?? "#24414b";
  pk.innerHTML = elementSvg((ben.oyuncu.arma ?? "kor") as ElementAdi, 40);
  el("b", "", pk, ben.oyuncu.ad);
  if (ben.oyuncu.destekKanali) el("div", "yt", pk, `Destek kanalı: ${ben.oyuncu.destekKanali}`);
  el("div", "yt", pk, `${ben.cekirdekler.length} Çekirdek · ${ben.basarimlar.length} başarım`);
  const pd = el("button", "", pk, "Profili düzenle");
  pd.addEventListener("click", () => git("profil"));
  const orta = el("div", "", dz);
  const takim = ben.takimlar[0];
  el("h3", "", orta, takim ? takim.ad : "Takım");
  const yv = el("div", "yuvalar", orta);
  if (takim) takim.uyeler.forEach((u, k) => cekirdekKarti(yv, k, u, ben.cekirdekler.find((c) => c.tanimId === u.cekirdek)));
  const baglar = el("div", "baglar", orta);
  const dene = el("button", "", baglar, "Dene: Antrenman eğitimi");
  dene.addEventListener("click", () => git("antrenman"));
  const lab = el("button", "", baglar, "Topaç Lab");
  lab.addEventListener("click", () => git("topac-lab"));
  const eksik = takim ? takim.eksik : 3;
  const oyna = el("button", "bir oyna", kart, "OYNA");
  oyna.dataset["eylem"] = "oyna";
  if (eksik > 0) {
    oyna.setAttribute("aria-disabled", "true");
    const n = el("div", "neden", kart, `Takımda 3 farklı Çekirdek olmalı. ${eksik} yuva boş.`);
    n.id = "oyna-neden";
    oyna.setAttribute("aria-describedby", n.id);
  }
  oyna.addEventListener("click", () => { if (eksik === 0) git("lobi"); });
  anaEylem(oyna);
  queueMicrotask(() => oyna.focus());
}
