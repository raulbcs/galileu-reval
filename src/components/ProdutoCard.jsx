import { useImagemCapa } from '../hooks/useRevalApi'
import { traduzirEstoque } from '../utils/estoque'
import { buildUrl } from '../utils/routing'

function SupplierBadge({ supplier }) {
  return <span className={`supplier-badge ${supplier}`}>{supplier === 'reval' ? 'Reval' : 'Ideal'}</span>
}

function ProdutoImage({ produto }) {
  const isIdeal = produto.supplier === 'ideal'

  if (isIdeal) {
    return (
      <div className="produto-img">
        {produto.imagem_url ? (
          <img src={produto.imagem_url} alt={produto.nome} loading="lazy" />
        ) : null}
      </div>
    )
  }

  const { data: imgUrl, isLoading } = useImagemCapa(produto.codigo)
  return (
    <div className="produto-img">
      {isLoading ? (
        <span className="img-placeholder">...</span>
      ) : imgUrl ? (
        <img src={imgUrl} alt={produto.nome} loading="lazy" />
      ) : null}
    </div>
  )
}

export function ProdutoCard({ produto, onClick }) {
  const supplier = produto.supplier || 'reval'

  function handleClick(e) {
    if (e.metaKey || e.ctrlKey) return
    e.preventDefault()
    onClick?.(produto.codigo, supplier)
  }

  return (
    <a className="produto-card" href={buildUrl(null, null, produto.codigo, supplier)} onClick={handleClick}>
      <ProdutoImage produto={produto} />
      <div className="produto-info">
        <h3>{produto.nome}</h3>
        <p className="descricao">{produto.descricao}</p>
        <div className="produto-meta">
          <SupplierBadge supplier={supplier} />
          {produto.marca && <span className="marca">{produto.marca}</span>}
          {produto.preco != null && <span className="preco">R$ {produto.preco.toFixed(2)}</span>}
        </div>
        <div className="produto-detalhes">
          <span>Codigo: {produto.codigo}</span>
          {produto.estoque && <span>Estoque: {traduzirEstoque(produto.estoque)}</span>}
          {produto.embalagem && <span>Emb: {produto.embalagem}</span>}
        </div>
      </div>
    </a>
  )
}
