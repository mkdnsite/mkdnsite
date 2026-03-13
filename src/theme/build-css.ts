import type { MkdnSiteConfig, ColorTokens, FontTokens } from '../config/schema.ts'
import { BASE_THEME_CSS } from './base-css.ts'

/**
 * Build the full CSS string for a page, combining the base theme with
 * any user-defined color, font, and custom CSS overrides from config.
 */
export function buildThemeCss (config: MkdnSiteConfig): string {
  const { theme } = config
  const parts: string[] = []

  // Base built-in styles
  if (theme.builtinCss !== false) {
    parts.push(BASE_THEME_CSS)
  }

  // Light mode color token overrides
  if (theme.colors != null) {
    const tokens = renderColorTokens(theme.colors)
    if (tokens !== '') {
      parts.push(`:root {\n${tokens}\n}`)
    }
  }

  // Dark mode color token overrides.
  // Uses [data-theme="dark"] as the primary selector and
  // @media (prefers-color-scheme: dark) with :root:not([data-theme]) as no-JS fallback.
  if (theme.colorsDark != null) {
    const tokens = renderColorTokens(theme.colorsDark)
    if (tokens !== '') {
      const indented = tokens.split('\n').map(l => `  ${l}`).join('\n')
      parts.push(`[data-theme="dark"] {\n${tokens}\n}`)
      parts.push(`@media (prefers-color-scheme: dark) {\n  :root:not([data-theme]) {\n${indented}\n  }\n}`)
    }
  }

  // Font token overrides
  if (theme.fonts != null) {
    const tokens = renderFontTokens(theme.fonts)
    if (tokens !== '') {
      parts.push(`:root {\n${tokens}\n}`)
    }
  }

  // Inline custom CSS appended last (highest specificity wins)
  if (theme.customCss != null && theme.customCss.trim() !== '') {
    parts.push(theme.customCss.trim())
  }

  return parts.join('\n\n')
}

function renderColorTokens (colors: ColorTokens): string {
  const lines: string[] = []
  if (colors.accent != null) lines.push(`  --mkdn-accent: ${colors.accent};`)
  if (colors.text != null) lines.push(`  --mkdn-text: ${colors.text};`)
  if (colors.textMuted != null) lines.push(`  --mkdn-text-muted: ${colors.textMuted};`)
  if (colors.bg != null) lines.push(`  --mkdn-bg: ${colors.bg};`)
  if (colors.bgAlt != null) lines.push(`  --mkdn-bg-alt: ${colors.bgAlt};`)
  if (colors.border != null) lines.push(`  --mkdn-border: ${colors.border};`)
  if (colors.link != null) lines.push(`  --mkdn-link: ${colors.link};`)
  if (colors.linkHover != null) lines.push(`  --mkdn-link-hover: ${colors.linkHover};`)
  if (colors.codeBg != null) lines.push(`  --mkdn-code-bg: ${colors.codeBg};`)
  if (colors.preBg != null) lines.push(`  --mkdn-pre-bg: ${colors.preBg};`)
  return lines.join('\n')
}

function renderFontTokens (fonts: FontTokens): string {
  const lines: string[] = []
  if (fonts.body != null) lines.push(`  --mkdn-font: ${fonts.body};`)
  if (fonts.mono != null) lines.push(`  --mkdn-mono: ${fonts.mono};`)
  if (fonts.heading != null) lines.push(`  --mkdn-font-heading: ${fonts.heading};`)
  return lines.join('\n')
}
