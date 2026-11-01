import { Application } from "pixi.js";

// İstemci girişi. Ekran seçimi URL'den: ?ekran=arena | lab
// Her ekran modülü `baslat(app, kok)` dışa aktarır ve kendi temizliğini yapar.

export type EkranAdi = "arena" | "lab";

export interface EkranBaglami {
  app: Application;
  kok: HTMLElement; // #sahne
  ustYazi: HTMLElement; // DOM üst katmanı (HUD metinleri, düğmeler)
}

const EKRANLAR: Record<EkranAdi, () => Promise<{ baslat: (b: EkranBaglami) => Promise<void> | void }>> = {
  arena: () => import("./ekranlar/Arena.ts"),
  lab: () => import("./ekranlar/BirlestirmeLab.ts"),
};

function ekranAdi(): EkranAdi {
  const istenen = new URLSearchParams(location.search).get("ekran");
  return istenen === "lab" ? "lab" : "arena";
}

async function ana() {
  const kok = document.getElementById("sahne")!;
  const ustYazi = document.getElementById("ustYazi")!;
  const ad = ekranAdi();

  for (const a of document.querySelectorAll<HTMLAnchorElement>("#menu a")) {
    a.toggleAttribute("aria-current", a.getAttribute("href") === `?ekran=${ad}`);
    if (a.hasAttribute("aria-current")) a.setAttribute("aria-current", "page");
  }

  const app = new Application();
  await app.init({
    resizeTo: kok,
    background: 0x0c191d,
    antialias: false,
    roundPixels: true,
    preference: "webgl",
  });
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
