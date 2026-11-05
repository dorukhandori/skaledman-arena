# Pergel uygulama notu (@glyph, 2026-11-05)

Spec: `bilgic-pergel.md`. Durum: Atölye'de çalışıyor, commit yok.

## Dosyalar
- Yeni: `veri/ipuclari.json` (12 ipucu, metinler spec § 4 aynen; alanlar id, kosul, ifade, metin, oncelik, otomatik, hedef), `src/istemci/bilgic/{ipuclari,secim,depo,Pergel}.ts`, `test/pergel.test.ts` (10 test).
- Değişen: `src/paylasilan/veri/semalar.ts` (IpucuSema, sona eklendi), `src/istemci/oyun/Ayarlar.ts` (`pergel: acik|sorunca|kapali`; Ayarlar ekranı döngüsü kendiliğinden gösterir), `src/istemci/ekranlar/Atolye.ts` (yuva/Lab `data-pergel-hedef`, yuvalara tabindex=0, alt boşluk, `pergelKur`).
- Katalog yükleme `katalog.ts`'e değil `bilgic/ipuclari.ts`'e kondu (ruhlar.json'ı başka ajan düzenliyor).

## Doğrulama (Vite :5173 + Playwright, `/api/ben` taklit; arka uç better-sqlite3 eksik olduğundan çalışmıyor)
- K1: ilk girişte 1,5 s sonra ilk-ziyaret; ilk-ziyaret görüldükten sonra takım eksikse takim-eksik (45 s aralık sıfırlanınca); aynı ipucu tekrar gelmez (birim testi).
- K2: balon açıkken OYNA noktası `elementFromPoint` ile OYNA'yı veriyor; odak OYNA'da kaldı, H sonrası da.
- K3: kapalı = DOM'da yok; sorunca = rozet + nokta var, konuşmuyor.
- K4: `role=status aria-live=polite`; Esc kapatıyor (doğrulandı).
- K5: 390 px'te şerit x=0, genişlik 390, alt=ekran dibi; OYNA'nın üstüne binme için ekran alt boşluğu 9rem (kaydırınca açılır). Dar pencere uyarısı (mevcut) şeridin üstüne bindiği için tam görsel doğrulama kısmi.
- Ek: hover 1,2 s (Lab), H kısayolu, portre yoksa CSS "o-o" gözlük yedeği, prefers-reduced-motion emülasyonu açıkken hata yok (görsel fark ayrıca bakılmadı).
- Ekran görüntüsü: `docs/production/raporlar/ekran/Pergel-atolye.png`.

## Varsayımlar / atlananlar
- `ring-out`: `/api/ben` son maç verisi vermiyor; alan uydurulmadı, tetik hiç çalışmaz (`sonMacRingOutKayip` undefined). Sunucu alan ekleyince `Atolye.ts`'teki yoruma bağlanır.
- 45 s aralık ve susma durumu sessionStorage'da (sayfa yenilenince korunur), görülenler ve ziyaret sayısı localStorage `devran.pergel.v1.<oyuncuId>`. Ayar `devran.ayarlar.v1` içinde (tarayıcı başına, hesap başına değil).
- Gezinti ipuçları (ruh-ozel, lab, ödünç yuva) 45 s aralığına tabi değil, oyuncunun kendi bekleyişi tetikler; ziyaret başına en çok 3.
- "Okunmadan kapatma": 2 s içinde kapatma; 12 s açık kalıp küçülen balon okunmuş sayılır.
- "Göster" (öğe vurgulama) yapılmadı; katalogdaki hiçbir ipucu gerektirmiyor.
- Maç içi duraklatma menüsü (Mac.ts) `AYAR_SECENEKLERI`'ni döndüğü için Pergel satırı orada da görünür.
- `npm run typecheck`/`npm test`: eksik `@pixi/sound` ve `better-sqlite3` (node_modules'te yok) kaynaklı önceden var olan hatalar (Ses.ts, sunucu/db, db.test, api testi); lint temiz, yeni testler yeşil.
