import path from "path";
import { defineConfig } from "vitest/config";

// Database integration suite — real Postgres/PostgREST via `supabase start`.
// Separate from vitest.config.ts so `pnpm test` never requires a database.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/db/**/*.test.ts"],
    // Tests share one database; serial files keep assertions deterministic.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@5pixels/shared": path.resolve(
        __dirname,
        "../../packages/shared/src/index.ts"
      ),
    },
  },
});
