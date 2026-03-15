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
 * 2. markdown Accept or .md URL → 'ai_agent'
 * 3. User-Agent matches a known bot pattern → 'bot'
 * 4. Otherwise → 'human'
 */
export function classifyTraffic (request: Request, format: AnalyticsResponseFormat): TrafficType {
  // MCP traffic
  if (format === 'mcp') return 'mcp'

  // AI agent: requested raw markdown
  const accept = request.headers.get('Accept') ?? ''
  const url = new URL(request.url)
  if (
    format === 'markdown' ||
    accept.includes('text/markdown') ||
    accept.includes('text/x-markdown') ||
    accept.includes('application/markdown') ||
    url.pathname.endsWith('.md')
  ) {
    return 'ai_agent'
  }

  // Known bot by User-Agent
  const ua = request.headers.get('User-Agent') ?? ''
  if (ua !== '' && BOT_PATTERNS.some(pattern => pattern.test(ua))) {
    return 'bot'
  }

  return 'human'
}
