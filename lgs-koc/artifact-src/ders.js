/* ------------------------------------------------------------------ */
/* Özel ders: isimli, yüzlü, sesli konuşan öğretmen                    */
/* ------------------------------------------------------------------ */
const OGRETMENLER = [
  { k: "elif", ad: "Elif Hoca", brans: "Matematik", ses: "airy",
    kisilik: "Sakin, net ve sabırlısın. Problemleri küçük adımlara bölersin, sayılarla somut örnek vermeyi seversin.",
    ten: "#e9b98f", sac: "#3b2417", sacTip: "uzun", gozluk: false, giysi: "#4f46e5" },
  { k: "kerem", ad: "Kerem Hoca", brans: "Fen Bilimleri", ses: "rounded",
    kisilik: "Meraklı ve enerjiksin. Konuları günlük hayattan deneylerle, 'neden böyle olur' sorusuyla anlatırsın.",
    ten: "#c98e63", sac: "#1f1a17", sacTip: "kisa", gozluk: true, giysi: "#0f766e" },
  { k: "zeynep", ad: "Zeynep Hoca", brans: "Türkçe", ses: "glassy",
    kisilik: "Sıcak ve dikkatlisin. Paragraf ve sözel mantık sorularında metindeki ipucu kelimeleri göstermeyi önemsersin.",
    ten: "#f1c9a5", sac: "#7a3e1d", sacTip: "topuz", gozluk: false, giysi: "#be185d" },
  { k: "can", ad: "Can Hoca", brans: "İnkılap, Din ve İngilizce", ses: "buttery",
    kisilik: "Esprili ama ciddisin. Tarih konularını hikâye gibi, İngilizceyi kalıplarla, Din Kültürü'nü kavramlarla anlatırsın.",
    ten: "#d8a47c", sac: "#2b2b2b", sacTip: "kivircik", gozluk: false, giysi: "#b45309" },
];

function yuzSvg(o, kucuk) {
  const sacArka = o.sacTip === "uzun" ? `<path d="M50 90 C46 40 154 40 150 90 L156 168 C140 178 60 178 44 168 Z" fill="${o.sac}"/>` : "";
  const sacOn = {
    uzun: `<path d="M56 84 C58 44 142 44 144 84 C132 64 104 58 86 64 C74 68 64 74 56 84 Z" fill="${o.sac}"/>`,
    kisa: `<path d="M54 92 C46 26 154 26 146 92 C142 70 128 62 100 62 C72 62 58 70 54 92 Z" fill="${o.sac}"/>`,
    topuz: `<circle cx="100" cy="34" r="17" fill="${o.sac}"/><path d="M56 86 C54 46 146 46 144 86 C136 64 118 58 100 58 C82 58 64 64 56 86 Z" fill="${o.sac}"/>`,
    kivircik: `<g fill="${o.sac}"><circle cx="66" cy="66" r="13"/><circle cx="84" cy="54" r="14"/><circle cx="104" cy="50" r="15"/><circle cx="124" cy="56" r="14"/><circle cx="138" cy="70" r="12"/><circle cx="60" cy="82" r="9"/><circle cx="142" cy="86" r="9"/></g>`,
  }[o.sacTip];
  const gozluk = o.gozluk ? `<g fill="none" stroke="#1d2033" stroke-width="2.4"><rect x="70" y="86" width="24" height="18" rx="7"/><rect x="106" y="86" width="24" height="18" rx="7"/><path d="M94 94 h12"/></g>` : "";
  return `<svg class="yuz" viewBox="0 0 200 200" aria-label="${esc(o.ad)}" role="img">
    <g class="bas">
      ${sacArka}
      <path d="M36 200 C40 160 70 150 100 150 C130 150 160 160 164 200 Z" fill="${o.giysi}"/>
      <path d="M88 136 h24 v20 c-8 6 -16 6 -24 0 Z" fill="${o.ten}" opacity=".9"/>
      <ellipse cx="56" cy="98" rx="7" ry="10" fill="${o.ten}"/><ellipse cx="144" cy="98" rx="7" ry="10" fill="${o.ten}"/>
      <ellipse cx="100" cy="94" rx="44" ry="50" fill="${o.ten}"/>
      ${sacOn}
      <path d="M72 82 q10 -6 20 0" stroke="${o.sac}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M108 82 q10 -6 20 0" stroke="${o.sac}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <g class="goz"><ellipse cx="82" cy="95" rx="5" ry="6" fill="#fff"/><circle class="gozbebek" cx="82" cy="96" r="3.4" fill="#1d2033"/></g>
      <g class="goz"><ellipse cx="118" cy="95" rx="5" ry="6" fill="#fff"/><circle class="gozbebek" cx="118" cy="96" r="3.4" fill="#1d2033"/></g>
      ${gozluk}
      <path d="M100 100 q-4 10 0 13 q3 1 5 -1" stroke="rgba(0,0,0,.25)" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="72" cy="114" rx="7" ry="4" fill="#e77" opacity=".18"/><ellipse cx="128" cy="114" rx="7" ry="4" fill="#e77" opacity=".18"/>
      <g class="agiz${kucuk ? "" : ""}"><ellipse cx="100" cy="125" rx="11" ry="5" fill="#7a2e2e"/><path d="M90 123 q10 5 20 0" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/></g>
    </g>
  </svg>`;
}

const ders = (() => {
  const kaydet = (k, v) => { try { localStorage.setItem("lgs-ders-" + k, v); } catch {} };
  const oku = (k) => { try { return localStorage.getItem("lgs-ders-" + k); } catch { return null; } };
  let secili = OGRETMENLER.find((o) => o.k === oku("ogr")) || OGRETMENLER[0];
  const konusmalar = {}; // öğretmene göre sohbet turları
  let TTS = null, DIK = null;
  let ctl = null, mesgul = false, dinliyor = false, tampon = "", bekleyenGorsel = [];
  const sahne = $("#sahne");

  function durum(t) { $("#sahneDurum").textContent = t; }
  function altyazi(html) { const a = $("#altyazi"); a.innerHTML = html; a.scrollTop = a.scrollHeight; }
  function dokumEkle(kim, metin) {
    const p = document.createElement("p");
    p.innerHTML = `<b>${esc(kim)}:</b> ${esc(metin)}`;
    $("#dDokum").appendChild(p);
  }
  function ogretmenCiz() {
    $("#ogretmenler").innerHTML = OGRETMENLER.map((o) => `<button class="ogr ${o.k === secili.k ? "on" : ""}" data-ogr="${o.k}">${yuzSvg(o, true)}<span><b>${o.ad}</b><small class="muted">${o.brans}</small></span></button>`).join("");
    $$("[data-ogr]").forEach((b) => (b.onclick = () => sec(b.dataset.ogr)));
  }
  function sec(k) {
    if (mesgul) susmak();
    secili = OGRETMENLER.find((o) => o.k === k) || secili;
    kaydet("ogr", secili.k);
    ogretmenCiz();
    $("#yuzKutu").innerHTML = yuzSvg(secili);
    $("#sahneAd").textContent = secili.ad;
    $("#sahneBrans").textContent = secili.brans;
    $("#dDokum").innerHTML = "";
    for (const t of konusmalar[secili.k] || []) dokumEkle(t.role === "user" ? "Sen" : secili.ad, t.content);
    altyazi(`Merhaba, ben ${esc(secili.ad)}. ${esc(secili.brans)} sorularında yanındayım. Takıldığın soruyu sor ya da kameraya göster.`);
  }

  function istem() {
    const ad = ($("#dAdim").value || "").trim();
    return `Sen ${secili.ad}'sın; ${secili.brans} alanında uzman, LGS'ye hazırlanan 8. sınıf öğrencisine birebir özel ders veren bir öğretmensin. ${secili.kisilik}
Şu an öğrenciyle görüntülü görüşmedesin ve yazdıkların sesli okunacak.${ad ? ` Öğrencinin adı ${ad}.` : ""}
Kurallar:
- Konuşur gibi yaz: kısa cümleler, en fazla 5-6 cümlelik bir konuşma. Uzun çözümü parça parça anlat; bir adımı anlattıktan sonra "Buraya kadar tamam mı?" gibi kısa bir soruyla bekle.
- Madde işareti, numaralı liste, başlık, tablo, kalın yazı, emoji kullanma. Sadece düz paragraf.
- Matematik ifadelerini okunacak şekilde yaz: "x kare", "üç bölü dört", "kök iki", "eksi beş".
- Öğrenci fotoğraf ya da tahta görüntüsü gönderirse önce soruyu bir cümleyle özetle, sonra çözüme başla. Okuyamıyorsan bunu söyle.
- Öğrenci anlamadığını söylerse başka bir yoldan, günlük hayattan bir örnekle anlat. Ara ara anladığını kontrol etmek için küçük bir soru sor.
- Kendi branşın dışında bir soru gelirse de yardım et; gerekiyorsa bunun için diğer öğretmenleri (Elif Hoca matematik, Kerem Hoca fen, Zeynep Hoca Türkçe, Can Hoca inkılap, din ve İngilizce) önerebilirsin.
- 8. sınıf müfredatına ve LGS tarzına uy. Emin olmadığın şeyi uydurma; cevabın doğru olduğundan emin ol.
- Öğrenciyi cesaretlendir ama abartma.`;
  }

  // Konuşma: metin geldikçe cümle cümle sese ver
  let okunan = 0, sesHatasi = false;
  function sesVer(metin, son) {
    if (!TTS || sesHatasi) return;
    const kalan = metin.slice(okunan);
    let kes = -1;
    if (son) kes = kalan.length;
    else {
      const re = /[.!?…](?=\s)|\n/g; let m;
      while ((m = re.exec(kalan))) if (m.index + 1 >= 70) { kes = m.index + 1; break; }
    }
    if (kes <= 0) return;
    const parca = kalan.slice(0, kes).replace(/[*_#`>]/g, "").trim();
    okunan += kes;
    if (!parca) return;
    TTS.add([{ text: parca.slice(0, 1900), voice: secili.ses, language: "tr" }], { rate: +$("#dHiz").value }).catch((e) => {
      if (e?.code === "not_granted" || e?.code === "unavailable") { sesHatasi = true; $("#dSesNot").textContent = "Sesli okuma kapalı; cevaplar altyazı olarak görünüyor."; }
      else if (e?.code === "rate_limited") $("#dSesNot").textContent = "Sesli okuma sınırına ulaşıldı; bir süre altyazıyla devam ediliyor.";
    });
  }

  async function gonder(metin, gorseller = []) {
    if (!aiHazirMi() || mesgul) return;
    if (!metin && !gorseller.length) return;
    mesgul = true; $("#dDur").disabled = false; $("#dGonder").disabled = true;
    try { await TTS?.stop(); } catch {}
    okunan = 0;
    const turlar = konusmalar[secili.k] || (konusmalar[secili.k] = []);
    const icerik = (gorseller.length ? `(Sana ${gorseller.length === 1 ? "bir fotoğraf" : gorseller.length + " fotoğraf"} gösteriyorum.) ` : "") + (metin || "Bu soruyu bana anlatır mısın?");
    dokumEkle("Sen", icerik);
    if (gorseller[0]) $("#senKutu").innerHTML = `<img src="${gorseller[gorseller.length - 1].dataUrl}" alt="Gösterdiğin fotoğraf">`;
    altyazi(`<span class="ben">${esc(icerik)}</span>`);
    sahne.classList.add("dusunuyor"); durum("Düşünüyor…");
    ctl = new AbortController();
    const giris = [{ role: "user", content: istem() + "\n\nDers başlıyor." }, ...turlar.slice(-16), { role: "user", content: icerik }];
    let son = "";
    try {
      const r = await SAMPLE(giris, {
        images: gorselSinir(gorseller), cache: false, signal: ctl.signal,
        onText: ({ text }) => {
          son = text;
          sahne.classList.remove("dusunuyor");
          if (!TTS || sesHatasi) { sahne.classList.add("konusuyor"); durum("Anlatıyor"); }
          altyazi(esc(text.replace(/[*_#`]/g, "")).replace(/\n/g, "<br>"));
          sesVer(text, false);
        },
      });
      son = r.text;
      sesVer(son, true);
      turlar.push({ role: "user", content: icerik }, { role: "assistant", content: son });
      dokumEkle(secili.ad, son);
    } catch (e) {
      if (e?.code !== "cancelled") altyazi(esc(aiHata(e)));
      if (e?.text) { turlar.push({ role: "user", content: icerik }, { role: "assistant", content: e.text }); dokumEkle(secili.ad, e.text); }
    } finally {
      mesgul = false; ctl = null; $("#dGonder").disabled = false;
      sahne.classList.remove("dusunuyor");
      if (!TTS || sesHatasi) { setTimeout(() => sahne.classList.remove("konusuyor"), 600); durum("Dinliyor"); $("#dDur").disabled = true; }
    }
  }
  function susmak() {
    ctl?.abort();
    TTS?.stop().catch(() => {});
    sahne.classList.remove("konusuyor", "dusunuyor");
    durum("Hazır"); $("#dDur").disabled = true;
  }

  // Mikrofon
  $("#dMik").onclick = () => {
    if (!DIK) { toast("Sesle konuşma bu tarayıcıda yok. Bilgisayarda Chrome ile aç ya da yazarak sor."); $("#dMetin").focus(); return; }
    if (dinliyor) { DIK.stop().catch(() => {}); return; }
    if (TTS?.active()) TTS.stop().catch(() => {});
    tampon = "";
    const dilli = oku("dil") !== "yok";
    DIK.start(dilli ? { language: "tr" } : undefined).catch((e) => {
      if (e?.code === "unavailable" && dilli) { kaydet("dil", "yok"); toast("Türkçe ses tanıma açılamadı; bir daha bas, tarayıcının diliyle deneyelim."); }
      else if (e?.code === "not_granted") toast("Mikrofon izni verilmedi. Sayfanın izin menüsünden açabilirsin.");
      else if (e?.code !== "stopped" && e?.code !== "dismissed") toast("Mikrofon açılamadı. Yazarak sorabilirsin.");
    });
  };
  $("#dDur").onclick = susmak;
  $("#dYeniDers").onclick = () => { susmak(); konusmalar[secili.k] = []; $("#dDokum").innerHTML = ""; $("#senKutu").innerHTML = `<span>Sen</span>`; sec(secili.k); };
  $("#dForm").onsubmit = (e) => {
    e.preventDefault();
    const m = $("#dMetin").value.trim(); if (!m) return;
    $("#dMetin").value = ""; gonder(m, bekleyenGorsel.splice(0));
  };
  $("#dMetin").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#dForm").requestSubmit(); } });
  $("#dDersFoto").onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try { const g = await gorselHazirla(f); gonder($("#dMetin").value.trim() || "Bu soruyu bana anlatır mısın?", [g]); $("#dMetin").value = ""; }
    catch { toast("Fotoğraf açılamadı."); }
  };
  $("#dTahta").onclick = () => {
    if (wb.bosMu()) { toast("Tahta boş. Önce Tahta bölümünde çözümünü yaz."); return; }
    const dataUrl = wb.png();
    gonder($("#dMetin").value.trim() || "Tahtaya yazdığım çözüme bakar mısın? Hatam varsa nerede?", [{ dataUrl, blob: dataUrlBlob(dataUrl) }]);
    $("#dMetin").value = "";
  };
  const hizYaz = () => { $("#dHizDeger").textContent = (+$("#dHiz").value).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + "×"; };
  $("#dHiz").oninput = () => { hizYaz(); kaydet("hiz", $("#dHiz").value); TTS?.setRate?.(+$("#dHiz").value).catch?.(() => {}); };
  $("#dAdim").oninput = () => { kaydet("ad", $("#dAdim").value); $("#senHarf") && ($("#senHarf").textContent = $("#dAdim").value.trim() || "Sen"); };

  async function baslat() {
    $("#dAdim").value = oku("ad") || "";
    $("#dHiz").value = oku("hiz") || "1.15"; hizYaz();
    sec(secili.k);
    const use = (n) => (window.claude?.use ? window.claude.use(n).catch(() => null) : Promise.resolve(null));
    [TTS, DIK] = await Promise.all([use("tts"), use("dictation")]);
    const notlar = [];
    if (!TTS) notlar.push("sesli anlatım");
    if (!DIK) notlar.push("mikrofonla konuşma");
    $("#dSesNot").textContent = notlar.length ? `Bu tarayıcıda ${notlar.join(" ve ")} yok; bilgisayarda Chrome ile açarsan çalışır.` : "";
    if (TTS) {
      TTS.setRate?.(+$("#dHiz").value).catch?.(() => {});
      TTS.onState(({ state }) => {
        const k = state === "speaking" || state === "starting";
        sahne.classList.toggle("konusuyor", state === "speaking");
        if (k) { durum("Anlatıyor"); $("#dDur").disabled = false; }
        else if (state === "idle" && !mesgul) { durum("Dinliyor"); $("#dDur").disabled = true; }
      });
    }
    if (DIK) {
      DIK.onPartial(({ text }) => { if (dinliyor) altyazi(`<span class="ben">${esc((tampon + " " + text).trim())}</span>`); });
      DIK.onFinal(({ text }) => { tampon = (tampon + text).trim(); altyazi(`<span class="ben">${esc(tampon)}</span>`); });
      DIK.onState(({ state, reason }) => {
        dinliyor = state === "listening" || state === "starting";
        $("#dMik").classList.toggle("acik", state !== "idle");
        $("#dMik").querySelector("span").textContent = state === "idle" ? "Konuş" : "Bitir";
        sahne.classList.toggle("dinliyor", state === "listening");
        if (state === "listening") durum("Seni dinliyor");
        if (state === "idle") {
          const m = tampon.trim(); tampon = "";
          if (m && reason !== "hidden") gonder(m, bekleyenGorsel.splice(0));
          else if (!mesgul) durum("Hazır");
        }
      });
    }
  }
  function ac(metin) {
    sekme("ders");
    if (metin) gonder(metin);
  }
  return { baslat, ac };
})();

