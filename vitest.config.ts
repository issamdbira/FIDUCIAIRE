import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
    },
  },
  test: {
    include: ["client/src/**/*.test.ts", "server/**/*.test.ts"],
    // tests-e2e = suite E2E RÉELLE (base vivante, config dédiée vitest.e2e.config.ts)
    exclude: ["server/tests-e2e/**", "node_modules/**"],
    environment: "node",
  },
});
