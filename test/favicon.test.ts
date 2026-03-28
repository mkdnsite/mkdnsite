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

describe('favicon — CLI flag', () => {
  it('--favicon sets site.favicon.src', () => {
    const { config } = parseArgs(['--favicon', '/favicon.ico'])
    const site = config.site as unknown as Record<string, unknown>
    expect((site?.favicon as Record<string, unknown>)?.src).toBe('/favicon.ico')
  })

  it('--favicon with PNG path', () => {
    const { config } = parseArgs(['--favicon', '/icons/logo.png'])
    const site = config.site as unknown as Record<string, unknown>
    expect((site?.favicon as Record<string, unknown>)?.src).toBe('/icons/logo.png')
  })
})

describe('favicon — page shell rendering', () => {
  it('emits no favicon link when not configured', () => {
    const html = render({})
    expect(html).not.toContain('rel="icon"')
    expect(html).not.toContain('apple-touch-icon')
  })

  it('emits favicon link for .ico', () => {
    const html = render({ site: { favicon: { src: '/favicon.ico' } } })
    expect(html).toContain('<link rel="icon" href="/favicon.ico" type="image/x-icon">')
    expect(html).not.toContain('apple-touch-icon')
  })

  it('emits favicon link for .png with apple-touch-icon', () => {
    const html = render({ site: { favicon: { src: '/favicon.png' } } })
    expect(html).toContain('<link rel="icon" href="/favicon.png" type="image/png">')
    expect(html).toContain('<link rel="apple-touch-icon" href="/favicon.png">')
  })

  it('emits favicon link for .svg without apple-touch-icon', () => {
    const html = render({ site: { favicon: { src: '/favicon.svg' } } })
    expect(html).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml">')
    expect(html).not.toContain('apple-touch-icon')
  })

  it('handles external URL favicon', () => {
    const html = render({ site: { favicon: { src: 'https://example.com/favicon.ico' } } })
    expect(html).toContain('<link rel="icon" href="https://example.com/favicon.ico" type="image/x-icon">')
  })

  it('escapes special characters in favicon src', () => {
    const html = render({ site: { favicon: { src: '/icons/icon&v2.svg' } } })
    expect(html).toContain('href="/icons/icon&amp;v2.svg"')
  })
})

describe('favicon — logo fallback', () => {
  it('uses PNG logo as favicon when no explicit favicon configured', () => {
    const html = render({ theme: { logo: { src: '/logo.png' } } })
    expect(html).toContain('<link rel="icon" href="/logo.png" type="image/png">')
    expect(html).toContain('<link rel="apple-touch-icon" href="/logo.png">')
  })

  it('uses SVG logo as favicon when no explicit favicon configured', () => {
    const html = render({ theme: { logo: { src: '/logo.svg' } } })
    expect(html).toContain('<link rel="icon" href="/logo.svg" type="image/svg+xml">')
  })

  it('does NOT use .ico logo as favicon fallback', () => {
    const html = render({ theme: { logo: { src: '/logo.ico' } } })
    expect(html).not.toContain('rel="icon"')
  })

  it('explicit favicon wins over logo fallback', () => {
    const html = render({
      site: { favicon: { src: '/favicon.svg' } },
      theme: { logo: { src: '/logo.png' } }
    })
    expect(html).toContain('href="/favicon.svg"')
    expect(html).not.toContain('href="/logo.png"')
  })
})

describe('favicon — MIME type detection', () => {
  it('detects svg+xml for .svg', () => {
    const html = render({ site: { favicon: { src: '/f.svg' } } })
    expect(html).toContain('type="image/svg+xml"')
  })

  it('detects image/png for .png', () => {
    const html = render({ site: { favicon: { src: '/f.png' } } })
    expect(html).toContain('type="image/png"')
  })

  it('detects image/x-icon for .ico', () => {
    const html = render({ site: { favicon: { src: '/f.ico' } } })
    expect(html).toContain('type="image/x-icon"')
  })

  it('ignores query strings when detecting type', () => {
    const html = render({ site: { favicon: { src: '/f.png?v=2' } } })
    expect(html).toContain('type="image/png"')
  })

  it('defaults to image/x-icon for unknown extension', () => {
    const html = render({ site: { favicon: { src: '/favicon' } } })
    expect(html).toContain('type="image/x-icon"')
  })

  it('detects image/jpeg for .jpg', () => {
    const html = render({ site: { favicon: { src: '/f.jpg' } } })
    expect(html).toContain('type="image/jpeg"')
  })

  it('detects image/jpeg for .jpeg', () => {
    const html = render({ site: { favicon: { src: '/f.jpeg' } } })
    expect(html).toContain('type="image/jpeg"')
  })

  it('detects image/webp for .webp', () => {
    const html = render({ site: { favicon: { src: '/f.webp' } } })
    expect(html).toContain('type="image/webp"')
  })
})

describe('favicon — logo fallback extended formats', () => {
  it('uses .jpg logo as favicon with apple-touch-icon', () => {
    const html = render({ theme: { logo: { src: '/logo.jpg' } } })
    expect(html).toContain('<link rel="icon" href="/logo.jpg" type="image/jpeg">')
    expect(html).toContain('<link rel="apple-touch-icon" href="/logo.jpg">')
  })

  it('uses .jpeg logo as favicon with apple-touch-icon', () => {
    const html = render({ theme: { logo: { src: '/logo.jpeg' } } })
    expect(html).toContain('<link rel="icon" href="/logo.jpeg" type="image/jpeg">')
    expect(html).toContain('<link rel="apple-touch-icon" href="/logo.jpeg">')
  })

  it('uses .webp logo as favicon with apple-touch-icon', () => {
    const html = render({ theme: { logo: { src: '/logo.webp' } } })
    expect(html).toContain('<link rel="icon" href="/logo.webp" type="image/webp">')
    expect(html).toContain('<link rel="apple-touch-icon" href="/logo.webp">')
  })
})
