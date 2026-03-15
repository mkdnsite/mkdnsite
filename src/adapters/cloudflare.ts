import type { DeploymentAdapter } from './types.ts'
import type { MkdnSiteConfig } from '../config/schema.ts'
import type { ContentSource } from '../content/types.ts'
import type { MarkdownRenderer } from '../render/types.ts'
import { createRenderer } from '../render/types.ts'
import { GitHubSource } from '../content/github.ts'
import { R2ContentSource } from '../content/r2.ts'

/**
 * Cloudflare Workers deployment adapter.
 *
 * Auto-detects content source from env bindings:
 * - CONTENT_SOURCE=r2 or CONTENT_BUCKET present → R2ContentSource
 * - CONTENT_SOURCE=github or config.github set → GitHubSource
 * - Explicit CONTENT_SOURCE env var overrides auto-detection
 *
 * Usage in a Worker:
 *
 * ```ts
 * import { createHandler, resolveConfig } from 'mkdnsite'
 * import { CloudflareAdapter } from 'mkdnsite/adapters/cloudflare'
 *
 * export default {
 *   fetch (request: Request, env: Env): Promise<Response> {
 *     const adapter = new CloudflareAdapter(env)
 *     const config = resolveConfig({ site: { title: env.SITE_TITLE } })
 *     const handler = createHandler({
 *       source: adapter.createContentSource(config),
 *       renderer: adapter.createRenderer(config),
 *       config
 *     })
 *     return handler(request)
 *   }
 * }
 * ```
 */
export class CloudflareAdapter implements DeploymentAdapter {
  readonly name = 'cloudflare-workers'
  private readonly env: CloudflareEnv

  constructor (env: CloudflareEnv) {
    this.env = env
  }

  createContentSource (config: MkdnSiteConfig): ContentSource {
    const sourceType = this.env.CONTENT_SOURCE

    // GitHub source: explicit CONTENT_SOURCE=github or config.github set
    if (sourceType === 'github' || (sourceType == null && config.github != null)) {
      const ghConfig = config.github ?? {
        owner: this.env.GITHUB_OWNER ?? '',
        repo: this.env.GITHUB_REPO ?? '',
        ref: this.env.GITHUB_REF,
        token: this.env.GITHUB_TOKEN
      }
      return new GitHubSource(ghConfig)
    }

    // R2 source: explicit CONTENT_SOURCE=r2 or CONTENT_BUCKET binding present
    if (sourceType === 'r2' || (sourceType == null && this.env.CONTENT_BUCKET != null)) {
      return new R2ContentSource({
        bucket: this.env.CONTENT_BUCKET as R2Bucket,
        basePath: this.env.CONTENT_BASE_PATH
      })
    }

    throw new Error(
      'CloudflareAdapter: No content source configured. ' +
      'Set CONTENT_SOURCE=github|r2, provide CONTENT_BUCKET (R2), or set config.github.'
    )
  }

  async createRenderer (_config: MkdnSiteConfig): Promise<MarkdownRenderer> {
    // CF Workers don't have Bun.markdown — always use portable renderer
    return await createRenderer('portable')
  }
}

/**
 * Expected Cloudflare Worker environment bindings.
 */
export interface CloudflareEnv {
  /** Explicit content source selection: 'github' or 'r2' */
  CONTENT_SOURCE?: 'github' | 'r2'

  /** R2 bucket binding for markdown content */
  CONTENT_BUCKET?: R2Bucket
  /** Key prefix within the R2 bucket (e.g. 'sites/abc123/') */
  CONTENT_BASE_PATH?: string

  /** KV namespace for caching (future use) */
  CACHE_KV?: KVNamespace

  /** GitHub owner (used if config.github not set) */
  GITHUB_OWNER?: string
  /** GitHub repo (used if config.github not set) */
  GITHUB_REPO?: string
  /** GitHub branch/tag (default: main) */
  GITHUB_REF?: string
  /** GitHub token for private repos / higher rate limits */
  GITHUB_TOKEN?: string

  /** Site title (can override config.site.title) */
  SITE_TITLE?: string
  /** Site URL */
  SITE_URL?: string
}

// ─── Cloudflare R2 type stubs ─────────────────────────────────────────────────
// These types are provided by the CF Workers runtime; stubs here for type-checking
// in non-CF environments.

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

interface KVNamespace {
  get: (key: string) => Promise<string | null>
  put: (key: string, value: string, options?: Record<string, unknown>) => Promise<void>
}
