---
title: Frontmatter
description: Page metadata reference — all supported YAML frontmatter fields.
order: 6
---

# Frontmatter

Frontmatter is YAML metadata at the top of a `.md` file, wrapped in `---` delimiters. mkdnsite reads it to populate page titles, control nav ordering, set descriptions, and more.

## Syntax

```markdown
---
title: My Page
description: A short description of this page.
order: 2
draft: false
---

# My Page

Content starts here...
```

The frontmatter block must be at the very start of the file — no whitespace before the opening `---`.

## Fields

### `title`

```yaml
title: Getting Started
```

- Used as the `<title>` element: `Getting Started — My Site`
- Used as the page's nav sidebar label
- Used as the `<h1>` if no heading is present in the body (planned)
- If omitted, mkdnsite derives the title from the filename

### `description`

```yaml
description: Install and run mkdnsite in under a minute.
```

- Used as the `<meta name="description">` tag
- Appears in `/llms.txt` as the page description
- Shown in search results (when search is implemented)

### `order`

```yaml
order: 1
```

Controls position in the navigation sidebar. Lower numbers appear first.

```
order: 1  → Getting Started    (first)
order: 2  → Configuration
order: 3  → CLI Reference
...
order: 99 → (near the bottom)
```

Pages without an `order` field default to `999` and sort alphabetically among themselves.

Directories can also have an `order` via their `index.md`:

```markdown
---
title: Reference
order: 10
---
```

### `draft`

```yaml
draft: true
```

Excludes the page from:
- The navigation sidebar
- `/llms.txt` listing
- The `listPages()` content source API

The page is still accessible at its URL — it's just hidden from navigation and discovery. Useful for work-in-progress content.

### `date`

```yaml
date: 2024-01-15
```

Publish date. Displayed below the page title when `theme.pageDate` is enabled (via `--page-date` or `--preset blog`). Uses `Intl.DateTimeFormat` with the site's `lang` for locale-aware formatting — so `2024-03-01` renders as "March 1, 2024" for English sites.

### `updated`

```yaml
updated: 2024-06-01
```

Last updated date. When `theme.pageDate` is enabled and both `date` and `updated` are present, the rendered output shows both: the publish date followed by "Updated [date]". If only `date` is set, only the publish date appears.

### `tags`

```yaml
tags: [javascript, tutorial, beginner]
```

Tag array displayed as pill badges below the article content. Tags provide at-a-glance categorization for readers.

```yaml
tags:
  - javascript
  - tutorial
  - beginner
```

Both inline and multi-line YAML array syntax are supported.

### `layout`

```yaml
layout: blog-post
```

Layout template identifier. Planned feature — will allow different page templates. Currently not implemented.

### `og_image`

```yaml
og_image: https://example.com/this-page-image.png
```

Overrides the site-level `og.image` config for this page. Use for pages that have a specific image (e.g. a blog post hero image, a product screenshot).

### `og_type`

```yaml
og_type: product
```

Overrides the default `og:type` for this page. The default is `'website'` for the root (`/`) and `'article'` for all other pages. Common values: `website`, `article`, `product`, `profile`.

### Custom fields

Any additional frontmatter fields are preserved in the `meta` object and accessible to custom components:

```yaml
---
title: API Reference
author: Jane Smith
version: 2.0
badge: stable
---
```

These fields are available as `meta.author`, `meta.version`, etc. in custom `DeploymentAdapter` implementations and component overrides.

## YAML basics

Frontmatter is standard YAML. A few things worth knowing:

```yaml
# Strings — quotes optional for simple values
title: Getting Started
title: "Getting Started"  # same thing

# Strings with special chars — quotes required
description: "Config options: all of them"

# Numbers
order: 1
port: 3000

# Booleans
draft: true
draft: false

# Arrays — inline syntax
tags: [one, two, three]

# Arrays — block syntax
tags:
  - one
  - two
  - three

# Nested objects
logo:
  src: /logo.png
  alt: My Site
```

## Effect on navigation

The nav sidebar is built from the file tree. Frontmatter controls:

1. **Label** — `title` field becomes the nav item label
2. **Order** — `order` field controls position within a section
3. **Visibility** — `draft: true` hides the page from nav

Index files (`index.md`, `README.md`, `readme.md`) set the title and order of their parent directory section but don't appear as separate nav items.

### Example nav ordering

Given these files:

```
content/
  index.md                 (order: not set → 999)
  docs/
    index.md               (order: 0 → makes "Docs" section appear first)
    getting-started.md     (order: 1)
    configuration.md       (order: 2)
    advanced.md            (order: 99)
    wip-feature.md         (draft: true → hidden)
```

The nav renders:

```
Docs
  Getting Started
  Configuration
  Advanced
```

`wip-feature.md` is accessible at `/docs/wip-feature` but doesn't appear in the sidebar.

## Full example

```markdown
---
title: Building a Custom Theme
description: Step-by-step guide to creating a fully custom visual theme for mkdnsite.
order: 4
tags: [theming, css, customization]
date: 2024-03-01
updated: 2024-06-15
draft: false
---

# Building a Custom Theme

...
```
