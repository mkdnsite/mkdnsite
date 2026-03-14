import { describe, it, expect } from 'bun:test'
import { createSearchIndex } from '../src/search/index.ts'
import type { ContentPage, ContentSource, NavNode } from '../src/content/types.ts'

function makePage (slug: string, title: string, body: string, opts: {
  description?: string
  tags?: string[]
  draft?: boolean
} = {}): ContentPage {
  return {
    slug,
    sourcePath: `${slug.replace(/^\//, '')}.md`,
    meta: {
      title,
      description: opts.description,
      tags: opts.tags,
      draft: opts.draft
    },
    body,
    raw: `---\ntitle: ${title}\n---\n\n${body}`
  }
}

const mockSource = (pages: ContentPage[]): ContentSource => ({
  async getPage (slug: string) {
    return pages.find(p => p.slug === slug) ?? null
  },
  async getNavTree (): Promise<NavNode> {
    return { title: 'Root', slug: '/', order: 0, children: [], isSection: true }
  },
  async listPages () {
    return pages.filter(p => p.meta.draft !== true)
  },
  async refresh () {}
})

describe('SearchIndex.search', () => {
  it('returns empty array for empty query', () => {
    const idx = createSearchIndex()
    idx.index(makePage('/a', 'Alpha', 'Some content'))
    expect(idx.search('')).toEqual([])
    expect(idx.search('   ')).toEqual([])
  })

  it('finds page by title keyword', () => {
    const idx = createSearchIndex()
    idx.index(makePage('/a', 'Getting Started Guide', 'Installation and setup'))
    const results = idx.search('getting started')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].slug).toBe('/a')
  })

  it('finds page by body keyword', () => {
    const idx = createSearchIndex()
    idx.index(makePage('/a', 'Config', 'Set the hostname and port for your server'))
    const results = idx.search('hostname')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].slug).toBe('/a')
  })

  it('title matches score higher than body matches', () => {
    const idx = createSearchIndex()
    idx.index(makePage('/a', 'Authentication Guide', 'Various topics covered here'))
    idx.index(makePage('/b', 'Overview', 'This page covers authentication configuration and setup'))
    const results = idx.search('authentication')
    expect(results.length).toBe(2)
    expect(results[0].slug).toBe('/a') // title match ranked higher
  })

  it('description boost works', () => {
    const idx = createSearchIndex()
    idx.index(makePage('/a', 'Page A', 'Generic content', { description: 'Advanced caching configuration' }))
    idx.index(makePage('/b', 'Page B', 'This page mentions caching briefly once in the body'))
    const results = idx.search('caching')
    expect(results[0].slug).toBe('/a') // description boost
  })

  it('tag boost works', () => {
    const idx = createSearchIndex()
    idx.index(makePage('/a', 'Page A', 'Some content', { tags: ['typescript', 'config'] }))
    idx.index(makePage('/b', 'Page B', 'This page mentions typescript once in the body text here'))
    const results = idx.search('typescript')
    expect(results[0].slug).toBe('/a') // tag boost
  })

  it('returns results sorted by score descending', () => {
    const idx = createSearchIndex()
    idx.index(makePage('/a', 'TypeScript Guide', 'Complete TypeScript reference and configuration'))
    idx.index(makePage('/b', 'JavaScript Guide', 'TypeScript is mentioned once here'))
    const results = idx.search('typescript')
    expect(results[0].score).toBeGreaterThan(results[1].score)
  })

  it('excerpt contains matching context', () => {
    const idx = createSearchIndex()
    idx.index(makePage('/a', 'Config', 'This is a long document. It talks about configuring authentication tokens for your API service endpoints.'))
    const results = idx.search('authentication')
    expect(results.length).toBe(1)
    expect(results[0].excerpt).toContain('authentication')
  })

  it('excerpt falls back to start of body when no match found in body', () => {
    const idx = createSearchIndex()
    // Title matches but body doesn't contain the word
    const page = makePage('/a', 'Getting Started', 'This page explains setup procedures for new users.')
    idx.index(page)
    const results = idx.search('getting')
    expect(results.length).toBe(1)
    expect(results[0].excerpt.length).toBeGreaterThan(0)
  })

  it('limit parameter works', () => {
    const idx = createSearchIndex()
    for (let i = 0; i < 20; i++) {
      idx.index(makePage(`/p${i}`, `Page ${i}`, `Documentation about configuration setup ${i}`))
    }
    const results = idx.search('configuration', 5)
    expect(results.length).toBeLessThanOrEqual(5)
  })

  it('limit is capped at 50', () => {
    const idx = createSearchIndex()
    for (let i = 0; i < 60; i++) {
      idx.index(makePage(`/p${i}`, `Page ${i}`, `Documentation about setup ${i}`))
    }
    const results = idx.search('setup', 100)
    expect(results.length).toBeLessThanOrEqual(50)
  })

  it('special characters do not crash tokenizer', () => {
    const idx = createSearchIndex()
    idx.index(makePage('/a', 'Special <chars> & more', 'Content with $pecial chars! @mentions #tags.'))
    expect(() => idx.search('special')).not.toThrow()
    expect(() => idx.search('<script>')).not.toThrow()
    expect(() => idx.search('')).not.toThrow()
  })
})

describe('SearchIndex.remove', () => {
  it('remove() makes page unsearchable', () => {
    const idx = createSearchIndex()
    idx.index(makePage('/a', 'Authentication', 'Login and token management'))
    idx.remove('/a')
    const results = idx.search('authentication')
    expect(results.length).toBe(0)
  })

  it('remove() on non-existent slug is a no-op', () => {
    const idx = createSearchIndex()
    expect(() => idx.remove('/nonexistent')).not.toThrow()
  })

  it('re-indexing after remove updates search results', () => {
    const idx = createSearchIndex()
    idx.index(makePage('/a', 'Old Title', 'authentication docs'))
    idx.remove('/a')
    idx.index(makePage('/a', 'New Title', 'completely different content'))
    const authResults = idx.search('authentication')
    expect(authResults.length).toBe(0)
    const newResults = idx.search('different')
    expect(newResults.length).toBe(1)
  })
})

describe('SearchIndex.rebuild', () => {
  it('rebuild() indexes all non-draft pages', async () => {
    const idx = createSearchIndex()
    const pages = [
      makePage('/a', 'Alpha', 'content about configuration'),
      makePage('/b', 'Beta', 'another page about setup'),
      makePage('/c', 'Draft Page', 'secret stuff', { draft: true })
    ]
    await idx.rebuild(mockSource(pages))
    expect(idx.search('configuration').length).toBe(1)
    expect(idx.search('setup').length).toBe(1)
    expect(idx.search('secret').length).toBe(0) // draft excluded
  })

  it('rebuild() clears old index', async () => {
    const idx = createSearchIndex()
    const oldPages = [makePage('/old', 'Old Page', 'obsolete content')]
    await idx.rebuild(mockSource(oldPages))
    expect(idx.search('obsolete').length).toBe(1)

    const newPages = [makePage('/new', 'New Page', 'fresh documentation')]
    await idx.rebuild(mockSource(newPages))
    expect(idx.search('obsolete').length).toBe(0) // old content gone
    expect(idx.search('fresh').length).toBe(1)
  })
})
