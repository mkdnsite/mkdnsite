import { describe, it, expect } from 'bun:test'
import { parseArgs } from '../src/cli.ts'
import { CLIENT_SCRIPTS } from '../src/client/scripts.ts'
import { BASE_THEME_CSS } from '../src/theme/base-css.ts'
import { resolveConfig } from '../src/config/defaults.ts'

describe('charts — CLI flag', () => {
  it('--no-charts sets client.charts to false', () => {
    const { config } = parseArgs(['--no-charts'])
    expect(config.client).toMatchObject({ charts: false })
  })

  it('--no-client-js also disables charts', () => {
    const { config } = parseArgs(['--no-client-js'])
    expect(config.client).toMatchObject({ charts: false, enabled: false })
  })

  it('charts flag is absent by default (resolveConfig provides default)', () => {
    const { config } = parseArgs([])
    // parseArgs doesn't set charts unless --no-charts is passed
    const resolved = resolveConfig(config)
    expect(resolved.client.charts).toBe(true)
  })
})

describe('charts — default config', () => {
  it('resolveConfig defaults charts to true', () => {
    const config = resolveConfig({})
    expect(config.client.charts).toBe(true)
  })

  it('charts can be disabled via config object', () => {
    const partial = { charts: false }
    const config = resolveConfig({ client: partial as never })
    expect(config.client.charts).toBe(false)
  })
})

describe('charts — CLIENT_SCRIPTS', () => {
  it('includes Chart.js CDN script when charts is enabled', () => {
    const config = resolveConfig({})
    const scripts = CLIENT_SCRIPTS(config.client)
    expect(scripts).toContain('chart.js')
    expect(scripts).toContain('language-chart')
  })

  it('does not include chart script when charts is disabled', () => {
    const partial = { charts: false }
    const config = resolveConfig({ client: partial as never })
    const scripts = CLIENT_SCRIPTS(config.client)
    expect(scripts).not.toContain('language-chart')
  })

  it('does not include chart script when all client JS is disabled', () => {
    const partial = { enabled: false }
    const config = resolveConfig({ client: partial as never })
    const scripts = CLIENT_SCRIPTS(config.client)
    expect(scripts).toBe('')
  })

  it('includes chart error handling', () => {
    const config = resolveConfig({})
    const scripts = CLIENT_SCRIPTS(config.client)
    expect(scripts).toContain('mkdn-chart-error')
  })

  it('includes color palette with accent color', () => {
    const config = resolveConfig({})
    const scripts = CLIENT_SCRIPTS(config.client)
    expect(scripts).toContain('--mkdn-accent')
    expect(scripts).toContain('palette')
  })
})

describe('charts — BASE_THEME_CSS', () => {
  it('includes .mkdn-chart styles', () => {
    expect(BASE_THEME_CSS).toContain('.mkdn-chart')
    expect(BASE_THEME_CSS).toContain('mkdn-chart canvas')
  })

  it('includes .mkdn-chart-error styles', () => {
    expect(BASE_THEME_CSS).toContain('.mkdn-chart-error')
  })

  it('chart container uses theme variables', () => {
    expect(BASE_THEME_CSS).toContain('var(--mkdn-bg)')
    expect(BASE_THEME_CSS).toContain('var(--mkdn-border)')
  })
})
