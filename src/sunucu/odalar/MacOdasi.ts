import { randomInt } from "node:crypto";
import { type AuthContext, type Client, Room, ServerError } from "colyseus";
import { f32, gorunumdenDunya, type DunyaGorunumu } from "../../ag/durum.ts";
import { KATALOG_OZETI } from "../../ag/katalog.ts";
import {
  BosMesajSema, HASH_ARALIGI, KatilmaSema, type KatilmaSecenekleri, type BilgiMesaji, type KapanisNedeni, MESAJ,
  ODA_BOS_DK, ODA_FAZI, type OdaModu, type OlayPaketi, PROTOKOL_SURUMU, RAKIP_BEKLEME_SN, SECIM_SN, SIM_HZ,
  TakimSecSema, YAMA_ADIMI, YENIDEN_BAGLANMA_SN,
} from "../../ag/protokol.ts";
import type { Olay } from "../../paylasilan/sim/durum.ts";
import { dunyaHash } from "../../paylasilan/sim/hash.ts";
import { BASLANGIC_TAKIMLARI, takimBul } from "../../paylasilan/veri/takimlar.ts";
import { type GirdiKaynagi, MacYonetimi } from "../mac/MacYonetimi.ts";
import { kodAc, kodKapat, yeniKod } from "../odaKayit.ts";
import { kimlikDogrula, kokenIzinli } from "../kimlik.ts";
import { GirdiSema, OdaSema, type OdaS, OyuncuSema, type OyuncuS } from "./sema.ts";
import { dunyayiYaz } from "./semaYaz.ts";
import { olcumKaydet } from "../olcum.ts";

// Yetkili 1v1 maç odası (D4, docs/tech/netcode.md). Colyseus 0.18: `defineInput` ile 60 Hz girdi, `setFixedTimestep`
// ile 60 Hz sim adımı, elle 20 Hz yama (adım hizalı: her 3 adımda bir `broadcastPatch`), olaylar her adım sonunda
// anında (`MESAJ.olaylar`). Kural mantığı MacYonetimi'nde (Colyseus'suz, test edilir); burası yalnız bağlantı.
// Modlar: "oda" (kodla, özel), "hizli" (genel kuyruk yer tutucu; D7 bot dolgusu), "antrenman" (sunucu botu).
// allowRewindState KULLANILMAZ: topaç çarpışması fizik etkileşimi, geri sarma anlamsız (05 § 4).

interface KullaniciVerisi { i: number }
interface Kimlik { id: string; ad: string }

const HATA = { surum: 4101, katalog: 4102, kimlik: 4103, koken: 4104, sema: 4105 } as const;

type GirdiS = InstanceType<typeof GirdiSema>;

export class MacOdasi extends Room<{ state: OdaS; input: GirdiS }> {
  maxClients = 2;
  state = new OdaSema();
  inputs = this.defineInput(GirdiSema, { bufferMaxSize: 64 });
  private mod: OdaModu = "oda";
  private yon: MacYonetimi | null = null;
  private adimNo = 0;
  private istemciler: (Client | null)[] = [null, null];
  private bosZamanlayici: { clear(): void } | null = null;
  private bekleZamanlayici: { clear(): void } | null = null;
  private saniye: { clear(): void } | null = null;
  private kapaniyor = false;
  private kapanisNedeni: KapanisNedeni | null = null;

  onAuth(_client: Client, options: unknown, context: AuthContext): Kimlik {
    const koken = context.headers?.get?.("origin") ?? null;
    if (!kokenIzinli(koken)) throw new ServerError(HATA.koken, "koken");
    const o = options as Partial<KatilmaSecenekleri> | null;
    if (!o || o.v !== PROTOKOL_SURUMU) throw new ServerError(HATA.surum, "surum");
    const k = KatilmaSema.safeParse(o);
    if (!k.success) throw new ServerError(HATA.sema, "sema");
    if (k.data.katalog !== KATALOG_OZETI) throw new ServerError(HATA.katalog, "katalog");
    const kim = kimlikDogrula(k.data);
    if (!kim) throw new ServerError(HATA.kimlik, "kimlik");
    return kim;
  }

  onCreate(options: unknown): void {
    const o = KatilmaSema.safeParse(options);
    this.mod = o.success ? o.data.mod : "oda";
    const s = this.state;
    s.mod = this.mod;
    s.faz = ODA_FAZI.bekliyor;
    if (this.mod === "oda") {
      const kod = yeniKod();
      this.roomId = kod;
      s.kod = kod;
      void this.setPrivate(true);
      kodAc(kod, () => this.clients.length >= 2 || s.faz !== ODA_FAZI.bekliyor);
    } else if (this.mod === "antrenman") {
      this.maxClients = 1;
      void this.setPrivate(true);
    }
    void this.setMetadata({ mod: this.mod });
    // sıra önemli: önce sabit adım, sonra patchRate = null. Tersinde Colyseus boşta saat için ayrı bir 16 ms
    // `clock.tick` aralığı kurar ve bu, sabit adım birikimcisinin deltaTime'ını çalar (adım hızı 4-50 Hz'e düşer).
    this.setFixedTimestep(() => this.adim(), SIM_HZ);
    this.patchRate = null; // yama elle, adım hizalı (YAMA_ADIMI)
    this.saniye = this.clock.setInterval(() => this.saniyelik(), 1000);
    this.bosSayaciKur();
    for (const [tur, f] of [
      [MESAJ.teslim, (c: Client) => this.teslim(c)],
      [MESAJ.rovans, (c: Client) => this.rovans(c)],
      [MESAJ.hazir, (c: Client) => this.hazir(c)],
      [MESAJ.kayitIste, (c: Client) => this.kayitGonder(c)],
    ] as const) {
      this.onMessage(tur, (c: Client, m: unknown) => { if (BosMesajSema.safeParse(m).success) f(c); });
    }
    this.onMessage(MESAJ.takimSec, (c: Client, m: unknown) => {
      const t = TakimSecSema.safeParse(m);
      const i = this.indeks(c);
      if (!t.success || i < 0 || this.state.faz !== ODA_FAZI.secim || !takimBul(t.data.takimId)) return;
      this.oyuncu(i).takimId = t.data.takimId;
    });
  }

  // ---- katılım ----

  onJoin(client: Client, options: KatilmaSecenekleri, auth: Kimlik): void {
    const s = this.state;
    const i = this.istemciler[0] ? 1 : 0;
    this.istemciler[i] = client;
    (client.userData as KullaniciVerisi | undefined) ??= { i };
    client.userData = { i } satisfies KullaniciVerisi;
    while (s.oyuncular.length <= i) s.oyuncular.push(new OyuncuSema());
    const p = this.oyuncu(i);
    p.oturum = client.sessionId;
    p.ad = auth.ad;
    p.takimId = takimBul(options.takimId) ? options.takimId : BASLANGIC_TAKIMLARI[0]!.id;
    p.bagli = true;
    p.bot = false;
    console.log(`[mac ${this.roomId}] katıldı ${i}: ${auth.ad} (${this.mod})`);
    if (this.mod === "antrenman") {
      while (s.oyuncular.length < 2) s.oyuncular.push(new OyuncuSema());
      const b = this.oyuncu(1);
      b.ad = "Antrenman botu";
      b.bot = true;
      b.bagli = true;
      b.takimId = BASLANGIC_TAKIMLARI[(BASLANGIC_TAKIMLARI.findIndex((t) => t.id === p.takimId) + 1) % BASLANGIC_TAKIMLARI.length]!.id;
      this.secimBaslat();
      return;
    }
    if (this.istemciler[0] && this.istemciler[1]) {
      void this.lock();
      for (let k = 0; k < 2; k++) this.bilgi(this.istemciler[k]!, { v: PROTOKOL_SURUMU, tur: "rakipBulundu", ad: this.oyuncu(1 - k).ad });
      this.secimBaslat();
    } else {
      // rakip bekleniyor: 60 sn (flint #19)
      s.beklemeKalan = RAKIP_BEKLEME_SN;
      this.bekleZamanlayici?.clear();
      this.bekleZamanlayici = this.clock.setTimeout(() => {
        if (this.state.faz === ODA_FAZI.bekliyor) this.kapat("rakipGelmedi");
      }, RAKIP_BEKLEME_SN * 1000);
    }
  }

  async onDrop(client: Client): Promise<void> {
    const i = this.indeks(client);
    if (i < 0) return;
    this.oyuncu(i).bagli = false;
    if (this.state.faz === ODA_FAZI.mac) this.yon?.kopma(i);
    console.log(`[mac ${this.roomId}] koptu ${i}`);
    try {
      await this.allowReconnection(client, YENIDEN_BAGLANMA_SN);
    } catch {
      /* süre doldu: onLeave çağrılır */
    }
  }

  onReconnect(client: Client): void {
    const i = this.indeks(client);
    if (i < 0) return;
    this.istemciler[i] = client;
    this.oyuncu(i).bagli = true;
    console.log(`[mac ${this.roomId}] yeniden bağlandı ${i}`);
    if (this.state.faz === ODA_FAZI.mac && this.yon) this.olaylariYay(this.yon.baglandi(i));
  }

  onLeave(client: Client): void {
    const i = this.indeks(client);
    if (i < 0) return;
    const p = this.oyuncu(i);
    p.bagli = false;
    this.istemciler[i] = null;
    console.log(`[mac ${this.roomId}] ayrıldı ${i}`);
    const s = this.state;
    if (s.faz === ODA_FAZI.mac && this.yon && !this.yon.bitti) {
      // oda terk = kopma (flint #9/#10). Koltuk süresi dolduysa (onDrop sonrası) hükmen/iptal; açık terkte sayaç
      // 20 sn'yi kendi sayar (MacYonetimi.kopmaSayaclari).
      if (this.yon.kopuk[i]) this.olaylariYay(this.sureDoldu(i));
      else this.yon.kopma(i);
      return;
    }
    if (this.kapaniyor) return;
    const kalan = this.istemciler.find((c) => c);
    if (kalan && s.faz !== ODA_FAZI.bekliyor) this.kapat("rakipAyrildi");
  }

  private sureDoldu(i: number): Olay[] {
    const y = this.yon!;
    const once = y.dunya.olaylar.length;
    y.sureDoldu(i);
    return y.bitti ? y.dunya.olaylar.slice(once) : [];
  }

  onDispose(): void {
    if (this.state.kod) kodKapat(this.state.kod);
    this.saniye?.clear();
    if (this.yon) olcumKaydet(this.roomId, this.yon);
    console.log(`[mac ${this.roomId}] kapandı (${this.kapanisNedeni ?? "boş"})`);
  }

  // ---- akış ----

  private secimBaslat(): void {
    const s = this.state;
    this.bekleZamanlayici?.clear();
    s.faz = ODA_FAZI.secim;
    s.secimKalan = SECIM_SN;
    s.beklemeKalan = 0;
    for (const p of s.oyuncular) { p.hazir = p.bot; p.rovans = false; }
    this.bosSayaciKur();
    this.broadcastPatch();
  }

  private macBaslat(): void {
    const s = this.state;
    const takimlar: [string, string] = [this.oyuncu(0).takimId, this.oyuncu(1).takimId];
    this.yon = new MacYonetimi({ takimlar, tohum: randomInt(1, 0x7fffffff), bot: [this.oyuncu(0).bot, this.oyuncu(1).bot] });
    for (let i = 0; i < 2; i++) {
      const p = this.oyuncu(i);
      p.ack = 0;
      p.ackTick = 0;
      p.dondurmaHakki = this.yon.dondurmaHakki[i]!;
      const c = this.istemciler[i];
      if (c) this.inputs.get(c.sessionId).clear();
    }
    dunyayiYaz(s.dunya, this.yon.dunya);
    s.dunyaVar = true;
    s.macNo = (s.macNo + 1) % 256;
    s.donma = 0;
    s.kopan = -1;
    s.faz = ODA_FAZI.mac;
    this.bosZamanlayici?.clear();
    this.bosZamanlayici = null;
    console.log(`[mac ${this.roomId}] maç ${s.macNo} başladı: ${takimlar.join(" vs ")} tohum ${this.yon.kayit.tohum}`);
    this.broadcastPatch();
  }

  private adim(): void {
    this.adimNo++;
    if (process.env.DEVRAN_IZ && this.adimNo % 60 === 0) console.log(`[iz] adim ${this.adimNo} ${Date.now() % 100000}`);
    const s = this.state;
    let hashAdimi = false;
    const y = this.yon;
    if (s.faz === ODA_FAZI.mac && y) {
      const k: [GirdiKaynagi | null, GirdiKaynagi | null] = [this.kaynak(0), this.kaynak(1)];
      const r = y.adimla(k);
      for (let i = 0; i < 2; i++) {
        const p = this.oyuncu(i);
        p.ack = y.ack[i]!;
        p.ackTick = y.ackTick[i]!;
        p.dondurmaHakki = y.dondurmaHakki[i]!;
      }
      const kopan = y.kopuk[0] ? 0 : y.kopuk[1] ? 1 : -1;
      s.donma = y.donmus ? 1 : 0;
      s.kopan = y.donmus ? y.kopan : kopan;
      s.donmaKalan = s.kopan >= 0 ? y.kopmaKalanSn(s.kopan) : 0;
      for (const a of r.afkUyari) {
        const c = this.istemciler[a.i];
        if (c) this.bilgi(c, { v: PROTOKOL_SURUMU, tur: "afkUyari", kalanSn: a.kalanSn });
      }
      // her 60 adımda ve maç biterken (son durum) hash
      hashAdimi = r.adimAtti && (y.dunya.tick % HASH_ARALIGI === 0 || y.bitti);
      if (r.olaylar.length || hashAdimi) {
        const paket: OlayPaketi = { v: PROTOKOL_SURUMU, t: y.dunya.tick, ms: Date.now(), o: r.olaylar };
        if (hashAdimi) {
          dunyayiYaz(s.dunya, y.dunya);
          paket.h = dunyaHash(y.dunya);
          paket.hw = dunyaHash(gorunumdenDunya(s.dunya as unknown as DunyaGorunumu, y.profiller, f32));
        }
        this.broadcast(MESAJ.olaylar, paket);
      }
      if (y.bitti) this.macBitti();
    }
    if (hashAdimi || this.adimNo % YAMA_ADIMI === 0) {
      if (y && s.dunyaVar) dunyayiYaz(s.dunya, y.dunya);
      this.broadcastPatch();
    }
  }

  private macBitti(): void {
    const s = this.state;
    if (s.faz !== ODA_FAZI.mac) return;
    s.faz = ODA_FAZI.bitti;
    s.donma = 0;
    for (const p of s.oyuncular) p.rovans = p.bot;
    const ms = this.yon!.dunya.mac.macSonucu;
    console.log(`[mac ${this.roomId}] maç bitti: ${ms?.neden} ${ms?.puan.join("-")} (tick ${this.yon!.dunya.tick}, hash ${this.yon!.kayit.sonHash})`);
    olcumKaydet(this.roomId, this.yon!);
    this.bosSayaciKur();
  }

  private saniyelik(): void {
    const s = this.state;
    if (s.faz === ODA_FAZI.bekliyor && s.beklemeKalan > 0) s.beklemeKalan--;
    if (s.faz === ODA_FAZI.secim) {
      if (s.secimKalan > 0) s.secimKalan--;
      const herkesHazir = s.oyuncular.length === 2 && s.oyuncular.every((p) => p.hazir);
      const ikisiBagli = s.oyuncular.length === 2 && s.oyuncular.every((p) => p.bagli);
      if (ikisiBagli && (herkesHazir || s.secimKalan === 0)) this.macBaslat();
    }
  }

  /** Maç oynanmayan oda en çok ODA_BOS_DK yaşar (B-20). */
  private bosSayaciKur(): void {
    this.bosZamanlayici?.clear();
    this.bosZamanlayici = this.clock.setTimeout(() => {
      if (this.state.faz !== ODA_FAZI.mac) this.kapat("sureDoldu");
    }, ODA_BOS_DK * 60 * 1000);
  }

  private kapat(neden: KapanisNedeni): void {
    if (this.kapaniyor) return;
    this.kapaniyor = true;
    this.kapanisNedeni = neden;
    this.state.faz = ODA_FAZI.kapandi;
    this.broadcastPatch();
    this.broadcast(MESAJ.bilgi, { v: PROTOKOL_SURUMU, tur: "kapandi", neden } satisfies BilgiMesaji);
    if (this.state.kod) kodKapat(this.state.kod);
    this.clock.setTimeout(() => void this.disconnect(), 300);
  }

  // ---- mesajlar ----

  private teslim(c: Client): void {
    const i = this.indeks(c);
    if (i < 0 || this.state.faz !== ODA_FAZI.mac || !this.yon) return;
    this.olaylariYay(this.yon.teslim(i));
    if (this.yon.bitti) this.macBitti();
  }

  private rovans(c: Client): void {
    const i = this.indeks(c);
    const s = this.state;
    if (i < 0 || s.faz !== ODA_FAZI.bitti) return;
    this.oyuncu(i).rovans = true;
    if (s.oyuncular.length === 2 && s.oyuncular.every((p) => p.rovans) && this.istemciler.filter((x) => x).length === (this.mod === "antrenman" ? 1 : 2)) this.secimBaslat();
  }

  private hazir(c: Client): void {
    const i = this.indeks(c);
    if (i < 0 || this.state.faz !== ODA_FAZI.secim) return;
    this.oyuncu(i).hazir = true;
    this.saniyelikHazirKontrol();
  }

  private saniyelikHazirKontrol(): void {
    const s = this.state;
    if (s.oyuncular.length === 2 && s.oyuncular.every((p) => p.hazir && p.bagli)) this.macBaslat();
  }

  private kayitGonder(c: Client): void {
    if (process.env.NODE_ENV === "production" || !this.yon) return;
    c.send(MESAJ.kayit, this.yon.kayit);
  }

  // ---- yardımcılar ----

  private kaynak(i: number): GirdiKaynagi | null {
    const c = this.istemciler[i];
    const p = this.state.oyuncular.at(i);
    if (!c || !p || !p.bagli) return null;
    const a = this.inputs.get(c.sessionId);
    return {
      al: () => a.next() as ReturnType<GirdiKaynagi["al"]>,
      get boyut() { return a.size; },
      temizle: () => a.clear(),
    };
  }

  private olaylariYay(o: Olay[]): void {
    if (!o.length || !this.yon) return;
    const paket: OlayPaketi = { v: PROTOKOL_SURUMU, t: this.yon.dunya.tick, ms: Date.now(), o };
    dunyayiYaz(this.state.dunya, this.yon.dunya);
    if (this.yon.bitti) {
      paket.h = dunyaHash(this.yon.dunya);
      paket.hw = dunyaHash(gorunumdenDunya(this.state.dunya as unknown as DunyaGorunumu, this.yon.profiller, f32));
    }
    this.broadcast(MESAJ.olaylar, paket);
    this.broadcastPatch();
  }

  private bilgi(c: Client, m: BilgiMesaji): void {
    c.send(MESAJ.bilgi, m);
  }

  private indeks(c: Client): number {
    const u = c.userData as KullaniciVerisi | undefined;
    return u ? u.i : -1;
  }

  private oyuncu(i: number): OyuncuS {
    return this.state.oyuncular.at(i)!;
  }
}
