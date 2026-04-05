import { useState } from 'react'
import { useCategorias, useProdutosByCategoria } from '../hooks/useRevalApi'
import { ProdutoCard } from '../components/ProdutoCard'

const PAGE_SIZE = 30

export function CategoriasPage({ onSelectProduto }) {
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState(1)

  const { data: categorias, isLoading: loadingCat, error } = useCategorias()
  const { data: produtos, isLoading: loadingProd } = useProdutosByCategoria(selected?.descricao)

  const totalPages = Math.ceil((produtos?.length || 0) / PAGE_SIZE)
  const paginaResultados = produtos?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) || []

  if (loadingCat) return <div className="loading">Carregando categorias...</div>
  if (error) return <div className="error">Erro: {error.message}</div>

  if (selected) {
    return (
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <button className="btn-back" onClick={() => { setSelected(null); setPage(1) }}>← Voltar</button>
          <h2>{selected.descricao}</h2>
        </div>

        {loadingProd && <div className="loading">Carregando produtos...</div>}

        {!loadingProd && paginaResultados.length > 0 && (
          <>
            <div className="search-results-grid">
              {paginaResultados.map((p) => (
                <ProdutoCard key={p.codigo} produto={p} onClick={onSelectProduto} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="pagination">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
                <span>{page} / {totalPages} ({produtos.length} resultados)</span>
                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Proximo</button>
              </div>
            )}
          </>
        )}

        {!loadingProd && produtos?.length === 0 && (
          <div className="empty">Nenhum produto encontrado para esta categoria.</div>
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <h2>Categorias</h2>
      <div className="tag-grid">
        {categorias?.map((cat) => (
          <span
            key={cat.id}
            className="tag"
            style={{ cursor: 'pointer' }}
            onClick={() => { setSelected(cat); setPage(1) }}
          >
            {cat.descricao}
          </span>
        ))}
      </div>
    </div>
  )
}
