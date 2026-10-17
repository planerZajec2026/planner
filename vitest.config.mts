import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    setupFiles: ["./vitest.setup.ts"],
    projects: [
      // Pure logic needs no DOM; only component tests pay for jsdom.
      { extends: true, test: { name: "unit", environment: "node", include: ["src/**/*.test.ts"] } },
      { extends: true, test: { name: "component", environment: "jsdom", include: ["src/**/*.test.tsx"] } },
    ],
  },
});
