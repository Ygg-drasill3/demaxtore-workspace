import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";
import { visualizer } from "rollup-plugin-visualizer";
import { nodePolyfills } from "vite-plugin-node-polyfills";

function readBuildInfo() {
  try {
    const p = path.resolve(__dirname, "../../packages/build-info/build-info.json");
    return JSON.parse(fs.readFileSync(p, "utf8")) as {
      commitSha: string;
      branch: string;
      buildTime: string;
    };
  } catch {
    return { commitSha: "unknown", branch: "unknown", buildTime: "" };
  }
}

function buildInfoPlugin(info: { commitSha: string; branch: string; buildTime: string }): Plugin {
  const json = JSON.stringify(info, null, 2);
  return {
    name: "dmx-build-info",
    transformIndexHtml(html: string) {
      const tags = [
        `<meta name="dmx-commit-sha" content="${info.commitSha}" />`,
        `<meta name="dmx-branch" content="${info.branch}" />`,
        `<meta name="dmx-build-time" content="${info.buildTime}" />`,
      ].join("\n    ");
      return html.replace("</head>", `    ${tags}\n  </head>`);
    },
    generateBundle(this: import("rollup").PluginContext) {
      this.emitFile({ type: "asset", fileName: "version.json", source: json });
    },
  };
}

function loginStaticPlugin(): Plugin {
  const loginRoot = path.resolve(__dirname, "../../login-static");
  const mime: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".json": "application/json",
    ".ico": "image/x-icon",
    ".png": "image/png",
  };

  return {
    name: "dmx-login-static",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        const isLogin =
          url === "/login" || url === "/login/" ||
          url.startsWith("/login/") ||
          url === "/register" || url.startsWith("/register") ||
          url === "/forgot-password" || url.startsWith("/forgot-password");
        if (!isLogin) return next();

        let rel = url.replace(/^\/(login|register|forgot-password)\/?/, "") || "index.html";
        if (rel === "" || rel.endsWith("/")) rel = "index.html";
        const filePath = path.normalize(path.join(loginRoot, rel));
        if (!filePath.startsWith(loginRoot) || !fs.existsSync(filePath)) {
          const fallback = path.join(loginRoot, "index.html");
          if (!fs.existsSync(fallback)) return next();
          res.setHeader("Content-Type", "text/html");
          res.end(fs.readFileSync(fallback));
          return;
        }
        const ext = path.extname(filePath);
        res.setHeader("Content-Type", mime[ext] ?? "application/octet-stream");
        res.end(fs.readFileSync(filePath));
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const buildInfo = readBuildInfo();
  return {
  plugins: [
    react(),
    loginStaticPlugin(),
    buildInfoPlugin(buildInfo),
    nodePolyfills({ include: ["buffer", "stream", "util", "process"] }),
    visualizer({ filename: "dist/stats.html", gzipSize: true, open: false }),
  ] as import("vite").PluginOption[],
  define: {
    __DMX_BUILD_INFO__: JSON.stringify(buildInfo),
  },
  resolve: {
    alias: {
      "@":              path.resolve(__dirname, "./src"),
      "@dmx/contracts": path.resolve(__dirname, "../../packages/contracts/src"),
    },
  },
  build: {
    minify: "esbuild",
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          query: ["@tanstack/react-query"],
          socket: ["socket.io-client"],
          motion: ["framer-motion"],
        },
      },
    },
  },
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      "/api":       { target: process.env.VITE_DEV_API_PROXY ?? "http://localhost:3001", changeOrigin: true },
      "/socket.io": { target: process.env.VITE_DEV_API_PROXY ?? "http://localhost:3001", changeOrigin: true, ws: true },
    },
  },
  };
});
