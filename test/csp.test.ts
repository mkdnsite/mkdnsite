import { describe, it, expect } from 'bun:test'
import { createHandler } from '../src/handler.ts'
import { resolveConfig } from '../src/config/defaults.ts'
import { buildCsp } from '../src/security/csp.ts'
import { parseArgs } from '../src/cli.ts'
import type { ContentPage, ContentSource, NavNode } from '../src/content/types.ts'
import type { MarkdownRenderer } from '../src/render/types.ts'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockPage: ContentPage = {
  slug: '/',
  sourcePath: 'index.md',
  meta: { title: 'Home' },
  body: 'Hello',
  raw: '---\ntitle: Home\n---\n\nHello'
}

const mockSource: ContentSource = {
  async getPage () { return mockPage },
  async getNavTree (): Promise<NavNode> {
    return { title: 'Root', slug: '/', order: 0, children: [], isSection: true }
  },
  async listPages () { return [mockPage] },
  async refresh () {}
}

const stubRenderer: MarkdownRenderer = {
  engine: 'portable',
  renderToHtml: () => '<p>content</p>',
  renderToElement: () => null as unknown as ReturnType<typeof import('react').createElement>
}

function cfg (overrides: Record<string, unknown> = {}): ReturnType<typeof resolveConfig> {
  return resolveConfig(overrides as never)
}

function makeHandler (overrides: Record<string, unknown> = {}): ReturnType<typeof createHandler> {
  const config = cfg(overrides)
  return createHandler({ source: mockSource, renderer: stubRenderer, config })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CSP — HTTP response header', () => {
  it('includes CSP header on HTML responses by default', async () => {
    const handler = makeHandler()
    const res = await handler(new Request('http://localhost/'))
    expect(res.headers.get('Content-Security-Policy')).not.toBeNull()
  })

  it('does NOT include CSP on markdown responses', async () => {
    const handler = makeHandler()
    const res = await handler(new Request('http://localhost/', {
      headers: { Accept: 'text/markdown' }
    }))
    expect(res.headers.get('Content-Security-Policy')).toBeNull()
  })

  it('does NOT include CSP when csp.enabled is false', async () => {
    const handler = makeHandler({ csp: { enabled: false } })
    const res = await handler(new Request('http://localhost/'))
    expect(res.headers.get('Content-Security-Policy')).toBeNull()
  })
})

describe('CSP — --no-csp CLI flag', () => {
  it('--no-csp sets csp.enabled to false', () => {
    const { config } = parseArgs(['--no-csp'])
    const csp = config.csp as unknown as Record<string, unknown>
    expect(csp?.enabled).toBe(false)
  })
})

describe('CSP — buildCsp() directives', () => {
  it('always includes frame-src none', () => {
    expect(buildCsp(cfg())).toContain("frame-src 'none'")
  })

  it('always includes object-src none', () => {
    expect(buildCsp(cfg())).toContain("object-src 'none'")
  })

  it('always includes base-uri self', () => {
    expect(buildCsp(cfg())).toContain("base-uri 'self'")
  })

  it('always includes form-action self', () => {
    expect(buildCsp(cfg())).toContain("form-action 'self'")
  })

  it('script-src includes jsdelivr when mermaid is enabled', () => {
    const mermaid = { mermaid: true }
    const config = cfg({ client: mermaid as never })
    const csp = buildCsp(config)
    const scriptSrc = csp.split(';').find(d => d.trim().startsWith('script-src'))
    expect(scriptSrc).toContain('https://cdn.jsdelivr.net')
  })

  it('script-src includes jsdelivr when charts is enabled', () => {
    const charts = { charts: true }
    const config = cfg({ client: charts as never })
    const csp = buildCsp(config)
    const scriptSrc = csp.split(';').find(d => d.trim().startsWith('script-src'))
    expect(scriptSrc).toContain('https://cdn.jsdelivr.net')
  })

  it('script-src does NOT include jsdelivr when mermaid and charts are disabled', () => {
    const off = { mermaid: false, charts: false }
    const config = cfg({ client: off as never })
    const csp = buildCsp(config)
    const scriptSrc = csp.split(';').find(d => d.trim().startsWith('script-src'))
    expect(scriptSrc).not.toContain('cdn.jsdelivr.net')
  })

  it('script-src includes googletagmanager when GA is configured', () => {
    const config = cfg({ analytics: { googleAnalytics: { measurementId: 'G-TEST' } } })
    const csp = buildCsp(config)
    expect(csp).toContain('https://www.googletagmanager.com')
    expect(csp).toContain('https://www.google-analytics.com')
  })

  it('script-src does NOT include googletagmanager when GA is not configured', () => {
    expect(buildCsp(cfg())).not.toContain('googletagmanager')
  })

  it('style-src includes jsdelivr when math is enabled', () => {
    const math = { math: true }
    const config = cfg({ client: math as never })
    const csp = buildCsp(config)
    const styleSrc = csp.split(';').find(d => d.trim().startsWith('style-src'))
    expect(styleSrc).toContain('https://cdn.jsdelivr.net')
  })

  it('style-src does NOT include jsdelivr when math is disabled', () => {
    const noMath = { math: false }
    const config = cfg({ client: noMath as never })
    const csp = buildCsp(config)
    const styleSrc = csp.split(';').find(d => d.trim().startsWith('style-src'))
    expect(styleSrc).not.toContain('cdn.jsdelivr.net')
  })

  it('img-src includes blob: when mermaid is enabled', () => {
    const mermaid = { mermaid: true }
    const config = cfg({ client: mermaid as never })
    const csp = buildCsp(config)
    const imgSrc = csp.split(';').find(d => d.trim().startsWith('img-src'))
    expect(imgSrc).toContain('blob:')
  })

  it('img-src does NOT include blob: when mermaid is disabled', () => {
    const noMermaid = { mermaid: false }
    const config = cfg({ client: noMermaid as never })
    const csp = buildCsp(config)
    const imgSrc = csp.split(';').find(d => d.trim().startsWith('img-src'))
    expect(imgSrc).not.toContain('blob:')
  })

  it('connect-src includes GA domains when GA is configured', () => {
    const config = cfg({ analytics: { googleAnalytics: { measurementId: 'G-TEST' } } })
    const csp = buildCsp(config)
    const connectSrc = csp.split(';').find(d => d.trim().startsWith('connect-src'))
    expect(connectSrc).toContain('https://www.google-analytics.com')
    expect(connectSrc).toContain('https://analytics.google.com')
    expect(connectSrc).toContain('https://region1.google-analytics.com')
  })

  it('appends extra script-src sources from config', () => {
    const config = cfg({ csp: { enabled: true, extraScriptSrc: ['https://example.com'] } })
    expect(buildCsp(config)).toContain('https://example.com')
  })

  it('appends extra img-src sources from config', () => {
    const config = cfg({ csp: { enabled: true, extraImgSrc: ['https://images.example.com'] } })
    const csp = buildCsp(config)
    const imgSrc = csp.split(';').find(d => d.trim().startsWith('img-src'))
    expect(imgSrc).toContain('https://images.example.com')
  })

  it('includes report-uri when configured', () => {
    const config = cfg({ csp: { enabled: true, reportUri: 'https://csp.example.com/report' } })
    expect(buildCsp(config)).toContain('report-uri https://csp.example.com/report')
  })

  it('does NOT include report-uri when not configured', () => {
    expect(buildCsp(cfg())).not.toContain('report-uri')
  })

  it('sanitizes semicolons from extraScriptSrc to prevent directive injection', () => {
    const config = cfg({
      csp: {
        enabled: true,
        extraScriptSrc: ["https://evil.com; script-src-elem 'unsafe-eval'"]
      }
    })
    const csp = buildCsp(config)
    // Semicolons stripped — the injected directive separator is neutralized
    // The text remains as a harmless token within the existing directive
    const directives = csp.split('; ')
    // There should be no standalone "script-src-elem" directive
    expect(directives.filter(d => d.startsWith('script-src-elem'))).toHaveLength(0)
  })

  it('sanitizes semicolons from reportUri', () => {
    const config = cfg({
      csp: {
        enabled: true,
        reportUri: 'https://report.example.com; script-src *'
      }
    })
    const csp = buildCsp(config)
    expect(csp).not.toContain('; script-src *')
  })

  it('auto-adds customCssUrl origin to style-src when external', () => {
    const config = cfg({
      theme: { customCssUrl: 'https://fonts.googleapis.com/css2?family=Inter' }
    })
    const csp = buildCsp(config)
    const styleSrc = csp.split(';').find(d => d.trim().startsWith('style-src'))
    expect(styleSrc).toContain('https://fonts.googleapis.com')
  })

  it('does not add customCssUrl origin for relative URLs', () => {
    const config = cfg({
      theme: { customCssUrl: '/styles/custom.css' }
    })
    const csp = buildCsp(config)
    const styleSrc = csp.split(';').find(d => d.trim().startsWith('style-src'))
    expect(styleSrc).not.toContain('/styles/custom.css')
  })
})
