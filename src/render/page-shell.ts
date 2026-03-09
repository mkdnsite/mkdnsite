import type { MkdnSiteConfig } from '../config/schema.ts'
import type { MarkdownMeta, NavNode } from '../content/types.ts'
import { THEME_CSS } from '../theme/prose-css.ts'
import { CLIENT_SCRIPTS } from '../client/scripts.ts'

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

  return `<!DOCTYPE html>
<html lang="${esc(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  ${description !== '' ? `<meta name="description" content="${esc(description)}">` : ''}
  <meta name="generator" content="mkdnsite">
  ${config.client.math ? '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css" crossorigin="anonymous">' : ''}
  <style>${THEME_CSS}</style>
  ${themeInitScript}
</head>
<body>
  ${themeToggleHtml}
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
