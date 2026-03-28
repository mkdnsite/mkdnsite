/**
 * Tests for theme.syntaxHighlight config option.
 *
 * - 'client' (default): Prism.js loaded from CDN at runtime
 * - 'server': Shiki SSR (WASM-based, not for CF Workers)
 * - false: no syntax highlighting
 */

import { describe, test, expect } from 'bun:test'
import { resolveConfig } from '../src/config/defaults.ts'
import type { ClientConfig } from '../src/config/schema.ts'
import { CLIENT_SCRIPTS } from '../src/client/scripts.ts'
import { renderPage } from '../src/render/page-shell.ts'

const rootNav = { title: 'root', slug: '/', order: 0, children: [], isSection: false }
const baseMeta = { title: 'Test' }

// ── Default ───────────────────────────────────────────────────────────────────

describe('syntaxHighlight default', () => {
  test("default is 'client'", () => {
    const config = resolveConfig({})
    expect(config.client.syntaxHighlight).toBe('client')
  })
})

// ── CLIENT_SCRIPTS ────────────────────────────────────────────────────────────

describe("CLIENT_SCRIPTS with syntaxHighlight: 'client'", () => {
  test('includes Prism script', () => {
    const config = resolveConfig({})
    const scripts = CLIENT_SCRIPTS(config.client)
    expect(scripts).toContain('prismjs')
    expect(scripts).toContain('prism-core.min.js')
    expect(scripts).toContain('prism-autoloader.min.js')
  })

  test('loads light theme CSS by default', () => {
    const config = resolveConfig({})
    const scripts = CLIENT_SCRIPTS(config.client)
    expect(scripts).toContain('prism.min.css')
  })

  test('loads dark theme CSS for dark mode', () => {
    const config = resolveConfig({})
    const scripts = CLIENT_SCRIPTS(config.client)
    expect(scripts).toContain('prism-tomorrow.min.css')
  })

  test('observer watches data-theme attribute changes', () => {
    const config = resolveConfig({})
    const scripts = CLIENT_SCRIPTS(config.client)
    expect(scripts).toContain('data-theme')
    expect(scripts).toContain('MutationObserver')
  })
})

describe("CLIENT_SCRIPTS with syntaxHighlight: 'server'", () => {
  test('does NOT include Prism script', () => {
    const client: Partial<ClientConfig> = { syntaxHighlight: 'server' }
    const config = resolveConfig({ client: client as ClientConfig })
    const scripts = CLIENT_SCRIPTS(config.client)
    expect(scripts).not.toContain('prismjs')
    expect(scripts).not.toContain('prism-core.min.js')
  })
})

describe('CLIENT_SCRIPTS with syntaxHighlight: false', () => {
  test('does NOT include Prism script', () => {
    const client: Partial<ClientConfig> = { syntaxHighlight: false }
    const config = resolveConfig({ client: client as ClientConfig })
    const scripts = CLIENT_SCRIPTS(config.client)
    expect(scripts).not.toContain('prismjs')
  })
})

// ── renderPage integration ────────────────────────────────────────────────────

describe("renderPage with syntaxHighlight: 'client'", () => {
  test('rendered HTML includes Prism CDN reference', () => {
    const config = resolveConfig({})
    const html = renderPage({ renderedContent: '<p>hi</p>', meta: baseMeta, config, nav: rootNav, currentSlug: '/' })
    expect(html).toContain('prismjs')
  })
})

describe("renderPage with syntaxHighlight: 'server'", () => {
  test('rendered HTML does not include Prism', () => {
    const client: Partial<ClientConfig> = { syntaxHighlight: 'server' }
    const config = resolveConfig({ client: client as ClientConfig })
    const html = renderPage({ renderedContent: '<p>hi</p>', meta: baseMeta, config, nav: rootNav, currentSlug: '/' })
    expect(html).not.toContain('prismjs')
  })
})

describe('renderPage with syntaxHighlight: false', () => {
  test('rendered HTML does not include Prism', () => {
    const client: Partial<ClientConfig> = { syntaxHighlight: false }
    const config = resolveConfig({ client: client as ClientConfig })
    const html = renderPage({ renderedContent: '<p>hi</p>', meta: baseMeta, config, nav: rootNav, currentSlug: '/' })
    expect(html).not.toContain('prismjs')
  })
})
