import { useImagemCapa } from '../hooks/useRevalApi'
import { traduzirEstoque } from '../utils/estoque'
import { gerarSku } from '../utils/sku'
import { buildUrl } from '../utils/routing'

export function ProdutoCard({ produto, onClick }) {
  const { data: imgUrl, isLoading } = useImagemCapa(produto.codigo)

  function handleClick(e) {
    if (e.metaKey || e.ctrlKey) return
    e.preventDefault()
    onClick?.(produto.codigo)
  }

  return (
    <a className="produto-card" href={buildUrl(null, null, produto.codigo)} onClick={handleClick}>
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
          <span>SKU GALILEU: {gerarSku(produto.nome, produto.marca, produto.descricao, produto.codigo)}</span>
          <span>Código: {produto.codigo}</span>
          <span>Estoque: {traduzirEstoque(produto.estoque)}</span>
          <span>Emb: {produto.embalagem}</span>
        </div>
      </div>
    </a>
  )
}
