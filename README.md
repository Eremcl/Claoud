# LGS Masası

> **Yeni: Matematik Savaşı** (`matematik-savasi.html`). Matematik öğreten, 2.5D, sevimli çizimli bir savaş oyunu. Tek dosyadır, tarayıcıda açman yeterli.
>
> - **Başlangıç:** Zorluk (Kolay / Orta / Zor), sınıf (5–8) ve rakip (Bot ya da 2. oyuncu) seçilir. Zorluk arttıkça botun birimleri daha çok cana sahip olur, daha çok hasar verir ve daha hızlı ateş eder.
> - **Ordu:** 10 askerle başlarsın. Bayrağı sürükleyerek (ya da WASD / oklarla) savaş hattını ayarlarsın. Oyuncu 1 **R**, Oyuncu 2 **H** tuşuyla saldırıyı başlatır ya da durdurur.
> - **Kartlar:** 10 asker, 10 mini tank, 5 güçlü tank, 5 uçak ve bombardıman. Her kart, seçilen sınıfın konularından bir soruyla açılır; sonraki kartların soruları daha zordur. Yanlış cevapta askerlerinden biri kaçar. 2 kişilik modda yalnızca asker, güçlü tank ve uçak kartları vardır.
> - **2 kişilik oyun sonu:** Kaybeden komutana animasyonlu 10 çürük yumurta atılır.
> - **Özelleştirme:** Asker rengi, askeri boyama (boya askerin dışına taşmaz) ve bayrak çizimi (fırça, kova, yıldız/kalp damgası, renk paleti, geri al, temizle).
> - **Ayarlar:** Tablet modunda dokunmatik butonlar görünür. Bilgisayar modunda ekran sade kalır ve klavye yeterlidir. Müzik ve efekt sesi açılıp kapatılabilir.
> - Müzik ve sesler Web Audio ile üretilir; dışarıdan yalnızca yazı tipi yüklenir. Özelleştirme ve ayarlar `localStorage` alanında saklanır.

8. sınıf öğrencileri için LGS çalışma uygulaması. Tek bir `index.html` dosyasıdır; kurulum gerektirmez, tarayıcıda açman yeterli.

## Özellikler

- **Kılıç Yolu (oyun):** Şövalyen yolda yürür; her canavar bir LGS sorusu taşır. Doğru cevap kılıç darbesi, yanlış cevap can kaybı. Kombo puanı, altın toplama (zıpla), her 8 canavarda 3 soruluk Sınav Canavarı ve rekor.
- **Panel:** LGS'ye kalan gün, günlük soru hedefi, çalışma serisi, son 14 gün, derslere göre doğru oranı, tekrar edilmesi gereken zayıf konular, son denemeler.
- **Soru Çöz:** Ders/konu seçerek test çöz; her sorudan sonra doğru cevap ve açıklama. Klavye ile A/B/C/D ve Enter.
- **Tahta:** Elle soru yazıp çözmek için çizim tahtası: kalem, fosforlu kalem, silgi, 5 renk, 3 kalınlık, geri al/yinele (Ctrl+Z / Ctrl+Y), kareli/çizgili/noktalı zemin, çoklu sayfa ve tam ekran. Bankadan soru getirilebilir ya da Soru Çöz ve Yanlışlarım'daki "Tahtada çöz" düğmesiyle bir soru tahtaya gönderilebilir.
- **Deneme:** LGS ders dağılımına göre 27 soruluk, 45 dakikalık mini deneme; optik cevap kâğıdı, D/Y/B/net tablosu, tahmini puan ve cevap anahtarı.
- **Yanlışlarım:** Yanlış yaptığın sorular birikir; doğru cevaplayınca listeden çıkar.
- **Konu Takibi:** 6 dersin 8. sınıf üniteleri; bitirdiklerini işaretle, konu bazında başarını gör.
- **Net Hesapla:** Doğru/yanlış sayılarından net (3 yanlış 1 doğruyu götürür) ve yaklaşık LGS puanı.
- **Pomodoro:** 25 dk çalışma / 5 dk mola sayacı.

Soru bankasında MEB'in [LGS Çalışma Kitapları Seti](https://odsgm.meb.gov.tr/www/lgs-calisma-kitaplari-seti/icerik/1583)'nden 2025-2026 Merkezî Sınav'ın şekil gerektirmeyen 58 sorusu da var (cevaplar MEB cevap anahtarından; açıklamalar bu uygulamaya ait). Bu sorular "MEB · LGS 2026" etiketiyle gösterilir.

İlerleme tarayıcının `localStorage` alanında saklanır. Soru eklemek için `index.html` içindeki `Q` dizisine aynı biçimde yeni nesneler eklemen yeterli.

> Tahmini puan; Türkçe, Matematik ve Fen netlerinin 4, diğer derslerin 1 katsayıyla ağırlıklandırılmasıyla 100–500 aralığında yaklaşık olarak hesaplanır. Gerçek LGS puanı o yılın ortalamalarına göre değişir.
