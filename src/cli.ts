#!/usr/bin/env bun
import { resolve } from 'node:path'
import { access } from 'node:fs/promises'
import { resolveConfig } from './config/defaults.ts'
import type { MkdnSiteConfig } from './config/schema.ts'
import { LocalAdapter } from './adapters/local.ts'
import { createHandler } from './handler.ts'

interface ParsedArgs {
  config: Partial<MkdnSiteConfig>
  configPath?: string
}

export function parseArgs (args: string[]): ParsedArgs {
  const result: Record<string, unknown> = {}
  let configPath: string | undefined

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--config') {
      configPath = args[++i]
    } else if (arg === '--port' || arg === '-p') {
      result.server = { ...(result.server as object ?? {}), port: parseInt(args[++i], 10) }
    } else if (arg === '--title') {
      result.site = { ...(result.site as object ?? {}), title: args[++i] }
    } else if (arg === '--url') {
      result.site = { ...(result.site as object ?? {}), url: args[++i] }
    } else if (arg === '--og-image') {
      result.site = { ...(result.site as object ?? {}), og: { ...((result.site as Record<string, unknown>)?.og as object ?? {}), image: args[++i] } }
    } else if (arg === '--og-type') {
      result.site = { ...(result.site as object ?? {}), og: { ...((result.site as Record<string, unknown>)?.og as object ?? {}), type: args[++i] } }
    } else if (arg === '--twitter-card') {
      result.site = { ...(result.site as object ?? {}), og: { ...((result.site as Record<string, unknown>)?.og as object ?? {}), twitterCard: args[++i] } }
    } else if (arg === '--twitter-site') {
      result.site = { ...(result.site as object ?? {}), og: { ...((result.site as Record<string, unknown>)?.og as object ?? {}), twitterSite: args[++i] } }
    } else if (arg === '--preset') {
      result.preset = args[++i]
    } else if (arg === '--page-title') {
      result.theme = { ...(result.theme as object ?? {}), pageTitle: true }
    } else if (arg === '--no-page-title') {
      result.theme = { ...(result.theme as object ?? {}), pageTitle: false }
    } else if (arg === '--page-date') {
      result.theme = { ...(result.theme as object ?? {}), pageDate: true }
    } else if (arg === '--no-page-date') {
      result.theme = { ...(result.theme as object ?? {}), pageDate: false }
    } else if (arg === '--prev-next') {
      result.theme = { ...(result.theme as object ?? {}), prevNext: true }
    } else if (arg === '--no-prev-next') {
      result.theme = { ...(result.theme as object ?? {}), prevNext: false }
    } else if (arg === '--reading-time') {
      result.theme = { ...(result.theme as object ?? {}), readingTime: true }
    } else if (arg === '--no-reading-time') {
      result.theme = { ...(result.theme as object ?? {}), readingTime: false }
    } else if (arg === '--no-toc') {
      result.theme = { ...(result.theme as object ?? {}), showToc: false }
    } else if (arg === '--no-nav') {
      result.theme = { ...(result.theme as object ?? {}), showNav: false }
    } else if (arg === '--no-mcp') {
      result.mcp = { ...(result.mcp ?? {}), enabled: false }
    } else if (arg === '--mcp-endpoint') {
      const ep = args[++i]
      if (ep == null || !ep.startsWith('/')) {
        console.error('Error: --mcp-endpoint must start with / (e.g. /mcp)')
        process.exit(1)
      }
      result.mcp = { ...(result.mcp ?? {}), endpoint: ep }
    } else if (arg === '--no-llms-txt') {
      result.llmsTxt = { enabled: false }
    } else if (arg === '--no-negotiate') {
      result.negotiation = { enabled: false }
    } else if (arg === '--no-client-js') {
      result.client = { enabled: false, mermaid: false, copyButton: false, themeToggle: false, math: false, search: false }
    } else if (arg === '--no-theme-toggle') {
      result.client = { ...(result.client as object ?? {}), themeToggle: false }
    } else if (arg === '--no-math') {
      result.client = { ...(result.client as object ?? {}), math: false }
    } else if (arg === '--no-search') {
      result.client = { ...(result.client as object ?? {}), search: false }
    } else if (arg === '--color-scheme') {
      result.theme = { ...(result.theme as object ?? {}), colorScheme: args[++i] }
    } else if (arg === '--theme-mode') {
      result.theme = { ...(result.theme as object ?? {}), mode: args[++i] }
    } else if (arg === '--accent') {
      result.theme = { ...(result.theme as object ?? {}), colors: { ...((result.theme as Record<string, unknown>)?.colors as object ?? {}), accent: args[++i] } }
    } else if (arg === '--logo') {
      result.theme = { ...(result.theme as object ?? {}), logo: { ...((result.theme as Record<string, unknown>)?.logo as object ?? {}), src: args[++i] } }
    } else if (arg === '--logo-text') {
      result.theme = { ...(result.theme as object ?? {}), logoText: args[++i] }
    } else if (arg === '--custom-css') {
      result.theme = { ...(result.theme as object ?? {}), customCss: args[++i] }
    } else if (arg === '--custom-css-url') {
      result.theme = { ...(result.theme as object ?? {}), customCssUrl: args[++i] }
    } else if (arg === '--no-builtin-css') {
      result.theme = { ...(result.theme as object ?? {}), builtinCss: false }
    } else if (arg === '--font-body') {
      result.theme = { ...(result.theme as object ?? {}), fonts: { ...((result.theme as Record<string, unknown>)?.fonts as object ?? {}), body: args[++i] } }
    } else if (arg === '--font-mono') {
      result.theme = { ...(result.theme as object ?? {}), fonts: { ...((result.theme as Record<string, unknown>)?.fonts as object ?? {}), mono: args[++i] } }
    } else if (arg === '--font-heading') {
      result.theme = { ...(result.theme as object ?? {}), fonts: { ...((result.theme as Record<string, unknown>)?.fonts as object ?? {}), heading: args[++i] } }
    } else if (arg === '--github') {
      const parts = args[++i].split('/')
      if (parts.length !== 2 || parts[0] === '' || parts[1] === '') {
        console.error('Error: --github requires owner/repo format (e.g. mkdnsite/mkdnsite)')
        process.exit(1)
      }
      result.github = { ...(result.github ?? {}), owner: parts[0], repo: parts[1] }
    } else if (arg === '--github-ref') {
      result.github = { ...(result.github ?? {}), ref: args[++i] }
    } else if (arg === '--github-path') {
      result.github = { ...(result.github ?? {}), path: args[++i] }
    } else if (arg === '--github-token') {
      result.github = { ...(result.github ?? {}), token: args[++i] }
    } else if (arg === '--renderer') {
      result.renderer = args[++i]
    } else if (arg === '--static') {
      result.staticDir = resolve(args[++i])
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else if (arg === '--version' || arg === '-v') {
      console.log('mkdnsite 0.0.1')
      process.exit(0)
    } else if (!arg.startsWith('-')) {
      result.contentDir = resolve(arg)
    }
  }

  return { config: result as Partial<MkdnSiteConfig>, configPath }
}

function printHelp (): void {
  console.log(`
  mkdnsite — Markdown for the web

  Usage:
    mkdnsite [directory] [options]
    mkdnsite mcp [directory] [options]

  Subcommands:
    mcp [directory] [options]  Run as MCP server over stdio (no web server)
                               Supports the same content source options below

  Arguments:
    directory             Path to markdown content (default: ./content)

  Options:
    --config <path>       Path to config file (default: mkdnsite.config.ts)
    -p, --port <n>        Port to listen on (default: 3000)
    --title <text>        Site title
    --url <url>           Base URL for absolute links
    --og-image <url>      Default OpenGraph image URL
    --og-type <type>      Default OpenGraph type (website or article)
    --twitter-card <type> Twitter card type: summary or summary_large_image
    --twitter-site <handle> Twitter @handle for the site
    --static <dir>        Directory for static assets
    --color-scheme <val>  Color scheme: system (default), light, or dark
    --theme-mode <mode>   Theme mode: prose (default) or components
    --accent <color>      Accent color CSS value (sets theme.colors.accent)
    --logo <url-path>     Logo image URL path, e.g. /logo.svg (sets theme.logo.src)
    --logo-text <text>    Site name / text logo in nav header
    --custom-css <css>    Inline CSS appended after built-in styles
    --custom-css-url <url> External stylesheet URL loaded via <link>
    --no-builtin-css      Strip built-in CSS (start from blank slate)
    --font-body <family>  Body/prose font stack (sets theme.fonts.body)
    --font-mono <family>  Monospace font stack (sets theme.fonts.mono)
    --font-heading <family> Heading font stack (sets theme.fonts.heading)
    --preset <name>       Apply preset: docs or blog
    --page-title          Render frontmatter title as <h1> above content
    --no-page-title       Disable page title rendering
    --page-date           Render publish/update date from frontmatter
    --no-page-date        Disable page date rendering
    --prev-next           Show prev/next page navigation links
    --no-prev-next        Disable prev/next links
    --reading-time        Show estimated reading time
    --no-reading-time     Disable reading time display
    --no-toc              Disable table of contents sidebar
    --no-nav              Disable navigation sidebar
    --no-mcp              Disable the built-in MCP server
    --mcp-endpoint <path> Custom MCP endpoint path (default: /mcp)
    --no-llms-txt         Disable /llms.txt generation
    --no-negotiate        Disable content negotiation
    --renderer <engine>   Renderer: portable (default) or bun-native (Bun only)

  GitHub source:
    --github <owner/repo> Serve a public GitHub repo (e.g. --github owner/repo)
    --github-ref <ref>    Branch or tag to serve (default: main)
    --github-path <path>  Subdirectory within the repo to use as content root
    --github-token <token> GitHub token for private repos or higher rate limits
                          Also reads GITHUB_TOKEN or MKDNSITE_GITHUB_TOKEN env var

  Client-side features:
    --no-client-js        Disable client-side JavaScript (mermaid, copy, search, theme toggle)
    --no-theme-toggle     Disable light/dark theme toggle button
    --no-math             Disable KaTeX math rendering
    --no-search           Disable search functionality (UI and /api/search endpoint)
    -h, --help            Show this help
    -v, --version         Show version

  Content Negotiation:
    Browsers get HTML:    curl http://localhost:3000
    AI agents get MD:     curl -H "Accept: text/markdown" http://localhost:3000
    Append .md to URL:    curl http://localhost:3000/page.md
    AI content index:     curl http://localhost:3000/llms.txt

  https://mkdn.site
  `)
}

async function main (): Promise<void> {
  const rawArgv = process.argv.slice(2)

  // ── Subcommand: mkdnsite mcp [options] ──────────────────────────────────
  if (rawArgv[0] === 'mcp') {
    const mcpArgv = rawArgv.slice(1)
    const { config: cliConfig, configPath: cliConfigPath } = parseArgs(mcpArgv)

    let fileConfig: Partial<MkdnSiteConfig> = {}
    try {
      const cfgPath = cliConfigPath != null ? resolve(cliConfigPath) : resolve('mkdnsite.config.ts')
      if (cliConfigPath == null) await access(cfgPath)
      const mod = await import(cfgPath)
      fileConfig = mod.default ?? mod
    } catch { /* no config file */ }

    const merged: Partial<MkdnSiteConfig> = { ...fileConfig, ...cliConfig }
    if (fileConfig.github != null || cliConfig.github != null) {
      const gh = { ...fileConfig.github, ...cliConfig.github }
      merged.github = gh as MkdnSiteConfig['github']
    }
    if (merged.github != null && (merged.github.token == null || merged.github.token === '')) {
      const envToken = process.env.GITHUB_TOKEN ?? process.env.MKDNSITE_GITHUB_TOKEN ?? ''
      if (envToken !== '') merged.github = { ...merged.github, token: envToken }
    }

    const config = resolveConfig(merged)
    const { runMcpStdio } = await import('./mcp/stdio.ts')
    await runMcpStdio(config)
    return
  }

  const args = rawArgv
  const { config: cliConfig, configPath: cliConfigPath } = parseArgs(args)

  // Try to load config file: use --config path if provided, else auto-detect mkdnsite.config.ts
  let fileConfig: Partial<MkdnSiteConfig> = {}
  try {
    const configPath = cliConfigPath != null ? resolve(cliConfigPath) : resolve('mkdnsite.config.ts')
    if (cliConfigPath == null) {
      // Only auto-detect if file exists; don't error if absent
      await access(configPath)
    }
    const mod = await import(configPath)
    fileConfig = mod.default ?? mod
  } catch {
    // No config file, that's fine
  }

  const merged: Partial<MkdnSiteConfig> = {
    ...fileConfig,
    ...cliConfig
  }
  if (fileConfig.site != null || cliConfig.site != null) {
    const site: Partial<MkdnSiteConfig['site']> = { ...fileConfig.site, ...cliConfig.site }
    if (fileConfig.site?.og != null || cliConfig.site?.og != null) {
      site.og = { ...fileConfig.site?.og, ...cliConfig.site?.og }
    }
    merged.site = site as MkdnSiteConfig['site']
  }
  if (fileConfig.server != null || cliConfig.server != null) {
    const server: Partial<MkdnSiteConfig['server']> = { ...fileConfig.server, ...cliConfig.server }
    merged.server = server as MkdnSiteConfig['server']
  }
  if (fileConfig.theme != null || cliConfig.theme != null) {
    const theme: Partial<MkdnSiteConfig['theme']> = { ...fileConfig.theme, ...cliConfig.theme }
    merged.theme = theme as MkdnSiteConfig['theme']
  }
  if (fileConfig.client != null || cliConfig.client != null) {
    const client: Partial<MkdnSiteConfig['client']> = { ...fileConfig.client, ...cliConfig.client }
    merged.client = client as MkdnSiteConfig['client']
  }
  if (fileConfig.github != null || cliConfig.github != null) {
    const gh = { ...fileConfig.github, ...cliConfig.github }
    merged.github = gh as MkdnSiteConfig['github']
  }
  // Fall back to env var for GitHub token if not set via CLI or config file
  if (merged.github != null && (merged.github.token == null || merged.github.token === '')) {
    const envToken = process.env.GITHUB_TOKEN ?? process.env.MKDNSITE_GITHUB_TOKEN ?? ''
    if (envToken !== '') {
      merged.github = { ...merged.github, token: envToken }
    }
  }

  const config = resolveConfig(merged)

  const adapter = new LocalAdapter()
  const source = adapter.createContentSource(config)
  const renderer = await adapter.createRenderer(config)
  const handler = createHandler({ source, renderer, config })

  const stop = await adapter.start(handler, config)

  process.on('SIGINT', () => {
    stop()
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    stop()
    process.exit(0)
  })
}

// Only run when executed directly (not when imported for parseArgs in tests)
const isMainModule = typeof Bun !== 'undefined'
  ? Bun.main === import.meta.path
  : import.meta.url === `file://${process.argv[1]}`

if (isMainModule) {
  main().catch(err => {
    console.error('Error starting mkdnsite:', err)
    process.exit(1)
  })
}
