import type { MkdnSiteConfig } from './schema.ts'

export const DEFAULT_CONFIG: MkdnSiteConfig = {
  contentDir: './content',
  site: {
    title: 'mkdnsite',
    lang: 'en'
  },
  server: {
    port: 3000,
    hostname: '0.0.0.0'
  },
  theme: {
    mode: 'prose',
    builtinCss: true,
    pageTitle: false,
    pageDate: false,
    prevNext: false,
    readingTime: false,
    showNav: true,
    showToc: true,
    colorScheme: 'system',
    syntaxTheme: 'github-light',
    syntaxThemeDark: 'github-dark'
  },
  negotiation: {
    enabled: true,
    includeTokenCount: true,
    contentSignals: {
      aiTrain: 'yes',
      search: 'yes',
      aiInput: 'yes'
    }
  },
  llmsTxt: {
    enabled: true
  },
  client: {
    enabled: true,
    mermaid: true,
    copyButton: true,
    themeToggle: true,
    math: true,
    search: true,
    charts: true
  },
  renderer: 'portable',
  mcp: {
    enabled: true,
    endpoint: '/mcp'
  },
  csp: {
    enabled: true
  }
}

/**
 * Preset theme overrides applied before user config.
 * User values always win over preset values.
 */
const PRESET_THEME: Record<string, Partial<MkdnSiteConfig['theme']>> = {
  docs: {
    showNav: true,
    showToc: true,
    pageTitle: false,
    pageDate: false,
    prevNext: true,
    readingTime: false
  },
  blog: {
    showNav: false,
    showToc: false,
    pageTitle: true,
    pageDate: true,
    prevNext: true,
    readingTime: true
  }
}

/**
 * Deep merge user config with defaults, applying preset if set.
 * Merge order: DEFAULT_CONFIG → preset → userConfig
 * User values take precedence at every nesting level.
 */
export function resolveConfig (
  userConfig: Partial<MkdnSiteConfig>
): MkdnSiteConfig {
  const presetTheme = userConfig.preset != null
    ? (PRESET_THEME[userConfig.preset] ?? {})
    : {}

  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    site: { ...DEFAULT_CONFIG.site, ...userConfig.site },
    server: { ...DEFAULT_CONFIG.server, ...userConfig.server },
    theme: { ...DEFAULT_CONFIG.theme, ...presetTheme, ...userConfig.theme },
    negotiation: {
      ...DEFAULT_CONFIG.negotiation,
      ...userConfig.negotiation,
      contentSignals: {
        ...DEFAULT_CONFIG.negotiation.contentSignals,
        ...userConfig.negotiation?.contentSignals
      }
    },
    llmsTxt: { ...DEFAULT_CONFIG.llmsTxt, ...userConfig.llmsTxt },
    client: { ...DEFAULT_CONFIG.client, ...userConfig.client },
    github: userConfig.github,
    include: userConfig.include,
    exclude: userConfig.exclude,
    mcp: { ...DEFAULT_CONFIG.mcp, ...userConfig.mcp },
    analytics: userConfig.analytics != null
      ? {
          ...userConfig.analytics,
          traffic: userConfig.analytics.traffic != null
            ? { enabled: false, console: false, ...userConfig.analytics.traffic }
            : userConfig.analytics.traffic
        }
      : userConfig.analytics,
    csp: userConfig.csp != null
      ? { ...DEFAULT_CONFIG.csp, ...userConfig.csp }
      : DEFAULT_CONFIG.csp,
    cache: {
      enabled: userConfig.cache?.enabled ?? false,
      maxAge: userConfig.cache?.maxAge ?? 300,
      maxAgeMarkdown: userConfig.cache?.maxAgeMarkdown ?? 300,
      staleWhileRevalidate: userConfig.cache?.staleWhileRevalidate ?? 0,
      versionTag: userConfig.cache?.versionTag
    }
  }
}
