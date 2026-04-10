import axios from 'axios'

// Data client — goes through Vite proxy with disk cache
const api = axios.create({ baseURL: '/cached-api', timeout: 240000 })

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

// --- Helpers ---

function buildUrl(path, params) {
  const qs = new URLSearchParams(params).toString()
  return qs ? `${path}?${qs}` : path
}

// --- Categorias ---

export async function getCategorias() {
  const { data } = await api.get(buildUrl('/api/categoria/get-all-categoria'))
  return data
}

// --- Fornecedores ---

export async function getFornecedores() {
  const { data } = await api.get(buildUrl('/api/fornecedor/get-all-fornecedor-ativo'))
  return data
}

// --- Licencas ---

export async function getLicencas() {
  const { data } = await api.get(buildUrl('/api/licenca/get-all-licenca'))
  return data
}

// --- Produtos ---

export async function getProdutos({ onProgress } = {}) {
  const { data } = await api.get(buildUrl('/api/produto/get-all-tabela'), {
    onDownloadProgress: onProgress,
  })
  return data
}

export async function getProdutosPage(pageIndex = 1, pageSize = 20) {
  const { data } = await api.get(buildUrl('/api/produto/get-page-tabela', { pageIndex, pageSize }))
  return data
}

export async function getProduto(codigo) {
  const { data } = await api.get(buildUrl('/api/produto/get-tabela', { codigo }))
  return data
}

export async function getProdutoByCodBarras(codigoBarras) {
  const { data } = await api.get(buildUrl('/api/produto/get-tabela-codbar', { codigoBarras }))
  return data
}

export async function getProdutosByCategoria(categoria) {
  const { data } = await api.get(buildUrl('/api/produto/get-produto-categoria', { categoria }))
  return data
}

export async function getProdutosBySubCategoria(categoria, subcategoria) {
  const { data } = await api.get(buildUrl('/api/produto/get-produto-categoria-sub', { categoria, subcategoria }))
  return data
}

export async function getProdutosByLicenca(licenca) {
  const { data } = await api.get(buildUrl('/api/produto/get-produto-licenca', { licenca }))
  return data
}

export async function getProdutosByLicencaCategoria(licenca, categoria) {
  const { data } = await api.get(buildUrl('/api/produto/get-produto-licen-categ', { licenca, categoria }))
  return data
}

export async function getProdutosByLista(codigoLista) {
  const { data } = await api.get(buildUrl('/api/produto/get-produto-lista', { codigoLista }))
  return data
}

export async function getProdutosByMarca(marca) {
  const { data } = await api.get(buildUrl('/api/produto/get-produto-marca', { marca }))
  return data
}

export async function getProdutosByValor(valorDe, valorAte) {
  const { data } = await api.get(buildUrl('/api/produto/get-produto-valor', { valorDe, valorAte }))
  return data
}

// --- Imagens ---

export function getImagemUrl(produto) {
  return `/cached-images/${produto}`
}

export async function getImagens(produto) {
  const { data } = await api.get(buildUrl('/api/imagem/get-all-imagem', { produto }))
  return data
}

// --- Cache ---

export async function clearServerCache() {
  const { data } = await axios.post('/cached-api/clear')
  return data
}
