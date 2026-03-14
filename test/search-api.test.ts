import { describe, it, expect } from 'bun:test'
import { createHandler } from '../src/handler.ts'
import { resolveConfig } from '../src/config/defaults.ts'
import type { ContentPage, ContentSource, NavNode } from '../src/content/types.ts'
import type { MarkdownRenderer } from '../src/render/types.ts'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makePage (slug: string, title: string, body: string): ContentPage {
  return {
    slug,
    sourcePath: slug.replace(/^\//, '') + '.md',
    meta: { title },
    body,
    raw: `---\ntitle: ${title}\n---\n\n${body}`
  }
}

const PAGES: ContentPage[] = [
  makePage('/', 'Home', 'Welcome to mkdnsite. A Markdown-first web server.'),
  makePage('/docs/getting-started', 'Getting Started', 'Install mkdnsite with bun add mkdnsite. Quick setup guide.'),
  makePage('/docs/configuration', 'Configuration', 'Configure mkdnsite via mkdnsite.config.ts. All options explained.')
]

const mockSource: ContentSource = {
  async getPage (slug: string) { return PAGES.find(p => p.slug === slug) ?? null },
  async getNavTree (): Promise<NavNode> {
    return { title: 'Root', slug: '/', order: 0, children: [], isSection: true }
  },
  async listPages () { return PAGES },
  async refresh () {}
}

const stubRenderer: MarkdownRenderer = {
  engine: 'portable',
  renderToHtml: () => '<p>content</p>',
  renderToElement: () => null as unknown as ReturnType<typeof import('react').createElement>
}

function makeHandler (searchEnabled = true): ReturnType<typeof createHandler> {
  const searchOverride = { search: searchEnabled }
  const config = resolveConfig({ client: searchOverride as never })
  return createHandler({ source: mockSource, renderer: stubRenderer, config })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('/api/search endpoint', () => {
  it('returns JSON array for valid query', async () => {
    const handler = makeHandler()
    const res = await handler(new Request('http://localhost/api/search?q=configuration'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/json')
    const results = await res.json()
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBeGreaterThan(0)
  })

  it('returns empty array for no matches', async () => {
    const handler = makeHandler()
    const res = await handler(new Request('http://localhost/api/search?q=zyxwvutsrqponmlkji'))
    expect(res.status).toBe(200)
    const results = await res.json()
    expect(results).toEqual([])
  })

  it('returns empty array for empty q param', async () => {
    const handler = makeHandler()
    const res = await handler(new Request('http://localhost/api/search?q='))
    expect(res.status).toBe(200)
    const results = await res.json()
    expect(results).toEqual([])
  })

  it('returns empty array when q param is absent', async () => {
    const handler = makeHandler()
    const res = await handler(new Request('http://localhost/api/search'))
    expect(res.status).toBe(200)
    const results = await res.json()
    expect(results).toEqual([])
  })

  it('respects limit parameter', async () => {
    const handler = makeHandler()
    // Index has 3 docs; query that matches all
    const res = await handler(new Request('http://localhost/api/search?q=mkdnsite&limit=1'))
    const results = await res.json()
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBeLessThanOrEqual(1)
  })

  it('caps limit at 50', async () => {
    const handler = makeHandler()
    const res = await handler(new Request('http://localhost/api/search?q=mkdnsite&limit=999'))
    const results = await res.json()
    expect(results.length).toBeLessThanOrEqual(50)
  })

  it('results have title, slug, excerpt, score fields', async () => {
    const handler = makeHandler()
    const res = await handler(new Request('http://localhost/api/search?q=configuration'))
    const results = await res.json()
    expect(results.length).toBeGreaterThan(0)
    const first = results[0]
    expect(typeof first.title).toBe('string')
    expect(typeof first.slug).toBe('string')
    expect(typeof first.excerpt).toBe('string')
    expect(typeof first.score).toBe('number')
  })

  it('returns 404 when client.search is disabled', async () => {
    const handler = makeHandler(false)
    const res = await handler(new Request('http://localhost/api/search?q=test'))
    expect(res.status).toBe(404)
  })
})
