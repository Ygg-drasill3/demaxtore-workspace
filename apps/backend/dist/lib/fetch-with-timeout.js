/** fetch with AbortSignal timeout — avoids hanging SSO bridge calls. */
export async function fetchWithTimeout(url, init = {}) {
    const { timeoutMs = 8000, ...rest } = init;
    return fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs) });
}
//# sourceMappingURL=fetch-with-timeout.js.map