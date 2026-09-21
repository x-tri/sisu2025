export interface TtlCacheOptions<V> {
  ttlMs: number
  maxEntries: number
  /** Results for which this returns false are handed to the caller but never reused. */
  shouldKeep?: (value: V) => boolean
  now?: () => number
}

/**
 * Small per-process cache for expensive async loads. Concurrent callers for the
 * same key share one in-flight load; rejected loads are never cached.
 */
export function createTtlCache<K, V>(options: TtlCacheOptions<V>) {
  const { ttlMs, maxEntries, shouldKeep = () => true, now = Date.now } = options
  const entries = new Map<K, { expiresAt: number; value: Promise<V> }>()

  function forget(key: K, value: Promise<V>): void {
    if (entries.get(key)?.value === value) entries.delete(key)
  }

  return {
    get(key: K, load: () => Promise<V>): Promise<V> {
      const cached = entries.get(key)
      if (cached && cached.expiresAt > now()) return cached.value

      const value = load()
      entries.delete(key)
      entries.set(key, { expiresAt: now() + ttlMs, value })
      if (entries.size > maxEntries) {
        const oldest = entries.keys().next().value
        if (oldest !== undefined) entries.delete(oldest)
      }
      void value.then(
        result => { if (!shouldKeep(result)) forget(key, value) },
        () => forget(key, value),
      )
      return value
    },
    get size(): number {
      return entries.size
    },
  }
}
