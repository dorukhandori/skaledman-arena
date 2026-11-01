// Ayar tablosu (tuning). Kaynak: PokeRivals paket analizi § 2 ve oyun-konsepti § 11.
// Sayılar yalnız burada ve hamleler.ts / botlar.ts tablolarında durur; kodda sihirli sayı yok.
// Paylaşılan kod: DOM yok, Node yok.

export const AYAR = {
  /** Sabit simülasyon adımı (K-6: 60 Hz). */
  dt: 1 / 60,
  /** Render karesi başına en çok simülasyon adımı (spiral of death koruması). */
  enFazlaAdimKare: 6,

  /** İlk arena: İskeletler Diyarı (sahip: "ilk arenamız 'iskeletler diyarı' olacak"). Gerekçeler arenalar/iskeletler-diyari.md. */
  saha: {
    id: "iskeletler-diyari",
    ad: "İskeletler Diyarı",
    yariGenislik: 380,
    derinlik: 480,
    govdeYaricap: 14,
    /** Doğum noktaları: yon = SpriteCollab satırı (2 sağ, 6 sol). */
    dogum: [
      { x: -110, z: 120, yon: 2 },
      { x: 110, z: 120, yon: 6 },
    ],
    /** x'te ayna simetrik; büyük kafatası doğum hattını keser, omurgalar uzun ışına siper. */
    engeller: [
      { tur: "dikdortgen", gorsel: "kafatasi", x: 0, z: 120, yariGenislik: 24, yariDerinlik: 26 },
      { tur: "dikdortgen", gorsel: "omurga", x: -230, z: 340, yariGenislik: 16, yariDerinlik: 70 },
      { tur: "dikdortgen", gorsel: "omurga", x: 230, z: 340, yariGenislik: 16, yariDerinlik: 70 },
      { tur: "dikdortgen", gorsel: "uyluk", x: 0, z: 330, yariGenislik: 52, yariDerinlik: 10 },
      { tur: "daire", gorsel: "yerKafatasi", x: -115, z: 250, yaricap: 16 },
      { tur: "daire", gorsel: "yerKafatasi", x: 115, z: 250, yaricap: 16 },
      { tur: "dikdortgen", gorsel: "mezarTasi", x: -310, z: 170, yariGenislik: 12, yariDerinlik: 9 },
      { tur: "dikdortgen", gorsel: "mezarTasi", x: 310, z: 170, yariGenislik: 12, yariDerinlik: 9 },
    ],
  },

  /** Hız = taban · (katsayiTaban + katsayiEgim · hiz / bolen)  (105..195 birim/s). */
  hiz: { taban: 150, katsayiTaban: 0.7, katsayiEgim: 0.6, bolen: 130 },
  dash: { sure: 0.15, mesafe: 60, bekleme: 10, dokunulmaz: 0.12 },
  /** Telegraf (aviso) süreleri, saniye. */
  telegraf: { anlik: 0.08, kisa: 0.2, uzun: 0.45 },

  knockback: 40,
  hitStun: 0.22,
  /** true: sersemleten vuruş yürüyen telegrafı/atılışı keser. */
  hitKeser: true,

  /**
   * Genel hasar çarpanı (PokeRivals formülündeki `factor`). 1 = formül aynen (bot-bot medyan maç 3,1 s);
   * F0 varsayılanı 0,2: 80 bot-bot maçta medyan 13,9 s (p10 7,4 / p90 22,0), insan maçı daha uzun sürer.
   * Ölçüm 2026-11-01, normal bot. `?hasar=` ile geçersiz kılınır. Denge kararı economy-designer'ındır (SA-6).
   */
  hasarCarpani: 0.2,

  seviye: 50,
  iv: 31,
  ev: 0,
  stab: 1.5,
  /** Etkinlik budaması: çarpan > 1 → superEtkili, 0 < çarpan < 1 → azEtkili. */
  superEtkili: 1.5,
  azEtkili: 2 / 3,
  yanikFizikselCarpani: 0.5,

  yanik: { sure: 6, aralik: 1.5, kesir: 1 / 16 },
  felc: { sure: 5, hizCarpani: 0.5, aralik: 1, olasilikTakilma: 0.25, takilma: 0.5 },
  /** Vuruşta durum ihtimali (tip → durum). Elektrik/yanık bağışıklıkları durumlar.ts'te. */
  durumSansi: {
    FIRE: { tur: "yanik", olasilik: 0.1 },
    ELECTRIC: { tur: "felc", olasilik: 0.1 },
  },
  /** Stat kademesi (analiz § 3): çarpan = ana seri çarpanının karekökü, değişim 8 s sonra düşer, ±6 tavan. */
  kademe: { karekok: true, sure: 8, tavan: 6 },

  /**
   * Zıplama (analiz `curvas`): 0,5 s parabol, 22 birim tepe, enerji 1/3 (0..1, 0,4/s dolar).
   * `bekleme` PokeRivals `cooldown:.5`; inişten sayılması ajan yorumu (tuning.md).
   */
  zipla: { sure: 0.5, yukseklik: 22, bekleme: 0.5, maliyet: 1 / 3, enerjiDolum: 0.4 },
  /**
   * Z dinlenme. PokeRivals'ta PP/şarj dolumu; bizde şarj yok, karşılığı ajan önerisi (tuning.md, sahip onayı bekler):
   * dinlenirken hareket yok, cooldown'lar `cooldownHizi` kat, enerji `enerjiHizi` kat hızlı dolar.
   */
  dinlen: { cooldownHizi: 2, enerjiHizi: 3 },
  /**
   * Takım (analiz `capas`/`arena`): geri çekilme 0,4 + boşluk 0,5 + çıkış 0,25 s, sonra 2 s bekleme; KO sonrası 5 s seçim.
   * `dususMenzili`: düşüş noktası mevcut konumdan en çok bu kadar uzakta (ajan tahmini). `cikisItme` = `empujeSalida`.
   */
  takim: { boyut: 3, geri: 0.4, bosluk: 0.5, cikis: 0.25, bekleme: 2, koSecim: 5, dususMenzili: 160, cikisItme: 14 },

  mac: { sure: 90 },
  /** Girdi sanitize sınırı: nişan dünya noktası bu kadar saha dışına çıkabilir. */
  nisanTasma: 200,
  /** Ölü dövüşçünün solma süresi (yalnız görsel). */
  koSolma: 1.2,
} as const;

export type DurumTuru = "yanik" | "felc";
