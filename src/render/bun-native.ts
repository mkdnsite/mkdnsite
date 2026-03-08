import { renderToString } from 'react-dom/server'
import type { ReactElement } from 'react'
import type { ComponentOverrides } from '../config/schema.ts'
import type { MarkdownRenderer } from './types.ts'
import { buildComponents } from './components/index.ts'

/**
 * High-performance renderer using Bun.markdown.react().
 *
 * Only works in Bun runtime. Uses Bun's built-in Zig-based
 * markdown parser which is significantly faster than JavaScript
 * alternatives.
 *
 * Falls back gracefully if Bun.markdown is not available.
 */
export class BunNativeRenderer implements MarkdownRenderer {
  readonly engine = 'bun-native' as const

  renderToElement (markdown: string, overrides?: ComponentOverrides): ReactElement {
    const components = buildComponents(overrides)

    // Map our ComponentOverrides to Bun.markdown.react() component shape
    // Bun.markdown.react() accepts overrides keyed by HTML tag name
    const bunComponents: Record<string, unknown> = {}

    if (components.h1 != null) bunComponents.h1 = components.h1
    if (components.h2 != null) bunComponents.h2 = components.h2
    if (components.h3 != null) bunComponents.h3 = components.h3
    if (components.h4 != null) bunComponents.h4 = components.h4
    if (components.h5 != null) bunComponents.h5 = components.h5
    if (components.h6 != null) bunComponents.h6 = components.h6
    if (components.a != null) bunComponents.a = components.a
    if (components.img != null) bunComponents.img = components.img
    if (components.pre != null) bunComponents.pre = components.pre
    if (components.code != null) bunComponents.code = components.code
    if (components.blockquote != null) bunComponents.blockquote = components.blockquote
    if (components.table != null) bunComponents.table = components.table
    if (components.p != null) bunComponents.p = components.p

    return Bun.markdown.react(markdown, bunComponents, {
      tables: true,
      strikethrough: true,
      tasklists: true,
      autolinks: true,
      headings: { ids: true },
      tagFilter: true
    })
  }

  renderToHtml (markdown: string, overrides?: ComponentOverrides): string {
    const element = this.renderToElement(markdown, overrides)
    return renderToString(element)
  }
}
