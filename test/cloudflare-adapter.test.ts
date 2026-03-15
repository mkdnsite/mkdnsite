import { describe, it, expect } from 'bun:test'
import { CloudflareAdapter } from '../src/adapters/cloudflare.ts'
import { GitHubSource } from '../src/content/github.ts'
import { R2ContentSource } from '../src/content/r2.ts'
import { resolveConfig } from '../src/config/defaults.ts'
import type { CloudflareEnv } from '../src/adapters/cloudflare.ts'

// Minimal mock R2 bucket for type satisfaction
const mockBucket = {
  get: async () => null,
  list: async () => ({ objects: [], truncated: false })
}

function makeAdapter (env: CloudflareEnv): CloudflareAdapter {
  return new CloudflareAdapter(env)
}

describe('CloudflareAdapter — createContentSource', () => {
  it('uses GitHubSource when config.github is set', () => {
    const adapter = makeAdapter({})
    const config = resolveConfig({
      github: { owner: 'test', repo: 'repo' }
    })
    const source = adapter.createContentSource(config)
    expect(source).toBeInstanceOf(GitHubSource)
  })

  it('uses GitHubSource when CONTENT_SOURCE=github', () => {
    const adapter = makeAdapter({
      CONTENT_SOURCE: 'github',
      GITHUB_OWNER: 'test',
      GITHUB_REPO: 'repo'
    })
    const config = resolveConfig({})
    const source = adapter.createContentSource(config)
    expect(source).toBeInstanceOf(GitHubSource)
  })

  it('uses R2ContentSource when CONTENT_BUCKET is provided', () => {
    const adapter = makeAdapter({ CONTENT_BUCKET: mockBucket as never })
    const config = resolveConfig({})
    const source = adapter.createContentSource(config)
    expect(source).toBeInstanceOf(R2ContentSource)
  })

  it('uses R2ContentSource when CONTENT_SOURCE=r2', () => {
    const adapter = makeAdapter({
      CONTENT_SOURCE: 'r2',
      CONTENT_BUCKET: mockBucket as never
    })
    const config = resolveConfig({})
    const source = adapter.createContentSource(config)
    expect(source).toBeInstanceOf(R2ContentSource)
  })

  it('CONTENT_SOURCE=r2 overrides config.github', () => {
    const adapter = makeAdapter({
      CONTENT_SOURCE: 'r2',
      CONTENT_BUCKET: mockBucket as never
    })
    const config = resolveConfig({ github: { owner: 'test', repo: 'repo' } })
    const source = adapter.createContentSource(config)
    expect(source).toBeInstanceOf(R2ContentSource)
  })

  it('CONTENT_SOURCE=github overrides CONTENT_BUCKET', () => {
    const adapter = makeAdapter({
      CONTENT_SOURCE: 'github',
      CONTENT_BUCKET: mockBucket as never,
      GITHUB_OWNER: 'test',
      GITHUB_REPO: 'repo'
    })
    const config = resolveConfig({})
    const source = adapter.createContentSource(config)
    expect(source).toBeInstanceOf(GitHubSource)
  })

  it('uses AssetsSource when ASSETS binding is provided', () => {
    const mockAssets = { fetch: async () => new Response('') }
    const env: CloudflareEnv = { ASSETS: mockAssets, CONTENT_MANIFEST: '["index.md"]' }
    const adapter = makeAdapter(env)
    const source = adapter.createContentSource(resolveConfig({}))
    expect(source).toBeDefined()
    expect(source.constructor.name).toBe('AssetsSource')
  })

  it('uses AssetsSource when CONTENT_SOURCE=assets', () => {
    const mockAssets = { fetch: async () => new Response('') }
    const env: CloudflareEnv = { CONTENT_SOURCE: 'assets', ASSETS: mockAssets }
    const adapter = makeAdapter(env)
    const source = adapter.createContentSource(resolveConfig({}))
    expect(source.constructor.name).toBe('AssetsSource')
  })

  it('throws when CONTENT_SOURCE=assets but no ASSETS binding', () => {
    const env: CloudflareEnv = { CONTENT_SOURCE: 'assets' }
    const adapter = makeAdapter(env)
    expect(() => adapter.createContentSource(resolveConfig({}))).toThrow('ASSETS')
  })

  it('throws when CONTENT_SOURCE=r2 but no CONTENT_BUCKET', () => {
    const env: CloudflareEnv = { CONTENT_SOURCE: 'r2' }
    const adapter = makeAdapter(env)
    expect(() => adapter.createContentSource(resolveConfig({}))).toThrow('CONTENT_BUCKET')
  })

  it('throws when no source is configured', () => {
    const adapter = makeAdapter({})
    const config = resolveConfig({})
    expect(() => adapter.createContentSource(config)).toThrow('CloudflareAdapter')
  })
})

describe('CloudflareAdapter — createRenderer', () => {
  it('returns portable renderer', async () => {
    const adapter = makeAdapter({})
    const config = resolveConfig({})
    const renderer = await adapter.createRenderer(config)
    expect(renderer.engine).toBe('portable')
  })
})

describe('CloudflareAdapter — createTrafficAnalytics', () => {
  it('returns undefined when ANALYTICS binding is absent', () => {
    const adapter = makeAdapter({})
    expect(adapter.createTrafficAnalytics()).toBeUndefined()
  })

  it('returns WorkersAnalyticsEngineAnalytics when ANALYTICS binding is present', async () => {
    const { WorkersAnalyticsEngineAnalytics } = await import('../src/adapters/cloudflare.ts')
    const mockDataset = { writeDataPoint: () => {} }
    const adapter = makeAdapter({ ANALYTICS: mockDataset as never })
    const analytics = adapter.createTrafficAnalytics()
    expect(analytics).toBeInstanceOf(WorkersAnalyticsEngineAnalytics)
  })

  it('WorkersAnalyticsEngineAnalytics.logRequest calls writeDataPoint', async () => {
    const { WorkersAnalyticsEngineAnalytics } = await import('../src/adapters/cloudflare.ts')
    const calls: unknown[] = []
    const mockDataset = { writeDataPoint: (data: unknown) => calls.push(data) }
    const wae = new WorkersAnalyticsEngineAnalytics(mockDataset as never)
    wae.logRequest({
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
    })
    expect(calls).toHaveLength(1)
    const dp = calls[0] as { blobs: string[], doubles: number[], indexes: string[] }
    expect(dp.blobs).toContain('/docs')
    expect(dp.blobs).toContain('html')
    expect(dp.blobs).toContain('human')
    expect(dp.doubles).toContain(200)
    expect(dp.doubles).toContain(15)
    expect(dp.indexes).toEqual([''])
  })

  it('WorkersAnalyticsEngineAnalytics writes siteId to indexes', async () => {
    const { WorkersAnalyticsEngineAnalytics } = await import('../src/adapters/cloudflare.ts')
    const calls: unknown[] = []
    const mockDataset = { writeDataPoint: (data: unknown) => calls.push(data) }
    const wae = new WorkersAnalyticsEngineAnalytics(mockDataset as never)
    wae.logRequest({
      timestamp: 1710000000000,
      path: '/docs',
      method: 'GET',
      format: 'html',
      trafficType: 'human',
      statusCode: 200,
      latencyMs: 15,
      userAgent: 'TestAgent/1.0',
      contentLength: 4321,
      cacheHit: false,
      siteId: 'site-abc123'
    })
    const dp = calls[0] as { indexes: string[] }
    expect(dp.indexes).toEqual(['site-abc123'])
  })
})
