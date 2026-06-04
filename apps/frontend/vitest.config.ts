// apps/frontend/vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()] as import("vite").PluginOption[],
  resolve: {
    alias: {
      "@":              path.resolve(__dirname, "./src"),
      "@dmx/contracts": path.resolve(__dirname, "../../packages/contracts/src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx", "src/test/**", "**/*.d.ts"],
    },
  },
});
