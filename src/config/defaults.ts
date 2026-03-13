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
    search: true
  },
  renderer: 'portable'
}

/**
 * Deep merge user config with defaults.
 * User values take precedence at every nesting level.
 */
export function resolveConfig (
  userConfig: Partial<MkdnSiteConfig>
): MkdnSiteConfig {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    site: { ...DEFAULT_CONFIG.site, ...userConfig.site },
    server: { ...DEFAULT_CONFIG.server, ...userConfig.server },
    theme: { ...DEFAULT_CONFIG.theme, ...userConfig.theme },
    negotiation: {
      ...DEFAULT_CONFIG.negotiation,
      ...userConfig.negotiation,
      contentSignals: {
        ...DEFAULT_CONFIG.negotiation.contentSignals,
        ...userConfig.negotiation?.contentSignals
      }
    },
    llmsTxt: { ...DEFAULT_CONFIG.llmsTxt, ...userConfig.llmsTxt },
    client: { ...DEFAULT_CONFIG.client, ...userConfig.client }
  }
}
