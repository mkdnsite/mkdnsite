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
import type { ContentCache } from './content/cache.ts'
import type { ResponseCache } from './cache/response.ts'
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
  /** Site identifier for multi-tenant analytics isolation (e.g. mkdn.io). */
  siteId?: string
  /**
   * Optional content cache.
   * When provided, the search index is loaded from / stored in the cache
   * so cold-start rebuilds are avoided across isolates (e.g. Cloudflare Workers + KV).
   */
  contentCache?: ContentCache
  /**
   * Optional response cache.
   * When provided, rendered HTML and markdown responses are cached to skip SSR
   * on repeat requests. Works with MemoryResponseCache (single-process) or
   * KVResponseCache (Cloudflare Workers with KV — cross-isolate sharing).
   */
  responseCache?: ResponseCache
  /**
   * Optional secret token for authenticating POST /_refresh requests.
   * When set, requests without `Authorization: Bearer <refreshToken>` are rejected with 401.
   */
  refreshToken?: string
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
  const { source, renderer, config, analytics, siteId, contentCache, responseCache, refreshToken } = opts

  let llmsTxtCache: string | null = null
  let mcpHandlerFn: ((req: Request) => Promise<Response>) | null = null
  let mcpInitPromise: Promise<(req: Request) => Promise<Response>> | null = null
  let searchIndexPromise: Promise<SearchIndex> | null = null

  // Shared search index used by both /api/search and MCP
  async function ensureSearchIndex (): Promise<SearchIndex> {
    if (searchIndexPromise != null) return await searchIndexPromise
    searchIndexPromise = (async () => {
      const si = createSearchIndex()
      // Try to restore from cache (avoids full rebuild on cold starts)
      if (contentCache != null) {
        const cached = await contentCache.getSearchIndex()
        if (cached != null && cached !== '') {
          try {
            si.deserialize(cached)
            return si
          } catch {
            // Corrupt / incompatible — fall through to rebuild
          }
        }
      }
      await si.rebuild(source)
      // Persist to cache for next cold start
      if (contentCache != null) {
        try {
          await contentCache.setSearchIndex(si.serialize())
        } catch {
          // Non-fatal — cache write failure shouldn't break search
        }
      }
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

    const { response, cacheHit } = await handleRequest(request, url, pathname)

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
          contentLength: readContentLength(response),
          cacheHit,
          siteId
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
    // MCP: check endpoint first (MCP responses may have various Content-Types)
    const mcpEndpoint = config.mcp.endpoint ?? '/mcp'
    if (
      config.mcp.enabled &&
      (pathname === mcpEndpoint || pathname.startsWith(mcpEndpoint + '/'))
    ) {
      return 'mcp'
    }

    // Prefer response Content-Type when available
    const contentType = response.headers.get('Content-Type') ?? ''
    if (contentType.includes('text/markdown')) return 'markdown'
    if (contentType.includes('text/html')) return 'html'
    if (contentType.includes('application/json')) return 'api'

    // Fallback: infer from request when Content-Type is missing (e.g. static files)
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

  async function handleRequest (
    request: Request,
    url: URL,
    pathname: string
  ): Promise<{ response: Response, cacheHit: boolean }> {
    function ok (response: Response): { response: Response, cacheHit: boolean } {
      return { response, cacheHit: false }
    }

    // ---- Special routes ----

    if (pathname === '/_health') {
      return ok(new Response('ok', { status: 200 }))
    }

    if (pathname === '/llms.txt' && config.llmsTxt.enabled) {
      if (llmsTxtCache == null) {
        llmsTxtCache = await generateLlmsTxt(source, config)
      }
      return ok(textResponse(llmsTxtCache, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        }
      }))
    }

    if (pathname === '/_refresh' && request.method === 'POST') {
      // Optional Bearer token auth
      if (refreshToken != null && refreshToken !== '') {
        const authHeader = request.headers.get('Authorization') ?? ''
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
        if (token !== refreshToken) {
          return ok(new Response('Unauthorized', { status: 401 }))
        }
      }

      await source.refresh()
      llmsTxtCache = null

      // Clear cached search index
      if (contentCache != null) {
        try { await contentCache.setSearchIndex('') } catch { /* non-fatal */ }
      }

      // Clear response cache (supports ?path= for single-entry invalidation)
      if (responseCache != null) {
        const pathParam = url.searchParams.get('path')
        if (pathParam != null) {
          // Invalidate both html and markdown variants
          await responseCache.delete(pathParam + ':html')
          await responseCache.delete(pathParam + ':markdown')
        } else {
          await responseCache.clear()
        }
      }

      // Reset search index
      if (searchIndexPromise != null) {
        searchIndexPromise = null
        void ensureSearchIndex()
      }

      return ok(new Response('cache cleared', { status: 200 }))
    }

    // ---- Search API ----
    if (pathname === '/api/search' && config.client.search) {
      const query = (url.searchParams.get('q') ?? '').slice(0, 200)
      const rawLimit = parseInt(url.searchParams.get('limit') ?? '10', 10)
      const limit = Math.min(isNaN(rawLimit) ? 10 : rawLimit, 50)
      const si = await ensureSearchIndex()
      const results = si.search(query, limit)
      return ok(textResponse(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }))
    }

    // ---- MCP endpoint ----
    if (
      config.mcp.enabled &&
      (pathname === (config.mcp.endpoint ?? '/mcp') ||
        pathname.startsWith((config.mcp.endpoint ?? '/mcp') + '/'))
    ) {
      const mcp = await ensureMcpHandler()
      return ok(await mcp(request))
    }

    // ---- Static files passthrough ----
    if (config.staticDir != null && hasStaticExtension(pathname)) {
      return ok(await serveStatic(pathname, config.staticDir))
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
        return ok(textResponse(
          '# 404 — Page Not Found\n\nThe requested page does not exist.\n',
          {
            status: 404,
            headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
          }
        ))
      }
      return ok(textResponse(render404(config), {
        status: 404,
        headers: htmlHeadersWithCsp(config)
      }))
    }

    const format = forceMarkdown
      ? 'markdown'
      : negotiateFormat(request.headers.get('Accept'))

    // ---- Response cache check (content pages only) ----
    const cacheEnabled = config.cache?.enabled === true && responseCache != null
    const cacheKey = slug + ':' + format

    if (cacheEnabled && responseCache != null) {
      const cached = await responseCache.get(cacheKey)
      if (cached != null) {
        // 304 Not Modified support
        const ifNoneMatch = request.headers.get('If-None-Match')
        const etag = cached.headers.ETag
        if (ifNoneMatch != null && etag != null && ifNoneMatch === etag) {
          return { response: new Response(null, { status: 304 }), cacheHit: true }
        }
        return { response: textResponse(cached.body, { status: cached.status, headers: cached.headers }), cacheHit: true }
      }
    }

    if (format === 'markdown') {
      const tokens = config.negotiation.includeTokenCount
        ? estimateTokens(page.body)
        : null

      const headers = markdownHeaders(tokens, config.negotiation.contentSignals, config.cache, slug)

      // 304 Not Modified support for non-cached path
      const ifNoneMatch = request.headers.get('If-None-Match')
      if (ifNoneMatch != null && headers.ETag != null && ifNoneMatch === headers.ETag) {
        return ok(new Response(null, { status: 304 }))
      }

      const response = textResponse(page.body, { status: 200, headers })
      if (cacheEnabled && responseCache != null) {
        await responseCache.set(cacheKey, {
          body: page.body,
          status: 200,
          headers,
          timestamp: Date.now()
        }, config.cache?.maxAgeMarkdown)
      }
      return ok(response)
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

    const htmlHdrs = htmlHeadersWithCsp(config, slug)

    // 304 Not Modified support for non-cached path
    const ifNoneMatch = request.headers.get('If-None-Match')
    if (ifNoneMatch != null && htmlHdrs.ETag != null && ifNoneMatch === htmlHdrs.ETag) {
      return ok(new Response(null, { status: 304 }))
    }

    const htmlResponse = textResponse(fullPage, { status: 200, headers: htmlHdrs })
    if (cacheEnabled && responseCache != null) {
      await responseCache.set(cacheKey, {
        body: fullPage,
        status: 200,
        headers: htmlHdrs,
        timestamp: Date.now()
      }, config.cache?.maxAge)
    }
    return ok(htmlResponse)
  }
}

/**
 * Read content length from the response Content-Length header.
 * Returns 0 when the header is absent or unparseable.
 */
function readContentLength (response: Response): number {
  const header = response.headers.get('Content-Length')
  if (header == null) return 0
  const parsed = parseInt(header, 10)
  return isNaN(parsed) ? 0 : parsed
}

/** Create a Response with Content-Length set from the body string. */
function textResponse (body: string, init: ResponseInit): Response {
  const encoded = new TextEncoder().encode(body)
  const headers = new Headers(init.headers)
  headers.set('Content-Length', String(encoded.byteLength))
  return new Response(encoded, { ...init, headers })
}

function htmlHeadersWithCsp (config: MkdnSiteConfig, slug?: string): Record<string, string> {
  const headers = htmlHeaders(config.cache, slug)
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
