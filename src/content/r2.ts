import { parseFrontmatter } from './frontmatter.ts'
import type { ContentSource, ContentPage, NavNode } from './types.ts'
import { buildNavTree } from './nav-builder.ts'

const TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

/** Parsed R2 file ready for use */
interface ParsedFile {
  /** Relative path from content root, e.g. 'docs/getting-started.md' */
  path: string
  meta: Record<string, unknown>
  body: string
  raw: string
}

export interface R2ContentSourceConfig {
  /** R2 bucket binding */
  bucket: R2Bucket
  /** Key prefix for content (e.g. 'sites/abc123/') */
  basePath?: string
}

// ─── R2 type stubs (not available outside Cloudflare Workers) ────────────────

interface R2Bucket {
  get: (key: string) => Promise<R2Object | null>
  list: (options?: R2ListOptions) => Promise<R2ObjectList>
}

interface R2Object {
  key: string
  uploaded: Date
  size: number
  text: () => Promise<string>
}

interface R2ObjectList {
  objects: R2Object[]
  truncated: boolean
  cursor?: string
}

interface R2ListOptions {
  prefix?: string
  cursor?: string
  limit?: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function listAllMdFiles (bucket: R2Bucket, prefix: string): Promise<R2Object[]> {
  const objects: R2Object[] = []
  let cursor: string | undefined
  do {
    const result = await bucket.list({ prefix, cursor })
    objects.push(...result.objects.filter(o => o.key.endsWith('.md')))
    cursor = result.truncated ? result.cursor : undefined
  } while (cursor != null)
  return objects
}

/** Convert a URL slug to a relative content key (no basePath prefix) */
function slugToRelKey (slug: string): string {
  const stripped = slug.replace(/^\/+|\.md$/g, '').replace(/\/+$/, '')
  return stripped === '' ? 'index' : stripped
}

function keyToRelPath (key: string, basePath: string): string {
  return basePath !== '' && key.startsWith(basePath)
    ? key.slice(basePath.length)
    : key
}

// ─── R2ContentSource ─────────────────────────────────────────────────────────

/**
 * Content source that reads .md files from a Cloudflare R2 bucket.
 *
 * Lazy prefetch: on first access, lists all .md keys, fetches them in parallel,
 * parses frontmatter, and caches for TTL_MS (5 minutes).
 */
export class R2ContentSource implements ContentSource {
  private readonly bucket: R2Bucket
  private readonly basePath: string

  private pagesCache: CacheEntry<Map<string, ParsedFile>> | null = null
  private navCache: CacheEntry<NavNode> | null = null
  private initPromise: Promise<Map<string, ParsedFile>> | null = null

  constructor (config: R2ContentSourceConfig) {
    this.bucket = config.bucket
    // Normalise basePath to end with '/' or be empty
    const raw = config.basePath ?? ''
    this.basePath = raw !== '' && !raw.endsWith('/') ? raw + '/' : raw
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  async getPage (slug: string): Promise<ContentPage | null> {
    const pages = await this.ensurePrefetched()
    const key = slugToRelKey(slug)

    // Try exact key, then /index.md, then /README.md (all relative keys, no basePath)
    for (const candidate of [key, key + '/index', key + '/README']) {
      const file = pages.get(candidate)
      if (file != null && file.meta.draft !== true) {
        return this.toContentPage(file)
      }
    }
    return null
  }

  async getNavTree (): Promise<NavNode> {
    await this.ensurePrefetched()
    if (this.navCache != null && Date.now() < this.navCache.expiresAt) {
      return this.navCache.value
    }
    const pages = await this.ensurePrefetched()
    const files = Array.from(pages.values())
    const nav = buildNavTree(files)
    this.navCache = { value: nav, expiresAt: Date.now() + TTL_MS }
    return nav
  }

  async listPages (): Promise<ContentPage[]> {
    const pages = await this.ensurePrefetched()
    return Array.from(pages.values())
      .filter(f => f.meta.draft !== true)
      .map(f => this.toContentPage(f))
  }

  async refresh (): Promise<void> {
    this.pagesCache = null
    this.navCache = null
    this.initPromise = null
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private async ensurePrefetched (): Promise<Map<string, ParsedFile>> {
    if (this.pagesCache != null && Date.now() < this.pagesCache.expiresAt) {
      return this.pagesCache.value
    }
    if (this.initPromise != null) return await this.initPromise
    this.initPromise = this.prefetchAll()
    const result = await this.initPromise
    this.initPromise = null
    return result
  }

  private async prefetchAll (): Promise<Map<string, ParsedFile>> {
    const objects = await listAllMdFiles(this.bucket, this.basePath)

    const fetched = await Promise.all(
      objects.map(async (obj) => {
        try {
          const r2obj = await this.bucket.get(obj.key)
          if (r2obj == null) return null
          const raw = await r2obj.text()
          const { meta, body } = parseFrontmatter(raw)
          const relPath = keyToRelPath(obj.key, this.basePath)
          return { path: relPath, meta: meta as Record<string, unknown>, body, raw } satisfies ParsedFile
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

    this.pagesCache = { value: pages, expiresAt: Date.now() + TTL_MS }
    this.navCache = null // invalidate nav on refresh
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
