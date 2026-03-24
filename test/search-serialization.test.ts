import { describe, it, expect, beforeEach } from 'bun:test'
import { createSearchIndex } from '../src/search/index.ts'
import type { SerializedSearchIndex } from '../src/search/index.ts'
import { MemoryContentCache } from '../src/content/cache.ts'
import { createHandler } from '../src/handler.ts'
import { resolveConfig } from '../src/config/defaults.ts'
import type { ContentPage, ContentSource, NavNode } from '../src/content/types.ts'
import type { MarkdownRenderer } from '../src/render/types.ts'
import type { ReactElement } from 'react'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePage (slug: string, title: string, body: string): ContentPage {
  return {
    slug,
    sourcePath: slug.replace(/^\//, '') + '.md',
    meta: { title },
    body,
    raw: `---\ntitle: ${title}\n---\n\n${body}`
  }
}

const PAGES = [
  makePage('/', 'Home', 'Welcome to mkdnsite. A Markdown-first web server.'),
  makePage('/docs/getting-started', 'Getting Started', 'Install mkdnsite with bun add mkdnsite.'),
  makePage('/docs/configuration', 'Configuration', 'Configure mkdnsite using a config file.')
]

const mockSource: ContentSource = {
  getPage: async (slug) => PAGES.find(p => p.slug === slug) ?? null,
  getNavTree: async (): Promise<NavNode> => ({ title: 'Root', slug: '/', children: [], order: 0, isSection: true }),
  listPages: async () => PAGES,
  refresh: async () => {}
}

const stubRenderer: MarkdownRenderer = {
  engine: 'portable',
  renderToElement: (markdown: string): ReactElement => ({ type: 'p', props: { children: markdown }, key: null }),
  renderToHtml: (markdown: string): string => '<p>' + markdown + '</p>'
}

// ─── SearchIndex serialize/deserialize ────────────────────────────────────────

describe('SearchIndex.serialize()', () => {
  it('produces a valid JSON string', async () => {
    const si = createSearchIndex()
    await si.rebuild(mockSource)
    const json = si.serialize()
    expect(typeof json).toBe('string')
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('serialized JSON has version field v=1', async () => {
    const si = createSearchIndex()
    await si.rebuild(mockSource)
    const parsed = JSON.parse(si.serialize()) as SerializedSearchIndex
    expect(parsed.v).toBe(1)
  })

  it('serialized JSON contains docs and posting', async () => {
    const si = createSearchIndex()
    await si.rebuild(mockSource)
    const parsed = JSON.parse(si.serialize()) as SerializedSearchIndex
    expect(typeof parsed.docs).toBe('object')
    expect(typeof parsed.posting).toBe('object')
    // Should have entries for each non-draft page
    expect(Object.keys(parsed.docs).length).toBeGreaterThan(0)
    expect(Object.keys(parsed.posting).length).toBeGreaterThan(0)
  })

  it('empty index serializes to valid JSON with no docs', () => {
    const si = createSearchIndex()
    const parsed = JSON.parse(si.serialize()) as SerializedSearchIndex
    expect(parsed.v).toBe(1)
    expect(Object.keys(parsed.docs)).toHaveLength(0)
    expect(Object.keys(parsed.posting)).toHaveLength(0)
  })
})

describe('SearchIndex.deserialize()', () => {
  it('restores a working index that returns same search results', async () => {
    const si1 = createSearchIndex()
    await si1.rebuild(mockSource)
    const results1 = si1.search('mkdnsite')
    expect(results1.length).toBeGreaterThan(0)

    const si2 = createSearchIndex()
    si2.deserialize(si1.serialize())
    const results2 = si2.search('mkdnsite')

    expect(results2.length).toBe(results1.length)
    expect(results2[0].slug).toBe(results1[0].slug)
    expect(results2[0].score).toBeCloseTo(results1[0].score, 10)
  })

  it('round-trip: build → serialize → deserialize → same results', async () => {
    const si = createSearchIndex()
    await si.rebuild(mockSource)
    const original = si.search('configure', 10)

    const restored = createSearchIndex()
    restored.deserialize(si.serialize())
    const fromRestored = restored.search('configure', 10)

    expect(fromRestored).toHaveLength(original.length)
    for (let i = 0; i < original.length; i++) {
      expect(fromRestored[i].slug).toBe(original[i].slug)
    }
  })

  it('replaces existing index state on deserialize', async () => {
    const si = createSearchIndex()
    si.index(makePage('/page-a', 'Page A', 'unique content alpha'))

    const si2 = createSearchIndex()
    await si2.rebuild(mockSource)

    // Deserialize si2 into si — should replace si's state
    si.deserialize(si2.serialize())

    // page-a was only in si, not si2 — should be gone
    const results = si.search('alpha')
    expect(results).toHaveLength(0)
  })

  it('throws on unsupported version', () => {
    const si = createSearchIndex()
    const bad = JSON.stringify({ v: 99, docs: {}, posting: {} })
    expect(() => si.deserialize(bad)).toThrow('unsupported serialization version')
  })

  it('deserialize then index/remove work correctly', async () => {
    const si = createSearchIndex()
    await si.rebuild(mockSource)
    const json = si.serialize()

    const si2 = createSearchIndex()
    si2.deserialize(json)

    // Should be able to add new doc
    si2.index(makePage('/new', 'New Page', 'brand new content here'))
    const results = si2.search('brand')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].slug).toBe('/new')

    // Should be able to remove
    si2.remove('/new')
    const afterRemove = si2.search('brand')
    expect(afterRemove).toHaveLength(0)
  })
})

// ─── ContentCache search index methods ───────────────────────────────────────

describe('MemoryContentCache — search index', () => {
  let cache: MemoryContentCache

  beforeEach(() => {
    cache = new MemoryContentCache()
  })

  it('getSearchIndex returns null when not set', async () => {
    expect(await cache.getSearchIndex()).toBeNull()
  })

  it('setSearchIndex then getSearchIndex returns stored data', async () => {
    await cache.setSearchIndex('{"v":1,"docs":{},"posting":{}}')
    const result = await cache.getSearchIndex()
    expect(result).toBe('{"v":1,"docs":{},"posting":{}}')
  })

  it('clear() removes cached search index', async () => {
    await cache.setSearchIndex('data')
    await cache.clear()
    expect(await cache.getSearchIndex()).toBeNull()
  })

  it('TTL expires search index', async () => {
    const shortCache = new MemoryContentCache(1) // 1ms TTL
    await shortCache.setSearchIndex('data')
    await new Promise(resolve => setTimeout(resolve, 5))
    expect(await shortCache.getSearchIndex()).toBeNull()
  })
})

// ─── Handler integration ──────────────────────────────────────────────────────

describe('Handler — search index caching', () => {
  function makeHandler (cache?: MemoryContentCache): ReturnType<typeof createHandler> {
    const overrides = { client: { search: true } } as unknown as Parameters<typeof resolveConfig>[0]
    const config = resolveConfig(overrides)
    return createHandler({
      source: mockSource,
      renderer: stubRenderer,
      config,
      contentCache: cache
    })
  }

  it('uses cached search index when cache hit', async () => {
    const cache = new MemoryContentCache()

    // Pre-populate cache with a real index
    const si = createSearchIndex()
    await si.rebuild(mockSource)
    await cache.setSearchIndex(si.serialize())

    let sourceListCallCount = 0
    const trackingSource: ContentSource = {
      ...mockSource,
      listPages: async () => {
        sourceListCallCount++
        return PAGES
      }
    }

    const overrides2 = { client: { search: true } } as unknown as Parameters<typeof resolveConfig>[0]
    const config = resolveConfig(overrides2)
    const handler = createHandler({
      source: trackingSource,
      renderer: stubRenderer,
      config,
      contentCache: cache
    })

    const res = await handler(new Request('http://localhost/api/search?q=markdown'))
    expect(res.status).toBe(200)
    const body = await res.json() as unknown[]
    expect(Array.isArray(body)).toBe(true)
    // listPages should NOT have been called — cache was used
    expect(sourceListCallCount).toBe(0)
  })

  it('rebuilds and stores in cache on cache miss', async () => {
    const cache = new MemoryContentCache()

    // Cache is empty
    expect(await cache.getSearchIndex()).toBeNull()

    const handler = makeHandler(cache)
    const res = await handler(new Request('http://localhost/api/search?q=markdown'))
    expect(res.status).toBe(200)

    // After rebuild, cache should be populated
    const cached = await cache.getSearchIndex()
    expect(cached).not.toBeNull()
    expect(() => JSON.parse(cached ?? '')).not.toThrow()
  })

  it('_refresh clears cached search index', async () => {
    const cache = new MemoryContentCache()
    const handler = makeHandler(cache)

    // Warm up search (populates cache)
    await handler(new Request('http://localhost/api/search?q=markdown'))
    expect(await cache.getSearchIndex()).not.toBeNull()

    // Refresh
    await handler(new Request('http://localhost/_refresh', { method: 'POST' }))

    // Cache entry should now be empty string (cleared)
    const after = await cache.getSearchIndex()
    // Empty string is stored as sentinel — treated as miss on deserialize
    expect(after).toBe('')
  })

  it('works without contentCache (no regressions)', async () => {
    const handler = makeHandler() // no cache
    const res = await handler(new Request('http://localhost/api/search?q=markdown'))
    expect(res.status).toBe(200)
    const body = await res.json() as unknown[]
    expect(Array.isArray(body)).toBe(true)
  })
})

// ─── SearchIndex.size ─────────────────────────────────────────────────────────

describe('SearchIndex.size', () => {
  it('returns 0 for a fresh empty index', () => {
    const si = createSearchIndex()
    expect(si.size).toBe(0)
  })

  it('reflects number of docs after rebuild', async () => {
    const si = createSearchIndex()
    await si.rebuild(mockSource)
    expect(si.size).toBe(PAGES.length)
  })

  it('decrements after remove()', async () => {
    const si = createSearchIndex()
    await si.rebuild(mockSource)
    si.remove('/')
    expect(si.size).toBe(PAGES.length - 1)
  })

  it('updates after deserialize', async () => {
    const si = createSearchIndex()
    await si.rebuild(mockSource)
    const data = si.serialize()

    const si2 = createSearchIndex()
    expect(si2.size).toBe(0)
    si2.deserialize(data)
    expect(si2.size).toBe(PAGES.length)
  })
})

// ─── Empty index cache guard ──────────────────────────────────────────────────

describe('Handler — empty index not cached', () => {
  const emptySource: ContentSource = {
    getPage: async () => null,
    getNavTree: async (): Promise<NavNode> => ({ title: 'Root', slug: '/', children: [], order: 0, isSection: true }),
    listPages: async () => [], // simulates transient GitHub API failure
    refresh: async () => {}
  }

  function makeHandlerWith (source: ContentSource, cache?: MemoryContentCache): ReturnType<typeof createHandler> {
    const overrides = { client: { search: true } } as unknown as Parameters<typeof resolveConfig>[0]
    const config = resolveConfig(overrides)
    return createHandler({ source, renderer: stubRenderer, config, contentCache: cache })
  }

  it('does not write to cache when index builds empty', async () => {
    const cache = new MemoryContentCache()
    const handler = makeHandlerWith(emptySource, cache)

    await handler(new Request('http://localhost/api/search?q=hello'))
    // Cache should remain empty — empty index must NOT be persisted
    expect(await cache.getSearchIndex()).toBeNull()
  })

  it('returns empty results (not an error) when index is empty', async () => {
    const handler = makeHandlerWith(emptySource)
    const res = await handler(new Request('http://localhost/api/search?q=hello'))
    expect(res.status).toBe(200)
    const body = await res.json() as unknown[]
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(0)
  })

  it('discards empty cached index and rebuilds from source', async () => {
    const cache = new MemoryContentCache()
    // Cache an empty (but valid) serialized index
    const emptySi = createSearchIndex()
    await cache.setSearchIndex(emptySi.serialize()) // {"v":1,"docs":{},"posting":{}}

    let listCallCount = 0
    const trackingSource: ContentSource = {
      ...mockSource,
      listPages: async () => {
        listCallCount++
        return PAGES
      }
    }

    const overrides = { client: { search: true } } as unknown as Parameters<typeof resolveConfig>[0]
    const config = resolveConfig(overrides)
    const handler = createHandler({
      source: trackingSource,
      renderer: stubRenderer,
      config,
      contentCache: cache
    })

    const res = await handler(new Request('http://localhost/api/search?q=mkdnsite'))
    expect(res.status).toBe(200)
    const body = await res.json() as Array<{ slug: string }>
    // Should have results — rebuilt from source, not the empty cache
    expect(body.length).toBeGreaterThan(0)
    // listPages should have been called to rebuild
    expect(listCallCount).toBeGreaterThan(0)
  })

  it('caches a non-empty index after successful rebuild', async () => {
    const cache = new MemoryContentCache()
    const handler = makeHandlerWith(mockSource, cache)

    // Trigger index build
    await handler(new Request('http://localhost/api/search?q=markdown'))

    // Cache should now contain the serialized index
    const cached = await cache.getSearchIndex()
    expect(cached).not.toBeNull()
    expect(cached).not.toBe('')

    // Verify it's a valid non-empty serialized index
    const parsed = JSON.parse(cached as string) as SerializedSearchIndex
    expect(Object.keys(parsed.docs).length).toBeGreaterThan(0)
  })
})
