# Devran tasarım sütunları (sahip kararları)

**Tarih:** 2026-11-04 · **Kaynak:** sahip (proje sahibi), bu oturumda. Bu belge tasarım kararlarında son çare ölçütüdür: iki seçenek arasında kalındığında önce buraya bakılır.

## S1. Kolay öğrenilir, zor ustalaşılır (sahip: "bunu unutma")
Oyunun temeli budur. Her yeni özellik, ekran ve kural bu ölçütle sınanır.

- **Kolay öğrenme:** İlk 60 saniyede oyuncu sürer, çarpar, bir bitiş görür. Menüler sadedir, bir ekranda tek ana eylem vardır. Terimler genel oyun terimleridir (`beyblade/04-sozluk.md`). İlk maçlarda gereksiz sistem gösterilmez.
- **Zor ustalaşma:** Derinlik arayüzde değil oyunun içinde durur. Örnekler: Uç deseniyle sürüş hissinin değişmesi, açı çarpanı (ön/yan/arka), Ring Out için kenar kontrolü, dash penceresi, stamina ve tık yönetimi, telegraf okuma, Enerji zamanlaması, element ve tip eşleşmeleri, parça kombinasyonları.
- **Kademeli açılma:** Karmaşıklık ilerlemeyle gelir; yeni oyuncuyu baştan boğmaz. Sıra: sürüş ve çarpma → dash ve sekme → Yetenek (Lv.2) → Özel Yetenek ve Ulti (Lv.3) → Dereceli (ilk Çekirdek Lv.3 sonrası, varsayım) → sezon içeriği.
- **Öğretmeyen kural eklenmez:** Oyuncuya görünmeyen ya da okunamayan bir kural, ustalık değil bilinmezlik üretir. Her mekaniğin görsel/işitsel bir ipucu olmalı (çatlak göstergesi, kenar uyarısı, telegraf, yalpalama).
- **Test:** Yeni oyuncu 60 sn içinde ilk çarpışmayı yaşamalı (Antrenman eğitimi ölçütü); usta oyuncu ile yeni oyuncu arasındaki fark bot turnuvasında ve dereceli ölçümde görünmeli (yetenekli bot, ilk kademe botu yenmeli).

## S2. Sadelik, lore'un önünde
Menüler olabildiğince sade ve anlaşılır olur; bunun için lore derinliğinden feragat edilebilir (`sadelik-ilkeleri.md`). Lore arayüzden çekilir, mekanik ve veri kalır.

## S3. Referans görsellere yakınlık
Görsel dil, onaylı 9 referans ekranın en yakın karşılığı olacak (`docs/design/beyblade/gorunum/`, `docs/art/tasarim-dili.md`). Kamera: hibrit (fizik düz, sunum eğik). Bilerek ayrılan noktalar: altı çubuk, Türkçe metinler, IP nedeniyle özgün ruh siluetleri.

## S4. Dereceli ilerleme kapısıyla açılır
Dereceli düğmesi yeni oyuncuya gösterilmez; ilk Çekirdek Lv.3'e çıkınca (varsayım, ≈17 maç) lobide belirir. Ustalaşma yolunun parçasıdır, ilk deneyimin parçası değil.

## Tutarlılık notu: Harita / Maden / İşleme (2026-11-06, taslak)
Yeni mekanik (`docs/design/harita/`) S1–S4'ü değiştirmez. S1 kademeli açılmaya bir ara basamak ekler: sürüş ve çarpma → (İlk Devir) → Harita Bölge 1 (isteğe bağlı "ikinci antrenman") → dash/sekme/Yetenek… Harita, maden ve Ustalık maç gücüne hiçbir şey katmaz (`harita/00-genel-bakis.md` § 1, kural G-0); S4 Dereceli kapısı aynen.
