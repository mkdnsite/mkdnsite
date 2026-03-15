# ── Build stage ──────────────────────────────────────────────────────────────
FROM oven/bun:latest AS build

WORKDIR /app

# Install dependencies first (cache layer)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source and compile (auto-detects target platform)
COPY src/ src/
COPY tsconfig.json ./
RUN bun build --compile src/cli.ts --outfile /app/mkdnsite

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM gcr.io/distroless/cc-debian12

COPY --from=build /app/mkdnsite /usr/local/bin/mkdnsite

# Default content directory
WORKDIR /site

EXPOSE 3000

ENTRYPOINT ["mkdnsite"]
CMD ["--port", "3000", "/site"]
