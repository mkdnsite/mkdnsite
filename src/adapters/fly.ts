import type { DeploymentAdapter } from './types.ts'
import type { MkdnSiteConfig } from '../config/schema.ts'
import type { ContentSource } from '../content/types.ts'
import type { MarkdownRenderer } from '../render/types.ts'
import { FilesystemSource } from '../content/filesystem.ts'
import { createRenderer } from '../render/types.ts'

/**
 * Fly.io adapter.
 * Uses filesystem source (persistent volumes on Fly).
 */
export class FlyAdapter implements DeploymentAdapter {
  readonly name = 'fly'

  createContentSource (config: MkdnSiteConfig): ContentSource {
    return new FilesystemSource(config.contentDir)
  }

  async createRenderer (_config: MkdnSiteConfig): Promise<MarkdownRenderer> {
    return await createRenderer('portable')
  }
}
