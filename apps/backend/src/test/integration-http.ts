/**
 * Shared API base URL for backend HTTP integration tests.
 * Aligns with E2E/CI (`E2E_API_URL`, port 3001) — never default to legacy 8001.
 */
export function getTestApiBase(): string {
  return (
    process.env.TEST_API_URL
    ?? process.env.E2E_API_URL
    ?? "http://127.0.0.1:3001"
  ).replace(/\/$/, "");
}

export async function testApiLogin(email: string, password = "Passw0rd!"): Promise<string> {
  const base = getTestApiBase();
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`login failed for ${email}: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { accessToken: string };
  return body.accessToken;
}

export async function testApiFetch(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<Response> {
  const base = getTestApiBase();
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
}
