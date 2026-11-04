import { mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { ILERLEME } from "../../paylasilan/kurallar/ilerleme.ts";
import { BASLANGIC_SETLERI, cekirdekBul } from "../../paylasilan/veri/katalog.ts";
import type { SahipUye } from "../oyuncu/kurallar.ts";
import { gocleriUygula } from "./sema.ts";

// Veri erişimi (better-sqlite3 YALNIZ src/sunucu/db/** içinde: eslint yalıtımı). Eşzamanlı API, hazırlanmış
// ifadeler; birden çok satırlık yazımlar tek işlemde (transaction). Kural hesapları burada değil (oyuncu/kurallar.ts,
// paylasilan/kurallar/ilerleme.ts); burası yalnız okur/yazar.

export interface OyuncuSatiri {
  id: number; kick_id: string | null; ad: string; ad_anahtar: string; sifre_hash: string; ad_degisti: number;
  arma: string | null; renk: string | null; destek_kanali: string | null; elo: number; olusturma: number;
}
export interface CekirdekSatiri { id: number; oyuncu_id: number; tanim_id: string; seviye: number; tecrube: number; kararma: number; omur: number | null; yon: string }
export interface TakimYuvasi extends SahipUye { cekirdekId: number; tecrube: number; omur: number | null }
export interface KayitliTakim { takimNo: number; ad: string; yuvalar: (TakimYuvasi | null)[] }

export interface MacSatiri {
  id: string; mod: string; a: number | null; b: number | null; kazanan: number | null; puan: string; sure: number;
  bitis_nedeni: string; katalog_ozeti: string; baslangic: number; takim_a: string | null; takim_b: string | null;
}
export interface XpYazimi { cekirdekId: number; kazanc: number; tecrube: number; seviye: number; omur: number | null }

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
      const cid = Number(this.db.prepare("INSERT INTO cekirdek (oyuncu_id, tanim_id, seviye, tecrube, kararma, omur, yon) VALUES (?, ?, ?, ?, 0, ?, 'sag')")
        .run(oyuncuId, set.cekirdek, seviye, ILERLEME.esikler[seviye - 1]!, omur).lastInsertRowid);
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
             g.tanim_id g_t, d.tanim_id d_t, u.tanim_id u_t
      FROM takim t
      LEFT JOIN cekirdek c ON c.id = t.cekirdek_id
      LEFT JOIN parca g ON g.id = t.govde_id
      LEFT JOIN parca d ON d.id = t.disk_id
      LEFT JOIN parca u ON u.id = t.uc_id
      WHERE t.oyuncu_id = ? ORDER BY t.takim_no, t.sira`).all(oyuncuId) as {
      takim_no: number; ad: string; sira: number; cid: number | null; c_t: string | null; seviye: number; tecrube: number; omur: number | null;
      yon: string; g_t: string | null; d_t: string | null; u_t: string | null;
    }[];
    const harita = new Map<number, KayitliTakim>();
    for (const s of satirlar) {
      let t = harita.get(s.takim_no);
      if (!t) { t = { takimNo: s.takim_no, ad: s.ad, yuvalar: [null, null, null] }; harita.set(s.takim_no, t); }
      if (s.cid !== null && s.c_t && s.g_t && s.d_t && s.u_t) {
        t.yuvalar[s.sira] = {
          cekirdekId: s.cid, cekirdek: s.c_t, govde: s.g_t, disk: s.d_t, uc: s.u_t, seviye: s.seviye, tecrube: s.tecrube,
          omur: s.omur, yon: s.yon === "sol" ? "sol" : "sag", devreDisi: s.omur !== null && s.omur <= 0,
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
      const r = this.db.prepare(`INSERT OR IGNORE INTO mac (id, mod, a, b, kazanan, puan, sure, bitis_nedeni, katalog_ozeti, baslangic, takim_a, takim_b)
        VALUES (@id, @mod, @a, @b, @kazanan, @puan, @sure, @bitis_nedeni, @katalog_ozeti, @baslangic, @takim_a, @takim_b)`).run(m);
      if (r.changes === 0) return false;
      const guncelle = this.db.prepare("UPDATE cekirdek SET tecrube = ?, seviye = ?, omur = ? WHERE id = ?");
      const gunluk = this.db.prepare("INSERT INTO cekirdek_xp (mac_id, cekirdek_id, kazanc) VALUES (?, ?, ?)");
      for (const x of xp) { guncelle.run(x.tecrube, x.seviye, x.omur, x.cekirdekId); gunluk.run(m.id, x.cekirdekId, x.kazanc); }
      return true;
    })();
  }

  mac(id: string): MacSatiri | null {
    return (this.db.prepare("SELECT * FROM mac WHERE id = ?").get(id) as MacSatiri | undefined) ?? null;
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
