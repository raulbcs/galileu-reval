import { BASE_URL } from './config.js'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
}

const SESSION_COOKIE = process.env.IDEAL_SESSION_COOKIE || ''
if (SESSION_COOKIE) HEADERS.Cookie = `PHPSESSID=${SESSION_COOKIE}`

async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(url, { headers, signal: AbortSignal.timeout(20000) })
      if (resp.status === 404) return null
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return await resp.text()
    } catch {
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * 2 ** attempt))
    }
  }
  return null
}

function parseProductsFromHtml(html, slug) {
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

function getPaginationInfo(html) {
  const m = html.match(/data-pages="(\d+)"/)
  return m ? parseInt(m[1]) : 1
}

async function main() {
  const slugs = JSON.parse(process.argv[2])
  const allProducts = []

  for (const slug of slugs) {
    const html = await get(`${BASE_URL}/${slug}`)
    if (!html) continue

    const pages = getPaginationInfo(html)
    const products = parseProductsFromHtml(html, slug)

    for (let p = 2; p <= pages; p++) {
      const pageHtml = await get(`${BASE_URL}/${slug}?page=${p}&slug=${slug}`)
      if (pageHtml) products.push(...parseProductsFromHtml(pageHtml, slug))
    }

    allProducts.push(...products)
  }

  process.stdout.write(JSON.stringify(allProducts))
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
