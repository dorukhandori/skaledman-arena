// Hızlı maç kuyruğu zamanlamaları (nile B-19, ux § 7, tuning § 19). SAF: geçen süre çağırandan (sunucu ve istemci
// kendi saatini verir). Elo D7'de hesaplanmaz (`elo` 1000 sabit); eşleşme penceresi ±100, her 10 sn +50, en çok ±400.

export const KUYRUK = {
  /** "Beklerken Antrenman yap" önerisi */
  antrenmanOneriSn: 20,
  /** "Bot ile oyna (Altın yarı, başarım yalnız Yol)" teklifi; sunucu bot isteğini bu süreden önce kabul etmez */
  botTeklifSn: 30,
  /** "Şu an rakip bulamadık…" (oda kapanır, RAKIP_BEKLEME_SN) */
  bulunamadiSn: 60,
  /** "Rakip bulundu: <ad>" duyurusu */
  bulunduSn: 3,
  eloPencere: 100,
  eloGenisleme: 50,
  eloGenislemeSn: 10,
  eloTavan: 400,
  eloBaslangic: 1000,
} as const;

export type KuyrukAsamasi = "araniyor" | "antrenmanOner" | "botTeklif" | "bulunamadi";

export function kuyrukAsamasi(gecenSn: number): KuyrukAsamasi {
  if (gecenSn >= KUYRUK.bulunamadiSn) return "bulunamadi";
  if (gecenSn >= KUYRUK.botTeklifSn) return "botTeklif";
  if (gecenSn >= KUYRUK.antrenmanOneriSn) return "antrenmanOner";
  return "araniyor";
}

/** Sunucu: bot isteği kabul edilir mi (bekleme süresi dolmadan bot yok; boş kuyruk farmı caydırma). */
export function botKabul(gecenSn: number): boolean {
  return gecenSn >= KUYRUK.botTeklifSn && gecenSn < KUYRUK.bulunamadiSn;
}

/** Elo penceresi (bekleyen oyuncu için, sn). */
export function eloPenceresi(gecenSn: number): number {
  const K = KUYRUK;
  return Math.min(K.eloTavan, K.eloPencere + Math.floor(gecenSn / K.eloGenislemeSn) * K.eloGenisleme);
}

/** İki oyuncu eşleşebilir mi (bekleyenin penceresiyle). */
export function eloUygun(bekleyenElo: number, gelenElo: number, gecenSn: number): boolean {
  return Math.abs(bekleyenElo - gelenElo) <= eloPenceresi(gecenSn);
}

/** "0:12" biçimi. */
export function sureBicimle(sn: number): string {
  const s = Math.max(0, Math.floor(sn));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Dereceli kapısı (sahip kararı, tasarım sütunu S4): Dereceli düğmesi yeni oyuncuya hiç gösterilmez; herhangi bir
 * Çekirdek Lv.3'e çıkınca lobide belirir (Dereceli modu/Elo D7'de yok; tıklanınca "Dereceli çok yakında").
 */
export function dereceliAcik(cekirdekSeviyeleri: readonly number[]): boolean {
  return cekirdekSeviyeleri.some((s) => s >= 3);
}
