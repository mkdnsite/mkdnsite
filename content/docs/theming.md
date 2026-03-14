---
title: Theming
description: Customize colors, fonts, logos, and CSS in mkdnsite.
order: 5
---

# Theming

mkdnsite's built-in theme is designed to look great out of the box. When you're ready to make it yours, there are multiple layers of customization available.

## Theme modes

| Mode | Description |
|------|-------------|
| `'prose'` | Built-in shadcn/Radix-inspired typography (default) |
| `'components'` | Full custom React component overrides per element |

```typescript
theme: {
  mode: 'prose'  // or 'components'
}
```

**`prose` mode** is zero-config. The `.mkdn-prose` class applies rich typography to all markdown output. Start here — you can customize everything via CSS variables and `customCss`.

**`components` mode** lets you replace every markdown element with your own React component. You're responsible for all styling. This is the escape hatch for full design control.

---

## Color scheme

```typescript
theme: {
  colorScheme: 'system'  // 'system' | 'light' | 'dark'
}
```

| Value | Behavior |
|-------|----------|
| `'system'` | Follows OS dark/light preference. Respects user override via toggle. |
| `'light'` | Always light. Theme toggle hidden. |
| `'dark'` | Always dark. Theme toggle hidden. |

When `colorScheme` is `'system'`, mkdnsite uses a blocking `<script>` in `<head>` to read localStorage and set `data-theme` before paint — no flash of unstyled content (FOUC).

---

## Color tokens

Override any CSS variable with the `colors` (light) and `colorsDark` (dark) config options.

```typescript
theme: {
  colors: {
    accent: '#7c3aed',
    text: '#1c1917',
    textMuted: '#78716c',
    bg: '#ffffff',
    bgAlt: '#fafaf9',
    border: '#e7e5e4',
    link: '#7c3aed',
    linkHover: '#6d28d9',
    codeBg: 'rgba(124,58,237,0.08)',
    preBg: '#fafaf9'
  },
  colorsDark: {
    accent: '#a78bfa',
    text: '#fafaf9',
    textMuted: '#a8a29e',
    bg: '#0c0a09',
    bgAlt: '#1c1917',
    border: '#292524',
    link: '#a78bfa',
    linkHover: '#c4b5fd',
    codeBg: 'rgba(167,139,250,0.12)',
    preBg: '#1c1917'
  }
}
```

### CSS variable reference

| Token | CSS variable | Default (light) | Default (dark) |
|-------|-------------|-----------------|----------------|
| `accent` | `--mkdn-accent` | `#0969da` | `#58a6ff` |
| `text` | `--mkdn-text` | `#1f2328` | `#e6edf3` |
| `textMuted` | `--mkdn-text-muted` | `#656d76` | `#8d96a0` |
| `bg` | `--mkdn-bg` | `#ffffff` | `#0d1117` |
| `bgAlt` | `--mkdn-bg-alt` | `#f6f8fa` | `#161b22` |
| `border` | `--mkdn-border` | `#d0d7de` | `#30363d` |
| `link` | `--mkdn-link` | `var(--mkdn-accent)` | `var(--mkdn-accent)` |
| `linkHover` | `--mkdn-link-hover` | `#0550ae` | `#79c0ff` |
| `codeBg` | `--mkdn-code-bg` | `rgba(175,184,193,0.2)` | `rgba(110,118,129,0.4)` |
| `preBg` | `--mkdn-pre-bg` | `#f6f8fa` | `#161b22` |

> **Tip:** `--mkdn-link` defaults to `var(--mkdn-accent)`, so setting `accent` also updates link colors automatically. Set `link` explicitly to override.

### Dark mode selectors

Dark mode overrides use two selectors to ensure correctness:

```css
/* 1. Primary: user has set data-theme="dark" (JS-enabled) */
[data-theme="dark"] { --mkdn-accent: #58a6ff; }

/* 2. No-JS fallback: respect OS preference when no data-theme is set */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) { --mkdn-accent: #58a6ff; }
}
```

This means dark mode works correctly even without JavaScript.

---

## Font tokens

```typescript
theme: {
  fonts: {
    body: '"Inter", -apple-system, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
    heading: '"Playfair Display", Georgia, serif'
  }
}
```

| Token | CSS variable | Default |
|-------|-------------|---------|
| `body` | `--mkdn-font` | System UI stack |
| `mono` | `--mkdn-mono` | System mono stack |
| `heading` | `--mkdn-font-heading` | `var(--mkdn-font)` |

`heading` defaults to the body font. Set it explicitly for a serif/display heading look.

For web fonts, combine with `customCssUrl`:

```typescript
theme: {
  customCssUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Playfair+Display:ital,wght@0,700;1,400&display=swap',
  fonts: {
    body: '"Inter", sans-serif',
    heading: '"Playfair Display", serif'
  }
}
```

---

## Logo and site name

Displayed in the nav sidebar header above the page list.

```typescript
theme: {
  logo: {
    src: '/logo.png',   // URL path (from staticDir)
    alt: 'My Project',
    width: 32,
    height: 32
  },
  logoText: 'My Project'
}
```

The `logo.src` is a **URL path**, not a filesystem path. Serve the file via `staticDir`:

```typescript
staticDir: './static'
// ./static/logo.png is served at /logo.png
```

You can use logo, logoText, or both together. Both are optional.

---

## Custom CSS

### Inline CSS

Append custom CSS after the built-in styles:

```typescript
theme: {
  customCss: `
    .mkdn-main { max-width: 1000px; }
    .mkdn-prose h1 { color: var(--mkdn-accent); }
  `
}
```

Good for small tweaks. The inline CSS loads synchronously in `<style>` so there's no flash.

### External stylesheet

Load a full custom stylesheet via `<link rel="stylesheet">`:

```typescript
theme: {
  customCssUrl: '/my-theme.css'
}
```

The link loads in `<head>` after the built-in `<style>`. This is how the `zen-theme.css` example works in this repo.

### Disable built-in CSS

Strip all built-in styles and start from scratch:

```typescript
theme: {
  builtinCss: false,
  customCssUrl: '/my-complete-theme.css'
}
```

The base layout structure (`.mkdn-layout`, `.mkdn-nav`, `.mkdn-main`) and CSS variables are still available in your stylesheet — just the visual styling is gone.

---

## Theme toggle

The light/dark toggle button appears in the top-right corner when `colorScheme: 'system'` and `client.themeToggle: true` (both default).

Clicking it triggers a circular reveal animation using the [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API). The animation expands from the button position. Falls back gracefully in browsers without View Transitions support.

The user's preference is saved in `localStorage` as `mkdn-theme`.

Disable the toggle:

```typescript
client: {
  themeToggle: false
}
```

Or force a fixed color scheme:

```typescript
theme: {
  colorScheme: 'dark'  // toggle is automatically hidden
}
```

---

## Syntax highlighting

mkdnsite uses [Shiki](https://shiki.style/) for syntax highlighting. Themes are applied server-side — no client-side execution, no layout shift.

```typescript
theme: {
  syntaxTheme: 'github-light',
  syntaxThemeDark: 'github-dark'
}
```

Shiki uses CSS variables (`--shiki-light`, `--shiki-dark`) to implement dual-theme highlighting. Switching color scheme doesn't require re-rendering — the CSS handles it.

Any [Shiki theme](https://shiki.style/themes) works. Popular choices:

| Light | Dark |
|-------|------|
| `github-light` | `github-dark` |
| `one-light` | `one-dark-pro` |
| `catppuccin-latte` | `catppuccin-mocha` |
| `rose-pine-dawn` | `rose-pine` |
| `solarized-light` | `solarized-dark` |

---

## Examples

### Simple accent change

```typescript
theme: {
  colors: { accent: '#e11d48' },
  colorsDark: { accent: '#fb7185' }
}
```

Because `--mkdn-link` derives from `--mkdn-accent`, this also updates all link colors.

### Purple docs site

```typescript
theme: {
  colors: {
    accent: '#7c3aed',
    link: '#7c3aed',
    bg: '#faf5ff',
    bgAlt: '#f3e8ff',
    border: '#e9d5ff'
  },
  colorsDark: {
    accent: '#a78bfa',
    link: '#a78bfa',
    bg: '#0c0414',
    bgAlt: '#1a0533',
    border: '#2d1b52'
  }
}
```

### Dramatically different look (CSS Zen Garden style)

```typescript
theme: {
  builtinCss: true,   // keep the base layout
  customCssUrl: '/zen-theme.css',
  fonts: {
    heading: '"Playfair Display", serif',
    body: '"Source Sans 3", sans-serif'
  },
  colors: {
    accent: '#b5851a',
    bg: '#faf6ee',
    preBg: '#f5f0e6'
  },
  colorsDark: {
    accent: '#d4a82a',
    bg: '#17120b',
    preBg: '#0c0904'
  }
}
```

See `themed.config.ts` and `static/zen-theme.css` in the mkdnsite repo for a full working example. Run it with:

```bash
bun run dev:themed    # zen theme
bun run dev:light     # force light mode
bun run dev:dark      # force dark mode
```
