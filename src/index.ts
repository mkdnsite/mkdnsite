/**
 * mkdnsite — Markdown for the web.
 * HTML for humans, Markdown for agents.
 *
 * @module mkdnsite
 */

// Core handler
export { createHandler } from './handler'
export type { HandlerOptions } from './handler'

// Config
export { resolveConfig, DEFAULT_CONFIG } from './config/defaults'
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
} from './config/schema'

// Content sources
export { FilesystemSource } from './content/filesystem'
export { GitHubSource } from './content/github'
export type {
  ContentSource,
  ContentPage,
  NavNode,
  MarkdownMeta,
  GitHubSourceConfig
} from './content/types'
export { parseFrontmatter } from './content/frontmatter'

// Rendering
export { createRenderer } from './render/types'
export type { MarkdownRenderer } from './render/types'
export { PortableRenderer } from './render/portable'
export { buildComponents } from './render/components/index'

// Content negotiation
export { negotiateFormat } from './negotiate/accept'
export type { ResponseFormat } from './negotiate/accept'
export { markdownHeaders, htmlHeaders, estimateTokens } from './negotiate/headers'

// Discovery
export { generateLlmsTxt } from './discovery/llmstxt'

// Adapters
export type { DeploymentAdapter } from './adapters/types'
export { detectRuntime } from './adapters/types'
export { LocalAdapter } from './adapters/local'
