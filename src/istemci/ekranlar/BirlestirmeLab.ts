import { Container, Graphics } from "pixi.js";
import type { AnimasyonAdi, FusionListeKaydi, Yon } from "../../paylasilan/atlas.ts";
import { YONLER } from "../../paylasilan/atlas.ts";
import type { EkranBaglami } from "../main.ts";
import { OLCEK } from "../sprite/Animator.ts";
import { atlasListesi, atlasYukle } from "../sprite/AtlasYukleyici.ts";
import { FusionAnimator } from "../sprite/FusionAnimator.ts";

// Birleştirme Lab (SA-4, docs/art/fusion-animasyon.md § 6): sanatçının kart resmi solda, birleştirilmiş
// kare animasyonlu karakter sağda; animasyon/yön/kart seçimi, 8 yön ve 10 kart (60 fps ölçümü) kipleri.

type Kip = "tek" | "sekiz" | "kalabalik";
const KALABALIK_SAYISI = 10;
const YON_DONUS_SURESI = 1.6; // s, kalabalık kipinde yönlerin döndüğü aralık
const VURUS_FLASI = 0.12; // s
const SIRALI: AnimasyonAdi[] = ["Idle", "Walk", "Attack", "Hurt", "Charge", "Shoot", "Hop", "Strike"];

interface Yerlesik { animator: FusionAnimator; x: number; y: number; sabitYon?: Yon }

function el<K extends keyof HTMLElementTagNameMap>(etiket: K, stil = "", metin = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiket);
  e.style.cssText = stil;
  if (metin) e.textContent = metin;
  return e;
}

const DUGME_STIL = "font:700 13px 'Nunito Sans',sans-serif;padding:4px 10px;margin:0 4px 4px 0;border:1px solid var(--edge);background:var(--panel);color:var(--cream);cursor:pointer;";

function dugme(metin: string, tikla: () => void): HTMLButtonElement {
  const d = el("button", DUGME_STIL, metin);
  d.addEventListener("click", tikla);
  return d;
}

function isaretle(d: HTMLElement, secili: boolean): void {
  d.style.borderColor = secili ? "var(--kick)" : "var(--edge)";
  d.style.color = secili ? "var(--kick)" : "var(--cream)";
}

export async function baslat({ app, ustYazi }: EkranBaglami): Promise<void> {
  const liste = await atlasListesi();
  if (liste.length === 0) {
    ustYazi.append(el("p", "padding:16px;", "public/fusion/liste.json boş ya da yok. Önce: npm run birlestir -- --rastgele 20"));
    return;
  }

  const zemin = new Graphics();
  const sahne = new Container();
  app.stage.addChild(zemin, sahne);

  // ---- DOM
  const kutu = el("div", "position:absolute;left:0;top:0;right:0;padding:10px 14px;display:flex;flex-direction:column;gap:2px;");
  const animSatiri = el("div");
  const kontrolSatiri = el("div");
  const bilgi = el("div", "font-size:13px;opacity:.9;line-height:1.5;");
  kutu.append(animSatiri, kontrolSatiri, bilgi);
  const kartKutusu = el("div", "position:absolute;left:14px;top:120px;width:160px;");
  const kartResmi = el("img", "width:144px;height:144px;image-rendering:pixelated;background:var(--shade);border:1px solid var(--edge);display:block;");
  const kartYazisi = el("div", "font-size:12px;opacity:.8;margin-top:6px;");
  kartKutusu.append(kartResmi, kartYazisi);
  const fps = el("div", "position:absolute;right:14px;bottom:10px;font:700 14px 'Nunito Sans',sans-serif;color:var(--gold);");
  ustYazi.append(kutu, kartKutusu, fps);

  // ---- durum (URL: ?kart=<fusionId>&anim=Walk&yon=2&kip=tek|sekiz|kalabalik&yakin=2&shiny=0)
  const par = new URLSearchParams(location.search);
  const istenenSira = liste.findIndex((r) => r.fusionId === par.get("kart"));
  let sira = Math.max(0, istenenSira);
  let animAdi: AnimasyonAdi = SIRALI.find((a) => a === par.get("anim")) ?? "Idle";
  let yon = ((Number(par.get("yon")) || 0) & 7) as Yon;
  let kip: Kip = (["tek", "sekiz", "kalabalik"] as const).find((k) => k === par.get("kip")) ?? "tek";
  let yakin = par.get("yakin") === "2" ? 2 : 1;
  let shinyGoster = par.get("shiny") !== "0"; // shiny kartlar varsayılan olarak shiny sayfalarıyla gösterilir
  let surum = 0;
  let yerlesikler: Yerlesik[] = [];
  let yonSayaci = 0;
  let flas = 0;
  const animDugmeleri = new Map<AnimasyonAdi, HTMLButtonElement>();

  const kayit = (): FusionListeKaydi => liste[sira]!;

  function zeminiCiz(): void {
    const { width: g, height: y } = app.screen;
    zemin.clear().rect(0, 0, g, y).fill(0x0c191d);
    for (let x = 0; x < g; x += 48) zemin.moveTo(x, 0).lineTo(x, y);
    for (let yy = 0; yy < y; yy += 48) zemin.moveTo(0, yy).lineTo(g, yy);
    zemin.stroke({ width: 1, color: 0x10222a });
  }

  function konumlari(): void {
    const { width: g, height: y } = app.screen;
    zeminiCiz();
    sahne.scale.set(kip === "tek" ? yakin : 1);
    if (kip === "tek") {
      sahne.position.set(g * 0.58, y * 0.62);
      yerlesikler.forEach((p) => p.animator.dugum.position.set(0, 0));
    } else {
      sahne.position.set(0, 0);
      const kolon = kip === "sekiz" ? 8 : 5;
      const adimX = Math.min(190, (g - 200) / kolon), adimY = 190;
      yerlesikler.forEach((p, i) => {
        p.animator.dugum.position.set(210 + (i % kolon) * adimX + adimX / 2, y * 0.38 + Math.floor(i / kolon) * adimY + 90);
      });
    }
  }

  async function sahneKur(): Promise<void> {
    try {
      await sahneKurIc();
    } catch (h) {
      bilgi.textContent = `Yükleme hatası: ${h instanceof Error ? h.message : String(h)}`;
    }
  }

  async function sahneKurIc(): Promise<void> {
    const benim = ++surum;
    const k = kayit();
    kartResmi.src = k.kartResmi;
    // Skaledman shiny'yi aynı PNG + CSS süzgeciyle gösterir; kart resmi de öyle
    kartResmi.style.filter = k.shiny && shinyGoster ? `hue-rotate(${k.shiny.hue}deg) saturate(1.3)` : "";
    kartYazisi.textContent = `Sanatçı: ${k.sanatcilar.join(", ") || "?"}${k.shiny ? `  |  shiny hue ${k.shiny.hue}${shinyGoster ? "" : " (kapalı)"}` : ""}`;
    const kayitlar = kip === "kalabalik" ? Array.from({ length: KALABALIK_SAYISI }, (_, i) => liste[(sira + i) % liste.length]!) : [k];
    const atlaslar = await Promise.all(kayitlar.map((r) => atlasYukle(r.fusionId, shinyGoster && !!r.shiny)));
    if (benim !== surum) return; // araya yeni istek girdi
    for (const p of yerlesikler) p.animator.yokEt();
    yerlesikler = [];
    const yonlar: (Yon | undefined)[] = kip === "sekiz" ? ([0, 1, 2, 3, 4, 5, 6, 7] as Yon[]) : kayitlar.map((_, i) => (kip === "kalabalik" ? ((i % 8) as Yon) : undefined));
    const sayi = kip === "sekiz" ? 8 : kayitlar.length;
    for (let i = 0; i < sayi; i++) {
      const yuk = atlaslar[kip === "sekiz" ? 0 : i];
      if (!yuk) continue;
      const animator = new FusionAnimator(yuk);
      sahne.addChild(animator.dugum);
      yerlesikler.push({ animator, x: 0, y: 0, sabitYon: yonlar[i] });
    }
    uygula(true);
    konumlari();
    bilgiYaz();
    animDugmeleriniGuncelle();
  }

  function uygula(zorla: boolean): void {
    for (const p of yerlesikler) p.animator.oynat(animAdi, p.sabitYon ?? yon, true, zorla);
  }

  function bilgiYaz(): void {
    const k = kayit();
    const uyari = k.uyarilar.length ? `  |  UYARI: ${k.uyarilar.join(", ")}` : "";
    bilgi.textContent = `${k.ad}  |  ${k.fusionId}  |  baş ${k.bas} + gövde ${k.govde}  |  sahip: ${k.sahip || "?"}  |  ${sira + 1}/${liste.length}  |  yön ${yon} (${YONLER[yon]})${uyari}`;
  }

  function animDugmeleriniGuncelle(): void {
    const var_ = new Set(kayit().animasyonlar);
    for (const [ad, d] of animDugmeleri) {
      d.style.display = var_.has(ad) ? "" : "none";
      isaretle(d, ad === animAdi);
    }
  }

  const kartDegistir = (d: number): void => { sira = (sira + d + liste.length) % liste.length; void sahneKur(); };
  const yonDegistir = (d: number): void => { yon = (((yon + d) % 8) + 8) % 8 as Yon; uygula(false); bilgiYaz(); };

  for (const ad of SIRALI) {
    const d = dugme(ad, () => { animAdi = ad; uygula(true); animDugmeleriniGuncelle(); });
    animDugmeleri.set(ad, d);
    animSatiri.append(d);
  }
  const kipDugmeleri: [Kip, string][] = [["tek", "Tek"], ["sekiz", "8 yön"], ["kalabalik", "10 kart"]];
  const kipDugmesi = new Map<Kip, HTMLButtonElement>();
  for (const [k, ad] of kipDugmeleri) {
    const d = dugme(ad, () => { kip = k; kipDugmesi.forEach((b, kk) => isaretle(b, kk === kip)); void sahneKur(); });
    kipDugmesi.set(k, d);
    kontrolSatiri.append(d);
  }
  kontrolSatiri.append(
    dugme("◀ yön", () => yonDegistir(-1)), dugme("yön ▶", () => yonDegistir(1)),
    dugme("[ önceki", () => kartDegistir(-1)), dugme("sonraki ]", () => kartDegistir(1)),
    dugme("Yakın ×2", () => { yakin = yakin === 1 ? 2 : 1; konumlari(); }),
    dugme("Shiny aç/kapa", () => { shinyGoster = !shinyGoster; void sahneKur(); }),
  );
  kipDugmesi.forEach((b, k) => isaretle(b, k === kip));

  const tus = (e: KeyboardEvent): void => {
    if (e.key === "ArrowLeft") yonDegistir(-1);
    else if (e.key === "ArrowRight") yonDegistir(1);
    else if (e.key === "[") kartDegistir(-1);
    else if (e.key === "]") kartDegistir(1);
    else return;
    e.preventDefault();
  };
  window.addEventListener("keydown", tus);

  app.renderer.on("resize", konumlari);
  app.ticker.add((t) => {
    const dt = t.deltaMS / 1000;
    fps.textContent = `${Math.round(app.ticker.FPS)} fps  |  ${yerlesikler.length} karakter  |  ${OLCEK}×${kip === "tek" ? yakin : 1}`;
    if (kip === "kalabalik") {
      yonSayaci += dt;
      if (yonSayaci >= YON_DONUS_SURESI) {
        yonSayaci = 0;
        for (const p of yerlesikler) if (p.sabitYon !== undefined) p.sabitYon = ((p.sabitYon + 1) % 8) as Yon;
        uygula(false);
      }
    }
    let vurdu = false;
    for (const p of yerlesikler) { p.animator.guncelle(dt); vurdu ||= p.animator.vurusAni; }
    if (vurdu) flas = VURUS_FLASI;
    flas = Math.max(0, flas - dt);
    // HitFrame göstergesi: ikincil efekt olarak yalnız renk tonu (kare animasyonunun yerine geçmez)
    for (const p of yerlesikler) p.animator.renkle(flas > 0 ? 0xffe9a8 : null);
  });

  await sahneKur();
}
