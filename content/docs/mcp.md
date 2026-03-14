---
title: MCP Server
description: Built-in Model Context Protocol server for AI agent access to your documentation.
order: 6
---

# MCP Server

mkdnsite includes a built-in [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server. When enabled, AI clients — Claude Desktop, Cursor, Cline, and any other MCP-compatible tool — can connect directly to your documentation and search, browse, and read pages using structured tools.

This is distinct from the `/llms.txt` endpoint (which is a static file for AI crawlers). MCP provides interactive, query-driven access.

## Quick start

The MCP server is enabled by default at `/mcp`. Start your docs server and connect your AI client:

```bash
mkdnsite ./content
# MCP endpoint: http://localhost:3000/mcp
```

## Available tools

### `search_docs`

Full-text search across all documentation pages using a TF-IDF index with boosts for title, description, and tags.

**Parameters:**
- `query` (string, required) — search query
- `limit` (number, optional, 1–50, default 10) — max results

**Returns:** array of `{ title, slug, description, excerpt, score }`

```
search_docs("getting started")
→ [{ title: "Getting Started", slug: "/docs/getting-started", excerpt: "…", score: 0.42 }]
```

### `get_page`

Retrieve the full markdown content of a page by its slug.

**Parameters:**
- `slug` (string, required) — page slug (e.g. `/docs/getting-started`)

**Returns:** markdown content with title and description header, or an error if not found.

```
get_page("/docs/configuration")
→ "# Configuration\n> Complete reference...\n\nmkdnsite is configured via..."
```

### `list_pages`

List all available documentation pages.

**Parameters:** none

**Returns:** array of `{ title, slug, description? }`

### `get_nav`

Get the full navigation tree structure.

**Parameters:** none

**Returns:** JSON nav tree (same structure as the sidebar).

## Connecting from AI clients

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-docs": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### Cursor

In Cursor settings → MCP → Add server:

```json
{
  "name": "my-docs",
  "url": "http://localhost:3000/mcp"
}
```

### Generic MCP client

The endpoint uses the [Streamable HTTP transport](https://spec.modelcontextprotocol.io/specification/2025-03-26/basic/transports/#streamable-http) (stateless mode). Any MCP client that supports HTTP transport can connect at:

```
http://your-host:port/mcp
```

## Resources

In addition to tools, each page is also exposed as an MCP **resource** at:

```
mkdnsite://pages/{slug}
```

MCP clients that support resource browsing can list and read pages directly.

## Search index

The search index is built lazily on the first MCP request and uses TF-IDF scoring with:

- **3× boost** for title matches
- **2× boost** for description matches
- **2× boost** for tag matches
- **Smoothed IDF** — single-document corpora still return results

The index is rebuilt automatically when `/_refresh` is called (e.g. in watch mode).

## Configuration

```typescript
mcp: {
  enabled: true,       // true (default) or false
  endpoint: '/mcp'     // URL path (default: /mcp)
}
```

CLI flags:

```bash
mkdnsite --no-mcp                     # disable MCP
mkdnsite --mcp-endpoint /api/mcp      # custom path
```

## Disabling MCP

For public-facing production sites, you may want to disable MCP to avoid exposing your content source structure:

```bash
mkdnsite --no-mcp --no-llms-txt
```

Or in config:

```typescript
const config: Partial<MkdnSiteConfig> = {
  mcp: { enabled: false },
  llmsTxt: { enabled: false }
}
```

## Runtime compatibility

The MCP server uses `WebStandardStreamableHTTPServerTransport` from the MCP SDK, which relies on Web Standard APIs (`Request`, `Response`, `ReadableStream`). It works on **Bun** and **Node.js 22+**.

Deno compatibility depends on whether `@modelcontextprotocol/sdk` loads correctly under Deno's npm compatibility layer — this is not yet verified.
