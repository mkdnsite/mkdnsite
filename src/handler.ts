import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import type { MkdnSiteConfig } from './config/schema.ts'
import type { ContentSource } from './content/types.ts'
import type { MarkdownRenderer } from './render/types.ts'
import { negotiateFormat } from './negotiate/accept.ts'
import { markdownHeaders, htmlHeaders, estimateTokens } from './negotiate/headers.ts'
import { renderPage, render404 } from './render/page-shell.ts'
import { generateLlmsTxt } from './discovery/llmstxt.ts'
import { createSearchIndex } from './search/index.ts'
import type { SearchIndex } from './search/index.ts'
import { createMcpServer } from './mcp/server.ts'
import { buildCsp } from './security/csp.ts'
import { createMcpHandler } from './mcp/transport.ts'
import type { TrafficAnalytics, AnalyticsResponseFormat } from './analytics/types.ts'
import { classifyTraffic } from './analytics/classify.ts'

export interface HandlerOptions {
  source: ContentSource
  renderer: MarkdownRenderer
  config: MkdnSiteConfig
  /** Optional traffic analytics backend. When provided, every request is logged. */
  analytics?: TrafficAnalytics
}

/**
 * Create a portable fetch handler for mkdnsite.
 *
 * This handler conforms to the Web API fetch(request): Response
 * pattern, making it compatible with:
 * - Bun.serve()
 * - Cloudflare Workers
 * - Vercel Edge Functions
 * - Netlify Edge Functions
 * - Deno.serve()
 */
export function createHandler (opts: HandlerOptions): (request: Request) => Promise<Response> {
  const { source, renderer, config, analytics } = opts

  let llmsTxtCache: string | null = null
  let mcpHandlerFn: ((req: Request) => Promise<Response>) | null = null
  let mcpInitPromise: Promise<(req: Request) => Promise<Response>> | null = null
  let searchIndexPromise: Promise<SearchIndex> | null = null

  // Shared search index used by both /api/search and MCP
  async function ensureSearchIndex (): Promise<SearchIndex> {
    if (searchIndexPromise != null) return await searchIndexPromise
    searchIndexPromise = (async () => {
      const si = createSearchIndex()
      await si.rebuild(source)
      return si
    })()
    return await searchIndexPromise
  }

  async function ensureMcpHandler (): Promise<(req: Request) => Promise<Response>> {
    if (mcpInitPromise != null) return await mcpInitPromise
    mcpInitPromise = (async () => {
      const si = await ensureSearchIndex()
      const mcpServer = createMcpServer({ source, searchIndex: si })
      return createMcpHandler(mcpServer)
    })()
    mcpHandlerFn = await mcpInitPromise
    return mcpHandlerFn
  }

  // Eagerly init search index when client search is enabled
  if (config.client.search) {
    void ensureSearchIndex()
  }

  return async function handler (request: Request): Promise<Response> {
    const start = Date.now()
    const url = new URL(request.url)
    const pathname = decodeURIComponent(url.pathname)

    const response = await handleRequest(request, url, pathname)

    if (analytics != null) {
      const format = resolveAnalyticsFormat(request, pathname, response)
      try {
        analytics.logRequest({
          timestamp: start,
          path: pathname,
          method: request.method,
          format,
          trafficType: classifyTraffic(request, format),
          statusCode: response.status,
          latencyMs: Date.now() - start,
          userAgent: request.headers.get('User-Agent') ?? '',
          contentLength: parseInt(response.headers.get('Content-Length') ?? '0', 10),
          cacheHit: false
        })
      } catch {
        // analytics must never break the response path
      }
    }

    return response
  }

  // ---- Analytics format resolution ----

  function resolveAnalyticsFormat (
    request: Request,
    pathname: string,
    response: Response
  ): AnalyticsResponseFormat {
    const contentType = response.headers.get('Content-Type') ?? ''
    if (contentType.includes('text/markdown')) return 'markdown'
    if (contentType.includes('text/html')) return 'html'
    if (contentType.includes('application/json')) return 'api'
    // MCP: check endpoint
    const mcpEndpoint = config.mcp.endpoint ?? '/mcp'
    if (
      config.mcp.enabled &&
      (pathname === mcpEndpoint || pathname.startsWith(mcpEndpoint + '/'))
    ) {
      return 'mcp'
    }
    const accept = request.headers.get('Accept') ?? ''
    if (
      accept.includes('text/markdown') ||
      accept.includes('text/x-markdown') ||
      accept.includes('application/markdown') ||
      pathname.endsWith('.md')
    ) {
      return 'markdown'
    }
    return 'other'
  }

  // ---- Inner request handler (no analytics instrumentation) ----

  async function handleRequest (request: Request, url: URL, pathname: string): Promise<Response> {
    // ---- Special routes ----

    if (pathname === '/_health') {
      return new Response('ok', { status: 200 })
    }

    if (pathname === '/llms.txt' && config.llmsTxt.enabled) {
      if (llmsTxtCache == null) {
        llmsTxtCache = await generateLlmsTxt(source, config)
      }
      return new Response(llmsTxtCache, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        }
      })
    }

    if (pathname === '/_refresh' && request.method === 'POST') {
      await source.refresh()
      llmsTxtCache = null
      // Reset and rebuild shared search index on refresh
      if (searchIndexPromise != null) {
        const si = await searchIndexPromise
        await si.rebuild(source)
      }
      return new Response('cache cleared', { status: 200 })
    }

    // ---- Search API ----
    if (pathname === '/api/search' && config.client.search) {
      const query = (url.searchParams.get('q') ?? '').slice(0, 200)
      const rawLimit = parseInt(url.searchParams.get('limit') ?? '10', 10)
      const limit = Math.min(isNaN(rawLimit) ? 10 : rawLimit, 50)
      const si = await ensureSearchIndex()
      const results = si.search(query, limit)
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // ---- MCP endpoint ----
    if (
      config.mcp.enabled &&
      (pathname === (config.mcp.endpoint ?? '/mcp') ||
        pathname.startsWith((config.mcp.endpoint ?? '/mcp') + '/'))
    ) {
      const mcp = await ensureMcpHandler()
      return await mcp(request)
    }

    // ---- Static files passthrough ----
    if (config.staticDir != null && hasStaticExtension(pathname)) {
      return await serveStatic(pathname, config.staticDir)
    }

    // ---- Content negotiation + page serving ----

    let slug = pathname
    let forceMarkdown = false

    if (slug.endsWith('.md')) {
      slug = slug.slice(0, -3)
      forceMarkdown = true
    }

    if (slug !== '/' && slug.endsWith('/')) {
      slug = slug.slice(0, -1)
    }

    const page = await source.getPage(slug)

    if (page == null) {
      const format = negotiateFormat(request.headers.get('Accept'))
      if (format === 'markdown') {
        return new Response(
          '# 404 — Page Not Found\n\nThe requested page does not exist.\n',
          {
            status: 404,
            headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
          }
        )
      }
      return new Response(render404(config), {
        status: 404,
        headers: htmlHeadersWithCsp(config)
      })
    }

    const format = forceMarkdown
      ? 'markdown'
      : negotiateFormat(request.headers.get('Accept'))

    if (format === 'markdown') {
      const tokens = config.negotiation.includeTokenCount
        ? estimateTokens(page.body)
        : null

      return new Response(page.body, {
        status: 200,
        headers: markdownHeaders(tokens, config.negotiation.contentSignals)
      })
    }

    // ---- Render HTML via React SSR ----
    const renderedHtml = renderer.renderToHtml(page.body, config.theme.components)
    const nav = (config.theme.showNav || config.theme.prevNext === true)
      ? await source.getNavTree()
      : undefined

    const fullPage = renderPage({
      renderedContent: renderedHtml,
      meta: page.meta,
      config,
      nav,
      currentSlug: page.slug,
      body: page.body
    })

    return new Response(fullPage, {
      status: 200,
      headers: htmlHeadersWithCsp(config)
    })
  }
}

function htmlHeadersWithCsp (config: MkdnSiteConfig): Record<string, string> {
  const headers = htmlHeaders()
  if (config.csp?.enabled !== false) {
    headers['Content-Security-Policy'] = buildCsp(config)
  }
  return headers
}

const STATIC_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
  '.mp4', '.webm', '.ogg', '.mp3', '.wav',
  '.pdf', '.zip', '.tar', '.gz',
  '.css', '.js', '.json', '.xml',
  '.woff', '.woff2', '.ttf', '.eot'
])

function hasStaticExtension (pathname: string): boolean {
  const ext = pathname.slice(pathname.lastIndexOf('.')).toLowerCase()
  return STATIC_EXTENSIONS.has(ext)
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
}

async function serveStatic (pathname: string, staticDir: string): Promise<Response> {
  try {
    const filePath = `${staticDir}${pathname}`
    const data = await readFile(filePath)
    const ext = extname(pathname).toLowerCase()
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'
    return new Response(data, {
      status: 200,
      headers: { 'Content-Type': contentType }
    })
  } catch {
    return new Response('Not Found', { status: 404 })
  }
}
