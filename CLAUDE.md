# CLAUDE.md — mkdnsite

## Project Overview

mkdnsite is a Markdown-first web server/framework that serves `.md` files as rendered HTML to browsers and raw Markdown to AI agents, using standard HTTP content negotiation.

The inverse of Cloudflare's "Markdown for Agents": they convert HTML→Markdown for AI; we convert Markdown→HTML for humans. The source of truth is always Markdown.

**Repository**: mkdnsite/mkdnsite on GitHub
**Docs domain**: mkdn.site
**Hosted service domain**: mkdn.io

## Tech Stack

- **Runtime**: Bun (primary), Node 22+, Deno — code must be compatible with all three
- **Language**: TypeScript (strict mode), explicit `.ts` extensions on all relative imports
- **Linting**: `ts-standard` (no semicolons, single quotes, 2-space indent)
- **Rendering**: React SSR via `renderToString()` — NO client-side React hydration
- **Markdown**: react-markdown + remark-gfm + remark-math + remark-github-blockquote-alert (portable) or Bun.markdown.react() (fast path)
- **Syntax Highlighting**: Shiki (SSR, dual-theme via CSS variables)
- **Math**: KaTeX via rehype-katex (SSR)
- **HTML Sanitization**: rehype-sanitize (safe defaults + extended schema for KaTeX/alerts)
- **Testing**: `bun test`

## Important Conventions

### Prefer CSS over JS
Always prefer CSS solutions over JavaScript solutions. Use native browser features (e.g. `scroll-behavior: smooth` over JS `scrollIntoView`, `@media (prefers-color-scheme)` for no-JS fallback, CSS transitions/animations over JS).

### Config parity: config file + CLI
Every configuration option must be settable in `mkdnsite.config.ts` AND via a CLI flag/argument. When adding a new config option, always add the corresponding CLI flag in `src/cli.ts` and update `printHelp()`.

### Runtime portability
All code must work on Bun, Node 22+, and Deno. Use `node:` prefixed imports for Node APIs (e.g. `node:fs/promises`, `node:path`, `node:http`). Never use `Bun.*` APIs outside of guarded runtime checks. Never use `require()` — use `await import()` for dynamic imports. All relative imports must use explicit `.ts` extensions. No `.tsx` files — use `React.createElement()` instead of JSX syntax.

### Checking code changes
Always run checks in this order:
```bash
bun run lint 2>&1 && bun run tsc 2>&1 && bun test 2>&1
```

### Code style (ts-standard)
- No semicolons
- Single quotes
- 2-space indentation
- Space before function parens: `function name (args)`
- No trailing commas

## Architecture

### Core Design Principle: Portability

The handler is a standard Web API `fetch(request: Request): Response` function. Everything else is pluggable via interfaces.

### Key Interfaces

- **`ContentSource`** — where content comes from (filesystem, GitHub API, R2, S3, etc.)
- **`MarkdownRenderer`** — how markdown becomes React elements (portable or bun-native)
- **`DeploymentAdapter`** — environment-specific setup (local, cloudflare, vercel, netlify, fly)
- **`ComponentOverrides`** — custom React components per markdown element

### Rendering Pipeline

```
Request → Content Negotiation → Accept: text/markdown? → Raw .md body
                              → Accept: text/html?    → React SSR pipeline:
                                 .md → remark plugins (gfm, math, alerts)
                                     → rehype plugins (slug, katex, raw, sanitize)
                                     → react-markdown → React elements
                                     → component overrides applied
                                     → Shiki syntax highlighting (SSR)
                                     → renderToString() → HTML string
                                     → page shell wrapper → full HTML page
                                     → Response
```

### Theme System

- **prose** (default): shadcn/Radix-inspired typography via CSS. Content styled via `.mkdn-prose` class. Zero config.
- **components**: Full custom React component overrides per element. User provides their own styling.
- **Color scheme**: `system` (default), `light`, or `dark` — set via `theme.colorScheme` config or `--color-scheme` CLI flag.
- **Theme toggle**: Light/dark toggle button with sun/moon lucide icons, circular reveal animation via View Transitions API. Persists choice in localStorage.

### Client-Side Features

All controlled via `client.*` config (each has a corresponding `--no-*` CLI flag):
- `enabled` — master switch (`--no-client-js`)
- `themeToggle` — light/dark toggle button (`--no-theme-toggle`)
- `math` — KaTeX CSS + rehype-katex plugin (`--no-math`)
- `mermaid` — Mermaid diagram rendering via CDN
- `copyButton` — copy-to-clipboard on code blocks
- `search` — client-side search (planned)

## Key Files

```
src/
  index.ts                  — Public API exports
  cli.ts                    — CLI entry point (Bun/Node/Deno compatible)
  handler.ts                — Core fetch handler (THE important file)
  config/
    schema.ts               — All TypeScript types/interfaces
    defaults.ts             — Default config values + resolveConfig()
  content/
    types.ts                — ContentSource interface, ContentPage, NavNode
    frontmatter.ts          — YAML frontmatter parser
    filesystem.ts           — FilesystemSource (local dev)
    github.ts               — GitHubSource (hosted service path)
  render/
    types.ts                — MarkdownRenderer interface + factory + RendererOptions
    portable.ts             — react-markdown based renderer (works everywhere)
    bun-native.ts           — Bun.markdown.react() renderer (Bun only, faster)
    components/index.ts     — Default React components (headings w/ lucide icons, links, code, etc.)
    page-shell.ts           — Full HTML page wrapper (SSR)
  negotiate/
    accept.ts               — Accept header parsing
    headers.ts              — Response headers + token estimation
  discovery/
    llmstxt.ts              — Auto-generate /llms.txt
  theme/
    prose-css.ts            — Default CSS theme (shadcn/Radix-inspired, light/dark)
  client/
    scripts.ts              — Client-side JS (theme toggle, copy, mermaid, search)
  adapters/
    types.ts                — DeploymentAdapter interface + runtime detection
    local.ts                — Multi-runtime adapter (Bun.serve / Deno.serve / node:http)
    cloudflare.ts           — CF Workers adapter (stub)
    vercel.ts               — Vercel Edge adapter (stub)
    netlify.ts              — Netlify adapter (stub)
    fly.ts                  — Fly.io adapter (stub)
```

## Commands

```bash
bun run dev          # Start dev server with watch mode
bun test             # Run tests
bun run lint         # ts-standard check
bun run lint:fix     # ts-standard auto-fix
bun run tsc          # TypeScript check (tsc --noEmit)
```

## Content Negotiation Behavior

- `Accept: text/markdown` → raw .md body (no frontmatter)
- `Accept: text/html` or `*/*` → React SSR rendered HTML page
- URL ending in `.md` → force raw markdown
- `/llms.txt` → auto-generated content index for AI

## Response Headers (Markdown)

- `Content-Type: text/markdown; charset=utf-8`
- `Vary: Accept`
- `x-markdown-tokens: <count>` (Cloudflare-compatible)
- `Content-Signal: ai-train=yes, search=yes, ai-input=yes`

## Hosted Service Architecture (mkdn.io — future)

- **Edge**: Cloudflare Workers with wildcard DNS (*.mkdn.io)
- **Content**: R2 blob storage (or GitHub source)
- **OLTP**: Neon Postgres (accounts, site configs, custom domains)
- **Cache**: Upstash Redis (rendered pages, rate limiting)
- **OLAP**: ClickHouse (analytics: human vs AI traffic)
- **Subdomains**: `*.mkdn.io` via CF Workers for Platforms

## Key Decisions

- **No `.tsx` files**: Node's native TypeScript support (type stripping) doesn't handle `.tsx`. All React code uses `React.createElement()`.
- **`remark-gfm` over `Bun.markdown`**: Bun.markdown.react() strips GFM task list checkboxes. The portable renderer using react-markdown + remark-gfm is the default.
- **Shiki dual themes**: Uses CSS variables (`--shiki-light`, `--shiki-dark`) with `defaultColor: false` so theme switching works without re-rendering.
- **`data-theme` attribute**: Theme is controlled via `[data-theme="light|dark"]` on `<html>`, set by a blocking `<head>` script that reads localStorage then falls back to system preference. No FOUC.
- **HTML sanitization**: `rehype-raw` enables HTML passthrough in markdown; `rehype-sanitize` blocks XSS (`<script>`, `<iframe>`, event handlers) while allowing safe elements like `<details>`, `<summary>`, SVGs, and KaTeX output.
- **Heading anchors**: Use lucide `Link` icon (h1-h3) and `#` (h4-h6) rendered via `React.createElement()` in SSR. Styled to inherit text color, not link color.
