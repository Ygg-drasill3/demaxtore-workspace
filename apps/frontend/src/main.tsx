// apps/frontend/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { queryClient } from "./lib/queryClient";
import { ToastHost } from "./components/ui/ToastHost";
import { ErrorBoundary } from "./components/system/ErrorBoundary";
import { MotionProvider } from "./motion";
import { clearChunkReloadFlag } from "./lib/lazyWithRetry";
import "./index.css";
import "./motion/motion.css";

// Expose build provenance for deploy verification (console, E2E, ops tooling).
window.__DMX_BUILD_INFO__ = __DMX_BUILD_INFO__;

// After deploy, stale tabs may reference deleted JS chunks — reload once (Vite + dynamic import).
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  if (!sessionStorage.getItem("dmx_chunk_reload")) {
    sessionStorage.setItem("dmx_chunk_reload", "1");
    window.location.reload();
  }
});
clearChunkReloadFlag();
import "@fontsource/inter-tight/400.css";
import "@fontsource/inter-tight/500.css";
import "@fontsource/inter-tight/600.css";
import "@fontsource/inter-tight/700.css";
import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/700.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MotionProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
          <ToastHost />
        </BrowserRouter>
      </MotionProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
