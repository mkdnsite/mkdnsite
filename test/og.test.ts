import { describe, it, expect } from 'bun:test'
import { renderPage } from '../src/render/page-shell.ts'
import { resolveConfig } from '../src/config/defaults.ts'

function makePage (opts: {
  meta?: Record<string, unknown>
  site?: Record<string, unknown>
  slug?: string
}): string {
  const config = resolveConfig({ site: opts.site as never ?? {} })
  return renderPage({
    renderedContent: '<p>test</p>',
    meta: (opts.meta ?? { title: 'Test' }) as never,
    config,
    currentSlug: opts.slug ?? '/'
  })
}

describe('OpenGraph meta tags', () => {
  it('renders og:title and twitter:title from frontmatter', () => {
    const html = makePage({ meta: { title: 'My Page', description: 'My desc' } })
    expect(html).toContain('property="og:title" content="My Page"')
    expect(html).toContain('name="twitter:title" content="My Page"')
  })

  it('renders og:description and twitter:description from frontmatter', () => {
    const html = makePage({ meta: { title: 'T', description: 'A great page' } })
    expect(html).toContain('property="og:description" content="A great page"')
    expect(html).toContain('name="twitter:description" content="A great page"')
  })

  it('falls back to site title when page has no title', () => {
    const html = makePage({ meta: {}, site: { title: 'My Site' } })
    expect(html).toContain('property="og:title" content="My Site"')
    expect(html).toContain('name="twitter:title" content="My Site"')
  })

  it('renders og:url with site.url and slug', () => {
    const html = makePage({
      meta: { title: 'T' },
      site: { title: 'S', url: 'https://example.com' },
      slug: '/docs/getting-started'
    })
    expect(html).toContain('property="og:url" content="https://example.com/docs/getting-started"')
  })

  it('renders og:url for root slug (no trailing slash duplication)', () => {
    const html = makePage({
      meta: { title: 'T' },
      site: { title: 'S', url: 'https://example.com' },
      slug: '/'
    })
    expect(html).toContain('property="og:url" content="https://example.com"')
  })

  it('omits og:url when site.url is not configured', () => {
    const html = makePage({ meta: { title: 'T' }, site: { title: 'S' } })
    expect(html).not.toContain('og:url')
  })

  it('renders og:image from site config', () => {
    const html = makePage({
      meta: { title: 'T' },
      site: { title: 'S', og: { image: 'https://example.com/og.png' } }
    })
    expect(html).toContain('property="og:image" content="https://example.com/og.png"')
    expect(html).toContain('name="twitter:image" content="https://example.com/og.png"')
  })

  it('frontmatter og_image overrides site config image', () => {
    const html = makePage({
      meta: { title: 'T', og_image: 'https://example.com/page.png' },
      site: { title: 'S', og: { image: 'https://example.com/default.png' } }
    })
    expect(html).toContain('property="og:image" content="https://example.com/page.png"')
    expect(html).not.toContain('default.png')
  })

  it('defaults og:type to website for root slug', () => {
    const html = makePage({ meta: { title: 'T' }, slug: '/' })
    expect(html).toContain('property="og:type" content="website"')
  })

  it('defaults og:type to article for non-root pages', () => {
    const html = makePage({ meta: { title: 'T' }, slug: '/docs/intro' })
    expect(html).toContain('property="og:type" content="article"')
  })

  it('frontmatter og_type overrides default', () => {
    const html = makePage({
      meta: { title: 'T', og_type: 'product' },
      slug: '/'
    })
    expect(html).toContain('property="og:type" content="product"')
  })

  it('renders twitter:site when configured', () => {
    const html = makePage({
      meta: { title: 'T' },
      site: { title: 'S', og: { twitterSite: '@mkdnsite' } }
    })
    expect(html).toContain('name="twitter:site" content="@mkdnsite"')
  })

  it('omits og:image and twitter:image when not configured', () => {
    const html = makePage({ meta: { title: 'T' } })
    expect(html).not.toContain('og:image')
    expect(html).not.toContain('twitter:image')
  })

  it('omits twitter:site when not configured', () => {
    const html = makePage({ meta: { title: 'T' } })
    expect(html).not.toContain('twitter:site')
  })

  it('renders twitter:card defaulting to summary', () => {
    const html = makePage({ meta: { title: 'T' } })
    expect(html).toContain('name="twitter:card" content="summary"')
  })

  it('renders twitter:card as summary_large_image when configured', () => {
    const html = makePage({
      meta: { title: 'T' },
      site: { title: 'S', og: { twitterCard: 'summary_large_image' } }
    })
    expect(html).toContain('name="twitter:card" content="summary_large_image"')
  })

  it('escapes special characters in OG content', () => {
    const html = makePage({
      meta: { title: '<script>alert(1)</script>', description: 'A & B "quoted"' }
    })
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('A &amp; B &quot;quoted&quot;')
    expect(html).not.toContain('<script>alert(1)</script>')
  })

  it('renders og:site_name from site title', () => {
    const html = makePage({
      meta: { title: 'T' },
      site: { title: 'My Awesome Docs' }
    })
    expect(html).toContain('property="og:site_name" content="My Awesome Docs"')
  })

  it('omits og:description and twitter:description when page has no description', () => {
    const html = makePage({ meta: { title: 'T' }, site: { title: 'S' } })
    expect(html).not.toContain('og:description')
    expect(html).not.toContain('twitter:description')
  })
})
