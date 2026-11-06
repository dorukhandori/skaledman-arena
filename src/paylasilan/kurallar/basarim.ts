import { BASARIMLAR } from "../veri/katalog.ts";
import type { Basarim } from "../veri/semalar.ts";
import type { BitisTuru } from "../sim/durum.ts";

// Başarım değerlendirmesi (tuning § 21 olay sözlüğü + koşul anahtarları, 03 US-4.1/4.2, flint § 5, nile B-19, B-33):
// SAF `basarimIsle(girdi, mevcut)`. Sunucu maç sonunda sim olaylarından çıkardığı maç özetini (MacOzeti) ve oyuncunun
// kalıcı durumunu verir; dönen değişimleri aynı SQLite işleminde yazar. İstemci hiçbir sayaç göndermez.
// Kapılar: `ilkSurum:false` pasif · tamamlanan yeniden sayılmaz · sayılmayan maç (teslim/hükmen/iptal, aynı çift günde
// 3'ten sonra) hiçbir maç sayacını işletmez · oda maçı yalnız Sosyal · bot maçı yalnız Yol · durum sayaçları
// (Çekirdek seviyesi, Yapay ömrü, parça sayısı) moddan bağımsız (kalıcı durumdan türer).

export interface BitisKaydi {
  /** bu oyuncunun yaptığı bitiş (rakip topaç bitti, puan bu oyuncuya) */
  tur: BitisTuru;
  /** maç saati (sn, geri sayım hariç) */
  macSn: number;
  /** bitişten önceki son isabetli yetenek (bu oyuncudan, biten topaca): yetenek numarası ve geçen süre (sn) */
  yetenekNo: number | null;
  yetenekGecenSn: number | null;
  /** bitiş anında bu oyuncunun alanı etkindi ve biten topaç içindeydi: alanın yetenek numarası */
  alanNo: number | null;
  /** bitişten önceki son çarpışma bu oyuncunun dash çarpışmasıydı (pencere içinde) */
  dash: boolean;
  /** maçı bitiren puan */
  macKazandiran: boolean;
}

export type OzetModu = "hizli" | "dereceli" | "oda" | "bot" | "harita";

/** Bir oyuncunun gözünden maç özeti (sunucu sim olaylarından çıkarır). */
export interface MacOzeti {
  mod: OzetModu;
  /** sayılan maç mı (teslim/hükmen/iptal, çift tavanı, misafir → false) */
  sayildi: boolean;
  kazandi: boolean;
  sureSn: number;
  bitisler: BitisKaydi[];
  /** maç boyunca sahadaki topacın gördüğü en düşük Stamina oranı (tur fazı) */
  enAzStaminaOran: number;
  /** maç sonunda sahadaki topacın Stamina oranı */
  bitisStaminaOrani: number;
  /** maç sonunda takımın toplam Stamina oranı */
  kalanStaminaOrani: number;
  /** alınan darbe: bu oyuncunun hasar aldığı çarpışma + yetenek isabeti */
  alinanCarpisma: number;
  ozelYetenekSayisi: number;
  /** maç içinde en çok kaç puan gerideydi */
  enCokGeriPuan: number;
  /** hız şeridinde (kuşak) geçen süre, sn */
  kusakSn: number;
  zitElementCarpisma: number;
  /** bu oyuncunun çarpışmalarının maç saatleri (sn); zincir penceresi için */
  carpismaSnleri: number[];
  /** maç ani ölüme girdi mi */
  aniOlum: boolean;
  /** sahaya çıkan, sahip olunan (ödünç değil) Çekirdekler */
  cekirdekler: { tanimId: string; element: string; koken: string }[];
  takimUltisi: boolean;
  rakipId: number | null;
  /** oda maçında odayı açan */
  evSahibi: boolean;
  /** Kick yayını canlıyken destek kanalı maçı (Kick D8 sonrası: sunucu şimdilik hep false verir) */
  destekKanaliCanli: boolean;
  /** Harita (05 § 3): düğüm zorluğu ve günün ilk 10 harita maçından biri mi */
  dugumZorluk?: number;
  haritaSayilan?: boolean;
}

export interface BasarimGirdisi {
  mac?: MacOzeti;
  /** kalıcı durum (moddan bağımsız) */
  durum?: { enYuksekSeviye?: number; yapayOmurBitti?: number; parcaCesidi?: number; kararmaDoldu?: number };
  /** maç dışı olaylar */
  olay?: { antrenmanBitti?: boolean; yapayYenileme?: number; karanlikGeriDonus?: number };
}

export interface BasarimKaydi { ilerleme: number; tamam: boolean; kume?: readonly string[] }

export interface BasarimDegisimi {
  id: string;
  onceki: number;
  ilerleme: number;
  sayi: number;
  /** bu çağrıda tamamlandı */
  tamamlandi: boolean;
  /** küme sayaçlarına (farklı Çekirdek, element, rakip, alan yeteneği) eklenen anahtarlar */
  yeniKume: string[];
}

/** Durum sayaçları: moddan ve maçın sayılmasından bağımsız (kalıcı durumdan). */
const DURUM_OLAYLARI = new Set(["cekirdekSeviye", "yapayOmurBitti", "parcaSahip", "kararmaSayaciDoldu"]);
const OLAY_OLAYLARI = new Set(["antrenmanBitti", "yapayYenileme", "karanlikModdanGeriDonus"]);
/** Bot maçı (nile B-19) hızlı maç kuyruğundan gelir: `mod` koşulunda "hizli" sayılır. */
const modUyar = (m: OzetModu, liste: unknown): boolean => {
  if (!Array.isArray(liste)) return true;
  return liste.includes(m === "bot" ? "hizli" : m);
};

/** Bu başarım bu maçta sayılabilir mi (mod / kategori kapısı). */
export function macKapisi(b: Basarim, m: MacOzeti): boolean {
  if (!m.sayildi) return false;
  if (m.mod === "oda") return b.kategori === "sosyal";
  if (m.mod === "bot") return b.kategori === "yol";
  // harita: yalnız `haritaZorlukMin` taşıyan başarım, o zorluk ve üstündeki düğümde, günün sayılan maçında
  if (m.mod === "harita") return b.haritaZorlukMin !== undefined && (m.dugumZorluk ?? 0) >= b.haritaZorlukMin && m.haritaSayilan === true;
  return true;
}

/** `macKazanildi` koşul anahtarları. */
function kazanmaKosulu(k: Basarim["sart"]["kosul"], m: MacOzeti): boolean {
  const s = (a: string) => k[a] as number | undefined;
  if (!modUyar(m.mod, k["mod"])) return false;
  if (s("sureMaxSn") !== undefined && m.sureSn > s("sureMaxSn")!) return false;
  if (s("kalanStaminaMinOran") !== undefined && m.kalanStaminaOrani < s("kalanStaminaMinOran")!) return false;
  if (s("enAzStaminaOran") !== undefined && !(m.enAzStaminaOran < s("enAzStaminaOran")!)) return false;
  if (s("bitisStaminaMaxOran") !== undefined && m.bitisStaminaOrani > s("bitisStaminaMaxOran")!) return false;
  if (typeof k["cekirdekElementi"] === "string" && !m.cekirdekler.some((c) => c.element === k["cekirdekElementi"])) return false;
  if (typeof k["cekirdekKoken"] === "string" && !m.cekirdekler.some((c) => c.koken === k["cekirdekKoken"])) return false;
  if (s("puanGeriden") !== undefined && m.enCokGeriPuan < s("puanGeriden")!) return false;
  if (s("alinanCarpisma") !== undefined && m.alinanCarpisma > s("alinanCarpisma")!) return false;
  if (k["ozelYetenekKullanilmadi"] === true && m.ozelYetenekSayisi > 0) return false;
  return true;
}

/** Kayan pencerede (sn) en çok olay sayısı (saatler artan sırada gelmeyebilir). */
export function pencereEnCok(saatler: readonly number[], pencereSn: number): number {
  const s = [...saatler].sort((a, b) => a - b);
  let en = 0;
  let bas = 0;
  for (let i = 0; i < s.length; i++) {
    while (s[i]! - s[bas]! > pencereSn) bas++;
    en = Math.max(en, i - bas + 1);
  }
  return en;
}

type Sonuc = { tur: "artis"; n: number } | { tur: "deger"; n: number } | { tur: "sifirla" } | { tur: "kume"; anahtarlar: string[] } | null;

/** Tek başarımın bu girdiden payı (kapılar dışarıda). */
function olayPayi(b: Basarim, g: BasarimGirdisi): Sonuc {
  const k = b.sart.kosul;
  const m = g.mac;
  const d = g.durum ?? {};
  const o = g.olay ?? {};
  switch (b.sart.olay) {
    // ---- maç dışı / durum ----
    case "antrenmanBitti": return o.antrenmanBitti ? { tur: "artis", n: 1 } : null;
    case "yapayYenileme": return o.yapayYenileme ? { tur: "artis", n: o.yapayYenileme } : null;
    case "karanlikModdanGeriDonus": return o.karanlikGeriDonus ? { tur: "artis", n: o.karanlikGeriDonus } : null;
    case "cekirdekSeviye": return d.enYuksekSeviye !== undefined && d.enYuksekSeviye >= Number(k["seviye"] ?? 1) ? { tur: "deger", n: 1 } : null;
    case "yapayOmurBitti": return d.yapayOmurBitti ? { tur: "artis", n: d.yapayOmurBitti } : null;
    case "parcaSahip": return d.parcaCesidi !== undefined ? { tur: "deger", n: d.parcaCesidi } : null;
    case "kararmaSayaciDoldu": return d.kararmaDoldu ? { tur: "artis", n: d.kararmaDoldu } : null;
  }
  if (!m) return null;
  switch (b.sart.olay) {
    case "macKazanildi": return m.kazandi && kazanmaKosulu(k, m) ? { tur: "artis", n: 1 } : null;
    case "macOynandi": return modUyar(m.mod, k["mod"]) ? { tur: "artis", n: 1 } : null;
    case "farkliCekirdekKazanma": return m.kazandi && m.cekirdekler.length ? { tur: "kume", anahtarlar: m.cekirdekler.map((c) => c.tanimId) } : null;
    case "altiElementKazanma": return m.kazandi && m.cekirdekler.length ? { tur: "kume", anahtarlar: m.cekirdekler.map((c) => c.element) } : null;
    case "bitisYap": {
      if (k["kazandi"] === true && !m.kazandi) return null;
      const n = m.bitisler.filter((x) => x.tur === k["tur"]).length;
      return n ? { tur: "artis", n } : null;
    }
    case "tekMacBitisCesidi": return { tur: "deger", n: new Set(m.bitisler.map((x) => x.tur)).size };
    case "galibiyetSerisi": return m.kazandi ? { tur: "artis", n: 1 } : { tur: "sifirla" };
    case "zitElementCarpisma": return m.zitElementCarpisma ? { tur: "artis", n: m.zitElementCarpisma } : null;
    case "kusakSuresi": {
      if (k["kazandi"] === true && !m.kazandi) return null;
      return k["tekMac"] === true ? { tur: "deger", n: Math.floor(m.kusakSn) } : { tur: "artis", n: Math.floor(m.kusakSn) };
    }
    case "takimUltisi": return m.takimUltisi ? { tur: "artis", n: 1 } : null;
    case "alanYetenegiyleBitis": {
      const alanlar = m.bitisler.filter((x) => x.alanNo !== null).map((x) => String(x.alanNo));
      if (!alanlar.length) return null;
      return k["farkliYetenek"] === true ? { tur: "kume", anahtarlar: alanlar } : { tur: "artis", n: alanlar.length };
    }
    case "yetenegiyleBitis": {
      const sinir = Number(k["yetenekSonrasiMaxSn"] ?? Infinity);
      const n = m.bitisler.filter((x) => x.yetenekGecenSn !== null && x.yetenekGecenSn <= sinir).length;
      return n ? { tur: "artis", n } : null;
    }
    case "dashCarpismasiylaBitis": {
      const n = m.bitisler.filter((x) => x.dash).length;
      return n ? { tur: "artis", n } : null;
    }
    case "zincirCarpisma": {
      const n = pencereEnCok(m.carpismaSnleri, Number(k["pencereSn"] ?? 6));
      return k["tekMac"] === true ? { tur: "deger", n } : { tur: "artis", n };
    }
    case "destekKanaliMaci": return m.destekKanaliCanli ? { tur: "artis", n: 1 } : null;
    case "odaMaci": return m.mod === "oda" ? { tur: "kume", anahtarlar: m.rakipId !== null ? [String(m.rakipId)] : [] } : null;
    case "odaAc": return m.mod === "oda" && m.evSahibi ? { tur: "artis", n: 1 } : null;
    case "puanKazan": {
      const ar = k["macSnAraligi"] as number[] | undefined;
      const n = m.bitisler.filter((x) => (k["macKazandiran"] !== true || x.macKazandiran) && (!ar || (x.macSn >= ar[0]! && x.macSn <= ar[1]!))).length;
      return n ? { tur: "artis", n } : null;
    }
    case "aniOlumKazan": return m.kazandi && m.aniOlum ? { tur: "artis", n: 1 } : null;
  }
  return null;
}

/** Değerlendirilen olaylar (46 başarımın tamamı bu sözlükten; bilinmeyen olay testte yakalanır). */
export const OLAY_SOZLUGU = [
  "antrenmanBitti", "macKazanildi", "macOynandi", "farkliCekirdekKazanma", "altiElementKazanma", "cekirdekSeviye", "bitisYap",
  "tekMacBitisCesidi", "galibiyetSerisi", "zitElementCarpisma", "kusakSuresi", "takimUltisi", "alanYetenegiyleBitis",
  "yetenegiyleBitis", "dashCarpismasiylaBitis", "zincirCarpisma", "kararmaSayaciDoldu", "karanlikModdanGeriDonus",
  "destekKanaliMaci", "odaMaci", "odaAc", "yapayOmurBitti", "yapayYenileme", "puanKazan", "aniOlumKazan", "parcaSahip",
] as const;

/** Değerlendir: değişen başarımlar (dosya sırası). `mevcut`: oyuncunun kaydı (yoksa 0). */
export function basarimIsle(g: BasarimGirdisi, mevcut: Readonly<Record<string, BasarimKaydi>>, liste: readonly Basarim[] = BASARIMLAR): BasarimDegisimi[] {
  const cikti: BasarimDegisimi[] = [];
  for (const b of liste) {
    if (!b.ilkSurum) continue;
    const kayit = mevcut[b.id];
    if (kayit?.tamam) continue;
    const durumOlayi = DURUM_OLAYLARI.has(b.sart.olay);
    const disOlay = OLAY_OLAYLARI.has(b.sart.olay);
    if (!durumOlayi && !disOlay && (!g.mac || !macKapisi(b, g.mac))) continue;
    const p = olayPayi(b, g);
    if (!p) continue;
    const onceki = kayit?.ilerleme ?? 0;
    const sayi = b.sart.sayi;
    let ilerleme = onceki;
    let yeniKume: string[] = [];
    if (p.tur === "artis") ilerleme = onceki + p.n;
    else if (p.tur === "deger") ilerleme = Math.max(onceki, p.n);
    else if (p.tur === "sifirla") ilerleme = 0;
    else {
      const k = new Set(kayit?.kume ?? []);
      yeniKume = [...new Set(p.anahtarlar)].filter((a) => !k.has(a));
      if (b.sart.olay === "odaMaci") ilerleme = onceki + 1; // oda maçı sayısı; farklı rakip ayrıca kümede
      else ilerleme = k.size + yeniKume.length;
    }
    ilerleme = Math.min(sayi, ilerleme);
    let tamam = ilerleme >= sayi;
    if (b.sart.olay === "odaMaci") {
      const enAz = Number(b.sart.kosul["enAzFarkliRakip"] ?? 0);
      tamam = tamam && (kayit?.kume?.length ?? 0) + yeniKume.length >= enAz;
    }
    if (ilerleme === onceki && !yeniKume.length && !tamam) continue;
    cikti.push({ id: b.id, onceki, ilerleme, sayi, tamamlandi: tamam, yeniKume });
  }
  return cikti;
}

/** Görünüm için: gizli ve tamamlanmamış başarım "???" (ipucu yok). */
export function basarimGorunurMu(b: Basarim, tamam: boolean): boolean {
  return !b.gizli || tamam;
}

export const KATEGORI_AD: Record<string, string> = {
  yol: "Yol", bitis: "Bitiş", element: "Element", risk: "Risk", gosteri: "Gösteri", kararma: "Kararma", sosyal: "Sosyal", yapay: "Yapay", gizli: "Gizli",
};
export const KATEGORI_SIRASI = ["yol", "bitis", "element", "risk", "gosteri", "kararma", "sosyal", "yapay", "gizli"] as const;

const BITIS_ADI: Record<string, string> = { ringOut: "Ring Out", parcalanma: "Parçalanma", durma: "Durma" };
const ELEMENT_ADI: Record<string, string> = { kor: "Kor", kasirga: "Kasırga", simsek: "Şimşek", girdap: "Girdap", kaya: "Kaya", don: "Don" };
const KOKEN_ADI: Record<string, string> = { goktasi: "Göktaşı", maden: "Maden", yapay: "Yapay", karanlik: "Karanlık" };

/** Oyuncuya şart metni (veriden türetilir; "sen" dili, ux § 7). */
export function basarimAciklama(b: Basarim): string {
  const k = b.sart.kosul;
  const n = b.sart.sayi;
  const kez = n > 1 ? `${n} kez ` : "";
  switch (b.sart.olay) {
    case "antrenmanBitti": return "Antrenman eğitimini bitir.";
    case "macKazanildi": {
      if (typeof k["cekirdekElementi"] === "string") return `${ELEMENT_ADI[k["cekirdekElementi"]] ?? k["cekirdekElementi"]} Çekirdekle ${n} maç kazan.`;
      if (typeof k["cekirdekKoken"] === "string") return `${KOKEN_ADI[k["cekirdekKoken"]] ?? k["cekirdekKoken"]} Çekirdekle ${n} maç kazan.`;
      if (k["sureMaxSn"] !== undefined) return `Bir maçı ${k["sureMaxSn"]} saniyeden kısa sürede kazan.`;
      if (k["kalanStaminaMinOran"] !== undefined) return `Takım Staminası en az %${Math.round(Number(k["kalanStaminaMinOran"]) * 100)} kalarak ${n} maç kazan.`;
      if (k["enAzStaminaOran"] !== undefined) return `Staminan %${Math.round(Number(k["enAzStaminaOran"]) * 100)}'un altına düştüğü bir maçı kazan.`;
      if (k["bitisStaminaMaxOran"] !== undefined) return `Son puanı Staminan %${Math.round(Number(k["bitisStaminaMaxOran"]) * 100)} ya da altındayken alarak kazan.`;
      if (k["puanGeriden"] !== undefined) return `${k["puanGeriden"]} puan gerideyken maçı çevir.`;
      if (k["alinanCarpisma"] !== undefined) return "Hiç darbe almadan bir maç kazan.";
      if (k["ozelYetenekKullanilmadi"] === true) return `Özel Yetenek kullanmadan ${n} maç kazan.`;
      return n > 1 ? `${n} maç kazan.` : "Bir maç kazan.";
    }
    case "macOynandi": return `${n} maç oyna.`;
    case "farkliCekirdekKazanma": return `${n} farklı Çekirdekle birer maç kazan.`;
    case "altiElementKazanma": return "Altı elementin her biriyle en az bir maç kazan.";
    case "cekirdekSeviye": return `Bir Çekirdeği Lv.${k["seviye"]} seviyesine çıkar.`;
    case "bitisYap": return `Kazandığın maçlarda ${n} ${BITIS_ADI[String(k["tur"])] ?? k["tur"]} yap.`;
    case "tekMacBitisCesidi": return "Tek maçta üç bitiş türünü de yap (Durma, Ring Out, Parçalanma).";
    case "galibiyetSerisi": return `Üst üste ${n} maç kazan.`;
    case "zitElementCarpisma": return `Karşıt elementle ${n} çarpışma yap.`;
    case "kusakSuresi": return `Bir maçta hız şeridinde ${n} saniye kal ve kazan.`;
    case "takimUltisi": return "Takım Ultisini bir kez gerçekleştir.";
    case "alanYetenegiyleBitis": return `${n} farklı alan yeteneğiyle bitiş yap.`;
    case "yetenegiyleBitis": return `Yetenek isabetinden sonraki ${k["yetenekSonrasiMaxSn"] ?? 3} saniye içinde ${n} bitiş yap.`;
    case "dashCarpismasiylaBitis": return `Dash çarpışmasıyla ${n} bitiş yap.`;
    case "zincirCarpisma": return `Bir maçta ${k["pencereSn"] ?? 6} saniye içinde ${n} çarpışma yap.`;
    case "kararmaSayaciDoldu": return "Kararma sayacını doldur.";
    case "karanlikModdanGeriDonus": return `Karanlık modundan ${kez}geri dön.`;
    case "destekKanaliMaci": return `Destek kanalın yayındayken ${n} maç oyna.`;
    case "odaMaci": return `Oda koduyla ${n} maç oyna (en az ${k["enAzFarkliRakip"] ?? 1} farklı rakip).`;
    case "odaAc": return `${n} oda aç ve maç oynat.`;
    case "yapayOmurBitti": return "Bir Yapay Çekirdeğin ömrünü bitir.";
    case "yapayYenileme": return `Dökümhane'de ${n} kez Yapay yenile.`;
    case "puanKazan": return "Maçı bitiren puanı son iki saniyede al.";
    case "aniOlumKazan": return `Ani ölümde ${n} maç kazan.`;
    case "parcaSahip": return `${n} parçanın hepsine sahip ol.`;
  }
  return "";
}
