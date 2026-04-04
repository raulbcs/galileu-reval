import { useImagens, useProduto } from '../hooks/useRevalApi'

export function ProdutoDetalhePage({ codigo, onBack }) {
  const { data: produto, isLoading, error } = useProduto(codigo)
  const { data: imagens, isLoading: loadingImagens } = useImagens(codigo)

  if (isLoading) {
    return (
      <div className="page">
        <button className="btn-back" onClick={onBack}>Voltar</button>
        <div className="loading">Carregando produto...</div>
      </div>
    )
  }

  if (error || !produto) {
    return (
      <div className="page">
        <button className="btn-back" onClick={onBack}>Voltar</button>
        <div className="empty">{error ? 'Erro ao carregar produto.' : 'Produto nao encontrado.'}</div>
      </div>
    )
  }

  return (
    <div className="page">
      <button className="btn-back" onClick={onBack}>Voltar</button>

      <div className="detalhe">
        <div className="detalhe-img">
          <img
            src={`/cached-images/${produto.codigo}`}
            alt={produto.nome}
            onError={(e) => { e.target.style.display = 'none' }}
          />
        </div>

        <div className="detalhe-info">
          <h2>{produto.descricao}</h2>

          <table className="detalhe-table">
            <tbody>
              <tr><td className="label">Codigo</td><td>{produto.codigo}</td></tr>
              <tr><td className="label">Codigo de Barras</td><td>{produto.codigoBarras || '-'}</td></tr>
              <tr><td className="label">Marca</td><td>{produto.marca}</td></tr>
              <tr><td className="label">NCM</td><td>{produto.ncm || '-'}</td></tr>
              <tr><td className="label">CFOP</td><td>{produto.cfop || '-'}</td></tr>
              <tr><td className="label">CST</td><td>{produto.cst || '-'}</td></tr>
              <tr><td className="label">ICMS</td><td>{produto.icms}%</td></tr>
              <tr><td className="label">Origem</td><td>{produto.origemDescricao || '-'}</td></tr>
              <tr><td className="label">Embalagem</td><td>{produto.embalagem || '-'}</td></tr>
              <tr><td className="label">Peso</td><td>{produto.peso || '-'} kg</td></tr>
              <tr><td className="label">Dimensoes (A x L x C)</td><td>{produto.altura} x {produto.largura} x {produto.comprimento} cm</td></tr>
              <tr><td className="label">Estoque</td><td>{produto.estoque}</td></tr>
              <tr><td className="label">Lista</td><td>{produto.lista || '-'}</td></tr>
              <tr><td className="label">Referencia</td><td>{produto.referencia || '-'}</td></tr>
              <tr className="preco-row"><td className="label">Preco</td><td className="preco">R$ {produto.preco}</td></tr>
            </tbody>
          </table>

          {produto.infAdicionais && (
            <div className="detalhe-extra">
              <h3>Informacoes adicionais</h3>
              <p>{produto.infAdicionais}</p>
            </div>
          )}
        </div>
      </div>

      {loadingImagens && <div className="loading">Carregando imagens...</div>}

      {imagens?.length > 0 && (
        <div className="detalhe-galeria">
          <h3>Imagens ({imagens.length})</h3>
          <div className="galeria-grid">
            {imagens.map((img) => (
              <div key={img.id} className="galeria-item">
                <img
                  src={`data:image/jpeg;base64,${img.arquivo}`}
                  alt={img.nome}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
