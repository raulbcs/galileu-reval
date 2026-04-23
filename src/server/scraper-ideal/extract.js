import * as cheerio from 'cheerio'
import { DELAY, CONCURRENCY } from './config.js'
import { fetchAll } from './fetch.js'

export function parseProductPage(html, codigo) {
  const data = { codigo, url: '', nome: '', descricao: '', marca: '', categoria: '', ean: '', sku_fabricante: '', ncm: '', embalagem: '', ean_caixa: '', origem: '', altura_cm: '', largura_cm: '', comprimento_cm: '', peso_kg: '', imagem_url: '', preco: null, disponivel: 0 }

  const $ = cheerio.load(html)

  // JSON-LD extraction
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const ld = JSON.parse($(el).html())
      if (ld?.['@type'] !== 'Product') return

      data.nome = ld.name || ''
      data.descricao = ld.description || ''
      data.imagem_url = ld.image || ''
      data.ean = ld.gtin13 || ''
      data.sku_fabricante = ld.mpn || ''
      data.altura_cm = ld.height || ''
      data.largura_cm = ld.width || ''
      data.comprimento_cm = ld.depth || ''
      data.peso_kg = ld.weight || ''
      data.categoria = ld.category || ''

      if (ld.brand?.name) data.marca = ld.brand.name

      const offers = ld.offers
      if (offers) {
        if (offers.price) data.preco = parseFloat(offers.price)
        data.disponivel = String(offers.availability).includes('InStock') ? 1 : 0
      }
      return false
    } catch { /* skip invalid JSON */ }
  })

  // Feature extraction
  function feature(cls) {
    const el = $(`li.product__features--${cls}`)
    if (!el.length) return ''
    const text = el.text().trim()
    return text.replace(/^[^:]+:\s*/, '')
  }

  function dimension(cls) {
    const el = $(`li.product__dimensions--${cls}`)
    if (!el.length) return ''
    const text = el.text().trim()
    const nums = text.match(/[\d.,]+/g)
    return nums ? nums[0].replace(',', '.') : ''
  }

  if (!data.marca) data.marca = feature('marca')
  data.ncm = feature('ncm')
  data.embalagem = feature('embalagem-nome')
  data.ean_caixa = feature('embalagem-ean')
  data.origem = feature('origem')
  if (!data.altura_cm) data.altura_cm = dimension('altura')
  if (!data.largura_cm) data.largura_cm = dimension('largura')
  if (!data.comprimento_cm) data.comprimento_cm = dimension('comprimento')
  if (!data.peso_kg) data.peso_kg = dimension('peso')

  return data
}

export async function extract(products) {
  console.log(`[extract] Extracting details for ${products.length} products...`)

  const urls = products.map(p => p.url)
  const results = await fetchAll(urls)

  const extracted = []
  for (const { url, data: html } of results) {
    const product = products.find(p => p.url === url)
    if (!product) continue
    const detail = parseProductPage(html, product.codigo)
    detail.url = url
    if (!detail.nome) detail.nome = product.nome
    if (!detail.marca) detail.marca = product.marca
    if (!detail.preco) detail.preco = product.preco
    extracted.push(detail)
  }

  console.log(`[extract] Complete: ${extracted.length} products extracted`)
  return extracted
}
