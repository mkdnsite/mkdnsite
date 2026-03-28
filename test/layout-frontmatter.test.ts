/**
 * Tests for layout frontmatter field.
 *
 * Supported layouts:
 * - default (or absent): nav + content + optional ToC
 * - wide: nav visible, ToC hidden, CSS class mkdn-layout-wide
 * - landing: no nav, no ToC, CSS class mkdn-layout-landing
 */

import { describe, test, expect } from 'bun:test'
import { resolveConfig } from '../src/config/defaults.ts'
import type { ThemeConfig } from '../src/config/schema.ts'
import { renderPage } from '../src/render/page-shell.ts'

const nav = {
  title: 'root',
  slug: '/',
  order: 0,
  isSection: false,
  children: [{
    title: 'Page',
    slug: '/page',
    order: 0,
    isSection: false,
    children: []
  }]
}

// Config with nav + ToC enabled
const theme: Partial<ThemeConfig> = { showNav: true, showToc: true, prevNext: false }
const config = resolveConfig({ theme: theme as ThemeConfig })

describe('layout: default (or absent)', () => {
  test('default layout has mkdn-layout-default class', () => {
    const html = renderPage({ renderedContent: '<p>hi</p>', meta: { title: 'P' }, config, nav, currentSlug: '/' })
    expect(html).toContain('mkdn-layout-default')
  })

  test('absent layout also produces mkdn-layout-default class', () => {
    const html = renderPage({ renderedContent: '<p>hi</p>', meta: {}, config, nav, currentSlug: '/' })
    expect(html).toContain('mkdn-layout-default')
  })

  test('default layout renders nav when showNav: true', () => {
    const html = renderPage({ renderedContent: '<p>hi</p>', meta: { layout: 'default' }, config, nav, currentSlug: '/' })
    expect(html).toContain('class="mkdn-nav"')
  })
})

describe('layout: wide', () => {
  test('wide layout has mkdn-layout-wide class', () => {
    const html = renderPage({ renderedContent: '<p>hi</p>', meta: { layout: 'wide' }, config, nav, currentSlug: '/' })
    expect(html).toContain('mkdn-layout-wide')
  })

  test('wide layout still renders nav', () => {
    const html = renderPage({ renderedContent: '<p>hi</p>', meta: { layout: 'wide' }, config, nav, currentSlug: '/' })
    expect(html).toContain('class="mkdn-nav"')
  })

  test('wide layout suppresses ToC even when showToc: true', () => {
    const renderedWithHeadings = '<h2 id="s1">Section</h2><p>body</p>'
    const html = renderPage({ renderedContent: renderedWithHeadings, meta: { layout: 'wide' }, config, nav, currentSlug: '/' })
    expect(html).not.toContain('class="mkdn-toc"')
  })
})

describe('layout: landing', () => {
  test('landing layout has mkdn-layout-landing class', () => {
    const html = renderPage({ renderedContent: '<p>hi</p>', meta: { layout: 'landing' }, config, nav, currentSlug: '/' })
    expect(html).toContain('mkdn-layout-landing')
  })

  test('landing layout hides nav even when showNav: true', () => {
    const html = renderPage({ renderedContent: '<p>hi</p>', meta: { layout: 'landing' }, config, nav, currentSlug: '/' })
    expect(html).not.toContain('class="mkdn-nav"')
  })

  test('landing layout suppresses ToC even when showToc: true', () => {
    const renderedWithHeadings = '<h2 id="s1">Section</h2><p>body</p>'
    const html = renderPage({ renderedContent: renderedWithHeadings, meta: { layout: 'landing' }, config, nav, currentSlug: '/' })
    expect(html).not.toContain('class="mkdn-toc"')
  })
})

describe('layout: unknown / custom value', () => {
  test('unknown layout still renders a layout class with its value', () => {
    const html = renderPage({ renderedContent: '<p>hi</p>', meta: { layout: 'blog' }, config, nav, currentSlug: '/' })
    expect(html).toContain('mkdn-layout-blog')
  })

  test('unknown layout does not hide nav or ToC', () => {
    const renderedWithHeadings = '<h2 id="s1">Section</h2><p>body</p>'
    const html = renderPage({ renderedContent: renderedWithHeadings, meta: { layout: 'blog' }, config, nav, currentSlug: '/' })
    // Nav still rendered (it's not a known hiding layout)
    expect(html).toContain('class="mkdn-nav"')
  })
})
