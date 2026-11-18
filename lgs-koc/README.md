# LGS Koçu (Firebase web uygulaması)

LGS'ye hazırlanan öğrenci için deneme analizi ve yapay zekâlı soru yardımı.

## Özellikler

- **Deneme Ekle:** 6 dersin doğru/yanlış sayısını gir; boş, net ve **tahmini 2027 LGS puanı** anında hesaplanır. Sonuç kâğıdının fotoğrafını çekersen sayılar otomatik doldurulur (kontrol etmeyi unutma).
- **Koç Kontrolü:** Denemeyi kaydedince yanlış/boş soruların fotoğraflarını eklersin. Koç her soruyu önce sana tekrar çözdürür, çözümü anlatır, sonra aynı kazanımdan yeni sorularla "anladın mı?" diye kontrol eder. Rapor denemene kaydedilir; tam anlamadığın konular Analiz'de listelenir.
- **Analiz:** Son puan ve değişim, ortalama, en iyi puan, puan gelişim grafiği, ders netleri, ders bazında gelişim, "nereye çalışmalısın" sıralaması (kaybedilen puana göre), hedef puan/okul ve hedef için gereken net, yapay zekâ koç yorumu ve 7 günlük çalışma planı.
- **Fotoğraftan Soru:** Yanlış yaptığın soruların ya da defterinin fotoğrafını çek; uygulama aynı konulardan LGS tarzı yeni sorular sorar, sonunda D/Y/B, net ve çözümleri gösterir.
- **Soru Sor:** Sorunun fotoğrafını çek ya da yaz; adım adım çözüm gelir, sohbete devam edip "daha basit anlat", "benzer soru sor" diyebilirsin.
- **Tahta:** Kalem, fosforlu kalem, silgi, renkler, kalınlık, kareli/çizgili zemin, geri al/yinele, fotoğrafı tahtaya koyma. "Tahtayı Soru Sor'a gönder" ile çözümünü kontrol ettirebilirsin.

## Puan hesabı

LGS'de 3 yanlış 1 doğruyu götürür. Puan, son yılların sonuçlarına uyan yaygın tahmin formülüyle hesaplanır:

```
Puan = 194,75 + Türkçe net × 3,671 + Matematik net × 4,953 + Fen net × 4,072
             + İnkılap net × 1,666 + Din net × 1,899 + İngilizce net × 1,5075
```

Tam net yaklaşık 500 puan eder. MEB 2027 için hesaplama yönteminde bir değişiklik açıklamadı; gerçek puan o yılın ortalamalarına göre biraz değişir. Katsayılar `public/app.js` içindeki `DERSLER` dizisindedir.

## Kurulum (Firebase)

1. [Firebase konsolunda](https://console.firebase.google.com) projeni aç. **Proje ayarları > Genel > Uygulamalarınız** bölümünden bir **Web uygulaması** ekle ve `firebaseConfig` değerlerini `public/firebase-config.js` dosyasına yapıştır.
2. **Authentication > Sign-in method** bölümünde **Google** girişini etkinleştir. Siteyi kendi alan adında açacaksan **Authentication > Settings > Authorized domains** listesine ekle.
3. **Firestore Database** oluştur (üretim modu).
4. **AI Logic** bölümüne gir, **Gemini Developer API** sağlayıcısını seç ve etkinleştir (ücretsiz Spark planında çalışır). Kötüye kullanımı önlemek için **App Check** açman önerilir.
5. Yükleme için iki yol var:

**A) Bilgisayar gerektirmeyen yol: GitHub Actions (önerilen)**

- Firebase konsolu > Proje ayarları > **Hizmet hesapları** > **Yeni özel anahtar oluştur**. Bir JSON dosyası iner.
- [Google Cloud IAM](https://console.cloud.google.com/iam-admin/iam) sayfasında projeni seç. `firebase-adminsdk-...` hesabını düzenle ve **Firebase Admin** rolünü ekle.
- GitHub'da depo > Settings > Secrets and variables > Actions > **New repository secret**. Adı `FIREBASE_SERVICE_ACCOUNT` olsun, değerine JSON dosyasının tüm içeriğini yapıştır.
- Actions sekmesinde **"LGS Koçu'nu Firebase'e yükle"** > **Run workflow**. Bundan sonra `main` dalına gelen her değişiklik otomatik yüklenir.

Bu anahtar şifre yerine geçer: sohbete, koda ya da başka bir yere yapıştırma, yalnızca GitHub secret'ına koy.

**B) Bilgisayardan**

```bash
npm install -g firebase-tools
firebase login
cd lgs-koc
firebase use --add          # projeni seç (.firebaserc güncellenir)
firebase deploy --only hosting,firestore:rules
```

Uygulama `https://PROJE-KIMLIGIN.web.app` adresinde açılır. Telefonda tarayıcının "Ana ekrana ekle" seçeneğiyle uygulama gibi kullanabilirsin.

Model adı `public/firebase-config.js` içindeki `AI_MODELS` listesindedir; ilki çalışmazsa sıradaki denenir.

## Veriler

- Giriş yapınca denemeler Firestore'da `users/{uid}/denemeler` altında saklanır; `firestore.rules` herkesin yalnızca kendi verisine erişmesine izin verir.
- Giriş yapılmazsa veriler o tarayıcının `localStorage` alanında kalır.
- Fotoğraflar saklanmaz; yalnızca soruyu çözmek için yapay zekâya gönderilir.

Yerelde denemek için: `cd public && python3 -m http.server 8000` ve `http://localhost:8000`.
