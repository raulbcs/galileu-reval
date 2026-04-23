import { BASE_URL, DELAY, CONCURRENCY } from './config.js'
import { get, fetchAll } from './fetch.js'

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

export function getPaginationInfo(html) {
  const m = html.match(/data-pages="(\d+)"/)
  return m ? parseInt(m[1]) : 1
}

export function parseProductsFromHtml(html, slug) {
  const products = []
  const seen = new Set()

  const linkRe = /href="(https:\/\/www\.atacadoideal\.com\.br\/([a-z0-9-]+)-(\d+)-(\d+))"/g
  for (const a of html.matchAll(linkRe)) {
    const code = a[3]
    if (seen.has(code)) continue
    seen.add(code)

    let nome = '', marca = '', preco = null
    const card = html.match(new RegExp(
      `data-codigo-produto="${code}"[^>]*data-nome="([^"]*)"[^>]*data-marca="([^"]*)"`
    ))
    if (card) { nome = card[1]; marca = card[2] }

    const precoMatch = html.match(new RegExp(
      `data-codigo-produto="${code}"[^>]*data-preco="([\\d.]+)"`
    ))
    if (precoMatch) preco = parseFloat(precoMatch[1])

    products.push({ codigo: code, url: a[1], nome, marca, preco, slug })
  }

  return products
}

export async function collect() {
  const resp = await get(`${BASE_URL}/`)
  if (!resp) throw new Error('Failed to load homepage')

  const slugs = getSubcategorySlugs(resp.data)
  console.log(`[collect] Found ${slugs.length} subcategories`)

  const allProducts = []
  const slugMap = new Map()

  let slugIdx = 0
  for (const slug of slugs) {
    slugIdx++
    const firstResp = await get(`${BASE_URL}/${slug}`)
    if (!firstResp) continue

    const pages = getPaginationInfo(firstResp.data)
    const products = parseProductsFromHtml(firstResp.data, slug)
    slugMap.set(slug, { pages, products: products.length })

    if (pages > 1) {
      const pageUrls = []
      for (let p = 2; p <= pages; p++) {
        pageUrls.push(`${BASE_URL}/${slug}?page=${p}&slug=${slug}`)
      }
      await new Promise(r => setTimeout(r, DELAY))
      const pageResults = await fetchAll(pageUrls)
      for (const r of pageResults) {
        products.push(...parseProductsFromHtml(r.data, slug))
      }
    }

    allProducts.push(...products)
    console.log(`[collect] ${slugIdx}/${slugs.length} ${slug} → ${products.length} products (${pages} pages) | Total: ${allProducts.length}`)
    await new Promise(r => setTimeout(r, DELAY))
  }

  console.log(`[collect] Complete: ${allProducts.length} products from ${slugs.length} subcategories`)
  return allProducts
}
