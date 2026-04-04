import fs from 'node:fs'
import path from 'node:path'
import axios from 'axios'
import crypto from 'node:crypto'

const REVAL_BASE_URL = 'http://api.reval.net'
const CACHE_DIR = path.resolve('cache')
const TOKEN_PATH = path.join(CACHE_DIR, 'token.json')
const API_TTL = 12 * 60 * 60 * 1000   // 12h
const IMAGE_TTL = 72 * 60 * 60 * 1000  // 72h

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function cachePath(prefix, key) {
  const file = crypto.createHash('md5').update(key).digest('hex')
  return path.join(CACHE_DIR, prefix, file)
}

async function fetchToken() {
  console.log('[reval-cache] Fetching new token...')
  const start = Date.now()
  const { data } = await axios.get(`${REVAL_BASE_URL}/api/get-token`, {
    params: {
      username: process.env.REVAL_USER || 'REDACTED_USER',
      password: process.env.REVAL_PASS || 'REDACTED_PASS',
    },
  })
  if (typeof data === 'string') throw new Error(data)
  const expiresIn = parseInt(data.expires_in, 10)
  fs.writeFileSync(TOKEN_PATH, JSON.stringify({
    token: data.access_token,
    ts: Date.now(),
    expiresIn,
  }))
  const h = Math.floor(expiresIn / 3600)
  const m = Math.floor((expiresIn % 3600) / 60)
  console.log(`[reval-cache] Token obtained in ${Date.now() - start}ms, expires in ${h}h${m}m`)
  return data.access_token
}

async function getToken(force = false) {
  if (!force && fs.existsSync(TOKEN_PATH)) {
    const { token, ts, expiresIn } = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'))
    const ttl = (expiresIn || 1800) * 1000
    const remaining = Math.round((ttl - (Date.now() - ts)) / 1000)
    if (Date.now() - ts < ttl) {
      console.log(`[reval-cache] Using cached token (${remaining}s remaining)`)
      return token
    }
    console.log(`[reval-cache] Token expired (was ${remaining}s ago), refreshing...`)
  }
  return fetchToken()
}

let tokenForceRefresh = false

async function apiGet(url, options = {}) {
  try {
    const token = await getToken(tokenForceRefresh)
    tokenForceRefresh = false
    return axios.get(url, { ...options, headers: { Authorization: `Bearer ${token}` } })
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('[reval-cache] Got 401, refreshing token and retrying...')
      tokenForceRefresh = true
      const token = await getToken(true)
      tokenForceRefresh = false
      return axios.get(url, { ...options, headers: { Authorization: `Bearer ${token}` } })
    }
    throw err
  }
}

export function revalCachePlugin() {
  ensureDir(path.join(CACHE_DIR, 'images'))
  ensureDir(path.join(CACHE_DIR, 'api'))

  return {
    name: 'vite-plugin-reval-cache',
    configureServer(server) {
      // Pre-cache all products on server start
      const allProductsUrl = '/api/produto/get-all-tabela?usuario=REDACTED_USER'
      const allProductsCache = cachePath('api', allProductsUrl)

      if (!fs.existsSync(allProductsCache)) {
        console.log('[reval-cache] Pre-caching all products...')
        apiGet(`${REVAL_BASE_URL}${allProductsUrl}`, { timeout: 240000 })
          .then((response) => {
            fs.writeFileSync(allProductsCache, JSON.stringify(response.data))
            console.log(`[reval-cache] Pre-cached ${Array.isArray(response.data) ? response.data.length : '?'} products`)
          })
          .catch((err) => {
            console.error('[reval-cache] Pre-cache failed:', err.message)
          })
      } else {
        console.log('[reval-cache] Products already cached')
      }
      // --- Image cache ---
      server.middlewares.use('/cached-images', async (req, res, next) => {
        const produto = req.url?.slice(1)
        if (!produto) return next()

        const filePath = path.join(CACHE_DIR, 'images', `${produto}.jpg`)

        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath)
          const age = Date.now() - stat.mtimeMs
          if (age >= IMAGE_TTL) {
            console.log(`[reval-cache] Image STALE: ${produto} (${Math.round(age / 3600000)}h old), re-fetching...`)
            fs.unlinkSync(filePath)
          } else {
            console.log(`[reval-cache] Image HIT: ${produto} (${(stat.size / 1024).toFixed(1)}KB)`)
            res.setHeader('Content-Type', 'image/jpeg')
            res.setHeader('Content-Length', stat.size)
            res.setHeader('Cache-Control', 'public, max-age=2592000') // 30 days browser cache
            res.setHeader('X-Cache', 'HIT')
            fs.createReadStream(filePath).pipe(res)
            return
          }
        }

        const start = Date.now()
        try {
          console.log(`[reval-cache] Image MISS: ${produto}, fetching from API...`)
          const response = await apiGet(
            `${REVAL_BASE_URL}/api/imagem/download/${produto}`,
            { responseType: 'arraybuffer', timeout: 15000 },
          )
          fs.writeFileSync(filePath, response.data)
          console.log(`[reval-cache] Image fetched: ${produto} (${(response.data.length / 1024).toFixed(1)}KB) in ${Date.now() - start}ms`)
          res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg')
          res.setHeader('Content-Length', response.data.length)
          res.setHeader('Cache-Control', 'public, max-age=2592000') // 30 days browser cache
          res.setHeader('X-Cache', 'MISS')
          res.end(response.data)
        } catch (err) {
          console.error(`[reval-cache] Image fetch failed: ${produto} — ${err.message} (${Date.now() - start}ms)`)
          res.statusCode = 404
          res.end('Not found')
        }
      })

      // --- Clear cache (must be before the generic /cached-api handler) ---
      server.middlewares.use('/cached-api/clear', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method not allowed')
          return
        }
        let count = 0
        function rmDir(dir) {
          if (!fs.existsSync(dir)) return
          for (const entry of fs.readdirSync(dir)) {
            const p = path.join(dir, entry)
            if (fs.statSync(p).isDirectory()) { rmDir(p) } else { fs.unlinkSync(p); count++ }
          }
        }
        rmDir(path.join(CACHE_DIR, 'api'))
        rmDir(path.join(CACHE_DIR, 'images'))

        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true, removed: count }))
      })

      // --- API cache ---
      server.middlewares.use('/cached-api', async (req, res, next) => {
        const url = req.url
        if (!url || url === '/') return next()

        const filePath = cachePath('api', url)

        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath)
          const age = Date.now() - stat.mtimeMs
          if (age < API_TTL) {
            console.log(`[reval-cache] API HIT: ${url} (${(stat.size / 1024).toFixed(1)}KB from disk)`)
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('X-Cache', 'HIT')
            fs.createReadStream(filePath).pipe(res)
            return
          }
          console.log(`[reval-cache] API STALE: ${url} (${Math.round(age / 3600000)}h old), re-fetching...`)
        }

        const start = Date.now()
        try {
          const fullUrl = `${REVAL_BASE_URL}${url}`
          console.log(`[reval-cache] API MISS: ${url}`)
          console.log(`[reval-cache] Fetching: ${fullUrl}`)

          const response = await apiGet(fullUrl, { timeout: 240000 })

          const jsonSize = JSON.stringify(response.data).length
          ensureDir(path.dirname(filePath))
          fs.writeFileSync(filePath, JSON.stringify(response.data))

          console.log(`[reval-cache] API fetched: ${url} (${(jsonSize / 1024).toFixed(1)}KB) in ${Date.now() - start}ms`)
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('X-Cache', 'MISS')
          res.end(JSON.stringify(response.data))
        } catch (err) {
          console.error(`[reval-cache] API error: ${url} — ${err.message} (status: ${err.response?.status || 'N/A'}) in ${Date.now() - start}ms`)
          res.statusCode = err.response?.status || 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    },
  }
}
