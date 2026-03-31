---
title: CLI Reference
description: All mkdnsite CLI flags, usage patterns, and examples.
order: 3
---

# CLI Reference

mkdnsite ships with a CLI that covers every configuration option. All flags map directly to fields in `mkdnsite.config.ts` — the two are equivalent and can be combined.

## Usage

```bash
mkdnsite [directory] [options]
```

```bash
# Basic usage
mkdnsite ./content

# With config file
mkdnsite --config mysite.config.ts

# Mix config file and CLI overrides
mkdnsite --config mysite.config.ts --color-scheme dark --port 4000
```

## Config file

| Flag | Description |
|------|-------------|
| `--config <path>` | Path to config file (default: auto-detects `mkdnsite.config.ts` in cwd) |

When a config file is found, CLI flags override its values. This lets you use the config file for stable settings and override specific values for testing.

```bash
# Force dark mode on a light-mode site
mkdnsite --config docs.config.ts --color-scheme dark
```

## Content

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `[directory]` | positional | `./content` | Path to directory containing `.md` files |
| `--static <dir>` | path | — | Directory for static assets (images, CSS, fonts) |
| `--include <pattern>` | glob | — | Only serve files matching this pattern (repeatable) |
| `--exclude <pattern>` | glob | — | Skip files matching this pattern (repeatable) |

```bash
mkdnsite ./docs --static ./public
```

Static assets are served at the root: `./public/logo.png` → `/logo.png`.

> **Non-filesystem deployments** (Cloudflare Workers, Vercel Edge, etc.) cannot use `--static` / `staticDir` because the filesystem is unavailable. Use the programmatic `staticHandler` option in `createHandler()` instead — see [configuration reference](/docs/configuration#statichandler-programmatic-api-only).

### Filtering content with `--include` / `--exclude`

Use these flags to control which `.md` files are served. They are mutually exclusive — use one or the other.

```bash
# Only serve files under docs/ and guides/
mkdnsite --include 'docs/**' --include 'guides/**'

# Exclude draft files and a private directory
mkdnsite --exclude '**/*.draft.md' --exclude 'private/**'
```

Patterns use [picomatch](https://github.com/micromatch/picomatch) glob syntax and are matched against paths relative to the content directory. These options map to the `include` and `exclude` config file keys.

## Server

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--port <n>` | `-p` | `3000` | Port to listen on |

```bash
mkdnsite -p 8080
mkdnsite --port 4000
```

## Site metadata

| Flag | Description |
|------|-------------|
| `--title <text>` | Site title (shown in `<title>` as `Page — Site`) |
| `--url <url>` | Base URL for absolute links |
| `--favicon <path>` | Favicon path or URL (`.ico`, `.png`, `.svg`) |

```bash
mkdnsite --title "My Docs" --url "https://docs.example.com"
```

## OpenGraph / social meta tags

Controls the `og:*` and `twitter:*` meta tags for rich preview cards in Slack, Discord, iMessage, and social platforms.

| Flag | Description |
|------|-------------|
| `--og-image <url>` | Default OpenGraph image URL |
| `--og-type <type>` | Default OpenGraph type (`website` or `article`) |
| `--twitter-card <type>` | Twitter card type: `summary` or `summary_large_image` |
| `--twitter-site <handle>` | Twitter `@handle` for the site |

```bash
mkdnsite ./content \
  --url "https://docs.example.com" \
  --og-image "https://docs.example.com/og-image.png" \
  --twitter-card summary_large_image \
  --twitter-site "@myproject"
```

Individual pages can override `og:image` and `og:type` via frontmatter (`og_image`, `og_type`). See [Frontmatter](/docs/frontmatter).

## Theme

### Color scheme

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--color-scheme <val>` | `system`, `light`, `dark` | `system` | Color scheme |

```bash
mkdnsite --color-scheme dark    # always dark
mkdnsite --color-scheme light   # always light
mkdnsite --color-scheme system  # follow OS (default)
```

### Theme mode

| Flag | Values | Description |
|------|--------|-------------|
| `--theme-mode <mode>` | `prose`, `components` | Rendering mode |

`prose` uses the built-in shadcn/Radix-inspired typography. `components` expects you to provide your own React component overrides.

### Colors

| Flag | Description |
|------|-------------|
| `--accent <color>` | Accent color (links, active nav, focus rings). Any CSS color value. |

```bash
mkdnsite --accent "#7c3aed"
mkdnsite --accent "oklch(0.5 0.2 270)"
```

This sets `theme.colors.accent`. For full color control, use a config file with the `colors` and `colorsDark` objects. See [Theming](/docs/theming).

### Fonts

| Flag | Description |
|------|-------------|
| `--font-body <family>` | Body/prose font stack |
| `--font-mono <family>` | Monospace font stack |
| `--font-heading <family>` | Heading font stack |

```bash
mkdnsite --font-heading '"Playfair Display", serif' \
         --font-body '"Inter", sans-serif'
```

Quote the value if it contains spaces. For Google Fonts, combine with `--custom-css-url`:

```bash
mkdnsite \
  --custom-css-url "https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" \
  --font-body '"Inter", sans-serif'
```

### Logo

| Flag | Description |
|------|-------------|
| `--logo <url-path>` | Logo image URL path, e.g. `/logo.svg` (served from `--static` dir) |
| `--logo-text <text>` | Site name displayed next to logo in nav header |

```bash
mkdnsite --static ./static --logo /logo.png --logo-text "My Docs"
```

The logo `src` is a URL path, not a filesystem path. The file should be in your `--static` directory.

### Custom CSS

| Flag | Description |
|------|-------------|
| `--custom-css <css>` | Inline CSS string appended after built-in styles |
| `--custom-css-url <url>` | External stylesheet URL loaded via `<link rel="stylesheet">` |
| `--no-builtin-css` | Strip all built-in CSS (start from blank slate) |

```bash
# Quick tweak via inline CSS
mkdnsite --custom-css ".mkdn-main { max-width: 1000px; }"

# Load a custom theme file
mkdnsite --static ./static --custom-css-url /my-theme.css

# Full replacement
mkdnsite --no-builtin-css --custom-css-url /my-complete-theme.css
```

## `mkdnsite mcp` — stdio MCP server

Run mkdnsite as a standalone MCP server over stdio, without starting a web server. Use this to connect AI clients like Claude Desktop directly to your documentation.

```bash
# Local content directory
mkdnsite mcp ./content

# GitHub repository
mkdnsite mcp --github owner/repo

# GitHub repo with specific branch and subdirectory
mkdnsite mcp --github owner/repo --github-ref v2.0 --github-path docs

# Use a config file
mkdnsite mcp --config my-docs.config.ts
```

All the same content source flags work (`--github`, `--github-ref`, `--github-path`, `--github-token`, positional directory argument).

### Claude Desktop configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-docs": {
      "command": "mkdnsite",
      "args": ["mcp", "./path/to/content"]
    }
  }
}
```

For a GitHub-hosted repo:

```json
{
  "mcpServers": {
    "mkdnsite-docs": {
      "command": "mkdnsite",
      "args": ["mcp", "--github", "mkdnsite/mkdnsite"]
    }
  }
}
```

---

## MCP server

Controls the built-in [MCP (Model Context Protocol)](/docs/mcp) server (HTTP endpoint).

| Flag | Description |
|------|-------------|
| `--no-mcp` | Disable the built-in MCP server |
| `--mcp-endpoint <path>` | Custom MCP endpoint path (default: `/mcp`) |

```bash
# Disable MCP (e.g. public-facing site)
mkdnsite --no-mcp

# Custom endpoint path
mkdnsite --mcp-endpoint /api/mcp
```

---

## GitHub source

Serve content from a public GitHub repository instead of a local directory.

| Flag | Description |
|------|-------------|
| `--github <owner/repo>` | Serve a GitHub repo, e.g. `--github mkdnsite/mkdnsite` |
| `--github-ref <ref>` | Branch, tag, or commit SHA (default: `main`) |
| `--github-path <path>` | Subdirectory within the repo to use as content root |
| `--github-token <token>` | GitHub token for private repos or higher rate limits. Also reads `GITHUB_TOKEN` or `MKDNSITE_GITHUB_TOKEN` env var. |

```bash
# Serve a public repo from main branch
mkdnsite --github owner/repo

# Serve a specific branch and subdirectory
mkdnsite --github owner/repo --github-ref develop --github-path docs

# Use a token for private repos or to avoid rate limits
mkdnsite --github myorg/private-docs --github-token ghp_xxx

# Or set the env var (no need for --github-token)
GITHUB_TOKEN=ghp_xxx mkdnsite --github myorg/private-docs
```

Content is cached for 5 minutes. File listing uses the GitHub Git Trees API (one call per cache window); file contents come from `raw.githubusercontent.com`. Unauthenticated requests are limited to 60 API calls/hour; a token raises this to 5,000.

## Presets

Apply a preset to configure sensible defaults for a common use case. User values always override the preset.

| Flag | Description |
|------|-------------|
| `--preset <name>` | Apply preset: `docs` or `blog` |

```bash
mkdnsite --preset docs ./content   # nav + TOC + prev/next links
mkdnsite --preset blog ./posts     # page title, date, reading time, prev/next
```

See [Configuration — preset](/docs/configuration#preset) for full details.

## Page metadata

Controls how frontmatter values are displayed in the rendered page.

| Flag | Description |
|------|-------------|
| `--page-title` | Render frontmatter `title` as `<h1>` above article content |
| `--no-page-title` | Disable page title rendering |
| `--page-date` | Render `date`/`updated` from frontmatter below the page title |
| `--no-page-date` | Disable page date rendering |
| `--reading-time` | Show estimated reading time (calculated at 238 wpm) |
| `--no-reading-time` | Disable reading time display |
| `--prev-next` | Show prev/next page navigation links at the bottom of the article |
| `--no-prev-next` | Disable prev/next navigation |
| `--no-toc` | Disable the table of contents sidebar |

```bash
# Manual blog setup without a preset
mkdnsite ./posts \
  --page-title \
  --page-date \
  --reading-time \
  --prev-next \
  --no-nav \
  --no-toc
```

## Navigation

| Flag | Description |
|------|-------------|
| `--no-nav` | Disable the navigation sidebar |
| `--no-toc` | Disable the table of contents sidebar |
| `--no-footer` | Hide "Powered by mkdnsite" footer |

```bash
mkdnsite --no-nav   # single-page or minimal sites
mkdnsite --no-toc   # disable TOC without disabling nav
```

## Content negotiation

| Flag | Description |
|------|-------------|
| `--no-negotiate` | Disable Markdown serving via `Accept: text/markdown` |
| `--no-llms-txt` | Disable `/llms.txt` generation |

```bash
# Public site where you don't want to expose raw Markdown
mkdnsite --no-negotiate --no-llms-txt
```

## Client-side features

| Flag | Description |
|------|-------------|
| `--no-client-js` | Disable all client-side JavaScript (pure static HTML/CSS) |
| `--no-theme-toggle` | Disable the light/dark toggle button |
| `--no-math` | Disable KaTeX math rendering |
| `--no-search` | Disable the ⌘K search modal and `/api/search` endpoint |
| `--no-charts` | Disable Chart.js chart rendering |
| `--syntax-highlight <mode>` | Syntax highlighting: `client` (default), `server` (Shiki SSR), or `false` |
| `--no-syntax-highlight` | Disable syntax highlighting entirely |

```bash
# Maximum performance / accessibility
mkdnsite --no-client-js

# Keep mermaid and copy but remove theme toggle
mkdnsite --no-theme-toggle

# Disable search (e.g. public-facing site without search UI)
mkdnsite --no-search
```

> **Note:** `--no-client-js` disables everything including Mermaid diagrams, copy buttons, and the theme toggle. For granular control, use individual flags.

## Analytics

| Flag | Description |
|------|-------------|
| `--ga-measurement-id <id>` | Google Analytics 4 measurement ID (e.g. `G-XXXXXXXXXX`) |
| `--traffic-analytics` | Enable server-side traffic analytics |
| `--traffic-console` | Log traffic events as JSON lines to stdout |

```bash
# Add Google Analytics
mkdnsite --ga-measurement-id G-XXXXXXXXXX

# Debug traffic classification locally
mkdnsite --traffic-analytics --traffic-console
```

## Caching

| Flag | Description |
|------|-------------|
| `--cache` | Enable in-memory response caching (default: off) |
| `--no-cache` | Disable response caching |
| `--cache-max-age <seconds>` | `Cache-Control` max-age for HTML (default: 300) |
| `--cache-max-age-markdown <seconds>` | `Cache-Control` max-age for markdown (default: 300) |
| `--cache-swr <seconds>` | `stale-while-revalidate` seconds (default: 0, meaning omitted) |
| `--cache-version <tag>` | Version tag for `ETag` header (e.g. `v1.0.0` or git SHA) |

```bash
# Enable caching with custom TTL
mkdnsite --cache --cache-max-age 600

# Cache with stale-while-revalidate for CDN
mkdnsite --cache --cache-max-age 300 --cache-swr 60 --cache-version v1.4.1
```

## Security

| Flag | Description |
|------|-------------|
| `--no-csp` | Disable the `Content-Security-Policy` header |

The CSP header is enabled by default on all HTML responses. Use `--no-csp` to disable it, or configure additional allowed sources via the config file (see [Configuration — csp](/docs/configuration#csp)).

## Renderer

| Flag | Values | Description |
|------|--------|-------------|
| `--renderer <engine>` | `portable`, `bun-native` | Markdown rendering engine |

```bash
mkdnsite --renderer bun-native   # Bun only, faster but no full GFM support
mkdnsite --renderer portable     # works everywhere, full GFM support (default)
```

## Help and version

```bash
mkdnsite --help     # show all flags
mkdnsite -h

mkdnsite --version  # show version
mkdnsite -v
```

## Common patterns

### Blog with reading time and date

```bash
mkdnsite ./posts --preset blog --title "My Blog"
```

### Local docs site with full branding

```bash
mkdnsite ./content \
  --static ./static \
  --logo /logo.svg \
  --logo-text "My Project" \
  --accent "#0ea5e9" \
  --title "My Project Docs"
```

### Private/internal site (no AI exposure)

```bash
mkdnsite ./content \
  --no-negotiate \
  --no-llms-txt \
  --title "Internal Docs"
```

### Performance-optimized static output

```bash
mkdnsite ./content \
  --no-client-js \
  --color-scheme light
```

### Development with a named config file

```bash
# Use a project-specific config
mkdnsite --config docs.config.ts

# Override color scheme for testing
mkdnsite --config docs.config.ts --color-scheme dark
```

## Config parity

Every CLI flag maps to a field in `mkdnsite.config.ts`. CLI flags take precedence over the config file. This table shows the mapping:

| CLI flag | Config field |
|----------|-------------|
| `[directory]` | `contentDir` |
| `--config` | _(CLI only)_ |
| `--port` | `server.port` |
| `--title` | `site.title` |
| `--url` | `site.url` |
| `--og-image` | `site.og.image` |
| `--og-type` | `site.og.type` |
| `--twitter-card` | `site.og.twitterCard` |
| `--twitter-site` | `site.og.twitterSite` |
| `--static` | `staticDir` |
| `--color-scheme` | `theme.colorScheme` |
| `--theme-mode` | `theme.mode` |
| `--accent` | `theme.colors.accent` |
| `--logo` | `theme.logo.src` |
| `--logo-text` | `theme.logoText` |
| `--custom-css` | `theme.customCss` |
| `--custom-css-url` | `theme.customCssUrl` |
| `--no-builtin-css` | `theme.builtinCss: false` |
| `--font-body` | `theme.fonts.body` |
| `--font-mono` | `theme.fonts.mono` |
| `--font-heading` | `theme.fonts.heading` |
| `--no-mcp` | `mcp.enabled` |
| `--mcp-endpoint` | `mcp.endpoint` |
| `--github` | `github.owner` + `github.repo` |
| `--github-ref` | `github.ref` |
| `--github-path` | `github.path` |
| `--github-token` | `github.token` |
| `--preset` | `preset` |
| `--page-title` | `theme.pageTitle: true` |
| `--no-page-title` | `theme.pageTitle: false` |
| `--page-date` | `theme.pageDate: true` |
| `--no-page-date` | `theme.pageDate: false` |
| `--prev-next` | `theme.prevNext: true` |
| `--no-prev-next` | `theme.prevNext: false` |
| `--reading-time` | `theme.readingTime: true` |
| `--no-reading-time` | `theme.readingTime: false` |
| `--no-toc` | `theme.showToc: false` |
| `--no-nav` | `theme.showNav: false` |
| `--no-negotiate` | `negotiation.enabled: false` |
| `--no-llms-txt` | `llmsTxt.enabled: false` |
| `--renderer` | `renderer` |
| `--no-client-js` | `client.enabled: false` |
| `--no-theme-toggle` | `client.themeToggle: false` |
| `--no-math` | `client.math: false` |
| `--no-search` | `client.search: false` |
| `--no-charts` | `client.charts: false` |
| `--syntax-highlight` | `client.syntaxHighlight` |
| `--no-syntax-highlight` | `client.syntaxHighlight: false` |
| `--favicon` | `site.favicon.src` |
| `--no-footer` | `theme.showFooter: false` |
| `--ga-measurement-id` | `analytics.googleAnalytics.measurementId` |
| `--traffic-analytics` | `analytics.traffic.enabled: true` |
| `--traffic-console` | `analytics.traffic.console: true` |
| `--cache` | `cache.enabled: true` |
| `--no-cache` | `cache.enabled: false` |
| `--cache-max-age` | `cache.maxAge` |
| `--cache-max-age-markdown` | `cache.maxAgeMarkdown` |
| `--cache-swr` | `cache.staleWhileRevalidate` |
| `--cache-version` | `cache.versionTag` |
| `--no-csp` | `csp.enabled: false` |
