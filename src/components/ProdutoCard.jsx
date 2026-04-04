import { useImagemCapa } from '../hooks/useRevalApi'

export function ProdutoCard({ produto, onClick }) {
  const { data: imgUrl, isLoading } = useImagemCapa(produto.codigo)

  return (
    <div className="produto-card" onClick={() => onClick?.(produto.codigo)} style={onClick ? { cursor: 'pointer' } : {}}>
      <div className="produto-img">
        {isLoading ? (
          <span className="img-placeholder">...</span>
        ) : imgUrl ? (
          <img src={imgUrl} alt={produto.nome} loading="lazy" />
        ) : null}
      </div>
      <div className="produto-info">
        <h3>{produto.nome}</h3>
        <p className="descricao">{produto.descricao}</p>
        <div className="produto-meta">
          <span className="marca">{produto.marca}</span>
          <span className="preco">R$ {produto.preco}</span>
        </div>
        <div className="produto-detalhes">
          <span>Código: {produto.codigo}</span>
          <span>Estoque: {produto.estoque}</span>
          <span>Emb: {produto.embalagem}</span>
        </div>
      </div>
    </div>
  )
}
