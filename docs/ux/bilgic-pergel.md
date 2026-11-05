# Pergel: Atölye'nin gözlüklü bilgici

Sahip (2026-11-05): *"atölyede dolaşırken ufak ipuçları veren gözlüklü bilgiç karakteri olmalı ve ipuçlarıyla belirmeli. bunu da oyuncu dostu bir anlayışla tasarla."*

## 1. Karakter

**Pergel**, Atölye'nin yaşlı olmayan ama kendini çok bilen çırağı-âlimi. Kalın yuvarlak gözlük, kulağının arkasında kurşun kalem, cebinde pergel ve not kâğıtları, elinde ipe bağlı minicik bir topaç. Cümleye sık sık **"Aslında..."** diye başlar, rakam sever, ama oyuncuyla alay etmez; bildiğini paylaşmaya can atar. Topaç değil, insan bir karakter; hiçbir mevcut seriden karakteri andırmaz.

Üç ifade (pixel art portre, `public/bilgic/`): `anlatiyor` (normal), `aslinda` (işaret parmağı havada, gözlük parlıyor), `sevinc` (bir başarı ya da yeni parça anında).

## 2. Oyuncu dostu ilkeler (pazarlık dışı)

1. **Engellemez.** Pergel sol alt köşeden "göz atarak" belirir, konuşma balonu ekranın tek köşesindedir; OYNA düğmesini, takım yuvalarını ve odak sırasını örtmez. Modal değildir, odağı çalmaz.
2. **Bir anda bir ipucu, ekran başına en çok bir kendiliğinden ipucu.** İki kendiliğinden ipucu arasında en az 45 s.
3. **Bağlama göre konuşur.** İpuçları oyuncunun durumundan tetiklenir (takım eksik, ödünç topaç, yeni Çekirdek, Ulti kilitli, son maç ring out ile kaybedildi, ilk ziyaret). Genel tavsiyeyi değil, o an işe yarayanı söyler.
4. **Tekrar etmez.** Görülen ipucu bir daha kendiliğinden gelmez. Oyuncu Pergel'e tıklarsa ("Bir ipucu ver") görülmemiş sıradaki ipucunu, hepsi görüldüyse rastgele eskisini söyler.
5. **Kısa.** En çok iki cümle, ~140 karakter, bir **kalın** anahtar terim. Uzun anlatım gerekiyorsa "Göster" ile ilgili arayüz öğesi vurgulanır; metin uzamaz.
6. **Oyuncu kontrolü.** Balonda "Tamam" (Esc de kapatır), "Başka?" ve ayarlarda "Pergel ipuçları: Açık / Yalnız sorunca / Kapalı". Üst üste üç ipucu okunmadan kapatılırsa Pergel o oturum boyunca yalnız sorunca konuşur (sessizce, ceza mesajı yok).
7. **Bekleme yok, sürpriz yok.** Gizli başarımları, rakip bilgisini ya da Market fiyat sırlarını söylemez. Tavsiyeleri sim kurallarıyla tutarlıdır (sayılar `tuning.md`'den).
8. **Erişilebilir.** Balon `role="status"` + `aria-live="polite"`; klavyeyle Pergel düğmesine ulaşılır ("Pergel'e sor", kısayol **H**); hareket azaltma açıksa sıçrama yerine solma; metin ölçeği ayarına uyar; Türkçe, ekran okuyucuda doğal okunur.
9. **Hatırlar.** Görülen ipuçları ve ayar hesap başına saklanır (şimdilik tarayıcıda, oyuncu kimliğiyle anahtarlanır; erişilemezse oturum içinde tutulur, hata göstermez).

## 3. Belirme akışı

- Ekran açıldıktan **1,5 s** sonra (oyuncu yönünü bulsun) uygun ipucu varsa Pergel 0,25 s'de alttan göz atar, balon açılır.
- "Dolaşırken" ipuçları: oyuncu bir öğenin üstünde (fare ya da klavye odağı) **1,2 s** durursa o öğeye bağlı görülmemiş ipucu gelir (ör. ödünç yuva, kilitli Ulti yuvası, Lab düğmesi).
- Balon 12 s sonra kendiliğinden kapanmaz; oyuncu kapatana ya da ekran değişene kadar kalır, ama Pergel köşede küçülür (balon tek satıra iner) ve okunmamış sayılmaz.
- Pergel her zaman köşede küçük bir gözlük rozeti olarak durur; yeni ipucu varsa rozetin yanında bir nokta yanar.

## 4. İpucu kataloğu (ilk sürüm, `veri/ipuclari.json`)

| id | Tetik | İfade | Metin |
|---|---|---|---|
| `ilk-ziyaret` | Atölye'ye ilk giriş | anlatiyor | Hoş geldin! Ben Pergel. Aslında topaç dediğin **dört parça**dır: Çekirdek, Gövde, Disk, Uç. Ben buralardayım. |
| `takim-eksik` | takımda boş yuva var | aslinda | OYNA için takımda **3 farklı Çekirdek** gerekir. Antrenmanda kazandıkça yeni Çekirdek gelir. |
| `odunc` | ödünç yuva üstünde durma / takımda ödünç var | anlatiyor | Gri çerçeveli topaç **ödünç**: tecrübe almaz. Yeni Çekirdek edinince yerini kendiliğinden alır. |
| `ruh-ozel` | Çekirdek kartı üstünde durma | aslinda | Her Çekirdeğin bir **ruhu** var. Özel Yetenek'i kullandığında arkanda belirir, izle! |
| `ulti-kilit` | Lv.3 altında Çekirdek varken | aslinda | **Ulti** Lv.3'te açılır ve maçta bir kez kullanılır. O an elementinin **Ata**'sı uyanır. |
| `ulti-acik` | ilk kez Lv.3 olan Çekirdek | sevinc | Bir Çekirdeğin Lv.3 oldu! Enerjin 3 dilim dolunca **3** tuşu: Ata'yı uyandırırsın. |
| `ring-out` | son maç ring out ile kaybedildi | anlatiyor | Aslında kenara yakın dönmek Enerji doldurur ama riskli. Ağır rakibe karşı **Space ile sekme** kurtarır. |
| `element-cark` | takımda 3 komşu element (Yay) | aslinda | Takımın çarkta **yan yana** üç element: Tab ile geçişte yeni topacın Enerjisi bir parça dolu gelir. |
| `zitlik` | takımda karşıt element çifti | anlatiyor | Karşıt elementler çarpışınca ikisinin de Enerjisi **%25 hızlı** dolar. Gösteri sever misin? |
| `lab` | Topaç Lab düğmesi üstünde durma | aslinda | Lab'da parçaları maç dışı dene: sayılar değil **his** önemli. Ben her parçayı yüz kez denedim. Aslında yüz bir. |
| `market-acildi` | İlk Devir başarımı yeni geldi | sevinc | Market açıldı! **Altın** biriktirip parça al; bazı parçalar başarımla açılır. |
| `stamina` | ilk 3 ziyaret, başka ipucu yoksa | anlatiyor | Topaç **stamina** bitince durur. Uç ne kadar sürtünürse o kadar hızlı erir. |

Öncelik sırası: oyuncunun ilerlemesini engelleyen (takım eksik) > yeni açılan (Ulti, Market) > son maçtan ders > genel bilgi.

## 5. Kabul ölçütleri

1. İlk girişte 1,5 s sonra `ilk-ziyaret`, ikinci ziyarette (takım eksikse) `takim-eksik`; aynı ipucu kendiliğinden ikinci kez gelmez.
2. Pergel balonu açıkken OYNA ve yuvalar tıklanabilir ve klavyeyle ulaşılabilir; Enter ana eylemi tetikler.
3. Ayar "Kapalı"yken Pergel hiç belirmez, rozet de görünmez; "Yalnız sorunca"da rozet görünür, kendiliğinden konuşmaz.
4. Ekran okuyucu yeni ipucunu kesmeden okur; Esc balonu kapatır.
5. Dar ekranda (≤ 600 px) balon tam genişlik alt şerit olur, OYNA'nın üstüne binmez.
