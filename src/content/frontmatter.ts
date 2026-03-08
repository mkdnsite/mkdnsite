import matter from 'gray-matter'
import type { MarkdownMeta } from './types.ts'

export interface ParsedMarkdown {
  meta: MarkdownMeta
  body: string
  raw: string
}

/**
 * Parse YAML frontmatter from a markdown string.
 * Uses gray-matter for full YAML support, falls back to regex parser.
 */
export function parseFrontmatter (raw: string): ParsedMarkdown {
  if (!raw.startsWith('---')) {
    return { meta: {}, body: raw, raw }
  }

  try {
    const result = matter(raw)
    return {
      meta: result.data as MarkdownMeta,
      body: result.content,
      raw
    }
  } catch {
    return parseFrontmatterSimple(raw)
  }
}

/**
 * Lightweight fallback parser for environments without gray-matter.
 * Handles simple key: value pairs (no nested YAML).
 */
function parseFrontmatterSimple (raw: string): ParsedMarkdown {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (match == null) {
    return { meta: {}, body: raw, raw }
  }

  const [, frontmatter, body] = match
  const meta: MarkdownMeta = {}

  for (const line of frontmatter.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue

    const key = line.slice(0, colonIdx).trim()
    const rawValue = line.slice(colonIdx + 1).trim()

    if (rawValue === 'true') {
      (meta as Record<string, unknown>)[key] = true
    } else if (rawValue === 'false') {
      (meta as Record<string, unknown>)[key] = false
    } else if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      (meta as Record<string, unknown>)[key] = rawValue
        .slice(1, -1)
        .split(',')
        .map(s => s.trim().replace(/^["']|["']$/g, ''))
    } else {
      (meta as Record<string, unknown>)[key] = rawValue
    }
  }

  return { meta, body, raw }
}
