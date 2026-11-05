# MENÜ-DENETİM: menülerdeki UI hataları ve karmaşa, tek iş listesi

**Tarih:** 2026-11-05 · **Dal:** `devran-kod` · **Sahip:** "oyunda menüler hala UI hatalarıyla ve karışıklıkla dolu. bunun çalışmalarını toparla"
**Kapsam:** maç dışındaki bütün ekranlar + maçın menü anları (bot teklifi, VS, Esc menüsü, Sonuç). Maç HUD'u yalnız menüye değdiği yerde.
**Kod değişmedi.** Bu belge bir iş listesidir; düzeltme yapılmadı.

## Yöntem

- Yerel, ayrı veri dizinli sunucu (`KIMLIK_MODU=sifre`, geçici `VERI_DIZINI`, port 5197). Yeni test hesabı: kayıt → profil → İlk Çekirdek → Atölye.
- Headless Chrome, **1280×720**, DPR 1. 28 menü ekranı + bir bot maçı (teklif → VS → maç → Esc → Sonuç).
- Her ekranda otomatik denetim: taşan/kırpılan metin, ekran dışı öğe, üst üste binen düğme, 24 px altı düğme, yazı tipi dökümü, `undefined/NaN` metni. Ham çıktı: [`ekran/MENU-denetim-ozet.json`](ekran/MENU-denetim-ozet.json).
- Ardından her görüntü gözle incelendi. Görüntüler: `ekran/MENU-*.png`.
- **Doğrulanmayanlar:** 1920×1080 ve dar ekran, metin ölçeği %125/%150, iki gerçek oyuncuyla eşleşme ("Rakip bulundu"), Zafer ekranı, Ayarlar'ın maç içinden açılışı, klavye ile gezinme, ses.

## Özet: karmaşanın üç kökü

1. **Gezinti tek bir modele oturmuyor.** Aynı türden hedefler üç ayrı yerde: üst bantta `AYARLAR · DAHA FAZLA · ÇIKIŞ`, "Daha fazla" açılırında `Çekirdek Günlüğü · Profil`, Atölye'nin alt sırasında `MARKET · BAŞARIMLAR · DENE · KAYDET`. Lento plakası bazı ekranlarda yanlış ("Profil" ekranında `DEVRAN`), bazılarında içerik başlığıyla ikileniyor (`AYARLAR` + `AYARLAR`, `GÜNLÜK` + `ÇEKİRDEK GÜNLÜĞÜ`). Geri okunun nereye döndüğü belli değil, Atölye'de hiç yok.
2. **Geliştirici içeriği oyuncuya sızıyor.** Oda ekranında `QR · YER TUTUCU` dama deseni, Krediler'de iç durum notları ("aday, entegre değil; köken GitHub aynası…"), URL'den açılan `?ekran=ruhlar` kontakt sayfası, localhost bot maçında ağ rozeti `kayıp`.
3. **Bileşen düzeyinde yerleşim hataları.** Kırpılan/kayan seçim çerçevesi, hücreden taşan etiketler, düğmenin panelin üstüne binmesi, kesilen ad ve yetenek adları, Arial/system-ui'ye düşen yazılar. Ekranların kendi `STIL` bloğu var (10 ayrı dosya); [menu-tasarim-arastirma.md](../../art/menu-tasarim-arastirma.md) T-9 "üç stil kaynağı" maddesi bugün de geçerli.

## Bulgular

Önem: **H** = hata (yanlış görünen ya da bozuk), **K** = karmaşa (çalışıyor ama oyuncuyu şaşırtıyor), **C** = cila.

### A. Hatalar (H)

| # | Ekran | Bulgu | Kanıt | Önerilen çözüm | Dosya |
|---|---|---|---|---|---|
| H-1 | Oda açıldı | Oyuncuya `QR · YER TUTUCU` yazısı ve dama deseni görünüyor | [MENU-34](ekran/MENU-34-lobi-oda-acik.png) | Gerçek QR üret (bağımlılıksız küçük kodlayıcı) ya da paneli kaldır | `Lobi.ts:497`, `:132-133` |
| H-2 | Krediler | Oyuncuya geliştirici tablosu: "Durum" sütununda iç notlar ("aday, entegre değil", "yeniden doğrulanacak"), kesilmiş URL'ler, 7 500 px yükseklik | [MENU-05](ekran/MENU-05-krediler.png) | Oyuncu sürümü: yalnız kullanılan varlıklar, "Atıf metni" sütunu; adaylar ve durum notları gizli | `Bilgi.ts`, `paylasilan/krediler.ts`, `docs/art/krediler.md` |
| H-3 | İlk Çekirdek | Seçim çerçevesi karttan kayık; köşe parçaları kartın dışında, alt ve sağ kenarlar kopuk | [MENU-12](ekran/MENU-12-ilk-cekirdek.png) | Seçim çerçevesini kartın kendi kenarına bağla (diğer ekranlardaki köşeli seçimle aynı bileşen) | `IlkCekirdek.ts` |
| H-4 | Sonuç | `TEKRAR`/`ATÖLYE` düğmeleri alt panelin üstüne biniyor; "DÖKÜM" etiketi ve Bitiş listesinin üçüncü satırı kesiliyor (1–3 skorunda yalnız iki satır görünüyor) | [MENU-57](ekran/MENU-57-sonuc-2.png) | Panel yüksekliğini içerikten al, düğme sırasını panelin altına it; Bitiş listesi taşarsa kaydırma ya da sıkıştırılmış satır | `Mac.ts` (Sonuç) |
| H-5 | Sonuç | Rakibin puanı `−2` diye yazılıyor; oyuncu bunu "puan kaybettim" diye okur | MENU-57 | Rakip satırları rakip renginde `+2`, ya da iki sütun (SEN / RAKİP) | `Mac.ts` |
| H-6 | Atölye | `MARKET'TEN AL` hücre etiketi hücreden taşıyor (116 > 96 px) | [MENU-20](ekran/MENU-20-ana-acilis.png) | Kısa etiket ("MARKET") ya da ikon + tooltip | `Atolye.ts` |
| H-7 | Profil (oluştur/düzenle) | `KASIRGA` arma etiketi hücre kenarına değiyor; ad alanı ve profil adı Arial'e düşüyor | [MENU-11](ekran/MENU-11-profil-yeni.png), [MENU-25](ekran/MENU-25-profil.png) | Arma ızgarasında daha küçük etiket boyu; `input` ve ad satırına m5x7 | `Profil.ts`, `Kimlik.ts` (`KIMLIK_STIL`) |
| H-8 | Atölye | `Uyum: Enerji +%10` kutusu ve Pergel balonu system-ui yazı tipinde (geri kalanı pixel) | MENU-20, [MENU-13](ekran/MENU-13-egitim-oncesi-acilis.png) | Yazı tipini jetonlardan al | `Atolye.ts`, `src/istemci/bilgic/` |
| H-9 | Takım kartı (Atölye sağ) | Çekirdek adları iki satıra kırılıp bozuk sarıyor ("3. KASIRGA / DÖKUM"); ▲▼ düğmeleri 20×32 px | MENU-20 | Ad tek satır + kısaltma; sıra değiştirme sürükle ya da tek "sırala" düğmesi | `Atolye.ts` |
| H-10 | Bot maçı (localhost) | Ağ rozeti `kayıp` gösteriyor; yerel bot maçında yanlış alarm | [MENU-53](ekran/MENU-53-vs-0.png) | Bot maçında ve ölçüm yetersizken rozeti gizle; eşiği gözden geçir | `src/istemci/ag/`, `MacHud.ts` |
| H-11 | VS | Rakip adı `DEVRAN BO…` diye kesiliyor, plaka boş yer varken | [MENU-52](ekran/MENU-52-takim-secimi.png) | Plakayı içeriğe göre genişlet; kesme yalnız gerçekten uzun adlarda | `Lobi.ts` / `lobiCizim.ts` |
| H-12 | Maç HUD (yetenek yuvaları) | Yetenek adları ("Kaya Soğ…") system-ui, ~10 px, kesik | [MENU-55](ekran/MENU-55-esc-menu.png) | Pixel yazı, tam ad tooltip'te; kısa ad alanı veride | `MacHud.ts` |
| H-13 | Ayarlar | `HESABIMI SİL` panelin alt kenarında yarım görünüyor (iç kaydırma var ama ipucu yok) | [MENU-26](ekran/MENU-26-ayarlar.png) | Tehlikeli eylemi ayrı "Hesap" bölümüne al; panelin altında kaydırma ipucu | `Diger.ts` |
| H-14 | Dev ekranı | `?ekran=ruhlar` herkese açık, oyun stilinin dışında (system font, yuvarlak kart) | [MENU-29](ekran/MENU-29-ruhlar.png) | Yalnız geliştirme modunda yönlendir | `main.ts:41,51` |

### B. Karmaşa (K)

| # | Ekran | Bulgu | Kanıt | Önerilen çözüm |
|---|---|---|---|---|
| K-1 | Tüm ana ekranlar | Gezinti üç yere dağılmış (üst bant, "Daha fazla" açılırı, Atölye alt sırası). `ÇIKIŞ` Ayarlar'ın yanında tek tıkla duruyor | [MENU-40](ekran/MENU-40-ust-menu-0.png) | Tek model (sahip kararı, aşağıda S-1) |
| K-2 | Lento plakası | Profil'de `DEVRAN`, Kayıt'ta `DEVRAN`; Ayarlar/Günlük'te içerik başlığıyla ikilenmiş; Atölye'de geri oku yok, plakada bozuk ikon | MENU-25, MENU-26, MENU-24 | Plaka = ekranın adı, içerikteki ikinci başlık kalkar; her alt ekranda ◄ aynı yere (Atölye) döner |
| K-3 | Atölye | Yeni oyuncu ilk açılışta `UÇ` sekmesinde; Pergel "dört parça: Çekirdek, Gövde…" diye anlatırken | MENU-13; `Atolye.ts:276` | Varsayılan sekme `cekirdek` |
| K-4 | Atölye | Pergel balonu parça ızgarasını kapatıyor; ilk açılışta oyuncu ızgarayı göremiyor | MENU-13 | Balonu ızgara dışına (portrenin sağına, alt sıranın üstüne) taşı ya da ızgarayı balon yüksekliği kadar kısalt |
| K-5 | Atölye | `KAYDET` düğmesi gezinti düğmeleriyle aynı sırada; neyin kaydedilmediği belli değil | MENU-20 | Değişiklik yoksa gizle; varsa "kaydedilmedi" rozetiyle OYNA'nın yanında |
| K-6 | Atölye | `AĞIRLIK 0`: değerler 0-100 göreli ölçek, en hafif parça 0 görünüyor; hata gibi okunuyor | MENU-20; `Atolye.ts:250-259` | Taban 1 ya da ham değer + çubuk; ölçek açıklaması tooltip'te |
| K-7 | Lobi | Takım yuvası 2 ve 3 `ÖDÜNÇ` gri topaç; Atölye aynı yuvaları adıyla ve renkli gösteriyor | [MENU-27](ekran/MENU-27-lobi.png) vs MENU-20 | İki ekranda aynı temsil (ödünç = gri çerçeve + ad) |
| K-8 | Lobi | Sol panelin üçte ikisi boş; alt not "1V1 · İLK 3 / PUAN · 90 SN" kötü kırılıyor; halka elipsi kaidelerle hizasız | MENU-27 | Mod açıklamasını panelin içine taşı, notu tek satır; halka kaidelerin altında |
| K-9 | Market | Hücrelerde ad yok; seçili parçanın adı sol altta küçük bir etikette ("KAYA MADEN · 100"); büyük `SATIN AL` neyi aldığını söylemiyor; kilitli hücrelerde boş çubuk + "0/10" anlamsız | [MENU-22](ekran/MENU-22-market.png) | Seçili parça için sağda/altta detay kartı (ad, katkı, fiyat, kilit şartı); düğme "KAYA MADEN · 100 ALTIN AL" |
| K-10 | Market | Zemin üstte lacivert, altta ahşap tahta; panel başlık plakaları çerçeveye kayık | MENU-22 | Tek zemin |
| K-11 | Başarımlar | Ödül satırı ortalanmış yetim metin ("· MARKET", "· 4. TAKIM YUVASI"); "PARLAK DİSK" kırılıyor; altta boş şerit | [MENU-23](ekran/MENU-23-basarimlar.png) | Ödül satırı sola hizalı tek satır, ikonla |
| K-12 | Günlük | Tek başına "0 sn EN UZUN DÖNÜŞ" kutucuğu; ruh kartı panelin ortasından kesiliyor; `Lv.2` / `LV.2` yazımı karışık | [MENU-24](ekran/MENU-24-gunluk.png) | 4'lü istatistik sırası; ruh kartı ilk ekranda tam |
| K-13 | Ayarlar | `YAZI TİPİ` tek seçenekli (`PİXEL`); `%100` biçimi; Gizlilik/Krediler web bağlantısı gibi altı çizili | MENU-26 | Tek seçenekli ayarı kaldır; bağlantıları düğme diline çevir |
| K-14 | Kayıt / Giriş / Profil | Ekranın %40'ı yalnız büyük çanak çizimi taşıyan boş panel; "Hesabın var mı? Giriş yap" web bağlantısı | [MENU-02](ekran/MENU-02-kayit.png) | Sol panelde oyunun 3 cümlelik tanıtımı + topaç; bağlantı ikincil düğme |
| K-15 | Profil | `DESTEK KANALI ▾` ne olduğu anlaşılmıyor; `ADI DEĞİŞTİR` + `KAYDET` iki ayrı kaydetme | MENU-25 | Etiket + kısa açıklama; tek KAYDET |
| K-16 | İlk Çekirdek | Kart üstlerinde yer tutucu ikon (daire + nokta) ve çıplak top; üçüncü kartta yalnız "30 maç ömür" rozeti var (neden yalnız onda belli değil) | MENU-12 | 3B ikon önbelleğinden gerçek Çekirdek; ömür rozetine açıklama |
| K-17 | Arama | Bekleme ekranında `RAKİP ARANIYOR` sol üstte, bot teklifi sağ üstte, rakip kaidesi sağda tek başına; göz üç köşe arasında gidip geliyor | [MENU-32](ekran/MENU-32-lobi-araniyor-22sn.png), [MENU-50](ekran/MENU-50-bot-teklif.png) | Sayaç + teklif tek blokta, çanağın üstünde |
| K-18 | VS | Altta `TAKIM SEÇİMİ` etiketi var, ekranda seçim öğesi görünmüyor | MENU-52 | Doğrulanmadı: seçim adımı otomatik geçmiş olabilir. Etiket yalnız seçim açıkken |

### C. Cila (C)

- C-1 Odak halkası beyaz kalın çerçeve; diğer seçimler bronz köşeli. Tek odak dili (Kayıt, Profil, Lobi, Esc menüsü).
- C-2 `ENTER` / `ESC` / `H: başka ipucu` kısayol rozetleri farklı boyut ve konumlarda.
- C-3 Esc menüsü alt notu iki satıra geniş satır aralığıyla kırılıyor.
- C-4 Başlık plakasındaki ikonlar (Atölye ⚙ benzeri) pikselde okunmuyor.

## Önerilen iş paketleri (sıra)

| Paket | İçerik | Büyüklük (varsayım) | Sahip kararı? |
|---|---|---|---|
| **P1 · Görünür hatalar** | H-1…H-14 (H-1: QR paneli kalkar, S-2; H-2: oyuncu sürümü, S-3) | 1 ajan turu | karar verildi (S-2, S-3) |
| **P2 · Gezinti modeli** | K-1, K-2, K-5, C-1, C-2: tek gezinti, plaka = ekran adı, ◄ hep Atölye'ye | 1 tur | karar verildi (S-1) |
| **P3 · Ekran düzenleri** | K-3…K-4, K-6…K-18 | 1-2 tur | hayır |
| **P4 · Tek stil kaynağı** | 10 ekranın `STIL` bloklarını `stil/bilesenler.css` + jetonlara taşı; yazı tipi düşmelerini kapat (H-7, H-8, H-12 kökten) | 1 tur | hayır |
| **P5 · Menü sanatı** | `kalan-is.md` #2 ile birleşir (ikonlar, İlk Çekirdek görselleri, Pazar zemini) | orta | sanat hattı sahibe bağlı |

Kabul: her paket sonunda bu betikle yeniden çekim (aynı 28 ekran + bot maçı), otomatik denetimde kırpılma/taşma/yazı tipi listesi boş, önce/sonra görüntüleri bu klasörde. Menü paketleri bitince tanıtım videosu (`docs/art/tanitim/devran-tanitim-20261105.mp4`, eski menülerle çekildi) aynı ekranlarla yeniden kaydedilebilir.

**Pergel maddeleri (H-8, K-3, K-4) için sınırlar** (Kutsal canavarlar oturumu, 2026-11-05; o oturum bu dosyalara dokunmuyor, bu maddeler menü turunda yapılır): tasarım kaynağı [`docs/ux/bilgic-pergel.md`](../../ux/bilgic-pergel.md) § 2 (balon engellemez, OYNA'yı ve yuvaları örtmez; K-4 çözümü § 2 madde 1'e uymalı) ve § 6 (balon yazısı m5x7, `--y-16`). İpucu metni değişirse `test/pergel.test.ts` lore adı "Ata"nın oyuncuya gösterilmediğini denetliyor.

## Sahibin kararları (2026-11-05, sahip: "onaylıyorum", üçü de öneri olduğu gibi)

Kayıt: [`02-sahip-kararlari.md`](../../design/beyblade/02-sahip-kararlari.md) "Menü kararları" bölümü.

- **S-1 Gezinti modeli.** Karar: Atölye ana üs. Üst bantta yalnız lento (ekran adı + ◄), Altın ve tek ⚙ (Ayarlar; Çıkış onun içinde). Atölye alt sırası: MARKET · BAŞARIMLAR · GÜNLÜK · PROFİL. "Daha fazla" açılırı kalkar.
- **S-2 Oda QR'ı.** Karar: kaldırılır (H-1). Bağlantıyı kopyala yeterli, yayın için seyirci bağlantısı zaten var.
- **S-3 Krediler.** Karar: oyuncu sürümü yalnız oyunda kullanılanları gösterir (H-2); aday ve iç notlar yalnız `docs/art/krediler.md`'de kalır.
