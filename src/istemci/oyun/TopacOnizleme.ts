import { diskBul, govdeBul, ucBul } from "../../paylasilan/veri/katalog.ts";
import type { TopacProfili } from "../../paylasilan/veri/profil.ts";
import { ELEMENT_RENK, KOKEN_RENK, renkCss, renkKaristir } from "./renkler.ts";

// Atölye önizlemesi (D6): maç görselinin (TopacGorsel, pixel planı § 2.2) katman sırasıyla 2D canvas yer tutucusu,
// Pixi'siz (menü ekranı canvas'sız açılır). Sol: üstten görünüş, gerçek profilden (Gövde kanat sayısı, Disk kilit
// çıkıntısı = burstEsik, Çekirdek element/köken ışığı, dönüş yönü), yavaş döner. Sağ: dört katmanın yandan açılmış
// yığını (Çekirdek / Gövde / Disk / Uç) ad etiketli, Disk yüksekliği ve Uç deseni okunur.

function kanatSiluet(n: number, rIc: number, rDis: number, sol: boolean): [number, number][] {
  const nokta: [number, number][] = [];
  const orneklem = 24 * n;
  for (let i = 0; i < orneklem; i++) {
    const th = (i / orneklem) * Math.PI * 2;
    let faz = (th * n) / (Math.PI * 2);
    faz -= Math.floor(faz);
    if (sol) faz = 1 - faz;
    const r = faz < 0.62 ? rIc + (rDis - rIc) * Math.pow(faz / 0.62, 0.75) : rIc + (rDis - rIc) * Math.pow(1 - (faz - 0.62) / 0.38, 3);
    nokta.push([Math.cos(th) * r, Math.sin(th) * r]);
  }
  return nokta;
}

export class TopacOnizleme {
  private profil: TopacProfili | null = null;
  private aci = 0;
  private son = performance.now();
  private calisiyor = true;
  /** test: çizilen kare sayısı */
  kare = 0;

  constructor(private c: HTMLCanvasElement) {
    requestAnimationFrame(this.dongu);
  }

  ayarla(p: TopacProfili | null): void {
    this.profil = p;
  }

  durdur(): void { this.calisiyor = false; }

  private dongu = (): void => {
    if (!this.calisiyor || !this.c.isConnected) return;
    const t = performance.now();
    const dt = Math.min(0.1, (t - this.son) / 1000);
    this.son = t;
    // yavaş dönüş: 0,35 tur/sn, yön profilden
    this.aci += dt * Math.PI * 2 * 0.35 * (this.profil?.donus === "sol" ? -1 : 1);
    this.ciz();
    this.kare++;
    requestAnimationFrame(this.dongu);
  };

  private ciz(): void {
    const c = this.c;
    const dpr = devicePixelRatio || 1;
    const w = (c.width = Math.max(1, Math.round(c.clientWidth * dpr)));
    const h = (c.height = Math.max(1, Math.round(c.clientHeight * dpr)));
    const g = c.getContext("2d");
    if (!g) return;
    g.fillStyle = "#081114";
    g.fillRect(0, 0, w, h);
    const p = this.profil;
    if (!p) {
      g.fillStyle = "#6f8085";
      g.font = `${13 * dpr}px system-ui`;
      g.textAlign = "center";
      g.fillText("Çekirdek ve parçaları tak", w / 2, h / 2);
      return;
    }
    const el = ELEMENT_RENK[p.element];
    const ko = KOKEN_RENK[p.koken];
    const disk = diskBul(p.parcalar.disk);
    const govde = govdeBul(p.parcalar.govde);
    const uc = ucBul(p.parcalar.uc);
    const sol = p.donus === "sol";
    // ---- üstten görünüş (sol yarı) ----
    const cx = w * 0.27, cy = h * 0.52;
    const o = Math.min(w * 0.5, h) / 100;
    const kayma = (2 + ((disk.yukseklik - 50) / 15) * 3) * o;
    g.save();
    g.translate(cx, cy);
    // katman 0: gölge (Disk yüksekliği)
    g.beginPath(); g.arc(-kayma, kayma, 25 * 1.25 * o, 0, Math.PI * 2); g.fillStyle = "rgba(0,0,0,.35)"; g.fill();
    g.rotate(this.aci);
    // Uç
    g.beginPath(); g.arc(0, 0, 6 * o, 0, Math.PI * 2); g.fillStyle = "#2b2f33"; g.fill();
    // Disk + kilit çıkıntıları
    g.beginPath(); g.arc(0, 0, 25 * o, 0, Math.PI * 2); g.fillStyle = "#8d989e"; g.fill(); g.lineWidth = o; g.strokeStyle = "#3a4246"; g.stroke();
    const cikinti = Math.max(3, disk.katki.burstEsik);
    for (let i = 0; i < cikinti; i++) {
      const a = (i / cikinti) * Math.PI * 2;
      g.beginPath(); g.arc(Math.cos(a) * 22 * o, Math.sin(a) * 22 * o, 2 * o, 0, Math.PI * 2); g.fillStyle = "#5b666b"; g.fill();
    }
    // Gövde: kanatlı siluet
    const s = kanatSiluet(govde.kanat, 17 * o, 30 * o, sol);
    g.beginPath(); s.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    g.fillStyle = renkCss(el.orta); g.fill(); g.lineWidth = o; g.strokeStyle = renkCss(el.koyu); g.stroke();
    g.beginPath(); g.arc(0, 0, 14 * o, 0, Math.PI * 2); g.fillStyle = renkCss(el.koyu); g.fill();
    g.beginPath(); g.arc(0, 0, 11 * o, 0, Math.PI * 2); g.fillStyle = renkCss(renkKaristir(el.orta, 0, 0.25)); g.fill();
    for (let i = 0; i < govde.kanat; i++) {
      const a = (i / govde.kanat) * Math.PI * 2 + (sol ? -1 : 1) * (Math.PI * 2 * 0.55) / govde.kanat;
      g.beginPath(); g.arc(Math.cos(a) * 26 * o, Math.sin(a) * 26 * o, 1.6 * o, 0, Math.PI * 2); g.fillStyle = renkCss(el.vurgu); g.fill();
    }
    // Çekirdek (köken ışığı)
    g.beginPath(); g.arc(0, 0, 8 * o, 0, Math.PI * 2); g.fillStyle = renkCss(ko.isik); g.fill(); g.lineWidth = 1.5 * o; g.strokeStyle = renkCss(ko.ikinci); g.stroke();
    g.beginPath(); g.moveTo(-5 * o, 0); g.lineTo(5 * o, 0); g.strokeStyle = renkCss(ko.ikinci); g.stroke();
    g.restore();
    // dönmeyen parlama
    g.beginPath(); g.arc(cx - 9 * o, cy - 11 * o, 4 * o, 0, Math.PI * 2); g.fillStyle = "rgba(255,255,255,.35)"; g.fill();
    // yön oku
    g.save(); g.translate(cx, cy); g.strokeStyle = "#a3b2b6"; g.lineWidth = 1.5 * dpr;
    g.beginPath(); g.arc(0, 0, 38 * o, sol ? -0.2 : Math.PI + 0.2, sol ? -1.2 : Math.PI + 1.2, sol); g.stroke();
    g.restore();
    // ---- yandan katman yığını (sağ yarı) ----
    const x0 = w * 0.55, gen = w * 0.15;
    const satir = (y: number, ad: string, renk: string, yuk: number, ek: string) => {
      g.fillStyle = renk;
      g.beginPath(); g.ellipse(x0 + gen / 2, y, gen / 2, yuk, 0, 0, Math.PI * 2); g.fill();
      g.lineWidth = dpr; g.strokeStyle = "#050d10"; g.stroke();
      g.fillStyle = "#f3f1e8"; g.font = `700 ${10 * dpr}px system-ui`; g.textAlign = "left";
      g.fillText(ad, x0 + gen + 6 * dpr, y + 1 * dpr, w - (x0 + gen + 8 * dpr));
      g.fillStyle = "#a3b2b6"; g.font = `${9 * dpr}px system-ui`;
      g.fillText(ek, x0 + gen + 6 * dpr, y + 12 * dpr, w - (x0 + gen + 8 * dpr));
    };
    const adim = h / 5.2;
    satir(adim * 1, "Çekirdek", renkCss(ko.isik), 5 * dpr, p.koken === "yapay" ? "çift yön" : p.donus === "sol" ? "sola" : "sağa");
    satir(adim * 2, govde.ad, renkCss(el.orta), 8 * dpr, `${govde.kanat} kanat`);
    satir(adim * 3, disk.ad, "#8d989e", (disk.yukseklik / 10) * dpr, `yükseklik ${disk.yukseklik}`);
    satir(adim * 4, uc.ad, "#2b2f33", 4 * dpr, uc.katki.desen ?? "");
  }
}
