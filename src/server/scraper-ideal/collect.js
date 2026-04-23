import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { get } from './fetch.js'
import { log } from './log.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const execFileAsync = promisify(execFile)

const IGNORE_PREFIXES = [
  'quemsomos', 'politica', 'igualdade', 'marcas', 'novidades',
  'promocoes', 'vem-ai', 'm/', 'components/', 'controllers/', 'c/',
]

export function getSubcategorySlugs(html) {
  const slugs = new Set()
  for (const m of html.matchAll(/href="https:\/\/www\.atacadoideal\.com\.br\/([^"]+)"/g)) {
    const path = m[1]
    if (!/^[a-z0-9][a-z0-9/-]*[a-z0-9]$/.test(path)) continue
    if (!path.includes('/')) continue
    if (IGNORE_PREFIXES.some(p => path.startsWith(p))) continue
    slugs.add(path)
  }
  return [...slugs].sort()
}

export async function collect() {
  const html = await get('https://www.atacadoideal.com.br/')
  if (!html) throw new Error('Failed to load homepage')

  const slugs = getSubcategorySlugs(html)
  log(`[collect] Found ${slugs.length} subcategories`)

  const workerPath = path.join(__dirname, 'worker.js')
  const BATCH = 50
  const allProducts = []

  for (let i = 0; i < slugs.length; i += BATCH) {
    const batch = slugs.slice(i, i + BATCH)

    const { stdout } = await execFileAsync('node', [workerPath, JSON.stringify(batch)], {
      maxBuffer: 50 * 1024 * 1024,
      env: { ...process.env },
    })

    const products = JSON.parse(stdout)
    allProducts.push(...products)
    log(`[collect] ${Math.min(i + BATCH, slugs.length)}/${slugs.length} | Total: ${allProducts.length}`)
  }

  log(`[collect] Complete: ${allProducts.length} products from ${slugs.length} subcategories`)
  return allProducts
}
