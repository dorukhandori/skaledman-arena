# Gizlilik

Devran kâr amaçsız, reklamsız bir hobi projesidir. Para almıyoruz, verini satmıyoruz, kimseyle paylaşmıyoruz.

## Ne saklıyoruz
- **Kullanıcı adın** ve isteğe bağlı profil seçimlerin (arma, renk, destek kanalı adı).
- **Şifren değil, şifrenin özeti (hash).** Şifrenin kendisini hiçbir yerde tutmuyoruz; biz de göremeyiz.
- **Oyun kayıtların:** Çekirdeklerin, parçaların, takımların, Altın hareketlerin, başarımların ve maçların
  (tarih, rakip, skor, süre, kullanılan takım).
- **Harita, kazı ve işleme kayıtların:** haritadaki ilerlemen ve konumun, cevherlerin, Ustalığın, Ocak'ta yaptıkların
  ve ürettiğin parçalar (yapan adı ve seri numarasıyla). Kazı zamanlama kayıtları hileyi önlemek için tutulur ve
  30 gün sonra silinir.
- **Oturum kaydı:** giriş yaptığında oluşan rastgele bir oturum kimliği.

IP adresini kayıt defterine yazmıyoruz. Kaba kuvvet denemelerini durdurmak için kısa süre (bir dakika) bellekte tutulur.

## Ne için
Hesabını açmak, ilerlemeni (seviye, Altın, başarım) saklamak, maç eşleştirmek ve hileyi önlemek için.
Başka hiçbir amaçla kullanmıyoruz.

## Ne kadar süre
Hesabın durduğu sürece. Oturum 30 gün sonra kendiliğinden biter. Hesabını silersen verin hemen silinir.

## Silme yolu
Ayarlar › **Hesabımı sil**. İki adımdır ve şifreni ister. Silince:
- adın, şifre özetin, Çekirdeklerin, parçaların, takımların, Altın'ın, başarımların ve oturumların silinir;
- oynadığın maçlar rakibinin geçmişinde kalır ama adın yerine **"Silinmiş oyuncu"** yazar.

Silme geri alınamaz. Hesapsız (misafir) oynadıysan sunucuda senin adına bir şey yoktur.

## Çerezler
Yalnız bir çerez kullanırız: `devran_oturum` (giriş yaptığında; HttpOnly, 30 gün). Reklam ya da takip çerezi yok.
Ayarların (ses, metin boyu) bu tarayıcının yerel deposunda kalır, sunucuya gitmez.

## Seyirci görünümü
Bir maçı `#izle=` bağlantısıyla izleyen kişi için hiçbir şey kaydedilmez. Yayında oyuncu adları ve skor görünür.

## İletişim
Sorun ya da silme isteği için projenin GitHub sayfasında konu (issue) aç.
