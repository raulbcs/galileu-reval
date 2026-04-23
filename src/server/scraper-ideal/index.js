import { collect } from './collect.js'
import { extract } from './extract.js'
import { log } from './log.js'

export async function runScraper(onBatch) {
  log('[scraper-ideal] Starting full scrape...')
  const products = await collect()
  if (!products.length) {
    log('[scraper-ideal] No products found')
    return 0
  }

  const totalExtracted = await extract(products, onBatch)
  if (!totalExtracted) {
    log('[scraper-ideal] No products extracted')
    return 0
  }

  return totalExtracted
}
