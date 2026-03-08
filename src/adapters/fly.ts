import type { DeploymentAdapter } from './types'
import type { MkdnSiteConfig } from '../config/schema'
import type { ContentSource } from '../content/types'
import type { MarkdownRenderer } from '../render/types'
import { FilesystemSource } from '../content/filesystem'
import { createRenderer } from '../render/types'

/**
 * Fly.io adapter.
 * Uses filesystem source (persistent volumes on Fly).
 */
export class FlyAdapter implements DeploymentAdapter {
  readonly name = 'fly'

  createContentSource (config: MkdnSiteConfig): ContentSource {
    return new FilesystemSource(config.contentDir)
  }

  createRenderer (_config: MkdnSiteConfig): MarkdownRenderer {
    return createRenderer('portable')
  }
}
