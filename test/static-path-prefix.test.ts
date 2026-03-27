/**
 * Tests for static-dir prefix stripping in the handler.
 *
 * When staticDir = 'static', GitHub-compatible image paths like
 * /static/screenshot.png should resolve to the same file as /screenshot.png.
 * Without the fix, /static/x.png would build the path as static/static/x.png
 * and return 404.
 */

import { describe, it, expect } from 'bun:test'
import { resolve } from 'node:path'
import { createHandler } from '../src/handler.ts'
import { resolveConfig } from '../src/config/defaults.ts'
import { FilesystemSource } from '../src/content/filesystem.ts'
import { PortableRenderer } from '../src/render/portable.ts'

const FIXTURES_STATIC = resolve(import.meta.dir, 'fixtures/static')
const CONTENT_DIR = resolve(import.meta.dir, '../content')

function makeHandler (staticDir: string): ReturnType<typeof createHandler> {
  const config = resolveConfig({
    contentDir: CONTENT_DIR,
    staticDir,
    site: { title: 'Test Site' }
  })
  const source = new FilesystemSource(config.contentDir)
  const renderer = new PortableRenderer()
  return createHandler({ source, renderer, config })
}

describe('static dir prefix stripping', () => {
  it('serves /test.png directly from staticDir', async () => {
    const handler = makeHandler(FIXTURES_STATIC)
    const res = await handler(new Request('http://localhost:3000/test.png'))
    expect(res.status).toBe(200)
  })

  it('serves /static/test.png when staticDir basename is "static" (GitHub-compatible path)', async () => {
    const handler = makeHandler(FIXTURES_STATIC)
    // /static/test.png → strip /static prefix → /test.png → fixtures/static/test.png
    const res = await handler(new Request('http://localhost:3000/static/test.png'))
    expect(res.status).toBe(200)
  })

  it('both /test.png and /static/test.png serve the same file content', async () => {
    const handler = makeHandler(FIXTURES_STATIC)
    const [r1, r2] = await Promise.all([
      handler(new Request('http://localhost:3000/test.png')),
      handler(new Request('http://localhost:3000/static/test.png'))
    ])
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    expect(await r1.text()).toBe(await r2.text())
  })

  it('returns 404 for a missing file via the prefixed path', async () => {
    const handler = makeHandler(FIXTURES_STATIC)
    const res = await handler(new Request('http://localhost:3000/static/nonexistent.png'))
    expect(res.status).toBe(404)
  })

  it('does not strip an unrelated prefix', async () => {
    const handler = makeHandler(FIXTURES_STATIC)
    // /assets/test.png — prefix /assets ≠ /static, should not strip, → 404
    const res = await handler(new Request('http://localhost:3000/assets/test.png'))
    expect(res.status).toBe(404)
  })

  it('works when staticDir is an absolute path (uses basename only)', async () => {
    // FIXTURES_STATIC is an absolute path like /abs/path/to/fixtures/static
    // basename is still 'static', so /static/test.png should resolve
    const handler = makeHandler(FIXTURES_STATIC)
    const res = await handler(new Request('http://localhost:3000/static/test.png'))
    expect(res.status).toBe(200)
  })

  it('does not affect non-static-extension requests', async () => {
    const handler = makeHandler(FIXTURES_STATIC)
    // HTML pages should not be caught by static file handling
    const res = await handler(new Request('http://localhost:3000/static/page'))
    // Falls through to content routing → 404 (no such page)
    expect(res.status).toBe(404)
  })
})
