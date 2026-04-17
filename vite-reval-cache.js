import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import axios from 'axios'
import * as Sentry from '@sentry/node'
import { config } from 'dotenv'
import pino from 'pino'
import { signSession, verifySession, parseCookies, cachePath } from './src/server/crypto.js'

function simpleLog() {
  return {
    write: (obj) => {
      const { level, time, msg, ...rest } = typeof obj === 'string' ? JSON.parse(obj) : obj
      const data = Object.keys(rest).length ? ' ' + JSON.stringify(rest) : ''
      const ts = new Date().toISOString().slice(11, 19)
      process.stdout.write(`${ts} ${String(level || '').padEnd(5)} ${msg || ''}${data}\n`)
    },
  }
}

const log = pino(simpleLog())

config()

if (process.env.VITE_SENTRY_DSN && process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.VITE_SENTRY_DSN,
    tracesSampleRate: 1.0,
    sendDefaultPii: true,
    enableLogs: true,
    environment: process.env.NODE_ENV,
  })
}

const REVAL_BASE_URL = 'http://api.reval.net'
const CACHE_DIR = path.resolve('cache')
const TOKEN_PATH = path.join(CACHE_DIR, 'token.json')
const API_TTL = 12 * 60 * 60 * 1000   // 12h
const IMAGE_TTL = 7 * 24 * 60 * 60 * 1000  // 1 week
const APP_PASSWORD = process.env.APP_PASSWORD || 'password'
const SESSION_TTL = 24 * 60 * 60 * 1000 // 24h

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

async function fetchToken() {
  log.info('Fetching new token...')
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
  log.info({ expiresIn: `${h}h${m}m`, duration: Date.now() - start }, 'Token obtained')
  return data.access_token
}

async function getToken(force = false) {
  if (!force && fs.existsSync(TOKEN_PATH)) {
    const { token, ts, expiresIn } = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'))
    const ttl = (expiresIn || 1800) * 1000
    const remaining = Math.round((ttl - (Date.now() - ts)) / 1000)
    if (Date.now() - ts < ttl) {
      log.info({ remaining: `${remaining}s` }, 'Using cached token')
      return token
    }
    log.info({ expired: `${remaining}s ago` }, 'Token expired, refreshing...')
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
      log.info('Got 401, refreshing token and retrying...')
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

  function setupGzipCacheMiddleware(server) {
      // --- Gzip /cached-api and /cached-images responses ---
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/cached-api/') && !req.url?.startsWith('/cached-images/')) return next()
        if (!req.headers['accept-encoding']?.includes('gzip')) return next()

        const originalEnd = res.end.bind(res)
        const originalSetHeader = res.setHeader.bind(res)
        const chunks = []

        res.write = (chunk) => {
          if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          return true
        }

        res.end = (chunk) => {
          if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          const buf = Buffer.concat(chunks)
          if (buf.length === 0) return originalEnd()

          const gz = zlib.gzipSync(buf)
          originalSetHeader('Content-Encoding', 'gzip')
          originalSetHeader('Content-Length', gz.length)
          originalEnd(gz)
        }

        // Suppress Content-Length from handlers; we set the correct one after gzip
        res.setHeader = (name, value) => {
          if (typeof name === 'string' && name.toLowerCase() === 'content-length') return res
          return originalSetHeader(name, value)
        }

        next()
      })

      const REVAL_USER = process.env.REVAL_USER
      const allProductsUrl = `/api/produto/get-all-tabela?usuario=${REVAL_USER}`
      const allProductsCache = cachePath('api', allProductsUrl)
      let produtosPromise = null

      function fetchProdutos() {
        if (!produtosPromise) {
          log.info('Fetching all products...')
          produtosPromise = apiGet(`${REVAL_BASE_URL}${allProductsUrl}`, { timeout: 240000 })
            .then((response) => {
              ensureDir(path.dirname(allProductsCache))
              fs.writeFileSync(allProductsCache, JSON.stringify(response.data))
              log.info({ count: Array.isArray(response.data) ? response.data.length : '?' }, 'Cached products')
              return response.data
            })
            .catch((err) => {
              log.error({ err: err.message }, 'Fetch products failed')
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
        log.info('Products already cached')
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
            log.info({ produto, age: `${Math.round(age / 3600000)}h` }, 'Image STALE, re-fetching...')
            fs.unlinkSync(filePath)
          } else {
            log.info({ produto, size: `${(stat.size / 1024).toFixed(1)}KB` }, 'Image HIT')
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
          log.info({ produto }, 'Image MISS, fetching from API...')
          const response = await apiGet(
            `${REVAL_BASE_URL}/api/imagem/download/${produto}`,
            { responseType: 'arraybuffer', timeout: 15000 },
          )
          fs.writeFileSync(filePath, response.data)
          log.info({ produto, size: `${(response.data.length / 1024).toFixed(1)}KB`, duration: `${Date.now() - start}ms` }, 'Image fetched')
          res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg')
          res.setHeader('Content-Length', response.data.length)
          res.setHeader('Cache-Control', 'public, max-age=2592000') // 30 days browser cache
          res.setHeader('X-Cache', 'MISS')
          res.end(response.data)
        } catch (err) {
          log.error({ produto, err: err.message, duration: `${Date.now() - start}ms` }, 'Image fetch failed')
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
          log.error({ err: err.message }, 'Auth failed')
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
            log.info({ url, size: `${(stat.size / 1024).toFixed(1)}KB` }, 'API HIT')
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('X-Cache', 'HIT')
            res.end(fs.readFileSync(filePath))
            return
          }
          log.info({ url, age: `${Math.round(age / 3600000)}h` }, 'API STALE, re-fetching...')
        }

        // If products fetch is in progress, wait for it instead of starting a new one
        if (url === allProductsUrl && produtosPromise) {
          log.info({ url }, 'API waiting for in-progress fetch')
          try {
            const data = await produtosPromise
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('X-Cache', 'WAIT')
            res.end(JSON.stringify(data))
            return
          } catch {
            // fall through to normal MISS path
          }
        }

        const start = Date.now()
        try {
          const fullUrl = `${REVAL_BASE_URL}${url}`
          log.info({ url, fullUrl }, 'API MISS, fetching...')

          const response = await apiGet(fullUrl, { timeout: 240000 })

          const jsonSize = JSON.stringify(response.data).length
          ensureDir(path.dirname(filePath))
          fs.writeFileSync(filePath, JSON.stringify(response.data))

          log.info({ url, size: `${(jsonSize / 1024).toFixed(1)}KB`, duration: `${Date.now() - start}ms` }, 'API fetched')
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('X-Cache', 'MISS')
          res.end(JSON.stringify(response.data))
        } catch (err) {
          log.error({ url, err: err.message, status: err.response?.status || 'N/A', duration: `${Date.now() - start}ms` }, 'API error')
          res.statusCode = err.response?.status || 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message }))
        }
      })
  }

  return {
    name: 'vite-plugin-reval-cache',
    configureServer: setupGzipCacheMiddleware,
    configurePreviewServer: setupGzipCacheMiddleware,
  }
}
