# MENU-P2: gezinti modeli (S-1) ve Atölye / Profil / Market düzenleri

**Tarih:** 2026-11-06 · **Dal:** `devran-kod` · **Ajan:** `[@glyph · UI Programmer]`
**Kaynak:** [MENU-DENETIM.md](MENU-DENETIM.md) (bulgular, sahip kararları S-1…S-3) · Pergel sınırları [`bilgic-pergel.md`](../../ux/bilgic-pergel.md) § 2, § 6.
**Durum:** bitti. **Commit yok** (lider gözden geçirip commit'ler). Sahibe soru sorulmadı; seçim gereken yerde denetimin önerisi uygulandı, ayrıldığım yerler "varsaydım" diye işaretli.

## Madde madde

| # | Durum | Ne yapıldı |
|---|---|---|
| **S-1 / K-1** gezinti modeli | yapıldı | Atölye ana üs. Lento = ◄ (yalnız alt ekranda) · plaka (ekranın adı) · Altın · tek ⚙ (pixel dişli, `?ekran=ayarlar`). "Daha fazla" açılırı ve `acilirMenu` / `.k-menu` CSS'i kaldırıldı; Atölye lentosundaki `AYARLAR` ve `ÇIKIŞ` düğmeleri kalktı, **Çıkış** Ayarlar'ın yeni **Hesap** bölümünde. Atölye alt sırası **MARKET · BAŞARIMLAR · GÜNLÜK · PROFİL** (+ İlk Kazı sonrası **OCAK**; h:akış onu `data-eylem=ocak` ile arıyor). DENE gezinti sırasından çıktı, seçili topacın yanına (Ayrıntı'nın yanı) taşındı. |
| **K-2** plaka = ekran adı | yapıldı | Kayıt `KAYIT OL`, Giriş `GİRİŞ YAP`, Profil `PROFİL` (eskiden üçünde `DEVRAN`); Karşılama marka logosunu korur. İçerikteki ikinci başlıklar kalktı (Ayarlar, Günlük, Kayıt, Giriş, Profil). ◄ her alt ekranda lentonun başında: Market, Başarımlar, Günlük, Profil, Ayarlar → Atölye; Kayıt/Giriş → Karşılama (misafir ana ekranı); Ayarlar misafirde → Karşılama. `geriDugmesi` lentoda ◄ varsa ikincisini eklemez. Atölye plakasındaki sistem yazı tipine düşen süs `◄` kalktı. |
| **K-5** KAYDET | yapıldı | Değişiklik yokken KAYDET yok; varsa OYNA'nın solunda **KAYDEDİLMEDİ** rozeti + KAYDET. OYNA önce kaydeder (ipucunda yazıyor); eski "Kaydedilmemiş değişiklik" uyarı balonu kalktı. |
| **C-1** tek odak dili | yapıldı (ortak CSS + arayuz.ts) | Beyaz kalın halka yerine ortak **bronz köşeli odak çerçevesi**: `arayuz.ts odakCercevesiKur()` (stilEkle ile her ekranda kurulur) klavye odağındaki öğenin çevresine `.k-odak-cerceve` çizer; `.k-zemin`, `.rf`, `.tam-katman` beyaz `outline` kuralları (bilesenler.css, ekranlar.css) kalktı. Kayıt, Profil, Ayarlar, Market, Başarımlar, Atölye, Pergel ve (paylaşılan `.k-zemin` kuralı üzerinden) Lobi aynı çerçeveyi alır. Kendi halkasını çizen öğe (ör. `Mac.ts` `.ms button` 4 px beyaz) çerçeve almaz (çift çizim olmaz); seçimle aynı olan radyo kartları (İlk Çekirdek, Ayarlar seçimleri) `data-odak-cerceve=secim` ile yalnız seçim köşesini gösterir. |
| **C-2** kısayol rozetleri | yapıldı | `.k-tus` tek biçim (11 yükseklik, koyu yonga + bronz çizgi, m5x7 16, büyük harf) + `.k-kisayol` kapsayıcı. Pergel `[H] başka ipucu`, Atölye parça kartı `[ESC] geri`, Dene `[ESC] Atölye` bu bileşenle; Lobi'nin `ENTER`/`ESC` rozetleri aynı ortak CSS'ten biçim alır (Lobi.ts'ye dokunulmadı). Dokunmatikte `.k-tus` gizli (değişmedi). |
| **C-4** lento ikonları | yapıldı | Atölye plakasındaki yazı tipi `◄` süsü kalktı; ⚙ 11×11 pixel dişli (`crispEdges` SVG, bronz), ◄ ve Altın sprite olarak kaldı. |
| **H-3** İlk Çekirdek seçim çerçevesi | yapıldı | Ekrana özel `::before` köşesi yerine ortak `.k-centik` bileşeni kartın kendi kenarına bağlı; kart kutusuna 6 px iç pay (köşeler kırpılmıyor), ilk odak `preventScroll` (kutuyu kaydırıp üst köşeleri saklıyordu), kart yükseklikleri 720 px'e sığdırıldı (SEÇ satırı yatay). |
| **H-6** "MARKET'TEN AL" taşması | yapıldı | Hücre etiketi **MARKET**; tam metin ipucunda ve ARIA'da. |
| **H-7** Profil yazı tipi / arma etiketi | yapıldı | Arma ızgarası 3 sütun (ad hücreye sığar, sığmazsa "…"), ilk profilde ad pixel başlık yazısıyla (`.sabit-ad`, eskiden `font-weight:800` ile sentetik kalın), ad girişi `k-alan` (m5x7). `◄ Geri` düğmesinin Arial'e düşmesi (`.k-geri`) ortak CSS'te `font-family` ile kapatıldı. |
| **H-8** Uyum kutusu / Pergel balonu | yapıldı | Ölçüm: ikisi de zaten m5x7 idi (küçük harf m5x7 farklı görünüyordu). Uyum/Bilgi kutularına yazı tipi açıkça jetonlardan verildi ve diğer etiketler gibi büyük harf; Pergel balonu ve içindeki her öğe `--font-etiket`. Yazı tipi dökümü (her ekran, pixel dışı yazı listesi) boş. |
| **H-9** Takım kartı | yapıldı | Ad tek satır, sığmazsa "…" (tam ad ipucunda); sıra numarası mini topacın köşesinde rozet; Takım sütunu 94 → 112 px (adlar artık tam: "KASIRGA DÖKÜM"). ▲▼ glif yerine pixel üçgen (`.k-ok-yukari/.k-ok-asagi`, system-ui düşmesi yok), 13×12 mantıksal px (1280'de 26×24), dikey; telefonda 44×44 (dokunmatik.css, yalnız seçili kartta). "Yeni yetenek" rozeti ad satırından ayrı satırda. |
| **H-13** Ayarlar | yapıldı | Bölümler **Görünüm · Maç · Bilgi · Hesap**; Hesap kırmızı çerçeveli ayrı kutu (Çıkış yap + Hesabımı sil). Bölüm başlıkları küçültüldü: 1280×720'de hepsi ilk ekranda. Panel taşarsa altta ortak **"▼ Aşağıda devamı var"** şeridi (`kaydirmaIpucu`, Profil'de de). |
| **K-3** varsayılan sekme | yapıldı | `cekirdek` (taslak geri yüklemede de varsayılan). |
| **K-4** Pergel balonu ızgarayı örtmesin | yapıldı | Balon parça paneli genişliğinde (172 px mantıksal, 3B görünüme taşmaz); açıkken panelin altına balon yüksekliği kadar pay verilir (`Atolye.pergelPayi`, MutationObserver + resize): ızgara balonun üstünde biter, fazlası panelin içinde kayar. OYNA, yuvalar, alt sıra açık (§ 2.1). |
| **K-6** Ağırlık 0 | yapıldı (varsaydım: taban 1) | Gösterilen değer en az **1**, çubuk en az %2; satır ipucunda "1 = katalogdaki en düşük, 100 = en yüksek" + ham değer. Fark (±) hesabı değişmedi. |
| **K-9** Market detay kartı | yapıldı | Sağ sütunda seçili/üzerine gelinen parçanın kartı: ikon, ad, tür · element · köken · katman, "1. topacına takılırsa" altı çubuk farkı, fiyat (indirim çizgili) ya da Sende ya da kilit şartı (başarım adı + ilerleme çubuğu), Ocak craft satırı. Ana düğme adı söyler: **KAYA MADEN / 100 ALTIN AL** (ücretsizse "ÜCRETSİZ AL"; sahipse "ATÖLYE'DE TAK"; kilitliyse "BAŞARIMLAR"). Onay penceresi aynı (hücre tıklaması da onu açar; d7-akış uyumlu). Eski yüzen ipucu ve sol alt etiket kalktı. Telefonda kart altta tek satır şerit. |
| **K-10** Market zemini | yapıldı | Tek zemin (gece göğü, `k-gece`); ahşap yalnız raf tabelalarında. Raf hücreleri dar sütuna göre `minmax(0,1fr)`. |
| Market kilitli hücre "0/10" | yapıldı | Hücrede çubuk yok; rozet **KİLİTLİ** (ilerleme başladıysa "3/10"); şart ve çubuk detay kartında. |
| **K-11** Başarım ödülleri | yapıldı | Her ödül kendi satırında, sola hizalı, ikonla (sikke · parça 3B ikonu · açılan özellik işareti), sığmazsa "…" + ipucu; "Market" bağlantısı satır sonunda. Son açılan parça yoksa alttaki boş şerit hiç çizilmiyor. |
| **K-12** Günlük | yapıldı | Dört istatistik tek sırada (Kararma/ömür varsa sıra uzar), ruh kartı küçültüldü (siluet 48 px, ad + element aynı satır): 1280×720'de ilk ekranda tam. `Lv.` yazımı her yerde aynı (`.k-lv` + `lvYaz`: liste, kilit rozetleri, alt not; Atölye takım kartı ve ödünç notu da). |
| **K-13** Ayarlar | yapıldı (varsaydım ×2) | Gizlilik/Krediler düğme dilinde (`k-dugme kucuk`). `%100` biçimi yerine **NORMAL · BÜYÜK · ÇOK BÜYÜK** (yüzde ipucunda). Yazı tipi ayarı **kaldırılmadı**, iki seçenekli radyoya çevrildi (**PİXEL · DÜZ (OKUNAKLI)**): tek seçenekli görünen şey aslında okunurluk anahtarıydı (`menu-tasarim-arastirma § 6.2`); kaldırmak erişilebilirlik özelliğini silerdi. Sahip kaldırılmasını isterse tek satır. |
| **K-14** Kayıt/Giriş sol panel | yapıldı | Sol panelde topaç + 3 cümlelik tanıtım (ne, nasıl kurulur/sürülür, nasıl kazanılır); "Hesabın var mı? Giriş yap" / "Hesabın yok mu? Kayıt ol" ikincil düğme. Karşılama'da sağ panel zaten anlattığı için solda yalnız topaç. |
| **K-15** Profil | yapıldı | Destek kanalı açılırı kalktı: etiket + tek cümle açıklama + alan her zaman görünür. **Tek KAYDET**: ad değiştiyse önce ad (hata adın altında, kayıt durur), sonra profil/karakter/çerçeve/vitrin. KAYDET sol panelde canlı önizlemenin altında (sağ form uzasa da hep görünür). |
| **K-16** İlk Çekirdek görselleri | yapıldı | Kaide üstündeki çıplak top yerine gerçek Çekirdek (`ikonOnbellek`, `parca3bIkonEl` + `ikonGozle`; 3B hazır olana dek yordamsal). 5 sn hareket önizlemesi "daire + nokta" gibi okunuyordu: istatistiklerin altına, kart genişliğinde taşındı. Ömür rozeti her kartta: Yapay "Ömür 30 maç · yenilenir", diğerleri "Ömür sınırsız" (ipucunda açıklama). |
| **P4** (kısmi) | yapıldı | Ortak bileşenler `stil/bilesenler.css`'e: `.k-ayar`, `.k-odak-cerceve`, `.k-tus`/`.k-kisayol`, `.k-kaydir-ipucu`, `.k-lv`, `.k-ok-yukari/asagi`. Ekran STIL bloklarındaki beyaz odak kuralları ve sistem yazı tipi kalıntıları kalktı. Tüm STIL bloklarının taşınması (P4'ün tamamı) yapılmadı. |
| Topaç Lab kapısı | yapıldı | `TopacLab.baslat` yalnız `?gelistir=1` (araçların `?debug`'ı da) ile açılır, yoksa Atölye'ye döner; Atölye lentosunda `?gelistir=1` iken küçük **LAB** bağlantısı (Pergel `lab` ipucunun hedefi). |

### Ek iş (koordinatör): profilde dövülen arma + çerçeve önizlemesi (HARITA-KOD "Kalan işler")

| Parça | Durum |
|---|---|
| Sunucu | **Eksikti, eklendi.** `POST /api/profil` arma alanı yalnız 6 element kabul ediyordu; `PATCH /api/profil` arma almıyordu. `armaDenetle` (src/sunucu/api/harita.ts): element simgesi ya da **sahip olunan** `arma-*` görünümü; biçim dışı → 400 `bicim`, dövülmemiş → 403 `sahipDegil`. İki uç da kullanır; `arma` sütunu zaten vardı (08 § 4 "arma zaten var"), göç yok. |
| Test | `test/harita-api.test.ts`: sahipsiz dövülen arma PATCH/POST 403, bozuk kimlik 400, `gorunumVer` sonrası 200 ve `/api/ben` armayı döndürür, element armaya dönüş 200. |
| İstemci | Profil arma ızgarası: 6 element + `/api/ocak` görünümlerindeki `arma-*` (24×24 görsel, `GORUNUM_IKON`), adı "Cevher Kor" biçiminde. Önizleme kartı seçilen çerçeveyi **9-dilim, kenar 6** (`border-image-slice:6`, genişlik 6 px mantıksal) çizer; çerçeve yoksa profil rengi. Haritadaki karakter (BEKLE karesi) de önizlemede. |
| Not | `Harita.ts:481` armayı metin olarak (`arma.toUpperCase()`) yazıyor: dövülen armada "ARMA-CEVHER-KOR" görünür. Harita.ts bu turda yalnız lento API'si değişirse düzenlenebildiği için dokunulmadı. Çalışan geliştirme sunucusu (5391) yeniden başlatılmadığı için yeni sunucu kuralını tarayıcıda dövülen armayla uçtan uca denemedim; kural API testiyle doğrulandı. |

## Atlanan / başkasına kalan

- **Lobi lentosunda ⚙ yok:** Lobi `lentoKur`'u doğrudan çağırıyor; `ayar` varsayılanı yalnız `ekranKok`'ta açık. Lobi.ts başka ajanda: S-1 tam olsun diye Lobi `lentoKur(k, { …, ayar: true })` demeli (tek satır). Lobi'de `LV.2` büyük harf yazımı da orada (`lvYaz` hazır).
- **Harita / Maden / Ocak ◄ hedefi:** S-1 "◄ hep Atölye" diyor; harita ekranları oyna akışında (◄ Lobi / Harita). Görselleri korunsun diye dokunmadım; `ekranKok` üzerinden yalnız ⚙ aldılar. Maden'in "◄ yoksa ekle" davranışı aynı.
- **Mac Esc menüsü (C-1):** `Mac.ts` kendi 4 px beyaz halkasını çiziyor; ortak `.k-zemin :focus-visible` kuralı (artık `outline:none`) onu ezdiği yerde bronz çerçeve devreye girer, ezmediği yerde Mac'in halkası kalır (çift çizim yok). Esc menüsünü bu turda tarayıcıda açıp bakmadım.
- `referansStil.ts`'teki `.rf` beyaz odak kuralına dokunmadım (izinli listede değil); `ekranlar.css`'teki `!important` kural onu geçersiz kılıyor.
- Telefon (844×390) Atölye sol paneli (parça adları, FİLTRE) önceden de sıkışıktı; bu turda yalnız alt sıra sığdırıldı (gezinti etiket yazısıyla).
- 3B görünümdeki katman etiketleri (`g3-etiket`, 22 px yükseklik) denetimin 24 px eşiğinin altında; maddelerimde değildi.

## Değişen dosyalar

`src/istemci/ekranlar/`: `arayuz.ts`, `Atolye.ts`, `Diger.ts`, `Profil.ts`, `Kimlik.ts`, `IlkCekirdek.ts`, `Market.ts`, `Basarimlar.ts`, `Gunluk.ts`, `Dene.ts`, `TopacLab.ts` · `src/istemci/bilgic/Pergel.ts` · `src/istemci/stil/bilesenler.css`, `ekranlar.css`, `dokunmatik.css` · `src/sunucu/api/harita.ts`, `src/sunucu/api/rotalar.ts` · `test/harita-api.test.ts`.

## Kapılar

| Kapı | Sonuç |
|---|---|
| `npm test` | **647/647** (37 dosya; görev başında 628 idi, aradaki artış başka oturumların testleri + bu turun arma denetimleri) |
| `npm run lint` | temiz |
| `npm run typecheck` | temiz (ara bir koşuda `src/istemci/oyun/RuhGorsel.ts` başka ajanın yarım işinden hata verdi; son koşuda temiz) |
| `npm run build` | yeşil |
| `menu-denetim-ekran.cjs misafir ilk ana lobi menuler` (1280×720, 5391) | konsol **hata 0** (13 uyarı: swiftshader WebGL "GPU stall" performans uyarısı, kodla ilgisiz). Yazı tipi dökümü her ekranda yalnız Jersey 10 + m5x7. Kalan otomatik bulgular: `sr-only` gizli metinler (kasıtlı), 3B katman etiketleri 22 px (kapsam dışı), Lobi mod düğmesi 8 px taşma (Lobi.ts) |
| Kendi denetim betiğim (pixel dışı yazı + taşma + konsol; 1280×720 ve 844×390 dokunmatik) | pixel dışı yazı **0**, konsol hatası **0** |
| `h:akis` (P2) | 1. koşu maden adımında 10 sn beklemede zaman aşımı (yürüme sunucuya ulaşmıştı: konum b1-02). Aynı hesapla elle tekrar: b1-02 → KAZ, b1-01 → DÖVÜŞ anında; 2. tam koşu **geçti**, konsol hatası **0** (maç, kazı, erit, parça üret, Market ÜCRETSİZ, profil karakter/vitrin, telefon). Ekran görüntüleri ve `HARITA-P2-akis.json` depodan çıkarıldı. |

## Görüntüler

Önce: `ekran/MENU-02-kayit.png`, `MENU-12-ilk-cekirdek.png`, `MENU-13-egitim-oncesi-acilis.png`, `MENU-20-ana-acilis.png`, `MENU-22-market.png`, `MENU-23-basarimlar.png`, `MENU-24-gunluk.png`, `MENU-25-profil.png`, `MENU-26-ayarlar.png`, `MENU-40-ust-menu-0.png`.
Sonra: `ekran/MENU-P2-02-kayit.png`, `MENU-P2-11-profil-yeni.png`, `MENU-P2-12-ilk-cekirdek.png`, `MENU-P2-13-egitim-oncesi-acilis.png` (Pergel açık, ızgara örtülmüyor), `MENU-P2-20-ana-acilis.png`, `MENU-P2-21-atolye-degisti.png` (KAYDEDİLMEDİ + KAYDET), `MENU-P2-22-market.png`, `MENU-P2-23-basarimlar.png`, `MENU-P2-24-gunluk.png`, `MENU-P2-25-profil.png`, `MENU-P2-25b-profil-cerceve-arma.png` (Demir çerçeve 9-dilim + dövülen arma), `MENU-P2-26-ayarlar.png`, telefon: `MENU-P2-telefon-21-atolye-degisti.png`, `MENU-P2-telefon-22-market.png`.
