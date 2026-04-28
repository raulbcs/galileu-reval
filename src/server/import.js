import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import axios from 'axios'
import { getDb, upsertRevalProdutos, softDeleteMissing } from './db.js'

const execFileAsync = promisify(execFile)

const REVAL_BASE_URL = 'http://api.reval.net'
const CACHE_DIR = path.resolve('cache')
const TOKEN_PATH = path.join(CACHE_DIR, 'token.json')

async function fetchToken() {
  const { data } = await axios.get(`${REVAL_BASE_URL}/api/get-token`, {
    params: { username: process.env.REVAL_USER, password: process.env.REVAL_PASS },
  })
  if (typeof data === 'string') throw new Error(data)
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  fs.writeFileSync(TOKEN_PATH, JSON.stringify({
    token: data.access_token,
    ts: Date.now(),
    expiresIn: parseInt(data.expires_in, 10),
  }))
  return data.access_token
}

async function getToken(force = false) {
  if (!force && fs.existsSync(TOKEN_PATH)) {
    const { token, ts, expiresIn } = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'))
    const ttl = (expiresIn || 1800) * 1000
    if (Date.now() - ts < ttl) return token
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
      tokenForceRefresh = true
      const token = await getToken(true)
      tokenForceRefresh = false
      return axios.get(url, { ...options, headers: { Authorization: `Bearer ${token}` } })
    }
    throw err
  }
}

export async function importRevalProducts() {
  console.log('[import] Fetching Reval products...')
  const allProductsUrl = `/api/produto/get-all-tabela?usuario=${process.env.REVAL_USER}`
  const { data } = await apiGet(`${REVAL_BASE_URL}${allProductsUrl}`, { timeout: 240000 })
  const valid = data.filter(p => p.nome)
  const codes = valid.map(p => String(p.codigo || ''))
  if (valid.length < data.length) console.log(`[import] Reval: skipped ${data.length - valid.length} products without nome`)
  const count = upsertRevalProdutos(valid)
  const { disappeared, reappeared } = softDeleteMissing('reval', codes)
  console.log(`[import] Reval: ${count} upserted, ${disappeared} disappeared, ${reappeared} reappeared`)
  return { supplier: 'reval', count, disappeared, reappeared }
}

export async function importIdealProducts() {
  console.log('[import] Scraping Ideal products...')
  const scraperPath = path.resolve('bash-ideal-scraper/scraper.sh')

  const { stdout } = await execFileAsync('bash', [
    scraperPath, 'full', '-p', '2',
  ], { maxBuffer: 10 * 1024 * 1024, env: { ...process.env } })

  const codes = JSON.parse(stdout)
  const { disappeared, reappeared } = softDeleteMissing('ideal', codes)
  console.log(`[import] Ideal: ${codes.length} products, ${disappeared} disappeared, ${reappeared} reappeared`)
  return { supplier: 'ideal', count: codes.length, disappeared, reappeared }
}
