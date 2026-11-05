# MOBIL-1 raporu: telefonda (yatay) menüler ve maç

**Tarih:** 2026-11-05 · **Dal:** `devran-kod` · **Şapka:** mobil / girdi
**Sahip isteği:** "Oyunu mobil tarayıcıdan da oynanabilir yapmak istiyorum." Telefon (iOS Safari, Android Chrome) yatay modda menüler ve maç oynanabilir olmalı.
**Kural uyumu:** `src/paylasilan/**` **değişmedi** (`git diff e832bd3 -- src/paylasilan` boş). Altın hash'ler aynı (`npm run test:tarayici`: Node = Chromium bit bit). Ağ protokolü, `Olay` şeması ve `Girdi` şeması aynı: dokunmatik denetim mevcut `OyuncuGirdisi`'ne yazıyor; analog `yonX/yonZ` zaten int8 olarak taşınıyordu. Kick OAuth'a, `main`'e, `public/topac` ve `veri/topac-*`'a dokunulmadı. Yeni bağımlılık yok.
**Dal notu:** `origin/devran-kod`, PR #23 ile `main`'e birleştirilip silinmişti. Çalışma `origin/main` (e832bd3) üstüne kuruldu ve `HEAD:devran-kod` olarak itildi, yani dal yeniden açıldı. `main`'e yazılmadı.

## 1. Ne yapıldı (dilimler)

| # | Commit | Ne |
|---|---|---|
| 1 | `f454ee1` | **Maç dokunmatik girdisi.** Sol %45'te dinamik joystick: ilk dokunuşta açılır, ölü bölge %18, %90'da tam hız. Yön hibrit kameranın basıklığına göre düzeltilir, topaç başparmağın gösterdiği yöne gider. **Oto-nişan** en yakın etkin rakibe döner. Sağdaki boş alanda sürükleme nişanı ikinci çubuk gibi ezer; parmak kalkınca 900 ms sonra oto-nişana döner. Sağ altta baş parmak kavisi: **Dash** köşede ve en büyük, **Sekme**, **Yetenek 1-2**, **Ulti (3)** ve **Takım Ultisi (4)**. Takım Ultisi yuvası yalnız yetenek varken görünür. Yetenekte dokunmak oto-nişanla atar; sürüklemek nişan alır, bırakınca atar; dışarı çıkıp düğmeye geri dönerek bırakmak iptal eder ("İPTAL" etiketi görünür). Üst ortada **Menü** (Esc) ve **Ses** (M) düğmeleri var. **GERİ ÇEK** (Tab) düğmesi yalnız geri çekilebilirken çıkar. H8 takım yuvaları kendi panelinin altına taşındı, kavisle çakışmıyor. Düğme görselleri HUD'un kendi yuva ve rozet öğeleri, bu yüzden durum, bekleme süresi ve Enerji tek yerden geliyor. Çoklu dokunuş pointerId ile izleniyor. Melez cihazda fare çalışıyor, klavye aynen çalışıyor. Eğitim şeridi ve Karşılama metni dokunmatik dilinde. |
| 2 | `b895a5f` | **Telefon kabuğu ve ölçek.** GU-A tam sayı kuralı korundu: masaüstünde `o = max(2, …)` aynen. Dokunmatikte alt sınır 1, böylece telefon yatayda mantıksal alan görünüm kadar oluyor (≥ 640×360). Yazı ölçeği `yo = 1,5`, `yo × DPR` tam sayı olacak şekilde yuvarlanıyor: DPR 2'de 1,5 (yazı pikseli 3 cihaz pikseli), DPR 3'te 5/3. Pixel yazı cihaz ızgarasında kalıyor, kesirli yumuşama yok. Kabuğun parçaları: `100dvh`, çentik tarafı güvenli alan, ev çubuğu payı, `overscroll-behavior: none` (aşağı çekip yenileme yok), `touch-action: manipulation` (çift dokunma yakınlaştırması yok), iOS `gesturestart` engeli, uzun basma menüsü ve metin seçimi kapalı. Uzun basınca `title` ipucu balonu çıkıyor. Dikey modda "CİHAZI YATAY ÇEVİR" örtüsü var. Oturumda bir kez tam ekran teklifi çıkıyor (Android) ya da iOS'ta "Paylaş › Ana Ekrana Ekle" ipucu. PWA manifesti (yatay, tam ekran) ve 32 px pixel topaç simgesi eklendi (180/192/512, toplam 2,2 KB). Dokunmatik cihazda "klavye ve fare ister" uyarısı artık çıkmıyor. |
| 3 | `c7885f1` | **Menüler dokunmayla.** Hedefler ≥ 44 CSS px. Lento ve 3B etiketlerinde görsel boy aynı kaldı, görünmez isabet payı ≥ 48 px. Ekran düzeltmeleri: Atölye (sütun genişlikleri, alt şerit payı, ▲▼ yalnız seçili topaçta ve 44 px), Lobi mod sütunu, İlk Çekirdek kartları, Profil arma ızgarası, Kimlik formu. Yalnız üzerine gelmeyle çalışan yollara dokunma karşılığı verildi: "Dokun: tak · uzun bas: ad", Sonuç'ta Altın dökümü dokunuşla açılıp kapanıyor, Pergel'de "Rozete dokun", nişan ayarı "Oto" diye görünüyor, ENTER/ESC ipuçları gizli. Oda kodu alanı mobil klavyeyi büyük harfle açıyor (`autocapitalize=characters`, `inputmode=text`, `autocorrect=off`, `enterkeyhint=go`). Denetim aracı `araclar/mobil-denetim.cjs`. |
| 4 | `ce936f8` | **Ses ve performans.** Dokunmatikte `pointerdown` etkinleştirme olayı sayılmıyor, bu yüzden ses bağlamı iOS ve Android'de askıda kalıyordu. Artık `pointerup` / `touchend` / `click` / `keydown` olaylarında bağlam `running` olana kadar yeniden deneniyor; eski iOS için bir kez 1 örneklik sessiz tampon çalınıyor. Sekme gizliyken sesler duruyor. Efekt tavanları cihaz sınıfına bağlandı (dokunmatik ya da ≤ 4 çekirdek ya da ≤ 2 GB): parçacık 400 → 220, kıvılcım 150 → 83. Pixi tuval çözünürlüğü açıkça 1 (gerekçe § 4). Maç doğrulama aracı `araclar/mobil-mac.cjs`. |
| 5 | `98bb0f0` | **Yerel ağ ve README.** `npm run dev:ag` (`vite --host`) eklendi. Geliştirmede, liste boşken Origin denetimi özel IPv4 (10/8, 172.16/12, 192.168/16) ve `*.local` kökenlerini de kabul ediyor. Üretim aynen sert: liste yoksa her köken reddedilir, liste varsa yalnız listedekiler; birim testli. Tünel için `DEV_EK_HOSTLAR` (Vite `allowedHosts`). README'ye "Telefonla deneme" bölümü eklendi: aynı Wi-Fi, LAN IP, port 5173, güvenlik duvarı, Cloudflare Tunnel. Çevrimiçi maçta arka plandan dönüş bandı artık "Oyuna dönüldü. N sn arka plandaydın; maç bu sırada sürdü." diyor; kopma ve yeniden bağlanma akışı aynen önce geliyor. Ekran uyku kilidi (Wake Lock) maç boyunca alınıyor ve dönüşte yenileniyor. İki istemcili çevrimiçi test aracı `araclar/mobil-cevrimici.cjs`. |
| 6 | bu commit | Bu rapor ve `docs/production/raporlar/ekran/MOBIL-*.png`. |

## 2. Cihaz tablosu ve ölçümler

ÖLÇÜMLER_BURAYA

## 3. Kararlar (varsaydım işaretli)

| # | Karar | Gerekçe |
|---|---|---|
| K1 | **Varsaydım:** dokunmatik algılama = `(hover: none) and (pointer: coarse)`; `?dokunmatik=1/0` ile ezilir. Birincil işaretçisi fare olan dokunmatik dizüstüler klavye/fare düzeninde kalır. | Melez cihazda fareyle oynayana sanal düğme göstermemek (S2). Katman açıkken fare de çalışır: katman fare basışını girdiye iletir. |
| K2 | Joystick **dinamik** (ilk dokunuş noktası), ölü bölge %18, %90'da tam hız. Yön **ekrana göre** düzeltilir (sim z = ekran y / zOranı). | S1: parmak neyi gösterirse topaç ekranda oraya gider. Ölü bölge başparmak titremesini keser. Kenara kadar itmek zorunlu değil. |
| K3 | Nişan varsayılanı **oto-nişan** (en yakın etkin rakip). Ezme iki yoldan: sağ boş alanda sürükleme ya da yetenek düğmesinden sürükleme. Ezme parmak kalktıktan 900 ms sonra biter. Ayarlar'daki "Hareket yönü" seçeneği dokunmatikte de geçerli. | S1 kolay öğrenme: dokun ve at. Zor ustalaşma: sürükleyerek isabet, telegraftan kaçış yönü. Ayar değeri aynı (`fare`), dokunmatikte adı "Oto". |
| K4 | **İptal**: düğmeden dışarı sürükleyip düğmenin üstüne geri dönerek bırakmak ("İPTAL" etiketi görünür). | Masaüstündeki "alt şeritte bırak = iptal" karşılığı. Ayrı bir iptal bölgesi ekranda yer kaplardı (S2). |
| K5 | Düğme kavisi: **Dash köşede ve en büyük** (64-72 px). Sekme, Yetenek 1, Yetenek 2 ve Ulti Dash merkezli 31° aralıklı yayda; Takım Ultisi yayın dışında ve yalnız varsa görünür. Hepsi ≥ 50 px. | Dash en sık ve zamanlaması en kritik eylem. Ulti başparmağın en uzak, kaza basışı en az olan noktasında. Nadir eylem (Takım Ultisi) ikinci sırada. |
| K6 | Dokunmatik düğme görselleri HUD'un **kendi** yuva/rozet öğeleri: H6 yuvaları ve H7 rozetleri sağ alta taşınır, daireye döner, adları dokunmatik dilinde. H8 takım yuvaları kendi panelinin altına çıkar. GU-D'nin "oynanabilir elips HUD plakasının altına girmez" kuralı yalnız masaüstü düzeni için korundu. Dokunmatikte düğmeler çanağın sağ kenarına biner; yarı saydamlar ve topaç üstlerine gelince %45'e iner. | Durum, bekleme süresi ve Enerji tek kaynaktan gelir, ikinci bir HUD yazılmaz. Telefonda 44 px hedef ile çanak boyu birlikte sığmıyor. Çanağı küçültmek yerine (GU-D sahip kararı "çanak büyüsün") düğmeler kenara biner. |
| K7 | **Varsaydım:** Sıkı Dönüş (Z basılı) dokunmatikte ilk sürümde **yok**. | S2: altıncı yetenek düğmesi kavisi kalabalıklaştırır ve öğretilmesi ayrı iş. Sim girdisi hazır (`dinlen`), istenirse uzun basma ya da ayrı düğme olarak eklenebilir. |
| K8 | Menü ölçeği: dokunmatikte `o = 1` ve yazı `yo = 1,5` (cihaz pikseline yuvarlı). Telefonda çok sütunlu yerleşim korunur (`data-yazi-buyuk` yalnız kullanıcı metin ölçeğini büyütürse). | Tam sayı kuralı korunur. Mantıksal alan görünüm kadar (≥ 640×360) olduğu için yerleşim sığar. Yazı 1×'te 7 px büyük harfle okunmazdı, 1,5× masaüstündeki açısal boyuta yakın (≈ 10,5 CSS px büyük harf). |
| K9 | **Maç çerçevesi kesirli kalır** (960×540, telefonda ×0,69-0,80). Dokunmatik denetim CSS px'te ve ölçekten bağımsız. | GU-A karar 5: maç çerçevesi ölçeği ayrı iş. Telefonda tam sayı çerçeve (×1 = 960 px) sığmaz, ×0,5 ise okunmaz. Pixel dünya zaten 480×270 önbellekten `nearest` büyütülüyor. |
| K10 | Pixi tuval çözünürlüğü **1** (DPR'den bağımsız). Three.js (Atölye) zaten tembel yükleniyor, `pixelRatio 1` ve `low-power` ayarında. | Dünya pixel önbelleği DPR 2-3'te yalnız GPU doluluğu ve pil maliyeti getirir; "DPR ≤ 2" sınırı fazlasıyla sağlanıyor. Keskin olması gereken HUD DOM'da. |
| K11 | Efekt tavanı: dokunmatik ya da ≤ 4 çekirdek ya da ≤ 2 GB cihaz "mobil" sayılır, tavanlar %55 (parçacık 220, kıvılcım 83). | Orta telefonda çarpışma anında kare düşmesin. His reçetesinin geri kalanı (hitstop, sarsıntı, flaş) aynı. |
| K12 | Yalnız yatay. Dikeyde tam ekran "CİHAZI YATAY ÇEVİR" örtüsü. Android'de tam ekrana geçince `screen.orientation.lock("landscape")` deneniyor. | 960×540 maç ve 640×360 menü düzeni dikeye sığmaz; ikinci bir dikey düzen S2'ye aykırı. |
| K13 | Tarayıcı yakınlaştırması kapalı (`maximum-scale=1, user-scalable=no`, `touch-action`, `gesturestart`). Erişilebilirlik için uygulama içi metin ölçeği (%100/125/150) ve "Düz yazı tipi" ayarları telefonda da çalışıyor. "Hareketi azalt" tercihi (`prefers-reduced-motion`) dikey örtü animasyonunu ve düğme basılma kaymasını kapatıyor. | Oyun sırasında iki parmak jesti (joystick + düğme) sayfayı yakınlaştırmamalı. Okunurluk kaybını uygulama içi ölçek karşılıyor. |
| K14 | Tam ekran teklifi oturumda **bir kez** ve üst ortada çıkıyor, 10 sn sonra kapanıyor. Maç menüsünde de "Tam ekran" seçeneği var. iOS'ta (Fullscreen API yok) yalnız "Paylaş › Ana Ekrana Ekle" ipucu gösteriliyor. PWA manifesti `display: fullscreen` ve `orientation: landscape`. | Kendiliğinden tam ekran tarayıcıda izin istemi ya da sürpriz olur. Teklif tek dokunuş uzakta. |
| K15 | Ekran uyku kilidi (Wake Lock) yalnız maç ekranında alınıyor. Sekme gizlenince tarayıcı bırakıyor, dönüşte yeniden alınıyor. API yoksa (HTTP yerel ağ, eski iOS) sessizce yok sayılıyor. | Maçta ekran kararmasın, menüde pil harcanmasın. |
| K16 | Arka plana alınınca maç **duraklamaz**. Sunucu kuralı (3 sn nötr girdi, sonra dondurma, 20 sn sonra hükmen) aynen geçerli. Dönüşte bant uzak kalınan süreyi söylüyor; bağlantı koptuysa mevcut "Yeniden bağlanıyoruz…" akışı önce geliyor. | Netcode değişmez. Oyuncuya ne olduğunu net söylemek yeterli. |
| K17 | Yerel ağ gevşetmesi yalnız `NODE_ENV ≠ production` **ve** `IZINLI_KOKENLER` boşken geçerli; yalnız RFC 1918 IPv4 ve `.local` adlarını kapsıyor. Çerez zaten üretim dışında `Secure` değil. | Telefonla deneme kolaylaşıyor, üretimin güvenlik yüzeyi hiç değişmiyor (testli). |
| K18 | Uzun basma = `title` ipucu balonu. Tarayıcının uzun basma menüsü kapalı; metin girişlerinde açık (yapıştırma için). | Fare üstü ipuçlarının dokunmatik karşılığı. Parça adları ve yuva açıklamaları kaybolmuyor (S11). |

## 4. Gerçek cihazda doğrulanması gerekenler (sahibe)

Emülasyon gerçek dokunma donanımını, tarayıcı arayüzünü (adres çubuğu, ev çubuğu, jestler), mobil GPU'yu, ısınmayı ve gerçek ağ geçişlerini sınamaz. Telefonda (en az bir iPhone ve bir orta seviye Android, ör. Galaxy A serisi) şunlar denenmeli:

**Girdi ve his**
- [ ] Joystick + Dash/Sekme/Yetenek aynı anda (iki başparmak): bırakılan ya da yanlış düğmeye giden dokunuş var mı? Avuç içi dokunuşu yanlış tetikliyor mu?
- [ ] Joystick ölü bölgesi (%18) ve tam hız eşiği (%90) elde rahat mı? Taban yarıçapı 56 px yeterli mi?
- [ ] **Android hareketle gezinme:** soldan kenar kaydırması "geri" jesti. Joystick sol kenara yakın açılınca sayfa geri gidiyor mu? (Joystick tabanı kenardan en az 60 px içeride açılıyor; gerekirse sol pay büyütülür.)
- [ ] iOS'ta alttan kaydırma (ev çubuğu): alt sıradaki Dash/Sekme'ye basarken uygulama değiştirici açılıyor mu? (Düğmeler `safe-area-inset-bottom` kadar yukarıda.)
- [ ] Oto-nişan + sürükleyerek ezme anlaşılır mı? "Dokun = at, sürükle = nişan, geri dön = iptal" ilk maçta öğreniliyor mu (S1, 60 sn)?
- [ ] Dokunuş gecikmesi: düğmeye basış → yetenek/dash görünür tepki (120 Hz iPhone / 60 Hz Android).
- [ ] Atölye'de tek parmakla 3B döndürme hızı (120 px sürükleme ≈ 72°) uygun mu?

**Görünüm**
- [ ] Yazılar kol mesafesinde okunuyor mu (m5x7 ≈ 10,5 CSS px büyük harf)? Metin ölçeği %125/%150 telefonda düzeni bozuyor mu?
- [ ] Çentikli iPhone'da yatay iki yönde (çentik solda/sağda) güvenli alan: düğme ve paneller çentiğin altında kalıyor mu?
- [ ] Safari adres çubuğu yataydayken görünüp kaybolurken (`100dvh`) yerleşim zıplıyor mu? Ana ekrandan açılan PWA tam ekran ve yatay mı?
- [ ] Dikey çevirince örtü, yataya dönünce oyun hiçbir şey kaybetmeden sürüyor mu (maç içinde de)?
- [ ] Mobil klavye: oda kodu büyük harfle mi açılıyor, "Git" Katıl'a mı basıyor? Klavye açıkken Kayıt/Giriş alanı görünür kalıyor mu?

**Ses, güç, ağ**
- [ ] iOS: ilk dokunuştan sonra ses geliyor mu? **Sessiz anahtarı** açıkken Web Audio susar (iOS davranışı, beklenen). Arka plandan dönüşte ses geri geliyor mu?
- [ ] Wake Lock: maç sırasında ekran kararmıyor mu? (HTTPS gerekir: tünel adresiyle dene. Yerel ağ `http://` adresinde API kapalı, beklenen.)
- [ ] 10 dakika oyun: kare hızı (Antrenman ve çevrimiçi), ısınma, pil düşüşü. Atölye 3B mobil GPU'da akıcı mı?
- [ ] Çevrimiçi maçta 5 sn ve 30 sn arka plana al, sonra dön. Bant doğru mu ("N sn arka plandaydın"), 20 sn'yi aşınca hükmen ve yeniden bağlanma akışı doğru mu?
- [ ] Wi-Fi'den 4G/5G'ye geçiş, asansör/kısa kopma: "Yeniden bağlanıyoruz…" ve dönüş.
- [ ] Gelen arama / bildirim perdesi maç ortasında: girdi takılı kalıyor mu (joystick yönü sıfırlanmalı)?
- [ ] Tam ekran teklifi (Android) ve "Ana Ekrana Ekle" ipucu (iOS) birer kez mi çıkıyor, rahatsız ediyor mu?
