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
