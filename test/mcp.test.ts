import { describe, it, expect } from 'bun:test'
import { createMcpServer } from '../src/mcp/server.ts'
import { createSearchIndex } from '../src/search/index.ts'
import type { ContentPage, ContentSource, NavNode } from '../src/content/types.ts'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makePage (slug: string, title: string, body: string, desc?: string): ContentPage {
  return {
    slug,
    sourcePath: slug.replace(/^\//, '') + '.md',
    meta: { title, description: desc },
    body,
    raw: `---\ntitle: ${title}\n---\n\n${body}`
  }
}

const PAGES: ContentPage[] = [
  makePage('/', 'Home', 'Welcome to mkdnsite.', 'The Markdown-first web server.'),
  makePage('/docs/getting-started', 'Getting Started', 'Install with: `bun add mkdnsite`', 'Quick start guide.'),
  makePage('/docs/config', 'Configuration', 'Configure via mkdnsite.config.ts', 'Full configuration reference.')
]

const mockSource: ContentSource = {
  async getPage (slug: string) {
    return PAGES.find(p => p.slug === slug) ?? null
  },
  async getNavTree (): Promise<NavNode> {
    return {
      title: 'Root',
      slug: '/',
      order: 0,
      isSection: true,
      children: [
        {
          title: 'Docs',
          slug: '/docs',
          order: 1,
          isSection: true,
          children: [
            { title: 'Getting Started', slug: '/docs/getting-started', order: 1, isSection: false, children: [] },
            { title: 'Configuration', slug: '/docs/config', order: 2, isSection: false, children: [] }
          ]
        }
      ]
    }
  },
  async listPages () { return PAGES },
  async refresh () {}
}

function buildServer (): ReturnType<typeof createMcpServer> {
  const searchIndex = createSearchIndex()
  for (const page of PAGES) searchIndex.index(page)
  return createMcpServer({ source: mockSource, searchIndex })
}

// ─── Helper: call tool directly via server internals ─────────────────────────
// McpServer exposes tools but doesn't have a direct programmatic call API.
// We test tool logic by calling the underlying handlers via the registered tools.
// The cleanest way without a full transport: use a stub transport that captures requests.

interface ToolResult { content: Array<{ type: string, text: string }>, isError?: boolean }

async function callTool (
  server: ReturnType<typeof buildServer>,
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  // _registeredTools is a plain object keyed by tool name; each entry has a .handler function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolRegistry = (server as any)._registeredTools as Record<string, { handler: (args: unknown) => Promise<ToolResult> }>

  if (toolRegistry == null || toolRegistry[name] == null) {
    throw new Error(`Tool not registered: ${name}`)
  }

  return await toolRegistry[name].handler(args)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MCP tools registration', () => {
  it('registers search_docs, get_page, list_pages, get_nav tools', () => {
    const server = buildServer()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools = (server as any)._registeredTools as Record<string, unknown>
    expect(tools.search_docs).toBeDefined()
    expect(tools.get_page).toBeDefined()
    expect(tools.list_pages).toBeDefined()
    expect(tools.get_nav).toBeDefined()
  })
})

describe('MCP tool: search_docs', () => {
  it('returns search results for a query', async () => {
    const server = buildServer()
    const result = await callTool(server, 'search_docs', { query: 'configuration' })
    expect(result.content).toHaveLength(1)
    const parsed = JSON.parse(result.content[0].text)
    expect(Array.isArray(parsed)).toBe(true)
    const config = parsed.find((r: { slug: string }) => r.slug === '/docs/config')
    expect(config).toBeDefined()
  })

  it('returns empty array for unmatched query', async () => {
    const server = buildServer()
    const result = await callTool(server, 'search_docs', { query: 'zyxwvutsrqponmlkjihgfedcba' })
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed).toEqual([])
  })

  it('respects limit parameter', async () => {
    const server = buildServer()
    const result = await callTool(server, 'search_docs', { query: 'mkdnsite', limit: 1 })
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.length).toBeLessThanOrEqual(1)
  })
})

describe('MCP tool: get_page', () => {
  it('returns markdown content for a valid slug', async () => {
    const server = buildServer()
    const result = await callTool(server, 'get_page', { slug: '/' })
    expect(result.isError).toBeFalsy()
    expect(result.content[0].text).toContain('# Home')
    expect(result.content[0].text).toContain('Welcome to mkdnsite.')
  })

  it('includes description in header when present', async () => {
    const server = buildServer()
    const result = await callTool(server, 'get_page', { slug: '/' })
    expect(result.content[0].text).toContain('> The Markdown-first web server.')
  })

  it('returns error for non-existent slug', async () => {
    const server = buildServer()
    const result = await callTool(server, 'get_page', { slug: '/nonexistent' })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('not found')
  })
})

describe('MCP tool: list_pages', () => {
  it('returns all pages', async () => {
    const server = buildServer()
    const result = await callTool(server, 'list_pages', {})
    const parsed = JSON.parse(result.content[0].text)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBe(PAGES.length)
  })

  it('each entry has title, slug, and optional description', async () => {
    const server = buildServer()
    const result = await callTool(server, 'list_pages', {})
    const parsed = JSON.parse(result.content[0].text)
    for (const entry of parsed) {
      expect(entry.slug).toBeDefined()
      expect(entry.title).toBeDefined()
    }
    const home = parsed.find((e: { slug: string }) => e.slug === '/')
    expect(home.description).toBe('The Markdown-first web server.')
  })
})

describe('MCP tool: get_nav', () => {
  it('returns navigation tree as JSON', async () => {
    const server = buildServer()
    const result = await callTool(server, 'get_nav', {})
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.slug).toBe('/')
    expect(parsed.isSection).toBe(true)
    expect(Array.isArray(parsed.children)).toBe(true)
  })

  it('nav tree has docs section with children', async () => {
    const server = buildServer()
    const result = await callTool(server, 'get_nav', {})
    const parsed = JSON.parse(result.content[0].text)
    const docs = parsed.children.find((c: { slug: string }) => c.slug === '/docs')
    expect(docs).toBeDefined()
    expect(docs.children.length).toBe(2)
  })
})
