import { defineConfig } from "vitest/config";
import path from "node:path";

// Suite E2E RÉELLE — nécessite une base PostgreSQL vivante (DATABASE_URL).
// Exécution : DATABASE_URL=postgresql://... npx vitest run --config vitest.e2e.config.ts
// Ne JAMAIS l'inclure dans la suite CI unitaire (Prisma mocké).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
    },
  },
  test: {
    include: ["server/tests-e2e/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 120_000,
    pool: "forks", // isolation stricte : le serveur importé démarre un listener
    poolOptions: { forks: { singleFork: true } }, // ordre des tests = parcours métier
  },
});
