import axios from 'axios'

export const api = axios.create({ baseURL: '/cached-api', timeout: 240000 })

api.interceptors.request.use((config) => {
  config._start = Date.now()
  const params = config.params ? '?' + new URLSearchParams(config.params).toString() : ''
  console.log(`[reval-api] → ${config.baseURL}${config.url}${params}`)
  return config
})

api.interceptors.response.use(
  (response) => {
    const ms = Date.now() - (response.config._start || Date.now())
    const cache = response.headers['x-cache'] || '?'
    const size = typeof response.data === 'object'
      ? `${(JSON.stringify(response.data).length / 1024).toFixed(1)}KB`
      : '?'
    console.log(`[reval-api] ← ${response.config.url} ${response.status} (${cache}, ${size}, ${ms}ms)`)
    return response
  },
  (error) => {
    const ms = Date.now() - (error.config?._start || Date.now())
    console.error(`[reval-api] ← ${error.config?.url} ERROR ${error.response?.status || 'N/A'} (${ms}ms): ${error.message}`)
    if (error.response?.status === 401 && !error.config.url?.includes('/login')) {
      window.dispatchEvent(new Event('auth-expired'))
    }
    throw error
  },
)

export async function login(senha) {
  const { data } = await api.post('/login', { senha })
  return data
}

export async function checkAuth() {
  try {
    await api.get('/auth')
    return true
  } catch {
    return false
  }
}

function buildUrl(path, params) {
  const qs = new URLSearchParams(params).toString()
  return qs ? `${path}?${qs}` : path
}

export async function getImagens(produto) {
  const { data } = await api.get(buildUrl('/api/imagem/get-all-imagem', { produto }))
  return data
}
