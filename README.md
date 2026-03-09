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

Also runs on Node and Deno:

```bash
node src/cli.ts ./my-site
deno run --allow-read --allow-net src/cli.ts ./my-site
```

## Features

- **Zero build step** — runtime Markdown→HTML via React SSR
- **Content negotiation** — `Accept: text/markdown` returns raw MD
- **Beautiful by default** — shadcn/Radix-inspired typography with light/dark mode
- **Theme toggle** — sun/moon button with animated circular reveal (View Transitions API)
- **Syntax highlighting** — Shiki SSR with dual-theme support (light + dark)
- **Math rendering** — KaTeX via `remark-math` + `rehype-katex` (SSR)
- **GFM Alerts** — `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`
- **GitHub-Flavored Markdown** — tables, task lists, strikethrough, autolinks
- **Collapsible sections** — `<details>` and `<summary>` with HTML sanitization
- **Mermaid diagrams** — rendered client-side from fenced code blocks
- **Copy-to-clipboard** — on all code blocks
- **Pluggable rendering** — custom React components per element
- **Auto `/llms.txt`** — AI agents discover your content
- **`x-markdown-tokens` header** — Cloudflare-compatible token count
- **`Content-Signal` header** — AI consent signaling
- **YAML frontmatter** — title, description, ordering, tags, drafts
- **Filesystem routing** — directory structure = URL structure
- **Auto-navigation** — sidebar from file tree
- **Portable** — runs on Bun, Node 22+, and Deno

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
| Local (Bun/Node/Deno) | Working | Filesystem |
| Cloudflare Workers | Stub | R2 / GitHub |
| Vercel Edge | Stub | Blob / GitHub |
| Netlify | Stub | TBD |
| Fly.io | Stub | Filesystem (volumes) |

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
    showNav: true,
    colorScheme: 'system',
    syntaxTheme: 'github-light',
    syntaxThemeDark: 'github-dark'
  },
  client: {
    enabled: true,
    themeToggle: true,
    math: true,
    mermaid: true,
    copyButton: true
  },
  renderer: 'portable'
} satisfies Partial<MkdnSiteConfig>
```

Or use CLI flags:

```bash
mkdnsite ./docs --port 8080 --title "My Docs"
mkdnsite ./docs --color-scheme dark --no-theme-toggle
mkdnsite ./docs --no-math --no-client-js
mkdnsite ./docs --renderer bun-native
```

### CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --port <n>` | Port to listen on | `3000` |
| `--title <text>` | Site title | `mkdnsite` |
| `--url <url>` | Base URL for absolute links | — |
| `--static <dir>` | Static assets directory | — |
| `--color-scheme <val>` | `system`, `light`, or `dark` | `system` |
| `--theme-mode <mode>` | `prose` or `components` | `prose` |
| `--renderer <engine>` | `portable` or `bun-native` | `portable` |
| `--no-nav` | Disable navigation sidebar | — |
| `--no-llms-txt` | Disable /llms.txt generation | — |
| `--no-negotiate` | Disable content negotiation | — |
| `--no-client-js` | Disable all client-side JavaScript | — |
| `--no-theme-toggle` | Disable light/dark theme toggle | — |
| `--no-math` | Disable KaTeX math rendering | — |

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
import { createHandler, resolveConfig, FilesystemSource } from 'mkdnsite'
import { createRenderer } from 'mkdnsite'

const config = resolveConfig({ site: { title: 'My Site' } })
const renderer = await createRenderer({
  syntaxTheme: 'github-light',
  syntaxThemeDark: 'github-dark'
})
const handler = createHandler({
  source: new FilesystemSource('./content'),
  renderer,
  config
})

// Use with any platform's serve API
Bun.serve({ fetch: handler, port: 3000 })
```

## Roadmap

- [x] Syntax highlighting via Shiki (server-side)
- [x] Light/dark theme toggle with animation
- [x] KaTeX math rendering (SSR)
- [x] GFM alerts (NOTE, TIP, IMPORTANT, WARNING, CAUTION)
- [x] HTML sanitization for safe raw HTML passthrough
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
