import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import axios from 'axios'
import crypto from 'node:crypto'
import { config } from 'dotenv'

config()

const REVAL_BASE_URL = 'http://api.reval.net'
const CACHE_DIR = path.resolve('cache')
const TOKEN_PATH = path.join(CACHE_DIR, 'token.json')
const API_TTL = 12 * 60 * 60 * 1000   // 12h
const IMAGE_TTL = 7 * 24 * 60 * 60 * 1000  // 1 week
const APP_PASSWORD = process.env.APP_PASSWORD || 'password'
const SESSION_TTL = 24 * 60 * 60 * 1000 // 24h
const HMAC_KEY = crypto.randomBytes(32).toString('hex')

function signSession(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', HMAC_KEY).update(data).digest('base64url')
  return `${data}.${sig}`
}

function verifySession(cookie) {
  if (!cookie) return null
  const [data, sig] = cookie.split('.')
  if (!data || !sig) return null
  const expected = crypto.createHmac('sha256', HMAC_KEY).update(data).digest('base64url')
  if (sig !== expected) return null
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString())
    if (Date.now() > payload.exp) return null
    return payload
  } catch { return null }
}

function parseCookies(req) {
  const header = req.headers.cookie || ''
  const cookies = {}
  header.split(';').forEach((c) => {
    const [k, ...v] = c.trim().split('=')
    if (k) cookies[k] = v.join('=')
  })
  return cookies
}

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
      username: process.env.REVAL_USER,
      password: process.env.REVAL_PASS,
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
      const REVAL_USER = process.env.REVAL_USER
      const allProductsUrl = `/api/produto/get-all-tabela?usuario=${REVAL_USER}`
      const allProductsCache = cachePath('api', allProductsUrl)
      let produtosPromise = null

      function fetchProdutos() {
        if (!produtosPromise) {
          console.log('[reval-cache] Fetching all products...')
          produtosPromise = apiGet(`${REVAL_BASE_URL}${allProductsUrl}`, { timeout: 240000 })
            .then((response) => {
              ensureDir(path.dirname(allProductsCache))
              fs.writeFileSync(allProductsCache, JSON.stringify(response.data))
              console.log(`[reval-cache] Cached ${Array.isArray(response.data) ? response.data.length : '?'} products`)
              return response.data
            })
            .catch((err) => {
              console.error('[reval-cache] Fetch products failed:', err.message)
              throw err
            })
            .finally(() => { produtosPromise = null })
        }
        return produtosPromise
      }

      // Pre-cache all products on server start
      if (!fs.existsSync(allProductsCache)) {
        fetchProdutos()
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

      // --- Login ---
      server.middlewares.use('/cached-api/login', (req, res, next) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }

        let body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', () => {
          try {
            const { senha } = JSON.parse(body)
            if (senha !== APP_PASSWORD) {
              res.statusCode = 401
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Senha incorreta' }))
              return
            }
            const token = signSession({ exp: Date.now() + SESSION_TTL })
            res.setHeader('Set-Cookie', `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL / 1000}`)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Invalid request' }))
          }
        })
      })

      // --- Session check (all /cached-api and /cached-images) ---
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/cached-api/') && !req.url?.startsWith('/cached-images/')) return next()
        // Login endpoint is exempt
        if (req.url === '/cached-api/login') return next()
        const cookies = parseCookies(req)
        const session = verifySession(cookies.session)
        if (!session) {
          res.statusCode = 401
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Unauthorized' }))
          return
        }
        next()
      })

      // --- Auth (proxy token request so credentials never reach the browser) ---
      server.middlewares.use('/cached-api/auth', async (req, res) => {
        try {
          const token = await getToken()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ access_token: token }))
        } catch (err) {
          console.error(`[reval-cache] Auth failed: ${err.message}`)
          res.statusCode = 401
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message }))
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

        fetchProdutos()
          .catch(() => {}) // already logged in fetchProdutos

        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true, removed: count }))
      })

      // --- API cache ---
      server.middlewares.use('/cached-api', async (req, res, next) => {
        let url = req.url
        if (!url || url === '/') return next()

        // Inject usuario param server-side so client doesn't need REVAL_USER
        if (url.includes('/produto/') && !url.includes('usuario=')) {
          const sep = url.includes('?') ? '&' : '?'
          url += `${sep}usuario=${encodeURIComponent(REVAL_USER)}`
        }

        const filePath = cachePath('api', url)

        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath)
          const age = Date.now() - stat.mtimeMs
          if (age < API_TTL) {
            console.log(`[reval-cache] API HIT: ${url} (${(stat.size / 1024).toFixed(1)}KB from disk)`)
            const raw = fs.readFileSync(filePath)
            const gz = zlib.gzipSync(raw)
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Content-Encoding', 'gzip')
            res.setHeader('Content-Length', gz.length)
            res.setHeader('X-Cache', 'HIT')
            res.end(gz)
            return
          }
          console.log(`[reval-cache] API STALE: ${url} (${Math.round(age / 3600000)}h old), re-fetching...`)
        }

        // If products fetch is in progress, wait for it instead of starting a new one
        if (url === allProductsUrl && produtosPromise) {
          console.log(`[reval-cache] API waiting for in-progress fetch: ${url}`)
          try {
            const data = await produtosPromise
            const gz = zlib.gzipSync(JSON.stringify(data))
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Content-Encoding', 'gzip')
            res.setHeader('Content-Length', gz.length)
            res.setHeader('X-Cache', 'WAIT')
            res.end(gz)
            return
          } catch {
            // fall through to normal MISS path
          }
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

          const json = JSON.stringify(response.data)
          console.log(`[reval-cache] API fetched: ${url} (${(jsonSize / 1024).toFixed(1)}KB) in ${Date.now() - start}ms`)
          const gz = zlib.gzipSync(json)
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Content-Encoding', 'gzip')
          res.setHeader('Content-Length', gz.length)
          res.setHeader('X-Cache', 'MISS')
          res.end(gz)
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
