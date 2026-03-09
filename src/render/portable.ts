import React from 'react'
import { renderToString } from 'react-dom/server'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeSlug from 'rehype-slug'
import rehypeKatex from 'rehype-katex'
import type { ReactElement } from 'react'
import type { Highlighter } from 'shiki'
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
  readonly engine = 'portable' as const
  private readonly highlighter?: Highlighter
  private readonly syntaxTheme?: string
  private readonly syntaxThemeDark?: string
  private readonly math: boolean

  constructor (highlighter?: Highlighter, syntaxTheme?: string, syntaxThemeDark?: string, math?: boolean) {
    this.highlighter = highlighter
    this.syntaxTheme = syntaxTheme
    this.syntaxThemeDark = syntaxThemeDark
    this.math = math !== false
  }

  renderToElement (markdown: string, overrides?: ComponentOverrides): ReactElement {
    const components = buildComponents(overrides)

    // Map our ComponentOverrides to react-markdown's expected component shape
    const rmComponents = mapToReactMarkdownComponents(
      components,
      this.highlighter,
      this.syntaxTheme,
      this.syntaxThemeDark
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const remarkPlugins: any[] = [remarkGfm]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rehypePlugins: any[] = [rehypeSlug]

    if (this.math) {
      remarkPlugins.push(remarkMath)
      rehypePlugins.push(rehypeKatex)
    }

    return React.createElement(Markdown, {
      remarkPlugins,
      rehypePlugins,
      components: rmComponents
    }, markdown)
  }

  renderToHtml (markdown: string, overrides?: ComponentOverrides): string {
    const element = this.renderToElement(markdown, overrides)
    return renderToString(element)
  }
}

/**
 * Extract raw text from React children recursively.
 * Needed to get the source code string from react-markdown's code element.
 */
function extractText (children: unknown): string {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (children == null || typeof children === 'boolean') return ''
  if (Array.isArray(children)) return children.map(extractText).join('')
  if (typeof children === 'object' && 'props' in (children as Record<string, unknown>)) {
    const props = (children as Record<string, unknown>).props as Record<string, unknown>
    return extractText(props.children)
  }
  return ''
}

/**
 * Map our ComponentOverrides type to react-markdown's Components type.
 * react-markdown passes slightly different props, so we adapt here.
 */
function mapToReactMarkdownComponents (
  overrides: ComponentOverrides,
  highlighter?: Highlighter,
  syntaxTheme?: string,
  syntaxThemeDark?: string
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

  // Code block handling: use shiki when available, otherwise fall back to default
  if (highlighter != null && syntaxTheme != null) {
    const loadedLangs = new Set(highlighter.getLoadedLanguages())
    const darkTheme = syntaxThemeDark
    const lightTheme = syntaxTheme

    mapped.pre = (props: Record<string, unknown>) => {
      const children = props.children as React.ReactElement
      const codeProps = children?.props as Record<string, unknown> | undefined
      const className = (codeProps?.className as string) ?? ''
      const langMatch = className.match(/language-(\S+)/)
      const language = langMatch?.[1]

      // Extract raw code text from React children
      const raw = extractText(codeProps?.children).replace(/\n$/, '')

      // Only use shiki if the language is loaded
      if (language != null && loadedLangs.has(language)) {
        const themeOpts = darkTheme != null
          ? { themes: { light: lightTheme, dark: darkTheme }, defaultColor: false as const }
          : { theme: lightTheme }

        const html = highlighter.codeToHtml(raw, { lang: language, ...themeOpts })

        return React.createElement('div', {
          className: 'mkdn-code-block',
          'data-language': language,
          dangerouslySetInnerHTML: { __html: html }
        })
      }

      // Fall back to default pre/code rendering
      if (overrides.pre != null) {
        const Pre = overrides.pre
        return React.createElement(Pre, {
          language: language != null && language !== '' ? language : undefined
        }, codeProps?.children as React.ReactNode)
      }

      return React.createElement('pre', null,
        React.createElement('code', {
          className: language != null ? `language-${language}` : undefined
        }, codeProps?.children as React.ReactNode)
      )
    }
  } else if (overrides.pre != null) {
    const Pre = overrides.pre
    mapped.pre = (props: Record<string, unknown>) => {
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
