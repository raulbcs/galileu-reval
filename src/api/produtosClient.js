import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 30000 })

api.interceptors.request.use((config) => {
  config._start = Date.now()
  console.log(`[api] → ${config.baseURL}${config.url}`)
  return config
})

api.interceptors.response.use(
  (response) => {
    const ms = Date.now() - (response.config._start || Date.now())
    console.log(`[api] ← ${response.config.url} ${response.status} (${ms}ms)`)
    return response
  },
  (error) => {
    const ms = Date.now() - (error.config?._start || Date.now())
    console.error(`[api] ← ${error.config?.url} ERROR ${error.response?.status || 'N/A'} (${ms}ms): ${error.message}`)
    throw error
  },
)

export async function searchProdutos({ query = '', supplier = 'todos', marca = '', precoMin = '', precoMax = '', page = 1, pageSize = 30 } = {}) {
  const { data } = await api.get('/produtos', { params: { q: query, supplier, marca, precoMin, precoMax, page, pageSize } })
  return data
}

export async function getProduto(supplier, codigo) {
  const { data } = await api.get(`/produtos/${supplier}/${codigo}`)
  return data
}

export async function getCounts() {
  const { data } = await api.get('/counts')
  return data
}

export async function getMarcas() {
  const { data } = await api.get('/marcas')
  return data
}
