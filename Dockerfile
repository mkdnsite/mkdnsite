# ── Build stage ──────────────────────────────────────────────────────────────
FROM oven/bun:latest AS build

WORKDIR /app

# Install dependencies first (cache layer)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source and compile
COPY src/ src/
COPY tsconfig.json ./
RUN bun build --compile --target=bun-linux-x64 src/cli.ts --outfile /app/mkdnsite

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/mkdnsite /usr/local/bin/mkdnsite

# Default content directory
WORKDIR /site

EXPOSE 3000

ENTRYPOINT ["mkdnsite"]
CMD ["--port", "3000", "/site"]
