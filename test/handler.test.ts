import { describe, it, expect } from 'bun:test'
import { resolve } from 'node:path'
import { negotiateFormat } from '../src/negotiate/accept'
import { estimateTokens } from '../src/negotiate/headers'
import { parseFrontmatter } from '../src/content/frontmatter'
import { createHandler } from '../src/handler'
import { FilesystemSource } from '../src/content/filesystem'
import { PortableRenderer } from '../src/render/portable'
import { resolveConfig } from '../src/config/defaults'

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
