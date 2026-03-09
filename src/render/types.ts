import type { ReactElement } from 'react'
import type { Highlighter } from 'shiki'
import type { ComponentOverrides, RendererEngine } from '../config/schema.ts'

/**
 * Markdown renderer interface.
 *
 * Implementations convert markdown strings into React elements
 * that can be rendered to HTML via renderToString().
 *
 * The component overrides allow users to customize how each
 * markdown element is rendered (headings, links, code blocks, etc.).
 */
export interface MarkdownRenderer {
  /** Which engine is actually in use */
  readonly engine: RendererEngine

  /**
   * Render a markdown string to a React element tree.
   * The returned element can be passed to renderToString().
   */
  renderToElement: (markdown: string, overrides?: ComponentOverrides) => ReactElement

  /**
   * Render a markdown string directly to an HTML string.
   * Convenience method that calls renderToElement + renderToString.
   */
  renderToHtml: (markdown: string, overrides?: ComponentOverrides) => string
}

export interface RendererOptions {
  engine?: RendererEngine
  syntaxTheme?: string
  syntaxThemeDark?: string
}

/**
 * Create the appropriate renderer for the current runtime and config.
 */
export async function createRenderer (engineOrOpts: RendererEngine | RendererOptions = 'portable'): Promise<MarkdownRenderer> {
  const opts: RendererOptions = typeof engineOrOpts === 'string'
    ? { engine: engineOrOpts }
    : engineOrOpts
  const engine = opts.engine ?? 'portable'

  // Create shiki highlighter if syntax themes are provided
  let highlighter: Highlighter | undefined
  if (opts.syntaxTheme != null) {
    const { createHighlighter } = await import('shiki')
    const themes = [opts.syntaxTheme]
    if (opts.syntaxThemeDark != null) themes.push(opts.syntaxThemeDark)
    const langs = [
      'javascript', 'typescript', 'jsx', 'tsx',
      'html', 'css', 'json', 'jsonc',
      'bash', 'shell', 'sh', 'zsh',
      'python', 'ruby', 'go', 'rust', 'java', 'c', 'cpp',
      'yaml', 'toml', 'markdown', 'sql', 'graphql',
      'diff', 'xml', 'docker', 'nginx', 'ini'
    ]
    highlighter = await createHighlighter({ themes, langs })
  }

  if (engine === 'bun-native') {
    if (typeof Bun !== 'undefined' && Bun.markdown != null) {
      const { BunNativeRenderer } = await import('./bun-native.ts')
      return new BunNativeRenderer()
    }
    console.warn('mkdnsite: bun-native renderer requested but Bun.markdown not available. Falling back to portable.')
  }

  const { PortableRenderer } = await import('./portable.ts')
  return new PortableRenderer(highlighter, opts.syntaxTheme, opts.syntaxThemeDark)
}
