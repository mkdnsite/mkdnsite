<p align="center">
  <img src="static/mkdnsite-logo.png" alt="mkdnsite logo" width="128">
</p>

<h1 align="center">mkdnsite</h1>

<p align="center"><em>"markdown site"</em> — a Markdown-first web server</p>
<p align="center"><strong>Your Markdown is your website. No build required.</strong></p>

<p align="center">
  <a href="https://www.npmjs.com/package/mkdnsite"><img src="https://img.shields.io/npm/v/mkdnsite.svg" alt="npm version"></a>
  <a href="https://github.com/mkdnsite/mkdnsite/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/mkdnsite.svg" alt="MIT License"></a>
</p>

<p align="center">
  <a href="https://mkdn.site">Docs</a> · <a href="https://mkdn.io">Hosted Service</a> · <a href="https://github.com/mkdnsite/mkdnsite">GitHub</a> · <a href="https://www.npmjs.com/package/mkdnsite">npm</a>
</p>

---

mkdnsite serves a directory of Markdown files as a fully styled website — instantly, with no content build pipeline. The same URL delivers rendered HTML to browsers and raw Markdown to AI agents, using standard HTTP content negotiation.

One source. Two audiences. Zero build steps.

```bash
# Install
bun add -g mkdnsite     # or: npm i -g mkdnsite

# Serve any directory of .md files
mkdnsite ./docs

# That's it. Open http://localhost:3000
```

```bash
# For humans → beautiful HTML
curl http://localhost:3000

# For AI agents → raw Markdown
curl -H "Accept: text/markdown" http://localhost:3000

# Content index for LLMs
curl http://localhost:3000/llms.txt
```

## Why mkdnsite?

The web has a Markdown problem. Everyone writes in Markdown — docs, blogs, READMEs, notes — but to put it on the web, you feed it through a static site generator, wait for a build, and ship HTML. Then when AI agents come along, services like Cloudflare and Vercel convert that HTML *back* into Markdown.

**That's a round trip that shouldn't exist.**

```
Traditional:   Markdown → build step → HTML → reverse-convert → Markdown (for AI)
mkdnsite:      Markdown → serve it.
```

mkdnsite skips the content build pipeline. Your `.md` files are served directly — rendered as HTML for browsers, delivered as raw Markdown for agents. No static site generation. No build artifacts. No HTML-to-Markdown reconversion.

Traditional SSGs earn their complexity through build-time optimizations — image processing, bundling, prefetching. mkdnsite trades that for radical simplicity and native AI agent support. If your content is Markdown and your audience includes both humans and machines, you don't need a build step in between.

### What this means in practice

- **Edit a file, refresh the page.** Not just in dev — in production too. No rebuild, no redeploy.
- **AI agents get your original Markdown**, not HTML converted back to Markdown.
- **Your content stays portable.** Markdown files in a directory. Move them anywhere.
- **Serve from GitHub.** Point mkdnsite at any public or private repo with `--github owner/repo`.

## Features

**Rendering & Content**
- 🚀 **Zero build step** — runtime Markdown → HTML via React SSR
- 🤝 **Content negotiation** — `Accept: text/markdown` returns raw Markdown, `text/html` returns rendered pages
- 📄 **GitHub-Flavored Markdown** — tables, task lists, strikethrough, autolinks
- ⚠️ **GFM Alerts** — `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`
- ➗ **Math rendering** — KaTeX via SSR (no client-side JS required)
- 📊 **Mermaid diagrams** — rendered client-side from fenced code blocks
- 📈 **Chart.js charts** — interactive charts from JSON in fenced code blocks
- 🎨 **Syntax highlighting** — client-side via Prism.js (default) or server-side via Shiki
- 📋 **Copy-to-clipboard** — on all code blocks
- 🔍 **Full-text search** — ⌘K search modal with TF-IDF ranking and result highlighting

**Theming & Design**
- ✨ **Beautiful by default** — shadcn/Radix-inspired typography with light/dark mode
- 🌗 **Theme toggle** — sun/moon button with animated circular reveal (View Transitions API)
- 🎨 **Custom colors, fonts, and CSS** — via config or external stylesheets
- 🖼️ **Logo and branding** — configurable logo, logo text, and accent colors
- 📑 **Auto-navigation** — sidebar built from your file/directory structure
- 📖 **Table of contents** — per-page ToC from heading structure
- ⏮️ **Previous/next links** — page-to-page navigation

**AI & Interoperability**
- 🤖 **Auto `/llms.txt`** — AI agents discover and index your content
- 🔌 **Built-in MCP server** — Model Context Protocol endpoint for AI tools (Claude Desktop, Cursor, etc.)
- 📊 **`x-markdown-tokens` header** — Cloudflare-compatible token count
- 📡 **`Content-Signal` header** — AI training and indexing consent signals
- 📄 **YAML frontmatter** — title, description, order, tags, draft status

**Infrastructure**
- 🌐 **Multi-runtime** — runs on Bun, Node 22+, and Deno
- 📂 **Filesystem routing** — directory structure = URL structure
- 🐙 **GitHub content source** — serve directly from a GitHub repo (public or private)
- 🔒 **HTML sanitization** — safe HTML passthrough via rehype-sanitize
- ⚙️ **Pluggable rendering** — custom React components per Markdown element
- 🛡️ **Content Security Policy** — configurable CSP headers
- 🔧 **Config parity** — every option works in `mkdnsite.config.ts` and as a CLI flag

## Quick Start

### Install

```bash
bun add -g mkdnsite     # Bun (recommended)
npm i -g mkdnsite       # requires Node 22+
```

**No JavaScript runtime installed?** No problem:

- **Prebuilt binaries** — download a standalone executable from [GitHub Releases](https://github.com/mkdnsite/mkdnsite/releases) (Linux, macOS, Windows)
- **Docker** — `docker run -v ./docs:/content -p 3000:3000 nexdrew/mkdnsite` ([Docker Hub](https://hub.docker.com/r/nexdrew/mkdnsite))

### Serve a directory

```bash
mkdnsite ./my-docs
```

Any directory of `.md` files works. mkdnsite builds navigation from the file structure, renders pages on request, and serves static assets.

### Serve a GitHub repo

```bash
mkdnsite --github owner/repo
mkdnsite --github owner/repo --github-path docs
```

Serve content directly from a public GitHub repository — no clone needed.

Also works on Deno:

```bash
deno run --allow-read --allow-net src/cli.ts ./my-docs
```

### Configuration

Create `mkdnsite.config.ts` for full control:

```typescript
import type { MkdnSiteConfig } from 'mkdnsite'

export default {
  contentDir: './docs',
  staticDir: './static',
  site: {
    title: 'My Documentation',
    description: 'Docs for my project.',
    url: 'https://docs.example.com'
  },
  theme: {
    colorScheme: 'system',
    logo: { src: '/logo.svg', alt: 'My Project' },
    logoText: 'My Project',
    showNav: true,
    showToc: true,
    prevNext: true
  },
  client: {
    themeToggle: true,
    math: true,
    mermaid: true,
    search: true,
    copyButton: true
  }
} satisfies Partial<MkdnSiteConfig>
```

Or use CLI flags — every config option has a corresponding flag:

```bash
mkdnsite ./docs --port 8080 --title "My Docs"
mkdnsite ./docs --color-scheme dark --no-theme-toggle
mkdnsite ./docs --logo /logo.png --logo-text "My Project"
mkdnsite ./docs --no-math --no-mermaid --no-search
```

See the full [configuration reference](https://mkdn.site/docs/configuration) for all options.

## Hosted Service — mkdn.io

Don't want to self-host? **[mkdn.io](https://mkdn.io)** runs mkdnsite for you — connect your GitHub repos, get a live site with custom domains, analytics, and zero infrastructure.

| | GitHub Pages | mkdn.io |
|---|---|---|
| Content pipeline | Jekyll build or Actions | No build — serves Markdown directly |
| AI agent support | Manual setup | Built-in content negotiation + MCP |
| Content format | Builds and ships HTML | Serves Markdown, renders HTML |
| LLMs.txt | Manual | Auto-generated |
| Theme ecosystem | Thousands of Jekyll themes | Config-based theming (growing) |
| Maturity | Battle-tested since 2008 | New project |

mkdn.io is best for documentation sites and blogs where AI agent access and simplicity matter more than deep theme customization. [Get started free →](https://mkdn.io)

## Content Negotiation

mkdnsite implements the same content negotiation standard used by Cloudflare and Vercel — but in the opposite direction. Instead of converting HTML to Markdown for AI, mkdnsite starts with Markdown and renders HTML for humans.

| Client | What it sends | What it gets |
|---|---|---|
| Browser | `Accept: text/html` | Rendered HTML page |
| Claude Code | `Accept: text/markdown` | Raw Markdown |
| Cursor | `Accept: text/markdown` | Raw Markdown |
| Any URL + `.md` suffix | — | Raw Markdown |
| `/llms.txt` | — | AI content index |
| `/mcp` | — | MCP server endpoint |

## Programmatic API

Use mkdnsite as a library in any JavaScript runtime:

```typescript
import {
  createHandler, resolveConfig,
  FilesystemSource, createRenderer
} from 'mkdnsite'

const config = resolveConfig({
  site: { title: 'My Site' }
})
const source = new FilesystemSource('./content')
const renderer = await createRenderer('portable')
const handler = createHandler({ source, renderer, config })

// Works with any platform's serve API
Bun.serve({ fetch: handler, port: 3000 })
```

## Contributing

Contributions are welcome! See [open issues](https://github.com/mkdnsite/mkdnsite/issues) for the roadmap and current priorities.

## Links

- **Documentation** — [mkdn.site](https://mkdn.site)
- **Hosted service** — [mkdn.io](https://mkdn.io)
- **GitHub** — [github.com/mkdnsite/mkdnsite](https://github.com/mkdnsite/mkdnsite)
- **npm** — [npmjs.com/package/mkdnsite](https://www.npmjs.com/package/mkdnsite)

## License

[MIT](LICENSE)
