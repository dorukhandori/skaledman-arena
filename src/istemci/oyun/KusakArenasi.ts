import { Container, Graphics } from "pixi.js";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";

// Kuşak Arenası (nile B-12, pixel planı § 6): daire çanak, dış hız şeridi (0,60R–0,85R; dönen çizgi + parıltı),
// kenar eğim bölgesi tonu (0,70R → R), çanak dudağı topacın ÜSTÜNDE (Ring Out'ta topaç kenarın arkasına düşer).
// Ani ölümde çanak sim ile aynı oranda ölçeklenir; kapanan halka koyulaşır ve sınırda "kalınlaşan çizgi" (kesikli değil,
// ux § 3.4). Palet § 6.3: zemin #6E6A66, şerit #F2E8B0. Pixi Graphics; doku yok.

export const ARENA_RENK = {
  arkaPlan: 0x14181a,
  tribun: 0x1d2a33,
  tribunKalabalik: 0x52708a,
  disZemin: 0x262321,
  zemin: 0x6e6a66,
  zeminKoyu: 0x5a5652,
  egim: 0x3e3a37,
  serit: 0xf2e8b0,
  seritCizgi: 0xf2f2ee,
  seritGri: 0x9a968c,
  merkez: 0x85807a,
  dudak: 0x8a847d,
  dudakAcik: 0xb7b0a6,
  dudakKoyu: 0x34302d,
  kapanan: 0x151311,
  aniOlum: 0xe3350d,
} as const;

const R0 = AYAR.arenaYaricap;
const SERIT_CIZGI = 40;
/** Dönen çizgi dokusunun açısal hızı (rad/s): "burada hızlanıyorsun" (§ 6.2). */
const SERIT_HIZI = 0.9;

export class KusakArenasi {
  /** zemin katmanına (topaçların altına) */
  readonly zemin = new Container();
  /** nesne katmanının üstüne (topaç üstü) */
  readonly dudak = new Container();
  private canak = new Container();
  private seritCizgi = new Graphics();
  private seritParilti = new Graphics();
  private kapanan = new Graphics();
  private dudakG = new Graphics();
  private aci = 0;
  private parilti = 0;
  private sonR = -1;
  private arka = new Graphics();

  constructor(private cx: number, private cy: number, genislik: number, yukseklik: number) {
    const arka = this.arka;
    arka.rect(0, 0, genislik, yukseklik).fill(ARENA_RENK.arkaPlan);
    // tribün bandı (üst, pixel planı § 6.1 yer tutucu): kalabalık noktaları
    arka.rect(0, 0, genislik, 22).fill(ARENA_RENK.tribun);
    for (let x = 4; x < genislik; x += 9) arka.rect(x, 5 + ((x * 7) % 3) * 3, 5, 6).fill({ color: ARENA_RENK.tribunKalabalik, alpha: 0.55 });
    arka.circle(cx, cy, R0 + 20).fill(ARENA_RENK.disZemin);
    this.zemin.addChild(arka);

    // ölçeklenen çanak (merkez orijinli)
    this.canak.position.set(cx, cy);
    const g = new Graphics();
    g.circle(0, 0, R0).fill(ARENA_RENK.egim);
    // kenar eğimi: dıştan içe açılan halkalar (0,70R → R)
    const egim = AYAR.egimBaslangic * R0;
    const halka = 7;
    for (let k = 0; k < halka; k++) {
      const r = R0 - ((R0 - egim) * (k + 1)) / halka;
      const t = (k + 1) / halka;
      g.circle(0, 0, r + (R0 - egim) / halka).fill({ color: ARENA_RENK.zeminKoyu, alpha: 0.25 + 0.1 * t });
    }
    g.circle(0, 0, egim).fill(ARENA_RENK.zemin);
    // hız şeridi bandı
    const ki = AYAR.kusakIc * R0;
    const kd = AYAR.kusakDis * R0;
    g.circle(0, 0, (ki + kd) / 2).stroke({ width: kd - ki, color: ARENA_RENK.serit, alpha: 0.16 });
    g.circle(0, 0, ki).stroke({ width: 2, color: ARENA_RENK.serit, alpha: 0.55 });
    g.circle(0, 0, kd).stroke({ width: 2, color: ARENA_RENK.serit, alpha: 0.55 });
    // eğim başlangıcı ince işaret
    g.circle(0, 0, egim).stroke({ width: 1, color: ARENA_RENK.zeminKoyu, alpha: 0.6 });
    // merkez (Maden "Kök" alanı 0,35R)
    g.circle(0, 0, AYAR.merkezKucukAlan * R0).stroke({ width: 1, color: ARENA_RENK.merkez, alpha: 0.7 });
    g.circle(0, 0, 5).fill(ARENA_RENK.merkez);
    // ince çatlak/çizik süsü (sabit, tohumsuz)
    for (let i = 0; i < 10; i++) {
      const a = i * 2.39996;
      const r = 30 + ((i * 37) % 120);
      g.moveTo(Math.cos(a) * r, Math.sin(a) * r).lineTo(Math.cos(a + 0.05) * (r + 12), Math.sin(a + 0.05) * (r + 12)).stroke({ width: 1, color: ARENA_RENK.zeminKoyu, alpha: 0.5 });
    }
    this.canak.addChild(g, this.seritParilti, this.seritCizgi);
    this.zemin.addChild(this.canak, this.kapanan);
    this.dudak.addChild(this.dudakG);
    this.dudakCiz(R0, 0);
  }

  /** D8 seyirci `&seffaf=1`: arka plan + tribün kapanır (OBS kendi sahnesini gösterir); çanak kalır. */
  arkaPlanGoster(goster: boolean): void { this.arka.visible = goster; }

  private dudakCiz(R: number, aniOlum: number): void {
    const g = this.dudakG.clear();
    // dudak: çanağın dış halkası, topacın üstünde
    g.circle(this.cx, this.cy, R + 6).stroke({ width: 12, color: ARENA_RENK.dudak });
    g.circle(this.cx, this.cy, R + 1).stroke({ width: 2, color: ARENA_RENK.dudakAcik, alpha: 0.9 });
    g.circle(this.cx, this.cy, R + 12).stroke({ width: 2, color: ARENA_RENK.dudakKoyu });
    if (aniOlum > 0) {
      // kalınlaşan çizgi: daralma ilerledikçe 3 → 9 px
      g.circle(this.cx, this.cy, R + 2).stroke({ width: 3 + 6 * aniOlum, color: ARENA_RENK.aniOlum, alpha: 0.9 });
    }
  }

  /**
   * Her kare. `R`: sim çanak yarıçapı (ani ölümde daralır); `seritte`: kuşakta topaç var mı (parıltı);
   * `aniOlum`: 0..1 daralma ilerlemesi (0 = yok).
   */
  guncelle(dt: number, R: number, seritte: boolean, aniOlum: number): void {
    const k = R / R0;
    this.canak.scale.set(k);
    this.aci += SERIT_HIZI * dt;
    this.parilti += ((seritte ? 1 : 0) - this.parilti) * Math.min(1, dt * 8);
    const ki = AYAR.kusakIc * R0;
    const kd = AYAR.kusakDis * R0;
    const orta = (ki + kd) / 2;
    const c = this.seritCizgi.clear();
    for (let i = 0; i < SERIT_CIZGI; i++) {
      const a = this.aci + (i / SERIT_CIZGI) * Math.PI * 2;
      const uz = 0.06;
      const renk = i % 4 === 0 ? ARENA_RENK.seritGri : ARENA_RENK.seritCizgi;
      c.moveTo(Math.cos(a) * orta, Math.sin(a) * orta).arc(0, 0, orta, a, a + uz).stroke({ width: 3, color: renk, alpha: 0.35 + 0.35 * this.parilti });
    }
    const p = this.seritParilti.clear();
    if (this.parilti > 0.02) p.circle(0, 0, orta).stroke({ width: kd - ki, color: ARENA_RENK.serit, alpha: 0.22 * this.parilti });
    if (R !== this.sonR) {
      this.sonR = R;
      const kp = this.kapanan.clear();
      if (R < R0 - 0.01) kp.circle(this.cx, this.cy, R0 + 1).fill({ color: ARENA_RENK.kapanan, alpha: 0.85 }).circle(this.cx, this.cy, R).cut();
      this.dudakCiz(R, aniOlum);
    }
  }
}
