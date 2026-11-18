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
  const konusmalar = {};
  let TTS = null, DIK = null, TANI = null; // Claude sesi, Claude dikte, tarayıcı ses tanıma
  let ctl = null, mesgul = false, canli = false, tampon = "", sessizT = null, sonKonusma = 0;
  const sahne = $("#sahne");
  const SS = window.speechSynthesis || null;
  const hiz = () => +$("#dHiz").value;

  const durum = (t) => { $("#sahneDurum").textContent = t; };
  const altyaziAcik = () => $("#dAltyazi").checked;
  function altyazi(t) { const a = $("#altyazi"); a.hidden = !altyaziAcik() || !t; a.textContent = t || ""; a.scrollTop = a.scrollHeight; }
  function not(t) { $("#dSesNot").textContent = t || ""; }

  function ogretmenCiz() {
    $("#ogretmenler").innerHTML = OGRETMENLER.map((o) => `<button class="ogr ${o.k === secili.k ? "on" : ""}" data-ogr="${o.k}">${yuzSvg(o, true)}<span><b>${o.ad}</b><small class="muted">${o.brans}</small></span></button>`).join("");
    $$("[data-ogr]").forEach((b) => (b.onclick = () => sec(b.dataset.ogr)));
  }
  function sec(k) {
    if (mesgul || konusuyorMu()) sozunuKes();
    secili = OGRETMENLER.find((o) => o.k === k) || secili;
    kaydet("ogr", secili.k);
    ogretmenCiz();
    $("#yuzKutu").innerHTML = yuzSvg(secili);
    $("#sahneAd").textContent = secili.ad;
    $("#sahneBrans").textContent = secili.brans;
    altyazi("");
  }

  function istem() {
    const ad = ($("#dAdim").value || "").trim();
    return `Sen ${secili.ad}'sın; ${secili.brans} alanında uzman, LGS'ye hazırlanan 8. sınıf öğrencisine birebir özel ders veren bir öğretmensin. ${secili.kisilik}
Şu an öğrenciyle CANLI sesli görüşmedesin: öğrenci konuşuyor, sen konuşuyorsun. Yazdıkların doğrudan sesli okunacak.${ad ? ` Öğrencinin adı ${ad}.` : ""}
Kurallar:
- Gerçek bir insan gibi, günlük konuşma Türkçesiyle konuş: "bak şimdi", "şöyle düşün", "hah, işte burası önemli", "aynen öyle" gibi doğal ifadeler kullan; ders kitabı gibi resmî konuşma. Kısa, doğal cümleler; bir seferde en fazla 4-5 cümle. Uzun çözümü parça parça anlat ve her adımdan sonra "Buraya kadar tamam mı?" gibi kısa bir soruyla öğrencinin cevabını bekle.
- Madde işareti, numara, başlık, tablo, parantez içi açıklama, kalın yazı, emoji kullanma. Sadece konuşma dili.
- Matematik ifadelerini sesli okunacak şekilde yaz: "x kare", "üç bölü dört", "kök iki", "eksi beş", "yüzde yirmi".
- Öğrencinin sözleri sesten yazıya çevrildiği için küçük yazım hataları olabilir; ne demek istediğini anlamaya çalış, anlamazsan kısaca tekrar sor.
- Öğrenci fotoğraf ya da tahta görüntüsü gösterirse önce soruyu bir cümleyle özetle, sonra ilk adımla başla. Okuyamıyorsan söyle.
- Öğrenci anlamadığını söylerse başka bir yoldan, günlük hayattan bir örnekle anlat. Ara ara küçük bir soruyla anladığını kontrol et.
- Branşın dışındaki sorulara da yardım et.
- 8. sınıf müfredatına ve LGS tarzına uy. Emin olmadığın şeyi uydurma.
- Samimi ve cesaretlendirici ol, abartma.`;
  }

  /* ---------- Ses çıkışı ---------- */
  // Canlı dinleme açıkken Claude sesi çalışmaz (mikrofonla çakışır), o zaman cihazın Türkçe sesi kullanılır.
  // Cihazdaki Türkçe sesler: en doğal olanlar (Natural/Online/Neural, Google) önce
  let cihazSesleri = [];
  const KADIN = /emel|yelda|filiz|seda|zeynep|elif|aylin|selin|google|female|kad[ıi]n/i;
  const ERKEK = /ahmet|tolga|cem|mehmet|emre|male|erkek/i;
  const dogallik = (v) => (/natural|neural|online|premium|enhanced/i.test(v.name) ? 3 : 0) + (/google/i.test(v.name) ? 2 : 0) + (v.localService === false ? 1 : 0);
  function sesleriYukle() {
    if (!SS) return;
    cihazSesleri = SS.getVoices().filter((v) => /^tr/i.test(v.lang)).sort((a, b) => dogallik(b) - dogallik(a));
    sesListesi();
  }
  const HOCA_KADIN = { elif: true, zeynep: true, kerem: false, can: false };
  function hocaSesi() {
    const secim = oku("ses") || "oto";
    const elle = cihazSesleri.find((v) => v.voiceURI === secim);
    if (elle) return elle;
    const kadin = HOCA_KADIN[secili.k];
    const uygun = cihazSesleri.filter((v) => (kadin ? KADIN.test(v.name) && !ERKEK.test(v.name) : ERKEK.test(v.name)));
    return (uygun[0] && dogallik(uygun[0]) >= dogallik(cihazSesleri[0] || uygun[0]) - 1 ? uygun[0] : cihazSesleri[0]) || null;
  }
  function sesListesi() {
    const sel = $("#dSes"); if (!sel) return;
    const secim = oku("ses") || "oto";
    sel.innerHTML = `<option value="oto">Otomatik (en doğal ses)</option>` +
      (TTS ? `<option value="claude">Claude sesi (çok doğal, her cevaptan sonra dokunursun)</option>` : "") +
      cihazSesleri.map((v) => `<option value="${esc(v.voiceURI)}">${esc(v.name.replace(/Microsoft |Online |\(Natural\)|- Turkish.*$|Turkish.*$/g, "").trim() || v.name)}${dogallik(v) >= 3 ? " (doğal)" : ""}</option>`).join("");
    sel.value = [...sel.options].some((o) => o.value === secim) ? secim : "oto";
  }
  let claudeSesKapali = false, cihazKuyruk = 0;
  const motor = () => {
    const secim = oku("ses") || "oto";
    const claudeOlur = TTS && !claudeSesKapali;
    if (secim === "claude" && claudeOlur) return "claude";
    const dinlemeAcik = canli && DIK && DIK.active();
    if (secim === "oto" && claudeOlur && !dinlemeAcik && !(cihazSesleri[0] && dogallik(cihazSesleri[0]) >= 3)) return "claude";
    if (SS && cihazSesleri.length) return "cihaz";
    if (claudeOlur) return "claude";
    return SS ? "cihaz" : null;
  };
  const konusuyorMu = () => (SS && (SS.speaking || SS.pending || cihazKuyruk > 0)) || (TTS && TTS.active());
  function konusmaBasladi() { sahne.classList.add("konusuyor"); sahne.classList.remove("dinliyor", "duyuyor"); durum("Anlatıyor"); $("#dDur").disabled = false; }
  function konusmaBitti() {
    if (konusuyorMu() || mesgul) return;
    sahne.classList.remove("konusuyor"); sonKonusma = Date.now(); $("#dDur").disabled = true;
    dinlemeyeDon();
  }
  function seslendir(parca) {
    const m = motor();
    if (!m) { sahne.classList.add("konusuyor"); return; }
    if (m === "claude") {
      // Claude sesi mikrofonla aynı anda çalışmaz: önce dinlemeyi kapat
      if (DIK && DIK.active()) { DIK.stop().catch(() => {}).finally(() => seslendir(parca)); return; }
      TTS.add([{ text: parca.slice(0, 1900), voice: secili.ses, language: "tr" }], { rate: hiz() }).catch((e) => {
        if (e?.code === "not_granted") { claudeSesKapali = true; not("Claude sesi kapalı; cihazın sesi kullanılıyor."); if (SS) seslendir(parca); }
        else if (e?.code === "busy" && SS) seslendir(parca);
        else if (e?.code === "rate_limited") not("Ses sınırına ulaşıldı; biraz bekleyip tekrar dene.");
      });
      return;
    }
    const u = new SpeechSynthesisUtterance(parca);
    u.lang = "tr-TR";
    const v = hocaSesi(); if (v) u.voice = v;
    u.rate = hiz(); u.pitch = 1;
    cihazKuyruk++;
    u.onstart = konusmaBasladi;
    u.onend = u.onerror = () => { cihazKuyruk = Math.max(0, cihazKuyruk - 1); setTimeout(konusmaBitti, 50); };
    SS.speak(u);
  }
  let okunan = 0;
  function sesVer(metin, son) {
    const kalan = metin.slice(okunan);
    let kes = -1;
    if (son) kes = kalan.length;
    else { const re = /[.!?…](?=\s)|\n/g; let m; while ((m = re.exec(kalan))) if (m.index + 1 >= 60) { kes = m.index + 1; break; } }
    if (kes <= 0) return;
    const parca = kalan.slice(0, kes).replace(/[*_#`>()]/g, "").trim();
    okunan += kes;
    if (parca) seslendir(parca);
  }
  function sesiDurdur() { try { SS?.cancel(); } catch {} cihazKuyruk = 0; TTS?.stop().catch(() => {}); }

  /* ---------- Yapay zekâ ---------- */
  async function gonder(metin, gorseller = []) {
    if (!aiHazirMi() || mesgul) return;
    if (!metin && !gorseller.length) return;
    mesgul = true; $("#dDur").disabled = false;
    sesiDurdur(); okunan = 0;
    const turlar = konusmalar[secili.k] || (konusmalar[secili.k] = []);
    const icerik = (gorseller.length ? "(Sana bir fotoğraf gösteriyorum.) " : "") + (metin || "Bu soruyu bana anlatır mısın?");
    if (gorseller[0]) $("#senKutu").innerHTML = `<img src="${gorseller[gorseller.length - 1].dataUrl}" alt="Gösterdiğin fotoğraf">`;
    sahne.classList.remove("dinliyor", "duyuyor"); sahne.classList.add("dusunuyor"); durum("Düşünüyor…");
    ctl = new AbortController();
    const giris = [{ role: "user", content: istem() + "\n\nGörüşme başladı." }, ...turlar.slice(-16), { role: "user", content: icerik }];
    try {
      const r = await SAMPLE(giris, {
        images: gorselSinir(gorseller), cache: false, signal: ctl.signal, modelTier: gorseller.length ? "default" : "quick",
        onText: ({ text }) => { sahne.classList.remove("dusunuyor"); altyazi(text.replace(/[*_#`]/g, "")); sesVer(text, false); },
      });
      sesVer(r.text, true);
      turlar.push({ role: "user", content: icerik }, { role: "assistant", content: r.text });
    } catch (e) {
      if (e?.code !== "cancelled") { const h = aiHata(e); altyazi(h); not(h); }
      if (e?.text) turlar.push({ role: "user", content: icerik }, { role: "assistant", content: e.text });
    } finally {
      mesgul = false; ctl = null;
      sahne.classList.remove("dusunuyor");
      if (!motor()) setTimeout(() => sahne.classList.remove("konusuyor"), 1500);
      setTimeout(konusmaBitti, 300);
    }
  }
  function sozunuKes() { ctl?.abort(); sesiDurdur(); sahne.classList.remove("konusuyor", "dusunuyor"); mesgul = false; setTimeout(konusmaBitti, 100); }

  /* ---------- Canlı dinleme ---------- */
  function duydum(metin, kesin) {
    if (!canli || mesgul || konusuyorMu() || Date.now() - sonKonusma < 500) { if (kesin) tampon = ""; return; } // hocanın kendi sesini duymasın
    sahne.classList.add("duyuyor");
    if (kesin) tampon = (tampon + " " + metin).trim();
    clearTimeout(sessizT);
    sessizT = setTimeout(() => {
      sahne.classList.remove("duyuyor");
      const m = tampon.trim(); tampon = "";
      if (m.length > 1) gonder(m);
    }, kesin ? 1300 : 1900);
  }
  function dinlemeyeDon() {
    if (!canli || mesgul) return;
    if (DIK) {
      if (DIK.active()) { sahne.classList.add("dinliyor"); durum("Seni dinliyor"); }
      else { durum("Konuşmak için yeşil düğmeye dokun"); $("#dAra").querySelector("span").textContent = "Konuşmaya devam"; }
      return;
    }
    if (TANI) { try { TANI.start(); } catch {} sahne.classList.add("dinliyor"); durum("Seni dinliyor"); }
  }
  function araYaz() {
    $("#dAra").classList.toggle("acik", canli);
    $("#dAra").querySelector("span").textContent = canli ? "Görüşmeyi bitir" : "Görüşmeyi başlat";
  }
  function bitir() {
    canli = false; araYaz(); clearTimeout(sessizT); tampon = "";
    DIK?.stop().catch(() => {}); try { TANI?.abort(); } catch {}
    sozunuKes(); sahne.classList.remove("dinliyor", "duyuyor"); durum("Görüşme kapalı");
  }
  function tarayiciTanima() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR(); r.lang = "tr-TR"; r.continuous = true; r.interimResults = true;
    r.onresult = (e) => { for (let i = e.resultIndex; i < e.results.length; i++) duydum(e.results[i][0].transcript, e.results[i].isFinal); };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") { TANI = null; bitir(); not("Bu görünümde mikrofon açılamıyor. Bilgisayarda Chrome ile aç ya da Claude uygulamasının sesli modunu kullan."); }
    };
    r.onend = () => { if (canli && !mesgul && !konusuyorMu()) { try { r.start(); } catch {} } };
    return r;
  }

  $("#dAra").onclick = () => {
    if (canli && !(DIK && !DIK.active())) { bitir(); return; }
    if (!aiHazirMi()) return;
    // Mikrofon dokunuşun içinde, beklemeden açılmalı
    if (DIK) {
      canli = true; araYaz(); sesiDurdur();
      const dilli = oku("dil") !== "yok";
      DIK.start(dilli ? { language: "tr" } : undefined).catch((e) => {
        if (e?.code === "unavailable" && dilli) { kaydet("dil", "yok"); not("Türkçe ses tanıma açılamadı; düğmeye bir daha bas."); }
        else if (e?.code === "not_granted") not("Mikrofon izni verilmedi. Sayfanın izin menüsünden açabilirsin.");
        else if (e?.code !== "stopped" && e?.code !== "dismissed") not("Mikrofon açılamadı.");
        if (!DIK.active()) bitir();
      });
      if (!mesgul) { const ilk = (konusmalar[secili.k] || []).length === 0; if (ilk) selamla(); }
      return;
    }
    TANI = TANI || tarayiciTanima();
    if (!TANI) { not("Bu cihazda canlı konuşma için mikrofon kullanılamıyor. Bilgisayarda Chrome ile açarsan çalışır; telefonda Claude uygulamasının sesli modunu kullanabilirsin."); return; }
    canli = true; araYaz();
    try { TANI.start(); } catch {}
    if ((konusmalar[secili.k] || []).length === 0) selamla(); else dinlemeyeDon();
  };
  function selamla() {
    const ad = ($("#dAdim").value || "").trim();
    const t = `Merhaba${ad ? " " + ad : ""}, ben ${secili.ad}. Hangi soruda takıldın? Anlatabilirsin ya da sorunun fotoğrafını gösterebilirsin.`;
    altyazi(t); okunan = 0; sesVer(t, true);
    (konusmalar[secili.k] = konusmalar[secili.k] || []).push({ role: "user", content: "Merhaba hocam." }, { role: "assistant", content: t });
    if (!motor()) setTimeout(() => { sahne.classList.remove("konusuyor"); dinlemeyeDon(); }, 2500);
  }

  $("#dDur").onclick = sozunuKes;
  $("#dYeniDers").onclick = () => { sozunuKes(); konusmalar[secili.k] = []; $("#senKutu").innerHTML = `<span>Sen</span>`; altyazi(""); if (canli) selamla(); };
  $("#dForm").onsubmit = (e) => { e.preventDefault(); const m = $("#dMetin").value.trim(); if (!m) return; $("#dMetin").value = ""; gonder(m); };
  $("#dMetin").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#dForm").requestSubmit(); } });
  $("#dDersFoto").onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try { const g = await gorselHazirla(f); gonder("Bu soruyu bana anlatır mısın?", [g]); } catch { toast("Fotoğraf açılamadı."); }
  };
  $("#dTahta").onclick = () => {
    if (wb.bosMu()) { toast("Tahta boş. Önce Tahta bölümünde çözümünü yaz."); return; }
    const dataUrl = wb.png();
    gonder("Tahtaya yazdığım çözüme bakar mısın? Hatam varsa nerede?", [{ dataUrl, blob: dataUrlBlob(dataUrl) }]);
  };
  const hizYaz = () => { $("#dHizDeger").textContent = hiz().toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + "×"; };
  $("#dHiz").oninput = () => { hizYaz(); kaydet("hiz", $("#dHiz").value); TTS?.setRate?.(hiz())?.catch?.(() => {}); };
  $("#dAdim").oninput = () => { kaydet("ad", $("#dAdim").value); $("#senHarf") && ($("#senHarf").textContent = $("#dAdim").value.trim() || "Sen"); };
  $("#dSes").onchange = () => { kaydet("ses", $("#dSes").value); };
  $("#dSesDene").onclick = () => {
    sesiDurdur(); okunan = 0;
    const t = `Merhaba, ben ${secili.ad}. Sesim böyle. Hadi birlikte soru çözelim.`;
    sesVer(t, true);
    if (!motor()) toast("Bu cihazda sesli okuma yok.");
  };
  $("#dAltyazi").onchange = () => { kaydet("altyazi", $("#dAltyazi").checked ? "1" : "0"); $("#altyazi").hidden = !$("#dAltyazi").checked || !$("#altyazi").textContent; };

  async function baslat() {
    $("#dAdim").value = oku("ad") || "";
    if ($("#senHarf")) $("#senHarf").textContent = $("#dAdim").value.trim() || "Sen";
    $("#dHiz").value = oku("hiz") || "1.15"; hizYaz();
    sec(secili.k);
    const use = (n) => (window.claude?.use ? window.claude.use(n).catch(() => null) : Promise.resolve(null));
    [TTS, DIK] = await Promise.all([use("tts"), use("dictation")]);
    if (SS) { sesleriYukle(); SS.addEventListener?.("voiceschanged", sesleriYukle); setTimeout(sesleriYukle, 800); } else sesListesi();
    const sesVar = !!(TTS || SS), mikVar = !!(DIK || window.SpeechRecognition || window.webkitSpeechRecognition);
    $("#dAltyazi").checked = oku("altyazi") ? oku("altyazi") === "1" : !sesVar;
    if (!sesVar && !mikVar) not("Bu cihazda ses ve mikrofon kullanılamıyor. Bilgisayarda Chrome ile açarsan canlı konuşabilirsin.");
    else if (!mikVar) not("Bu cihazda mikrofon kullanılamıyor; hoca sesli anlatır, sen aşağıdan yazarak sorabilirsin.");
    else not("Görüşmeyi başlat'a bas ve konuşmaya başla. Sustuğunda hoca cevap verir. Kulaklık kullanırsan daha iyi duyar.");
    if (TTS) {
      TTS.setRate?.(hiz())?.catch?.(() => {});
      TTS.onState(({ state, reason }) => {
        if (state === "speaking" || state === "starting") konusmaBasladi();
        if (state === "idle") { if (reason === "not_granted" || reason === "unavailable") claudeSesKapali = true; setTimeout(konusmaBitti, 50); }
      });
    }
    if (DIK) {
      DIK.onPartial(({ text }) => { if (text) duydum(text, false); });
      DIK.onFinal(({ text }) => duydum(text, true));
      DIK.onState(({ state }) => {
        if (state === "listening") { sahne.classList.add("dinliyor"); if (!mesgul && !konusuyorMu()) durum("Seni dinliyor"); araYaz(); }
        if (state === "idle") { sahne.classList.remove("dinliyor", "duyuyor"); if (canli) dinlemeyeDon(); }
      });
    }
  }
  function ac(metin) { sekme("ders"); if (metin) gonder(metin); }
  return { baslat, ac };
})();

