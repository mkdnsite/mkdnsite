import { readFile, writeFile } from 'node:fs/promises'

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf-8')) as { version: string }
const content = `// Generated at build/release time. Do not edit manually.\n// For local dev, run: bun run version:generate\nexport const VERSION = '${pkg.version}'\n`
await writeFile(new URL('../src/version.ts', import.meta.url), content)
console.log(`Generated src/version.ts with VERSION = '${pkg.version}'`)
