import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      // The real package unconditionally throws outside Next's own build
      // (it relies on webpack/turbopack's "react-server" export condition
      // to pick its no-op branch); swap in that same no-op for tests.
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // Restrict to tests/ so Vitest's default *.spec.ts glob doesn't also
    // pick up e2e/*.spec.ts (Playwright specs, a different test runner).
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
  },
});
