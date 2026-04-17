import { useState, useCallback, useRef, useEffect } from 'react'
import { calcPreco, breakdown, fmt, fmtPct, fmtFaixaML } from './priceCalc'
import { SliderGroup, LucroInput, ComissaoInput, TaxaFixaInput, Breakdown } from './PriceSlider'

const ML_MODES = [
  { key: 'classico', label: 'Clássico', comissao: 12, frete: 0 },
  { key: 'premium', label: 'Premium', comissao: 17, frete: 0 },
  { key: 'full', label: 'Full', comissao: 18, frete: 10 },
]

const ML_FAIXAS_TOOLTIP =
  'Faixas de Taxa Fixa ML:\n' +
  '• < R$12,50 → 50% do preço\n' +
  '• R$12,50 – R$29 → R$6,25\n' +
  '• R$29 – R$50 → R$6,50\n' +
  '• R$50 – R$79 → R$6,75\n' +
  '• ≥ R$79 → Isento'

export function MLPriceCalculator({ custo }) {
  const [mlMode, setMlMode] = useState('classico')
  const [lucro, setLucro] = useState(0)
  const [taxaFixaAuto, setTaxaFixaAuto] = useState(true)
  const [taxaFixaManual, setTaxaFixaManual] = useState(0)
  const [comissao, setComissao] = useState(12)
  const [ads, setAds] = useState(0)
  const [frete, setFrete] = useState(0)
  const [impostos, setImpostos] = useState(7.3)
  const [comissaoOn, setComissaoOn] = useState(true)
  const [adsOn, setAdsOn] = useState(false)
  const [taxaFixaOn, setTaxaFixaOn] = useState(true)
  const [freteOn, setFreteOn] = useState(true)
  const [impostosOn, setImpostosOn] = useState(true)
  const custoInitRef = useRef(false)

  useEffect(() => {
    if (!custoInitRef.current && custo > 0) {
      setLucro(custo * 0.15)
      custoInitRef.current = true
    }
  }, [custo])

  const switchMode = useCallback((mode) => {
    const preset = ML_MODES.find(m => m.key === mode)
    if (preset) {
      setMlMode(mode)
      setComissao(preset.comissao)
      setFrete(preset.frete)
    }
  }, [])

  const effComissao = comissaoOn ? comissao : 0
  const effAds = adsOn ? ads : 0
  const effImpostos = impostosOn ? impostos : 0
  const effFrete = freteOn ? frete : 0

  const precoSemTaxa = calcPreco(custo, lucro, 0, effComissao, effAds, effImpostos, 0, effFrete) || custo
  const faixa = fmtFaixaML(precoSemTaxa)
  const taxaAutoVal = taxaFixaAuto ? faixa.taxa : taxaFixaManual
  const taxaEfetiva = taxaFixaOn ? taxaAutoVal : 0

  const preco = calcPreco(custo, lucro, taxaEfetiva, effComissao, effAds, effImpostos, 0, effFrete)
  const bd = breakdown(preco, effComissao, effAds, taxaEfetiva, effImpostos, 0, effFrete)
  const liquido = preco ? preco - custo - bd.descontos : 0

  const comissaoRs = preco ? preco * (comissao / 100) : 0

  function handleComissaoRsChange(rs) {
    if (preco > 0) setComissao((rs / preco) * 100)
  }

  const taxaFixaInfo = taxaFixaOn && taxaFixaAuto ? (
    <div className="calc-taxa-info">
      <div className="calc-taxa-faixa-tooltip" data-tooltip={ML_FAIXAS_TOOLTIP}>
        <span className="calc-taxa-faixa">{faixa.desc}</span>
        <span className="calc-taxa-help">?</span>
      </div>
      <button className="calc-taxa-toggle" onClick={() => setTaxaFixaAuto(false)}>manual</button>
    </div>
  ) : taxaFixaOn ? (
    <div className="calc-taxa-info">
      <span className="calc-taxa-faixa">Manual</span>
      <button className="calc-taxa-toggle" onClick={() => setTaxaFixaAuto(true)}>automático</button>
    </div>
  ) : null

  return (
    <div className="calc-card">
      <div className="calc-card-head">
        <span>Mercado Livre</span>
        <a
          className="calc-card-link"
          href="https://www.mercadolivre.com.br/ajuda/quanto-custa-vender-um-produto_870"
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
        >
          Ver taxas
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </div>
      <div className="calc-mode-cards">
        {ML_MODES.map(m => (
          <button key={m.key} className={'calc-mc' + (mlMode === m.key ? ' active' : '')} onClick={() => switchMode(m.key)}>
            <span className="calc-mc-label">{m.label}</span>
            <span className="calc-mc-info">{m.comissao}% comissão</span>
          </button>
        ))}
      </div>
      {preco ? (
        <>
          <div className="calc-price-sug">{fmt(preco)}</div>
          <div className="calc-sliders">
            <LucroInput value={lucro} onChange={setLucro} custo={custo} />
            <ComissaoInput pct={comissao} rs={comissaoRs} onPctChange={setComissao} onRsChange={handleComissaoRsChange} preco={preco} enabled={comissaoOn} onToggle={setComissaoOn} />
            <SliderGroup label="Ads" value={ads} display={`${fmtPct(ads)}% · ${fmt(bd.adsVal)}`} min={0} max={20} step={0.1} onChange={setAds} enabled={adsOn} onToggle={setAdsOn} />
            <TaxaFixaInput value={taxaAutoVal} onChange={v => { setTaxaFixaAuto(false); setTaxaFixaManual(v) }} enabled={taxaFixaOn} onToggle={setTaxaFixaOn} info={taxaFixaInfo} />
            <SliderGroup label="Frete Absorvido" value={frete} display={fmt(frete)} min={0} max={30} step={0.1} onChange={setFrete} enabled={freteOn} onToggle={setFreteOn} />
            <SliderGroup label="Impostos" value={impostos} display={`${fmtPct(impostos)}% · ${fmt(bd.impostosVal)}`} min={0} max={30} step={0.1} onChange={setImpostos} enabled={impostosOn} onToggle={setImpostosOn} />
          </div>
          <Breakdown rows={[
            ...(comissaoOn ? [{ label: `Comissão (${comissao}%)`, value: fmt(bd.comissaoVal) }] : []),
            ...(adsOn ? [{ label: `Ads (${ads}%)`, value: fmt(bd.adsVal) }] : []),
            ...(taxaFixaOn ? [{ label: 'Taxa Fixa', value: fmt(taxaEfetiva) }] : []),
            ...(freteOn ? [{ label: 'Frete Absorvido', value: fmt(frete) }] : []),
            ...(impostosOn ? [{ label: `Impostos (${impostos}%)`, value: fmt(bd.impostosVal), className: 'calc-bd-impostos' }] : []),
            { label: 'Total Descontos', value: fmt(bd.descontos), className: 'calc-bd-total' },
            { label: 'Lucro Líquido', value: fmt(liquido), className: 'calc-bd-lucro' },
          ]} />
          <div className="calc-price-bottom">
            <span>Preço Final</span>
            <span className="calc-price-bottom-val">{fmt(preco)}</span>
          </div>
        </>
      ) : (
        <div className="calc-error">Soma das taxas &gt;= 100%</div>
      )}
    </div>
  )
}
