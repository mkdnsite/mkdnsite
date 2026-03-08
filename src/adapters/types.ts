import type { MkdnSiteConfig } from '../config/schema'
import type { ContentSource } from '../content/types'
import type { MarkdownRenderer } from '../render/types'

/**
 * Deployment adapter interface.
 *
 * Each target deployment environment (Bun local, CF Workers,
 * Vercel Edge, Netlify, Fly.io, etc.) implements this interface
 * to provide the appropriate content source, renderer, and
 * any environment-specific setup.
 *
 * The adapter is responsible for:
 * 1. Creating the appropriate ContentSource for its environment
 * 2. Creating the appropriate MarkdownRenderer
 * 3. Providing the fetch handler in the format the platform expects
 * 4. Any platform-specific initialization (e.g. binding to KV, R2, etc.)
 */
export interface DeploymentAdapter {
  /** Human-readable name for logging */
  readonly name: string

  /** Create the content source for this environment */
  createContentSource: (config: MkdnSiteConfig) => ContentSource

  /** Create the markdown renderer for this environment */
  createRenderer: (config: MkdnSiteConfig) => MarkdownRenderer

  /**
   * Start the server (for adapters that manage their own server).
   * Returns a cleanup function.
   * For serverless adapters, this is a no-op.
   */
  start?: (
    handler: (request: Request) => Promise<Response>,
    config: MkdnSiteConfig
  ) => Promise<(() => void) | undefined>
}

/**
 * Detect the current runtime environment.
 */
export function detectRuntime (): 'bun' | 'cloudflare' | 'vercel' | 'netlify' | 'node' | 'deno' {
  if (typeof Bun !== 'undefined') return 'bun'
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as Record<string, unknown>
    if (g.caches != null && g.MINIFLARE != null) return 'cloudflare'
    if (g.Netlify != null) return 'netlify'
    if (g.Deno != null) return 'deno'
  }
  // Check for Vercel Edge Runtime
  if (process?.env?.VERCEL != null) return 'vercel'
  return 'node'
}
