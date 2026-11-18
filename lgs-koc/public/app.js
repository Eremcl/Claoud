// LGS Koçu: deneme analizi (2027 tahmini puan), fotoğraftan soru, soru sor, tahta.
import { firebaseConfig, AI_MODELS } from "./firebase-config.js";

const FB = "https://www.gstatic.com/firebasejs/13.1.0";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ic = (n) => `<svg class="ic"><use href="#i-${n}"/></svg>`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ------------------------------------------------------------------ */
/* LGS 2027 puan hesabı                                                */
/* ------------------------------------------------------------------ */
// LGS: 90 soru, 3 yanlış 1 doğruyu götürür. Türkçe/Mat/Fen ağırlığı 4, diğerleri 1.
// MEB puanı her dersin standart puanından hesaplanır (o yılın ortalamasına göre).
// Aşağıdaki taban ve katsayılar son yılların sonuçlarına uyan yaygın tahmin formülüdür
// ve 2027 için MEB'in açıkladığı bir değişiklik yoktur. Tam net = ~500 puan.
const TABAN = 194.752082;
const DERSLER = [
  { k: "turkce", ad: "Türkçe", n: 20, kat: 3.671, renk: "--c1" },
  { k: "mat", ad: "Matematik", n: 20, kat: 4.953, renk: "--c2" },
  { k: "fen", ad: "Fen Bilimleri", n: 20, kat: 4.072, renk: "--c3" },
  { k: "ink", ad: "İnkılap Tarihi", n: 10, kat: 1.666, renk: "--c4" },
  { k: "din", ad: "Din Kültürü", n: 10, kat: 1.899, renk: "--c5" },
  { k: "ing", ad: "İngilizce", n: 10, kat: 1.5075, renk: "--c6" },
];
const net = (d, y) => Math.max(0, (+d || 0) - (+y || 0) / 3);
function hesapla(dersler) {
  let puan = TABAN, toplamNet = 0;
  for (const D of DERSLER) {
    const x = dersler[D.k] || { d: 0, y: 0 };
    const n = net(x.d, x.y);
    toplamNet += n;
    puan += n * D.kat;
  }
  return { puan: Math.min(500, puan), toplamNet };
}
const f1 = (x) => (Math.round(x * 100) / 100).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
const f2 = (x) => x.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ------------------------------------------------------------------ */
/* Firebase                                                            */
/* ------------------------------------------------------------------ */
const hazir = !!(firebaseConfig.apiKey && firebaseConfig.projectId);
let fb = null; // { auth, db, fs, ai, aiMod }
let user = null;

async function firebaseBaslat() {
  if (!hazir) {
    banner(`Firebase ayarı yapılmamış. <code>public/firebase-config.js</code> dosyasına projenin ayarlarını yapıştır. Şimdilik denemeler bu tarayıcıda saklanıyor; yapay zekâ özellikleri kapalı.`);
    return;
  }
  const [appM, authM, fs, aiMod] = await Promise.all([
    import(`${FB}/firebase-app.js`),
    import(`${FB}/firebase-auth.js`),
    import(`${FB}/firebase-firestore.js`),
    import(`${FB}/firebase-ai.js`),
  ]);
  const app = appM.initializeApp(firebaseConfig);
  const auth = authM.getAuth(app);
  const db = fs.getFirestore(app);
  const ai = aiMod.getAI(app, { backend: new aiMod.GoogleAIBackend() });
  fb = { app, auth, authM, db, fs, ai, aiMod };
  authM.onAuthStateChanged(auth, async (u) => {
    user = u;
    whoCiz();
    await veriYukle();
  });
}

function whoCiz() {
  const w = $("#who");
  if (!hazir) { w.innerHTML = `<span class="muted">Yerel mod</span>`; return; }
  if (user) {
    w.innerHTML = `${user.photoURL ? `<img src="${esc(user.photoURL)}" alt="">` : ""}<span>${esc(user.displayName || "Öğrenci")}</span><button class="btn ghost sm" id="cikis">Çıkış</button>`;
    $("#banner").hidden = true;
    $("#cikis").onclick = () => fb.authM.signOut(fb.auth);
  } else {
    w.innerHTML = `<button class="btn sm" id="giris">Google ile giriş</button>`;
    banner(`Denemelerinin buluta kaydedilmesi ve her cihazdan görünmesi için <b>Google ile giriş</b> yap. Giriş yapmazsan bu tarayıcıda saklanır.`);
    $("#giris").onclick = async () => {
      try { await fb.authM.signInWithPopup(fb.auth, new fb.authM.GoogleAuthProvider()); }
      catch (e) { toast("Giriş yapılamadı: " + (e.code || e.message)); }
    };
  }
}

/* Veri katmanı: girişliyse Firestore, değilse localStorage */
const LS = "lgs-koc-v1";
const lsOku = () => { try { return JSON.parse(localStorage.getItem(LS)) || { denemeler: [], ayar: {} }; } catch { return { denemeler: [], ayar: {} }; } };
const lsYaz = (v) => { try { localStorage.setItem(LS, JSON.stringify(v)); } catch {} };

const store = {
  async liste() {
    if (user) {
      const { collection, getDocs } = fb.fs;
      const snap = await getDocs(collection(fb.db, "users", user.uid, "denemeler"));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    return lsOku().denemeler;
  },
  async ekle(d) {
    if (user) {
      const { collection, addDoc } = fb.fs;
      const r = await addDoc(collection(fb.db, "users", user.uid, "denemeler"), d);
      return { id: r.id, ...d };
    }
    const v = lsOku(); const x = { id: "l" + Date.now(), ...d }; v.denemeler.push(x); lsYaz(v); return x;
  },
  async guncelle(id, patch) {
    if (user) { const { doc, updateDoc } = fb.fs; await updateDoc(doc(fb.db, "users", user.uid, "denemeler", id), patch); return; }
    const v = lsOku(); const x = v.denemeler.find((d) => d.id === id); if (x) Object.assign(x, patch); lsYaz(v);
  },
  async sil(id) {
    if (user) { const { doc, deleteDoc } = fb.fs; await deleteDoc(doc(fb.db, "users", user.uid, "denemeler", id)); return; }
    const v = lsOku(); v.denemeler = v.denemeler.filter((x) => x.id !== id); lsYaz(v);
  },
  async ayar() {
    if (user) { const { doc, getDoc } = fb.fs; const s = await getDoc(doc(fb.db, "users", user.uid)); return (s.exists() && s.data().ayar) || {}; }
    return lsOku().ayar || {};
  },
  async ayarYaz(a) {
    if (user) { const { doc, setDoc } = fb.fs; await setDoc(doc(fb.db, "users", user.uid), { ayar: a }, { merge: true }); return; }
    const v = lsOku(); v.ayar = a; lsYaz(v);
  },
};

let DENEMELER = [];
let AYAR = {};
async function veriYukle() {
  try {
    [DENEMELER, AYAR] = await Promise.all([store.liste(), store.ayar()]);
  } catch (e) {
    toast("Veriler okunamadı: " + (e.code || e.message));
    DENEMELER = []; AYAR = {};
  }
  DENEMELER.sort((a, b) => (a.tarih || "").localeCompare(b.tarih || "") || (a.olusturma || 0) - (b.olusturma || 0));
  analizCiz();
}

/* ------------------------------------------------------------------ */
/* Yapay zekâ (Firebase AI Logic · Gemini)                             */
/* ------------------------------------------------------------------ */
const SISTEM = `Sen Türkiye'de LGS'ye hazırlanan 8. sınıf öğrencilerine yardım eden sabırlı, samimi bir öğretmensin.
Her zaman Türkçe yaz. 8. sınıf (Maarif modeli) müfredatına ve LGS soru tarzına uy.
Soru çözerken: önce sorunun ne istediğini bir cümleyle söyle, sonra numaralı kısa adımlarla çöz, en sonda "Cevap: X" yaz.
Matematik ifadelerini LaTeX kullanmadan düz yaz (x², √2, 3/4, ×, ÷ gibi).
Görseldeki soru okunmuyorsa bunu söyle ve öğrenciden daha net bir fotoğraf iste. Emin olmadığın bir şeyi uydurma. Emoji kullanma.`;

let calisanModel = null;
function aiHazirMi() {
  if (!fb) { toast("Yapay zekâ için önce firebase-config.js ayarlanmalı."); return false; }
  return true;
}
async function modelIle(fn, ayar = {}) {
  const adaylar = calisanModel ? [calisanModel] : AI_MODELS;
  let sonHata;
  for (const m of adaylar) {
    try {
      const model = fb.aiMod.getGenerativeModel(fb.ai, { model: m, systemInstruction: SISTEM, ...ayar });
      const r = await fn(model);
      calisanModel = m;
      return r;
    } catch (e) {
      sonHata = e;
      const msg = String(e.message || e);
      if (!/not found|404|not supported|unknown model|is not available/i.test(msg)) break;
    }
  }
  throw sonHata;
}
function aiHata(e) {
  const m = String(e?.message || e);
  if (/api-not-enabled|firebasevertexai|firebaseml|AI Logic/i.test(m)) return "Firebase konsolunda AI Logic (Gemini Developer API) etkin değil.";
  if (/quota|429|resource-exhausted/i.test(m)) return "Yapay zekâ kotası doldu, biraz sonra tekrar dene.";
  return "Yapay zekâ hatası: " + m.slice(0, 200);
}

/* Görseli küçültüp base64'e çevir */
function gorselHazirla(file, max = 1600) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const dataUrl = c.toDataURL("image/jpeg", 0.85);
      res({ dataUrl, part: { inlineData: { data: dataUrl.split(",")[1], mimeType: "image/jpeg" } } });
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Görsel açılamadı")); };
    img.src = url;
  });
}
const dataUrlPart = (dataUrl) => ({ inlineData: { data: dataUrl.split(",")[1], mimeType: dataUrl.slice(5, dataUrl.indexOf(";")) } });
function jsonAyikla(t) {
  const s = t.replace(/```json|```/g, "").trim();
  const i = Math.min(...["{", "["].map((c) => { const k = s.indexOf(c); return k < 0 ? Infinity : k; }));
  return JSON.parse(s.slice(i));
}

/* Basit, güvenli markdown */
function md(t) {
  const satir = esc(t).split("\n");
  let html = "", liste = null;
  const kapat = () => { if (liste) { html += `</${liste}>`; liste = null; } };
  const ic = (s) => s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>");
  for (const l of satir) {
    let m;
    if ((m = l.match(/^\s*#{1,4}\s+(.*)/))) { kapat(); html += `<h4>${ic(m[1])}</h4>`; }
    else if ((m = l.match(/^\s*[-•*]\s+(.*)/))) { if (liste !== "ul") { kapat(); html += "<ul>"; liste = "ul"; } html += `<li>${ic(m[1])}</li>`; }
    else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (liste !== "ol") { kapat(); html += "<ol>"; liste = "ol"; } html += `<li>${ic(m[1])}</li>`; }
    else if (l.trim() === "") { kapat(); }
    else { kapat(); html += `<p>${ic(l)}</p>`; }
  }
  kapat();
  return html;
}

/* ------------------------------------------------------------------ */
/* Genel arayüz                                                        */
/* ------------------------------------------------------------------ */
function banner(h) { const b = $("#banner"); b.innerHTML = h; b.hidden = false; }
let toastT;
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 3200); }
function sekme(ad) {
  $$("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === ad));
  $$(".tab").forEach((s) => s.classList.toggle("on", s.id === "t-" + ad));
  if (ad === "tahta") wb.boyutla();
  try { localStorage.setItem("lgs-koc-sekme", ad); } catch {}
}
$$("#tabs button").forEach((b) => (b.onclick = () => sekme(b.dataset.tab)));

/* ------------------------------------------------------------------ */
/* Deneme ekle                                                         */
/* ------------------------------------------------------------------ */
function denemeFormu() {
  $("#dTarih").value = new Date().toISOString().slice(0, 10);
  $("#dTablo tbody").innerHTML = DERSLER.map((D) => `
    <tr data-k="${D.k}">
      <td>${D.ad}</td><td>${D.n}</td>
      <td><input type="number" min="0" max="${D.n}" inputmode="numeric" data-f="d" placeholder="0"></td>
      <td><input type="number" min="0" max="${D.n}" inputmode="numeric" data-f="y" placeholder="0"></td>
      <td class="bos">${D.n}</td><td class="net">0</td>
    </tr>`).join("");
  $("#dTablo").addEventListener("input", denemeGuncelle);
}
function formOku() {
  const dersler = {}; let hata = false;
  for (const tr of $$("#dTablo tbody tr")) {
    const D = DERSLER.find((x) => x.k === tr.dataset.k);
    const d = Math.max(0, parseInt($("[data-f=d]", tr).value) || 0);
    const y = Math.max(0, parseInt($("[data-f=y]", tr).value) || 0);
    const asim = d + y > D.n;
    hata ||= asim;
    tr.querySelector(".bos").innerHTML = asim ? `<span class="err">fazla!</span>` : D.n - d - y;
    tr.querySelector(".net").textContent = f1(net(d, y));
    dersler[D.k] = { d, y };
  }
  return { dersler, hata };
}
function denemeGuncelle() {
  const { dersler, hata } = formOku();
  const { puan, toplamNet } = hesapla(dersler);
  $("#dToplamNet").textContent = f1(toplamNet);
  $("#dPuan").textContent = hata ? "Soru sayısını aştın" : f2(puan);
}
$("#dKaydet").onclick = async () => {
  const { dersler, hata } = formOku();
  if (hata) return toast("Bir derste doğru + yanlış soru sayısını aşıyor.");
  const { puan, toplamNet } = hesapla(dersler);
  if (toplamNet === 0 && !confirm("Hiç doğru girmedin. Yine de kaydedilsin mi?")) return;
  const d = {
    ad: $("#dAd").value.trim() || `Deneme ${DENEMELER.length + 1}`,
    yayin: $("#dYayin").value.trim(),
    tarih: $("#dTarih").value || new Date().toISOString().slice(0, 10),
    konular: $("#dKonular").value.trim(),
    dersler, puan: Math.round(puan * 100) / 100, net: Math.round(toplamNet * 100) / 100,
    olusturma: Date.now(),
  };
  $("#dKaydet").disabled = true;
  try {
    const x = await store.ekle(d);
    DENEMELER.push(x);
    DENEMELER.sort((a, b) => (a.tarih || "").localeCompare(b.tarih || "") || (a.olusturma || 0) - (b.olusturma || 0));
    toast(`Kaydedildi: ${f2(d.puan)} puan`);
    $("#dAd").value = ""; $("#dKonular").value = "";
    $$("#dTablo input").forEach((i) => (i.value = ""));
    denemeGuncelle(); analizCiz(); kocAc(x.id);
  } catch (e) { toast("Kaydedilemedi: " + (e.code || e.message)); }
  $("#dKaydet").disabled = false;
};

// Sonuç kâğıdı fotoğrafından doldurma
$("#dFoto").onchange = async (e) => {
  const file = e.target.files[0]; e.target.value = "";
  if (!file || !aiHazirMi()) return;
  const durum = $("#dFotoDurum");
  durum.textContent = "Fotoğraf okunuyor…";
  try {
    const { part } = await gorselHazirla(file, 2000);
    const istem = `Bu bir LGS deneme sınavı sonuç belgesi ya da optik/karne fotoğrafı. Her ders için doğru ve yanlış sayısını oku.
Yalnızca şu JSON'u döndür: {"ad":"deneme adı veya boş","turkce":{"d":0,"y":0},"mat":{"d":0,"y":0},"fen":{"d":0,"y":0},"ink":{"d":0,"y":0},"din":{"d":0,"y":0},"ing":{"d":0,"y":0}}
Okuyamadığın dersi {"d":null,"y":null} yaz.`;
    const r = await modelIle((m) => m.generateContent([istem, part]), { generationConfig: { responseMimeType: "application/json" } });
    const j = jsonAyikla(r.response.text());
    let dolan = 0;
    for (const tr of $$("#dTablo tbody tr")) {
      const x = j[tr.dataset.k];
      if (x && x.d != null) { $("[data-f=d]", tr).value = x.d; $("[data-f=y]", tr).value = x.y ?? 0; dolan++; }
    }
    if (j.ad && !$("#dAd").value) $("#dAd").value = j.ad;
    denemeGuncelle();
    durum.textContent = dolan ? `${dolan} ders dolduruldu. Lütfen sayıları kontrol et.` : "Sayılar okunamadı, elle girebilirsin.";
  } catch (er) { durum.textContent = aiHata(er); }
};

/* ------------------------------------------------------------------ */
/* Analiz                                                              */
/* ------------------------------------------------------------------ */
function analizCiz() {
  kocSecenekleri();
  const k = $("#analizIcerik");
  if (!DENEMELER.length) {
    k.innerHTML = `<div class="card empty"><div class="big">${ic("chart")}</div><h2>Henüz deneme yok</h2>
      <p class="muted">İlk denemeni ekle; puanını 2027 LGS hesabına göre bulup derslere göre analiz edeyim.</p>
      <button class="btn" id="ilkDeneme">Deneme ekle</button></div>`;
    $("#ilkDeneme").onclick = () => sekme("deneme");
    return;
  }
  const son = DENEMELER[DENEMELER.length - 1];
  const onceki = DENEMELER[DENEMELER.length - 2];
  const puanlar = DENEMELER.map((d) => d.puan);
  const ort = puanlar.reduce((a, b) => a + b, 0) / puanlar.length;
  const enIyi = Math.max(...puanlar);
  const fark = onceki ? son.puan - onceki.puan : null;
  const hedef = +AYAR.hedef || 0;

  // Son 3 denemenin ortalama netleri
  const sonN = DENEMELER.slice(-3);
  const ortNet = {};
  for (const D of DERSLER) ortNet[D.k] = sonN.reduce((a, d) => a + net(d.dersler[D.k]?.d, d.dersler[D.k]?.y), 0) / sonN.length;

  // Öncelikler: kaybedilen puan potansiyeli
  const oncelik = DERSLER.map((D) => {
    const n = ortNet[D.k];
    const yanlis = sonN.reduce((a, d) => a + (d.dersler[D.k]?.y || 0), 0) / sonN.length;
    const bos = sonN.reduce((a, d) => a + (D.n - (d.dersler[D.k]?.d || 0) - (d.dersler[D.k]?.y || 0)), 0) / sonN.length;
    return { ...D, nt: n, kayip: (D.n - n) * D.kat, yanlis, bos, oran: n / D.n };
  }).sort((a, b) => b.kayip - a.kayip);

  // Hedef için gereken net
  let hedefHtml = "";
  if (hedef) {
    const gerek = hedef - son.puan;
    if (gerek <= 0) hedefHtml = `<p class="up"><b>Hedefini geçtin.</b> Son denemen hedefinden ${f2(-gerek)} puan yüksek.</p>`;
    else {
      const ipuclari = oncelik.slice(0, 3).map((o) => {
        const bosNet = Math.min(o.n - o.nt, gerek / o.kat);
        return `${o.ad}: +${f1(bosNet)} net ≈ +${f2(bosNet * o.kat)} puan`;
      });
      hedefHtml = `<p>Hedefine <b>${f2(gerek)} puan</b> var. Ortalama olarak Matematik'te 1 net ≈ ${f2(4.953)}, Fen'de ≈ ${f2(4.072)}, Türkçe'de ≈ ${f2(3.671)} puan getirir.</p>
      <ul class="oncelik">${ipuclari.map((x) => `<li>${x}</li>`).join("")}</ul>`;
    }
  }

  k.innerHTML = `
  <div class="kpis">
    <div class="kpi"><small>Son deneme</small><b>${f2(son.puan)}</b>
      ${fark != null ? `<div class="d ${fark >= 0 ? "up" : "down"}">${fark >= 0 ? "▲" : "▼"} ${f2(Math.abs(fark))} puan</div>` : `<div class="d muted">${esc(son.ad)}</div>`}</div>
    <div class="kpi"><small>Son net</small><b>${f1(son.net)}</b><div class="d muted">/ 90</div></div>
    <div class="kpi"><small>Ortalama puan</small><b>${f2(ort)}</b><div class="d muted">${DENEMELER.length} deneme</div></div>
    <div class="kpi"><small>En iyi puan</small><b>${f2(enIyi)}</b><div class="d muted">${esc(DENEMELER.find((d) => d.puan === enIyi).ad)}</div></div>
  </div>

  <div class="two">
    <div class="card chart"><h3>Puan gelişimi</h3>${cizgiGrafik(DENEMELER, hedef)}</div>
    <div class="card"><h3>Ders netleri <small>(son ${sonN.length} deneme ortalaması)</small></h3>
      <div class="bars">${DERSLER.map((D) => {
        const n = ortNet[D.k]; const o = n / D.n;
        return `<div class="b"><span>${D.ad}</span><div class="track"><div class="fill" style="width:${o * 100}%;background:var(${D.renk})"></div></div><span class="v">${f1(n)}/${D.n}</span></div>`;
      }).join("")}</div>
    </div>
  </div>

  <div class="two">
    <div class="card">
      <h3>Nereye çalışmalısın?</h3>
      <p class="muted">Kaybettiğin puana göre sıralandı (eksik net × dersin puan katsayısı).</p>
      <ol class="oncelik">${oncelik.slice(0, 4).map((o) => `<li><b>${o.ad}</b>: ${f1(o.nt)} net, yaklaşık <b>${f2(o.kayip)} puan</b> kaybediyorsun.
        ${yorum(o)}</li>`).join("")}</ol>
      ${son.konular ? `<p><b>Son denemedeki eksik konular:</b> ${esc(son.konular)}</p>` : ""}
    </div>
    <div class="card">
      <h3>Hedef puan</h3>
      <div class="hedef">
        <label>Hedef puanın<input type="number" id="hedefP" min="200" max="500" step="0.5" value="${hedef || ""}" placeholder="Örn. 460"></label>
        <label>Hedef okulun<input id="hedefO" value="${esc(AYAR.okul || "")}" placeholder="Örn. X Fen Lisesi"></label>
        <button class="btn sm" id="hedefKaydet">Kaydet</button>
      </div>
      ${hedefHtml || `<p class="muted">Hedef puanını yazarsan ne kadar net artırman gerektiğini hesaplarım.</p>`}
    </div>
  </div>

  <div class="card">
    <h3>Ders bazında gelişim</h3>
    <div class="chart">${dersGrafik(DENEMELER)}</div>
  </div>

  ${tekrarKarti()}

  <div class="card">
    <div class="row" style="justify-content:space-between"><h3 style="margin:0">Yapay zekâ koç yorumu</h3>
      <button class="btn sm" id="koc">${ic("spark")}Analiz et ve çalışma planı çıkar</button></div>
    <div class="aiCevap bubble" id="kocCevap" hidden></div>
  </div>

  <div class="card liste">
    <h3>Denemelerim</h3>
    <div class="tablo"><table>
      <thead><tr><th>Tarih</th><th>Deneme</th>${DERSLER.map((D) => `<th title="${D.ad}">${D.ad.split(" ")[0].slice(0, 4)}</th>`).join("")}<th>Net</th><th>Puan</th><th></th></tr></thead>
      <tbody>${[...DENEMELER].reverse().map((d) => `<tr>
        <td>${esc(tarihYaz(d.tarih))}</td><td>${esc(d.ad)}${d.yayin ? `<br><small>${esc(d.yayin)}</small>` : ""}</td>
        ${DERSLER.map((D) => `<td>${f1(net(d.dersler[D.k]?.d, d.dersler[D.k]?.y))}</td>`).join("")}
        <td><b>${f1(d.net)}</b></td><td><b>${f2(d.puan)}</b></td>
        <td style="white-space:nowrap"><button class="btn ghost sm" data-koc="${esc(d.id)}" title="Koç kontrolü">${ic("target")}${d.kontrol ? `${d.kontrol.filter((k) => k.durum === "anladi").length}/${d.kontrol.length}` : ""}</button> <button class="btn danger" data-sil="${esc(d.id)}" title="Sil">${ic("x")}</button></td></tr>`).join("")}</tbody>
    </table></div>
  </div>`;

  $("#hedefKaydet").onclick = async () => {
    AYAR = { ...AYAR, hedef: +$("#hedefP").value || 0, okul: $("#hedefO").value.trim() };
    try { await store.ayarYaz(AYAR); toast("Hedef kaydedildi"); } catch (e) { toast("Kaydedilemedi"); }
    analizCiz();
  };
  $$("[data-sil]").forEach((b) => (b.onclick = async () => {
    if (!confirm("Bu deneme silinsin mi?")) return;
    try { await store.sil(b.dataset.sil); DENEMELER = DENEMELER.filter((d) => d.id !== b.dataset.sil); analizCiz(); }
    catch (e) { toast("Silinemedi"); }
  }));
  $("#koc").onclick = kocYorumu;
  $$("[data-koc]").forEach((b) => (b.onclick = () => kocAc(b.dataset.koc)));
}
function yorum(o) {
  if (o.yanlis >= 3 && o.yanlis > o.bos) return `<br><small>Ortalama ${f1(o.yanlis)} yanlışın var: emin olmadığın soruda işaretlemeden önce şıkları ele. Her 3 yanlış 1 doğruyu götürüyor.</small>`;
  if (o.bos >= 3) return `<br><small>Ortalama ${f1(o.bos)} boşun var: süre yönetimi ya da konu eksiği olabilir, boş kalan soruların konularını not al.</small>`;
  if (o.oran >= 0.9) return `<br><small>Çok iyi gidiyor; kalan puanlar dikkat hatalarında olabilir.</small>`;
  return "";
}
function tarihYaz(t) { if (!t) return ""; const [y, m, g] = t.split("-"); return `${g}.${m}.${y}`; }

function cizgiGrafik(liste, hedef) {
  const W = 600, H = 240, P = { l: 40, r: 14, t: 14, b: 30 };
  const vals = liste.map((d) => d.puan);
  let min = Math.min(...vals, hedef || Infinity), max = Math.max(...vals, hedef || -Infinity);
  min = Math.max(100, Math.floor((min - 15) / 25) * 25); max = Math.min(500, Math.ceil((max + 15) / 25) * 25);
  if (max - min < 50) { max = Math.min(500, min + 50); }
  const x = (i) => P.l + (liste.length === 1 ? (W - P.l - P.r) / 2 : (i * (W - P.l - P.r)) / (liste.length - 1));
  const y = (v) => P.t + ((max - v) * (H - P.t - P.b)) / (max - min);
  const adim = (max - min) / 4;
  let g = "";
  for (let i = 0; i <= 4; i++) { const v = min + adim * i; g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${P.l - 6}" y="${y(v) + 4}" text-anchor="end">${Math.round(v)}</text>`; }
  if (hedef) g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(hedef)}" y2="${y(hedef)}" stroke="var(--warn)" stroke-dasharray="5 4" stroke-width="1.5"/><text x="${W - P.r}" y="${y(hedef) - 5}" text-anchor="end" style="fill:var(--warn)">Hedef ${hedef}</text>`;
  const yol = liste.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.puan)}`).join(" ");
  const etiketAdim = Math.ceil(liste.length / 8);
  const nok = liste.map((d, i) => `<circle cx="${x(i)}" cy="${y(d.puan)}" r="4.5" fill="var(--card)" stroke="var(--pri)" stroke-width="2.5"><title>${esc(d.ad)}: ${f2(d.puan)}</title></circle>
    ${i % etiketAdim === 0 || i === liste.length - 1 ? `<text x="${x(i)}" y="${H - 10}" text-anchor="middle">${esc(tarihYaz(d.tarih).slice(0, 5))}</text>` : ""}`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Puan grafiği">${g}<path d="${yol}" fill="none" stroke="var(--pri)" stroke-width="2.5" stroke-linejoin="round"/>${nok}</svg>`;
}
function dersGrafik(liste) {
  const W = 1000, H = 300, P = { l: 40, r: 14, t: 10, b: 14 };
  const x = (i) => P.l + (liste.length === 1 ? (W - P.l - P.r) / 2 : (i * (W - P.l - P.r)) / (liste.length - 1));
  const y = (o) => P.t + (1 - o) * (H - P.t - P.b); // başarı oranı 0..1
  let g = "";
  for (const v of [0, 0.25, 0.5, 0.75, 1]) g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${P.l - 6}" y="${y(v) + 4}" text-anchor="end">%${v * 100}</text>`;
  const cizgiler = DERSLER.map((D) => {
    const yol = liste.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(net(d.dersler[D.k]?.d, d.dersler[D.k]?.y) / D.n)}`).join(" ");
    return `<path d="${yol}" fill="none" stroke="var(${D.renk})" stroke-width="2"/>` +
      liste.map((d, i) => `<circle cx="${x(i)}" cy="${y(net(d.dersler[D.k]?.d, d.dersler[D.k]?.y) / D.n)}" r="3" fill="var(${D.renk})"><title>${D.ad}: ${f1(net(d.dersler[D.k]?.d, d.dersler[D.k]?.y))} net</title></circle>`).join("");
  }).join("");
  const lejant = DERSLER.map((D, i) => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px;font-size:13px"><i style="width:12px;height:4px;border-radius:2px;background:var(${D.renk})"></i>${D.ad}</span>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ders başarı oranları">${g}${cizgiler}</svg><div>${lejant}</div>`;
}

async function kocYorumu() {
  if (!aiHazirMi()) return;
  const kutu = $("#kocCevap"); kutu.hidden = false;
  kutu.innerHTML = `<span class="typing"><i></i><i></i><i></i></span>`;
  const ozet = DENEMELER.slice(-8).map((d) => `${d.tarih} ${d.ad}: ` + DERSLER.map((D) => `${D.ad} ${d.dersler[D.k]?.d || 0}D ${d.dersler[D.k]?.y || 0}Y`).join(", ") + ` | net ${d.net}, puan ${d.puan}` + (d.konular ? ` | eksik konular: ${d.konular}` : "")).join("\n");
  const istem = `Öğrencinin LGS deneme sonuçları (eskiden yeniye):\n${ozet}\n${AYAR.hedef ? `Hedef puan: ${AYAR.hedef}${AYAR.okul ? ` (${AYAR.okul})` : ""}` : ""}
Katsayılar: Türkçe 3,67 · Matematik 4,95 · Fen 4,07 · İnkılap 1,67 · Din 1,90 · İngilizce 1,51 puan/net.
Bu verilere göre kısa ve somut bir analiz yaz:
### Genel durum (2-3 cümle, gidişat)
### Güçlü yanların
### En çok puan kazandıracak 3 şey (ders + konu + ne yapmalı)
### Bu haftanın çalışma planı (7 gün, her gün 1 satır)
Motive edici ama gerçekçi ol. Verilmeyen bilgiyi uydurma.`;
  try {
    const r = await modelIle((m) => m.generateContentStream(istem));
    let t = "";
    for await (const c of r.stream) { t += c.text(); kutu.innerHTML = md(t); }
  } catch (e) { kutu.textContent = aiHata(e); }
}

/* ------------------------------------------------------------------ */
/* Koç kontrolü: yanlış soruları tekrar çözdür, anlat, anladı mı test et */
/* ------------------------------------------------------------------ */
function durumEtiket(dogru) {
  if (dogru == null) return `<span class="durum bos">Boş</span>`;
  return dogru ? `<span class="durum ok">${ic("check")}Doğru</span>` : `<span class="durum no">${ic("x")}Yanlış</span>`;
}
const DURUM_AD = { anladi: "Anladı", kismen: "Kısmen", tekrar: "Tekrar et" };
function tekrarKarti() {
  // Her konunun en son koç kontrolündeki durumu
  const son = new Map();
  for (const d of DENEMELER) for (const k of d.kontrol || []) son.set(`${k.ders}|${k.konu}`, { ...k, deneme: d.ad });
  const liste = [...son.values()];
  if (!liste.length) return "";
  const eksik = liste.filter((k) => k.durum !== "anladi");
  const tamam = liste.filter((k) => k.durum === "anladi");
  return `<div class="card">
    <h3>Koç kontrolü sonuçları</h3>
    <p class="muted">Yanlış yaptığın sorulardan sonra yapılan "anladın mı?" kontrollerine göre.</p>
    ${eksik.length ? `<p><b>Tekrar etmen gereken konular</b></p><div>${eksik.map((k) => `<span class="etiket no">${ic("refresh")}${esc(k.ders)}: ${esc(k.konu)}${k.durum === "kismen" ? " (kısmen)" : ""}</span>`).join("")}</div>` : `<p class="up"><b>Kontrol ettiğin tüm konuları anlamışsın.</b></p>`}
    ${tamam.length ? `<p><b>Anladığın konular</b></p><div>${tamam.map((k) => `<span class="etiket ok">${ic("check")}${esc(k.ders)}: ${esc(k.konu)}</span>`).join("")}</div>` : ""}
    ${eksik.length ? `<div class="btnRow"><button class="btn sm" id="tekrarSor">${ic("message")}Bu konuları bana tekrar anlat</button></div>` : ""}
  </div>`;
}
document.addEventListener("click", (e) => {
  if (e.target.closest("#tekrarSor")) {
    const konular = $$("#analizIcerik .etiket.no").map((x) => x.textContent.trim()).join(", ");
    sohbeteGonder(`Koç kontrolünde şu konuları tam anlamadığım çıktı: ${konular}. Her birini kısaca, örnekle anlat ve sonunda bana bir soru sor.`);
  }
});
function sohbeteGonder(metin) {
  sekme("sor");
  $("#cText").value = metin;
  $("#cForm").requestSubmit();
}

let kGorseller = [];
function kocSecenekleri(secili) {
  const s = $("#kDeneme"); const onceki = secili || s.value;
  s.innerHTML = DENEMELER.length
    ? [...DENEMELER].reverse().map((d) => `<option value="${esc(d.id)}">${esc(tarihYaz(d.tarih))} · ${esc(d.ad)} · ${f2(d.puan)} puan</option>`).join("")
    : `<option value="">Önce bir deneme ekle</option>`;
  if (onceki && DENEMELER.some((d) => d.id === onceki)) s.value = onceki;
}
function kocAc(id) {
  kocSecenekleri(id);
  $("#kAlan").innerHTML = "";
  $("#kocGiris").hidden = false;
  sekme("koc");
  toast("Yanlış ve boş bıraktığın soruların fotoğraflarını ekle.");
}
function kBtnDurum() {
  $("#kBasla").disabled = !kGorseller.length || !$("#kDeneme").value;
  $("#kSayac").textContent = kGorseller.length ? `${kGorseller.length} fotoğraf eklendi (en fazla 10).` : "En fazla 10 fotoğraf. Bir fotoğrafta birden fazla soru olabilir.";
}
$("#kFoto").onchange = async (e) => {
  for (const f of [...e.target.files].slice(0, 10 - kGorseller.length)) { try { kGorseller.push(await gorselHazirla(f)); } catch {} }
  e.target.value = "";
  thumbCiz($("#kThumbs"), kGorseller, kBtnDurum);
};
$("#kDeneme").onchange = kBtnDurum;

$("#kBasla").onclick = async () => {
  if (!aiHazirMi()) return;
  const d = DENEMELER.find((x) => x.id === $("#kDeneme").value);
  if (!d || !kGorseller.length) return;
  const kSayi = +$("#kSayi").value;
  const alan = $("#kAlan");
  $("#kBasla").disabled = true;
  alan.innerHTML = `<div class="card"><span class="typing"><i></i><i></i><i></i></span> Koç soruları inceliyor, çözümleri ve kontrol sorularını hazırlıyor…</div>`;
  const ozet = DERSLER.map((D) => `${D.ad} ${d.dersler[D.k]?.d || 0}D ${d.dersler[D.k]?.y || 0}Y`).join(", ");
  const istem = `Öğrencinin "${d.ad}" denemesi: ${ozet}. ${d.konular ? `Öğrencinin not ettiği eksik konular: ${d.konular}.` : ""}
Fotoğraflarda öğrencinin bu denemede YANLIŞ yaptığı ya da BOŞ bıraktığı sorular var. Fotoğraflardaki her soruyu ayrı ayrı ele al (en fazla 10 soru).
Her soru için:
- Soruyu oku, dersini, konusunu ve ölçtüğü kazanımı belirle.
- Sorunun metnini (uzunsa özetleyerek) ve şıklarını yaz. Şıklar okunmuyorsa "secenekler" boş dizi olsun.
- Soruyu dikkatlice çöz, doğru şıkkı bul ve 8. sınıf öğrencisinin anlayacağı adım adım bir çözüm yaz.
- Öğrencilerin bu soruda en sık yaptığı hatayı bir cümleyle yaz.
- Aynı kazanımı ölçen, fotoğraftakinden FARKLI ${kSayi} yeni çoktan seçmeli kontrol sorusu hazırla. Öğrenci konuyu gerçekten anladıysa çözebilmeli, ezberle çözülememeli. Cevaplarını kendin kontrol et.
Yalnızca şu JSON'u döndür:
{"sorular":[{"ders":"Matematik","konu":"Üslü İfadeler","kazanim":"kısa kazanım","soru":"soru metni","secenekler":["...","...","...","..."],"dogru":0,"cozum":"adım adım çözüm","sikHata":"sık yapılan hata","kontrol":[{"soru":"...","secenekler":["...","...","...","..."],"dogru":0,"aciklama":"kısa çözüm"}]}]}
"dogru" değerleri 0-3 arası şık sırasıdır. Şıkların başına harf yazma. Emoji kullanma.`;
  try {
    const r = await modelIle((m) => m.generateContent([istem, ...kGorseller.map((g) => g.part)]), { generationConfig: { responseMimeType: "application/json", temperature: 0.4 } });
    const j = jsonAyikla(r.response.text());
    if (!j.sorular?.length) throw new Error("Fotoğraflarda soru bulunamadı. Daha net bir fotoğraf dener misin?");
    kocOturum(d, j.sorular.slice(0, 10));
  } catch (e) { alan.innerHTML = `<div class="card err">${esc(aiHata(e))}</div>`; }
  $("#kBasla").disabled = false;
};

function kocOturum(deneme, sorular) {
  const alan = $("#kAlan");
  $("#kocGiris").hidden = true;
  const sonuc = sorular.map(() => ({ ilk: undefined, kontrol: [] }));
  let i = 0, asama = "coz", k = 0;
  const toplamAdim = sorular.reduce((a, q) => a + 2 + (q.kontrol?.length || 0), 0);
  let yapilan = 0;

  const secenekHtml = (q) => (q.secenekler || []).map((s, n) => `<button class="opt" data-k="${n}"><b>${"ABCD"[n]})</b> ${esc(s)}</button>`).join("");
  const isaretle = (kutu, secim, dogru) => $$(".opt", kutu).forEach((o) => {
    const n = +o.dataset.k; o.disabled = true;
    o.classList.toggle("dogru", n === dogru); o.classList.toggle("yanlis", n === secim && n !== dogru);
  });

  function ciz() {
    const q = sorular[i];
    const bas = `<div class="card">
      <div class="row" style="justify-content:space-between;margin:0"><b>Soru ${i + 1} / ${sorular.length}</b><span class="muted">${esc(q.ders || "")} · ${esc(q.konu || "")}</span></div>
      <div class="ilerleme"><i style="width:${(yapilan / toplamAdim) * 100}%"></i></div>`;
    if (asama === "coz") {
      const sikVar = (q.secenekler || []).length === 4;
      alan.innerHTML = `${bas}
        <div class="adim">1. adım · Önce kendin tekrar çöz</div>
        <div class="metin" style="white-space:pre-wrap;font-weight:600;margin-bottom:10px">${esc(q.soru)}</div>
        ${sikVar ? secenekHtml(q) : `<p class="muted">Şıkları okuyamadım; soruyu kâğıdında tekrar çözmeyi dene.</p>`}
        <div class="btnRow">
          ${sikVar ? "" : `<button class="btn" id="kCozdum">Çözdüm, çözümü göster</button>`}
          <button class="btn ghost" id="kBilmiyorum">Bilmiyorum, çözümü göster</button>
          <button class="btn ghost" id="kTahta">${ic("pen")}Tahtada çöz</button>
        </div></div>`;
      $$(".opt", alan).forEach((o) => (o.onclick = () => {
        const secim = +o.dataset.k; sonuc[i].ilk = secim === q.dogru;
        isaretle(alan, secim, q.dogru);
        setTimeout(() => { asama = "cozum"; yapilan++; ciz(); }, 700);
      }));
      $("#kBilmiyorum").onclick = () => { sonuc[i].ilk = null; asama = "cozum"; yapilan++; ciz(); };
      if ($("#kCozdum")) $("#kCozdum").onclick = () => { sonuc[i].ilk = null; asama = "cozum"; yapilan++; ciz(); };
      $("#kTahta").onclick = () => { wb.metinYaz(q.soru + "\n" + (q.secenekler || []).map((s, n) => `${"ABCD"[n]}) ${s}`).join("   ")); sekme("tahta"); };
    } else if (asama === "cozum") {
      const ilk = sonuc[i].ilk;
      alan.innerHTML = `${bas}
        <div class="adim">2. adım · Çözüm</div>
        <p>${ilk === true ? `<span class="durum ok">${ic("check")}Bu sefer doğru çözdün.</span> Yine de çözümü bir oku, sonra kontrol sorusuna geçelim.` : ilk === false ? `<span class="durum no">${ic("x")}Yine yanlış.</span> Sorun değil, birlikte bakalım.` : "Birlikte bakalım."}</p>
        ${(q.secenekler || []).length ? `<p><b>Doğru cevap: ${"ABCD"[q.dogru]}</b></p>` : ""}
        <div class="aciklama">${md(q.cozum || "")}</div>
        ${q.sikHata ? `<p><b>Sık yapılan hata:</b> ${esc(q.sikHata)}</p>` : ""}
        <div class="btnRow">
          <button class="btn" id="kTest">${ic("target")}Anladım, beni test et</button>
          <button class="btn ghost" id="kAnlat">${ic("message")}Anlamadım, Soru Sor'da tekrar anlat</button>
        </div></div>`;
      $("#kTest").onclick = () => { asama = q.kontrol?.length ? "kontrol" : "sonraki"; k = 0; yapilan++; ilerle(); };
      $("#kAnlat").onclick = () => sohbeteGonder(`Denememdeki şu soruyu anlamadım (${q.ders}, ${q.konu}):\n${q.soru}\n${(q.secenekler || []).map((s, n) => `${"ABCD"[n]}) ${s}`).join("\n")}\nDoğru cevap ${"ABCD"[q.dogru] || "?"}. Çözümü daha basit, adım adım anlatır mısın? Anlattıktan sonra anladığımı kontrol etmek için bana bir soru sor.`);
    } else if (asama === "kontrol") {
      const c = q.kontrol[k];
      alan.innerHTML = `${bas}
        <div class="adim">3. adım · Anladın mı? Kontrol sorusu ${k + 1} / ${q.kontrol.length}</div>
        <div class="metin" style="white-space:pre-wrap;font-weight:600;margin-bottom:10px">${esc(c.soru)}</div>
        ${secenekHtml(c)}
        <div id="kGeri"></div></div>`;
      $$(".opt", alan).forEach((o) => (o.onclick = () => {
        const secim = +o.dataset.k, dogru = secim === c.dogru;
        sonuc[i].kontrol[k] = dogru;
        isaretle(alan, secim, c.dogru);
        $("#kGeri").innerHTML = `<div class="aciklama">${durumEtiket(dogru)} ${dogru ? "Anlamışsın." : `Doğru cevap ${"ABCD"[c.dogru]}.`}<br>${md(c.aciklama || "")}</div>
          <div class="btnRow"><button class="btn" id="kDevam">Devam${ic("arrow")}</button></div>`;
        $("#kDevam").onclick = () => { k++; yapilan++; if (k >= q.kontrol.length) asama = "sonraki"; ilerle(); };
      }));
    }
  }
  function ilerle() {
    if (asama === "sonraki") { i++; asama = "coz"; k = 0; }
    if (i >= sorular.length) return rapor();
    ciz();
    alan.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function rapor() {
    const kayit = sorular.map((q, n) => {
      const kd = sonuc[n].kontrol.filter(Boolean).length, kn = q.kontrol?.length || 0;
      const durum = kn === 0 ? (sonuc[n].ilk ? "anladi" : "tekrar") : kd === kn ? "anladi" : kd > 0 ? "kismen" : "tekrar";
      return { ders: q.ders || "", konu: q.konu || "", kazanim: q.kazanim || "", ilk: sonuc[n].ilk ?? null, kontrolD: kd, kontrolN: kn, durum };
    });
    const anladi = kayit.filter((x) => x.durum === "anladi").length;
    alan.innerHTML = `<div class="card">
      <h2>Koç raporu · ${esc(deneme.ad)}</h2>
      <p>${sorular.length} sorudan <b>${anladi}</b> tanesinin konusunu anlamışsın.${anladi < sorular.length ? " Kalanları bu hafta tekrar etmeni öneririm." : " Harika iş."}</p>
      <div class="tablo kocRapor"><table>
        <thead><tr><th>Ders · Konu</th><th>Tekrar çözüm</th><th>Kontrol</th><th>Durum</th></tr></thead>
        <tbody>${kayit.map((x) => `<tr><td>${esc(x.ders)} · ${esc(x.konu)}${x.kazanim ? `<br><small>${esc(x.kazanim)}</small>` : ""}</td>
          <td>${x.ilk === true ? durumEtiket(true) : x.ilk === false ? durumEtiket(false) : `<span class="durum bos">Bilmiyorum</span>`}</td>
          <td>${x.kontrolN ? `${x.kontrolD}/${x.kontrolN}` : "-"}</td>
          <td><span class="etiket ${x.durum === "anladi" ? "ok" : "no"}">${DURUM_AD[x.durum]}</span></td></tr>`).join("")}</tbody>
      </table></div>
      <div class="btnRow">
        ${anladi < sorular.length ? `<button class="btn" id="kEksik">${ic("message")}Anlamadıklarımı tekrar anlat</button>` : ""}
        <button class="btn ghost" id="kYeni">${ic("plus")}Yeni kontrol</button>
        <button class="btn ghost" id="kAnaliz">${ic("chart")}Analize dön</button>
      </div></div>`;
    try {
      await store.guncelle(deneme.id, { kontrol: kayit, kontrolTarih: Date.now() });
      deneme.kontrol = kayit; analizCiz();
      toast("Koç raporu denemene kaydedildi.");
    } catch (e) { toast("Rapor kaydedilemedi: " + (e.code || e.message)); }
    if ($("#kEksik")) $("#kEksik").onclick = () => sohbeteGonder(`Denememin koç kontrolünde şu konuları anlamadığım çıktı: ${kayit.filter((x) => x.durum !== "anladi").map((x) => `${x.ders} - ${x.konu}`).join(", ")}. Her birini kısaca, örnekle anlat ve her birinden sonra anladığımı kontrol etmek için bana bir soru sor.`);
    $("#kYeni").onclick = () => { kGorseller = []; thumbCiz($("#kThumbs"), kGorseller, kBtnDurum); alan.innerHTML = ""; $("#kocGiris").hidden = false; };
    $("#kAnaliz").onclick = () => sekme("analiz");
  }
  ciz();
}

/* ------------------------------------------------------------------ */
/* Fotoğraftan soru (quiz)                                             */
/* ------------------------------------------------------------------ */
let fGorseller = [];
function thumbCiz(alan, dizi, yenile) {
  alan.innerHTML = dizi.map((g, i) => `<div class="t"><img src="${g.dataUrl}" alt=""><button class="x" data-i="${i}" title="Kaldır">${ic("x")}</button></div>`).join("");
  $$(".x", alan).forEach((b) => (b.onclick = () => { dizi.splice(+b.dataset.i, 1); thumbCiz(alan, dizi, yenile); yenile?.(); }));
  yenile?.();
}
$("#fFoto").onchange = async (e) => {
  for (const f of [...e.target.files].slice(0, 6 - fGorseller.length)) { try { fGorseller.push(await gorselHazirla(f)); } catch {} }
  e.target.value = "";
  thumbCiz($("#fThumbs"), fGorseller, () => ($("#fBasla").disabled = !fGorseller.length));
};
$("#fBasla").onclick = async () => {
  if (!aiHazirMi() || !fGorseller.length) return;
  const sayi = +$("#fSayi").value, zor = $("#fZor").value;
  const alan = $("#fQuiz");
  alan.innerHTML = `<div class="card"><span class="typing"><i></i><i></i><i></i></span> Fotoğrafları inceleyip ${sayi} soru hazırlıyorum…</div>`;
  $("#fBasla").disabled = true;
  const istem = `Fotoğraf(lar)daki soruları ya da konu anlatımını incele. Hangi ders ve konular olduğunu belirle.
Bu konularda, fotoğraftakilerle AYNI OLMAYAN, LGS tarzında ${sayi} yeni çoktan seçmeli soru hazırla. Zorluk: ${zor}.
Her sorunun 4 şıkkı (A, B, C, D) ve tek doğru cevabı olsun. Cevabın kesin doğru olduğundan emin ol; çözümü kendin kontrol et.
Yalnızca şu JSON'u döndür:
{"konu":"tespit ettiğin ders ve konular","sorular":[{"ders":"Matematik","konu":"Üslü İfadeler","soru":"soru metni","secenekler":["A şıkkı","B şıkkı","C şıkkı","D şıkkı"],"dogru":0,"aciklama":"kısa adım adım çözüm"}]}
"dogru" doğru şıkkın 0-3 arası sırasıdır. Şıkların başına harf yazma.`;
  try {
    const r = await modelIle((m) => m.generateContent([istem, ...fGorseller.map((g) => g.part)]), { generationConfig: { responseMimeType: "application/json", temperature: 0.6 } });
    const j = jsonAyikla(r.response.text());
    if (!j.sorular?.length) throw new Error("Soru üretilemedi");
    quizCiz(j);
  } catch (e) { alan.innerHTML = `<div class="card err">${esc(aiHata(e))}</div>`; }
  $("#fBasla").disabled = false;
};
function quizCiz(j) {
  const alan = $("#fQuiz");
  const cevap = new Array(j.sorular.length).fill(null);
  alan.innerHTML = `<div class="card"><b>Tespit edilen konu:</b> ${esc(j.konu || "")}</div>` +
    j.sorular.map((q, i) => `<div class="q" data-i="${i}">
      <div class="meta">${i + 1}. soru · ${esc(q.ders || "")} · ${esc(q.konu || "")}</div>
      <div class="metin">${esc(q.soru)}</div>
      ${(q.secenekler || []).map((s, k) => `<button class="opt" data-k="${k}"><b>${"ABCD"[k]})</b> ${esc(s)}</button>`).join("")}
      <div class="aciklama" hidden></div>
      <button class="btn ghost sm tahtaya" style="margin-top:6px">${ic("pen")}Tahtada çöz</button>
    </div>`).join("") +
    `<div class="card row" style="justify-content:space-between"><span class="muted">Tüm soruları işaretleyince bitir.</span><button class="btn" id="fBitir">Bitir ve kontrol et</button></div>
     <div id="fSonuc"></div>`;
  $$(".q", alan).forEach((qe) => {
    const i = +qe.dataset.i;
    $$(".opt", qe).forEach((o) => (o.onclick = () => {
      if (qe.classList.contains("bitti")) return;
      cevap[i] = +o.dataset.k;
      $$(".opt", qe).forEach((x) => x.classList.toggle("sec", x === o));
    }));
    $(".tahtaya", qe).onclick = () => { wb.metinYaz(`${i + 1}) ${j.sorular[i].soru}\n` + j.sorular[i].secenekler.map((s, k) => `${"ABCD"[k]}) ${s}`).join("   ")); sekme("tahta"); };
  });
  $("#fBitir").onclick = () => {
    let d = 0, y = 0, b = 0;
    $$(".q", alan).forEach((qe) => {
      const i = +qe.dataset.i, q = j.sorular[i];
      qe.classList.add("bitti");
      $$(".opt", qe).forEach((o) => { const k = +o.dataset.k; o.classList.toggle("dogru", k === q.dogru); o.classList.toggle("yanlis", k === cevap[i] && k !== q.dogru); });
      if (cevap[i] == null) b++; else if (cevap[i] === q.dogru) d++; else y++;
      const a = $(".aciklama", qe); a.hidden = false;
      a.innerHTML = `${durumEtiket(cevap[i] == null ? null : cevap[i] === q.dogru)} · Doğru cevap: ${"ABCD"[q.dogru]}<br>${md(q.aciklama || "")}`;
    });
    $("#fBitir").disabled = true;
    $("#fSonuc").innerHTML = `<div class="card sonuc"><small>Sonuç</small><br><b>${d} D · ${y} Y · ${b} B</b><br><span class="muted">Net: ${f1(net(d, y))} / ${j.sorular.length}</span><br><br>
      <button class="btn" id="fTekrar">${ic("refresh")}Aynı konudan yeni sorular</button></div>`;
    $("#fTekrar").onclick = () => $("#fBasla").click();
    $("#fSonuc").scrollIntoView({ behavior: "smooth" });
  };
}

/* ------------------------------------------------------------------ */
/* Soru Sor (sohbet)                                                   */
/* ------------------------------------------------------------------ */
let sohbet = null;
let cGorseller = [];
const cMsgs = $("#cMsgs");
function mesaj(kim, html) {
  const d = document.createElement("div");
  d.className = "msg " + kim;
  d.innerHTML = `<div class="bubble">${html}</div>`;
  cMsgs.appendChild(d);
  cMsgs.scrollTop = cMsgs.scrollHeight;
  return d.firstChild;
}
$("#cFoto").onchange = async (e) => {
  for (const f of [...e.target.files].slice(0, 4 - cGorseller.length)) { try { cGorseller.push(await gorselHazirla(f)); } catch {} }
  e.target.value = "";
  thumbCiz($("#cThumbs"), cGorseller);
};
$("#cText").addEventListener("input", (e) => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; });
$("#cText").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#cForm").requestSubmit(); } });
$("#cYeni").onclick = () => { sohbet = null; cGorseller = []; thumbCiz($("#cThumbs"), cGorseller); cMsgs.innerHTML = ""; mesaj("bot", "Yeni sohbet başladı. Sorunu gönder."); };
$$("#cHizli button").forEach((b) => (b.onclick = () => { $("#cText").value = b.dataset.q; $("#cForm").requestSubmit(); }));
let gonderiliyor = false;
$("#cForm").onsubmit = async (e) => {
  e.preventDefault();
  const metin = $("#cText").value.trim();
  if ((!metin && !cGorseller.length) || gonderiliyor) return;
  if (!aiHazirMi()) return;
  gonderiliyor = true; $("#cGonder").disabled = true;
  const gorseller = cGorseller.splice(0); thumbCiz($("#cThumbs"), cGorseller);
  $("#cText").value = ""; $("#cText").style.height = "auto";
  mesaj("me", gorseller.map((g) => `<img src="${g.dataUrl}" alt="">`).join("") + (metin ? esc(metin).replace(/\n/g, "<br>") : ""));
  const kutu = mesaj("bot", `<span class="typing"><i></i><i></i><i></i></span>`);
  const parcalar = [...gorseller.map((g) => g.part), { text: metin || "Bu soruyu adım adım çöz." }];
  try {
    let t = "";
    await modelIle(async (m) => {
      if (!sohbet || sohbet._model !== m.model) { sohbet = m.startChat(); sohbet._model = m.model; }
      const r = await sohbet.sendMessageStream(parcalar);
      for await (const c of r.stream) { t += c.text(); kutu.innerHTML = md(t); cMsgs.scrollTop = cMsgs.scrollHeight; }
    });
    if (!t) kutu.textContent = "Cevap üretilemedi, tekrar dener misin?";
  } catch (er) { kutu.textContent = aiHata(er); sohbet = null; }
  gonderiliyor = false; $("#cGonder").disabled = false;
};

/* ------------------------------------------------------------------ */
/* Tahta                                                               */
/* ------------------------------------------------------------------ */
const wb = (() => {
  const cv = $("#wb"), wrap = $("#wbWrap"), ctx = cv.getContext("2d");
  const RENKLER = ["#1d2033", "#2563eb", "#dc2626", "#16a34a", "#d97706", "#9333ea"];
  let arac = "pen", renk = RENKLER[0], kalin = 4, zemin = "kare";
  let ciz = [], geri = [], aktif = null, arka = null; // arka: yüklenen görsel
  let W = 0, H = 0;

  $("#wbColors").innerHTML = RENKLER.map((c, i) => `<button data-c="${c}" style="background:${c}" class="${i ? "" : "on"}" title="Renk"></button>`).join("");
  $$("#wbColors button").forEach((b) => (b.onclick = () => { renk = b.dataset.c; $$("#wbColors button").forEach((x) => x.classList.toggle("on", x === b)); if (arac === "eraser") aracSec("pen"); }));
  function aracSec(a) { arac = a; $$("#wbTools [data-tool]").forEach((b) => b.classList.toggle("on", b.dataset.tool === a)); }
  $$("#wbTools [data-tool]").forEach((b) => (b.onclick = () => aracSec(b.dataset.tool)));
  $("#wbSize").onchange = (e) => (kalin = +e.target.value);
  $("#wbBg").onchange = (e) => { zemin = e.target.value; yeniden(); };
  $("#wbUndo").onclick = () => { if (ciz.length) { geri.push(ciz.pop()); yeniden(); } };
  $("#wbRedo").onclick = () => { if (geri.length) { ciz.push(geri.pop()); yeniden(); } };
  $("#wbClear").onclick = () => { if ((ciz.length || arka) && confirm("Tahta temizlensin mi?")) { ciz = []; geri = []; arka = null; yeniden(); } };
  document.addEventListener("keydown", (e) => {
    if (!$("#t-tahta").classList.contains("on") || !(e.ctrlKey || e.metaKey)) return;
    if (e.key.toLowerCase() === "z") { e.preventDefault(); (e.shiftKey ? $("#wbRedo") : $("#wbUndo")).click(); }
    if (e.key.toLowerCase() === "y") { e.preventDefault(); $("#wbRedo").click(); }
  });
  $("#wbImg").onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    const { dataUrl } = await gorselHazirla(f, 1800);
    const img = new Image(); img.onload = () => { arka = img; yeniden(); }; img.src = dataUrl;
  };

  function boyutla() {
    const r = wrap.getBoundingClientRect(); if (!r.width) return;
    const dpr = window.devicePixelRatio || 1;
    W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    yeniden();
  }
  new ResizeObserver(boyutla).observe(wrap);

  const koyu = () => matchMedia("(prefers-color-scheme: dark)").matches && document.documentElement.dataset.theme !== "light";
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function zeminCiz(c = ctx, w = W, h = H, beyaz = false) {
    c.fillStyle = beyaz ? "#ffffff" : css("--board"); c.fillRect(0, 0, w, h);
    if (arka) {
      const k = Math.min((w * 0.9) / arka.width, (h * 0.6) / arka.height, 1);
      c.drawImage(arka, (w - arka.width * k) / 2, 12, arka.width * k, arka.height * k);
    }
    if (zemin === "duz") return;
    c.strokeStyle = beyaz ? "#e7eaf3" : css("--grid"); c.lineWidth = 1; c.beginPath();
    const s = 28;
    for (let y = s; y < h; y += s) { c.moveTo(0, y + 0.5); c.lineTo(w, y + 0.5); }
    if (zemin === "kare") for (let x = s; x < w; x += s) { c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, h); }
    c.stroke();
  }
  function cizgi(c, s, beyaz) {
    if (s.metin) {
      c.fillStyle = beyaz ? "#1d2033" : css("--ink"); c.font = "500 16px Inter, sans-serif";
      let y = s.y;
      for (const par of s.metin.split("\n")) {
        let satir = "";
        for (const kel of par.split(" ")) {
          const den = satir ? satir + " " + kel : kel;
          if (c.measureText(den).width > W - 40 && satir) { c.fillText(satir, 20, y); y += 22; satir = kel; } else satir = den;
        }
        c.fillText(satir, 20, y); y += 22;
      }
      return;
    }
    const p = s.p; if (!p.length) return;
    c.save();
    c.lineCap = "round"; c.lineJoin = "round"; c.lineWidth = s.w;
    if (s.t === "eraser") { c.globalCompositeOperation = "destination-out"; c.lineWidth = s.w * 5; c.strokeStyle = "#000"; }
    else if (s.t === "hl") { c.globalAlpha = 0.3; c.lineWidth = s.w * 4; c.strokeStyle = s.c; }
    else c.strokeStyle = !beyaz && s.c === RENKLER[0] && koyu() ? "#e8e9f2" : s.c;
    c.beginPath(); c.moveTo(p[0][0], p[0][1]);
    if (p.length === 1) c.lineTo(p[0][0] + 0.1, p[0][1]);
    for (let i = 1; i < p.length - 1; i++) { const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2; c.quadraticCurveTo(p[i][0], p[i][1], mx, my); }
    if (p.length > 1) c.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
    c.stroke(); c.restore();
  }
  // Silgi yalnızca mürekkebi silsin diye çizimler ayrı katmanda tutulur
  const kat = document.createElement("canvas"), kctx = kat.getContext("2d");
  function yeniden() {
    zeminCiz();
    const dpr = window.devicePixelRatio || 1;
    kat.width = W * dpr; kat.height = H * dpr; kctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const s of ciz) cizgi(kctx, s);
    if (aktif) cizgi(kctx, aktif);
    ctx.drawImage(kat, 0, 0, W, H);
  }
  const nokta = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener("pointerdown", (e) => { cv.setPointerCapture(e.pointerId); aktif = { t: arac, c: renk, w: kalin, p: [nokta(e)] }; yeniden(); });
  cv.addEventListener("pointermove", (e) => { if (!aktif) return; const ev = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; for (const x of ev) aktif.p.push(nokta(x)); yeniden(); });
  const bitir = () => { if (!aktif) return; ciz.push(aktif); geri = []; aktif = null; yeniden(); };
  cv.addEventListener("pointerup", bitir); cv.addEventListener("pointercancel", bitir);

  function png() {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
    zeminCiz(x, W, H, true);
    const k = document.createElement("canvas"); k.width = W; k.height = H; const kx = k.getContext("2d");
    for (const s of ciz) cizgi(kx, s, true);
    x.drawImage(k, 0, 0);
    return c.toDataURL("image/png");
  }
  function metinYaz(t) { ciz.push({ metin: t, y: 30 }); geri = []; setTimeout(boyutla, 0); }
  $("#wbSor").onclick = () => {
    if (!ciz.length && !arka) return toast("Tahta boş.");
    const dataUrl = png();
    cGorseller.push({ dataUrl, part: dataUrlPart(dataUrl) });
    thumbCiz($("#cThumbs"), cGorseller);
    if (!$("#cText").value) $("#cText").value = "Tahtaya yazdığım çözümü kontrol eder misin? Hatam varsa nerede olduğunu göster.";
    sekme("sor");
  };
  return { boyutla, metinYaz };
})();

/* ------------------------------------------------------------------ */
denemeFormu();
denemeGuncelle();
try { const s = localStorage.getItem("lgs-koc-sekme"); if (s && $(`#t-${s}`)) sekme(s); } catch {}
whoCiz();
firebaseBaslat().catch((e) => { banner("Firebase yüklenemedi: " + esc(e.message)); veriYukle(); });
if (!hazir) veriYukle();
