---
title: Docker
description: Run mkdnsite as a Docker container.
order: 9
---

# Docker

Run mkdnsite in a container without installing any runtime.

## Quick start

```bash
docker run -p 3000:3000 -v ./content:/site mkdnsite/mkdnsite
```

## Build locally

```bash
docker build -t mkdnsite .
docker run -p 3000:3000 -v ./my-docs:/site mkdnsite
```

## With a GitHub source

```bash
docker run -p 3000:3000 mkdnsite/mkdnsite --github owner/repo
```

## Docker Compose

```yaml
services:
  docs:
    image: mkdnsite/mkdnsite
    ports:
      - "3000:3000"
    volumes:
      - ./content:/site
```

## Image details

The image uses a compiled binary (via `bun build --compile`) on Debian slim. No Bun, Node, or Deno runtime is included — just the self-contained `mkdnsite` executable. Image size is typically under 100MB.
