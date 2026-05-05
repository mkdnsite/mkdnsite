/**
 * Cross-runtime port-fallback test.
 *
 *   bun run test/port-fallback.test.ts
 *   node --experimental-strip-types test/port-fallback.test.ts
 *   deno run --allow-read --allow-net --unstable-sloppy-imports test/port-fallback.test.ts
 */
import { createServer } from 'node:http'
import { LocalAdapter } from '../src/adapters/local.ts'
import { resolveConfig } from '../src/config/defaults.ts'

// Block a port, start adapter on that port — should not throw.
const blocker = createServer()
const port = await new Promise<number>((resolve) => {
  blocker.listen(0, '127.0.0.1', () => {
    const addr = blocker.address()
    resolve(typeof addr === 'object' && addr != null ? addr.port : 0)
  })
})

const adapter = new LocalAdapter()
const handler = async (): Promise<Response> => new Response('ok')
const config = resolveConfig({ contentDir: './content', server: { port, hostname: '127.0.0.1' } })
const stop = await adapter.start(handler, config)

stop()
blocker.close()
console.log('PASS: port fallback')
