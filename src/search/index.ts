import type { ContentPage, ContentSource } from '../content/types.ts'

export interface SearchResult {
  slug: string
  title: string
  description?: string
  excerpt: string
  score: number
}

export interface SearchIndex {
  /** Add or update a page in the index */
  index: (page: ContentPage) => void
  /** Remove a page from the index */
  remove: (slug: string) => void
  /** Search for pages matching a query */
  search: (query: string, limit?: number) => SearchResult[]
  /** Rebuild the entire index from a content source */
  rebuild: (source: ContentSource) => Promise<void>
  /** Serialize internal index state to a JSON string for storage */
  serialize: () => string
  /** Restore index state from a previously serialized JSON string */
  deserialize: (data: string) => void
  /** Number of documents currently in the index */
  readonly size: number
}

/** Serialized format stored in cache / on disk */
export interface SerializedSearchIndex {
  /** Version tag for forward-compat */
  v: number
  /** Documents: slug → serialized entry */
  docs: Record<string, SerializedDocEntry>
  /** Inverted index: token → list of slugs */
  posting: Record<string, string[]>
}

interface SerializedDocEntry {
  slug: string
  title: string
  description?: string
  tags: string[]
  titleTokens: string[]
  descTokens: string[]
  tagTokens: string[]
  bodyTokens: string[]
  body: string
  termFreqs: Record<string, number>
  totalTokens: number
}

interface DocEntry {
  slug: string
  title: string
  description?: string
  tags: string[]
  titleTokens: string[]
  descTokens: string[]
  tagTokens: string[]
  bodyTokens: string[]
  body: string
  termFreqs: Map<string, number>
  totalTokens: number
}

export function createSearchIndex (): SearchIndex {
  // inverted index: token → set of slugs
  const posting = new Map<string, Set<string>>()
  const docs = new Map<string, DocEntry>()

  function addToPosting (token: string, slug: string): void {
    let set = posting.get(token)
    if (set == null) {
      set = new Set()
      posting.set(token, set)
    }
    set.add(slug)
  }

  function removeFromPosting (slug: string): void {
    for (const set of posting.values()) {
      set.delete(slug)
    }
  }

  function index (page: ContentPage): void {
    const slug = page.slug

    // Remove any existing entry first
    if (docs.has(slug)) removeFromPosting(slug)

    const title = String(page.meta.title ?? '')
    const description = page.meta.description != null ? String(page.meta.description) : undefined
    const tags: string[] = Array.isArray(page.meta.tags)
      ? (page.meta.tags as unknown[]).map(t => String(t))
      : []

    const titleTokens = tokenize(title)
    const descTokens = description != null ? tokenize(description) : []
    const tagTokens = tags.flatMap(t => tokenize(t))
    const bodyTokens = tokenize(stripMarkdown(page.body))

    // Boost: title 3x, description 2x, tags 2x
    const allTokens = [
      ...titleTokens, ...titleTokens, ...titleTokens,
      ...descTokens, ...descTokens,
      ...tagTokens, ...tagTokens,
      ...bodyTokens
    ]

    const termFreqs = new Map<string, number>()
    for (const t of allTokens) {
      termFreqs.set(t, (termFreqs.get(t) ?? 0) + 1)
    }

    const entry: DocEntry = {
      slug,
      title,
      description,
      tags,
      titleTokens,
      descTokens,
      tagTokens,
      bodyTokens,
      body: page.body,
      termFreqs,
      totalTokens: allTokens.length
    }
    docs.set(slug, entry)

    // Update posting list
    for (const token of termFreqs.keys()) {
      addToPosting(token, slug)
    }
  }

  function remove (slug: string): void {
    if (!docs.has(slug)) return
    removeFromPosting(slug)
    docs.delete(slug)
  }

  function search (query: string, limit = 10): SearchResult[] {
    const cappedLimit = Math.min(limit, 50)
    const trimmed = query.trim()
    if (trimmed === '') return []

    const queryTokens = tokenize(trimmed)
    if (queryTokens.length === 0) return []

    const totalDocs = docs.size
    if (totalDocs === 0) return []

    // Gather candidate slugs (any posting list hit)
    const candidates = new Set<string>()
    for (const token of queryTokens) {
      const set = posting.get(token)
      if (set != null) {
        for (const slug of set) candidates.add(slug)
      }
    }

    const results: SearchResult[] = []

    for (const slug of candidates) {
      const entry = docs.get(slug)
      if (entry == null) continue

      let score = 0
      for (const token of queryTokens) {
        const tf = (entry.termFreqs.get(token) ?? 0) / (entry.totalTokens === 0 ? 1 : entry.totalTokens)
        const docsWithTerm = posting.get(token)?.size ?? 0
        if (docsWithTerm === 0) continue
        // Smoothed IDF: log((N+1) / df) — avoids zero when N == df
        const idf = Math.log((totalDocs + 1) / docsWithTerm)
        score += tf * idf
      }

      if (score <= 0) continue

      results.push({
        slug,
        title: entry.title,
        description: entry.description,
        excerpt: buildExcerpt(entry.body, queryTokens),
        score
      })
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, cappedLimit)
  }

  async function rebuild (source: ContentSource): Promise<void> {
    const pages = await source.listPages()
    docs.clear()
    for (const set of posting.values()) set.clear()
    posting.clear()
    for (const page of pages) {
      if (page.meta.draft !== true) {
        index(page)
      }
    }
  }

  function serialize (): string {
    const docsObj: Record<string, SerializedDocEntry> = {}
    for (const [slug, entry] of docs) {
      const termFreqsObj: Record<string, number> = {}
      for (const [token, freq] of entry.termFreqs) {
        termFreqsObj[token] = freq
      }
      docsObj[slug] = {
        slug: entry.slug,
        title: entry.title,
        description: entry.description,
        tags: entry.tags,
        titleTokens: entry.titleTokens,
        descTokens: entry.descTokens,
        tagTokens: entry.tagTokens,
        bodyTokens: entry.bodyTokens,
        body: entry.body,
        termFreqs: termFreqsObj,
        totalTokens: entry.totalTokens
      }
    }

    const postingObj: Record<string, string[]> = {}
    for (const [token, set] of posting) {
      postingObj[token] = Array.from(set)
    }

    const serialized: SerializedSearchIndex = { v: 1, docs: docsObj, posting: postingObj }
    return JSON.stringify(serialized)
  }

  function deserialize (data: string): void {
    const parsed = JSON.parse(data) as SerializedSearchIndex
    if (parsed.v !== 1) {
      throw new Error('SearchIndex: unsupported serialization version ' + String(parsed.v))
    }

    // Clear current state
    docs.clear()
    posting.clear()

    // Restore docs
    for (const [slug, entry] of Object.entries(parsed.docs)) {
      const termFreqs = new Map<string, number>()
      for (const [token, freq] of Object.entries(entry.termFreqs)) {
        termFreqs.set(token, freq)
      }
      docs.set(slug, {
        slug: entry.slug,
        title: entry.title,
        description: entry.description,
        tags: entry.tags,
        titleTokens: entry.titleTokens,
        descTokens: entry.descTokens,
        tagTokens: entry.tagTokens,
        bodyTokens: entry.bodyTokens,
        body: entry.body,
        termFreqs,
        totalTokens: entry.totalTokens
      })
    }

    // Restore posting lists
    for (const [token, slugs] of Object.entries(parsed.posting)) {
      posting.set(token, new Set(slugs))
    }
  }

  return {
    index,
    remove,
    search,
    rebuild,
    serialize,
    deserialize,
    get size () { return docs.size }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tokenize (text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .map(t => t.replace(/^['-]+|['-]+$/g, ''))
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t))
}

function stripMarkdown (md: string): string {
  return md
    // Remove fenced code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    // Remove inline code
    .replace(/`[^`]+`/g, ' ')
    // Remove headings (keep text)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove images
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    // Remove links (keep text)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Remove bold/italic markers
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    // Remove blockquotes
    .replace(/^>\s*/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

function buildExcerpt (body: string, queryTokens: string[]): string {
  const plain = stripMarkdown(body)
  const lower = plain.toLowerCase()

  let bestPos = -1
  for (const token of queryTokens) {
    const pos = lower.indexOf(token)
    if (pos !== -1) {
      bestPos = pos
      break
    }
  }

  if (bestPos === -1) {
    return plain.slice(0, 150).trim() + (plain.length > 150 ? '…' : '')
  }

  const start = Math.max(0, bestPos - 50)
  const end = Math.min(plain.length, start + 150)
  const excerpt = plain.slice(start, end).trim()
  return (start > 0 ? '…' : '') + excerpt + (end < plain.length ? '…' : '')
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'its', 'this', 'that', 'be',
  'as', 'was', 'are', 'were', 'been', 'has', 'have', 'had', 'do', 'does',
  'did', 'not', 'no', 'so', 'if', 'up', 'can', 'will', 'you', 'we', 'he',
  'she', 'they', 'their', 'all', 'any', 'also', 'more', 'into', 'than',
  'then', 'when', 'how', 'what', 'which', 'who', 'use', 'used', 'using'
])
