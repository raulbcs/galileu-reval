import { ProdutoCard } from './ProdutoCard'

export function ProdutoTable({ produtos, loading, error }) {
  if (loading) return <div className="loading">Carregando produtos...</div>
  if (error) return <div className="error">Erro ao carregar produtos: {error.message}</div>
  if (!produtos?.length) return <div className="empty">Nenhum produto encontrado.</div>

  return (
    <div className="produto-grid">
      {produtos.map((p) => (
        <ProdutoCard key={p.codigo} produto={p} />
      ))}
    </div>
  )
}
