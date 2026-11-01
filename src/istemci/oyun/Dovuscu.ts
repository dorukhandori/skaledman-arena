import { Container, Graphics } from "pixi.js";
import type { AnimasyonAdi, Yon } from "../../paylasilan/atlas.ts";
import type { DovuscuProfili } from "../../paylasilan/dovuscu.ts";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import type { Dovuscu } from "../../paylasilan/sim/durum.ts";
import { OLCEK, type Animator } from "../sprite/Animator.ts";
import { FusionAnimator } from "../sprite/FusionAnimator.ts";
import { SAHNE_RENK } from "./renkler.ts";
import type { Sahne } from "./Sahne.ts";

type GorselDurum = "bosta" | "yuru" | "dash" | "zipla" | "dinlen" | "hazirlik" | "saldiri" | "hasar" | "ko";

const ANIMASYON: Record<GorselDurum, { ad: AnimasyonAdi; dongu: boolean }> = {
  bosta: { ad: "Idle", dongu: true },
  yuru: { ad: "Walk", dongu: true },
  dash: { ad: "Hop", dongu: false },
  zipla: { ad: "Hop", dongu: false },
  dinlen: { ad: "Sleep", dongu: true },
  hazirlik: { ad: "Charge", dongu: true },
  saldiri: { ad: "Attack", dongu: false },
  hasar: { ad: "Hurt", dongu: false },
  ko: { ad: "Hurt", dongu: false },
};

const GORSEL = {
  hareketEsigi: 8, // birim/s: altında "boşta"
  flasSuresi: 0.12,
  flasRengi: 0xff7070,
  dashSaydamlik: 0.55,
  koSaydamlik: 0.3,
  golgeYaricap: 15,
  hpGenislik: 56,
  hpYukseklik: 7,
  hpBoslugu: 8,
  sinirYenileme: 20, // kare
  /** zıplama yüksekliği: 1 dünya birimi = bu kadar sahne pikseli (okunurluk için) */
  ziplaPiksel: 2,
  gecisSaydamlik: 0.4,
} as const;

/** Dövüşçünün ekrandaki hâli: aktif üyenin Animator'ı + gölge + HP çubuğu. Sim durumunu okur, asla yazmaz. */
export class DovuscuGorsel {
  readonly kok = new Container();
  private golge = new Graphics();
  private hpKutusu = new Container();
  private hpCubugu = new Graphics();
  private durum: GorselDurum = "bosta";
  private oncekiHitStun = 0;
  private flasKalan = 0;
  private koSure = 0;
  private kare = 0;
  private tepeY = -40 * OLCEK;
  /** Vuruş karesine girildiğinde (HitFrame) çağrılır; yalnız süs. */
  vurusta: (() => void) | null = null;

  private aktif = 0;

  /** @param animatorlar  takım sırasıyla; aktif üyeninki görünür */
  constructor(private animatorlar: readonly Animator[], private profiller: readonly DovuscuProfili[], private sahne: Sahne) {
    this.golge.ellipse(0, 0, GORSEL.golgeYaricap * OLCEK, GORSEL.golgeYaricap * OLCEK * 0.35).fill({ color: 0x000000, alpha: 0.35 });
    this.hpKutusu.addChild(this.hpCubugu);
    this.kok.addChild(this.golge, ...animatorlar.map((a) => a.dugum), this.hpKutusu);
    this.uyeGoster(0);
    sahne.nesneKatmani.addChild(this.kok);
  }

  get animator(): Animator { return this.animatorlar[this.aktif]!; }
  get profil(): DovuscuProfili { return this.profiller[this.aktif]!; }

  private uyeGoster(i: number): void {
    this.aktif = i;
    this.animatorlar.forEach((a, k) => { a.dugum.visible = k === i; });
    this.durum = "bosta";
    this.animator.oynat("Idle", 0, true, true);
    this.kare = 0;
  }

  /** Durum → görsel durum (sim alanlarından türetilir). */
  private durumBul(dv: Dovuscu): GorselDurum {
    if (dv.olu) return "ko";
    if (dv.hitStun > 0) return "hasar";
    if (dv.ziplaKalan > 0) return "zipla";
    if (dv.dinleniyor) return "dinlen";
    if (dv.hamle?.evre === "aviso") return "hazirlik";
    if (dv.hamle) return "saldiri";
    if (dv.dashKalan > 0) return "dash";
    return Math.hypot(dv.hizX, dv.hizZ) > GORSEL.hareketEsigi ? "yuru" : "bosta";
  }

  /** @param konum  ekranda gösterilecek (ara değerlenmiş) dünya konumu */
  guncelle(dt: number, dv: Dovuscu, konum: { x: number; z: number }, nisanYonu: Yon | null, aktifUye = 0): void {
    if (aktifUye !== this.aktif) this.uyeGoster(aktifUye);
    const yeni = this.durumBul(dv);
    const hasarYeni = dv.hitStun > this.oncekiHitStun;
    this.oncekiHitStun = dv.hitStun;
    if (hasarYeni) this.flasKalan = GORSEL.flasSuresi;

    const yon: Yon = nisanYonu ?? dv.yon;
    const girdi = ANIMASYON[yeni];
    const gec = yeni !== this.durum || hasarYeni;
    if (gec) {
      this.animator.oynat(girdi.ad, yon, girdi.dongu, yeni === "saldiri" || yeni === "hasar" || yeni === "hazirlik");
    } else {
      this.animator.yonVer(yon);
    }
    this.durum = yeni;
    this.animator.guncelle(dt);
    if (this.animator.vurusAni) this.vurusta?.();

    this.flasKalan = Math.max(0, this.flasKalan - dt);
    this.animator.renkle(this.flasKalan > 0 ? GORSEL.flasRengi : null);

    // konum ve derinlik
    const p = this.sahne.dunyadanEkrana(konum.x, konum.z);
    const olcek = this.sahne.nesneOlcegi(konum.z);
    this.kok.position.set(p.x, p.y);
    this.kok.scale.set(olcek);
    this.kok.zIndex = konum.z;
    // FusionAnimator gölge sayfasını kendisi çizer; havadayken sprite (ve gölgesi) kalkar, yerde elips kalır
    const kutu = !(this.animator instanceof FusionAnimator);
    this.animator.dugum.y = -dv.yukseklik * GORSEL.ziplaPiksel;
    this.golge.visible = kutu || dv.yukseklik > 0.5;

    // saydamlık: dash, ölüm solması
    let alfa = dv.dashKalan > 0 ? GORSEL.dashSaydamlik : 1;
    if (dv.gecis?.evre === "geri" || dv.gecis?.evre === "cikis") alfa = GORSEL.gecisSaydamlik;
    this.kok.visible = !dv.sahaDisi || dv.olu;
    if (dv.olu) {
      this.koSure += dt;
      alfa = 1 - (1 - GORSEL.koSaydamlik) * Math.min(1, this.koSure / AYAR.koSolma);
    } else {
      this.koSure = 0;
    }
    this.animator.dugum.alpha = alfa;
    this.golge.alpha = alfa;

    this.hpCiz(dv, olcek);
  }

  private hpCiz(dv: Dovuscu, olcek: number): void {
    if (this.kare++ % GORSEL.sinirYenileme === 0) {
      const b = this.animator.dugum.getLocalBounds();
      if (b.height > 0) this.tepeY = b.minY;
    }
    // sabit ekran boyutunda çubuk: derinlik ölçeğini geri al
    this.hpKutusu.scale.set(1 / olcek);
    this.hpKutusu.position.set(0, this.tepeY - GORSEL.hpBoslugu / olcek);
    const oran = Math.max(0, dv.hp / dv.maxHp);
    const renk = this.profil.shiny ? SAHNE_RENK.altin : oran > 0.5 ? 0x53fc18 : oran > 0.2 ? 0xf4cf47 : 0xe3350d;
    const w = GORSEL.hpGenislik;
    const h = GORSEL.hpYukseklik;
    const g = this.hpCubugu;
    g.clear().rect(-w / 2 - 1, -h - 1, w + 2, h + 2).fill({ color: 0x050d10, alpha: 0.85 });
    g.rect(-w / 2, -h, w * oran, h).fill(renk);
    // durum işaretleri
    let x = -w / 2;
    if (dv.yanik > 0) { g.rect(x, -h - 6, 6, 4).fill(0xf08030); x += 8; }
    if (dv.felc > 0) g.rect(x, -h - 6, 6, 4).fill(0xf8d030);
  }

  yokEt(): void {
    for (const a of this.animatorlar) { this.kok.removeChild(a.dugum); a.yokEt(); }
    this.kok.destroy({ children: true });
  }
}

