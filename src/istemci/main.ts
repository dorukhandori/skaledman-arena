import { Application } from "pixi.js";

// İstemci girişi. Ekran seçimi URL'den: ?ekran=mac (bota karşı tam maç, D2), ?ekran=lobi (çevrimiçi, D4; `#oda=` ile
// de açılır) ya da ?ekran=topac-lab (varsayılan).
// Her ekran modülü `baslat(baglam)` dışa aktarır ve kendi temizliğini yapar.

export type EkranAdi = "topac-lab" | "mac" | "lobi";

export interface EkranBaglami {
  app: Application;
  kok: HTMLElement; // #sahne
  ustYazi: HTMLElement; // DOM üst katmanı (HUD, panel)
}

const EKRANLAR: Record<EkranAdi, () => Promise<{ baslat: (b: EkranBaglami) => Promise<void> | void }>> = {
  "topac-lab": () => import("./ekranlar/TopacLab.ts"),
  mac: () => import("./ekranlar/Mac.ts"),
  lobi: () => import("./ekranlar/Lobi.ts"),
};

function ekranAdi(): EkranAdi {
  const istenen = new URLSearchParams(location.search).get("ekran");
  if (istenen && istenen in EKRANLAR) return istenen as EkranAdi;
  // oda bağlantısı (`#oda=ABCDEFGH`, ux § 3.3) doğrudan lobiye açılır
  return location.hash.startsWith("#oda=") ? "lobi" : "topac-lab";
}

async function ana() {
  const kok = document.getElementById("sahne")!;
  const ustYazi = document.getElementById("ustYazi")!;
  const ad = ekranAdi();
  for (const a of document.querySelectorAll<HTMLAnchorElement>("#menu a")) {
    if (a.getAttribute("href") === `?ekran=${ad}`) a.setAttribute("aria-current", "page");
  }
  const app = new Application();
  await app.init({ resizeTo: kok, background: 0x0b1418, antialias: false, roundPixels: true, preference: "webgl" });
  kok.insertBefore(app.canvas, ustYazi);
  const modul = await EKRANLAR[ad]();
  await modul.baslat({ app, kok, ustYazi });
}

ana().catch((hata) => {
  console.error("İstemci başlatılamadı", hata);
  const p = document.createElement("p");
  p.style.padding = "16px";
  p.textContent = `Başlatma hatası: ${hata instanceof Error ? hata.message : String(hata)}`;
  document.getElementById("ustYazi")?.appendChild(p);
});
