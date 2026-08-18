export const API_BASE = process.env.PR_API_URL ?? "http://localhost:3001";

export async function timedFetch(path, opts = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const start = performance.now();
  try {
    const res = await fetch(url, {
      ...opts,
      headers: { "Content-Type": "application/json", ...opts.headers },
    });
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { ok: res.ok, status: res.status, ms: Math.round(performance.now() - start), body };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      ms: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
      body: null,
    };
  }
}

export async function login(email, password) {
  const r = await timedFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok || !r.body?.accessToken) throw new Error(`login failed: ${email} ${r.status}`);
  return r.body.accessToken;
}

export function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

export function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export async function benchEndpoint(token, path, n = 10) {
  const times = [];
  let lastStatus = 0;
  let lastOk = false;
  for (let i = 0; i < n; i++) {
    const r = await timedFetch(path, { headers: auth(token) });
    times.push(r.ms);
    lastStatus = r.status;
    lastOk = r.ok;
  }
  return {
    path,
    samples: n,
    p50: percentile(times, 50),
    p95: percentile(times, 95),
    max: Math.max(...times),
    ok: lastOk,
    status: lastStatus,
    under1s: times.filter((t) => t <= 1000).length / times.length,
  };
}
