// H10 bağlantı rozeti kararı (ux § 2; MENU-P1A H-10). Saf: AgMaci ölçümlerinden "rozet görünsün mü" sonucunu verir.
// Rozet yalnız gerçek bir rakiple oynanan maçta ve yeterli ölçüm birikince görünür: bot maçında (hızlı maç botu,
// Antrenman, Harita düğümü) ağ sorunu oyuncunun maçını etkilemez; ilk saniyelerde tek bir RTT örneği ya da faz geçişindeki
// yama boşluğu yanlış alarm verir (localhost bot maçında "kayıp" görüldü).

/** gecikme eşiği (ms): üstünde rozet görünür */
export const ROZET_GECIKME_MS = 150;
/** rozetin karar verebilmesi için en az RTT örneği (saniyede bir alınır) */
export const ROZET_EN_AZ_RTT_ORNEGI = 3;
/** rozetin karar verebilmesi için maç fazında en az yama (20 Hz: ~2 sn) */
export const ROZET_EN_AZ_MAC_YAMASI = 40;
/** son takılmadan sonra "kayıp" belirtisinin geçerli kaldığı süre (ms) */
export const ROZET_TAKILMA_PENCERESI_MS = 5000;

export interface RozetGirdisi {
  /** yumuşatılmış RTT (ms) */
  ms: number;
  /** rakip bot mu (sunucu botu) */
  rakipBot: boolean;
  /** toplanan RTT örneği sayısı */
  rttOrnek: number;
  /** maç fazında gelen yama sayısı */
  macYamasi: number;
  /** son maç-içi takılmadan bu yana geçen süre (ms; hiç yoksa Infinity) */
  takilmadanBeri: number;
}

export interface RozetKarari { goster: boolean; ms: number; kayip: boolean }

export function baglantiRozetiKarari(g: RozetGirdisi): RozetKarari {
  const kayip = g.takilmadanBeri < ROZET_TAKILMA_PENCERESI_MS;
  const yeterli = g.rttOrnek >= ROZET_EN_AZ_RTT_ORNEGI && g.macYamasi >= ROZET_EN_AZ_MAC_YAMASI;
  const goster = !g.rakipBot && yeterli && (g.ms > ROZET_GECIKME_MS || kayip);
  return { goster, ms: g.ms, kayip };
}
