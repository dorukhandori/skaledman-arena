import { randomInt, randomUUID } from "node:crypto";
import { DURUM, asamaHesapla, dugumBolgesi, dugumBul } from "../../paylasilan/kurallar/harita.ts";
import {
  USTA_DAMAR_VURUS, damarKapasitesi, dincMetni, gunlukCarpan, isabetGecerli, isabetPenceresi, nadirSira, vurusKademesi, vurusSonucu,
} from "../../paylasilan/kurallar/maden.ts";
import { gunNo } from "../../paylasilan/kurallar/ekonomi.ts";
import { bant, bantEtiketi, basariSansi, seviye, tecrubeEkle, ustalikGorunumu } from "../../paylasilan/kurallar/ustalik.ts";
import { USTALIK, kademeBul, type MadenDugumu } from "../../paylasilan/veri/harita.ts";
import type { Depo, SeansSatiri } from "../db/depo.ts";
import { asamaYaz, bosOlaylar, haritaHazirla, type HaritaOlaylari } from "./harita.ts";

// Kazı seansı (docs/design/harita/02, 08 § 6, 13 § 3): sunucu yetkili. İstemci yalnız "kaz" ve isabet zamanını
// (vuruş penceresinin başından kendi ölçtüğü ms) yollar; kademe, nadir yuva, zar, verim, tecrübe sunucuda.
// Zar `crypto.randomInt`, nadir yuva sunucu sırlı FNV tohumu (gün içinde sabit). Gün 04:00 TRT (`gunNo`).

/** Seans hareketsizlikte bu kadar sonra kapanır (A6). */
export const SEANS_OMRU_MS = 5 * 60_000;
/** Telemetri saklama (A7): 30 gün. */
export const TELEMETRI_GUN = 30;

/** Nadir yuva tohumu için sunucu sırrı (istemci bilmez). */
export function madenSirri(): string {
  return process.env.MADEN_SIRRI ?? process.env.OTURUM_SIRRI ?? "devran-maden";
}

/** Zar kaynağı (test enjekte eder). */
export type Zar = () => number;
export const cryptoZar: Zar = () => randomInt(0, 1_000_000) / 1_000_000;

/** Başarım olayları (H5): bu kazı işleminde biriken. */
export interface MadenOlaylari extends HaritaOlaylari {
  cevherKazildi: { kademe: number; adet: number }[];
  nadirDamar: number;
  isabetSerisi: number;
  ustalikSeviye: { madencilik?: number; isleme?: number };
}
export const bosMadenOlaylari = (): MadenOlaylari => ({ ...bosOlaylar(), cevherKazildi: [], nadirDamar: 0, isabetSerisi: 0, ustalikSeviye: {} });

function madenDugumu(id: string): MadenDugumu | null {
  const d = dugumBul(id);
  return d && d.tur === "maden" && dugumBolgesi(id)?.ilkSurum ? d : null;
}

function ustalikBilgisi(tecrubeX100: number, esik: number) {
  const u = ustalikGorunumu(tecrubeX100);
  return { seviye: u.seviye, ilerleme: u.ilerleme, tecrube: u.tecrube, sonraki: u.sonraki, bant: bantEtiketi(u.seviye - esik), basari: basariSansi(u.seviye, esik) };
}

export type BaslaSonucu =
  | {
    ok: true; seans: string; dugum: string; kademe: number; kalan: number; kapasite: number; ustaDamar: boolean;
    nadir: { sira: number; kademe: number; kazilabilir: boolean } | null;
    ustalik: ReturnType<typeof ustalikBilgisi>; halka: { periyotMs: number; pencere: [number, number]; fazMs: number };
    vurus: { bugun: number; tam: number; tavan: number; carpan: number; metin: string }; sira: number;
  }
  | { ok: false; hata: "kapali" | "yok" | "kilitli" | "uzak" | "ustalik" | "bitti"; gerekli?: number };

/** `POST /api/maden/basla`: açık seansı kapatır (tek seans), yenisini açar. */
export function madenBasla(d: Depo, id: number, dugumId: string, simdi: number): BaslaSonucu {
  return d.islem((): BaslaSonucu => {
    if (!haritaHazirla(d, id)) return { ok: false, hata: "kapali" };
    const dugum = madenDugumu(dugumId);
    if (!dugum) return { ok: false, hata: "yok" };
    const satir = d.dugumSatiri(id, dugumId);
    if ((satir?.durum ?? 0) < DURUM.acik) return { ok: false, hata: "kilitli" };
    if (d.oyuncu(id)?.harita_konum !== dugumId) return { ok: false, hata: "uzak" };
    const u = d.ustaliklar(id).madencilik;
    const U = seviye(u);
    const esik = kademeBul(dugum.kademe).esik;
    if (U < esik) return { ok: false, hata: "ustalik", gerekli: esik };
    const gun = gunNo(simdi);
    const usta = (satir?.durum ?? 0) >= DURUM.ustalas;
    const kap = damarKapasitesi(dugum, usta);
    const kullanilan = d.madenGunluk(id, gun, dugumId).vurus;
    if (kullanilan >= kap.kapasite) return { ok: false, hata: "bitti" };
    const nadir = nadirSira(madenSirri(), id, gun, dugumId, kap.nadirOlasilik, kap.kapasite);
    const fazMs = randomInt(0, USTALIK.isabet.periyotMs);
    const seans = randomUUID();
    d.seansAc({ id: seans, oyuncu_id: id, dugum_id: dugumId, gun, baslangic: simdi, vurus_bas: simdi, faz_ms: fazMs, sira: kullanilan, kapasite: kap.kapasite, nadir_sira: nadir });
    const bugun = d.madenGunluk(id, gun, "*").vurus;
    const nk = Math.min(dugum.nadir.kademe, 8);
    return {
      ok: true, seans, dugum: dugumId, kademe: dugum.kademe, kalan: kap.kapasite - kullanilan, kapasite: kap.kapasite, ustaDamar: usta,
      // nadir sıra geçmişte kaldıysa (bugün o vuruş atıldıysa) gösterilmez
      nadir: nadir !== null && nadir >= kullanilan ? { sira: nadir, kademe: nk, kazilabilir: U >= kademeBul(nk).esik } : null,
      ustalik: ustalikBilgisi(u, esik), halka: { periyotMs: USTALIK.isabet.periyotMs, pencere: isabetPenceresi(), fazMs },
      vurus: { bugun, tam: USTALIK.gunluk.vurusTam, tavan: USTALIK.gunluk.vurusYarim, carpan: gunlukCarpan(bugun).verim, metin: dincMetni(bugun) },
      sira: kullanilan,
    };
  });
}

export type KazSonucu =
  | {
    ok: true; basari: boolean; isabet: boolean; kademe: number; nadir: boolean; verim: number; tecrube: number;
    ustalik: ReturnType<typeof ustalikBilgisi> & { atladi: boolean }; kalan: number; sira: number;
    vurus: { bugun: number; carpan: number; metin: string }; halka: { fazMs: number }; asama: number; yeniAsama: boolean; ustaDamar: boolean;
    cevher: number[]; olaylar: MadenOlaylari;
  }
  | { ok: false; hata: "seans" | "bitti" | "sira" | "erken"; beklemeMs?: number };

function seansBul(d: Depo, id: number, seansId: string): SeansSatiri | null {
  const s = d.seans(seansId);
  return s && s.oyuncu_id === id ? s : null;
}

/** `POST /api/maden/kaz`: tek vuruş (TEK İŞLEM: cevher, Ustalık, günlük sayaç, telemetri, aşama, seans). */
export function madenKaz(d: Depo, id: number, g: { seans: string; sira: number; isabetMs: number | null; gecikmeMs?: number }, simdi: number, zar: Zar = cryptoZar): KazSonucu {
  return d.islem((): KazSonucu => {
    const s = seansBul(d, id, g.seans);
    if (!s) return { ok: false, hata: "seans" };
    if (s.bitti) return { ok: false, hata: "bitti" };
    if (simdi - s.vurus_bas > SEANS_OMRU_MS || gunNo(simdi) !== s.gun) { d.seansBitir(s.id); return { ok: false, hata: "bitti" }; }
    if (g.sira !== s.sira) return { ok: false, hata: "sira" };
    const gecen = simdi - s.vurus_bas;
    if (gecen < USTALIK.vurusAraligiMs) return { ok: false, hata: "erken", beklemeMs: USTALIK.vurusAraligiMs - gecen };
    const dugum = madenDugumu(s.dugum_id)!;
    const gunDugum = d.madenGunluk(id, s.gun, s.dugum_id);
    if (gunDugum.vurus >= s.kapasite) { d.seansBitir(s.id); return { ok: false, hata: "bitti" }; }
    const gunToplam = d.madenGunluk(id, s.gun, "*");
    const uOnce = d.ustaliklar(id).madencilik;
    const U = seviye(uOnce);
    const k = vurusKademesi(dugum, s.sira, s.nadir_sira, U);
    const isabet = isabetGecerli(g.isabetMs, gecen, s.faz_ms, USTALIK.isabet.toleransMs, g.gecikmeMs ?? 0);
    const r = vurusSonucu({ U, kademe: k.kademe, zar: zar(), isabet, toplamOnce: gunToplam.vurus, ardisikIska: gunToplam.iska });
    const olaylar = bosMadenOlaylari();
    if (r.verim > 0) {
      d.cevherEkle(id, k.kademe, r.verim);
      olaylar.cevherKazildi.push({ kademe: k.kademe, adet: r.verim });
      if (k.nadir) olaylar.nadirDamar++;
    }
    const uSonra = tecrubeEkle(uOnce, r.tecrubeX100);
    d.ustalikYaz(id, "madencilik", uSonra);
    const atladi = seviye(uSonra) > U;
    if (atladi) olaylar.ustalikSeviye.madencilik = seviye(uSonra);
    const seri = isabet ? gunToplam.seri + 1 : 0;
    olaylar.isabetSerisi = seri;
    d.madenGunlukYaz(id, s.gun, s.dugum_id, { vurus: gunDugum.vurus + 1, seri: 0, iska: 0 });
    d.madenGunlukYaz(id, s.gun, "*", { vurus: gunToplam.vurus + 1, seri, iska: r.basari ? 0 : gunToplam.iska + 1 });
    d.vurusYaz({
      seans_id: s.id, sira: s.sira, kademe: k.kademe, basari: r.basari ? 1 : 0, isabet: isabet ? 1 : 0, isabet_ms: g.isabetMs,
      sunucu_ms: gecen, verim: r.verim, tecrube: r.tecrubeX100, zaman: simdi,
    });
    // aşama: ilk başarılı vuruş TEMİZLE, 30 başarılı vuruş USTALAŞ (USTA DAMAR, 13 § 3)
    const satir = d.dugumSatiri(id, s.dugum_id)!;
    const basarili = satir.basarili_vurus + (r.basari ? 1 : 0);
    const yeni = asamaHesapla(dugum, satir.durum, { tur: "vurus", basariliToplam: basarili }, USTA_DAMAR_VURUS);
    const a = asamaYaz(d, id, dugum, yeni, simdi, olaylar, { basariliVurusEk: r.basari ? 1 : 0 });
    const siraSonra = s.sira + 1;
    const kalan = s.kapasite - (gunDugum.vurus + 1);
    const fazMs = randomInt(0, USTALIK.isabet.periyotMs);
    d.seansIlerle(s.id, siraSonra, simdi, fazMs);
    if (kalan <= 0) d.seansBitir(s.id);
    const bugun = gunToplam.vurus + 1;
    return {
      ok: true, basari: r.basari, isabet, kademe: k.kademe, nadir: k.nadir, verim: r.verim, tecrube: r.tecrubeX100 / 100,
      ustalik: { ...ustalikBilgisi(uSonra, kademeBul(dugum.kademe).esik), atladi }, kalan, sira: siraSonra,
      vurus: { bugun, carpan: gunlukCarpan(bugun).verim, metin: dincMetni(bugun) }, halka: { fazMs },
      asama: a.durum, yeniAsama: a.durum > a.onceki, ustaDamar: a.durum >= DURUM.ustalas, cevher: d.cevherler(id).cevher, olaylar,
    };
  });
}

/** `POST /api/maden/bitir` (idempotent): seans özeti. */
export function madenBitir(d: Depo, id: number, seansId: string): { ok: true; ozet: { cevher: Record<number, number>; tecrube: number; vurus: number } } | { ok: false; hata: "seans" } {
  return d.islem(() => {
    const s = seansBul(d, id, seansId);
    if (!s) return { ok: false as const, hata: "seans" as const };
    d.seansBitir(s.id);
    const cevher: Record<number, number> = {};
    let tecrube = 0;
    const v = d.seansVuruslari(s.id);
    for (const x of v) { if (x.verim > 0) cevher[x.kademe] = (cevher[x.kademe] ?? 0) + x.verim; tecrube += x.tecrube; }
    return { ok: true as const, ozet: { cevher, tecrube: tecrube / 100, vurus: v.length } };
  });
}

/** Bant ve başarı (Ustalık paneli; damar seçiliyken "BAŞARI %70 · ÖĞRETİR"). */
export function damarOnizleme(tecrubeX100: number, kademe: number) {
  const U = seviye(tecrubeX100);
  const E = kademeBul(kademe).esik;
  return { kademe, esik: E, basari: basariSansi(U, E), bant: bantEtiketi(U - E), carpan: bant(U - E) };
}
