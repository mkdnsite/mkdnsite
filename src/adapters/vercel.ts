import type { DeploymentAdapter } from './types.ts'
import type { MkdnSiteConfig } from '../config/schema.ts'
import type { ContentSource } from '../content/types.ts'
import type { MarkdownRenderer } from '../render/types.ts'
import { createRenderer } from '../render/types.ts'

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

  async createRenderer (_config: MkdnSiteConfig): Promise<MarkdownRenderer> {
    return await createRenderer('portable')
  }
}
