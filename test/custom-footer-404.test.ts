/**
 * Tests for:
 * 1. showFooter config option — disables "Powered by mkdnsite" footer
 * 2. Custom 404.md support — renders 404.md content on missing pages
 */

import { describe, it, expect, afterEach } from 'bun:test'
import { resolve } from 'node:path'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { resolveConfig } from '../src/config/defaults.ts'
import type { ThemeConfig } from '../src/config/schema.ts'
import { renderPage } from '../src/render/page-shell.ts'
import { createHandler } from '../src/handler.ts'
import { FilesystemSource } from '../src/content/filesystem.ts'
import { PortableRenderer } from '../src/render/portable.ts'

const rootNav = { title: 'root', slug: '/', order: 0, children: [], isSection: false }
const baseMeta = { title: 'Test' }

// ── showFooter ────────────────────────────────────────────────────────────────

describe('showFooter config option', () => {
  it('renders "Powered by mkdnsite" footer by default', () => {
    const config = resolveConfig({})
    const html = renderPage({ renderedContent: '<p>hi</p>', meta: baseMeta, config, nav: rootNav, currentSlug: '/' })
    expect(html).toContain('Powered by')
    expect(html).toContain('mkdn.site')
    expect(html).toContain('class="mkdn-footer"')
  })

  it('hides footer when showFooter is false', () => {
    const theme: Partial<ThemeConfig> = { showFooter: false }
    const config = resolveConfig({ theme: theme as ThemeConfig })
    const html = renderPage({ renderedContent: '<p>hi</p>', meta: baseMeta, config, nav: rootNav, currentSlug: '/' })
    expect(html).not.toContain('Powered by')
    expect(html).not.toContain('class="mkdn-footer"')
  })

  it('shows footer when showFooter is explicitly true', () => {
    const theme: Partial<ThemeConfig> = { showFooter: true }
    const config = resolveConfig({ theme: theme as ThemeConfig })
    const html = renderPage({ renderedContent: '<p>hi</p>', meta: baseMeta, config, nav: rootNav, currentSlug: '/' })
    expect(html).toContain('Powered by')
  })

  it('default showFooter value is true', () => {
    const config = resolveConfig({})
    expect(config.theme.showFooter).toBe(true)
  })
})

// ── Custom 404.md ─────────────────────────────────────────────────────────────

const TMP_CONTENT = resolve(import.meta.dir, 'fixtures/content-404-test')

async function makeHandler (has404: boolean): Promise<ReturnType<typeof createHandler>> {
  await mkdir(TMP_CONTENT, { recursive: true })
  await writeFile(resolve(TMP_CONTENT, 'index.md'), '# Home\n\nWelcome.\n')
  if (has404) {
    await writeFile(resolve(TMP_CONTENT, '404.md'), '---\ntitle: Page Not Found\n---\n\n# Custom 404\n\nSorry, this page does not exist.\n')
  }
  const config = resolveConfig({ contentDir: TMP_CONTENT })
  const source = new FilesystemSource(config.contentDir)
  const renderer = new PortableRenderer()
  return createHandler({ source, renderer, config })
}

async function cleanup (): Promise<void> {
  await rm(TMP_CONTENT, { recursive: true, force: true })
}

describe('custom 404.md support', () => {
  // Always clean up the fixture directory after each test, even if assertions fail
  afterEach(cleanup)

  it('uses custom 404.md content when available', async () => {
    const handler = await makeHandler(true)
    const res = await handler(new Request('http://localhost:3000/this-does-not-exist'))
    expect(res.status).toBe(404)
    const html = await res.text()
    expect(html).toContain('Custom 404')
    expect(html).toContain('Sorry, this page does not exist.')
  })

  it('custom 404.md renders with status 404', async () => {
    const handler = await makeHandler(true)
    const res = await handler(new Request('http://localhost:3000/missing-page'))
    expect(res.status).toBe(404)
  })

  it('falls back to default render404 when no 404.md exists', async () => {
    const handler = await makeHandler(false)
    const res = await handler(new Request('http://localhost:3000/this-does-not-exist'))
    expect(res.status).toBe(404)
    const html = await res.text()
    // Default render404 text
    expect(html).toContain('404')
    expect(html).toContain('Page Not Found')
  })

  it('does not recurse when /404 itself is requested and no 404.md exists', async () => {
    const handler = await makeHandler(false)
    const res = await handler(new Request('http://localhost:3000/404'))
    // /404 slug check prevents recursion — falls back to default 404
    expect(res.status).toBe(404)
  })

  it('custom 404.md page renders HTML (not markdown) for text/html requests', async () => {
    const handler = await makeHandler(true)
    const res = await handler(new Request('http://localhost:3000/missing', {
      headers: { Accept: 'text/html' }
    }))
    expect(res.status).toBe(404)
    const ct = res.headers.get('Content-Type') ?? ''
    expect(ct).toContain('text/html')
  })
})
