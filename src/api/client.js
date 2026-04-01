import axios from 'axios'

const REVAL_BASE_URL = 'http://api.reval.net'
const REVAL_USER = 'REDACTED_USER'
const REVAL_PASS = 'REDACTED_PASS'

const api = axios.create({
  baseURL: REVAL_BASE_URL,
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('reval_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const token = await getToken()
        localStorage.setItem('reval_token', token.access_token)
        originalRequest.headers.Authorization = `Bearer ${token.access_token}`
        return api(originalRequest)
      } catch {
        localStorage.removeItem('reval_token')
        window.location.reload()
      }
    }

    return Promise.reject(error)
  },
)

export async function getToken() {
  const { data } = await axios.get(`${REVAL_BASE_URL}/api/get-token`, {
    params: { username: REVAL_USER, password: REVAL_PASS },
  })
  return data
}

// --- Auth ---

export async function authenticate() {
  const token = await getToken()
  localStorage.setItem('reval_token', token.access_token)
  return token
}

// --- Categorias ---

export async function getCategorias() {
  const { data } = await api.get('/api/categoria/get-all-categoria')
  return data
}

// --- Fornecedores ---

export async function getFornecedores() {
  const { data } = await api.get('/api/fornecedor/get-all-fornecedor-ativo')
  return data
}

// --- Licencas ---

export async function getLicencas() {
  const { data } = await api.get('/api/licenca/get-all-licenca')
  return data
}

// --- Produtos ---

export async function getProdutos() {
  const { data } = await api.get('/api/produto/get-all-tabela', {
    params: { usuario: REVAL_USER },
  })
  return data
}

export async function getProdutosPage(pageIndex = 1, pageSize = 20) {
  const { data } = await api.get('/api/produto/get-page-tabela', {
    params: { usuario: REVAL_USER, pageIndex, pageSize },
  })
  return data
}

export async function getProduto(codigo) {
  const { data } = await api.get('/api/produto/get-tabela', {
    params: { usuario: REVAL_USER, codigo },
  })
  return data
}

export async function getProdutoByCodBarras(codigoBarras) {
  const { data } = await api.get('/api/produto/get-tabela-codbar', {
    params: { usuario: REVAL_USER, codigoBarras },
  })
  return data
}

export async function getProdutosByCategoria(categoria) {
  const { data } = await api.get('/api/produto/get-produto-categoria', {
    params: { usuario: REVAL_USER, categoria },
  })
  return data
}

export async function getProdutosBySubCategoria(categoria, subcategoria) {
  const { data } = await api.get('/api/produto/get-produto-categoria-sub', {
    params: { usuario: REVAL_USER, categoria, subcategoria },
  })
  return data
}

export async function getProdutosByLicenca(licenca) {
  const { data } = await api.get('/api/produto/get-produto-licenca', {
    params: { usuario: REVAL_USER, licenca },
  })
  return data
}

export async function getProdutosByLicencaCategoria(licenca, categoria) {
  const { data } = await api.get('/api/produto/get-produto-licen-categ', {
    params: { usuario: REVAL_USER, licenca, categoria },
  })
  return data
}

export async function getProdutosByLista(codigoLista) {
  const { data } = await api.get('/api/produto/get-produto-lista', {
    params: { usuario: REVAL_USER, codigoLista },
  })
  return data
}

export async function getProdutosByMarca(marca) {
  const { data } = await api.get('/api/produto/get-produto-marca', {
    params: { usuario: REVAL_USER, marca },
  })
  return data
}

export async function getProdutosByValor(valorDe, valorAte) {
  const { data } = await api.get('/api/produto/get-produto-valor', {
    params: { usuario: REVAL_USER, valorDe, valorAte },
  })
  return data
}

// --- Imagens ---

export function getImagemUrl(produto) {
  return `${REVAL_BASE_URL}/api/imagem/download/${produto}`
}

export async function getImagens(produto) {
  const { data } = await api.get('/api/imagem/get-all-imagem', {
    params: { produto },
  })
  return data
}

export default api
