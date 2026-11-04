import { botGirdisi } from "../../paylasilan/bot/bot.ts";
import { adim, dunyaKur } from "../../paylasilan/sim/Dunya.ts";
import type { Dunya } from "../../paylasilan/sim/durum.ts";
import { BASLANGIC_SETLERI, RUHLAR, YETENEKLER, cekirdekBul } from "../../paylasilan/veri/katalog.ts";
import { type TopacProfili, setProfili, topacProfiliKur } from "../../paylasilan/veri/profil.ts";
import type { EkranBaglami } from "../main.ts";
import { BakimHatasi, HESAP_HATA, MISAFIR_EGITIM, apiPost, git, oku, sakla } from "../hesap.ts";
import { elementSvg } from "../oyun/elementSimge.ts";
import { ELEMENT_RENK, KOKEN_RENK, renkCss } from "../oyun/renkler.ts";
import { bakimKatmani, ekranKok, el } from "./arayuz.ts";

// İlk Çekirdek (US-1.3, tide G-33, ux § 7): 3 başlangıç kartı; her kartta AYNI dört çubuk (Saldırı, Savunma, Hız,
// Stamina) + element + köken pasifi (tek cümle) + yetenek adı + 5 sn hareket önizlemesi (gerçek paylaşılan sim,
// paylaşılan bot rakip; 2D canvas çizimi) + Yapay aşınma notu. Düğme **Bunu seç** (Enter).

const PASIF: Record<string, string> = {
  goktasi: "Kriz Alevi: Stamina %30'un altına inince Enerji daha hızlı dolar.",
  maden: "Kök: çanağın ortasında yavaş dönerken daha yavaş erir.",
  yapay: "Uyum: her Gövdeye uyar, ilk yetenek daha ucuz; dönüş yönünü maç öncesi seçersin.",
};
const KOKEN_AD: Record<string, string> = { goktasi: "Göktaşı", maden: "Maden", yapay: "Yapay", karanlik: "Karanlık" };
const TIP_AD: Record<string, string> = { saldirgan: "Saldırgan", kale: "Kale", denge: "Denge", dayanikli: "Dayanıklı" };

const STIL = `
.ic .kartlar { display:grid; grid-template-columns:repeat(3, 1fr); gap:1rem; margin-top:.6rem; }
.ic .ck { display:flex; flex-direction:column; gap:.45rem; padding:.9rem; background:#10222a; border:3px solid #050d10; border-radius:12px; box-shadow:0 0 0 2px #24414b; }
.ic .ck:focus-within { box-shadow:0 0 0 3px #f4cf47; }
.ic .ck h3 { display:flex; align-items:center; gap:.45rem; margin:0; font-size:1.1rem; }
.ic .ck .kk { font-size:.78rem; color:#a3b2b6; font-weight:700; letter-spacing:.5px; }
.ic canvas { width:100%; aspect-ratio:11/8; background:#081114; border-radius:8px; border:2px solid #050d10; }
.ic .cb { display:grid; grid-template-columns:4.6rem 1fr; gap:.25rem .5rem; align-items:center; font-size:.78rem; }
.ic .cb .c { height:.6rem; background:#1b2a30; border:1px solid #050d10; border-radius:3px; overflow:hidden; }
.ic .cb .c i { display:block; height:100%; background:#f2e8b0; }
.ic .ps { font-size:.8rem; min-height:2.4rem; }
.ic .yet { font-size:.8rem; color:#c9d3d6; }
.ic .not { font-size:.78rem; color:#ffcf9a; background:#2a1a08; border:1px solid #6b4a1a; border-radius:6px; padding:.3rem .45rem; }
.ic .bos { min-height:1.9rem; }
.ic .ck button { margin-top:auto; }
`;

interface KartVerisi { set: (typeof BASLANGIC_SETLERI)[number]; profil: TopacProfili; yetenek: string; ozel: string }

function cubuklar(p: TopacProfili): [number, number, number, number] {
  return [p.parametreler.saldiri, p.parametreler.savunma, p.sim.vSurus * p.sim.ivme, p.parametreler.staminaHavuzu / Math.max(0.5, p.sim.erime)];
}

/** 5 sn önizleme: gerçek sim, bu topaç "saldırgan", rakip "rota" botu; döngü. */
class Onizleme {
  private d!: Dunya;
  private adimNo = 0;
  private bitti = false;
  private son = performance.now();
  private birikim = 0;
  constructor(private c: HTMLCanvasElement, private p: TopacProfili, private rakip: TopacProfili, private tohum: number) {
    this.kur();
    requestAnimationFrame(this.kare);
  }
  private kur(): void { this.d = dunyaKur([this.p, this.rakip], this.tohum); this.adimNo = 0; }
  durdur(): void { this.bitti = true; }
  private kare = (): void => {
    if (this.bitti) return;
    const t = performance.now();
    this.birikim += Math.min(0.1, (t - this.son) / 1000);
    this.son = t;
    while (this.birikim >= 1 / 60) {
      this.birikim -= 1 / 60;
      adim(this.d, [botGirdisi(this.d, 0, "saldirgan", this.tohum), botGirdisi(this.d, 1, "rota", this.tohum + 1)]);
      this.adimNo++;
      if (this.adimNo >= 300 || this.d.mac.faz !== "tur") { this.tohum++; this.kur(); }
    }
    this.ciz();
    requestAnimationFrame(this.kare);
  };
  private ciz(): void {
    const c = this.c;
    const w = (c.width = c.clientWidth * devicePixelRatio);
    const h = (c.height = c.clientHeight * devicePixelRatio);
    const g = c.getContext("2d")!;
    const R = this.d.arenaYaricap;
    const o = (Math.min(w, h) * 0.46) / R;
    g.fillStyle = "#081114"; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w / 2, h / 2);
    g.beginPath(); g.arc(0, 0, R * o, 0, Math.PI * 2); g.fillStyle = "#12262c"; g.fill();
    g.lineWidth = 3 * devicePixelRatio; g.strokeStyle = "#2f5560"; g.stroke();
    this.d.topaclar.forEach((t, i) => {
      const p = this.d.profiller[i]!;
      const renk = i === 0 ? renkCss(ELEMENT_RENK[p.element].orta) : "#6f8085";
      const r = 30 * o;
      g.save(); g.translate(t.x * o, t.z * o);
      g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fillStyle = renk; g.fill();
      g.lineWidth = 2 * devicePixelRatio; g.strokeStyle = "#050d10"; g.stroke();
      g.rotate((this.adimNo * 0.5 + i) * (p.donus === "sol" ? -1 : 1));
      g.strokeStyle = i === 0 ? renkCss(KOKEN_RENK[p.koken].isik) : "#a3b2b6";
      g.beginPath(); g.moveTo(-r * 0.8, 0); g.lineTo(r * 0.8, 0); g.moveTo(0, -r * 0.8); g.lineTo(0, r * 0.8); g.stroke();
      g.restore();
    });
    g.restore();
  }
}

export function baslat(b: EkranBaglami): void {
  const ben = b.ben;
  if (!ben?.girisli) { git("karsilama"); return; }
  if (ben.cekirdekler.length) { git("atolye"); return; }
  const { kok, kart } = ekranKok(b.ustYazi, "İlk Çekirdek");
  kok.classList.add("ic");
  const st = el("style"); st.textContent = STIL; document.head.appendChild(st);
  el("h2", "", kart, "İlk Çekirdeğini seç");
  el("div", "alt", kart, "Çekirdek topacının kalbidir: elementi, kökeni ve yeteneği ondan gelir. Seçilmeyen ikisi sonra Market'te ucuza durur.");
  const veriler: KartVerisi[] = BASLANGIC_SETLERI.map((set) => {
    const c = cekirdekBul(set.cekirdek);
    const ruh = RUHLAR.find((r) => r.id === c.ruh);
    return { set, profil: setProfili(set), yetenek: YETENEKLER.find((y) => y.id === ruh?.yetenek)?.ad ?? "?", ozel: ruh?.ozelYetenek ?? "" };
  });
  const enCok = [0, 1, 2, 3].map((k) => Math.max(...veriler.map((v) => cubuklar(v.profil)[k]!)));
  const rakip = topacProfiliKur("girdap-maden", "halka-govde", "parlak-disk", "top-uc");
  const izgara = el("div", "kartlar", kart);
  const h = el("div", "hata", kart);
  h.setAttribute("role", "alert");
  const oniz: Onizleme[] = [];
  let ilk: HTMLButtonElement | null = null;
  veriler.forEach((v, k) => {
    const p = v.profil;
    const c = el("section", "ck", izgara);
    c.setAttribute("aria-labelledby", `ck-${k}`);
    c.dataset["set"] = v.set.id;
    const bas = el("h3", "", c);
    bas.id = `ck-${k}`;
    bas.innerHTML = `${elementSvg(p.element, 22)}<span></span>`;
    bas.querySelector("span")!.textContent = cekirdekBul(v.set.cekirdek).ad;
    el("div", "kk", c, `${KOKEN_AD[p.koken]} · ${ELEMENT_RENK[p.element].ad} · ${TIP_AD[p.tip] ?? p.tip} · Lv.2`);
    const cv = el("canvas", "", c);
    cv.setAttribute("aria-label", `${cekirdekBul(v.set.cekirdek).ad}: 5 saniyelik hareket önizlemesi`);
    cv.setAttribute("role", "img");
    oniz.push(new Onizleme(cv, p, rakip, 11 + k * 7));
    const cb = el("div", "cb", c);
    const deger = cubuklar(p);
    ["Saldırı", "Savunma", "Hız", "Stamina"].forEach((ad, j) => {
      el("span", "", cb, ad);
      const kap = el("span", "c", cb);
      const oran = Math.max(0.12, deger[j]! / enCok[j]!);
      kap.setAttribute("role", "meter");
      kap.setAttribute("aria-label", ad);
      kap.setAttribute("aria-valuemin", "0");
      kap.setAttribute("aria-valuemax", "10");
      kap.setAttribute("aria-valuenow", String(Math.round(oran * 10)));
      el("i", "", kap).style.width = `${Math.round(oran * 100)}%`;
    });
    el("div", "ps", c, PASIF[p.koken] ?? "");
    el("div", "yet", c, `Yetenek: ${v.yetenek} · Lv.3'te Özel Yetenek: ${v.ozel}`);
    if (p.koken === "yapay") el("div", "not", c, "Ömrü sınırlı: 30 maç sonra yenilenmesi gerekir.");
    else el("div", "bos", c);
    const d = el("button", k === 0 ? "bir" : "", c, "Bunu seç");
    d.dataset["eylem"] = `sec-${v.set.id}`;
    d.setAttribute("aria-label", `Bunu seç: ${cekirdekBul(v.set.cekirdek).ad}`);
    ilk ??= d;
    d.addEventListener("focus", () => { for (const x of izgara.querySelectorAll("button")) x.classList.toggle("bir", x === d); });
    d.addEventListener("click", async () => {
      for (const x of izgara.querySelectorAll("button")) (x as HTMLButtonElement).disabled = true;
      h.textContent = "";
      try {
        const r = await apiPost("/api/ilk-cekirdek", { set: v.set.id });
        if (r.durum !== 201 && r.veri.hata !== "var") { h.textContent = HESAP_HATA[r.veri.hata ?? "bicim"] ?? HESAP_HATA["bicim"]!; return; }
        for (const o of oniz) o.durdur();
        // misafirken Antrenman eğitimini bu tarayıcıda bitirdiyse İlk Devir bildirilir (tide O-1 b)
        if (oku(MISAFIR_EGITIM) === "1") {
          await apiPost("/api/egitim-bitti");
          sakla(MISAFIR_EGITIM, null);
          git("atolye", "&mesaj=ilkdevir");
        } else git("antrenman");
      } catch (e) {
        if (e instanceof BakimHatasi) bakimKatmani(() => location.reload());
      } finally {
        for (const x of izgara.querySelectorAll("button")) (x as HTMLButtonElement).disabled = false;
      }
    });
  });
  // ok tuşları kartlar arasında (ux § 6.4)
  izgara.addEventListener("keydown", (e) => {
    const dg = [...izgara.querySelectorAll("button")];
    const i = dg.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    if (e.key === "ArrowRight") { e.preventDefault(); dg[(i + 1) % dg.length]!.focus(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); dg[(i + dg.length - 1) % dg.length]!.focus(); }
  });
  queueMicrotask(() => ilk?.focus());
}
