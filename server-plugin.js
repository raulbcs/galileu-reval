import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import axios from 'axios'
import cron from 'node-cron'
import * as Sentry from '@sentry/node'
import { config } from 'dotenv'
import pino from 'pino'
import { signSession, verifySession, parseCookies, cachePath } from './src/server/crypto.js'
import { getDb, searchProdutos, getProduto, getCounts, getMarcas } from './src/server/db.js'
import { importRevalProducts, importIdealProducts } from './src/server/import.js'

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

function jsonResponse(res, data, status = 200) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
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

export function serverPlugin() {
  ensureDir(path.join(CACHE_DIR, 'images'))
  ensureDir(path.join(CACHE_DIR, 'api'))

  // Init DB on startup
  const counts = getCounts()
  log.info({ counts }, 'SQLite DB ready')

  // Register daily cron
  // cron.schedule('0 3 * * *', async () => {
  //   log.info('Cron: starting daily import...')
  //   try {
  //     const revalResult = await importRevalProducts()
  //     log.info(revalResult, 'Cron: Reval import done')
  //   } catch (err) {
  //     log.error({ err: err.message }, 'Cron: Reval import failed')
  //   }
  //   try {
  //     const idealResult = await importIdealProducts()
  //     log.info(idealResult, 'Cron: Ideal import done')
  //   } catch (err) {
  //     log.error({ err: err.message }, 'Cron: Ideal import failed')
  //   }
  // })
  // log.info('Cron: daily import scheduled at 03:00')

  function setupGzipCacheMiddleware(server) {
      // --- Gzip responses ---
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/cached-api/') && !req.url?.startsWith('/cached-images/') && !req.url?.startsWith('/api/')) return next()
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

        res.setHeader = (name, value) => {
          if (typeof name === 'string' && name.toLowerCase() === 'content-length') return res
          return originalSetHeader(name, value)
        }

        next()
      })

      const REVAL_USER = process.env.REVAL_USER

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
            res.setHeader('Cache-Control', 'public, max-age=2592000')
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
          res.setHeader('Cache-Control', 'public, max-age=2592000')
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
              jsonResponse(res, { error: 'Senha incorreta' }, 401)
              return
            }
            const token = signSession({ exp: Date.now() + SESSION_TTL })
            res.setHeader('Set-Cookie', `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL / 1000}`)
            jsonResponse(res, { ok: true })
          } catch {
            jsonResponse(res, { error: 'Invalid request' }, 400)
          }
        })
      })

      // --- Session check ---
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/cached-api/') && !req.url?.startsWith('/cached-images/') && !req.url?.startsWith('/api/')) return next()
        if (req.url === '/cached-api/login') return next()
        const cookies = parseCookies(req)
        const session = verifySession(cookies.session)
        if (!session) {
          jsonResponse(res, { error: 'Unauthorized' }, 401)
          return
        }
        next()
      })

      // --- REST API: Search products ---
      server.middlewares.use('/api/busca', (req, res, next) => {
        if (req.method !== 'GET') return next()
        const url = new URL(req.url, 'http://localhost')
        const result = searchProdutos({
          query: url.searchParams.get('q') || '',
          supplier: url.searchParams.get('supplier') || 'todos',
          marca: url.searchParams.get('marca') || '',
          precoMin: url.searchParams.get('precoMin') || '',
          precoMax: url.searchParams.get('precoMax') || '',
          page: parseInt(url.searchParams.get('page') || '1'),
          pageSize: parseInt(url.searchParams.get('pageSize') || '30'),
        })
        jsonResponse(res, result)
      })

      // --- REST API: Single product ---
      server.middlewares.use('/api/produtos/', (req, res, next) => {
        if (req.method !== 'GET') return next()
        const parts = req.url.slice(1).split('/')
        if (parts.length < 2) return next()
        const [supplier, codigo] = parts
        const produto = getProduto(supplier, codigo)
        if (!produto) {
          jsonResponse(res, { error: 'Not found' }, 404)
          return
        }
        jsonResponse(res, produto)
      })

      // --- REST API: Counts ---
      server.middlewares.use('/api/counts', (req, res) => {
        jsonResponse(res, getCounts())
      })

      // --- REST API: Marcas ---
      server.middlewares.use('/api/marcas', (req, res) => {
        jsonResponse(res, getMarcas())
      })

      // --- REST API: Clear cache ---
      server.middlewares.use('/cached-api/clear', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        let count = 0
        function rmDir(dir) {
          if (!fs.existsSync(dir)) return
          for (const entry of fs.readdirSync(dir)) {
            const p = path.join(dir, entry)
            if (fs.statSync(p).isDirectory()) { rmDir(p) } else { fs.unlinkSync(p); count++ }
          }
        }
        rmDir(path.join(CACHE_DIR, 'api'))
        jsonResponse(res, { ok: true, removed: count })
      })

      // --- Cached-api auth ---
      server.middlewares.use('/cached-api/auth', async (req, res) => {
        try {
          const token = await getToken()
          jsonResponse(res, { access_token: token })
        } catch (err) {
          log.error({ err: err.message }, 'Auth failed')
          jsonResponse(res, { error: err.message }, 401)
        }
      })

      // --- Cached-api proxy (for non-product Reval endpoints) ---
      server.middlewares.use('/cached-api', async (req, res, next) => {
        let url = req.url
        if (!url || url === '/') return next()

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
    name: 'vite-plugin-galileu-server',
    configureServer: setupGzipCacheMiddleware,
    configurePreviewServer: setupGzipCacheMiddleware,
  }
}
