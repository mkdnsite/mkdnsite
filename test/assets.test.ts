import { describe, it, expect } from 'bun:test'
import { AssetsSource } from '../src/content/assets.ts'

// ─── Mock Assets Fetcher ─────────────────────────────────────────────────────

class MockAssetsFetcher {
  private readonly files = new Map<string, string>()

  addFile (path: string, content: string): void {
    this.files.set(path, content)
  }

  async fetch (input: Request | string): Promise<Response> {
    const url = typeof input === 'string' ? input : input.url
    const parsed = new URL(url)
    const path = parsed.pathname.replace(/^\//, '')

    const content = this.files.get(path)
    if (content == null) {
      return new Response('Not found', { status: 404 })
    }
    return new Response(content, { status: 200 })
  }
}

function createMockAssets (): MockAssetsFetcher {
  const mock = new MockAssetsFetcher()
  mock.addFile('index.md', '---\ntitle: Home\n---\nWelcome')
  mock.addFile('about.md', '---\ntitle: About\norder: 2\n---\nAbout page')
  mock.addFile('docs/getting-started.md', '---\ntitle: Getting Started\norder: 1\n---\nGet started here')
  mock.addFile('docs/index.md', '---\ntitle: Documentation\norder: 1\n---\nDocs index')
  mock.addFile('drafts/secret.md', '---\ntitle: Secret\ndraft: true\n---\nDraft content')
  return mock
}

const MANIFEST = [
  'index.md',
  'about.md',
  'docs/getting-started.md',
  'docs/index.md',
  'drafts/secret.md'
]

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AssetsSource — getPage', () => {
  it('returns root page from index.md', async () => {
    const source = new AssetsSource({ assets: createMockAssets(), manifest: MANIFEST })
    const page = await source.getPage('/')
    expect(page).not.toBeNull()
    expect(page?.meta.title).toBe('Home')
    expect(page?.slug).toBe('/')
  })

  it('returns nested page by slug', async () => {
    const source = new AssetsSource({ assets: createMockAssets(), manifest: MANIFEST })
    const page = await source.getPage('/about')
    expect(page).not.toBeNull()
    expect(page?.meta.title).toBe('About')
  })

  it('finds section index via /slug/index.md', async () => {
    const source = new AssetsSource({ assets: createMockAssets(), manifest: MANIFEST })
    const page = await source.getPage('/docs')
    expect(page).not.toBeNull()
    expect(page?.meta.title).toBe('Documentation')
  })

  it('returns null for non-existent page', async () => {
    const source = new AssetsSource({ assets: createMockAssets(), manifest: MANIFEST })
    const page = await source.getPage('/nonexistent')
    expect(page).toBeNull()
  })

  it('returns null for draft pages', async () => {
    const source = new AssetsSource({ assets: createMockAssets(), manifest: MANIFEST })
    const page = await source.getPage('/drafts/secret')
    expect(page).toBeNull()
  })
})

describe('AssetsSource — listPages', () => {
  it('returns all non-draft pages', async () => {
    const source = new AssetsSource({ assets: createMockAssets(), manifest: MANIFEST })
    const pages = await source.listPages()
    expect(pages.length).toBe(4)
    expect(pages.find(p => p.meta.draft === true)).toBeUndefined()
  })
})

describe('AssetsSource — getNavTree', () => {
  it('builds correct nav tree structure', async () => {
    const source = new AssetsSource({ assets: createMockAssets(), manifest: MANIFEST })
    const nav = await source.getNavTree()
    expect(nav.children.length).toBeGreaterThan(0)
    const docsSection = nav.children.find(c => c.title === 'Documentation')
    expect(docsSection).toBeDefined()
    expect(docsSection?.isSection).toBe(true)
  })
})

describe('AssetsSource — manifest discovery', () => {
  it('uses _manifest.json from assets when no explicit manifest provided', async () => {
    const mock = createMockAssets()
    mock.addFile('_manifest.json', JSON.stringify(MANIFEST))
    const source = new AssetsSource({ assets: mock })
    const page = await source.getPage('/')
    expect(page).not.toBeNull()
    expect(page?.meta.title).toBe('Home')
  })

  it('throws when no manifest is available', async () => {
    const mock = new MockAssetsFetcher()
    const source = new AssetsSource({ assets: mock })
    await expect(source.getPage('/')).rejects.toThrow('manifest')
  })

  it('explicit manifest takes priority over _manifest.json', async () => {
    const mock = createMockAssets()
    mock.addFile('_manifest.json', JSON.stringify(['index.md', 'about.md', 'docs/index.md', 'docs/getting-started.md', 'drafts/secret.md']))
    const source = new AssetsSource({ assets: mock, manifest: ['index.md'] })
    const pages = await source.listPages()
    expect(pages.length).toBe(1) // only index.md from explicit manifest
  })
})

describe('AssetsSource — caching and refresh', () => {
  it('refresh() clears cache so new files are visible', async () => {
    const mock = createMockAssets()
    const source = new AssetsSource({ assets: mock, manifest: MANIFEST })
    const pages = await source.listPages()
    expect(pages.length).toBe(4)

    // Add a new file and update manifest
    mock.addFile('new-page.md', '---\ntitle: New Page\n---\nNew content')
    const source2 = new AssetsSource({
      assets: mock,
      manifest: [...MANIFEST, 'new-page.md']
    })
    const pages2 = await source2.listPages()
    expect(pages2.length).toBe(5)
  })
})
