import { describe, it, expect } from 'bun:test'
import { buildThemeCss } from '../src/theme/build-css.ts'
import { BASE_THEME_CSS } from '../src/theme/base-css.ts'
import { resolveConfig } from '../src/config/defaults.ts'

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
        border: '#f'
      }
    }))
    expect(css).toContain('--mkdn-accent: #a;')
    expect(css).toContain('--mkdn-text: #b;')
    expect(css).toContain('--mkdn-text-muted: #c;')
    expect(css).toContain('--mkdn-bg: #d;')
    expect(css).toContain('--mkdn-bg-alt: #e;')
    expect(css).toContain('--mkdn-border: #f;')
  })
})
