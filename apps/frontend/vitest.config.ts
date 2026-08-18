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
    // The app servers export NODE_ENV=production. Vitest only defaults NODE_ENV to
    // "test" when it is unset, so React would load its production build and every
    // render would fail with "act(...) is not supported in production builds".
    env: { NODE_ENV: "test" },
    // Our suites all live under src/. Without this, a stray dependency tree in the app
    // folder (anything not literally named node_modules) gets collected and every
    // third-party library's own tests run and fail.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.build-*/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx", "src/test/**", "**/*.d.ts"],
    },
  },
});
