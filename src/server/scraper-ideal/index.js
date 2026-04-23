import { getSlugs, collectSlug } from './collect.js'
import { extract } from './extract.js'

export async function runScraper(onBatch) {
  console.log('[scraper-ideal] Starting full scrape...')
  const slugs = await getSlugs()
  if (!slugs.length) {
    console.log('[scraper-ideal] No subcategories found')
    return []
  }

  let totalExtracted = 0
  const allCodes = []

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i]
    const products = await collectSlug(slug)
    if (!products.length) continue

    const extracted = await extract(products)
    if (!extracted.length) continue

    totalExtracted += extracted.length
    console.log(`[scraper-ideal] ${i + 1}/${slugs.length} ${slug} → ${extracted.length} extracted | Total: ${totalExtracted}`)

    if (onBatch) {
      const codes = onBatch(extracted)
      allCodes.push(...codes)
    } else {
      allCodes.push(...extracted.map(p => String(p.codigo)))
    }
  }

  console.log(`[scraper-ideal] Complete: ${totalExtracted} products from ${slugs.length} subcategories`)
  return allCodes
}
