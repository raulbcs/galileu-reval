import { getSlugs, collectSlug } from './collect.js'
import { extract } from './extract.js'
import { log } from './log.js'

const SLUG_BATCH = 20

export async function runScraper(onBatch) {
  log('[scraper-ideal] Starting full scrape...')
  const slugs = await getSlugs()
  if (!slugs.length) {
    log('[scraper-ideal] No subcategories found')
    return 0
  }

  let totalExtracted = 0

  for (let i = 0; i < slugs.length; i += SLUG_BATCH) {
    const chunk = slugs.slice(i, i + SLUG_BATCH)

    // Collect subcategories in parallel (no HTML accumulation)
    const results = await Promise.all(chunk.map(s => collectSlug(s)))

    // Flatten products
    const products = []
    for (const { slug, products: prods } of results) {
      products.push(...prods)
      log(`[collect] ${Math.min(i + SLUG_BATCH, slugs.length)}/${slugs.length} ${slug} → ${prods.length} products`)
    }

    if (!products.length) continue

    // Extract + upsert via callback, then free
    const extracted = await extract(products, onBatch)
    totalExtracted += extracted

    log(`[scraper-ideal] Batch ${Math.min(i + SLUG_BATCH, slugs.length)}/${slugs.length} done | Total extracted: ${totalExtracted}`)

    if (global.gc) global.gc()
  }

  log(`[scraper-ideal] Complete: ${totalExtracted} products from ${slugs.length} subcategories`)
  return totalExtracted
}
