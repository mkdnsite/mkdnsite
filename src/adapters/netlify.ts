import type { DeploymentAdapter } from './types'
import type { MkdnSiteConfig } from '../config/schema'
import type { ContentSource } from '../content/types'
import type { MarkdownRenderer } from '../render/types'
import { createRenderer } from '../render/types'

export class NetlifyAdapter implements DeploymentAdapter {
  readonly name = 'netlify'

  createContentSource (_config: MkdnSiteConfig): ContentSource {
    throw new Error('NetlifyAdapter.createContentSource() not yet implemented.')
  }

  createRenderer (_config: MkdnSiteConfig): MarkdownRenderer {
    return createRenderer('portable')
  }
}
