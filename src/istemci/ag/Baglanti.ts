import { Client, type Room } from "@colyseus/sdk";
import type { OdaGorunumu } from "../../ag/durum.ts";
import { KATALOG_OZETI } from "../../ag/katalog.ts";
import {
  type BilgiMesaji, type KatilmaSecenekleri, type MacKaydi, MESAJ, ODA_ADI, type OdaKoduDurumu, type OdaModu,
  type OlayPaketi, PROTOKOL_SURUMU,
} from "../../ag/protokol.ts";

// Colyseus SDK cephesi (yalnız src/istemci/ag/** @colyseus/sdk import eder; eslint yalıtımı). Oda aç / katıl /
// antrenman / hızlı; hata kodlarını ux § 7 metinlerine çevirir; olay, bilgi, kayıt mesajlarını dağıtır.

export type BaglantiHatasi = "gecersiz" | "dolu" | "suresiDoldu" | "bakim" | "katalog" | "kimlik" | "ayni" | "dugum" | "uzak" | "bilinmiyor";

export const HATA_METNI: Record<BaglantiHatasi, string> = {
  gecersiz: "Bu kod bulunamadı. Kod 8 harftir, örnek: ABCD-EFGH.",
  dolu: "Oda dolu.",
  suresiDoldu: "Bu odanın süresi doldu. Yeni oda aç.",
  bakim: "Devran kısa bir bakımda. Birkaç dakika sonra tekrar dene.",
  katalog: "Oyun güncellendi. Sayfayı yenile.",
  kimlik: "Oturumun kapanmış. Tekrar giriş yap.",
  ayni: "Bu hesap zaten bu odada. Rakip başka bir hesapla katılmalı.",
  dugum: "Bu düğüm henüz açık değil.",
  uzak: "Önce düğüme yürü.",
  bilinmiyor: "Bağlanamadık. Tekrar dene.",
};

export class BaglantiHatasiE extends Error {
  constructor(readonly tur: BaglantiHatasi) { super(HATA_METNI[tur]); }
}

/** Sunucu adresi: `?sunucu=` (ağ simülatörü / test) ya da sayfanın kökeni. */
export function sunucuAdresi(): string {
  const q = new URLSearchParams(location.search).get("sunucu");
  return q ?? location.origin;
}

function hataCevir(e: unknown): BaglantiHatasi {
  const kod = (e as { code?: number } | null)?.code;
  const msj = String((e as { message?: string } | null)?.message ?? e);
  if (kod === 4101 || kod === 4102 || /katalog|surum/.test(msj)) return "katalog";
  if (kod === 4107 || /ayni/.test(msj)) return "ayni";
  if (kod === 4111 || /uzak/.test(msj)) return "uzak";
  if (kod === 4110 || /dugum/.test(msj)) return "dugum";
  if (kod === 4103 || /kimlik/.test(msj)) return "kimlik";
  if (kod === 522 || /not found|invalid room/i.test(msj)) return "gecersiz";
  if (/locked|full|maxClients/i.test(msj)) return "dolu";
  if (/fetch|network|Failed|ECONNREFUSED|offline/i.test(msj)) return "bakim";
  return "bilinmiyor";
}

export type AgOdasi = Room<unknown, OdaGorunumu>;

export class Baglanti {
  readonly istemci: Client;
  oda: AgOdasi | null = null;
  readonly olayDinleyicileri = new Set<(p: OlayPaketi) => void>();
  readonly bilgiDinleyicileri = new Set<(b: BilgiMesaji) => void>();
  private kayitBekleyen: ((k: MacKaydi) => void) | null = null;
  /** RTT örnekleri (ms), son 10 */
  readonly rtt: number[] = [];
  private pingZamanlayici = 0;

  constructor(readonly adres = sunucuAdresi()) {
    this.istemci = new Client(adres);
  }

  async kodDurumu(kod: string): Promise<OdaKoduDurumu> {
    try {
      const r = await fetch(`${this.adres.replace(/\/$/, "")}/api/oda/${kod}`);
      if (!r.ok) throw new Error(String(r.status));
      return ((await r.json()) as { durum: OdaKoduDurumu }).durum;
    } catch {
      throw new BaglantiHatasiE("bakim");
    }
  }

  /**
   * Oda bileti (D5): oturum çereziyle `/api/bilet` → 60 s, tek kullanımlık. Misafir (oturum yok) için undefined:
   * yalnız Antrenman odası kabul eder. Bilet sayfa kökeninden alınır (çerez orada); `?sunucu=` vekili yalnız WS taşır.
   */
  async biletAl(): Promise<string | undefined> {
    try {
      const r = await fetch("/api/bilet", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: "{}" });
      if (r.status === 401) return undefined;
      if (!r.ok) throw new Error(String(r.status));
      return ((await r.json()) as { bilet: string }).bilet;
    } catch {
      throw new BaglantiHatasiE("bakim");
    }
  }

  private async secenek(mod: OdaModu, takimId?: string): Promise<KatilmaSecenekleri> {
    const bilet = await this.biletAl();
    if (!bilet && mod !== "antrenman") throw new BaglantiHatasiE("kimlik");
    return { v: PROTOKOL_SURUMU, mod, katalog: KATALOG_OZETI, ...(bilet ? { bilet } : {}), ...(takimId ? { takimId } : {}) };
  }

  async odaAc(takimId?: string): Promise<AgOdasi> {
    const s = await this.secenek("oda", takimId);
    return this.bagla(() => this.istemci.create<OdaGorunumu>(ODA_ADI, s) as Promise<AgOdasi>);
  }

  async antrenman(takimId?: string): Promise<AgOdasi> {
    const s = await this.secenek("antrenman", takimId);
    return this.bagla(() => this.istemci.create<OdaGorunumu>(ODA_ADI, s) as Promise<AgOdasi>);
  }

  /** Harita (H2): açık DÜŞMAN/PATRON düğümünde düğüm botuna karşı (karakter düğümde olmalı). */
  async harita(dugum: string, takimId?: string): Promise<AgOdasi> {
    const s = { ...(await this.secenek("harita", takimId)), dugum };
    return this.bagla(() => this.istemci.create<OdaGorunumu>(ODA_ADI, s) as Promise<AgOdasi>);
  }

  async hizli(takimId?: string): Promise<AgOdasi> {
    const s = await this.secenek("hizli", takimId);
    return this.bagla(() => this.istemci.joinOrCreate<OdaGorunumu>(ODA_ADI, s) as Promise<AgOdasi>);
  }

  async katil(kod: string, takimId?: string): Promise<AgOdasi> {
    const d = await this.kodDurumu(kod);
    if (d === "yok") throw new BaglantiHatasiE("gecersiz");
    if (d === "suresiDoldu") throw new BaglantiHatasiE("suresiDoldu");
    if (d === "dolu") throw new BaglantiHatasiE("dolu");
    const s = await this.secenek("oda", takimId);
    return this.bagla(() => this.istemci.joinById<OdaGorunumu>(kod, s) as Promise<AgOdasi>);
  }

  private async bagla(f: () => Promise<AgOdasi>): Promise<AgOdasi> {
    let oda: AgOdasi;
    try {
      oda = await f();
    } catch (e) {
      throw new BaglantiHatasiE(hataCevir(e));
    }
    this.oda = oda;
    // yeniden bağlanma: kopma kuralı 3 sn akış + 20 sn koltuk (flint #10). Varsayılan üstel bekleme (5 sn'ye kadar,
    // 15 deneme) 2 sn'lik kopmayı 3 sn'nin üstüne taşıyor ve 20 sn'yi doldurmadan vazgeçiyordu: en çok 1 sn arayla,
    // 30 deneme.
    oda.reconnection.maxDelay = 1000;
    oda.reconnection.maxRetries = 30;
    oda.reconnection.minUptime = 1000;
    oda.onMessage(MESAJ.olaylar, (p: OlayPaketi) => { if (p.v === PROTOKOL_SURUMU) for (const f2 of this.olayDinleyicileri) f2(p); });
    oda.onMessage(MESAJ.bilgi, (b: BilgiMesaji) => { if (b.v === PROTOKOL_SURUMU) for (const f2 of this.bilgiDinleyicileri) f2(b); });
    oda.onMessage(MESAJ.kayit, (k: MacKaydi) => { this.kayitBekleyen?.(k); this.kayitBekleyen = null; });
    this.pingZamanlayici = window.setInterval(() => {
      if (!this.oda) return;
      try { this.oda.ping((ms) => { this.rtt.push(ms); if (this.rtt.length > 10) this.rtt.shift(); }); } catch { /* bağlantı yok */ }
    }, 1000);
    return oda;
  }

  gonder(tur: string, ek: Record<string, unknown> = {}): void {
    try { this.oda?.send(tur, { v: PROTOKOL_SURUMU, ...ek }); } catch { /* kopuk: SDK kuyruğu */ }
  }

  kayitIste(): Promise<MacKaydi> {
    return new Promise((coz) => { this.kayitBekleyen = coz; this.gonder(MESAJ.kayitIste); });
  }

  get ortalamaRtt(): number {
    if (!this.rtt.length) return 0;
    return this.rtt.reduce((a, b) => a + b, 0) / this.rtt.length;
  }

  async ayril(): Promise<void> {
    window.clearInterval(this.pingZamanlayici);
    const o = this.oda;
    this.oda = null;
    try { await o?.leave(true); } catch { /* zaten kapalı */ }
  }
}
