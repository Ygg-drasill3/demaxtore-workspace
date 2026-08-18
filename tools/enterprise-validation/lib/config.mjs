function resolveApiBase() {
  const raw = process.env.EV_API_URL?.trim();
  if (!raw) {
    throw new Error(
      "EV_API_URL is required (e.g. http://127.0.0.1:3001). " +
        "Do not use port 8001 — that is the FreightIQ service, not DeMaxtore backend.",
    );
  }
  return raw.replace(/\/$/, "");
}

export const API_BASE = resolveApiBase();
export const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://dmx:dmx_dev@127.0.0.1:5432/dmx?schema=public";
export const QUICK = process.env.EV_QUICK === "1";
export const RESULTS_DIR = new URL("../results/", import.meta.url).pathname;

export const USERS = {
  admin: { email: "admin@demaxtore.local", password: "Passw0rd!" },
  buyer1: { email: "buyer1@acme.test", password: "Passw0rd!" },
  supplier1: { email: "supplier1@acme-mfg.test", password: "Passw0rd!" },
};

export const LOAD_TARGETS = QUICK
  ? [100, 500]
  : [1000, 5000, 10000, 50000];

export const CONCURRENCY_LEVELS = QUICK
  ? [50, 100]
  : [100, 250, 500, 1000];

export const SOAK_DURATION_MS = QUICK ? 60_000 : Number(process.env.EV_SOAK_MS ?? 300_000);
