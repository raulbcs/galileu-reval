import fs from 'node:fs'
import path from 'node:path'
import axios from 'axios'

const REVAL_BASE_URL = 'http://api.reval.net'
const CACHE_DIR = path.resolve('cache/images')

function getRevalToken() {
  const token = process.env.REVAL_TOKEN
  if (token) return token
  return null
}

async function fetchToken() {
  const { data } = await axios.get(`${REVAL_BASE_URL}/api/get-token`, {
    params: {
      username: process.env.REVAL_USER || 'REDACTED_USER',
      password: process.env.REVAL_PASS || 'REDACTED_PASS',
    },
  })
  return data.access_token
}

export function imageCachePlugin() {
  let cachedToken = null

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }

  return {
    name: 'vite-plugin-image-cache',
    configureServer(server) {
      server.middlewares.use('/cached-images', async (req, res, next) => {
        const produto = req.url?.slice(1) // remove leading /
        if (!produto) return next()

        const filePath = path.join(CACHE_DIR, `${produto}.jpg`)

        // Serve from disk cache
        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath)
          res.setHeader('Content-Type', 'image/jpeg')
          res.setHeader('Content-Length', stat.size)
          res.setHeader('X-Cache', 'HIT')
          fs.createReadStream(filePath).pipe(res)
          return
        }

        // Fetch from Reval API
        try {
          if (!cachedToken) {
            cachedToken = await fetchToken()
          }

          const response = await axios.get(
            `${REVAL_BASE_URL}/api/imagem/download/${produto}`,
            {
              headers: { Authorization: `Bearer ${cachedToken}` },
              responseType: 'arraybuffer',
              timeout: 15000,
            },
          )

          // Save to disk cache
          fs.writeFileSync(filePath, response.data)

          res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg')
          res.setHeader('Content-Length', response.data.length)
          res.setHeader('X-Cache', 'MISS')
          res.end(response.data)
        } catch (err) {
          if (err.response?.status === 401) {
            cachedToken = null // force token refresh on next request
          }
          res.statusCode = 404
          res.end('Not found')
        }
      })
    },
  }
}
