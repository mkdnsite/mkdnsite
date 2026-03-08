import type { ReactElement } from 'react'
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
export async function createRenderer (engine: RendererEngine = 'portable'): Promise<MarkdownRenderer> {
  if (engine === 'bun-native') {
    // Verify Bun.markdown is available
    if (typeof Bun !== 'undefined' && Bun.markdown != null) {
      const { BunNativeRenderer } = await import('./bun-native.ts')
      return new BunNativeRenderer()
    }
    console.warn('mkdnsite: bun-native renderer requested but Bun.markdown not available. Falling back to portable.')
  }

  const { PortableRenderer } = await import('./portable.ts')
  return new PortableRenderer()
}
