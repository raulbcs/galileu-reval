import { useState, useMemo } from 'react'
import { useFornecedores, useProdutos } from '../hooks/useRevalApi'
import { ProdutoCard } from '../components/ProdutoCard'

const PAGE_SIZE = 30

export function FornecedoresPage({ onSelectProduto }) {
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState(1)

  const { data: fornecedores, isLoading: loadingForn, error } = useFornecedores()
  const { data: todosProdutos, isLoading: loadingProd } = useProdutos(selected ? true : undefined)

  const produtosFiltrados = useMemo(() => {
    if (!selected || !todosProdutos) return []
    return todosProdutos.filter((p) => p.marca?.toLowerCase() === selected.descricao?.toLowerCase())
  }, [selected, todosProdutos])

  const totalPages = Math.ceil(produtosFiltrados.length / PAGE_SIZE)
  const paginaResultados = produtosFiltrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (loadingForn) return <div className="loading">Carregando fornecedores...</div>
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
                <span>{page} / {totalPages} ({produtosFiltrados.length} resultados)</span>
                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Proximo</button>
              </div>
            )}
          </>
        )}

        {!loadingProd && produtosFiltrados.length === 0 && (
          <div className="empty">Nenhum produto encontrado para este fornecedor.</div>
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <h2>Fornecedores / Marcas</h2>
      <div className="tag-grid">
        {fornecedores?.map((f) => (
          <span
            key={f.codigo}
            className="tag"
            style={{ cursor: 'pointer' }}
            onClick={() => { setSelected(f); setPage(1) }}
          >
            {f.descricao}
          </span>
        ))}
      </div>
    </div>
  )
}
