import { useLicencas } from '../hooks/useRevalApi'

export function LicencasPage() {
  const { data, isLoading, error } = useLicencas()

  if (isLoading) return <div className="loading">Carregando licenças...</div>
  if (error) return <div className="error">Erro: {error.message}</div>

  return (
    <div className="page">
      <h2>Licenças</h2>
      <div className="tag-grid">
        {data?.map((l) => (
          <span key={l.licenca} className="tag">{l.descricao}</span>
        ))}
      </div>
    </div>
  )
}
