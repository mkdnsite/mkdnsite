import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { ContentSource } from '../content/types.ts'
import type { SearchIndex } from '../search/index.ts'

export function createMcpServer (opts: {
  source: ContentSource
  searchIndex: SearchIndex
}): McpServer {
  const { source, searchIndex } = opts

  const server = new McpServer({
    name: 'mkdnsite',
    version: '0.1.0'
  })

  // ─── Tool: search_docs ──────────────────────────────────────────────────────

  server.tool(
    'search_docs',
    'Full-text search across all documentation pages',
    {
      query: z.string().describe('Search query'),
      limit: z.number().min(1).max(50).optional().describe('Max results (default 10, max 50)')
    },
    async ({ query, limit }) => {
      const results = searchIndex.search(query, limit ?? 10)
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(results.map(r => ({
            title: r.title,
            slug: r.slug,
            description: r.description,
            excerpt: r.excerpt,
            score: Math.round(r.score * 1000) / 1000
          })), null, 2)
        }]
      }
    }
  )

  // ─── Tool: get_page ─────────────────────────────────────────────────────────

  server.tool(
    'get_page',
    'Retrieve the full markdown content of a documentation page by slug',
    {
      slug: z.string().describe('Page slug (e.g. /docs/getting-started)')
    },
    async ({ slug }) => {
      const page = await source.getPage(slug)
      if (page == null) {
        return {
          isError: true,
          content: [{
            type: 'text' as const,
            text: `Page not found: ${slug}`
          }]
        }
      }

      const lines: string[] = []
      if (page.meta.title != null) lines.push(`# ${String(page.meta.title)}`)
      if (page.meta.description != null) lines.push(`> ${String(page.meta.description)}`)
      if (lines.length > 0) lines.push('')
      lines.push(page.body)

      return {
        content: [{
          type: 'text' as const,
          text: lines.join('\n')
        }]
      }
    }
  )

  // ─── Tool: list_pages ───────────────────────────────────────────────────────

  server.tool(
    'list_pages',
    'List all available documentation pages',
    {},
    async () => {
      const pages = await source.listPages()
      const list = pages.map(p => ({
        title: String(p.meta.title ?? p.slug),
        slug: p.slug,
        description: p.meta.description != null ? String(p.meta.description) : undefined
      }))
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(list, null, 2)
        }]
      }
    }
  )

  // ─── Tool: get_nav ──────────────────────────────────────────────────────────

  server.tool(
    'get_nav',
    'Get the documentation navigation tree',
    {},
    async () => {
      const nav = await source.getNavTree()
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(nav, null, 2)
        }]
      }
    }
  )

  // ─── Resources: pages ───────────────────────────────────────────────────────

  const pageTemplate = new ResourceTemplate(
    'mkdnsite://pages/{slug}',
    {
      list: async () => {
        const pages = await source.listPages()
        return {
          resources: pages.map(p => ({
            uri: `mkdnsite://pages${p.slug}`,
            name: String(p.meta.title ?? p.slug),
            description: p.meta.description != null ? String(p.meta.description) : undefined,
            mimeType: 'text/markdown'
          }))
        }
      }
    }
  )

  server.resource(
    'page',
    pageTemplate,
    { mimeType: 'text/markdown' },
    async (uri) => {
      // uri.href = "mkdnsite://pages/docs/getting-started"
      const rawSlug = uri.href.replace(/^mkdnsite:\/\/pages/, '')
      const resolvedSlug = rawSlug === '' ? '/' : rawSlug
      const page = await source.getPage(resolvedSlug)
      if (page == null) {
        return { contents: [] }
      }
      const lines: string[] = []
      if (page.meta.title != null) lines.push(`# ${String(page.meta.title)}`)
      if (page.meta.description != null) lines.push(`> ${String(page.meta.description)}`)
      if (lines.length > 0) lines.push('')
      lines.push(page.body)
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'text/markdown',
          text: lines.join('\n')
        }]
      }
    }
  )

  return server
}
