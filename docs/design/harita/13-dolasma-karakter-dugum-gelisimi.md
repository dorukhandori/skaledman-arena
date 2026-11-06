# 13 · Haritada dolaşma, oyuncu karakteri, hareket ve düğüm gelişimi

**Tarih:** 2026-11-06 · **Sahip kararları (bu oturumda, soru-cevap):**

| Konu | Sahibin seçimi |
|---|---|
| Haritada dolaşma | **Açık düğüme kayar:** açık herhangi bir düğüme dokununca oyuncu yol boyunca oraya gider (animasyon); sıra kuralı yok |
| Oyuncunun haritadaki karşılığı | **Yeni karakter avatarı:** topacını taşıyan bir oyuncu karakteri (yeni sanat) |
| Hareketin bedeli | **Bedelsiz, kısa yürüme:** günlük sınır yalnız ödüllerde (dinç vuruş, 10 sayılan maç) |
| Düğüm gelişimi | **Düğüm kademeleri:** her düğüm KEŞFET → TEMİZLE → USTALAŞ |

Bu belge [`01`](01-harita-ve-dugumler.md) § 3–7'yi **genişletir**; çelişen yerde bu belge kazanır. Etkilenen: 07 § 2–3 (ekran), 08 § 3–4 (şema, uç), 09 (dilimler), 10 (karakter sanatı), 05 (bölge rozetleri).

---

## 1. Haritada dolaşma

### 1.1 Kural
- Oyuncunun haritada **bir konumu** vardır: bir düğüm (`konum`). İlk girişte b1-01'in yanında başlar.
- Oyuncu **açık** (kilidi kalkmış) herhangi bir düğüme dokunur → karakter, **yalnız açık ya da geçilmiş yollardan** en kısa yolu izleyerek oraya yürür. Kilitli düğüme dokunmak yürütmez; düğüm şeridinde "ÖNCE: …" bilgisi çıkar (01 § 6).
- Varınca düğüm şeridi (07 § 3) o düğümün eylemini gösterir (DÖVÜŞ / KAZ / AÇ). Eylem için **düğümde durmak gerekir** (karakter oradayken ana düğme etkin).
- Bölgeler arası: bölge başlığındaki ► ile sonraki bölgeye geçince karakter o bölgede **son bulunduğu düğümde** (ilk kez ise 01'de) görünür. Bölgeler ayrı ekran; karakter bölge değiştirince "yolculuk" animasyonu yok (S2).

### 1.2 Yürüme
| Kural | Değer |
|---|---|
| Hız | Kenar başına 0,30 sn, bir yürüyüş en çok 1,2 sn (uzun yolda hız artar) |
| Atlatma | Yürürken tekrar dokunmak ya da ana düğmeye basmak yürüyüşü anında bitirir (karakter hedefe ışınlanır) |
| Bedel | **Yok** (sahip kararı). Günlük adım sınırı yok |
| Kesinti | Yürüyüş yalnız görseldir; sunucuya **varış** bildirilir (§ 4.2) |
| Hareketi azalt | Ayarlar "Hareketi azalt" → yürüme yerine 0,15 sn solup belirme |
| Klavye | Ok tuşları komşu düğüme yürür; Enter ana eylem |

### 1.3 Neden sıra kuralı yok
Sahip "açık düğüme kayar" seçti: oyuncu iki dal arasında serbestçe gidip gelir; kilit mantığı (01 § 6) zaten neyin açık olduğunu belirler. Yolun animasyonu "dolaşma" hissini verir, adım planlaması gerektirmez (S1).

## 2. Oyuncu karakteri (profilin haritadaki karşılığı)

### 2.1 Ne
Haritada oyuncuyu **topacını taşıyan küçük bir karakter** temsil eder. Karakterin elinde (ya da yanında dönerek) **aktif takımın ilk topacının** küçük ikonu durur. Altında ad etiketi yalnız odakta.

| Özellik | Kural |
|---|---|
| Boyut | 16×24 mantıksal px (harita ızgarası 480×270; düğüm 22×22'nin yanında okunur) |
| Seçim | Profil'de **KARAKTER**: 4 gövde biçimi (ilk sürüm), adlar yok, yalnız görsel (S2) |
| Renk | Profil rengi (6 renk, mevcut) karakterin giysi paletine uygulanır (palet takası, yeni çizim yok) |
| Arma | Profil arması göğüste 5×5 rozet |
| Topaç | Aktif takımın 1. topacı (mevcut 48/24 px ikon önbelleği küçültülür); topaç değişince karakterin taşıdığı da değişir |
| Ses | Adım sesi yok (S2); varışta hafif taş tıkı (menü sesi) |

### 2.2 Animasyonlar (sanat planı 10 § 3.6)

| Durum | Kare | Ne zaman |
|---|---|---|
| BEKLE | 4 (döngü) | Düğümde dururken; topaç elinde yavaş döner |
| YÜRÜ | 6 × 2 yön (sağ; sol = ayna) | Yürürken |
| KAZ | 6 | Maden düğümünde KAZ'a basınca (haritada değil, Maden ekranının sol altında küçük kopyası) |
| DÖVÜŞE GİR | 5 | DÖVÜŞ'e basınca: topacı fırlatma hareketi, sonra Lobi'ye geçiş |
| KUTLA | 6 | Düğüm aşaması yükselince (TEMİZLE/USTALAŞ), haritaya dönüşte bir kez |

Yer tutucu (kod, sanat gelene kadar): Pixi Graphics ile 3 dikdörtgenli figür + profil rengi + taşıdığı topaç ikonu; yürürken 2 kareli sallanma.

### 2.3 Profil ile bağ
- Karaktere dokunmak **mini profil kartı** açar (modal değil, şerit): ad, arma, ⛏/⚒ Ustalık, bölge ilerlemesi (%), vitrin (3 parça, 12 § 3). Ana düğme: PROFİL (tam ekran).
- Profil ekranına **KARAKTER** seçimi eklenir (4 hücre, renk şeridiyle aynı satırda).
- Karakter **yalnız haritada ve Maden ekranında** görünür. Lobi, maç, seyirci değişmez (S2; maçta oyuncu topaçtır).
- Hesapsız (misafir) oyuncu haritayı görmez (01 § 7).

### 2.4 Başka oyuncular
Haritada **başka oyuncu görünmez** (tek oyunculu ilerleme; sunucu yükü ve S2). İleride "arkadaşın haritadaki konumu" fikri 99 S-26.

## 3. Düğüm gelişimi: KEŞFET → TEMİZLE → USTALAŞ

### 3.1 Aşamalar (tür başına)

| Tür | KEŞFET (1) | TEMİZLE (2) | USTALAŞ (3) |
|---|---|---|---|
| **DÜŞMAN** | Karakter düğüme ilk kez varır | İlk galibiyet | Üç yıldızın hepsi |
| **PATRON** | İlk varış | İlk galibiyet (**sonraki bölgeyi açar**) | Üç yıldız |
| **MADEN** | İlk varış (**haritayı ilerletir**, 01 § 3) | İlk başarılı vuruş | Bu damardan toplam **30 başarılı vuruş** (ömür boyu) |
| **SANDIK** | İlk varış | Açmak | — (iki aşamalı; açılınca tam) |

**Kilit:** bir düğümün komşuları, o düğüm **TEMİZLE** olunca açılır; **maden ve sandık KEŞFET ile** açar (harita ilerlemesi madene ve sandığa kilitlenmez; S1). Bu, 01 § 6'daki "TAMAM" kavramının yerine geçer: TAMAM = TEMİZLE (maden/sandık için KEŞFET).

### 3.2 Aşama ödülleri

| Aşama | Ödül | Not |
|---|---|---|
| KEŞFET | Yok (yalnız harita ilerlemesi ve komşu açma kuralı) | Yürümek bedelsiz ve ödülsüz: dolaşma çiftliği yok |
| TEMİZLE (Düşman/Patron) | 01 § 4 ilk ödülü (kazanılan yıldızlar dahil) | Değişmedi |
| TEMİZLE (Maden) | — (kazının kendisi ödül) | |
| USTALAŞ (Düşman) | Üçüncü yıldız ödülü + **1 külçe** (bölge kademesi) | Yıldız ödülleri değişmedi; +1 külçe "usta" payı |
| USTALAŞ (Patron) | Yıldız ödülleri + **bölge arması** (görünüm `arma-<bolge>`) | |
| USTALAŞ (Maden) | **USTA DAMAR:** o damarın günlük kapasitesi **+1** (6 → 7; Derin 8 → 9) ve nadir yuva olasılığı **+5 puan** | Günlük 60 vuruş tavanı değişmez; bot avantajı yok (06 Tablo E aynı tavana takılır) |

### 3.3 Bölge ilerlemesi ve rozetler
- Bölge ilerlemesi = aşama puanlarının toplamı / en çok: 5 düşman × 3 + patron 3 + 4 maden × 3 + 2 sandık × 2 = **34 puan**. Ekranda yüzde: "OCAK YAMACI %62".
- **Bölge rozetleri** (profil ve bölge plakasında):

| Rozet | Koşul | Ödül |
|---|---|---|
| BRONZ | Bütün düğümler TEMİZLE (sandık açık, maden kazılmış) | 300 Altın |
| GÜMÜŞ | Patron USTALAŞ + bütün düşmanlar TEMİZLE | 500 Altın + çerçeve `cerceve-<bolge>` |
| ALTIN | Bütün düğümler USTALAŞ (34/34) | 800 Altın + başarım (05: "Tam Yıldız" bunun yerine geçer: `bolge-altin`) |

Rozet Altınları ilk sürüm toplamı (3 bölge): 4 800. Kozmetik işçilik ve parça işçiliğiyle dengede (06 § 3'e işlendi).

### 3.4 Haritada görünüm
- Düğümün çevresinde **3 çentikli Kuşak halkası** (imza, menü § 3.B): boş = keşfedilmemiş, 1 = KEŞFET, 2 = TEMİZLE, 3 = USTALAŞ (çentikler halka renginde yanar). Sandık 2 çentik.
- Kilitli düğüm: sönük, kilit; keşfedilmemiş açık düğüm: dolu ama halka boş ve küçük "!" (gidilecek yer).
- Bölge plakası: "OCAK YAMACI · %62 · ◈" (◈ = kazanılan en yüksek rozet).
- Aşama yükselince haritaya dönüşte: halkanın yeni çentiği yanar + karakter KUTLA + tek satır "USTA DAMAR: +1 KAPASİTE".

## 4. Teknik etki (08'e işlendi)

### 4.1 Şema (göç 5 eki)
```sql
ALTER TABLE oyuncu ADD COLUMN karakter INTEGER NOT NULL DEFAULT 0;     -- 0–3 gövde biçimi
ALTER TABLE oyuncu ADD COLUMN harita_konum TEXT;                        -- düğüm kimliği ("b1-07"), NULL = başlangıç
-- harita_dugum.durum anlamı değişir: 0 kilitli · 1 açık · 2 KEŞFET · 3 TEMİZLE · 4 USTALAŞ
ALTER TABLE harita_dugum ADD COLUMN basarili_vurus INTEGER NOT NULL DEFAULT 0;   -- maden USTALAŞ sayacı
CREATE TABLE bolge_rozet (oyuncu_id INTEGER NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE, bolge_id TEXT NOT NULL,
  rozet INTEGER NOT NULL, zaman INTEGER NOT NULL, PRIMARY KEY (oyuncu_id, bolge_id));   -- 1 bronz · 2 gümüş · 3 altın
```

### 4.2 Uçlar
| Uç | Girdi | Çıktı / hata |
|---|---|---|
| `POST /api/harita/git` | `{dugum}` | 200 `{konum, asama, yeniAsama?, acilan[]}` · 409 `kilitli` · 409 `yolYok` (bölge içinde açık yol yok) · 404. Sunucu: düğüm açık mı, aynı bölgede mi; ilk varışta KEŞFET yazar (maden/sandık için komşuları açar). Hız sınırı: 10 istek/sn (dolaşma ödülsüz olduğu için yalnız kötüye kullanım kesici) |
| `POST /api/maden/basla`, `POST /api/harita/sandik`, oda katılımı (`mod:"harita"`) | (mevcut) | **Ek kural:** `harita_konum` hedef düğüm değilse 409 `uzak` (önce `git`). İstemci varış bildirimi yürüyüş başında gönderir; animasyon beklenmez |
| `PATCH /api/profil` | + `karakter` (0–3) | 200 |
| `GET /api/harita` | (mevcut) | + `konum`, düğüm başına `asama`, `basariliVurus`, bölge başına `ilerleme`, `rozet` |

Saf kural (`kurallar/harita.ts`): `enKisaYol(bolge, durumlar, from, to)` (BFS, yalnız açık/geçilmiş düğümler; yönsüz gezinme: oyuncu geri de yürüyebilir), `asamaHesapla`, `bolgeIlerlemesi`, `rozetHesapla`.

### 4.3 Sim ve protokol
Dolaşma ve karakter **yalnız menü/REST**; sim, oda şeması ve `PROTOKOL_SURUMU` üzerinde ek etki yok (H2'nin 6 → 7 artışı yeterli). Karakter maçta görünmez.

## 5. Akış örneği (Bölge 1, ilk 3 dakika; 01 § 8'in güncellenmiş başı)
1. Harita açılır: karakter b1-01'in yanında BEKLE; b1-01'de "!" ve boş halka; şerit: "DÜŞMAN · ZORLUK ●○○○○ · DÖVÜŞ".
2. DÖVÜŞ → karakter DÖVÜŞE GİR → Lobi → maç → Sonuç → HARİTA.
3. Dönüş: b1-01 halkası 2 çentik (KEŞFET + TEMİZLE; 3 yıldız alındıysa 3 + KUTLA); b1-02 açılır ("!").
4. Oyuncu b1-02'ye dokunur → karakter 0,3 sn yürür → KEŞFET (1 çentik); b1-03 ve b1-04 açılır; şerit: "MADEN · DEMİR · KAZ".
5. KAZ → Maden ekranı (karakterin küçük kopyası KAZ animasyonuyla sol altta).

## 6. G-0 sınaması
Dolaşma ödülsüz; karakter görünüm; USTA DAMAR yalnız günlük kapasiteyi +1 artırır (60 tavanı altında); bölge rozetleri Altın + görünüm. Hiçbiri maç gücüne girmez.
