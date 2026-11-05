# ADR-005: Tahmin modeli A (yalnız kendi sürüşü); B ölçüyle açılır

Tarih: 2026-11-04 · Durum: kabul edildi (axiom § 4 karar 2) · Sahibi: `@relay`

## Bağlam
Topaç çarpışması bir hareket etkileşimidir; rakip yerelde 100 ms geriden gösterilir, yerel tahmin "geçmişteki"
rakiple çarpışır. 05 § 4 iki aşama önerir: A (sade) ve B (rakip ileri tahmin + "tentative" çarpışma).

## Karar: A
- İstemci yalnız **kendi** topacının sürüşünü, sürtünmesini, Uç desenini, dash/sekme hareketini, erimesini ve
  duvar/kenar sekmesini tahmin eder (`src/paylasilan/sim/tahmin.ts`, sim fonksiyonlarının kendisi).
- Topaç-topaç impulsu, hasar, tık, Enerji, yetenek etkileri, Ring Out/Durma/Parçalanma yalnız sunucudan.
- Rakibe karşı yalnız konumsal ayırma (görsel; içinden geçmez), hız değişmez. Hayalet çarpma yapısal olarak 0.
- Çarpışma hissi sunucu `carpisma` olayı gelince oynar (olaylar adım sonunda anında, yamayı beklemez).
- Uzlaşma: < 0,5 br yok say, 0,5-8 br yumuşak (4 adım), 8-40 br büyük yumuşak (6 adım), > 40 br atlama (sahip onayı, N3); son 600 ms'de sunucu darbesi varsa büyük
  fark da yumuşak (6 adım, savrulma olarak okunur). Hitstop sırasında düzeltme erimez. Efektler geri alınmaz.

## B'ye geçiş tetiği
150 ms / 20 ms / %2 koşulunda çarpmadan görsel tepki > 200 ms ya da sahibin his puanı < 4/5 (05 § 7).

## 0.17 + elle ara değerleme tetikleri (ADR-001'in yerine)
- T1 Colyseus `Predict.reconciler` özel alanları yeniden oynatamıyor → D4'te SDK reconciler'ı kullanılmadı;
  girdi taşıması `defineInput`, uzlaşma bizim (`src/istemci/ag/AgMaci.ts`). T1 tetiklenmedi.
- T2 aynı ağ koşulunda 10 çarpışmada > 1 görünür sıçrama ve eşiklerle 2 iş gününde çözülmüyor.
- T3 0.18.x yamasında kırıcı değişiklik / bloke eden hata 5 iş gününde çözülmüyor.
- T4 `setFixedTimestep(60)` 10 s'de > 1 adım kaçırıyor.
Tetik olursa geri dönüş önerilir; karar sahibin. D4 ölçümleri: `docs/production/raporlar/D4.md` § 4-6.
