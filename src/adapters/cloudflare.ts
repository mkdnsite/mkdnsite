import type { DeploymentAdapter } from './types'
import type { MkdnSiteConfig } from '../config/schema'
import type { ContentSource } from '../content/types'
import type { MarkdownRenderer } from '../render/types'
import { createRenderer } from '../render/types'

/**
 * Cloudflare Workers deployment adapter.
 *
 * Uses R2 for content storage, KV for caching.
 * Wildcard DNS routes (*.mkdn.io) for hosted service.
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

  createContentSource (_config: MkdnSiteConfig): ContentSource {
    // TODO: Implement R2ContentSource
    // return new R2ContentSource(this.env.CONTENT_BUCKET)
    throw new Error(
      'CloudflareAdapter.createContentSource() not yet implemented. ' +
      'Provide an R2-backed ContentSource implementation.'
    )
  }

  createRenderer (_config: MkdnSiteConfig): MarkdownRenderer {
    // CF Workers don't have Bun.markdown, always use portable
    return createRenderer('portable')
  }
}

/**
 * Expected Cloudflare Worker environment bindings.
 */
export interface CloudflareEnv {
  /** R2 bucket for markdown content */
  CONTENT_BUCKET?: R2Bucket
  /** KV namespace for caching */
  CACHE_KV?: KVNamespace
  /** Site title from env var */
  SITE_TITLE?: string
  /** Site URL from env var */
  SITE_URL?: string
}

// Type stubs for CF runtime types (not available in non-CF environments)
interface R2Bucket {
  get: (key: string) => Promise<R2Object | null>
  list: (options?: Record<string, unknown>) => Promise<{ objects: R2Object[] }>
}

interface R2Object {
  key: string
  uploaded: Date
  text: () => Promise<string>
}

interface KVNamespace {
  get: (key: string) => Promise<string | null>
  put: (key: string, value: string, options?: Record<string, unknown>) => Promise<void>
}
