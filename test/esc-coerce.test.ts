import { describe, expect, it } from 'bun:test'
import { renderPage } from '../src/render/page-shell.ts'
import { resolveConfig } from '../src/config/defaults.ts'

describe('esc() coercion — non-string frontmatter values', () => {
  it('should not crash when meta.title is a number', () => {
    const config = resolveConfig({ site: { title: 'Test Site' } })
    const html = renderPage({
      renderedContent: '<p>hello</p>',
      meta: { title: 404 as unknown as string },
      config,
      currentSlug: '/404'
    })
    expect(html).toContain('404')
    expect(html).toContain('<title>404 — Test Site</title>')
  })

  it('should not crash when meta.description is a number', () => {
    const config = resolveConfig({ site: { title: 'Test Site' } })
    const html = renderPage({
      renderedContent: '<p>hello</p>',
      meta: { title: 'Page', description: 123 as unknown as string },
      config,
      currentSlug: '/test'
    })
    expect(html).toContain('123')
  })

  it('should handle boolean frontmatter values', () => {
    const config = resolveConfig({ site: { title: 'Test Site' } })
    const html = renderPage({
      renderedContent: '<p>hello</p>',
      meta: { title: true as unknown as string },
      config,
      currentSlug: '/test'
    })
    expect(html).toContain('true')
  })
})
