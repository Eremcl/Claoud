# LGS Masası

8. sınıf öğrencileri için LGS çalışma uygulaması. Tek bir `index.html` dosyasıdır; kurulum gerektirmez, tarayıcıda açman yeterli.

## Özellikler

- **Panel:** LGS'ye kalan gün, günlük soru hedefi, çalışma serisi, son 14 gün, derslere göre doğru oranı, tekrar edilmesi gereken zayıf konular, son denemeler.
- **Soru Çöz:** Ders/konu seçerek test çöz; her sorudan sonra doğru cevap ve açıklama. Klavye ile A/B/C/D ve Enter.
- **Deneme:** LGS ders dağılımına göre 27 soruluk, 45 dakikalık mini deneme; optik cevap kâğıdı, D/Y/B/net tablosu, tahmini puan ve cevap anahtarı.
- **Yanlışlarım:** Yanlış yaptığın sorular birikir; doğru cevaplayınca listeden çıkar.
- **Konu Takibi:** 6 dersin 8. sınıf üniteleri; bitirdiklerini işaretle, konu bazında başarını gör.
- **Net Hesapla:** Doğru/yanlış sayılarından net (3 yanlış 1 doğruyu götürür) ve yaklaşık LGS puanı.
- **Pomodoro:** 25 dk çalışma / 5 dk mola sayacı.

İlerleme tarayıcının `localStorage` alanında saklanır. Soru eklemek için `index.html` içindeki `Q` dizisine aynı biçimde yeni nesneler eklemen yeterli.

> Tahmini puan; Türkçe, Matematik ve Fen netlerinin 4, diğer derslerin 1 katsayıyla ağırlıklandırılmasıyla 100–500 aralığında yaklaşık olarak hesaplanır. Gerçek LGS puanı o yılın ortalamalarına göre değişir.
