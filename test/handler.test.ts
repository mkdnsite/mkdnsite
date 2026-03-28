import { describe, it, expect } from 'bun:test'
import { resolve } from 'node:path'
import { negotiateFormat } from '../src/negotiate/accept.ts'
import { estimateTokens } from '../src/negotiate/headers.ts'
import { parseFrontmatter } from '../src/content/frontmatter.ts'
import { createHandler } from '../src/handler.ts'
import { FilesystemSource } from '../src/content/filesystem.ts'
import { PortableRenderer } from '../src/render/portable.ts'
import { resolveConfig } from '../src/config/defaults.ts'
import { MemoryContentCache } from '../src/content/cache.ts'
import type { NavNode } from '../src/content/types.ts'

// ---- Content Negotiation ----

describe('negotiateFormat', () => {
  it('returns html when no Accept header', () => {
    expect(negotiateFormat(null)).toBe('html')
  })

  it('returns html for browser Accept', () => {
    expect(
      negotiateFormat('text/html,application/xhtml+xml,*/*;q=0.8')
    ).toBe('html')
  })

  it('returns markdown for text/markdown', () => {
    expect(negotiateFormat('text/markdown')).toBe('markdown')
  })

  it('returns markdown for Claude Code style header', () => {
    expect(negotiateFormat('text/markdown, text/html, */*')).toBe('markdown')
  })

  it('returns markdown for quality-weighted preference', () => {
    expect(negotiateFormat('text/markdown;q=1.0, text/html;q=0.7')).toBe('markdown')
  })

  it('returns html when markdown has lower quality', () => {
    expect(negotiateFormat('text/html;q=1.0, text/markdown;q=0.5')).toBe('html')
  })

  it('returns html for wildcard only', () => {
    expect(negotiateFormat('*/*')).toBe('html')
  })

  it('handles application/markdown variant', () => {
    expect(negotiateFormat('application/markdown')).toBe('markdown')
  })

  it('handles text/x-markdown variant', () => {
    expect(negotiateFormat('text/x-markdown')).toBe('markdown')
  })
})

// ---- Frontmatter ----

describe('parseFrontmatter', () => {
  it('parses YAML frontmatter', () => {
    const input = `---
title: Hello World
description: A test page
---

# Hello

Body content here.`

    const result = parseFrontmatter(input)
    expect(result.meta.title).toBe('Hello World')
    expect(result.meta.description).toBe('A test page')
    expect(result.body).toContain('# Hello')
    expect(result.body).not.toContain('---')
  })

  it('handles no frontmatter', () => {
    const input = '# Just Markdown\n\nNo frontmatter here.'
    const result = parseFrontmatter(input)
    expect(result.meta).toEqual({})
    expect(result.body).toBe(input)
  })

  it('preserves raw content', () => {
    const input = '---\ntitle: Test\n---\n\nContent'
    const result = parseFrontmatter(input)
    expect(result.raw).toBe(input)
  })
})

// ---- Token Estimation ----

describe('estimateTokens', () => {
  it('estimates tokens for simple text', () => {
    const tokens = estimateTokens('Hello world, this is a test.')
    expect(tokens).toBeGreaterThan(0)
    expect(tokens).toBeLessThan(20)
  })

  it('returns 0 for empty text', () => {
    expect(estimateTokens('')).toBe(0)
  })
})

// ---- Handler Integration ----

describe('handler integration', () => {
  const config = resolveConfig({
    contentDir: resolve(import.meta.dir, '../content'),
    site: { title: 'Test Site' }
  })
  const source = new FilesystemSource(config.contentDir)
  const renderer = new PortableRenderer()
  const handler = createHandler({ source, renderer, config })

  it('serves HTML by default', async () => {
    const req = new Request('http://localhost:3000/')
    const res = await handler(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/html')
    const body = await res.text()
    expect(body).toContain('<!DOCTYPE html>')
  })

  it('serves markdown when Accept: text/markdown', async () => {
    const req = new Request('http://localhost:3000/', {
      headers: { Accept: 'text/markdown' }
    })
    const res = await handler(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/markdown')
    expect(res.headers.get('Vary')).toBe('Accept')
    expect(res.headers.has('x-markdown-tokens')).toBe(true)
    expect(res.headers.has('Content-Signal')).toBe(true)
  })

  it('serves markdown when URL ends in .md', async () => {
    const req = new Request('http://localhost:3000/index.md')
    const res = await handler(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/markdown')
  })

  it('serves /llms.txt', async () => {
    const req = new Request('http://localhost:3000/llms.txt')
    const res = await handler(req)
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('# Test Site')
  })

  it('returns 404 for missing pages', async () => {
    const req = new Request('http://localhost:3000/nonexistent')
    const res = await handler(req)
    expect(res.status).toBe(404)
  })

  it('returns markdown 404 for agents', async () => {
    const req = new Request('http://localhost:3000/nonexistent', {
      headers: { Accept: 'text/markdown' }
    })
    const res = await handler(req)
    expect(res.status).toBe(404)
    expect(res.headers.get('Content-Type')).toContain('text/markdown')
  })

  it('health check returns ok', async () => {
    const req = new Request('http://localhost:3000/_health')
    const res = await handler(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })
})

describe('staticHandler option', () => {
  const config = resolveConfig({
    contentDir: resolve(import.meta.dir, '../content'),
    site: { title: 'Test Site' }
  })
  const source = new FilesystemSource(config.contentDir)
  const renderer = new PortableRenderer()

  it('calls staticHandler for static extension requests', async () => {
    let called = false
    let calledWith = ''
    const handler = createHandler({
      source,
      renderer,
      config,
      staticHandler: async (pathname) => {
        called = true
        calledWith = pathname
        return new Response('img-data', { status: 200, headers: { 'Content-Type': 'image/png' } })
      }
    })
    const req = new Request('http://localhost:3000/logo.png')
    const res = await handler(req)
    expect(called).toBe(true)
    expect(calledWith).toBe('/logo.png')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/png')
    expect(await res.text()).toBe('img-data')
  })

  it('falls through to built-in serveStatic when staticHandler returns null', async () => {
    const handler = createHandler({
      source,
      renderer,
      config: resolveConfig({
        contentDir: resolve(import.meta.dir, '../content'),
        staticDir: resolve(import.meta.dir, '../content'),
        site: { title: 'Test Site' }
      }),
      staticHandler: async (_pathname) => null
    })
    // /nonexistent.png will trigger built-in serveStatic which returns 404
    const req = new Request('http://localhost:3000/nonexistent.png')
    const res = await handler(req)
    // built-in serveStatic returns 404 for missing files
    expect(res.status).toBe(404)
  })

  it('does not call staticHandler for non-static extension requests', async () => {
    let called = false
    const handler = createHandler({
      source,
      renderer,
      config,
      staticHandler: async (_pathname) => {
        called = true
        return new Response('should-not-reach', { status: 200 })
      }
    })
    const req = new Request('http://localhost:3000/')
    await handler(req)
    expect(called).toBe(false)
  })

  it('falls through to content routing when no staticHandler and no staticDir', async () => {
    const handler = createHandler({ source, renderer, config })
    const req = new Request('http://localhost:3000/logo.png')
    const res = await handler(req)
    // No static handler, no staticDir — falls through to content routing → 404
    expect(res.status).toBe(404)
  })
})

describe('nav contentCache', () => {
  const config = resolveConfig({
    contentDir: resolve(import.meta.dir, '../content'),
    site: { title: 'Test Site' }
  })
  const renderer = new PortableRenderer()

  it('stores nav in contentCache after first request', async () => {
    const source = new FilesystemSource(config.contentDir)
    const contentCache = new MemoryContentCache()

    // Nav should not be cached yet
    expect(await contentCache.getNav()).toBeNull()

    const handler = createHandler({ source, renderer, config, contentCache })
    await handler(new Request('http://localhost:3000/'))

    // Nav should now be cached
    const cached = await contentCache.getNav()
    expect(cached).not.toBeNull()
    expect(cached?.children.length).toBeGreaterThan(0)
  })

  it('serves nav from contentCache on subsequent requests (no getNavTree call)', async () => {
    let getNavTreeCallCount = 0
    const fakeNav: NavNode = {
      title: 'cached-root',
      slug: '/',
      order: 0,
      isSection: false,
      children: [{ title: 'Cached Page', slug: '/cached', order: 1, isSection: false, children: [] }]
    }

    // Stub source with a spy on getNavTree
    const source = new FilesystemSource(config.contentDir)
    const origGetNavTree = source.getNavTree.bind(source)
    source.getNavTree = async () => {
      getNavTreeCallCount++
      return await origGetNavTree()
    }

    const contentCache = new MemoryContentCache()
    // Pre-populate cache with our fake nav
    await contentCache.setNav(fakeNav)

    const handler = createHandler({ source, renderer, config, contentCache })
    const res = await handler(new Request('http://localhost:3000/'))
    expect(res.status).toBe(200)

    // getNavTree should NOT have been called because cache was warm
    expect(getNavTreeCallCount).toBe(0)

    // The rendered HTML should contain the cached nav label
    const html = await res.text()
    expect(html).toContain('Cached Page')
  })

  it('does not cache an empty nav tree', async () => {
    // Source whose getNavTree returns empty nav
    const emptySource = {
      getPage: (new FilesystemSource(config.contentDir)).getPage.bind(new FilesystemSource(config.contentDir)),
      getNavTree: async (): Promise<NavNode> => ({ title: '', slug: '/', order: 0, isSection: false, children: [] }),
      listPages: async () => []
    }

    const contentCache = new MemoryContentCache()
    const handler = createHandler({ source: emptySource as never, renderer, config, contentCache })
    await handler(new Request('http://localhost:3000/'))

    // Empty nav should not be cached
    expect(await contentCache.getNav()).toBeNull()
  })
})
