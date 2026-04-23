import { collect } from './collect.js'
import { extract } from './extract.js'
import { log } from './log.js'

export async function runScraper() {
  log('[scraper-ideal] Starting full scrape...')
  const products = await collect()
  if (!products.length) {
    log('[scraper-ideal] No products found')
    return []
  }

  const extracted = await extract(products)
  if (!extracted.length) {
    log('[scraper-ideal] No products extracted')
    return []
  }

  return extracted
}
