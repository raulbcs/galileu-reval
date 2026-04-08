import { useState, useEffect, useCallback } from 'react'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { login, checkAuth, clearServerCache } from './api/client'
import { HomePage } from './pages/HomePage'
import { ProdutosPage } from './pages/ProdutosPage'
import { ProdutoDetalhePage } from './pages/ProdutoDetalhePage'
import { CategoriasPage } from './pages/CategoriasPage'
import { FornecedoresPage } from './pages/FornecedoresPage'
import { LicencasPage } from './pages/LicencasPage'
import { ListasPage } from './pages/ListasPage'

const TABS = [
  { key: 'home', label: 'Busca' },
  { key: 'produtos', label: 'Produtos' },
  { key: 'categorias', label: 'Categorias' },
  { key: 'fornecedores', label: 'Fornecedores' },
  { key: 'licencas', label: 'Licencas' },
  { key: 'listas', label: 'Listas' },
]

function buildUrl(tab, filter, produto) {
  if (produto) return `/produto/${produto}`
  if (!tab || tab === 'home') return '/'
  if (filter) return `/${tab}/${encodeURIComponent(filter)}`
  return `/${tab}`
}

function readUrl() {
  const path = window.location.pathname.replace(/\/+$/, '')
  if (!path || path === '/') return { tab: 'home', filter: null, produto: null }

  const parts = path.slice(1).split('/')
  if (parts[0] === 'produto' && parts[1]) return { tab: null, filter: null, produto: parts[1] }

  const tab = TABS.find((t) => t.key === parts[0])?.key || 'home'
  const filter = parts[1] ? decodeURIComponent(parts[1]) : null
  return { tab, filter, produto: null }
}

function App() {
  const initial = readUrl()
  const [activeTab, setActiveTab] = useState(initial.tab || 'home')
  const [selectedProduto, setSelectedProduto] = useState(initial.produto)
  const [preSelect, setPreSelect] = useState(initial.filter)
  const [authStatus, setAuthStatus] = useState('pending')
  const queryClient = useQueryClient()
  const isFetching = useIsFetching()

  const navigate = useCallback((tab, filter, produto, replace = false) => {
    setSelectedProduto(produto || null)
    setActiveTab(produto ? null : tab || 'home')
    setPreSelect(filter || null)
    const url = buildUrl(tab, filter, produto)
    replace ? history.replaceState(null, '', url) : history.pushState(null, '', url)
  }, [])

  useEffect(() => {
    function onPopState() {
      const { tab, filter, produto } = readUrl()
      setSelectedProduto(produto)
      setActiveTab(produto ? 'home' : tab || 'home')
      setPreSelect(filter)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  async function handleClearCache() {
    if (!window.confirm('Limpar todo o cache do servidor? Os dados serao buscados novamente da Reval.')) return
    await clearServerCache()
    queryClient.clear()
    alert('Cache limpo! Os dados serao atualizados automaticamente.')
  }

  function handleSelectProduto(codigo) {
    navigate(null, null, codigo)
  }

  function handleNavigateTo(tab, filter) {
    navigate(tab, filter)
  }

  function handleBackFromDetalhe() {
    navigate('home')
  }

  useEffect(() => {
    checkAuth().then((ok) => setAuthStatus(ok ? 'ok' : 'login'))
  }, [])

  useEffect(() => {
    function onExpired() { setAuthStatus('login') }
    window.addEventListener('auth-expired', onExpired)
    return () => window.removeEventListener('auth-expired', onExpired)
  }, [])

  if (authStatus === 'pending') {
    return <div className="loading-screen">Carregando...</div>
  }

  if (authStatus === 'login' || authStatus === 'error') {
    return <LoginForm onLogin={() => setAuthStatus('ok')} />
  }

  const currentTab = activeTab || 'home'

  if (selectedProduto) {
    return (
      <div className="app">
        {isFetching > 0 && <div className="loading-bar" />}
        <header className="app-header">
          <h1 className="app-title" onClick={() => navigate('home')}>Papelaria Galileu</h1>
          <button className="btn-clear-cache" onClick={handleClearCache}>Limpar cache</button>
        </header>
        <main className="app-content">
          <ProdutoDetalhePage codigo={selectedProduto} onBack={handleBackFromDetalhe} onNavigateTo={handleNavigateTo} />
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      {isFetching > 0 && <div className="loading-bar" />}

      <header className="app-header">
        <h1 className="app-title" onClick={() => navigate('home')}>Papelaria Galileu</h1>
        <nav className="tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`tab ${currentTab === tab.key ? 'active' : ''}`}
              onClick={() => navigate(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <button className="btn-clear-cache" onClick={handleClearCache}>Limpar cache</button>
      </header>

      <main className="app-content">
        {currentTab === 'home' && <HomePage onSelectProduto={handleSelectProduto} />}
        {currentTab === 'produtos' && <ProdutosPage onSelectProduto={handleSelectProduto} />}
        {currentTab === 'categorias' && <CategoriasPage onSelectProduto={handleSelectProduto} />}
        {currentTab === 'fornecedores' && <FornecedoresPage onSelectProduto={handleSelectProduto} initialSelected={currentTab === 'fornecedores' ? preSelect : null} onClearPreSelect={() => setPreSelect(null)} />}
        {currentTab === 'licencas' && <LicencasPage onSelectProduto={handleSelectProduto} />}
        {currentTab === 'listas' && <ListasPage onSelectProduto={handleSelectProduto} initialSelected={currentTab === 'listas' ? preSelect : null} onClearPreSelect={() => setPreSelect(null)} />}
      </main>
    </div>
  )
}

export default App

function LoginForm({ onLogin }) {
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(senha)
      onLogin()
    } catch {
      setError('Senha incorreta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Papelaria Galileu</h1>
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoFocus
        />
        {error && <div className="login-error">{error}</div>}
        <button type="submit" disabled={loading || !senha}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
