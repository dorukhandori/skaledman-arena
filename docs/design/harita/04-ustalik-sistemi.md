# 04 · Ustalık sistemi: Madencilik ve İşleme

**Bağlı:** [`02`](02-maden-sistemi.md) (kazı), [`03`](03-atolye-isleme.md) (Ocak), [`06`](06-ekonomi-ve-denge.md) (zamanlama), [`07`](07-ux-ekranlar.md) § 7 (Ustalık paneli). Sayılar: [`veri-taslak/ustalik.json`](veri-taslak/ustalik.json).

## 1. Terim: neden "Ustalık"

Projede **Yetenek** topacın Enerji ile kullandığı hamle demektir (Yetenek / Özel Yetenek / Ulti; `04-sozluk.md`). UO'nun "skill"ine "yetenek" demek iki anlamı çakıştırır ("Yetenek 25" mi, "Yetenek 1" mi?). Bu yüzden: **Ustalık** (genel Türkçe, öğrenme gerektirmez). Oyuncuya görünen: **MADENCİLİK** ve **İŞLEME** (etiket), "USTALIK 25" (değer). Kod: `ustalik`, türler `madencilik`, `isleme`. Sözlüğe işlendi (`04-sozluk.md`).

## 2. Kaç Ustalık?

| Ustalık | Ne ile artar | Neyi açar |
|---|---|---|
| **Madencilik** | Kazı vuruşu (02) | Kademe K damarını kazabilmek (`U ≥ E_K`); başarı şansı |
| **İşleme** | Eritme ve dövme (03) | Kademe K cevheri eritebilmek, tarif eşikleri, 3:1 eritme oranı, Usta işi şansı |

**Keşif Ustalığı yok.** Harita ilerlemesi zaten düğüm ve yıldızlarla görünür; üçüncü bir sayı S2'ye aykırı ve yeni bir şey açmaz. (99 S-3.)

## 3. Ölçek, eğri, öğrenme bandı

**Ölçek 0–100, tam sayı.** Gerekçe: UO hissi ("GM" = 100) istendi; yüzde gibi okunur, öğrenme gerektirmez; eşikler (10, 25, 40…) akılda kalır. 1–N seviye (ör. 1–20) kademe eşiklerini 8 basamağa sığdırırdı ama her vuruşta görünür artış hissini kaybettirirdi. İç tecrübe yüzde birlik tamsayı tutulur (`tecrube_x100`, 08 § 3).

**Eğri:** seviye L'den L+1'e geçmek için gereken tecrübe:

```
adim(L) = yuvarla(20 + 1,2·L + 0,03·L²)        (L = 0…99)
kumulatif(L) = Σ adim(0…L−1)                    (ustalik.json "kumulatif" dizisi, 101 değer)
```

| Seviye | 5 | 10 | 15 | 20 | 25 | 30 | 40 | 50 | 55 | 60 | 70 | 80 | 82 | 90 | 92 | 100 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Kümülatif tecrübe | 113 | 263 | 458 | 704 | 1 008 | 1 379 | 2 351 | 3 683 | 4 501 | 5 431 | 7 657 | 10 417 | 11 039 | 13 774 | 14 523 | 17 791 |
| Sonraki seviyeye adım | 26 | 33 | 43 | 54 | 66 | 80 | 112 | 151 | 172 | 195 | 246 | 302 | 314 | 364 | 378 | — |

**Öğrenme bandı** (UO'nun "kolay iş artık öğretmez"i), fark = `U − E` (E: kazılan damarın ya da tarifin eşiği):

| Fark | Tecrübe çarpanı | Ekranda etiket |
|---|---|---|
| < 0 | yapılamaz | "USTALIK E GEREKİR" (kilit) |
| 0–14 | ×1,0 | **ÖĞRETİR** |
| 15–29 | ×0,5 | **AZ ÖĞRETİR** |
| ≥ 30 | ×0,1 | **ÖĞRETMEZ** |

Sonuç: Madencilik ilk sürümde (tavan K4, eşik 40) fiilen ≈ 55–60'ta yavaşlar ve ≈ 70'te durur; sezon 2 bölgeleri gelince yeniden akar. Bu bilerek: harita ilerlemesi Ustalığa yön verir (00 § 4 kapı ilişkisi).

## 4. Tecrübe kaynakları (tek tablo)

| Eylem | Taban tecrübe | Çarpanlar |
|---|---|---|
| Kazı, başarılı | 10 | bant × günlük (1–40: 1, 41–60: 0,5) |
| Kazı, başarısız | 5 | bant × günlük |
| Eritme partisi, başarılı | 4 × oran (4:1 → 16, 3:1 → 12) | bant (`U − E_K`) |
| Eritme partisi, başarısız | yarısı | bant |
| Dövme: arma / çerçeve / cila / parça | 30 / 50 / 80 / 150 | bant (`U − tarif eşiği`) |

Eritme 3:1'e geçince parti başı tecrübe düşer (16 → 12) ama aynı cevherden daha çok külçe çıkar: usta "daha az öğrenir, daha çok üretir". Dövme tecrübesi her tarifte **bir kez** (tarifler tek seferlik ürünlerdir, 03 § 4); bu yüzden İşleme'nin ana kaynağı eritmedir.

## 5. Tavan, sıfırlanma, kayıp

- **Tavan 100.** 100'de tecrübe birikmez; profil kartında "USTA" rozeti (gösterim).
- **Sıfırlanma YOK.** Sezon geçişinde Ustalık kalır (sezon 2 yeni bölgeler + kademeler açar, eski emek boşa gitmez).
- **Kayıp YOK.** Başarısızlık Ustalık düşürmez; UO'daki "skill cap 700, birini düşür" mantığı yok (iki Ustalık, ikisi de 100 olabilir).
- **Düşüş YOK.** Uzun ara verme Ustalık eritmez.

## 6. Hesap profiline yansıması

| Yer | Ne görünür |
|---|---|
| Profil kartı | İki küçük rozet: ⛏ 47 · ⚒ 52 (11×11 ikon + sayı); 100'de bronz "USTA" çerçeveli rozet |
| Ocak ekranı üst bandı | İki çubuk (seviye + sonraki seviyeye ilerleme), 07 § 5 |
| Maden ekranı | Yalnız Madencilik çubuğu, her vuruşta "+10" uçuşan sayı |
| Sonuç ekranı | Harita maçında Ustalık değişmez (maç Ustalık vermez); gösterilmez |
| Lobi / maç HUD | **Hiç görünmez** (G-0: maçla ilgisi yok, gösterilirse güç sanılır) |
| `/api/ben` | `ustalik: {madencilik, isleme}` (seviye) |

## 7. Ustalık eşiği ↔ kademe ↔ tarif (çapraz kontrol tablosu)

Bu tablo 02, 03 ve 06 ile aynı olmalıdır (kaynak JSON'lar):

| K | Cevher | Madencilik eşiği (kazı) | İşleme eşiği (eritme) | 3:1 eritme | Arma eşiği | Çerçeve eşiği | Cila eşiği | Dövme parça eşiği |
|---|---|---|---|---|---|---|---|---|
| 1 | Demir | 0 | 0 | 20 | 0 | 5 | — | — |
| 2 | Kaya | 10 | 10 | 30 | 10 | 15 | 20 | 25 |
| 3 | Don | 25 | 25 | 45 | 25 | 30 | 35 | 40 |
| 4 | Kor | 40 | 40 | 60 | 40 | 45 | 50 | 55 |
| 5 | Kasırga | 55 | 55 | 75 | 55 | 60 | 65 | 70 |
| 6 | Şimşek | 70 | 70 | 90 | 70 | 75 | 80 | 85 |
| 7 | Girdap | 82 | 82 | 102 (yok) | 82 | 87 | 92 | 97 |
| 8 | Devir Taşı | 92 | 92 | 112 (yok) | 92 | 97 | 100 (kırpılmış) | — |

**Not (tutarlılık):** K7 ve K8'de 3:1 eritme ulaşılamaz (tavan 100): üst kademeler bilerek pahalı kalır. Tarif eşiği `min(100, E + ek)` ile kırpılır; Devir cilası 92 + 10 = 102 → **100** (`tarifler.json`'da öyle).

## 8. Zamanlama hedefleri (06 sim sonucu, p50 gün)

| Kademe eşiği | 10 | 25 | 40 | 55 | 70 | 82 | 92 |
|---|---|---|---|---|---|---|---|
| Madencilik, aktif (≈25 dk/gün) | 3 | 5 | 10 | 17 | 28 | 40 | 53 |
| Madencilik, gündelik (≈10 dk/gün) | 4 | 9 | 21 | 38 | — | — | — |
| İşleme, aktif | 2 | 4 | 8 | 16 | 27 | 41 | 60 |

Hedef aralıklar (06 § 2) bu değerlerle karşılanıyor; ilk sürüm içeriği (K1–K4) aktif oyuncuda ≈ 10–13 günde biter, sezon 2 içeriği ≈ 2 ay sürer.

## 9. G-0 sınaması (bu belge)
Ustalık yalnız (a) hangi damarın kazılacağını, (b) hangi cevherin eritileceğini, (c) hangi kozmetik tarifin yapılacağını belirler. Maç, Elo, eşleştirme, Enerji, XP, parça `katki` değerleri Ustalık okumaz; HUD ve lobi Ustalık göstermez.
