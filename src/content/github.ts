import picomatch from 'picomatch'
import { VERSION } from '../version.ts'
import { parseFrontmatter } from './frontmatter.ts'
import type {
  ContentSource,
  ContentPage,
  NavNode,
  GitHubSourceConfig
} from './types.ts'
import { buildNavTree as sharedBuildNavTree } from './nav-builder.ts'

const TTL_MS = 5 * 60 * 1000 // 5 minutes

const GITHUB_HEADERS: Record<string, string> = {
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': `mkdnsite/${VERSION}`,
  'X-GitHub-Api-Version': '2026-03-10'
}

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

interface ParsedFile {
  path: string
  meta: Record<string, unknown>
  body: string
  raw: string
}

/**
 * Content source that reads .md files from a public GitHub repository.
 *
 * Uses raw.githubusercontent.com for file content (fast, no API rate limits)
 * and the GitHub Git Trees API for file listing (one call, recursive).
 *
 * On first getNavTree() or listPages() call, fetches all .md file contents
 * in parallel, parses frontmatter, pre-populates the page cache, and builds
 * the nav tree. Subsequent calls use the TTL cache (default: 5 minutes).
 *
 * Rate limits:
 * - Unauthenticated: 60 GitHub API requests/hour (tree fetch only)
 * - Authenticated (token): 5,000 requests/hour
 * - raw.githubusercontent.com: no documented rate limit (generous)
 */
export class GitHubSource implements ContentSource {
  private readonly config: Required<Omit<GitHubSourceConfig, 'include' | 'exclude'>>
  private readonly pageCache = new Map<string, CacheEntry<ContentPage | null>>()
  private navCache: CacheEntry<NavNode> | null = null
  private treeCache: CacheEntry<GitHubTreeEntry[]> | null = null
  private prefetchPromise: Promise<void> | null = null
  private readonly includeMatcher: picomatch.Matcher | null
  private readonly excludeMatcher: picomatch.Matcher | null

  constructor (config: GitHubSourceConfig) {
    this.config = {
      owner: config.owner,
      repo: config.repo,
      ref: config.ref ?? 'main',
      path: config.path ?? '',
      token: config.token ?? ''
    }
    this.includeMatcher = config.include != null && config.include.length > 0
      ? picomatch(config.include)
      : null
    this.excludeMatcher = config.exclude != null && config.exclude.length > 0
      ? picomatch(config.exclude)
      : null
  }

  /** Returns true if a relative file path should be served, based on include/exclude patterns. */
  private shouldInclude (relPath: string): boolean {
    const p = relPath.replace(/\\/g, '/')
    if (this.includeMatcher != null) return this.includeMatcher(p)
    if (this.excludeMatcher != null) return !this.excludeMatcher(p)
    return true
  }

  async getPage (slug: string): Promise<ContentPage | null> {
    const key = slugToKey(slug)
    const cached = this.pageCache.get(key)
    if (cached != null && cached.expiresAt > Date.now()) {
      return cached.value
    }

    // Pre-populate cache via bulk prefetch
    await this.ensurePrefetched()

    const afterPrefetch = this.pageCache.get(key)
    if (afterPrefetch != null && afterPrefetch.expiresAt > Date.now()) {
      return afterPrefetch.value
    }

    // Fallback: individual file fetch (handles slugs not in tree, e.g. after refresh)
    const result = await this.fetchPageByKey(key)
    this.setPage(key, result)
    return result
  }

  async getNavTree (): Promise<NavNode> {
    if (this.navCache != null && this.navCache.expiresAt > Date.now()) {
      return this.navCache.value
    }
    await this.ensurePrefetched()
    if (this.navCache != null && this.navCache.expiresAt > Date.now()) return this.navCache.value
    return this.emptyRoot()
  }

  async listPages (): Promise<ContentPage[]> {
    await this.ensurePrefetched()
    const pages: ContentPage[] = []
    for (const [, entry] of this.pageCache) {
      if (entry.expiresAt > Date.now() && entry.value != null && entry.value.meta.draft !== true) {
        pages.push(entry.value)
      }
    }
    return pages.sort((a, b) => a.slug.localeCompare(b.slug))
  }

  async refresh (): Promise<void> {
    this.pageCache.clear()
    this.navCache = null
    this.treeCache = null
    this.prefetchPromise = null
  }

  // ─── Private: prefetch ──────────────────────────────────────────────────────

  /**
   * Ensures all .md files have been fetched and cached. Only runs once per
   * TTL window — concurrent callers share the same promise.
   */
  private async ensurePrefetched (): Promise<void> {
    const stale = this.navCache == null || this.navCache.expiresAt <= Date.now()
    if (this.prefetchPromise != null && !stale) {
      await this.prefetchPromise
      return
    }
    this.prefetchPromise = this.prefetchAll()
    await this.prefetchPromise
  }

  private async prefetchAll (): Promise<void> {
    const tree = await this.fetchRepoTree()
    const mdFiles = tree.filter(e =>
      e.type === 'blob' &&
      e.path.endsWith('.md') &&
      this.shouldInclude(e.path)
    )

    // Fetch all file contents in parallel
    const fetched = await Promise.all(
      mdFiles.map(async (entry) => {
        const raw = await this.fetchFile(entry.path)
        if (raw == null) return null
        const { meta, body } = parseFrontmatter(raw)
        const parsed: ParsedFile = { path: entry.path, meta: meta as Record<string, unknown>, body, raw }
        return parsed
      })
    )

    const parsed = fetched.filter((f): f is ParsedFile => f != null)
    if (parsed.length < mdFiles.length) {
      console.warn(`GitHubSource: fetched ${parsed.length}/${mdFiles.length} files (${mdFiles.length - parsed.length} failed)`)
    }

    // Populate page cache
    for (const file of parsed) {
      const key = filePathToKey(file.path)
      const slug = keyToSlug(key)
      const page: ContentPage = {
        slug,
        sourcePath: file.path,
        meta: file.meta,
        body: file.body,
        raw: file.raw
      }
      this.setPage(key, page)
    }

    // Build nav tree
    const nav = sharedBuildNavTree(parsed)
    this.navCache = { value: nav, expiresAt: Date.now() + TTL_MS }
  }

  // ─── Private: fetching ──────────────────────────────────────────────────────

  private async fetchPageByKey (key: string): Promise<ContentPage | null> {
    const candidates =
      key === 'index'
        ? ['index.md', 'README.md', 'readme.md']
        : [
            `${key}.md`,
            `${key}/index.md`,
            `${key}/README.md`,
            `${key}/readme.md`
          ]

    for (const filePath of candidates) {
      // Respect include/exclude patterns before fetching
      if (!this.shouldInclude(filePath)) return null

      const raw = await this.fetchFile(filePath)
      if (raw != null) {
        const { meta, body } = parseFrontmatter(raw)
        return {
          slug: keyToSlug(key),
          sourcePath: filePath,
          meta: meta as Record<string, unknown>,
          body,
          raw
        }
      }
    }
    return null
  }

  private async fetchFile (filePath: string): Promise<string | null> {
    const { owner, repo, ref, path: basePath } = this.config
    const fullPath = basePath !== '' ? `${basePath}/${filePath}` : filePath
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${fullPath}`

    const headers: Record<string, string> = { 'User-Agent': `mkdnsite/${VERSION}` }
    if (this.config.token !== '') {
      headers.Authorization = `token ${this.config.token}`
    }

    try {
      const response = await fetch(url, { headers })
      if (!response.ok) return null
      return await response.text()
    } catch {
      return null
    }
  }

  private async fetchRepoTree (): Promise<GitHubTreeEntry[]> {
    if (this.treeCache != null && this.treeCache.expiresAt > Date.now()) {
      return this.treeCache.value
    }

    const entries = await this.fetchTreeOnce()
    if (entries.length === 0) {
      // Retry once after 1 second — transient failures (rate limit, network
      // blip) often resolve quickly and an empty tree causes silent empty nav.
      console.warn('GitHubSource: tree fetch returned empty, retrying in 1s...')
      await new Promise<void>(resolve => setTimeout(resolve, 1000))
      const retried = await this.fetchTreeOnce()
      if (retried.length > 0) {
        this.treeCache = { value: retried, expiresAt: Date.now() + TTL_MS }
        return retried
      }
      // Both attempts failed — leave treeCache empty so next request retries
      return entries
    }

    this.treeCache = { value: entries, expiresAt: Date.now() + TTL_MS }
    return entries
  }

  private async fetchTreeOnce (): Promise<GitHubTreeEntry[]> {
    const { owner, repo, ref, path: basePath } = this.config
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`

    const headers: Record<string, string> = { ...GITHUB_HEADERS }
    if (this.config.token !== '') {
      headers.Authorization = `token ${this.config.token}`
    }

    try {
      const response = await fetch(url, { headers })
      if (!response.ok) {
        const body = await response.text().catch(() => '')
        console.error('GitHubSource: tree API returned', response.status, body)
        return []
      }

      const data = await response.json() as { tree: GitHubTreeEntry[] }
      return data.tree
        .filter(entry =>
          entry.type === 'blob' &&
          entry.path.endsWith('.md') &&
          (basePath === '' || entry.path.startsWith(basePath + '/'))
        )
        .map(entry => ({
          ...entry,
          path: basePath !== '' ? entry.path.slice(basePath.length + 1) : entry.path
        }))
    } catch (err) {
      console.error('GitHubSource: failed to fetch repo tree:', err instanceof Error ? err.message : err)
      return []
    }
  }

  // ─── Private: helpers ───────────────────────────────────────────────────────

  private setPage (key: string, value: ContentPage | null): void {
    this.pageCache.set(key, { value, expiresAt: Date.now() + TTL_MS })
  }

  private emptyRoot (): NavNode {
    return { title: 'Root', slug: '/', order: 0, children: [], isSection: true }
  }
}

// ─── Slug/key helpers ────────────────────────────────────────────────────────

function slugToKey (slug: string): string {
  const stripped = slug.replace(/^\/+|\.md$/g, '').replace(/\/+$/, '')
  return stripped === '' ? 'index' : stripped
}

function filePathToKey (filePath: string): string {
  const noExt = filePath.replace(/\.md$/, '')
  if (noExt === 'index' || noExt === 'README' || noExt === 'readme') return 'index'
  if (/\/(?:index|README|readme)$/.test(noExt)) return noExt.replace(/\/(?:index|README|readme)$/, '')
  return noExt
}

function keyToSlug (key: string): string {
  return key === 'index' ? '/' : `/${key}`
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface GitHubTreeEntry {
  path: string
  type: string
  sha: string
  size?: number
}
