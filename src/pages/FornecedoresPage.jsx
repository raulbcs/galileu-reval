import { useFornecedores } from '../hooks/useRevalApi'

export function FornecedoresPage() {
  const { data, isLoading, error } = useFornecedores()

  if (isLoading) return <div className="loading">Carregando fornecedores...</div>
  if (error) return <div className="error">Erro: {error.message}</div>

  return (
    <div className="page">
      <h2>Fornecedores / Marcas</h2>
      <div className="tag-grid">
        {data?.map((f) => (
          <span key={f.codigo} className="tag">{f.descricao}</span>
        ))}
      </div>
    </div>
  )
}
