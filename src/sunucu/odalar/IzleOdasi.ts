import { type AuthContext, type Client, Room, ServerError } from "colyseus";
import { IzleKatilmaSema, MESAJ, ODA_FAZI, type OlayPaketi, PROTOKOL_SURUMU, SEYIRCI_SINIRI } from "../../ag/protokol.ts";
import { kokenIzinli } from "../kimlik.ts";
import { type IzleGorunumu, type IzleHedefi, type SonMac, type Yayin, yayinBul } from "../izleKayit.ts";
import { IzleOyuncuSema, IzleSema, type IzleS } from "./sema.ts";
import { dunyayiYaz } from "./semaYaz.ts";

// D8 seyirci odası (ux § 5, `#izle=ABCDEFGH`): yayın başına tek oda, en çok SEYIRCI_SINIRI seyirci. Giriş yok
// (misafir serbest; yalnız Origin + sürüm + kod), seyircinin her mesajı yok sayılır (girdi şeması yok). Durum: maç
// odasının yansıması (dünya + adlar + takım kodları; oturum kimliği, ack, Altın, başarım YOK), yama elle ve maç odasının
// adımına hizalı (20 Hz), olaylar anında (hash'siz). Oda kodu yalnız bekleme fazında görünür.

/** onAuth (WebSocket kapanış kodu) hataları; onCreate (eşleştirme HTTP isteği) HTTP durum kodu kullanır. */
const HATA = { surum: 4101, koken: 4104, sema: 4105, yok: 4108 } as const;
const HTTP = { surum: 400, yok: 404, dolu: 409 } as const;

export class IzleOdasi extends Room<{ state: IzleS }> implements IzleHedefi {
  maxClients = SEYIRCI_SINIRI;
  state = new IzleSema();
  private yayin: Yayin | null = null;

  onAuth(_client: Client, options: unknown, context: AuthContext): { seyirci: true } {
    const koken = context.headers?.get?.("origin") ?? null;
    if (!kokenIzinli(koken)) throw new ServerError(HATA.koken, "koken");
    const o = options as { v?: unknown } | null;
    if (!o || o.v !== PROTOKOL_SURUMU) throw new ServerError(HATA.surum, "surum");
    const k = IzleKatilmaSema.safeParse(o);
    if (!k.success) throw new ServerError(HATA.sema, "sema");
    if (!yayinBul(k.data.kod)) throw new ServerError(HATA.yok, "yok");
    return { seyirci: true };
  }

  onCreate(options: unknown): void {
    if ((options as { v?: unknown } | null)?.v !== PROTOKOL_SURUMU) throw new ServerError(HTTP.surum, "surum");
    const k = IzleKatilmaSema.safeParse(options);
    const y = k.success ? yayinBul(k.data.kod) : null;
    if (!y) throw new ServerError(HTTP.yok, "yok");
    // yayın başına tek seyirci odası: dolu odanın yanına ikincisi açılmaz (sınır 50)
    if (y.hedef && y.hedef !== this) throw new ServerError(HTTP.dolu, "dolu");
    this.yayin = y;
    y.hedef = this;
    // özel DEĞİL: joinOrCreate {kod} süzgeciyle aynı odayı bulmalı (liste ucu yok; kod bilen girer)
    void this.setMetadata({ kod: y.kod });
    this.patchRate = null; // maç odasının adımıyla elle
    // seyircinin her mesajı yok sayılır (kontrol yok)
    this.onMessage("*", () => {});
    this.yansit(y.kaynak ? y.kaynak() : null, y.son);
    console.log(`[izle ${y.kod}] açıldı`);
  }

  onJoin(): void {
    this.state.seyirci = this.clients.length;
  }

  onLeave(): void {
    this.state.seyirci = this.clients.length;
  }

  onDispose(): void {
    if (this.yayin && this.yayin.hedef === this) this.yayin.hedef = null;
    console.log(`[izle ${this.yayin?.kod ?? "?"}] kapandı`);
  }

  /** Maç odasından (ya da yayın çözülünce null): durumu kopyala ve yamayı yolla. */
  yansit(g: IzleGorunumu | null, son: SonMac | null): void {
    const s = this.state;
    if (son) {
      s.sonVar = true;
      s.sonPuan0 = son.puan[0]; s.sonPuan1 = son.puan[1];
      s.sonAd0 = son.adlar[0]; s.sonAd1 = son.adlar[1];
      s.sonKazanan = son.kazanan;
    }
    if (!g) {
      s.faz = ODA_FAZI.bekliyor;
      s.kod = "";
      s.dunyaVar = false;
      s.kopan = -1;
      s.donma = 0;
    } else {
      s.faz = g.faz;
      s.kod = g.faz === ODA_FAZI.bekliyor ? g.kod : "";
      s.macNo = g.macNo;
      s.kopan = g.kopan;
      s.donma = g.donma;
      s.donmaKalan = g.donmaKalan;
      while (s.oyuncular.length < g.oyuncular.length) s.oyuncular.push(new IzleOyuncuSema());
      while (s.oyuncular.length > g.oyuncular.length) s.oyuncular.pop();
      g.oyuncular.forEach((p, i) => {
        const h = s.oyuncular.at(i)!;
        if (h.ad !== p.ad) h.ad = p.ad;
        if (h.takimId !== p.takimId) h.takimId = p.takimId;
        if (h.bagli !== p.bagli) h.bagli = p.bagli;
        if (h.bot !== p.bot) h.bot = p.bot;
        if (h.malzeme !== p.malzeme) h.malzeme = p.malzeme;
      });
      if (g.dunya) dunyayiYaz(s.dunya, g.dunya);
      s.dunyaVar = !!g.dunya;
    }
    this.broadcastPatch();
  }

  /** Maç olayları (hash alanları atılır: seyirci doğrulamaz, bant tasarrufu). */
  olaylar(paket: unknown): void {
    const p = paket as OlayPaketi;
    if (!p.o.length) return;
    this.broadcast(MESAJ.olaylar, { v: p.v, t: p.t, ms: p.ms, o: p.o } satisfies OlayPaketi);
  }
}
