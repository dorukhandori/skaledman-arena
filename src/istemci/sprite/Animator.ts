import { Container, Graphics } from "pixi.js";
import type { AnimasyonAdi, Yon } from "../../paylasilan/atlas.ts";

/**
 * Dövüşçü görselinin sözleşmesi. İki uygulama:
 *  - FusionAnimator (src/istemci/sprite/FusionAnimator.ts): public/fusion/<id>/ atlasından gerçek kare animasyonu (SA-3/SA-4)
 *  - KutuAnimator (bu dosya): renkli kutu; arena kodu atlas hazır olmadan da çalışsın diye
 * Ölçek: 1 atlas pikseli = OLCEK ekran pikseli (PokeRivals 3×).
 */
export const OLCEK = 3;

export interface Animator {
  /** Pixi düğümü; ayak noktası (0,0)'dır: dövüşçünün yerdeki konumuna yerleştirilir. */
  readonly dugum: Container;
  /** Animasyonu başlat. Aynı animasyon tekrar istenirse baştan almaz (zorla=true alır). */
  oynat(ad: AnimasyonAdi, yon: Yon, dongu: boolean, zorla?: boolean): void;
  /** Yalnız yönü değiştir, kareyi koru. */
  yonVer(yon: Yon): void;
  /** Her render karesinde. dt saniye. */
  guncelle(dt: number): void;
  /** Döngüsüz animasyon son kareyi geçti mi */
  readonly bitti: boolean;
  /** Bu güncellemede vuruş karesine (HitFrame) girildiyse true; tek kare sürer */
  readonly vurusAni: boolean;
  /** Hasar flaşı vb. ikincil efekt için */
  renkle(renk: number | null): void;
  yokEt(): void;
}

/** Yer tutucu: 32×48 renkli kutu + yön oku. */
export class KutuAnimator implements Animator {
  readonly dugum = new Container();
  private govde = new Graphics();
  private ok = new Graphics();
  private _bitti = false;
  private _vurus = false;
  private zaman = 0;
  private ad: AnimasyonAdi = "Idle";
  private dongu = true;

  constructor(private renk: number = 0x53fc18, private en = 32 * OLCEK, private boy = 40 * OLCEK) {
    this.dugum.addChild(this.govde, this.ok);
    this.ciz();
  }

  private ciz() {
    this.govde.clear().rect(-this.en / 2, -this.boy, this.en, this.boy).fill(this.renk);
  }

  oynat(ad: AnimasyonAdi, yon: Yon, dongu: boolean, zorla = false): void {
    if (ad === this.ad && !zorla) { this.yonVer(yon); return; }
    this.ad = ad; this.dongu = dongu; this.zaman = 0; this._bitti = false;
    this.yonVer(yon);
  }

  yonVer(yon: Yon): void {
    const aci = (yon * Math.PI) / 4; // 0 aşağı
    const dx = Math.sin(aci), dz = Math.cos(aci);
    this.ok.clear().moveTo(0, -this.boy / 2).lineTo(dx * 24, -this.boy / 2 + dz * 16).stroke({ width: 3, color: 0xffffff });
  }

  guncelle(dt: number): void {
    this.zaman += dt;
    this._vurus = false;
    const sure = this.ad === "Attack" ? 0.35 : this.ad === "Hurt" ? 0.25 : 0.6;
    if (this.ad === "Attack" && this.zaman >= sure * 0.5 && this.zaman - dt < sure * 0.5) this._vurus = true;
    if (!this.dongu && this.zaman >= sure) this._bitti = true;
    // basit nefes: boşta ölçek salınımı yok (K-5); yalnız saldırıda ileri kayma
    this.govde.position.x = this.ad === "Attack" ? Math.sin(Math.min(1, this.zaman / sure) * Math.PI) * 12 : 0;
  }

  get bitti() { return this._bitti; }
  get vurusAni() { return this._vurus; }

  renkle(renk: number | null): void {
    this.govde.tint = renk ?? 0xffffff;
  }

  yokEt(): void {
    this.dugum.destroy({ children: true });
  }
}
