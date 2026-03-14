import { parseFrontmatter } from './frontmatter.ts'
import type {
  ContentSource,
  ContentPage,
  NavNode,
  GitHubSourceConfig
} from './types.ts'

const TTL_MS = 5 * 60 * 1000 // 5 minutes

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
  private readonly config: Required<GitHubSourceConfig>
  private readonly pageCache = new Map<string, CacheEntry<ContentPage | null>>()
  private navCache: CacheEntry<NavNode> | null = null
  private treeCache: CacheEntry<GitHubTreeEntry[]> | null = null
  private prefetchPromise: Promise<void> | null = null

  constructor (config: GitHubSourceConfig) {
    this.config = {
      owner: config.owner,
      repo: config.repo,
      ref: config.ref ?? 'main',
      path: config.path ?? '',
      token: config.token ?? ''
    }
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
    const mdFiles = tree.filter(e => e.type === 'blob' && e.path.endsWith('.md'))

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
    const nav = buildNavTree(parsed)
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

    const headers: Record<string, string> = {}
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

    const { owner, repo, ref, path: basePath } = this.config
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json'
    }
    if (this.config.token !== '') {
      headers.Authorization = `token ${this.config.token}`
    }

    try {
      const response = await fetch(url, { headers })
      if (!response.ok) return []

      const data = await response.json() as { tree: GitHubTreeEntry[] }
      const entries = data.tree
        .filter(entry =>
          entry.type === 'blob' &&
          entry.path.endsWith('.md') &&
          (basePath === '' || entry.path.startsWith(basePath + '/'))
        )
        .map(entry => ({
          ...entry,
          path: basePath !== '' ? entry.path.slice(basePath.length + 1) : entry.path
        }))

      this.treeCache = { value: entries, expiresAt: Date.now() + TTL_MS }
      return entries
    } catch {
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

// ─── Nav tree builder ────────────────────────────────────────────────────────

function buildNavTree (files: ParsedFile[]): NavNode {
  const root: NavNode = { title: 'Root', slug: '/', order: 0, children: [], isSection: true }
  const sections = new Map<string, NavNode>()
  sections.set('', root)

  const isIndex = (p: string): boolean =>
    /(?:^|\/)(?:index|README|readme)\.md$/.test(p)

  const indexFiles = files.filter(f => isIndex(f.path))
  const leafFiles = files.filter(f => !isIndex(f.path))

  // Apply index file metadata to section nodes
  for (const file of indexFiles) {
    const parts = file.path.split('/')
    const dirParts = parts.slice(0, -1) // remove filename
    if (dirParts.length === 0) continue // root index — not a section node

    const dirPath = dirParts.join('/')
    const section = getOrCreateSection(sections, dirPath, root)
    if (file.meta.title != null) section.title = file.meta.title as string
    if (file.meta.order != null) section.order = file.meta.order as number
  }

  // Add leaf nodes (non-index .md files)
  for (const file of leafFiles) {
    if (file.meta.draft === true) continue

    const parts = file.path.split('/')
    const fileName = parts[parts.length - 1]
    const dirParts = parts.slice(0, -1)
    const dirPath = dirParts.join('/')

    const parent = getOrCreateSection(sections, dirPath, root)
    const name = fileName.replace(/\.md$/, '')
    const slugPath = file.path.replace(/\.md$/, '')
    const node: NavNode = {
      title: file.meta.title != null ? file.meta.title as string : titleCase(name),
      slug: '/' + slugPath,
      order: file.meta.order != null ? file.meta.order as number : 999,
      children: [],
      isSection: false
    }
    parent.children.push(node)
  }

  // Prune empty sections (sections with no navigable children)
  pruneEmpty(root)

  sortNode(root)
  return root
}

function getOrCreateSection (
  sections: Map<string, NavNode>,
  path: string,
  root: NavNode
): NavNode {
  if (sections.has(path)) return sections.get(path) as NavNode
  if (path === '') return root

  const parts = path.split('/')
  const parentPath = parts.slice(0, -1).join('/')
  const name = parts[parts.length - 1]
  const parent = getOrCreateSection(sections, parentPath, root)

  const section: NavNode = {
    title: titleCase(name),
    slug: '/' + path,
    order: 999,
    children: [],
    isSection: true
  }
  sections.set(path, section)
  parent.children.push(section)
  return section
}

function pruneEmpty (node: NavNode): boolean {
  node.children = node.children.filter(child => {
    if (!child.isSection) return true
    return pruneEmpty(child)
  })
  return node.children.length > 0
}

function sortNode (node: NavNode): void {
  node.children.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.title.localeCompare(b.title)
  })
  for (const child of node.children) {
    if (child.isSection) sortNode(child)
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

function titleCase (str: string): string {
  return str.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface GitHubTreeEntry {
  path: string
  type: string
  sha: string
  size?: number
}
