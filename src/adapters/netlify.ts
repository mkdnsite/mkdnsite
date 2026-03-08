import type { DeploymentAdapter } from './types.ts'
import type { MkdnSiteConfig } from '../config/schema.ts'
import type { ContentSource } from '../content/types.ts'
import type { MarkdownRenderer } from '../render/types.ts'
import { createRenderer } from '../render/types.ts'

export class NetlifyAdapter implements DeploymentAdapter {
  readonly name = 'netlify'

  createContentSource (_config: MkdnSiteConfig): ContentSource {
    throw new Error('NetlifyAdapter.createContentSource() not yet implemented.')
  }

  async createRenderer (_config: MkdnSiteConfig): Promise<MarkdownRenderer> {
    return await createRenderer('portable')
  }
}
