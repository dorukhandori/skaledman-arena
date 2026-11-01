// Fusion atlas sözleşmesi: araclar/fusion-birlestir.ts üretir, istemci yükler.
// Düzen PMD SpriteCollab'ınkiyle aynı tutulur ki araç basit, yükleyici tek olsun:
//   public/fusion/<fusionId>/<Animasyon>-Anim.png   satır = 8 yön, sütun = kare
//   public/fusion/<fusionId>/<Animasyon>-Shadow.png (isteğe bağlı)
//   public/fusion/<fusionId>/atlas.json              (FusionAtlas)
// Paylaşılan koddur: DOM yok, Node yok.

/** SpriteCollab satır sırası. 0 = aşağı (ekrana doğru), saat yönünde döner. */
export const YONLER = ["asagi", "asagiSag", "sag", "yukariSag", "yukari", "yukariSol", "sol", "asagiSol"] as const;
export type Yon = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Arenada kullanılan animasyon adları (SpriteCollab adlarıyla birebir). */
export const ANIMASYONLAR = ["Idle", "Walk", "Attack", "Hurt", "Charge", "Shoot", "Hop", "Strike", "Swing", "Double", "Sleep", "Rotate"] as const;
export type AnimasyonAdi = (typeof ANIMASYONLAR)[number];

export interface AtlasAnimasyon {
  /**
   * Sayfa dosyasının adı: `<ad>-Anim.png`. Anahtar (Idle, Shoot...) rolü gösterir; AnimData `CopyOf` ya da
   * eksik Idle durumunda `ad` başka animasyonun adı olabilir (ör. Shoot → "Charge", Idle → "Walk").
   */
  ad: string;
  kareGenislik: number;
  kareYukseklik: number;
  /** Kare başına süre, 1/60 saniyelik tick cinsinden (AnimData.xml Durations) */
  sureler: number[];
  /** 1 = tek yön (bütün yönler aynı satırı kullanır), 8 = tam */
  yonSayisi: 1 | 8;
  /** Saldırı animasyonlarında hasarın uygulandığı kare (AnimData HitFrame) */
  vurusKaresi?: number;
  /** Hamle/koşu başlangıcı (RushFrame) */
  hamleKaresi?: number;
  /** Geri dönüş karesi (ReturnFrame) */
  donusKaresi?: number;
  /** Gölge sayfası var mı */
  golge: boolean;
  /**
   * Yerdeki ayak noktası (kare içi piksel; gölge sayfasındaki beyaz işaret). Kare bu noktası dövüşçünün
   * konumuna gelecek biçimde yerleştirilir; animasyonlar arası kare boyutu farkı böylece hizalanır.
   * Yoksa kare alt-orta noktası kullanılır.
   */
  ayakX?: number;
  ayakY?: number;
}

export interface AtlasKredi {
  /** Gövde Pokémon'u: SpriteCollab tracker `sprite_credit` */
  govde: { dex: number; ad: string; sanatcilar: string[] };
  /** Baş Pokémon'u */
  bas: { dex: number; ad: string; sanatcilar: string[] };
  /** Fusion kart resmi: Skaledman `artists` */
  kartResmi: string[];
  lisans: "CC BY-NC 4.0 (PMD SpriteCollab)";
}

export interface FusionAtlas {
  surum: 1;
  fusionId: string;
  ad: string;
  /** Baş Pokémon dex numarası ("251.443" → 251) */
  basDex: number;
  govdeDex: number;
  /** Üretimde karşılaşılan sorunlar (ör. "bas-yerlestirilemedi", "idle-yok-walk-kullanildi") */
  uyarilar?: string[];
  /** AnimData ShadowSize: 0 küçük, 1 orta, 2 büyük */
  golgeBoyu: 0 | 1 | 2;
  /** Yönetilen palet: kaynak RGB → hedef RGB (hex, '#rrggbb'); hata ayıklama ve shiny için */
  palet: Record<string, string>;
  animasyonlar: Partial<Record<AnimasyonAdi, AtlasAnimasyon>>;
  /**
   * Shiny varyant var: her `<ad>-Anim.png` için `<ad>-Anim-shiny.png` (aynı düzen; gölge sayfası ortak).
   * Skaledman shiny'yi `hue-rotate(hue) saturate(1.3)` ile gösterir; sayfalar aynı matrisle üretilir.
   */
  shiny?: { hue: number; doygunluk: number };
  /** Palet sonrası kontrast düzeltmesi uygulandıysa eğri (araclar/fusion/kontrast.ts); yoksa dokunulmadı */
  kontrast?: { capa: number; katsayi: number };
  kredi: AtlasKredi;
  uretim: { tarih: string; arac: string; kaynakSprite: string };
}

/** Hareket vektöründen (x sağ, z ekrana doğru/aşağı) 8 yön. */
export function yonBul(dx: number, dz: number, varsayilan: Yon = 0): Yon {
  if (dx === 0 && dz === 0) return varsayilan;
  // açı 0 = aşağı, saat yönünde (ekranda z aşağı pozitif)
  const aci = Math.atan2(dx, dz); // 0 aşağı, +π/2 sağ, π yukarı, -π/2 sol
  const dilim = Math.round(aci / (Math.PI / 4));
  return (((dilim % 8) + 8) % 8) as Yon;
}

/** public/fusion/liste.json kaydı: araclar/fusion-birlestir.ts yazar, Birleştirme Lab okur. */
export interface FusionListeKaydi {
  fusionId: string;
  ad: string;
  /** Sanatçının fusion resmi (288×288) */
  kartResmi: string;
  /** Kartı açan izleyici */
  sahip: string;
  sanatcilar: string[];
  govde: string;
  bas: string;
  animasyonlar: string[];
  uyarilar: string[];
  /** Shiny kart: Skaledman'ın `hue` açısı (kart resmi CSS hue-rotate ile gösterilir; atlasta shiny sayfaları vardır) */
  shiny?: { hue: number };
}
