/**
 * Tests for hero image frontmatter support.
 *
 * Priority chain: hero_image → hero → og_image
 * Renders a .mkdn-hero <img> above the article content.
 */

import { describe, test, expect } from 'bun:test'
import { resolveConfig } from '../src/config/defaults.ts'
import type { ThemeConfig } from '../src/config/schema.ts'
import { renderPage } from '../src/render/page-shell.ts'

const config = resolveConfig({})
const nav = { title: 'root', slug: '/', order: 0, children: [], isSection: false }

describe('hero image rendering', () => {
  test('hero_image renders a .mkdn-hero img', () => {
    const html = renderPage({
      renderedContent: '<p>body</p>',
      meta: { title: 'My Page', hero_image: '/static/hero.jpg' },
      config,
      nav,
      currentSlug: '/'
    })
    expect(html).toContain('class="mkdn-hero"')
    expect(html).toContain('src="/static/hero.jpg"')
    expect(html).toContain('<img')
    expect(html).toContain('loading="eager"')
  })

  test('hero (alias) renders when hero_image not set', () => {
    const html = renderPage({
      renderedContent: '<p>body</p>',
      meta: { title: 'Page', hero: 'https://example.com/banner.png' },
      config,
      nav,
      currentSlug: '/'
    })
    expect(html).toContain('class="mkdn-hero"')
    expect(html).toContain('src="https://example.com/banner.png"')
  })

  test('hero_image takes priority over hero', () => {
    const html = renderPage({
      renderedContent: '<p>body</p>',
      meta: { title: 'Page', hero_image: '/hero1.jpg', hero: '/hero2.jpg' },
      config,
      nav,
      currentSlug: '/'
    })
    expect(html).toContain('src="/hero1.jpg"')
    expect(html).not.toContain('src="/hero2.jpg"')
  })

  test('og_image used as fallback when neither hero_image nor hero set', () => {
    const html = renderPage({
      renderedContent: '<p>body</p>',
      meta: { title: 'Page', og_image: '/og.png' },
      config,
      nav,
      currentSlug: '/'
    })
    expect(html).toContain('class="mkdn-hero"')
    expect(html).toContain('src="/og.png"')
  })

  test('no hero rendered when no hero or og_image fields', () => {
    const html = renderPage({
      renderedContent: '<p>body</p>',
      meta: { title: 'Page' },
      config,
      nav,
      currentSlug: '/'
    })
    expect(html).not.toContain('class="mkdn-hero"')
  })

  test('hero src is HTML-escaped', () => {
    const html = renderPage({
      renderedContent: '<p>body</p>',
      meta: { title: 'Page', hero_image: '/img?a=1&b=2' },
      config,
      nav,
      currentSlug: '/'
    })
    expect(html).toContain('src="/img?a=1&amp;b=2"')
  })

  test('alt text uses page title', () => {
    const html = renderPage({
      renderedContent: '<p>body</p>',
      meta: { title: 'My Great Page', hero_image: '/hero.jpg' },
      config,
      nav,
      currentSlug: '/'
    })
    expect(html).toContain('alt="My Great Page"')
  })

  test('alt text is empty when no title', () => {
    const html = renderPage({
      renderedContent: '<p>body</p>',
      meta: { hero_image: '/hero.jpg' },
      config,
      nav,
      currentSlug: '/'
    })
    expect(html).toContain('alt=""')
  })

  test('hero appears before page title in DOM', () => {
    const theme: Partial<ThemeConfig> = { pageTitle: true }
    const config2 = resolveConfig({ theme: theme as ThemeConfig })
    const html = renderPage({
      renderedContent: '<p>body</p>',
      meta: { title: 'My Page', hero_image: '/hero.jpg' },
      config: config2,
      nav,
      currentSlug: '/'
    })
    const heroIdx = html.indexOf('mkdn-hero')
    const titleIdx = html.indexOf('mkdn-page-title')
    expect(heroIdx).toBeLessThan(titleIdx)
  })
})
