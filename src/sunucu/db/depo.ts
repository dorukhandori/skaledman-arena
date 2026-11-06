import { mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { ILERLEME, seviyeBul } from "../../paylasilan/kurallar/ilerleme.ts";
import type { TaslakTopac } from "../../paylasilan/kurallar/atolye.ts";
import { BASLANGIC_SETLERI, cekirdekBul, parcaBul } from "../../paylasilan/veri/katalog.ts";
import type { SahipUye } from "../oyuncu/kurallar.ts";
import { gocleriUygula } from "./sema.ts";

// Veri erişimi (better-sqlite3 YALNIZ src/sunucu/db/** içinde: eslint yalıtımı). Eşzamanlı API, hazırlanmış
// ifadeler; birden çok satırlık yazımlar tek işlemde (transaction). Kural hesapları burada değil (oyuncu/kurallar.ts,
// paylasilan/kurallar/ilerleme.ts); burası yalnız okur/yazar.

export interface OyuncuSatiri {
  id: number; kick_id: string | null; ad: string; ad_anahtar: string; sifre_hash: string; ad_degisti: number;
  arma: string | null; renk: string | null; destek_kanali: string | null; elo: number; olusturma: number;
  /** D6 */
  aktif_takim: number; ad_degisim: number;
  /** göç 5 (harita): vitrin JSON, profil çerçevesi, karakter gövdesi 0–3, haritadaki konum */
  vitrin?: string | null; cerceve?: string | null; karakter?: number; harita_konum?: string | null;
}
export interface CekirdekSatiri {
  id: number; oyuncu_id: number; tanim_id: string; seviye: number; tecrube: number; kararma: number; omur: number | null; yon: string;
  /** D6 Çekirdek Günlüğü defteri */
  mac_sayisi: number; galibiyet: number; kriz_galibiyet: number; en_uzun_donus_sn: number; edinme: number;
}
export interface ParcaSatiri {
  id: number; oyuncu_id: number; tanim_id: string; edinme: number;
  /** göç 5 (12 § 4): NULL = Market biçimi, 1–8 üretim kademesi; yapımcı imzası, seri, Usta işi */
  malzeme?: number | null; yapimci_id?: number | null; yapimci_ad?: string | null; seri?: number | null; uretim?: number | null; usta?: number;
}
export interface DugumSatiri { dugum_id: string; durum: number; yildiz: number; ilk_tamam: number | null; basarili_vurus: number }
export interface SeansSatiri {
  id: string; oyuncu_id: number; dugum_id: string; gun: number; baslangic: number; vurus_bas: number; faz_ms: number; sira: number;
  kapasite: number; nadir_sira: number | null; bitti: number;
}
export interface GunlukSatiri { vurus: number; seri: number; iska: number }
export interface IslemeSatiri { id: number; tur: string; tarif_id: string | null; girdi: string; cikti: string; usta: number; ref: string; zaman: number }
export interface TakimTaslagi { takimNo: number; ad: string; yuvalar: TaslakTopac[] }
export interface TakimYuvasi extends SahipUye {
  cekirdekId: number; tecrube: number; omur: number | null;
  /** göç 5: kozmetik malzeme [Çekirdek, Gövde, Disk, Uç] (0 = Market biçimi); sim'e girmez */
  malzeme?: [number, number, number, number];
}
export interface KayitliTakim { takimNo: number; ad: string; yuvalar: (TakimYuvasi | null)[] }

export interface MacSatiri {
  id: string; mod: string; a: number | null; b: number | null; kazanan: number | null; puan: string; sure: number;
  bitis_nedeni: string; katalog_ozeti: string; baslangic: number; takim_a: string | null; takim_b: string | null;
  /** D7 (göç 3): gün anahtarı (04:00), bitiş ms, bot maçı, telemetri (B-40), oyuncu başı Altın */
  gun?: number | null; bitis?: number | null; bot?: number; bitis_turleri?: string | null; yetenek_a?: string | null; yetenek_b?: string | null;
  altin_a?: number | null; altin_b?: number | null;
  /** D8 (göç 4): bu taraf hesabını sildi */
  silinen_a?: number; silinen_b?: number;
}
export interface DefterSatiri { id: number; oyuncu_id: number; miktar: number; neden: string; ref: string; zaman: number }
export interface BasarimSatiri { basarim_id: string; ilerleme: number; tamam: number; tamam_tarihi: number | null }
export interface XpYazimi {
  cekirdekId: number; kazanc: number; tecrube: number; seviye: number; omur: number | null;
  /** D6 defter artışları (maç sayıldıysa 1) */
  mac?: number; galibiyet?: number; krizGalibiyet?: number; donusSn?: number; kararma?: number;
}

export function veritabaniAc(yol: string): Database.Database {
  if (yol !== ":memory:") mkdirSync(join(yol, ".."), { recursive: true });
  const db = new Database(yol);
  if (yol !== ":memory:") db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 2000");
  gocleriUygula(db);
  return db;
}

export class Depo {
  constructor(readonly db: Database.Database) {}

  // ---- oyuncu ----
  /** Yeni oyuncu; ad alınmışsa null (ad_anahtar UNIQUE: büyük/küçük duyarsız). */
  oyuncuOlustur(o: { ad: string; adAnahtar: string; sifreHash: string; simdi: number }): number | null {
    try {
      const r = this.db.prepare("INSERT INTO oyuncu (ad, ad_anahtar, sifre_hash, ad_degisti, olusturma) VALUES (?, ?, ?, ?, ?)")
        .run(o.ad, o.adAnahtar, o.sifreHash, o.simdi, o.simdi);
      return Number(r.lastInsertRowid);
    } catch (e) {
      if (String((e as { code?: string }).code).startsWith("SQLITE_CONSTRAINT")) return null;
      throw e;
    }
  }

  oyuncuAdla(adAnahtar: string): OyuncuSatiri | null {
    return (this.db.prepare("SELECT * FROM oyuncu WHERE ad_anahtar = ?").get(adAnahtar) as OyuncuSatiri | undefined) ?? null;
  }

  oyuncu(id: number): OyuncuSatiri | null {
    return (this.db.prepare("SELECT * FROM oyuncu WHERE id = ?").get(id) as OyuncuSatiri | undefined) ?? null;
  }

  /** D6: ad değişimi (30 gün kuralı çağıranda). Ad alınmışsa false. */
  adDegistir(id: number, ad: string, adAnahtar: string, simdi: number): boolean {
    try {
      this.db.prepare("UPDATE oyuncu SET ad = ?, ad_anahtar = ?, ad_degisti = ?, ad_degisim = ad_degisim + 1 WHERE id = ?").run(ad, adAnahtar, simdi, id);
      return true;
    } catch (e) {
      if (String((e as { code?: string }).code).startsWith("SQLITE_CONSTRAINT")) return false;
      throw e;
    }
  }

  aktifTakimYaz(id: number, takimNo: number): void {
    this.db.prepare("UPDATE oyuncu SET aktif_takim = ? WHERE id = ?").run(takimNo, id);
  }

  profilKaydet(id: number, p: { arma: string; renk: string; destekKanali: string | null }): void {
    this.db.prepare("UPDATE oyuncu SET arma = ?, renk = ?, destek_kanali = ? WHERE id = ?").run(p.arma, p.renk, p.destekKanali, id);
  }

  // ---- oturum ----
  oturumAc(id: string, oyuncuId: number, bitis: number): void {
    this.db.prepare("INSERT INTO oturum (id, oyuncu_id, bitis) VALUES (?, ?, ?)").run(id, oyuncuId, bitis);
  }

  oturumOyuncusu(id: string, simdi: number): number | null {
    const r = this.db.prepare("SELECT oyuncu_id FROM oturum WHERE id = ? AND bitis > ?").get(id, simdi) as { oyuncu_id: number } | undefined;
    return r?.oyuncu_id ?? null;
  }

  oturumSil(id: string): void {
    this.db.prepare("DELETE FROM oturum WHERE id = ?").run(id);
  }

  eskiOturumlariSil(simdi: number): number {
    return this.db.prepare("DELETE FROM oturum WHERE bitis <= ?").run(simdi).changes;
  }

  // ---- çekirdek, parça, takım ----
  cekirdekler(oyuncuId: number): CekirdekSatiri[] {
    return this.db.prepare("SELECT * FROM cekirdek WHERE oyuncu_id = ? ORDER BY id").all(oyuncuId) as CekirdekSatiri[];
  }

  cekirdek(oyuncuId: number, id: number): CekirdekSatiri | null {
    return (this.db.prepare("SELECT * FROM cekirdek WHERE id = ? AND oyuncu_id = ?").get(id, oyuncuId) as CekirdekSatiri | undefined) ?? null;
  }

  parcalar(oyuncuId: number): ParcaSatiri[] {
    return this.db.prepare("SELECT * FROM parca WHERE oyuncu_id = ? ORDER BY id").all(oyuncuId) as ParcaSatiri[];
  }

  /** Yapay yön tercihi (yalnız çift yönlü Çekirdek; kural çağıranda). */
  yonYaz(oyuncuId: number, cekirdekId: number, yon: "sag" | "sol"): boolean {
    return this.db.prepare("UPDATE cekirdek SET yon = ? WHERE id = ? AND oyuncu_id = ?").run(yon, cekirdekId, oyuncuId).changes > 0;
  }

  /**
   * Envantere katalog parçası ver (D7: Market satın alımı bu yolu kullanır; geliştirme ucu da). Çekirdek ise
   * `cekirdek` satırı (Lv.1, 0 XP; Yapay ömür 30; yön katalogdan, çift yönlüde sağ), değilse `parca` satırı.
   */
  parcaVer(oyuncuId: number, tanimId: string, simdi: number): { tur: string; id: number } {
    const p = parcaBul(tanimId);
    if (p.tur === "cekirdek") {
      const omur = p.koken === "yapay" ? ILERLEME.yapayOmur : null;
      const yon = p.katki.yon === "sol" ? "sol" : "sag";
      const id = Number(this.db.prepare("INSERT INTO cekirdek (oyuncu_id, tanim_id, seviye, tecrube, kararma, omur, yon, edinme) VALUES (?, ?, 1, 0, 0, ?, ?, ?)")
        .run(oyuncuId, tanimId, omur, yon, simdi).lastInsertRowid);
      return { tur: "cekirdek", id };
    }
    const id = Number(this.db.prepare("INSERT INTO parca (oyuncu_id, tanim_id, edinme) VALUES (?, ?, ?)").run(oyuncuId, tanimId, simdi).lastInsertRowid);
    return { tur: p.tur, id };
  }

  /** Geliştirme: Çekirdeğe XP ekle (seviye eşiklerle, tavan Lv.3). */
  xpVer(oyuncuId: number, cekirdekId: number, xp: number): CekirdekSatiri | null {
    const c = this.cekirdek(oyuncuId, cekirdekId);
    if (!c) return null;
    const tecrube = Math.max(0, c.tecrube + Math.round(xp));
    const seviye = Math.max(c.seviye, seviyeBul(tecrube));
    this.db.prepare("UPDATE cekirdek SET tecrube = ?, seviye = ? WHERE id = ?").run(tecrube, seviye, cekirdekId);
    return this.cekirdek(oyuncuId, cekirdekId);
  }

  /** Kayıtlı takımların ham yuvaları (örnek kimlikleri; Atölye taslağı). */
  takimTaslaklari(oyuncuId: number): TakimTaslagi[] {
    const satirlar = this.db.prepare("SELECT takim_no, ad, sira, cekirdek_id, govde_id, disk_id, uc_id FROM takim WHERE oyuncu_id = ? ORDER BY takim_no, sira").all(oyuncuId) as {
      takim_no: number; ad: string; sira: number; cekirdek_id: number | null; govde_id: number | null; disk_id: number | null; uc_id: number | null;
    }[];
    const harita = new Map<number, TakimTaslagi>();
    for (const s of satirlar) {
      let t = harita.get(s.takim_no);
      if (!t) {
        t = { takimNo: s.takim_no, ad: s.ad, yuvalar: [0, 1, 2].map(() => ({ cekirdek: null, govde: null, disk: null, uc: null })) };
        harita.set(s.takim_no, t);
      }
      t.yuvalar[s.sira] = { cekirdek: s.cekirdek_id, govde: s.govde_id, disk: s.disk_id, uc: s.uc_id };
    }
    return [...harita.values()];
  }

  /** Takımı yaz (yuvalar tek işlemde yenilenir; doğrulama çağıranda: oyuncu/kurallar + paylasilan/kurallar/atolye). */
  takimYaz(oyuncuId: number, takimNo: number, ad: string, yuvalar: readonly TaslakTopac[]): void {
    this.db.transaction(() => {
      this.db.prepare("DELETE FROM takim WHERE oyuncu_id = ? AND takim_no = ?").run(oyuncuId, takimNo);
      const ekle = this.db.prepare("INSERT INTO takim (oyuncu_id, takim_no, ad, sira, cekirdek_id, govde_id, disk_id, uc_id, odunc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
      yuvalar.forEach((y, k) => ekle.run(oyuncuId, takimNo, ad, k, y.cekirdek, y.govde, y.disk, y.uc, y.cekirdek === null ? 1 : 0));
    })();
  }

  takimAdiYaz(oyuncuId: number, takimNo: number, ad: string): boolean {
    return this.db.prepare("UPDATE takim SET ad = ? WHERE oyuncu_id = ? AND takim_no = ?").run(ad, oyuncuId, takimNo).changes > 0;
  }

  /**
   * İlk Çekirdek (US-1.3): başlangıç seti → Çekirdek (Lv.2, 150 XP; Yapay ömür 30) + Gövde/Disk/Uç parçaları +
   * takım 0 (yuva 0 sahip olunan, yuva 1-2 ödünç). Oyuncunun zaten Çekirdeği varsa "var" (tek sefer).
   */
  ilkCekirdek(oyuncuId: number, setId: string, simdi: number): "tamam" | "var" | "set" {
    const set = BASLANGIC_SETLERI.find((s) => s.id === setId);
    if (!set) return "set";
    return this.db.transaction((): "tamam" | "var" => {
      const varMi = this.db.prepare("SELECT COUNT(*) n FROM cekirdek WHERE oyuncu_id = ?").get(oyuncuId) as { n: number };
      if (varMi.n > 0) return "var";
      const c = cekirdekBul(set.cekirdek);
      const seviye = set.cekirdekSeviyesi ?? ILERLEME.baslangicSeviye;
      const omur = c.koken === "yapay" ? ILERLEME.yapayOmur : null;
      const cid = Number(this.db.prepare("INSERT INTO cekirdek (oyuncu_id, tanim_id, seviye, tecrube, kararma, omur, yon, edinme) VALUES (?, ?, ?, ?, 0, ?, 'sag', ?)")
        .run(oyuncuId, set.cekirdek, seviye, ILERLEME.esikler[seviye - 1]!, omur, simdi).lastInsertRowid);
      const parca = this.db.prepare("INSERT INTO parca (oyuncu_id, tanim_id, edinme) VALUES (?, ?, ?)");
      const g = Number(parca.run(oyuncuId, set.govde, simdi).lastInsertRowid);
      const d = Number(parca.run(oyuncuId, set.disk, simdi).lastInsertRowid);
      const u = Number(parca.run(oyuncuId, set.uc, simdi).lastInsertRowid);
      const yuva = this.db.prepare("INSERT INTO takim (oyuncu_id, takim_no, ad, sira, cekirdek_id, govde_id, disk_id, uc_id, odunc) VALUES (?, 0, 'Takım 1', ?, ?, ?, ?, ?, ?)");
      yuva.run(oyuncuId, 0, cid, g, d, u, 0);
      yuva.run(oyuncuId, 1, null, null, null, null, 1);
      yuva.run(oyuncuId, 2, null, null, null, null, 1);
      return "tamam";
    })();
  }

  /** Kayıtlı takımlar; boş yuva null (ödünç sunucuda doldurulur). Ömrü biten Yapay `devreDisi`. */
  takimlar(oyuncuId: number): KayitliTakim[] {
    const satirlar = this.db.prepare(`
      SELECT t.takim_no, t.ad, t.sira, c.id cid, c.tanim_id c_t, c.seviye, c.tecrube, c.omur, c.yon,
             g.tanim_id g_t, d.tanim_id d_t, u.tanim_id u_t,
             COALESCE(c.malzeme, 0) c_m, COALESCE(g.malzeme, 0) g_m, COALESCE(d.malzeme, 0) d_m, COALESCE(u.malzeme, 0) u_m
      FROM takim t
      LEFT JOIN cekirdek c ON c.id = t.cekirdek_id
      LEFT JOIN parca g ON g.id = t.govde_id
      LEFT JOIN parca d ON d.id = t.disk_id
      LEFT JOIN parca u ON u.id = t.uc_id
      WHERE t.oyuncu_id = ? ORDER BY t.takim_no, t.sira`).all(oyuncuId) as {
      takim_no: number; ad: string; sira: number; cid: number | null; c_t: string | null; seviye: number; tecrube: number; omur: number | null;
      yon: string; g_t: string | null; d_t: string | null; u_t: string | null; c_m: number; g_m: number; d_m: number; u_m: number;
    }[];
    const harita = new Map<number, KayitliTakim>();
    for (const s of satirlar) {
      let t = harita.get(s.takim_no);
      if (!t) { t = { takimNo: s.takim_no, ad: s.ad, yuvalar: [null, null, null] }; harita.set(s.takim_no, t); }
      if (s.cid !== null && s.c_t && s.g_t && s.d_t && s.u_t) {
        t.yuvalar[s.sira] = {
          cekirdekId: s.cid, cekirdek: s.c_t, govde: s.g_t, disk: s.d_t, uc: s.u_t, seviye: s.seviye, tecrube: s.tecrube,
          omur: s.omur, yon: s.yon === "sol" ? "sol" : "sag", devreDisi: s.omur !== null && s.omur <= 0,
          malzeme: [s.c_m, s.g_m, s.d_m, s.u_m],
        };
      }
    }
    return [...harita.values()];
  }

  // ---- başarım ----
  /** Başarımı tamamla (idempotent). Dönen: bu çağrıda mı tamamlandı. */
  basarimTamamla(oyuncuId: number, basarimId: string): boolean {
    const r = this.db.prepare(`INSERT INTO basarim (oyuncu_id, basarim_id, ilerleme, tamam) VALUES (?, ?, 1, 1)
      ON CONFLICT (oyuncu_id, basarim_id) DO UPDATE SET ilerleme = MAX(ilerleme, 1), tamam = 1 WHERE tamam = 0`).run(oyuncuId, basarimId);
    return r.changes > 0;
  }

  basarimlar(oyuncuId: number): { basarim_id: string; ilerleme: number; tamam: number }[] {
    return this.db.prepare("SELECT basarim_id, ilerleme, tamam FROM basarim WHERE oyuncu_id = ? ORDER BY basarim_id").all(oyuncuId) as { basarim_id: string; ilerleme: number; tamam: number }[];
  }

  // ---- maç ----
  /** Maç satırı + Çekirdek XP/ömür tek işlemde; aynı maç kimliği ikinci kez yazılmaz (idempotent). Dönen: yazıldı mı. */
  macYaz(m: MacSatiri, xp: readonly XpYazimi[]): boolean {
    return this.db.transaction((): boolean => {
      const satir = { gun: null, bitis: null, bot: 0, bitis_turleri: null, yetenek_a: null, yetenek_b: null, altin_a: null, altin_b: null, ...m };
      const r = this.db.prepare(`INSERT OR IGNORE INTO mac (id, mod, a, b, kazanan, puan, sure, bitis_nedeni, katalog_ozeti, baslangic, takim_a, takim_b,
          gun, bitis, bot, bitis_turleri, yetenek_a, yetenek_b, altin_a, altin_b)
        VALUES (@id, @mod, @a, @b, @kazanan, @puan, @sure, @bitis_nedeni, @katalog_ozeti, @baslangic, @takim_a, @takim_b,
          @gun, @bitis, @bot, @bitis_turleri, @yetenek_a, @yetenek_b, @altin_a, @altin_b)`).run(satir);
      if (r.changes === 0) return false;
      const guncelle = this.db.prepare(`UPDATE cekirdek SET tecrube = ?, seviye = ?, omur = ?, mac_sayisi = mac_sayisi + ?, galibiyet = galibiyet + ?,
        kriz_galibiyet = kriz_galibiyet + ?, en_uzun_donus_sn = MAX(en_uzun_donus_sn, ?), kararma = kararma + ? WHERE id = ?`);
      const gunluk = this.db.prepare("INSERT INTO cekirdek_xp (mac_id, cekirdek_id, kazanc) VALUES (?, ?, ?)");
      for (const x of xp) {
        guncelle.run(x.tecrube, x.seviye, x.omur, x.mac ?? 0, x.galibiyet ?? 0, x.krizGalibiyet ?? 0, Math.round(x.donusSn ?? 0), x.kararma ?? 0, x.cekirdekId);
        gunluk.run(m.id, x.cekirdekId, x.kazanc);
      }
      return true;
    })();
  }

  /**
   * D8 hesap silme (nile B-28): oyuncunun tüm satırları tek işlemde silinir (oturum, takım, Çekirdek + XP günlüğü,
   * parça, Altın defteri, başarım, başarım kümesi, oyuncu); maç satırlarında kimliği NULL'a çekilir, taraf "silinmiş"
   * işaretlenir, kazanansa kazanan NULL olur (rakibin kaydı mağlubiyet olarak kalır). İdempotent: yoksa false.
   */
  hesapSil(id: number): boolean {
    return this.islem(() => {
      if (!this.oyuncu(id)) return false;
      const db = this.db;
      db.prepare("UPDATE mac SET kazanan = NULL WHERE kazanan = ?").run(id);
      db.prepare("UPDATE mac SET a = NULL, silinen_a = 1 WHERE a = ?").run(id);
      db.prepare("UPDATE mac SET b = NULL, silinen_b = 1 WHERE b = ?").run(id);
      db.prepare("DELETE FROM oturum WHERE oyuncu_id = ?").run(id);
      db.prepare("DELETE FROM takim WHERE oyuncu_id = ?").run(id);
      db.prepare("DELETE FROM cekirdek_xp WHERE cekirdek_id IN (SELECT id FROM cekirdek WHERE oyuncu_id = ?)").run(id);
      db.prepare("DELETE FROM cekirdek WHERE oyuncu_id = ?").run(id);
      db.prepare("DELETE FROM parca WHERE oyuncu_id = ?").run(id);
      db.prepare("DELETE FROM altin_defteri WHERE oyuncu_id = ?").run(id);
      db.prepare("DELETE FROM basarim WHERE oyuncu_id = ?").run(id);
      db.prepare("DELETE FROM basarim_kume WHERE oyuncu_id = ?").run(id);
      // göç 5 (harita/maden/Ocak; 08 § 3): açık DELETE deseni sürer (maden_vurus seansla cascade); seri_sayac kalır
      for (const t of ["harita_dugum", "maden_gunluk", "maden_seans", "cevher", "ustalik", "isleme_defteri", "gorunum_sahip", "bolge_rozet"]) {
        db.prepare(`DELETE FROM ${t} WHERE oyuncu_id = ?`).run(id);
      }
      db.prepare("DELETE FROM oyuncu WHERE id = ?").run(id);
      return true;
    });
  }

  /** D8: oyuncunun son maçları (en yeni önce). */
  sonMaclar(id: number, n = 20): MacSatiri[] {
    return this.db.prepare("SELECT * FROM mac WHERE a = ? OR b = ? ORDER BY baslangic DESC, rowid DESC LIMIT ?").all(id, id, n) as MacSatiri[];
  }

  /** TEMIZLIK #5: oyuncunun biten (iptal olmayan) maç sayısı (Pergel azalan sıklık). */
  bitenMacSayisi(id: number): number {
    return (this.db.prepare("SELECT COUNT(*) n FROM mac WHERE (a = ? OR b = ?) AND bitis_nedeni <> 'iptal'").get(id, id) as { n: number }).n;
  }

  mac(id: string): MacSatiri | null {
    return (this.db.prepare("SELECT * FROM mac WHERE id = ?").get(id) as MacSatiri | undefined) ?? null;
  }

  /** D7: maç satırına oyuncu başı Altın (telemetri; defter ayrıca `mac:<id>:<oyuncu>`). */
  macAltinYaz(id: string, a: number | null, b: number | null): void {
    this.db.prepare("UPDATE mac SET altin_a = ?, altin_b = ? WHERE id = ?").run(a, b, id);
  }

  // ---- D7: işlem, Altın defteri, başarım, günlük sayaç ----
  /** Tek SQLite işlemi (BEGIN IMMEDIATE: yazım kilidi baştan; iç içe çağrı savepoint olur). */
  islem<T>(f: () => T): T {
    return this.db.inTransaction ? this.db.transaction(f)() : this.db.transaction(f).immediate();
  }

  /** Bakiye = defter toplamı (axiom § 2 #20). */
  bakiye(oyuncuId: number): number {
    return (this.db.prepare("SELECT COALESCE(SUM(miktar), 0) t FROM altin_defteri WHERE oyuncu_id = ?").get(oyuncuId) as { t: number }).t;
  }

  /** Defter satırı; `ref` UNIQUE (idempotent). Dönen: yazıldı mı (aynı ref ikinci kez yazılmaz). */
  altinYaz(oyuncuId: number, miktar: number, neden: string, ref: string, zaman: number): boolean {
    return this.db.prepare("INSERT OR IGNORE INTO altin_defteri (oyuncu_id, miktar, neden, ref, zaman) VALUES (?, ?, ?, ?, ?)")
      .run(oyuncuId, Math.round(miktar), neden, ref, zaman).changes > 0;
  }

  defter(oyuncuId: number, limit = 50): DefterSatiri[] {
    return this.db.prepare("SELECT * FROM altin_defteri WHERE oyuncu_id = ? ORDER BY id DESC LIMIT ?").all(oyuncuId, limit) as DefterSatiri[];
  }

  defterRef(ref: string): DefterSatiri | null {
    return (this.db.prepare("SELECT * FROM altin_defteri WHERE ref = ?").get(ref) as DefterSatiri | undefined) ?? null;
  }

  basarimSatirlari(oyuncuId: number): BasarimSatiri[] {
    return this.db.prepare("SELECT basarim_id, ilerleme, tamam, tamam_tarihi FROM basarim WHERE oyuncu_id = ? ORDER BY basarim_id").all(oyuncuId) as BasarimSatiri[];
  }

  /** Başarım kayıtları + küme anahtarları (saf değerlendiricinin `mevcut` girdisi). */
  basarimKayitlari(oyuncuId: number): Record<string, { ilerleme: number; tamam: boolean; kume: string[] }> {
    const r: Record<string, { ilerleme: number; tamam: boolean; kume: string[] }> = {};
    for (const b of this.basarimSatirlari(oyuncuId)) r[b.basarim_id] = { ilerleme: b.ilerleme, tamam: b.tamam === 1, kume: [] };
    const kume = this.db.prepare("SELECT basarim_id, anahtar FROM basarim_kume WHERE oyuncu_id = ? ORDER BY basarim_id, anahtar").all(oyuncuId) as { basarim_id: string; anahtar: string }[];
    for (const k of kume) (r[k.basarim_id] ??= { ilerleme: 0, tamam: false, kume: [] }).kume.push(k.anahtar);
    return r;
  }

  /** Başarım ilerlemesi yaz (tamamlanan geri dönmez; tamam_tarihi ilk tamamlanışta). Dönen: bu çağrıda tamamlandı mı. */
  basarimYaz(oyuncuId: number, basarimId: string, ilerleme: number, tamam: boolean, zaman: number, kume: readonly string[] = []): boolean {
    const once = this.db.prepare("SELECT tamam FROM basarim WHERE oyuncu_id = ? AND basarim_id = ?").get(oyuncuId, basarimId) as { tamam: number } | undefined;
    if (once?.tamam === 1) return false;
    this.db.prepare(`INSERT INTO basarim (oyuncu_id, basarim_id, ilerleme, tamam, tamam_tarihi) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (oyuncu_id, basarim_id) DO UPDATE SET ilerleme = excluded.ilerleme, tamam = excluded.tamam, tamam_tarihi = excluded.tamam_tarihi`)
      .run(oyuncuId, basarimId, ilerleme, tamam ? 1 : 0, tamam ? zaman : null);
    const ekle = this.db.prepare("INSERT OR IGNORE INTO basarim_kume (oyuncu_id, basarim_id, anahtar) VALUES (?, ?, ?)");
    for (const k of kume) ekle.run(oyuncuId, basarimId, k);
    return tamam;
  }

  /** Bugün (gün anahtarı) oyuncunun sayılan maç sayısı (iptal hariç). */
  gunlukMacSayisi(oyuncuId: number, gun: number): number {
    return (this.db.prepare("SELECT COUNT(*) n FROM mac WHERE gun = ? AND (a = ? OR b = ?) AND bitis_nedeni <> 'iptal'").get(gun, oyuncuId, oyuncuId) as { n: number }).n;
  }

  gunlukGalibiyet(oyuncuId: number, gun: number): number {
    return (this.db.prepare("SELECT COUNT(*) n FROM mac WHERE gun = ? AND kazanan = ?").get(gun, oyuncuId) as { n: number }).n;
  }

  /** Bugün aynı iki hesap arasındaki maç sayısı (iptal hariç; flint § 5). */
  ciftGunluk(a: number, b: number, gun: number): number {
    return (this.db.prepare("SELECT COUNT(*) n FROM mac WHERE gun = ? AND ((a = ? AND b = ?) OR (a = ? AND b = ?)) AND bitis_nedeni <> 'iptal'").get(gun, a, b, b, a) as { n: number }).n;
  }

  /** Satın alınan parça/Çekirdek tek işlemde: bakiye denetimi çağıranda (aynı işlem içinde). */
  yapayYenile(oyuncuId: number, cekirdekId: number, omur: number): boolean {
    return this.db.prepare("UPDATE cekirdek SET omur = ? WHERE id = ? AND oyuncu_id = ? AND omur IS NOT NULL").run(omur, cekirdekId, oyuncuId).changes > 0;
  }

  /** Sahip olunan farklı katalog tanımı sayısı (Çekirdek + parça; Koleksiyoncu). */
  parcaCesidi(oyuncuId: number): number {
    return (this.db.prepare("SELECT COUNT(*) n FROM (SELECT tanim_id FROM cekirdek WHERE oyuncu_id = ? UNION SELECT tanim_id FROM parca WHERE oyuncu_id = ?)").get(oyuncuId, oyuncuId) as { n: number }).n;
  }

  // ---- göç 5: harita / maden / Ocak (docs/design/harita/08 § 3, 12 § 10, 13 § 4.1) ----
  dugumDurumlari(oyuncuId: number): DugumSatiri[] {
    return this.db.prepare("SELECT dugum_id, durum, yildiz, ilk_tamam, basarili_vurus FROM harita_dugum WHERE oyuncu_id = ? ORDER BY dugum_id").all(oyuncuId) as DugumSatiri[];
  }

  dugumSatiri(oyuncuId: number, dugumId: string): DugumSatiri | null {
    return (this.db.prepare("SELECT dugum_id, durum, yildiz, ilk_tamam, basarili_vurus FROM harita_dugum WHERE oyuncu_id = ? AND dugum_id = ?").get(oyuncuId, dugumId) as DugumSatiri | undefined) ?? null;
  }

  /** Düğüm yaz (upsert): durum yalnız yükselir, yıldız maskesi birleşir, ilk tamam ilk kez yazılır. */
  dugumYaz(oyuncuId: number, dugumId: string, d: { durum: number; yildiz?: number; ilkTamam?: number | null; basariliVurusEk?: number }): void {
    this.db.prepare(`INSERT INTO harita_dugum (oyuncu_id, dugum_id, durum, yildiz, ilk_tamam, basarili_vurus) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (oyuncu_id, dugum_id) DO UPDATE SET durum = MAX(durum, excluded.durum), yildiz = yildiz | excluded.yildiz,
        ilk_tamam = COALESCE(ilk_tamam, excluded.ilk_tamam), basarili_vurus = basarili_vurus + excluded.basarili_vurus`)
      .run(oyuncuId, dugumId, d.durum, d.yildiz ?? 0, d.ilkTamam ?? null, d.basariliVurusEk ?? 0);
  }

  haritaKonumYaz(oyuncuId: number, dugumId: string | null): void {
    this.db.prepare("UPDATE oyuncu SET harita_konum = ? WHERE id = ?").run(dugumId, oyuncuId);
  }

  karakterYaz(oyuncuId: number, karakter: number): void {
    this.db.prepare("UPDATE oyuncu SET karakter = ? WHERE id = ?").run(karakter, oyuncuId);
  }

  cerceveYaz(oyuncuId: number, cerceve: string | null): void {
    this.db.prepare("UPDATE oyuncu SET cerceve = ? WHERE id = ?").run(cerceve, oyuncuId);
  }

  armaYaz(oyuncuId: number, arma: string): void {
    this.db.prepare("UPDATE oyuncu SET arma = ? WHERE id = ?").run(arma, oyuncuId);
  }

  vitrinYaz(oyuncuId: number, vitrin: readonly string[]): void {
    this.db.prepare("UPDATE oyuncu SET vitrin = ? WHERE id = ?").run(JSON.stringify(vitrin), oyuncuId);
  }

  /** Cevher ve külçe (kademe 1–8 dizileri). */
  cevherler(oyuncuId: number): { cevher: number[]; kulce: number[] } {
    const cevher = [0, 0, 0, 0, 0, 0, 0, 0];
    const kulce = [0, 0, 0, 0, 0, 0, 0, 0];
    for (const r of this.db.prepare("SELECT kademe, cevher, kulce FROM cevher WHERE oyuncu_id = ?").all(oyuncuId) as { kademe: number; cevher: number; kulce: number }[]) {
      cevher[r.kademe - 1] = r.cevher;
      kulce[r.kademe - 1] = r.kulce;
    }
    return { cevher, kulce };
  }

  /** Cevher/külçe değiştir (CHECK eksiye düşürmez: yetersizse SQLite hatası; çağıran önce denetler). */
  cevherEkle(oyuncuId: number, kademe: number, cevher: number, kulce = 0): void {
    this.db.prepare(`INSERT INTO cevher (oyuncu_id, kademe, cevher, kulce) VALUES (?, ?, ?, ?)
      ON CONFLICT (oyuncu_id, kademe) DO UPDATE SET cevher = cevher + excluded.cevher, kulce = kulce + excluded.kulce`).run(oyuncuId, kademe, cevher, kulce);
  }

  /** Ustalık tecrübesi (×100). */
  ustaliklar(oyuncuId: number): { madencilik: number; isleme: number } {
    const r = { madencilik: 0, isleme: 0 };
    for (const x of this.db.prepare("SELECT tur, tecrube_x100 FROM ustalik WHERE oyuncu_id = ?").all(oyuncuId) as { tur: "madencilik" | "isleme"; tecrube_x100: number }[]) r[x.tur] = x.tecrube_x100;
    return r;
  }

  ustalikYaz(oyuncuId: number, tur: "madencilik" | "isleme", tecrubeX100: number): void {
    this.db.prepare(`INSERT INTO ustalik (oyuncu_id, tur, tecrube_x100) VALUES (?, ?, ?)
      ON CONFLICT (oyuncu_id, tur) DO UPDATE SET tecrube_x100 = excluded.tecrube_x100`).run(oyuncuId, tur, Math.max(0, Math.round(tecrubeX100)));
  }

  /** Günlük kazı satırı (dugum '*' = günün toplamı + isabet serisi + ardışık ıska). */
  madenGunluk(oyuncuId: number, gun: number, dugumId: string): GunlukSatiri {
    return (this.db.prepare("SELECT vurus, seri, iska FROM maden_gunluk WHERE oyuncu_id = ? AND gun = ? AND dugum_id = ?").get(oyuncuId, gun, dugumId) as GunlukSatiri | undefined) ?? { vurus: 0, seri: 0, iska: 0 };
  }

  madenGunlukYaz(oyuncuId: number, gun: number, dugumId: string, g: GunlukSatiri): void {
    this.db.prepare(`INSERT INTO maden_gunluk (oyuncu_id, gun, dugum_id, vurus, seri, iska) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (oyuncu_id, gun, dugum_id) DO UPDATE SET vurus = excluded.vurus, seri = excluded.seri, iska = excluded.iska`).run(oyuncuId, gun, dugumId, g.vurus, g.seri, g.iska);
  }

  /** Bugün düğüm başına atılan vuruş. */
  madenGunlukler(oyuncuId: number, gun: number): Record<string, number> {
    const r: Record<string, number> = {};
    for (const x of this.db.prepare("SELECT dugum_id, vurus FROM maden_gunluk WHERE oyuncu_id = ? AND gun = ?").all(oyuncuId, gun) as { dugum_id: string; vurus: number }[]) r[x.dugum_id] = x.vurus;
    return r;
  }

  seansAc(s: Omit<SeansSatiri, "bitti">): void {
    this.db.prepare("UPDATE maden_seans SET bitti = 1 WHERE oyuncu_id = ? AND bitti = 0").run(s.oyuncu_id);
    this.db.prepare(`INSERT INTO maden_seans (id, oyuncu_id, dugum_id, gun, baslangic, vurus_bas, faz_ms, sira, kapasite, nadir_sira, bitti)
      VALUES (@id, @oyuncu_id, @dugum_id, @gun, @baslangic, @vurus_bas, @faz_ms, @sira, @kapasite, @nadir_sira, 0)`).run(s);
  }

  seans(id: string): SeansSatiri | null {
    return (this.db.prepare("SELECT * FROM maden_seans WHERE id = ?").get(id) as SeansSatiri | undefined) ?? null;
  }

  acikSeans(oyuncuId: number): SeansSatiri | null {
    return (this.db.prepare("SELECT * FROM maden_seans WHERE oyuncu_id = ? AND bitti = 0 ORDER BY baslangic DESC LIMIT 1").get(oyuncuId) as SeansSatiri | undefined) ?? null;
  }

  seansIlerle(id: string, sira: number, vurusBas: number, fazMs: number): void {
    this.db.prepare("UPDATE maden_seans SET sira = ?, vurus_bas = ?, faz_ms = ? WHERE id = ?").run(sira, vurusBas, fazMs, id);
  }

  seansBitir(id: string): void {
    this.db.prepare("UPDATE maden_seans SET bitti = 1 WHERE id = ?").run(id);
  }

  vurusYaz(v: { seans_id: string; sira: number; kademe: number; basari: number; isabet: number; isabet_ms: number | null; sunucu_ms: number; verim: number; tecrube: number; zaman: number }): void {
    this.db.prepare(`INSERT OR IGNORE INTO maden_vurus (seans_id, sira, kademe, basari, isabet, isabet_ms, sunucu_ms, verim, tecrube, zaman)
      VALUES (@seans_id, @sira, @kademe, @basari, @isabet, @isabet_ms, @sunucu_ms, @verim, @tecrube, @zaman)`).run(v);
  }

  seansVuruslari(seansId: string): { kademe: number; basari: number; verim: number; tecrube: number }[] {
    return this.db.prepare("SELECT kademe, basari, verim, tecrube FROM maden_vurus WHERE seans_id = ? ORDER BY sira").all(seansId) as { kademe: number; basari: number; verim: number; tecrube: number }[];
  }

  /** Telemetri temizliği (A7): `oncesi` ms'den eski vuruş satırları ve biten seanslar. Dönen: silinen vuruş. */
  madenTelemetriTemizle(oncesi: number): number {
    const n = this.db.prepare("DELETE FROM maden_vurus WHERE zaman < ?").run(oncesi).changes;
    this.db.prepare("DELETE FROM maden_seans WHERE baslangic < ? AND id NOT IN (SELECT DISTINCT seans_id FROM maden_vurus)").run(oncesi);
    return n;
  }

  islemeRef(ref: string): IslemeSatiri | null {
    return (this.db.prepare("SELECT * FROM isleme_defteri WHERE ref = ?").get(ref) as IslemeSatiri | undefined) ?? null;
  }

  islemeYaz(oyuncuId: number, s: { tur: string; tarif_id: string | null; girdi: unknown; cikti: unknown; usta: boolean; ref: string; zaman: number }): void {
    this.db.prepare("INSERT INTO isleme_defteri (oyuncu_id, tur, tarif_id, girdi, cikti, usta, ref, zaman) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(oyuncuId, s.tur, s.tarif_id, JSON.stringify(s.girdi), JSON.stringify(s.cikti), s.usta ? 1 : 0, s.ref, s.zaman);
  }

  /** Son 7 gün (ms) eritmeyle üretilen külçe toplamı (Market "~N gün"). */
  sonKulceUretimi(oyuncuId: number, sonra: number): number {
    const satirlar = this.db.prepare("SELECT cikti FROM isleme_defteri WHERE oyuncu_id = ? AND tur = 'erit' AND zaman >= ?").all(oyuncuId, sonra) as { cikti: string }[];
    let t = 0;
    for (const s of satirlar) t += Number((JSON.parse(s.cikti) as { kulce?: number }).kulce ?? 0);
    return t;
  }

  gorunumler(oyuncuId: number): { gorunum_id: string; usta: number; edinme: number }[] {
    return this.db.prepare("SELECT gorunum_id, usta, edinme FROM gorunum_sahip WHERE oyuncu_id = ? ORDER BY edinme, gorunum_id").all(oyuncuId) as { gorunum_id: string; usta: number; edinme: number }[];
  }

  /** Görünüm ver (yeniden dövmede Usta işi yükselir, düşmez). Dönen: yeni mi. */
  gorunumVer(oyuncuId: number, gorunumId: string, usta: boolean, simdi: number): boolean {
    const once = this.db.prepare("SELECT usta FROM gorunum_sahip WHERE oyuncu_id = ? AND gorunum_id = ?").get(oyuncuId, gorunumId) as { usta: number } | undefined;
    this.db.prepare(`INSERT INTO gorunum_sahip (oyuncu_id, gorunum_id, usta, edinme) VALUES (?, ?, ?, ?)
      ON CONFLICT (oyuncu_id, gorunum_id) DO UPDATE SET usta = MAX(usta, excluded.usta)`).run(oyuncuId, gorunumId, usta ? 1 : 0, simdi);
    return !once;
  }

  /** (tanım, malzeme) başına sunucu geneli artan seri numarası (işlem içinde çağrılır; geri kullanılmaz). */
  sonrakiSeri(tanimId: string, malzeme: number): number {
    this.db.prepare(`INSERT INTO seri_sayac (tanim_id, malzeme, son) VALUES (?, ?, 1)
      ON CONFLICT (tanim_id, malzeme) DO UPDATE SET son = son + 1`).run(tanimId, malzeme);
    return (this.db.prepare("SELECT son FROM seri_sayac WHERE tanim_id = ? AND malzeme = ?").get(tanimId, malzeme) as { son: number }).son;
  }

  /** Üretilmiş parça/Çekirdek (12 § 4): malzeme, yapımcı imzası, seri, Usta işi. Çekirdek Lv.1, Yapay ömür 30. */
  uretilmisParcaVer(oyuncuId: number, tanimId: string, u: { malzeme: number; yapimciAd: string; seri: number; usta: boolean; simdi: number }): { tur: string; id: number } {
    const p = parcaBul(tanimId);
    if (p.tur === "cekirdek") {
      const omur = p.koken === "yapay" ? ILERLEME.yapayOmur : null;
      const yon = p.katki.yon === "sol" ? "sol" : "sag";
      const id = Number(this.db.prepare(`INSERT INTO cekirdek (oyuncu_id, tanim_id, seviye, tecrube, kararma, omur, yon, edinme, malzeme, yapimci_id, yapimci_ad, seri, uretim, usta)
        VALUES (?, ?, 1, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(oyuncuId, tanimId, omur, yon, u.simdi, u.malzeme, oyuncuId, u.yapimciAd, u.seri, u.simdi, u.usta ? 1 : 0).lastInsertRowid);
      return { tur: "cekirdek", id };
    }
    const id = Number(this.db.prepare(`INSERT INTO parca (oyuncu_id, tanim_id, edinme, malzeme, yapimci_id, yapimci_ad, seri, uretim, usta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(oyuncuId, tanimId, u.simdi, u.malzeme, oyuncuId, u.yapimciAd, u.seri, u.simdi, u.usta ? 1 : 0).lastInsertRowid);
    return { tur: p.tur, id };
  }

  /** Örneği sil (parça eritme; takımda olmadığı çağıranda denetlenir). */
  ornekSil(oyuncuId: number, tur: "parca" | "cekirdek", id: number): boolean {
    if (tur === "cekirdek") {
      this.db.prepare("DELETE FROM cekirdek_xp WHERE cekirdek_id = ?").run(id);
      return this.db.prepare("DELETE FROM cekirdek WHERE id = ? AND oyuncu_id = ?").run(id, oyuncuId).changes > 0;
    }
    return this.db.prepare("DELETE FROM parca WHERE id = ? AND oyuncu_id = ?").run(id, oyuncuId).changes > 0;
  }

  /** Örnek herhangi bir takım yuvasında mı. */
  takimdaMi(oyuncuId: number, tur: "parca" | "cekirdek", id: number): boolean {
    const r = (tur === "cekirdek"
      ? this.db.prepare("SELECT COUNT(*) n FROM takim WHERE oyuncu_id = ? AND cekirdek_id = ?").get(oyuncuId, id)
      : this.db.prepare("SELECT COUNT(*) n FROM takim WHERE oyuncu_id = ? AND (govde_id = ? OR disk_id = ? OR uc_id = ?)").get(oyuncuId, id, id, id)) as { n: number };
    return r.n > 0;
  }

  bolgeRozetleri(oyuncuId: number): Record<string, number> {
    const r: Record<string, number> = {};
    for (const x of this.db.prepare("SELECT bolge_id, rozet FROM bolge_rozet WHERE oyuncu_id = ?").all(oyuncuId) as { bolge_id: string; rozet: number }[]) r[x.bolge_id] = x.rozet;
    return r;
  }

  /** Rozet yaz (yalnız yükselir). Dönen: önceki rozet. */
  bolgeRozetYaz(oyuncuId: number, bolgeId: string, rozet: number, simdi: number): number {
    const once = (this.db.prepare("SELECT rozet FROM bolge_rozet WHERE oyuncu_id = ? AND bolge_id = ?").get(oyuncuId, bolgeId) as { rozet: number } | undefined)?.rozet ?? 0;
    if (rozet > once) {
      this.db.prepare(`INSERT INTO bolge_rozet (oyuncu_id, bolge_id, rozet, zaman) VALUES (?, ?, ?, ?)
        ON CONFLICT (oyuncu_id, bolge_id) DO UPDATE SET rozet = excluded.rozet, zaman = excluded.zaman`).run(oyuncuId, bolgeId, rozet, simdi);
    }
    return once;
  }

  /** Harita maçı satırına düğüm ve yıldız maskesi. */
  macHaritaYaz(macId: string, dugumId: string, yildiz: number | null): void {
    this.db.prepare("UPDATE mac SET dugum_id = ?, yildiz = ? WHERE id = ?").run(dugumId, yildiz, macId);
  }

  /** Bugünkü geçerli harita maçı sayısı (yıldız değerlendirilmiş: teslim/hükmen/iptal/kısa maç hariç). */
  gunlukHaritaMaci(oyuncuId: number, gun: number): number {
    return (this.db.prepare("SELECT COUNT(*) n FROM mac WHERE gun = ? AND mod = 'harita' AND a = ? AND yildiz IS NOT NULL").get(gun, oyuncuId) as { n: number }).n;
  }
}

// ---- süreç başına tek bağlantı (geliştirmede Vite modülleri yeniden yüklese de aynı bağlantı) ----
const g = globalThis as unknown as { __devranDepo?: Depo };

/** Veri dosyası: `VERI_DIZINI/devran.sqlite` (geliştirmede varsayılan `./.veri`). `:memory:` testler için. */
export function veriYolu(): string {
  const dizin = process.env.VERI_DIZINI ?? (process.env.NODE_ENV === "production" ? "" : join(process.cwd(), ".veri"));
  if (!dizin) throw new Error("VERI_DIZINI tanımlı değil (üretimde zorunlu).");
  return dizin === ":memory:" ? ":memory:" : join(dizin, "devran.sqlite");
}

export function depo(): Depo {
  g.__devranDepo ??= new Depo(veritabaniAc(veriYolu()));
  return g.__devranDepo;
}
