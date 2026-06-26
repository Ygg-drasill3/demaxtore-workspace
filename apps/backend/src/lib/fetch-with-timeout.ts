/** fetch with AbortSignal timeout — avoids hanging SSO bridge calls. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 8000, ...rest } = init;
  return fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs) });
}
