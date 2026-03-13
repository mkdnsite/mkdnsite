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

  /** Markdown renderer engine (default: 'portable') */
  renderer: RendererEngine

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

/** CSS color token overrides for the built-in theme */
export interface ColorTokens {
  /** Primary accent color (links, highlights) */
  accent?: string
  /** Main text color */
  text?: string
  /** Muted text color */
  textMuted?: string
  /** Page background color */
  bg?: string
  /** Alternate background (nav, code blocks) */
  bgAlt?: string
  /** Border color */
  border?: string
  /** Link color */
  link?: string
  /** Link hover color */
  linkHover?: string
  /** Inline code background */
  codeBg?: string
  /** Code block (pre) background */
  preBg?: string
}

/** Font stack overrides for the built-in theme */
export interface FontTokens {
  /** Body/prose font stack */
  body?: string
  /** Monospace font stack */
  mono?: string
  /** Heading font stack (defaults to body font) */
  heading?: string
}

/** Logo image configuration */
export interface LogoConfig {
  /** Path or URL to the logo image */
  src: string
  /** Alt text for the logo image */
  alt?: string
  /** Logo display width in pixels (default: 32) */
  width?: number
  /** Logo display height in pixels (default: 32) */
  height?: number
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

  /**
   * Inline CSS string appended after the built-in theme styles.
   * Use this for small tweaks. For full replacement, set builtinCss: false.
   */
  customCss?: string

  /** URL to an external stylesheet loaded via <link rel="stylesheet"> */
  customCssUrl?: string

  /**
   * Include the built-in theme CSS. Set to false to strip all default
   * styles and start from a blank slate. (default: true)
   */
  builtinCss?: boolean

  /** Light mode CSS color token overrides */
  colors?: ColorTokens

  /** Dark mode CSS color token overrides */
  colorsDark?: ColorTokens

  /** Font stack overrides */
  fonts?: FontTokens

  /** Logo image displayed in the nav header */
  logo?: LogoConfig

  /** Site name / text logo displayed in the nav header */
  logoText?: string

  /** Show navigation sidebar */
  showNav: boolean

  /** Show table of contents per page */
  showToc: boolean

  /** Edit URL template (e.g. https://github.com/org/repo/edit/main/{path}) */
  editUrl?: string

  /** Color scheme: 'system' (default), 'light', or 'dark' */
  colorScheme: 'system' | 'light' | 'dark'

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

  /** Enable light/dark theme toggle button (default: true when client enabled) */
  themeToggle: boolean

  /** Enable KaTeX math rendering (default: true when client enabled) */
  math: boolean

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
