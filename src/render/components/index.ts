import React from 'react'
import { Link as LinkIcon } from 'lucide-react'
import type {
  HeadingProps,
  LinkProps,
  ImageProps,
  CodeBlockProps,
  InlineCodeProps,
  ComponentOverrides
} from '../../config/schema.ts'

const ICON_SIZES: Record<number, number> = {
  1: 20,
  2: 18,
  3: 16
}

/**
 * Default heading component with anchor link support.
 * h1-h3 show a lucide link icon on hover; h4-h6 show a # symbol.
 */
function Heading ({ children, id, level }: HeadingProps): React.ReactElement {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  const className = `mkdn-heading mkdn-h${level}`

  if (id != null) {
    const iconSize = ICON_SIZES[level]
    const anchorChild = iconSize != null
      ? React.createElement(LinkIcon, { size: iconSize, 'aria-hidden': true })
      : '#'

    return React.createElement(Tag, { id, className },
      React.createElement('a', {
        href: `#${id}`,
        className: 'mkdn-heading-anchor',
        'aria-hidden': 'true'
      }, anchorChild),
      ' ',
      children
    )
  }

  return React.createElement(Tag, { className }, children)
}

/**
 * Strip the .md extension from a relative link href so that generated HTML
 * links to the canonical URL mkdnsite serves (without .md).
 *
 * Rules:
 * - Only transforms relative hrefs (not http/https/# links).
 * - index.md / README.md / readme.md → strip filename, keep trailing slash.
 * - other-page.md → other-page (anchor and query string preserved).
 * - Leaves absolute URLs and anchor-only links unchanged.
 */
export function stripMdExtension (href: string): string {
  // Leave absolute URLs and anchor-only links alone
  if (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('#')
  ) return href

  // Split off any anchor (#...) or query string (?...) suffix
  const hashIdx = href.indexOf('#')
  const queryIdx = href.indexOf('?')
  let splitIdx = -1
  if (hashIdx !== -1 && queryIdx !== -1) splitIdx = Math.min(hashIdx, queryIdx)
  else if (hashIdx !== -1) splitIdx = hashIdx
  else if (queryIdx !== -1) splitIdx = queryIdx

  const path = splitIdx !== -1 ? href.slice(0, splitIdx) : href
  const suffix = splitIdx !== -1 ? href.slice(splitIdx) : ''

  // index.md / README.md / readme.md → keep directory path with trailing slash
  if (/(?:^|\/)(?:index|README|readme)\.md$/.test(path)) {
    const dir = path.replace(/(?:index|README|readme)\.md$/, '')
    return (dir === '' ? './' : dir) + suffix
  }

  // Any other .md file → strip extension
  if (path.endsWith('.md')) {
    return path.slice(0, -3) + suffix
  }

  return href
}

/**
 * Default link component with external link detection.
 */
function Link ({ children, href, title }: LinkProps): React.ReactElement {
  const resolvedHref = href != null ? stripMdExtension(href) : href
  const isExternal = resolvedHref?.startsWith('http://') === true || resolvedHref?.startsWith('https://') === true
  const props: Record<string, unknown> = {
    href: resolvedHref,
    title,
    className: 'mkdn-link'
  }

  if (isExternal) {
    props.target = '_blank'
    props.rel = 'noopener noreferrer'
  }

  return React.createElement('a', props, children)
}

/**
 * Default image component with lazy loading.
 */
function Image ({ src, alt, title }: ImageProps): React.ReactElement {
  return React.createElement('img', {
    src,
    alt: alt ?? '',
    title,
    loading: 'lazy',
    className: 'mkdn-image'
  })
}

/**
 * Default code block component.
 * Syntax highlighting is applied server-side by the renderer using Shiki.
 * This component wraps the highlighted output.
 */
function CodeBlock ({ children, language }: CodeBlockProps): React.ReactElement {
  return React.createElement('div', { className: 'mkdn-code-block', 'data-language': language },
    React.createElement('pre', null,
      React.createElement('code', {
        className: language != null ? `language-${language}` : undefined
      }, children)
    )
  )
}

/**
 * Default inline code component.
 */
function InlineCode ({ children }: InlineCodeProps): React.ReactElement {
  return React.createElement('code', { className: 'mkdn-inline-code' }, children)
}

/**
 * Default blockquote component.
 */
function Blockquote ({ children }: { children?: React.ReactNode }): React.ReactElement {
  return React.createElement('blockquote', { className: 'mkdn-blockquote' }, children)
}

/**
 * Default table component with responsive wrapper.
 */
function Table ({ children }: { children?: React.ReactNode }): React.ReactElement {
  return React.createElement('div', { className: 'mkdn-table-wrapper' },
    React.createElement('table', { className: 'mkdn-table' }, children)
  )
}

/**
 * Build the full component overrides map, merging user overrides
 * with defaults. User overrides take precedence.
 */
export function buildComponents (userOverrides?: ComponentOverrides): ComponentOverrides {
  const defaults: ComponentOverrides = {
    h1: (props) => Heading({ ...props, level: 1 }),
    h2: (props) => Heading({ ...props, level: 2 }),
    h3: (props) => Heading({ ...props, level: 3 }),
    h4: (props) => Heading({ ...props, level: 4 }),
    h5: (props) => Heading({ ...props, level: 5 }),
    h6: (props) => Heading({ ...props, level: 6 }),
    a: Link,
    img: Image,
    pre: CodeBlock,
    code: InlineCode,
    blockquote: Blockquote,
    table: Table
  }

  if (userOverrides == null) return defaults

  return { ...defaults, ...userOverrides }
}

export {
  Heading,
  Link,
  Image,
  CodeBlock,
  InlineCode,
  Blockquote,
  Table
}
