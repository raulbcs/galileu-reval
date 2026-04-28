import { useEffect, useMemo, useState } from 'react'
import { useImagens } from '../hooks/useRevalApi'
import { useProduto, usePriceHistory } from '../hooks/useApiProdutos'
import { traduzirEstoque } from '../utils/estoque'
import { PriceHistoryChart } from '../components/PriceHistoryChart'

function RevalProdutoDetalhe({ produto, onBack, onNavigateTo }) {
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const { data: imagens, isLoading: loadingImagens } = useImagens(produto.codigo)
  const { data: priceHistory } = usePriceHistory('reval', produto.codigo)

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
          <div className="sku-actions">
            <a className="btn-marketplace" href={`https://lista.mercadolivre.com.br/${encodeURIComponent(`${produto.nome} ${produto.marca} ${produto.descricao || ''}`)}`} target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.115 16.479a.93.927 0 0 1-.939-.886c-.002-.042-.006-.155-.103-.155-.04 0-.074.023-.113.059-.112.103-.254.206-.46.206a.816.814 0 0 1-.305-.066c-.535-.214-.542-.578-.521-.725.006-.038.007-.08-.02-.11l-.032-.03h-.034c-.027 0-.055.012-.093.039a.788.786 0 0 1-.454.16.7.699 0 0 1-.253-.05c-.708-.27-.65-.928-.617-1.126.005-.041-.005-.072-.03-.092l-.05-.04-.047.043a.728.726 0 0 1-.505.203.73.728 0 0 1-.732-.725c0-.4.328-.722.732-.722.364 0 .675.27.721.63l.026.195.11-.165c.01-.018.307-.46.852-.46.102 0 .21.016.316.05.434.13.508.52.519.68.008.094.075.1.09.1.037 0 .064-.024.083-.045a.746.744 0 0 1 .54-.225c.128 0 .263.03.402.09.69.293.379 1.158.374 1.167-.058.144-.061.207-.005.244l.027.013h.02c.03 0 .07-.014.134-.035.093-.032.235-.08.367-.08a.944.942 0 0 1 .94.93.936.934 0 0 1-.94.928zm7.302-4.171c-1.138-.98-3.768-3.24-4.481-3.77-.406-.302-.685-.462-.928-.533a1.559 1.554 0 0 0-.456-.07c-.182 0-.376.032-.58.095-.46.145-.918.505-1.362.854l-.023.018c-.414.324-.84.66-1.164.73a1.986 1.98 0 0 1-.43.049c-.362 0-.687-.104-.81-.258-.02-.025-.007-.066.04-.125l.008-.008 1-1.067c.783-.774 1.525-1.506 3.23-1.545h.085c1.062 0 2.12.469 2.24.524a7.03 7.03 0 0 0 3.056.724c1.076 0 2.188-.263 3.354-.795a9.135 9.11 0 0 0-.405-.317c-1.025.44-2.003.66-2.946.66-.962 0-1.925-.229-2.858-.68-.05-.022-1.22-.567-2.44-.57-.032 0-.065 0-.096.002-1.434.033-2.24.536-2.782.976-.528.013-.982.138-1.388.25-.361.1-.673.186-.979.185-.125 0-.35-.01-.37-.012-.35-.01-2.115-.437-3.518-.962-.143.1-.28.203-.415.31 1.466.593 3.25 1.053 3.812 1.089.157.01.323.027.491.027.372 0 .744-.103 1.104-.203.213-.059.446-.123.692-.17l-.196.194-1.017 1.087c-.08.08-.254.294-.14.557a.705.703 0 0 0 .268.292c.243.162.677.27 1.08.271.152 0 .297-.015.43-.044.427-.095.874-.448 1.349-.82.377-.296.913-.672 1.323-.782a1.494 1.49 0 0 1 .37-.05.611.61 0 0 1 .095.005c.27.034.533.125 1.003.472.835.62 4.531 3.815 4.566 3.846.002.002.238.203.22.537-.007.186-.11.352-.294.466a.902.9 0 0 1-.484.15.804.802 0 0 1-.428-.124c-.014-.01-1.28-1.157-1.746-1.543-.074-.06-.146-.115-.22-.115a.122.122 0 0 0-.096.045c-.073.09.01.212.105.294l1.48 1.47c.002 0 .184.17.204.395.012.244-.106.447-.35.606a.957.955 0 0 1-.526.171.766.764 0 0 1-.42-.127l-.214-.206a21.035 20.978 0 0 0-1.08-1.009c-.072-.058-.148-.112-.221-.112a.127.127 0 0 0-.094.038c-.033.037-.056.103.028.212a.698.696 0 0 0 .075.083l1.078 1.198c.01.01.222.26.024.511l-.038.048a1.18 1.178 0 0 1-.1.096c-.184.15-.43.164-.527.164a.8.798 0 0 1-.147-.012c-.106-.018-.178-.048-.212-.089l-.013-.013c-.06-.06-.602-.609-1.054-.98-.059-.05-.133-.11-.21-.11a.128.128 0 0 0-.096.042c-.09.096.044.24.1.293l.92 1.003a.204.204 0 0 1-.033.062c-.033.044-.144.155-.479.196a.91.907 0 0 1-.122.007c-.345 0-.712-.164-.902-.264a1.343 1.34 0 0 0 .13-.576 1.368 1.365 0 0 0-1.42-1.357c.024-.342-.025-.99-.697-1.274a1.455 1.452 0 0 0-.575-.125c-.146 0-.287.025-.42.075a1.153 1.15 0 0 0-.671-.564 1.52 1.515 0 0 0-.494-.085c-.28 0-.537.08-.767.242a1.168 1.165 0 0 0-.903-.43 1.173 1.17 0 0 0-.82.335c-.287-.217-1.425-.93-4.467-1.613a17.39 17.344 0 0 1-.692-.189 4.822 4.82 0 0 0-.077.494l.67.157c3.108.682 4.136 1.391 4.309 1.525a1.145 1.142 0 0 0-.09.442 1.16 1.158 0 0 0 1.378 1.132c.096.467.406.821.879 1.003a1.165 1.162 0 0 0 .415.08c.09 0 .179-.012.266-.034.086.22.282.493.722.668a1.233 1.23 0 0 0 .457.094c.122 0 .241-.022.355-.063a1.373 1.37 0 0 0 1.269.841c.37.002.726-.147.985-.41.221.121.688.341 1.163.341.06 0 .118-.002.175-.01.47-.059.689-.24.789-.382a.571.57 0 0 0 .048-.078c.11.032.234.058.373.058.255 0 .501-.086.75-.265.244-.174.418-.424.444-.637v-.01c.083.017.167.026.251.026.265 0 .527-.082.773-.242.48-.31.562-.715.554-.98a1.28 1.279 0 0 0 .978-.194 1.04 1.04 0 0 0 .502-.808 1.088 1.085 0 0 0-.16-.653c.804-.342 2.636-1.003 4.795-1.483a4.734 4.721 0 0 0-.067-.492 27.742 27.667 0 0 0-5.049 1.62zm5.123-.763c0 4.027-5.166 7.293-11.537 7.293-6.372 0-11.538-3.266-11.538-7.293 0-4.028 5.165-7.293 11.539-7.293 6.371 0 11.537 3.265 11.537 7.293zm.46.004c0-4.272-5.374-7.755-12-7.755S.002 7.277.002 11.55L0 12.004c0 4.533 4.695 8.203 11.999 8.203 7.347 0 12-3.67 12-8.204z"/></svg>
              Mercado Livre
            </a>
            <a className="btn-marketplace" href={`https://shopee.com.br/search?keyword=${encodeURIComponent(`${produto.nome} ${produto.marca} ${produto.descricao || ''}`)}`} target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.9414 17.9633c.229-1.879-.981-3.077-4.1758-4.0969-1.548-.528-2.277-1.22-2.26-2.1719.065-1.056 1.048-1.825 2.352-1.85a5.2898 5.2898 0 0 1 2.8838.89c.116.072.197.06.263-.039.09-.145.315-.494.39-.62.051-.081.061-.187-.068-.281-.185-.1369-.704-.4149-.983-.5319a6.4697 6.4697 0 0 0-2.5118-.514c-1.909.008-3.4129 1.215-3.5389 2.826-.082 1.1629.494 2.1078 1.73 2.8278.262.152 1.6799.716 2.2438.892 1.774.552 2.695 1.5419 2.478 2.6969-.197 1.047-1.299 1.7239-2.818 1.7439-1.2039-.046-2.2878-.537-3.1278-1.19l-.141-.11c-.104-.08-.218-.075-.287.03-.05.077-.376.547-.458.67-.077.108-.035.168.045.234.35.293.817.613 1.134.775a6.7097 6.7097 0 0 0 2.8289.727 4.9048 4.9048 0 0 0 2.0759-.354c1.095-.465 1.8029-1.394 1.9449-2.554zM11.9986 1.4009c-2.068 0-3.7539 1.95-3.8329 4.3899h7.6657c-.08-2.44-1.765-4.3899-3.8328-4.3899zm7.8516 22.5981-.08.001-15.7843-.002c-1.074-.04-1.863-.91-1.971-1.991l-.01-.195L1.298 6.2858a.459.459 0 0 1 .45-.494h4.9748C6.8448 2.568 9.1607 0 11.9996 0c2.8388 0 5.1537 2.5689 5.2757 5.7898h4.9678a.459.459 0 0 1 .458.483l-.773 15.5883-.007.131c-.094 1.094-.979 1.9769-2.0709 2.0059z"/></svg>
              Shopee
            </a>
          </div>
          <table className="detalhe-table">
            <tbody>
              <tr><td className="label">Codigo</td><td>{produto.codigo}</td></tr>
              <tr><td className="label">Codigo de Barras</td><td>{produto.ean || produto.codigo_barras || '-'}</td></tr>
              <tr><td className="label">Marca</td><td><span className="detail-link" onClick={() => onNavigateTo?.('fornecedores', produto.marca)}>{produto.marca}</span></td></tr>
              <tr><td className="label">NCM</td><td>{produto.ncm || '-'}</td></tr>
              <tr><td className="label">CFOP</td><td>{produto.cfop || '-'}</td></tr>
              <tr><td className="label">CST</td><td>{produto.cst || '-'}</td></tr>
              <tr><td className="label">ICMS</td><td>{produto.icms ? `${produto.icms}%` : '-'}</td></tr>
              <tr><td className="label">Origem</td><td>{produto.origem_descricao || '-'}</td></tr>
              <tr><td className="label">Embalagem</td><td>{produto.embalagem || '-'}</td></tr>
              <tr><td className="label">Peso</td><td>{produto.peso ?? '-'} kg</td></tr>
              <tr><td className="label">Dimensoes (A x L x C)</td><td>{produto.altura ?? '-'} x {produto.largura ?? '-'} x {produto.comprimento ?? '-'} cm</td></tr>
              <tr><td className="label">Estoque</td><td>{traduzirEstoque(produto.estoque)}</td></tr>
              <tr><td className="label">Lista</td><td>{produto.lista ? <span className="detail-link" onClick={() => onNavigateTo?.('listas', produto.lista)}>{produto.lista}</span> : '-'}</td></tr>
              <tr><td className="label">Referencia</td><td>{produto.referencia || '-'}</td></tr>
              <tr className="preco-row"><td className="label">Preco</td><td className="preco">{produto.preco != null ? `R$ ${produto.preco.toFixed(2)}` : '-'}{produto.atualizado_em && <span className="atualizado-em"> (atualizado em: {new Date(produto.atualizado_em).toLocaleDateString('pt-BR')})</span>}</td></tr>
            </tbody>
          </table>
          {produto.inf_adicionais && (
            <div className="detalhe-extra">
              <h3>Informacoes adicionais</h3>
              <p>{produto.inf_adicionais}</p>
            </div>
          )}
          {priceHistory && priceHistory.length > 0 ? (
            <PriceHistoryChart data={priceHistory} />
          ) : (
            <div className="price-history-empty">Sem historico de precos</div>
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
                  <img src={src} alt={img.nome} loading="lazy" onClick={() => openLightbox(i)} />
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

function IdealProdutoDetalhe({ produto, onBack }) {
  const { data: priceHistory } = usePriceHistory('ideal', produto.codigo)
  return (
    <div className="page">
      <button className="btn-back" onClick={onBack}>Voltar</button>
      <div className="detalhe">
        <div className="detalhe-img">
          {produto.imagem_url ? (
            <img src={produto.imagem_url} alt={produto.nome} loading="lazy" onError={(e) => { e.target.style.display = 'none' }} />
          ) : null}
        </div>
        <div className="detalhe-info">
          <span className={`supplier-badge ${produto.supplier}`}>Ideal</span>
          <h2>{produto.nome}</h2>
          {produto.descricao && <h3 className="detalhe-descricao">{produto.descricao}</h3>}
          <table className="detalhe-table">
            <tbody>
              <tr><td className="label">Codigo</td><td>{produto.codigo}</td></tr>
              <tr><td className="label">EAN</td><td>{produto.ean || '-'}</td></tr>
              <tr><td className="label">Marca</td><td>{produto.marca || '-'}</td></tr>
              <tr><td className="label">NCM</td><td>{produto.ncm || '-'}</td></tr>
              <tr><td className="label">Embalagem</td><td>{produto.embalagem || '-'}</td></tr>
              <tr><td className="label">Peso</td><td>{produto.peso ?? '-'} kg</td></tr>
              <tr><td className="label">Dimensoes (A x L x C)</td><td>{produto.altura ?? '-'} x {produto.largura ?? '-'} x {produto.comprimento ?? '-'} cm</td></tr>
              <tr><td className="label">Estoque</td><td>{produto.estoque || '-'}</td></tr>
              <tr><td className="label">Referencia</td><td>{produto.referencia || '-'}</td></tr>
              <tr><td className="label">Categoria</td><td>{produto.categoria || '-'}</td></tr>
              <tr><td className="label">Origem</td><td>{produto.origem || '-'}</td></tr>
              <tr><td className="label">EAN Caixa</td><td>{produto.ean_caixa || '-'}</td></tr>
              <tr className="preco-row"><td className="label">Preco</td><td className="preco">{produto.preco != null ? `R$ ${produto.preco.toFixed(2)}` : '-'}{produto.atualizado_em && <span className="atualizado-em"> (atualizado em: {new Date(produto.atualizado_em).toLocaleDateString('pt-BR')})</span>}</td></tr>
            </tbody>
          </table>
          {produto.url && (
            <div className="detalhe-extra">
              <a href={produto.url} target="_blank" rel="noopener noreferrer">Ver no site Atacado Ideal</a>
            </div>
          )}
          {priceHistory && priceHistory.length > 0 ? (
            <PriceHistoryChart data={priceHistory} />
          ) : (
            <div className="price-history-empty">Sem historico de precos</div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ProdutoDetalhePage({ codigo, supplier, onBack, onNavigateTo }) {
  const { data: produto, isLoading, error } = useProduto(supplier || 'reval', codigo)

  if (isLoading) {
    return <div className="page"><button className="btn-back" onClick={onBack}>Voltar</button><div className="loading">Carregando produto...</div></div>
  }
  if (error || !produto) {
    return <div className="page"><button className="btn-back" onClick={onBack}>Voltar</button><div className="empty">{error ? 'Erro ao carregar produto.' : 'Produto nao encontrado.'}</div></div>
  }

  if (produto.supplier === 'ideal') {
    return <IdealProdutoDetalhe produto={produto} onBack={onBack} />
  }

  return <RevalProdutoDetalhe produto={produto} onBack={onBack} onNavigateTo={onNavigateTo} />
}
