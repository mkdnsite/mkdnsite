import type { ContentSource, ContentPage } from '../content/types'
import type { MkdnSiteConfig } from '../config/schema'

export async function generateLlmsTxt (
  source: ContentSource,
  config: MkdnSiteConfig
): Promise<string> {
  const pages = await source.listPages()
  const baseUrl = config.site.url ?? ''

  const lines: string[] = []

  lines.push(`# ${config.site.title}`)
  lines.push('')

  const desc = config.llmsTxt.description ?? config.site.description
  if (desc != null) {
    lines.push(`> ${desc}`)
    lines.push('')
  }

  const groups = groupBySection(pages)

  for (const [section, sectionPages] of Object.entries(groups)) {
    const sectionTitle = config.llmsTxt.sections?.[section] ??
      (section === '_root' ? 'Pages' : titleCase(section))

    lines.push(`## ${sectionTitle}`)
    lines.push('')

    for (const page of sectionPages) {
      const title = page.meta.title ?? slugToTitle(page.slug)
      const url = `${baseUrl}${page.slug}`
      const pageDesc = page.meta.description

      lines.push(pageDesc != null
        ? `- [${title}](${url}): ${pageDesc}`
        : `- [${title}](${url})`
      )
    }

    lines.push('')
  }

  return lines.join('\n')
}

function groupBySection (pages: ContentPage[]): Record<string, ContentPage[]> {
  const groups: Record<string, ContentPage[]> = {}

  for (const page of pages) {
    const segments = page.slug.replace(/^\//, '').split('/')
    const section = segments.length > 1 ? segments[0] : '_root'

    if (groups[section] == null) groups[section] = []
    groups[section].push(page)
  }

  return groups
}

function titleCase (str: string): string {
  return str.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function slugToTitle (slug: string): string {
  const name = slug.split('/').pop() ?? slug
  const cleaned = name.replace(/^\//, '')
  return titleCase(cleaned !== '' ? cleaned : 'Home')
}
