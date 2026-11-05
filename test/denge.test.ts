import { describe, expect, it } from "vitest";
import { AYAR } from "../src/paylasilan/kurallar/ayar.ts";
import { turnuva } from "./denge/turnuva.ts";

// Bot turnuvası duman testi (tam koşu: npx tsx test/denge/botTurnuvasi.ts). Küçük n: yalnız çalışır, sonuçlar
// anlamlı biçimde ve maçlar sınırlı. Ayar yaması sonunda geri alınır.
describe("bot turnuvası (duman)", () => {
  it("küçük turnuva tamamlanır; maçlar ≤ 120 s; dağılımlar toplamı tutar; ayar geri alınır", () => {
    const r = turnuva({ nDuello: 2, nRastgeleMac: 4, nReferansMac: 1, tohum: 3, ayar: { kH: 0.008 } });
    expect(r.duelloMatrisi).toHaveLength(16);
    expect(r.referansMacMatrisi).toHaveLength(16);
    expect(r.maclar).toBe(16 + 4);
    expect(r.macSuresi.enFazla).toBeLessThanOrEqual(AYAR.mac.mutlakSinir);
    const b = r.bitis;
    expect(b.durma + b.ringOut + b.parcalanma + b.berabere + b.sure).toBe(b.toplam);
    expect(b.toplam).toBeGreaterThan(r.maclar);
    expect(AYAR.kH).toBe(0.006);
  });
});
