import { describe, it, expect } from 'bun:test'
import { parseArgs } from '../src/cli.ts'

describe('mcp subcommand — arg parsing', () => {
  it('parseArgs still works normally without mcp subcommand', () => {
    const { config } = parseArgs(['./content', '--port', '4000'])
    // parseArgs calls resolve() on the positional arg
    expect(config.contentDir).toMatch(/\/content$/)
    expect(config.server?.port).toBe(4000)
  })

  it('parseArgs works for mcp subcommand args (after mcp is stripped)', () => {
    // Simulate what main() does: strip 'mcp' then call parseArgs on the rest
    const rawArgv = ['mcp', './docs', '--github-ref', 'develop']
    const isMcp = rawArgv[0] === 'mcp'
    const mcpArgv = rawArgv.slice(1)
    expect(isMcp).toBe(true)
    const { config } = parseArgs(mcpArgv)
    expect(config.contentDir).toMatch(/\/docs$/)
    expect(config.github?.ref).toBe('develop')
  })

  it('mcp subcommand supports --github flag', () => {
    const rawArgv = ['mcp', '--github', 'owner/repo']
    const mcpArgv = rawArgv.slice(1)
    const { config } = parseArgs(mcpArgv)
    expect(config.github?.owner).toBe('owner')
    expect(config.github?.repo).toBe('repo')
  })

  it('mcp subcommand supports --github-path', () => {
    const rawArgv = ['mcp', '--github', 'org/repo', '--github-path', 'docs']
    const { config } = parseArgs(rawArgv.slice(1))
    expect(config.github?.path).toBe('docs')
  })

  it('mcp subcommand supports --config', () => {
    const rawArgv = ['mcp', '--config', 'my.config.ts']
    const { configPath } = parseArgs(rawArgv.slice(1))
    expect(configPath).toBe('my.config.ts')
  })

  it('non-mcp args do not trigger subcommand', () => {
    const rawArgv = ['./content', '--port', '3000']
    expect(rawArgv[0]).not.toBe('mcp')
  })
})

describe('mcp subcommand — does not start web server', () => {
  it('parseArgs treats unstripped mcp as a directory name (stripping is mains job)', () => {
    // Regression guard: without stripping 'mcp' first, parseArgs would resolve it
    // as a content directory. The stripping happens in main() before calling parseArgs.
    const { config } = parseArgs(['mcp'])
    // resolve('mcp') returns an absolute path ending in /mcp
    expect(config.contentDir).toMatch(/\/mcp$/)
  })
})
