import { describe, it, expect } from 'bun:test'
import { resolve } from 'node:path'
import { FilesystemSource } from '../src/content/filesystem.ts'

const CONTENT_DIR = resolve(import.meta.dir, '../content')

describe('FilesystemSource — include/exclude patterns', () => {
  describe('default (no patterns)', () => {
    const source = new FilesystemSource(CONTENT_DIR)

    it('serves index page', async () => {
      const page = await source.getPage('/')
      expect(page).not.toBeNull()
    })

    it('serves docs pages', async () => {
      const page = await source.getPage('/docs/getting-started')
      expect(page).not.toBeNull()
    })

    it('lists all pages', async () => {
      const pages = await source.listPages()
      expect(pages.length).toBeGreaterThan(1)
    })
  })

  describe('include patterns', () => {
    it('only serves pages matching include pattern', async () => {
      const source = new FilesystemSource(CONTENT_DIR, { include: ['docs/**'] })
      const pages = await source.listPages()
      // Every page slug should start with /docs/
      for (const page of pages) {
        expect(page.slug).toMatch(/^\/docs\//)
      }
    })

    it('blocks pages not matching include pattern', async () => {
      const source = new FilesystemSource(CONTENT_DIR, { include: ['docs/**'] })
      // index.md is at root, not under docs/
      const page = await source.getPage('/')
      expect(page).toBeNull()
    })

    it('serves pages that match include pattern via getPage', async () => {
      const source = new FilesystemSource(CONTENT_DIR, { include: ['docs/**'] })
      const page = await source.getPage('/docs/getting-started')
      expect(page).not.toBeNull()
    })

    it('include pattern limits nav tree', async () => {
      const source = new FilesystemSource(CONTENT_DIR, { include: ['docs/**'] })
      const nav = await source.getNavTree()
      // Root nav should only contain docs section children (not root index)
      const hasRootOnlyPage = nav.children.some(c => !c.slug.startsWith('/docs'))
      expect(hasRootOnlyPage).toBe(false)
    })
  })

  describe('exclude patterns', () => {
    it('excludes pages matching exclude pattern', async () => {
      const source = new FilesystemSource(CONTENT_DIR, { exclude: ['docs/**'] })
      const pages = await source.listPages()
      // No page slug should start with /docs/
      for (const page of pages) {
        expect(page.slug).not.toMatch(/^\/docs\//)
      }
    })

    it('serves pages NOT matching exclude pattern', async () => {
      const source = new FilesystemSource(CONTENT_DIR, { exclude: ['docs/**'] })
      const page = await source.getPage('/')
      expect(page).not.toBeNull()
    })

    it('blocks pages matching exclude pattern via getPage', async () => {
      const source = new FilesystemSource(CONTENT_DIR, { exclude: ['docs/**'] })
      const page = await source.getPage('/docs/getting-started')
      expect(page).toBeNull()
    })
  })

  describe('specific file pattern', () => {
    it('can target a single file', async () => {
      const source = new FilesystemSource(CONTENT_DIR, { include: ['index.md'] })
      const indexPage = await source.getPage('/')
      expect(indexPage).not.toBeNull()
      const docsPage = await source.getPage('/docs/getting-started')
      expect(docsPage).toBeNull()
    })
  })
})
