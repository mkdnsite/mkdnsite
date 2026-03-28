/**
 * Parsed frontmatter metadata from a markdown file.
 */
export interface MarkdownMeta {
  title?: string
  description?: string
  date?: string
  updated?: string
  draft?: boolean
  order?: number
  tags?: string[]
  layout?: string
  /** Hero / banner image URL. Also accepts `hero` as alias. Falls back to `og_image`. */
  hero_image?: string
  /** Alias for hero_image */
  hero?: string
  /** OpenGraph image — also used as hero fallback */
  og_image?: string
  [key: string]: unknown
}

/**
 * A single content page derived from a .md file.
 */
export interface ContentPage {
  /** URL path slug (e.g. /docs/getting-started) */
  slug: string
  /** Source path (filesystem path, R2 key, GitHub path, etc.) */
  sourcePath: string
  /** Parsed frontmatter metadata */
  meta: MarkdownMeta
  /** Raw markdown body (without frontmatter) */
  body: string
  /** Original raw content (with frontmatter) */
  raw: string
  /** Last modified timestamp */
  modifiedAt?: Date
}

/**
 * A node in the site navigation tree.
 */
export interface NavNode {
  title: string
  slug: string
  order: number
  children: NavNode[]
  isSection: boolean
}

/**
 * Content source interface.
 *
 * Implementations provide content from different backends:
 * - FilesystemSource: local .md files (dev, self-hosted)
 * - GitHubSource: public GitHub repo (hosted service)
 * - R2Source: Cloudflare R2 bucket (hosted service)
 * - S3Source: AWS S3 bucket
 * - MemorySource: in-memory (testing)
 *
 * The interface is intentionally minimal so new backends
 * are easy to implement.
 */
export interface ContentSource {
  /** Get a single page by its URL slug. Returns null if not found. */
  getPage: (slug: string) => Promise<ContentPage | null>

  /** Get the full navigation tree. */
  getNavTree: () => Promise<NavNode>

  /** List all pages (for llms.txt, sitemap, etc.) */
  listPages: () => Promise<ContentPage[]>

  /** Refresh/invalidate any caches. */
  refresh: () => Promise<void>
}

/**
 * Configuration for GitHub-based content source.
 */
export interface GitHubSourceConfig {
  /** GitHub owner (user or org) */
  owner: string
  /** Repository name */
  repo: string
  /** Branch or tag (default: main) */
  ref?: string
  /** Subdirectory within the repo to treat as content root */
  path?: string
  /** GitHub personal access token (for private repos or higher rate limits) */
  token?: string
  /**
   * Glob patterns to include. Only matching files will be served.
   * Mutually exclusive with `exclude`.
   */
  include?: string[]
  /**
   * Glob patterns to exclude. Matching files will not be served.
   * Mutually exclusive with `include`.
   */
  exclude?: string[]
}
