/**
 * Cross-runtime port-fallback smoke check.
 *
 *   bun run test/port-fallback.smoke.ts
 *   node --experimental-strip-types test/port-fallback.smoke.ts
 *   deno run --allow-read --allow-net --unstable-sloppy-imports test/port-fallback.smoke.ts
 */
import { createServer } from 'node:http'
import { LocalAdapter } from '../src/adapters/local.ts'
import { resolveConfig } from '../src/config/defaults.ts'

function assert (condition: unknown, message: string): asserts condition {
  if (condition == null || condition === false) throw new Error(message)
}

async function listenOnRandomPort (): Promise<number> {
  const port = await new Promise<number>((resolve, reject) => {
    blocker.once('error', reject)
    blocker.listen(0, '127.0.0.1', () => {
      blocker.removeListener('error', reject)
      const addr = blocker.address()
      assert(typeof addr === 'object' && addr != null, 'blocker address must be available')
      resolve(addr.port)
    })
  })

  assert(port > 0, 'blocker must listen on an OS-assigned port')
  return port
}

async function closeBlocker (): Promise<void> {
  if (!blocker.listening) return

  await new Promise<void>((resolve, reject) => {
    blocker.close((err?: Error) => {
      if (err != null) reject(err)
      else resolve()
    })
  })
}

// Block a port, start adapter on that port, assert fallback server responds.
const blocker = createServer()
const adapter = new LocalAdapter()
const handler = async (): Promise<Response> => new Response('ok')
const printedPorts: number[] = []
const originalLog = console.log
let stop: (() => void) | undefined

console.log = (...args: unknown[]) => {
  const message = args.map(String).join(' ')
  const match = message.match(/http:\/\/localhost:(\d+)/)
  if (match != null) printedPorts.push(Number(match[1]))
  originalLog(...args)
}

try {
  const port = await listenOnRandomPort()
  const config = resolveConfig({ contentDir: './content', server: { port, hostname: '127.0.0.1' } })
  stop = await adapter.start(handler, config)

  assert(typeof stop === 'function', 'adapter.start must return a stop function')

  const actualPort = printedPorts.at(-1)
  assert(actualPort != null && actualPort > 0, 'startup output must include actual port')
  assert(actualPort !== port, 'fallback port must differ from blocked preferred port')

  const response = await fetch(`http://127.0.0.1:${String(actualPort)}/`)
  assert(response.status === 200, `fallback server must respond 200, got ${String(response.status)}`)
  assert(await response.text() === 'ok', 'fallback server must use provided handler')

  console.log('PASS: port fallback smoke')
} finally {
  console.log = originalLog
  stop?.()
  await closeBlocker()
}
