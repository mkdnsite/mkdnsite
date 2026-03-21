# ── Build stage ──────────────────────────────────────────────────────────────
FROM oven/bun:latest AS build

WORKDIR /app

# Install dependencies first (cache layer)
# Use --ignore-scripts to skip prepare (scripts/ not copied yet)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

# Copy source, scripts, and config
COPY src/ src/
COPY scripts/ scripts/
COPY tsconfig.json ./

# Generate version.ts from package.json, then compile
RUN bun run version:generate
RUN bun build --compile src/cli.ts --outfile /app/mkdnsite

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM gcr.io/distroless/cc-debian12

COPY --from=build /app/mkdnsite /usr/local/bin/mkdnsite

# Default content directory
WORKDIR /site

EXPOSE 3000

ENTRYPOINT ["mkdnsite"]
CMD ["--port", "3000", "/site"]
