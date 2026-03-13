/**
 * Base theme CSS for mkdnsite.
 *
 * Inspired by @tailwindcss/typography prose styles and GitHub's
 * markdown rendering. Designed to look beautiful out of the box
 * with zero configuration.
 *
 * The .mkdn-prose class applies rich typography styles to all
 * child elements rendered from markdown. The layout classes
 * (.mkdn-layout, .mkdn-nav, .mkdn-main) handle the page chrome.
 *
 * Users can extend this via config.theme.colors/fonts/customCss or
 * replace it entirely via config.theme.builtinCss: false.
 */
export const BASE_THEME_CSS = `
:root {
  --mkdn-font: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
  --mkdn-font-heading: var(--mkdn-font);
  --mkdn-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  --mkdn-accent: #0969da;
  --mkdn-text: #1f2328;
  --mkdn-text-muted: #656d76;
  --mkdn-bg: #ffffff;
  --mkdn-bg-alt: #f6f8fa;
  --mkdn-border: #d0d7de;
  --mkdn-link: var(--mkdn-accent);
  --mkdn-link-hover: #0550ae;
  --mkdn-code-bg: rgba(175, 184, 193, 0.2);
  --mkdn-pre-bg: #f6f8fa;
  --mkdn-nav-w: 260px;
  --mkdn-content-max: 880px;
}

[data-theme="dark"] {
  --mkdn-accent: #58a6ff;
  --mkdn-text: #e6edf3;
  --mkdn-text-muted: #8d96a0;
  --mkdn-bg: #0d1117;
  --mkdn-bg-alt: #161b22;
  --mkdn-border: #30363d;
  --mkdn-link: var(--mkdn-accent);
  --mkdn-link-hover: #79c0ff;
  --mkdn-code-bg: rgba(110, 118, 129, 0.4);
  --mkdn-pre-bg: #161b22;
}

/* No-JS fallback: respect system preference */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --mkdn-accent: #58a6ff;
    --mkdn-text: #e6edf3;
    --mkdn-text-muted: #8d96a0;
    --mkdn-bg: #0d1117;
    --mkdn-bg-alt: #161b22;
    --mkdn-border: #30363d;
    --mkdn-link: var(--mkdn-accent);
    --mkdn-link-hover: #79c0ff;
    --mkdn-code-bg: rgba(110, 118, 129, 0.4);
    --mkdn-pre-bg: #161b22;
  }
}

*, *::before, *::after { box-sizing: border-box; }

html { font-size: 16px; -webkit-font-smoothing: antialiased; scroll-behavior: smooth; }

body {
  margin: 0;
  font-family: var(--mkdn-font);
  color: var(--mkdn-text);
  background: var(--mkdn-bg);
  line-height: 1.6;
}

:focus-visible {
  outline: 2px solid var(--mkdn-accent);
  outline-offset: 2px;
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
  border-left: 2px solid var(--mkdn-accent);
  padding-left: calc(0.75rem - 2px);
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

/* ---- Nav header (logo + site name) ---- */
.mkdn-nav-header {
  display: flex; align-items: center; gap: 0.6rem;
  padding: 0 1rem 1rem; margin-bottom: 0.5rem;
  border-bottom: 1px solid var(--mkdn-border);
  text-decoration: none; color: var(--mkdn-text);
}
.mkdn-nav-header:hover { color: var(--mkdn-text); }
.mkdn-nav-logo { display: block; flex-shrink: 0; }
.mkdn-nav-logo img { display: block; border-radius: 4px; }
.mkdn-nav-title { font-weight: 700; font-size: 0.95rem; line-height: 1.2; }

/* ---- Prose typography (shadcn/Radix-inspired, applied to .mkdn-prose) ---- */
.mkdn-prose h1, .mkdn-prose h2, .mkdn-prose h3,
.mkdn-prose h4, .mkdn-prose h5, .mkdn-prose h6 {
  font-family: var(--mkdn-font-heading);
  scroll-margin-top: 1rem;
  letter-spacing: -0.025em;
  line-height: 1.2;
}
.mkdn-prose h1 {
  margin-top: 0; margin-bottom: 0.75em;
  font-size: 2.25rem; font-weight: 800;
  text-wrap: balance;
}
.mkdn-prose h2 {
  margin-top: 2.5rem; margin-bottom: 0.5em;
  font-size: 1.875rem; font-weight: 600;
  padding-bottom: 0.5rem; border-bottom: 1px solid var(--mkdn-border);
}
.mkdn-prose h2:first-child { margin-top: 0; }
.mkdn-prose h3 {
  margin-top: 2rem; margin-bottom: 0.5em;
  font-size: 1.5rem; font-weight: 600;
}
.mkdn-prose h4 {
  margin-top: 1.5rem; margin-bottom: 0.5em;
  font-size: 1.25rem; font-weight: 600;
}
.mkdn-prose h5, .mkdn-prose h6 {
  margin-top: 1.5rem; margin-bottom: 0.5em;
  font-size: 1rem; font-weight: 600;
}

.mkdn-prose p {
  line-height: 1.75; margin: 0;
}
.mkdn-prose p + p,
.mkdn-prose :not(li) > p:not(:first-child) { margin-top: 1.5rem; }

.mkdn-prose a { color: inherit; text-decoration: underline; text-underline-offset: 4px; }
.mkdn-prose a:hover { color: var(--mkdn-text-muted); }

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
  padding: 0.2rem 0.3rem; font-size: 0.875rem; font-weight: 600;
  background: var(--mkdn-code-bg); border-radius: 4px;
  font-family: var(--mkdn-mono);
}
.mkdn-prose pre {
  margin: 1.5rem 0; padding: 1rem; overflow-x: auto;
  font-size: 0.875rem; line-height: 1.45;
  background: var(--mkdn-pre-bg);
  border-radius: 8px; border: 1px solid var(--mkdn-border);
  position: relative;
}
.mkdn-prose pre code {
  padding: 0; background: transparent; border-radius: 0;
  font-size: inherit; font-weight: 400;
}

.mkdn-code-block { position: relative; margin: 1.5rem 0; }
.mkdn-code-block pre { margin: 0; }

.mkdn-prose .mkdn-copy-btn {
  position: absolute; top: 0.4rem; right: 0.4rem;
  padding: 0.25rem 0.5rem; font-size: 0.75rem;
  background: var(--mkdn-bg-alt); border: 1px solid var(--mkdn-border);
  border-radius: 4px; cursor: pointer; color: var(--mkdn-text-muted);
  opacity: 0; transition: opacity 0.15s;
}
.mkdn-code-block:hover .mkdn-copy-btn,
.mkdn-prose pre:hover .mkdn-copy-btn { opacity: 1; }

.mkdn-table-wrapper {
  overflow-x: auto; margin: 1.5rem 0;
  border: 1px solid var(--mkdn-border); border-radius: 8px;
}
.mkdn-prose table {
  border-collapse: collapse; width: 100%; font-size: 0.875rem;
}
.mkdn-prose th, .mkdn-prose td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--mkdn-border);
  text-align: left;
}
.mkdn-prose th { font-weight: 600; }
.mkdn-prose tr:last-child td { border-bottom: none; }
.mkdn-prose tbody tr:nth-child(even) { background: var(--mkdn-bg-alt); }
.mkdn-prose td[align="center"], .mkdn-prose th[align="center"] { text-align: center; }
.mkdn-prose td[align="right"], .mkdn-prose th[align="right"] { text-align: right; }

.mkdn-prose ul, .mkdn-prose ol { padding-left: 1.5rem; margin: 1.5rem 0; }
.mkdn-prose li { margin-top: 0.5rem; line-height: 1.75; }
.mkdn-prose li > p { margin: 0; }

.mkdn-prose ul:has(input[type="checkbox"]) { list-style: none; padding-left: 0; }
.mkdn-prose input[type="checkbox"] { margin-right: 0.5em; }

.mkdn-prose blockquote {
  margin: 1.5rem 0; padding-left: 1.5rem;
  border-left: 2px solid var(--mkdn-border);
  font-style: italic;
}
.mkdn-prose blockquote > p:last-child { margin-bottom: 0; }

.mkdn-prose img { max-width: 100%; height: auto; border-radius: 8px; }

.mkdn-prose hr { border: none; border-top: 1px solid var(--mkdn-border); margin: 2rem 0; }

.mkdn-prose > :first-child { margin-top: 0; }

/* ---- GFM Alerts ---- */
.mkdn-prose .markdown-alert {
  margin: 1.5rem 0; padding: 0.75rem 1rem;
  border-left: 4px solid var(--mkdn-border);
  border-radius: 4px;
}
.mkdn-prose .markdown-alert > :last-child { margin-bottom: 0; }
.mkdn-prose .markdown-alert-title {
  display: flex; align-items: center; gap: 0.5rem;
  font-weight: 600; margin-bottom: 0.25rem;
}
.mkdn-prose .markdown-alert-title svg { flex-shrink: 0; fill: currentColor; }

.mkdn-prose .markdown-alert-note { border-left-color: #0969da; }
.mkdn-prose .markdown-alert-note .markdown-alert-title { color: #0969da; }
[data-theme="dark"] .mkdn-prose .markdown-alert-note { border-left-color: #58a6ff; }
[data-theme="dark"] .mkdn-prose .markdown-alert-note .markdown-alert-title { color: #58a6ff; }

.mkdn-prose .markdown-alert-tip { border-left-color: #1a7f37; }
.mkdn-prose .markdown-alert-tip .markdown-alert-title { color: #1a7f37; }
[data-theme="dark"] .mkdn-prose .markdown-alert-tip { border-left-color: #3fb950; }
[data-theme="dark"] .mkdn-prose .markdown-alert-tip .markdown-alert-title { color: #3fb950; }

.mkdn-prose .markdown-alert-important { border-left-color: #8250df; }
.mkdn-prose .markdown-alert-important .markdown-alert-title { color: #8250df; }
[data-theme="dark"] .mkdn-prose .markdown-alert-important { border-left-color: #a371f7; }
[data-theme="dark"] .mkdn-prose .markdown-alert-important .markdown-alert-title { color: #a371f7; }

.mkdn-prose .markdown-alert-warning { border-left-color: #9a6700; }
.mkdn-prose .markdown-alert-warning .markdown-alert-title { color: #9a6700; }
[data-theme="dark"] .mkdn-prose .markdown-alert-warning { border-left-color: #d29922; }
[data-theme="dark"] .mkdn-prose .markdown-alert-warning .markdown-alert-title { color: #d29922; }

.mkdn-prose .markdown-alert-caution { border-left-color: #cf222e; }
.mkdn-prose .markdown-alert-caution .markdown-alert-title { color: #cf222e; }
[data-theme="dark"] .mkdn-prose .markdown-alert-caution { border-left-color: #f85149; }
[data-theme="dark"] .mkdn-prose .markdown-alert-caution .markdown-alert-title { color: #f85149; }

/* No-JS fallback for alert colors */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) .mkdn-prose .markdown-alert-note { border-left-color: #58a6ff; }
  :root:not([data-theme]) .mkdn-prose .markdown-alert-note .markdown-alert-title { color: #58a6ff; }
  :root:not([data-theme]) .mkdn-prose .markdown-alert-tip { border-left-color: #3fb950; }
  :root:not([data-theme]) .mkdn-prose .markdown-alert-tip .markdown-alert-title { color: #3fb950; }
  :root:not([data-theme]) .mkdn-prose .markdown-alert-important { border-left-color: #a371f7; }
  :root:not([data-theme]) .mkdn-prose .markdown-alert-important .markdown-alert-title { color: #a371f7; }
  :root:not([data-theme]) .mkdn-prose .markdown-alert-warning { border-left-color: #d29922; }
  :root:not([data-theme]) .mkdn-prose .markdown-alert-warning .markdown-alert-title { color: #d29922; }
  :root:not([data-theme]) .mkdn-prose .markdown-alert-caution { border-left-color: #f85149; }
  :root:not([data-theme]) .mkdn-prose .markdown-alert-caution .markdown-alert-title { color: #f85149; }
}

/* ---- Collapsible sections ---- */
.mkdn-prose details {
  margin: 1.5rem 0; padding: 0.75rem 1rem;
  border: 1px solid var(--mkdn-border); border-radius: 8px;
}
.mkdn-prose details > summary {
  cursor: pointer; font-weight: 600;
  list-style: none; display: flex; align-items: center; gap: 0.5rem;
}
.mkdn-prose details > summary::before {
  content: ''; display: inline-block;
  width: 0; height: 0;
  border-left: 6px solid var(--mkdn-text-muted);
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  transition: transform 0.2s;
}
.mkdn-prose details > summary::-webkit-details-marker { display: none; }
.mkdn-prose details[open] > summary::before { transform: rotate(90deg); }
.mkdn-prose details[open] > summary { margin-bottom: 0.75rem; }
.mkdn-prose details > :last-child { margin-bottom: 0; }

/* Shiki syntax highlighting dual-theme support */
.mkdn-prose pre.shiki { background: var(--mkdn-pre-bg) !important; }

.shiki span { color: var(--shiki-light) !important; }
[data-theme="dark"] .shiki span { color: var(--shiki-dark) !important; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) .shiki span { color: var(--shiki-dark) !important; }
}

/* ---- Theme toggle button ---- */
.mkdn-theme-toggle {
  position: fixed; top: 0.75rem; right: 0.75rem; z-index: 100;
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  background: var(--mkdn-bg-alt); border: 1px solid var(--mkdn-border);
  border-radius: 8px; cursor: pointer; color: var(--mkdn-text-muted);
  transition: color 0.2s, background 0.2s, border-color 0.2s;
}
.mkdn-theme-toggle:hover { color: var(--mkdn-text); background: var(--mkdn-code-bg); }

.mkdn-theme-toggle .mkdn-icon-sun,
.mkdn-theme-toggle .mkdn-icon-moon {
  position: absolute;
  transition: opacity 0.4s ease, transform 0.5s ease;
}

/* Light mode: show sun, hide moon */
.mkdn-theme-toggle .mkdn-icon-sun { opacity: 1; transform: rotate(0deg) scale(1); }
.mkdn-theme-toggle .mkdn-icon-moon { opacity: 0; transform: rotate(-90deg) scale(0.5); }

/* Dark mode: show moon, hide sun */
[data-theme="dark"] .mkdn-theme-toggle .mkdn-icon-sun { opacity: 0; transform: rotate(90deg) scale(0.5); }
[data-theme="dark"] .mkdn-theme-toggle .mkdn-icon-moon { opacity: 1; transform: rotate(0deg) scale(1); }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) .mkdn-theme-toggle .mkdn-icon-sun { opacity: 0; transform: rotate(90deg) scale(0.5); }
  :root:not([data-theme]) .mkdn-theme-toggle .mkdn-icon-moon { opacity: 1; transform: rotate(0deg) scale(1); }
}

/* View Transition: circular reveal animation */
::view-transition-old(root) { animation: none; z-index: -1; }
::view-transition-new(root) {
  animation: mkdn-theme-reveal 0.5s ease-out;
}
@keyframes mkdn-theme-reveal {
  from { clip-path: circle(0% at var(--mkdn-toggle-x, calc(100% - 30px)) var(--mkdn-toggle-y, 30px)); }
  to { clip-path: circle(150% at var(--mkdn-toggle-x, calc(100% - 30px)) var(--mkdn-toggle-y, 30px)); }
}

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
