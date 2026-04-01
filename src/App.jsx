import { useState, useEffect } from 'react'
import { authenticate } from './api/client'
import { ProdutosPage } from './pages/ProdutosPage'
import { CategoriasPage } from './pages/CategoriasPage'
import { FornecedoresPage } from './pages/FornecedoresPage'
import { LicencasPage } from './pages/LicencasPage'
import './App.css'

const TABS = [
  { key: 'produtos', label: 'Produtos' },
  { key: 'categorias', label: 'Categorias' },
  { key: 'fornecedores', label: 'Fornecedores' },
  { key: 'licencas', label: 'Licenças' },
]

function App() {
  const [activeTab, setActiveTab] = useState('produtos')
  const [authStatus, setAuthStatus] = useState('pending')

  useEffect(() => {
    if (localStorage.getItem('reval_token')) {
      setAuthStatus('ok')
      return
    }
    authenticate()
      .then(() => setAuthStatus('ok'))
      .catch((err) => setAuthStatus('error'))
  }, [])

  if (authStatus === 'pending') {
    return <div className="loading-screen">Autenticando na API Reval...</div>
  }

  if (authStatus === 'error') {
    return <div className="loading-screen error">Falha na autenticação com a API.</div>
  }

  return (
    <div className="app">
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
      </header>

      <main className="app-content">
        {activeTab === 'produtos' && <ProdutosPage />}
        {activeTab === 'categorias' && <CategoriasPage />}
        {activeTab === 'fornecedores' && <FornecedoresPage />}
        {activeTab === 'licencas' && <LicencasPage />}
      </main>
    </div>
  )
}

export default App
