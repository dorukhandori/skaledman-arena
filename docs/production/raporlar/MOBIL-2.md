# MOBIL-2 raporu: telefonda (yatay) menüler

**Tarih:** 2026-11-06 · **Dal:** `claude/mobil-menu-1b6ca9` (worktree, `devran-kod` üstüne) · **Şapka:** mobil / menü
**Sahip isteği:** "mobil oynanış tamam ama mobil uyumlu menülerimiz yok, çok önemli." Ardından: "gerekirse yeni menüler çiz sıfırdan, çok karışık ve kalabalık gözükmesin" ve "atölyede çok güzel parçaları inceleme özelliğimiz var ama menü çok kalabalık."
**Kural uyumu:** `src/paylasilan/**` **değişmedi** (`git diff 0e8f65d -- src/paylasilan` boş). Ağ protokolü ve sunucu davranışı aynı. Yeni bağımlılık yok. Masaüstü düzeni piksel piksel karşılaştırıldı (§ 4): 3B animasyon karesi ve rastgele hesap adı dışında fark yok.

## 1. Ne yapıldı

Telefon düzeni artık ayrı bir stil dosyasında: [`src/istemci/stil/telefon.css`](../../../src/istemci/stil/telefon.css). Hepsi `html[data-telefon]` (dokunmatik ve `o = 1`, MOBIL-1 K1) altında; masaüstü kuralları dokunulmadı. Yapıyı değiştiren yerler küçük TypeScript kancaları (telefonda ek sekme/sarmalayıcı), masaüstünde davranış aynı.

| Ekran | Önce | Sonra |
|---|---|---|
| **Atölye** (sıfırdan) | Masaüstü 4 sütunu 1,5× yazıyla sıkıştırılmıştı: alt şerit taşıyor, Pergel balonu parça ızgarasını örtüyor, sekme etiketleri kırpık, Takım paneli taşıyor, 3B etiketleri kaymış. | **Tek odak:** solda takım şeridi (3 yuva + ▲▼ yalnız seçili yuvada), ortada büyük 3B inceleme görünümü, sağda tek panel. Panel sekmeleri: ÇEKİRDEK · GÖVDE · DİSK · UÇ · **DEĞER**. Değerler ve **parça kartı** (3B etiketine dokununca) DEĞER sekmesinde, geniş ve rahat. Alt şerit akışta (taşmaz), Pergel rozeti şeritte OYNA'nın solunda, balonu şeridin üstüne açılır ve parça ızgarasını, takım şeridini, OYNA'yı örtmez. Filtre paneli ızgaranın yerine geçer. Takım menüsü (ad, kayıtlı takımlar, aktif yap) açılır panel. |
| **Karşılama / Kayıt / Giriş** | Tek sütun, KAYIT OL düğmesi aşağıda kayıyor; tam ekran teklifi "HOŞ GELDİN" başlığını örtüyor. | İki sütun: Karşılama'da metin solda, üç düğme sağda; Kayıt'ta alanlar yan yana, buton aynı ekranda. Tam ekran teklifi lentonun boş kısmına küçüldü, içeriği örtmüyor. |
| **İlk Çekirdek** | Kartlar kesiliyor, SEÇ kartın altında yarım. | Üç kart yalnız simge + ad + dört çubuk; seçili kartta açıklama; SEÇ ve not tek satır. |
| **Market** | 2×2 raf, hücreler minik, SATIN AL aşağıda görünmüyor (kaydırmak gerek). | Tek raf + 4 sekme (Çekirdekler · Gövdeler · Diskler · Uçlar); seçili parça ve **SATIN AL** altta her zaman görünür. |
| **Lobi / Oda / Arama / Takım seçimi / VS** | "MAÇ BUL" köşeye yapışık; bot teklifi düğme metni kartı taşıyor; VS'te oyuncu adları kesik; Oda ekranında "QR · YER TUTUCU". | Kenar payı, geniş teklif kartı, geniş VS plakası; QR yer tutucusu telefonda gizli (MENU-DENETIM S-2 kararı: kaldırılacak). |
| **Sonuç ve maç menüsü** | Düğmeler panelin üstüne biniyor; Altın metni taşıyor; Esc menüsü düğmeleri 36 px. | Düğmeler akışa girdi, ödül satırı içeriğe göre yükseliyor; menü düğmeleri ≥ 44 CSS px. |
| **Ayarlar · Günlük · Krediler · Gizlilik** | Başlık iki kez (lento + panel); Krediler 5 sütunlu tablo okunmuyor. | Yinelenen başlık gizli (dikey yer kazanıldı); tablolar satır başına küçük kart. |
| **Başarımlar** | Lentonun Altın düğmesinin görünmez isabet payı GİZLİ sekmesinin üstünü örtüyordu. | İsabet payı lentonun altına taşmıyor. |

Ek düzeltmeler (MOBIL-1'den kalan hatalar): 3B etiketleri dokunmatikte `position: relative` olduğu için katman hizasından kayıyordu (düzeltildi, `dokunmatik.css`); Atölye'de takım yuvası kartlarındaki ad sarmalayıcıları (`no`, `tad`) ve Kimlik ekranlarında `.alan` sarmalayıcısı eklendi (masaüstünde görsel fark yok).

## 2. Otomatik denetim (yeni araç)

[`araclar/mobil-menu-denetim.cjs`](../../../araclar/mobil-menu-denetim.cjs): telefon yatay emülasyonunda (isMobile + dokunma, DPR 2) bütün menü ekranlarını ve durumlarını (açılır menüler, sekmeler, Pergel, filtre, parça incelemesi, oda açık, arama, bot teklifi, takım seçimi, maç menüsü, Sonuç) gezer, ekran görüntüsü alır, **hata veren** (çıkış kodu 1) denetim yapar:

- `kesik`: öğe görünüm dışında ya da kaydırılamayan bir atanın kırpmasında yarım,
- `ortulu`: öğe başka bir öğenin (ya da düğmenin görünmez isabet payının) altında,
- `kirpik`: metin kendi kutusuna sığmıyor,
- `binen`: iki düğme birbirine biniyor,
- `kucukHedef`: gerçek isabet kutusu (`elementFromPoint`) 44×44 CSS px altında,
- sayfa kayması. (Bilgi: büyük harf yüksekliği < 7,5 px olan yazı.)

Açık bir açılır menü ya da modal varsa yalnız onun içi denetlenir (altındaki ekranın örtülmesi beklenen davranış). Pergel balonu geçici ve TAMAM ile kapanır: ayrıca raporlanır, hata sayılmaz.

### Sonuç (yeni koddan, `devran-kod` birleşmesi sonrası; 3 cihazda 34 ekran/durum)

| Cihaz | Ekran sayısı | Önce: ihlalli ekran / ihlal | Sonra: ihlalli ekran / ihlal | Sonra: ölçülen dokunma hedefi |
|---|---|---|---|---|
| iPhone 14/15 (844×390) | 34 | 8 / 20 | **0 / 0** | 360 |
| iPhone SE (667×375) | 34 | 8 / 27 | **0 / 0** | 344 |
| Pixel 7 (915×412) | 34 | 7 / 16 | **0 / 0** | 362 |

"Önce" = aynı araç `0e8f65d` (MOBIL-1 sonu) koduna karşı. "Sonra" = bu dal. Ekran/durum listesi: Karşılama, Kayıt, Giriş, Gizlilik, Krediler, Profil, İlk Çekirdek, Atölye (Pergel açık, sekmeler, DEĞER, parça inceleme, takım seçimi, takım menüsü, Daha fazla, filtre), Market (seçili, alt), Başarımlar, Lobi, Oda kodu, Oda açık, Arama, Bot teklifi, Takım seçimi, Maç menüsü, Sonuç, Profil, Ayarlar, Günlük. Görüntüler: `ekran/MOBIL2-<cihaz>-<ekran>-sonra.png` (önce: `-once.png`, 11 ana ekran).

Çalıştırma (ayrı veri dizinli yerel sunucu; Playwright depoda yok, ortamdan):
```bash
KIMLIK_MODU=sifre OTURUM_SIRRI=yerel VERI_DIZINI=/tmp/devran-veri npx vite --port 5291 --strictPort
NODE_PATH=<playwright'lı node_modules> KLASOR=/tmp/mobil2 CIHAZ=iphone14,kucuk,pixel7 node araclar/mobil-menu-denetim.cjs   # EKRAN=atolye,market gibi süzülür
```
Lobi akışları (`EKRAN=lobiakis`) aynı anda koşulmamalı: üç test hesabı birbirini eşleştirir ve bot teklifi gelmez; cihazlar **sırayla** koşulur.

**Not:** otomatik denetim "kalabalık" hissini ölçmez; "önce" sayıları bu yüzden düşük görünür. Asıl kanıt görüntüler: `ekran/MOBIL2-*-once.png` ve `ekran/MOBIL2-*-sonra.png`.

## 3. Kararlar (varsaydım işaretli)

| # | Karar | Gerekçe |
|---|---|---|
| K1 | **Varsaydım:** Atölye'de değerler ayrı sütun değil, sağ panelin **DEĞER** sekmesi. 3B etiketine dokununca parça kartı da orada açılır (sekme kendiliğinden geçer). | Sahip: "parçaları inceleme özelliği güzel ama menü kalabalık." 3B görünüm tam yükseklik alıyor; değerler istenince geniş açılıyor. Bedel: parça takarken değer farkını görmek için DEĞER sekmesine geçmek gerek (dokunmatikte üzerine gelme önizlemesi zaten yok). |
| K2 | **Varsaydım:** takım yuvaları solda dar şerit (simge + sıra no); ad ve Lv. 3B başlığında. ▲▼ yalnız seçili yuvada, 44 px. Kayıtlı takımlar, ad, aktif yap açılır panelde. | Yuva seçimi en sık işlem; ad bilgisi zaten 3B başlığında. |
| K3 | **Varsaydım:** sekme çubuğunda seçili olmayan sekmeler yalnız simge (44 px), seçili sekme simge + ad. | 5 etiket 1,5× yazıyla sığmaz; ad seçili olanda görünür, `aria-label` hepsinde var. |
| K4 | Pergel telefonda alt şeride yerleşir (OYNA'nın solu); balon şeridin üstüne, 3B + sağ panel alanına açılır. | Pergel doc § 2: balon OYNA'yı, yuvaları ve ızgarayı örtmez. Bedel: açıkken sağ panelin alt yarısını geçici örter (TAMAM 44 px). |
| K5 | "Birleştir" telefonda "Topla" (kısa ad). | 3B sütununda dar kenar. |
| K6 | Tam ekran teklifi lentoda yalnız düğmelerle (açıklama metni yok). | İçeriğin başlığını örtmesin. |
| K7 | Sonuç, Esc menüsü, bot teklifi, VS: yalnız telefon kurallarıyla düzeltildi; masaüstündeki aynı taşmalar (MENU-DENETIM H-4) **bu işte masaüstünde düzeltilmedi**. | "Masaüstü bozulmayacak" kuralı; H-4 ayrı iş. |
| K8 | Krediler/Gizlilik içeriği (geliştirici durum notları, MENU-DENETIM H-2) bu işte değiştirilmedi; yalnız yerleşim. | İçerik kararı sahibin (S-3). |
| K9 | Mobil ölçek kuralı (MOBIL-1 K8: `o = 1`, `yo = 1,5`) aynen; yazı boyutu kesirli çarpana çekilmedi. | Pixel yazı cihaz ızgarasında kalıyor. |

## 4. Masaüstü regresyonu

[`araclar/masaustu-karsilastir.cjs`](../../../araclar/masaustu-karsilastir.cjs): eski (`0e8f65d`) ve yeni kodu 1280×720 masaüstü görünümünde 13 ekranla (1280×720, DPR 1) çekip piksel piksel karşılaştırır (sharp).

| Ekran | Piksel farkı |
|---|---|
| Karşılama, Kayıt, Giriş, Gizlilik, Krediler, Market, Başarımlar, Lobi, Ayarlar, Günlük | **0,000 %** |
| İlk Çekirdek | 0,010 % (kart önizlemesi animasyonu) |
| Profil | 0,137 % (rastgele hesap adı) |
| Atölye | 0,498 % (**yalnız** 3B topaç alanında, x 610-785 · y 176-565; geri kalan piksel aynı) |

Karşılaştırma tabanı `devran-kod` ucu (`cb6301a`, marka logosu dahil); yeni = bu dal.

Atölye'deki küçük fark 3B topaç animasyonunun karesi (fark yalnız 3B alanında); Profil'deki fark rastgele oluşturulan hesap adı. İkisi düzen değişikliği değildir.

## 5. Sağlık

- `npm run typecheck`, `npm run lint`: temiz.
- `npm test`: 28 dosya, **523/523** geçti.
- `npm run build`: temiz (`dist/server/server.mjs` üretildi).
- Altın hash'ler: `src/paylasilan/**` değişmedi (`git diff` boş), `npm run test:tarayici` bu yüzden bit bit aynı kalır.

## 6. Kalan sorunlar ve bilinenler

- **Profil** ekranı telefonda tek sütun ve kaydırmalı (İlk açılışta KAYDET/BAŞLA düğmesi görünür ama başlık kaydırmayı bekler). Arma ızgarası 3 sütun. İki sütunlu yeniden yerleşim sonraya.
- **Başarımlar**: 9 sekme iki satırlı, 8 kart; sığıyor ama yoğun. İsterseniz 3 sütun ya da sekme açılırı.
- **Metin ölçeği %125/%150** telefonda denenmedi (`data-yazi-buyuk` kuralları masaüstü mantığı: tek sütuna kırılır). Atölye'nin telefon düzeni bu modda sınanmadı.
- **Klavye açıkken** (Kayıt, Giriş, oda kodu): emülasyon sanal klavye göstermez. Kayıt/Giriş iki sütunlu olduğu için alanlar ve buton aynı ekranda; kart kendi içinde kayar. Gerçek cihazda doğrulanmalı.
- **Çentik / güvenli alan**: emülasyonda inset yok; Tam ekran teklifi sol konumu 190 px (+ güvenli alan), çok geniş lento plakalarında (BAŞARIMLAR) teklifle yan yana gelebilir (10 sn, bir kez).
- **Dikey mod**: "cihazı yatay çevir" örtüsü aynen.
- Telefonda **Atölye'de parça önizlemesi (üzerine gelme)** yok; parça dokununca doğrudan takılıyor (MOBIL-1 K18 ile aynı).
- **Sonuç ekranının** masaüstü taşmaları (H-4) açık.

## 7. Gerçek cihazda sahibin doğrulayacağı liste

Emülasyon gerçek dokunma donanımını, tarayıcı arayüzünü, sanal klavyeyi, çentiği, gerçek GPU'yu denemez. **Gerçek telefon denemesi sahibe kalır.**

- [ ] Atölye: 3B topaca parmakla sürükleyerek dönme, etikete dokunup parça inceleme (DEĞER sekmesinde kart), ◄ GERİ.
- [ ] Atölye: parça dokununca takılıyor mu, takım şeridinden yuva değiştirme ve ▲▼ ile sıra değiştirme rahat mı.
- [ ] Atölye: sekme çubuğunda yalnız simgeli sekmeler anlaşılıyor mu (ÇEKİRDEK/GÖVDE/DİSK/UÇ/DEĞER).
- [ ] Pergel balonu: ilk açılışta çıkıyor, TAMAM ile kapanıyor, parça ızgarasını örtmüyor.
- [ ] Kayıt/Giriş: klavye açıkken alan ve buton görünür mü; oda kodu alanı büyük harfle açılıyor mu.
- [ ] Market: sekmeler, seçili parça adı ve SATIN AL altta görünüyor mu; satın alma onayı.
- [ ] Lobi: MAÇ BUL başparmakla ulaşılıyor mu (sağ alt), çentik/ev çubuğu payı.
- [ ] Çentikli iPhone'da iki yönde yan boşluklar (menüler çentiğin altında kalmıyor mu).
- [ ] Android: soldan kenar kaydırması "geri" jesti Atölye'deki takım şeridine dokunurken tetikleniyor mu (şerit kenara 8 px yakın).
- [ ] Safari adres çubuğu yataydayken görünüp kaybolurken yerleşim zıplıyor mu (`100dvh`).
- [ ] Metin ölçeği %125/%150.
- [ ] Tam ekran teklifi (Android) ve "Ana Ekrana Ekle" ipucu (iOS) başlıkları örtmüyor mu.

## 8. Canlıya çıkış (2026-11-06, sahibin isteğiyle)

Sahip işin sonunda "canlıya çık" dedi; `devran.ovarlak.games` güncellendi. Sırayla:

1. `devran-kod` ucundaki marka logosu commit'leri (`1624384`, `cb6301a`) bu dala birleştirildi (VPS kaynağı o commit'lerin gerisinde olmamalıydı; yoksa logo ve `kur.sh` yedek düzeltmesi geri alınırdı).
2. Typecheck, lint, 523/523 test, build yeşil. Maç yoktu (`odalar: 0`).
3. VPS'te elle yedek (`deploy/yedek.sh`, "bütünlük ok") ve önceki kaynağın kopyası: `/root/devran-kaynak-onceki-mobil2-20261106.tgz` (geri dönüş için).
4. Kaynak `rsync -a` ile `/root/devran-kaynak/` altına **`--delete` olmadan** gitti (orada depoda olmayan `art-source` vb. var), ardından `bash deploy/kur.sh` (npm ci, build, port 2568 doğrulaması).
5. `kur.sh` `enable --now` kullandığı için çalışan servisi yeniden başlatmaz: `systemctl restart devran` ayrıca yapıldı.
6. Doğrulama: `/api/saglik` → `{"ok":true,"protokol":6,"katalog":"934bcfd25effd463","kimlik":"sifre","odalar":0}`; ana sayfa ve `/gizlilik` 200; geliştirme ucu (`/api/gelistirme/altin-ver`) **404**; telefon emülasyonuyla canlı Karşılama ve Kayıt açıldı (`data-telefon=1`, iki sütunlu düzen, konsol hatası 0). Canlı sitede hesap açılmadı.

**Not:** Bu dal (`claude/mobil-menu-1b6ca9`) `devran-kod`'a ya da `main`'e **birleştirilmedi** ve itilmedi; canlıdaki kod şu an `devran-kod`'un MOBIL-2 kadar ilerisinde. Birleştirme (PR) sahibin kararı.
