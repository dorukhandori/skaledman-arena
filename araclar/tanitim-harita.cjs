// Harita / Maden / Ocak "nasıl oynanır" tanıtım kaydı (Playwright ekran videosu + Türkçe altyazı).
// Çalıştır: KIMLIK_MODU=sifre geliştirme sunucusu açıkken
//   ADRES=http://localhost:5391/ KLASOR=<çıktı> NODE_PATH=<playwright node_modules> node araclar/tanitim-harita.cjs
// Çıktı: <KLASOR>/k/*.jpg + kareler.txt (ffmpeg concat, zaman damgalı) + zaman.json (bölüm sınırları, ms).
// Kurgu: araclar/tanitim-harita-kurgu.sh. Not: bu Mac'te başsız Chrome'un ekran akışı (recordVideo) alttan 87 px
// kesiyor; bu yüzden kayıt sürekli page.screenshot ile alınır (≈ 12-20 kare/sn).
// Yeni bir test hesabı açar (yalnız yerel sunucu); maçı oyuncunun topacını süren paylaşılan bot oynar (?oto=dolas).
const { chromium } = require("playwright");
const fs = require("fs");
const TABAN = process.env.ADRES || "http://localhost:5391/";
const KLASOR = process.env.KLASOR;
if (!KLASOR) { console.error("KLASOR gerekli"); process.exit(2); }
fs.mkdirSync(KLASOR, { recursive: true });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const ek = Date.now().toString(36).slice(-4);
const AD = `Madenci ${ek}`;
const SIFRE = "tanitim-sifre-1";

const ALTYAZI_STIL = `
#tn-alt { position:fixed; left:50%; bottom:22px; transform:translateX(-50%); z-index:2147483647; max-width:1100px;
  padding:10px 18px; background:rgba(8,10,18,.88); box-shadow:0 0 0 3px #b07a4a, 0 0 0 5px #05050a; color:#fff6d0;
  font:400 28px/1.15 "m5x7", monospace; text-align:center; pointer-events:none; letter-spacing:.5px; }
#tn-alt b { color:#fcd35a; font-weight:400; }
#tn-kart { position:fixed; inset:0; z-index:2147483647; display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:18px; background:#0b0f18; color:#fff6d0; font:400 30px/1.2 "m5x7", monospace; text-align:center; }
#tn-kart h1 { font:400 76px/1 "Jersey 10", "m5x7", monospace; color:#fcd35a; margin:0; letter-spacing:2px; text-shadow:0 4px 0 #05050a; }
#tn-kart .alt { color:#e8762f; font-size:34px; }
#tn-kart img { width:96px; height:96px; image-rendering:pixelated; }
#tn-ok { position:fixed; z-index:2147483646; pointer-events:none; width:46px; height:46px; border:4px solid #fcd35a;
  box-shadow:0 0 0 3px #05050a; border-radius:50%; animation:tn-ok 0.9s ease-in-out infinite; }
@keyframes tn-ok { 50% { transform:scale(1.25); opacity:.6 } }`;

async function main() {
  const t = await chromium.launch();
  const c = await t.newContext({ viewport: { width: 1280, height: 720 } });
  const s = await c.newPage();
  const T0 = Date.now();
  fs.mkdirSync(`${KLASOR}/k`, { recursive: true });
  const kareler = [];
  let kayit = true;
  const kaydedici = (async () => {
    while (kayit) {
      const an = Date.now() - T0;
      try {
        const buf = await s.screenshot({ type: "jpeg", quality: 82, timeout: 3000 });
        const ad = `k/${String(kareler.length).padStart(5, "0")}.jpg`;
        fs.writeFileSync(`${KLASOR}/${ad}`, buf);
        kareler.push([ad, an]);
      } catch { await bekle(30); }
    }
  })();
  const zaman = {};
  const isaret = (ad) => { zaman[ad] = Date.now() - T0; console.log(`[${(zaman[ad] / 1000).toFixed(1)}s] ${ad}`); };
  const hatalar = [];
  s.on("pageerror", (e) => hatalar.push(e.message));
  s.on("console", (m) => { if (m.type() === "error" && !/WebGL|GPU|favicon/.test(m.text())) hatalar.push(m.text()); });
  const ev = (kod) => s.evaluate(kod);
  const kosul = (kod, ms = 20000) => s.waitForFunction(kod, null, { timeout: ms });
  const api = (yontem, yol, govde = {}) => ev(`(async () => { const r = await fetch(${JSON.stringify(yol)}, { method: ${JSON.stringify(yontem)},
    headers: { "content-type": "application/json" }, body: ${yontem === "GET" ? "undefined" : `JSON.stringify(${JSON.stringify(govde)})`} });
    return { durum: r.status }; })()`);
  const stil = () => ev(`(() => { if (document.getElementById("tn-stil")) return 1; const st = document.createElement("style"); st.id = "tn-stil";
    st.textContent = ${JSON.stringify(ALTYAZI_STIL)}; document.head.appendChild(st); return 1; })()`);
  const altyazi = async (html) => {
    await stil();
    await ev(`(() => { let a = document.getElementById("tn-alt"); if (!a) { a = document.createElement("div"); a.id = "tn-alt"; document.body.appendChild(a); }
      a.innerHTML = ${JSON.stringify(html)}; a.style.display = ${JSON.stringify(html ? "block" : "none")}; return 1; })()`);
  };
  const ok = async (sec) => {
    await stil();
    await ev(`(() => { document.getElementById("tn-ok")?.remove(); const e = document.querySelector(${JSON.stringify(sec)}); if (!e) return 0;
      const r = e.getBoundingClientRect(); const o = document.createElement("div"); o.id = "tn-ok";
      o.style.left = (r.left + r.width / 2 - 27) + "px"; o.style.top = (r.top + r.height / 2 - 27) + "px"; document.body.appendChild(o); return 1; })()`);
  };
  const okKaldir = () => ev(`document.getElementById("tn-ok")?.remove()`);
  const kart = async (baslik, satirlar, ms, ikon = "") => {
    await stil();
    await ev(`(() => { document.getElementById("tn-kart")?.remove(); const k = document.createElement("div"); k.id = "tn-kart";
      k.innerHTML = ${JSON.stringify(`${ikon ? `<img src="${ikon}" alt="">` : ""}<h1>${baslik}</h1>${satirlar.map((x, i) => `<div class="${i === 0 ? "alt" : ""}">${x}</div>`).join("")}`)};
      document.body.appendChild(k); return 1; })()`);
    await bekle(ms);
    await ev(`document.getElementById("tn-kart")?.remove()`);
  };
  const tikla = (sec) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sec)}); if (!e) throw new Error("yok: ${sec}");
    e.dispatchEvent(new MouseEvent("click", { bubbles: true })); return 1; })()`);
  const git = async (yol, ms = 1200) => { await s.goto(`${TABAN}${yol}`); await bekle(ms); };

  // --- hazırlık (videoya girmez: kart arkasında)
  await git("?ekran=ayarlar", 800);
  await kart("DEVRAN", ["HARİTA · MADEN · OCAK", "Nasıl oynanır"], 100, "/harita/dugum/maden.png");
  const r = [(await api("POST", "/api/kayit", { ad: AD, sifre: SIFRE, sifreTekrar: SIFRE })).durum, (await api("POST", "/api/profil", { arma: "kaya", renk: "#e3350d" })).durum,
    (await api("POST", "/api/ilk-cekirdek", { set: "maden" })).durum, (await api("POST", "/api/egitim-bitti", {})).durum,
    (await api("PATCH", "/api/profil", { karakter: 1 })).durum];
  console.log("hesap", AD, r);

  // --- 1. Giriş kartı
  await git("?ekran=atolye", 1500);
  isaret("bas");
  await kart("DEVRAN", ["HARİTA · MADEN · OCAK", "Nasıl oynanır · 3 dakika", "Hesabı olan her oyuncuya açık"], 4200, "/harita/dugum/maden.png");

  // --- 2. Atölye → OYNA → HARİTA
  await altyazi("Atölye ana üstür. Haritaya gitmek için <b>OYNA</b>'ya bas.");
  await ok("[data-eylem=oyna]");
  await bekle(2800);
  await okKaldir();
  await git("?ekran=lobi", 900);
  await kosul(`!!document.querySelector("[data-mod=harita]")`);
  await altyazi("Oyna ekranında <b>HARİTA</b> modunu seç.");
  await ok("[data-mod=harita]");
  await bekle(2800);
  await okKaldir();
  await tikla("[data-mod=harita]");
  await kosul(`!!document.querySelector("[data-dugum='b1-01']")`);
  await bekle(600);
  isaret("harita");
  await altyazi("Her bölge bir <b>düğüm haritası</b>. Yollar düğümleri bağlar; kilitli düğüm, komşusu temizlenince açılır.");
  await bekle(4200);
  await altyazi("Düğüm türleri: <b>DÜŞMAN</b> (maç) · <b>PATRON</b> (bölge sonu) · <b>MADEN</b> (kazı) · <b>SANDIK</b> (ödül).");
  await bekle(4200);
  await altyazi("Halkadaki üç çentik düğümün aşamasıdır: <b>KEŞFET · TEMİZLE · USTALAŞ</b>.");
  await ok("[data-dugum='b1-01']");
  await bekle(3600);
  await okKaldir();

  // --- 3. Yürü + DÖVÜŞ
  await altyazi("Düğüme dokun, alttaki düğmeye bas: karakterin yol boyunca <b>yürür</b>.");
  await tikla("[data-dugum='b1-01']");
  await bekle(900);
  const ana = await ev(`document.querySelector("[data-eylem=ana]")?.dataset.tur`);
  if (ana === "git" || ana === "yuru") { await tikla("[data-eylem=ana]"); }
  await kosul(`document.querySelector("[data-eylem=ana]")?.dataset.tur === "dovus"`, 10000);
  await bekle(1500);
  await altyazi("Düşmana vardın. Şerit zorluğu, yıldız şartlarını ve ödülü gösterir. <b>DÖVÜŞ</b>'e bas.");
  await ok("[data-eylem=ana]");
  await bekle(3600);
  await okKaldir();
  await git("?ekran=lobi&dugum=b1-01&oto=dolas", 600);
  await kosul(`!!document.querySelector("[data-eylem=hazir]")`);
  await altyazi("Rakip, düğümün botudur. Zorluk bölgeyle artar. <b>HAZIR</b> ve maç başlar.");
  await bekle(3200);
  await tikla("[data-eylem=hazir]");
  isaret("macBas");
  await altyazi("Maç her zamanki gibi: ilk <b>3 puan</b> kazanır. (Video ×4 hızlı)");
  await kosul(`!!document.querySelector("[data-harita-odul] .yildizlar")`, 240000);
  isaret("macBit");
  for (let i = 0; i < 8; i++) { await ev(`window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space" }))`); await bekle(350); }
  await bekle(800);
  await altyazi("Sonuçta <b>harita ödülü</b>: yıldızlar (Kazan · Temiz kazan · 60 sn'de kazan), Altın ve cevher.");
  await bekle(4600);
  await altyazi("Kazanınca düğüm <b>TEMİZLE</b> olur, komşu düğümler açılır. <b>HARİTA</b>'ya dön.");
  await bekle(3000);
  await tikla("[data-eylem=harita]");
  await kosul(`!!document.querySelector("[data-dugum='b1-02']")`);
  isaret("donus");
  await altyazi("Aşaması yükselen düğüm kutlanır. Yanındaki <b>MADEN</b> düğümü açıldı.");
  await bekle(3800);

  // --- 4. Maden (harita taze açılır: Sonuç'tan dönen örnekte yürüyüş bazen asılı kalıyor; h-akis ile aynı yol)
  await git("?ekran=harita", 1200);
  await kosul(`!!document.querySelector("[data-dugum='b1-02']")`);
  await altyazi("Maden düğümüne yürü ve <b>KAZ</b>'a bas.");
  await bekle(600);
  await tikla("[data-dugum='b1-02']");
  await bekle(700);
  const ana2 = await ev(`document.querySelector("[data-eylem=ana]")?.dataset.tur`);
  if (ana2 === "git" || ana2 === "yuru") await tikla("[data-eylem=ana]");
  await kosul(`document.querySelector("[data-eylem=ana]")?.dataset.tur === "kaz"`, 25000);
  await bekle(1400);
  await ok("[data-eylem=ana]");
  await bekle(1600);
  await okKaldir();
  await tikla("[data-eylem=ana]");
  await kosul(`!!document.querySelector("[data-eylem=kaz]")`);
  await bekle(800);
  isaret("maden");
  await altyazi("Ortada <b>damar</b>, çevresinde dönen ışık. Işık <b>bronz yaydayken</b> KAZ'a bas: <b>İSABET</b>, +1 cevher.");
  await bekle(4800);
  await altyazi("Boşluk, Enter ya da ekrana dokunmak da kazar. Iska da Madencilik tecrübesi verir.");
  const isabetliKaz = () => ev(`new Promise((r) => { const m = window.__maden; const tick = () => { const st = m.durum; if (!st) return r(0);
    const P = st.halka.periyotMs, t = performance.now() - m.alinma, f = (t + st.halka.fazMs) % P, a = st.halka.pencere[0], b = st.halka.pencere[1];
    if (t > 760 && f > a + 25 && f < b - 25) { document.querySelector("[data-eylem=kaz]")?.click(); r(1); } else requestAnimationFrame(tick); };
    tick(); setTimeout(() => r(0), 4000); })`);
  for (let i = 0; i < 8; i++) {
    if (await ev(`!!document.querySelector("[data-eylem=harita]")`)) break;
    if (i === 2) await altyazi("Damarın günlük kapasitesi var (●●●○○○); bitince <b>04:00</b>'te dolar.");
    if (i === 4) await altyazi("Madencilik ustalığın yükseldikçe yeni kademeler açılır: Demir → Kaya → Don → Kor…");
    await isabetliKaz();
    await bekle(1250);
  }
  await bekle(1200);
  isaret("madenBit");

  // --- 5. Ocak
  await api("POST", "/api/gelistirme/cevher", { kademe: 1, cevher: 16, kulce: 0 }); // yalnız yerel: üretim için yeterli cevher
  await git("?ekran=atolye", 1300);
  await kosul(`!!document.querySelector("[data-eylem=ocak]")`);
  await altyazi("Cevher Atölye'deki <b>OCAK</b>'ta işlenir.");
  await ok("[data-eylem=ocak]");
  await bekle(3200);
  await okKaldir();
  await tikla("[data-eylem=ocak]");
  await kosul(`!!document.querySelector("[data-kademe='1']")`);
  await bekle(600);
  isaret("ocak");
  await altyazi("<b>ERİT</b>: cevher külçeye döner (4 cevher → 1 külçe). Başarı şansı İşleme ustalığına bağlı.");
  await ok("[data-eylem=ana]");
  await bekle(3600);
  await okKaldir();
  await tikla("[data-eylem=ana]");
  await kosul(`!!document.querySelector("[data-sonuc]")`);
  await bekle(2600);
  const kulce = await ev(`window.__ocak?.durum?.kulce?.[0] ?? 0`);
  if (kulce < 3) { await api("POST", "/api/gelistirme/cevher", { kademe: 1, cevher: 0, kulce: 3 - kulce }); await git("?ekran=ocak", 1200); }
  await kosul(`!!document.querySelector("[data-parca='duz-uc']")`);
  await altyazi("Külçeyle <b>parça ÜRET</b>: adını ve seri numarasını taşıyan kendi parçan.");
  await ok("[data-parca='duz-uc']");
  await bekle(2600);
  await okKaldir();
  await tikla("[data-parca='duz-uc']");
  await bekle(900);
  await tikla("[data-eylem=ana]");
  await kosul(`!!document.querySelector("[data-eylem=atolye]")`);
  await bekle(3600);
  await altyazi("Tariflerle <b>arma</b> ve <b>çerçeve</b> de dövülür; şanslıysan <b>USTA İŞİ</b> çıkar.");
  await bekle(3600);

  // --- 6. Profil
  await git("?ekran=profil", 1500);
  isaret("profil");
  await altyazi("Profilde haritadaki <b>karakterini</b>, dövdüğün <b>armayı</b> ve <b>çerçeveyi</b> seç.");
  await bekle(4200);

  // --- 7. Kapanış
  await altyazi("");
  await kart("İYİ KAZILAR", ["Bölgeyi temizle · damarı kaz · ocakta dövüş parçanı yap", "devran.ovarlak.games"], 4200, "/harita/ustalik/madencilik.png");
  isaret("son");
  await bekle(400);
  kayit = false;
  await kaydedici;
  fs.writeFileSync(`${KLASOR}/zaman.json`, JSON.stringify({ ...zaman, hesap: AD, hatalar, kare: kareler.length }, null, 1));
  // ffmpeg concat: her kare bir sonrakinin zamanına kadar ekranda (ilk kare 0'dan başlar)
  const satir = ["ffconcat version 1.0"];
  kareler.forEach(([ad, an], i) => { const sonraki = kareler[i + 1]?.[1] ?? an + 100; satir.push(`file '${ad}'`, `duration ${((sonraki - (i === 0 ? 0 : an)) / 1000).toFixed(3)}`); });
  satir.push(`file '${kareler[kareler.length - 1][0]}'`);
  fs.writeFileSync(`${KLASOR}/kareler.txt`, satir.join("\n") + "\n");
  await c.close();
  await t.close();
  console.log("konsol hatası:", hatalar.length, hatalar.slice(0, 3));
}
main().catch((e) => { console.error(e); process.exit(1); });
