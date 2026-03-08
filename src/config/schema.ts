import type { ComponentType, ReactNode } from 'react'

/**
 * Top-level mkdnsite configuration.
 *
 * Can be defined in mkdnsite.config.ts at the project root,
 * or passed programmatically when creating a handler.
 */
export interface MkdnSiteConfig {
  /** Directory containing .md files (default: ./content) */
  contentDir: string

  /** Site metadata */
  site: SiteConfig

  /** Server options (local dev / self-hosted only) */
  server: ServerConfig

  /** Theme and rendering configuration */
  theme: ThemeConfig

  /** Content negotiation options */
  negotiation: NegotiationConfig

  /** Auto-generate /llms.txt */
  llmsTxt: LlmsTxtConfig

  /** Client-side enhancement modules */
  client: ClientConfig

  /** Static files directory for images, videos, etc. */
  staticDir?: string
}

export interface SiteConfig {
  title: string
  description?: string
  url?: string
  lang?: string
}

export interface ServerConfig {
  port: number
  hostname: string
}

export interface ThemeConfig {
  /**
   * Rendering mode for markdown content.
   * - 'prose': Uses @tailwindcss/typography prose classes (default)
   * - 'components': Full custom React component overrides per element
   */
  mode: 'prose' | 'components'

  /** Custom React components to override default element rendering */
  components?: ComponentOverrides

  /** Custom CSS file path or URL to use instead of default theme */
  customCss?: string

  /** Show navigation sidebar */
  showNav: boolean

  /** Show table of contents per page */
  showToc: boolean

  /** Edit URL template (e.g. https://github.com/org/repo/edit/main/{path}) */
  editUrl?: string

  /** Syntax highlighting theme for Shiki */
  syntaxTheme: string

  /** Dark mode syntax highlighting theme */
  syntaxThemeDark?: string
}

export interface NegotiationConfig {
  /** Enable serving raw markdown via Accept: text/markdown (default: true) */
  enabled: boolean

  /** Include x-markdown-tokens header (default: true) */
  includeTokenCount: boolean

  /** Content-Signal header values */
  contentSignals: ContentSignals
}

export interface ContentSignals {
  aiTrain: 'yes' | 'no'
  search: 'yes' | 'no'
  aiInput: 'yes' | 'no'
}

export interface LlmsTxtConfig {
  enabled: boolean
  description?: string
  sections?: Record<string, string>
}

export interface ClientConfig {
  /**
   * Enable client-side JavaScript enhancements.
   * When false, only static HTML/CSS is served (performance mode).
   * Default: true
   */
  enabled: boolean

  /** Enable Mermaid diagram rendering (default: true when client enabled) */
  mermaid: boolean

  /** Enable copy-to-clipboard on code blocks (default: true when client enabled) */
  copyButton: boolean

  /** Enable client-side search (default: true when client enabled) */
  search: boolean
}

/**
 * Markdown renderer engine selection.
 * - 'portable': react-markdown + remark/rehype (works everywhere)
 * - 'bun-native': Bun.markdown.react() (Bun only, faster)
 */
export type RendererEngine = 'portable' | 'bun-native'

/**
 * React component overrides for markdown elements.
 * Each key maps to an HTML element produced by the markdown renderer.
 */
export interface ComponentOverrides {
  h1?: ComponentType<HeadingProps>
  h2?: ComponentType<HeadingProps>
  h3?: ComponentType<HeadingProps>
  h4?: ComponentType<HeadingProps>
  h5?: ComponentType<HeadingProps>
  h6?: ComponentType<HeadingProps>
  p?: ComponentType<{ children?: ReactNode }>
  a?: ComponentType<LinkProps>
  img?: ComponentType<ImageProps>
  pre?: ComponentType<CodeBlockProps>
  code?: ComponentType<InlineCodeProps>
  blockquote?: ComponentType<{ children?: ReactNode }>
  table?: ComponentType<{ children?: ReactNode }>
  thead?: ComponentType<{ children?: ReactNode }>
  tbody?: ComponentType<{ children?: ReactNode }>
  tr?: ComponentType<{ children?: ReactNode }>
  th?: ComponentType<{ children?: ReactNode, align?: string }>
  td?: ComponentType<{ children?: ReactNode, align?: string }>
  ul?: ComponentType<{ children?: ReactNode }>
  ol?: ComponentType<{ children?: ReactNode, start?: number }>
  li?: ComponentType<{ children?: ReactNode, checked?: boolean }>
  hr?: ComponentType<Record<string, never>>
}

export interface HeadingProps {
  children?: ReactNode
  id?: string
  level: number
}

export interface LinkProps {
  children?: ReactNode
  href?: string
  title?: string
}

export interface ImageProps {
  src?: string
  alt?: string
  title?: string
}

export interface CodeBlockProps {
  children?: ReactNode
  language?: string
  raw?: string
}

export interface InlineCodeProps {
  children?: ReactNode
}
