---
title: Configuration
description: Complete reference for mkdnsite.config.ts — every option explained.
order: 2
---

# Configuration

mkdnsite is configured via a `mkdnsite.config.ts` file at your project root. All options can also be set via [CLI flags](/docs/cli) — the two are equivalent.

## Config file

Create `mkdnsite.config.ts` in your project root:

```typescript
import type { MkdnSiteConfig } from 'mkdnsite'

const config: Partial<MkdnSiteConfig> = {
  site: {
    title: 'My Docs',
    description: 'Documentation for my project.',
    url: 'https://docs.example.com'
  },
  theme: {
    colorScheme: 'system',
    colors: {
      accent: '#7c3aed'
    }
  }
}

export default config
```

When you run `mkdnsite`, it auto-detects `mkdnsite.config.ts` in the current working directory. Use `--config <path>` to specify a different file.

## Top-level options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `contentDir` | `string` | `'./content'` | Path to the directory containing `.md` files |
| `staticDir` | `string` | — | Directory for static assets (images, CSS, etc.) served at `/` |
| `github` | `GitHubSourceConfig` | — | Serve a GitHub repository instead of a local directory |
| `preset` | `'docs' \| 'blog'` | — | Apply sensible defaults for a docs or blog use case |
| `renderer` | `'portable' \| 'bun-native'` | `'portable'` | Markdown renderer engine |

### `contentDir`

```typescript
contentDir: './docs'  // serve from ./docs instead of ./content
```

Also settable with: `mkdnsite ./docs` (positional argument)

### `staticDir`

```typescript
staticDir: './static'  // serve ./static/logo.png at /logo.png
```

Also settable with: `--static <dir>`

### `staticHandler` (programmatic API only)

A callback for serving static assets in non-filesystem deployments (Cloudflare Workers + R2, Vercel Edge, Deno Deploy). When set, it is called instead of the built-in filesystem `serveStatic` for requests with static file extensions.

```typescript
import { createHandler, resolveConfig } from 'mkdnsite'

const handler = createHandler({
  source,
  renderer,
  config,
  // Read static files from Cloudflare R2
  staticHandler: async (pathname) => {
    const key = pathname.replace(/^\//, '')
    const obj = await env.STATIC_BUCKET.get(key)
    if (obj == null) return null  // fall through to built-in serveStatic or 404
    return new Response(await obj.text(), {
      headers: { 'Content-Type': 'image/png' }
    })
  }
})
```

**Behaviour**: return a `Response` to serve it directly, or `null` to fall through to the built-in `serveStatic` (if `staticDir` is set) or ultimately a 404.

This option is **programmatic-only** — it accepts a function and cannot be set from a config file or CLI flag. Use `staticDir` for local/filesystem deployments.

If you are using the `CloudflareAdapter`, call `adapter.createStaticHandler()` to get a pre-built R2-backed handler:

```typescript
const handler = createHandler({
  source: adapter.createContentSource(config),
  renderer: await adapter.createRenderer(config),
  config,
  staticHandler: adapter.createStaticHandler()  // reads from STATIC_BUCKET R2 binding
})
```

### `github`

Serve content from a public GitHub repository instead of a local directory. When set, `contentDir` is ignored.

```typescript
github: {
  owner: 'mkdnsite',   // GitHub user or org
  repo: 'mkdnsite',    // repository name
  ref: 'main',         // branch, tag, or commit SHA (default: 'main')
  path: 'content',     // subdirectory within the repo (optional)
  token: process.env.GITHUB_TOKEN  // for private repos or higher rate limits
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `owner` | `string` | — | GitHub user or organization name |
| `repo` | `string` | — | Repository name |
| `ref` | `string` | `'main'` | Branch, tag, or commit SHA to serve |
| `path` | `string` | — | Subdirectory within the repo to treat as content root |
| `token` | `string` | — | GitHub personal access token (increases API rate limit from 60 to 5,000 req/hr). Also reads `GITHUB_TOKEN` or `MKDNSITE_GITHUB_TOKEN` env var when not set explicitly. |

**Caching:** File contents and the repository tree are cached for 5 minutes. Call `source.refresh()` to invalidate (done automatically in watch mode). On first request, all `.md` files are fetched in parallel and cached together.

**Rate limits:** The GitHub Git Trees API (file listing) counts toward your rate limit — one call per 5-minute window. File content is fetched from `raw.githubusercontent.com` which has generous limits.

CLI flags: `--github <owner/repo>`, `--github-ref`, `--github-path`, `--github-token`

---

### `preset`

Apply a preset to get sensible defaults for a common use case without per-field configuration. User values always win — the preset is applied first and any explicit setting overrides it.

Merge order: `DEFAULT_CONFIG → preset → user config`

| Preset | Effect |
|--------|--------|
| `'docs'` | Enables `showNav`, `showToc`, `prevNext`. Disables `pageTitle`, `pageDate`, `readingTime`. Best for documentation sites. |
| `'blog'` | Enables `pageTitle`, `pageDate`, `readingTime`, `prevNext`. Disables `showNav`, `showToc`. Best for blog posts. |

```typescript
preset: 'blog'  // then override individual options as needed
```

CLI flag: `--preset <name>`

---

### `renderer`

- `'portable'` — uses react-markdown + remark/rehype plugins. Works on Bun, Node, and Deno. Full GFM support.
- `'bun-native'` — uses `Bun.markdown.react()`. Faster, but Bun only. **Does not fully support GFM** — task list checkboxes are stripped, and other GFM features may behave differently. Use this when you need raw speed and don't rely on full GFM rendering.

Also settable with: `--renderer <engine>`

---

## `site`

Site metadata used in `<title>`, `<meta>`, and `/llms.txt`.

```typescript
site: {
  title: 'My Docs',
  description: 'Documentation for my project.',
  url: 'https://docs.example.com',
  lang: 'en'
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | `string` | `'mkdnsite'` | Site name, appears in `<title>` as `Page — Site` |
| `description` | `string` | — | Meta description, also used in `/llms.txt` |
| `url` | `string` | — | Base URL for absolute links and sitemaps |
| `lang` | `string` | `'en'` | HTML `lang` attribute |
| `og` | `OgConfig` | — | OpenGraph / social sharing configuration (see below) |

CLI flags: `--title`, `--url`

### `site.og` — OpenGraph / social meta tags

Controls the `og:*` and `twitter:*` meta tags that generate rich preview cards in Slack, Discord, iMessage, and social platforms.

```typescript
site: {
  title: 'My Docs',
  url: 'https://docs.example.com',
  og: {
    image: 'https://docs.example.com/og-image.png',
    type: 'website',
    twitterCard: 'summary_large_image',
    twitterSite: '@myproject'
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `og.image` | `string` | — | Default OG image URL. Override per-page via `og_image` frontmatter. |
| `og.type` | `string` | `'website'` for `/`, `'article'` for other pages | Default `og:type` value |
| `og.twitterCard` | `'summary' \| 'summary_large_image'` | `'summary'` | Twitter card display style |
| `og.twitterSite` | `string` | — | Twitter `@handle` for the site |

**Tags always emitted:** `og:title`, `og:type`, `og:site_name`, `twitter:card`, `twitter:title`

**Tags emitted when data is available:** `og:description`, `og:url` (requires `site.url`), `og:image`, `twitter:description`, `twitter:image`, `twitter:site`

CLI flags: `--og-image`, `--og-type`, `--twitter-card`, `--twitter-site`

---

## `server`

Local development server settings. Not used in edge/serverless deployments.

```typescript
server: {
  port: 3000,
  hostname: '0.0.0.0'
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `3000` | Port to listen on |
| `hostname` | `string` | `'0.0.0.0'` | Hostname to bind to |

CLI flags: `-p, --port`

---

## `theme`

Controls visual presentation. All theme options work with the built-in `prose` mode.

```typescript
theme: {
  mode: 'prose',
  colorScheme: 'system',
  colors: {
    accent: '#7c3aed'
  },
  colorsDark: {
    accent: '#a78bfa'
  },
  logo: {
    src: '/logo.svg',
    alt: 'My Project'
  },
  logoText: 'My Project'
}
```

### `mode`

| Value | Description |
|-------|-------------|
| `'prose'` | Built-in shadcn/Radix-inspired typography (default) |
| `'components'` | Full React component overrides — you style everything |

CLI flag: `--theme-mode`

### `colorScheme`

| Value | Description |
|-------|-------------|
| `'system'` | Follow OS preference (default) |
| `'light'` | Always light mode |
| `'dark'` | Always dark mode |

CLI flag: `--color-scheme`

### `colors` and `colorsDark`

Override CSS variables for light and dark modes. See [Theming](/docs/theming) for full details.

```typescript
colors: {
  accent: '#7c3aed',     // --mkdn-accent
  text: '#1c1917',       // --mkdn-text
  textMuted: '#78716c',  // --mkdn-text-muted
  bg: '#ffffff',         // --mkdn-bg
  bgAlt: '#fafaf9',      // --mkdn-bg-alt
  border: '#e7e5e4',     // --mkdn-border
  link: '#7c3aed',       // --mkdn-link
  linkHover: '#6d28d9',  // --mkdn-link-hover
  codeBg: 'rgba(124,58,237,0.08)', // --mkdn-code-bg
  preBg: '#fafaf9'       // --mkdn-pre-bg
}
```

CLI flag: `--accent` (shortcut for `colors.accent`)

### `fonts`

```typescript
fonts: {
  body: '"Inter", sans-serif',           // --mkdn-font
  mono: '"JetBrains Mono", monospace',   // --mkdn-mono
  heading: '"Playfair Display", serif'   // --mkdn-font-heading
}
```

CLI flags: `--font-body`, `--font-mono`, `--font-heading`

### `logo` and `logoText`

Displayed in the nav sidebar header.

```typescript
logo: {
  src: '/logo.png',   // URL path (served from staticDir)
  alt: 'My Project',
  width: 32,          // pixels, default 32
  height: 32          // pixels, default 32
},
logoText: 'My Project'
```

CLI flags: `--logo <url-path>`, `--logo-text <text>`

### `customCss` and `customCssUrl`

```typescript
// Inline CSS appended after built-in styles
customCss: '.mkdn-main { max-width: 1000px; }',

// External stylesheet loaded via <link rel="stylesheet">
customCssUrl: '/my-theme.css'
```

CLI flags: `--custom-css <css>`, `--custom-css-url <url>`

### `builtinCss`

Set to `false` to strip all built-in styles and start from scratch. Useful when you want to provide a completely custom stylesheet.

```typescript
builtinCss: false,
customCssUrl: '/my-complete-theme.css'
```

CLI flag: `--no-builtin-css`

### Other theme options

| Option | Type | Default | CLI flag(s) | Description |
|--------|------|---------|------------|-------------|
| `showNav` | `boolean` | `true` | `--no-nav` | Show the navigation sidebar |
| `showToc` | `boolean` | `true` | `--no-toc` | Show table of contents sidebar |
| `pageTitle` | `boolean` | `false` | `--page-title` / `--no-page-title` | Render frontmatter `title` as `<h1>` above content |
| `pageDate` | `boolean` | `false` | `--page-date` / `--no-page-date` | Render `date`/`updated` from frontmatter below page title |
| `readingTime` | `boolean` | `false` | `--reading-time` / `--no-reading-time` | Show estimated reading time (238 wpm) |
| `prevNext` | `boolean` | `false` | `--prev-next` / `--no-prev-next` | Show prev/next page navigation links at bottom |
| `editUrl` | `string` | — | — | Edit URL template, e.g. `https://github.com/org/repo/edit/main/{path}` |
| `syntaxTheme` | `string` | `'github-light'` | — | Shiki light mode syntax theme |
| `syntaxThemeDark` | `string` | `'github-dark'` | — | Shiki dark mode syntax theme |

---

## `negotiation`

Controls HTTP content negotiation behavior.

```typescript
negotiation: {
  enabled: true,
  includeTokenCount: true,
  contentSignals: {
    aiTrain: 'yes',
    search: 'yes',
    aiInput: 'yes'
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable serving raw Markdown via `Accept: text/markdown` |
| `includeTokenCount` | `boolean` | `true` | Include `x-markdown-tokens` header |
| `contentSignals.aiTrain` | `'yes' \| 'no'` | `'yes'` | Allow AI training on this content |
| `contentSignals.search` | `'yes' \| 'no'` | `'yes'` | Allow search indexing |
| `contentSignals.aiInput` | `'yes' \| 'no'` | `'yes'` | Allow use as AI context |

CLI flag: `--no-negotiate`

See [Content Negotiation](/docs/content-negotiation) for details.

---

## `llmsTxt`

Auto-generates `/llms.txt` — a standard index for AI agents to discover your content.

```typescript
llmsTxt: {
  enabled: true,
  description: 'Documentation for my project.',
  sections: {
    'API Reference': 'Detailed API documentation',
    'Guides': 'Step-by-step tutorials'
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Generate `/llms.txt` |
| `description` | `string` | — | Site description in the file |
| `sections` | `Record<string, string>` | — | Custom section headers and descriptions |

CLI flag: `--no-llms-txt`

---

## `client`

Client-side JavaScript enhancements. Disable any combination as needed.

```typescript
client: {
  enabled: true,      // master switch
  themeToggle: true,  // light/dark toggle button
  math: true,         // KaTeX math rendering
  mermaid: true,      // Mermaid diagram rendering
  copyButton: true,   // copy-to-clipboard on code blocks
  search: true        // ⌘K search modal + /api/search endpoint
}
```

| Option | Default | CLI flag |
|--------|---------|----------|
| `enabled` | `true` | `--no-client-js` |
| `themeToggle` | `true` | `--no-theme-toggle` |
| `math` | `true` | `--no-math` |
| `mermaid` | `true` | — |
| `copyButton` | `true` | — |
| `search` | `true` | `--no-search` |
| `charts` | `true` | `--no-charts` |

### `client.search`

When `true` (default), enables:

- **⌘K modal** — press `⌘K` (Mac) or `Ctrl+K` (Windows/Linux) to open a search modal. Also accessible via the magnifying glass button in the top-right corner.
- **`/api/search` endpoint** — `GET /api/search?q=<query>&limit=<n>` returns a JSON array of `SearchResult` objects.
- **Result highlighting** — navigating to a page via a search result appends `?q=<query>` to the URL. On load, matched terms are highlighted in the page body and the page scrolls to the first match. Highlights fade after 8 seconds.

The search index is built server-side using TF-IDF with 3× boost for title, 2× for description and tags. See the [search guide](/docs/search) for details.

> **Note:** `--no-client-js` disables everything. Individual `--no-*` flags disable specific features while leaving others enabled.

---

## `mcp`

Built-in MCP (Model Context Protocol) server for AI agent access to your documentation.

```typescript
mcp: {
  enabled: true,
  endpoint: '/mcp'   // MCP server URL path
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable the built-in MCP server |
| `endpoint` | `string` | `'/mcp'` | URL path for the MCP endpoint |

When enabled, AI clients (Claude Desktop, Cursor, etc.) can connect at `http://localhost:3000/mcp` and use the built-in tools: `search_docs`, `get_page`, `list_pages`, and `get_nav`.

CLI flags: `--no-mcp`, `--mcp-endpoint <path>`

See the [MCP guide](/docs/mcp) for full details.

---

## Complete example

```typescript
import type { MkdnSiteConfig } from 'mkdnsite'

const config: Partial<MkdnSiteConfig> = {
  contentDir: './content',
  staticDir: './static',

  site: {
    title: 'My Project Docs',
    description: 'Comprehensive documentation for My Project.',
    url: 'https://docs.myproject.com',
    lang: 'en'
  },

  server: {
    port: 4000,
    hostname: 'localhost'
  },

  preset: 'docs',

  theme: {
    mode: 'prose',
    colorScheme: 'system',
    logo: {
      src: '/logo.svg',
      alt: 'My Project',
      width: 32,
      height: 32
    },
    logoText: 'My Project',
    colors: {
      accent: '#7c3aed',
      link: '#7c3aed'
    },
    colorsDark: {
      accent: '#a78bfa',
      link: '#a78bfa'
    },
    syntaxTheme: 'github-light',
    syntaxThemeDark: 'github-dark',
    showNav: true,
    showToc: true,
    prevNext: true,
    editUrl: 'https://github.com/myorg/myproject/edit/main/content/{path}'
  },

  negotiation: {
    enabled: true,
    includeTokenCount: true,
    contentSignals: {
      aiTrain: 'yes',
      search: 'yes',
      aiInput: 'yes'
    }
  },

  llmsTxt: {
    enabled: true,
    description: 'Comprehensive documentation for My Project.'
  },

  client: {
    enabled: true,
    themeToggle: true,
    math: true,
    mermaid: true,
    copyButton: true,
    search: true
  },

  renderer: 'portable'
}

export default config
```
