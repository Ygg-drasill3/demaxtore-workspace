import { API_BASE } from "./config.mjs";

export async function timedFetch(path, opts = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const start = performance.now();
  let status = 0;
  let ok = false;
  let body = null;
  try {
    const res = await fetch(url, {
      ...opts,
      headers: { "Content-Type": "application/json", ...opts.headers },
    });
    status = res.status;
    ok = res.ok;
    const text = await res.text();
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      ms: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
      body: null,
    };
  }
  return {
    ok,
    status,
    ms: Math.round(performance.now() - start),
    body,
  };
}

export async function login(email, password) {
  const r = await timedFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok || !r.body?.accessToken) {
    throw new Error(`login failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
  return r.body.accessToken;
}

export function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}
