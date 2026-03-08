import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, extname, basename, dirname } from 'node:path'
import { parseFrontmatter } from './frontmatter.ts'
import type { ContentSource, ContentPage, NavNode } from './types.ts'

export class FilesystemSource implements ContentSource {
  private readonly rootDir: string
  private readonly cache = new Map<string, ContentPage>()
  private navCache: NavNode | null = null
  private allPagesCache: ContentPage[] | null = null

  constructor (rootDir: string) {
    this.rootDir = rootDir
  }

  async getPage (slug: string): Promise<ContentPage | null> {
    const stripped = slug.replace(/^\/+|\/+$/g, '')
    const normalized = stripped !== '' ? stripped : 'index'

    if (this.cache.has(normalized)) {
      return this.cache.get(normalized) ?? null
    }

    const candidates = [
      join(this.rootDir, `${normalized}.md`),
      join(this.rootDir, normalized, 'index.md')
    ]

    if (normalized === 'index') {
      candidates.unshift(join(this.rootDir, 'index.md'))
      candidates.unshift(join(this.rootDir, 'README.md'))
    }

    for (const filePath of candidates) {
      try {
        const raw = await readFile(filePath, 'utf-8')
        const parsed = parseFrontmatter(raw)
        const fileStat = await stat(filePath)

        const page: ContentPage = {
          slug: `/${normalized === 'index' ? '' : normalized}`,
          sourcePath: filePath,
          meta: parsed.meta,
          body: parsed.body,
          raw: parsed.raw,
          modifiedAt: fileStat.mtime
        }

        this.cache.set(normalized, page)
        return page
      } catch {
        continue
      }
    }

    return null
  }

  async getNavTree (): Promise<NavNode> {
    if (this.navCache != null) return this.navCache
    this.navCache = await this.buildNavTree(this.rootDir, '/')
    return this.navCache
  }

  async listPages (): Promise<ContentPage[]> {
    if (this.allPagesCache != null) return this.allPagesCache

    const pages: ContentPage[] = []
    await this.walkDir(this.rootDir, pages)
    pages.sort((a, b) => a.slug.localeCompare(b.slug))
    this.allPagesCache = pages
    return pages
  }

  async refresh (): Promise<void> {
    this.cache.clear()
    this.navCache = null
    this.allPagesCache = null
  }

  private async walkDir (dir: string, pages: ContentPage[]): Promise<void> {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue
        }
        await this.walkDir(fullPath, pages)
      } else if (entry.isFile() && extname(entry.name) === '.md') {
        const relPath = relative(this.rootDir, fullPath)
        const slug = this.filePathToSlug(relPath)

        try {
          const raw = await readFile(fullPath, 'utf-8')
          const parsed = parseFrontmatter(raw)
          const fileStat = await stat(fullPath)

          if (parsed.meta.draft === true) continue

          pages.push({
            slug,
            sourcePath: fullPath,
            meta: parsed.meta,
            body: parsed.body,
            raw: parsed.raw,
            modifiedAt: fileStat.mtime
          })
        } catch {
          continue
        }
      }
    }
  }

  private filePathToSlug (relPath: string): string {
    let slug = relPath.replace(/\.md$/, '')

    const base = basename(slug)
    if (base === 'index' || base === 'README') {
      slug = dirname(slug)
      if (slug === '.') slug = ''
    }

    slug = slug.replace(/\\/g, '/')
    return `/${slug}`
  }

  private async buildNavTree (dir: string, slugPrefix: string): Promise<NavNode> {
    const entries = await readdir(dir, { withFileTypes: true })
    const children: NavNode[] = []

    let dirTitle = basename(dir)
    let dirOrder = 0

    for (const name of ['index.md', 'README.md']) {
      try {
        const raw = await readFile(join(dir, name), 'utf-8')
        const parsed = parseFrontmatter(raw)
        if (parsed.meta.title != null) dirTitle = parsed.meta.title
        if (parsed.meta.order != null) dirOrder = parsed.meta.order
        break
      } catch {
        continue
      }
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue

      const fullPath = join(dir, entry.name)
      const childSlug = `${slugPrefix}${slugPrefix.endsWith('/') ? '' : '/'}${entry.name}`

      if (entry.isDirectory()) {
        const subtree = await this.buildNavTree(fullPath, childSlug)
        children.push(subtree)
      } else if (
        entry.isFile() &&
        extname(entry.name) === '.md' &&
        entry.name !== 'index.md' &&
        entry.name !== 'README.md'
      ) {
        const raw = await readFile(fullPath, 'utf-8')
        const parsed = parseFrontmatter(raw)

        if (parsed.meta.draft === true) continue

        const name = basename(entry.name, '.md')
        const slug = `${slugPrefix}${slugPrefix.endsWith('/') ? '' : '/'}${name}`

        children.push({
          title: parsed.meta.title ?? titleCase(name),
          slug,
          order: parsed.meta.order ?? 999,
          children: [],
          isSection: false
        })
      }
    }

    children.sort((a, b) => (a.order !== 0 || b.order !== 0) ? a.order - b.order : a.title.localeCompare(b.title))

    return {
      title: titleCase(dirTitle),
      slug: slugPrefix,
      order: dirOrder,
      children,
      isSection: true
    }
  }
}

function titleCase (str: string): string {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
