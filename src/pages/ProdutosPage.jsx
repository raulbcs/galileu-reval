import { useState } from 'react'
import { useProdutosPage } from '../hooks/useRevalApi'
import { ProdutoCard } from '../components/ProdutoCard'

const PAGE_SIZE = 20

export function ProdutosPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, error, isFetching } = useProdutosPage(page, PAGE_SIZE)

  return (
    <div className="page">
      <h2>Produtos ({data?.totalRegistros ?? '...'} total)</h2>

      {error && <div className="error">Erro: {error.message}</div>}

      <div className="produto-grid">
        {data?.models?.map((p) => (
          <ProdutoCard key={p.codigo} produto={p} />
        ))}
      </div>

      {(isLoading || isFetching) && <div className="loading">Carregando...</div>}

      <div className="pagination">
        <button
          disabled={page <= 1 || isFetching}
          onClick={() => setPage((p) => p - 1)}
        >
          Anterior
        </button>
        <span>Página {page}</span>
        <button
          disabled={!data?.models?.length || isFetching}
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  )
}
