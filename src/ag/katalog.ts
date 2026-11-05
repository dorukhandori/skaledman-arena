import parcalarHam from "../../veri/parcalar.json";
import ruhlarHam from "../../veri/ruhlar.json";
import yeteneklerHam from "../../veri/yetenekler.json";
import { AYAR, ELEMENT_EGILIM, KOKEN_PASIF } from "../paylasilan/kurallar/ayar.ts";
import { Fnv64 } from "../paylasilan/sim/hash.ts";

// Katalog özeti (axiom § 2 #23): sim'i etkileyen veri JSON'larının FNV-1a 64 hash'i. Paket derlenirken istemci ve
// sunucu aynı JSON'u gömer; istemci katılmada kendi özetini yollar, uyuşmazsa sunucu reddeder ("sayfayı yenile").
// JSON.stringify anahtar sırası dosya sırasıdır (iki tarafta aynı dosya → aynı metin).
// FIZIK-1: sim sabitleri (`ayar.ts`: AYAR, ELEMENT_EGILIM, KOKEN_PASIF) de özete girer; yalnız `ayar.ts`'te değişen bir
// sim kuralı da eski paketli istemciyi katılmada reddettirir (DENGE-2 § 5 madde 6). Wire şeması değişmediği için
// PROTOKOL_SURUMU aynı kalır; seyirci sim koşmaz (yalnız sunucu durumunu gösterir), ona özet gerekmez.

function ozet(): string {
  const h = new Fnv64();
  const metin = JSON.stringify([parcalarHam, ruhlarHam, yeteneklerHam, AYAR, ELEMENT_EGILIM, KOKEN_PASIF]);
  for (let i = 0; i < metin.length; i++) {
    const c = metin.charCodeAt(i);
    h.bayt(c & 0xff);
    h.bayt(c >> 8);
  }
  return h.hex();
}

export const KATALOG_OZETI = ozet();
