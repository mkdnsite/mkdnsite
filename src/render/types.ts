import type { ReactElement } from 'react'
import type { ComponentOverrides, RendererEngine } from '../config/schema'

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

/**
 * Create the appropriate renderer for the current runtime and config.
 */
export function createRenderer (engine: RendererEngine = 'portable'): MarkdownRenderer {
  if (engine === 'bun-native') {
    // Verify Bun.markdown is available
    if (typeof Bun !== 'undefined' && Bun.markdown != null) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { BunNativeRenderer } = require('./bun-native') as typeof import('./bun-native')
      return new BunNativeRenderer()
    }
    console.warn('mkdnsite: bun-native renderer requested but Bun.markdown not available. Falling back to portable.')
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PortableRenderer } = require('./portable') as typeof import('./portable')
  return new PortableRenderer()
}
