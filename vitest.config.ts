import { defineConfig } from "vitest/config";

// vitest kendi yapılandırmasını kullanır; vite.config.ts'teki Colyseus eklentisi test ortamına girmez.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
