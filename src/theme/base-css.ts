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

/* Two-column layout when TOC sidebar is present */
.mkdn-main:has(.mkdn-toc) {
  display: flex; flex-direction: row;
  gap: 2.5rem; align-items: flex-start;
  max-width: calc(var(--mkdn-content-max) + 260px);
}
.mkdn-content-area { flex: 1; min-width: 0; }

/* TOC sidebar */
.mkdn-toc {
  flex: 0 0 220px; position: sticky; top: 2rem;
  max-height: calc(100vh - 4rem); overflow-y: auto;
  font-size: 0.8rem;
}
.mkdn-toc-title {
  font-size: 0.7rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--mkdn-text-muted); margin: 0 0 0.5rem;
}
.mkdn-toc ul { list-style: none; padding: 0; margin: 0; }
.mkdn-toc li { margin: 0; }
.mkdn-toc a {
  display: block; padding: 0.2rem 0;
  color: var(--mkdn-text-muted); text-decoration: none;
  border-left: 2px solid transparent;
  padding-left: 0.5rem; transition: color 0.15s, border-color 0.15s;
  line-height: 1.4;
}
.mkdn-toc a:hover { color: var(--mkdn-text); border-left-color: var(--mkdn-accent); }
.mkdn-toc-3 a { padding-left: 1rem; font-size: 0.775rem; }
.mkdn-toc-4 a { padding-left: 1.5rem; font-size: 0.75rem; }

@media (max-width: 1200px) {
  .mkdn-main:has(.mkdn-toc) { flex-direction: column; }
  .mkdn-toc { display: none; }
}

.mkdn-footer {
  margin-top: 4rem; padding-top: 1.5rem;
  border-top: 1px solid var(--mkdn-border);
  font-size: 0.8rem; color: var(--mkdn-text-muted);
}
.mkdn-footer a { color: var(--mkdn-link); }

/* ---- Page title (from frontmatter) ---- */
.mkdn-page-title {
  font-size: 2.5rem; font-weight: 800;
  letter-spacing: -0.03em; line-height: 1.1;
  margin-top: 0; margin-bottom: 0.35em;
}

/* ---- Page meta (date + reading time) ---- */
.mkdn-page-meta {
  display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem 1rem;
  color: var(--mkdn-text-muted); font-size: 0.875rem;
  margin-bottom: 2rem;
}
.mkdn-page-meta time { color: var(--mkdn-text-muted); }
.mkdn-reading-time { color: var(--mkdn-text-muted); }

/* ---- Prev/Next navigation ---- */
.mkdn-prev-next {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 1rem; padding: 1.5rem 0; margin-top: 2.5rem;
  border-top: 1px solid var(--mkdn-border);
}
.mkdn-prev-next a {
  display: flex; flex-direction: column; gap: 0.2rem;
  text-decoration: none; color: var(--mkdn-text-muted);
  font-size: 0.875rem; max-width: 45%;
  transition: color 0.15s;
}
.mkdn-prev-next a:hover { color: var(--mkdn-accent); }
.mkdn-prev { align-items: flex-start; }
.mkdn-next { align-items: flex-end; text-align: right; }
.mkdn-prev-next .mkdn-pn-label {
  font-size: 0.75rem; text-transform: uppercase;
  letter-spacing: 0.05em; color: var(--mkdn-text-muted); font-weight: 600;
}
.mkdn-prev-next .mkdn-pn-title { color: var(--mkdn-link); font-weight: 500; }

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
.mkdn-prose thead th { background: var(--mkdn-bg-alt); }
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

.mkdn-nav-toggle { display: none; }
.mkdn-nav-backdrop { display: none; }

@media (max-width: 768px) {
  .mkdn-layout { flex-direction: column; }
  .mkdn-nav {
    position: fixed; top: 0; left: 0;
    width: 280px; height: 100vh;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    z-index: 900;
    border-right: 1px solid var(--mkdn-border);
    border-bottom: none;
  }
  .mkdn-nav.mkdn-nav--open { transform: translateX(0); }
  .mkdn-nav-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
    z-index: 899; display: none;
  }
  .mkdn-nav-backdrop--visible { display: block; }
  .mkdn-nav-toggle {
    display: flex; position: fixed; top: 0.75rem; left: 0.75rem;
    z-index: 200; width: 36px; height: 36px;
    align-items: center; justify-content: center;
    background: var(--mkdn-bg-alt); border: 1px solid var(--mkdn-border);
    border-radius: 8px; cursor: pointer; color: var(--mkdn-text-muted);
    transition: color 0.15s, background 0.15s;
  }
  .mkdn-nav-toggle:hover { color: var(--mkdn-text); background: var(--mkdn-code-bg); }
  .mkdn-main { padding: 1.5rem 1rem; padding-top: 3.5rem; }
  .mkdn-theme-toggle { top: 0.75rem; right: 0.75rem; }
  .mkdn-search-trigger { right: 3rem; }
  .mkdn-prev-next { flex-direction: column; }
  .mkdn-prev-next a { max-width: 100%; font-size: 0.8rem; }

  /* Scale down base font — everything using rem shrinks proportionally */
  html { font-size: 14px; }

  /* Tighter prose headings on mobile */
  .mkdn-prose h1 { font-size: 1.75rem; }
  .mkdn-prose h2 { font-size: 1.5rem; margin-top: 1.75rem; }
  .mkdn-prose h3 { font-size: 1.25rem; margin-top: 1.5rem; }
  .mkdn-prose h4 { font-size: 1.1rem; }

  /* Constrain wide elements to viewport width */
  .mkdn-prose pre,
  .mkdn-code-block,
  .mkdn-table-wrapper,
  .mkdn-chart { max-width: calc(100vw - 2rem); }

  /* Tighter code block padding on mobile */
  .mkdn-prose pre { padding: 0.75rem; font-size: 0.8rem; }

  /* Ensure images don't overflow */
  .mkdn-prose img { max-width: 100%; height: auto; }

  /* Smaller page title on mobile */
  .mkdn-page-title { font-size: 1.75rem; }

  /* Move heading anchors to the right on mobile — avoids left-side overflow */
  .mkdn-prose a.mkdn-heading-anchor {
    margin-left: 0;
    margin-right: 0;
    float: right;
    padding-left: 0.3em;
    padding-right: 0;
    opacity: 0.5;
  }

  /* Tables scroll horizontally rather than compressing */
  .mkdn-table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    max-width: calc(100vw - 2rem);
  }
  .mkdn-prose table {
    width: max-content;
    min-width: 100%;
  }
  .mkdn-prose th, .mkdn-prose td { white-space: nowrap; }

  /* Top padding so first article content isn't hidden behind fixed hamburger */
  .mkdn-article { padding-top: 0.5rem; }

  /* Heading anchor scroll offset accounts for fixed hamburger button height */
  .mkdn-prose h1 { scroll-margin-top: 4.5rem; }
  .mkdn-prose h2, .mkdn-prose h3,
  .mkdn-prose h4, .mkdn-prose h5, .mkdn-prose h6 {
    scroll-margin-top: 3.5rem;
  }
}

/* ---- Search trigger button ---- */
.mkdn-search-trigger {
  position: fixed; top: 0.75rem; right: 3.25rem; z-index: 200;
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 50%; border: none;
  background: transparent; cursor: pointer;
  color: var(--mkdn-text-muted);
  transition: color 0.15s, background 0.15s;
}
.mkdn-search-trigger:hover { color: var(--mkdn-text); background: var(--mkdn-code-bg); }

/* ---- Search modal overlay ---- */
.mkdn-search-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 8vh;
  opacity: 0; pointer-events: none;
  transition: opacity 0.15s ease;
}
.mkdn-search-overlay--open {
  opacity: 1; pointer-events: auto;
}

/* ---- Search modal box ---- */
.mkdn-search-modal {
  background: var(--mkdn-bg);
  border: 1px solid var(--mkdn-border);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  width: 100%; max-width: 600px; max-height: 80vh;
  display: flex; flex-direction: column; overflow: hidden;
}

/* ---- Input row ---- */
.mkdn-search-input-wrap {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--mkdn-border);
}
.mkdn-search-icon { flex-shrink: 0; color: var(--mkdn-text-muted); }
.mkdn-search-input {
  flex: 1; border: none; outline: none; background: transparent;
  font-size: 1.05rem; color: var(--mkdn-text);
  font-family: inherit;
}
.mkdn-search-input::placeholder { color: var(--mkdn-text-muted); }
.mkdn-search-kbd {
  flex-shrink: 0; font-size: 0.7rem; padding: 2px 6px;
  border: 1px solid var(--mkdn-border); border-radius: 4px;
  background: var(--mkdn-code-bg); color: var(--mkdn-text-muted);
  font-family: inherit;
}

/* ---- Results list ---- */
.mkdn-search-results {
  overflow-y: auto; max-height: 400px; padding: 0.5rem 0;
}
.mkdn-search-hint {
  padding: 1.5rem 1rem; margin: 0;
  text-align: center; color: var(--mkdn-text-muted); font-size: 0.9rem;
}
.mkdn-search-result {
  display: block; padding: 0.65rem 1rem;
  text-decoration: none; color: inherit;
  border-left: 3px solid transparent;
  transition: background 0.1s;
}
.mkdn-search-result--active {
  background: var(--mkdn-bg-alt);
  border-left-color: var(--mkdn-accent);
}
.mkdn-search-result-title {
  font-weight: 600; font-size: 0.95rem;
  color: var(--mkdn-text); margin-bottom: 0.15rem;
}
.mkdn-search-result-excerpt {
  font-size: 0.82rem; color: var(--mkdn-text-muted);
  line-height: 1.5; margin-bottom: 0.15rem;
}
.mkdn-search-result-excerpt mark {
  background: transparent; color: var(--mkdn-accent);
  font-weight: 600; padding: 0;
}
.mkdn-search-result-slug {
  font-size: 0.75rem; color: var(--mkdn-text-muted); opacity: 0.7;
  font-family: var(--mkdn-font-mono, monospace);
}

@media (max-width: 640px) {
  .mkdn-search-overlay { padding-top: 4vh; align-items: flex-start; }
  .mkdn-search-modal {
    max-width: 100%; border-radius: 12px;
    max-height: 80vh;
    margin: 0 0.5rem;
  }
  .mkdn-search-trigger { right: 3rem; }
}

/* ---- Search result highlighting (on target page) ---- */
.mkdn-search-highlight {
  background: color-mix(in srgb, var(--mkdn-accent) 20%, transparent);
  border-radius: 2px; padding: 1px 2px;
  transition: background 0.5s ease;
}
.mkdn-search-highlight--fading { background: transparent; }

/* ---- Sticky table header (JS-cloned) ---- */
.mkdn-thead-clone {
  position: fixed;
  top: 0;
  z-index: 100;
  pointer-events: none;
  overflow: hidden;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  border: 1px solid var(--mkdn-border);
  border-bottom: none;
}
.mkdn-thead-clone table {
  border-collapse: collapse;
}

/* ---- Chart rendering ---- */
.mkdn-chart {
  max-width: 600px;
  margin: 1.5rem auto;
  padding: 1rem;
  background: var(--mkdn-bg);
  border: 1px solid var(--mkdn-border);
  border-radius: 8px;
}
.mkdn-chart canvas {
  width: 100% !important;
  height: auto !important;
}
.mkdn-chart-error {
  padding: 1rem;
  margin: 1rem 0;
  border: 1px solid #ef4444;
  border-radius: 8px;
  color: #ef4444;
  font-size: 0.9rem;
  text-align: center;
}
`.trim()
