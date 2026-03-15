/**
 * mkdnsite — Markdown for the web.
 * HTML for humans, Markdown for agents.
 *
 * @module mkdnsite
 */

// Core handler
export { createHandler } from './handler.ts'
export type { HandlerOptions } from './handler.ts'

// Config
export { resolveConfig, DEFAULT_CONFIG } from './config/defaults.ts'
export type {
  MkdnSiteConfig,
  SiteConfig,
  OgConfig,
  AnalyticsConfig,
  CspConfig,
  FaviconConfig,
  ThemeConfig,
  NegotiationConfig,
  ClientConfig,
  ComponentOverrides,
  RendererEngine,
  HeadingProps,
  LinkProps,
  ImageProps,
  CodeBlockProps,
  InlineCodeProps,
  ColorTokens,
  FontTokens,
  LogoConfig
} from './config/schema.ts'

// Theme utilities
export { buildThemeCss } from './theme/build-css.ts'
export { BASE_THEME_CSS } from './theme/base-css.ts'

// Content sources
export { FilesystemSource } from './content/filesystem.ts'
export { GitHubSource } from './content/github.ts'
export { R2ContentSource } from './content/r2.ts'
export type { R2ContentSourceConfig } from './content/r2.ts'
export { AssetsSource } from './content/assets.ts'
export type { AssetsSourceConfig } from './content/assets.ts'
export { buildNavTree } from './content/nav-builder.ts'
export type { ContentCache } from './content/cache.ts'
export { MemoryContentCache, KVContentCache } from './content/cache.ts'
export type { FileEntry } from './content/nav-builder.ts'
export type {
  ContentSource,
  ContentPage,
  NavNode,
  MarkdownMeta,
  GitHubSourceConfig
} from './content/types.ts'
export { parseFrontmatter } from './content/frontmatter.ts'

// Rendering
export { createRenderer } from './render/types.ts'
export type { MarkdownRenderer } from './render/types.ts'
export { PortableRenderer } from './render/portable.ts'
export { buildComponents } from './render/components/index.ts'

// Content negotiation
export { negotiateFormat } from './negotiate/accept.ts'
export type { ResponseFormat } from './negotiate/accept.ts'
export { markdownHeaders, htmlHeaders, estimateTokens } from './negotiate/headers.ts'

// Discovery
export { generateLlmsTxt } from './discovery/llmstxt.ts'

// Adapters
export type { DeploymentAdapter } from './adapters/types.ts'
export { detectRuntime } from './adapters/types.ts'
export { LocalAdapter } from './adapters/local.ts'
export { CloudflareAdapter } from './adapters/cloudflare.ts'
export type { CloudflareEnv } from './adapters/cloudflare.ts'

// Search
export { createSearchIndex } from './search/index.ts'
export type { SearchIndex, SearchResult } from './search/index.ts'

// MCP
export { createMcpServer } from './mcp/server.ts'
export { createMcpHandler } from './mcp/transport.ts'
export type { McpConfig } from './config/schema.ts'

// Traffic analytics
export type {
  TrafficAnalytics,
  TrafficEvent,
  TrafficType,
  AnalyticsResponseFormat
} from './analytics/types.ts'
export { classifyTraffic, BOT_PATTERNS } from './analytics/classify.ts'
export { NoopAnalytics } from './analytics/noop.ts'
export { ConsoleAnalytics } from './analytics/console.ts'
export { WorkersAnalyticsEngineAnalytics } from './adapters/cloudflare.ts'
export type { TrafficAnalyticsConfig } from './config/schema.ts'
