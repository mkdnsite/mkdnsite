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

function parseArgs (args: string[]): ParsedArgs {
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
    } else if (arg === '--no-nav') {
      result.theme = { ...(result.theme as object ?? {}), showNav: false }
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
    --no-nav              Disable navigation sidebar
    --no-llms-txt         Disable /llms.txt generation
    --no-negotiate        Disable content negotiation
    --renderer <engine>   Renderer: portable (default) or bun-native (Bun only)
    --no-client-js        Disable client-side JavaScript (mermaid, copy, search, theme toggle)
    --no-theme-toggle     Disable light/dark theme toggle button
    --no-math             Disable KaTeX math rendering
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
  const args = process.argv.slice(2)
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
  const config = resolveConfig(merged)

  const adapter = new LocalAdapter()
  const source = adapter.createContentSource(config)
  const renderer = await adapter.createRenderer(config)
  const handler = createHandler({ source, renderer, config })

  await adapter.start(handler, config)
}

main().catch(err => {
  console.error('Error starting mkdnsite:', err)
  process.exit(1)
})
