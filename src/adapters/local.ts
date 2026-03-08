import type { DeploymentAdapter } from './types'
import type { MkdnSiteConfig } from '../config/schema'
import type { ContentSource } from '../content/types'
import type { MarkdownRenderer } from '../render/types'
import { FilesystemSource } from '../content/filesystem'
import { createRenderer } from '../render/types'

export class LocalAdapter implements DeploymentAdapter {
  readonly name = 'local (Bun)'

  createContentSource (config: MkdnSiteConfig): ContentSource {
    return new FilesystemSource(config.contentDir)
  }

  createRenderer (config: MkdnSiteConfig): MarkdownRenderer {
    // Use bun-native if available and in Bun environment
    const engine = (typeof Bun !== 'undefined' && Bun.markdown != null)
      ? 'bun-native'
      : 'portable'
    return createRenderer(engine)
  }

  async start (
    handler: (request: Request) => Promise<Response>,
    config: MkdnSiteConfig
  ): Promise<() => void> {
    const server = Bun.serve({
      port: config.server.port,
      hostname: config.server.hostname,
      fetch: handler
    })

    const url = `http://localhost:${String(server.port)}`
    console.log('')
    console.log('  ┌──────────────────────────────────────────────┐')
    console.log('  │                                              │')
    console.log('  │   mkdnsite is running                       │')
    console.log(`  │   ${url.padEnd(42)} │`)
    console.log('  │                                              │')
    console.log(`  │   Content: ${config.contentDir.padEnd(32)} │`)
    console.log(`  │   Theme mode: ${config.theme.mode.padEnd(28)} │`)
    console.log(`  │   Client JS: ${(config.client.enabled ? 'on' : 'off').padEnd(29)} │`)
    console.log(`  │   Content negotiation: ${(config.negotiation.enabled ? 'on' : 'off').padEnd(19)} │`)
    console.log('  │                                              │')
    console.log('  └──────────────────────────────────────────────┘')
    console.log('')
    console.log('  Try:')
    console.log(`    curl ${url}`)
    console.log(`    curl -H "Accept: text/markdown" ${url}`)
    console.log(`    curl ${url}/llms.txt`)
    console.log('')

    return () => { void server.stop() }
  }
}
