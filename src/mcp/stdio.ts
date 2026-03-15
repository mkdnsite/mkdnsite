import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type { MkdnSiteConfig } from '../config/schema.ts'
import { createSearchIndex } from '../search/index.ts'
import { createMcpServer } from './server.ts'

/**
 * Run the MCP server over stdio (JSON-RPC via stdin/stdout).
 *
 * Used by the `mkdnsite mcp` subcommand for MCP clients like Claude Desktop
 * that communicate via stdio rather than HTTP. Does NOT start a web server.
 */
export async function runMcpStdio (config: MkdnSiteConfig): Promise<void> {
  let source

  if (config.github?.owner != null && config.github?.repo != null) {
    const { GitHubSource } = await import('../content/github.ts')
    source = new GitHubSource(config.github)
  } else {
    const { FilesystemSource } = await import('../content/filesystem.ts')
    source = new FilesystemSource(config.contentDir)
  }

  const searchIndex = createSearchIndex()
  await searchIndex.rebuild(source)

  const server = createMcpServer({ source, searchIndex })
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
