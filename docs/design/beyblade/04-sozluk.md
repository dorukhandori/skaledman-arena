# Sözlük: oyuncuya görünen terimler genel oyun terimleridir

**Tarih:** 2026-11-04 · **Durum:** sahip kararı (2026-11-04): *"terimler genel oyun terimleri olsun. oyunculara öğrenme eğrisi yaratmak istemiyoruz."*

Kural: **Arayüzde, HUD'da, market ve başarım adlarında yalnız sağ sütundaki terimler kullanılır.** Sol sütundaki lore adları yalnız hikâye metninde (kart arkası, kronik, hizip tanıtımı) ve belgelerin "lore" bölümlerinde geçebilir. Kod tanımlayıcıları (K-10, Türkçe) sağ sütundan türetilir.

## Eşleme

| Eski lore terimi | Oyuncuya görünen (genel) | Not |
|---|---|---|
| Döner | **Oyuncu** | |
| Topaç | **Topaç** | Türkçede genel sözcük; "Beyblade" marka olduğu için kullanılmaz |
| Çekirdek | **Çekirdek** | Genel oyun sözcüğü (core) |
| Kabuk | **Gövde** | Hasbro'nun "Energy Layer"ına denk; oyuncu gövde der |
| Halka | **Disk** | Yükseklik ve parçalanma direnci |
| Uç | **Uç** | |
| Hane | **Element** | Kor / Kasırga / Şimşek / Girdap / Kaya / Don element adları olarak kalır (okunur, öğrenme gerektirmez) |
| Soy | **Köken** | Göktaşı / Maden / Yapay / Karanlık (eski Düşen / Çıkan / Dökme / Kül) |
| devir (kaynak) | **Stamina** | HUD'daki tek çubuk |
| Yankı | **Enerji** | Yetenek metresi; "Enerji doldu" |
| Kıvılcım | **Altın** | Oyun içi para; gerçek para yok |
| Teknik / İmza / Nihai (Ata Çağrısı) | **Yetenek / Özel Yetenek / Ulti** | Üç kademe; umbrella sözcük "yetenek" |
| Üçleme | **Takım Ultisi** | |
| Sönüş / Düşüş / Parçalanma | **Durma / Ring Out / Parçalanma** | Bitiş türleri; puanları 1 / 2 / 2 |
| Uyku / Uyanış / Parlama / Doruk | **Lv.1 / Lv.2 / Lv.3 / Lv.4** | Çekirdek seviyesi |
| Kararma (sayaç) | **Kararma** | Genel Türkçe; kalır |
| Çanak | **Arena** | |
| Deneme çanağı | **Antrenman** | Bot karşısında deneme |
| Hami | **Destek kanalı** | Kick kanalı |
| Temiz Devir / Gösteri Devri | **Galibiyet Sıralaması / Stil Puanı** | İki paralel sıralama |
| Devir Defteri | **Çekirdek Günlüğü** | |
| Miras (çekirdek devri) | **Devir** (oyuncular arası; ilk sürümde kapalı) | Lore'da "Miras" kalabilir |
| Devran | **Devran** | Oyunun kod adı; terim değil, marka |
| Hizipler (Devran Birliği, Meydan Ligi, Dökümhane, Köklüler, Mühürcüler, Karanlık Kardeşliği) | yalnız lore | Market rafları arayüzde **Çekirdekler / Gövdeler / Diskler / Uçlar**; hizip adı rafın alt başlığı (flavor) |
| Tezgâh adları (Kraterci, Ocak, Dökümhane, Meydan Tezgâhı, Karanlık Pazarı) | yalnız lore | Aynı |

## Genel ilkeler
- Bir terim MOBA/arena oyuncusunun zaten bildiği sözcükse (ulti, dash, cooldown, ring out, stamina, Lv., market, başarım, lobi, dereceli) o sözcük kullanılır; Türkçeleştirme zorlanmaz.
- Yeni icat sözcük yalnız lore'da; arayüzde asla.
- HUD'da ilk bakışta okunması gereken üç şey: **Stamina**, **Enerji**, **bitiş uyarısı** (kenar / parçalanma çatlağı).
- Kod: `stamina`, `enerji`, `altin`, `govde`, `disk`, `uc`, `cekirdek`, `element`, `koken`, `yetenek`, `ulti`.

## Harita, maden, işleme terimleri (2026-11-06, taslak; `docs/design/harita/`)

| Lore / tasarım terimi | Oyuncuya görünen (genel) | Kod | Not |
|---|---|---|---|
| Dünya haritası | **Harita** | `harita` | Oyna'da 4. mod (İlk Devir sonrası) |
| Bölge | **Bölge** (adıyla: OCAK YAMACI…) | `bolge` | 6 bölge, ilk sürümde 3 |
| Düğüm (nokta) | Türüyle görünür: **DÜŞMAN / MADEN / SANDIK / PATRON** | `dugum` | "Düğüm" sözcüğü arayüzde geçmez |
| Damar | **Damar** / **Nadir damar** / **Derin damar** | `damar` | Maden düğümündeki kazı yeri |
| Cevher | **Cevher** (KAYA CEVHERİ, DEMİR, DEVİR TAŞI) | `cevher` | Lore adları (Dağ Bakırı…) yalnız Dünya sayfasında |
| Kademe | **Kademe** (rozette yalnız rakam 1–8) | `kademe` | |
| Külçe | **Külçe** | `kulce` | |
| UO "skill" | **Ustalık** (MADENCİLİK, İŞLEME) | `ustalik`, `madencilik`, `isleme` | "Yetenek" topaç yetenekleri için ayrılmıştır; karıştırma |
| Kazı | **Kaz** (düğme), **vuruş** | `kazi`, `vurus` | |
| İsabet | **İsabet** | `isabet` | Kuşak halkası bronz yayı |
| Ocak (Atölye alt ekranı) | **Ocak** | `ocak` | |
| Eritme / dövme | **Erit** / **Döv** | `erit`, `dov` | |
| Cüruf | **Cüruf** | `curuf` | Eritmede kaybolan 1 cevher |
| Usta işi | **Usta işi** | `ustaIsi` | Parlak kozmetik varyant |
| Cila | **Cila** | `cila` | Gövde/Disk metal paleti; güç vermez |
| Yıldız | **Yıldız** | `yildiz` | Düğüm başına 3 şart |
