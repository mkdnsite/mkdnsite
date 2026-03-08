import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import type { MkdnSiteConfig } from './config/schema.ts'
import type { ContentSource } from './content/types.ts'
import type { MarkdownRenderer } from './render/types.ts'
import { negotiateFormat } from './negotiate/accept.ts'
import { markdownHeaders, htmlHeaders, estimateTokens } from './negotiate/headers.ts'
import { renderPage, render404 } from './render/page-shell.ts'
import { generateLlmsTxt } from './discovery/llmstxt.ts'

export interface HandlerOptions {
  source: ContentSource
  renderer: MarkdownRenderer
  config: MkdnSiteConfig
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
  const { source, renderer, config } = opts

  let llmsTxtCache: string | null = null

  return async function handler (request: Request): Promise<Response> {
    const url = new URL(request.url)
    const pathname = decodeURIComponent(url.pathname)

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
      return new Response('cache cleared', { status: 200 })
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
        headers: htmlHeaders()
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
    const nav = config.theme.showNav
      ? await source.getNavTree()
      : undefined

    const fullPage = renderPage({
      renderedContent: renderedHtml,
      meta: page.meta,
      config,
      nav,
      currentSlug: page.slug
    })

    return new Response(fullPage, {
      status: 200,
      headers: htmlHeaders()
    })
  }
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
