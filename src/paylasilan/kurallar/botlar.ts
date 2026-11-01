// Bot profilleri (PokeRivals `entrenadores` facil/normal profillerinden esinli; kolay bot reaccion .7, esquiva .1).
// Bot yalnız istemcide çalışır (F0); paylaşılan simülasyona girmez, tablo burada durur.

export interface BotProfili {
  ad: string;
  /** Bir karar ile eylem arasındaki gecikme (saniye) */
  tepki: number;
  /** Hedefe eklenen rastgele sapma (birim) */
  nisanHatasi: number;
  /** Hareket hedefini yeniden değerlendirme aralığı */
  kararAraligi: number;
  /** Tercih mesafesi = seçilen yuvanın menzili · bu çarpan */
  menzilCarpani: number;
  /** Bu mesafenin altında geri çekil (kite) */
  geriCekilOrani: number;
  /** Yan adım yönünü değiştirme aralığı */
  yanAdimAraligi: number;
  /** Gelen telegrafı görünce dash ile kaçma ihtimali */
  dashKacma: number;
  /** Mermiye hedef ilerisini tahmin etsin mi (1 = tam) */
  onTahmin: number;
  /** İki atış arası en az bekleme */
  atisAraligi: number;
}

export const BOT_PROFILLERI: Record<"kolay" | "normal", BotProfili> = {
  kolay: {
    ad: "kolay", tepki: 0.7, nisanHatasi: 38, kararAraligi: 0.35, menzilCarpani: 0.7, geriCekilOrani: 0.45,
    yanAdimAraligi: 1.6, dashKacma: 0.1, onTahmin: 0.3, atisAraligi: 0.9,
  },
  normal: {
    ad: "normal", tepki: 0.45, nisanHatasi: 18, kararAraligi: 0.2, menzilCarpani: 0.8, geriCekilOrani: 0.5,
    yanAdimAraligi: 1.2, dashKacma: 0.35, onTahmin: 0.7, atisAraligi: 0.5,
  },
};

export const VARSAYILAN_BOT: keyof typeof BOT_PROFILLERI = "normal";
