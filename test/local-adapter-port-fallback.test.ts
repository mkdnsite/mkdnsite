import {
  describe,
  it,
  expect,
  spyOn,
  beforeEach,
  afterEach,
  type Mock
} from 'bun:test'
import { createServer, type Server } from 'node:http'
import { LocalAdapter } from '../src/adapters/local.ts'
import { resolveConfig } from '../src/config/defaults.ts'
import type { MkdnSiteConfig } from '../src/config/schema.ts'

/**
 * Common shape for any LocalAdapter `start*` method — async or sync.
 * Used so the same assertion can drive `start()` (Bun branch under bun test)
 * and the private `startNode()` accessed via cast.
 */
type StartFn = (
  handler: (request: Request) => Promise<Response>,
  config: MkdnSiteConfig
) => Promise<() => void> | (() => void)

const handler = async (): Promise<Response> => new Response('ok')

/** Bind a TCP server on an OS-chosen port so we can treat that port as occupied. */
async function occupyPort (): Promise<{ port: number, release: () => void }> {
  return await new Promise((resolve) => {
    const blocker: Server = createServer()
    blocker.listen(0, '127.0.0.1', () => {
      const addr = blocker.address()
      const port = typeof addr === 'object' && addr != null ? addr.port : 0
      resolve({ port, release: () => { blocker.close() } })
    })
  })
}

/** Reconstruct the captured banner from a console.log spy. */
function bannerFromSpy (spy: Mock<typeof console.log>): string {
  const calls = spy.mock.calls as unknown[][]
  return calls.map((args) => args.map((a) => String(a)).join(' ')).join('\n')
}

describe('LocalAdapter — port fallback', () => {
  // spyOn + mockImplementation captures calls without polluting test output,
  // and beforeEach/afterEach scope the spy to a single test. JS test runners
  // (Jest, Vitest, Bun) run tests within a file sequentially and parallelize
  // at the file level — so this pattern stays safe even if/when Bun moves to
  // parallel test execution.
  let logSpy: Mock<typeof console.log>

  beforeEach(() => {
    logSpy = spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  /** Shared fallback assertion for any start* variant on LocalAdapter. */
  async function assertFallback (startFn: StartFn, blockedPort: number): Promise<void> {
    const config = resolveConfig({
      contentDir: './content',
      server: { port: blockedPort, hostname: '127.0.0.1' }
    })

    const stop = await Promise.resolve(startFn(handler, config))
    try {
      const banner = bannerFromSpy(logSpy)

      // The notice line must mention the original (occupied) port.
      expect(banner).toContain(`Port ${String(blockedPort)} was in use`)

      // Recover the actual bound port from the printed URL.
      const match = /http:\/\/localhost:(\d+)/.exec(banner)
      expect(match).not.toBeNull()
      const actualPort = Number(match?.[1])
      expect(actualPort).toBeGreaterThan(0)
      expect(actualPort).not.toBe(blockedPort)

      // Prove the server is genuinely listening on the new port.
      const res = await fetch(`http://127.0.0.1:${String(actualPort)}/`)
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('ok')
    } finally {
      stop()
    }
  }

  it('falls back via public start() (exercises the Bun branch under bun test)', async () => {
    const { port, release } = await occupyPort()
    try {
      const adapter = new LocalAdapter()
      await assertFallback(adapter.start.bind(adapter), port)
    } finally {
      release()
    }
  })

  it('falls back via startNode() (exercises the EADDRINUSE retry path)', async () => {
    const { port, release } = await occupyPort()
    try {
      const adapter = new LocalAdapter()
      // startNode is private; cast through unknown for type-safe direct access.
      const startNode = (adapter as unknown as {
        startNode: StartFn
      }).startNode.bind(adapter)
      await assertFallback(startNode, port)
    } finally {
      release()
    }
  })

  it('uses the configured port when it is free', async () => {
    // Briefly occupy and release a port to learn a free one.
    // (Tiny TOCTOU window, acceptable for a smoke test.)
    const { port, release } = await occupyPort()
    release()

    const adapter = new LocalAdapter()
    const config = resolveConfig({
      contentDir: './content',
      server: { port, hostname: '127.0.0.1' }
    })

    const stop = await adapter.start(handler, config)
    try {
      const banner = bannerFromSpy(logSpy)
      expect(banner).toContain(`http://localhost:${String(port)}`)
      expect(banner).not.toContain('was in use')
    } finally {
      stop()
    }
  })
})
