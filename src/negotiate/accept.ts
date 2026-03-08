export type ResponseFormat = 'html' | 'markdown'

/**
 * Parse the Accept header and determine the preferred response format.
 */
export function negotiateFormat (acceptHeader: string | null): ResponseFormat {
  if (acceptHeader == null) return 'html'

  const types = parseAcceptHeader(acceptHeader)

  let markdownQ = -1
  let htmlQ = -1

  for (const { type, quality } of types) {
    if (
      type === 'text/markdown' ||
      type === 'text/x-markdown' ||
      type === 'application/markdown'
    ) {
      markdownQ = Math.max(markdownQ, quality)
    } else if (type === 'text/html') {
      htmlQ = Math.max(htmlQ, quality)
    } else if (type === '*/*') {
      if (htmlQ < 0) htmlQ = quality * 0.01
    }
  }

  if (markdownQ > htmlQ && markdownQ > 0) {
    return 'markdown'
  }

  if (markdownQ === htmlQ && markdownQ > 0) {
    const markdownIdx = types.findIndex(t =>
      t.type === 'text/markdown' ||
      t.type === 'text/x-markdown' ||
      t.type === 'application/markdown'
    )
    const htmlIdx = types.findIndex(t => t.type === 'text/html')

    if (markdownIdx >= 0 && (htmlIdx < 0 || markdownIdx < htmlIdx)) {
      return 'markdown'
    }
  }

  return 'html'
}

interface ParsedMediaType {
  type: string
  quality: number
}

function parseAcceptHeader (header: string): ParsedMediaType[] {
  return header
    .split(',')
    .map(part => {
      const trimmed = part.trim()
      const [type, ...params] = trimmed.split(';').map(s => s.trim())

      let quality = 1.0
      for (const param of params) {
        const match = param.match(/^q=([\d.]+)$/)
        if (match != null) {
          quality = parseFloat(match[1])
          break
        }
      }

      return { type: type.toLowerCase(), quality }
    })
    .sort((a, b) => b.quality - a.quality)
}
