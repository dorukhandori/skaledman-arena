import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { animCozumle, animDataOku } from "../araclar/fusion/animdata.ts";
import { basKes, basYerlestir } from "../araclar/fusion/bas.ts";
import { KOK } from "../araclar/fusion/indir.ts";
import { ayakNoktasiBul, golgeBoya, isaretleriOku } from "../araclar/fusion/offsets.ts";
import { boyunKoprusu } from "../araclar/fusion/boyun.ts";
import { dolguYuzdelikleri, hedefAralik, kontrastPlanla, kontrastUygula } from "../araclar/fusion/kontrast.ts";
import { hueRotateMatrisi, renkKaydir, saturateMatrisi, shinyMatrisi, shinyUygula } from "../araclar/fusion/parlak.ts";
import { baskinRenkler, paletEsle, renkSayimi, renktenAnahtar } from "../araclar/fusion/palet.ts";
import { bosResim, pikselYaz, piksel, type Resim } from "../araclar/fusion/resim.ts";
import { resimOku } from "../araclar/fusion/resim.ts";
import { YONLER, yonBul } from "../src/paylasilan/atlas.ts";

const XML = `<?xml version="1.0" ?>
<AnimData>
	<ShadowSize>2</ShadowSize>
	<Anims>
		<Anim>
			<Name>Walk</Name>
			<Index>0</Index>
			<FrameWidth>32</FrameWidth>
			<FrameHeight>40</FrameHeight>
			<Durations>
				<Duration>6</Duration>
				<Duration>8</Duration>
			</Durations>
		</Anim>
		<Anim>
			<Name>Attack</Name>
			<Index>1</Index>
			<FrameWidth>64</FrameWidth>
			<FrameHeight>64</FrameHeight>
			<RushFrame>2</RushFrame>
			<HitFrame>6</HitFrame>
			<ReturnFrame>8</ReturnFrame>
			<Durations><Duration>2</Duration><Duration>4</Duration></Durations>
		</Anim>
		<Anim>
			<Name>Hop</Name>
			<Index>2</Index>
			<FrameWidth>24</FrameWidth>
			<FrameHeight>24</FrameHeight>
			<HitFrame>-1</HitFrame>
			<Durations><Duration>3</Duration></Durations>
		</Anim>
		<Anim>
			<Name>Shoot</Name>
			<Index>3</Index>
			<CopyOf>Charge</CopyOf>
		</Anim>
		<Anim>
			<Name>Charge</Name>
			<Index>4</Index>
			<FrameWidth>48</FrameWidth>
			<FrameHeight>48</FrameHeight>
			<Durations><Duration>5</Duration></Durations>
		</Anim>
	</Anims>
</AnimData>`;

describe("AnimData ayrıştırıcı", () => {
  const veri = animDataOku(XML);

  it("gölge boyunu ve animasyonları okur", () => {
    expect(veri.golgeBoyu).toBe(2);
    expect([...veri.animler.keys()]).toEqual(["Walk", "Attack", "Hop", "Shoot", "Charge"]);
  });

  it("kare boyutu, süre ve Rush/Hit/Return karelerini okur", () => {
    const a = veri.animler.get("Attack")!;
    expect(a.kareGenislik).toBe(64);
    expect(a.sureler).toEqual([2, 4]);
    expect([a.hamleKaresi, a.vurusKaresi, a.donusKaresi]).toEqual([2, 6, 8]);
  });

  it("-1 kare değerini 'yok' sayar", () => {
    expect(veri.animler.get("Hop")!.vurusKaresi).toBeUndefined();
  });

  it("CopyOf animasyonunu hedefin tanımına çözer", () => {
    const t = animCozumle(veri, "Shoot")!;
    expect(t.ad).toBe("Charge");
    expect(t.kareGenislik).toBe(48);
    expect(animCozumle(veri, "Yok")).toBeUndefined();
  });
});

/** kareG×kareY'lik kareler yan yana; her kareye işaret koy */
function sentetikOffsets(): Resim {
  const r = bosResim(20, 20); // 2 sütun × 2 satır, kare 10×10
  const kare = (sutun: number, satir: number, x: number, y: number, c: [number, number, number]) =>
    pikselYaz(r, sutun * 10 + x, satir * 10 + y, [c[0], c[1], c[2], 255]);
  kare(0, 0, 5, 5, [0, 0, 0]);
  kare(0, 0, 5, 3, [0, 255, 0]);
  kare(0, 0, 2, 6, [255, 0, 0]);
  kare(0, 0, 8, 6, [0, 0, 255]);
  kare(1, 1, 4, 2, [0, 255, 0]); // yalnız baş
  kare(1, 0, 3, 3, [0, 255, 0]);
  kare(1, 0, 5, 3, [0, 255, 0]); // iki yeşil → ortalama (4,3)
  pikselYaz(r, 15, 15, [10, 200, 10, 255]); // işaret rengi değil
  return r;
}

describe("Offsets işaret okuyucu", () => {
  const isaret = isaretleriOku(sentetikOffsets(), 10, 10);

  it("sayfayı satır × sütun karelere böler", () => {
    expect(isaret.length).toBe(2);
    expect(isaret[0]!.length).toBe(2);
  });

  it("dört işareti renginden tanır", () => {
    expect(isaret[0]![0]).toEqual({ merkez: { x: 5, y: 5 }, bas: { x: 5, y: 3 }, solEl: { x: 2, y: 6 }, sagEl: { x: 8, y: 6 } });
  });

  it("yalnız baş işareti olan kareyi ve işaretsiz kareyi ayırır", () => {
    expect(isaret[1]![1]).toEqual({ bas: { x: 4, y: 2 } });
  });

  it("aynı renkten birden çok pikselin ortalamasını alır, benzer renkleri işaret saymaz", () => {
    expect(isaret[0]![1]!.bas).toEqual({ x: 4, y: 3 });
  });
});

describe("Gölge sayfası", () => {
  const golge = bosResim(10, 10);
  for (let x = 2; x < 8; x++) pikselYaz(golge, x, 5, [0, 0, 255, 255]); // büyük halka
  for (let x = 3; x < 7; x++) pikselYaz(golge, x, 6, [255, 0, 0, 255]); // orta
  pikselYaz(golge, 4, 7, [0, 255, 0, 255]); // küçük
  pikselYaz(golge, 5, 8, [255, 255, 255, 255]); // ayak noktası

  it("beyaz işareti ayak noktası olarak bulur", () => {
    expect(ayakNoktasiBul(golge, 10, 10)).toEqual({ x: 5, y: 8 });
  });

  it("seçilen boy ve altındakini tek renge çevirir", () => {
    const kucuk = golgeBoya(golge, 0);
    expect(piksel(kucuk, 4, 7)![3]).toBeGreaterThan(0);
    expect(piksel(kucuk, 3, 6)![3]).toBe(0); // orta halka kapalı
    const orta = golgeBoya(golge, 1);
    expect(piksel(orta, 3, 6)![3]).toBeGreaterThan(0);
    expect(piksel(orta, 2, 5)![3]).toBe(0);
    expect(piksel(golgeBoya(golge, 2), 2, 5)![3]).toBeGreaterThan(0);
  });
});

describe("Palet", () => {
  function renkliResim(): Resim {
    const r = bosResim(10, 10);
    for (let x = 0; x < 10; x++) for (let y = 0; y < 10; y++) pikselYaz(r, x, y, x < 7 ? [200, 120, 60, 255] : [230, 160, 90, 255]);
    pikselYaz(r, 0, 0, [0, 0, 0, 255]); // çizgi
    pikselYaz(r, 1, 0, [255, 255, 255, 255]); // göz
    return r;
  }

  it("yakın renkleri birleştirip en fazla k baskın renk verir", () => {
    const r = bosResim(10, 10);
    for (let i = 0; i < 100; i++) pikselYaz(r, i % 10, Math.floor(i / 10), [i < 40 ? 200 : 202, 50, 50, 255]);
    pikselYaz(r, 0, 0, [20, 200, 20, 255]);
    const k = baskinRenkler(renkSayimi(r), 2);
    expect(k.length).toBeLessThanOrEqual(2);
    expect(k[0]!.sayi).toBeGreaterThan(90);
  });

  it("gövde rengini fusion tonuna çevirir, çizgiyi fusion çizgisine, beyazı aynen bırakır", () => {
    const hedef = [{ renk: [40, 90, 200] as const, sayi: 100 }];
    const p = paletEsle(renkSayimi(renkliResim()), hedef, [10, 10, 30]);
    const donusum = (r: number, g: number, b: number) => renktenAnahtar(p.harita.get((r << 16) | (g << 8) | b)!);
    const govde = donusum(200, 120, 60);
    expect(govde[2]).toBeGreaterThan(govde[0]); // turuncu → mavimsi
    expect(donusum(0, 0, 0)).toEqual([10, 10, 30]);
    expect(donusum(255, 255, 255)).toEqual([255, 255, 255]);
  });
});

describe("Baş kesme ve yerleştirme", () => {
  /** 21×21: (10,10) çevresinde 5×5 kırmızı baş, altında 3×8 mavi gövde */
  function govdeVeBas(): Resim {
    const r = bosResim(21, 21);
    for (let y = 8; y <= 12; y++) for (let x = 8; x <= 12; x++) pikselYaz(r, x, y, [255, 0, 0, 255]);
    for (let y = 13; y <= 20; y++) for (let x = 9; x <= 11; x++) pikselYaz(r, x, y, [0, 0, 255, 255]);
    pikselYaz(r, 1, 1, [0, 255, 0, 255]); // bağlı olmayan parça: kesime girmemeli
    return r;
  }

  it("işarete bağlı bölgeyi keser, yarıçap dışını ve kopuk parçayı almaz", () => {
    const k = basKes(govdeVeBas(), 0, 0, 21, 21, { x: 10, y: 10 }, 3)!;
    expect(k).not.toBeNull();
    expect(piksel(k.resim, k.R, k.R)![3]).toBe(255);
    expect(piksel(k.resim, k.R, k.R)![0]).toBe(255); // kırmızı baş
    expect(k.doluPiksel).toBeGreaterThan(10);
    expect(k.doluPiksel).toBeLessThan(40);
  });

  it("işaret çevresinde piksel yoksa null döner", () => {
    expect(basKes(bosResim(21, 21), 0, 0, 21, 21, { x: 10, y: 10 }, 3)).toBeNull();
  });

  it("gövde karesindeki kendi başı silip kesilen başı işarete oturtur", () => {
    const bas = basKes(govdeVeBas(), 0, 0, 21, 21, { x: 10, y: 10 }, 3)!;
    // hedef gövde: 21×21, yeşil baş bölgesi (5,5) çevresinde, mavi gövde altında
    const hedef = bosResim(21, 21);
    for (let y = 3; y <= 7; y++) for (let x = 3; x <= 7; x++) pikselYaz(hedef, x, y, [0, 255, 0, 255]);
    for (let y = 8; y <= 15; y++) for (let x = 4; x <= 6; x++) pikselYaz(hedef, x, y, [0, 0, 255, 255]);
    basYerlestir(hedef, { x: 5, y: 5 }, bas, 3);
    expect(piksel(hedef, 5, 5)![0]).toBe(255); // baş kırmızı oldu
    expect(piksel(hedef, 5, 12)![2]).toBe(255); // gövde yerinde
    expect(piksel(hedef, 3, 3)![1]).not.toBe(255); // eski yeşil baş köşesi silindi/örtüldü
  });
});

describe("Boyun köprüsü", () => {
  const CIZGI = [10, 10, 10] as const;
  const BOYA = [90, 160, 90, 255] as const;
  /** 20×30: altta gövde (y 20-29) + 2 px'lik boyun kütüğü (y 17-19), üstte `bosluk` px boşlukla 6×5 baş */
  function sahne(bosluk: number): { kare: Resim; bas: Uint8Array; kesik: Uint8Array } {
    const kare = bosResim(20, 30);
    for (let y = 20; y < 30; y++) for (let x = 5; x < 15; x++) pikselYaz(kare, x, y, BOYA);
    for (let y = 17; y < 20; y++) for (let x = 9; x < 11; x++) pikselYaz(kare, x, y, BOYA);
    const bas = new Uint8Array(20 * 30), kesik = new Uint8Array(20 * 30);
    const ust = 17 - bosluk - 5;
    for (let y = ust; y < ust + 5; y++) for (let x = 7; x < 13; x++) { pikselYaz(kare, x, y, [200, 60, 60, 255]); bas[y * 20 + x] = 1; }
    for (let y = 14; y < 17; y++) for (let x = 8; x < 12; x++) kesik[y * 20 + x] = 1; // silinen boyun bölgesi
    return { kare, bas, kesik };
  }
  const boyuAlfa = (r: Resim, x: number, y: number): number => piksel(r, x, y)![3];

  it("baş gövdeye değiyorsa dokunmaz", () => {
    const { kare, bas, kesik } = sahne(0);
    const once = kare.veri.slice();
    expect(boyunKoprusu(kare, bas, kesik, CIZGI, 5)).toBe("bagli");
    expect(Array.from(kare.veri)).toEqual(Array.from(once));
  });

  it("kopuk başı boyun kütüğünden başa kısa bir şeritle bağlar, kenarı çizgi renginde", () => {
    const { kare, bas, kesik } = sahne(4);
    expect(boyunKoprusu(kare, bas, kesik, CIZGI, 5)).toBe("koprulendi");
    for (let y = 13; y <= 16; y++) expect(boyuAlfa(kare, 10, y)).toBe(255); // boşluk dolu
    expect(piksel(kare, 10, 15)!.slice(0, 3)).toEqual([...BOYA.slice(0, 3)]); // dolgu gövde rengi
    const yan = [piksel(kare, 7, 15), piksel(kare, 12, 15), piksel(kare, 8, 15), piksel(kare, 11, 15)].filter((p) => p![3] === 255 && p![0] === 10);
    expect(yan.length).toBeGreaterThan(0); // en az bir kenar çizgi rengi
    // şeridin tamamı artık bağlı: yeniden çağrı "bagli" döner
    expect(boyunKoprusu(kare, bas, kesik, CIZGI, 5)).toBe("bagli");
  });

  it("belirleyicidir: aynı girdi aynı pikselleri verir", () => {
    const a = sahne(4), b = sahne(4);
    boyunKoprusu(a.kare, a.bas, a.kesik, CIZGI, 5);
    boyunKoprusu(b.kare, b.bas, b.kesik, CIZGI, 5);
    expect(Array.from(a.kare.veri)).toEqual(Array.from(b.kare.veri));
  });

  it("çok büyük boşluğu köprülemez", () => {
    const k = sahne(4);
    const kare = bosResim(20, 60);
    kare.veri.set(k.kare.veri); // üstte 30 satır boşluk bırakmak için baş kümesini yukarı taşı
    const bas = new Uint8Array(20 * 60);
    for (let y = 0; y < 3; y++) for (let x = 8; x < 12; x++) { pikselYaz(kare, x, y, [200, 60, 60, 255]); bas[y * 20 + x] = 1; }
    for (let x = 7; x < 13; x++) for (let y = 7; y < 12; y++) pikselYaz(kare, x, y, [0, 0, 0, 0]); // eski baş kalmasın
    expect(boyunKoprusu(kare, bas, new Uint8Array(20 * 60), CIZGI, 3)).toBe("atlandi");
  });

  it("basYerlestir: boyundan kopuk gelen baş cizgi verilince köprülenir", () => {
    const bas = basKes((() => { const r = bosResim(21, 21); for (let y = 8; y <= 12; y++) for (let x = 8; x <= 12; x++) pikselYaz(r, x, y, [255, 0, 0, 255]); return r; })(), 0, 0, 21, 21, { x: 10, y: 10 }, 3)!;
    const hedef = bosResim(21, 30);
    for (let y = 3; y <= 7; y++) for (let x = 3; x <= 7; x++) pikselYaz(hedef, x, y, [0, 255, 0, 255]); // eski baş (silinecek)
    for (let y = 15; y <= 28; y++) for (let x = 3; x <= 8; x++) pikselYaz(hedef, x, y, [0, 0, 255, 255]); // gövde, baştan ~6 px aşağıda
    expect(basYerlestir(hedef, { x: 5, y: 5 }, bas, 3, CIZGI)).toBe("koprulendi");
    expect(boyuAlfa(hedef, 5, 12)).toBe(255); // boşluk doldu
  });
});

describe("Kontrast güvencesi", () => {
  /** Verilen parlaklık düzeylerinde (gri) eşit sayıda piksel */
  function griResim(duzeyler: number[], adet = 50): Resim {
    const r = bosResim(duzeyler.length * adet, 1);
    duzeyler.forEach((l, i) => { for (let k = 0; k < adet; k++) pikselYaz(r, i * adet + k, 0, [l, l + 1, l + 2, 255]); });
    return r;
  }
  const CIZGI = [20, 16, 24] as const;

  it("yeterince yayılmış sayfaya dokunmaz", () => {
    expect(kontrastPlanla([griResim([80, 140, 200])], CIZGI)).toBeNull();
  });

  it("soluk (açık) paleti koyu uca doğru açar, sırayı korur, çizgi ve beyaza dokunmaz", () => {
    const r = griResim([170, 190, 200]);
    pikselYaz(r, 0, 0, [10, 10, 12, 255]); // çizgi
    pikselYaz(r, 1, 0, [255, 255, 255, 255]); // beyaz
    const plan = kontrastPlanla([r], CIZGI)!;
    expect(plan).not.toBeNull();
    expect(plan.capa).toBeGreaterThanOrEqual(190); // açık kart: çapa en açık uç
    kontrastUygula(r, plan);
    const y = dolguYuzdelikleri([r])!;
    expect(y.p95 - y.p5).toBeGreaterThanOrEqual(70); // 30 → 75 (katsayı üst sınırı 2,5)
    expect(piksel(r, 0, 0)!.slice(0, 3)).toEqual([10, 10, 12]);
    expect(piksel(r, 1, 0)!.slice(0, 3)).toEqual([255, 255, 255]);
    const [a, b, c] = [20, 70, 120].map((x) => piksel(r, x, 0)![0]);
    expect(a!).toBeLessThan(b!); expect(b!).toBeLessThan(c!); // parlaklık sırası bozulmadı
  });

  it("koyu-düz paleti açığa doğru açar ama en koyu dolgu çizgiden en az 38 birim açık kalır", () => {
    const r = griResim([60, 66, 72]);
    const plan = kontrastPlanla([r], CIZGI)!;
    kontrastUygula(r, plan);
    const y = dolguYuzdelikleri([r])!;
    expect(y.p95 - y.p5).toBeGreaterThanOrEqual(30); // 12 → 30 (katsayı üst sınırı 2,5)
    expect(y.p5).toBeGreaterThanOrEqual(60 - 2);
  });

  it("hedef kart aralığına göre [70,130] içinde ayarlanır", () => {
    expect(hedefAralik(null)).toBe(80);
    expect(hedefAralik({ p5: 70, p50: 120, p95: 130 })).toBe(70); // 60×0,8 = 48 → alt sınır
    expect(hedefAralik({ p5: 50, p50: 120, p95: 230 })).toBe(130); // 180×0,8 = 144 → üst sınır
    expect(hedefAralik({ p5: 60, p50: 120, p95: 190 })).toBe(104);
  });
});

describe("Shiny (hue-rotate + saturate)", () => {
  it("hue 0 ve doygunluk 1 birim matristir", () => {
    const m = shinyMatrisi(0, 1);
    [1, 0, 0, 0, 1, 0, 0, 0, 1].forEach((v, i) => expect(m[i]!).toBeCloseTo(v, 3));
    expect(renkKaydir(m, 200, 90, 30)).toEqual([200, 90, 30]);
  });

  it("hue-rotate(180) kırmızıyı belirtimdeki matrisle (0,109,109) yapar", () => {
    expect(renkKaydir(hueRotateMatrisi(180), 255, 0, 0)).toEqual([0, 109, 109]);
  });

  it("saturate(0) gri tona (0,213 R + 0,715 G + 0,072 B) iner", () => {
    const [r, g, b] = renkKaydir(saturateMatrisi(0), 200, 100, 50);
    const gri = Math.round(0.213 * 200 + 0.715 * 100 + 0.072 * 50);
    expect([r, g, b]).toEqual([gri, gri, gri]);
  });

  it("zincir sırası: önce hue-rotate, sonra saturate (M = S × H)", () => {
    const [r, g, b] = [180, 60, 20];
    const h = renkKaydir(hueRotateMatrisi(132), r, g, b);
    // ara sonuç 8 bite yuvarlandığı için ±2 tolerans
    const adim = renkKaydir(saturateMatrisi(1.3), h[0], h[1], h[2]);
    const tek = renkKaydir(shinyMatrisi(132, 1.3), r, g, b);
    tek.forEach((v, i) => expect(Math.abs(v - adim[i]!)).toBeLessThanOrEqual(3));
  });

  it("shinyUygula alfayı ve saydam pikselleri korur, rengi kaydırır", () => {
    const r = bosResim(2, 1);
    pikselYaz(r, 0, 0, [255, 0, 0, 255]);
    const s = shinyUygula(r, 120);
    expect(piksel(s, 1, 0)![3]).toBe(0);
    expect(piksel(s, 0, 0)![3]).toBe(255);
    expect(piksel(s, 0, 0)!.slice(0, 3)).not.toEqual([255, 0, 0]);
    expect(piksel(r, 0, 0)!.slice(0, 3)).toEqual([255, 0, 0]); // girdi değişmedi
  });
});

describe("yonBul", () => {
  it("hareket vektörünü SpriteCollab yön sırasına çevirir", () => {
    expect(YONLER[yonBul(0, 1)]).toBe("asagi");
    expect(YONLER[yonBul(1, 0)]).toBe("sag");
    expect(YONLER[yonBul(0, -1)]).toBe("yukari");
    expect(YONLER[yonBul(-1, 0)]).toBe("sol");
    expect(YONLER[yonBul(1, 1)]).toBe("asagiSag");
    expect(yonBul(0, 0, 3)).toBe(3);
  });
});

// Gerçek SpriteCollab verisi (.cache, git dışı): araç bir kez çalıştırılınca oluşur.
const GERCEK = join(KOK, ".cache", "spritecollab", "0005");
describe.skipIf(!existsSync(join(GERCEK, "Walk-Offsets.png")))("gerçek SpriteCollab verisi (Charmeleon)", () => {
  it("Walk sayfası: AnimData kare boyutuyla her karede dört işaret var", async () => {
    const veri = animDataOku(readFileSync(join(GERCEK, "AnimData.xml"), "utf8"));
    const walk = animCozumle(veri, "Walk")!;
    const offsets = await resimOku(join(GERCEK, "Walk-Offsets.png"));
    const isaret = isaretleriOku(offsets, walk.kareGenislik, walk.kareYukseklik);
    expect(isaret.length).toBe(8);
    expect(isaret[0]!.length).toBe(walk.sureler.length);
    for (const satir of isaret) for (const k of satir) expect(k.bas && k.merkez && k.solEl && k.sagEl).toBeTruthy();
  });
});
