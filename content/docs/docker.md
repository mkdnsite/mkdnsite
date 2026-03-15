---
title: Docker
description: Run mkdnsite as a Docker container.
order: 9
---

# Docker

Run mkdnsite in a container without installing any runtime.

## Quick start

```bash
docker run -p 3000:3000 -v ./content:/site nexdrew/mkdnsite
```

## Build locally

```bash
docker build -t mkdnsite .
docker run -p 3000:3000 -v ./my-docs:/site mkdnsite
```

## With a GitHub source

```bash
docker run -p 3000:3000 nexdrew/mkdnsite --github owner/repo
```

## Docker Compose

```yaml
services:
  docs:
    image: nexdrew/mkdnsite
    ports:
      - "3000:3000"
    volumes:
      - ./content:/site
```

## Image details

The image uses Google's distroless base (`gcr.io/distroless/cc-debian12`) with a compiled binary (via `bun build --compile`). No Bun, Node, or Deno runtime is included — just the self-contained `mkdnsite` executable. Multi-platform: `linux/amd64` and `linux/arm64`.

The container responds to Ctrl+C and `docker stop` — SIGINT and SIGTERM are handled for graceful shutdown.
