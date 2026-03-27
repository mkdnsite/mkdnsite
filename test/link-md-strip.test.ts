/**
 * Tests for stripMdExtension — strips .md from relative links in rendered HTML.
 *
 * mkdnsite serves pages at /path/to/page (no .md extension). Markdown files
 * that contain relative links like [see this](./other-page.md) would produce
 * broken hrefs without this transformation.
 */

import { describe, test, expect } from 'bun:test'
import { stripMdExtension } from '../src/render/components/index.ts'

describe('stripMdExtension — relative .md links', () => {
  test('strips .md from a simple relative link', () => {
    expect(stripMdExtension('./other-page.md')).toBe('./other-page')
  })

  test('strips .md from a parent-relative link', () => {
    expect(stripMdExtension('../docs/setup.md')).toBe('../docs/setup')
  })

  test('strips .md from a bare relative path', () => {
    expect(stripMdExtension('docs/setup.md')).toBe('docs/setup')
  })

  test('strips .md and preserves anchor', () => {
    expect(stripMdExtension('./page.md#section')).toBe('./page#section')
  })

  test('strips .md and preserves query string', () => {
    expect(stripMdExtension('./page.md?ref=main')).toBe('./page?ref=main')
  })

  test('strips .md and preserves both anchor and query string', () => {
    expect(stripMdExtension('./page.md?ref=main#heading')).toBe('./page?ref=main#heading')
  })
})

describe('stripMdExtension — index/README files', () => {
  test('index.md in a directory becomes a trailing slash', () => {
    expect(stripMdExtension('docs/index.md')).toBe('docs/')
  })

  test('./docs/index.md becomes ./docs/', () => {
    expect(stripMdExtension('./docs/index.md')).toBe('./docs/')
  })

  test('bare index.md becomes ./', () => {
    expect(stripMdExtension('index.md')).toBe('./')
  })

  test('README.md in a directory becomes a trailing slash', () => {
    expect(stripMdExtension('docs/README.md')).toBe('docs/')
  })

  test('readme.md (lowercase) in a directory becomes a trailing slash', () => {
    expect(stripMdExtension('docs/readme.md')).toBe('docs/')
  })

  test('index.md with anchor', () => {
    expect(stripMdExtension('docs/index.md#overview')).toBe('docs/#overview')
  })
})

describe('stripMdExtension — absolute URLs are unchanged', () => {
  test('https URL with .md is not modified', () => {
    expect(stripMdExtension('https://example.com/file.md')).toBe('https://example.com/file.md')
  })

  test('http URL with .md is not modified', () => {
    expect(stripMdExtension('http://example.com/file.md')).toBe('http://example.com/file.md')
  })

  test('https URL without .md is not modified', () => {
    expect(stripMdExtension('https://example.com/page')).toBe('https://example.com/page')
  })
})

describe('stripMdExtension — anchor-only links are unchanged', () => {
  test('anchor-only link is not modified', () => {
    expect(stripMdExtension('#section')).toBe('#section')
  })

  test('anchor with text is not modified', () => {
    expect(stripMdExtension('#getting-started')).toBe('#getting-started')
  })
})

describe('stripMdExtension — links without .md are unchanged', () => {
  test('relative link without .md extension', () => {
    expect(stripMdExtension('./other-page')).toBe('./other-page')
  })

  test('link to a .md-like directory (no file extension)', () => {
    expect(stripMdExtension('./cmd')).toBe('./cmd')
  })

  test('empty string', () => {
    expect(stripMdExtension('')).toBe('')
  })
})
