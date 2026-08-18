/** In-memory TTL response cache for admin analytics endpoints. */
const store = new Map();
export async function cached(key, ttlMs, fn) {
    const hit = store.get(key);
    if (hit && hit.expiresAt > Date.now())
        return hit.value;
    const value = await fn();
    store.set(key, { expiresAt: Date.now() + ttlMs, value });
    return value;
}
export function invalidateCache(prefix) {
    for (const key of store.keys()) {
        if (key.startsWith(prefix))
            store.delete(key);
    }
}
export function clearResponseCache() {
    store.clear();
}
//# sourceMappingURL=response-cache.js.map