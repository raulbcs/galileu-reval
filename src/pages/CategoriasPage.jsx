import { useCategorias } from '../hooks/useRevalApi'

export function CategoriasPage() {
  const { data, isLoading, error } = useCategorias()

  if (isLoading) return <div className="loading">Carregando categorias...</div>
  if (error) return <div className="error">Erro: {error.message}</div>

  return (
    <div className="page">
      <h2>Categorias</h2>
      <div className="categoria-list">
        {data?.map((cat) => (
          <div key={cat.id} className="categoria-item">
            <h3>{cat.descricao}</h3>
            {cat.subCategorias?.length > 0 && (
              <ul>
                {cat.subCategorias.map((sub) => (
                  <li key={sub.idSubCategoria}>{sub.descricao}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
