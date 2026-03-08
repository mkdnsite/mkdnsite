import { parseFrontmatter } from './frontmatter.ts'
import type {
  ContentSource,
  ContentPage,
  NavNode,
  GitHubSourceConfig
} from './types.ts'

/**
 * Content source that reads .md files from a public GitHub repository.
 *
 * Uses the GitHub Contents API (or raw.githubusercontent.com for performance).
 * Supports caching for production use (bring your own cache backend).
 *
 * Rate limits:
 * - Unauthenticated: 60 requests/hour
 * - Authenticated (token): 5,000 requests/hour
 *
 * For the hosted service (mkdn.io), this source will be paired with:
 * - Upstash Redis cache for rendered pages
 * - GitHub webhook for cache invalidation on push
 * - Optional R2 mirror for high-traffic sites
 */
export class GitHubSource implements ContentSource {
  private readonly config: Required<GitHubSourceConfig>
  private readonly cache = new Map<string, ContentPage>()
  private navCache: NavNode | null = null

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
    const stripped = slug.replace(/^\/+|\/+$/g, '')
    const normalized = stripped !== '' ? stripped : 'index'

    if (this.cache.has(normalized)) {
      return this.cache.get(normalized) ?? null
    }

    const candidates = [
      `${normalized}.md`,
      `${normalized}/index.md`
    ]

    if (normalized === 'index') {
      candidates.unshift('index.md')
      candidates.unshift('README.md')
    }

    for (const filePath of candidates) {
      const raw = await this.fetchFile(filePath)
      if (raw != null) {
        const parsed = parseFrontmatter(raw)
        const page: ContentPage = {
          slug: `/${normalized === 'index' ? '' : normalized}`,
          sourcePath: filePath,
          meta: parsed.meta,
          body: parsed.body,
          raw: parsed.raw
        }

        this.cache.set(normalized, page)
        return page
      }
    }

    return null
  }

  async getNavTree (): Promise<NavNode> {
    if (this.navCache != null) return this.navCache

    // Fetch the repo tree via GitHub API
    const tree = await this.fetchRepoTree()
    this.navCache = this.buildNavFromTree(tree)
    return this.navCache
  }

  async listPages (): Promise<ContentPage[]> {
    const tree = await this.fetchRepoTree()
    const mdFiles = tree.filter(f => f.path.endsWith('.md'))

    const pages: ContentPage[] = []
    for (const file of mdFiles) {
      const slug = file.path
        .replace(/\.md$/, '')
        .replace(/\/index$/, '')
        .replace(/\/README$/, '')
      const page = await this.getPage(slug)
      if (page != null) pages.push(page)
    }

    return pages.sort((a, b) => a.slug.localeCompare(b.slug))
  }

  async refresh (): Promise<void> {
    this.cache.clear()
    this.navCache = null
  }

  /**
   * Fetch a file from the GitHub repo via raw.githubusercontent.com
   * (faster than the API, no rate limit headers, but no metadata).
   */
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

  /**
   * Fetch the full repo tree via the GitHub Git Trees API.
   * Uses ?recursive=1 to get all files in one request.
   */
  private async fetchRepoTree (): Promise<GitHubTreeEntry[]> {
    const { owner, repo, ref } = this.config
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
      const basePath = this.config.path

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
    } catch {
      return []
    }
  }

  private buildNavFromTree (entries: GitHubTreeEntry[]): NavNode {
    // TODO: Build proper tree structure from flat file list
    // For now, return a flat list
    const children: NavNode[] = entries
      .filter(e => e.path.endsWith('.md') && e.path !== 'index.md' && e.path !== 'README.md')
      .map(e => {
        const name = e.path.replace(/\.md$/, '').split('/').pop() ?? e.path
        return {
          title: titleCase(name),
          slug: '/' + e.path.replace(/\.md$/, '').replace(/\/index$/, ''),
          order: 999,
          children: [],
          isSection: false
        }
      })

    return {
      title: 'Root',
      slug: '/',
      order: 0,
      children,
      isSection: true
    }
  }
}

interface GitHubTreeEntry {
  path: string
  type: string
  sha: string
  size?: number
}

function titleCase (str: string): string {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
