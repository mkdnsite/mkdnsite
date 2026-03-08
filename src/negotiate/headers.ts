import type { ContentSignals } from '../config/schema.ts'

export function markdownHeaders (
  tokenCount: number | null,
  signals?: ContentSignals
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'text/markdown; charset=utf-8',
    Vary: 'Accept',
    'Cache-Control': 'public, max-age=300'
  }

  if (tokenCount != null) {
    headers['x-markdown-tokens'] = String(tokenCount)
  }

  if (signals != null) {
    const parts: string[] = []
    if (signals.aiTrain !== undefined) parts.push(`ai-train=${signals.aiTrain}`)
    if (signals.search !== undefined) parts.push(`search=${signals.search}`)
    if (signals.aiInput !== undefined) parts.push(`ai-input=${signals.aiInput}`)
    if (parts.length > 0) {
      headers['Content-Signal'] = parts.join(', ')
    }
  }

  return headers
}

export function htmlHeaders (): Record<string, string> {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    Vary: 'Accept',
    'Cache-Control': 'public, max-age=300'
  }
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
