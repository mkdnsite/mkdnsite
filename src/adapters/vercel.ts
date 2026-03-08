import type { DeploymentAdapter } from './types'
import type { MkdnSiteConfig } from '../config/schema'
import type { ContentSource } from '../content/types'
import type { MarkdownRenderer } from '../render/types'
import { createRenderer } from '../render/types'

/**
 * Vercel Edge/Serverless deployment adapter.
 *
 * For Vercel, the handler is exported as a standard Edge Function.
 * Content can come from Vercel Blob Storage or a connected GitHub repo.
 *
 * Usage in a Vercel Edge Function:
 *
 * ```ts
 * // app/api/[...path]/route.ts
 * import { createHandler, resolveConfig } from 'mkdnsite'
 * import { VercelAdapter } from 'mkdnsite/adapters/vercel'
 *
 * const adapter = new VercelAdapter()
 * const config = resolveConfig({
 *   site: { title: 'My Docs' }
 * })
 *
 * export const GET = createHandler({
 *   source: adapter.createContentSource(config),
 *   renderer: adapter.createRenderer(config),
 *   config
 * })
 *
 * export const runtime = 'edge'
 * ```
 */
export class VercelAdapter implements DeploymentAdapter {
  readonly name = 'vercel'

  createContentSource (_config: MkdnSiteConfig): ContentSource {
    // TODO: Implement Vercel Blob-backed or GitHub-backed source
    throw new Error(
      'VercelAdapter.createContentSource() not yet implemented. ' +
      'Provide a Blob-backed or GitHub-backed ContentSource.'
    )
  }

  createRenderer (_config: MkdnSiteConfig): MarkdownRenderer {
    return createRenderer('portable')
  }
}
