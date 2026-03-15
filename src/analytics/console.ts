import type { TrafficAnalytics, TrafficEvent } from './types.ts'

/**
 * Console analytics implementation — writes a structured log line to stdout.
 *
 * Useful during development and debugging. Output format is a single JSON line
 * per request so it can be piped to `jq` or similar tools.
 *
 * Example output:
 * {"ts":1710000000000,"method":"GET","path":"/docs","format":"html","type":"human","status":200,"ms":12,"bytes":4321,"cache":false}
 */
export class ConsoleAnalytics implements TrafficAnalytics {
  private readonly output: (line: string) => void

  /**
   * @param output - Write function (defaults to console.log). Injectable for
   *   testing without polluting test output.
   */
  constructor (output?: (line: string) => void) {
    this.output = output ?? console.log
  }

  logRequest (event: TrafficEvent): void {
    this.output(JSON.stringify({
      ts: event.timestamp,
      method: event.method,
      path: event.path,
      format: event.format,
      type: event.trafficType,
      status: event.statusCode,
      ms: event.latencyMs,
      bytes: event.contentLength,
      cache: event.cacheHit,
      ua: event.userAgent
    }))
  }
}
