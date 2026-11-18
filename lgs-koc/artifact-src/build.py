import sys, re
pub, src, out = sys.argv[1], sys.argv[2], sys.argv[3]
veri_p = src + "/veri.js"
ders_js = open(src + "/ders.js", encoding="utf-8").read()
ders_css = open(src + "/ders.css", encoding="utf-8").read()
ders_html = open(src + "/ders.html", encoding="utf-8").read()
js = open(pub + "/app.js", encoding="utf-8").read()
css = open(pub + "/style.css", encoding="utf-8").read()
html = open(pub + "/index.html", encoding="utf-8").read()
veri = open(veri_p, encoding="utf-8").read()

def cut(s, a, b, new):
    i = s.index(a); j = s.index(b, i)
    return s[:i] + new + s[j:]

# --- JS ---
js = js[js.index("const $ = "):]                       # import + FB sabiti gider
js = cut(js, "/* ------------------------------------------------------------------ */\n/* Firebase",
         "/* Basit, güvenli markdown */", veri)

def R(a, b):
    global js
    assert a in js, a[:80]
    js = js.replace(a, b)

# Sonuç kâğıdı
R("""    const { part } = await gorselHazirla(file, 2000);""", """    const g = await gorselHazirla(file, 2000);""")
R("""    const r = await modelIle((m) => m.generateContent([istem, part]), { generationConfig: { responseMimeType: "application/json" } });
    const j = jsonAyikla(r.response.text());""", """    const j = await aiJson(istem, [g]);""")
# Koç yorumu
R("""    const r = await modelIle((m) => m.generateContentStream(istem));
    let t = "";
    for await (const c of r.stream) { t += c.text(); kutu.innerHTML = md(t); }""",
  """    await aiText(SISTEM + "\\n\\n" + istem, { onText: (t) => (kutu.innerHTML = md(t)) });""")
# Koç kontrolü
R("""    const r = await modelIle((m) => m.generateContent([istem, ...kGorseller.map((g) => g.part)]), { generationConfig: { responseMimeType: "application/json", temperature: 0.4 } });
    const j = jsonAyikla(r.response.text());
    if (!j.sorular?.length) throw new Error("Fotoğraflarda soru bulunamadı. Daha net bir fotoğraf dener misin?");""",
  """    const j = await aiJson(istem, kGorseller);
    if (!j?.sorular?.length) throw { mesaj: "Fotoğraflarda soru bulunamadı. Daha net bir fotoğraf dener misin?" };""")
# Fotoğraftan soru
R("""    const r = await modelIle((m) => m.generateContent([istem, ...fGorseller.map((g) => g.part)]), { generationConfig: { responseMimeType: "application/json", temperature: 0.6 } });
    const j = jsonAyikla(r.response.text());
    if (!j.sorular?.length) throw new Error("Soru üretilemedi");""",
  """    const j = await aiJson(istem, fGorseller);
    if (!j?.sorular?.length) throw { mesaj: "Soru üretilemedi. Başka bir fotoğrafla dener misin?" };""")
# Sohbet
R("let sohbet = null;\n", "let sohbet = [];\n")
R("""$("#cYeni").onclick = () => { sohbet = null;""", """$("#cYeni").onclick = () => { sohbet = [];""")
R("""  const parcalar = [...gorseller.map((g) => g.part), { text: metin || "Bu soruyu adım adım çöz." }];
  try {
    let t = "";
    await modelIle(async (m) => {
      if (!sohbet || sohbet._model !== m.model) { sohbet = m.startChat(); sohbet._model = m.model; }
      const r = await sohbet.sendMessageStream(parcalar);
      for await (const c of r.stream) { t += c.text(); kutu.innerHTML = md(t); cMsgs.scrollTop = cMsgs.scrollHeight; }
    });
    if (!t) kutu.textContent = "Cevap üretilemedi, tekrar dener misin?";
  } catch (er) { kutu.textContent = aiHata(er); sohbet = null; }""",
  """  const icerik = (gorseller.length ? `(Bu mesaja ${gorseller.length} fotoğraf ekledim.) ` : "") + (metin || "Bu soruyu adım adım çöz.");
  const turlar = [...sohbet, { role: "user", content: icerik }];
  try {
    const t = await aiText([{ role: "user", content: SISTEM + "\\nAşağıdaki sohbette öğrencinin sorularını cevapla. Önceki mesajlardaki fotoğraflar tekrar gönderilmez; gerekiyorsa önceki cevabındaki bilgiyi kullan." }, ...turlar.slice(-20)], {
      gorseller, onText: (x) => { kutu.innerHTML = md(x); cMsgs.scrollTop = cMsgs.scrollHeight; },
    });
    sohbet = [...turlar, { role: "assistant", content: t }];
  } catch (er) { kutu.innerHTML = er?.text ? md(er.text) + `<p class="err">${esc(aiHata(er))}</p>` : esc(aiHata(er)); }""")
# Tahta görseli
R("""    cGorseller.push({ dataUrl, part: dataUrlPart(dataUrl) });""", """    cGorseller.push({ dataUrl, blob: dataUrlBlob(dataUrl) });""")
# confirm() burada çalışmaz
R("""  if (toplamNet === 0 && !confirm("Hiç doğru girmedin. Yine de kaydedilsin mi?")) return;\n""", "")
R("""  $$("[data-sil]").forEach((b) => (b.onclick = async () => {
    if (!confirm("Bu deneme silinsin mi?")) return;
    try { await store.sil(b.dataset.sil); DENEMELER = DENEMELER.filter((d) => d.id !== b.dataset.sil); analizCiz(); }
    catch (e) { toast("Silinemedi"); }
  }));""", """  $$("[data-sil]").forEach((b) => (b.onclick = () => onayla(b, async () => {
    try { await store.sil(b.dataset.sil); DENEMELER = DENEMELER.filter((d) => d.id !== b.dataset.sil); analizCiz(); toast("Deneme silindi"); }
    catch (e) { toast("Silinemedi, tekrar dene."); }
  })));""")
R("""  $("#wbClear").onclick = () => { if ((ciz.length || arka) && confirm("Tahta temizlensin mi?")) { ciz = []; geri = []; arka = null; yeniden(); } };""",
  """  $("#wbClear").onclick = () => { if (ciz.length || arka) onayla($("#wbClear"), () => { ciz = []; geri = []; arka = null; yeniden(); }); };""")
# Hatalar
R("""  } catch (e) { toast("Kaydedilemedi: " + (e.code || e.message)); }
  $("#dKaydet").disabled = false;""", """  } catch (e) { toast(e?.code === "quota_exceeded" ? "Kayıt alanı doldu; eski denemeleri sil." : "Kaydedilemedi, tekrar dene."); }
  $("#dKaydet").disabled = false;""")
R("""    } catch (e) { toast("Rapor kaydedilemedi: " + (e.code || e.message)); }""", """    } catch (e) { toast("Rapor kaydedilemedi, tekrar dene."); }""")
# Başlangıç
R("""  return { boyutla, metinYaz };\n})();""", """  return { boyutla, metinYaz, png, bosMu: () => !ciz.length && !arka };\n})();\n""" + ders_js)
R("""          <button class="btn ghost" id="kAnlat">${ic("message")}Anlamadım, Soru Sor'da tekrar anlat</button>""",
  """          <button class="btn ghost" id="kDers">${ic("video")}Hocama sesli anlattır</button>
          <button class="btn ghost" id="kAnlat">${ic("message")}Soru Sor'da yazılı anlat</button>""")
R("""      $("#kAnlat").onclick = () => sohbeteGonder(""", """      $("#kDers").onclick = () => ders.ac(`Denememde şu soruyu yanlış yaptım (${q.ders}, ${q.konu}): ${q.soru} ${(q.secenekler || []).map((s, n) => `${"ABCD"[n]}) ${s}`).join(" ")}. Doğru cevap ${"ABCD"[q.dogru] || "bilinmiyor"}. Bana adım adım anlatır mısın?`);
      $("#kAnlat").onclick = () => sohbeteGonder(""")
R("""whoCiz();
firebaseBaslat().catch((e) => { banner("Firebase yüklenemedi: " + esc(e.message)); veriYukle(); });
if (!hazir) veriYukle();""", """veriBaslat();\nders.baslat();""")
for bad in ["modelIle", "jsonAyikla", "fb.", "firebase", ".part", "confirm("]:
    assert bad not in js, bad

# --- CSS ---
def C(a, b):
    global css
    assert a in css, a[:60]
    css = css.replace(a, b)
dark = re.search(r"@media \(prefers-color-scheme: dark\)\{\n  :root:not\(\[data-theme=\"light\"\]\)\{\n(.*?)\n  \}\n\}", css, re.S)
vals = dark.group(1)
C(dark.group(0), "@media (prefers-color-scheme: dark){\n  :root:not([data-theme=\"light\"]){\n" + vals + "\n    color-scheme:dark;\n  }\n}\n:root[data-theme=\"dark\"]{\n" + vals + "\n  color-scheme:dark;\n}")
C("--shadow:0 1px 2px", "--warnbg:#fff7e6; --warnfg:#7a4b00; --warnline:#f5d9a0;\n  --shadow:0 1px 2px")
css = css.replace("--board:#1f2231;", "--board:#1f2231; --warnbg:#3a2c10; --warnfg:#fcd9a0; --warnline:#5a4520;")
C("background:#fff7e6;color:#7a4b00;font-size:14px;border:1px solid #f5d9a0}", "background:var(--warnbg);color:var(--warnfg);font-size:14px;border:1px solid var(--warnline)}")
C("""@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .banner{background:#3a2c10;color:#fcd9a0;border-color:#5a4520}}\n""", "")
C("body{background:var(--bg);", "body{padding-left:max(16px, env(safe-area-inset-left, 0px));padding-right:max(16px, env(safe-area-inset-right, 0px));background:var(--bg);")
C("padding:14px 16px;max-width:1100px;margin:0 auto}", "padding-block:14px;max-width:1100px;margin:0 auto}")
C("overflow-x:auto;padding:4px 16px 10px;max-width:1100px", "overflow-x:auto;padding-block:4px 10px;max-width:1100px")
C("main{max-width:1100px;margin:0 auto;padding:0 16px}", "main{max-width:1100px;margin:0 auto}")
C("h2{margin:0 0 12px;font-size:19px}", "h2,h3,.brand b{font-family:\"Space Grotesk\",Inter,system-ui,sans-serif;text-wrap:balance}\nh2{margin:0 0 12px;font-size:20px}")
C("--shadow:0 1px 2px", "--sahne:#1e2140;\n  --shadow:0 1px 2px")
css = css.replace("--board:#1f2231;", "--board:#1f2231; --sahne:#141627;")
css += ders_css
css += """
.kayit{font-size:12px;color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:4px 10px}
.btn.onay,.tools>button.onay{background:var(--bad);color:#fff;border-color:var(--bad)}
.kpi b,.puanKutu b,td,.bars .v{font-variant-numeric:tabular-nums}
button:focus-visible,select:focus-visible,.btn:focus-visible{outline:2px solid var(--pri);outline-offset:2px}
@media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}
"""

# --- HTML gövdesi ---
body = html[html.index("<body>") + 6: html.index('<script type="module"')]
def H(a, b):
    global body
    assert a in body, a[:60]
    body = body.replace(a, b, 1)
H('<symbol id="i-plus"', '''<symbol id="i-mic" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></symbol>
  <symbol id="i-square" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></symbol>
  <symbol id="i-phone" viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></symbol>
  <symbol id="i-video" viewBox="0 0 24 24"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></symbol>
  <symbol id="i-plus"''')
H("""Analiz</button>""", """Analiz</button>
  <button data-tab="ders"><svg class="ic"><use href="#i-video"/></svg>Özel Ders</button>""")
H("""</main>""", ders_html + "</main>")

head = """<title>LGS Koçu</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap">
<style>
""" + css + "\n</style>\n"
page = head + body + "<script>\n(() => {\n" + js + "\n})();\n</script>\n"
open(out, "w", encoding="utf-8").write(page)
print(len(page))
