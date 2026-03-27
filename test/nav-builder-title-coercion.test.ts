/**
 * Tests for frontmatter title coercion in nav tree builders.
 *
 * YAML parsers return `title: 404` as the integer 404, not the string "404".
 * Without coercion, `a.title.localeCompare(b.title)` crashes with:
 *   TypeError: a2.title.localeCompare is not a function
 */

import { describe, test, expect } from 'bun:test'
import { buildNavTree } from '../src/content/nav-builder.ts'

describe('buildNavTree — numeric frontmatter title coercion', () => {
  test('numeric title (404) is coerced to string', () => {
    const files = [
      { path: 'error.md', meta: { title: 404 } }
    ]
    const tree = buildNavTree(files)
    const node = tree.children[0]
    expect(typeof node.title).toBe('string')
    expect(node.title).toBe('404')
  })

  test('numeric title in section index is coerced to string', () => {
    const files = [
      { path: 'errors/index.md', meta: { title: 500 } },
      { path: 'errors/not-found.md', meta: {} }
    ]
    const tree = buildNavTree(files)
    const section = tree.children.find(n => n.isSection)
    expect(section).toBeDefined()
    expect(typeof section?.title).toBe('string')
    expect(section?.title).toBe('500')
  })

  test('sorting does not crash when two files have numeric titles', () => {
    const files = [
      { path: 'b-page.md', meta: { title: 404 } },
      { path: 'a-page.md', meta: { title: 200 } }
    ]
    // localeCompare crashes on numbers — this should no longer throw
    expect(() => buildNavTree(files)).not.toThrow()
    const tree = buildNavTree(files)
    expect(tree.children).toHaveLength(2)
    expect(tree.children.every(n => typeof n.title === 'string')).toBe(true)
  })

  test('sorting does not crash when mixing numeric and string titles', () => {
    const files = [
      { path: 'one.md', meta: { title: 1 } },
      { path: 'two.md', meta: { title: 'Hello' } },
      { path: 'three.md', meta: { title: 3 } }
    ]
    expect(() => buildNavTree(files)).not.toThrow()
  })

  test('string titles continue to work normally', () => {
    const files = [
      { path: 'guide.md', meta: { title: 'Getting Started' } }
    ]
    const tree = buildNavTree(files)
    expect(tree.children[0].title).toBe('Getting Started')
  })

  test('null/missing title falls back to titleCase of filename', () => {
    const files = [
      { path: 'getting-started.md', meta: {} }
    ]
    const tree = buildNavTree(files)
    expect(tree.children[0].title).toBe('Getting Started')
  })

  test('boolean title is coerced to string', () => {
    const files = [
      { path: 'draft.md', meta: { title: true } }
    ]
    const tree = buildNavTree(files)
    expect(tree.children[0].title).toBe('true')
  })
})
