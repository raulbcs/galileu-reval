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
  const html = await get(`${BASE_URL}/`)
  if (!html) throw new Error('Failed to load homepage')

  const slugs = getSubcategorySlugs(html)
  log(`[collect] Found ${slugs.length} subcategories`)

  const SLUG_BATCH = 100
  const allProducts = []
  let extraUrlCount = 0

  // Phase 1: fetch first pages in batches, parse products, collect extra page URLs
  const slugData = []
  for (let i = 0; i < slugs.length; i += SLUG_BATCH) {
    const batch = slugs.slice(i, i + SLUG_BATCH)
    const urls = batch.map(s => `${BASE_URL}/${s}`)
    const pages = await fetchAll(urls)

    for (const { url, data } of pages) {
      const slug = batch.find(s => url.endsWith(s))
      if (!slug) continue
      const pageCount = getPaginationInfo(data)
      const products = parseProductsFromHtml(data, slug)
      slugData.push({ slug, pages: pageCount, products })

      const extras = pageCount > 1 ? pageCount - 1 : 0
      extraUrlCount += extras
    }

    log(`[collect] Phase 1: ${Math.min(i + SLUG_BATCH, slugs.length)}/${slugs.length} subcategories fetched`)
  }

  // Phase 2: fetch all extra pages in one big parallel batch (they're already paginated URLs)
  const extraUrls = []
  const extraSlugMap = new Map()
  for (const { slug, pages } of slugData) {
    for (let p = 2; p <= pages; p++) {
      const url = `${BASE_URL}/${slug}?page=${p}&slug=${slug}`
      extraUrls.push(url)
      extraSlugMap.set(url, slug)
    }
  }

  if (extraUrls.length) {
    log(`[collect] Phase 2: fetching ${extraUrls.length} extra pages...`)
    const EXTRA_BATCH = 200
    for (let i = 0; i < extraUrls.length; i += EXTRA_BATCH) {
      const batch = extraUrls.slice(i, i + EXTRA_BATCH)
      const pages = await fetchAll(batch)

      for (const { url, data } of pages) {
        const slug = extraSlugMap.get(url)
        const sd = slugData.find(s => s.slug === slug)
        if (sd) sd.products.push(...parseProductsFromHtml(data, slug))
      }

      log(`[collect] Phase 2: ${Math.min(i + EXTRA_BATCH, extraUrls.length)}/${extraUrls.length} extra pages fetched`)
    }
  }

  for (const { slug, products } of slugData) {
    allProducts.push(...products)
    if (products.length) log(`[collect] ${slug} → ${products.length} products`)
  }

  log(`[collect] Complete: ${allProducts.length} products from ${slugs.length} subcategories`)
  return allProducts
}
