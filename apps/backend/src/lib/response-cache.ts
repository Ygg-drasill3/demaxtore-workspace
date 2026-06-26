/** In-memory TTL response cache for admin analytics endpoints. */

interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

const store = new Map<string, CacheEntry>();

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  const value = await fn();
  store.set(key, { expiresAt: Date.now() + ttlMs, value });
  return value;
}

export function invalidateCache(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export function clearResponseCache(): void {
  store.clear();
}
