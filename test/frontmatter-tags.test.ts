/**
 * Tests for frontmatter tags display.
 * Tags appear as pill badges below article content.
 */

import { describe, test, expect } from 'bun:test'
import { resolveConfig } from '../src/config/defaults.ts'
import { renderPage } from '../src/render/page-shell.ts'

const config = resolveConfig({})
const nav = { title: 'root', slug: '/', order: 0, children: [], isSection: false }

describe('frontmatter tags rendering', () => {
  test('renders tags from frontmatter', () => {
    const html = renderPage({
      renderedContent: '<p>body</p>',
      meta: { title: 'Page', tags: ['javascript', 'typescript'] },
      config,
      nav,
      currentSlug: '/'
    })
    expect(html).toContain('class="mkdn-tags"')
    expect(html).toContain('class="mkdn-tag"')
    expect(html).toContain('javascript')
    expect(html).toContain('typescript')
  })

  test('renders each tag as its own .mkdn-tag span', () => {
    const html = renderPage({
      renderedContent: '<p>body</p>',
      meta: { title: 'Page', tags: ['a', 'b', 'c'] },
      config,
      nav,
      currentSlug: '/'
    })
    const tagCount = (html.match(/class="mkdn-tag"/g) ?? []).length
    expect(tagCount).toBe(3)
  })

  test('no tags section when tags array is absent', () => {
    const html = renderPage({
      renderedContent: '<p>body</p>',
      meta: { title: 'Page' },
      config,
      nav,
      currentSlug: '/'
    })
    expect(html).not.toContain('class="mkdn-tags"')
  })

  test('no tags section when tags is an empty array', () => {
    const html = renderPage({
      renderedContent: '<p>body</p>',
      meta: { title: 'Page', tags: [] },
      config,
      nav,
      currentSlug: '/'
    })
    expect(html).not.toContain('class="mkdn-tags"')
  })

  test('tag text is HTML-escaped', () => {
    const html = renderPage({
      renderedContent: '<p>body</p>',
      meta: { title: 'Page', tags: ['<b>bold</b>'] },
      config,
      nav,
      currentSlug: '/'
    })
    // Raw HTML tag should not appear inside the tag span
    expect(html).not.toContain('class="mkdn-tag"><b>')
    expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;')
  })

  test('single tag renders correctly', () => {
    const html = renderPage({
      renderedContent: '<p>body</p>',
      meta: { title: 'Page', tags: ['solo'] },
      config,
      nav,
      currentSlug: '/'
    })
    expect(html).toContain('class="mkdn-tags"')
    expect(html).toContain('>solo<')
  })
})
