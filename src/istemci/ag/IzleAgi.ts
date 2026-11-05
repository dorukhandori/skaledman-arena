import { Client, type Room } from "@colyseus/sdk";
import { type DunyaGorunumu, type Dizi, f32, gorunumdenDunya } from "../../ag/durum.ts";
import { ARA_DEGER_GECIKMESI_MS, IZLE_ODA_ADI, MESAJ, ODA_FAZI, type OlayPaketi, PROTOKOL_SURUMU, SIM_HZ } from "../../ag/protokol.ts";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import type { TakimProfilleri } from "../../paylasilan/sim/Dunya.ts";
import { TOPAC_DURUM, type Dunya, type Olay, type Topac } from "../../paylasilan/sim/durum.ts";
import { topacKopyala } from "../../paylasilan/sim/tahmin.ts";
import { takimKurulumu } from "../../paylasilan/veri/takimlar.ts";
import { sunucuAdresi } from "./Baglanti.ts";

// D8 seyirci ağı (ux § 5): `izle` odasına girişsiz katılır, girdi YOLLAMAZ. İki topaç da sunucu anlık
// görüntülerinden 100 ms geriden ara değerlenir (rakip modeliyle aynı); geri kalan her şey son sunucu durumundan.
// Olaylar anında (efekt/HUD/ses). Bağlantı düşerse 3 sn arayla yeniden katılır (seyircinin koltuğu yok).

export interface IzleOyuncu { ad: string; takimId: string; bagli: boolean; bot: boolean }
export interface IzleDurumu {
  faz: number; kod: string; macNo: number; dunyaVar: boolean; seyirci: number; kopan: number; donma: number; donmaKalan: number;
  sonVar: boolean; sonPuan0: number; sonPuan1: number; sonAd0: string; sonAd1: string; sonKazanan: number;
  oyuncular: Dizi<IzleOyuncu>; dunya: DunyaGorunumu;
}

interface Anlik { tick: number; x: number; z: number; vx: number; vz: number; durum: number }

export type IzleHatasi = "yok" | "dolu" | "surum" | "bakim";

export class IzleAgi {
  private istemci: Client;
  oda: Room<unknown, IzleDurumu> | null = null;
  /** yayın kodu (çözülmüş) */
  kod = "";
  profiller: [TakimProfilleri, TakimProfilleri] | null = null;
  seviyeler: [readonly number[] | null, readonly number[] | null] = [null, null];
  sunucu: Dunya | null = null;
  macNo = -1;
  bagli = false;
  hata: IzleHatasi | null = null;
  private takimAnahtari = "";
  private anliklar: [Anlik[], Anlik[]] = [[], []];
  private tickOfset = Number.NaN;
  private olayKuyrugu: Olay[] = [];
  private kapali = false;
  /** ölçüm (test): alınan yama ve olay paketi sayısı */
  readonly olcum = { yama: 0, olayPaketi: 0, yenidenKatilma: 0 };

  constructor(adres = sunucuAdresi()) {
    this.istemci = new Client(adres);
  }

  get durum(): IzleDurumu | null { return this.oda?.state ?? null; }

  /** Oda ya da yayın kodu → yayın kodu (HTTP), sonra katıl. */
  async baglan(kod: string): Promise<void> {
    let cozulen: string;
    try {
      const r = await fetch(`/api/izle/${encodeURIComponent(kod)}`);
      const j = (await r.json()) as { durum: string; kod?: string };
      if (j.durum !== "var" || !j.kod) { this.hata = "yok"; throw new Error("yok"); }
      cozulen = j.kod;
    } catch (e) {
      if (this.hata) throw e;
      this.hata = "bakim";
      throw e;
    }
    this.kod = cozulen;
    await this.katil();
  }

  private async katil(): Promise<void> {
    try {
      const oda = (await this.istemci.joinOrCreate<IzleDurumu>(IZLE_ODA_ADI, { v: PROTOKOL_SURUMU, kod: this.kod })) as unknown as Room<unknown, IzleDurumu>;
      this.oda = oda;
      this.bagli = true;
      this.hata = null;
      oda.onStateChange((s) => this.yamaGeldi(s));
      oda.onMessage(MESAJ.olaylar, (p: OlayPaketi) => { this.olcum.olayPaketi++; for (const o of p.o) this.olayKuyrugu.push(o); });
      oda.onLeave(() => { this.bagli = false; if (!this.kapali) window.setTimeout(() => { this.olcum.yenidenKatilma++; void this.katil().catch(() => {}); }, 3000); });
      if (oda.state) this.yamaGeldi(oda.state);
    } catch (e) {
      const m = String((e as Error)?.message ?? e);
      this.hata = /dolu|full/.test(m) ? "dolu" : /surum/.test(m) ? "surum" : /yok/.test(m) ? "yok" : "bakim";
      if (this.hata === "bakim" && !this.kapali) window.setTimeout(() => { void this.katil().catch(() => {}); }, 3000);
      throw e;
    }
  }

  private yamaGeldi(s: IzleDurumu): void {
    if (!s || !s.oyuncular) return;
    this.olcum.yama++;
    if (!s.dunyaVar || s.oyuncular.length < 2 || s.faz === ODA_FAZI.bekliyor) return;
    const a = s.oyuncular.at(0)!;
    const b = s.oyuncular.at(1)!;
    const anahtar = `${s.macNo}:${a.takimId}:${b.takimId}`;
    if (anahtar !== this.takimAnahtari) {
      this.takimAnahtari = anahtar;
      const ka = takimKurulumu(a.takimId);
      const kb = takimKurulumu(b.takimId);
      this.profiller = [ka.profiller, kb.profiller];
      this.seviyeler = [ka.seviyeler, kb.seviyeler];
    }
    if (s.macNo !== this.macNo) { this.macNo = s.macNo; this.anliklar = [[], []]; this.olayKuyrugu = []; this.tickOfset = Number.NaN; }
    const d = gorunumdenDunya(s.dunya, this.profiller!, f32);
    this.sunucu = d;
    const simdi = performance.now();
    for (let i = 0; i < 2; i++) {
      const t = d.topaclar[i]!;
      const a = this.anliklar[i]!;
      a.push({ tick: d.tick, x: t.x, z: t.z, vx: t.vx, vz: t.vz, durum: t.durum });
      if (a.length > 40) a.shift();
    }
    const o = d.tick - (simdi * SIM_HZ) / 1000;
    if (Number.isNaN(this.tickOfset) || Math.abs(o - this.tickOfset) > 20) this.tickOfset = o;
    else this.tickOfset += 0.08 * (o - this.tickOfset);
  }

  /** Bir topacın 100 ms geriden ara değerli konumu (AgMaci rakip modeliyle aynı). */
  private konum(i: number, simdi: number): { x: number; z: number } | null {
    const a = this.anliklar[i]!;
    if (!a.length) return null;
    const hedef = (simdi * SIM_HZ) / 1000 + this.tickOfset - (ARA_DEGER_GECIKMESI_MS * SIM_HZ) / 1000;
    let k = a.length - 1;
    while (k > 0 && a[k]!.tick > hedef) k--;
    const p = a[k]!;
    const q = a[k + 1];
    if (!q) {
      const ileri = Math.min(3, Math.max(0, hedef - p.tick)) / SIM_HZ;
      return p.durum === TOPAC_DURUM.aktif ? { x: p.x + p.vx * ileri, z: p.z + p.vz * ileri } : { x: p.x, z: p.z };
    }
    const sicra = Math.abs(q.x - p.x) + Math.abs(q.z - p.z) > (AYAR.vMutlak * (q.tick - p.tick)) / SIM_HZ + 30;
    if (sicra || q.tick === p.tick) return hedef < q.tick ? { x: p.x, z: p.z } : { x: q.x, z: q.z };
    const u = Math.max(0, Math.min(1, (hedef - p.tick) / (q.tick - p.tick)));
    return { x: p.x + (q.x - p.x) * u, z: p.z + (q.z - p.z) * u };
  }

  /** Çizilecek dünya: son sunucu dünyası, iki topaç 100 ms geriden. */
  gorunum(): Dunya | null {
    const d = this.sunucu;
    if (!d) return null;
    const simdi = performance.now();
    const t: [Topac, Topac] = [topacKopyala(d.topaclar[0]!), topacKopyala(d.topaclar[1]!)];
    for (let i = 0; i < 2; i++) { const k = this.konum(i, simdi); if (k) { t[i]!.x = k.x; t[i]!.z = k.z; } }
    return { ...d, topaclar: t };
  }

  olaylariAl(): Olay[] {
    const c = this.olayKuyrugu;
    this.olayKuyrugu = [];
    return c;
  }

  birak(): void {
    this.kapali = true;
    void this.oda?.leave(true);
  }
}
