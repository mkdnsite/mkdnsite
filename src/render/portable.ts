import React from 'react'
import { renderToString } from 'react-dom/server'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import type { ReactElement } from 'react'
import type { ComponentOverrides } from '../config/schema.ts'
import type { MarkdownRenderer } from './types.ts'
import { buildComponents } from './components/index.ts'

/**
 * Portable markdown renderer using react-markdown.
 *
 * Works in any JavaScript runtime (Bun, Node, CF Workers, Deno).
 * Uses remark-gfm for GitHub-Flavored Markdown support and
 * rehype plugins for heading IDs and anchor links.
 */
export class PortableRenderer implements MarkdownRenderer {
  renderToElement (markdown: string, overrides?: ComponentOverrides): ReactElement {
    const components = buildComponents(overrides)

    // Map our ComponentOverrides to react-markdown's expected component shape
    const rmComponents = mapToReactMarkdownComponents(components)

    return React.createElement(Markdown, {
      remarkPlugins: [remarkGfm, remarkMath],
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: 'wrap' }]
      ],
      components: rmComponents
    }, markdown)
  }

  renderToHtml (markdown: string, overrides?: ComponentOverrides): string {
    const element = this.renderToElement(markdown, overrides)
    return renderToString(element)
  }
}

/**
 * Map our ComponentOverrides type to react-markdown's Components type.
 * react-markdown passes slightly different props, so we adapt here.
 */
function mapToReactMarkdownComponents (
  overrides: ComponentOverrides
): Record<string, React.ComponentType<Record<string, unknown>>> {
  const mapped: Record<string, React.ComponentType<Record<string, unknown>>> = {}

  if (overrides.h1 != null) {
    const H1 = overrides.h1
    mapped.h1 = (props: Record<string, unknown>) =>
      React.createElement(H1, {
        id: props.id as string | undefined,
        level: 1
      }, props.children as React.ReactNode)
  }
  if (overrides.h2 != null) {
    const H2 = overrides.h2
    mapped.h2 = (props: Record<string, unknown>) =>
      React.createElement(H2, {
        id: props.id as string | undefined,
        level: 2
      }, props.children as React.ReactNode)
  }
  if (overrides.h3 != null) {
    const H3 = overrides.h3
    mapped.h3 = (props: Record<string, unknown>) =>
      React.createElement(H3, {
        id: props.id as string | undefined,
        level: 3
      }, props.children as React.ReactNode)
  }

  // Direct pass-through for components with matching prop shapes
  const directMappings: Array<keyof ComponentOverrides> = [
    'p', 'a', 'img', 'blockquote', 'table', 'thead', 'tbody',
    'tr', 'th', 'td', 'ul', 'ol', 'li', 'hr', 'code'
  ]

  for (const key of directMappings) {
    if (overrides[key] != null) {
      mapped[key] = overrides[key] as React.ComponentType<Record<string, unknown>>
    }
  }

  // Special handling for code blocks (pre element)
  if (overrides.pre != null) {
    const Pre = overrides.pre
    mapped.pre = (props: Record<string, unknown>) => {
      // react-markdown wraps code in pre > code
      // Extract language from the code child's className
      const children = props.children as React.ReactElement
      const codeProps = children?.props as Record<string, unknown> | undefined
      const className = (codeProps?.className as string) ?? ''
      const language = className.replace('language-', '')

      return React.createElement(Pre, {
        language: language !== '' ? language : undefined
      }, codeProps?.children as React.ReactNode)
    }
  }

  return mapped
}
