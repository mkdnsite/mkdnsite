/**
 * Tests for ToC double-escaping fix.
 *
 * renderedContent has already been through renderToString(), so heading text
 * contains HTML entities like &amp; (already escaped). buildTocHtml() must
 * decode those entities before re-escaping with esc(), otherwise &amp; becomes
 * &amp;amp; in the ToC link text.
 */

import { describe, test, expect } from 'bun:test'
import { buildTocHtml } from '../src/render/page-shell.ts'

// Helper: build a minimal rendered HTML string with one heading
function h (level: number, id: string, text: string): string {
  return `<h${level} id="${id}" class="mkdn-heading mkdn-h${level}">${text}</h${level}>`
}

describe('buildTocHtml — HTML entity double-escaping', () => {
  test('ampersand in heading appears as & not &amp;amp; in ToC', () => {
    // renderToString already escaped & → &amp; in the rendered HTML
    const rendered = h(2, 'foo-bar', 'Foo &amp; Bar')
    const toc = buildTocHtml(rendered)
    expect(toc).toContain('>Foo &amp; Bar<')
    expect(toc).not.toContain('&amp;amp;')
  })

  test('double-quote in heading appears as &quot; not &amp;quot; in ToC', () => {
    const rendered = h(2, 'say-hello', 'Say &quot;Hello&quot;')
    const toc = buildTocHtml(rendered)
    expect(toc).toContain('&quot;Hello&quot;')
    expect(toc).not.toContain('&amp;quot;')
  })

  test('less-than in heading is handled correctly', () => {
    const rendered = h(2, 'a-lt-b', 'A &lt; B')
    const toc = buildTocHtml(rendered)
    expect(toc).toContain('A &lt; B')
    expect(toc).not.toContain('&amp;lt;')
  })

  test('greater-than in heading is handled correctly', () => {
    const rendered = h(2, 'a-gt-b', 'A &gt; B')
    const toc = buildTocHtml(rendered)
    expect(toc).toContain('A &gt; B')
    expect(toc).not.toContain('&amp;gt;')
  })

  test('apostrophe (&#39;) in heading is not double-escaped', () => {
    const rendered = h(2, 'its-fine', 'It&#39;s Fine')
    const toc = buildTocHtml(rendered)
    // After decode → "It's Fine" → esc() → "It&#x27;s Fine" or keeps it as plain apostrophe
    // The key check: no &#39; gets turned into &amp;#39; or &#amp;39;
    expect(toc).not.toContain('&amp;#39;')
    expect(toc).not.toContain('&#amp;')
  })

  test('numeric hex entity is decoded and re-escaped correctly', () => {
    const rendered = h(2, 'my-heading', 'My &#x26; Heading')
    const toc = buildTocHtml(rendered)
    // &#x26; decodes to & then re-escapes to &amp;
    expect(toc).toContain('My &amp; Heading')
    expect(toc).not.toContain('&amp;amp;')
    expect(toc).not.toContain('&#x26;')
  })
})

describe('buildTocHtml — normal headings still work', () => {
  test('plain heading text is included', () => {
    const rendered = h(2, 'getting-started', 'Getting Started')
    const toc = buildTocHtml(rendered)
    expect(toc).toContain('>Getting Started<')
  })

  test('heading id is used for the anchor href', () => {
    const rendered = h(2, 'my-section', 'My Section')
    const toc = buildTocHtml(rendered)
    expect(toc).toContain('href="#my-section"')
  })

  test('h2 h3 h4 all appear in the ToC', () => {
    const rendered = [
      h(2, 'sec-one', 'Section One'),
      h(3, 'sec-two', 'Sub Section'),
      h(4, 'sec-three', 'Deep Section')
    ].join('\n')
    const toc = buildTocHtml(rendered)
    expect(toc).toContain('mkdn-toc-2')
    expect(toc).toContain('mkdn-toc-3')
    expect(toc).toContain('mkdn-toc-4')
  })

  test('h1 is not included in the ToC', () => {
    const rendered = [
      h(1, 'title', 'Page Title'),
      h(2, 'intro', 'Introduction')
    ].join('\n')
    const toc = buildTocHtml(rendered)
    expect(toc).not.toContain('href="#title"')
    expect(toc).toContain('href="#intro"')
  })

  test('returns empty string when no headings', () => {
    expect(buildTocHtml('<p>No headings here</p>')).toBe('')
  })

  test('strips inline HTML from heading text (e.g. anchor icon)', () => {
    // Headings include an <a> anchor child from the Heading component
    const rendered = h(2, 'my-heading', '<a href="#my-heading" class="mkdn-heading-anchor" aria-hidden="true"><svg/></a> My Heading')
    const toc = buildTocHtml(rendered)
    // ToC link text should be just the heading words, no inline SVG or nested anchor markup
    expect(toc).toContain('>My Heading<')
    // The SVG markup should not appear in the link text
    expect(toc).not.toContain('<svg')
  })
})
