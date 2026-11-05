import { botGirdisi } from "../../paylasilan/bot/bot.ts";
import { adim, dunyaKur } from "../../paylasilan/sim/Dunya.ts";
import type { Dunya } from "../../paylasilan/sim/durum.ts";
import { BASLANGIC_SETLERI, RUHLAR, YETENEKLER, cekirdekBul } from "../../paylasilan/veri/katalog.ts";
import { type TopacProfili, setProfili, topacProfiliKur } from "../../paylasilan/veri/profil.ts";
import type { EkranBaglami } from "../main.ts";
import { BakimHatasi, HESAP_HATA, MISAFIR_EGITIM, apiPost, git, oku, sakla } from "../hesap.ts";
import { ELEMENT_RENK, KOKEN_RENK, renkCss } from "../oyun/renkler.ts";
import { bakimKatmani, ekranKok, el } from "./arayuz.ts";
import { kokenKuresi } from "./pikselTopac.ts";

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
.ic .k-govde { padding-top:calc(8 * var(--p)); }
.ic .kart.ic-kart { width:100%; max-width:calc(560 * var(--p)); padding:0; border:0; border-image:none; background:none; }
.ic .ust-not { text-align:center; color:var(--soluk); text-transform:uppercase; margin:0 0 calc(6 * var(--p)); }
.ic .kartlar { display:grid; grid-template-columns:repeat(3, 1fr); gap:calc(16 * var(--p)); }
.ic .ck { position:relative; display:flex; flex-direction:column; align-items:center; gap:calc(3 * var(--p)); padding:calc(6 * var(--p)) calc(6 * var(--p)) calc(6 * var(--p));
  background:#0e0d12; box-shadow:inset 0 0 0 var(--p) var(--harc), inset 0 0 0 calc(2 * var(--p)) #1e1b24; text-transform:uppercase; }
.ic .ck.secili::before { content:""; position:absolute; inset:calc(-5 * var(--p)); pointer-events:none; --c:var(--gold); --u:calc(8 * var(--p)); --k:var(--p);
  background:linear-gradient(var(--c),var(--c)) 0 0 / var(--u) var(--k) no-repeat, linear-gradient(var(--c),var(--c)) 0 0 / var(--k) var(--u) no-repeat, linear-gradient(var(--c),var(--c)) 100% 0 / var(--u) var(--k) no-repeat, linear-gradient(var(--c),var(--c)) 100% 0 / var(--k) var(--u) no-repeat,
    linear-gradient(var(--c),var(--c)) 0 100% / var(--u) var(--k) no-repeat, linear-gradient(var(--c),var(--c)) 0 100% / var(--k) var(--u) no-repeat, linear-gradient(var(--c),var(--c)) 100% 100% / var(--u) var(--k) no-repeat, linear-gradient(var(--c),var(--c)) 100% 100% / var(--k) var(--u) no-repeat; }
.ic .ck h3 { order:3; width:max-content; max-width:100%; white-space:nowrap; display:flex; align-items:center; justify-content:center; gap:calc(3 * var(--p)); margin:0; padding:calc(3 * var(--p)) calc(10 * var(--p)); min-width:calc(110 * var(--p));
  background:var(--panel); box-shadow:inset 0 0 0 var(--p) var(--harc), inset 0 0 0 calc(2 * var(--p)) var(--turuncu); font:400 var(--y-20)/1 var(--font-baslik); letter-spacing:var(--yp); }
.ic .ck.secili h3 { box-shadow:inset 0 0 0 var(--p) var(--harc), inset 0 0 0 calc(2 * var(--p)) var(--gold); }
.ic .ck .kk { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); }
.ic canvas.onz { order:0; width:calc(72 * var(--p)); height:calc(40 * var(--p)); background:var(--panel-0); box-shadow:inset 0 0 0 var(--p) var(--bronz); image-rendering:pixelated; }
.ic .ck.secili canvas.onz { box-shadow:inset 0 0 0 var(--p) var(--gold); }
.ic .kure-yer { order:1; display:flex; flex-direction:column; align-items:center; margin-top:0; }
.ic .kure-yer .k-kaide { width:calc(62 * var(--p)); margin-top:calc(-3 * var(--p)); }
.ic .cb { order:5; align-self:stretch; display:grid; grid-template-columns:1fr auto; gap:calc(2 * var(--p)) calc(6 * var(--p)); align-items:center; padding:calc(3 * var(--p)) calc(5 * var(--p));
  background:var(--panel); border:calc(3 * var(--p)) solid transparent; border-image:var(--k-tas-cerceve) 5 fill / calc(3 * var(--p)) / 0 round; }
.ic .ps { order:6; color:var(--soluk); text-transform:none; min-height:calc(18 * var(--p)); text-align:center; line-height:.875; }
.ic .yet { order:7; color:var(--ink); text-transform:none; text-align:center; line-height:.875; }
.ic .not { order:8; color:#ffb070; background:#2a1a08; box-shadow:inset 0 0 0 var(--p) #6b4a1a; padding:calc(2 * var(--p)) calc(4 * var(--p)); text-transform:none; line-height:.875; }
.ic .bos { order:8; min-height:calc(12 * var(--p)); }
.ic .ck button { order:4; }
.ic .ck button.k-dugme { min-height:calc(18 * var(--p)); font-size:var(--y-20); letter-spacing:var(--yp); padding:calc(2 * var(--p)) calc(10 * var(--p)) calc(4 * var(--p)); min-width:0; }
.ic .alt-yazi { text-align:center; color:var(--soluk); text-transform:uppercase; margin-top:calc(8 * var(--p)); }
html[data-yazi-buyuk] .ic .kartlar { grid-template-columns:1fr; }
`;
const KOKEN_SEG: Record<string, string> = { goktasi: "#d5b787", maden: "#c0793a", yapay: "#6b8792", karanlik: "#8a5cb8" };

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
    // mantıksal çözünürlük (pixel dili): tuval CSS'te tam sayı ölçekle büyür (image-rendering: pixelated)
    const uo = Number(getComputedStyle(document.documentElement).getPropertyValue("--o")) || 2;
    const w = (c.width = Math.max(1, Math.round(c.clientWidth / uo)));
    const h = (c.height = Math.max(1, Math.round(c.clientHeight / uo)));
    const devicePixelRatio = 0.5;
    const g = c.getContext("2d")!;
    const R = this.d.arenaYaricap;
    const o = (Math.min(w, h) * 0.46) / R;
    g.imageSmoothingEnabled = false;
    g.fillStyle = "#171c29"; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w / 2, h / 2);
    g.beginPath(); g.arc(0, 0, R * o, 0, Math.PI * 2); g.fillStyle = "#4a4446"; g.fill();
    g.lineWidth = 3 * devicePixelRatio; g.strokeStyle = "#fbbe88"; g.stroke();
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
  const { kok, kart, lento } = ekranKok(b.ustYazi, "İlk Çekirdek", { yer: "tapinak", cuzdan: false });
  kok.classList.add("ic");
  lento.style.justifyContent = "center";
  kart.className = "kart ic-kart";
  const st = el("style"); st.textContent = STIL; document.head.appendChild(st);
  el("h2", "k-gizli-baslik", kart, "İlk Çekirdeğini seç").style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)";
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
    const c = el("section", `ck${k === 0 ? " secili" : ""}`, izgara);
    c.setAttribute("aria-labelledby", `ck-${k}`);
    c.dataset["set"] = v.set.id;
    const bas = el("h3", "", c);
    bas.id = `ck-${k}`;
    bas.innerHTML = `<span class="k-el" data-el="${p.element}"></span><span></span>`;
    bas.querySelector("span:last-child")!.textContent = cekirdekBul(v.set.cekirdek).ad;
    el("div", "kk", c, `${KOKEN_AD[p.koken]} · ${ELEMENT_RENK[p.element].ad} · ${TIP_AD[p.tip] ?? p.tip} · Lv.2`);
    const ky = el("div", "kure-yer", c);
    ky.appendChild(kokenKuresi(p.koken, 11));
    el("div", "k-kaide", ky);
    const cv = el("canvas", "onz", c);
    cv.setAttribute("aria-label", `${cekirdekBul(v.set.cekirdek).ad}: 5 saniyelik hareket önizlemesi`);
    cv.setAttribute("role", "img");
    oniz.push(new Onizleme(cv, p, rakip, 11 + k * 7));
    const cb = el("div", "cb", c);
    const deger = cubuklar(p);
    ["Saldırı", "Savunma", "Hız", "Stamina"].forEach((ad, j) => {
      el("span", "", cb, ad);
      const kap = el("span", "c k-segment", cb);
      const oran = Math.max(0.12, deger[j]! / enCok[j]!);
      kap.setAttribute("role", "meter");
      kap.setAttribute("aria-label", ad);
      kap.setAttribute("aria-valuemin", "0");
      kap.setAttribute("aria-valuemax", "10");
      kap.setAttribute("aria-valuenow", String(Math.round(oran * 10)));
      kap.style.setProperty("--seg", KOKEN_SEG[p.koken] ?? "#d5b787");
      const dolu = Math.max(1, Math.round(oran * 5));
      for (let i = 0; i < 5; i++) el("i", i < dolu ? "dolu" : "", kap);
    });
    el("div", "ps", c, PASIF[p.koken] ?? "");
    el("div", "yet", c, `Yetenek: ${v.yetenek} · Lv.3'te Özel Yetenek: ${v.ozel}`);
    if (p.koken === "yapay") el("div", "not", c, "Ömrü sınırlı: 30 maç sonra yenilenmesi gerekir.");
    else el("div", "bos", c);
    const d = el("button", k === 0 ? "k-dugme ana" : "k-dugme", c, "Bunu seç");
    d.dataset["eylem"] = `sec-${v.set.id}`;
    d.setAttribute("aria-label", `Bunu seç: ${cekirdekBul(v.set.cekirdek).ad}`);
    ilk ??= d;
    d.addEventListener("focus", () => {
      for (const x of izgara.querySelectorAll("button")) x.classList.toggle("ana", x === d);
      for (const x of izgara.querySelectorAll(".ck")) x.classList.toggle("secili", x === c);
    });
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
  el("div", "alt-yazi k-e16", kart, "Seçmediğin ikisi Market'te");
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
