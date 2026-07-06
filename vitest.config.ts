import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      thresholds: {
        "src/domain/**": { lines: 98, functions: 100, branches: 98, statements: 98 },
        "src/store/**": { lines: 97, functions: 96, branches: 92, statements: 97 },
        "src/utils/id/index.ts": { lines: 100, functions: 100, branches: 100, statements: 100 },
        "src/utils/csv/index.ts": { lines: 97, functions: 95, branches: 90, statements: 97 },
      },
    },
  },
});
