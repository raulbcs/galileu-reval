import { useCounts } from '../hooks/useApiProdutos'

export function HomePage({ onNavigate }) {
  const { data: counts } = useCounts()

  return (
    <div className="home-page">
      <div className="welcome">
        <h1>Bem-vindo a Papelaria Galileu</h1>
        <p>Consulte produtos e preços dos fornecedores Reval e Ideal.</p>
        {counts && (
          <div className="search-results-info">
            <span>Reval: {(counts.reval || 0).toLocaleString()}</span>
            <span>Ideal: {(counts.ideal || 0).toLocaleString()}</span>
          </div>
        )}
        <button className="btn-busca" onClick={() => onNavigate?.('produtos')}>
          Buscar Produtos
        </button>
      </div>
      <footer className="version">{__GIT_HASH__}</footer>
    </div>
  )
}
