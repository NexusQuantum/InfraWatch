import "server-only";

interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
  lastAccessed: number;
}

const MAX_ENTRIES = 500;
const store = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

let hits = 0;
let misses = 0;

function isExpired(entry: CacheEntry): boolean {
  return Date.now() >= entry.expiresAt;
}

function evictIfNeeded(): void {
  if (store.size <= MAX_ENTRIES) return;

  // Evict expired entries first
  for (const [key, entry] of store) {
    if (isExpired(entry)) store.delete(key);
  }
  if (store.size <= MAX_ENTRIES) return;

  // LRU eviction: remove oldest-accessed entries until under limit
  const entries = Array.from(store.entries()).sort(
    ([, a], [, b]) => a.lastAccessed - b.lastAccessed
  );
  const toRemove = store.size - MAX_ENTRIES + Math.floor(MAX_ENTRIES * 0.1); // remove 10% extra headroom
  for (let i = 0; i < toRemove && i < entries.length; i++) {
    store.delete(entries[i][0]);
  }
}

export function get<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry || isExpired(entry)) {
    if (entry) store.delete(key);
    return undefined;
  }
  hits++;
  entry.lastAccessed = Date.now();
  return entry.data as T;
}

export function set<T>(key: string, data: T, ttlMs: number): void {
  evictIfNeeded();
  store.set(key, { data, expiresAt: Date.now() + ttlMs, lastAccessed: Date.now() });
}

export async function getOrFetch<T>(
  key: string,
  ttlMs: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = get<T>(key);
  if (cached !== undefined) return cached;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = fetchFn()
    .then((data) => {
      set(key, data, ttlMs);
      misses++;
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export function invalidate(key: string): void {
  store.delete(key);
}

export function invalidatePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export function stats() {
  return {
    entries: store.size,
    maxEntries: MAX_ENTRIES,
    inflight: inflight.size,
    hits,
    misses,
    hitRate: hits + misses > 0 ? hits / (hits + misses) : 0,
  };
}
