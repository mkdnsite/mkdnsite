import type { ContentSignals, CacheConfig } from '../config/schema.ts'

function buildCacheControl (maxAge: number, swr: number): string {
  let cc = 'public, max-age=' + String(maxAge)
  if (swr > 0) cc += ', stale-while-revalidate=' + String(swr)
  return cc
}

function buildEtag (versionTag: string, slug?: string): string {
  const tag = slug != null ? versionTag + '-' + slug.replace(/[^a-zA-Z0-9-]/g, '_') : versionTag
  return 'W/"' + tag + '"'
}

export function markdownHeaders (
  tokenCount: number | null,
  signals?: ContentSignals,
  cache?: CacheConfig,
  slug?: string
): Record<string, string> {
  const maxAge = cache?.maxAgeMarkdown ?? 300
  const swr = cache?.staleWhileRevalidate ?? 0
  const headers: Record<string, string> = {
    'Content-Type': 'text/markdown; charset=utf-8',
    Vary: 'Accept',
    'Cache-Control': buildCacheControl(maxAge, swr)
  }

  if (cache?.versionTag != null && cache.versionTag !== '') {
    headers.ETag = buildEtag(cache.versionTag, slug)
  }

  if (tokenCount != null) {
    headers['x-markdown-tokens'] = String(tokenCount)
  }

  if (signals != null) {
    const parts: string[] = []
    if (signals.aiTrain !== undefined) parts.push('ai-train=' + String(signals.aiTrain))
    if (signals.search !== undefined) parts.push('search=' + String(signals.search))
    if (signals.aiInput !== undefined) parts.push('ai-input=' + String(signals.aiInput))
    if (parts.length > 0) {
      headers['Content-Signal'] = parts.join(', ')
    }
  }

  return headers
}

export function htmlHeaders (cache?: CacheConfig, slug?: string): Record<string, string> {
  const maxAge = cache?.maxAge ?? 300
  const swr = cache?.staleWhileRevalidate ?? 0
  const headers: Record<string, string> = {
    'Content-Type': 'text/html; charset=utf-8',
    Vary: 'Accept',
    'Cache-Control': buildCacheControl(maxAge, swr)
  }
  if (cache?.versionTag != null && cache.versionTag !== '') {
    headers.ETag = buildEtag(cache.versionTag, slug)
  }
  return headers
}

/**
 * Rough token count estimation for x-markdown-tokens header.
 * Approximation (~4 chars per token for English text).
 */
export function estimateTokens (text: string): number {
  if (text === '') return 0

  const words = text.split(/\s+/).filter(Boolean)
  let tokens = 0

  for (const word of words) {
    tokens += word.length <= 4 ? 1 : Math.ceil(word.length / 3.5)
  }

  const syntaxOverhead = (text.match(/[#*_`[\](){}|>~-]{2,}/g) ?? []).length
  tokens += syntaxOverhead

  return Math.max(1, Math.round(tokens))
}
