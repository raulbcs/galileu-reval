import crypto from 'node:crypto'
import path from 'node:path'

const CACHE_DIR = path.resolve('cache')

const HMAC_KEY = crypto.randomBytes(32).toString('hex')

export function signSession(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', HMAC_KEY).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function verifySession(cookie) {
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

export function parseCookies(req) {
  const header = req.headers.cookie || ''
  const cookies = {}
  header.split(';').forEach((c) => {
    const [k, ...v] = c.trim().split('=')
    if (k) cookies[k] = v.join('=')
  })
  return cookies
}

export function cachePath(prefix, key) {
  const file = crypto.createHash('md5').update(key).digest('hex')
  return path.join(CACHE_DIR, prefix, file)
}
