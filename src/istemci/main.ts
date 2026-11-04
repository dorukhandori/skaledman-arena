import { Application } from "pixi.js";
import { type Ben, BakimHatasi, benGetir } from "./hesap.ts";
import { bakimKatmani, darEkranDenetle, metinOlcegiUygula, surumDenetle, ustGezinti } from "./ekranlar/arayuz.ts";

// İstemci girişi. Ekran URL'den: ?ekran=<ad>. Varsayılan Karşılama (girişliyse profil → ilk çekirdek → Atölye;
// ux § 3.1). `#oda=` bağlantısı lobiye açılır (girişsizse Karşılama). Her ekran modülü `baslat(baglam)` verir.
// D5: karsilama, kayit, giris, profil, ilk-cekirdek, antrenman (misafire açık), atolye (ana ekran), market,
// basarimlar, ayarlar, lobi; D6: dene (Atölye'den 30 sn Antrenman), gunluk (Çekirdek Günlüğü); D7: market (Market.ts),
// basarimlar (Basarimlar.ts); geliştirici: mac, topac-lab.

export type EkranAdi =
  | "karsilama" | "kayit" | "giris" | "profil" | "ilk-cekirdek" | "antrenman" | "atolye" | "market" | "basarimlar" | "ayarlar"
  | "lobi" | "mac" | "topac-lab" | "dene" | "gunluk";

export interface EkranBaglami {
  app: Application;
  kok: HTMLElement; // #sahne
  ustYazi: HTMLElement; // DOM üst katmanı (HUD, panel)
  /** `/api/ben` (mac/topac-lab ekranlarında null olabilir) */
  ben: Ben | null;
}

type Modul = { baslat: (b: EkranBaglami) => Promise<void> | void };
const EKRANLAR: Record<EkranAdi, () => Promise<Modul>> = {
  karsilama: () => import("./ekranlar/Kimlik.ts").then((m) => ({ baslat: m.karsilama })),
  kayit: () => import("./ekranlar/Kimlik.ts").then((m) => ({ baslat: m.kayit })),
  giris: () => import("./ekranlar/Kimlik.ts").then((m) => ({ baslat: m.giris })),
  profil: () => import("./ekranlar/Profil.ts"),
  "ilk-cekirdek": () => import("./ekranlar/IlkCekirdek.ts"),
  antrenman: () => import("./ekranlar/Antrenman.ts"),
  atolye: () => import("./ekranlar/Atolye.ts"),
  market: () => import("./ekranlar/Market.ts"),
  basarimlar: () => import("./ekranlar/Basarimlar.ts"),
  ayarlar: () => import("./ekranlar/Diger.ts").then((m) => ({ baslat: m.ayarlar })),
  lobi: () => import("./ekranlar/Lobi.ts"),
  mac: () => import("./ekranlar/Mac.ts"),
  "topac-lab": () => import("./ekranlar/TopacLab.ts"),
  dene: () => import("./ekranlar/Dene.ts"),
  gunluk: () => import("./ekranlar/Gunluk.ts"),
};

/** Giriş isteyen ekranlar (misafir yalnız Karşılama / Kayıt / Giriş / Antrenman / Ayarlar). */
const GIRIS_GEREKIR = new Set<EkranAdi>(["profil", "ilk-cekirdek", "atolye", "market", "basarimlar", "lobi", "dene", "gunluk"]);
/** Pixi gerekmeyen menü ekranları */
const CANVASSIZ = new Set<EkranAdi>(["karsilama", "kayit", "giris", "profil", "atolye", "market", "basarimlar", "ayarlar", "gunluk"]);

function ekranAdi(): EkranAdi {
  const istenen = new URLSearchParams(location.search).get("ekran");
  if (istenen && istenen in EKRANLAR) return istenen as EkranAdi;
  return location.hash.startsWith("#oda=") ? "lobi" : "karsilama";
}

async function ana() {
  metinOlcegiUygula();
  const kok = document.getElementById("sahne")!;
  const ustYazi = document.getElementById("ustYazi")!;
  let ad = ekranAdi();
  let ben: Ben | null = null;
  if (ad !== "mac" && ad !== "topac-lab") {
    try {
      ben = await benGetir();
    } catch (e) {
      if (e instanceof BakimHatasi) { ustGezinti(ad, null); bakimKatmani(() => location.reload()); return; }
      throw e;
    }
    if (!surumDenetle(ben)) { /* bant gösterildi; ekran yine açılır */ }
    if (GIRIS_GEREKIR.has(ad) && !ben.girisli) {
      const oda = location.hash.startsWith("#oda=") ? `&mesaj=oda&donus=${location.hash.slice(5)}` : "";
      history.replaceState(null, "", `${location.pathname}?ekran=karsilama${oda}`);
      ad = "karsilama";
    }
  }
  ustGezinti(ad, ben);
  darEkranDenetle();
  let app: Application | null = null;
  if (!CANVASSIZ.has(ad)) {
    app = new Application();
    await app.init({ resizeTo: kok, background: 0x0b1418, antialias: false, roundPixels: true, preference: "webgl" });
    kok.insertBefore(app.canvas, ustYazi);
  }
  const modul = await EKRANLAR[ad]();
  await modul.baslat({ app: app as Application, kok, ustYazi, ben });
}

ana().catch((hata) => {
  console.error("İstemci başlatılamadı", hata);
  const p = document.createElement("p");
  p.style.padding = "16px";
  p.textContent = `Başlatma hatası: ${hata instanceof Error ? hata.message : String(hata)}`;
  document.getElementById("ustYazi")?.appendChild(p);
});
