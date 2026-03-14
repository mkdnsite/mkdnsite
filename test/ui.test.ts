import { describe, it, expect } from 'bun:test'
import { renderPage } from '../src/render/page-shell.ts'
import { resolveConfig } from '../src/config/defaults.ts'
import { BASE_THEME_CSS } from '../src/theme/base-css.ts'
import type { NavNode } from '../src/content/types.ts'

const rootNav: NavNode = {
  title: 'root',
  slug: '/',
  order: 0,
  isSection: true,
  children: [
    { title: 'Getting Started', slug: '/docs/getting-started', order: 1, isSection: false, children: [] },
    { title: 'Configuration', slug: '/docs/configuration', order: 2, isSection: false, children: [] },
    { title: 'CLI Reference', slug: '/docs/cli', order: 3, isSection: false, children: [] }
  ]
}

function makePage (opts: {
  meta?: Record<string, unknown>
  theme?: Record<string, unknown>
  nav?: NavNode
  slug?: string
  body?: string
}): string {
  const config = resolveConfig({ theme: opts.theme as never })
  return renderPage({
    renderedContent: '<h2 id="intro">Intro</h2><p>Hello</p>',
    meta: (opts.meta ?? { title: 'Test Page' }) as never,
    config,
    nav: opts.nav,
    currentSlug: opts.slug ?? '/docs/configuration',
    body: opts.body ?? 'Hello world'
  })
}

// ---- Page Title ----
describe('pageTitle', () => {
  it('renders h1.mkdn-page-title when enabled and frontmatter has title', () => {
    const html = makePage({ theme: { pageTitle: true }, meta: { title: 'My Title' } })
    expect(html).toContain('<h1 class="mkdn-page-title">My Title</h1>')
  })

  it('omits page title when enabled but no frontmatter title', () => {
    const html = makePage({ theme: { pageTitle: true }, meta: {} })
    expect(html).not.toContain('<h1 class="mkdn-page-title"')
  })

  it('omits page title when disabled', () => {
    const html = makePage({ theme: { pageTitle: false }, meta: { title: 'My Title' } })
    expect(html).not.toContain('<h1 class="mkdn-page-title"')
  })

  it('escapes special characters in page title', () => {
    const html = makePage({ theme: { pageTitle: true }, meta: { title: '<script>alert(1)</script>' } })
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>alert(1)</script>')
  })
})

// ---- Page Date ----
describe('pageDate', () => {
  it('renders date when enabled and frontmatter has date', () => {
    const html = makePage({
      theme: { pageDate: true },
      meta: { title: 'T', date: '2024-03-01' }
    })
    expect(html).toContain('class="mkdn-page-meta"')
    expect(html).toContain('datetime="2024-03-01"')
    expect(html).toContain('March')
  })

  it('renders date and updated when both present', () => {
    const html = makePage({
      theme: { pageDate: true },
      meta: { title: 'T', date: '2024-01-01', updated: '2024-06-15' }
    })
    expect(html).toContain('datetime="2024-01-01"')
    expect(html).toContain('datetime="2024-06-15"')
    expect(html).toContain('Updated')
  })

  it('omits date when enabled but no date in frontmatter', () => {
    const html = makePage({ theme: { pageDate: true, readingTime: false }, meta: { title: 'T' } })
    expect(html).not.toContain('class="mkdn-page-meta"')
    expect(html).not.toContain('datetime=')
  })

  it('omits date when disabled', () => {
    const html = makePage({ theme: { pageDate: false, readingTime: false }, meta: { title: 'T', date: '2024-01-01' } })
    expect(html).not.toContain('class="mkdn-page-meta"')
    expect(html).not.toContain('datetime=')
  })
})

// ---- Reading Time ----
describe('readingTime', () => {
  it('renders reading time when enabled', () => {
    const html = makePage({ theme: { readingTime: true }, body: 'word '.repeat(238) })
    expect(html).toContain('min read')
    expect(html).toContain('mkdn-reading-time')
  })

  it('calculates 1 min for 238 words', () => {
    const html = makePage({ theme: { readingTime: true }, body: 'word '.repeat(238) })
    expect(html).toContain('1 min read')
  })

  it('calculates 3 min for 476 words (ceil)', () => {
    const html = makePage({ theme: { readingTime: true }, body: 'word '.repeat(477) })
    expect(html).toContain('3 min read')
  })

  it('shows minimum 1 min for very short content', () => {
    const html = makePage({ theme: { readingTime: true }, body: 'Hello' })
    expect(html).toContain('1 min read')
  })

  it('omits reading time when disabled', () => {
    const html = makePage({ theme: { readingTime: false }, body: 'word '.repeat(500) })
    expect(html).not.toContain('min read')
  })

  it('combines reading time with date when both enabled', () => {
    const html = makePage({
      theme: { pageDate: true, readingTime: true },
      meta: { title: 'T', date: '2024-03-01' },
      body: 'word '.repeat(238)
    })
    expect(html).toContain('mkdn-page-meta')
    expect(html).toContain('datetime="2024-03-01"')
    expect(html).toContain('min read')
  })

  it('shows only reading time when pageDate disabled but readingTime enabled', () => {
    const html = makePage({
      theme: { pageDate: false, readingTime: true },
      meta: { title: 'T', date: '2024-03-01' },
      body: 'word '.repeat(238)
    })
    expect(html).toContain('min read')
    expect(html).not.toContain('datetime=')
  })
})

// ---- Prev/Next ----
describe('prevNext', () => {
  it('renders both prev and next when page has neighbors', () => {
    const html = makePage({
      theme: { prevNext: true },
      nav: rootNav,
      slug: '/docs/configuration'
    })
    expect(html).toContain('class="mkdn-prev-next"')
    expect(html).toContain('mkdn-prev')
    expect(html).toContain('mkdn-next')
    expect(html).toContain('Getting Started')
    expect(html).toContain('CLI Reference')
  })

  it('renders only next when on first page', () => {
    const html = makePage({
      theme: { prevNext: true },
      nav: rootNav,
      slug: '/docs/getting-started'
    })
    expect(html).toContain('mkdn-next')
    expect(html).not.toContain('mkdn-prev"')
    expect(html).toContain('Configuration')
  })

  it('renders only prev when on last page', () => {
    const html = makePage({
      theme: { prevNext: true },
      nav: rootNav,
      slug: '/docs/cli'
    })
    expect(html).toContain('mkdn-prev')
    expect(html).not.toContain('mkdn-next"')
    expect(html).toContain('Configuration')
  })

  it('omits when disabled', () => {
    const html = makePage({ theme: { prevNext: false }, nav: rootNav, slug: '/docs/configuration' })
    expect(html).not.toContain('class="mkdn-prev-next"')
  })

  it('omits when nav is not provided', () => {
    const html = makePage({ theme: { prevNext: true }, nav: undefined, slug: '/docs/configuration' })
    expect(html).not.toContain('class="mkdn-prev-next"')
  })

  it('omits when page is not found in nav', () => {
    const html = makePage({ theme: { prevNext: true }, nav: rootNav, slug: '/unknown' })
    expect(html).not.toContain('class="mkdn-prev-next"')
  })
})

// ---- TOC ----
describe('TOC', () => {
  it('extracts h2-h4 headings from rendered content', () => {
    const tocOn = { showToc: true }
    const config = resolveConfig({ theme: tocOn as never })
    const pageMeta = { title: 'T' }
    const html2 = renderPage({
      renderedContent: '<h2 id="intro">Introduction</h2><h3 id="setup">Setup</h3><h4 id="step1">Step 1</h4>',
      meta: pageMeta as never,
      config,
      currentSlug: '/'
    })
    expect(html2).toContain('class="mkdn-toc"')
    expect(html2).toContain('href="#intro"')
    expect(html2).toContain('href="#setup"')
    expect(html2).toContain('href="#step1"')
    expect(html2).toContain('Introduction')
    expect(html2).toContain('class="mkdn-toc-3"')
    expect(html2).toContain('class="mkdn-toc-4"')
  })

  it('omits TOC when no headings present', () => {
    const tocOn = { showToc: true }
    const config = resolveConfig({ theme: tocOn as never })
    const m = { title: 'T' }
    const html = renderPage({ renderedContent: '<p>No headings here.</p>', meta: m as never, config, currentSlug: '/' })
    expect(html).not.toContain('class="mkdn-toc"')
  })

  it('omits TOC when disabled', () => {
    const tocOff = { showToc: false }
    const config = resolveConfig({ theme: tocOff as never })
    const m = { title: 'T' }
    const html = renderPage({ renderedContent: '<h2 id="intro">Introduction</h2>', meta: m as never, config, currentSlug: '/' })
    expect(html).not.toContain('class="mkdn-toc"')
  })

  it('strips HTML tags from heading text in TOC', () => {
    const tocOn = { showToc: true }
    const config = resolveConfig({ theme: tocOn as never })
    const m = { title: 'T' }
    const html = renderPage({
      renderedContent: '<h2 id="intro"><a class="anchor" href="#intro">#</a> Introduction</h2>',
      meta: m as never,
      config,
      currentSlug: '/'
    })
    expect(html).toContain('href="#intro"')
    expect(html).toContain('> Introduction<')
  })

  it('adds mkdn-content-area wrapper when TOC is present', () => {
    const tocOn = { showToc: true }
    const config = resolveConfig({ theme: tocOn as never })
    const m = { title: 'T' }
    const html = renderPage({ renderedContent: '<h2 id="x">Section</h2>', meta: m as never, config, currentSlug: '/' })
    expect(html).toContain('class="mkdn-content-area"')
  })
})

// ---- Preset ----
describe('preset system', () => {
  it('blog preset enables pageTitle, pageDate, prevNext, readingTime', () => {
    const config = resolveConfig({ preset: 'blog' })
    expect(config.theme.pageTitle).toBe(true)
    expect(config.theme.pageDate).toBe(true)
    expect(config.theme.prevNext).toBe(true)
    expect(config.theme.readingTime).toBe(true)
    expect(config.theme.showNav).toBe(false)
    expect(config.theme.showToc).toBe(false)
  })

  it('docs preset enables prevNext; keeps nav and TOC on; disables blog features', () => {
    const config = resolveConfig({ preset: 'docs' })
    expect(config.theme.prevNext).toBe(true)
    expect(config.theme.showNav).toBe(true)
    expect(config.theme.showToc).toBe(true)
    expect(config.theme.pageTitle).toBe(false)
    expect(config.theme.pageDate).toBe(false)
    expect(config.theme.readingTime).toBe(false)
  })

  it('user config overrides preset defaults', () => {
    const themeOverride = { showNav: true, readingTime: false }
    const config = resolveConfig({ preset: 'blog', theme: themeOverride as never })
    expect(config.theme.showNav).toBe(true)
    expect(config.theme.readingTime).toBe(false)
    // Other blog defaults still apply
    expect(config.theme.pageTitle).toBe(true)
    expect(config.theme.pageDate).toBe(true)
  })

  it('no preset uses base defaults (prevNext false, nav true, toc true)', () => {
    const config = resolveConfig({})
    expect(config.theme.prevNext).toBe(false)
    expect(config.theme.showNav).toBe(true)
    expect(config.theme.showToc).toBe(true)
    expect(config.theme.pageTitle).toBe(false)
    expect(config.theme.pageDate).toBe(false)
    expect(config.theme.readingTime).toBe(false)
  })
})

// ---- Sticky table headers CSS ----
describe('sticky table headers', () => {
  it('BASE_THEME_CSS includes sticky thead styles', () => {
    expect(BASE_THEME_CSS).toContain('position: sticky')
    expect(BASE_THEME_CSS).toContain('.mkdn-prose thead')
    expect(BASE_THEME_CSS).toContain('z-index: 1')
  })
})
