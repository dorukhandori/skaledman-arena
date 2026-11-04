import {
  AFK_TERK_SN, AFK_UYARI_SN, BIRIKME_ESIGI, BOSTA_TASIMA_ADIMI, DONDURMA_HAKKI, HASH_ARALIGI, KOPMA_AKIS_SN,
  type MacKaydi, PROTOKOL_SURUMU, SIM_HZ, YENIDEN_BAGLANMA_SN,
} from "../../ag/protokol.ts";
import { botGirdisi, botKademesiSec, type BotKipi } from "../../paylasilan/bot/bot.ts";
import { adim, macDunyasiKur, type TakimProfilleri } from "../../paylasilan/sim/Dunya.ts";
import type { Dunya, Olay } from "../../paylasilan/sim/durum.ts";
import {
  type Girdi, TEK_SEFERLIK_TUSLAR, agAlanlarindanGirdi, bosGirdi, girdileriBirlestir, tusMaskesi,
} from "../../paylasilan/sim/Girdi.ts";
import { dunyaHash } from "../../paylasilan/sim/hash.ts";
import { hukmenBitir, macIptal, teslimEt } from "../../paylasilan/sim/mac.ts";
import { takimProfilleriKimlikten } from "../../paylasilan/veri/takimlar.ts";
import { girdiDiziye } from "../../ag/kayit.ts";

// Yetkili maç yönetimi (Colyseus'suz, test edilebilir): sim dünyası, girdi tüketimi (birikme / boşluk taşıma),
// kopma-dondurma-hükmen-iptal (flint #10-#12), AFK (ux § 1.4), teslim, maç kaydı (yeniden oynatma testi).
// MacOdasi bunu her sabit adımda (60 Hz) çağırır; zaman yalnız adım sayısıdır.

/** Ağdan gelen bir girdi (GirdiSema alanları). */
export interface AgGirdisi { seq: number; yonX: number; yonZ: number; nisanX: number; nisanZ: number; yuva: number; tuslar: number; degistir: number }

/** Oyuncu başına girdi kaynağı: tampondan bir girdi al, tampon boyu. */
export interface GirdiKaynagi { al(): AgGirdisi | undefined; readonly boyut: number; temizle(): void }

const sn = (s: number): number => Math.round(s * SIM_HZ);
/** Aç kalınan adım borcu en çok bu kadar (0,5 sn) tutulur. */
const BORC_TAVANI = 30;
export const KOPMA_ADIM = { akis: sn(KOPMA_AKIS_SN), toplam: sn(YENIDEN_BAGLANMA_SN), afkUyari: sn(AFK_UYARI_SN), afkTerk: sn(AFK_TERK_SN) } as const;

export interface AdimSonucu {
  /** bu adımda sim'in ürettiği + sim dışı (teslim/hükmen) olaylar */
  olaylar: Olay[];
  /** bu adımda AFK uyarısı alan oyuncular (kalan sn) */
  afkUyari: { i: number; kalanSn: number }[];
  /** sim adım attı mı (dondurulmuşsa hayır) */
  adimAtti: boolean;
}

export interface MacKurulumu {
  takimlar: [string, string];
  tohum: number;
  seviye?: [number, number];
  /** antrenman: bu oyuncuyu paylaşılan bot sürer (kip topacın tipinden, çevrimdışı maçla aynı) */
  bot?: [boolean, boolean];
}

export class MacYonetimi {
  readonly dunya: Dunya;
  readonly profiller: [TakimProfilleri, TakimProfilleri];
  readonly kayit: MacKaydi;
  /** son tüketilen gerçek girdinin sırası ve uygulandığı adım */
  readonly ack: [number, number] = [0, 0];
  readonly ackTick: [number, number] = [0, 0];
  readonly kopuk: [boolean, boolean] = [false, false];
  readonly kopukAdim: [number, number] = [0, 0];
  readonly suresiDoldu: [boolean, boolean] = [false, false];
  readonly dondurmaHakki: [number, number] = [DONDURMA_HAKKI, DONDURMA_HAKKI];
  /** dondurulmuş mu ve kim yüzünden (−1 yok) */
  donmus = false;
  kopan = -1;
  /** girdisiz geçen adım (bağlıyken) */
  readonly girdisiz: [number, number] = [0, 0];
  private afkUyarildi: [boolean, boolean] = [false, false];
  private sonGercek: [Girdi, Girdi] = [bosGirdi(), bosGirdi()];
  private bosta: [number, number] = [0, 0];
  private borc: [number, number] = [0, 0];
  private bot: [boolean, boolean];
  /** ölçüm: adım başına süre (ms) */
  readonly adimSureleri: number[] = [];
  /** ölçüm: birikme birleştirmesi ve boşluk taşıma sayıları */
  readonly sayac = { birlestirme: 0, borc: 0, tasima: 0, notr: 0, dondurma: 0, hukmen: 0 };

  constructor(k: MacKurulumu) {
    const seviye = k.seviye ?? [3, 3];
    this.profiller = [takimProfilleriKimlikten(k.takimlar[0]), takimProfilleriKimlikten(k.takimlar[1])];
    this.dunya = macDunyasiKur(this.profiller, k.tohum, { seviye });
    this.bot = k.bot ?? [false, false];
    this.kayit = { v: PROTOKOL_SURUMU, takimlar: [...k.takimlar], tohum: k.tohum, seviye: [...seviye], girdiler: [], eylemler: [], hashler: [], sonHash: dunyaHash(this.dunya), sonTick: 0 };
  }

  get bitti(): boolean { return this.dunya.mac.faz === "bitti"; }

  private botKipi(i: number): BotKipi {
    return botKademesiSec(this.dunya.profiller[i]!.tip);
  }

  /** Bir oyuncunun bu adımdaki girdisi (tüketim kuralları burada). */
  private girdiSec(i: number, k: GirdiKaynagi | null): Girdi {
    if (this.bot[i]) return botGirdisi(this.dunya, i, this.botKipi(i), this.kayit.tohum * 7919 + 3 + i);
    if (!k || this.kopuk[i]) { k?.temizle(); this.sayac.notr++; return bosGirdi(); }
    const a = k.al();
    if (a) {
      let g = this.agdan(a);
      let son = a;
      // borç: aç kalınan (taşıma/nötr) adımların girdileri sonradan gelirse atlanır (tek seferlik düğmeleri
      // birleştirilerek korunur) → sunucu adımı ↔ istemci sırası hizalı kalır, istemci tahmini aynı zaman çizelgesini
      // yeniden oynatır. Tutulan girdi (çoğu an) taşınan girdiyle aynı olduğundan sapma olmaz.
      while (this.borc[i]! > 0 && k.boyut > 0) {
        const b = k.al();
        if (!b) break;
        g = girdileriBirlestir(g, this.agdan(b));
        son = b;
        this.borc[i] = this.borc[i]! - 1;
        this.sayac.borc++;
      }
      if (k.boyut > BIRIKME_ESIGI) {
        // tampon birikmiş: iki girdiyi tek adıma indir (tek seferlik düğmeler VEYA'lanır, hiçbiri kaybolmaz)
        const b = k.al();
        if (b) { g = girdileriBirlestir(g, this.agdan(b)); son = b; this.sayac.birlestirme++; }
      }
      this.ack[i] = son.seq;
      this.ackTick[i] = this.dunya.tick + 1;
      this.sonGercek[i] = g;
      this.bosta[i] = 0;
      this.girdisiz[i] = 0;
      this.afkUyarildi[i] = false;
      return g;
    }
    // boşluk: son hareket (eksen, nişan, basılı düğmeler) BOSTA_TASIMA_ADIMI kadar sürer, tek seferlikler düşer
    this.girdisiz[i] = this.girdisiz[i]! + 1;
    this.bosta[i] = this.bosta[i]! + 1;
    // uzun boşluk (≥ 1 sn: geri sayım, sekme gizli) duraklama sayılır, borç tutulmaz
    this.borc[i] = this.bosta[i]! > SIM_HZ ? 0 : Math.min(BORC_TAVANI, this.borc[i]! + 1);
    if (this.bosta[i]! <= BOSTA_TASIMA_ADIMI) {
      this.sayac.tasima++;
      const s = this.sonGercek[i]!;
      const maske = tusMaskesi(s) & ~TEK_SEFERLIK_TUSLAR;
      return { ...s, atesle: false, dash: false, zipla: false, degistir: -1, dinlen: (maske & 8) !== 0, dusus: (maske & 16) !== 0 };
    }
    this.sayac.notr++;
    return bosGirdi();
  }

  private agdan(a: AgGirdisi): Girdi {
    return agAlanlarindanGirdi(a);
  }

  /**
   * Bir sabit adım. Dondurulmuşsa sim akmaz (yalnız kopma sayaçları); bağlı oyuncunun tamponu boşaltılır.
   * `kaynaklar[i]` null = oyuncu yok/kopuk (nötr girdi).
   */
  adimla(kaynaklar: readonly [GirdiKaynagi | null, GirdiKaynagi | null]): AdimSonucu {
    const sonuc: AdimSonucu = { olaylar: [], afkUyari: [], adimAtti: false };
    if (this.bitti) { for (const k of kaynaklar) k?.temizle(); return sonuc; }
    this.kopmaSayaclari(sonuc);
    if (this.bitti) return sonuc;
    if (this.donmus) { for (const k of kaynaklar) k?.temizle(); return sonuc; }
    const t0 = performance.now();
    const g: [Girdi, Girdi] = [this.girdiSec(0, kaynaklar[0]), this.girdiSec(1, kaynaklar[1])];
    adim(this.dunya, g);
    this.kayit.girdiler.push([...girdiDiziye(g[0]), ...girdiDiziye(g[1])]);
    sonuc.olaylar.push(...this.dunya.olaylar);
    sonuc.adimAtti = true;
    // AFK (bağlı ama girdi göndermiyor: sekme gizli / takıldı)
    for (let i = 0; i < 2; i++) {
      if (this.bot[i] || this.kopuk[i] || this.bitti) continue;
      if (this.girdisiz[i]! >= KOPMA_ADIM.afkTerk) { this.hukmen(i, sonuc); continue; }
      if (this.girdisiz[i]! >= KOPMA_ADIM.afkUyari && !this.afkUyarildi[i]) {
        this.afkUyarildi[i] = true;
        sonuc.afkUyari.push({ i, kalanSn: AFK_TERK_SN - AFK_UYARI_SN });
      }
    }
    if (this.dunya.tick % HASH_ARALIGI === 0 || this.bitti) {
      const h = dunyaHash(this.dunya);
      if (this.dunya.tick % HASH_ARALIGI === 0) this.kayit.hashler.push({ t: this.dunya.tick, h });
    }
    this.kayitKapat();
    this.adimSureleri.push(performance.now() - t0);
    if (this.adimSureleri.length > 20000) this.adimSureleri.splice(0, 10000);
    return sonuc;
  }

  private kayitKapat(): void {
    this.kayit.sonTick = this.dunya.tick;
    if (this.bitti) this.kayit.sonHash = dunyaHash(this.dunya);
  }

  private kopmaSayaclari(sonuc: AdimSonucu): void {
    for (let i = 0; i < 2; i++) {
      if (!this.kopuk[i] || this.suresiDoldu[i]) continue;
      this.kopukAdim[i] = this.kopukAdim[i]! + 1;
      if (this.kopukAdim[i] === KOPMA_ADIM.akis) {
        if (this.dondurmaHakki[i]! > 0) {
          this.dondurmaHakki[i] = this.dondurmaHakki[i]! - 1;
          this.donmus = true;
          this.kopan = i;
          this.sayac.dondurma++;
        } else {
          // dondurma hakkı bitti: ilk kopma 3 sn sonunda hükmen (flint #10)
          this.hukmen(i, sonuc);
          return;
        }
      }
      if (this.kopukAdim[i]! >= KOPMA_ADIM.toplam) this.sureDoldu(i, sonuc);
      if (this.bitti) return;
    }
  }

  /** Kopma 20 sn'yi aştı (sayaç ya da Colyseus koltuk süresi): diğeri bağlıysa hükmen; ikisi de dolduysa iptal. */
  sureDoldu(i: number, sonuc?: AdimSonucu): void {
    if (this.bitti || this.suresiDoldu[i]) return;
    this.suresiDoldu[i] = true;
    const j = 1 - i;
    if (!this.kopuk[j] || this.bot[j]) this.hukmen(i, sonuc);
    else if (this.suresiDoldu[j]) this.iptal(sonuc);
  }

  kopma(i: number): void {
    if (this.bitti || this.kopuk[i]) return;
    this.kopuk[i] = true;
    this.kopukAdim[i] = 0;
  }

  /** Yeniden bağlandı: dondurma çözülür (diğeri de bağlıysa); diğerinin süresi dolmuşsa o hükmen yenik. */
  baglandi(i: number): Olay[] {
    const sonuc: AdimSonucu = { olaylar: [], afkUyari: [], adimAtti: false };
    if (this.bitti) return sonuc.olaylar;
    this.kopuk[i] = false;
    this.kopukAdim[i] = 0;
    this.girdisiz[i] = 0;
    this.bosta[i] = BOSTA_TASIMA_ADIMI + 1;
    const j = 1 - i;
    if (this.suresiDoldu[j]) { this.hukmen(j, sonuc); return sonuc.olaylar; }
    if (!this.kopuk[j]) { this.donmus = false; this.kopan = -1; }
    else this.kopan = j;
    return sonuc.olaylar;
  }

  private simDisi(tur: "teslim" | "hukmen" | "iptal", i: number, f: () => void, sonuc?: AdimSonucu): Olay[] {
    const once = this.dunya.olaylar.length;
    f();
    const yeni = this.dunya.olaylar.slice(once);
    this.kayit.eylemler.push({ tick: this.dunya.tick, tur, i });
    this.donmus = false;
    this.kayitKapat();
    sonuc?.olaylar.push(...yeni);
    return yeni;
  }

  teslim(i: number): Olay[] {
    if (this.bitti) return [];
    return this.simDisi("teslim", i, () => teslimEt(this.dunya, i));
  }

  hukmen(i: number, sonuc?: AdimSonucu): Olay[] {
    if (this.bitti) return [];
    this.sayac.hukmen++;
    return this.simDisi("hukmen", i, () => hukmenBitir(this.dunya, i), sonuc);
  }

  iptal(sonuc?: AdimSonucu): Olay[] {
    if (this.bitti) return [];
    return this.simDisi("iptal", -1, () => macIptal(this.dunya), sonuc);
  }

  /** Kalan saniye: dondurma bandı ("Rakip bağlanıyor… 12") için. */
  kopmaKalanSn(i: number): number {
    return Math.max(0, Math.ceil((KOPMA_ADIM.toplam - this.kopukAdim[i]!) / SIM_HZ));
  }
}

