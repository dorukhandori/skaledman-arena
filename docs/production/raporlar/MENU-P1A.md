# MENU-P1A: Lobi / Maç / Sonuç / Krediler düzeltmeleri

**[@glyph · UI Programmer]** · **Tarih:** 2026-11-06 · **Dal:** `devran-kod` · Kaynak iş listesi: [MENU-DENETIM.md](MENU-DENETIM.md)
(sahip kararları S-2, S-3). **Commit yok**; değişiklikler çalışma ağacında, lead inceleyip commit'leyecek.

## Özet

13 maddenin 13'ü yapıldı. Atlanan yok. Paylaşılan stil dosyalarına (`stil/**`, `arayuz.ts`) dokunulmadı; her CSS ekranın kendi
`STIL` bloğunda. `src/paylasilan/sim/**` değişmedi.

| # | Durum | Ne yapıldı | Dosya |
|---|---|---|---|
| H-1 (S-2) | yapıldı | Oda ekranındaki `QR · YER TUTUCU` paneli ve dama deseni CSS'i kaldırıldı. Bağlantı / Seyirci bağlantısı / Kodu kopyala aynen duruyor; sağ sütunda yalnız boş rakip kaidesi (dikey ortalı). | `Lobi.ts` |
| H-2 (S-3) | yapıldı | Krediler oyuncu sürümü: `oyuncuKredileri()` (saf) krediler.md tablolarını **Varlık · Atıf · Lisans** üç sütuna indirir; Durum/Not sütunu, dosya yolları, URL'ler, "aday / entegre değil" notları ve manifest denetim satırları gösterilmez. Oyunda yüklenmeyen satırlar düşer (Foozle yedek havuzu, bayrakla kapalı 21 ruh portresi, dağıtılmayan Ata kaynak sayfaları). Yazılım tablosu da aynı üç sütun; MIT bildirimi açılır kutuda. Sayfa yüksekliği ~7 500 px → kart içi 2 200 px kaydırma. Bölüm adları oyuncu dilinde ("Ses ve görsel efektler", "3B görüntüleyici", "Yazı tipleri", "Efekt kodu", "Kendi üretimimiz"). `docs/art/krediler.md` tam iç kaynak olarak kaldı; `npm run krediler:uret` ve `test/d8.test.ts` geçiyor. | `paylasilan/krediler.ts`, `Bilgi.ts` |
| H-4 | yapıldı | Sonuç kutusu dikey akışa çevrildi (flex sütun): düğme sırası panellerin **altında** (artık üstüne binmiyor), Bitiş tablosu kalan yeri alıp gerekirse kayıyor; satırlar sıkılaştırıldı (26 px), Altın yığını 64→44, ana düğme 60→48 px yazı. Ölçüm (1–3 skoru, 3 satır): ödül paneli altı 607 px, düğme sırası üstü 608 px, DÖKÜM 549–587 px panel içinde; üç satır kaydırmasız görünüyor. "Rakip rövanş istemedi" satırı düğmelerin üstüne yerleşiyor. | `Mac.ts` |
| H-5 | yapıldı | Rakibin puanı artık `−2` değil, rakip renginde (`--rakip-yazi`) `+2`; "sen"/"rakip" etiketleri taraf renginde. | `Mac.ts` |
| H-10 | yapıldı | Rozet kararı saf modüle çıktı (`baglantiRozetiKarari`): bot maçında hiç görünmez; en az 3 RTT örneği ve maç fazında 40 yama (~2 sn) birikmeden görünmez. Kök neden de düzeltildi: "takılma" (yamalar arası > 250 ms) artık yalnız **maç fazında** ölçülüyor; seçim fazında yama saniyede bir geldiği için maç başında 5 sn yanlış "kayıp" yanıyordu. Bot maçında 6 sn boyunca 12 örnek: hepsi `gizli`. | `ag/baglantiRozeti.ts` (yeni), `ag/AgMaci.ts` |
| H-11 | yapıldı | VS plakası içeriğe göre genişliyor (`width:auto`, en az 200, en çok taraf genişliği − 16); ad yalnız taraf genişliğini aşarsa kesiliyor. "DEVRAN BOTU" tam görünüyor. | `Lobi.ts` |
| H-12 | yapıldı | Yetenek yuvası adları m5x7 16 px (jeton boyutu, ölçümle doğrulandı: `fontFamily = m5x7`), kesilmiyor: gerekirse iki satır, yuvanın hemen üstüne alttan hizalı. Tek sözcükte sığmayan uzun adlar (≥ 10 harf, ör. "Közyağmuru") Türkçe hece sınırında yumuşak tireyle bölünür (`heceliAd`). Tam ad hem yuvanın hem etiketin `title`'ında (masaüstünde yuva ve etiket fareye açık). %125/%150 metin ölçeği için boyutlar güncellendi. | `oyun/MacHud.ts`, `oyun/heceliAd.ts` (yeni) |
| H-14 | yapıldı | `?ekran=ruhlar` yalnız `?gelistir=1` ile yönleniyor (Atölye'deki Topaç Lab girişiyle aynı bayrak). Bayraksız istek varsayılan ekrana düşüyor (doğrulandı: `?ekran=ruhlar` → profil/karşılama; `?ekran=ruhlar&gelistir=1` → kontakt sayfası). | `main.ts` |
| K-7 | yapıldı | Lobi takım sahnesi Atölye ile aynı temsil: her üyede 3B topaç + **Çekirdek adı** + Lv etiketi; ödünç = gri çerçeve (#6a7088, Atölye'deki değer) + gri ikon (grayscale, 0,7) + "Ödünç · Lv.1". `title` ödünç kuralını açıklıyor. | `Lobi.ts` |
| K-8 | yapıldı | Sol panel içerik yüksekliğinde (2/3 boşluk kalktı); mod notu düğmelerin hemen altında **tek satır** ("İlk 3 puan · 90 sn", "Arkadaşınla oyna", "Altın, başarım yok"). Kuşak halkası yeniden oranlandı: alt yay kaidelerin hemen altından geçiyor, ad etiketleri halkanın altında. | `Lobi.ts`, `lobiCizim.ts` |
| K-17 | yapıldı | Bekleme ekranında "RAKİP ARANIYOR" + sayaç ve öneri (Beklerken Antrenman / Bot ile oyna) **tek blokta, çanağın üstünde ortada**; öneri yeri baştan ayrılmış (öneri belirince çanak kaymıyor). Boş rakip kaidesi çanağın içine (sağ yarı) alındı. | `Lobi.ts` |
| K-18 | yapıldı | VS'deki "TAKIM SEÇİMİ" etiketi yalnız gerçekten seçim varken (birden çok takım ve seçim fazı). Tek takımlı oyuncuda etiket yok. | `Lobi.ts` |
| C-3 | yapıldı | Esc menüsü alt notu tek satır, sıkı satır aralığı: "Maç durmaz · Esc: kapat" (dokunmatikte "Maç durmaz"). | `Mac.ts` |

## Varsaydım (sahibe sormadan seçilenler)

- **H-2 "kullanılan varlık" ölçütü.** krediler.md'deki "Durum" sütunu ve manifestteki `durum` alanları eski: "aday, entegre değil"
  yazan Kenney / BigSoundBank / Till Behrend / IgnasD sesleri `public/ses/kayit/` altında ve `Ses.ts` onları çalıyor; "pişirildi,
  oyun yüklemiyor" yazan pixelfx ve "entegre değil" yazan Aim karelerini `EfektAtlas.ts` `public/efekt/` atlaslarından yüklüyor.
  Bu yüzden "aday" sözcüğü tek başına dışlama sebebi sayılmadı; yalnız açık "kullanılmıyor" işaretleri (`yedek havuz`,
  `atlasa alınmadı`, `maçta yüklenmez`, `bayrakla kapalı`, `dağıtılmaz` parçası) satırı düşürüyor. **@iris için not:** krediler.md
  Durum sütunu ve manifest `durum` alanları güncellenmeli (oyuncu sayfasına yansımıyor ama iç kayıt yanlış).
- **H-2 atıf metni.** "Atıf metni (oyun içi)" sütunu varsa o; yoksa yazar/telif (URL kısaltılmış); kendi üretimimizde "Devran",
  yapay zekâ hattıyla üretilenlerde "Devran (yapay zekâ destekli üretim)". Lisans "bizim" → "Devran".
- **H-5** iki seçenekten "rakip renginde +N" seçildi (SEN/RAKİP sütunları yerine; tablo yüksekliği değişmesin diye).
- **H-12** veride kısa ad alanı açmak yerine (veri/ dosyaları sınırım dışında) iki satır + hece tiresi; tam ad `title`'da.
- **H-14** yalnız `?gelistir=1` (yalnız `import.meta.env.DEV` değil): denetim ve test oturumları geliştirme sunucusunda koştuğu
  için DEV tek başına oyuncu yolunu kapatmazdı; Topaç Lab da bu bayrakla.
- **K-8 halka hizası** "takım halkanın içinde durur" diye okundu: üst yay topaçların arkasında, alt yay kaidelerin altında.
- **K-18** "seçim açık" = birden çok takım + oda seçim fazında. Tek takımda seçim ekranı yine gelir (HAZIR için) ama VS'de etiket yok.

## Değişen dosyalar

- `src/istemci/ekranlar/Lobi.ts` (H-1, H-11, K-7, K-8, K-17, K-18), `src/istemci/ekranlar/lobiCizim.ts` (K-8: `oynaYayi` oran parametreleri)
- `src/istemci/ekranlar/Mac.ts` (H-4, H-5, C-3)
- `src/istemci/ekranlar/Bilgi.ts`, `src/paylasilan/krediler.ts` (H-2)
- `src/istemci/oyun/MacHud.ts`, **yeni** `src/istemci/oyun/heceliAd.ts` (H-12)
- `src/istemci/ag/AgMaci.ts`, **yeni** `src/istemci/ag/baglantiRozeti.ts` (H-10)
- `src/istemci/main.ts` (H-14)
- **yeni** `test/menu-p1a.test.ts` (14 test: krediler oyuncu sürümü, rozet kararı, hece, kaynak denetimleri)

## Kapılar

- `npm test`: **647/647** yeşil, 37 dosya (görev başında 628; fark: benim 14 testim + eşzamanlı ajanların eklediği testler).
- `npm run lint`, `npm run typecheck`, `npm run build`: yeşil (build'de yalnız önceden var olan chunk boyutu uyarısı).
- `npm run krediler:uret`: atıfı eksik kaynak yok (çıkış 0).
- Tarayıcı konsolu: istemci hatası **0**. (Denetim betiğinin kendi `POST /api/profil` çağrısı 400 döndü, arma kimliği eski; bu
  betiğin isteği, istemci hatası değil. Bu yüzden test hesapları profilsiz kaldı, lobi/maç akışı etkilenmedi.)

## Çalışma zamanı doğrulaması

Geliştirme sunucusu http://localhost:5391/ (`KIMLIK_MODU=sifre`), headless Chrome 1280×720, yeni test hesapları. Bot maçı:
`araclar/menu-denetim-mac.cjs` kopyası (ADRES ortamı + ölçüm satırları + **Vite HMR soketi kesik**: eşzamanlı çalışan ajanların
düzenlemeleri sayfayı tam yeniden yüklüyor ve maçı yarıda kesiyordu; ilk iki tur bu yüzden düştü).

Önce / sonra (önce görüntüleri denetimin kendi çekimleri):

| Madde | Önce | Sonra |
|---|---|---|
| K-7, K-8 Lobi | [MENU-27](ekran/MENU-27-lobi.png) | [MENU-P1A-27-lobi](ekran/MENU-P1A-27-lobi.png) |
| H-1 Oda | [MENU-34](ekran/MENU-34-lobi-oda-acik.png) | [MENU-P1A-34-oda-acik](ekran/MENU-P1A-34-oda-acik.png) |
| K-17 Arama | [MENU-32](ekran/MENU-32-lobi-araniyor-22sn.png), [MENU-50](ekran/MENU-50-bot-teklif.png) | [MENU-P1A-32-araniyor](ekran/MENU-P1A-32-araniyor.png), [MENU-P1A-50-bot-teklif](ekran/MENU-P1A-50-bot-teklif.png) |
| H-11, K-18 VS | [MENU-52](ekran/MENU-52-takim-secimi.png) | [MENU-P1A-52-vs](ekran/MENU-P1A-52-vs.png) |
| H-10, H-12 HUD | [MENU-53](ekran/MENU-53-vs-0.png), [MENU-55](ekran/MENU-55-esc-menu.png) | [MENU-P1A-54-mac](ekran/MENU-P1A-54-mac.png) |
| C-3 Esc menüsü | [MENU-55](ekran/MENU-55-esc-menu.png) | [MENU-P1A-55-esc-menu](ekran/MENU-P1A-55-esc-menu.png) |
| H-4, H-5 Sonuç | [MENU-57](ekran/MENU-57-sonuc-2.png) | [MENU-P1A-57-sonuc](ekran/MENU-P1A-57-sonuc.png) (1–3, üç satır), [MENU-P1A-57b](ekran/MENU-P1A-57b-sonuc-iki-satir.png) (0–4, iki satır) |
| H-2 Krediler | [MENU-05](ekran/MENU-05-krediler.png) | [MENU-P1A-05-krediler](ekran/MENU-P1A-05-krediler.png), [MENU-P1A-05b-krediler-alt](ekran/MENU-P1A-05b-krediler-alt.png) |

## Kalan / doğrulanmayan

- K-18'in **çok takımlı** hâli (etiket görünür) gözle doğrulanmadı; test hesabının tek takımı vardı. Kod yolu tek koşul.
- MENU-P1A-57 son 2 px'lik tablo dolgu kırpmasından önce çekildi; 57b sonrası. Kapsam dışı gözlem: 0–4 skorlu maçta alt satır
  "İLK 3 PUAN" yazıyor (son bitiş 2 puan verdiği için 4'e çıkmış; kural gereği doğru olabilir, @helix bakabilir).
- Bitiş tablosunun `scrollHeight` değeri `clientHeight`'tan 6-8 px büyük ölçülüyor: son satırdaki 40 px `+2` glifinin 24 px satır
  yüksekliğinden taşan kısmı; satırlar tam görünüyor, kaydırma çubuğu çıkmıyor.
- Sonuç ekranı 6 bitiş satırında (tablo en çok 6 satır tutar) kaydırmalı; 3 satır kaydırmasız ölçüldü. Zafer ekranı ve oda
  maçının "Rövanş" düğmesi bu turda çekilmedi.
- Dokunmatik (telefon) çerçevesi ve %125/%150 metin ölçeği gözle denenmedi; yalnız CSS boyutları güncellendi.
- `araclar/d8-akis.ts` krediler sayfasında `.bilgi .yt` okur; bu satır korundu ("21 varlık · 8 yazılım"), başlık listesi artık
  oyuncu bölüm adlarını döndürür.
- krediler.md Durum sütunu ve manifest `durum` alanları eski (yukarıda, @iris).
