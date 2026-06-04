import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()] as import("vite").PluginOption[],
  resolve: {
    alias: {
      "@":              path.resolve(__dirname, "./src"),
      "@dmx/contracts": path.resolve(__dirname, "../../packages/contracts/src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    // Vite 5+ blocks unknown hosts by default. Allow Emergent preview hosts.
    allowedHosts: true,
    // Same-origin /api + /socket.io routing so the same URL works in localhost
    // dev (here Vite proxies to the Node backend) AND in production behind the
    // Kubernetes ingress (which routes by path prefix to the backend service).
    proxy: {
      "/api":       { target: "http://localhost:8001", changeOrigin: true },
      "/socket.io": { target: "http://localhost:8001", changeOrigin: true, ws: true },
    },
  },
});
