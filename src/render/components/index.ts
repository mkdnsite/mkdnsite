import React from 'react'
import type {
  HeadingProps,
  LinkProps,
  ImageProps,
  CodeBlockProps,
  InlineCodeProps,
  ComponentOverrides
} from '../../config/schema.ts'

/**
 * Default heading component with anchor link support.
 */
function Heading ({ children, id, level }: HeadingProps): React.ReactElement {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  const className = `mkdn-heading mkdn-h${level}`

  if (id != null) {
    return React.createElement(Tag, { id, className },
      React.createElement('a', {
        href: `#${id}`,
        className: 'mkdn-heading-anchor',
        'aria-hidden': 'true'
      }, '#'),
      ' ',
      children
    )
  }

  return React.createElement(Tag, { className }, children)
}

/**
 * Default link component with external link detection.
 */
function Link ({ children, href, title }: LinkProps): React.ReactElement {
  const isExternal = href?.startsWith('http://') === true || href?.startsWith('https://') === true
  const props: Record<string, unknown> = {
    href,
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
