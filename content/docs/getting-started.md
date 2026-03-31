---
title: Getting Started
description: Install and run mkdnsite in under a minute.
order: 1
---

# Getting Started

## Install

### Option 1: npm / Bun (recommended)

```bash
bun add -g mkdnsite
# or
npm install -g mkdnsite
```

Works with Bun, Node 22+, and Deno 2.

### Option 2: Standalone binary

Download a pre-built binary from [GitHub Releases](https://github.com/mkdnsite/mkdnsite/releases/latest) — no runtime required:

| Platform | Binary |
|----------|--------|
| macOS (Apple Silicon) | `mkdnsite-darwin-arm64` |
| Linux (x64) | `mkdnsite-linux-x64` |
| Windows (x64) | `mkdnsite-windows-x64.exe` |

```bash
# Example: macOS
curl -L -o mkdnsite https://github.com/mkdnsite/mkdnsite/releases/latest/download/mkdnsite-darwin-arm64
chmod +x mkdnsite
./mkdnsite ./content
```

### Option 3: Docker

```bash
docker run -p 3000:3000 -v ./content:/site nexdrew/mkdnsite
```

No runtime, no install — just mount your content directory. See [Docker](/docs/docker) for more options.

## Quick start

Create a directory of Markdown files:

```
my-site/
├── index.md          → /
├── about.md          → /about
└── docs/
    ├── index.md      → /docs
    └── api.md        → /docs/api
```

Start the server:

```bash
mkdnsite ./my-site
```

Visit `http://localhost:3000`. Your Markdown is live, with nav sidebar, dark mode, and syntax highlighting — zero configuration needed.

## Content negotiation

mkdnsite serves different formats from the same URL based on the `Accept` header:

```bash
curl http://localhost:3000                              # HTML (browser)
curl -H "Accept: text/markdown" http://localhost:3000   # Markdown (AI agent)
curl http://localhost:3000/docs/getting-started.md       # Markdown via .md suffix
curl http://localhost:3000/llms.txt                      # AI content index
```

See [Content Negotiation](/docs/content-negotiation) for details.

## Configuration

Create `mkdnsite.config.ts` for persistent settings:

```typescript
import type { MkdnSiteConfig } from 'mkdnsite'

const config: Partial<MkdnSiteConfig> = {
  site: {
    title: 'My Docs',
    description: 'Documentation for my project.'
  },
  theme: {
    colors: { accent: '#7c3aed' },
    colorsDark: { accent: '#a78bfa' }
  }
}

export default config
```

See [Configuration](/docs/configuration) for the full reference, or [CLI Reference](/docs/cli) for all command-line flags.

## Mermaid diagrams

Fenced code blocks with the `mermaid` language tag are rendered as diagrams:

```mermaid
graph TD
    A[Markdown Files] --> B{Content Negotiation}
    B -->|Accept: text/html| C[React SSR → HTML]
    B -->|Accept: text/markdown| D[Raw Markdown]
    C --> E[Browser]
    D --> F[AI Agent]
```

## Custom theming

Quick accent color override:

```bash
mkdnsite ./content --accent "#e11d48"
```

For full control — custom colors, fonts, logo, and external stylesheets — see [Theming](/docs/theming).

## Coming from another tool?

### GitHub Pages / Jekyll / Hugo / other SSGs

If you're used to static site generators, mkdnsite is a different approach:

- **No build step.** No `_site` directory, no `hugo build`, no CI pipeline to generate HTML. Your `.md` files are served directly at runtime.
- **No templating language.** No Liquid, no Go templates, no shortcodes. Just Markdown, frontmatter, and CSS.
- **No config ceremony.** Drop `.md` files in a directory and run `mkdnsite`. You get nav, dark mode, syntax highlighting, and search out of the box.
- **AI-native.** AI agents get clean Markdown via content negotiation — no scraping, no conversion. Your docs are instantly usable as AI context.

Already have a `docs/` folder with `.md` files? Try it now:

```bash
bun add -g mkdnsite
mkdnsite ./docs
```

Your existing Markdown files (with standard YAML frontmatter) just work. If you want nav ordering, add `order: 1` to your frontmatter.

### Want zero infrastructure?

[mkdn.io](https://mkdn.io) is the hosted version of mkdnsite. Point it at a GitHub repo and your docs are live — custom domains, HTTPS, and CDN caching included. No server to manage.

## Next steps

| | |
|---|---|
| [Configuration](/docs/configuration) | All config options explained |
| [CLI Reference](/docs/cli) | Every flag with examples |
| [Content Negotiation](/docs/content-negotiation) | How HTTP negotiation works |
| [Theming](/docs/theming) | Colors, fonts, logos, CSS overrides |
| [Frontmatter](/docs/frontmatter) | Page metadata reference |
| [Architecture](/docs/architecture) | Design and extension points |
| [Search](/docs/search) | Built-in ⌘K search modal |
| [MCP Server](/docs/mcp) | AI agent access via MCP |
| [Charts](/docs/charts) | Chart.js charts from Markdown |
| [Docker](/docs/docker) | Run in a container |
| [Element Examples](/docs/elements) | Visual showcase of all Markdown elements |
