import { BASE_URL, DELAY, CONCURRENCY } from './config.js'
import { get, fetchAll } from './fetch.js'
import { log } from './log.js'

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
  for (const m of html.matchAll(linkRe)) {
    const code = m[3]
    if (seen.has(code)) continue
    seen.add(code)
    products.push({ codigo: code, url: m[1], slug })
  }

  const cardRe = /data-codigo-produto="(\d+)"[^>]*data-nome="([^"]*)"[^>]*data-marca="([^"]*)"/g
  const cardMap = new Map()
  for (const m of html.matchAll(cardRe)) {
    cardMap.set(m[1], { nome: m[2], marca: m[3] })
  }

  const precoRe = /data-codigo-produto="(\d+)"[^>]*data-preco="([\d.]+)"/g
  const precoMap = new Map()
  for (const m of html.matchAll(precoRe)) {
    precoMap.set(m[1], parseFloat(m[2]))
  }

  for (const p of products) {
    const card = cardMap.get(p.codigo)
    p.nome = card ? card.nome : ''
    p.marca = card ? card.marca : ''
    p.preco = precoMap.get(p.codigo) || null
  }

  return products
}

export async function collect() {
  const resp = await get(`${BASE_URL}/`)
  if (!resp) throw new Error('Failed to load homepage')

  const slugs = getSubcategorySlugs(resp.data)
  log(`[collect] Found ${slugs.length} subcategories`)

  const allProducts = []

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i]
    const firstResp = await get(`${BASE_URL}/${slug}`)
    if (!firstResp) continue

    const pages = getPaginationInfo(firstResp.data)
    const products = parseProductsFromHtml(firstResp.data, slug)

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
    log(`[collect] ${i + 1}/${slugs.length} ${slug} → ${products.length} products (${pages} pages) | Total: ${allProducts.length}`)
    await new Promise(r => setTimeout(r, DELAY))
  }

  log(`[collect] Complete: ${allProducts.length} products from ${slugs.length} subcategories`)
  return allProducts
}
