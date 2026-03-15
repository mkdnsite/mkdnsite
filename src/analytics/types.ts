/**
 * Traffic analytics types for mkdnsite.
 *
 * The TrafficAnalytics interface is the core extension point — implement it
 * to route request events to any analytics backend (console, CF Analytics Engine,
 * ClickHouse, Plausible, etc.).
 */

/** Classification of who sent the request */
export type TrafficType = 'human' | 'ai_agent' | 'bot' | 'mcp'

/** What format was served in the response */
export type AnalyticsResponseFormat = 'html' | 'markdown' | 'mcp' | 'api' | 'other'

/** A single request event captured by the analytics hook */
export interface TrafficEvent {
  /** Unix timestamp (ms) when the request started — Date.now() */
  timestamp: number
  /** URL pathname */
  path: string
  /** HTTP method (GET, POST, etc.) */
  method: string
  /** What was served */
  format: AnalyticsResponseFormat
  /** Classified caller type */
  trafficType: TrafficType
  /** HTTP status code of the response */
  statusCode: number
  /** End-to-end handler latency in milliseconds */
  latencyMs: number
  /** Raw User-Agent string */
  userAgent: string
  /** Response body size in bytes */
  contentLength: number
  /** Whether the response was served from cache */
  cacheHit: boolean
  /** Site identifier for multi-tenant deployments (e.g. mkdn.io). Undefined for single-site. */
  siteId?: string
}

/**
 * Pluggable traffic analytics backend.
 *
 * `logRequest` is fire-and-forget and must be synchronous (or fire async work
 * without blocking the response). Implementations must never throw.
 */
export interface TrafficAnalytics {
  logRequest: (event: TrafficEvent) => void
}
