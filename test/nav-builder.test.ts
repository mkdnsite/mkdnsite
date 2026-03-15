import { describe, it, expect } from 'bun:test'
import { buildNavTree } from '../src/content/nav-builder.ts'
import type { FileEntry } from '../src/content/nav-builder.ts'

function entry (path: string, meta: Record<string, unknown> = {}): FileEntry {
  return { path, meta }
}

describe('buildNavTree', () => {
  it('returns empty root for empty file list', () => {
    const root = buildNavTree([])
    expect(root.slug).toBe('/')
    expect(root.children).toHaveLength(0)
  })

  it('adds flat leaf files as root children', () => {
    const root = buildNavTree([
      entry('getting-started.md', { title: 'Getting Started' }),
      entry('faq.md', { title: 'FAQ' })
    ])
    expect(root.children).toHaveLength(2)
    const titles = root.children.map(n => n.title)
    expect(titles).toContain('Getting Started')
    expect(titles).toContain('FAQ')
  })

  it('infers slug from filename when no title', () => {
    const root = buildNavTree([entry('my-page.md')])
    const node = root.children[0]
    expect(node.slug).toBe('/my-page')
    expect(node.title).toBe('My Page') // titleCase
  })

  it('creates section nodes for nested files', () => {
    const root = buildNavTree([
      entry('docs/getting-started.md', { title: 'Getting Started' }),
      entry('docs/configuration.md', { title: 'Configuration' })
    ])
    expect(root.children).toHaveLength(1)
    const section = root.children[0]
    expect(section.isSection).toBe(true)
    expect(section.slug).toBe('/docs')
    expect(section.children).toHaveLength(2)
  })

  it('applies index.md metadata to section node', () => {
    const root = buildNavTree([
      entry('docs/index.md', { title: 'Documentation', order: 1 }),
      entry('docs/intro.md', { title: 'Intro' })
    ])
    const section = root.children[0]
    expect(section.title).toBe('Documentation')
    expect(section.order).toBe(1)
  })

  it('applies README.md metadata to section node', () => {
    const root = buildNavTree([
      entry('api/README.md', { title: 'API Reference' }),
      entry('api/endpoints.md', { title: 'Endpoints' })
    ])
    const section = root.children[0]
    expect(section.title).toBe('API Reference')
  })

  it('sorts children by order then title', () => {
    const root = buildNavTree([
      entry('c.md', { title: 'C', order: 2 }),
      entry('a.md', { title: 'A', order: 1 }),
      entry('b.md', { title: 'B', order: 1 })
    ])
    expect(root.children[0].title).toBe('A')
    expect(root.children[1].title).toBe('B')
    expect(root.children[2].title).toBe('C')
  })

  it('excludes draft files from navigation', () => {
    const root = buildNavTree([
      entry('published.md', { title: 'Published' }),
      entry('draft.md', { title: 'Draft', draft: true })
    ])
    expect(root.children).toHaveLength(1)
    expect(root.children[0].title).toBe('Published')
  })

  it('prunes empty sections', () => {
    // A section with only draft children should be pruned
    const root = buildNavTree([
      entry('visible.md', { title: 'Visible' }),
      entry('hidden/draft-only.md', { title: 'Draft', draft: true })
    ])
    expect(root.children).toHaveLength(1)
    expect(root.children[0].slug).toBe('/visible')
  })

  it('handles deeply nested sections', () => {
    const root = buildNavTree([
      entry('a/b/c/deep.md', { title: 'Deep' })
    ])
    const a = root.children[0]
    expect(a.slug).toBe('/a')
    const b = a.children[0]
    expect(b.slug).toBe('/a/b')
    const c = b.children[0]
    expect(c.slug).toBe('/a/b/c')
    const deep = c.children[0]
    expect(deep.title).toBe('Deep')
    expect(deep.slug).toBe('/a/b/c/deep')
  })

  it('respects custom rootTitle', () => {
    const root = buildNavTree([], 'My Site')
    expect(root.title).toBe('My Site')
  })

  it('isSection=false for leaf nodes', () => {
    const root = buildNavTree([entry('page.md', { title: 'Page' })])
    expect(root.children[0].isSection).toBe(false)
  })
})
