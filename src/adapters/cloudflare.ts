import type { DeploymentAdapter } from './types.ts'
import type { MkdnSiteConfig } from '../config/schema.ts'
import type { ContentSource } from '../content/types.ts'
import type { MarkdownRenderer } from '../render/types.ts'
import { createRenderer } from '../render/types.ts'
import { GitHubSource } from '../content/github.ts'
import { R2ContentSource } from '../content/r2.ts'
import { AssetsSource } from '../content/assets.ts'
import type { ContentCache } from '../content/cache.ts'
import { KVContentCache } from '../content/cache.ts'
import type { TrafficAnalytics, TrafficEvent } from '../analytics/types.ts'

/**
 * Cloudflare Workers deployment adapter.
 *
 * Auto-detects content source from env bindings:
 * - CONTENT_SOURCE=github or config.github set → GitHubSource
 * - CONTENT_SOURCE=r2 or CONTENT_BUCKET present → R2ContentSource
 * - CONTENT_SOURCE=assets or ASSETS binding present → AssetsSource
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

  private createCache (prefix?: string): ContentCache | undefined {
    if (this.env.CACHE_KV == null) return undefined
    return new KVContentCache(this.env.CACHE_KV, { prefix })
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
      if (this.env.CONTENT_BUCKET == null) {
        throw new Error(
          'CloudflareAdapter: CONTENT_SOURCE=r2 requires a CONTENT_BUCKET binding in wrangler.toml.'
        )
      }
      return new R2ContentSource({
        bucket: this.env.CONTENT_BUCKET,
        basePath: this.env.CONTENT_BASE_PATH,
        cache: this.createCache(this.env.CONTENT_BASE_PATH)
      })
    }

    // Assets source: explicit CONTENT_SOURCE=assets or ASSETS binding present
    if (sourceType === 'assets' || (sourceType == null && this.env.ASSETS != null)) {
      if (this.env.ASSETS == null) {
        throw new Error(
          'CloudflareAdapter: CONTENT_SOURCE=assets requires an ASSETS binding in wrangler.toml.'
        )
      }
      const manifest = this.env.CONTENT_MANIFEST != null
        ? JSON.parse(this.env.CONTENT_MANIFEST) as string[]
        : undefined
      return new AssetsSource({
        assets: this.env.ASSETS,
        manifest,
        cache: this.createCache('assets:')
      })
    }

    throw new Error(
      'CloudflareAdapter: No content source configured. ' +
      'Set CONTENT_SOURCE=github|r2|assets, provide CONTENT_BUCKET (R2), ASSETS binding, or set config.github.'
    )
  }

  async createRenderer (_config: MkdnSiteConfig): Promise<MarkdownRenderer> {
    // CF Workers don't have Bun.markdown — always use portable renderer
    return await createRenderer('portable')
  }

  /**
   * Create a TrafficAnalytics instance if the ANALYTICS binding is present.
   *
   * Returns `undefined` when the binding is absent so callers can skip
   * passing analytics to createHandler without any change in behaviour.
   *
   * Usage:
   * ```ts
   * const handler = createHandler({
   *   source: adapter.createContentSource(config),
   *   renderer: await adapter.createRenderer(config),
   *   config,
   *   analytics: adapter.createTrafficAnalytics()
   * })
   * ```
   */
  createTrafficAnalytics (): TrafficAnalytics | undefined {
    if (this.env.ANALYTICS == null) return undefined
    return new WorkersAnalyticsEngineAnalytics(this.env.ANALYTICS)
  }
}

/**
 * Cloudflare Workers Analytics Engine implementation of TrafficAnalytics.
 *
 * Writes a data point to a CF Analytics Engine dataset binding (`ANALYTICS`).
 * Each field maps to an index (string "blobs") or double (numeric values).
 *
 * Usage: automatically created by `CloudflareAdapter.createTrafficAnalytics()`
 * when the `ANALYTICS` binding is present.
 */
export class WorkersAnalyticsEngineAnalytics implements TrafficAnalytics {
  private readonly dataset: AnalyticsEngineDataset

  constructor (dataset: AnalyticsEngineDataset) {
    this.dataset = dataset
  }

  logRequest (event: TrafficEvent): void {
    // Field ordering is significant — CF Analytics Engine queries reference
    // fields by index (blob1, blob2, ..., double1, double2, ...).
    // Do NOT reorder without updating all downstream queries.
    this.dataset.writeDataPoint({
      blobs: [
        event.path, // blob1: URL pathname
        event.method, // blob2: HTTP method
        event.format, // blob3: response format (html|markdown|mcp|api|other)
        event.trafficType, // blob4: traffic classification (human|ai_agent|bot|mcp)
        event.userAgent // blob5: raw User-Agent string
      ],
      doubles: [
        event.statusCode, // double1: HTTP status code
        event.latencyMs, // double2: handler latency in ms
        event.contentLength, // double3: response body size in bytes
        event.cacheHit ? 1 : 0, // double4: cache hit (1) or miss (0)
        event.timestamp // double5: request timestamp (epoch ms)
      ]
    })
  }
}

/**
 * Expected Cloudflare Worker environment bindings.
 */
export interface CloudflareEnv {
  /** Explicit content source selection */
  CONTENT_SOURCE?: 'github' | 'r2' | 'assets'

  /** R2 bucket binding for markdown content */
  CONTENT_BUCKET?: R2Bucket
  /** Key prefix within the R2 bucket (e.g. 'sites/abc123/') */
  CONTENT_BASE_PATH?: string

  /** Workers Static Assets binding */
  ASSETS?: AssetsFetcher
  /** JSON array of .md file paths (alternative to _manifest.json in assets) */
  CONTENT_MANIFEST?: string

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

  /** Workers Analytics Engine dataset binding for traffic analytics */
  ANALYTICS?: AnalyticsEngineDataset
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

interface AssetsFetcher {
  fetch: (input: Request | string) => Promise<Response>
}

interface KVNamespace {
  get: (key: string) => Promise<string | null>
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>
  delete: (key: string) => Promise<void>
  list: (options?: { prefix?: string }) => Promise<{ keys: Array<{ name: string }> }>
}

interface AnalyticsEngineDataset {
  writeDataPoint: (data: {
    blobs?: string[]
    doubles?: number[]
    indexes?: string[]
  }) => void
}
