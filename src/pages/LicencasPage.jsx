import { useState } from 'react'
import { useLicencas, useProdutosByLicenca } from '../hooks/useRevalApi'
import { ProdutoCard } from '../components/ProdutoCard'
import { Pagination } from '../components/Pagination'

const PAGE_SIZE = 30

export function LicencasPage({ onSelectProduto, onNavigateTo }) {
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState(1)

  const { data: licencas, isLoading: loadingLic, error } = useLicencas()
  const { data: produtos, isLoading: loadingProd } = useProdutosByLicenca(selected?.descricao)

  const totalPages = Math.ceil((produtos?.length || 0) / PAGE_SIZE)
  const paginaResultados = produtos?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) || []

  if (loadingLic) return <div className="loading">Carregando licencas...</div>
  if (error) return <div className="error">Erro: {error.message}</div>

  if (selected) {
    return (
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <button className="btn-back" onClick={() => { setSelected(null); setPage(1); onNavigateTo?.('licencas') }}>← Voltar</button>
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
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            )}
          </>
        )}

        {!loadingProd && produtos?.length === 0 && (
          <div className="empty">Nenhum produto encontrado para esta licenca.</div>
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <h2>Licencas</h2>
      <div className="tag-grid">
        {licencas?.map((l) => (
          <span
            key={l.licenca}
            className="tag"
            style={{ cursor: 'pointer' }}
            onClick={() => { setSelected(l); setPage(1); onNavigateTo?.('licencas', l.descricao) }}
          >
            {l.descricao}
          </span>
        ))}
      </div>
    </div>
  )
}
