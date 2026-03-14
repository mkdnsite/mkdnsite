import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

/**
 * Creates a fetch-compatible handler that routes HTTP requests to the MCP server
 * via the Web Standard Streamable HTTP transport.
 *
 * Uses stateless mode (no session management) — each request is independent.
 * A single transport instance handles all concurrent requests.
 */
export function createMcpHandler (server: McpServer): (request: Request) => Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined // stateless mode
  })

  let connectPromise: Promise<void> | null = null

  async function ensureConnected (): Promise<void> {
    if (connectPromise == null) {
      connectPromise = server.connect(transport)
    }
    await connectPromise
  }

  return async (request: Request): Promise<Response> => {
    await ensureConnected()
    return await transport.handleRequest(request)
  }
}
