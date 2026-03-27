import { describe, it, expect } from 'bun:test'
import { buildThemeCss } from '../src/theme/build-css.ts'
import { BASE_THEME_CSS } from '../src/theme/base-css.ts'
import { resolveConfig } from '../src/config/defaults.ts'
import { renderPage } from '../src/render/page-shell.ts'

function makeConfig (theme: object): ReturnType<typeof resolveConfig> {
  return resolveConfig({ theme: theme as never })
}

describe('buildThemeCss', () => {
  it('includes base theme CSS by default', () => {
    const css = buildThemeCss(makeConfig({}))
    expect(css).toContain(BASE_THEME_CSS)
  })

  it('skips base CSS when builtinCss is false', () => {
    const css = buildThemeCss(makeConfig({ builtinCss: false }))
    expect(css).not.toContain('--mkdn-font:')
    expect(css).not.toContain('.mkdn-prose')
  })

  it('injects light mode color overrides into :root', () => {
    const css = buildThemeCss(makeConfig({
      colors: { accent: '#ff0000', text: '#111111' }
    }))
    expect(css).toContain(':root {')
    expect(css).toContain('--mkdn-accent: #ff0000;')
    expect(css).toContain('--mkdn-text: #111111;')
  })

  it('injects dark mode overrides using [data-theme="dark"] selector', () => {
    const css = buildThemeCss(makeConfig({
      colorsDark: { accent: '#00ff00', bg: '#0a0a0a' }
    }))
    expect(css).toContain('[data-theme="dark"] {')
    expect(css).toContain('--mkdn-accent: #00ff00;')
    expect(css).toContain('--mkdn-bg: #0a0a0a;')
  })

  it('injects dark mode no-JS fallback using :root:not([data-theme])', () => {
    const css = buildThemeCss(makeConfig({
      colorsDark: { accent: '#00ff00' }
    }))
    expect(css).toContain('@media (prefers-color-scheme: dark)')
    expect(css).toContain(':root:not([data-theme])')
    // Both selectors should contain the same token value
    const darkCount = (css.match(/--mkdn-accent: #00ff00;/g) ?? []).length
    expect(darkCount).toBe(2)
  })

  it('does NOT use @media prefers-color-scheme for primary dark overrides', () => {
    const css = buildThemeCss(makeConfig({
      colorsDark: { accent: '#purple' }
    }))
    // Primary dark selector must not be inside @media
    const dataThemeIdx = css.indexOf('[data-theme="dark"]')
    const mediaIdx = css.indexOf('@media (prefers-color-scheme: dark)')
    // [data-theme="dark"] block should appear before the @media block
    expect(dataThemeIdx).toBeGreaterThanOrEqual(0)
    expect(mediaIdx).toBeGreaterThanOrEqual(0)
    expect(dataThemeIdx).toBeLessThan(mediaIdx)
  })

  it('injects font overrides into :root', () => {
    const css = buildThemeCss(makeConfig({
      fonts: {
        body: '"Inter", sans-serif',
        mono: '"Fira Code", monospace',
        heading: '"Playfair Display", serif'
      }
    }))
    expect(css).toContain('--mkdn-font: "Inter", sans-serif;')
    expect(css).toContain('--mkdn-mono: "Fira Code", monospace;')
    expect(css).toContain('--mkdn-font-heading: "Playfair Display", serif;')
  })

  it('appends customCss after built-in styles', () => {
    const customCss = '.my-custom { color: hotpink; }'
    const css = buildThemeCss(makeConfig({ customCss }))
    // customCss should appear after the base theme
    const baseIdx = css.indexOf('--mkdn-font:')
    const customIdx = css.indexOf('.my-custom')
    expect(customIdx).toBeGreaterThan(baseIdx)
  })

  it('includes customCss even when builtinCss is false', () => {
    const customCss = '.bare { color: red; }'
    const css = buildThemeCss(makeConfig({ builtinCss: false, customCss }))
    expect(css).toContain('.bare { color: red; }')
    expect(css).not.toContain('--mkdn-font:')
  })

  it('returns empty string when builtinCss is false and no overrides', () => {
    const css = buildThemeCss(makeConfig({ builtinCss: false }))
    expect(css.trim()).toBe('')
  })

  it('handles all ColorTokens fields', () => {
    const css = buildThemeCss(makeConfig({
      colors: {
        accent: '#a',
        text: '#b',
        textMuted: '#c',
        bg: '#d',
        bgAlt: '#e',
        border: '#f',
        link: '#1a1a1a',
        linkHover: '#2b2b2b',
        codeBg: 'rgba(0,0,0,0.1)',
        preBg: '#fafafa'
      }
    }))
    expect(css).toContain('--mkdn-accent: #a;')
    expect(css).toContain('--mkdn-text: #b;')
    expect(css).toContain('--mkdn-text-muted: #c;')
    expect(css).toContain('--mkdn-bg: #d;')
    expect(css).toContain('--mkdn-bg-alt: #e;')
    expect(css).toContain('--mkdn-border: #f;')
    expect(css).toContain('--mkdn-link: #1a1a1a;')
    expect(css).toContain('--mkdn-link-hover: #2b2b2b;')
    expect(css).toContain('--mkdn-code-bg: rgba(0,0,0,0.1);')
    expect(css).toContain('--mkdn-pre-bg: #fafafa;')
  })
})

describe('renderPage', () => {
  const baseConfig = resolveConfig({})
  const baseMeta = { title: 'Test Page' }
  const rootNav = { title: 'root', slug: '/', order: 0, children: [], isSection: false }

  it('renders logo and logoText in nav header', () => {
    const config = makeConfig({
      logo: { src: '/static/logo.png', alt: 'My Site', width: 40, height: 40 },
      logoText: 'My Site'
    })
    const html = renderPage({ renderedContent: '<p>hello</p>', meta: baseMeta, config, nav: rootNav, currentSlug: '/' })
    expect(html).toContain('class="mkdn-nav-header"')
    expect(html).toContain('<img src="/static/logo.png"')
    expect(html).toContain('alt="My Site"')
    expect(html).toContain('width="40"')
    expect(html).toContain('height="40"')
    expect(html).toContain('<span class="mkdn-nav-title">My Site</span>')
  })

  it('escapes logo src and logoText in nav header', () => {
    const config = makeConfig({
      logo: { src: '/img?a=1&b=2', alt: '<Logo>' },
      logoText: '<script>alert(1)</script>'
    })
    const html = renderPage({ renderedContent: '', meta: baseMeta, config, nav: rootNav, currentSlug: '/' })
    expect(html).toContain('src="/img?a=1&amp;b=2"')
    expect(html).toContain('alt="&lt;Logo&gt;"')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('renders site title as home link when no logo or logoText configured', () => {
    const config = resolveConfig({ site: { title: 'My Docs' } })
    const html = renderPage({ renderedContent: '', meta: baseMeta, config, nav: rootNav, currentSlug: '/' })
    expect(html).toContain('class="mkdn-nav-header"')
    expect(html).toContain('href="/"')
    expect(html).toContain('<span class="mkdn-nav-title">My Docs</span>')
  })

  it('renders "Home" as home link when no logo, logoText, or site title configured', () => {
    const config = resolveConfig({ site: { title: '' } })
    const html = renderPage({ renderedContent: '', meta: baseMeta, config, nav: rootNav, currentSlug: '/' })
    expect(html).toContain('class="mkdn-nav-header"')
    expect(html).toContain('href="/"')
    expect(html).toContain('<span class="mkdn-nav-title">Home</span>')
  })

  it('renders logo-only nav header without extra text when logo set but no logoText', () => {
    const config = makeConfig({ logo: { src: '/logo.png', alt: 'Logo' } })
    const html = renderPage({ renderedContent: '', meta: baseMeta, config, nav: rootNav, currentSlug: '/' })
    expect(html).toContain('class="mkdn-nav-header"')
    expect(html).toContain('href="/"')
    expect(html).toContain('<img src="/logo.png"')
    // No extra fallback text — image alone is the home link
    expect(html).not.toContain('<span class="mkdn-nav-title">')
  })

  it('emits customCssUrl as a <link rel="stylesheet"> tag', () => {
    const config = makeConfig({ customCssUrl: 'https://example.com/theme.css' })
    const html = renderPage({ renderedContent: '', meta: baseMeta, config, currentSlug: '/' })
    expect(html).toContain('<link rel="stylesheet" href="https://example.com/theme.css">')
  })

  it('escapes customCssUrl in the link tag', () => {
    const config = makeConfig({ customCssUrl: 'https://example.com/theme.css?a=1&b=2' })
    const html = renderPage({ renderedContent: '', meta: baseMeta, config, currentSlug: '/' })
    expect(html).toContain('href="https://example.com/theme.css?a=1&amp;b=2"')
  })

  it('omits customCssUrl link when not configured', () => {
    const html = renderPage({ renderedContent: '', meta: baseMeta, config: baseConfig, currentSlug: '/' })
    expect(html).not.toContain('customCssUrl')
  })
})
