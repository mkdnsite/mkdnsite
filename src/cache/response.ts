/**
 * Pluggable response cache interface for caching rendered HTML and markdown.
 *
 * Implementations:
 * - MemoryResponseCache: in-memory Map with TTL (local dev / single-process)
 * - KVResponseCache: Cloudflare KV-backed with L1 in-memory cache (multi-isolate)
 */
export interface CachedResponse {
  body: string
  status: number
  headers: Record<string, string>
  timestamp: number
}

export interface ResponseCache {
  /** Get a cached response, or null if missing / expired */
  get: (key: string) => Promise<CachedResponse | null>
  /** Store a response with optional TTL in seconds */
  set: (key: string, response: CachedResponse, ttlSeconds?: number) => Promise<void>
  /** Delete a single cache entry */
  delete: (key: string) => Promise<void>
  /** Clear all cached responses */
  clear: () => Promise<void>
}
