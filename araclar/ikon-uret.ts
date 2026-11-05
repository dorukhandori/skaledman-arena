// MOBIL-1: PWA / ana ekran simgesi (public/ikon/ikon-{180,192,512}.png). 32×32 pixel topaç (kendi çizimimiz, CC0),
// en yakın komşu büyütmeyle. Çalıştır: npx tsx araclar/ikon-uret.ts
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const N = 32;
const px: string[] = [];
const renk = (x: number, y: number): string | null => {
  const dx = x + 0.5 - 16;
  const dy = (y + 0.5 - 17) / 0.62; // basık elips: hibrit kamera gibi yandan-üstten
  const r = Math.sqrt(dx * dx + dy * dy);
  if (y >= 22 && y <= 27 && Math.abs(dx) <= 3 - (y - 22) * 0.5) return "#6b4a2a"; // uç
  if (r > 13) return null;
  if (r > 11.5) return "#05050a";
  if (r > 9.5) return "#c08e52"; // disk (bronz)
  if (r > 8.5) return "#6b4a2a";
  if (r > 5) return "#e8762f"; // gövde (turuncu)
  if (r > 3.5) return "#a8572a";
  return "#fff0d8"; // çekirdek (Kuşak ışığı)
};
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const c = renk(x, y);
  if (c) px.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`);
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges"><rect width="${N}" height="${N}" fill="#18161d"/>${px.join("")}</svg>`;
mkdirSync("public/ikon", { recursive: true });
const taban = await sharp(Buffer.from(svg), { density: 72 }).resize(N, N).png().toBuffer();
for (const boy of [180, 192, 512]) {
  await sharp(taban).resize(boy, boy, { kernel: "nearest" }).png({ compressionLevel: 9, palette: true }).toFile(`public/ikon/ikon-${boy}.png`);
}
console.log("public/ikon: 180, 192, 512");
