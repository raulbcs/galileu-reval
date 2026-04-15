import { useEffect, useMemo, useState, useCallback } from 'react'
import { useImagens, useProduto } from '../hooks/useRevalApi'
import { traduzirEstoque } from '../utils/estoque'
import { gerarSku } from '../utils/sku'

export function ProdutoDetalhePage({ codigo, onBack, onNavigateTo }) {
  const { data: produto, isLoading, error } = useProduto(codigo)
  const { data: imagens, isLoading: loadingImagens } = useImagens(codigo)
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const [copied, setCopied] = useState(false)

  const allImages = useMemo(() => {
    if (!imagens?.length) return []
    return imagens.map((img) => `data:image/jpeg;base64,${img.arquivo}`)
  }, [imagens])

  function openLightbox(index) { setLightboxIndex(index) }
  function closeLightbox() { setLightboxIndex(-1) }
  function navigateImage(dir) {
    const next = (lightboxIndex + dir + allImages.length) % allImages.length
    setLightboxIndex(next)
  }

  const lightboxOpen = lightboxIndex >= 0 && allImages.length > 0

  const sku = produto ? gerarSku(produto.nome, produto.marca, produto.descricao, produto.codigo) : ''

  const copiarSku = useCallback(() => {
    navigator.clipboard.writeText(sku).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [sku])

  useEffect(() => {
    if (!lightboxOpen) return
    function onKey(e) {
      if (e.key === 'Escape') closeLightbox()
      else if (e.key === 'ArrowRight') navigateImage(1)
      else if (e.key === 'ArrowLeft') navigateImage(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxOpen, lightboxIndex, allImages.length])

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
            loading="lazy"
            onClick={() => { if (allImages.length) openLightbox(0) }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
        </div>

        <div className="detalhe-info">
          <h2>{produto.nome}</h2>
          <h3 className="detalhe-descricao">{produto.descricao}</h3>
          <div className="sku-box">
            <span className="sku-label">SKU GALILEU</span>
            <span className="sku-code">{sku}</span>
            <button className="sku-copy" onClick={copiarSku}>{copied ? 'Copiado!' : 'Copiar'}</button>
          </div>
          <table className="detalhe-table">
            <tbody>
              <tr><td className="label">Codigo</td><td>{produto.codigo}</td></tr>
              <tr><td className="label">Codigo de Barras</td><td>{produto.codigoBarras || '-'}</td></tr>
              <tr><td className="label">Marca</td><td><span className="detail-link" onClick={() => onNavigateTo?.('fornecedores', produto.marca)}>{produto.marca}</span></td></tr>
              <tr><td className="label">NCM</td><td>{produto.ncm || '-'}</td></tr>
              <tr><td className="label">CFOP</td><td>{produto.cfop || '-'}</td></tr>
              <tr><td className="label">CST</td><td>{produto.cst || '-'}</td></tr>
              <tr><td className="label">ICMS</td><td>{produto.icms}%</td></tr>
              <tr><td className="label">Origem</td><td>{produto.origemDescricao || '-'}</td></tr>
              <tr><td className="label">Embalagem</td><td>{produto.embalagem || '-'}</td></tr>
              <tr><td className="label">Peso</td><td>{produto.peso || '-'} kg</td></tr>
              <tr><td className="label">Dimensoes (A x L x C)</td><td>{produto.altura} x {produto.largura} x {produto.comprimento} cm</td></tr>
              <tr><td className="label">Estoque</td><td>{traduzirEstoque(produto.estoque)}</td></tr>
              <tr><td className="label">Lista</td><td>{produto.lista ? <span className="detail-link" onClick={() => onNavigateTo?.('listas', produto.lista)}>{produto.lista}</span> : '-'}</td></tr>
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
            {imagens.map((img, i) => {
              const src = `data:image/jpeg;base64,${img.arquivo}`
              return (
                <div key={img.id} className="galeria-item">
                  <img
                    src={src}
                    alt={img.nome}
                    loading="lazy"
                    onClick={() => openLightbox(i)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {lightboxOpen && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <button className="lightbox-close" onClick={closeLightbox}>&times;</button>
          {allImages.length > 1 && (
            <>
              <button className="lightbox-arrow lightbox-prev" onClick={(e) => { e.stopPropagation(); navigateImage(-1) }}>&#8249;</button>
              <button className="lightbox-arrow lightbox-next" onClick={(e) => { e.stopPropagation(); navigateImage(1) }}>&#8250;</button>
            </>
          )}
          <img className="lightbox-img" src={allImages[lightboxIndex]} alt="Imagem ampliada" onClick={(e) => e.stopPropagation()} />
          {allImages.length > 1 && <div className="lightbox-counter" onClick={(e) => e.stopPropagation()}>{lightboxIndex + 1} / {allImages.length}</div>}
        </div>
      )}
    </div>
  )
}
