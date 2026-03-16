import type { CachedResponse, ResponseCache } from './response.ts'

const DEFAULT_TTL_SECONDS = 300

interface Entry {
  response: CachedResponse
  expiresAt: number
}

/**
 * In-memory response cache with TTL eviction.
 *
 * Suitable for single-process deployments (local dev, Node/Deno/Bun servers).
 * Does not share state across Worker isolates — use KVResponseCache for that.
 */
export class MemoryResponseCache implements ResponseCache {
  private readonly store = new Map<string, Entry>()
  private readonly defaultTtlSeconds: number

  constructor (defaultTtlSeconds?: number) {
    this.defaultTtlSeconds = defaultTtlSeconds ?? DEFAULT_TTL_SECONDS
  }

  async get (key: string): Promise<CachedResponse | null> {
    const entry = this.store.get(key)
    if (entry == null) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.response
  }

  async set (key: string, response: CachedResponse, ttlSeconds?: number): Promise<void> {
    const ttl = (ttlSeconds ?? this.defaultTtlSeconds) * 1000
    this.store.set(key, { response, expiresAt: Date.now() + ttl })
  }

  async delete (key: string): Promise<void> {
    this.store.delete(key)
  }

  async clear (): Promise<void> {
    this.store.clear()
  }
}
