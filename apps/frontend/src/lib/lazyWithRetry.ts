import { lazy, type LazyExoticComponent } from "react";

const CHUNK_RELOAD_KEY = "dmx_chunk_reload";

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("importing a module script failed") ||
    msg.includes("error loading dynamically imported module")
  );
}

/** Reload once when a lazy chunk 404s after deploy (stale main bundle in browser). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry(factory: () => Promise<{ default: any }>): LazyExoticComponent<any> {
  return lazy(() =>
    factory().catch((error: unknown) => {
      if (isChunkLoadError(error) && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
        window.location.reload();
        return new Promise(() => {});
      }
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      throw error;
    }),
  );
}

export function clearChunkReloadFlag(): void {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
}
