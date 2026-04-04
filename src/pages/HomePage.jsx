import { useState, useMemo, useEffect, useRef } from 'react'
import { useProduto, useProdutoByCodBarras, useProdutos } from '../hooks/useRevalApi'
import { ProdutoCard } from '../components/ProdutoCard'

const SEARCH_TYPES = [
  { key: 'nome', label: 'Nome' },
  { key: 'codigo', label: 'Codigo Reval' },
  { key: 'barcode', label: 'Cod. Barras' },
]

const PAGE_SIZE = 30

export function HomePage({ onSelectProduto }) {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState('nome')
  const [page, setPage] = useState(1)

  const { data: produtoCodigo, isLoading: loadingCodigo } = useProduto(
    searchType === 'codigo' ? query : ''
  )
  const { data: produtoBarra, isLoading: loadingBarra } = useProdutoByCodBarras(
    searchType === 'barcode' ? query : ''
  )
  const { data: todosProdutos, isLoading: loadingAll } = useProdutos(
    searchType === 'nome' && query.length >= 2 ? true : undefined
  )

  const resultadosNome = useMemo(() => {
    if (searchType !== 'nome' || !query || !todosProdutos) return []
    const q = query.trim().toLowerCase()
    return todosProdutos.filter(
      (p) =>
        p.nome?.toLowerCase().includes(q) ||
        p.descricao?.toLowerCase().includes(q)
    )
  }, [searchType, query, todosProdutos])

  const totalPages = Math.ceil(resultadosNome.length / PAGE_SIZE)
  const paginaResultados = resultadosNome.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const loading = loadingCodigo || loadingBarra || loadingAll
  const hasSearched = query.length > 0
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (loading) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [loading])

  let singleProduto = null
  if (searchType === 'codigo') singleProduto = produtoCodigo
  if (searchType === 'barcode') singleProduto = produtoBarra

  return (
    <div className="home-page">
      <div className="welcome">
        <h1>Bem-vindo a Papelaria Galileu</h1>
        <p>Consulte produtos, categorias e fornecedores da Reval.</p>
      </div>

      <form className="search-form" onSubmit={(e) => e.preventDefault()}>
        <div className="search-tabs">
          {SEARCH_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`search-tab ${searchType === t.key ? 'active' : ''}`}
              onClick={() => { setSearchType(t.key); setQuery(''); setPage(1) }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="search-input-row">
          <input
            type="text"
            placeholder={
              searchType === 'codigo' ? 'Ex: 088590' :
              searchType === 'barcode' ? 'Ex: 7891040351916' :
              'Ex: ABAFADOR'
            }
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
          />
        </div>
      </form>

      {loading && <div className="loading">Aguarde, carregando a lista de produtos... ({elapsed}s)</div>}

      {searchType !== 'nome' && hasSearched && !loading && singleProduto?.codigo && (
        <div className="search-result">
          <ProdutoCard produto={singleProduto} onClick={onSelectProduto} />
        </div>
      )}

      {searchType === 'nome' && !loading && resultadosNome.length > 0 && (
        <>
          <div className="search-results-grid">
            {paginaResultados.map((p) => (
              <ProdutoCard key={p.codigo} produto={p} onClick={onSelectProduto} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
              <span>{page} / {totalPages} ({resultadosNome.length} resultados)</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Proximo</button>
            </div>
          )}
        </>
      )}

      {hasSearched && !loading && searchType !== 'nome' && !singleProduto?.codigo && (
        <div className="empty">Nenhum produto encontrado.</div>
      )}

      {searchType === 'nome' && query.length >= 2 && !loading && resultadosNome.length === 0 && (
        <div className="empty">Nenhum produto encontrado.</div>
      )}
    </div>
  )
}
