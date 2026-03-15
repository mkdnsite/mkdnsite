import { describe, it, expect } from 'bun:test'
import { renderPage } from '../src/render/page-shell.ts'
import { resolveConfig } from '../src/config/defaults.ts'
import { parseArgs } from '../src/cli.ts'

function render (opts: Record<string, unknown> = {}): string {
  const config = resolveConfig(opts as never)
  return renderPage({
    config,
    meta: { slug: 'test', title: 'Test', body: '' },
    renderedContent: '',
    currentSlug: 'test'
  })
}

describe('google analytics — page shell', () => {
  it('does not inject GA script when analytics not configured', () => {
    const html = render({})
    expect(html).not.toContain('googletagmanager')
    expect(html).not.toContain('gtag')
  })

  it('injects GA script when measurementId is set', () => {
    const html = render({ analytics: { googleAnalytics: { measurementId: 'G-TESTID1234' } } })
    expect(html).toContain('googletagmanager.com/gtag/js?id=G-TESTID1234')
    expect(html).toContain("gtag('config', 'G-TESTID1234')")
  })

  it('embeds the measurement ID in both script tags', () => {
    const html = render({ analytics: { googleAnalytics: { measurementId: 'G-ABC123' } } })
    // First script tag: the loader
    expect(html).toContain('id=G-ABC123')
    // Second script: the config call
    expect(html).toContain("'G-ABC123'")
  })

  it('does not inject when analytics config is empty object', () => {
    const html = render({ analytics: {} })
    expect(html).not.toContain('googletagmanager')
  })

  it('does not inject when googleAnalytics is set but measurementId is missing', () => {
    const html = render({ analytics: { googleAnalytics: { measurementId: '' } } })
    expect(html).not.toContain('googletagmanager')
  })

  it('includes gtag js and dataLayer setup', () => {
    const html = render({ analytics: { googleAnalytics: { measurementId: 'G-XYZ999' } } })
    expect(html).toContain('window.dataLayer = window.dataLayer || []')
    expect(html).toContain('function gtag(){dataLayer.push(arguments);}')
    expect(html).toContain("gtag('js', new Date())")
  })

  it('script is async', () => {
    const html = render({ analytics: { googleAnalytics: { measurementId: 'G-XYZ999' } } })
    expect(html).toContain('<script async src="https://www.googletagmanager.com/gtag/js')
  })
})

describe('google analytics — CLI flag', () => {
  it('--ga-measurement-id sets analytics.googleAnalytics.measurementId', () => {
    const { config } = parseArgs(['--ga-measurement-id', 'G-TESTID'])
    const analytics = config.analytics as Record<string, unknown>
    const ga = analytics?.googleAnalytics as Record<string, unknown>
    expect(ga?.measurementId).toBe('G-TESTID')
  })

  it('GA script appears in rendered output from CLI config', () => {
    const { config: cliConfig } = parseArgs(['--ga-measurement-id', 'G-CLI123'])
    const resolved = resolveConfig(cliConfig as never)
    const html = renderPage({
      config: resolved,
      meta: { slug: 'test', title: 'Test', body: '' },
      renderedContent: '',
      currentSlug: 'test'
    })
    expect(html).toContain('G-CLI123')
  })
})
