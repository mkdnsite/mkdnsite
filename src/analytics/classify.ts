import type { TrafficType, AnalyticsResponseFormat } from './types.ts'

/**
 * Known crawler / bot User-Agent patterns.
 * Checked case-insensitively.
 *
 * This list is intentionally extensible — add entries as new crawlers appear.
 */
export const BOT_PATTERNS: RegExp[] = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i, // Yahoo
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /sogou/i,
  /exabot/i,
  /facebot/i,
  /ia_archiver/i, // Alexa / Internet Archive
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /rogerbot/i,
  /archive\.org_bot/i,
  /petalbot/i,
  /bytespider/i, // TikTok
  /applebot/i,
  /linkedinbot/i,
  /twitterbot/i,
  /facebookexternalhit/i,
  /whatsapp/i,
  /telegrambot/i,
  /discordbot/i,
  /slackbot/i
]

/**
 * Classify a request as human, ai_agent, bot, or mcp traffic.
 *
 * Rules (evaluated in order):
 * 1. MCP format → 'mcp'
 * 2. markdown format (already resolved by the handler from Accept header / .md URL) → 'ai_agent'
 * 3. User-Agent matches a known bot pattern → 'bot'
 * 4. Otherwise → 'human'
 *
 * The `format` parameter is pre-resolved by the handler's `resolveAnalyticsFormat()`,
 * which already checks Content-Type, Accept headers, and .md URL suffix — so we
 * avoid duplicating that logic here.
 */
export function classifyTraffic (request: Request, format: AnalyticsResponseFormat): TrafficType {
  // MCP traffic
  if (format === 'mcp') return 'mcp'

  // AI agent: served raw markdown (format resolved from Accept header / .md URL / Content-Type)
  if (format === 'markdown') return 'ai_agent'

  // Known bot by User-Agent
  const ua = request.headers.get('User-Agent') ?? ''
  if (ua !== '' && BOT_PATTERNS.some(pattern => pattern.test(ua))) {
    return 'bot'
  }

  return 'human'
}
