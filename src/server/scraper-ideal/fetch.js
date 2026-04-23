import { HEADERS, SESSION_COOKIE, CONCURRENCY } from './config.js'

function buildHeaders() {
  const h = { ...HEADERS }
  if (SESSION_COOKIE) h.Cookie = `PHPSESSID=${SESSION_COOKIE}`
  return h
}

const headers = buildHeaders()

export async function get(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const resp = await fetch(url, { headers, signal: AbortSignal.timeout(20000) })
      if (resp.status === 404) return null
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const html = await resp.text()
      return html
    } catch (err) {
      if (attempt < retries - 1) await new Promise(r => setTimeout(r, 1000 * 2 ** attempt))
    }
  }
  return null
}

export async function fetchAll(urls, concurrency = CONCURRENCY) {
  const results = []
  let i = 0
  async function next() {
    while (i < urls.length) {
      const url = urls[i++]
      const html = await get(url)
      if (html) results.push({ url, data: html })
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, () => next()))
  return results
}
