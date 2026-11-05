import { defineConfig } from "vitest/config";

// vitest kendi yapılandırmasını kullanır; vite.config.ts'teki Colyseus eklentisi test ortamına girmez.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // D3: sim adımı yetenek/Enerji ile ağırlaştı; yük altında (tarayıcı koşusu) 5 s varsayılanı yetmiyor
    testTimeout: 30_000,
  },
});
