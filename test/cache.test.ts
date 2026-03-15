import { describe, it, expect } from 'bun:test'
import { MemoryContentCache, KVContentCache } from '../src/content/cache.ts'
import type { ContentPage, NavNode } from '../src/content/types.ts'

// ─── Test data ───────────────────────────────────────────────────────────────

const testPage: ContentPage = {
  slug: '/test',
  sourcePath: 'test.md',
  meta: { title: 'Test Page' },
  body: 'Hello world',
  raw: '---\ntitle: Test Page\n---\nHello world'
}

const testNav: NavNode = {
  title: 'Root',
  slug: '/',
  order: 0,
  isSection: true,
  children: [
    { title: 'Test', slug: '/test', order: 0, isSection: false, children: [] }
  ]
}

// ─── Mock KV ─────────────────────────────────────────────────────────────────

class MockKV {
  private readonly store = new Map<string, { value: string, expiresAt: number | null }>()

  async get (key: string): Promise<string | null> {
    const entry = this.store.get(key)
    if (entry == null) return null
    if (entry.expiresAt != null && Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.value
  }

  async put (key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    const expiresAt = options?.expirationTtl != null
      ? Date.now() + options.expirationTtl * 1000
      : null
    this.store.set(key, { value, expiresAt })
  }

  async delete (key: string): Promise<void> {
    this.store.delete(key)
  }

  async list (options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }> }> {
    const prefix = options?.prefix ?? ''
    const keys = Array.from(this.store.keys())
      .filter(k => k.startsWith(prefix))
      .map(name => ({ name }))
    return { keys }
  }

  get size (): number {
    return this.store.size
  }
}

// ─── MemoryContentCache tests ────────────────────────────────────────────────

describe('MemoryContentCache', () => {
  it('stores and retrieves a page', async () => {
    const cache = new MemoryContentCache()
    await cache.setPage('test', testPage)
    const result = await cache.getPage('test')
    expect(result?.slug).toBe('/test')
  })

  it('returns null for missing page', async () => {
    const cache = new MemoryContentCache()
    const result = await cache.getPage('nope')
    expect(result).toBeNull()
  })

  it('stores and retrieves nav', async () => {
    const cache = new MemoryContentCache()
    await cache.setNav(testNav)
    const result = await cache.getNav()
    expect(result?.title).toBe('Root')
  })

  it('stores and retrieves page list', async () => {
    const cache = new MemoryContentCache()
    await cache.setPageList([testPage])
    const result = await cache.getPageList()
    expect(result?.length).toBe(1)
  })

  it('clear() removes all entries', async () => {
    const cache = new MemoryContentCache()
    await cache.setPage('test', testPage)
    await cache.setNav(testNav)
    await cache.setPageList([testPage])
    await cache.clear()
    expect(await cache.getPage('test')).toBeNull()
    expect(await cache.getNav()).toBeNull()
    expect(await cache.getPageList()).toBeNull()
  })

  it('expires entries after TTL', async () => {
    const cache = new MemoryContentCache(1) // 1ms TTL
    await cache.setPage('test', testPage)
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(await cache.getPage('test')).toBeNull()
  })
})

// ─── KVContentCache tests ────────────────────────────────────────────────────

describe('KVContentCache', () => {
  it('stores page in both memory and KV', async () => {
    const kv = new MockKV()
    const cache = new KVContentCache(kv)
    await cache.setPage('test', testPage)

    // Should be in KV
    const raw = await kv.get('content:page:test')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw ?? '') as ContentPage
    expect(parsed.slug).toBe('/test')
  })

  it('reads from memory first (L1 hit)', async () => {
    const kv = new MockKV()
    const cache = new KVContentCache(kv)
    await cache.setPage('test', testPage)

    // Delete from KV to prove memory is used
    await kv.delete('content:page:test')
    const result = await cache.getPage('test')
    expect(result?.slug).toBe('/test')
  })

  it('falls back to KV on memory miss (L2 hit)', async () => {
    const kv = new MockKV()
    // Write directly to KV (simulating another isolate)
    await kv.put('content:page:test', JSON.stringify(testPage), { expirationTtl: 300 })

    // Fresh cache instance has empty memory
    const cache = new KVContentCache(kv)
    const result = await cache.getPage('test')
    expect(result?.slug).toBe('/test')
  })

  it('stores and retrieves nav via KV', async () => {
    const kv = new MockKV()
    const cache = new KVContentCache(kv)
    await cache.setNav(testNav)

    const cache2 = new KVContentCache(kv) // fresh memory
    const result = await cache2.getNav()
    expect(result?.title).toBe('Root')
  })

  it('stores and retrieves page list via KV', async () => {
    const kv = new MockKV()
    const cache = new KVContentCache(kv)
    await cache.setPageList([testPage])

    const cache2 = new KVContentCache(kv)
    const result = await cache2.getPageList()
    expect(result?.length).toBe(1)
  })

  it('clear() removes KV entries by prefix', async () => {
    const kv = new MockKV()
    const cache = new KVContentCache(kv)
    await cache.setPage('test', testPage)
    await cache.setNav(testNav)
    expect(kv.size).toBeGreaterThan(0)

    await cache.clear()
    expect(await cache.getPage('test')).toBeNull()
    expect(await cache.getNav()).toBeNull()
  })

  it('uses custom prefix', async () => {
    const kv = new MockKV()
    const cache = new KVContentCache(kv, { prefix: 'site123:' })
    await cache.setPage('test', testPage)

    const raw = await kv.get('site123:page:test')
    expect(raw).not.toBeNull()
  })

  it('returns null for missing entries', async () => {
    const kv = new MockKV()
    const cache = new KVContentCache(kv)
    expect(await cache.getPage('nope')).toBeNull()
    expect(await cache.getNav()).toBeNull()
    expect(await cache.getPageList()).toBeNull()
  })
})
