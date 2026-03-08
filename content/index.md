---
title: Welcome to mkdnsite
description: Markdown for the web. HTML for humans, Markdown for agents.
---

# Welcome to mkdnsite

**mkdnsite** turns a directory of Markdown files into a website — with zero build step.

Browsers see beautiful HTML. AI agents get clean Markdown. Same URL, same content, different format.

## How it works

| Client | Accept Header | Response |
|--------|--------------|----------|
| Browser | `text/html` | Rendered HTML with theme |
| Claude Code | `text/markdown, text/html` | Raw Markdown |
| curl (default) | `*/*` | Rendered HTML |
| Direct `.md` URL | — | Raw Markdown |

## Features

- **Zero build step** — runtime rendering via React SSR
- **Content negotiation** — standard HTTP `Accept` header
- **Auto `/llms.txt`** — AI agents discover your content
- **GitHub-Flavored Markdown** — tables, task lists, strikethrough
- **Mermaid diagrams** — rendered client-side
- **Dark mode** — respects system preference
- **Pluggable** — custom React components, themes, deployment targets

## Quick Start

```bash
bun add -g mkdnsite
mkdnsite ./my-content
```

Check out the [Getting Started](/docs/getting-started) guide.
