# mkdnsite

**Markdown for the web. HTML for humans, Markdown for agents.**

mkdnsite turns a directory of Markdown files into a live website — with zero build step. The same URL serves beautifully rendered HTML to browsers and clean Markdown to AI agents, using standard HTTP content negotiation.

```
Cloudflare, Vercel, et al:   HTML → Markdown (for AI)
mkdnsite:                    Markdown → HTML (for humans)

Same content negotiation standard. Opposite direction.
Markdown is the source of truth.
```

## Quick Start

```bash
bun add -g mkdnsite
mkdir my-site && echo "# Hello World" > my-site/index.md
mkdnsite ./my-site
```

```bash
curl http://localhost:3000                              # HTML for humans
curl -H "Accept: text/markdown" http://localhost:3000   # Markdown for agents
curl http://localhost:3000/llms.txt                      # AI content index
```

## Features

- **Zero build step** — runtime Markdown→HTML via React SSR
- **Content negotiation** — `Accept: text/markdown` returns raw MD
- **Beautiful by default** — prose-optimized theme with dark mode
- **Pluggable rendering** — custom React components per element
- **Auto `/llms.txt`** — AI agents discover your content
- **`x-markdown-tokens` header** — Cloudflare-compatible token count
- **`Content-Signal` header** — AI consent signaling
- **GitHub-Flavored Markdown** — tables, task lists, strikethrough, autolinks
- **Mermaid diagrams** — rendered client-side from fenced code blocks
- **Copy-to-clipboard** — on all code blocks
- **YAML frontmatter** — title, description, ordering, tags, drafts
- **Filesystem routing** — directory structure = URL structure
- **Auto-navigation** — sidebar from file tree
- **Portable** — core handler is a standard `fetch()` function

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│   Request    │────▶│   Handler    │────▶│   Response    │
│ Accept: ???  │     │ (portable)   │     │ HTML or MD    │
└─────────────┘     └──────┬───────┘     └───────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Content  │ │ Renderer │ │ Negotiate│
        │ Source   │ │ (React)  │ │          │
        └──────────┘ └──────────┘ └──────────┘
              │            │
     ┌────────┼──┐   ┌────┴────┐
     ▼        ▼  ▼   ▼         ▼
  Local   GitHub R2  portable  bun-native
  FS      API       (react-md) (Bun.md)
```

### Deployment Adapters

mkdnsite ships adapter stubs for multiple platforms:

| Adapter | Status | Content Source |
|---------|--------|----------------|
| Local (Bun) | ✅ Working | Filesystem |
| Cloudflare Workers | 🔲 Stub | R2 / GitHub |
| Vercel Edge | 🔲 Stub | Blob / GitHub |
| Netlify | 🔲 Stub | TBD |
| Fly.io | 🔲 Stub | Filesystem (volumes) |

### Theme Modes

- **prose** (default): Beautiful typography via CSS, zero-config
- **components**: Full React component overrides with your own styling

## Configuration

Create `mkdnsite.config.ts`:

```typescript
import type { MkdnSiteConfig } from 'mkdnsite'

export default {
  contentDir: './docs',
  site: {
    title: 'My Documentation',
    url: 'https://docs.example.com'
  },
  theme: {
    mode: 'prose',
    showNav: true
  },
  client: {
    enabled: true,
    mermaid: true,
    copyButton: true
  }
} satisfies Partial<MkdnSiteConfig>
```

Or use CLI flags:

```bash
mkdnsite ./docs --port 8080 --title "My Docs" --no-client-js
```

## Content Negotiation

Same pattern as Cloudflare Markdown for Agents and Vercel:

| Client | Accept Header | Response |
|--------|--------------|----------|
| Browser | `text/html` | React SSR rendered page |
| Claude Code | `text/markdown, text/html, */*` | Raw Markdown |
| Cursor | `text/markdown;q=1.0, text/html;q=0.7` | Raw Markdown |
| curl (default) | `*/*` | Rendered HTML |
| `.md` URL suffix | — | Raw Markdown |

## Programmatic Usage

```typescript
import { createHandler, resolveConfig, FilesystemSource, PortableRenderer } from 'mkdnsite'

const config = resolveConfig({ site: { title: 'My Site' } })
const handler = createHandler({
  source: new FilesystemSource('./content'),
  renderer: new PortableRenderer(),
  config
})

// Use with any platform's serve API
Bun.serve({ fetch: handler, port: 3000 })
```

## Roadmap

- [ ] Syntax highlighting via Shiki (server-side)
- [ ] Table of contents per page
- [ ] Client-side search with pre-built index
- [ ] GitHub content source (serve from repo)
- [ ] Custom themes (CSS files or npm packages)
- [ ] Hosted service at mkdn.io
- [ ] RSS feed generation
- [ ] OpenGraph meta tags
- [ ] Human vs. AI traffic analytics

## Links

- **Documentation**: [mkdn.site](https://mkdn.site)
- **Hosted service**: [mkdn.io](https://mkdn.io) (coming soon)
- **Repository**: [github.com/mkdnsite/mkdnsite](https://github.com/mkdnsite/mkdnsite)

## License

MIT
