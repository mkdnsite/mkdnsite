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
  ThemeConfig,
  NegotiationConfig,
  ClientConfig,
  ComponentOverrides,
  RendererEngine,
  HeadingProps,
  LinkProps,
  ImageProps,
  CodeBlockProps,
  InlineCodeProps
} from './config/schema.ts'

// Content sources
export { FilesystemSource } from './content/filesystem.ts'
export { GitHubSource } from './content/github.ts'
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
