import { rastgele } from "../../paylasilan/sim/rastgele.ts";

/**
 * Süs (efekt) üreteci: Math.random yerine tohumlu sayaç (05 § 3.3). Sim'e GİRMEZ; yalnız parçacık, sarsıntı gürültüsü,
 * perde gibi görsel/işitsel çeşitlilik içindir. Tohumlu olduğu için kayıt oynatma ve ekran görüntüsü tekrarlanabilir.
 */
export class SusRastgele {
  private sira = 0;
  constructor(private tohum: number) {}

  /** [0, 1) */
  sayi(): number {
    return rastgele(this.tohum, this.sira++);
  }

  /** [a, b) */
  aralik(a: number, b: number): number {
    return a + (b - a) * this.sayi();
  }

  /** [−1, 1) */
  isaretli(): number {
    return this.sayi() * 2 - 1;
  }
}
