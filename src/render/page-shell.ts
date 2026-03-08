import type { MkdnSiteConfig } from '../config/schema'
import type { MarkdownMeta, NavNode } from '../content/types'
import { THEME_CSS } from '../theme/prose-css'
import { CLIENT_SCRIPTS } from '../client/scripts'

interface PageShellProps {
  renderedContent: string
  meta: MarkdownMeta
  config: MkdnSiteConfig
  nav?: NavNode
  currentSlug: string
}

/**
 * Render a full HTML page wrapping the markdown content.
 * This is pure SSR — no client-side React hydration required.
 */
export function renderPage (props: PageShellProps): string {
  const { renderedContent, meta, config, nav, currentSlug } = props

  const title = meta.title != null
    ? `${meta.title} — ${config.site.title}`
    : config.site.title
  const description = meta.description ?? config.site.description ?? ''
  const lang = config.site.lang ?? 'en'

  const navHtml = (config.theme.showNav && nav != null)
    ? renderNav(nav, currentSlug)
    : ''

  const clientScripts = config.client.enabled
    ? CLIENT_SCRIPTS(config.client)
    : ''

  return `<!DOCTYPE html>
<html lang="${esc(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  ${description !== '' ? `<meta name="description" content="${esc(description)}">` : ''}
  <meta name="generator" content="mkdnsite">
  <style>${THEME_CSS}</style>
</head>
<body>
  <div class="mkdn-layout">
    ${navHtml !== '' ? `<nav class="mkdn-nav" aria-label="Site navigation">${navHtml}</nav>` : ''}
    <main class="mkdn-main">
      <article class="mkdn-article mkdn-prose">
        ${renderedContent}
      </article>
      <footer class="mkdn-footer">
        <p>Powered by <a href="https://mkdn.site">mkdnsite</a></p>
      </footer>
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

function renderNav (node: NavNode, currentSlug: string, depth = 0): string {
  if (depth === 0) {
    const items = node.children.map(c => renderNav(c, currentSlug, 1)).join('\n')
    return `<div class="mkdn-nav-inner"><ul class="mkdn-nav-list">${items}</ul></div>`
  }

  const isActive = currentSlug === node.slug

  if (node.isSection && node.children.length > 0) {
    const childItems = node.children
      .map(c => renderNav(c, currentSlug, depth + 1))
      .join('\n')
    return `<li class="mkdn-nav-section">
      <span class="mkdn-nav-section-title">${esc(node.title)}</span>
      <ul>${childItems}</ul>
    </li>`
  }

  return `<li${isActive ? ' class="active"' : ''}><a href="${node.slug}"${isActive ? ' aria-current="page"' : ''}>${esc(node.title)}</a></li>`
}

function esc (str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
