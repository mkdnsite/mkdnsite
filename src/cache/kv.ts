import type { CachedResponse, ResponseCache } from './response.ts'
import { MemoryResponseCache } from './memory.ts'

const DEFAULT_TTL_SECONDS = 300

/**
 * Cloudflare KV type stubs (runtime types not available outside CF Workers).
 * Matches the KVNamespace interface from @cloudflare/workers-types.
 */
export interface KVNamespace {
  get: (key: string) => Promise<string | null>
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>
  delete: (key: string) => Promise<void>
  list: (options?: { prefix?: string }) => Promise<{ keys: Array<{ name: string }> }>
}

/**
 * Cloudflare KV-backed response cache with L1 in-memory hot path.
 *
 * L1 (MemoryResponseCache): fast path for repeated requests within same isolate.
 * L2 (KV): shared durable storage across isolates / cold starts.
 *
 * KV key format: `{prefix}resp:{cacheKey}`
 */
export class KVResponseCache implements ResponseCache {
  private readonly kv: KVNamespace
  private readonly prefix: string
  private readonly ttlSeconds: number
  private readonly memory: MemoryResponseCache

  constructor (kv: KVNamespace, options?: { prefix?: string, ttlSeconds?: number }) {
    this.kv = kv
    this.prefix = options?.prefix ?? 'resp:'
    this.ttlSeconds = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS
    this.memory = new MemoryResponseCache(this.ttlSeconds)
  }

  async get (key: string): Promise<CachedResponse | null> {
    // L1: in-memory
    const memResult = await this.memory.get(key)
    if (memResult != null) return memResult

    // L2: KV
    const raw = await this.kv.get(this.kvKey(key))
    if (raw != null) {
      try {
        const cached = JSON.parse(raw) as CachedResponse
        await this.memory.set(key, cached, this.ttlSeconds)
        return cached
      } catch {
        return null
      }
    }
    return null
  }

  async set (key: string, response: CachedResponse, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.ttlSeconds
    await this.memory.set(key, response, ttl)
    await this.kv.put(this.kvKey(key), JSON.stringify(response), { expirationTtl: ttl })
  }

  async delete (key: string): Promise<void> {
    await this.memory.delete(key)
    await this.kv.delete(this.kvKey(key))
  }

  async clear (): Promise<void> {
    await this.memory.clear()
    try {
      const result = await this.kv.list({ prefix: this.prefix })
      await Promise.all(result.keys.map(async k => await this.kv.delete(k.name)))
    } catch {
      // Best-effort — KV TTL handles expiry
    }
  }

  private kvKey (key: string): string {
    return this.prefix + key
  }
}
