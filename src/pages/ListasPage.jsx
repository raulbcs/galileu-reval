import { useState, useMemo } from 'react'
import { useProdutos } from '../hooks/useRevalApi'
import { ProdutoCard } from '../components/ProdutoCard'

const PAGE_SIZE = 30

export function ListasPage({ onSelectProduto }) {
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState(1)

  const { data: todosProdutos, isLoading } = useProdutos(true)

  const listas = useMemo(() => {
    if (!todosProdutos) return []
    const set = new Set()
    todosProdutos.forEach((p) => { if (p.lista) set.add(p.lista) })
    return [...set].sort()
  }, [todosProdutos])

  const produtosFiltrados = useMemo(() => {
    if (!selected || !todosProdutos) return []
    return todosProdutos.filter((p) => p.lista === selected)
  }, [selected, todosProdutos])

  const totalPages = Math.ceil(produtosFiltrados.length / PAGE_SIZE)
  const paginaResultados = produtosFiltrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (isLoading) return <div className="loading">Carregando listas...</div>

  if (selected) {
    return (
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <button className="btn-back" onClick={() => { setSelected(null); setPage(1) }}>← Voltar</button>
          <h2>{selected}</h2>
        </div>

        {paginaResultados.length > 0 && (
          <>
            <div className="search-results-grid">
              {paginaResultados.map((p) => (
                <ProdutoCard key={p.codigo} produto={p} onClick={onSelectProduto} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="pagination">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
                <span>{page} / {totalPages} ({produtosFiltrados.length} resultados)</span>
                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Proximo</button>
              </div>
            )}
          </>
        )}

        {produtosFiltrados.length === 0 && (
          <div className="empty">Nenhum produto encontrado para esta lista.</div>
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <h2>Listas</h2>
      <div className="tag-grid">
        {listas.map((lista) => (
          <span
            key={lista}
            className="tag"
            style={{ cursor: 'pointer' }}
            onClick={() => { setSelected(lista); setPage(1) }}
          >
            {lista}
          </span>
        ))}
      </div>
    </div>
  )
}
