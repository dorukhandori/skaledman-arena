import { Container, Sprite } from "pixi.js";
import type { AnimasyonAdi, Yon } from "../../paylasilan/atlas.ts";
import { KutuAnimator, OLCEK, type Animator } from "./Animator.ts";
import { atlasYukle, type YuklenenAnim, type YuklenenAtlas } from "./AtlasYukleyici.ts";

/** AnimData süreleri 1/60 saniyelik tick'tir. */
const TICK = 1 / 60;

/** İstenen animasyon atlasta yoksa sırayla denenecekler. */
const YEDEKLER: Partial<Record<AnimasyonAdi, AnimasyonAdi[]>> = {
  Charge: ["Attack"], Shoot: ["Attack"], Strike: ["Attack"], Swing: ["Attack"], Double: ["Attack"],
  Hop: ["Walk"], Rotate: ["Idle"], Sleep: ["Idle"],
};

/**
 * Atlas kare animasyonu oynatıcı. Ayak noktası (0,0): her karenin `ayakX/ayakY` noktası (gölge sayfasındaki
 * beyaz işaret) düğümün orijinine oturur; kare boyutu animasyondan animasyona değişse de karakter yerinde kalır.
 */
export class FusionAnimator implements Animator {
  readonly dugum = new Container();
  private readonly golgeSprite = new Sprite();
  private readonly sprite = new Sprite();
  private anim!: YuklenenAnim;
  private ad: AnimasyonAdi = "Idle";
  private yon: Yon = 0;
  private dongu = true;
  private kare = 0;
  private zaman = 0;
  private _bitti = false;
  private _vurus = false;
  private bekleyenVurus = false;

  constructor(private readonly yuklenen: YuklenenAtlas) {
    this.sprite.scale.set(OLCEK);
    this.golgeSprite.scale.set(OLCEK);
    this.dugum.addChild(this.golgeSprite, this.sprite);
    this.oynat("Idle", 0, true, true);
  }

  private animBul(ad: AnimasyonAdi): { ad: AnimasyonAdi; anim: YuklenenAnim } {
    for (const aday of [ad, ...(YEDEKLER[ad] ?? []), "Idle" as const, "Walk" as const]) {
      const a = this.yuklenen.animlar.get(aday);
      if (a) return { ad: aday, anim: a };
    }
    throw new Error(`atlas ${this.yuklenen.atlas.fusionId}: oynatılabilir animasyon yok`);
  }

  oynat(ad: AnimasyonAdi, yon: Yon, dongu: boolean, zorla = false): void {
    const { ad: gercek, anim } = this.animBul(ad);
    if (gercek === this.ad && anim === this.anim && !zorla) {
      this.yonVer(yon);
      return;
    }
    this.ad = gercek;
    this.anim = anim;
    this.dongu = dongu;
    this.kare = 0;
    this.zaman = 0;
    this._bitti = false;
    this.bekleyenVurus = anim.tanim.vurusKaresi === 0; // kare 0 zaten vuruş karesiyse ilk güncellemede bildir
    this.yon = yon;
    this.uygula();
  }

  yonVer(yon: Yon): void {
    this.yon = yon;
    this.uygula();
  }

  private uygula(): void {
    const t = this.anim.tanim;
    const satir = t.yonSayisi === 1 ? 0 : this.yon;
    const kare = Math.min(this.kare, (this.anim.kareler[satir]?.length ?? 1) - 1);
    this.sprite.texture = this.anim.kareler[satir]![kare]!;
    const ayakX = t.ayakX ?? t.kareGenislik / 2;
    const ayakY = t.ayakY ?? t.kareYukseklik;
    this.sprite.position.set(-ayakX * OLCEK, -ayakY * OLCEK);
    const golge = this.anim.golgeler?.[satir]?.[kare];
    this.golgeSprite.visible = !!golge;
    if (golge) {
      this.golgeSprite.texture = golge;
      this.golgeSprite.position.set(-ayakX * OLCEK, -ayakY * OLCEK);
    }
  }

  guncelle(dt: number): void {
    this._vurus = this.bekleyenVurus;
    this.bekleyenVurus = false;
    if (this._bitti) return;
    const t = this.anim.tanim;
    const son = t.sureler.length - 1;
    this.zaman += Math.min(dt, 0.25); // sekme arka plandayken kare atlama
    let degisti = false;
    for (;;) {
      const sure = (t.sureler[this.kare] ?? 6) * TICK;
      if (this.zaman < sure) break;
      if (this.kare >= son) {
        if (!this.dongu) { this._bitti = true; this.zaman = 0; break; }
        this.kare = 0;
      } else {
        this.kare++;
      }
      this.zaman -= sure;
      degisti = true;
      if (this.kare === t.vurusKaresi) this._vurus = true;
    }
    if (degisti) this.uygula();
  }

  get bitti(): boolean { return this._bitti; }
  get vurusAni(): boolean { return this._vurus; }

  /** Şu anki animasyonun atlasta oynayan gerçek adı (yedeğe düşmüş olabilir) */
  get oynayanAd(): AnimasyonAdi { return this.ad; }
  get atlas(): YuklenenAtlas { return this.yuklenen; }

  renkle(renk: number | null): void {
    this.sprite.tint = renk ?? 0xffffff;
  }

  yokEt(): void {
    // dokular atlasYukle önbelleğinde paylaşılır; yalnız düğümleri at
    this.dugum.destroy({ children: true });
  }
}

/**
 * Sözleşme: Arena bu fonksiyonla dövüşçü görseli ister (imza sabit).
 * public/fusion/<fusionId>/atlas.json varsa kare animasyonlu FusionAnimator, yoksa renkli KutuAnimator.
 * `shiny` (profil.shiny): atlasta shiny sayfaları varsa onlar yüklenir (Arena çağrısı `a.acilis.shiny` geçmeli).
 */
export async function animatorYukle(fusionId: string, renkIpucu = 0x53fc18, shiny = false): Promise<Animator> {
  try {
    const yuklenen = await atlasYukle(fusionId, shiny);
    if (yuklenen) return new FusionAnimator(yuklenen);
  } catch (hata) {
    console.warn(`atlas yüklenemedi (${fusionId}), kutuya düşülüyor`, hata);
  }
  return new KutuAnimator(renkIpucu);
}
