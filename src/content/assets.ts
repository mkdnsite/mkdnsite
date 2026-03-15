import { parseFrontmatter } from './frontmatter.ts'
import type { ContentSource, ContentPage, NavNode } from './types.ts'
import type { ContentCache } from './cache.ts'
import { MemoryContentCache } from './cache.ts'
import { buildNavTree } from './nav-builder.ts'

interface ParsedFile {
  path: string
  meta: Record<string, unknown>
  body: string
  raw: string
}

export interface AssetsSourceConfig {
  /** Workers Static Assets Fetcher binding */
  assets: AssetsFetcher
  /** Explicit list of .md file paths (if _manifest.json is not available) */
  manifest?: string[]
  /** Optional cache layer (defaults to in-memory). Pass KVContentCache for durable caching. */
  cache?: ContentCache
}

// ─── Workers Static Assets type stub ─────────────────────────────────────────

interface AssetsFetcher {
  fetch: (input: Request | string) => Promise<Response>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugToRelKey (slug: string): string {
  const stripped = slug.replace(/^\/+|\.md$/g, '').replace(/\/+$/, '')
  return stripped === '' ? 'index' : stripped
}

// ─── AssetsSource ────────────────────────────────────────────────────────────

/**
 * Content source that reads .md files from Cloudflare Workers Static Assets.
 *
 * Workers Static Assets are deployed alongside the Worker via wrangler deploy.
 * Since the ASSETS binding doesn't support directory listing, a manifest of
 * .md file paths is required. The manifest can be provided via:
 *
 * 1. A `_manifest.json` file in the assets directory (auto-discovered)
 * 2. An explicit `manifest` array in the config
 *
 * Generate a manifest with:
 *   find content -name '*.md' -printf '%P\n' | sort | jq -R -s 'split("\n") | map(select(. != ""))' > content/_manifest.json
 *
 * Or use the helper:
 *   npx mkdnsite manifest --dir content > content/_manifest.json
 */
export class AssetsSource implements ContentSource {
  private readonly assets: AssetsFetcher
  private readonly explicitManifest: string[] | null
  private readonly cache: ContentCache

  private rawCache: Map<string, ParsedFile> | null = null
  private rawCacheExpiresAt: number = 0
  private initPromise: Promise<Map<string, ParsedFile>> | null = null

  constructor (config: AssetsSourceConfig) {
    this.assets = config.assets
    this.explicitManifest = config.manifest ?? null
    this.cache = config.cache ?? new MemoryContentCache()
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  async getPage (slug: string): Promise<ContentPage | null> {
    const key = slugToRelKey(slug)

    // Try cache first
    for (const candidate of [key, key + '/index', key + '/README', key + '/readme']) {
      const cached = await this.cache.getPage(candidate)
      if (cached != null) return cached
    }

    // Fall through to prefetch
    const pages = await this.ensurePrefetched()

    for (const candidate of [key, key + '/index', key + '/README', key + '/readme']) {
      const file = pages.get(candidate)
      if (file != null && file.meta.draft !== true) {
        const page = this.toContentPage(file)
        await this.cache.setPage(candidate, page)
        return page
      }
    }
    return null
  }

  async getNavTree (): Promise<NavNode> {
    const cached = await this.cache.getNav()
    if (cached != null) return cached

    const pages = await this.ensurePrefetched()
    const files = Array.from(pages.values())
    const nav = buildNavTree(files)
    await this.cache.setNav(nav)
    return nav
  }

  async listPages (): Promise<ContentPage[]> {
    const cached = await this.cache.getPageList()
    if (cached != null) return cached

    const pages = await this.ensurePrefetched()
    const result = Array.from(pages.values())
      .filter(f => f.meta.draft !== true)
      .map(f => this.toContentPage(f))
    await this.cache.setPageList(result)
    return result
  }

  async refresh (): Promise<void> {
    this.rawCache = null
    this.rawCacheExpiresAt = 0
    this.initPromise = null
    await this.cache.clear()
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private async ensurePrefetched (): Promise<Map<string, ParsedFile>> {
    if (this.rawCache != null && Date.now() < this.rawCacheExpiresAt) {
      return this.rawCache
    }
    if (this.initPromise != null) return await this.initPromise
    this.initPromise = this.prefetchAll()
    const result = await this.initPromise
    this.initPromise = null
    return result
  }

  private async getManifest (): Promise<string[]> {
    if (this.explicitManifest != null) return this.explicitManifest

    // Try to fetch _manifest.json from static assets
    try {
      const response = await this.assets.fetch(new Request('http://assets/_manifest.json'))
      if (response.ok) {
        const manifest = await response.json() as string[]
        if (Array.isArray(manifest)) return manifest
      }
    } catch {
      // manifest not available
    }

    throw new Error(
      'AssetsSource: No manifest found. Create a _manifest.json file listing your .md paths, ' +
      'or pass a manifest array to AssetsSourceConfig.'
    )
  }

  private async prefetchAll (): Promise<Map<string, ParsedFile>> {
    const manifest = await this.getManifest()
    const mdPaths = manifest.filter(p => p.endsWith('.md'))

    const fetched = await Promise.all(
      mdPaths.map(async (filePath) => {
        try {
          const response = await this.assets.fetch(new Request(`http://assets/${filePath}`))
          if (!response.ok) return null
          const raw = await response.text()
          const { meta, body } = parseFrontmatter(raw)
          return { path: filePath, meta: meta as Record<string, unknown>, body, raw } satisfies ParsedFile
        } catch {
          return null
        }
      })
    )

    const pages = new Map<string, ParsedFile>()
    for (const file of fetched) {
      if (file == null) continue
      const key = file.path.replace(/\.md$/, '')
      pages.set(key, file)
    }

    this.rawCache = pages
    this.rawCacheExpiresAt = Date.now() + 5 * 60 * 1000
    return pages
  }

  private toContentPage (file: ParsedFile): ContentPage {
    const key = file.path.replace(/\.md$/, '')
    const isIndex = /(?:^|\/)(?:index|README|readme)$/.test(key)
    const cleanKey = isIndex
      ? key.replace(/\/(?:index|README|readme)$/, '')
      : key
    const slug = cleanKey === '' || cleanKey === 'index' ? '/' : '/' + cleanKey
    return {
      slug,
      sourcePath: file.path,
      meta: file.meta,
      body: file.body,
      raw: file.raw
    }
  }
}
