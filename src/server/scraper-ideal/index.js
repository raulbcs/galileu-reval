import { collect } from './collect.js'
import { extract } from './extract.js'

export async function runScraper() {
  console.log('[scraper-ideal] Starting full scrape...')
  const products = await collect()
  if (!products.length) {
    console.log('[scraper-ideal] No products found')
    return []
  }

  const extracted = await extract(products)
  if (!extracted.length) {
    console.log('[scraper-ideal] No products extracted')
    return []
  }

  return extracted
}
