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
