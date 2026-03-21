import { Buffer } from 'node:buffer'
import type { DeploymentAdapter } from './types.ts'
import { detectRuntime } from './types.ts'
import type { MkdnSiteConfig } from '../config/schema.ts'
import type { ContentSource } from '../content/types.ts'
import type { MarkdownRenderer } from '../render/types.ts'
import { FilesystemSource } from '../content/filesystem.ts'
import { GitHubSource } from '../content/github.ts'
import { createRenderer } from '../render/types.ts'

export class LocalAdapter implements DeploymentAdapter {
  readonly name: string
  private rendererEngine: string = 'portable'

  constructor () {
    this.name = `local (${detectRuntime()})`
  }

  createContentSource (config: MkdnSiteConfig): ContentSource {
    if (config.github != null) {
      return new GitHubSource(config.github)
    }
    return new FilesystemSource(config.contentDir, {
      include: config.include,
      exclude: config.exclude
    })
  }

  async createRenderer (config: MkdnSiteConfig): Promise<MarkdownRenderer> {
    const renderer = await createRenderer({
      engine: config.renderer,
      syntaxTheme: config.theme.syntaxTheme,
      syntaxThemeDark: config.theme.syntaxThemeDark,
      math: config.client.math
    })
    this.rendererEngine = renderer.engine
    return renderer
  }

  async start (
    handler: (request: Request) => Promise<Response>,
    config: MkdnSiteConfig
  ): Promise<() => void> {
    const runtime = detectRuntime()

    if (runtime === 'bun') {
      return this.startBun(handler, config)
    }

    if (runtime === 'deno') {
      return this.startDeno(handler, config)
    }

    return await this.startNode(handler, config)
  }

  private startBun (
    handler: (request: Request) => Promise<Response>,
    config: MkdnSiteConfig
  ): () => void {
    const server = Bun.serve({
      port: config.server.port,
      hostname: config.server.hostname,
      fetch: handler
    })

    this.printStartup(config, server.port ?? config.server.port)
    return () => { void server.stop() }
  }

  private startDeno (
    handler: (request: Request) => Promise<Response>,
    config: MkdnSiteConfig
  ): () => void {
    const { port, hostname } = config.server

    // Deno.serve is available globally in Deno
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DenoNs = (globalThis as any).Deno
    const server = DenoNs.serve({ port, hostname }, handler)

    this.printStartup(config, port)
    return () => { void server.shutdown() }
  }

  private async startNode (
    handler: (request: Request) => Promise<Response>,
    config: MkdnSiteConfig
  ): Promise<() => void> {
    const { port, hostname } = config.server
    const { createServer } = await import('node:http')

    const server = createServer((req, res) => {
      const host = req.headers.host ?? `${hostname}:${String(port)}`
      const url = new URL(req.url ?? '/', `http://${host}`)

      const headers = new Headers()
      for (const [key, value] of Object.entries(req.headers)) {
        if (value != null) {
          if (Array.isArray(value)) {
            for (const v of value) headers.append(key, v)
          } else {
            headers.set(key, value)
          }
        }
      }

      const request = new Request(url.toString(), {
        method: req.method,
        headers
      })

      handler(request)
        .then(async (response) => {
          const resHeaders: Record<string, string> = {}
          response.headers.forEach((value, key) => {
            resHeaders[key] = value
          })
          res.writeHead(response.status, resHeaders)
          const body = Buffer.from(await response.arrayBuffer())
          res.end(body)
        })
        .catch((err) => {
          console.error('mkdnsite: request error', err)
          res.writeHead(500)
          res.end('Internal Server Error')
        })
    })

    await new Promise<void>((resolve) => {
      server.listen(port, hostname, () => { resolve() })
    })

    this.printStartup(config, port)
    return () => { server.close() }
  }

  private printStartup (config: MkdnSiteConfig, port: number): void {
    const url = `http://localhost:${String(port)}`
    const DIM_CYAN = '\x1b[2;36m'
    const BOLD_GREEN = '\x1b[1;32m'
    const DIM = '\x1b[2m'
    const RESET = '\x1b[0m'

    // ASCII art header
    console.log('')
    console.log(`${DIM_CYAN}   ▌  ▌    ▘▗   `)
    console.log('▛▛▌▙▘▛▌▛▌▛▘▌▜▘█▌')
    console.log(`▌▌▌▛▖▙▌▌▌▄▌▌▐▖▙▖${RESET}`)
    console.log('')
    console.log(`  ${BOLD_GREEN}\u2192 ${url}${RESET}`)
    console.log('')

    const row = (label: string, value: string): void => {
      console.log(`  ${DIM}${label.padEnd(12)}${RESET}${value}`)
    }

    row('Runtime', `local (${this.name})`)
    if (config.github != null) {
      const owner: string = config.github.owner
      const repo: string = config.github.repo
      const ref: string = config.github.ref ?? 'main'
      row('GitHub', `${owner}/${repo}@${ref}`)
    } else {
      row('Content', config.contentDir)
    }
    row('Renderer', this.rendererEngine)
    if (config.mcp.enabled) {
      row('MCP', config.mcp.endpoint ?? '/mcp')
    }
    if (config.client.search) {
      row('Search', '/api/search')
    }

    console.log('')
    console.log(`  ${DIM}Ctrl+C to stop${RESET}`)
    console.log('')
  }
}
