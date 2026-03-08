# CLAUDE.md — mkdnsite

## Project Overview

mkdnsite is a Markdown-first web server/framework that serves `.md` files as rendered HTML to browsers and raw Markdown to AI agents, using standard HTTP content negotiation.

The inverse of Cloudflare's "Markdown for Agents": they convert HTML→Markdown for AI; we convert Markdown→HTML for humans. The source of truth is always Markdown.

**Repository**: mkdnsite/mkdnsite on GitHub
**Docs domain**: mkdn.site
**Hosted service domain**: mkdn.io

## Tech Stack

- **Runtime**: Bun (primary), with portable adapters for CF Workers, Vercel, Netlify, Fly
- **Language**: TypeScript (strict mode)
- **Linting**: ESLint flat config with ts-standard-style rules (no semicolons, single quotes, 2-space indent)
- **Rendering**: React SSR via `renderToString()` — NO client-side React hydration
- **Markdown**: react-markdown + remark-gfm (portable default) or Bun.markdown.react() (fast path)
- **Testing**: `bun test`
- **Dependencies**: Minimal — react, react-dom, react-markdown, remark-gfm, rehype-slug, shiki, gray-matter

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
                                 .md → react-markdown → React elements
                                     → component overrides applied
                                     → renderToString() → HTML string
                                     → page shell wrapper → full HTML page
                                     → Response
```

### Theme Modes

- **prose** (default): Tailwind Typography-inspired CSS. Content styled via `.mkdn-prose` class. Zero config.
- **components**: Full custom React component overrides per element. User provides their own styling/Tailwind build.

### Client-Side JavaScript

Enabled by default. Can be disabled via `--no-client-js` or `client.enabled: false`.
When enabled, provides: copy-to-clipboard on code blocks, Mermaid diagram rendering (via CDN), client-side search (planned).
When disabled: pure static HTML/CSS only.

## Key Files

```
src/
  index.ts                  — Public API exports
  cli.ts                    — CLI entry point
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
    types.ts                — MarkdownRenderer interface + factory
    portable.tsx            — react-markdown based renderer (works everywhere)
    bun-native.tsx          — Bun.markdown.react() renderer (Bun only, faster)
    components/index.tsx    — Default React components for markdown elements
    page-shell.ts           — Full HTML page wrapper (SSR)
  negotiate/
    accept.ts               — Accept header parsing
    headers.ts              — Response headers + token estimation
  discovery/
    llmstxt.ts              — Auto-generate /llms.txt
  theme/
    prose-css.ts            — Default CSS theme (string constant)
  client/
    scripts.ts              — Client-side JS (copy, mermaid, search)
  adapters/
    types.ts                — DeploymentAdapter interface
    local.ts                — Bun.serve() adapter
    cloudflare.ts           — CF Workers adapter (stub)
    vercel.ts               — Vercel Edge adapter (stub)
    netlify.ts              — Netlify adapter (stub)
    fly.ts                  — Fly.io adapter (stub)
```

## Commands

```bash
bun run dev          # Start dev server with watch mode
bun test             # Run tests
bun run lint         # ESLint check
bun run lint:fix     # ESLint auto-fix
bun run typecheck    # TypeScript check
```

## Code Style (ts-standard)

- No semicolons
- Single quotes
- 2-space indentation
- Space before function parens: `function name (args)`
- No trailing commas

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

## Conventions

- All code follows ts-standard style (enforced via ESLint)
- Interfaces over type aliases for object shapes
- Portable `fetch()` handler pattern for all adapters
- ContentSource is async (supports remote backends)
- Minimal dependencies — the core should be as lean as possible
- React SSR only — no client-side React hydration
- Tests use `bun:test`
