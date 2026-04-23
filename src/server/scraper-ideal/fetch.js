import axios from 'axios'
import { HEADERS, SESSION_COOKIE, CONCURRENCY } from './config.js'

const session = axios.create({ headers: HEADERS, timeout: 20000 })
if (SESSION_COOKIE) {
  session.defaults.headers.common.Cookie = `PHPSESSID=${SESSION_COOKIE}`
}

export async function get(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const resp = await session.get(url)
      return resp
    } catch (err) {
      if (err.response?.status === 404) return null
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
      const resp = await get(url)
      if (resp) results.push({ url, data: resp.data })
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, () => next()))
  return results
}
