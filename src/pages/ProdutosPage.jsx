import { useState, useMemo, useEffect, useRef } from 'react'
import { useProdutos } from '../hooks/useRevalApi'
import { ProdutoCard } from '../components/ProdutoCard'
import { Pagination } from '../components/Pagination'
import { formatBytes } from '../utils/format'

const PAGE_SIZE = 21

export function ProdutosPage({ onSelectProduto }) {
  const [page, setPage] = useState(1)
  const { data: produtos, isLoading, error, progress } = useProdutos(true)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (isLoading) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isLoading])

  const pageData = useMemo(() => {
    if (!produtos) return { items: [], total: 0, totalPages: 0 }
    const start = (page - 1) * PAGE_SIZE
    return {
      items: produtos.slice(start, start + PAGE_SIZE),
      total: produtos.length,
      totalPages: Math.ceil(produtos.length / PAGE_SIZE),
    }
  }, [produtos, page])

  if (isLoading) return (
    <div className="loading">
      {progress.total > 0
        ? `Baixando produtos... ${formatBytes(progress.loaded)} / ${formatBytes(progress.total)}`
        : `Carregando produtos... (${elapsed}s)`}
    </div>
  )
  if (error) return <div className="error">Erro: {error.message}</div>

  return (
    <div className="page">
      <h2>Produtos ({pageData.total.toLocaleString()} total)</h2>

      <div className="produto-grid">
        {pageData.items.map((p) => (
          <ProdutoCard key={p.codigo} produto={p} onClick={onSelectProduto} />
        ))}
      </div>

      <Pagination page={page} totalPages={pageData.totalPages} onPageChange={setPage} />
    </div>
  )
}
