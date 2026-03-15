import type { ContentPage, NavNode } from './types.ts'

/**
 * Content cache interface.
 *
 * Implementations:
 * - MemoryContentCache: in-memory Map with TTL (default)
 * - KVContentCache: Cloudflare KV-backed with TTL
 */
export interface ContentCache {
  getPage: (key: string) => Promise<ContentPage | null>
  setPage: (key: string, page: ContentPage) => Promise<void>

  getNav: () => Promise<NavNode | null>
  setNav: (nav: NavNode) => Promise<void>

  getPageList: () => Promise<ContentPage[] | null>
  setPageList: (pages: ContentPage[]) => Promise<void>

  clear: () => Promise<void>
}

// ─── In-Memory Implementation ────────────────────────────────────────────────

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const DEFAULT_TTL_MS = 5 * 60 * 1000 // 5 minutes

export class MemoryContentCache implements ContentCache {
  private readonly pages = new Map<string, CacheEntry<ContentPage>>()
  private nav: CacheEntry<NavNode> | null = null
  private pageList: CacheEntry<ContentPage[]> | null = null
  private readonly ttlMs: number

  constructor (ttlMs?: number) {
    this.ttlMs = ttlMs ?? DEFAULT_TTL_MS
  }

  async getPage (key: string): Promise<ContentPage | null> {
    const entry = this.pages.get(key)
    if (entry != null && Date.now() < entry.expiresAt) return entry.value
    return null
  }

  async setPage (key: string, page: ContentPage): Promise<void> {
    this.pages.set(key, { value: page, expiresAt: Date.now() + this.ttlMs })
  }

  async getNav (): Promise<NavNode | null> {
    if (this.nav != null && Date.now() < this.nav.expiresAt) return this.nav.value
    return null
  }

  async setNav (nav: NavNode): Promise<void> {
    this.nav = { value: nav, expiresAt: Date.now() + this.ttlMs }
  }

  async getPageList (): Promise<ContentPage[] | null> {
    if (this.pageList != null && Date.now() < this.pageList.expiresAt) return this.pageList.value
    return null
  }

  async setPageList (pages: ContentPage[]): Promise<void> {
    this.pageList = { value: pages, expiresAt: Date.now() + this.ttlMs }
  }

  async clear (): Promise<void> {
    this.pages.clear()
    this.nav = null
    this.pageList = null
  }
}

// ─── Cloudflare KV Implementation ────────────────────────────────────────────

interface KVNamespace {
  get: (key: string) => Promise<string | null>
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>
  delete: (key: string) => Promise<void>
  list: (options?: { prefix?: string }) => Promise<{ keys: Array<{ name: string }> }>
}

const DEFAULT_KV_TTL_SECONDS = 300 // 5 minutes

/**
 * Cloudflare KV-backed content cache.
 *
 * Serializes ContentPage and NavNode to JSON and stores in KV with TTL.
 * Falls through to in-memory cache for hot-path performance within
 * a single Worker isolate, with KV as the shared durable layer.
 */
export class KVContentCache implements ContentCache {
  private readonly kv: KVNamespace
  private readonly prefix: string
  private readonly ttlSeconds: number
  private readonly memory: MemoryContentCache

  constructor (kv: KVNamespace, options?: { prefix?: string, ttlSeconds?: number }) {
    this.kv = kv
    this.prefix = options?.prefix ?? 'content:'
    this.ttlSeconds = options?.ttlSeconds ?? DEFAULT_KV_TTL_SECONDS
    // In-memory layer for hot-path within the same isolate
    this.memory = new MemoryContentCache(this.ttlSeconds * 1000)
  }

  async getPage (key: string): Promise<ContentPage | null> {
    // L1: in-memory
    const memResult = await this.memory.getPage(key)
    if (memResult != null) return memResult

    // L2: KV
    const raw = await this.kv.get(this.prefix + 'page:' + key)
    if (raw != null) {
      try {
        const page = JSON.parse(raw) as ContentPage
        await this.memory.setPage(key, page)
        return page
      } catch {
        return null
      }
    }
    return null
  }

  async setPage (key: string, page: ContentPage): Promise<void> {
    await this.memory.setPage(key, page)
    await this.kv.put(this.prefix + 'page:' + key, JSON.stringify(page), {
      expirationTtl: this.ttlSeconds
    })
  }

  async getNav (): Promise<NavNode | null> {
    const memResult = await this.memory.getNav()
    if (memResult != null) return memResult

    const raw = await this.kv.get(this.prefix + 'nav')
    if (raw != null) {
      try {
        const nav = JSON.parse(raw) as NavNode
        await this.memory.setNav(nav)
        return nav
      } catch {
        return null
      }
    }
    return null
  }

  async setNav (nav: NavNode): Promise<void> {
    await this.memory.setNav(nav)
    await this.kv.put(this.prefix + 'nav', JSON.stringify(nav), {
      expirationTtl: this.ttlSeconds
    })
  }

  async getPageList (): Promise<ContentPage[] | null> {
    const memResult = await this.memory.getPageList()
    if (memResult != null) return memResult

    const raw = await this.kv.get(this.prefix + 'pages')
    if (raw != null) {
      try {
        const pages = JSON.parse(raw) as ContentPage[]
        await this.memory.setPageList(pages)
        return pages
      } catch {
        return null
      }
    }
    return null
  }

  async setPageList (pages: ContentPage[]): Promise<void> {
    await this.memory.setPageList(pages)
    await this.kv.put(this.prefix + 'pages', JSON.stringify(pages), {
      expirationTtl: this.ttlSeconds
    })
  }

  async clear (): Promise<void> {
    await this.memory.clear()
    // List and delete all keys with our prefix
    try {
      const result = await this.kv.list({ prefix: this.prefix })
      await Promise.all(result.keys.map(async k => await this.kv.delete(k.name)))
    } catch {
      // Best-effort cleanup — KV TTL will handle expiry
    }
  }
}
