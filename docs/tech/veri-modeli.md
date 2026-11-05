# Devran: veri modeli

`[@axiom · Technical Director]` · 2026-11-06 · Kaynak: `src/paylasilan/veri/semalar.ts` (zod), `src/paylasilan/veri/katalog.ts`,
`src/ag/katalog.ts`, `src/sunucu/db/sema.ts`, `src/paylasilan/sim/durum.ts`, `src/paylasilan/veri/profil.ts`, `veri/*.json`.
Sayılar 2026-11-06'da dosyalardan sayıldı. Alanların anlamı ve değerleri `docs/design/tuning.md`'dedir (veri dosyalarında yorum yok);
bu belge yalnız biçimi ve ilişkileri anlatır. Mimari: [mimari.md](mimari.md).

## 1. Statik katalog: `veri/*.json`

Oyun verisi bizimdir, çalışma anında dışarıdan hiçbir şey çekilmez. Sim'i etkileyen dört dosya (`parcalar`, `ruhlar`,
`yetenekler`, `basarimlar`) `katalog.ts`'te zod ile **bir kez** doğrulanır, istemci ve sunucu aynısını paketler. Bilinmeyen alan
atılır, zorunlu alan eksikse yükleme patlar. Sıra dosya sırasıdır (deterministik).
`KATALOG_OZETI` (`src/ag/katalog.ts`) = `parcalar + ruhlar + yetenekler` JSON'ları + `AYAR`, `ELEMENT_EGILIM`, `KOKEN_PASIF`
üzerinden FNV-1a 64; katılmada uyuşmazlık → ret 4102. `basarimlar.json` özete girmez (sim'i etkilemez).

Ortak sözlükler: `ElementSema` = `kor · kasirga · simsek · girdap · kaya · don`; `KokenSema` = `goktasi · maden · yapay ·
karanlik`; `TipSema` = `saldirgan · kale · dayanikli · denge`; `YonSema` = `sag · sol · cift`; `DesenSema` = `cicek · merkezci ·
cakili · dengeli · kusak`; `KatmanSema` = `baslangic · standart · nadir · hizip · karanlik`; `GorunumSema` = `acik ·
kilitli-gorunur · gizli`.

### 1a. `parcalar.json` (`ParcalarDosyaSema`, `surum: 1`)
- `parcalar[]`: **27** parça, `tur` ile ayrışan birleşim: `govde` 8, `disk` 5, `uc` 6, `cekirdek` 8. Katman dağılımı
  baslangic 12 · standart 3 · nadir 4 · hizip 6 · karanlik 2.
- Ortak alanlar (`ParcaTaban`): `id, ad, tipEgilimi, katki, katman, fiyat (≥ 0), kilit, gorunum, set (null|set id), aciklama,
  gimmick?`.
  - `katki`: `kutle, saldiri, savunma, staminaHavuzu, erime, desen (null|Desen), burstEsik, yon (null|Yon)`.
  - `gimmick?` (hepsi isteğe bağlı): `geriTepmeCarpani, vurusItmeCarpani, tikCarpani, izEfekti, kusakHizCarpani,
    kararmaCarpani, krizEnerjiCarpani, baslangicYavasligi`.
- Türe özel: `govde` → `element, kanat (1-8)`; `disk` → `element: null, yukseklik`; `uc` → `element: null, uc {ivme, vSurus,
  surtunme, esneklik (0-1), kCakilma, dashMaliyet, sikiDonusCarpani, ringOutHizi}`; `cekirdek` → `element, koken, ruh`.
- `baslangicSetleri[]`: 3 set `{id, ad, cekirdek, govde, disk, uc, cekirdekSeviyesi}`: `goktasi`, `maden`, `yapay`, hepsi Lv.2.
- İlişki: `cekirdek.ruh` → `ruhlar[].id` (8/8 eşleşiyor). Çekirdekler: `kor-goktasi, kaya-maden, kasirga-yapay,
  simsek-goktasi, girdap-maden, sabir-tasi, kor-kalbi, kul-cekirdegi` (son ikisi göktaşı/karanlık köken).

### 1b. `ruhlar.json` (`RuhlarDosyaSema`, `surum: 1`)
- **21** ruh: `id, ad, element, koken, tipEgilimi, kisilik, yetenek, yetenekAilesi, ozelYetenek, ulti (null|id), ata, unvan?`.
  6'sı `ata: true` (`unvan` yalnız Ata'da, ör. "Alaz Bizonu"); 21'inin de `ulti`'si dolu.
- İlişki: `yetenek` ve `ulti` → `yetenekler[].id` (hepsi eşleşiyor).

### 1c. `yetenekler.json` (`YeteneklerDosyaSema`, `surum: 1`)
- **29** yetenek: `id, ad, kademe (1-4), element, tur (hucum · savunma · alan · sayac), tipUyumu, telegrafSn, sureSn,
  beklemeSn, enerjiDilimi (tam sayı ≥ 0), etki, bedel {staminaYuzde, kilitSn, kendiHizCarpani, ek}, kaynak, eksikTamamlama,
  ilkSurum`.
- Kademe dağılımı 1: 8 · 2: 14 · 3: 6 · 4: 1. `element` altı element + `karanlik`, `yapay`, `uc-element` (Takım Ultisi);
  dağılım kor 5, don 5, kaya 5, kasirga 4, girdap 4, simsek 3, karanlik 1, yapay 1, uc-element 1.
- `etki` (`EtkiSema`): zorunlu `hizCarpani (0-5), itme (±1000), hasarKatsayisi (0-5), yaricap (0-400)`; aralıklı isteğe
  bağlılar `cekim, atilisHizi, kbCarpani, hasarAlmaCarpani, surtunmeCarpani, ivmeCarpani, yanKaymaItme, alanHasarYuzdeSn,
  staminaEmisYuzdeSn, emisYuzde, zincirSayisi, zincirStaminaYuzde, engelSayisi, engelYaricap, engelDayanikliligi,
  karsiPencereSn, kavisYaricap, kendineDeEtki`; ayrıca yeteneğe özel serbest anahtarlar (sayı ya da bayrak, `catchall`).

### 1d. `basarimlar.json` (`BasarimlarDosyaSema`, `surum: 1`)
- **46** başarım: `id, ad, kategori, sart {olay, sayi (> 0), kosul (anahtar → sayı|dize|bayrak|dizi)}, odulAltin, acilanParcalar[],
  acilanGorunum[], acilanOzellik[], gizli, ilkSurum`. 9'u gizli.
- Kategoriler: yol 8 · bitis 7 · element 8 · risk 5 · gosteri 5 · kararma 3 · sosyal 3 · yapay 3 · gizli 4.
- İlişki: `acilanParcalar[]` → `parcalar[].id` (hepsi eşleşiyor). İşleyen: `kurallar/basarim.ts` `basarimIsle`.

### 1e. `ipuclari.json` (`IpuclariDosyaSema`, Pergel)
- **12** ipucu: `id (a-z0-9-, ≤ 40), kosul (ilk-ziyaret · takim-eksik · odunc · ruh-ozel · ulti-kilit · ulti-acik · ring-out ·
  element-cark · zitlik · lab · market-acildi · stamina), ifade (anlatiyor · aslinda · sevinc), metin (≤ 160), oncelik
  (küçük = önce), otomatik, hedef (odunc-yuva · yuva · lab | null)`. Yalnız istemci okur (`src/istemci/bilgic/ipuclari.ts`).

### 1f. Görsel, ses ve yardımcı dosyalar (sim dışı, özete girmez; zod şeması yok)
- `topac-gorsel.json`: sprite atlas metası, `araclar/sanat/topac-uret.ts` üretir (elle düzenlenmez). `kamera, periyotKare,
  diskKare, zSirasi [uc, disk, govde, cekirdek], bicimB[18], parcalar{<parcaId>: {tur, simetri, periyotDerece, yonler, sayfa,
  boyalar, satir, ustZ, disYaricap, bayt}}, ikon`.
- `topac-model.json`: Atölye 3B GLB listesi `glb[18]` (`public/topac/model/<parcaId>.glb`); listede olmayan parça parametrik
  çizilir. Sözleşme `docs/production/raporlar/ATOLYE3D.md` § 6.
- `manifest-gorsel.json` (`dosyalar[29]`, atlas, kamera) ve `manifest-ses.json` (`dosyalar[16]`, her biri `ad, dosya, olay,
  sureSn, bayt, kaynak, lisans`): kredi ve lisans denetimi kaynağı (`src/paylasilan/krediler.ts`, `npm run krediler:uret`).
- `yasak-sozcukler.json`: ad filtresi `icerir[21], kelime[19], onek[8]` (sunucu `oyuncu/kurallar.ts`).
- `spritecollab-tracker.json`: Pokémon çağı kalıntısı, koda bağlı değil, git'te yok (bkz. mimari.md § 2).

### 1g. Kodda duran veri
- `src/paylasilan/veri/takimlar.ts`: 3 başlangıç takımı (`takim-1…3`, her biri 3 `TopacSecimi {cekirdek, govde, disk, uc}`) ve
  **takım kodu**: üye başına `cekirdek:govde:disk:uc:seviye:odunc:yon`, üyeler `|` ile (`takimKoduYaz/Coz`). Kodu yalnız sunucu
  üretir; istemci parça listesi göndermez.
- `TopacProfili` (`profil.ts`, `topacProfiliKur(cekirdek, govde, disk, uc)`): `id, parcalar, parametreler, donus, tip, element,
  koken, govdeElement, kanat, maxStamina, sim, yetenekler, uyumCarpani, krizEnerji, krizTelegraf, girisYavas, yon?`.

## 2. SQLite (`src/sunucu/db/sema.ts`, `better-sqlite3`)

Dosya `VERI_DIZINI/devran.sqlite` (geliştirmede `./.veri/`). Göçler `PRAGMA user_version` ile sırayla, bir kez, yalnız eklenerek
(4 göç; güncel sürüm 4). Erişim yalnız `src/sunucu/db/depo.ts` üzerinden (ESLint yalıtımı).

| Tablo | Sütunlar (göç) | Anahtar / ilişki |
|---|---|---|
| `oyuncu` | `id, kick_id, ad, ad_anahtar, sifre_hash, ad_degisti, arma, renk, destek_kanali, elo (1000), olusturma` (1); `aktif_takim, ad_degisim` (2) | `id` PK otomatik; `kick_id` UNIQUE NULL (Kick bağlanırsa); `ad_anahtar` UNIQUE (Türkçe küçük harf) |
| `oturum` | `id, oyuncu_id, bitis` | → `oyuncu` CASCADE |
| `cekirdek` | `id, oyuncu_id, tanim_id, seviye, tecrube, kararma, omur (NULL = sınırsız), yon` (1); `mac_sayisi, galibiyet, kriz_galibiyet, en_uzun_donus_sn, edinme` (2) | `tanim_id` → `parcalar.json` çekirdek kimliği (FK değil) |
| `parca` | `id, oyuncu_id, tanim_id, edinme` | Gövde/Disk/Uç örneği; `tanim_id` → katalog |
| `takim` | `id, oyuncu_id, takim_no, ad, sira (0-2), cekirdek_id, govde_id, disk_id, uc_id, odunc` | satır = bir yuva; UNIQUE `(oyuncu_id, takim_no, sira)`; kısmi UNIQUE `(takim_no, <parça>_id)` dolu yuvalarda |
| `altin_defteri` | `id, oyuncu_id, miktar, neden, ref` (1); `zaman` (3) | `ref` UNIQUE (idempotentlik); bakiye = `SUM(miktar)`, ayrı sütun yok |
| `basarim` | `oyuncu_id, basarim_id, ilerleme, tamam` (1); `tamam_tarihi` (3) | PK `(oyuncu_id, basarim_id)`; `basarim_id` → `basarimlar.json` |
| `basarim_kume` | `oyuncu_id, basarim_id, anahtar` (3) | PK üçü; "farklı X" sayaçları |
| `mac` | `id (uuid), mod, a, b, kazanan, puan, sure, bitis_nedeni, katalog_ozeti, baslangic, takim_a, takim_b` (1); `gun, bitis, bot, bitis_turleri (JSON), yetenek_a/b (JSON), altin_a/b` (3); `silinen_a, silinen_b` (4) | `a`, `b`, `kazanan` oyuncu kimliği (FK yok; hesap silinince NULL + `silinen_*` = 1); indeks `mac_gun, mac_a, mac_b` |
| `cekirdek_xp` | `mac_id, cekirdek_id, kazanc` | PK `(mac_id, cekirdek_id)`; → `mac`, → `cekirdek` CASCADE |

Kurallar: maç sonu yazımı tek işlemde ve `mac.id` ile idempotent; hesap silme tek işlemde (`Depo.hesapSil`). Ayrıntı ve uçlar:
[backend.md](backend.md) § 4, § 8, § 9.

## 3. Paylaşılan sim durumu (`src/paylasilan/sim/durum.ts`)

- `Dunya`: `tick, tohum, profiller[2], topaclar[2], temasKilidi, mac, arenaYaricap, takimlar ([2] | null), olaylar[]`; D3
  `alanlar[2], engeller[], ultiKullanildi[2], ultiKilit, yakinGecisBekleme, kararma[2], seviye[2], sonYetenek[2],
  yetenekSayisi[2][3]`; D8 `takimEnerji[2], takimUltiKullanildi[2]`.
- `Topac` (39 alan, hepsi `TOPAC_ALANLARI` ile hash'e girer): konum/hız `x, z, vx, vz`; `stamina, tik, enerji, durum`
  (`TOPAC_DURUM` aktif 0 · ringOut 1 · parcalandi 2 · durma 3); hareket sayaçları `dashKalan, dashBekleme, sekmeKalan,
  sekmeBekleme, sikiDonus, sonumKalan, desenFaz, koruma, geriCekKalan, sahadaTick`; yetenek `bekleme1, bekleme2, yapayIndirim,
  yetenekNo, yetenekYuva, etkinNo, etkiOlcek, yetenekFaz, yetenekKalan, yetenekDx/Dz/Hx/Hz, telegrafToplam, kilitKalan,
  sersemKalan, vurdu, kavisIsaret, zincirKalan, zincirBekleme, emisBekleme`.
- `MacDurumu`: `mod (tekTur · mac), faz (geriSayim · tur · turArasi · turBitti · bitti), kalanTick, kutlamaKalan, saat,
  aniOlum, aniOlumTick, turNo, puan[2], sonuc (TurSonucu), macSonucu {kazanan, neden, puan, tick}`.
- `Takim`: `uyeler[3] (TakimUyesi: profil, stamina, tik, enerji, elendi, bekleme1/2, yapayIndirim, seviye?), aktif,
  geriCekHedef, geriCekBekleme, secim, elenen`. `Alan`: `no, olcek, sahip, x, z, yaricap, kalan, toplam, isaret`.
  `Engel`: `x, z, r, can, sahip, kalan`.
- `Olay.tur` (24): `carpisma, duvar, dash, sekme, durma, ringOut, parcalandi, kontra, zincir, engelCarpma, geriCek, degisim,
  secim, enerjiDoldu, takimEnerjiDoldu, yetenekBasladi, yetenekBitti, yetenekEtki, yetenekVurus, yetenekReddi, turBasladi,
  turBitti, aniOlum, macBitti`. Olaylar hash dışıdır; sunucu her adım sonunda yollar.
- `Girdi` (`sim/Girdi.ts`): `TUS = {atesle 1, dash 2, zipla 4, dinlen 8, dusus 16}`, `EKSEN_OLCEGI = 127`; wire biçimi
  `GirdiSema {seq, yonX, yonZ, nisanX, nisanZ, yuva, tuslar, degistir}` (netcode.md § 6); sunucu `girdiTemizle` ile kırpar.
- Wire eşlemesi (alan → f32/u16/u8…): `src/ag/durum.ts`, netcode.md § 4.
