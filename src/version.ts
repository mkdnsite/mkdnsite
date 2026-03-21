// Auto-read package version at module load time.
// Falls back to 'unknown' in environments where the file system is
// unavailable (e.g. Cloudflare Workers), which is fine — User-Agent
// without a version is still a valid User-Agent.
let version = 'unknown'
try {
  const url = new URL('../package.json', import.meta.url)
  const fs = await import('node:fs/promises')
  const pkg = JSON.parse(await fs.readFile(url, 'utf-8')) as { version: string }
  version = pkg.version
} catch {
  // Worker / edge runtime — file system unavailable
}

export const VERSION = version
