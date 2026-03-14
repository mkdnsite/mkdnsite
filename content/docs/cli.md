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

```bash
mkdnsite ./docs --static ./public
```

Static assets are served at the root: `./public/logo.png` → `/logo.png`.

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

## Navigation

| Flag | Description |
|------|-------------|
| `--no-nav` | Disable the navigation sidebar |

```bash
mkdnsite --no-nav   # single-page or minimal sites
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

```bash
# Maximum performance / accessibility
mkdnsite --no-client-js

# Keep mermaid and copy but remove theme toggle
mkdnsite --no-theme-toggle
```

> **Note:** `--no-client-js` disables everything including Mermaid diagrams, copy buttons, and the theme toggle. For granular control, use individual flags.

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
| `--no-nav` | `theme.showNav: false` |
| `--no-negotiate` | `negotiation.enabled: false` |
| `--no-llms-txt` | `llmsTxt.enabled: false` |
| `--renderer` | `renderer` |
| `--no-client-js` | `client.enabled: false` |
| `--no-theme-toggle` | `client.themeToggle: false` |
| `--no-math` | `client.math: false` |
