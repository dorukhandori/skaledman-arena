import type { Database } from "better-sqlite3";

// SQLite şeması (axiom § 2 #19, sahip kararı 2026-11-04: Kick OAuth sona bırakıldı → ad + şifre). Göçler sırayla,
// `PRAGMA user_version` ile bir kez uygulanır; yalnız eklenir, eski göç değiştirilmez.
// Sapma (axiom'a göre): birincil anahtar `oyuncu.id` (otomatik artan); `kick_id` NULL ve tekil (ileride bağlanır);
// diğer tablolar `oyuncu_id` ile bağlanır. `takim` satırı bir yuvadır (`takim_no` + `sira`); boş yuva = ödünç.

export const GOCLER: readonly string[] = [
  // 1: D5 temel şema
  `
  CREATE TABLE oyuncu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kick_id TEXT UNIQUE,
    ad TEXT NOT NULL,
    ad_anahtar TEXT NOT NULL UNIQUE,
    sifre_hash TEXT NOT NULL,
    ad_degisti INTEGER NOT NULL,
    arma TEXT,
    renk TEXT,
    destek_kanali TEXT,
    elo INTEGER NOT NULL DEFAULT 1000,
    olusturma INTEGER NOT NULL
  );
  CREATE TABLE oturum (
    id TEXT PRIMARY KEY,
    oyuncu_id INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
    bitis INTEGER NOT NULL
  );
  CREATE INDEX oturum_oyuncu ON oturum(oyuncu_id);
  CREATE TABLE cekirdek (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    oyuncu_id INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
    tanim_id TEXT NOT NULL,
    seviye INTEGER NOT NULL,
    tecrube INTEGER NOT NULL,
    kararma INTEGER NOT NULL DEFAULT 0,
    omur INTEGER,
    yon TEXT NOT NULL DEFAULT 'sag'
  );
  CREATE INDEX cekirdek_oyuncu ON cekirdek(oyuncu_id);
  CREATE TABLE parca (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    oyuncu_id INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
    tanim_id TEXT NOT NULL,
    edinme INTEGER NOT NULL
  );
  CREATE INDEX parca_oyuncu ON parca(oyuncu_id);
  CREATE TABLE takim (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    oyuncu_id INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
    takim_no INTEGER NOT NULL,
    ad TEXT NOT NULL,
    sira INTEGER NOT NULL CHECK (sira BETWEEN 0 AND 2),
    cekirdek_id INTEGER REFERENCES cekirdek(id),
    govde_id INTEGER REFERENCES parca(id),
    disk_id INTEGER REFERENCES parca(id),
    uc_id INTEGER REFERENCES parca(id),
    odunc INTEGER NOT NULL DEFAULT 0,
    UNIQUE (oyuncu_id, takim_no, sira)
  );
  CREATE UNIQUE INDEX takim_cekirdek ON takim(takim_no, cekirdek_id) WHERE cekirdek_id IS NOT NULL;
  CREATE UNIQUE INDEX takim_govde ON takim(takim_no, govde_id) WHERE govde_id IS NOT NULL;
  CREATE UNIQUE INDEX takim_disk ON takim(takim_no, disk_id) WHERE disk_id IS NOT NULL;
  CREATE UNIQUE INDEX takim_uc ON takim(takim_no, uc_id) WHERE uc_id IS NOT NULL;
  CREATE TABLE altin_defteri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    oyuncu_id INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
    miktar INTEGER NOT NULL,
    neden TEXT NOT NULL,
    ref TEXT NOT NULL UNIQUE
  );
  CREATE TABLE basarim (
    oyuncu_id INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
    basarim_id TEXT NOT NULL,
    ilerleme INTEGER NOT NULL DEFAULT 0,
    tamam INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (oyuncu_id, basarim_id)
  );
  CREATE TABLE mac (
    id TEXT PRIMARY KEY,
    mod TEXT NOT NULL,
    a INTEGER,
    b INTEGER,
    kazanan INTEGER,
    puan TEXT NOT NULL,
    sure INTEGER NOT NULL,
    bitis_nedeni TEXT NOT NULL,
    katalog_ozeti TEXT NOT NULL,
    baslangic INTEGER NOT NULL,
    takim_a TEXT,
    takim_b TEXT
  );
  CREATE TABLE cekirdek_xp (
    mac_id TEXT NOT NULL REFERENCES mac(id),
    cekirdek_id INTEGER NOT NULL REFERENCES cekirdek(id) ON DELETE CASCADE,
    kazanc INTEGER NOT NULL,
    PRIMARY KEY (mac_id, cekirdek_id)
  );
  `,
  // 2: D6 Atölye: Çekirdek Günlüğü defteri, aktif takım, ad değişim sayacı, Çekirdek edinme zamanı
  `
  ALTER TABLE cekirdek ADD COLUMN mac_sayisi INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE cekirdek ADD COLUMN galibiyet INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE cekirdek ADD COLUMN kriz_galibiyet INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE cekirdek ADD COLUMN en_uzun_donus_sn INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE cekirdek ADD COLUMN edinme INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE oyuncu ADD COLUMN aktif_takim INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE oyuncu ADD COLUMN ad_degisim INTEGER NOT NULL DEFAULT 0;
  `,
  // 3: D7 ekonomi: Altın defteri zamanı (günlük sayaç ve rapor), başarım tamamlanma zamanı + küme sayaçları (farklı
  // Çekirdek / element / rakip / alan yeteneği), maç telemetrisi (B-40) ve gün anahtarı (04:00 sıfırlama, azalan getiri,
  // aynı çift günde 3 sınırı mac tablosundan sayılır)
  `
  ALTER TABLE altin_defteri ADD COLUMN zaman INTEGER NOT NULL DEFAULT 0;
  CREATE INDEX altin_oyuncu ON altin_defteri(oyuncu_id);
  ALTER TABLE basarim ADD COLUMN tamam_tarihi INTEGER;
  CREATE TABLE basarim_kume (
    oyuncu_id INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
    basarim_id TEXT NOT NULL,
    anahtar TEXT NOT NULL,
    PRIMARY KEY (oyuncu_id, basarim_id, anahtar)
  );
  ALTER TABLE mac ADD COLUMN gun INTEGER;
  ALTER TABLE mac ADD COLUMN bitis INTEGER;
  ALTER TABLE mac ADD COLUMN bot INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE mac ADD COLUMN bitis_turleri TEXT;
  ALTER TABLE mac ADD COLUMN yetenek_a TEXT;
  ALTER TABLE mac ADD COLUMN yetenek_b TEXT;
  ALTER TABLE mac ADD COLUMN altin_a INTEGER;
  ALTER TABLE mac ADD COLUMN altin_b INTEGER;
  CREATE INDEX mac_gun ON mac(gun);
  `,
  // 4 (D8): hesap silme (nile B-28). Silinen oyuncunun maç satırı kalır (rakibin geçmişi, telemetri) ama kimliği
  // NULL'a çekilir ve taraf "silinmiş" işaretlenir (rakip adı "Silinmiş oyuncu").
  `
  ALTER TABLE mac ADD COLUMN silinen_a INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE mac ADD COLUMN silinen_b INTEGER NOT NULL DEFAULT 0;
  CREATE INDEX mac_a ON mac(a);
  CREATE INDEX mac_b ON mac(b);
  `,
  // 5 (Harita / Maden / Ocak; docs/design/harita/08 § 3 + 12 § 10 + 13 § 4.1). Yalnız ekleme. Düğüm durumu:
  // 0 kilitli · 1 açık · 2 KEŞFET · 3 TEMİZLE · 4 USTALAŞ. Tecrübe ×100 tam sayı. Malzeme NULL = Market biçimi.
  `
  CREATE TABLE harita_dugum (
    oyuncu_id INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
    dugum_id TEXT NOT NULL,
    durum INTEGER NOT NULL CHECK (durum BETWEEN 0 AND 4),
    yildiz INTEGER NOT NULL DEFAULT 0,
    ilk_tamam INTEGER,
    basarili_vurus INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (oyuncu_id, dugum_id)
  );
  CREATE TABLE maden_gunluk (
    oyuncu_id INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
    gun INTEGER NOT NULL,
    dugum_id TEXT NOT NULL,
    vurus INTEGER NOT NULL DEFAULT 0,
    seri INTEGER NOT NULL DEFAULT 0,
    iska INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (oyuncu_id, gun, dugum_id)
  );
  CREATE TABLE maden_seans (
    id TEXT PRIMARY KEY,
    oyuncu_id INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
    dugum_id TEXT NOT NULL,
    gun INTEGER NOT NULL,
    baslangic INTEGER NOT NULL,
    vurus_bas INTEGER NOT NULL,
    faz_ms INTEGER NOT NULL,
    sira INTEGER NOT NULL DEFAULT 0,
    kapasite INTEGER NOT NULL,
    nadir_sira INTEGER,
    bitti INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX maden_seans_oyuncu ON maden_seans(oyuncu_id);
  CREATE TABLE maden_vurus (
    seans_id TEXT NOT NULL REFERENCES maden_seans(id) ON DELETE CASCADE,
    sira INTEGER NOT NULL,
    kademe INTEGER NOT NULL,
    basari INTEGER NOT NULL,
    isabet INTEGER NOT NULL,
    isabet_ms INTEGER,
    sunucu_ms INTEGER NOT NULL,
    verim INTEGER NOT NULL,
    tecrube INTEGER NOT NULL,
    zaman INTEGER NOT NULL,
    PRIMARY KEY (seans_id, sira)
  );
  CREATE INDEX maden_vurus_zaman ON maden_vurus(zaman);
  CREATE TABLE cevher (
    oyuncu_id INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
    kademe INTEGER NOT NULL CHECK (kademe BETWEEN 1 AND 8),
    cevher INTEGER NOT NULL DEFAULT 0 CHECK (cevher >= 0),
    kulce INTEGER NOT NULL DEFAULT 0 CHECK (kulce >= 0),
    PRIMARY KEY (oyuncu_id, kademe)
  );
  CREATE TABLE ustalik (
    oyuncu_id INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
    tur TEXT NOT NULL CHECK (tur IN ('madencilik', 'isleme')),
    tecrube_x100 INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (oyuncu_id, tur)
  );
  CREATE TABLE isleme_defteri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    oyuncu_id INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
    tur TEXT NOT NULL,
    tarif_id TEXT,
    girdi TEXT NOT NULL,
    cikti TEXT NOT NULL,
    usta INTEGER NOT NULL DEFAULT 0,
    ref TEXT NOT NULL UNIQUE,
    zaman INTEGER NOT NULL
  );
  CREATE INDEX isleme_oyuncu ON isleme_defteri(oyuncu_id);
  CREATE TABLE gorunum_sahip (
    oyuncu_id INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
    gorunum_id TEXT NOT NULL,
    usta INTEGER NOT NULL DEFAULT 0,
    edinme INTEGER NOT NULL,
    PRIMARY KEY (oyuncu_id, gorunum_id)
  );
  ALTER TABLE parca ADD COLUMN malzeme INTEGER;
  ALTER TABLE parca ADD COLUMN yapimci_id INTEGER;
  ALTER TABLE parca ADD COLUMN yapimci_ad TEXT;
  ALTER TABLE parca ADD COLUMN seri INTEGER;
  ALTER TABLE parca ADD COLUMN uretim INTEGER;
  ALTER TABLE parca ADD COLUMN usta INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE cekirdek ADD COLUMN malzeme INTEGER;
  ALTER TABLE cekirdek ADD COLUMN yapimci_id INTEGER;
  ALTER TABLE cekirdek ADD COLUMN yapimci_ad TEXT;
  ALTER TABLE cekirdek ADD COLUMN seri INTEGER;
  ALTER TABLE cekirdek ADD COLUMN uretim INTEGER;
  ALTER TABLE cekirdek ADD COLUMN usta INTEGER NOT NULL DEFAULT 0;
  CREATE TABLE seri_sayac (
    tanim_id TEXT NOT NULL,
    malzeme INTEGER NOT NULL,
    son INTEGER NOT NULL,
    PRIMARY KEY (tanim_id, malzeme)
  );
  ALTER TABLE oyuncu ADD COLUMN vitrin TEXT;
  ALTER TABLE oyuncu ADD COLUMN cerceve TEXT;
  ALTER TABLE oyuncu ADD COLUMN karakter INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE oyuncu ADD COLUMN harita_konum TEXT;
  ALTER TABLE mac ADD COLUMN dugum_id TEXT;
  ALTER TABLE mac ADD COLUMN yildiz INTEGER;
  CREATE INDEX mac_dugum ON mac(dugum_id);
  CREATE TABLE bolge_rozet (
    oyuncu_id INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
    bolge_id TEXT NOT NULL,
    rozet INTEGER NOT NULL CHECK (rozet BETWEEN 1 AND 3),
    zaman INTEGER NOT NULL,
    PRIMARY KEY (oyuncu_id, bolge_id)
  );
  `,
];

/** Göçleri uygula; dönen: uygulanan göç sayısı. */
export function gocleriUygula(db: Database): number {
  const surum = db.pragma("user_version", { simple: true }) as number;
  let n = 0;
  for (let k = surum; k < GOCLER.length; k++) {
    db.transaction(() => {
      db.exec(GOCLER[k]!);
      db.pragma(`user_version = ${k + 1}`);
    })();
    n++;
  }
  return n;
}
