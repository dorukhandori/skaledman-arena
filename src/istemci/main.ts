import { Application } from "pixi.js";

// İstemci girişi. Ekran seçimi URL'den: ?ekran=topac-lab (varsayılan; D2'de maç ekranı eklenir).
// Her ekran modülü `baslat(baglam)` dışa aktarır ve kendi temizliğini yapar.

export type EkranAdi = "topac-lab";

export interface EkranBaglami {
  app: Application;
  kok: HTMLElement; // #sahne
  ustYazi: HTMLElement; // DOM üst katmanı (HUD, panel)
}

const EKRANLAR: Record<EkranAdi, () => Promise<{ baslat: (b: EkranBaglami) => Promise<void> | void }>> = {
  "topac-lab": () => import("./ekranlar/TopacLab.ts"),
};

function ekranAdi(): EkranAdi {
  const istenen = new URLSearchParams(location.search).get("ekran");
  return istenen && istenen in EKRANLAR ? (istenen as EkranAdi) : "topac-lab";
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
