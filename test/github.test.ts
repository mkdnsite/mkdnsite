import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { GitHubSource } from '../src/content/github.ts'
import { parseArgs } from '../src/cli.ts'

// ─── Mock fetch helpers ───────────────────────────────────────────────────────

const TREE_URL_RE = /api\.github\.com\/repos\/([^/]+)\/([^/]+)\/git\/trees/
const RAW_URL_RE = /raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.*)/

const originalFetch = globalThis.fetch

function mockFetch (treeEntries: string[], files: Record<string, string>): void {
  const mockFn = async (url: string): Promise<Response> => {
    if (TREE_URL_RE.test(url)) {
      const tree = treeEntries.map(path => ({ path, type: 'blob', sha: 'abc', size: 100 }))
      return new Response(JSON.stringify({ tree }), { status: 200 })
    }

    const m = RAW_URL_RE.exec(url)
    if (m != null) {
      const filePath = m[4]
      if (filePath in files) {
        return new Response(files[filePath], { status: 200 })
      }
      return new Response('Not Found', { status: 404 })
    }

    return new Response('Not Found', { status: 404 })
  }
  globalThis.fetch = mockFn as unknown as typeof fetch
}

function restoreFetch (): void {
  globalThis.fetch = originalFetch
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

const SIMPLE_FILES: Record<string, string> = {
  'index.md': '---\ntitle: Home\n---\n\nWelcome home.',
  'about.md': '---\ntitle: About\norder: 2\n---\n\nAbout page.',
  'docs/index.md': '---\ntitle: Documentation\norder: 1\n---\n\nDocs section.',
  'docs/getting-started.md': '---\ntitle: Getting Started\norder: 1\n---\n\nGet started here.',
  'docs/config.md': '---\ntitle: Config\norder: 2\n---\n\nConfiguration docs.'
}

const SIMPLE_TREE = Object.keys(SIMPLE_FILES)

// ─── CLI flag parsing ─────────────────────────────────────────────────────────

describe('CLI -- --github flags', () => {
  it('parses --github owner/repo into github.owner and github.repo', () => {
    const { config } = parseArgs(['--github', 'myorg/myrepo'])
    expect(config.github?.owner).toBe('myorg')
    expect(config.github?.repo).toBe('myrepo')
  })

  it('parses --github-ref', () => {
    const { config } = parseArgs(['--github', 'org/repo', '--github-ref', 'develop'])
    expect(config.github?.ref).toBe('develop')
  })

  it('parses --github-path', () => {
    const { config } = parseArgs(['--github', 'org/repo', '--github-path', 'docs'])
    expect(config.github?.path).toBe('docs')
  })

  it('parses --github-token', () => {
    const { config } = parseArgs(['--github', 'org/repo', '--github-token', 'ghp_secret'])
    expect(config.github?.token).toBe('ghp_secret')
  })
})

// ─── getPage ──────────────────────────────────────────────────────────────────

describe('GitHubSource.getPage', () => {
  beforeEach(() => mockFetch(SIMPLE_TREE, SIMPLE_FILES))
  afterEach(restoreFetch)

  it('returns root page for / slug', async () => {
    const source = new GitHubSource({ owner: 'o', repo: 'r' })
    const page = await source.getPage('/')
    expect(page).not.toBeNull()
    expect(page?.slug).toBe('/')
    expect(page?.meta.title).toBe('Home')
    expect(page?.body).toContain('Welcome home.')
  })

  it('returns page for /about slug', async () => {
    const source = new GitHubSource({ owner: 'o', repo: 'r' })
    const page = await source.getPage('/about')
    expect(page?.meta.title).toBe('About')
    expect(page?.body).toContain('About page.')
  })

  it('returns section index for /docs slug', async () => {
    const source = new GitHubSource({ owner: 'o', repo: 'r' })
    const page = await source.getPage('/docs')
    expect(page?.meta.title).toBe('Documentation')
    expect(page?.slug).toBe('/docs')
  })

  it('returns nested page for /docs/getting-started', async () => {
    const source = new GitHubSource({ owner: 'o', repo: 'r' })
    const page = await source.getPage('/docs/getting-started')
    expect(page?.meta.title).toBe('Getting Started')
  })

  it('returns null for non-existent page', async () => {
    const source = new GitHubSource({ owner: 'o', repo: 'r' })
    const page = await source.getPage('/nonexistent')
    expect(page).toBeNull()
  })

  it('strips trailing slash from slug', async () => {
    const source = new GitHubSource({ owner: 'o', repo: 'r' })
    const page = await source.getPage('/about/')
    expect(page?.meta.title).toBe('About')
  })

  it('strips .md suffix from slug', async () => {
    const source = new GitHubSource({ owner: 'o', repo: 'r' })
    const page = await source.getPage('/about.md')
    expect(page?.meta.title).toBe('About')
  })
})

// ─── getNavTree ───────────────────────────────────────────────────────────────

describe('GitHubSource.getNavTree', () => {
  beforeEach(() => mockFetch(SIMPLE_TREE, SIMPLE_FILES))
  afterEach(restoreFetch)

  it('builds hierarchical tree with sections', async () => {
    const source = new GitHubSource({ owner: 'o', repo: 'r' })
    const nav = await source.getNavTree()
    expect(nav.isSection).toBe(true)
    const docs = nav.children.find(c => c.slug === '/docs')
    expect(docs).toBeDefined()
    expect(docs?.isSection).toBe(true)
  })

  it('uses frontmatter title for section from index.md', async () => {
    const source = new GitHubSource({ owner: 'o', repo: 'r' })
    const nav = await source.getNavTree()
    const docs = nav.children.find(c => c.slug === '/docs')
    expect(docs?.title).toBe('Documentation')
  })

  it('uses frontmatter order for section from index.md', async () => {
    const source = new GitHubSource({ owner: 'o', repo: 'r' })
    const nav = await source.getNavTree()
    const docs = nav.children.find(c => c.slug === '/docs')
    expect(docs?.order).toBe(1)
  })

  it('adds leaf pages under their section', async () => {
    const source = new GitHubSource({ owner: 'o', repo: 'r' })
    const nav = await source.getNavTree()
    const docs = nav.children.find(c => c.slug === '/docs')
    expect(docs?.children.length).toBe(2)
    expect(docs?.children.some(c => c.slug === '/docs/getting-started')).toBe(true)
    expect(docs?.children.some(c => c.slug === '/docs/config')).toBe(true)
  })

  it('sorts children by order then title', async () => {
    const source = new GitHubSource({ owner: 'o', repo: 'r' })
    const nav = await source.getNavTree()
    const docs = nav.children.find(c => c.slug === '/docs')
    const slugs = docs?.children.map(c => c.slug) ?? []
    expect(slugs[0]).toBe('/docs/getting-started') // order: 1
    expect(slugs[1]).toBe('/docs/config') // order: 2
  })

  it('does not include index files as nav leaf nodes', async () => {
    const source = new GitHubSource({ owner: 'o', repo: 'r' })
    const nav = await source.getNavTree()
    // index.md should NOT appear as a separate leaf node
    const hasIndex = nav.children.some(c => c.slug === '/index')
    expect(hasIndex).toBe(false)
  })
})

// ─── draft pages ─────────────────────────────────────────────────────────────

describe('draft pages', () => {
  beforeEach(() => {
    mockFetch(
      [...SIMPLE_TREE, 'docs/wip.md'],
      { ...SIMPLE_FILES, 'docs/wip.md': '---\ntitle: WIP\ndraft: true\n---\n\nWork in progress.' }
    )
  })
  afterEach(restoreFetch)

  it('excludes draft pages from nav tree', async () => {
    const source = new GitHubSource({ owner: 'o', repo: 'r' })
    const nav = await source.getNavTree()
    const docs = nav.children.find(c => c.slug === '/docs')
    const wip = docs?.children.find(c => c.slug === '/docs/wip')
    expect(wip).toBeUndefined()
  })

  it('excludes draft pages from listPages', async () => {
    const source = new GitHubSource({ owner: 'o', repo: 'r' })
    const pages = await source.listPages()
    expect(pages.find(p => p.slug === '/docs/wip')).toBeUndefined()
  })
})

// ─── CLI validation ───────────────────────────────────────────────────────────

describe('CLI -- --github validation', () => {
  it('parses valid owner/repo', () => {
    const { config } = parseArgs(['--github', 'org/repo'])
    expect(config.github?.owner).toBe('org')
    expect(config.github?.repo).toBe('repo')
  })

  it('throws for missing slash (no-slash format)', () => {
    let exited = false
    const origExit = process.exit.bind(process)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(process as any).exit = () => { exited = true; throw new Error('exit') }
    try {
      parseArgs(['--github', 'noslash'])
    } catch {
      // expected
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(process as any).exit = origExit
    expect(exited).toBe(true)
  })

  it('throws for too many slashes (org/repo/extra)', () => {
    let exited = false
    const origExit = process.exit.bind(process)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(process as any).exit = () => { exited = true; throw new Error('exit') }
    try {
      parseArgs(['--github', 'org/repo/extra'])
    } catch {
      // expected
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(process as any).exit = origExit
    expect(exited).toBe(true)
  })
})

// ─── TTL cache ────────────────────────────────────────────────────────────────

describe('TTL cache', () => {
  afterEach(restoreFetch)

  it('does not re-fetch within TTL', async () => {
    let fetchCount = 0
    const files = { ...SIMPLE_FILES }
    globalThis.fetch = (async (url: string): Promise<Response> => {
      if (TREE_URL_RE.test(url)) {
        fetchCount++
        const tree = SIMPLE_TREE.map(path => ({ path, type: 'blob', sha: 'abc', size: 100 }))
        return new Response(JSON.stringify({ tree }), { status: 200 })
      }
      const m = RAW_URL_RE.exec(url)
      if (m != null && m[4] in files) {
        fetchCount++
        return new Response(files[m[4]], { status: 200 })
      }
      return new Response('Not Found', { status: 404 })
    }) as unknown as typeof fetch

    const source = new GitHubSource({ owner: 'o', repo: 'r' })
    await source.getPage('/')
    const countAfterFirst = fetchCount
    await source.getPage('/')
    // Second call should hit cache, no new fetches
    expect(fetchCount).toBe(countAfterFirst)
  })

  it('re-fetches after TTL expires', async () => {
    let fetchCount = 0
    globalThis.fetch = (async (url: string): Promise<Response> => {
      fetchCount++
      if (TREE_URL_RE.test(url)) {
        const tree = SIMPLE_TREE.map(path => ({ path, type: 'blob', sha: 'abc', size: 100 }))
        return new Response(JSON.stringify({ tree }), { status: 200 })
      }
      const m = RAW_URL_RE.exec(url)
      if (m != null && m[4] in SIMPLE_FILES) {
        return new Response(SIMPLE_FILES[m[4]], { status: 200 })
      }
      return new Response('Not Found', { status: 404 })
    }) as unknown as typeof fetch

    const source = new GitHubSource({ owner: 'o', repo: 'r' })
    await source.getNavTree()
    const afterFirst = fetchCount

    // Simulate TTL expiry by directly manipulating navCache
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(source as any).navCache = { value: (source as any).navCache.value, expiresAt: Date.now() - 1 }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(source as any).treeCache = null

    await source.getNavTree()
    expect(fetchCount).toBeGreaterThan(afterFirst)
  })

  it('refresh() clears all caches', async () => {
    let callCount = 0
    globalThis.fetch = (async (url: string): Promise<Response> => {
      callCount++
      if (TREE_URL_RE.test(url)) {
        const tree = SIMPLE_TREE.map(path => ({ path, type: 'blob', sha: 'abc', size: 100 }))
        return new Response(JSON.stringify({ tree }), { status: 200 })
      }
      const m = RAW_URL_RE.exec(url)
      if (m != null && m[4] in SIMPLE_FILES) {
        return new Response(SIMPLE_FILES[m[4]], { status: 200 })
      }
      return new Response('Not Found', { status: 404 })
    }) as unknown as typeof fetch

    const source = new GitHubSource({ owner: 'o', repo: 'r' })
    await source.getNavTree()
    const afterFirst = callCount
    await source.refresh()
    await source.getNavTree()
    // After refresh, should re-fetch
    expect(callCount).toBeGreaterThan(afterFirst)
  })
})

// ─── listPages ────────────────────────────────────────────────────────────────

describe('GitHubSource.listPages', () => {
  beforeEach(() => mockFetch(SIMPLE_TREE, SIMPLE_FILES))
  afterEach(restoreFetch)

  it('returns all non-draft pages', async () => {
    const source = new GitHubSource({ owner: 'o', repo: 'r' })
    const pages = await source.listPages()
    expect(pages.length).toBeGreaterThan(0)
    // Check a few expected slugs
    expect(pages.some(p => p.slug === '/')).toBe(true)
    expect(pages.some(p => p.slug === '/about')).toBe(true)
    expect(pages.some(p => p.slug === '/docs/getting-started')).toBe(true)
  })
})

// ─── subdirectory path ────────────────────────────────────────────────────────

describe('--github-path (subdirectory)', () => {
  it('fetches files relative to basePath', async () => {
    const capturedUrls: string[] = []
    globalThis.fetch = (async (url: string): Promise<Response> => {
      capturedUrls.push(url)
      if (TREE_URL_RE.test(url)) {
        const tree = [
          { path: 'content/index.md', type: 'blob', sha: 'abc' },
          { path: 'content/page.md', type: 'blob', sha: 'abc' }
        ]
        return new Response(JSON.stringify({ tree }), { status: 200 })
      }
      const m = RAW_URL_RE.exec(url)
      if (m != null) {
        const path = m[4]
        if (path === 'content/index.md') return new Response('---\ntitle: Home\n---\nHello', { status: 200 })
        if (path === 'content/page.md') return new Response('---\ntitle: Page\n---\nContent', { status: 200 })
      }
      return new Response('Not Found', { status: 404 })
    }) as unknown as typeof fetch

    const source = new GitHubSource({ owner: 'o', repo: 'r', path: 'content' })
    const page = await source.getPage('/')
    expect(page?.meta.title).toBe('Home')
    restoreFetch()
  })
})

// ─── tokenFn (dynamic token provider) ────────────────────────────────────────

describe('GitHubSource tokenFn', () => {
  afterEach(restoreFetch)

  it('tokenFn is called on each API request cycle', async () => {
    let callCount = 0
    const capturedAuthHeaders: string[] = []

    globalThis.fetch = (async (url: string, init?: RequestInit): Promise<Response> => {
      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization ?? ''
      if (auth !== '') capturedAuthHeaders.push(auth)

      if (TREE_URL_RE.test(url)) {
        const tree = [{ path: 'index.md', type: 'blob', sha: 'abc', size: 10 }]
        return new Response(JSON.stringify({ tree }), { status: 200 })
      }
      if (RAW_URL_RE.test(url)) {
        return new Response('---\ntitle: Home\n---\nHello', { status: 200 })
      }
      return new Response('Not Found', { status: 404 })
    }) as unknown as typeof fetch

    const source = new GitHubSource({
      owner: 'o',
      repo: 'r',
      tokenFn: () => {
        callCount++
        return `token-${callCount}`
      }
    })

    // Force a fresh prefetch by calling getNavTree
    await source.getNavTree()

    // tokenFn should have been called at least once (tree fetch + file fetches)
    expect(callCount).toBeGreaterThan(0)
    // All captured auth headers should use the dynamic token
    expect(capturedAuthHeaders.length).toBeGreaterThan(0)
    capturedAuthHeaders.forEach(h => {
      expect(h).toMatch(/^token token-\d+$/)
    })
  })

  it('tokenFn takes precedence over static token', async () => {
    const capturedAuthHeaders: string[] = []

    globalThis.fetch = (async (url: string, init?: RequestInit): Promise<Response> => {
      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization ?? ''
      if (auth !== '') capturedAuthHeaders.push(auth)

      if (TREE_URL_RE.test(url)) {
        const tree = [{ path: 'index.md', type: 'blob', sha: 'abc', size: 10 }]
        return new Response(JSON.stringify({ tree }), { status: 200 })
      }
      if (RAW_URL_RE.test(url)) {
        return new Response('---\ntitle: Home\n---\nHello', { status: 200 })
      }
      return new Response('Not Found', { status: 404 })
    }) as unknown as typeof fetch

    const source = new GitHubSource({
      owner: 'o',
      repo: 'r',
      token: 'static-token',
      tokenFn: () => 'dynamic-token'
    })

    await source.getNavTree()

    // All auth headers should use the dynamic token, never the static one
    expect(capturedAuthHeaders.length).toBeGreaterThan(0)
    capturedAuthHeaders.forEach(h => {
      expect(h).toBe('token dynamic-token')
      expect(h).not.toContain('static-token')
    })
  })

  it('tokenFn supports async providers', async () => {
    const capturedAuthHeaders: string[] = []

    globalThis.fetch = (async (url: string, init?: RequestInit): Promise<Response> => {
      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization ?? ''
      if (auth !== '') capturedAuthHeaders.push(auth)

      if (TREE_URL_RE.test(url)) {
        const tree = [{ path: 'index.md', type: 'blob', sha: 'abc', size: 10 }]
        return new Response(JSON.stringify({ tree }), { status: 200 })
      }
      if (RAW_URL_RE.test(url)) {
        return new Response('---\ntitle: Home\n---\nHello', { status: 200 })
      }
      return new Response('Not Found', { status: 404 })
    }) as unknown as typeof fetch

    const source = new GitHubSource({
      owner: 'o',
      repo: 'r',
      tokenFn: async () => {
        await new Promise<void>(resolve => setTimeout(resolve, 1))
        return 'async-token'
      }
    })

    await source.getNavTree()

    expect(capturedAuthHeaders.length).toBeGreaterThan(0)
    capturedAuthHeaders.forEach(h => {
      expect(h).toBe('token async-token')
    })
  })
})
