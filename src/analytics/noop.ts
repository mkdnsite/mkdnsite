import type { TrafficAnalytics, TrafficEvent } from './types.ts'

/**
 * No-op analytics implementation.
 *
 * The default when no analytics backend is configured. logRequest() is a
 * genuine no-op — zero allocations, zero overhead beyond the null check in
 * the handler.
 */
export class NoopAnalytics implements TrafficAnalytics {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  logRequest (_event: TrafficEvent): void {
    // intentionally empty
  }
}
