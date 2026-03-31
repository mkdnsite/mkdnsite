---
title: mkdnsite
description: Markdown for the web. HTML for humans, Markdown for agents.
---

# mkdnsite

**Markdown for the web.** HTML for humans, Markdown for agents — served from the same URL with zero build step.

mkdnsite is the inverse of "HTML to Markdown for AI." Your source of truth is already Markdown. We just serve it correctly to whoever's asking.

## How it works

Write `.md` files. Point mkdnsite at the directory. Done.

| Client | Gets |
|--------|------|
| Browser | Beautiful rendered HTML with dark mode, syntax highlighting, diagrams |
| AI agent (`Accept: text/markdown`) | Clean raw Markdown, no HTML noise |
| Curl (default) | Rendered HTML |
| Any URL ending in `.md` | Raw Markdown |
| `/llms.txt` | Auto-generated content index for AI discovery |

Standard HTTP content negotiation. No magic, no special endpoints.

## Why mkdnsite?

If you're maintaining docs in Markdown and using a static site generator (Jekyll, Hugo, MkDocs, Docusaurus), you're running a build pipeline to convert `.md` → HTML. mkdnsite skips that entirely. Your Markdown files _are_ your site — served directly at runtime with no build step, no output directory, no CI deploy.

And unlike traditional docs tools, mkdnsite is AI-native from the start. AI agents get clean Markdown via standard HTTP content negotiation — no scraping, no HTML-to-Markdown conversion, no separate API.

> **Want zero infrastructure?** [mkdn.io](https://mkdn.io) hosts your mkdnsite for you — point it at a GitHub repo and you're live. Custom domains, HTTPS, and CDN caching included.

## Features

- **Zero build step** — pure runtime rendering via React SSR, no output directory
- **Content negotiation** — standard `Accept` header routing (HTML for browsers, Markdown for AI)
- **Auto `/llms.txt`** — AI agents discover your content automatically
- **Built-in MCP server** — AI clients (Claude Desktop, Cursor) connect directly to your docs
- **⌘K search** — full-text search with TF-IDF ranking, no external service
- **GitHub-Flavored Markdown** — tables, task lists, strikethrough, alerts
- **Math support** — KaTeX rendering via `$...$` and `$$...$$`
- **Mermaid diagrams** — rendered client-side from fenced code blocks
- **Chart.js charts** — interactive charts from JSON data in Markdown
- **Syntax highlighting** — dual light/dark themes, no flash
- **Custom theming** — CSS variables, font overrides, logo, external stylesheets
- **Dark mode** — system preference + manual toggle with View Transitions animation
- **Multi-runtime** — works on Bun, Node 22+, and Deno
- **Docker support** — run as a container with no runtime dependencies
- **GitHub source** — serve directly from a GitHub repo (no local files needed)
- **Cloudflare Workers** — deploy to the edge with R2/Assets content sources
- **Pluggable** — custom content sources, React component overrides, deployment adapters

## Quick Start

```bash
bun add -g mkdnsite
mkdnsite ./content
```

Visit `http://localhost:3000`. Your Markdown is live.

```bash
# Browsers get HTML
curl http://localhost:3000

# AI agents get Markdown
curl -H "Accept: text/markdown" http://localhost:3000

# Any URL works with .md suffix
curl http://localhost:3000/docs/getting-started.md

# Auto-generated AI content index
curl http://localhost:3000/llms.txt
```

## Documentation

| Page | Description |
|------|-------------|
| [Getting Started](/docs/getting-started) | Install and run in under a minute |
| [Configuration](/docs/configuration) | Full `mkdnsite.config.ts` reference |
| [CLI Reference](/docs/cli) | All flags and usage patterns |
| [Content Negotiation](/docs/content-negotiation) | How HTTP content negotiation works |
| [Theming](/docs/theming) | Colors, fonts, logos, custom CSS |
| [Frontmatter](/docs/frontmatter) | Page metadata reference |
| [Architecture](/docs/architecture) | Design, interfaces, and extension points |
| [Search](/docs/search) | Built-in full-text search with ⌘K modal |
| [MCP Server](/docs/mcp) | AI agent access via Model Context Protocol |
| [Charts](/docs/charts) | Interactive Chart.js charts from Markdown |
| [Docker](/docs/docker) | Run mkdnsite in a container |
| [Element Examples](/docs/elements) | Visual showcase of all supported Markdown |

> **Open source** — [github.com/mkdnsite/mkdnsite](https://github.com/mkdnsite/mkdnsite)
