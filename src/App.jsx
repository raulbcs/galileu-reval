import { useState, useEffect } from 'react'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { authenticate, clearServerCache } from './api/client'
import { HomePage } from './pages/HomePage'
import { ProdutosPage } from './pages/ProdutosPage'
import { ProdutoDetalhePage } from './pages/ProdutoDetalhePage'
import { CategoriasPage } from './pages/CategoriasPage'
import { FornecedoresPage } from './pages/FornecedoresPage'
import { LicencasPage } from './pages/LicencasPage'
import { ListasPage } from './pages/ListasPage'

const TABS = [
  { key: 'home', label: 'Inicio' },
  { key: 'produtos', label: 'Produtos' },
  { key: 'categorias', label: 'Categorias' },
  { key: 'fornecedores', label: 'Fornecedores' },
  { key: 'licencas', label: 'Licencas' },
  { key: 'listas', label: 'Listas' },
]

function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [selectedProduto, setSelectedProduto] = useState(null)
  const [authStatus, setAuthStatus] = useState('pending')
  const queryClient = useQueryClient()
  const isFetching = useIsFetching()

  async function handleClearCache() {
    if (!window.confirm('Limpar todo o cache do servidor? Os dados serao buscados novamente da Reval.')) return
    await clearServerCache()
    queryClient.clear()
    alert('Cache limpo! Os dados serao atualizados automaticamente.')
  }

  function handleSelectProduto(codigo) {
    setSelectedProduto(codigo)
  }

  function handleBackFromDetalhe() {
    setSelectedProduto(null)
  }

  useEffect(() => {
    if (localStorage.getItem('reval_token')) {
      setAuthStatus('ok')
      return
    }
    authenticate()
      .then(() => setAuthStatus('ok'))
      .catch(() => setAuthStatus('error'))
  }, [])

  if (authStatus === 'pending') {
    return <div className="loading-screen">Autenticando na API Reval...</div>
  }

  if (authStatus === 'error') {
    return <div className="loading-screen error">Falha na autenticacao.</div>
  }

  if (selectedProduto) {
    return (
      <div className="app">
        {isFetching > 0 && <div className="loading-bar" />}
        <header className="app-header">
          <h1>Papelaria Galileu</h1>
          <button className="btn-clear-cache" onClick={handleClearCache}>Limpar cache</button>
        </header>
        <main className="app-content">
          <ProdutoDetalhePage codigo={selectedProduto} onBack={handleBackFromDetalhe} />
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      {isFetching > 0 && <div className="loading-bar" />}

      <header className="app-header">
        <h1>Papelaria Galileu</h1>
        <nav className="tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <button className="btn-clear-cache" onClick={handleClearCache}>Limpar cache</button>
      </header>

      <main className="app-content">
        {activeTab === 'home' && <HomePage onSelectProduto={handleSelectProduto} />}
        {activeTab === 'produtos' && <ProdutosPage onSelectProduto={handleSelectProduto} />}
        {activeTab === 'categorias' && <CategoriasPage onSelectProduto={handleSelectProduto} />}
        {activeTab === 'fornecedores' && <FornecedoresPage onSelectProduto={handleSelectProduto} />}
        {activeTab === 'licencas' && <LicencasPage onSelectProduto={handleSelectProduto} />}
        {activeTab === 'listas' && <ListasPage onSelectProduto={handleSelectProduto} />}
      </main>
    </div>
  )
}

export default App
