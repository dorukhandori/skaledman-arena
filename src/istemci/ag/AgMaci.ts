import { type DunyaGorunumu, type OdaGorunumu, type OyuncuGorunumu, f32, gorunumdenDunya } from "../../ag/durum.ts";
import {
  ARA_DEGER_GECIKMESI_MS, type BilgiMesaji, MESAJ, ODA_FAZI, type OlayPaketi, SIM_HZ, UZLASMA,
} from "../../ag/protokol.ts";
import { AYAR } from "../../paylasilan/kurallar/ayar.ts";
import type { TakimProfilleri } from "../../paylasilan/sim/Dunya.ts";
import { TOPAC_DURUM, type Dunya, type Olay, type Topac } from "../../paylasilan/sim/durum.ts";
import { EKSEN_OLCEGI, type Girdi, agAlanlarindanGirdi, tusMaskesi } from "../../paylasilan/sim/Girdi.ts";
import { dunyaHash } from "../../paylasilan/sim/hash.ts";
import { kendiAdimi, topacKopyala } from "../../paylasilan/sim/tahmin.ts";
import { aktifMi } from "../../paylasilan/sim/topac.ts";
import { takimProfilleriKimlikten } from "../../paylasilan/veri/takimlar.ts";
import type { AgOdasi, Baglanti } from "./Baglanti.ts";
import { kaydiOynat } from "../../ag/kayit.ts";
import { type RozetKarari, baglantiRozetiKarari } from "./baglantiRozeti.ts";

// Çevrimiçi maç kaynağı (tahmin modeli A, ADR-005, docs/tech/netcode.md § 5):
// - Kendi topacım: girdi tamponu + sunucu ack'inden yeniden oynatma (paylasilan/sim/tahmin.ts `kendiAdimi`).
//   Uzlaşma: < 0,5 br yok say (görsel konum korunur), 0,5-8 br yumuşak (4 adım eğri), 8-40 br büyük yumuşak (6 adım), > 40 br atlama; yakın zamanda
//   sunucu darbesi (çarpışma / yetenek isabeti) aldıysam büyük fark da yumuşak (6 adım: savrulma olarak okunur).
//   Hitstop sırasında düzeltme erimez (bitince uygulanır). Görsel efekt asla geri alınmaz.
// - Rakip: sunucu anlık görüntülerinden 100 ms geriden ara değer; rakibe karşı yalnız konumsal ayırma (içinden geçmez).
// - Her şey başka (stamina, tık, Enerji, yetenekler, faz, puan) son sunucu durumundan.
// - Hash: sunucu her 60 adımda `hw` yollar; aynı adımın yaması gelince istemci aldığı durumun hash'ini karşılaştırır.

interface Anlik { tick: number; x: number; z: number; vx: number; vz: number; durum: number }
interface TamponGirdisi { seq: number; g: Girdi }

/** Ölçüm sayaçları (netcode matrisi; debug HUD ve Playwright). */
export interface AgOlcumu {
  yamalar: number;
  hashKarsilastirma: number;
  hashSapma: number;
  hashSapmaListesi: { t: number; beklenen: string; bulunan: string }[];
  sunucuHashSon: string;
  /** buyuk = eşik (8 br) üstü tüm düzeltmeler; darbeYumusak + deneyYumusak + sicrama = buyuk */
  uzlasma: { yokSay: number; yumusak: number; buyuk: number; darbeYumusak: number; deneyYumusak: number; sicrama: number };
  /** görünür sıçrama: kare-kare görsel konum farkı beklenen hareketi 8 br'den fazla aşıyor */
  gorunurSicrama: number;
  carpismalar: number;
  /** carpisma olayı: işlenme (efekt tetiklenir) anı − sunucu gönderim anı (ms) */
  tepkiMs: number[];
  /** carpisma olayı: varış anı − sunucu gönderim anı (ms) */
  varisMs: number[];
  ayirma: number;
  yenidenOynatmaEnFazla: number;
  hayalet: number;
  /** saniyelik RTT örnekleri (ms) */
  rttOrnek: number[];
  kopma: number;
  yenidenBaglanma: number;
}

export class AgMaci {
  readonly oda: AgOdasi;
  yerel = 0;
  profiller: [TakimProfilleri, TakimProfilleri] | null = null;
  /** son sunucu dünyası (f32) */
  sunucu: Dunya | null = null;
  macNo = -1;
  private takimAnahtari = "";
  private seq = 0;
  private tampon: TamponGirdisi[] = [];
  private tahmin: Topac | null = null;
  private tahminTick = 0;
  private oncekiTahmin = { x: 0, z: 0 };
  private ofset: { x: number; z: number; kalan: number; adim: number } = { x: 0, z: 0, kalan: 0, adim: UZLASMA.yumusakAdim };
  private anliklar: Anlik[] = [];
  private tickOfset = Number.NaN;
  private bekleyenHash = new Map<number, { hw: string; h: string }>();
  private olayKuyrugu: { p: OlayPaketi; varis: number }[] = [];
  private sonDarbeMs = -1e9;
  private sonGorsel: { x: number; z: number; t: number } | null = null;
  private girdiTutamaci: { data: Record<string, number>; send(): number } | null = null;
  readonly olcum: AgOlcumu = {
    yamalar: 0, hashKarsilastirma: 0, hashSapma: 0, hashSapmaListesi: [], sunucuHashSon: "",
    uzlasma: { yokSay: 0, yumusak: 0, buyuk: 0, darbeYumusak: 0, deneyYumusak: 0, sicrama: 0 },
    gorunurSicrama: 0, carpismalar: 0, tepkiMs: [], varisMs: [], ayirma: 0, yenidenOynatmaEnFazla: 0, hayalet: 0, rttOrnek: [], kopma: 0, yenidenBaglanma: 0,
  };
  /** bağlantı durumu (H10 ve bantlar) */
  bagli = true;
  sonYamaMs = 0;
  /** son 5 sn'de yama boşluğu > 250 ms (kayıp belirtisi; WebSocket'te kayıp = gecikme) */
  private takilmaMs = -1e9;
  /** önceki yama maç fazında mıydı; maç fazındaki yama sayısı (H10 rozeti için yeterli ölçüm) */
  private oncekiMacta = false;
  private macYamasi = 0;
  readonly bilgiler: BilgiMesaji[] = [];
  private rttZamanlayici = 0;
  /**
   * DENEY (yalnız ?debug&sicramaDeney=N): 8 br < fark ≤ N da yumuşak (6 adım) düzeltilir; varsayılan kapalı (= 8,
   * flint § 2 eşiği). Rapor için ölçülür: daha yüksek atlama eşiğinin görünür sıçramaya etkisi.
   */
  private deneySicrama = (() => { const q = new URLSearchParams(location.search); return q.has("debug") ? Number(q.get("sicramaDeney") ?? UZLASMA.sicrama) : UZLASMA.sicrama; })();
  /** hata ayıklama: büyük düzeltmelerin bağlamı (ilk 200) */
  readonly buyukIz: Record<string, number | string>[] = [];
  private bilgiDinleyici = (b: BilgiMesaji) => { this.bilgiler.push(b); };
  private olayDinleyici = (p: OlayPaketi) => this.olayGeldi(p);
  private yamaDinleyici = (s: OdaGorunumu) => this.yamaGeldi(s);

  constructor(readonly baglanti: Baglanti) {
    this.oda = baglanti.oda!;
    baglanti.olayDinleyicileri.add(this.olayDinleyici);
    baglanti.bilgiDinleyicileri.add(this.bilgiDinleyici);
    this.oda.onStateChange(this.yamaDinleyici);
    this.oda.onDrop(() => { this.bagli = false; this.olcum.kopma++; });
    this.oda.onReconnect(() => { this.bagli = true; this.olcum.yenidenBaglanma++; this.yetis(); });
    this.oda.onLeave(() => { this.bagli = false; });
    this.rttZamanlayici = window.setInterval(() => { const r = this.rtt(); if (r > 0 && this.bagli) this.olcum.rttOrnek.push(r); }, 1000);
    if (this.oda.state) this.yamaGeldi(this.oda.state);
  }

  get durum(): OdaGorunumu { return this.oda.state; }
  get faz(): number { return this.durum?.faz ?? ODA_FAZI.bekliyor; }
  /** ilk tam durum geldi mi */
  get hazir(): boolean { return !!this.durum?.oyuncular; }
  oyuncu(i: number): OyuncuGorunumu | undefined { return this.durum?.oyuncular?.at(i); }

  /** Kendi indeksim (sessionId'den). */
  private indeksBul(s: OdaGorunumu): number {
    for (let i = 0; i < s.oyuncular.length; i++) if (s.oyuncular.at(i)?.oturum === this.oda.sessionId) return i;
    return 0;
  }

  private yamaGeldi(s: OdaGorunumu): void {
    if (!s || !s.oyuncular) return; // ilk tam durum henüz gelmedi
    const simdi = performance.now();
    // H-10 (MENU-P1A): takılma yalnız maç fazında ölçülür (seçim/bekleme fazında yama seyrek gelir: yanlış "kayıp")
    const macta = s.faz === ODA_FAZI.mac;
    if (macta && this.oncekiMacta && this.sonYamaMs && simdi - this.sonYamaMs > 250) this.takilmaMs = simdi;
    this.oncekiMacta = macta;
    if (macta) this.macYamasi++;
    this.sonYamaMs = simdi;
    this.olcum.yamalar++;
    this.yerel = this.indeksBul(s);
    if (!s.dunyaVar || s.oyuncular.length < 2) return;
    const anahtar = `${s.macNo}:${s.oyuncular.at(0)!.takimId}:${s.oyuncular.at(1)!.takimId}`;
    if (anahtar !== this.takimAnahtari) {
      this.takimAnahtari = anahtar;
      this.profiller = [takimProfilleriKimlikten(s.oyuncular.at(0)!.takimId), takimProfilleriKimlikten(s.oyuncular.at(1)!.takimId)];
    }
    if (s.macNo !== this.macNo) { this.macNo = s.macNo; this.sifirla(); }
    const d = gorunumdenDunya(s.dunya as DunyaGorunumu, this.profiller!, f32);
    this.sunucu = d;
    // hash (wire): bu adımın beklenen hash'i geldiyse karşılaştır
    const b = this.bekleyenHash.get(d.tick);
    if (b) {
      this.bekleyenHash.delete(d.tick);
      const h = dunyaHash(d);
      this.olcum.hashKarsilastirma++;
      this.olcum.sunucuHashSon = b.h;
      if (h !== b.hw) { this.olcum.hashSapma++; this.olcum.hashSapmaListesi.push({ t: d.tick, beklenen: b.hw, bulunan: h }); }
    }
    for (const k of this.bekleyenHash.keys()) if (k < d.tick) this.bekleyenHash.delete(k);
    // rakip anlık görüntüsü
    const r = d.topaclar[1 - this.yerel]!;
    this.anliklar.push({ tick: d.tick, x: r.x, z: r.z, vx: r.vx, vz: r.vz, durum: r.durum });
    if (this.anliklar.length > 40) this.anliklar.shift();
    const o = d.tick - (simdi * SIM_HZ) / 1000;
    if (Number.isNaN(this.tickOfset) || Math.abs(o - this.tickOfset) > 20) this.tickOfset = o;
    else this.tickOfset += 0.08 * (o - this.tickOfset);
    this.uzlas(d, s.oyuncular.at(this.yerel)!);
  }

  /** Sunucu durumu + ack → kendi topacımın yeni tahmini; eskiyle fark → yok say / yumuşak / atlama. */
  private uzlas(d: Dunya, ben: OyuncuGorunumu): void {
    const i = this.yerel;
    while (this.tampon.length && this.tampon[0]!.seq <= ben.ack) this.tampon.shift();
    const st = d.topaclar[i]!;
    if (d.mac.faz !== "tur" || !aktifMi(st)) { this.tahmin = null; this.ofset.kalan = 0; this.ofset.x = 0; this.ofset.z = 0; return; }
    const yeni = topacKopyala(st);
    let tick = d.tick;
    // Sunucu, girdim gecikince son girdiyi taşıyarak (BOSTA_TASIMA_ADIMI) ack'ten sonra (d.tick − ackTick) adım daha
    // ilerlemiş olabilir; o adımların girdileri gelince atlanır (sunucu borcu, zaman çizelgesi hizalı). Bu yüzden
    // yeniden oynatma ack + (d.tick − ackTick) sırasından başlar: sunucunun zaten simüle ettiği adımlar iki kez sayılmaz.
    const ilerde = ben.ackTick > 0 ? Math.max(0, d.tick - ben.ackTick) : 0;
    const bas = ben.ack + ilerde;
    let n = 0;
    for (const e of this.tampon) { if (e.seq <= bas) continue; kendiAdimi(d, i, yeni, e.g, ++tick); n++; }
    this.olcum.yenidenOynatmaEnFazla = Math.max(this.olcum.yenidenOynatmaEnFazla, n);
    const eski = this.tahmin;
    this.tahmin = yeni;
    this.tahminTick = tick;
    if (!eski) { this.oncekiTahmin = { x: yeni.x, z: yeni.z }; return; }
    const ex = eski.x - yeni.x;
    const ez = eski.z - yeni.z;
    const e = Math.sqrt(ex * ex + ez * ez);
    const u = this.olcum.uzlasma;
    const darbe = performance.now() - this.sonDarbeMs < 600;
    if (e < UZLASMA.yokSay) { u.yokSay++; this.ofsetEkle(ex, ez, UZLASMA.yumusakAdim); }
    else if (e <= UZLASMA.buyukEsik) { u.yumusak++; this.ofsetEkle(ex, ez, UZLASMA.yumusakAdim); }
    else if (e <= UZLASMA.sicrama) { u.buyuk++; u.deneyYumusak++; this.ofsetEkle(ex, ez, UZLASMA.buyukAdim); }
    else if (e <= this.deneySicrama) { u.buyuk++; u.deneyYumusak++; this.ofsetEkle(ex, ez, 6); }
    else {
      u.buyuk++;
      if (this.buyukIz.length < 200) {
        const rk = d.topaclar[1 - i]!;
        this.buyukIz.push({ e: Math.round(e), tampon: this.tampon.length, yf: st.yetenekFaz, kilit: st.kilitKalan, dash: st.dashKalan, v: Math.round(Math.sqrt(st.vx * st.vx + st.vz * st.vz)), rakip: Math.round(Math.sqrt((rk.x - st.x) ** 2 + (rk.z - st.z) ** 2)), darbeMs: Math.round(performance.now() - this.sonDarbeMs), kenar: Math.round(Math.sqrt(st.x * st.x + st.z * st.z)), ryf: rk.yetenekFaz, alan: d.alanlar.filter((a) => a).length, engel: d.engeller.length });
      }
      if (darbe) { u.darbeYumusak++; this.ofsetEkle(ex, ez, 6); }
      else { u.sicrama++; this.ofset.x = 0; this.ofset.z = 0; this.ofset.kalan = 0; }
    }
    this.oncekiTahmin = { x: this.oncekiTahmin.x - ex, z: this.oncekiTahmin.z - ez };
  }

  private ofsetEkle(ex: number, ez: number, adim: number): void {
    this.ofset.x += ex;
    this.ofset.z += ez;
    this.ofset.adim = adim;
    this.ofset.kalan = adim;
  }

  private olayGeldi(p: OlayPaketi): void {
    if (p.hw && p.h) this.bekleyenHash.set(p.t, { hw: p.hw, h: p.h });
    if (p.o.length) this.olayKuyrugu.push({ p, varis: performance.now() });
    for (const o of p.o) {
      if (o.tur === "carpisma") this.olcum.varisMs.push(Date.now() - p.ms);
      if ((o.tur === "carpisma") || (o.tur === "yetenekVurus" && o.hedef === this.yerel) || (o.tur === "zincir" && o.hedef === this.yerel)) this.sonDarbeMs = performance.now();
    }
  }

  /** Bekleyen sunucu olayları (Mac ekranı her kare çeker; efekt/HUD/ses buradan, anında). */
  olaylariAl(): Olay[] {
    const c: Olay[] = [];
    const simdi = Date.now();
    for (const { p } of this.olayKuyrugu) {
      for (const o of p.o) {
        if (o.tur === "carpisma") { this.olcum.carpismalar++; this.olcum.tepkiMs.push(simdi - p.ms); }
        c.push(o);
      }
    }
    this.olayKuyrugu = [];
    return c;
  }

  /** Yerel adım (60 Hz): girdiyi nicemle, gönder, tampona koy, kendi topacımı bir adım tahmin et. */
  yerelAdim(ham: Girdi, gorselDondu: boolean): void {
    if (this.faz !== ODA_FAZI.mac || !this.sunucu) return;
    const w = {
      yonX: Math.round(Math.max(-1, Math.min(1, ham.yonX)) * EKSEN_OLCEGI),
      yonZ: Math.round(Math.max(-1, Math.min(1, ham.yonZ)) * EKSEN_OLCEGI),
      nisanX: Math.round(Math.max(-32000, Math.min(32000, ham.nisanX))),
      nisanZ: Math.round(Math.max(-32000, Math.min(32000, ham.nisanZ))),
      yuva: Math.max(0, Math.min(3, ham.secilenYuva | 0)),
      tuslar: tusMaskesi(ham),
      degistir: ham.degistir >= 0 && ham.degistir <= 2 ? ham.degistir : -1,
    };
    this.girdiTutamaci ??= this.oda.input({ mode: "reliable" }) as unknown as { data: Record<string, number>; send(): number };
    const t = this.girdiTutamaci;
    this.seq++;
    t.data["seq"] = this.seq;
    for (const [k, v] of Object.entries(w)) t.data[k] = v;
    t.send();
    const g = agAlanlarindanGirdi(w);
    this.tampon.push({ seq: this.seq, g });
    if (this.tampon.length > 240) this.tampon.shift();
    if (this.tahmin) {
      this.oncekiTahmin = { x: this.tahmin.x, z: this.tahmin.z };
      if (kendiAdimi(this.sunucu, this.yerel, this.tahmin, g, ++this.tahminTick)) { /* tahmin ilerledi */ }
    }
    if (!gorselDondu && this.ofset.kalan > 0) {
      // eğri: kalan farkın 1/kalan'ı her adım (doğrusal-azalan → yumuşak durma)
      const k = 1 / this.ofset.kalan;
      this.ofset.x -= this.ofset.x * k;
      this.ofset.z -= this.ofset.z * k;
      this.ofset.kalan--;
    }
  }

  /** Arka plandan dönüş / yeniden bağlanma: tampon ve tahmin atılır, tam durumdan yetişilir. */
  yetis(): void {
    this.tampon = [];
    this.tahmin = null;
    this.ofset = { x: 0, z: 0, kalan: 0, adim: UZLASMA.yumusakAdim };
    this.anliklar = [];
    this.tickOfset = Number.NaN;
    this.sonGorsel = null;
    if (this.oda.state) this.yamaGeldi(this.oda.state);
  }

  private sifirla(): void {
    this.tampon = [];
    this.tahmin = null;
    this.anliklar = [];
    this.bekleyenHash.clear();
    this.olayKuyrugu = [];
    this.sonGorsel = null;
  }

  /** Rakibin ara değerli konumu (100 ms geriden). */
  private rakipKonumu(simdi: number): { x: number; z: number } | null {
    const a = this.anliklar;
    if (!a.length) return null;
    const hedef = (simdi * SIM_HZ) / 1000 + this.tickOfset - (ARA_DEGER_GECIKMESI_MS * SIM_HZ) / 1000;
    let k = a.length - 1;
    while (k > 0 && a[k]!.tick > hedef) k--;
    const p = a[k]!;
    const q = a[k + 1];
    if (!q) {
      // en yeniden ileride: en çok 3 adım hızla ileri (kısa boşluk), sonra bekle
      const ileri = Math.min(3, Math.max(0, hedef - p.tick)) / SIM_HZ;
      return p.durum === TOPAC_DURUM.aktif ? { x: p.x + p.vx * ileri, z: p.z + p.vz * ileri } : { x: p.x, z: p.z };
    }
    const sicra = Math.abs(q.x - p.x) + Math.abs(q.z - p.z) > (AYAR.vMutlak * (q.tick - p.tick)) / SIM_HZ + 30;
    if (sicra || q.tick === p.tick) return hedef < q.tick ? { x: p.x, z: p.z } : { x: q.x, z: q.z };
    const u = Math.max(0, Math.min(1, (hedef - p.tick) / (q.tick - p.tick)));
    return { x: p.x + (q.x - p.x) * u, z: p.z + (q.z - p.z) * u };
  }

  /**
   * Çizilecek dünya: son sunucu dünyası, kendi topacım tahminden (+ yumuşatma ofseti, adım içi ara değer `alfa`),
   * rakip 100 ms geriden. Rakibe karşı yalnız konumsal ayırma. Dönen dünya her çağrıda yeni (topaç kopyaları).
   */
  gorunum(alfa: number): Dunya | null {
    const d = this.sunucu;
    if (!d) return null;
    const simdi = performance.now();
    const t: [Topac, Topac] = [topacKopyala(d.topaclar[0]!), topacKopyala(d.topaclar[1]!)];
    const ben = t[this.yerel]!;
    const rk = t[1 - this.yerel]!;
    if (this.tahmin) {
      const x = this.oncekiTahmin.x + (this.tahmin.x - this.oncekiTahmin.x) * alfa + this.ofset.x;
      const z = this.oncekiTahmin.z + (this.tahmin.z - this.oncekiTahmin.z) * alfa + this.ofset.z;
      Object.assign(ben, { x, z, vx: this.tahmin.vx, vz: this.tahmin.vz, dashKalan: this.tahmin.dashKalan, sekmeKalan: this.tahmin.sekmeKalan, sikiDonus: this.tahmin.sikiDonus });
    }
    const rp = this.rakipKonumu(simdi);
    if (rp) { rk.x = rp.x; rk.z = rp.z; }
    // konumsal ayırma (yalnız görsel; hız değişmez): iki aktif topaç iç içe çizilmez
    if (aktifMi(ben) && aktifMi(rk) && ben.sekmeKalan === 0 && rk.sekmeKalan === 0) {
      const dx = ben.x - rk.x;
      const dz = ben.z - rk.z;
      const m = Math.sqrt(dx * dx + dz * dz);
      const en = 2 * AYAR.topacYaricap;
      if (m < en && m > 1e-6) { ben.x = rk.x + (dx / m) * en; ben.z = rk.z + (dz / m) * en; this.olcum.ayirma++; }
    }
    // görünür sıçrama ölçümü (kendi topacım, aktifken)
    if (aktifMi(ben) && d.mac.faz === "tur") {
      const s = this.sonGorsel;
      if (s) {
        const gecen = Math.max(1e-3, (simdi - s.t) / 1000);
        const fark = Math.sqrt((ben.x - s.x) * (ben.x - s.x) + (ben.z - s.z) * (ben.z - s.z));
        if (fark > AYAR.vMutlak * gecen + UZLASMA.sicrama) this.olcum.gorunurSicrama++;
      }
      this.sonGorsel = { x: ben.x, z: ben.z, t: simdi };
    } else this.sonGorsel = null;
    return { ...d, topaclar: t };
  }

  /** RTT (ms): SDK saatinin yumuşatılmış girdi-ack RTT'si; yoksa ping ortalaması. */
  rtt(): number {
    let c = 0;
    try { c = (this.oda as unknown as { clock?: { smoothedRtt?: () => number } }).clock?.smoothedRtt?.() ?? 0; } catch { c = 0; }
    return Math.round(Math.max(c, this.baglanti.ortalamaRtt));
  }

  /** H10: gecikme > 150 ms ya da son 5 sn'de maç içi takılma (kayıp belirtisi); bot maçında ve ölçüm azken gizli. */
  baglantiRozeti(): RozetKarari {
    return baglantiRozetiKarari({
      ms: this.rtt(),
      rakipBot: !!this.oyuncu(1 - this.yerel)?.bot,
      rttOrnek: this.olcum.rttOrnek.length,
      macYamasi: this.macYamasi,
      takilmadanBeri: performance.now() - this.takilmaMs,
    });
  }

  /**
   * Sunucu-tarayıcı determinizm sınaması (flint § 2 madde 6; yalnız geliştirme sunucusu yanıtlar): sunucunun maç
   * kaydını (kurulum + tükettiği girdiler + sim dışı eylemler) iste, bu tarayıcıda paylaşılan sim'le yeniden oynat,
   * her 60 adımın ve son durumun hash'ini sunucununkiyle karşılaştır.
   */
  async kayitDogrula(): Promise<{ adim: number; karsilastirma: number; sapma: number; sonEsit: boolean; sonHash: string; sunucuSonHash: string; ms: number }> {
    const k = await this.baglanti.kayitIste();
    const t0 = performance.now();
    const r = kaydiOynat(k);
    let sapma = 0;
    const sunucu = new Map(k.hashler.map((x) => [x.t, x.h]));
    for (const x of r.hashler) if (sunucu.get(x.t) !== x.h) sapma++;
    return { adim: r.sonTick, karsilastirma: r.hashler.length, sapma, sonEsit: r.sonHash === k.sonHash, sonHash: r.sonHash, sunucuSonHash: k.sonHash, ms: performance.now() - t0 };
  }

  gonder(tur: (typeof MESAJ)[keyof typeof MESAJ], ek: Record<string, unknown> = {}): void { this.baglanti.gonder(tur, ek); }

  birak(): void {
    window.clearInterval(this.rttZamanlayici);
    this.baglanti.olayDinleyicileri.delete(this.olayDinleyici);
    this.baglanti.bilgiDinleyicileri.delete(this.bilgiDinleyici);
  }
}
