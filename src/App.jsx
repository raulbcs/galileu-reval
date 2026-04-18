import { useState, useEffect, useCallback } from 'react'
import { useIsFetching } from '@tanstack/react-query'
import { login, checkAuth } from './api/revalClient'
import { TABS, buildUrl, readUrl } from './utils/routing'
import { HomePage } from './pages/HomePage'
import { ProdutosPage } from './pages/ProdutosPage'
import { ProdutoDetalhePage } from './pages/ProdutoDetalhePage'
import { SimuladorPage } from './pages/SimuladorPage'

function App() {
  const initial = readUrl()
  const [activeTab, setActiveTab] = useState(initial.tab || 'home')
  const [selectedProduto, setSelectedProduto] = useState(initial.produto)
  const [selectedSupplier, setSelectedSupplier] = useState(initial.supplier || 'reval')
  const [authStatus, setAuthStatus] = useState('pending')
  const isFetching = useIsFetching()

  const navigate = useCallback((tab, filter, produto, supplier, replace = false) => {
    setSelectedProduto(produto || null)
    setSelectedSupplier(produto ? (supplier || 'reval') : null)
    setActiveTab(produto ? null : tab || 'home')
    const url = buildUrl(tab, filter, produto, supplier)
    replace ? history.replaceState(null, '', url) : history.pushState(null, '', url)
  }, [])

  useEffect(() => {
    function onPopState() {
      const { tab, filter, produto, supplier } = readUrl()
      setSelectedProduto(produto)
      setSelectedSupplier(produto ? (supplier || 'reval') : null)
      setActiveTab(produto ? 'home' : tab || 'home')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  function handleSelectProduto(codigo, supplier) {
    navigate(null, null, codigo, supplier)
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
        </header>
        <main className="app-content">
          <ProdutoDetalhePage codigo={selectedProduto} supplier={selectedSupplier} onBack={handleBackFromDetalhe} />
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
      </header>

      <main className="app-content">
        {currentTab === 'home' && <HomePage onNavigate={(tab) => navigate(tab)} />}
        {currentTab === 'produtos' && <ProdutosPage onSelectProduto={handleSelectProduto} />}
        {currentTab === 'simulador' && <SimuladorPage />}
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
