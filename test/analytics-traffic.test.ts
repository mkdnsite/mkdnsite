import { describe, it, expect } from 'bun:test'
import { classifyTraffic, BOT_PATTERNS } from '../src/analytics/classify.ts'
import { NoopAnalytics } from '../src/analytics/noop.ts'
import { ConsoleAnalytics } from '../src/analytics/console.ts'
import { parseArgs } from '../src/cli.ts'
import { resolveConfig } from '../src/config/defaults.ts'
import { createHandler } from '../src/handler.ts'
import type { TrafficEvent, TrafficAnalytics } from '../src/analytics/types.ts'
import type { ContentSource, ContentPage, NavNode } from '../src/content/types.ts'
import type { MarkdownRenderer } from '../src/render/types.ts'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest (opts: {
  url?: string
  accept?: string
  userAgent?: string
  method?: string
}): Request {
  const url = opts.url ?? 'http://localhost/test'
  const headers: Record<string, string> = {}
  if (opts.accept != null) headers.Accept = opts.accept
  if (opts.userAgent != null) headers['User-Agent'] = opts.userAgent
  return new Request(url, { method: opts.method ?? 'GET', headers })
}

function makeEvent (overrides: Partial<TrafficEvent> = {}): TrafficEvent {
  return {
    timestamp: Date.now(),
    path: '/test',
    method: 'GET',
    format: 'html',
    trafficType: 'human',
    statusCode: 200,
    latencyMs: 10,
    userAgent: 'Mozilla/5.0',
    contentLength: 1234,
    cacheHit: false,
    ...overrides
  }
}

// Minimal stub content source for handler integration tests
function makeStubSource (page?: ContentPage | null): ContentSource {
  return {
    async getPage (slug: string) {
      if (page !== undefined) return page
      return {
        slug,
        sourcePath: `${slug}.md`,
        body: '# Hello',
        raw: '# Hello',
        meta: { slug, title: 'Hello', body: '# Hello' }
      }
    },
    async getNavTree (): Promise<NavNode> {
      return { title: 'root', slug: '/', order: 0, children: [], isSection: true }
    },
    async listPages () { return [] },
    async refresh () {}
  }
}

// Minimal stub renderer
function makeStubRenderer (): MarkdownRenderer {
  return {
    engine: 'portable',
    renderToElement () { return null as never },
    renderToHtml () {
      return '<h1>Hello</h1>'
    }
  }
}

// ─── classifyTraffic ──────────────────────────────────────────────────────────

describe('classifyTraffic', () => {
  it('returns mcp when format is mcp', () => {
    const req = makeRequest({})
    expect(classifyTraffic(req, 'mcp')).toBe('mcp')
  })

  it('returns ai_agent when format is markdown', () => {
    const req = makeRequest({})
    expect(classifyTraffic(req, 'markdown')).toBe('ai_agent')
  })

  it('returns human when format is html even with markdown-like Accept', () => {
    // classifyTraffic relies on pre-resolved format, not raw Accept headers.
    // Accept header classification happens in resolveAnalyticsFormat().
    const req = makeRequest({ accept: 'text/markdown' })
    expect(classifyTraffic(req, 'html')).toBe('human')
  })

  it('returns human when format is html even for .md URL', () => {
    // URL-based classification happens in resolveAnalyticsFormat(), not here.
    const req = makeRequest({ url: 'http://localhost/page.md' })
    expect(classifyTraffic(req, 'html')).toBe('human')
  })

  it('returns bot for Googlebot', () => {
    const req = makeRequest({ userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' })
    expect(classifyTraffic(req, 'html')).toBe('bot')
  })

  it('returns bot for Bingbot', () => {
    const req = makeRequest({ userAgent: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)' })
    expect(classifyTraffic(req, 'html')).toBe('bot')
  })

  it('returns bot for AhrefsBot', () => {
    const req = makeRequest({ userAgent: 'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)' })
    expect(classifyTraffic(req, 'html')).toBe('bot')
  })

  it('returns bot for Twitterbot', () => {
    const req = makeRequest({ userAgent: 'Twitterbot/1.0' })
    expect(classifyTraffic(req, 'html')).toBe('bot')
  })

  it('returns bot for Discordbot', () => {
    const req = makeRequest({ userAgent: 'Discordbot/2.0; +https://discordapp.com' })
    expect(classifyTraffic(req, 'html')).toBe('bot')
  })

  it('returns human for a normal browser UA', () => {
    const req = makeRequest({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' })
    expect(classifyTraffic(req, 'html')).toBe('human')
  })

  it('returns human when no User-Agent is set', () => {
    const req = makeRequest({})
    expect(classifyTraffic(req, 'html')).toBe('human')
  })

  it('returns human for api format with no bot UA', () => {
    const req = makeRequest({ userAgent: 'my-app/1.0' })
    expect(classifyTraffic(req, 'api')).toBe('human')
  })

  it('mcp takes precedence over markdown accept header', () => {
    const req = makeRequest({ accept: 'text/markdown' })
    expect(classifyTraffic(req, 'mcp')).toBe('mcp')
  })

  it('BOT_PATTERNS array is non-empty and contains regexes', () => {
    expect(BOT_PATTERNS.length).toBeGreaterThan(0)
    for (const p of BOT_PATTERNS) {
      expect(p).toBeInstanceOf(RegExp)
    }
  })
})

// ─── NoopAnalytics ────────────────────────────────────────────────────────────

describe('NoopAnalytics', () => {
  it('logRequest does not throw', () => {
    const noop = new NoopAnalytics()
    expect(() => noop.logRequest(makeEvent())).not.toThrow()
  })

  it('logRequest can be called many times without error', () => {
    const noop = new NoopAnalytics()
    for (let i = 0; i < 100; i++) {
      noop.logRequest(makeEvent({ statusCode: i }))
    }
  })
})

// ─── ConsoleAnalytics ─────────────────────────────────────────────────────────

describe('ConsoleAnalytics', () => {
  it('writes a JSON line to the output function', () => {
    const lines: string[] = []
    const ca = new ConsoleAnalytics(line => lines.push(line))
    ca.logRequest(makeEvent({ path: '/hello', statusCode: 200 }))
    expect(lines).toHaveLength(1)
    const parsed = JSON.parse(lines[0])
    expect(parsed.path).toBe('/hello')
    expect(parsed.status).toBe(200)
  })

  it('includes all expected fields', () => {
    const lines: string[] = []
    const ca = new ConsoleAnalytics(line => lines.push(line))
    ca.logRequest(makeEvent({
      timestamp: 1710000000000,
      path: '/docs',
      method: 'GET',
      format: 'html',
      trafficType: 'human',
      statusCode: 200,
      latencyMs: 15,
      userAgent: 'TestAgent/1.0',
      contentLength: 4321,
      cacheHit: false
    }))
    const obj = JSON.parse(lines[0])
    expect(obj.ts).toBe(1710000000000)
    expect(obj.method).toBe('GET')
    expect(obj.path).toBe('/docs')
    expect(obj.format).toBe('html')
    expect(obj.type).toBe('human')
    expect(obj.status).toBe(200)
    expect(obj.ms).toBe(15)
    expect(obj.bytes).toBe(4321)
    expect(obj.cache).toBe(false)
    expect(obj.ua).toBe('TestAgent/1.0')
  })

  it('defaults to console.log when no output function provided', () => {
    // Just verify construction without error; console.log is the default
    expect(() => new ConsoleAnalytics()).not.toThrow()
  })

  it('includes siteId when present', () => {
    const lines: string[] = []
    const ca = new ConsoleAnalytics(line => lines.push(line))
    ca.logRequest(makeEvent({ siteId: 'site-abc123' }))
    const obj = JSON.parse(lines[0])
    expect(obj.site).toBe('site-abc123')
  })

  it('omits siteId when not present', () => {
    const lines: string[] = []
    const ca = new ConsoleAnalytics(line => lines.push(line))
    ca.logRequest(makeEvent())
    const obj = JSON.parse(lines[0])
    expect(obj.site).toBeUndefined()
  })

  it('logs cacheHit: true correctly', () => {
    const lines: string[] = []
    const ca = new ConsoleAnalytics(line => lines.push(line))
    ca.logRequest(makeEvent({ cacheHit: true }))
    const obj = JSON.parse(lines[0])
    expect(obj.cache).toBe(true)
  })
})

// ─── Handler integration ──────────────────────────────────────────────────────

describe('Handler analytics integration', () => {
  it('calls logRequest when analytics is provided', async () => {
    const events: TrafficEvent[] = []
    const analytics: TrafficAnalytics = { logRequest: e => events.push(e) }
    const config = resolveConfig({})
    const handler = createHandler({
      source: makeStubSource(),
      renderer: makeStubRenderer(),
      config,
      analytics
    })
    const req = new Request('http://localhost/test')
    await handler(req)
    expect(events).toHaveLength(1)
    expect(events[0].path).toBe('/test')
    expect(events[0].method).toBe('GET')
    expect(events[0].statusCode).toBe(200)
    expect(events[0].format).toBe('html')
    expect(events[0].trafficType).toBe('human')
    expect(events[0].latencyMs).toBeGreaterThanOrEqual(0)
    expect(events[0].cacheHit).toBe(false)
  })

  it('does not call logRequest when analytics is not provided', async () => {
    const called = { count: 0 }
    const config = resolveConfig({})
    const handler = createHandler({
      source: makeStubSource(),
      renderer: makeStubRenderer(),
      config
    })
    const req = new Request('http://localhost/test')
    const res = await handler(req)
    expect(res.status).toBe(200)
    expect(called.count).toBe(0)
  })

  it('records markdown format for text/markdown accept header', async () => {
    const events: TrafficEvent[] = []
    const analytics: TrafficAnalytics = { logRequest: e => events.push(e) }
    const config = resolveConfig({})
    const handler = createHandler({
      source: makeStubSource(),
      renderer: makeStubRenderer(),
      config,
      analytics
    })
    const req = new Request('http://localhost/test', {
      headers: { Accept: 'text/markdown' }
    })
    await handler(req)
    expect(events[0].format).toBe('markdown')
    expect(events[0].trafficType).toBe('ai_agent')
  })

  it('records 404 status for missing pages', async () => {
    const events: TrafficEvent[] = []
    const analytics: TrafficAnalytics = { logRequest: e => events.push(e) }
    const config = resolveConfig({})
    const handler = createHandler({
      source: makeStubSource(null),
      renderer: makeStubRenderer(),
      config,
      analytics
    })
    const req = new Request('http://localhost/missing')
    await handler(req)
    expect(events[0].statusCode).toBe(404)
  })

  it('never throws when logRequest throws internally', async () => {
    const analytics: TrafficAnalytics = {
      logRequest () { throw new Error('analytics failure') }
    }
    const config = resolveConfig({})
    const handler = createHandler({
      source: makeStubSource(),
      renderer: makeStubRenderer(),
      config,
      analytics
    })
    const req = new Request('http://localhost/test')
    // Should not propagate the analytics error
    const res = await handler(req)
    expect(res.status).toBe(200)
  })

  it('records non-zero contentLength for HTML responses', async () => {
    const events: TrafficEvent[] = []
    const analytics: TrafficAnalytics = { logRequest: e => events.push(e) }
    const config = resolveConfig({})
    const handler = createHandler({
      source: makeStubSource(),
      renderer: makeStubRenderer(),
      config,
      analytics
    })
    const req = new Request('http://localhost/test')
    await handler(req)
    expect(events[0].contentLength).toBeGreaterThan(0)
  })

  it('records non-zero contentLength for markdown responses', async () => {
    const events: TrafficEvent[] = []
    const analytics: TrafficAnalytics = { logRequest: e => events.push(e) }
    const config = resolveConfig({})
    const handler = createHandler({
      source: makeStubSource(),
      renderer: makeStubRenderer(),
      config,
      analytics
    })
    const req = new Request('http://localhost/test', {
      headers: { Accept: 'text/markdown' }
    })
    await handler(req)
    expect(events[0].contentLength).toBeGreaterThan(0)
  })

  it('passes siteId through to analytics events', async () => {
    const events: TrafficEvent[] = []
    const analytics: TrafficAnalytics = { logRequest: e => events.push(e) }
    const config = resolveConfig({})
    const handler = createHandler({
      source: makeStubSource(),
      renderer: makeStubRenderer(),
      config,
      analytics,
      siteId: 'site-xyz789'
    })
    const req = new Request('http://localhost/test')
    await handler(req)
    expect(events[0].siteId).toBe('site-xyz789')
  })

  it('siteId is undefined when not configured', async () => {
    const events: TrafficEvent[] = []
    const analytics: TrafficAnalytics = { logRequest: e => events.push(e) }
    const config = resolveConfig({})
    const handler = createHandler({
      source: makeStubSource(),
      renderer: makeStubRenderer(),
      config,
      analytics
    })
    const req = new Request('http://localhost/test')
    await handler(req)
    expect(events[0].siteId).toBeUndefined()
  })

  it('records api format for /api/search endpoint', async () => {
    const events: TrafficEvent[] = []
    const analytics: TrafficAnalytics = { logRequest: e => events.push(e) }
    const config = resolveConfig({ client: { search: true, enabled: true, mermaid: true, copyButton: true, themeToggle: true, math: true, charts: true } })
    const handler = createHandler({
      source: makeStubSource(),
      renderer: makeStubRenderer(),
      config,
      analytics
    })
    const req = new Request('http://localhost/api/search?q=hello')
    await handler(req)
    expect(events[0].format).toBe('api')
  })
})

// ─── CLI flag parsing ─────────────────────────────────────────────────────────

describe('CLI flag — traffic analytics', () => {
  it('--traffic-analytics sets analytics.traffic.enabled = true', () => {
    const { config } = parseArgs(['--traffic-analytics'])
    expect((config.analytics as Record<string, unknown>)?.traffic).toMatchObject({ enabled: true })
  })

  it('--traffic-console sets analytics.traffic.console = true', () => {
    const { config } = parseArgs(['--traffic-console'])
    expect((config.analytics as Record<string, unknown>)?.traffic).toMatchObject({ console: true })
  })

  it('--traffic-analytics and --traffic-console can be combined', () => {
    const { config } = parseArgs(['--traffic-analytics', '--traffic-console'])
    expect((config.analytics as Record<string, unknown>)?.traffic).toMatchObject({ enabled: true, console: true })
  })

  it('--ga-measurement-id can coexist with --traffic-analytics', () => {
    const { config } = parseArgs(['--ga-measurement-id', 'G-TEST123', '--traffic-analytics'])
    const analytics = config.analytics as Record<string, unknown>
    expect((analytics.googleAnalytics as Record<string, unknown>)?.measurementId).toBe('G-TEST123')
    expect((analytics.traffic as Record<string, unknown>)?.enabled).toBe(true)
  })

  it('resolveConfig applies traffic defaults when traffic is set', () => {
    const resolved = resolveConfig({
      analytics: { traffic: { enabled: true } }
    })
    expect(resolved.analytics?.traffic?.enabled).toBe(true)
    expect(resolved.analytics?.traffic?.console).toBe(false)
  })
})
