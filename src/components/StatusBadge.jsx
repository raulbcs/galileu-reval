export function StatusBadge({ loading, error }) {
  if (error) return <span className="badge error">Erro</span>
  if (loading) return <span className="badge loading">Carregando...</span>
  return null
}
