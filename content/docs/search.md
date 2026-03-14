---
title: Search
description: Built-in full-text search with a ⌘K modal, server-side API, and result highlighting.
order: 7
---

# Search

mkdnsite includes built-in full-text search. It's enabled by default — no configuration needed.

## How it works

1. **Server-side index** — When the server starts (or on first search request), all pages are indexed using TF-IDF. The index lives in memory and is rebuilt automatically when content refreshes.
2. **`/api/search` endpoint** — The search modal queries `GET /api/search?q=<query>`. This endpoint returns ranked results as JSON.
3. **⌘K modal** — A keyboard-driven search modal lets users search without leaving the keyboard.
4. **Result highlighting** — Navigating to a result highlights the matching terms on the target page.

## Opening search

Three ways to open the search modal:

| Method | Action |
|--------|--------|
| Keyboard | `⌘K` (Mac) or `Ctrl+K` (Windows/Linux) |
| Button | Magnifying glass icon in the top-right corner |
| URL | Any page with `?q=<query>` — highlights matches directly |

## Keyboard shortcuts in the modal

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate results |
| `Enter` | Go to selected result |
| `Escape` | Close modal |

## Result highlighting

When you navigate to a page from a search result, mkdnsite:

1. Reads the `?q=` parameter from the URL
2. Removes it from the URL (via `history.replaceState`) so refreshing doesn't re-highlight
3. Wraps matching terms in `<mark>` elements inside the prose content area
4. Scrolls to the first match
5. Fades highlights out after 8 seconds (or on click)

Highlights skip `<code>` and `<pre>` blocks.

## `/api/search` endpoint

Query the search index directly:

```bash
curl "http://localhost:3000/api/search?q=configuration&limit=5"
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | `''` | Search query |
| `limit` | number | `10` | Max results (capped at 50) |

**Response:** JSON array of `SearchResult` objects:

```json
[
  {
    "slug": "/docs/configuration",
    "title": "Configuration",
    "description": "Complete reference for mkdnsite.config.ts",
    "excerpt": "…configure via mkdnsite.config.ts. All options…",
    "score": 0.842
  }
]
```

## How results are ranked

The search engine uses TF-IDF (term frequency × inverse document frequency) with field boosts:

| Field | Boost |
|-------|-------|
| Title | 3× |
| Description | 2× |
| Tags | 2× |
| Body | 1× |

Results are sorted by score descending. The excerpt shows ~150 characters around the first matching term in the page body.

## Disabling search

```typescript
// mkdnsite.config.ts
const config: Partial<MkdnSiteConfig> = {
  client: {
    search: false  // disables modal, /api/search, and highlighting
  }
}
```

Or via CLI:

```bash
mkdnsite --no-search
```

When disabled:
- The ⌘K button and modal are not rendered
- `/api/search` returns 404
- No highlight script is loaded

## Index refresh

The search index is rebuilt automatically when `/_refresh` is called:

```bash
curl -X POST http://localhost:3000/_refresh
```

In watch mode, the index rebuilds whenever content changes.

## Programmatic access

The search index is exported for use in your own code:

```typescript
import { createSearchIndex } from 'mkdnsite'
import { FilesystemSource } from 'mkdnsite'

const source = new FilesystemSource('./content')
const index = createSearchIndex()
await index.rebuild(source)

const results = index.search('configuration', 10)
console.log(results)
```
