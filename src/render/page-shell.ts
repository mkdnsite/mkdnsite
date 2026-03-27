import type { MkdnSiteConfig } from '../config/schema.ts'
import type { MarkdownMeta, NavNode } from '../content/types.ts'
import { buildThemeCss } from '../theme/build-css.ts'
import { CLIENT_SCRIPTS } from '../client/scripts.ts'

interface PageShellProps {
  renderedContent: string
  meta: MarkdownMeta
  config: MkdnSiteConfig
  nav?: NavNode
  currentSlug: string
  /** Raw markdown body — used for reading time calculation */
  body?: string
}

/**
 * Render a full HTML page wrapping the markdown content.
 * This is pure SSR — no client-side React hydration required.
 */
export function renderPage (props: PageShellProps): string {
  const { renderedContent, meta, config, nav, currentSlug, body } = props

  const title = meta.title != null
    ? `${meta.title} — ${config.site.title}`
    : config.site.title
  const description = meta.description ?? config.site.description ?? ''
  const lang = config.site.lang ?? 'en'

  const navHtml = (config.theme.showNav && nav != null)
    ? renderNav(nav, currentSlug, config)
    : ''

  const pageTitleHtml = (config.theme.pageTitle === true && meta.title != null)
    ? `<h1 class="mkdn-page-title">${esc(meta.title)}</h1>`
    : ''

  const pageMetaHtml = buildPageMetaHtml(meta, config, body)

  const tocHtml = config.theme.showToc
    ? buildTocHtml(renderedContent)
    : ''

  const prevNextHtml = (config.theme.prevNext === true && nav != null)
    ? buildPrevNextHtml(nav, currentSlug)
    : ''

  const hasToc = tocHtml !== ''

  const clientScripts = config.client.enabled
    ? CLIENT_SCRIPTS(config.client)
    : ''

  const themeToggleEnabled = config.client.enabled && config.client.themeToggle
  const colorScheme = config.theme.colorScheme ?? 'system'

  // Blocking script to set data-theme before paint (prevents FOUC)
  const themeInitScript = colorScheme !== 'system'
    // Fixed color scheme: always use the configured value
    ? `<script>document.documentElement.setAttribute("data-theme","${colorScheme}")</script>`
    : themeToggleEnabled
      // System default + toggle: check localStorage first, then system preference
      ? '<script>(function(){var t=localStorage.getItem("mkdn-theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t)}else{document.documentElement.setAttribute("data-theme",window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light")}})()</script>'
      // System default, no toggle: just respect system preference
      : '<script>(function(){document.documentElement.setAttribute("data-theme",window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light")})()</script>'

  const themeToggleHtml = themeToggleEnabled
    ? `<button class="mkdn-theme-toggle" type="button" aria-label="Toggle theme">
      <svg class="mkdn-icon-sun" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
      <svg class="mkdn-icon-moon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
    </button>`
    : ''

  const searchTriggerHtml = config.client.enabled && config.client.search
    ? `<button class="mkdn-search-trigger" type="button" aria-label="Search" title="Search (⌘K)">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
    </button>`
    : ''

  return `<!DOCTYPE html>
<html lang="${esc(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  ${description !== '' ? `<meta name="description" content="${esc(description)}">` : ''}
  ${buildOgTags(props)}
  <meta name="generator" content="mkdnsite">
  ${buildFaviconTags(config)}
  ${buildAnalyticsTags(config)}
  ${config.client.math ? '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css" crossorigin="anonymous">' : ''}
  <style>${buildThemeCss(config)}</style>
  ${config.theme.customCssUrl != null ? `<link rel="stylesheet" href="${esc(config.theme.customCssUrl)}">` : ''}
  ${themeInitScript}
</head>
<body>
  ${searchTriggerHtml}
  ${themeToggleHtml}
  ${navHtml !== '' ? '<button class=\'mkdn-nav-toggle\' type=\'button\' aria-label=\'Toggle navigation\' aria-expanded=\'false\'><svg xmlns=\'http://www.w3.org/2000/svg\' width=\'18\' height=\'18\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><path d=\'M4 12h16\'/><path d=\'M4 6h16\'/><path d=\'M4 18h16\'/></svg></button><div class=\'mkdn-nav-backdrop\'></div>' : ''}
  <div class="mkdn-layout">
    ${navHtml !== '' ? `<nav class="mkdn-nav" aria-label="Site navigation">${navHtml}</nav>` : ''}
    <main class="mkdn-main">
      ${hasToc ? '<div class="mkdn-content-area">' : ''}
      <article class="mkdn-article mkdn-prose">
        ${pageTitleHtml}
        ${pageMetaHtml}
        ${renderedContent}
      </article>
      ${prevNextHtml}
      ${config.theme.showFooter !== false ? '<footer class="mkdn-footer"><p>Powered by <a href="https://mkdn.site">mkdnsite</a></p></footer>' : ''}
      ${hasToc ? '</div>' : ''}
      ${tocHtml}
    </main>
  </div>
  ${clientScripts}
</body>
</html>`
}

export function render404 (config: MkdnSiteConfig): string {
  return renderPage({
    renderedContent: '<h1>404 — Page Not Found</h1><p>The page you\'re looking for doesn\'t exist.</p><p><a href="/">← Back to home</a></p>',
    meta: { title: 'Not Found' },
    config,
    currentSlug: ''
  })
}

function renderNavHeader (config: MkdnSiteConfig): string {
  const { logo, logoText } = config.theme
  if (logo == null && (logoText == null || logoText === '')) return ''

  const imgHtml = logo != null
    ? `<span class="mkdn-nav-logo"><img src="${esc(logo.src)}" alt="${esc(logo.alt ?? '')}" width="${logo.width ?? 32}" height="${logo.height ?? 32}"></span>`
    : ''
  const textHtml = logoText != null && logoText !== ''
    ? `<span class="mkdn-nav-title">${esc(logoText)}</span>`
    : ''

  return `<a href="/" class="mkdn-nav-header">${imgHtml}${textHtml}</a>`
}

function renderNav (node: NavNode, currentSlug: string, config: MkdnSiteConfig, depth = 0): string {
  if (depth === 0) {
    const header = renderNavHeader(config)
    const items = node.children.map(c => renderNav(c, currentSlug, config, 1)).join('\n')
    return `<div class="mkdn-nav-inner">${header}<ul class="mkdn-nav-list">${items}</ul></div>`
  }

  const isActive = currentSlug === node.slug

  if (node.isSection && node.children.length > 0) {
    const childItems = node.children
      .map(c => renderNav(c, currentSlug, config, depth + 1))
      .join('\n')
    return `<li class="mkdn-nav-section">
      <span class="mkdn-nav-section-title">${esc(node.title)}</span>
      <ul>${childItems}</ul>
    </li>`
  }

  return `<li${isActive ? ' class="active"' : ''}><a href="${node.slug}"${isActive ? ' aria-current="page"' : ''}>${esc(node.title)}</a></li>`
}

function buildPageMetaHtml (meta: MarkdownMeta, config: MkdnSiteConfig, body?: string): string {
  const parts: string[] = []
  const showDate = config.theme.pageDate === true
  const showReading = config.theme.readingTime === true

  if (showDate && meta.date != null) {
    const lang = config.site.lang ?? 'en'
    const formatter = new Intl.DateTimeFormat(lang, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const dateVal = coerceDateToString(meta.date)
    const dateStr = formatter.format(new Date(dateVal))
    let datePart = `<time datetime="${esc(dateVal)}">${esc(dateStr)}</time>`
    if (meta.updated != null) {
      const updatedVal = coerceDateToString(meta.updated)
      const updatedStr = formatter.format(new Date(updatedVal))
      datePart += ` · Updated <time datetime="${esc(updatedVal)}">${esc(updatedStr)}</time>`
    }
    parts.push(datePart)
  }

  if (showReading && body != null) {
    parts.push(buildReadingTimeHtml(body))
  }

  if (parts.length === 0) return ''
  return `<div class="mkdn-page-meta">${parts.join(' · ')}</div>`
}

function buildReadingTimeHtml (body: string): string {
  const trimmed = body.trim()
  const wordCount = trimmed === '' ? 0 : trimmed.split(/\s+/).length
  const minutes = Math.max(1, Math.ceil(wordCount / 238))
  return `<span class="mkdn-reading-time">${minutes} min read</span>`
}

export function buildTocHtml (renderedContent: string): string {
  const headingRegex = /<h([2-4])\s[^>]*?id="([^"]+)"[^>]*>([\s\S]+?)<\/h[2-4]>/g
  const headings: Array<{ level: number, id: string, text: string }> = []

  let match = headingRegex.exec(renderedContent)
  while (match !== null) {
    const text = decodeHtmlEntities(match[3].replace(/<[^>]+>/g, '').trim())
    headings.push({ level: parseInt(match[1], 10), id: match[2], text })
    match = headingRegex.exec(renderedContent)
  }

  if (headings.length === 0) return ''

  const items = headings
    .map(h => `<li class="mkdn-toc-${h.level}"><a href="#${esc(h.id)}">${esc(h.text)}</a></li>`)
    .join('')

  return `<nav class="mkdn-toc" aria-label="Table of contents"><p class="mkdn-toc-title">On this page</p><ul>${items}</ul></nav>`
}

function flattenNav (node: NavNode): Array<{ title: string, slug: string }> {
  const result: Array<{ title: string, slug: string }> = []
  for (const child of node.children) {
    if (child.isSection) {
      result.push(...flattenNav(child))
    } else {
      result.push({ title: child.title, slug: child.slug })
    }
  }
  return result
}

function buildPrevNextHtml (nav: NavNode, currentSlug: string): string {
  const pages = flattenNav(nav)
  const idx = pages.findIndex(p => p.slug === currentSlug)
  if (idx === -1) return ''

  const prev = idx > 0 ? pages[idx - 1] : null
  const next = idx < pages.length - 1 ? pages[idx + 1] : null
  if (prev == null && next == null) return ''

  const prevHtml = prev != null
    ? `<a href="${esc(prev.slug)}" class="mkdn-prev"><span class="mkdn-pn-label">← Previous</span><span class="mkdn-pn-title">${esc(prev.title)}</span></a>`
    : '<span></span>'
  const nextHtml = next != null
    ? `<a href="${esc(next.slug)}" class="mkdn-next"><span class="mkdn-pn-label">Next →</span><span class="mkdn-pn-title">${esc(next.title)}</span></a>`
    : '<span></span>'

  return `<nav class="mkdn-prev-next" aria-label="Page navigation">${prevHtml}${nextHtml}</nav>`
}

function faviconMimeType (src: string): string {
  const lower = src.toLowerCase().split('?')[0]
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.ico')) return 'image/x-icon'
  // Default fallback
  return 'image/x-icon'
}

function buildFaviconTags (config: MkdnSiteConfig): string {
  // Resolve favicon src: explicit favicon config wins, then logo fallback (PNG/SVG only)
  let src: string | undefined
  if (config.site.favicon?.src != null) {
    src = config.site.favicon.src
  } else if (config.theme.logo?.src != null) {
    const lower = config.theme.logo.src.toLowerCase().split('?')[0]
    if (lower.endsWith('.svg') || lower.endsWith('.png')) {
      src = config.theme.logo.src
    }
  }
  if (src == null) return ''

  const safeSrc = esc(src)
  const type = faviconMimeType(src)
  const lines: string[] = []

  lines.push(`<link rel="icon" href="${safeSrc}" type="${type}">`)
  // apple-touch-icon for PNG (requires raster image)
  if (type === 'image/png') {
    lines.push(`<link rel="apple-touch-icon" href="${safeSrc}">`)
  }
  return lines.join('\n  ')
}

function buildAnalyticsTags (config: MkdnSiteConfig): string {
  const id = config.analytics?.googleAnalytics?.measurementId
  if (id == null || id === '') return ''
  // GA4 measurement IDs are always G- followed by alphanumerics
  if (!/^G-[A-Z0-9]+$/i.test(id)) return ''
  // Belt-and-suspenders: escape for both HTML and JS string context
  const safeId = esc(id).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/<\//g, '<\\/')
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${safeId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${safeId}');
  </script>`
}

function buildOgTags (props: PageShellProps): string {
  const { meta, config, currentSlug } = props
  const tags: string[] = []

  const ogTitle = meta.title ?? config.site.title
  const ogDescription = meta.description ?? config.site.description ?? ''
  const ogType = (meta as Record<string, unknown>).og_type as string ??
    config.site.og?.type ??
    (currentSlug === '/' || currentSlug === '' ? 'website' : 'article')
  const ogImage = (meta as Record<string, unknown>).og_image as string ??
    config.site.og?.image
  const twitterCard = config.site.og?.twitterCard ?? 'summary'
  const twitterSite = config.site.og?.twitterSite

  tags.push(`<meta property="og:title" content="${esc(ogTitle)}">`)
  if (ogDescription !== '') {
    tags.push(`<meta property="og:description" content="${esc(ogDescription)}">`)
  }
  tags.push(`<meta property="og:type" content="${esc(ogType)}">`)
  if (config.site.url != null && config.site.url !== '') {
    const baseUrl = config.site.url.replace(/\/$/, '')
    const slug = currentSlug === '' || currentSlug === '/' ? '' : currentSlug
    tags.push(`<meta property="og:url" content="${esc(baseUrl + slug)}">`)
  }
  tags.push(`<meta property="og:site_name" content="${esc(config.site.title)}">`)
  if (ogImage != null && ogImage !== '') {
    tags.push(`<meta property="og:image" content="${esc(ogImage)}">`)
  }
  tags.push(`<meta name="twitter:card" content="${esc(twitterCard)}">`)
  tags.push(`<meta name="twitter:title" content="${esc(ogTitle)}">`)
  if (ogDescription !== '') {
    tags.push(`<meta name="twitter:description" content="${esc(ogDescription)}">`)
  }
  if (ogImage != null && ogImage !== '') {
    tags.push(`<meta name="twitter:image" content="${esc(ogImage)}">`)
  }
  if (twitterSite != null && twitterSite !== '') {
    tags.push(`<meta name="twitter:site" content="${esc(twitterSite)}">`)
  }

  return tags.join('\n  ')
}

/**
 * Coerce a date value to an ISO date string.
 * YAML parsers often produce Date objects instead of strings for bare dates.
 */
function coerceDateToString (val: unknown): string {
  if (val instanceof Date) return val.toISOString().split('T')[0]
  return String(val)
}

function esc (str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Decode HTML entities in a string that has already been through renderToString().
 * Used before re-escaping with esc() to prevent double-escaping.
 */
function decodeHtmlEntities (str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
}
