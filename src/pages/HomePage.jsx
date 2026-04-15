import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useProdutos } from '../hooks/useRevalApi'
import { ProdutoCard } from '../components/ProdutoCard'
import { Pagination } from '../components/Pagination'
import { formatBytes } from '../utils/format'
import { gerarSku } from '../utils/sku'
import { exportToXlsx } from '../utils/export'
import { getProdutos } from '../api/client'

const SEARCH_TYPES = [
  { key: 'nome', label: 'Nome' },
  { key: 'sku', label: 'SKU Galileu' },
  { key: 'codigo', label: 'Codigo Reval' },
  { key: 'barcode', label: 'Cod. Barras' },
]

const MIN_CHARS = 3
const PAGE_SIZE = 30

export function HomePage({ onSelectProduto }) {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState('nome')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const minChars = query.length >= MIN_CHARS
  const { data: todosProdutos, isLoading: loading, progress } = useProdutos(
    minChars ? true : undefined
  )

  const skuMap = useMemo(() => {
    if (!todosProdutos) return new Map()
    const map = new Map()
    for (const p of todosProdutos) {
      map.set(p.codigo, gerarSku(p.nome, p.marca, p.descricao, p.codigo))
    }
    return map
  }, [todosProdutos])

  const resultados = useMemo(() => {
    if (!minChars || !todosProdutos) return []
    const q = query.trim().toLowerCase()
    if (searchType === 'nome') {
      return todosProdutos.filter(
        (p) =>
          p.nome?.toLowerCase().includes(q) ||
          p.descricao?.toLowerCase().includes(q)
      )
    }
    if (searchType === 'sku') {
      const qu = q.toUpperCase()
      return todosProdutos.filter((p) => skuMap.get(p.codigo)?.includes(qu))
    }
    if (searchType === 'codigo') {
      return todosProdutos.filter((p) => p.codigo?.toString().includes(q))
    }
    if (searchType === 'barcode') {
      return todosProdutos.filter((p) => p.codigoBarras?.toString().includes(q))
    }
    return []
  }, [searchType, query, todosProdutos, minChars, skuMap])

  const totalPages = Math.ceil(resultados.length / PAGE_SIZE)
  const paginaResultados = resultados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const produtos = todosProdutos || await getProdutos()
      exportToXlsx(produtos)
    } catch {
      alert('Erro ao exportar produtos.')
    } finally {
      setExporting(false)
    }
  }, [todosProdutos])

  return (
    <div className="home-page">
      <div className="welcome">
        <h1>Bem-vindo a Papelaria Galileu</h1>
        <p>Consulte produtos, categorias e fornecedores da Reval.</p>
        <button className="btn-export-xlsx" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exportando...' : 'Exportar todos para XLSX'}
        </button>
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
              searchType === 'sku' ? 'Ex: CDRN-SNSU-SPDR' :
              searchType === 'codigo' ? 'Ex: 088590' :
              searchType === 'barcode' ? 'Ex: 7891040351916' :
              'Ex: ABAFADOR'
            }
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
          />
        </div>
      </form>

      {loading && (
        <div className="loading">
          {progress.total > 0
            ? `Baixando produtos... ${formatBytes(progress.loaded)} / ${formatBytes(progress.total)}`
            : `Aguarde, carregando a lista de produtos... (${elapsed}s)`}
        </div>
      )}

      {!loading && minChars && paginaResultados.length > 0 && (
        <>
          <div className="search-results-grid">
            {paginaResultados.map((p) => (
              <ProdutoCard key={p.codigo} produto={p} onClick={onSelectProduto} />
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </>
      )}

      {minChars && !loading && resultados.length === 0 && (
        <div className="empty">Nenhum produto encontrado.</div>
      )}
    </div>
  )
}
