import type { NavNode } from './types.ts'

/**
 * Minimal file entry needed to build a nav tree.
 * Consumers (GitHubSource, R2ContentSource, etc.) map their own types to this.
 */
export interface FileEntry {
  /** Relative path from content root, e.g. 'docs/getting-started.md' */
  path: string
  /** Parsed frontmatter metadata */
  meta: Record<string, unknown>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function titleCase (str: string): string {
  return str.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getOrCreateSection (
  sections: Map<string, NavNode>,
  path: string,
  root: NavNode
): NavNode {
  if (sections.has(path)) return sections.get(path) as NavNode
  if (path === '') return root

  const parts = path.split('/')
  const parentPath = parts.slice(0, -1).join('/')
  const name = parts[parts.length - 1]
  const parent = getOrCreateSection(sections, parentPath, root)

  const section: NavNode = {
    title: titleCase(name),
    slug: '/' + path,
    order: 999,
    children: [],
    isSection: true
  }
  sections.set(path, section)
  parent.children.push(section)
  return section
}

function pruneEmpty (node: NavNode): boolean {
  node.children = node.children.filter(child => {
    if (!child.isSection) return true
    return pruneEmpty(child)
  })
  return node.children.length > 0
}

function sortNode (node: NavNode): void {
  node.children.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.title.localeCompare(b.title)
  })
  for (const child of node.children) {
    if (child.isSection) sortNode(child)
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build a NavNode tree from a flat list of file entries.
 *
 * - Files named index.md / README.md provide section metadata
 * - Files with draft: true in meta are excluded from navigation
 * - Sections with no navigable children are pruned
 */
export function buildNavTree (files: FileEntry[], rootTitle = 'Root'): NavNode {
  const root: NavNode = { title: rootTitle, slug: '/', order: 0, children: [], isSection: true }
  const sections = new Map<string, NavNode>()
  sections.set('', root)

  const isIndex = (p: string): boolean =>
    /(?:^|\/)(?:index|README|readme)\.md$/.test(p)

  const indexFiles = files.filter(f => isIndex(f.path))
  const leafFiles = files.filter(f => !isIndex(f.path))

  // Apply index file metadata to section nodes
  for (const file of indexFiles) {
    const parts = file.path.split('/')
    const dirParts = parts.slice(0, -1)
    if (dirParts.length === 0) continue // root index — not a section node

    const dirPath = dirParts.join('/')
    const section = getOrCreateSection(sections, dirPath, root)
    if (file.meta.title != null) section.title = file.meta.title as string
    if (file.meta.order != null) section.order = file.meta.order as number
  }

  // Add leaf nodes (non-index .md files)
  for (const file of leafFiles) {
    if (file.meta.draft === true) continue

    const parts = file.path.split('/')
    const fileName = parts[parts.length - 1]
    const dirParts = parts.slice(0, -1)
    const dirPath = dirParts.join('/')

    const parent = getOrCreateSection(sections, dirPath, root)
    const name = fileName.replace(/\.md$/, '')
    const slugPath = file.path.replace(/\.md$/, '')
    const node: NavNode = {
      title: file.meta.title != null ? file.meta.title as string : titleCase(name),
      slug: '/' + slugPath,
      order: file.meta.order != null ? file.meta.order as number : 999,
      children: [],
      isSection: false
    }
    parent.children.push(node)
  }

  pruneEmpty(root)
  sortNode(root)
  return root
}
