/**
 * Default theme CSS for mkdnsite.
 *
 * Inspired by @tailwindcss/typography prose styles and GitHub's
 * markdown rendering. Designed to look beautiful out of the box
 * with zero configuration.
 *
 * The .mkdn-prose class applies rich typography styles to all
 * child elements rendered from markdown. The layout classes
 * (.mkdn-layout, .mkdn-nav, .mkdn-main) handle the page chrome.
 *
 * Users can override this entirely via config.theme.customCss.
 * Users on the 'components' theme mode can provide their own
 * Tailwind build with custom component styling.
 */
export const THEME_CSS = `
:root {
  --mkdn-font: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
  --mkdn-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  --mkdn-text: #1f2328;
  --mkdn-text-muted: #656d76;
  --mkdn-bg: #ffffff;
  --mkdn-bg-alt: #f6f8fa;
  --mkdn-border: #d0d7de;
  --mkdn-link: #0969da;
  --mkdn-link-hover: #0550ae;
  --mkdn-code-bg: rgba(175, 184, 193, 0.2);
  --mkdn-pre-bg: #f6f8fa;
  --mkdn-nav-w: 260px;
  --mkdn-content-max: 880px;
  --mkdn-accent: #0969da;
}

@media (prefers-color-scheme: dark) {
  :root {
    --mkdn-text: #e6edf3;
    --mkdn-text-muted: #8d96a0;
    --mkdn-bg: #0d1117;
    --mkdn-bg-alt: #161b22;
    --mkdn-border: #30363d;
    --mkdn-link: #58a6ff;
    --mkdn-link-hover: #79c0ff;
    --mkdn-code-bg: rgba(110, 118, 129, 0.4);
    --mkdn-pre-bg: #161b22;
    --mkdn-accent: #58a6ff;
  }
}

*, *::before, *::after { box-sizing: border-box; }

html { font-size: 16px; -webkit-font-smoothing: antialiased; }

body {
  margin: 0;
  font-family: var(--mkdn-font);
  color: var(--mkdn-text);
  background: var(--mkdn-bg);
  line-height: 1.6;
}

/* ---- Layout ---- */
.mkdn-layout { display: flex; min-height: 100vh; }

.mkdn-nav {
  position: sticky; top: 0;
  width: var(--mkdn-nav-w); height: 100vh;
  overflow-y: auto; flex-shrink: 0;
  border-right: 1px solid var(--mkdn-border);
  background: var(--mkdn-bg-alt);
  padding: 1.5rem 0; font-size: 0.875rem;
}
.mkdn-nav-inner { padding: 0 1rem; }
.mkdn-nav-list, .mkdn-nav-list ul { list-style: none; padding: 0; margin: 0; }
.mkdn-nav-list a {
  display: block; padding: 0.3rem 0.75rem;
  color: var(--mkdn-text-muted); text-decoration: none;
  border-radius: 6px; transition: background 0.15s, color 0.15s;
}
.mkdn-nav-list a:hover { color: var(--mkdn-text); background: var(--mkdn-code-bg); }
.mkdn-nav-list li.active > a,
.mkdn-nav-list a[aria-current="page"] {
  color: var(--mkdn-text); background: var(--mkdn-code-bg); font-weight: 600;
}
.mkdn-nav-section-title {
  display: block; padding: 0.5rem 0.75rem 0.2rem;
  font-weight: 600; font-size: 0.75rem;
  text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--mkdn-text-muted);
}
.mkdn-nav-section > ul { margin-bottom: 0.75rem; }

.mkdn-main {
  flex: 1; min-width: 0;
  max-width: var(--mkdn-content-max);
  margin: 0 auto; padding: 2rem 2.5rem;
}

.mkdn-footer {
  margin-top: 4rem; padding-top: 1.5rem;
  border-top: 1px solid var(--mkdn-border);
  font-size: 0.8rem; color: var(--mkdn-text-muted);
}
.mkdn-footer a { color: var(--mkdn-link); }

/* ---- Prose typography (applied to .mkdn-prose) ---- */
.mkdn-prose h1, .mkdn-prose h2, .mkdn-prose h3,
.mkdn-prose h4, .mkdn-prose h5, .mkdn-prose h6 {
  margin-top: 1.5em; margin-bottom: 0.5em;
  font-weight: 600; line-height: 1.25;
}
.mkdn-prose h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid var(--mkdn-border); }
.mkdn-prose h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid var(--mkdn-border); }
.mkdn-prose h3 { font-size: 1.25em; }
.mkdn-prose h4 { font-size: 1em; }
.mkdn-prose h1:first-child { margin-top: 0; }

.mkdn-prose p { margin: 0 0 1em; }

.mkdn-prose a { color: var(--mkdn-link); text-decoration: none; }
.mkdn-prose a:hover { text-decoration: underline; color: var(--mkdn-link-hover); }

.mkdn-prose a.mkdn-heading-anchor {
  color: var(--mkdn-text-muted); text-decoration: none;
  opacity: 0; margin-left: -1.2em; padding-right: 0.2em;
  font-weight: 400; transition: opacity 0.15s;
  display: inline-flex; align-items: center;
}
.mkdn-prose a.mkdn-heading-anchor:hover { text-decoration: none; color: var(--mkdn-text-muted); }
.mkdn-prose .mkdn-heading-anchor svg { vertical-align: middle; }
.mkdn-prose h1:hover .mkdn-heading-anchor,
.mkdn-prose h2:hover .mkdn-heading-anchor,
.mkdn-prose h3:hover .mkdn-heading-anchor,
.mkdn-prose h4:hover .mkdn-heading-anchor {
  opacity: 1;
}

.mkdn-prose code {
  padding: 0.2em 0.4em; font-size: 85%;
  background: var(--mkdn-code-bg); border-radius: 6px;
  font-family: var(--mkdn-mono);
}
.mkdn-prose pre {
  padding: 1rem; overflow-x: auto;
  font-size: 85%; line-height: 1.45;
  background: var(--mkdn-pre-bg);
  border-radius: 6px; border: 1px solid var(--mkdn-border);
  position: relative;
}
.mkdn-prose pre code {
  padding: 0; background: transparent; border-radius: 0; font-size: inherit;
}

.mkdn-code-block { position: relative; margin-bottom: 1em; }
.mkdn-code-block[data-language]::before {
  content: attr(data-language);
  position: absolute; top: 0.4rem; right: 0.6rem;
  font-size: 0.7rem; color: var(--mkdn-text-muted);
  font-family: var(--mkdn-mono); text-transform: uppercase;
}

.mkdn-prose .mkdn-copy-btn {
  position: absolute; top: 0.4rem; right: 0.4rem;
  padding: 0.25rem 0.5rem; font-size: 0.75rem;
  background: var(--mkdn-bg-alt); border: 1px solid var(--mkdn-border);
  border-radius: 4px; cursor: pointer; color: var(--mkdn-text-muted);
  opacity: 0; transition: opacity 0.15s;
}
.mkdn-code-block:hover .mkdn-copy-btn,
.mkdn-prose pre:hover .mkdn-copy-btn { opacity: 1; }

.mkdn-table-wrapper { overflow-x: auto; margin-bottom: 1em; }
.mkdn-prose table { border-collapse: collapse; width: 100%; }
.mkdn-prose th, .mkdn-prose td {
  padding: 0.5rem 0.75rem; border: 1px solid var(--mkdn-border);
}
.mkdn-prose th { font-weight: 600; background: var(--mkdn-bg-alt); }

.mkdn-prose ul, .mkdn-prose ol { padding-left: 2em; margin-bottom: 1em; }
.mkdn-prose li { margin-bottom: 0.25em; }
.mkdn-prose li > p { margin-bottom: 0.5em; }

.mkdn-prose ul:has(input[type="checkbox"]) { list-style: none; padding-left: 0; }
.mkdn-prose input[type="checkbox"] { margin-right: 0.5em; }

.mkdn-prose blockquote {
  margin: 0 0 1em; padding: 0.5em 1em;
  border-left: 4px solid var(--mkdn-border);
  color: var(--mkdn-text-muted);
}
.mkdn-prose blockquote > p:last-child { margin-bottom: 0; }

.mkdn-prose img { max-width: 100%; height: auto; border-radius: 6px; }

.mkdn-prose hr { border: none; border-top: 1px solid var(--mkdn-border); margin: 2em 0; }

/* Mermaid diagrams */
.mkdn-mermaid { margin: 1em 0; text-align: center; }
.mkdn-mermaid svg { max-width: 100%; }

@media (max-width: 768px) {
  .mkdn-layout { flex-direction: column; }
  .mkdn-nav {
    position: static; width: 100%; height: auto;
    border-right: none; border-bottom: 1px solid var(--mkdn-border);
    padding: 1rem 0;
  }
  .mkdn-main { padding: 1.5rem 1rem; }
}
`.trim()
