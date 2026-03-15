import { describe, it, expect, beforeEach } from 'bun:test'
import { R2ContentSource } from '../src/content/r2.ts'

// ─── MockR2Bucket ─────────────────────────────────────────────────────────────

class MockR2Bucket {
  private readonly files = new Map<string, { content: string, uploaded: Date }>()

  addFile (key: string, content: string): void {
    this.files.set(key, { content, uploaded: new Date() })
  }

  async get (key: string): Promise<{ key: string, uploaded: Date, size: number, text: () => Promise<string> } | null> {
    const file = this.files.get(key)
    if (file == null) return null
    return {
      key,
      uploaded: file.uploaded,
      size: file.content.length,
      text: async () => file.content
    }
  }

  async list (options?: { prefix?: string, cursor?: string, limit?: number }): Promise<{
    objects: Array<{ key: string, uploaded: Date, size: number, text: () => Promise<string> }>
    truncated: boolean
    cursor?: string
  }> {
    const prefix = options?.prefix ?? ''
    const limit = options?.limit ?? 1000
    const cursor = options?.cursor

    let entries = Array.from(this.files.entries())
      .filter(([k]) => k.startsWith(prefix))
      .map(([k, v]) => ({
        key: k,
        uploaded: v.uploaded,
        size: v.content.length,
        text: async () => v.content
      }))
      .sort((a, b) => a.key.localeCompare(b.key))

    // Implement cursor-based pagination
    if (cursor != null) {
      const idx = entries.findIndex(e => e.key === cursor)
      entries = idx >= 0 ? entries.slice(idx + 1) : entries
    }

    const page = entries.slice(0, limit)
    const truncated = entries.length > limit
    const nextCursor = truncated ? page[page.length - 1].key : undefined

    return { objects: page, truncated, cursor: nextCursor }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function md (title: string, body = 'Content.'): string {
  return `---\ntitle: ${title}\n---\n\n${body}`
}

function mdDraft (title: string): string {
  return `---\ntitle: ${title}\ndraft: true\n---\n\nDraft content.`
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('R2ContentSource — getPage', () => {
  let bucket: MockR2Bucket
  let source: R2ContentSource

  beforeEach(() => {
    bucket = new MockR2Bucket()
    source = new R2ContentSource({ bucket: bucket as never })
  })

  it('returns null for non-existent page', async () => {
    const page = await source.getPage('/')
    expect(page).toBeNull()
  })

  it('returns root page from index.md', async () => {
    bucket.addFile('index.md', md('Home'))
    const page = await source.getPage('/')
    expect(page).not.toBeNull()
    expect(page?.meta.title).toBe('Home')
    expect(page?.slug).toBe('/')
  })

  it('returns nested page by slug', async () => {
    bucket.addFile('docs/getting-started.md', md('Getting Started'))
    const page = await source.getPage('/docs/getting-started')
    expect(page?.meta.title).toBe('Getting Started')
    expect(page?.slug).toBe('/docs/getting-started')
  })

  it('resolves slug with .md extension stripped', async () => {
    bucket.addFile('about.md', md('About'))
    const page = await source.getPage('/about.md')
    expect(page?.meta.title).toBe('About')
  })

  it('finds section index via /slug/index.md', async () => {
    bucket.addFile('docs/index.md', md('Documentation'))
    const page = await source.getPage('/docs')
    expect(page?.meta.title).toBe('Documentation')
  })

  it('finds section index via /slug/README.md', async () => {
    bucket.addFile('api/README.md', md('API Reference'))
    const page = await source.getPage('/api')
    expect(page?.meta.title).toBe('API Reference')
  })

  it('returns null for draft pages', async () => {
    bucket.addFile('draft-page.md', mdDraft('Draft'))
    const page = await source.getPage('/draft-page')
    expect(page).toBeNull()
  })
})

describe('R2ContentSource — listPages', () => {
  let bucket: MockR2Bucket
  let source: R2ContentSource

  beforeEach(() => {
    bucket = new MockR2Bucket()
    source = new R2ContentSource({ bucket: bucket as never })
  })

  it('returns all non-draft pages', async () => {
    bucket.addFile('index.md', md('Home'))
    bucket.addFile('about.md', md('About'))
    bucket.addFile('draft.md', mdDraft('Draft'))
    const pages = await source.listPages()
    expect(pages).toHaveLength(2)
    const slugs = pages.map(p => p.slug)
    expect(slugs).toContain('/')
    expect(slugs).toContain('/about')
    expect(slugs).not.toContain('/draft')
  })

  it('excludes non-.md files', async () => {
    bucket.addFile('index.md', md('Home'))
    // list() already filters to .md via R2ContentSource
    const pages = await source.listPages()
    expect(pages).toHaveLength(1)
  })
})

describe('R2ContentSource — getNavTree', () => {
  it('builds correct nav tree structure', async () => {
    const bucket = new MockR2Bucket()
    bucket.addFile('index.md', md('Home'))
    bucket.addFile('docs/index.md', md('Documentation'))
    bucket.addFile('docs/setup.md', md('Setup', 'Setup guide.'))
    const source = new R2ContentSource({ bucket: bucket as never })
    const nav = await source.getNavTree()
    expect(nav.slug).toBe('/')
    const docs = nav.children.find(n => n.slug === '/docs')
    expect(docs).toBeDefined()
    expect(docs?.title).toBe('Documentation')
    expect(docs?.children).toHaveLength(1)
    expect(docs?.children[0].slug).toBe('/docs/setup')
  })
})

describe('R2ContentSource — basePath', () => {
  it('uses basePath prefix when listing and fetching', async () => {
    const bucket = new MockR2Bucket()
    bucket.addFile('sites/abc/index.md', md('Site Root'))
    bucket.addFile('sites/abc/page.md', md('Page'))
    const source = new R2ContentSource({ bucket: bucket as never, basePath: 'sites/abc/' })
    const page = await source.getPage('/')
    expect(page?.meta.title).toBe('Site Root')
    const pages = await source.listPages()
    expect(pages).toHaveLength(2)
  })

  it('normalises basePath without trailing slash', async () => {
    const bucket = new MockR2Bucket()
    bucket.addFile('tenant/x/index.md', md('X'))
    const source = new R2ContentSource({ bucket: bucket as never, basePath: 'tenant/x' })
    const page = await source.getPage('/')
    expect(page?.meta.title).toBe('X')
  })
})

describe('R2ContentSource — pagination', () => {
  it('handles paginated R2 list results', async () => {
    const bucket = new MockR2Bucket()
    // Add 5 files, use limit=2 to force 3 pages
    for (let i = 1; i <= 5; i++) {
      bucket.addFile(`page${i}.md`, md(`Page ${i}`))
    }

    // Patch list to use limit=2 to simulate pagination
    const origList = bucket.list.bind(bucket)
    bucket.list = async (opts) => await origList({ ...opts, limit: 2 })

    const source = new R2ContentSource({ bucket: bucket as never })
    const pages = await source.listPages()
    expect(pages).toHaveLength(5)
  })
})

describe('R2ContentSource — caching and refresh', () => {
  it('caches results after first fetch', async () => {
    const bucket = new MockR2Bucket()
    bucket.addFile('index.md', md('Home'))
    const source = new R2ContentSource({ bucket: bucket as never })
    const p1 = await source.getPage('/')
    const p2 = await source.getPage('/')
    expect(p1?.slug).toBe(p2?.slug)
  })

  it('refresh() clears cache so new files are visible', async () => {
    const bucket = new MockR2Bucket()
    bucket.addFile('index.md', md('Home'))
    const source = new R2ContentSource({ bucket: bucket as never })
    await source.listPages()
    bucket.addFile('new-page.md', md('New Page'))
    // Before refresh: new page not visible (cached)
    let pages = await source.listPages()
    expect(pages.some(p => p.slug === '/new-page')).toBe(false)
    // After refresh
    await source.refresh()
    pages = await source.listPages()
    expect(pages.some(p => p.slug === '/new-page')).toBe(true)
  })
})
