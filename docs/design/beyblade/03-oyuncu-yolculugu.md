# Oyuncu yolculuğu: giriş, atölye, market, başarımlar, maç (kullanıcı hikâyeleri)

**Tarih:** 2026-11-04 · **Yazar:** Claude (sahibin isteğiyle, `[@helix · Game Designer]` alanında) · **Durum:** taslak, sahip onayı bekliyor.
Bağlı belgeler: `00-lore-cercevesi.md` (çekirdek, kökenler, elementler, parçalar), `01-arena-eslemesi.md` (maç içi), `02-sahip-kararlari.md`.
Sahibin isteği: oyuncu profilini kendisi oluşturur; topaç parçaları için bir **market** vardır; **başarımlar** bu parçaların markette kilidini açar.

Terimler: bkz. `04-sozluk.md` (Oyuncu, Topaç, Çekirdek, Gövde, Disk, Uç, Element, Köken, Stamina, Enerji, Altın, Yetenek/Özel Yetenek/Ulti).
Sayılar örnektir; dengeleme `@ledger`, ekonomi/sahtecilik `@vault`, ekranlar `@glyph`, akış `@tide`.

**Kâr amacı gütmeyen proje kuralı (CLAUDE.md):** market yalnız oyun içi para ile çalışır. Gerçek para, reklam, satış yok. Oyun içi paranın adı **Altın**; yalnız maç ve başarımla kazanılır.

---

## 0. Döngü tek bakışta

```
Giriş (Kick) → Profil → İlk Çekirdek → Atölye (takım kur)
      ↑                                        ↓
Başarım açılır ← Sonuç ekranı ← Maç ← Lobi (hızlı / oda / dereceli)
      ↓                 ↓
Market kilidi açılır   Altın + çekirdek tecrübesi
      ↓
Market'ten parça al → Atölye'de tak → daha iyi/ farklı Topaç
```

Üç kaynak, üç kapı:
| Kaynak | Nereden gelir | Neyi açar |
|---|---|---|
| **Altın** (para) | Maç sonucu, günlük ilk galibiyet, başarım ödülü | Market'te açık olan parçayı satın almak |
| **Başarım** | Maç içi davranış, koleksiyon, sosyal | Market'teki kilitli parçayı **görünür ve satın alınabilir** yapar |
| **Çekirdek tecrübesi** | Her maç, krizden galibiyet, temiz galibiyet | Çekirdek seviyesi (Lv.1 → Lv.2 → Lv.3 → Lv.4), yetenek kademeleri |

İlke: **para parça alır, başarım parçayı var eder.** Parayla her şeye ulaşılamaz; en ilginç parçalar bir şeyi yapmış olmayı ister. Bu, "oynama biçimi = koleksiyon" bağını kurar (Canon: R04 § 5-5 hat sistemi = nadirlik; bizde nadirlik = başarım).

---

## 1. Giriş ve profil

**US-1.1 Kick ile giriş.** Bir izleyici olarak Kick hesabımla tek tıkla girmek istiyorum ki ayrı parola tutmayayım.
- Kabul: Kick OAuth 2.1 (PKCE, `user:read`); ilk girişte profil oluşturma ekranı; sonraki girişte doğrudan Atölye.
- Kimlik yalnız Kick (K-1). Misafir oyun yok (sahtecilik ve sıralama bütünlüğü için).

**US-1.2 Profil oluşturma.** Bir Oyuncu olarak kendi adımı ve görünümümü seçmek istiyorum ki arenada tanınayım.
- Alanlar: **Oyuncu adı** (varsayılan Kick adı, değiştirilebilir, 3–16 karakter, küfür filtresi), **arma** (başlangıçta 6 element simgesinden biri; başarımla yenileri açılır), **renk** (Topaç ışık tonu değil, profil çerçevesi), **destek kanalı** (varsayılan girişin yapıldığı yayıncının kanalı; lore'da destek kanalı = Kick kanalı, 00 § 7.2).
- Değiştirme: ad 30 günde bir, arma/renk her zaman.
- Profil kartı: Oyuncu adı, destek kanalı, seviye toplamı, Galibiyet Sıralaması ve Stil Puanı sırası, en çok kullanılan element, öne çıkan 3 başarım.

**US-1.3 İlk Çekirdek (Lv.2).** Yeni bir Oyuncu olarak ilk Topacımı seçmek istiyorum ki hemen oynayabileyim, ama seçim bir karakter kararı gibi hissettirsin.
- Üç başlangıç Çekirdeği sunulur, soyları farklı: **Göktaşı** (Kor elementi, Saldırgan eğilim), **Maden** (Kaya elementi, Kale eğilim), **Yapay** (Kasırga elementi, Denge; aşınma uyarısı açıkça yazılır). Karanlık kökeni başlangıçta yok (00 § 2.4, K-10).
- Her başlangıç seti: Çekirdek (Lv.2 seviyesi, Yetenek açık) + uyumlu Gövde + Disk + Uç. Seçilmeyen ikisi daha sonra Market'te "Başlangıç" rafında ucuz durur; kimse seçimine hapsolmaz.
- Seçim ekranı 3 kartlık; her kartta köken, element, pasif tek cümle, yetenek adı ve 5 saniyelik hareket önizlemesi (gerçek sim, bot rakip).
- İlk maç zorunlu değil ama **"Antrenman" eğitimi** (bot, 60 sn): sür, çarp, dash, bir Yetenek, bir Ring Out. Bitince ilk başarım: **"İlk Devir"** → Market açılır.

---

## 2. Atölye

**US-2.1 Envanter ve takım.** Bir Oyuncu olarak parçalarımı görüp 3 Topaçlık takımımı kurmak istiyorum ki maça hazır gireyim.
- Sol: envanter, dört sekme (Çekirdek / Gövde / Disk / Uç), filtre (element, köken, tip eğilimi, sahip olunan/kilitli).
- Orta: seçili Topaç; dört yuva; parça değişince **8 parametre çubuğu** anında güncellenir (kütle, saldırı, savunma, stamina havuzu, erime, desen, parçalanma eşiği, yön; R04 § 4). Element uyumsuzluğunda sarı uyarı: "Enerji dolumu yavaşlar."
- Sağ: takım (3 yuva), sıra sürüklenir; takımın element dizilimi çarkta gösterilir, Yay/Üçgen oluşuyorsa **Takım Ultisi** rozeti yanar (00 § 4.6).
- Kural: bir parça aynı anda tek Topaçta; bir Çekirdek tek Topaçta. Takımda üç farklı Çekirdek zorunlu.
- Kayıt: birden çok takım (3 yuva, başarımla 5'e çıkar), ad verilebilir.

**US-2.2 Çekirdek sayfası (Çekirdek Günlüğü).** Bir Oyuncu olarak Çekirdeğimin geçmişini ve seviyesini görmek istiyorum ki büyümesini hissedeyim.
- Seviye ve tecrübe çubuğu; sonraki seviyede ne açılacağı (Özel Yetenek adı, ruh silueti).
- Defter: maç sayısı, galibiyet, krizden galibiyet, en uzun dönüş, Kararma sayacı (Karanlık/Kara kullanıldıysa), Yapay ise kalan ömür.
- Ruh canavarı kartı: ad, element, kişilik cümlesi (lore), Özel Yetenek ve Ulti açıklaması (kilitliyse gölgeli).

**US-2.3 Antrenman.** Bir Oyuncu olarak kurduğum Topacı maça girmeden denemek istiyorum.
- Atölye'den tek tuşla bot karşısında 30 sn; sonuç sayılmaz, Altın vermez. Her parça değişikliğinden sonra "dene" rahatlığı; `@spark`'ın Birleştirme Lab'ının devamı.

---

## 3. Market

**US-3.1 Raflar.** Bir Oyuncu olarak Market'te ne alabileceğimi ve neyi henüz açamadığımı görmek istiyorum ki hedefim olsun.
- Dört raf: Çekirdekler, Gövdelar, Diskler, Uçlar. Her rafta ürün kartı: parça adı, element/köken, parametre etkisi (çubuk), fiyat (Altın), **kilit durumu**.
- Kilit durumu üç hâlde: **Açık** (satın alınabilir), **Kilitli-görünür** (başarım adı ve ilerlemesi yazılı: "Kor Ustası 3/10"), **Gizli** (silüet, "???"; gizli başarımla açılır, keşif hissi). Oran öneri: %40 açık, %45 kilitli-görünür, %15 gizli.
- Satın alınan parça envantere gider; parça satmak yok (ekonomi şişmesin), ama **Dökümhane'ye eritme** var: 3 istenmeyen parça → 1 rastgele aynı raf parçası (yalnız Açık raftan). Sayı `@ledger`.

**US-3.2 Hizip tezgâhları.** Bir Oyuncu olarak Market'in lore'a bağlı olmasını istiyorum, tek düze liste değil.
- Her raf bir hizbin tezgâhı gibi sunulur (00 § 7.1):

| Tezgâh | Hizip | Ne satar | Kilit mantığı |
|---|---|---|---|
| Kraterci | Devran Birliği | Göktaşı çekirdekler, standart Gövde/Disk/Uç | Çoğu açık; temel malzeme |
| Ocak | Köklüler | Maden çekirdekler, ağır Gövdelar, alçak Diskler | Sabır başarımları (uzun dönüş, kenara düşmeden kazanma) |
| Dökümhane | Dökümhane | Yapay çekirdekler (ucuz, ömürlü), çift yönlü Gövdelar, deneysel Uçlar | Hacim başarımları (maç sayısı); Yapay çekirdek **yenileme** hizmeti burada |
| Meydan Tezgâhı | Meydan Ligi | Gösteri parçaları: iz efektli Gövdelar, kozmetik Diskler, destek kanalı armaları | Stil Puanı başarımları (yetenek çeşitliliği, Takım Ultisi) |
| Karanlık Pazarı (gizli) | Karanlık Kardeşliği | Karanlık çekirdekler (sol dönüş), Kara yetenek açan Uçlar | Yalnız Kararma sayacı dolmuş ya da "Aydınlanma" tamamlamış Oyuncuya görünür |

- Mühürcüler satmaz; **görev** verir (bkz. § 4.3 ve Lv.4 anlatısı, K-7 ikinci sezon).

**US-3.3 Dönen raf.** Bir Oyuncu olarak Market'in her gün aynı olmamasını istiyorum.
- Her tezgâhta 1 "günün parçası": açık parçalardan biri %30 indirimli; haftada bir "Ligin Parçası": kilitli-görünür bir parçanın başarım eşiği o hafta yarıya iner (ör. Kor Ustası 10 → 5). FOMO yaratmaz: parça kalıcı, yalnız yol kısalır.

**US-3.4 Fiyat ve gelir ilkesi.** (Sayılar `@ledger`; burada yalnız şekil.)
- Maç geliri: galibiyet > mağlubiyet > terk (terk 0). Stil Puanı puanı küçük ek verir (yetenek ile bitiş, Takım Ultisi).
- Günlük ilk galibiyet bonusu; haftalık tavan yok ama **azalan getiri** (günde 15. maçtan sonra yarı gelir) → bot farm'ı caydırır.
- Fiyat katmanları: Başlangıç (1 maç geliri), Standart (5), Nadir (20), Hizip (40 + başarım), Karanlık (60 + şart). Hiçbir parça "güç satın alma" olmasın: pahalı parça **farklı**, daha güçlü değil (tip üçgeni bunu zaten garanti eder).

---

## 4. Başarımlar

**US-4.1 Başarım = kilit anahtarı.** Bir Oyuncu olarak oynama tarzımın koleksiyonumu şekillendirmesini istiyorum: saldırgan oynarsam saldırgan parçalar açılsın.
- Her başarımın **iki ödülü** var: Altın (küçük) ve **Market kilidi** (asıl ödül: belirli parçayı Açık yapar). Bazıları ek olarak arma/çerçeve verir.
- Başarım ilerlemesi her zaman görünür (maç sonu ekranında "+1 Kor Ustası 4/10"). Gizli başarımlar hariç.
- Başarım kategorileri ve örnekler (isimler geçici):

| Kategori | Başarım | Şart | Açtığı (Market) |
|---|---|---|---|
| **Yol** (ilerleme) | İlk Devir | Antrenman eğitimini bitir | Market'in kendisi + Başlangıç rafı |
| Yol | Üçlü | Üç farklı Çekirdekle birer maç kazan | 4. takım yuvası |
| Yol | Parlayan | Bir Çekirdeği Lv.3 seviyesine çıkar | Ocak tezgâhında "Parlak Disk" |
| **Bitiş** | Düşürücü | 10 Ring Out ile kazan | Kraterci: saldırgan Gövde (yüksek saldırı, yüksek geri tepme) |
| Bitiş | Kırıcı | 10 Parçalanma ile kazan | Dökümhane: sivri Gövde (parçalanma hasarı +) |
| Bitiş | Son Dönen | 10 Durma ile kazan | Ocak: alçak Disk (stabilite +) |
| **Element** | Kor Ustası (her element için biri) | Kor Çekirdekle 10 galibiyet | O elementin Özel Yetenek-uyumlu Gövdeyi |
| Element | Çark Tamam | Altı elementin her biriyle en az 1 galibiyet | Meydan Tezgâhı: "Çark" arması + Takım Ultisi izi efekti |
| **Risk** | Kriz Dönüşü | Devir %10 altındayken kazan | Kraterci: Göktaşı "Kor Kalbi" çekirdeği (kriz pasifi güçlü) |
| Risk | Kenar Yürüyüşü | Bir maçta 20 sn hız şeridinde kal ve kazan | Dökümhane: Kuşak Ucu (şeritte kontrol +) |
| Risk | Galibiyet Sıralaması ×5 | Ulti kullanmadan 5 galibiyet | Ocak: Maden "Sabır Taşı" çekirdeği |
| **Gösteri** | Takım Ultisi | Takım ultisini bir kez gerçekleştir | Meydan: Takım Ultisi kozmetik Diski |
| Gösteri | Alan Ustası | 3 farklı alan yeteneğiyle bitiş | Meydan: iz efektli Gövde |
| **Kararma** (gizli) | Mor Çatlak | Kararma sayacını ilk kez doldur | Karanlık Pazarı görünür olur |
| Kararma (gizli) | Aydınlanma | Karanlık modundan 10 maçta geri dön (00 § 6.3) | Karanlık Pazarı: "Karanlık'ı Tutan" Uç (Kara yetenek kontrollü) |
| **Sosyal** | Destek Kanalı | Destek Kanalı kanalın yayınındayken 5 maç | Meydan: kanal arması (kanal rengi) |
| Sosyal | Davetli | Oda koduyla 5 arkadaş maçı | Dökümhane: "Konuk" Diski (kozmetik) |
| **Yapay** | Aşınmış | Bir Yapay çekirdeğin ömrünü bitir | Dökümhane: yenileme hizmeti %50 indirim + çift yön Gövde |

- Toplam hedef ilk sürüm: ~40 başarım, ~25'i Market kilidi, ~8 gizli. Her tezgâhın en az 3 kilitli parçası olsun.

**US-4.2 Başarım, hile ve bot.** `@vault`: başarım sayacı sunucuda tutulur; yalnız dereceli ve hızlı maç sayar (oda kodlu arkadaş maçı yalnız "Sosyal" kategorisini sayar, böylece iki hesapla Düşürücü farm'ı olmaz). Terk eden tarafın maçı sayılmaz.

**US-4.3 Görev (Mühürcüler), ikinci sezon.** Başarım "yaparken olur", görev "git yap" demektir. Lv.4 seviyesi ve Ulti (K-7) görev zinciriyle açılır: belirli arenalarda belirli şartlarla galibiyet. İlk sürümde yok; yalnız yer tutucu.

---

## 5. Lobi ve maç

**US-5.1 Üç giriş.** Bir Oyuncu olarak hızlıca maç bulmak, arkadaşımla oynamak ya da sıralamaya girmek istiyorum.
- **Hızlı maç:** eşleştirme seviyeye göre gevşek; Altın ve başarım sayar; sıra puanı saymaz.
- **Oda kodu:** 4–6 karakter; arkadaş/yayın maçı; yalnız Sosyal başarımlar sayar; seyirci bağlantısı buradan.
- **Dereceli:** Elo (`@ledger`); Galibiyet Sıralaması ve Stil Puanı sıralaması ayrı (00 § 7.2); sezonluk.
- Eşleşince **takım seçimi** 20 sn: kayıtlı takımlardan biri; rakibin element dağılımı görünür, parçalar görünmez (R04 § 2.4 3on3 deste mantığı).

**US-5.2 Maç.** `01-arena-eslemesi.md`: WASD sürüş, çarpma = temel vuruş, Shift dash, yetenek tuşları, tek stamina barı, Durma 1 / Ring Out 2 / Parçalanma 2, ilk 3 puan, 90 sn + ani ölüm (K-3, K-4). Burada tekrar edilmez.

**US-5.3 Sonuç ekranı.** Bir Oyuncu olarak maçın bana ne kazandırdığını tek ekranda görmek istiyorum.
- Sıra: puan tablosu (bitiş türleri) → Enerji özeti (kaç yetenek, Takım Ultisi var mı) → **Altın** (+ animasyon) → **Çekirdek tecrübesi** (seviye atlarsa halkalar yanar, yeni yetenek adı) → **başarım ilerlemesi** (+1'ler; tamamlananda "Market'te açıldı: X" kartı, tek tıkla Market'e) → tekrar maç / Atölye.
- Süre: 8 sn, atlanabilir; yayın için "paylaş" kartı (maç özeti PNG, ikinci sezon).

**US-5.4 Seyirci.** Yayıncı olarak oda maçını OBS'e almak istiyorum (F2, K-11). Seyirci görünümü iki Topacın parça listesini ve Enerjilerinı gösterir; sohbet komutları (ör. destek kanalı bonusu) F2 sonrası.

---

## 6. İlk sürüm kapsamı (öneri)

| Var | Yok (sonraki) |
|---|---|
| Kick giriş, profil, 3 başlangıç Çekirdeği, Antrenman eğitimi | Karanlık kökeni başlangıç seçeneği |
| Atölye: 4 yuva, 3 takım, deneme arenası | 5 takım yuvası, parça seviyeleri |
| Market: 4 tezgâh (Kraterci, Ocak, Dökümhane, Meydan), günün parçası | Karanlık Pazarı (gizli, Kararma ile açılır: ilk sürümde K-10'a bağlı), Ligin Parçası |
| ~40 başarım, ~25 Market kilidi | Görevler (Mühürcüler), Lv.4/Ulti |
| Hızlı maç, oda kodu, sonuç ekranı | Dereceli sezon, paylaş kartı, seyirci sohbet komutları |

---

## 7. Açık noktalar (sahip)

1. **Parça seviyesi var mı?** İki model: (a) parçalar sabit, yalnız Çekirdek seviyelenir (önerim; tip üçgeni ve okunurluk korunur); (b) parçalar da +1/+2 yükselir (güç satın alma riski, `@ledger` dengesi zorlaşır).
2. **Eritme (3→1) olsun mu?** Envanter şişmesini çözer ama Dökümhane'yi "kumar" yapmamalı; alternatif: eritme yalnız Altın'a çevirir.
3. **Yapay çekirdek ömrü:** maç sayısıyla mı (ör. 30), gün ile mi? Önerim maç sayısı; yenileme Dökümhane'de ücretli.
4. **Gizli başarım oranı** %15 çok mu? Keşif hissi ile "nasıl açılır bilmiyorum" hayal kırıklığı arasında.
5. **Destek Kanalı bonusu:** yayın sırasında oynamak Altın'ı artırsın mı (kanal büyütür, ama izleyici olmayanı cezalandırır)?

Bu belge onaylanınca: `@ledger` Altın/fiyat/başarım eşiklerini `tuning.md`'ye, `@glyph` ekran listesini `docs/ux/`'e, `@vault` başarım ve envanter şemasını SQLite'a taşır.
