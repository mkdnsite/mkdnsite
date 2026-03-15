import { describe, it, expect, beforeEach } from 'bun:test'
import { MemoryResponseCache } from '../src/cache/memory.ts'
import { KVResponseCache } from '../src/cache/kv.ts'
import type { KVNamespace } from '../src/cache/kv.ts'
import { createHandler } from '../src/handler.ts'
import { resolveConfig } from '../src/config/defaults.ts'
import type { ContentPage, ContentSource, NavNode } from '../src/content/types.ts'
import type { MarkdownRenderer } from '../src/render/types.ts'
import type { ReactElement } from 'react'
import type { CachedResponse } from '../src/cache/response.ts'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePage (slug: string, title: string, body = 'Body content.'): ContentPage {
  return {
    slug,
    sourcePath: slug.replace(/^\//, '') + '.md',
    meta: { title },
    body,
    raw: `---\ntitle: ${title}\n---\n\n${body}`
  }
}

const PAGES = [
  makePage('/', 'Home', 'Welcome to mkdnsite.'),
  makePage('/about', 'About', 'About this site.')
]

const mockSource: ContentSource = {
  getPage: async (slug) => PAGES.find(p => p.slug === slug) ?? null,
  getNavTree: async (): Promise<NavNode> => ({ title: 'Root', slug: '/', children: [], order: 0, isSection: true }),
  listPages: async () => PAGES,
  refresh: async () => {}
}

const stubRenderer: MarkdownRenderer = {
  engine: 'portable',
  renderToElement: (_md: string): ReactElement => ({ type: 'p', props: { children: _md }, key: null }),
  renderToHtml: (md: string): string => '<p>' + md + '</p>'
}

// ─── Mock KV namespace ────────────────────────────────────────────────────────

class MockKV implements KVNamespace {
  private readonly store = new Map<string, string>()

  async get (key: string): Promise<string | null> {
    return this.store.get(key) ?? null
  }

  async put (key: string, value: string): Promise<void> {
    this.store.set(key, value)
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
}

// ─── MemoryResponseCache ──────────────────────────────────────────────────────

describe('MemoryResponseCache', () => {
  let cache: MemoryResponseCache

  beforeEach(() => {
    cache = new MemoryResponseCache()
  })

  function response (body = 'hello'): CachedResponse {
    return { body, status: 200, headers: { 'Content-Type': 'text/html' }, timestamp: Date.now() }
  }

  it('get returns null when empty', async () => {
    expect(await cache.get('key')).toBeNull()
  })

  it('set then get returns stored response', async () => {
    const r = response('hello world')
    await cache.set('k', r)
    const result = await cache.get('k')
    expect(result?.body).toBe('hello world')
    expect(result?.status).toBe(200)
  })

  it('delete removes entry', async () => {
    await cache.set('k', response())
    await cache.delete('k')
    expect(await cache.get('k')).toBeNull()
  })

  it('clear removes all entries', async () => {
    await cache.set('a', response('a'))
    await cache.set('b', response('b'))
    await cache.clear()
    expect(await cache.get('a')).toBeNull()
    expect(await cache.get('b')).toBeNull()
  })

  it('TTL expiry returns null after expiry', async () => {
    await cache.set('k', response(), 0.001) // ~1ms TTL
    await new Promise(resolve => setTimeout(resolve, 5))
    expect(await cache.get('k')).toBeNull()
  })

  it('uses custom default TTL from constructor', async () => {
    const shortCache = new MemoryResponseCache(0.001) // 1ms TTL
    await shortCache.set('k', response())
    await new Promise(resolve => setTimeout(resolve, 5))
    expect(await shortCache.get('k')).toBeNull()
  })

  it('per-set TTL overrides default', async () => {
    const longCache = new MemoryResponseCache(3600)
    await longCache.set('k', response(), 0.001)
    await new Promise(resolve => setTimeout(resolve, 5))
    expect(await longCache.get('k')).toBeNull()
  })
})

// ─── KVResponseCache ──────────────────────────────────────────────────────────

describe('KVResponseCache', () => {
  let kv: MockKV
  let cache: KVResponseCache

  beforeEach(() => {
    kv = new MockKV()
    cache = new KVResponseCache(kv, { prefix: 'resp:' })
  })

  function response (body = 'hello'): CachedResponse {
    return { body, status: 200, headers: { 'Content-Type': 'text/html' }, timestamp: Date.now() }
  }

  it('get returns null when KV empty', async () => {
    expect(await cache.get('key')).toBeNull()
  })

  it('set stores in KV with correct key prefix', async () => {
    await cache.set('slug:html', response('body'))
    const raw = await kv.get('resp:slug:html')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw ?? 'null') as CachedResponse
    expect(parsed.body).toBe('body')
  })

  it('get on KV hit returns parsed response', async () => {
    await cache.set('k', response('from kv'))
    const result = await cache.get('k')
    expect(result?.body).toBe('from kv')
  })

  it('L1 cache hit skips KV (in-memory fast path)', async () => {
    let kvGetCount = 0
    const origGet = kv.get.bind(kv)
    kv.get = async (key) => { kvGetCount++; return await origGet(key) }

    await cache.set('k', response())
    kvGetCount = 0 // reset after set

    await cache.get('k') // should be L1 hit
    expect(kvGetCount).toBe(0)
  })

  it('delete removes from L1 and KV', async () => {
    await cache.set('k', response())
    await cache.delete('k')
    expect(await cache.get('k')).toBeNull()
    expect(await kv.get('resp:k')).toBeNull()
  })

  it('clear removes all prefixed KV keys', async () => {
    await cache.set('a', response())
    await cache.set('b', response())
    await cache.clear()
    expect(await cache.get('a')).toBeNull()
    expect(await cache.get('b')).toBeNull()
  })
})

// ─── Handler integration ──────────────────────────────────────────────────────

describe('Handler — response cache integration', () => {
  it('cache miss: renders page and stores in cache', async () => {
    const responseCache = new MemoryResponseCache()
    const config = resolveConfig({ cache: { enabled: true } } as unknown as Parameters<typeof resolveConfig>[0])
    const handler = createHandler({ source: mockSource, renderer: stubRenderer, config, responseCache })

    const res = await handler(new Request('http://localhost/'))
    expect(res.status).toBe(200)

    // Cache should now have the entry
    const cached = await responseCache.get('/:html')
    expect(cached).not.toBeNull()
    expect(cached?.body).toContain('Welcome to mkdnsite')
  })

  it('cache hit: returns cached response without re-rendering', async () => {
    const responseCache = new MemoryResponseCache()
    const config = resolveConfig({ cache: { enabled: true } } as unknown as Parameters<typeof resolveConfig>[0])

    let renderCount = 0
    const trackingRenderer: MarkdownRenderer = {
      ...stubRenderer,
      renderToHtml: (md: string) => { renderCount++; return '<p>' + md + '</p>' }
    }

    const handler = createHandler({ source: mockSource, renderer: trackingRenderer, config, responseCache })

    await handler(new Request('http://localhost/'))
    renderCount = 0

    // Second request should be cache hit
    const res2 = await handler(new Request('http://localhost/'))
    expect(res2.status).toBe(200)
    expect(renderCount).toBe(0) // Not re-rendered
  })

  it('cache disabled: does not cache or read from cache', async () => {
    const responseCache = new MemoryResponseCache()
    const config = resolveConfig({ cache: { enabled: false } } as unknown as Parameters<typeof resolveConfig>[0])
    const handler = createHandler({ source: mockSource, renderer: stubRenderer, config, responseCache })

    await handler(new Request('http://localhost/'))
    const cached = await responseCache.get('/:html')
    expect(cached).toBeNull()
  })

  it('works without responseCache (no regression)', async () => {
    const config = resolveConfig({})
    const handler = createHandler({ source: mockSource, renderer: stubRenderer, config })
    const res = await handler(new Request('http://localhost/'))
    expect(res.status).toBe(200)
  })
})

// ─── /_refresh handler ────────────────────────────────────────────────────────

describe('Handler — /_refresh with response cache', () => {
  it('_refresh clears entire response cache', async () => {
    const responseCache = new MemoryResponseCache()
    const config = resolveConfig({ cache: { enabled: true } } as unknown as Parameters<typeof resolveConfig>[0])
    const handler = createHandler({ source: mockSource, renderer: stubRenderer, config, responseCache })

    await handler(new Request('http://localhost/'))
    await handler(new Request('http://localhost/about'))
    expect(await responseCache.get('/:html')).not.toBeNull()

    await handler(new Request('http://localhost/_refresh', { method: 'POST' }))
    expect(await responseCache.get('/:html')).toBeNull()
  })

  it('_refresh?path=/about clears only that slug', async () => {
    const responseCache = new MemoryResponseCache()
    const config = resolveConfig({ cache: { enabled: true } } as unknown as Parameters<typeof resolveConfig>[0])
    const handler = createHandler({ source: mockSource, renderer: stubRenderer, config, responseCache })

    await handler(new Request('http://localhost/'))
    await handler(new Request('http://localhost/about'))

    await handler(new Request('http://localhost/_refresh?path=/about', { method: 'POST' }))

    // Root should still be cached
    expect(await responseCache.get('/:html')).not.toBeNull()
    // About should be cleared
    expect(await responseCache.get('/about:html')).toBeNull()
  })

  it('_refresh with valid auth token succeeds', async () => {
    const config = resolveConfig({})
    const handler = createHandler({ source: mockSource, renderer: stubRenderer, config, refreshToken: 'secret123' })

    const res = await handler(new Request('http://localhost/_refresh', {
      method: 'POST',
      headers: { Authorization: 'Bearer secret123' }
    }))
    expect(res.status).toBe(200)
  })

  it('_refresh with wrong auth token returns 401', async () => {
    const config = resolveConfig({})
    const handler = createHandler({ source: mockSource, renderer: stubRenderer, config, refreshToken: 'secret123' })

    const res = await handler(new Request('http://localhost/_refresh', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong' }
    }))
    expect(res.status).toBe(401)
  })

  it('_refresh with no token when auth required returns 401', async () => {
    const config = resolveConfig({})
    const handler = createHandler({ source: mockSource, renderer: stubRenderer, config, refreshToken: 'secret' })

    const res = await handler(new Request('http://localhost/_refresh', { method: 'POST' }))
    expect(res.status).toBe(401)
  })

  it('_refresh with no refreshToken set — no auth required', async () => {
    const config = resolveConfig({})
    const handler = createHandler({ source: mockSource, renderer: stubRenderer, config })

    const res = await handler(new Request('http://localhost/_refresh', { method: 'POST' }))
    expect(res.status).toBe(200)
  })
})

// ─── Cache-Control and ETag headers ──────────────────────────────────────────

describe('Cache-Control and ETag headers', () => {
  it('default Cache-Control is public, max-age=300', async () => {
    const config = resolveConfig({})
    const handler = createHandler({ source: mockSource, renderer: stubRenderer, config })
    const res = await handler(new Request('http://localhost/'))
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=300')
  })

  it('custom maxAge reflected in Cache-Control', async () => {
    const config = resolveConfig({ cache: { maxAge: 600 } } as unknown as Parameters<typeof resolveConfig>[0])
    const handler = createHandler({ source: mockSource, renderer: stubRenderer, config })
    const res = await handler(new Request('http://localhost/'))
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=600')
  })

  it('stale-while-revalidate appended when swr > 0', async () => {
    const config = resolveConfig({ cache: { maxAge: 300, staleWhileRevalidate: 60 } } as unknown as Parameters<typeof resolveConfig>[0])
    const handler = createHandler({ source: mockSource, renderer: stubRenderer, config })
    const res = await handler(new Request('http://localhost/'))
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=300, stale-while-revalidate=60')
  })

  it('ETag set when versionTag configured', async () => {
    const config = resolveConfig({ cache: { versionTag: 'v1.0.0' } } as unknown as Parameters<typeof resolveConfig>[0])
    const handler = createHandler({ source: mockSource, renderer: stubRenderer, config })
    const res = await handler(new Request('http://localhost/'))
    expect(res.headers.get('ETag')).toMatch(/^W\/"v1\.0\.0/)
  })

  it('no ETag when versionTag not set', async () => {
    const config = resolveConfig({})
    const handler = createHandler({ source: mockSource, renderer: stubRenderer, config })
    const res = await handler(new Request('http://localhost/'))
    expect(res.headers.get('ETag')).toBeNull()
  })

  it('304 Not Modified when ETag matches If-None-Match', async () => {
    const config = resolveConfig({ cache: { versionTag: 'v1.0.0' } } as unknown as Parameters<typeof resolveConfig>[0])
    const handler = createHandler({ source: mockSource, renderer: stubRenderer, config })

    const first = await handler(new Request('http://localhost/'))
    const etag = first.headers.get('ETag')
    expect(etag).not.toBeNull()

    const second = await handler(new Request('http://localhost/', {
      headers: { 'If-None-Match': etag ?? '' }
    }))
    expect(second.status).toBe(304)
  })

  it('304 response includes ETag, Cache-Control, and Vary headers', async () => {
    const config = resolveConfig({ cache: { versionTag: 'v2.0.0', maxAge: 600 } } as unknown as Parameters<typeof resolveConfig>[0])
    const handler = createHandler({ source: mockSource, renderer: stubRenderer, config })

    const first = await handler(new Request('http://localhost/'))
    const etag = first.headers.get('ETag')
    expect(etag).not.toBeNull()

    const second = await handler(new Request('http://localhost/', {
      headers: { 'If-None-Match': etag ?? '' }
    }))
    expect(second.status).toBe(304)
    expect(second.headers.get('ETag')).toBe(etag)
    expect(second.headers.get('Cache-Control')).not.toBeNull()
    expect(second.headers.get('Vary')).toBe('Accept')
  })

  it('ETag sanitizes special characters in versionTag', async () => {
    const config = resolveConfig({ cache: { versionTag: 'v1"inject\\bad' } } as unknown as Parameters<typeof resolveConfig>[0])
    const handler = createHandler({ source: mockSource, renderer: stubRenderer, config })
    const res = await handler(new Request('http://localhost/'))
    const etag = res.headers.get('ETag')
    expect(etag).not.toBeNull()
    expect(etag).not.toContain('"inject')
    expect(etag).toMatch(/^W\/"v1injectbad/)
  })
})

// ─── CLI flag parsing ─────────────────────────────────────────────────────────

describe('CLI — cache flag parsing', () => {
  async function parseArgs (args: string[]): Promise<Record<string, unknown>> {
    const { parseArgs: parse } = await import('../src/cli.ts') as { parseArgs: (args: string[]) => { config: Record<string, unknown> } }
    return parse(args).config
  }

  it('--cache enables response caching', async () => {
    const config = await parseArgs(['--cache'])
    expect((config.cache as Record<string, unknown>)?.enabled).toBe(true)
  })

  it('--no-cache disables response caching', async () => {
    const config = await parseArgs(['--no-cache'])
    expect((config.cache as Record<string, unknown>)?.enabled).toBe(false)
  })

  it('--cache-max-age sets maxAge', async () => {
    const config = await parseArgs(['--cache-max-age', '600'])
    expect((config.cache as Record<string, unknown>)?.maxAge).toBe(600)
  })

  it('--cache-swr sets staleWhileRevalidate', async () => {
    const config = await parseArgs(['--cache-swr', '30'])
    expect((config.cache as Record<string, unknown>)?.staleWhileRevalidate).toBe(30)
  })

  it('--cache-version sets versionTag', async () => {
    const config = await parseArgs(['--cache-version', 'v2.0.0'])
    expect((config.cache as Record<string, unknown>)?.versionTag).toBe('v2.0.0')
  })

  it('--cache-max-age-markdown sets maxAgeMarkdown', async () => {
    const config = await parseArgs(['--cache-max-age-markdown', '120'])
    expect((config.cache as Record<string, unknown>)?.maxAgeMarkdown).toBe(120)
  })
})
