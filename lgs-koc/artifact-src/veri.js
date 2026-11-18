/* ------------------------------------------------------------------ */
/* Kayıt: claude.ai hesabına özel (db), yoksa bu tarayıcı              */
/* ------------------------------------------------------------------ */
let DB = null, UID = null, SAMPLE = null, MAXIMG = 0;
const LS = "lgs-koc-v1";
const lsOku = () => { try { return JSON.parse(localStorage.getItem(LS)) || { denemeler: [], ayar: {} }; } catch { return { denemeler: [], ayar: {} }; } };
const lsYaz = (v) => { try { localStorage.setItem(LS, JSON.stringify(v)); } catch {} };
const yeniId = () => "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const kayitYeri = () => DB.collection("data/users/" + UID);
const temiz = (o) => JSON.parse(JSON.stringify(o));

const store = {
  async ekle(d) {
    const x = { id: yeniId(), ...d };
    if (DB) { const { id, ...govde } = x; await kayitYeri().doc(id).set(temiz(govde)); }
    else { const v = lsOku(); v.denemeler.push(x); lsYaz(v); }
    return x;
  },
  async guncelle(id, patch) {
    if (DB) { await kayitYeri().doc(id).update(temiz(patch)); return; }
    const v = lsOku(); const x = v.denemeler.find((d) => d.id === id); if (x) Object.assign(x, patch); lsYaz(v);
  },
  async sil(id) {
    if (DB) { await kayitYeri().doc(id).delete(); return; }
    const v = lsOku(); v.denemeler = v.denemeler.filter((x) => x.id !== id); lsYaz(v);
  },
  async ayarYaz(a) {
    if (DB) { await kayitYeri().doc("ayar").set(temiz(a)); return; }
    const v = lsOku(); v.ayar = a; lsYaz(v);
  },
};

let DENEMELER = [];
let AYAR = {};
const sirala = () => DENEMELER.sort((a, b) => (a.tarih || "").localeCompare(b.tarih || "") || (a.olusturma || 0) - (b.olusturma || 0));
function durumYaz(t) { $("#who").innerHTML = `<span class="kayit">${t}</span>`; }

async function veriBaslat() {
  const yerel = lsOku();
  DENEMELER = yerel.denemeler || []; AYAR = yerel.ayar || {};
  sirala(); analizCiz();
  durumYaz("Bağlanıyor…");
  const use = (n) => (window.claude?.use ? window.claude.use(n).catch(() => null) : Promise.resolve(null));
  const [db, user, sample] = await Promise.all([use("db"), use("user"), use("sample")]);
  SAMPLE = sample;
  if (SAMPLE) {
    try { MAXIMG = (await SAMPLE.limits())?.images?.maxCount || 0; } catch { MAXIMG = 0; }
  } else {
    banner("Yapay zekâ özellikleri (soru çözme, koç, fotoğraftan soru) bu sayfa claude.ai içinde açıkken çalışır. Puan hesabı ve analiz her yerde çalışır.");
  }
  if (db && user) { try { UID = await user.id(); } catch { UID = null; } }
  if (!db || !UID) { durumYaz("Bu tarayıcıda saklanıyor"); return; }
  try {
    const snap = await Promise.race([
      db.collection("data/users/" + UID).get(),
      new Promise((_, r) => setTimeout(() => r({ code: "zaman" }), 10000)),
    ]);
    DB = db;
    const uzak = [], ayarDoc = snap.docs.find((d) => d.id === "ayar");
    for (const d of snap.docs) if (d.id !== "ayar") uzak.push({ id: d.id, ...d.data() });
    // Bu tarayıcıda kalmış denemeleri hesaba taşı
    const tasinacak = (yerel.denemeler || []).filter((x) => !uzak.some((u) => u.olusturma === x.olusturma && u.ad === x.ad));
    for (const x of tasinacak) { const { id, ...govde } = x; await kayitYeri().doc(id.startsWith("d") ? id : yeniId()).set(temiz(govde)); uzak.push(x); }
    if (!ayarDoc && yerel.ayar && Object.keys(yerel.ayar).length) await kayitYeri().doc("ayar").set(temiz(yerel.ayar));
    if (tasinacak.length) lsYaz({ denemeler: [], ayar: {} });
    DENEMELER = uzak; AYAR = ayarDoc ? { ...ayarDoc.data() } : (yerel.ayar || {});
    sirala(); analizCiz();
    durumYaz("Hesabına kaydediliyor");
  } catch (e) {
    DB = null;
    durumYaz("Bu tarayıcıda saklanıyor");
    if (e?.code === "zaman") toast("Kayıtlara ulaşılamadı; şimdilik bu tarayıcıya kaydediliyor.");
  }
}

/* ------------------------------------------------------------------ */
/* Yapay zekâ (Claude)                                                 */
/* ------------------------------------------------------------------ */
const SISTEM = `Sen Türkiye'de LGS'ye hazırlanan 8. sınıf öğrencilerine yardım eden sabırlı, samimi bir öğretmensin.
Her zaman Türkçe yaz. 8. sınıf (Maarif modeli) müfredatına ve LGS soru tarzına uy.
Soru çözerken: önce sorunun ne istediğini bir cümleyle söyle, sonra numaralı kısa adımlarla çöz, en sonda "Cevap: X" yaz.
Matematik ifadelerini LaTeX kullanmadan düz yaz (x², √2, 3/4, ×, ÷ gibi).
Görseldeki soru okunmuyorsa bunu söyle ve öğrenciden daha net bir fotoğraf iste. Emin olmadığın bir şeyi uydurma. Emoji kullanma.`;

function aiHazirMi() {
  if (!SAMPLE) { toast("Yapay zekâ yalnızca sayfa claude.ai içinde açıkken çalışır."); return false; }
  return true;
}
function gorselSinir(dizi) {
  if (!dizi?.length) return undefined;
  if (!MAXIMG) throw { code: "images_unavailable" };
  if (dizi.length > MAXIMG) toast(`Bir seferde en fazla ${MAXIMG} fotoğraf gönderilebiliyor; ilk ${MAXIMG} tanesi kullanıldı.`);
  return dizi.slice(0, MAXIMG).map((g) => g.blob);
}
async function aiJson(istem, gorseller) {
  return SAMPLE.json(SISTEM + "\n\n" + istem, { images: gorselSinir(gorseller), cache: false });
}
async function aiText(input, { gorseller, onText } = {}) {
  const r = await SAMPLE(input, { images: gorselSinir(gorseller), cache: false, onText: ({ text }) => onText?.(text) });
  return r.text;
}
function aiHata(e) {
  switch (e?.code) {
    case "not_granted": return "Yapay zekâ kullanımına izin verilmedi. Sayfanın izin menüsünden açabilirsin.";
    case "sampling_disabled": return "Bu hesapta yapay zekâ kullanılamıyor.";
    case "rate_limited": return "Çok fazla istek gönderildi ya da kullanım sınırına ulaşıldı. Biraz sonra tekrar dene.";
    case "image_rejected": return "Fotoğraf kabul edilmedi. Daha küçük ya da başka bir fotoğraf dene.";
    case "images_unavailable": return "Bu görünümde fotoğraf gönderilemiyor. Soruyu yazarak sorabilirsin.";
    case "refused": return "Bu istek yanıtlanamadı. Soruyu farklı şekilde sormayı dene.";
    case "invalid_json": return "Cevap düzgün okunamadı. Tekrar dener misin?";
    case "session_expired": return "Oturumun kapanmış. claude.ai'ye yeniden giriş yap.";
    case "cancelled": return "Durduruldu.";
    default: return e?.mesaj || "Bağlantı sorunu oldu. Tekrar dener misin?";
  }
}

/* Görseli küçült; önizleme için dataUrl, gönderim için Blob */
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
      res({ dataUrl, blob: dataUrlBlob(dataUrl) });
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Görsel açılamadı")); };
    img.src = url;
  });
}
function dataUrlBlob(dataUrl) {
  const [bas, veri] = dataUrl.split(",");
  const tip = bas.slice(5, bas.indexOf(";"));
  const ham = atob(veri); const u = new Uint8Array(ham.length);
  for (let i = 0; i < ham.length; i++) u[i] = ham.charCodeAt(i);
  return new Blob([u], { type: tip });
}

/* İki dokunuşla onay (tarayıcı onay pencereleri burada çalışmaz) */
function onayla(btn, fn) {
  if (btn.dataset.onay) { delete btn.dataset.onay; btn.classList.remove("onay"); btn.innerHTML = btn.dataset.eski; fn(); return; }
  btn.dataset.onay = "1"; btn.dataset.eski = btn.innerHTML; btn.classList.add("onay");
  btn.innerHTML = btn.innerHTML.includes("<svg") && !btn.textContent.trim() ? ic("check") : "Emin misin?";
  btn.title = "Onaylamak için tekrar dokun";
  setTimeout(() => { if (btn.dataset.onay) { delete btn.dataset.onay; btn.classList.remove("onay"); btn.innerHTML = btn.dataset.eski; } }, 3000);
}

